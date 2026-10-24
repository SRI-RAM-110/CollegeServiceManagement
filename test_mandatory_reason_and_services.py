import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:8080/api"

def make_request(method, endpoint, data=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            resp_body = response.read().decode("utf-8")
            status = response.status
            try:
                parsed = json.loads(resp_body)
            except:
                parsed = resp_body
            return status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        status = e.code
        try:
            parsed = json.loads(err_body)
        except:
            parsed = err_body
        return status, parsed

def run_tests():
    print("=== STARTING MANDATORY REASON & INDIVIDUAL SERVICES VERIFICATION ===")

    # 1. Login
    s, ao_login = make_request("POST", "/auth/login", {"email": "ao@nrtec.in", "password": "admin123"})
    ao_token = ao_login.get("token") or (ao_login.get("data", {}) if isinstance(ao_login.get("data"), dict) else {}).get("token")
    ao_headers = {"Authorization": f"Bearer {ao_token}"}

    s, dept_login = make_request("POST", "/auth/login", {"email": "cse001@nrtec.local", "password": "dept123"})
    dept_token = dept_login.get("token") or (dept_login.get("data", {}) if isinstance(dept_login.get("data"), dict) else {}).get("token")
    dept_headers = {"Authorization": f"Bearer {dept_token}"}

    assert ao_token, f"AO Admin login failed: {ao_login}"
    assert dept_token, f"Department User login failed: {dept_login}"
    print("[PASS] 1. Authentication successful for AO_ADMIN and DEPARTMENT_USER")

    # Helper to test reason validation
    def test_cancellation_reason_validation(req_id, service_name):
        print(f"\n--- Testing Reason Validation for {service_name} ({req_id}) ---")
        
        # Test 1: Null / missing body
        code, res = make_request("POST", f"/requests/{req_id}/cancel", data={}, headers=ao_headers)
        assert code == 400, f"Expected 400 for empty body, got {code}: {res}"
        res_text = json.dumps(res).lower()
        assert "reason is required" in res_text, f"Expected 'reason is required' in response: {res}"
        print(f"  [PASS] Empty body rejected: {res.get('message')}")

        # Test 2: Blank string
        code, res = make_request("POST", f"/requests/{req_id}/cancel", data={"reason": ""}, headers=ao_headers)
        assert code == 400, f"Expected 400 for empty reason, got {code}: {res}"
        res_text = json.dumps(res).lower()
        assert "reason is required" in res_text, f"Expected 'reason is required' in response: {res}"
        print(f"  [PASS] Empty string rejected: {res.get('message')}")

        # Test 3: Whitespace only
        code, res = make_request("POST", f"/requests/{req_id}/cancel", data={"reason": "    \t\n  "}, headers=ao_headers)
        assert code == 400, f"Expected 400 for whitespace-only reason, got {code}: {res}"
        res_text = json.dumps(res).lower()
        assert "reason is required" in res_text, f"Expected 'reason is required' in response: {res}"
        print(f"  [PASS] Whitespace-only string rejected: {res.get('message')}")

        # Test 4: Unauthorized user (Department User)
        code, res = make_request("POST", f"/requests/{req_id}/cancel", data={"reason": "Valid reason but unauthorized"}, headers=dept_headers)
        assert code == 403, f"Expected 403 for unauthorized user, got {code}: {res}"
        print("  [PASS] Unauthorized cancellation blocked with 403")

        # Test 5: Valid trimmed reason by AO Admin
        valid_reason = f"Official AO cancellation for {service_name}: urgent facility scheduling update"
        code, res = make_request("POST", f"/requests/{req_id}/cancel", data={"reason": f"   {valid_reason}   "}, headers=ao_headers)
        assert code == 200, f"Expected 200 for valid reason, got {code}: {res}"
        data = res.get("data", {})
        assert data.get("status") == "CANCELLED", f"Expected CANCELLED status, got {data.get('status')}"
        print(f"  [PASS] Valid cancellation succeeded with status: {data.get('status')}")

        # Test 6: Verify double cancellation is rejected
        code, res = make_request("POST", f"/requests/{req_id}/cancel", data={"reason": "Repeat cancellation attempt"}, headers=ao_headers)
        assert code == 400, f"Expected 400 for repeated cancellation, got {code}: {res}"
        print(f"  [PASS] Repeated cancellation rejected with 400: {res.get('message')}")

    def get_id(obj):
        if not isinstance(obj, dict):
            return None
        d = obj.get("data", obj) if isinstance(obj.get("data"), dict) else obj
        return d.get("id") or d.get("requestId") or d.get("bookingId")

    # A. Test Seminar Booking Cancellation
    s, sem_create = make_request("POST", "/seminar/requests", {
        "department": "CSE",
        "eventTitle": "Mandatory Reason Seminar Test",
        "purpose": "Academic Lecture",
        "expectedParticipants": 40,
        "date": "2026-11-26",
        "hallId": "SH-4",
        "slot": "FORENOON",
        "bookingType": "ONE_TIME"
    }, dept_headers)
    sem_id = get_id(sem_create)
    assert sem_id, f"Failed to get sem_id from {sem_create}"
    make_request("PUT", f"/seminar/requests/{sem_id}/approve", headers=ao_headers)
    test_cancellation_reason_validation(sem_id, "Seminar Hall")

    # B. Test Accommodation Cancellation
    s, acc_create = make_request("POST", "/accommodation/requests", {
        "department": "CSE",
        "guestName": "Prof. Mandatory Reason",
        "guestDesignation": "Guest Speaker",
        "guestOrganization": "Anna University",
        "guestPhone": "9876543210",
        "guestEmail": "prof.reason@example.com",
        "gender": "MALE",
        "hostel": "Boys Hostel",
        "roomType": "AC Room",
        "checkInDate": "2026-11-26",
        "checkOutDate": "2026-11-27",
        "guestsCount": 1,
        "purpose": "National Conference"
    }, dept_headers)
    acc_id = get_id(acc_create)
    assert acc_id, f"Failed to get acc_id from {acc_create}"
    make_request("PUT", f"/accommodation/requests/{acc_id}/ao-direct-approve", headers=ao_headers)
    test_cancellation_reason_validation(acc_id, "Accommodation")

    # C. Test Transport Cancellation
    s, trn_create = make_request("POST", "/transport/requests", {
        "department": "CSE",
        "pickupLocation": "NEC Campus",
        "destination": "Madurai Airport",
        "tripDate": "2026-11-26",
        "departureTime": "09:00",
        "returnTime": "17:00",
        "expectedPassengers": 4,
        "tripType": "ONE_WAY",
        "purpose": "Guest Pickup"
    }, dept_headers)
    trn_id = get_id(trn_create)
    assert trn_id, f"Failed to get trn_id from {trn_create}"
    make_request("PUT", f"/transport/requests/{trn_id}/approve", headers=ao_headers)
    test_cancellation_reason_validation(trn_id, "Transport")

    # D. Test Stationery Cancellation
    s, sta_items = make_request("GET", "/stationery/items", headers=dept_headers)
    items = sta_items.get("data", []) if isinstance(sta_items, dict) else []
    item_id = items[0]["itemId"] if items else "ST-01"
    s, sta_create = make_request("POST", "/stationery/requests", {
        "department": "CSE",
        "purpose": "Exam Materials",
        "items": [{"itemId": item_id, "itemName": "A4 Paper", "quantity": 5}]
    }, dept_headers)
    sta_id = get_id(sta_create)
    assert sta_id, f"Failed to get sta_id from {sta_create}"
    make_request("PUT", f"/stationery/requests/{sta_id}/approve", headers=ao_headers)
    test_cancellation_reason_validation(sta_id, "Stationery")

    # E. Test Meals Cancellation
    s, mls_create = make_request("POST", "/meals/requests", {
        "department": "CSE",
        "eventName": "Mandatory Reason Workshop Catering",
        "date": "2026-11-26",
        "venue": "Pharma Block",
        "totalGuests": 30,
        "mealTypes": ["LUNCH"]
    }, dept_headers)
    mls_id = get_id(mls_create)
    assert mls_id, f"Failed to get mls_id from {mls_create}"
    make_request("PUT", f"/meals/requests/{mls_id}/approve", headers=ao_headers)
    test_cancellation_reason_validation(mls_id, "Snacks & Meals")

    print("\n=== ALL MANDATORY REASON & INDIVIDUAL SERVICE TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
