import streamlit as st
import requests
import json

st.title("🛡️ CAPRI - CISA Alert Prioritization and Readiness Index")

alert_input = st.text_area("Paste CISA Alert JSON (include alert_meta and scores)", height=300)
cvss_input = st.text_area("Paste CVSS context JSON (optional)", height=150)

if st.button("Evaluate CAPRI"):
    try:
        payload = {
            "alert_meta": json.loads(alert_input)["alert_meta"],
            "scores": json.loads(alert_input)["scores"],
            "cvss_context": json.loads(cvss_input) if cvss_input else None
        }
        res = requests.post("http://localhost:8000/capri/evaluate", json=payload)
        st.subheader("CAPRI Result")
        st.json(res.json())
    except Exception as e:
        st.error(f"Error: {e}")