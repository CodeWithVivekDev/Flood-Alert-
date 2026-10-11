"""
Calling Provider Abstraction for Baadh Bol:
Supports Mock (for local testing/demos without credentials),
Twilio (REST API + TwiML with IVR 1=Repeat, 9=Opt-out),
and Amazon Connect (StartOutboundVoiceContact).
"""

import abc
import base64
import json
import logging
import urllib.parse
import urllib.request
import uuid
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class CallResult:
    def __init__(
        self,
        success: bool,
        provider_call_id: str,
        status: str = "initiated",
        error_message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.success = success
        self.provider_call_id = provider_call_id
        self.status = status
        self.error_message = error_message
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "providerCallId": self.provider_call_id,
            "status": self.status,
            "errorMessage": self.error_message,
            "details": self.details
        }

class BaseCallProvider(abc.ABC):
    @abc.abstractmethod
    def initiate_call(
        self,
        to_phone: str,
        audio_url: str,
        alert_id: str,
        resident_id: str,
        callback_url: Optional[str] = None
    ) -> CallResult:
        """Initiates an outbound voice call to the recipient."""
        pass

    @abc.abstractmethod
    def handle_status_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parses webhook callback from provider and extracts status & keypress."""
        pass

class MockCallProvider(BaseCallProvider):
    """
    Mock Call Provider for local testing, offline development, and zero-credential CI.
    Never misleads operators: all responses are clearly labelled with provider='mock'.
    """
    def __init__(self, simulate_status: str = "answered"):
        self.simulate_status = simulate_status

    def initiate_call(
        self,
        to_phone: str,
        audio_url: str,
        alert_id: str,
        resident_id: str,
        callback_url: Optional[str] = None
    ) -> CallResult:
        mock_call_id = f"mock-call-{uuid.uuid4().hex[:10]}"
        logger.info(
            f"[MOCK CALL] To: {to_phone} | Alert: {alert_id} | Resident: {resident_id} | "
            f"Audio: {audio_url} | CallId: {mock_call_id}"
        )
        return CallResult(
            success=True,
            provider_call_id=mock_call_id,
            status=self.simulate_status,
            details={
                "provider": "mock",
                "simulated": True,
                "note": "Mock mode: Simulated call without carrier charges.",
                "to_phone": to_phone
            }
        )

    def handle_status_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "providerCallId": payload.get("providerCallId", "mock-call-sample"),
            "status": payload.get("status", "answered"),
            "keyPressed": payload.get("keyPressed", "1"),
            "provider": "mock"
        }

class TwilioCallProvider(BaseCallProvider):
    """
    Twilio Outbound Voice Call integration.
    Plays Hindi audio, offers IVR keypress (1 to repeat audio, 9 to opt out),
    and logs status updates.
    """
    def __init__(
        self,
        account_sid: str,
        auth_token: str,
        from_number: str,
        status_callback_url: Optional[str] = None
    ):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self.status_callback_url = status_callback_url

    def _generate_twiml(self, audio_url: str, callback_url: Optional[str] = None) -> str:
        """
        Builds TwiML with <Gather> for 1=Repeat, 9=Opt-out.
        """
        action_attr = f' action="{callback_url}"' if callback_url else ""
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Response>'
            f'<Gather numDigits="1" timeout="5"{action_attr}>'
            f'<Play>{audio_url}</Play>'
            '<Say language="en-US">To repeat this message, press 1. To opt out of future alerts, press 9.</Say>'
            '</Gather>'
            f'<Play>{audio_url}</Play>'
            '<Hangup/>'
            '</Response>'
        )

    def initiate_call(
        self,
        to_phone: str,
        audio_url: str,
        alert_id: str,
        resident_id: str,
        callback_url: Optional[str] = None
    ) -> CallResult:
        if not self.account_sid or not self.auth_token or not self.from_number:
            return CallResult(
                success=False,
                provider_call_id="",
                status="failed",
                error_message="Twilio credentials (AccountSID/AuthToken/FromNumber) are not configured."
            )

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Calls.json"
        twiml = self._generate_twiml(audio_url, callback_url)

        data = {
            "To": to_phone,
            "From": self.from_number,
            "Twiml": twiml
        }
        effective_cb = callback_url or self.status_callback_url
        if effective_cb:
            data["StatusCallback"] = effective_cb
            data["StatusCallbackEvent"] = "completed"

        encoded_data = urllib.parse.urlencode(data).encode("utf-8")
        auth_header = base64.b64encode(f"{self.account_sid}:{self.auth_token}".encode("utf-8")).decode("ascii")

        req = urllib.request.Request(
            url,
            data=encoded_data,
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_json = json.loads(resp.read().decode("utf-8"))
                sid = resp_json.get("sid", "")
                status = resp_json.get("status", "initiated")
                return CallResult(
                    success=True,
                    provider_call_id=sid,
                    status=status,
                    details=resp_json
                )
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            logger.error(f"Twilio call failed: {e.code} {err_body}")
            return CallResult(
                success=False,
                provider_call_id="",
                status="failed",
                error_message=f"Twilio API error {e.code}: {err_body}"
            )
        except Exception as e:
            logger.error(f"Twilio connection error: {e}")
            return CallResult(
                success=False,
                provider_call_id="",
                status="failed",
                error_message=str(e)
            )

    def handle_status_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses Twilio webhook parameters:
        CallSid, CallStatus, Digits (from Gather)
        """
        digits = payload.get("Digits")
        call_status = payload.get("CallStatus", "completed")
        mapped_status = "answered" if call_status in ["completed", "in-progress"] else call_status

        return {
            "providerCallId": payload.get("CallSid", ""),
            "status": mapped_status,
            "keyPressed": digits,
            "provider": "twilio"
        }

class ConnectCallProvider(BaseCallProvider):
    """
    Amazon Connect Outbound Voice Call integration.
    """
    def __init__(
        self,
        connect_client=None,
        instance_id: Optional[str] = None,
        contact_flow_id: Optional[str] = None,
        source_phone_number: Optional[str] = None
    ):
        self.connect_client = connect_client
        self.instance_id = instance_id
        self.contact_flow_id = contact_flow_id
        self.source_phone_number = source_phone_number

    def initiate_call(
        self,
        to_phone: str,
        audio_url: str,
        alert_id: str,
        resident_id: str,
        callback_url: Optional[str] = None
    ) -> CallResult:
        if not self.connect_client or not self.instance_id or not self.contact_flow_id:
            return CallResult(
                success=False,
                provider_call_id="",
                status="failed",
                error_message="Amazon Connect client, InstanceId, or ContactFlowId is missing."
            )

        try:
            params = {
                "DestinationPhoneNumber": to_phone,
                "ContactFlowId": self.contact_flow_id,
                "InstanceId": self.instance_id,
                "Attributes": {
                    "AudioUrl": audio_url,
                    "AlertId": alert_id,
                    "ResidentId": resident_id
                }
            }
            if self.source_phone_number:
                params["SourcePhoneNumber"] = self.source_phone_number

            resp = self.connect_client.start_outbound_voice_contact(**params)
            contact_id = resp.get("ContactId", "")
            return CallResult(
                success=True,
                provider_call_id=contact_id,
                status="initiated",
                details=resp
            )
        except Exception as e:
            logger.error(f"Amazon Connect call initiation error: {e}")
            return CallResult(
                success=False,
                provider_call_id="",
                status="failed",
                error_message=str(e)
            )

    def handle_status_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "providerCallId": payload.get("ContactId", ""),
            "status": payload.get("Status", "completed"),
            "keyPressed": payload.get("KeyPressed"),
            "provider": "connect"
        }

def get_call_provider(
    provider_name: str = "mock",
    config: Optional[Any] = None,
    connect_client: Optional[Any] = None
) -> BaseCallProvider:
    """Factory function returning the configured call provider."""
    p_name = (provider_name or "mock").lower()

    if p_name == "twilio" and config and config.TWILIO_ACCOUNT_SID:
        return TwilioCallProvider(
            account_sid=config.TWILIO_ACCOUNT_SID,
            auth_token=config.TWILIO_AUTH_TOKEN,
            from_number=config.TWILIO_FROM_NUMBER,
            status_callback_url=config.TWILIO_STATUS_CALLBACK_URL
        )
    elif p_name == "connect" and config and config.CONNECT_INSTANCE_ID:
        return ConnectCallProvider(
            connect_client=connect_client,
            instance_id=config.CONNECT_INSTANCE_ID,
            contact_flow_id=config.CONNECT_CONTACT_FLOW_ID,
            source_phone_number=config.CONNECT_SOURCE_PHONE_NUMBER
        )
    return MockCallProvider()
