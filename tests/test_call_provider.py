from backend.shared.call_provider import (
    MockCallProvider,
    TwilioCallProvider,
    get_call_provider
)

def test_mock_call_provider():
    provider = MockCallProvider(simulate_status="answered")
    res = provider.initiate_call(
        to_phone="+919876543210",
        audio_url="https://example.com/audio.mp3",
        alert_id="alert-test-1",
        resident_id="res-1"
    )
    assert res.success is True
    assert res.status == "answered"
    assert res.provider_call_id.startswith("mock-call-")
    assert res.details.get("simulated") is True

    # Test callback handling
    cb_result = provider.handle_status_callback({"providerCallId": "mock-123", "keyPressed": "1"})
    assert cb_result["keyPressed"] == "1"

def test_twilio_twiml_generation():
    twilio = TwilioCallProvider(
        account_sid="AC12345",
        auth_token="token123",
        from_number="+1234567890"
    )
    twiml = twilio._generate_twiml("https://s3.aws.com/audio.mp3", "https://api.test/cb")
    assert "<Play>https://s3.aws.com/audio.mp3</Play>" in twiml
    assert "To repeat this message, press 1" in twiml
    assert "press 9" in twiml

def test_call_provider_factory():
    mock_prov = get_call_provider("mock")
    assert isinstance(mock_prov, MockCallProvider)
