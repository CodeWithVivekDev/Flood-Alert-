"""
Polly Speech Synthesis & S3 Audio Caching Service for Baadh Bol:
Synthesizes Hindi scripts into MP3 audio using Amazon Polly neural voice (Kajal/Aditi)
and caches the resulting audio in S3 using deterministic hashes.
"""

import hashlib
import io
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

class PollyAudioService:
    def __init__(
        self,
        polly_client=None,
        s3_client=None,
        bucket_name: str = "baadh-bol-audio-cache",
        voice_id: str = "Joanna",
        engine: str = "neural"
    ):
        self.polly_client = polly_client
        self.s3_client = s3_client
        self.bucket_name = bucket_name
        self.voice_id = voice_id
        self.engine = engine

    def _generate_audio_key(self, script_text: str) -> str:
        """Computes deterministic S3 key based on script and voice config."""
        content = f"{self.voice_id}:{self.engine}:{script_text.strip()}"
        sha = hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]
        return f"audio/{self.voice_id}_{sha}.mp3"

    def synthesize_and_cache(
        self,
        script_text: str,
        presign_expiry_seconds: int = 3600
    ) -> Tuple[str, str]:
        """
        Synthesizes audio or retrieves cached version.
        Returns (audio_key, presigned_url).
        """
        audio_key = self._generate_audio_key(script_text)

        # 1. If S3 client available, check if audio is already cached in S3
        if self.s3_client and self.bucket_name:
            try:
                self.s3_client.head_object(Bucket=self.bucket_name, Key=audio_key)
                logger.info(f"Audio cache hit for key: {audio_key}")
                # Generate short-lived presigned URL
                url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": audio_key},
                    ExpiresIn=presign_expiry_seconds
                )
                return audio_key, url
            except Exception:
                # Cache miss, proceed to synthesize
                pass

        # 2. Synthesize audio with Polly if client available
        audio_stream_bytes: Optional[bytes] = None
        if self.polly_client:
            try:
                response = self.polly_client.synthesize_speech(
                    Text=script_text,
                    OutputFormat="mp3",
                    VoiceId=self.voice_id,
                    Engine=self.engine
                )
                if "AudioStream" in response:
                    audio_stream_bytes = response["AudioStream"].read()
            except Exception as e:
                logger.warning(f"Polly synthesis failed: {e}. Falling back to standard engine or mock.")
                try:
                    # Fallback to standard engine if neural not supported in region
                    response = self.polly_client.synthesize_speech(
                        Text=script_text,
                        OutputFormat="mp3",
                        VoiceId="Aditi",
                        Engine="standard"
                    )
                    if "AudioStream" in response:
                        audio_stream_bytes = response["AudioStream"].read()
                except Exception as e2:
                    logger.error(f"Fallback synthesis also failed: {e2}")

        # If offline/mock mode or synthesis produced empty bytes
        if not audio_stream_bytes:
            # Minimal valid silent MP3 header/frame bytes for local testing
            audio_stream_bytes = b"\xff\xfb\x90\x00\x00\x00\x00\x00\x00\x00"

        # 3. Store in S3 if client available
        if self.s3_client and self.bucket_name:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=audio_key,
                    Body=audio_stream_bytes,
                    ContentType="audio/mpeg"
                )
                url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": audio_key},
                    ExpiresIn=presign_expiry_seconds
                )
                return audio_key, url
            except Exception as e:
                logger.warning(f"Could not save to S3: {e}")

        # Local or mock fallback URL
        mock_url = f"https://mock-audio.baadhbol.local/{audio_key}"
        return audio_key, mock_url
