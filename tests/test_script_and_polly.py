from backend.shared.script_generator import (
    ScriptGenerator,
    validate_script,
    FALLBACK_TEMPLATES
)
from backend.shared.polly_service import PollyAudioService

def test_validate_script():
    # Valid English script under 45 words
    valid_text = "This is a Flood Alert safety alert. River water levels are rising. Please move to higher ground."
    assert validate_script(valid_text) is True

    # Empty text
    assert validate_script("") is False
    assert validate_script("   ") is False

    # Too short text
    assert validate_script("Alert") is False

    # Over 45 words should fail length check
    long_text = "Emergency alert warning " * 20
    assert validate_script(long_text) is False

def test_script_fallback_templates():
    gen = ScriptGenerator(bedrock_client=None)

    for hazard in ["flood", "smog"]:
        for level in ["green", "yellow", "red"]:
            script = gen.generate_script(
                area_name="Yamuna Bazar",
                hazard_type=hazard,
                level=level
            )
            assert "Yamuna Bazar" in script
            assert validate_script(script) is True
            # Must be under 40 words
            words = script.split()
            assert len(words) <= 40

def test_polly_service_audio_key_generation():
    service = PollyAudioService(polly_client=None, s3_client=None)
    script = "Urgent flood warning in Yamuna Bazar. Evacuate immediately."

    key1, url1 = service.synthesize_and_cache(script)
    key2, url2 = service.synthesize_and_cache(script)

    # Deterministic caching key
    assert key1 == key2
    assert key1.startswith("audio/Joanna_")
    assert key1.endswith(".mp3")
    assert url1 == url2
