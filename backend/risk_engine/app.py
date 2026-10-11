"""
Risk Engine Lambda Handler for Baadh Bol:
Triggered every 30 minutes by Amazon EventBridge.
Evaluates weather forecasts, river levels, and pollution readings across all registered areas.
Detects risk escalations, updates area scores, and enqueues notification jobs.
"""

import json
import logging
from typing import Dict, Any

from backend.shared.config import Config
from backend.shared.models import Alert, current_iso_time
from backend.shared.db import DatabaseRepository
from backend.shared.weather import WeatherService
from backend.shared.risk import (
    calculate_flood_risk,
    calculate_smog_risk,
    is_risk_escalated
)
from backend.shared.script_generator import ScriptGenerator
from backend.shared.polly_service import PollyAudioService

logger = logging.getLogger()
logger.setLevel(logging.INFO)

repo = DatabaseRepository()
weather_service = WeatherService(Config.OPEN_METEO_BASE_URL)
script_gen = ScriptGenerator()
polly_service = PollyAudioService()

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Scheduled risk evaluation handler."""
    logger.info("Starting scheduled risk engine evaluation run...")
    areas = repo.list_areas()

    processed_count = 0
    escalated_count = 0
    summary = []

    for area in areas:
        processed_count += 1
        old_level = area.current_level

        # 1. Weather forecast for area
        rainfall_3h, weather_meta = weather_service.get_rainfall_next3h(area.latitude, area.longitude)
        area.rainfall_forecast = rainfall_3h

        # 2. Risk Calculation
        if area.hazard_type == "flood":
            new_score, new_level, risk_meta = calculate_flood_risk(
                rainfall_next3h_mm=rainfall_3h,
                vulnerability=area.vulnerability,
                yamuna_level_m=area.river_level
            )
        else:
            # Smog hazard
            new_score, new_level, risk_meta = calculate_smog_risk(
                aqi_reading=None, # In production, requires operator or AQI feed
                vulnerability=area.vulnerability
            )
            new_score = new_score if new_score is not None else area.current_risk_score
            new_level = new_level if new_level is not None else area.current_level

        area.current_risk_score = new_score
        area.current_level = new_level
        area.updated_at = current_iso_time()
        repo.save_area(area)

        # 3. Check for Risk Escalation
        escalated = is_risk_escalated(old_level, new_level)
        if escalated and new_level in ["yellow", "red"]:
            escalated_count += 1
            logger.info(f"Risk escalation detected for {area.name} ({area.area_id}): {old_level} -> {new_level}")

            # Generate script & synthesize audio
            script_text = script_gen.generate_script(
                area_name=area.name,
                hazard_type=area.hazard_type,
                level=new_level
            )
            audio_key, _ = polly_service.synthesize_and_cache(script_text)

            # Auto-approval depends on safety configuration
            approval_status = "approved" if Config.AUTO_CALL_ENABLED else "pending"
            dispatch_status = "queued" if Config.AUTO_CALL_ENABLED else "pending_review"

            alert = Alert(
                area_id=area.area_id,
                hazard_type=area.hazard_type,
                level=new_level,
                risk_score=new_score,
                script_text=script_text,
                audio_key=audio_key,
                trigger="auto",
                approval_status=approval_status,
                dispatch_status=dispatch_status
            )
            repo.save_alert(alert)

            # Optional: Send to SQS if configured and enabled
            if Config.ALERT_QUEUE_URL and Config.AUTO_CALL_ENABLED:
                try:
                    import boto3
                    sqs = boto3.client("sqs", region_name=Config.AWS_REGION)
                    sqs.send_message(
                        QueueUrl=Config.ALERT_QUEUE_URL,
                        MessageBody=json.dumps({
                            "alertId": alert.alert_id,
                            "areaId": area.area_id,
                            "level": new_level,
                            "hazardType": area.hazard_type,
                            "audioKey": audio_key,
                            "scriptText": script_text
                        })
                    )
                    logger.info(f"Enqueued alert {alert.alert_id} to SQS.")
                except Exception as e:
                    logger.error(f"Failed to send alert to SQS: {e}")

        summary.append({
            "areaId": area.area_id,
            "name": area.name,
            "oldLevel": old_level,
            "newLevel": new_level,
            "rainfall3h": rainfall_3h,
            "score": new_score,
            "escalated": escalated
        })

    logger.info(f"Evaluation finished: {processed_count} evaluated, {escalated_count} escalations.")
    return {
        "status": "success",
        "processedCount": processed_count,
        "escalatedCount": escalated_count,
        "summary": summary
    }
