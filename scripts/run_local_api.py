"""
Local HTTP Server for Baadh Bol API Gateway:
Bridges incoming HTTP requests on port 8000 directly to `backend.api.app.lambda_handler`.
Zero external dependencies (uses standard library http.server).
"""

import json
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.api.app import lambda_handler, repo
from backend.shared.models import Area, Resident

def seed_initial_data():
    """Seeds initial sample areas and residents across all-India flood basins."""
    if len(repo.list_areas()) == 0:
        a1 = Area(
            name="Guwahati - Brahmaputra Basin",
            latitude=26.1856,
            longitude=91.7477,
            hazard_type="flood",
            vulnerability=5,
            area_id="area-guwahati-brahmaputra",
            current_risk_score=72.0,
            current_level="red",
            river_level=49.85,
            rainfall_forecast=38.5
        )
        a2 = Area(
            name="Delhi - Yamuna Basin (Old Railway Bridge)",
            latitude=28.6655,
            longitude=77.2340,
            hazard_type="flood",
            vulnerability=5,
            area_id="area-delhi-yamuna",
            current_risk_score=68.5,
            current_level="red",
            river_level=205.80,
            rainfall_forecast=22.5
        )
        a3 = Area(
            name="Patna - Ganga Basin (Gandhi Ghat)",
            latitude=25.6207,
            longitude=85.1740,
            hazard_type="flood",
            vulnerability=4,
            area_id="area-patna-ganga",
            current_risk_score=48.0,
            current_level="yellow",
            river_level=48.15,
            rainfall_forecast=16.0
        )
        a4 = Area(
            name="Rajahmundry - Godavari Basin",
            latitude=17.0005,
            longitude=81.8040,
            hazard_type="flood",
            vulnerability=4,
            area_id="area-rajahmundry-godavari",
            current_risk_score=52.0,
            current_level="yellow",
            river_level=14.20,
            rainfall_forecast=18.0
        )
        a5 = Area(
            name="Cuttack - Mahanadi Basin (Naraj)",
            latitude=20.4625,
            longitude=85.8830,
            hazard_type="flood",
            vulnerability=3,
            area_id="area-cuttack-mahanadi",
            current_risk_score=22.0,
            current_level="green",
            river_level=24.80,
            rainfall_forecast=5.0
        )
        a6 = Area(
            name="Sangli - Krishna Basin",
            latitude=16.8524,
            longitude=74.5815,
            hazard_type="flood",
            vulnerability=3,
            area_id="area-sangli-krishna",
            current_risk_score=19.5,
            current_level="green",
            river_level=538.50,
            rainfall_forecast=4.0
        )
        a7 = Area(
            name="Anand Vihar Smog Hub (Delhi-NCR)",
            latitude=28.6502,
            longitude=77.3150,
            hazard_type="smog",
            vulnerability=4,
            area_id="area-anand-vihar",
            current_risk_score=75.0,
            current_level="red",
            rainfall_forecast=0.0
        )
        for a in [a1, a2, a3, a4, a5, a6, a7]:
            repo.save_area(a)

        r1 = Resident(
            name="Anup Barman",
            phone="+919876543210",
            area_id=a1.area_id,
            language="en",
            consent=True,
            resident_id="res-1"
        )
        r2 = Resident(
            name="Ramesh Kumar",
            phone="+919812345678",
            area_id=a2.area_id,
            language="en",
            consent=True,
            resident_id="res-2"
        )
        r3 = Resident(
            name="Pooja Kumari",
            phone="+919988776655",
            area_id=a3.area_id,
            language="en",
            consent=True,
            resident_id="res-3"
        )
        for r in [r1, r2, r3]:
            repo.save_resident(r)

class LocalApiHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self._proxy("OPTIONS")

    def do_GET(self):
        self._proxy("GET")

    def do_POST(self):
        self._proxy("POST")

    def do_PUT(self):
        self._proxy("PUT")

    def do_DELETE(self):
        self._proxy("DELETE")

    def _proxy(self, method: str):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        flat_query = {k: v[0] for k, v in query.items()} if query else None

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else None

        headers = {k: v for k, v in self.headers.items()}

        event = {
            "httpMethod": method,
            "path": path,
            "queryStringParameters": flat_query,
            "headers": headers,
            "body": body,
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "cognito:groups": "admin"
                    }
                }
            }
        }

        response = lambda_handler(event, None)
        status_code = response.get("statusCode", 200)
        res_headers = response.get("headers", {})
        res_body = response.get("body", "")

        self.send_response(status_code)
        for h_k, h_v in res_headers.items():
            self.send_header(h_k, h_v)
        self.end_headers()
        self.wfile.write(res_body.encode("utf-8"))

def run_server(port: int = 8000):
    seed_initial_data()
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, LocalApiHandler)
    print(f"🌊 Baadh Bol Local API Server listening at http://127.0.0.1:{port}")
    httpd.serve_forever()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
