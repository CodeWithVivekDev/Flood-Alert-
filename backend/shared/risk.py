"""
Risk Engine for Baadh Bol:
Calculates flood and smog hazard risk scores using meteorological forecasts,
observed river levels, and community vulnerability index.

NOTE: This is a hackathon demonstration heuristic, NOT an officially certified
hydrological or environmental prediction model. Official government warnings
and local authority directives always supersede this system.
"""

from typing import Tuple, Optional, Dict, Any
from .models import HazardType, RiskLevel

LEVEL_RANKS: Dict[RiskLevel, int] = {
    "green": 1,
    "yellow": 2,
    "red": 3
}

def classify_score(score: float) -> RiskLevel:
    """
    Classifies risk score into green, yellow, or red according to project thresholds:
    - Below 30: green
    - 30 to 60: yellow
    - Above 60: red
    """
    if score < 30.0:
        return "green"
    elif score <= 60.0:
        return "yellow"
    else:
        return "red"

def calculate_flood_risk(
    rainfall_next3h_mm: float,
    vulnerability: int,
    yamuna_level_m: Optional[float] = None
) -> Tuple[float, RiskLevel, Dict[str, Any]]:
    """
    Flood Risk Heuristic:
    score = rainfall_next3h_mm + (yamuna_level_m - 203.0) * 20 + vulnerability * 5

    Thresholds:
    - Green (< 30): Normal / Low risk
    - Yellow (30-60): Warning / Elevated risk
    - Red (> 60): High danger / Alert

    If Yamuna river level is missing, it does not invent a reading.
    It calculates using rainfall and vulnerability with a flag indicating missing river data.
    """
    vuln_clamped = max(1, min(5, vulnerability))
    rainfall_clean = max(0.0, float(rainfall_next3h_mm))

    metadata: Dict[str, Any] = {
        "rainfall_next3h_mm": rainfall_clean,
        "vulnerability": vuln_clamped,
        "hazardType": "flood",
        "river_reading_available": yamuna_level_m is not None
    }

    if yamuna_level_m is not None:
        river_clean = float(yamuna_level_m)
        river_component = (river_clean - 203.0) * 20.0
        score = rainfall_clean + river_component + (vuln_clamped * 5.0)
        metadata["yamuna_level_m"] = river_clean
        metadata["river_component"] = round(river_component, 2)
    else:
        # Fallback when river data has not been logged yet
        score = (rainfall_clean * 1.5) + (vuln_clamped * 6.0)
        metadata["warning"] = "Manually verified Yamuna level not recorded yet; estimated using rainfall and vulnerability"

    # Clamp score to reasonable positive bounds
    final_score = max(0.0, round(score, 2))
    level = classify_score(final_score)
    metadata["score"] = final_score
    metadata["level"] = level

    return final_score, level, metadata

def calculate_smog_risk(
    aqi_reading: Optional[float],
    vulnerability: int
) -> Tuple[Optional[float], Optional[RiskLevel], Dict[str, Any]]:
    """
    Smog Risk Heuristic:
    Requires an operator-entered or verified AQI reading.
    Does NOT invent live pollution readings.
    """
    vuln_clamped = max(1, min(5, vulnerability))
    metadata: Dict[str, Any] = {
        "vulnerability": vuln_clamped,
        "hazardType": "smog"
    }

    if aqi_reading is None:
        metadata["error"] = "AQI reading required for smog hazard evaluation. Live readings cannot be invented."
        return None, None, metadata

    aqi_clean = max(0.0, float(aqi_reading))
    metadata["aqi_reading"] = aqi_clean

    # Heuristic: base AQI normalized around 100 with vulnerability weighting
    # AQI > 200 (poor/very poor) pushes into yellow/red
    score = ((aqi_clean - 100.0) / 4.0) + (vuln_clamped * 5.0)
    final_score = max(0.0, round(score, 2))
    level = classify_score(final_score)
    metadata["score"] = final_score
    metadata["level"] = level

    return final_score, level, metadata

def is_risk_escalated(old_level: Optional[RiskLevel], new_level: RiskLevel) -> bool:
    """
    Checks if risk has escalated to a strictly higher tier.
    Used for idempotency to avoid repeated spam calls for unchanged or decreasing levels.
    """
    old_rank = LEVEL_RANKS.get(old_level or "green", 0)
    new_rank = LEVEL_RANKS.get(new_level, 1)
    return new_rank > old_rank
