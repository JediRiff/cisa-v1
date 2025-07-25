import streamlit as st
import json
import pandas as pd
import plotly.graph_objects as go
import re
import requests
import xml.etree.ElementTree as ET
from cisa_cpcon import mapper

# Set page config (light mode)
st.set_page_config(
    page_title="CISA CAPRI",
    layout="wide",
    initial_sidebar_state="expanded"
)

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
            "alert_meta": {"posture": parsed.get("posture", "Unknown")},
            "observed_exploitation": parsed.get("exploitation", "unknown"),
            "sectors_targeted": [s.strip() for s in parsed.get("sector", "").split("/") if s.strip()],
            "sector_match": True,
            "urgency": parsed.get("urgency", "low").lower(),
            "kev": parsed.get("kev", "false").lower() == "true"
        }

# Optional: Poll alerts from CISA RSS
RSS_FEED_URL = "https://www.cisa.gov/sites/default/files/feeds/alerts.xml"
def fetch_cisa_alerts():
    try:
        response = requests.get(RSS_FEED_URL)
        root = ET.fromstring(response.content)
        for item in root.findall(".//item"):
            title = item.find("title").text
            description = item.find("description").text
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

# Sidebar input
title_style = "font-size: 24px; font-weight: bold; color: #005288;"
st.markdown(f"<div style='{title_style}'>🛰️ CISA CAPRI</div>", unsafe_allow_html=True)
st.markdown("**CISA Alert Prioritization and Readiness Index** — derived from Shields Up/Ready posture, urgency, KEV, and sector risk weighting.")

st.sidebar.header("Ingest Alert")
st.sidebar.markdown("Supports full JSON or simplified input like:<br>`posture: Shields Up, sector: Energy, urgency: high, kev: true`", unsafe_allow_html=True)
alert_input = st.sidebar.text_area("Alert Input", height=250)

col1, col2 = st.sidebar.columns([1, 1])

with col1:
    if st.button("Ingest Alert"):
        try:
            parsed_alert = parse_alert_input(alert_input)
            meta = parsed_alert.get("alert_meta", {})
            scores = parsed_alert.get("scores", {})
            context = parsed_alert.get("cvss_context", {})

            if not scores:
                result = mapper.process_alert(meta, scores, context)
            else:
                result = {
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

            st.sidebar.success("Alert processed and added to log.")

        except Exception as e:
            st.sidebar.error(f"Failed to process alert: {e}")

with col2:
    if st.button("Fetch RSS Alerts"):
        fetch_cisa_alerts()

# Score Weights Display
with st.expander("📊 CAPRI Scoring Weights by Category", expanded=False):
    st.markdown("""
    | Category        | Weight | Description                                 |
    |------------------|--------|---------------------------------------------|
    | **Urgency**      | 30%    | Based on CISA's alert severity               |
    | **KEV Inclusion**| 25%    | Higher if vulnerability is in KEV catalog   |
    | **Exploitation** | 20%    | Known active exploitation in wild           |
    | **Posture**      | 15%    | Based on Shields Up/Ready status            |
    | **Sector Criticality** | 10%    | Sector-specific CPCON weighting     |
    """)

# Summary metric and breakdown
if alert_log:
    latest = alert_log[-1]
    st.metric("📍 Latest CPCON Level", latest["cpcon"]["final_level"], help=latest["cpcon"].get("rationale", ""))

    with st.expander("🧮 Per-Category Breakdown for Latest Alert"):
        st.json(latest.get("scores", {}), expanded=False)
else:
    st.warning("No alerts ingested yet.")

# Data Prep
data = pd.DataFrame([
    {
        "Sector": alert["scores"].get("sector", "Unknown"),
        "CPCON": alert["cpcon"]["final_level"],
        "CSS": alert["scores"].get("CSS"),
        "Posture": alert["alert_meta"].get("posture"),
        "Timestamp": alert["alert_meta"].get("timestamp", f"Alert {i}")
    }
    for i, alert in enumerate(alert_log)
])

# Visualization
with st.container():
    st.subheader("📈 Average CPCON Level by Sector")
    if not data.empty:
        grouped = data.groupby("Sector")["CPCON"].mean().reset_index()
        fig = go.Figure(go.Bar(
            x=grouped["Sector"],
            y=grouped["CPCON"],
            marker=dict(
                color=grouped["CPCON"],
                colorscale='Blues',
                line=dict(color='white', width=1.5)
            ),
            text=grouped["CPCON"].round(2),
            textposition="outside"
        ))
        fig.update_layout(
            template="simple_white",
            yaxis_title="CPCON Level",
            xaxis_title="Sector",
            font=dict(family="Segoe UI", size=14),
            height=450,
            margin=dict(t=50, b=50)
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No data to display yet.")

# Full Log
with st.expander("🧾 Full Alert Log"):
    if not data.empty:
        st.dataframe(data.sort_values("Timestamp", ascending=False), use_container_width=True)
    else:
        st.info("Log is empty.")