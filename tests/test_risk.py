from backend.shared.risk import (
    calculate_flood_risk,
    calculate_smog_risk,
    classify_score,
    is_risk_escalated
)

def test_classify_score_thresholds():
    # Green < 30
    assert classify_score(0.0) == "green"
    assert classify_score(29.9) == "green"

    # Yellow 30 to 60
    assert classify_score(30.0) == "yellow"
    assert classify_score(45.5) == "yellow"
    assert classify_score(60.0) == "yellow"

    # Red > 60
    assert classify_score(60.1) == "red"
    assert classify_score(100.0) == "red"

def test_calculate_flood_risk_formula():
    """
    Test exact formula:
    score = rainfall_next3h_mm + (yamuna_level_m - 203.0) * 20 + vulnerability * 5
    """
    # Low risk condition:
    # rain = 0mm, yamuna = 203.0m, vuln = 2 => score = 0 + 0 + 10 = 10 (green)
    score, level, meta = calculate_flood_risk(
        rainfall_next3h_mm=0.0,
        vulnerability=2,
        yamuna_level_m=203.0
    )
    assert score == 10.0
    assert level == "green"

    # Warning condition:
    # rain = 15mm, yamuna = 203.5m, vuln = 3
    # score = 15 + (0.5 * 20) + 15 = 15 + 10 + 15 = 40.0 (yellow)
    score, level, meta = calculate_flood_risk(
        rainfall_next3h_mm=15.0,
        vulnerability=3,
        yamuna_level_m=203.5
    )
    assert score == 40.0
    assert level == "yellow"

    # Red danger condition:
    # rain = 35mm, yamuna = 205.0m (near 205.33m danger mark), vuln = 4
    # score = 35 + (2.0 * 20) + 20 = 35 + 40 + 20 = 95.0 (red)
    score, level, meta = calculate_flood_risk(
        rainfall_next3h_mm=35.0,
        vulnerability=4,
        yamuna_level_m=205.0
    )
    assert score == 95.0
    assert level == "red"

def test_flood_risk_missing_river_level():
    """Missing river level must not invent a reading, must flag warning in metadata."""
    score, level, meta = calculate_flood_risk(
        rainfall_next3h_mm=10.0,
        vulnerability=3,
        yamuna_level_m=None
    )
    assert meta["river_reading_available"] is False
    assert "warning" in meta
    assert score > 0.0

def test_smog_risk_requires_reading():
    """Smog calculation must not invent live readings."""
    score, level, meta = calculate_smog_risk(aqi_reading=None, vulnerability=3)
    assert score is None
    assert level is None
    assert "error" in meta

    # When AQI reading is provided (e.g. 350 severe AQI in Delhi winter)
    score, level, meta = calculate_smog_risk(aqi_reading=350.0, vulnerability=4)
    assert score is not None
    # score = (350 - 100)/4 + 20 = 62.5 + 20 = 82.5 (red)
    assert score == 82.5
    assert level == "red"

def test_risk_escalation_detection():
    # Strictly higher tier
    assert is_risk_escalated("green", "yellow") is True
    assert is_risk_escalated("yellow", "red") is True
    assert is_risk_escalated("green", "red") is True

    # Same or lower tier must not escalate (prevents duplicate spam alerts)
    assert is_risk_escalated("green", "green") is False
    assert is_risk_escalated("yellow", "yellow") is False
    assert is_risk_escalated("red", "red") is False
    assert is_risk_escalated("red", "yellow") is False
    assert is_risk_escalated("yellow", "green") is False
