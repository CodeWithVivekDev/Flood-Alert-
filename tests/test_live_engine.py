"""
Tests for Baadh Bol Live Flood Data, Automatic Warning Engine, and Safe Alert System:
- Central Water Commission (CWC) station thresholds, staleness, and network failure fallback.
- NDMA SACHET CAP v1.2 alerts, WAF handling, and schema validation.
- Open-Meteo weather forecasts and GloFAS modelled river discharge labels.
- WarningEngine deduplication, station danger thresholds, and database persistence.
- Safe Demo Alert triggering for browser audio alarms without false real-world warnings.
- API endpoints: GET /live-telemetry and POST /demo-alert.
"""

import json
from unittest.mock import patch, MagicMock
import urllib.error
from datetime import datetime, timezone, timedelta

import pytest
from backend.shared.cwc_service import CwcService, OFFICIAL_CWC_STATIONS
from backend.shared.sachet_service import SachetService, VERIFIED_SACHET_ALERTS
from backend.shared.open_meteo_service import OpenMeteoService
from backend.shared.warning_engine import WarningEngine
from backend.shared.db import DatabaseRepository
from backend.api.app import lambda_handler

@pytest.fixture
def test_repo():
    return DatabaseRepository(in_memory=True)

@pytest.fixture
def mock_open_meteo():
    mock = MagicMock(spec=OpenMeteoService)
    mock.get_basin_forecast.return_value = {
        "source": "Open-Meteo Global Forecasting & GloFAS Flood System",
        "locationName": "Test Basin",
        "weatherForecast": {"status": "live", "rainfallNext3hMm": 2.5, "rainfallTodayMm": 10.0},
        "floodDischarge": {"status": "live", "currentDischargeM3s": 350.0, "medianDischargeM3s": 320.0, "forecast7Days": []}
    }
    return mock

@pytest.fixture
def warning_engine(test_repo, mock_open_meteo):
    return WarningEngine(open_meteo_service=mock_open_meteo, repo=test_repo)


# ==========================================
# 1. Central Water Commission (CWC) Tests
# ==========================================

def test_cwc_station_thresholds_and_classifications():
    """Verify official station-specific danger thresholds and condition evaluation."""
    cwc = CwcService()
    result = cwc.fetch_water_levels()

    assert result["dataType"] == "Measured Hydrological Gauge Observations"
    assert "stations" in result
    assert len(result["stations"]) >= 8

    # Verify key Indian basins are monitored
    basins = {s["basin"] for s in result["stations"]}
    assert "Brahmaputra" in basins
    assert "Ganga" in basins
    assert "Yamuna" in basins
    assert "Godavari" in basins
    assert "Krishna" in basins

    # Verify station-specific danger levels are respected
    for stn in result["stations"]:
        assert stn["warningLevelM"] > 0
        assert stn["dangerLevelM"] > stn["warningLevelM"]
        assert stn["hflM"] > stn["dangerLevelM"]
        assert stn["observationType"] == "Measured Gauge Reading"

        # Check severity assignment
        measured = stn["measuredLevelM"]
        if measured >= stn["hflM"]:
            assert stn["condition"] == "extreme_flood"
            assert stn["severity"] == "red"
        elif measured >= stn["dangerLevelM"]:
            assert stn["condition"] == "danger"
            assert stn["severity"] == "red"
        elif measured >= stn["warningLevelM"]:
            assert stn["condition"] == "warning"
            assert stn["severity"] == "yellow"
        else:
            assert stn["condition"] == "normal"
            assert stn["severity"] == "green"

def test_cwc_failure_handling_and_no_fabricated_data():
    """Verify CwcService handles remote WAF/HTTP failures gracefully and reports provider status truthfully."""
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://ffs.india-water.gov.in/api",
            code=403,
            msg="Forbidden (Government WAF Gateway)",
            hdrs={},
            fp=None
        )

        cwc = CwcService()
        result = cwc.fetch_water_levels()

        # Must report restricted provider status truthfully
        assert "restricted_or_offline" in result["providerStatus"]
        assert result["status"] == "cached_benchmarks"
        # Must still provide benchmarked data with proper thresholds
        assert len(result["stations"]) > 0
        assert all(s["dangerLevelM"] > 0 for s in result["stations"])

def test_cwc_staleness_detection():
    """Verify station staleness check flags records older than 24 hours."""
    cwc = CwcService()

    # Modify one station in OFFICIAL_CWC_STATIONS temporarily to be 48 hours old
    now = datetime.now(timezone.utc)
    stale_time = (now - timedelta(hours=48)).strftime("%Y-%m-%dT%H:00:00Z")
    fresh_time = now.strftime("%Y-%m-%dT%H:00:00Z")

    orig_time_0 = OFFICIAL_CWC_STATIONS[0]["lastUpdated"]
    orig_time_1 = OFFICIAL_CWC_STATIONS[1]["lastUpdated"]
    try:
        OFFICIAL_CWC_STATIONS[0]["lastUpdated"] = stale_time
        OFFICIAL_CWC_STATIONS[1]["lastUpdated"] = fresh_time

        result = cwc.fetch_water_levels()
        stations = {s["stationId"]: s for s in result["stations"]}

        assert stations[OFFICIAL_CWC_STATIONS[0]["stationId"]]["isStale"] is True
        assert stations[OFFICIAL_CWC_STATIONS[1]["stationId"]]["isStale"] is False
    finally:
        OFFICIAL_CWC_STATIONS[0]["lastUpdated"] = orig_time_0
        OFFICIAL_CWC_STATIONS[1]["lastUpdated"] = orig_time_1


# ==========================================
# 2. NDMA SACHET (CAP) Tests
# ==========================================

def test_sachet_verified_alerts_schema():
    """Verify official NDMA SACHET alerts adhere to CAP v1.2 specifications."""
    sachet = SachetService()
    result = sachet.fetch_alerts()

    assert result["dataType"] == "Official Common Alerting Protocol (CAP v1.2) Warnings"
    assert "alerts" in result
    assert len(result["alerts"]) >= 3

    for alert in result["alerts"]:
        assert "sourceId" in alert
        assert "Official Disaster Warning" in alert["observationType"]
        assert alert["severity"] in ["Extreme", "Severe", "Moderate", "Minor"]
        assert alert["urgency"] in ["Immediate", "Expected", "Future"]
        assert len(alert["headline"]) > 0
        assert len(alert["instruction"]) > 0
        assert alert["state"] in ["Assam", "Delhi", "Bihar"]

def test_sachet_failure_and_waf_protection_handling():
    """Verify SachetService handles Cloudflare/WAF cookie blocks without breaking."""
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused by SACHET gateway")

        sachet = SachetService()
        result = sachet.fetch_alerts()

        assert "restricted_or_offline" in result["providerStatus"]
        assert result["status"] == "cached_verified_alerts"
        assert len(result["alerts"]) > 0


# ==========================================
# 3. Open-Meteo Weather & Flood API Tests
# ==========================================

def test_open_meteo_model_labeling_distinction():
    """Verify Open-Meteo strictly labels predictions as models, never as measurements."""
    om = OpenMeteoService()
    # Test fallback / offline structure
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = Exception("Network offline")
        forecast = om.get_basin_forecast(latitude=28.66, longitude=77.23, location_name="Yamuna Basin")

        assert forecast["weatherForecast"]["observationType"] == "Modelled Weather Forecast"
        assert forecast["floodDischarge"]["observationType"] == "Modelled River Discharge Prediction"
        assert forecast["weatherForecast"]["status"] == "unavailable"
        assert forecast["floodDischarge"]["status"] == "unavailable"

def test_open_meteo_live_parsing():
    """Verify Open-Meteo response parser correctly handles JSON structure."""
    fake_weather_json = json.dumps({
        "hourly": {"precipitation": [1.5, 2.0, 0.5, 0.0]},
        "daily": {"precipitation_sum": [4.0]}
    }).encode("utf-8")

    fake_flood_json = json.dumps({
        "daily": {
            "time": ["2026-10-10", "2026-10-11"],
            "river_discharge": [450.2, 510.8],
            "river_discharge_median": [380.0, 390.0],
            "river_discharge_max": [600.0, 650.0]
        }
    }).encode("utf-8")

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp_weather = MagicMock()
        mock_resp_weather.status = 200
        mock_resp_weather.read.return_value = fake_weather_json
        mock_resp_weather.__enter__.return_value = mock_resp_weather

        mock_resp_flood = MagicMock()
        mock_resp_flood.status = 200
        mock_resp_flood.read.return_value = fake_flood_json
        mock_resp_flood.__enter__.return_value = mock_resp_flood

        mock_urlopen.side_effect = [mock_resp_weather, mock_resp_flood]

        om = OpenMeteoService()
        forecast = om.get_basin_forecast(latitude=26.18, longitude=91.74, location_name="Brahmaputra")

        assert forecast["weatherForecast"]["status"] == "live"
        assert forecast["weatherForecast"]["rainfallNext3hMm"] == 4.0
        assert forecast["floodDischarge"]["status"] == "live"
        assert forecast["floodDischarge"]["currentDischargeM3s"] == 450.2
        assert forecast["floodDischarge"]["medianDischargeM3s"] == 380.0
        assert len(forecast["floodDischarge"]["forecast7Days"]) == 2


# ==========================================
# 4. Warning Engine & Deduplication Tests
# ==========================================

def test_warning_engine_sync_and_deduplication(warning_engine, test_repo):
    """
    Verify automatic warning engine deduplicates alerts across repeated syncs,
    persists new alerts to repository, and attaches next steps.
    """
    # 1. First sync: should detect breached stations and NDMA alerts
    sync_result_1 = warning_engine.sync_live_telemetry()
    alerts_1 = sync_result_1["generatedAlerts"]
    assert len(alerts_1) > 0

    # Ensure all generated alerts have required fields and instructions
    for alert in alerts_1:
        assert "alertId" in alert
        assert "sourceKey" in alert
        assert "instructions" in alert
        assert len(alert["instructions"]) > 0
        assert alert["level"] in ["red", "yellow"]
        assert alert["riskType"] in ["Threshold Breach (Station-Specific)", "Official Government Warning"]

    # Verify repository persistence
    saved_alerts_1 = test_repo.list_alerts()
    assert len(saved_alerts_1) == len(alerts_1)

    # 2. Second sync: same data should be completely deduplicated (0 new alerts)
    sync_result_2 = warning_engine.sync_live_telemetry()
    alerts_2 = sync_result_2["generatedAlerts"]
    assert len(alerts_2) == 0

    # Total in repo remains unchanged
    saved_alerts_2 = test_repo.list_alerts()
    assert len(saved_alerts_2) == len(saved_alerts_1)

def test_warning_engine_station_threshold_breach(warning_engine):
    """Test CWC station specific threshold breach creates properly labeled alert."""
    test_station = {
        "stationId": "cwc-delhi-orb-03",
        "stationName": "Delhi (Old Railway Bridge)",
        "river": "Yamuna",
        "basin": "Yamuna",
        "state": "Delhi",
        "district": "Central Delhi",
        "measuredLevelM": 205.80,
        "warningLevelM": 205.33,
        "dangerLevelM": 205.53,
        "hflM": 208.66,
        "lastUpdated": "2026-10-10T12:00:00Z"
    }

    alert = warning_engine._create_cwc_alert(test_station, severity="red", alert_key="cwc:test:red")
    assert alert["level"] == "red"
    assert alert["source"] == "Central Water Commission (CWC) Gauge"
    assert "205.8" in alert["headline"]
    assert "205.53" in alert["headline"]
    assert "Immediate evacuation" in alert["instructions"]


# ==========================================
# 5. Safe Demo Alert Mode Tests
# ==========================================

def test_safe_demo_alert_creation_and_labeling(warning_engine, test_repo):
    """
    Verify safe demo alerts are clearly stamped to prevent creating false real-world warnings,
    while still providing sound and notification testing capabilities.
    """
    demo = warning_engine.create_safe_demo_alert(state="Assam", river="Brahmaputra")

    assert demo["isDemo"] is True
    assert "[DEMO / TEST ALERT - NOT REAL]" in demo["headline"]
    assert "Simulated" in demo["affectedLocation"]
    assert demo["trigger"] == "test"
    assert "safe demonstration" in demo["instructions"]

    # Verify saved in repo
    saved = test_repo.get_alert(demo["alertId"])
    assert saved is not None
    assert saved.trigger == "test"


# ==========================================
# 6. End-to-End API Route Tests
# ==========================================

def test_api_live_telemetry_endpoint():
    """Verify GET /live-telemetry returns 200 with CWC, SACHET, and Open-Meteo telemetry."""
    event = {
        "httpMethod": "GET",
        "path": "/live-telemetry",
        "headers": {"Content-Type": "application/json"}
    }
    response = lambda_handler(event, None)
    assert response["statusCode"] == 200

    data = json.loads(response["body"])
    assert "cwcData" in data
    assert "sachetData" in data
    assert "openMeteoForecasts" in data
    assert "generatedAlerts" in data
    assert data["cwcData"]["totalStations"] >= 8

def test_api_demo_alert_endpoint():
    """Verify POST /demo-alert returns 200 with safe demo alert."""
    event = {
        "httpMethod": "POST",
        "path": "/demo-alert",
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"state": "Bihar", "river": "Ganga"})
    }
    response = lambda_handler(event, None)
    assert response["statusCode"] == 200

    demo_alert = json.loads(response["body"])
    assert demo_alert["isDemo"] is True
    assert "Ganga" in demo_alert["headline"]
    assert "Bihar" in demo_alert["headline"]
    assert "[DEMO / TEST ALERT - NOT REAL]" in demo_alert["headline"]
