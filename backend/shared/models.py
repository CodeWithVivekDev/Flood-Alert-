import re
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Literal

HazardType = Literal["flood", "smog"]
RiskLevel = Literal["green", "yellow", "red"]
AlertTrigger = Literal["auto", "manual", "test"]
CallStatus = Literal["initiated", "in_progress", "answered", "no_answer", "failed", "completed"]

def current_iso_time() -> str:
    return datetime.now(timezone.utc).isoformat()

def normalize_indian_phone(phone: str) -> Optional[str]:
    """
    Normalizes Indian phone numbers into standard E.164 format: +91XXXXXXXXXX
    Returns None if invalid.
    """
    if not phone:
        return None
    # Strip spaces, dashes, parentheses
    cleaned = re.sub(r"[\s\-\(\)]", "", phone.strip())
    # Handle formats: 9876543210, 09876543210, +919876543210, 919876543210
    if re.match(r"^\+91[6-9]\d{9}$", cleaned):
        return cleaned
    if re.match(r"^91[6-9]\d{9}$", cleaned):
        return f"+{cleaned}"
    if re.match(r"^0[6-9]\d{9}$", cleaned):
        return f"+91{cleaned[1:]}"
    if re.match(r"^[6-9]\d{9}$", cleaned):
        return f"+91{cleaned}"
    return None

def mask_phone_number(phone: str) -> str:
    """
    Masks middle digits of phone number for privacy display: +91 98*** **210
    """
    if not phone or len(phone) < 10:
        return "******"
    if phone.startswith("+91") and len(phone) == 13:
        return f"+91 {phone[3:5]}*** **{phone[10:]}"
    if len(phone) >= 10:
        return f"{phone[:2]}*** **{phone[-3:]}"
    return phone

class Area:
    def __init__(
        self,
        name: str,
        latitude: float,
        longitude: float,
        hazard_type: HazardType = "flood",
        vulnerability: int = 3,
        area_id: Optional[str] = None,
        current_risk_score: float = 0.0,
        current_level: RiskLevel = "green",
        rainfall_forecast: float = 0.0,
        river_level: Optional[float] = None,
        last_alert_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        self.area_id = area_id or f"area-{uuid.uuid4().hex[:8]}"
        self.name = name.strip()
        self.latitude = float(latitude)
        self.longitude = float(longitude)
        self.hazard_type: HazardType = hazard_type if hazard_type in ["flood", "smog"] else "flood"
        self.vulnerability = max(1, min(5, int(vulnerability)))
        self.current_risk_score = float(current_risk_score)
        self.current_level: RiskLevel = current_level if current_level in ["green", "yellow", "red"] else "green"
        self.rainfall_forecast = float(rainfall_forecast)
        self.river_level = float(river_level) if river_level is not None else None
        self.last_alert_at = last_alert_at
        self.updated_at = updated_at or current_iso_time()

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "areaId": self.area_id,
            "name": self.name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "hazardType": self.hazard_type,
            "vulnerability": self.vulnerability,
            "currentRiskScore": round(self.current_risk_score, 2),
            "currentLevel": self.current_level,
            "rainfallForecast": round(self.rainfall_forecast, 2),
            "updatedAt": self.updated_at
        }
        if self.river_level is not None:
            data["riverLevel"] = round(self.river_level, 2)
        if self.last_alert_at:
            data["lastAlertAt"] = self.last_alert_at
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Area":
        return cls(
            name=data.get("name", "Unnamed Area"),
            latitude=data.get("latitude", 28.6139),
            longitude=data.get("longitude", 77.2090),
            hazard_type=data.get("hazardType", "flood"),
            vulnerability=data.get("vulnerability", 3),
            area_id=data.get("areaId"),
            current_risk_score=data.get("currentRiskScore", 0.0),
            current_level=data.get("currentLevel", "green"),
            rainfall_forecast=data.get("rainfallForecast", 0.0),
            river_level=data.get("riverLevel"),
            last_alert_at=data.get("lastAlertAt"),
            updated_at=data.get("updatedAt")
        )

class Resident:
    def __init__(
        self,
        name: str,
        phone: str,
        area_id: str,
        language: str = "en",
        consent: bool = True,
        resident_id: Optional[str] = None,
        consent_at: Optional[str] = None,
        opted_out: bool = False,
        created_at: Optional[str] = None,
        source: str = "operator"
    ):
        self.resident_id = resident_id or f"res-{uuid.uuid4().hex[:8]}"
        self.name = name.strip()
        normalized_phone = normalize_indian_phone(phone)
        if not normalized_phone:
            raise ValueError(f"Invalid Indian phone number: {phone}")
        self.phone = normalized_phone
        self.area_id = area_id
        self.language = language or "en"
        self.consent = bool(consent)
        self.consent_at = consent_at or current_iso_time()
        self.opted_out = bool(opted_out)
        self.created_at = created_at or current_iso_time()
        self.source = source

    def to_dict(self, mask_phone: bool = True) -> Dict[str, Any]:
        return {
            "residentId": self.resident_id,
            "name": self.name,
            "phone": mask_phone_number(self.phone) if mask_phone else self.phone,
            "areaId": self.area_id,
            "language": self.language,
            "consent": self.consent,
            "consentAt": self.consent_at,
            "optedOut": self.opted_out,
            "createdAt": self.created_at,
            "source": self.source
        }

    def to_db_dict(self) -> Dict[str, Any]:
        """Returns full unmasked data for storage and call dispatch."""
        return self.to_dict(mask_phone=False)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Resident":
        return cls(
            name=data.get("name", "Unknown"),
            phone=data.get("phone", ""),
            area_id=data.get("areaId", ""),
            language=data.get("language", "hi"),
            consent=data.get("consent", True),
            resident_id=data.get("residentId"),
            consent_at=data.get("consentAt"),
            opted_out=data.get("optedOut", False),
            created_at=data.get("createdAt"),
            source=data.get("source", "operator")
        )

class Alert:
    def __init__(
        self,
        area_id: str,
        hazard_type: HazardType,
        level: RiskLevel,
        risk_score: float,
        script_text: str,
        audio_key: str,
        alert_id: Optional[str] = None,
        created_at: Optional[str] = None,
        trigger: AlertTrigger = "manual",
        approval_status: str = "approved",
        dispatch_status: str = "queued"
    ):
        self.alert_id = alert_id or f"alert-{uuid.uuid4().hex[:8]}"
        self.area_id = area_id
        self.hazard_type = hazard_type
        self.level = level
        self.risk_score = float(risk_score)
        self.script_text = script_text
        self.audio_key = audio_key
        self.created_at = created_at or current_iso_time()
        self.trigger = trigger
        self.approval_status = approval_status
        self.dispatch_status = dispatch_status

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alertId": self.alert_id,
            "areaId": self.area_id,
            "hazardType": self.hazard_type,
            "level": self.level,
            "riskScore": round(self.risk_score, 2),
            "scriptText": self.script_text,
            "audioKey": self.audio_key,
            "createdAt": self.created_at,
            "trigger": self.trigger,
            "approvalStatus": self.approval_status,
            "dispatchStatus": self.dispatch_status
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Alert":
        return cls(
            area_id=data.get("areaId", ""),
            hazard_type=data.get("hazardType", "flood"),
            level=data.get("level", "green"),
            risk_score=data.get("riskScore", 0.0),
            script_text=data.get("scriptText", ""),
            audio_key=data.get("audioKey", ""),
            alert_id=data.get("alertId"),
            created_at=data.get("createdAt"),
            trigger=data.get("trigger", "manual"),
            approval_status=data.get("approvalStatus", "approved"),
            dispatch_status=data.get("dispatchStatus", "queued")
        )

class Call:
    def __init__(
        self,
        alert_id: str,
        resident_id: str,
        call_id: Optional[str] = None,
        provider_call_id: Optional[str] = None,
        status: CallStatus = "initiated",
        key_pressed: Optional[str] = None,
        attempt_count: int = 1,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None,
        phone_masked: Optional[str] = None,
        provider: str = "mock"
    ):
        self.call_id = call_id or f"call-{uuid.uuid4().hex[:8]}"
        self.alert_id = alert_id
        self.resident_id = resident_id
        self.provider_call_id = provider_call_id or f"prov-{uuid.uuid4().hex[:8]}"
        self.status = status
        self.key_pressed = key_pressed
        self.attempt_count = attempt_count
        self.created_at = created_at or current_iso_time()
        self.updated_at = updated_at or current_iso_time()
        self.phone_masked = phone_masked or "******"
        self.provider = provider

    def to_dict(self) -> Dict[str, Any]:
        return {
            "callId": self.call_id,
            "alertId": self.alert_id,
            "residentId": self.resident_id,
            "providerCallId": self.provider_call_id,
            "status": self.status,
            "keyPressed": self.key_pressed,
            "attemptCount": self.attempt_count,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "phoneMasked": self.phone_masked,
            "provider": self.provider
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Call":
        return cls(
            alert_id=data.get("alertId", ""),
            resident_id=data.get("residentId", ""),
            call_id=data.get("callId"),
            provider_call_id=data.get("providerCallId"),
            status=data.get("status", "initiated"),
            key_pressed=data.get("keyPressed"),
            attempt_count=data.get("attemptCount", 1),
            created_at=data.get("createdAt"),
            updated_at=data.get("updatedAt"),
            phone_masked=data.get("phoneMasked"),
            provider=data.get("provider", "mock")
        )
