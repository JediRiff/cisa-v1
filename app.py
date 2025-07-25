import streamlit as st
import json
import plotly.express as px
import pandas as pd
from cisa_cpcon import mapper

# Set Streamlit page config
st.set_page_config(page_title="CAPRI Dashboard", layout="wide")

# Load or initialize alert log
LOG_FILE = "capri_log.json"
try:
    with open(LOG_FILE, "r") as f:
        alert_log = json.load(f)
except FileNotFoundError:
    alert_log = []

st.sidebar.title("CAPRI Alert Ingestion")
st.sidebar.markdown("Paste a new CISA-style alert (JSON) below:")
alert_input = st.sidebar.text_area("Alert JSON", height=300)
if st.sidebar.button("Ingest Alert"):
    try:
        new_alert = json.loads(alert_input)
        meta = new_alert.get("alert_meta", {})
        scores = new_alert.get("scores", {})
        context = new_alert.get("cvss_context", {})
        result = mapper.process_alert(meta, scores, context)
        alert_log.append(result)

        with open(LOG_FILE, "w") as f:
            json.dump(alert_log, f, indent=2)

        st.sidebar.success("Alert ingested and processed!")
    except Exception as e:
        st.sidebar.error(f"Invalid JSON or processing error: {e}")

st.title("🛰️ CAPRI Strategic Dashboard")
st.markdown("Sector-weighted CPCON insights from real-time alert ingestion")

# Display latest alert CPCON level
if alert_log:
    latest = alert_log[-1]
    st.metric("Latest CPCON Level", latest["cpcon"]["final_level"], help=latest["cpcon"]["rationale"])
else:
    st.warning("No alerts ingested yet.")

# Prepare data for trends and metrics
data = pd.DataFrame([
    {
        "Sector": alert["alert_meta"].get("sector", "Unknown"),
        "CPCON": alert["cpcon"]["final_level"],
        "CSS": alert["scores"].get("CSS"),
        "Posture": alert["alert_meta"].get("posture"),
        "Timestamp": alert["alert_meta"].get("timestamp", f"Alert {i}")
    }
    for i, alert in enumerate(alert_log)
])

# Show CPCON breakdown by sector
with st.container():
    st.subheader("CPCON Level by Sector")
    if not data.empty:
        fig = px.bar(
            data.groupby("Sector")["CPCON"].mean().reset_index(),
            x="Sector", y="CPCON", color="Sector",
            title="Average CPCON by Sector"
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No data yet to chart.")

# Full log view
with st.expander("📋 Full Alert Log"):
    st.dataframe(data.sort_values("Timestamp", ascending=False))