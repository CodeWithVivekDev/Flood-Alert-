import sys
import os
import pytest

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.shared.db import DatabaseRepository
from backend.shared.models import Area, Resident

@pytest.fixture
def memory_db():
    """Provides an isolated in-memory DatabaseRepository for testing."""
    return DatabaseRepository(in_memory=True)

@pytest.fixture
def sample_flood_area(memory_db):
    """Seed sample flood-prone Yamuna floodplain area in Delhi."""
    area = Area(
        name="Yamuna Bazar",
        latitude=28.6655,
        longitude=77.2340,
        hazard_type="flood",
        vulnerability=4,
        area_id="area-yamuna-bazar",
        current_risk_score=15.0,
        current_level="green",
        rainfall_forecast=0.0,
        river_level=203.5
    )
    return memory_db.save_area(area)

@pytest.fixture
def sample_residents(memory_db, sample_flood_area):
    """Seed consenting and non-consenting residents."""
    r1 = Resident(
        name="Ramesh Kumar",
        phone="+919876543210",
        area_id=sample_flood_area.area_id,
        consent=True,
        resident_id="res-ramesh"
    )
    r2 = Resident(
        name="Sunita Devi",
        phone="9812345678",
        area_id=sample_flood_area.area_id,
        consent=True,
        resident_id="res-sunita"
    )
    r3 = Resident(
        name="Mohan Lal",
        phone="09999988888",
        area_id=sample_flood_area.area_id,
        consent=False,
        resident_id="res-mohan"
    )
    memory_db.save_resident(r1)
    memory_db.save_resident(r2)
    memory_db.save_resident(r3)
    return [r1, r2, r3]
