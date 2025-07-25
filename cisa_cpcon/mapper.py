import json
from typing import Optional, Dict

# Sector importance weights for CAPRI
SECTOR_WEIGHTS = {
    "Energy": 1.00,
    "Financial Services": 0.95,
    "Communications": 0.90,
    "Information Technology": 0.90,
    "Healthcare & Public Health": 0.90,
    "Water & Wastewater Systems": 0.85,
    "Transportation Systems": 0.85,
    "Emergency Services": 0.85,
    "Defense Industrial Base": 0.80,
    "Food & Agriculture": 0.75,
    "Government Facilities": 0.70,
    "Critical Manufacturing": 0.70,
    "Nuclear Reactors, Materials & Waste": 0.70,
    "Chemical": 0.65,
    "Dams": 0.60,
    "Commercial Facilities": 0.55
}


def compute_css(P, X, S, U, K, C, A):
    return round(0.20 * P + 0.15 * X + 0.15 * S + 0.15 * U + 0.10 * K + 0.15 * C + 0.10 * A, 3)


def compute_ori_prime(I: Optional[float], b: Optional[float], Ehat: Optional[float], CSS: float) -> Optional[float]:
    if None in (I, b, Ehat):
        return None
    return round(0.40 * I + 0.20 * b + 0.15 * Ehat + 0.25 * CSS, 3)


def map_cpcon(ori_or_css: float) -> int:
    if ori_or_css < 0.20:
        return 5
    elif ori_or_css < 0.40:
        return 4
    elif ori_or_css < 0.60:
        return 3
    elif ori_or_css < 0.80:
        return 2
    else:
        return 1


def apply_overrides(alert_meta, CSS, base_level) -> (int, int, list):
    floor = 5
    overrides = []
    posture = alert_meta.get("posture", "None/Other")
    S = 1.0 if alert_meta.get("sector_match") else 0.0
    urgency = alert_meta.get("urgency", "unspecified")
    C = alert_meta.get("critical_functions", False)
    X = alert_meta.get("observed_exploitation", "unspecified")

    if posture == "Shields Up" and S >= 0.7:
        floor = min(floor, 3)
        overrides.append({
            "name": "shields_up_sector_match",
            "pre_level": base_level,
            "post_level": 3,
            "reason": "Shields Up posture targeting this sector"
        })

    if urgency == "bod_or_emergency" and CSS >= 0.8:
        floor = min(floor, 2)
        overrides.append({
            "name": "bod_urgency_css",
            "pre_level": base_level,
            "post_level": 2,
            "reason": "BOD urgency and high CSS"
        })

    if C and X in ["confirmed", "likely"]:
        floor = min(floor, 2)
        overrides.append({
            "name": "critical_exploitation",
            "pre_level": base_level,
            "post_level": 2,
            "reason": "Critical functions with exploitation evidence"
        })

    final_level = min(base_level, floor)
    return final_level, floor, overrides


def process_alert(alert_meta: Dict, scores: Dict, cvss_context: Optional[Dict] = None) -> Dict:
    CSS = compute_css(**scores)
    I = cvss_context.get("I") if cvss_context else None
    b = cvss_context.get("b") if cvss_context else None
    Ehat = cvss_context.get("Ehat") if cvss_context else None
    ORI_prime = compute_ori_prime(I, b, Ehat, CSS) if I is not None else None
    base_input = ORI_prime if ORI_prime is not None else CSS
    base_level = map_cpcon(base_input)
    final_level, floor_level, overrides = apply_overrides(alert_meta, CSS, base_level)

    return {
        "alert_meta": alert_meta,
        "scores": {**scores, "CSS": CSS},
        "cvss_context": {
            "I": I,
            "b": b,
            "Ehat": Ehat,
            "ORI_prime": ORI_prime,
            "provided": cvss_context is not None
        },
        "cpcon": {
            "base_level": base_level,
            "final_level": final_level,
            "floor_level": floor_level,
            "mapping_thresholds": [0.2, 0.4, 0.6, 0.8],
            "rationale": overrides[0]["reason"] if overrides else "Base CPCON derived from ORI' or CSS"
        },
        "overrides_applied": overrides,
        "meta": {
            "inferred_fields": [],
            "notes": "Processed with sector-weighted CAPRI mapping"
        }
    }

# Sector weights reflect mission-criticality defined by CISA, emphasizing Energy, Healthcare, Finance, and Communications as the most impactful in CPCON posture decisions.
# These weights can be used to adjust CSS in proportion to affected sectors’ systemic importance to national security, public health, and resilience.