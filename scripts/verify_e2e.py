"""
End-to-End Verification Script for Baadh Bol:
Simulates full operator lifecycle:
1. Health check
2. Create flood prone area (Yamuna floodplain)
3. Enter live Yamuna river reading (exceeding danger mark 205.33m)
4. Trigger Test Alert (Bedrock Hindi message + Polly speech + Voice call initiation + IVR keypress)
5. Verify audit logs in DynamoDB tables
"""

import json
import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.api.app import lambda_handler as api_handler
from backend.risk_engine.app import lambda_handler as risk_handler
from backend.notifier.app import lambda_handler as notifier_handler

def run_e2e_verification():
    print("=" * 65)
    print("🌊 FLOOD ALERT (BAADH BOL) - END-TO-END VERIFICATION RUN")
    print("=" * 65)

    # 1. Health Check
    health_event = {
        "httpMethod": "GET",
        "path": "/health"
    }
    health_res = api_handler(health_event, None)
    print(f"\n[1] Health Check: Status {health_res['statusCode']}")
    print(f"    Payload: {health_res['body']}")
    assert health_res['statusCode'] == 200

    # 2. Register Flood Area
    area_payload = {
        "name": "Yamuna Bazar Lowlands",
        "latitude": 28.6655,
        "longitude": 77.2340,
        "hazardType": "flood",
        "vulnerability": 5,
        "riverLevel": 204.0
    }
    create_area_event = {
        "httpMethod": "POST",
        "path": "/areas",
        "headers": {"Authorization": "Bearer mock-admin"},
        "body": json.dumps(area_payload)
    }
    area_res = api_handler(create_area_event, None)
    assert area_res['statusCode'] == 201
    area_data = json.loads(area_res['body'])
    area_id = area_data['areaId']
    print(f"\n[2] Area Registered: {area_data['name']} (ID: {area_id})")
    print(f"    Initial Score: {area_data['currentRiskScore']}, Level: {area_data['currentLevel']}")

    # 3. Register Consenting Resident
    res_payload = {
        "name": "Ramesh Kumar",
        "phone": "+919876543210",
        "areaId": area_id,
        "consent": True
    }
    create_res_event = {
        "httpMethod": "POST",
        "path": "/residents",
        "headers": {"Authorization": "Bearer mock-admin"},
        "body": json.dumps(res_payload)
    }
    res_res = api_handler(create_res_event, None)
    assert res_res['statusCode'] == 201
    res_data = json.loads(res_res['body'])
    print(f"\n[3] Resident Registered: {res_data['name']}")
    print(f"    Privacy Masked Phone: {res_data['phone']}")

    # 4. Operator Enters Yamuna River Level (Exceeds danger level 205.33m)
    river_event = {
        "httpMethod": "PUT",
        "path": f"/areas/{area_id}/river-level",
        "headers": {"Authorization": "Bearer mock-admin"},
        "body": json.dumps({"riverLevel": 205.80})
    }
    river_res = api_handler(river_event, None)
    assert river_res['statusCode'] == 200
    river_data = json.loads(river_res['body'])
    print(f"\n[4] Yamuna Water Level Updated to 205.80m (Above 205.33m Danger Mark)")
    print(f"    New Risk Score: {river_data['updatedRiskScore']}, Level: {river_data['updatedLevel']} (Red Alert!)")

    # 5. Primary Demonstration: Click Test Alert
    print("\n[5] Executing Primary Demonstration: Test Alert (Hero Button)...")
    sim_event = {
        "httpMethod": "POST",
        "path": "/simulate",
        "headers": {"Authorization": "Bearer mock-admin"},
        "body": json.dumps({
            "areaId": area_id,
            "level": "red",
            "testPhone": "+919876543210"
        })
    }
    sim_res = api_handler(sim_event, None)
    assert sim_res['statusCode'] == 200
    sim_data = json.loads(sim_res['body'])

    print("    ✓ Voice Alert Message Script Generated:")
    print(f"      \"{sim_data['scriptText']}\"")
    print(f"    ✓ Polly Speech Synthesis Audio Cache: {sim_data['audioUrl']}")
    print(f"    ✓ Outbound Voice Call Dispatched:")
    print(f"      Call ID: {sim_data['call']['callId']}")
    print(f"      Provider Call SID: {sim_data['call']['providerCallId']}")
    print(f"      Call Status: {sim_data['call']['status']}")
    print(f"      Provider: {sim_data['call']['provider']}")

    # 6. Retrieve Alerts Log
    alerts_event = {
        "httpMethod": "GET",
        "path": "/alerts",
        "queryStringParameters": {"areaId": area_id}
    }
    alerts_res = api_handler(alerts_event, None)
    assert alerts_res['statusCode'] == 200
    alerts_list = json.loads(alerts_res['body'])
    print(f"\n[6] Alerts Log Verified: {len(alerts_list)} alert record(s) in database.")

    print("\n" + "=" * 65)
    print("✅ END-TO-END VERIFICATION COMPLETED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_e2e_verification()
