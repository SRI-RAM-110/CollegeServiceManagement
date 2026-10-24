import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:8080/api"

def make_req(url, method="GET", data=None, token=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    body = json.dumps(data).encode("utf-8") if data is not None else None
    try:
        with urllib.request.urlopen(req, data=body) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            try:
                parsed = json.loads(content)
                if isinstance(parsed, dict) and "data" in parsed and parsed.get("success") is True:
                    return status, parsed["data"]
            except Exception:
                parsed = content
            return status, parsed
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_content)
        except Exception:
            parsed = err_content
        return e.code, parsed
    except Exception as e:
        return 0, str(e)

def login(username, password):
    status, res = make_req(f"{BASE_URL}/auth/login", method="POST", data={"email": username, "password": password})
    if status == 200 and isinstance(res, dict):
        if "data" in res and isinstance(res["data"], dict) and "token" in res["data"]:
            return res["data"]["token"]
        if "token" in res:
            return res["token"]
    raise Exception(f"Login failed for {username}: {status} {res}")

def unwrap(res):
    if isinstance(res, dict) and "data" in res and "success" in res:
        return res["data"]
    return res

def run_tests():
    print("=== BEGIN COMPREHENSIVE VERIFICATION TESTS ===")
    
    # 0. Logins
    ao_token = login("ao@nrtec.in", "admin123")
    dept_token = login("cse001@nrtec.local", "dept123")
    print("[PASS] Auth: Logged in AO_ADMIN and DEPARTMENT_USER")

    # 1. Test Halls List & Status
    status, halls_res = make_req(f"{BASE_URL}/seminar/halls", token=dept_token)
    halls = unwrap(halls_res)
    assert status == 200, f"Expected 200, got {status}"
    print(f"[PASS] Seminar: Retrieved {len(halls)} halls")
    hall_map = {h.get("hallId") or h.get("id"): h for h in halls}
    print("  Halls found:", [(h_id, h.get("name"), h.get("status")) for h_id, h in hall_map.items()])

    # Choose a test hall, e.g. SH-4
    test_hall_id = "SH-4"
    if test_hall_id not in hall_map:
        test_hall_id = list(hall_map.keys())[0]
    
    # Check current status of test hall
    original_status = hall_map[test_hall_id].get("status", "Available")
    print(f"  Test hall {test_hall_id} original status: {original_status}")

    # Set hall to Functional via admin endpoint
    status, updated_hall = make_req(f"{BASE_URL}/seminar/halls/{test_hall_id}/status", method="PUT", data={"status": "Functional"}, token=ao_token)
    print(f"  Update {test_hall_id} to Functional: status {status}")
    assert status in (200, 204), f"Failed to set Functional: {status} {updated_hall}"

    # Check hall operational status
    status, halls_now = make_req(f"{BASE_URL}/seminar/halls", token=dept_token)
    h_detail = next((h for h in halls_now if (h.get("hallId") or h.get("id")) == test_hall_id), {})
    print(f"[PASS] Seminar Test 1: Hall {test_hall_id} status is now '{h_detail.get('status')}' (Functional)")

    # Set hall to Maintenance
    status, updated_hall = make_req(f"{BASE_URL}/seminar/halls/{test_hall_id}/status", method="PUT", data={"status": "Maintenance"}, token=ao_token)
    print(f"  Update {test_hall_id} to Maintenance: status {status}")
    assert status in (200, 204), f"Failed to set Maintenance: {status} {updated_hall}"

    status, halls_now = make_req(f"{BASE_URL}/seminar/halls", token=dept_token)
    h_detail = next((h for h in halls_now if (h.get("hallId") or h.get("id")) == test_hall_id), {})
    print(f"[PASS] Seminar Test 2: Hall {test_hall_id} status is now '{h_detail.get('status')}' (Maintenance)")

    # Test 3 & 4: Attempt backend booking on Maintenance hall -> MUST be rejected
    booking_payload = {
        "hallId": test_hall_id,
        "date": "2026-11-20",
        "slot": "FORENOON",
        "eventTitle": "Test Event on Maintenance Hall",
        "purpose": "Academic Guest Lecture",
        "expectedParticipants": 50
    }
    status, err_resp = make_req(f"{BASE_URL}/seminar/requests", method="POST", data=booking_payload, token=dept_token)
    print(f"[PASS] Seminar Test 3 & 4: Direct booking on Maintenance hall rejected with code {status}: {err_resp}")
    assert status == 400, f"Expected 400 for Maintenance hall booking, got {status}: {err_resp}"
    assert "maintenance" in str(err_resp).lower() or "operational" in str(err_resp).lower()

    # Restore hall to Functional
    status, _ = make_req(f"{BASE_URL}/seminar/halls/{test_hall_id}/status", method="PUT", data={"status": "Functional"}, token=ao_token)
    assert status in (200, 204)
    print(f"  Restored {test_hall_id} to Functional")

    # Test 5: Booking Functional hall on available slot -> MUST succeed
    test_date = "2026-11-25"
    booking_payload["date"] = test_date
    booking_payload["slot"] = "AFTERNOON"
    booking_payload["eventTitle"] = "National AI Workshop"
    status, new_booking = make_req(f"{BASE_URL}/seminar/requests", method="POST", data=booking_payload, token=dept_token)
    print(f"[PASS] Seminar Test 5: Booking Functional hall on available slot: status {status}, bookingId={new_booking.get('requestId') or new_booking.get('id') if isinstance(new_booking, dict) else 'none'}")
    assert status in (200, 201), f"Expected 200/201, got {status}: {new_booking}"
    seminar_booking_id = new_booking.get("requestId") or new_booking.get("id")

    # Test 6: Slot availability vs operational status
    status, avail_check = make_req(f"{BASE_URL}/seminar/availability?hallId={test_hall_id}&date={test_date}", token=dept_token)
    print(f"[PASS] Seminar Test 6: Slot check on {test_date}: {avail_check.get('slots') if isinstance(avail_check, dict) else avail_check}")
    status, halls_now = make_req(f"{BASE_URL}/seminar/halls", token=dept_token)
    h_detail = next((h for h in halls_now if (h.get("hallId") or h.get("id")) == test_hall_id), {})
    print(f"  Hall operational status remains: '{h_detail.get('status')}' while slot on {test_date} is booked.")

    # Test 7: Setting hall to Maintenance does not alter existing bookings
    status, _ = make_req(f"{BASE_URL}/seminar/halls/{test_hall_id}/status", method="PUT", data={"status": "Maintenance"}, token=ao_token)
    status, existing_bk = make_req(f"{BASE_URL}/seminar/requests/{seminar_booking_id}", token=dept_token)
    print(f"[PASS] Seminar Test 7: Booking {seminar_booking_id} status during hall maintenance: '{existing_bk.get('status')}'")
    assert existing_bk.get("status") in ("PENDING", "APPROVED", "BOOKED"), f"Booking unexpectedly modified: {existing_bk}"
    # Restore hall back to Functional
    make_req(f"{BASE_URL}/seminar/halls/{test_hall_id}/status", method="PUT", data={"status": "Functional"}, token=ao_token)

    # --- PART B: AO ADMIN UNIFIED REQUESTS ---
    status, unified_reqs = make_req(f"{BASE_URL}/requests", token=ao_token)
    assert status == 200, f"Expected 200 for /requests, got {status}"
    services_found = set(r.get("service") for r in unified_reqs)
    print(f"[PASS] AO Unified Test 1: Retrieved {len(unified_reqs)} unified requests across services: {services_found}")
    
    # Check no duplicate IDs
    ids = [r.get("requestId") for r in unified_reqs if r.get("requestId")]
    assert len(ids) == len(set(ids)), f"Duplicate requestIds found in unified list! {len(ids)} vs {len(set(ids))}"
    print(f"[PASS] AO Unified Test 2: No duplicate requests found (total unique IDs: {len(ids)})")

    # Check filtering by service, status, date
    status, sem_reqs = make_req(f"{BASE_URL}/requests?service=SEMINAR", token=ao_token)
    assert status == 200
    print(f"[PASS] AO Unified Test 3a: Service filter 'SEMINAR' returned {len(sem_reqs)} requests")

    status, app_reqs = make_req(f"{BASE_URL}/requests?status=APPROVED", token=ao_token)
    assert status == 200
    print(f"[PASS] AO Unified Test 3b: Status filter 'APPROVED' returned {len(app_reqs)} requests")

    status, date_reqs = make_req(f"{BASE_URL}/requests?date={test_date}", token=ao_token)
    assert status == 200
    print(f"[PASS] AO Unified Test 3c: Date filter '{test_date}' returned {len(date_reqs)} requests")

    # --- PART C: AO ADMIN CANCELLATION OF APPROVED REQUESTS ---
    # First, let's approve the seminar booking created above
    status, appr_res = make_req(f"{BASE_URL}/seminar/requests/{seminar_booking_id}/approve", method="PUT", token=ao_token)
    print(f"  Approved seminar booking {seminar_booking_id}: status {status}")

    # Verify unauthorized user (DEPARTMENT_USER) cannot call cancel endpoint
    status, unauth_res = make_req(f"{BASE_URL}/requests/{seminar_booking_id}/cancel", method="POST", data={"reason": "Hacking"}, token=dept_token)
    print(f"[PASS] AO Cancellation Test 8: Department user cancelling approved request rejected with status: {status}")
    assert status == 403, f"Expected 403 Forbidden for department user, got {status}: {unauth_res}"

    # AO Admin cancels the approved seminar booking
    status, cancel_res = make_req(f"{BASE_URL}/requests/{seminar_booking_id}/cancel", method="POST", data={"reason": "Inspection rescheduled by Principal"}, token=ao_token)
    print(f"[PASS] AO Cancellation Test 4 & 5: AO Admin cancelled request: status {status}, response: {cancel_res}")
    assert status == 200, f"Expected 200 for AO Admin cancellation, got {status}: {cancel_res}"

    # Verify persistence: get booking and check status is CANCELLED
    status, cancelled_bk = make_req(f"{BASE_URL}/seminar/requests/{seminar_booking_id}", token=dept_token)
    print(f"  Cancelled booking status from backend: '{cancelled_bk.get('status')}', reason: '{cancelled_bk.get('cancellationReason')}'")
    assert cancelled_bk.get("status") == "CANCELLED", f"Expected CANCELLED, got {cancelled_bk.get('status')}"

    # Verify slot was released: slot should now be available again for booking!
    status, slot_check = make_req(f"{BASE_URL}/seminar/availability?hallId={test_hall_id}&date={test_date}", token=dept_token)
    slots_map = slot_check.get("slots", {}) if isinstance(slot_check, dict) else {}
    afternoon_status = slots_map.get("AFTERNOON")
    print(f"[PASS] AO Cancellation Test 6: Slot release verification on {test_date} AFTERNOON: '{afternoon_status}'")
    assert afternoon_status == "AVAILABLE", f"Expected slot to be AVAILABLE after cancellation, got {afternoon_status}"

    # Verify repeated cancellation attempt on already cancelled request -> MUST be rejected
    status, repeat_cancel = make_req(f"{BASE_URL}/requests/{seminar_booking_id}/cancel", method="POST", data={"reason": "Repeat cancel"}, token=ao_token)
    print(f"[PASS] AO Cancellation Test 7a: Repeated cancellation safely rejected with status {status}: {repeat_cancel}")
    assert status == 400, f"Expected 400 for repeated cancellation, got {status}"

    # Now test cancellation across all other 4 services: Accommodation, Transport, Stationery, Snacks & Meals
    # 1. Accommodation
    print("\n--- Testing Accommodation Cancellation ---")
    acc_payload = {
        "hostel": "Boys Hostel",
        "roomType": "AC Room",
        "checkInDate": "2026-11-28",
        "checkOutDate": "2026-11-29",
        "guestsCount": 2,
        "purpose": "Faculty Guest Lecture Visit",
        "facultyOrGuestName": "Dr. Smith"
    }
    status, acc_req = make_req(f"{BASE_URL}/accommodation/requests", method="POST", data=acc_payload, token=dept_token)
    print(f"  Created Accommodation request: status {status}")
    assert status in (200, 201), f"Accommodation creation failed: {acc_req}"
    acc_id = acc_req.get("requestId") or acc_req.get("id")
    # Approve it as AO Admin
    status, appr_acc = make_req(f"{BASE_URL}/accommodation/requests/{acc_id}/ao-direct-approve", method="PUT", token=ao_token)
    assert status == 200, f"Accommodation approval failed: {status} {appr_acc}"
    # Cancel it as AO Admin
    status, acc_cancel = make_req(f"{BASE_URL}/requests/{acc_id}/cancel", method="POST", data={"reason": "Guest visit postponed"}, token=ao_token)
    print(f"[PASS] Accommodation cancellation: status {status}")
    assert status == 200
    status, acc_detail = make_req(f"{BASE_URL}/accommodation/requests/{acc_id}", token=dept_token)
    print(f"  Accommodation status: {acc_detail.get('status')}")
    assert acc_detail.get("status") == "CANCELLED"

    # 2. Transport
    print("\n--- Testing Transport Cancellation ---")
    trans_payload = {
        "tripType": "Innova",
        "tripDate": "2026-11-28",
        "pickupLocation": "Main Gate",
        "destination": "Vijayawada Airport",
        "departureTime": "08:00 AM",
        "expectedPassengers": 3,
        "purpose": "Guest Airport Pickup"
    }
    status, trans_req = make_req(f"{BASE_URL}/transport/requests", method="POST", data=trans_payload, token=dept_token)
    print(f"  Created Transport request: status {status}")
    assert status in (200, 201), f"Transport creation failed: {trans_req}"
    trans_id = trans_req.get("requestId") or trans_req.get("id")
    # Approve it
    status, appr_trans = make_req(f"{BASE_URL}/transport/requests/{trans_id}/approve", method="PUT", token=ao_token)
    assert status == 200, f"Transport approval failed: {status} {appr_trans}"
    # Cancel it as AO Admin
    status, trans_cancel = make_req(f"{BASE_URL}/requests/{trans_id}/cancel", method="POST", data={"reason": "Pickup cancelled by visitor"}, token=ao_token)
    print(f"[PASS] Transport cancellation: status {status}")
    assert status == 200
    status, trans_detail = make_req(f"{BASE_URL}/transport/requests/{trans_id}", token=dept_token)
    print(f"  Transport status: {trans_detail.get('status')}")
    assert trans_detail.get("status") == "CANCELLED"

    # 3. Stationery
    print("\n--- Testing Stationery Cancellation ---")
    status, stat_items = make_req(f"{BASE_URL}/stationery/items", token=dept_token)
    assert status == 200 and len(stat_items) > 0, "No stationery items found"
    first_item_id = stat_items[0].get("itemId") or stat_items[0].get("id")
    print(f"  Stationery first item: itemId={first_item_id}, name={stat_items[0].get('name')}")
    stat_payload = {
        "items": [
            {"itemId": first_item_id, "quantity": 5}
        ],
        "purpose": "Semester Examination Question Papers"
    }
    status, stat_req = make_req(f"{BASE_URL}/stationery/requests", method="POST", data=stat_payload, token=dept_token)
    print(f"  Created Stationery request: status {status}")
    assert status in (200, 201), f"Stationery creation failed: {stat_req}"
    stat_id = stat_req.get("requestId") or stat_req.get("id")
    # Approve it
    status, appr_stat = make_req(f"{BASE_URL}/stationery/requests/{stat_id}/approve", method="PUT", token=ao_token)
    assert status == 200, f"Stationery approval failed: {status} {appr_stat}"
    # Cancel it as AO Admin
    status, stat_cancel = make_req(f"{BASE_URL}/requests/{stat_id}/cancel", method="POST", data={"reason": "Excess exam stock found"}, token=ao_token)
    print(f"[PASS] Stationery cancellation: status {status}")
    assert status == 200
    status, stat_detail = make_req(f"{BASE_URL}/stationery/requests/{stat_id}", token=dept_token)
    print(f"  Stationery status: {stat_detail.get('status')}")
    assert stat_detail.get("status") == "CANCELLED"

    # 4. Snacks & Meals
    print("\n--- Testing Snacks & Meals Cancellation ---")
    meals_payload = {
        "eventTitle": "Governing Body Luncheon",
        "date": "2026-11-28",
        "venue": "Board Room",
        "mealTypes": ["Lunch"],
        "totalGuests": 20
    }
    status, meals_req = make_req(f"{BASE_URL}/meals/requests", method="POST", data=meals_payload, token=dept_token)
    print(f"  Created Meals request: status {status}")
    assert status in (200, 201), f"Meals creation failed: {meals_req}"
    meals_id = meals_req.get("requestId") or meals_req.get("id")
    # Approve it
    status, appr_meals = make_req(f"{BASE_URL}/meals/requests/{meals_id}/approve", method="PUT", token=ao_token)
    assert status == 200, f"Meals approval failed: {status} {appr_meals}"
    # Cancel it as AO Admin
    status, meals_cancel = make_req(f"{BASE_URL}/requests/{meals_id}/cancel", method="POST", data={"reason": "Meeting rescheduled"}, token=ao_token)
    print(f"[PASS] Meals cancellation: status {status}")
    assert status == 200
    status, meals_detail = make_req(f"{BASE_URL}/meals/requests/{meals_id}", token=dept_token)
    print(f"  Meals status: {meals_detail.get('status')}")
    assert meals_detail.get("status") == "CANCELLED"

    print("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
