import os
from typing import List

class Config:
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "local")

    # DynamoDB Tables
    AREAS_TABLE: str = os.getenv("AREAS_TABLE", "BaadhBol-Areas-local")
    RESIDENTS_TABLE: str = os.getenv("RESIDENTS_TABLE", "BaadhBol-Residents-local")
    ALERTS_TABLE: str = os.getenv("ALERTS_TABLE", "BaadhBol-Alerts-local")
    CALLS_TABLE: str = os.getenv("CALLS_TABLE", "BaadhBol-Calls-local")

    # S3 Audio Bucket
    AUDIO_BUCKET_NAME: str = os.getenv("AUDIO_BUCKET_NAME", "baadh-bol-audio-cache-local")

    # SQS
    ALERT_QUEUE_URL: str = os.getenv("ALERT_QUEUE_URL", "")

    # Calling Provider: 'mock' | 'twilio' | 'connect'
    CALL_PROVIDER: str = os.getenv("CALL_PROVIDER", "mock")

    # Twilio
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")
    TWILIO_STATUS_CALLBACK_URL: str = os.getenv("TWILIO_STATUS_CALLBACK_URL", "")

    # Connect
    CONNECT_INSTANCE_ID: str = os.getenv("CONNECT_INSTANCE_ID", "")
    CONNECT_CONTACT_FLOW_ID: str = os.getenv("CONNECT_CONTACT_FLOW_ID", "")
    CONNECT_SOURCE_PHONE_NUMBER: str = os.getenv("CONNECT_SOURCE_PHONE_NUMBER", "")

    # Bedrock
    BEDROCK_MODEL_ID: str = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

    # Polly
    POLLY_VOICE_ID: str = os.getenv("POLLY_VOICE_ID", "Joanna")
    POLLY_ENGINE: str = os.getenv("POLLY_ENGINE", "neural")

    # Safety
    AUTO_CALL_ENABLED: bool = os.getenv("AUTO_CALL_ENABLED", "false").lower() in ("true", "1", "yes")
    MAX_CALL_ATTEMPTS: int = int(os.getenv("MAX_CALL_ATTEMPTS", "2"))

    # Test phone allowlist (comma-separated)
    _raw_allowlist: str = os.getenv("TEST_ALLOWLIST_PHONES", "")
    TEST_ALLOWLIST_PHONES: List[str] = [p.strip() for p in _raw_allowlist.split(",") if p.strip()]

    # Open-Meteo
    OPEN_METEO_BASE_URL: str = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast")
