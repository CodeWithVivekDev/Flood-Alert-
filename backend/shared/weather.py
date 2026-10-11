"""
Weather Integration for Baadh Bol:
Fetches 3-hour rainfall forecasts from Open-Meteo API.
"""

import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, Optional

class WeatherService:
    def __init__(self, base_url: str = "https://api.open-meteo.com/v1/forecast"):
        self.base_url = base_url

    def get_rainfall_next3h(
        self,
        latitude: float,
        longitude: float,
        timeout_seconds: int = 5
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Retrieves the rainfall forecast (mm) for the upcoming 3 hours from Open-Meteo.
        Returns (rainfall_mm, metadata).
        """
        params = (
            f"?latitude={latitude:.4f}"
            f"&longitude={longitude:.4f}"
            f"&hourly=precipitation"
            f"&forecast_days=1"
            f"&timezone=UTC"
        )
        url = f"{self.base_url}{params}"
        metadata: Dict[str, Any] = {
            "source": "Open-Meteo",
            "url": url,
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "BaadhBol-RiskEngine/1.0"}
            )
            with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
                if response.status != 200:
                    metadata["error"] = f"Open-Meteo returned status {response.status}"
                    metadata["rainfall_mm"] = 0.0
                    return 0.0, metadata

                payload = json.loads(response.read().decode("utf-8"))
                hourly = payload.get("hourly", {})
                times = hourly.get("time", [])
                precip = hourly.get("precipitation", [])

                if not times or not precip:
                    metadata["error"] = "Hourly precipitation data missing in response"
                    metadata["rainfall_mm"] = 0.0
                    return 0.0, metadata

                # Current UTC hour prefix, e.g. "2026-10-09T16:00"
                now_utc = datetime.now(timezone.utc)
                now_str = now_utc.strftime("%Y-%m-%dT%H:00")

                # Find current hour index or default to first 3 hours
                idx = 0
                for i, t in enumerate(times):
                    if t >= now_str:
                        idx = i
                        break

                next_3h_precip = precip[idx:idx + 3]
                if not next_3h_precip:
                    next_3h_precip = precip[:3]

                total_rainfall = sum(float(p or 0.0) for p in next_3h_precip)
                total_rainfall = max(0.0, round(total_rainfall, 2))

                metadata["precipitation_hourly_next3h"] = next_3h_precip
                metadata["rainfall_mm"] = total_rainfall
                metadata["success"] = True
                return total_rainfall, metadata

        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            metadata["error"] = f"Network or API failure: {str(e)}"
            metadata["rainfall_mm"] = 0.0
            metadata["fallback_used"] = True
            return 0.0, metadata
        except Exception as e:
            metadata["error"] = f"Unexpected error reading weather data: {str(e)}"
            metadata["rainfall_mm"] = 0.0
            metadata["fallback_used"] = True
            return 0.0, metadata
