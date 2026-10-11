"""
Automatic Warning Engine for Baadh Bol:
Ingests and validates live hydrological data from Central Water Commission (CWC),
disaster alerts from NDMA SACHET (CAP), and weather/flood forecasts from Open-Meteo.
Deduplicates alerts using stable source identifiers.
Applies official station-specific danger thresholds.
Clearly separates Measured Observations, Official Government Warnings, and Modelled Predictions.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from .models import Alert, Area, current_iso_time
from .cwc_service import CwcService
from .sachet_service import SachetService
from .open_meteo_service import OpenMeteoService

logger = logging.getLogger(__name__)

class WarningEngine:
    def __init__(
        self,
        cwc_service: Optional[CwcService] = None,
        sachet_service: Optional[SachetService] = None,
        open_meteo_service: Optional[OpenMeteoService] = None,
        repo=None
    ):
        self.cwc = cwc_service or CwcService()
        self.sachet = sachet_service or SachetService()
        self.open_meteo = open_meteo_service or OpenMeteoService()
        self.repo = repo
        # Set of seen alert keys for deduplication
        self.seen_alert_keys: set = set()

    def sync_live_telemetry(self) -> Dict[str, Any]:
        """
        Executes unified data ingestion across CWC, NDMA SACHET, and Open-Meteo.
        Generates and stores deduplicated alerts for any breached danger thresholds.
        """
        now = datetime.now(timezone.utc)
        cwc_data = self.cwc.fetch_water_levels()
        sachet_data = self.sachet.fetch_alerts()

        # Query Open-Meteo for key anchor stations
        discharge_data = []
        for stn in cwc_data.get("stations", [])[:3]:
            try:
                forecast = self.open_meteo.get_basin_forecast(
                    latitude=stn["latitude"],
                    longitude=stn["longitude"],
                    location_name=f"{stn['river']} - {stn['stationName']}"
                )
                discharge_data.append(forecast)
            except Exception as e:
                logger.warning(f"Error fetching Open-Meteo for station {stn['stationId']}: {e}")

        # Process CWC stations for danger threshold breaches
        generated_alerts = []
        for station in cwc_data.get("stations", []):
            severity = station.get("severity")
            if severity in ["red", "yellow"]:
                alert_key = f"cwc:{station['stationId']}:{severity}:{station.get('lastUpdated')[:13]}"
                if alert_key not in self.seen_alert_keys:
                    self.seen_alert_keys.add(alert_key)
                    alert_dict = self._create_cwc_alert(station, severity, alert_key)
                    generated_alerts.append(alert_dict)

                    # Persist to database repo if available
                    if self.repo:
                        self._persist_alert(alert_dict)

        # Process NDMA SACHET official warnings
        for sa in sachet_data.get("alerts", []):
            alert_key = f"sachet:{sa['sourceId']}"
            if alert_key not in self.seen_alert_keys:
                self.seen_alert_keys.add(alert_key)
                level = "red" if sa.get("severity") in ["Extreme", "Severe"] else "yellow"
                sachet_alert_dict = {
                    "alertId": f"alert-{sa['sourceId'].replace(' ', '-').lower()}",
                    "sourceKey": alert_key,
                    "source": "NDMA SACHET (CAP)",
                    "observationType": "Official Disaster Warning",
                    "areaId": f"basin-{sa.get('basin', 'national').lower()}",
                    "affectedLocation": sa.get("areaDesc"),
                    "state": sa.get("state"),
                    "basin": sa.get("basin"),
                    "hazardType": sa.get("hazardType", "flood"),
                    "level": level,
                    "riskScore": 90.0 if level == "red" else 55.0,
                    "riskType": "Official Government Warning",
                    "headline": sa.get("headline"),
                    "scriptText": f"Official warning from {sa.get('sender')}: {sa.get('headline')}. Instructions: {sa.get('instruction')}",
                    "audioKey": "audio/Joanna_national_alert.mp3",
                    "instructions": sa.get("instruction"),
                    "trigger": "auto",
                    "approvalStatus": "approved",
                    "dispatchStatus": "completed",
                    "createdAt": sa.get("sentAt", now.isoformat()),
                    "expiresAt": sa.get("expires")
                }
                generated_alerts.append(sachet_alert_dict)
                if self.repo:
                    self._persist_alert(sachet_alert_dict)

        return {
            "cwcData": cwc_data,
            "sachetData": sachet_data,
            "openMeteoForecasts": discharge_data,
            "generatedAlerts": generated_alerts,
            "totalAlerts": len(generated_alerts),
            "syncedAt": now.isoformat()
        }

    def _create_cwc_alert(self, station: Dict[str, Any], severity: str, alert_key: str) -> Dict[str, Any]:
        """Creates a standardized Alert record from a CWC station breach."""
        now = datetime.now(timezone.utc)
        level_m = station["measuredLevelM"]
        danger_m = station["dangerLevelM"]
        warning_m = station["warningLevelM"]

        if severity == "red":
            headline = f"CRITICAL: {station['river']} River at {station['stationName']} Exceeded Danger Mark ({level_m}m vs {danger_m}m)"
            instruction = "Immediate evacuation of low-lying floodplains. Secure livestock and vital supplies. Move away from riverbanks."
            score = 85.0
        else:
            headline = f"WARNING: {station['river']} River at {station['stationName']} Exceeded Warning Level ({level_m}m vs {warning_m}m)"
            instruction = "Stay vigilant. Avoid wading in flooded channels or crossing submerged ghats. Monitor official alerts."
            score = 55.0

        return {
            "alertId": f"alert-cwc-{station['stationId']}-{now.strftime('%m%d%H')}",
            "sourceKey": alert_key,
            "source": "Central Water Commission (CWC) Gauge",
            "observationType": "Measured Hydrological Observation",
            "areaId": station["stationId"],
            "affectedLocation": f"{station['stationName']}, {station['district']} ({station['state']})",
            "state": station["state"],
            "basin": station["basin"],
            "hazardType": "flood",
            "level": severity,
            "riskScore": score,
            "riskType": "Threshold Breach (Station-Specific)",
            "measuredLevel": level_m,
            "dangerLevel": danger_m,
            "warningLevel": warning_m,
            "headline": headline,
            "scriptText": f"This is an emergency flood warning. Water levels on the {station['river']} river at {station['stationName']} have reached {level_m} meters, crossing official thresholds. {instruction} Press 1 to repeat this alert.",
            "audioKey": "audio/Joanna_cwc_flood.mp3",
            "instructions": instruction,
            "trigger": "auto",
            "approvalStatus": "approved",
            "dispatchStatus": "completed",
            "createdAt": now.isoformat()
        }

    def _persist_alert(self, alert_dict: Dict[str, Any]):
        """Saves generated alert into database repository."""
        try:
            alert_obj = Alert(
                area_id=alert_dict.get("areaId", "national-basin"),
                hazard_type=alert_dict.get("hazardType", "flood"),
                level=alert_dict.get("level", "yellow"),
                risk_score=alert_dict.get("riskScore", 60.0),
                script_text=alert_dict.get("scriptText", ""),
                audio_key=alert_dict.get("audioKey", "audio/alert.mp3"),
                alert_id=alert_dict.get("alertId"),
                trigger=alert_dict.get("trigger", "auto"),
                approval_status="approved",
                dispatch_status="completed",
                created_at=alert_dict.get("createdAt")
            )
            self.repo.save_alert(alert_obj)
        except Exception as e:
            logger.error(f"Failed to persist alert {alert_dict.get('alertId')}: {e}")

    def create_safe_demo_alert(self, state: str = "Assam", river: str = "Brahmaputra") -> Dict[str, Any]:
        """
        Creates a safe, clearly stamped DEMO alert for testing browser audio alarms
        and notifications without creating false real-world warnings.
        """
        now = datetime.now(timezone.utc)
        demo_id = f"demo-alert-{now.strftime('%H%M%S')}"
        demo_alert = {
            "alertId": demo_id,
            "sourceKey": f"demo:{demo_id}",
            "source": "Baadh Bol System Verification [SAFE DEMO MODE]",
            "observationType": "Simulated Test Alert",
            "isDemo": True,
            "areaId": "demo-station-national",
            "affectedLocation": f"Simulated {river} Basin ({state})",
            "state": state,
            "basin": river,
            "hazardType": "flood",
            "level": "red",
            "riskScore": 95.0,
            "riskType": "SIMULATED TEST ALERT",
            "headline": f"[DEMO / TEST ALERT - NOT REAL] Critical Flood Warning for {river} River in {state}",
            "scriptText": f"Attention. This is a system test for Baadh Bol National Disaster Network. If this were a real emergency, water levels on the {river} river in {state} would require immediate evacuation. Press 1 to confirm test reception.",
            "audioKey": "audio/Joanna_demo_alert.mp3",
            "instructions": "This is a safe demonstration alert. No real evacuation is needed. Verify that the browser audio chime and desktop notification were triggered successfully.",
            "trigger": "test",
            "approvalStatus": "approved",
            "dispatchStatus": "completed",
            "createdAt": now.isoformat()
        }

        # Store in seen list so sound logic treats it as a fresh event for this test
        self.seen_alert_keys.add(demo_alert["sourceKey"])

        if self.repo:
            self._persist_alert(demo_alert)

        return demo_alert
