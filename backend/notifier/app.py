"""
Notifier Lambda Handler for Baadh Bol:
Consumes alert notification jobs from Amazon SQS.
Retrieves consenting residents for the affected area and dispatches voice calls.
Updates call logs and alert status in DynamoDB.
"""

import json
import logging
from typing import Dict, Any, List

from backend.shared.config import Config
from backend.shared.models import Call, current_iso_time
from backend.shared.db import DatabaseRepository
from backend.shared.call_provider import get_call_provider
from backend.shared.polly_service import PollyAudioService

logger = logging.getLogger()
logger.setLevel(logging.INFO)

repo = DatabaseRepository()
call_provider = get_call_provider(Config.CALL_PROVIDER, Config)
polly_service = PollyAudioService()

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Processes SQS records or direct invocation event."""
    records = event.get("Records", [])
    logger.info(f"Notifier received {len(records)} SQS message records.")

    processed_alerts = 0
    total_calls_initiated = 0

    # If triggered directly rather than via SQS Records
    if not records and "alertId" in event:
        records = [{"body": json.dumps(event)}]

    for record in records:
        try:
            body_str = record.get("body", "{}")
            message = json.loads(body_str)

            alert_id = message.get("alertId")
            area_id = message.get("areaId")
            audio_key = message.get("audioKey")

            if not alert_id or not area_id:
                logger.error(f"Missing alertId or areaId in SQS message: {message}")
                continue

            alert = repo.get_alert(alert_id)
            if not alert:
                logger.error(f"Alert {alert_id} not found in database.")
                continue

            # Presigned URL for the audio object
            _, audio_url = polly_service.synthesize_and_cache(alert.script_text)

            # Retrieve active, consenting residents for this area
            residents = repo.get_active_residents_for_calling(area_id)
            logger.info(f"Alert {alert_id}: Dispatching calls to {len(residents)} active residents.")

            calls_for_this_alert = 0
            for resident in residents:
                # Double-check consent and opt-out status
                if not resident.consent or resident.opted_out:
                    continue

                call_res = call_provider.initiate_call(
                    to_phone=resident.phone,
                    audio_url=audio_url,
                    alert_id=alert.alert_id,
                    resident_id=resident.resident_id
                )

                call_record = Call(
                    alert_id=alert.alert_id,
                    resident_id=resident.resident_id,
                    provider_call_id=call_res.provider_call_id,
                    status=call_res.status,
                    provider=Config.CALL_PROVIDER,
                    phone_masked=resident.to_dict(mask_phone=True)["phone"]
                )
                repo.save_call(call_record)
                calls_for_this_alert += 1
                total_calls_initiated += 1

            alert.dispatch_status = "completed"
            repo.save_alert(alert)
            processed_alerts += 1

        except Exception as e:
            logger.error(f"Error processing alert record: {e}", exc_info=True)
            # Re-raise to trigger SQS DLQ retry if appropriate
            raise e

    return {
        "status": "success",
        "processedAlerts": processed_alerts,
        "totalCallsInitiated": total_calls_initiated
    }
