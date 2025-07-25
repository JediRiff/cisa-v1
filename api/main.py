from fastapi import FastAPI
from pydantic import BaseModel
from cisa_cpcon.mapper import process_alert

app = FastAPI()

class AlertInput(BaseModel):
    alert_meta: dict
    scores: dict
    cvss_context: dict | None = None

@app.post("/capri/evaluate")
def evaluate(input: AlertInput):
    return process_alert(input.alert_meta, input.scores, input.cvss_context)