import pytest
from backend.shared.models import (
    normalize_indian_phone,
    mask_phone_number,
    Area,
    Resident,
    Alert,
    Call
)

def test_normalize_indian_phone():
    # Standard 10 digit Indian mobiles (starting 6, 7, 8, 9)
    assert normalize_indian_phone("9876543210") == "+919876543210"
    assert normalize_indian_phone("09876543210") == "+919876543210"
    assert normalize_indian_phone("919876543210") == "+919876543210"
    assert normalize_indian_phone("+919876543210") == "+919876543210"
    assert normalize_indian_phone("+91 98765 43210") == "+919876543210"
    assert normalize_indian_phone("98765-43210") == "+919876543210"

    # Invalid numbers
    assert normalize_indian_phone("12345") is None
    assert normalize_indian_phone("abcdefghij") is None
    assert normalize_indian_phone("5123456789") is None # Invalid Indian starting digit

def test_mask_phone_number():
    masked = mask_phone_number("+919876543210")
    assert masked == "+91 98*** **210"
    assert "9876543210" not in masked

def test_resident_creation_and_privacy():
    resident = Resident(
        name="Sunita Devi",
        phone="9876543210",
        area_id="area-1",
        consent=True
    )
    assert resident.phone == "+919876543210"

    # Safe display dict masks phone
    public_dict = resident.to_dict(mask_phone=True)
    assert public_dict["phone"] == "+91 98*** **210"

    # DB dict retains unmasked number
    db_dict = resident.to_db_dict()
    assert db_dict["phone"] == "+919876543210"

def test_area_model_clamping():
    # Vulnerability must be clamped between 1 and 5
    a1 = Area("Test Area", 28.5, 77.2, vulnerability=10)
    assert a1.vulnerability == 5

    a2 = Area("Test Area", 28.5, 77.2, vulnerability=-2)
    assert a2.vulnerability == 1
