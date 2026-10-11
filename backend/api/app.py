"""
Baadh Bol API Gateway Lambda Handler:
REST API endpoints for Areas, Residents, Alerts, Calls, Public Registration, and Test Simulation.
Includes role-based authorization (admin vs viewer), input validation, and clean error handling.
"""

import csv
import io
import json
import logging
from typing import Dict, Any, Optional

from backend.shared.config import Config
from backend.shared.models import (
    Area, Resident, Alert, Call,
    normalize_indian_phone, current_iso_time
)
from backend.shared.db import DatabaseRepository
from backend.shared.risk import calculate_flood_risk, calculate_smog_risk
from backend.shared.script_generator import ScriptGenerator
from backend.shared.polly_service import PollyAudioService
from backend.shared.call_provider import get_call_provider, MockCallProvider
from backend.shared.warning_engine import WarningEngine

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Global repository instance (reusable across warm Lambda invocations)
repo = DatabaseRepository()
script_gen = ScriptGenerator()
polly_service = PollyAudioService()
call_provider = get_call_provider(Config.CALL_PROVIDER, Config)
warning_engine = WarningEngine(repo=repo)

def build_response(status_code: int, body: Any, cors: bool = True) -> Dict[str, Any]:
    """Generates standard API Gateway proxy response with CORS headers."""
    headers = {
        "Content-Type": "application/json"
    }
    if cors:
        headers.update({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
        })
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, ensure_ascii=False)
    }

def get_auth_role(event: Dict[str, Any]) -> str:
    """
    Extracts operator role ('admin' or 'viewer') from Cognito authorizer claims or dev headers.
    """
    # 1. Check API Gateway Cognito claims
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})
    claims = authorizer.get("claims", {})
    groups = claims.get("cognito:groups", "")
    if "admin" in groups:
        return "admin"
    if "viewer" in groups:
        return "viewer"

    # 2. Check Authorization header for local/dev mock tokens
    headers = event.get("headers") or {}
    auth_header = headers.get("Authorization") or headers.get("authorization") or ""
    if "mock-admin" in auth_header:
        return "admin"
    if "mock-viewer" in auth_header:
        return "viewer"

    # Default to admin in local dev mode when no auth configured
    if Config.ENVIRONMENT == "local":
        return "admin"

    return "viewer"

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main API Gateway router."""
    http_method = event.get("httpMethod", "GET").upper()
    path = event.get("path", "/")
    query_params = event.get("queryStringParameters") or {}

    # Handle CORS preflight
    if http_method == "OPTIONS":
        return build_response(200, {"status": "ok"})

    # Parse JSON body safely
    body_data: Dict[str, Any] = {}
    raw_body = event.get("body")
    if raw_body:
        try:
            body_data = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
        except Exception:
            body_data = {}

    role = get_auth_role(event)

    try:
        # ---------------- HEALTH CHECK ----------------
        if path == "/health" and http_method == "GET":
            return build_response(200, {
                "status": "healthy",
                "service": "Baadh Bol API",
                "environment": Config.ENVIRONMENT,
                "region": Config.AWS_REGION,
                "callProvider": Config.CALL_PROVIDER
            })

        # ---------------- PUBLIC REGISTRATION ----------------
        if path == "/register" and http_method == "POST":
            return handle_public_registration(body_data)

        # ---------------- CALL PROVIDER WEBHOOK ----------------
        if path == "/calls/callback" and http_method == "POST":
            return handle_call_callback(body_data)

        # ---------------- AREAS ----------------
        if path == "/areas" and http_method == "GET":
            areas = repo.list_areas()
            return build_response(200, [a.to_dict() for a in areas])

        if path == "/areas" and http_method == "POST":
            if role != "admin":
                return build_response(403, {"error": "Admin role required to create areas"})
            return handle_create_area(body_data)

        if path.startswith("/areas/") and path.endswith("/river-level") and http_method == "PUT":
            if role != "admin":
                return build_response(403, {"error": "Admin role required to update river levels"})
            area_id = path.split("/")[2]
            return handle_update_river_level(area_id, body_data)

        if path.startswith("/areas/") and http_method == "PUT":
            if role != "admin":
                return build_response(403, {"error": "Admin role required to edit areas"})
            area_id = path.split("/")[2]
            return handle_update_area(area_id, body_data)

        if path.startswith("/areas/") and http_method == "GET":
            area_id = path.split("/")[2]
            area = repo.get_area(area_id)
            if not area:
                return build_response(404, {"error": "Area not found"})
            return build_response(200, area.to_dict())

        # ---------------- RESIDENTS ----------------
        if path == "/residents" and http_method == "GET":
            area_id = query_params.get("areaId")
            residents = repo.list_residents(area_id=area_id, mask_phone=True)
            return build_response(200, residents)

        if path == "/residents" and http_method == "POST":
            if role != "admin":
                return build_response(403, {"error": "Admin role required to register residents"})
            return handle_create_resident(body_data)

        if path == "/residents/import" and http_method == "POST":
            if role != "admin":
                return build_response(403, {"error": "Admin role required to import residents"})
            return handle_import_residents(body_data)

        if path.startswith("/residents/") and http_method == "DELETE":
            if role != "admin":
                return build_response(403, {"error": "Admin role required to delete residents"})
            resident_id = path.split("/")[2]
            deleted = repo.delete_resident(resident_id)
            if not deleted:
                return build_response(404, {"error": "Resident not found"})
            return build_response(200, {"success": True, "residentId": resident_id})

        # ---------------- ALERTS ----------------
        if path == "/alerts" and http_method == "GET":
            area_id = query_params.get("areaId")
            alerts = repo.list_alerts(area_id=area_id)
            return build_response(200, [a.to_dict() for a in alerts])

        if path.startswith("/alerts/") and path.endswith("/calls") and http_method == "GET":
            alert_id = path.split("/")[2]
            calls = repo.list_calls_by_alert(alert_id)
            return build_response(200, [c.to_dict() for c in calls])

        # ---------------- LIVE TELEMETRY & WARNING ENGINE ----------------
        if path == "/live-telemetry" and http_method == "GET":
            telemetry = warning_engine.sync_live_telemetry()
            return build_response(200, telemetry)

        # ---------------- DEMO ALERT (SAFE SYSTEM TEST) ----------------
        if path == "/demo-alert" and http_method == "POST":
            state = body_data.get("state", "Assam")
            river = body_data.get("river", "Brahmaputra")
            demo_alert = warning_engine.create_safe_demo_alert(state=state, river=river)
            return build_response(200, demo_alert)

        # ---------------- SIMULATE / TEST ALERT ----------------
        if path == "/simulate" and http_method == "POST":
            if role != "admin":
                return build_response(403, {"error": "Admin role required to trigger test alerts"})
            return handle_simulate_alert(body_data)

        return build_response(404, {"error": f"Endpoint not found: {http_method} {path}"})

    except Exception as e:
        logger.error(f"Internal API Error handling {http_method} {path}: {str(e)}", exc_info=True)
        return build_response(500, {"error": "Internal server error occurred. Please try again."})

# ---------------- HANDLER FUNCTIONS ----------------

def handle_create_area(data: Dict[str, Any]) -> Dict[str, Any]:
    name = (data.get("name") or "").strip()
    if not name:
        return build_response(400, {"error": "Area name is required"})

    try:
        lat = float(data.get("latitude", 28.6139))
        lon = float(data.get("longitude", 77.2090))
        vuln = int(data.get("vulnerability", 3))
    except (ValueError, TypeError):
        return build_response(400, {"error": "Latitude, longitude, and vulnerability must be valid numbers"})

    hazard_type = data.get("hazardType", "flood")
    if hazard_type not in ["flood", "smog"]:
        hazard_type = "flood"

    river_level = None
    if "riverLevel" in data and data["riverLevel"] is not None:
        try:
            river_level = float(data["riverLevel"])
        except ValueError:
            pass

    # Initial risk calculation
    if hazard_type == "flood":
        score, level, _ = calculate_flood_risk(0.0, vuln, river_level)
    else:
        score, level, _ = calculate_smog_risk(None, vuln)
        score = score or 0.0
        level = level or "green"

    area = Area(
        name=name,
        latitude=lat,
        longitude=lon,
        hazard_type=hazard_type,
        vulnerability=vuln,
        current_risk_score=score,
        current_level=level,
        river_level=river_level
    )
    saved = repo.save_area(area)
    return build_response(201, saved.to_dict())

def handle_update_area(area_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    area = repo.get_area(area_id)
    if not area:
        return build_response(404, {"error": "Area not found"})

    if "name" in data and data["name"].strip():
        area.name = data["name"].strip()
    if "latitude" in data:
        area.latitude = float(data["latitude"])
    if "longitude" in data:
        area.longitude = float(data["longitude"])
    if "vulnerability" in data:
        area.vulnerability = max(1, min(5, int(data["vulnerability"])))
    if "hazardType" in data and data["hazardType"] in ["flood", "smog"]:
        area.hazard_type = data["hazardType"]

    saved = repo.save_area(area)
    return build_response(200, saved.to_dict())

def handle_update_river_level(area_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    area = repo.get_area(area_id)
    if not area:
        return build_response(404, {"error": "Area not found"})

    if "riverLevel" not in data:
        return build_response(400, {"error": "riverLevel is required"})

    try:
        new_river_level = float(data["riverLevel"])
    except (ValueError, TypeError):
        return build_response(400, {"error": "riverLevel must be a valid numeric meter reading"})

    area.river_level = new_river_level
    score, level, _ = calculate_flood_risk(area.rainfall_forecast, area.vulnerability, new_river_level)
    area.current_risk_score = score
    area.current_level = level

    saved = repo.save_area(area)
    return build_response(200, {
        "success": True,
        "area": saved.to_dict(),
        "updatedRiskScore": score,
        "updatedLevel": level
    })

def handle_create_resident(data: Dict[str, Any]) -> Dict[str, Any]:
    name = (data.get("name") or "").strip()
    phone = data.get("phone") or ""
    area_id = data.get("areaId") or ""

    if not name or not phone or not area_id:
        return build_response(400, {"error": "Name, phone, and areaId are required"})

    area = repo.get_area(area_id)
    if not area:
        return build_response(400, {"error": "Specified area does not exist"})

    normalized_phone = normalize_indian_phone(phone)
    if not normalized_phone:
        return build_response(400, {"error": "Please provide a valid 10-digit Indian mobile number"})

    consent = data.get("consent", True)
    if not consent:
        return build_response(400, {"error": "Resident consent is required to register"})

    resident = Resident(
        name=name,
        phone=normalized_phone,
        area_id=area_id,
        language=data.get("language", "en"),
        consent=True,
        source="operator"
    )
    saved = repo.save_resident(resident)
    return build_response(201, saved.to_dict(mask_phone=True))

def handle_public_registration(data: Dict[str, Any]) -> Dict[str, Any]:
    name = (data.get("name") or "").strip()
    phone = data.get("phone") or ""
    area_id = data.get("areaId") or ""
    consent = data.get("consent", False)

    if not name or not phone or not area_id:
        return build_response(400, {"error": "Name, phone number, and area are required."})

    if not consent:
        return build_response(400, {"error": "Consent is required to receive emergency alerts."})

    normalized_phone = normalize_indian_phone(phone)
    if not normalized_phone:
        return build_response(400, {"error": "Please enter a valid 10-digit phone number."})

    area = repo.get_area(area_id)
    if not area:
        return build_response(400, {"error": "Invalid area selected."})

    resident = Resident(
        name=name,
        phone=normalized_phone,
        area_id=area_id,
        language="en",
        consent=True,
        source="public_web"
    )
    repo.save_resident(resident)
    return build_response(201, {
        "success": True,
        "message": "Registration successful! You will only be alerted in emergencies."
    })

def handle_import_residents(data: Dict[str, Any]) -> Dict[str, Any]:
    """Imports residents from CSV text or array of rows."""
    imported_count = 0
    errors = []

    # Can accept raw CSV text in 'csvText' or list of dicts in 'rows'
    csv_text = data.get("csvText")
    rows = data.get("rows")

    if csv_text:
        reader = csv.DictReader(io.StringIO(csv_text.strip()))
        rows_to_process = list(reader)
    elif isinstance(rows, list):
        rows_to_process = rows
    else:
        return build_response(400, {"error": "Please provide either 'csvText' or 'rows' array"})

    for idx, row in enumerate(rows_to_process, start=1):
        name = (row.get("name") or "").strip()
        phone = row.get("phone") or ""
        area_id = (row.get("areaId") or "").strip()

        if not name or not phone or not area_id:
            errors.append(f"Row {idx}: Name, phone, and areaId are required")
            continue

        normalized = normalize_indian_phone(phone)
        if not normalized:
            errors.append(f"Row {idx}: Invalid phone '{phone}'")
            continue

        resident = Resident(
            name=name,
            phone=normalized,
            area_id=area_id,
            language=row.get("language", "hi"),
            consent=True,
            source="csv_import"
        )
        repo.save_resident(resident)
        imported_count += 1

    return build_response(200, {
        "success": True,
        "importedCount": imported_count,
        "errorCount": len(errors),
        "errors": errors[:20]  # Cap error list
    })

def handle_simulate_alert(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Test Alert Hero Functionality:
    1. Select area & level
    2. Bedrock/Fallback generates Hindi script
    3. Polly synthesizes speech, caches in S3
    4. Creates Alert record (trigger='test')
    5. Calls allowlisted demo recipient (or mock)
    6. Logs Call record
    """
    area_id = data.get("areaId")
    if not area_id:
        return build_response(400, {"error": "areaId is required for test alert"})

    area = repo.get_area(area_id)
    if not area:
        return build_response(404, {"error": "Area not found"})

    level = data.get("level", "yellow")
    if level not in ["green", "yellow", "red"]:
        level = "yellow"

    hazard_type = data.get("hazardType", area.hazard_type)

    # 1. Generate Hindi script
    script_text = script_gen.generate_script(
        area_name=area.name,
        hazard_type=hazard_type,
        level=level
    )

    # 2. Synthesize audio via Polly
    audio_key, audio_url = polly_service.synthesize_and_cache(script_text)

    # 3. Create Alert record
    alert = Alert(
        area_id=area.area_id,
        hazard_type=hazard_type,
        level=level,
        risk_score=area.current_risk_score,
        script_text=script_text,
        audio_key=audio_key,
        trigger="test",
        approval_status="approved",
        dispatch_status="completed"
    )
    repo.save_alert(alert)

    # 4. Determine test recipient phone
    # Safety: demo recipient must be allowlisted or mock mode
    requested_phone = data.get("testPhone")
    target_phone = None

    if requested_phone:
        normalized_requested = normalize_indian_phone(requested_phone)
        if normalized_requested:
            # Check allowlist if in production
            if Config.ENVIRONMENT == "production":
                if normalized_requested not in Config.TEST_ALLOWLIST_PHONES:
                    return build_response(403, {
                        "error": f"Phone number {requested_phone} is not on the test allowlist.",
                        "allowlistConfigured": len(Config.TEST_ALLOWLIST_PHONES) > 0
                    })
            target_phone = normalized_requested

    if not target_phone:
        # Default to first allowlisted or demo mock phone
        if Config.TEST_ALLOWLIST_PHONES:
            target_phone = Config.TEST_ALLOWLIST_PHONES[0]
        else:
            target_phone = "+919876543210"

    # 5. Initiate Call via selected provider
    call_result = call_provider.initiate_call(
        to_phone=target_phone,
        audio_url=audio_url,
        alert_id=alert.alert_id,
        resident_id="demo-test-recipient"
    )

    # 6. Save Call record
    call = Call(
        alert_id=alert.alert_id,
        resident_id="demo-test-recipient",
        provider_call_id=call_result.provider_call_id,
        status=call_result.status,
        provider=Config.CALL_PROVIDER,
        phone_masked=target_phone[:6] + "****" + target_phone[-2:]
    )
    repo.save_call(call)

    # Update area last alert time
    area.last_alert_at = current_iso_time()
    repo.save_area(area)

    return build_response(200, {
        "success": True,
        "alert": alert.to_dict(),
        "call": call.to_dict(),
        "audioUrl": audio_url,
        "scriptText": script_text,
        "callResult": call_result.to_dict()
    })

def handle_call_callback(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Processes incoming status & keypress webhook from calling provider."""
    parsed = call_provider.handle_status_callback(payload)
    call_sid = parsed.get("providerCallId")
    status = parsed.get("status", "answered")
    key_pressed = parsed.get("keyPressed")

    logger.info(f"Received call callback for {call_sid}: status={status}, key={key_pressed}")

    # If key '9' pressed, resident opted out of future calls
    if key_pressed == "9" and "residentId" in payload:
        repo.update_opt_out(payload["residentId"], True)
        logger.info(f"Resident {payload['residentId']} opted out via keypress 9.")

    return build_response(200, {"status": "callback_processed", "data": parsed})
