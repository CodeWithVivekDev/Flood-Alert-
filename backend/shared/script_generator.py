"""
Hindi Voice Script Generator for Baadh Bol:
Utilizes Amazon Bedrock to craft simple, clear, actionable disaster alert messages in Hindi,
with strict safety constraints and instant deterministic fallback templates.
"""

import json
import logging
import re
from typing import Optional, Dict
from .models import HazardType, RiskLevel

logger = logging.getLogger(__name__)

# Fallback English templates tailored for each hazard and risk level (< 40 words, simple, actionable)
FALLBACK_TEMPLATES: Dict[HazardType, Dict[RiskLevel, str]] = {
    "flood": {
        "green": (
            "This is a Baadh Bol safety alert. Flood risk in {area_name} is currently normal. "
            "River water levels are stable. Stay alert and stay safe."
        ),
        "yellow": (
            "This is a Baadh Bol warning message. Water levels in {area_name} are rising. "
            "Move your essential belongings and medications to higher ground and stay vigilant."
        ),
        "red": (
            "This is an urgent Baadh Bol emergency alert! Severe flooding is expected in {area_name}. "
            "Evacuate to higher ground immediately. Stay clear of electrical poles and seek assistance."
        )
    },
    "smog": {
        "green": (
            "This is a Baadh Bol air quality update. Air quality in {area_name} is normal. "
            "Help keep our environment clean and stay healthy."
        ),
        "yellow": (
            "This is a Baadh Bol air pollution warning. Air quality in {area_name} is poor. "
            "Elderly individuals and children should stay indoors and wear masks outside."
        ),
        "red": (
            "This is an urgent Baadh Bol pollution emergency! Air toxicity in {area_name} is severe. "
            "Avoid going outside, keep windows closed, and wear an N95 mask."
        )
    }
}

def validate_script(script: str) -> bool:
    """
    Validates the generated script:
    1. Must not be empty.
    2. Word count must be <= 45 words.
    3. Minimum length of 10 characters.
    """
    if not script or len(script.strip()) < 10:
        return False
    words = script.strip().split()
    if len(words) > 45:
        return False
    return True

class ScriptGenerator:
    def __init__(self, bedrock_client=None, model_id: str = "anthropic.claude-3-haiku-20240307-v1:0"):
        self.bedrock_client = bedrock_client
        self.model_id = model_id

    def get_fallback_script(self, area_name: str, hazard_type: HazardType, level: RiskLevel) -> str:
        """Returns the pre-reviewed, safe English script template."""
        hazard_dict = FALLBACK_TEMPLATES.get(hazard_type, FALLBACK_TEMPLATES["flood"])
        template = hazard_dict.get(level, hazard_dict["green"])
        return template.format(area_name=area_name).strip()

    def generate_script(
        self,
        area_name: str,
        hazard_type: HazardType,
        level: RiskLevel,
        extra_details: Optional[str] = None
    ) -> str:
        """
        Generates an English alert script using Bedrock if available,
        falling back to certified deterministic templates if unavailable or invalid.
        """
        fallback = self.get_fallback_script(area_name, hazard_type, level)

        if not self.bedrock_client:
            return fallback

        prompt = (
            f"You are Baadh Bol, a community voice alert assistant in Delhi.\n"
            f"Write a short phone-call warning script in simple, clear English for the following hazard alert:\n"
            f"- Area Name: {area_name}\n"
            f"- Hazard Type: {hazard_type}\n"
            f"- Risk Level: {level}\n"
            f"Rules:\n"
            f"1. Use simple, direct, clear spoken English.\n"
            f"2. Strict maximum length: under 35 words.\n"
            f"3. State the area name, danger level, and 2 practical safety actions (e.g., move to higher ground, carry essentials).\n"
            f"4. Do NOT invent official government orders or fake phone numbers.\n"
            f"5. Return ONLY the spoken message text, nothing else."
        )

        try:
            if "claude" in self.model_id:
                body = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 120,
                    "temperature": 0.2,
                    "messages": [{"role": "user", "content": prompt}]
                })
                response = self.bedrock_client.invoke_model(
                    modelId=self.model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=body
                )
                res_body = json.loads(response["body"].read().decode("utf-8"))
                generated_text = res_body.get("content", [{}])[0].get("text", "").strip()
            elif "titan" in self.model_id:
                body = json.dumps({
                    "inputText": prompt,
                    "textGenerationConfig": {
                        "maxTokenCount": 100,
                        "temperature": 0.2
                    }
                })
                response = self.bedrock_client.invoke_model(
                    modelId=self.model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=body
                )
                res_body = json.loads(response["body"].read().decode("utf-8"))
                generated_text = res_body.get("results", [{}])[0].get("outputText", "").strip()
            else:
                generated_text = ""

            # Validate generated text
            if validate_script(generated_text):
                return generated_text
            else:
                logger.warning("Bedrock generated script failed validation. Using fallback.")
                return fallback

        except Exception as e:
            logger.warning(f"Bedrock invocation failed: {e}. Using deterministic fallback.")
            return fallback
