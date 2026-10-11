"""
Open-Meteo Weather & Flood API Integration for Baadh Bol:
Fetches live precipitation forecasts and modelled river discharge (GloFAS model)
for river basins across India.
Clearly labels forecasts as MODEL PREDICTIONS, never claiming they are measured readings.
"""

import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class OpenMeteoService:
    def __init__(
        self,
        weather_url: str = "https://api.open-meteo.com/v1/forecast",
        flood_url: str = "https://flood-api.open-meteo.com/v1/flood"
    ):
        self.weather_url = weather_url
        self.flood_url = flood_url

    def get_basin_forecast(
        self,
        latitude: float,
        longitude: float,
        location_name: str = "Basin Location",
        timeout_seconds: int = 5
    ) -> Dict[str, Any]:
        """
        Retrieves live weather rainfall forecast and GloFAS modelled river discharge.
        Returns unified metadata with explicit observation type flags.
        """
        now = datetime.now(timezone.utc)
        result: Dict[str, Any] = {
            "source": "Open-Meteo Global Forecasting & GloFAS Flood System",
            "locationName": location_name,
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "checkedAt": now.isoformat(),
            "weatherForecast": {
                "source": "Open-Meteo Weather API",
                "observationType": "Modelled Weather Forecast",
                "rainfallNext3hMm": 0.0,
                "rainfallTodayMm": 0.0,
                "status": "unavailable"
            },
            "floodDischarge": {
                "source": "Open-Meteo Flood API (GloFAS Model)",
                "observationType": "Modelled River Discharge Prediction",
                "currentDischargeM3s": None,
                "medianDischargeM3s": None,
                "forecastDischarge": [],
                "status": "unavailable"
            }
        }

        # 1. Fetch Weather Forecast (Precipitation)
        weather_url = (
            f"{self.weather_url}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            f"&hourly=precipitation,rain&daily=precipitation_sum&forecast_days=3&timezone=UTC"
        )
        try:
            req = urllib.request.Request(weather_url, headers={"User-Agent": "BaadhBol-National/1.0"})
            with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                if resp.status == 200:
                    wdata = json.loads(resp.read().decode("utf-8"))
                    daily = wdata.get("daily", {})
                    hourly = wdata.get("hourly", {})
                    precip_sum = daily.get("precipitation_sum", [0.0])
                    hourly_precip = hourly.get("precipitation", [])

                    next_3h = sum(float(p or 0.0) for p in hourly_precip[:3]) if hourly_precip else 0.0
                    today_rain = float(precip_sum[0] or 0.0) if precip_sum else 0.0

                    result["weatherForecast"] = {
                        "source": "Open-Meteo Weather API",
                        "observationType": "Modelled Weather Forecast",
                        "rainfallNext3hMm": round(next_3h, 2),
                        "rainfallTodayMm": round(today_rain, 2),
                        "status": "live",
                        "lastUpdated": now.isoformat()
                    }
        except Exception as e:
            logger.warning(f"Failed to fetch Open-Meteo weather for ({latitude}, {longitude}): {e}")
            result["weatherForecast"]["error"] = f"Unavailable: {type(e).__name__}"

        # 2. Fetch Flood API (GloFAS Modelled River Discharge)
        flood_url = (
            f"{self.flood_url}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            f"&daily=river_discharge,river_discharge_median,river_discharge_max&forecast_days=7"
        )
        try:
            req = urllib.request.Request(flood_url, headers={"User-Agent": "BaadhBol-National/1.0"})
            with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                if resp.status == 200:
                    fdata = json.loads(resp.read().decode("utf-8"))
                    fdaily = fdata.get("daily", {})
                    times = fdaily.get("time", [])
                    discharge = fdaily.get("river_discharge", [])
                    median = fdaily.get("river_discharge_median", [])
                    max_d = fdaily.get("river_discharge_max", [])

                    forecast_points = []
                    for i in range(min(len(times), 7)):
                        forecast_points.append({
                            "date": times[i],
                            "dischargeM3s": round(float(discharge[i] or 0.0), 2) if i < len(discharge) else None,
                            "medianM3s": round(float(median[i] or 0.0), 2) if i < len(median) else None,
                            "maxM3s": round(float(max_d[i] or 0.0), 2) if i < len(max_d) else None
                        })

                    current_flow = float(discharge[0] or 0.0) if discharge else None
                    median_flow = float(median[0] or 0.0) if median else None

                    result["floodDischarge"] = {
                        "source": "Open-Meteo Flood API (GloFAS Model)",
                        "observationType": "Modelled River Discharge Prediction",
                        "currentDischargeM3s": round(current_flow, 2) if current_flow is not None else None,
                        "medianDischargeM3s": round(median_flow, 2) if median_flow is not None else None,
                        "forecast7Days": forecast_points,
                        "status": "live",
                        "lastUpdated": now.isoformat(),
                        "modelNote": "Hydrological prediction from Global Flood Awareness System (GloFAS). Not a direct river gauge measurement."
                    }
        except Exception as e:
            logger.warning(f"Failed to fetch Open-Meteo flood discharge for ({latitude}, {longitude}): {e}")
            result["floodDischarge"]["error"] = f"Unavailable: {type(e).__name__}"

        return result
