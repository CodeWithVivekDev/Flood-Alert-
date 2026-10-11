import json
import pytest
from backend.api.app import lambda_handler
from backend.api import app as api_module
from backend.shared.models import Area, Resident

@pytest.fixture(autouse=True)
def setup_clean_db():
    """Reset repository before each API test."""
    from backend.shared.db import DatabaseRepository
    api_module.repo = DatabaseRepository(in_memory=True)
    # Seed an area
    area = Area(
        name="Kashmere Gate Flood Zone",
        latitude=28.6675,
        longitude=77.2285,
        hazard_type="flood",
        vulnerability=4,
        area_id="area-kashmere",
        current_risk_score=20.0,
        current_level="green",
        river_level=203.0
    )
    api_module.repo.save_area(area)

def make_event(method: str, path: str, body: dict = None, query: dict = None, role: str = "admin") -> dict:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer mock-{role}"
    }
    event = {
        "httpMethod": method,
        "path": path,
        "headers": headers,
        "queryStringParameters": query,
        "requestContext": {
            "authorizer": {
                "claims": {
                    "cognito:groups": role
                }
            }
        }
    }
    if body is not None:
        event["body"] = json.dumps(body)
    return event

def test_api_health_check():
    event = make_event("GET", "/health")
    response = lambda_handler(event, None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["status"] == "healthy"
    assert "Baadh Bol" in body["service"]

def test_api_areas_crud_and_river_level():
    # 1. List areas
    list_event = make_event("GET", "/areas")
    res = lambda_handler(list_event, None)
    assert res["statusCode"] == 200
    areas = json.loads(res["body"])
    assert len(areas) >= 1
    assert areas[0]["name"] == "Kashmere Gate Flood Zone"

    # 2. Create new area
    create_event = make_event("POST", "/areas", {
        "name": "Okhla Barrage",
        "latitude": 28.5447,
        "longitude": 77.3074,
        "hazardType": "flood",
        "vulnerability": 3,
        "riverLevel": 204.0
    })
    res = lambda_handler(create_event, None)
    assert res["statusCode"] == 201
    created = json.loads(res["body"])
    assert created["name"] == "Okhla Barrage"
    new_id = created["areaId"]

    # 3. Update river level
    river_event = make_event("PUT", f"/areas/{new_id}/river-level", {
        "riverLevel": 205.5 # Exceeds danger mark
    })
    res = lambda_handler(river_event, None)
    assert res["statusCode"] == 200
    body = json.loads(res["body"])
    assert body["success"] is True
    assert body["updatedLevel"] in ["yellow", "red"]

def test_api_residents_flow():
    # 1. Create resident
    create_event = make_event("POST", "/residents", {
        "name": "Sunita Devi",
        "phone": "9876543210",
        "areaId": "area-kashmere",
        "consent": True
    })
    res = lambda_handler(create_event, None)
    assert res["statusCode"] == 201
    res_body = json.loads(res["body"])
    assert res_body["name"] == "Sunita Devi"
    assert "phone" in res_body
    # Privacy check: operator view masks phone
    assert "***" in res_body["phone"]

    # 2. List residents
    list_event = make_event("GET", "/residents", query={"areaId": "area-kashmere"})
    res = lambda_handler(list_event, None)
    assert res["statusCode"] == 200
    residents = json.loads(res["body"])
    assert len(residents) == 1

def test_api_public_registration():
    # Unauthenticated citizen self-registration
    event = {
        "httpMethod": "POST",
        "path": "/register",
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "name": "Arun Sharma",
            "phone": "9811122233",
            "areaId": "area-kashmere",
            "consent": True
        })
    }
    res = lambda_handler(event, None)
    assert res["statusCode"] == 201
    body = json.loads(res["body"])
    assert body["success"] is True

def test_api_csv_import():
    csv_content = "name,phone,areaId\nVikram,+919988776655,area-kashmere\nPooja,9877665544,area-kashmere\n"
    event = make_event("POST", "/residents/import", {"csvText": csv_content})
    res = lambda_handler(event, None)
    assert res["statusCode"] == 200
    body = json.loads(res["body"])
    assert body["importedCount"] == 2

def test_api_simulate_test_alert_flow():
    """
    Primary demonstration:
    POST /simulate with areaId and level
    Generates Hindi script -> Polly audio -> Alert record -> initiates Call -> logs Call record
    """
    event = make_event("POST", "/simulate", {
        "areaId": "area-kashmere",
        "level": "red",
        "testPhone": "+919876543210"
    })
    res = lambda_handler(event, None)
    assert res["statusCode"] == 200
    body = json.loads(res["body"])

    assert body["success"] is True
    assert "alert" in body
    assert body["alert"]["level"] == "red"
    assert body["alert"]["trigger"] == "test"
    assert "scriptText" in body
    assert len(body["scriptText"]) > 0
    assert "audioUrl" in body
    assert "call" in body
    assert body["call"]["status"] in ["initiated", "answered"]

def test_api_viewer_role_restrictions():
    # Viewer cannot create area
    event = make_event("POST", "/areas", {"name": "Unauthorized Area"}, role="viewer")
    res = lambda_handler(event, None)
    assert res["statusCode"] == 403

    # Viewer cannot trigger simulate alert
    sim_event = make_event("POST", "/simulate", {"areaId": "area-kashmere"}, role="viewer")
    res = lambda_handler(sim_event, None)
    assert res["statusCode"] == 403
