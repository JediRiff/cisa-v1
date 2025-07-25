import streamlit as st
import json
import pandas as pd
import re
import requests
import xml.etree.ElementTree as ET
from cisa_cpcon import mapper

# Set light-themed page config
st.set_page_config(
    page_title="CISA CAPRI",
    layout="wide",
    initial_sidebar_state="expanded",
    page_icon="🛰️"
)

st.markdown("""
    <style>
    html, body, [class*="css"]  {
        background-color: #ffffff;
        color: #000000;
        font-family: 'Segoe UI', sans-serif;
    }
    </style>
""", unsafe_allow_html=True)

# Load or initialize alert log
LOG_FILE = "capri_log.json"
try:
    with open(LOG_FILE, "r") as f:
        alert_log = json.load(f)
except FileNotFoundError:
    alert_log = []

# Utility: Support simple KV format or JSON
def parse_alert_input(alert_input):
    try:
        return json.loads(alert_input)
    except json.JSONDecodeError:
        parsed = {}
        pairs = re.split(r',\s*(?![^{}]*\})', alert_input)
        for pair in pairs:
            if ':' in pair:
                key, value = map(str.strip, pair.split(':', 1))
                parsed[key.lower()] = value
        return {
            "alert_meta": {"posture": parsed.get("posture", "Unknown"), "timestamp": parsed.get("timestamp", "N/A")},
            "observed_exploitation": parsed.get("exploitation", "unknown"),
            "sectors_targeted": [s.strip() for s in parsed.get("sector", "").split("/") if s.strip()],
            "sector_match": True,
            "urgency": parsed.get("urgency", "low").lower(),
            "kev": parsed.get("kev", "false").lower() == "true"
        }

# Threat Intel Suggestions
SECTOR_FEED_URLS = {
    "healthcare": [
        "https://www.cisa.gov/sites/default/files/feeds/kev.xml",
        "https://www.microsoft.com/en-us/security/blog/feed/",
        "https://www.huntress.com/blog/rss.xml",
        "https://www.cisa.gov/sites/default/files/feeds/sbd_alerts.xml",
        "https://www.cisa.gov/sites/default/files/feeds/cybersecurity-advisories.xml"
    ]
}

def fetch_sector_threats(sector):
    sector = sector.lower()
    summaries = []
    for url in SECTOR_FEED_URLS.get(sector, []):
        try:
            response = requests.get(url, timeout=10)
            root = ET.fromstring(response.content)
            for item in root.findall(".//item")[:3]:
                title = item.find("title").text
                link = item.find("link").text
                summaries.append(f"[{title}]({link})")
        except:
            pass
    return summaries

# Poll alerts from CISA RSS
RSS_FEED_URL = "https://www.cisa.gov/sites/default/files/feeds/alerts.xml"
def fetch_cisa_alerts():
    try:
        response = requests.get(RSS_FEED_URL)
        root = ET.fromstring(response.content)
        for item in root.findall(".//item"):
            title = item.find("title").text
            pub_date = item.find("pubDate").text
            parsed_alert = parse_alert_input(f"posture: Shields Up, sector: Unknown, urgency: medium, kev: false")
            parsed_alert["alert_meta"]["title"] = title
            parsed_alert["alert_meta"]["timestamp"] = pub_date
            meta = parsed_alert.get("alert_meta", {})
            scores = parsed_alert.get("scores", {})
            context = parsed_alert.get("cvss_context", {})
            result = mapper.process_alert(meta, scores, context)
            alert_log.append(result)
        with open(LOG_FILE, "w") as f:
            json.dump(alert_log, f, indent=2)
    except Exception as e:
        st.error(f"Failed to fetch RSS alerts: {e}")

# Branding and Description
title_style = "font-size: 28px; font-weight: bold; color: #005288;"
st.markdown(f"<div style='{title_style}'>🛰️ CISA CAPRI</div>", unsafe_allow_html=True)
st.markdown("""
**CISA Alert Prioritization and Readiness Index** — extracts Shields Up/Ready alerts, threat advisories, observed exploitation, urgency, KEV linkages, and sector targeting, mapping them to a risk-weighted index with sectoral mission-criticality.
""")

# Alert Input
tabs = st.tabs(["📝 Manual Ingestion", "📰 Fetch CISA RSS"])
with tabs[0]:
    alert_input = st.text_area("Enter Alert (JSON or simplified)", height=250)
    if alert_input:
        parsed = parse_alert_input(alert_input)
        sectors = parsed.get("sectors_targeted", [])
        for sector in sectors:
            st.markdown(f"### 🔎 Threat Intelligence for {sector.title()} Sector")
            suggestions = fetch_sector_threats(sector)
            for s in suggestions:
                st.markdown(f"- {s}")
    if st.button("Ingest Alert"):
        try:
            parsed_alert = parse_alert_input(alert_input)
            meta = parsed_alert.get("alert_meta", {})
            scores = parsed_alert.get("scores", {})
            context = parsed_alert.get("cvss_context", {})
            result = mapper.process_alert(meta, scores, context) if not scores else {
                "alert_meta": meta,
                "scores": scores,
                "cvss_context": context,
                "cpcon": {
                    "final_level": scores.get("CSS", 1),
                    "rationale": "Pre-scored input"
                }
            }
            alert_log.append(result)
            with open(LOG_FILE, "w") as f:
                json.dump(alert_log, f, indent=2)
            st.success("Alert processed and added to log.")
        except Exception as e:
            st.error(f"Processing error: {e}")

with tabs[1]:
    if st.button("Fetch & Process CISA Alerts"):
        fetch_cisa_alerts()

# Score Weights Display
with st.expander("📊 CAPRI Scoring Weights by Category", expanded=False):
    st.markdown("""
    | Code | Category         | Weight | Description                                   |
    |------|------------------|--------|-----------------------------------------------|
    | **U**  | Urgency           | 30%    | Severity of alert (low/medium/high)            |
    | **K**  | KEV Inclusion     | 25%    | If the CVE is in Known Exploited Vulnerabilities|
    | **E**  | Exploitation      | 20%    | Active exploitation observed in the wild       |
    | **P**  | Posture           | 15%    | National posture (e.g., Shields Up)            |
    | **S**  | Sector Criticality| 10%    | Based on sector's weight in CPCON matrix       |
    """)

# Summary + Breakdown
if alert_log:
    latest = alert_log[-1]
    score = latest["cpcon"]["final_level"]
    rationale = latest["cpcon"].get("rationale", "")
    st.subheader("📍 Latest CAPRI Level")
    st.markdown(f"<h1 style='color:#d92525;font-size:60px;'>{score}</h1>", unsafe_allow_html=True)
    st.caption(rationale)

    with st.expander("🧮 Per-Category Breakdown for Latest Alert"):
        st.json(latest.get("scores", {}), expanded=False)
else:
    st.info("No alerts ingested yet.")