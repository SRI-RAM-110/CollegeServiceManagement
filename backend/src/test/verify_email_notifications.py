import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:8080/api"

def request_json(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"raw": err_body}

def main():
    print("=== TASK: EMAIL NOTIFICATION VERIFICATION SUITE ===")

    # 1. Login as HOD test user (sriramsriram123654) or AO Admin
    # Note: sriramsriram123654 user exists in MongoDB with role DEPARTMENT_HOD, AO_ADMIN
    # Let's test login with ao@nrtec.in / admin123
    status, res = request_json(f"{BASE_URL}/auth/login", method="POST", data={"email": "ao@nrtec.in", "password": "admin123"})
    assert status == 200, f"AO Admin login failed: {res}"
    admin_token = res["data"]["token"]
    print("[PASS] Logged in as AO Admin")

    # 2. Check Database: Verify primary recipient sriramsriram123654@gmail.com exists in user records
    from pymongo import MongoClient
    client = MongoClient("mongodb://127.0.0.1:27017/")
    db = client["collegeservices_db"]

    primary_user = db.users.find_one({"email": "sriramsriram123654@gmail.com"})
    assert primary_user is not None, "Primary recipient user sriramsriram123654@gmail.com MUST exist in DB"
    assert primary_user["userId"] == "sriramsriram123654", f"Expected userId sriramsriram123654, got {primary_user['userId']}"
    print(f"[PASS] Primary user verified in DB: userId={primary_user['userId']}, email={primary_user['email']}")

    # 3. Check Database: Verify CC recipient zsonsoul@gmail.com does NOT have a user account
    cc_user = db.users.find_one({"email": "zsonsoul@gmail.com"})
    assert cc_user is None, "External CC recipient zsonsoul@gmail.com MUST NOT have a database user account"
    print("[PASS] External CC recipient zsonsoul@gmail.com has NO database account (strictly external)")

    # 4. Test Authenticated Test-Email Endpoint
    print("\n--- Testing Authenticated Test-Email Endpoint ---")
    status, res = request_json(f"{BASE_URL}/notifications/test-email", method="POST", token=admin_token)
    assert status == 200, f"Test email endpoint returned {status}: {res}"
    data = res.get("data", {})
    assert data.get("primaryRecipient") == "sriramsriram123654@gmail.com", f"Expected primary recipient sriramsriram123654@gmail.com, got {data.get('primaryRecipient')}"
    assert "zsonsoul@gmail.com" in data.get("ccRecipients", []), f"Expected zsonsoul@gmail.com in CC, got {data.get('ccRecipients')}"
    assert data.get("event") == "TEST_EVENT", f"Expected event TEST_EVENT, got {data.get('event')}"
    print(f"[PASS] Test email executed: Status={data.get('status')}, Primary={data.get('primaryRecipient')}, CC={data.get('ccRecipients')}")

    # 5. Check EmailLog collection in DB
    email_log = db.email_logs.find_one({"eventCategory": "TEST_EVENT"}, sort=[("_id", -1)])
    assert email_log is not None, "Email log entry must be recorded in email_logs collection"
    assert email_log["primaryRecipient"] == "sriramsriram123654@gmail.com"
    assert "zsonsoul@gmail.com" in email_log["ccRecipients"]
    print(f"[PASS] EmailLog stored correctly in MongoDB with status: {email_log['status']}")

    # 6. Test Service Request Notification triggers email dispatch and CC
    print("\n--- Testing Service Notification Trigger (Seminar Hall Booking) ---")
    # Login as CSE User to submit a booking
    status, res = request_json(f"{BASE_URL}/auth/login", method="POST", data={"email": "cse001@nrtec.local", "password": "dept123"})
    assert status == 200, f"CSE user login failed: {res}"
    user_token = res["data"]["token"]

    import datetime, random
    test_date = (datetime.date.today() + datetime.timedelta(days=random.randint(100, 500))).strftime("%Y-%m-%d")
    booking_payload = {
        "hallId": "SH-2",
        "bookingType": "ONE_TIME",
        "eventTitle": "Email Notification Test Seminar",
        "date": test_date,
        "slot": "FORENOON",
        "purpose": "Email Notification Test Seminar",
        "expectedParticipants": 50,
        "additionalRequirements": "Projector, Mic"
    }
    status, res = request_json(f"{BASE_URL}/seminar/requests", method="POST", data=booking_payload, token=user_token)
    assert status == 200, f"Booking creation failed with status {status}: {res}"
    booking_id = res["data"]["bookingId"]
    print(f"[PASS] Created booking: {booking_id}")

    def wait_for_email_log(query, timeout=12):
        import time
        start = time.time()
        while time.time() - start < timeout:
            res = db.email_logs.find_one(query)
            if res:
                return res
            time.sleep(0.5)
        return None

    # Check in-app notification created
    notif = db.notifications.find_one({"referenceId": booking_id}, sort=[("_id", -1)])
    assert notif is not None, f"In-app notification should exist for {booking_id}"
    print(f"[PASS] In-app notification preserved: Title='{notif['title']}'")

    # Check email log created for submission
    sub_email_log = wait_for_email_log({"referenceId": booking_id, "eventCategory": "REQUEST_SUBMITTED"})
    assert sub_email_log is not None, f"Email log should exist for submission of {booking_id}"
    assert "zsonsoul@gmail.com" in sub_email_log["ccRecipients"], "Submission event must include CC zsonsoul@gmail.com"
    print(f"[PASS] Submission email logged with CC: {sub_email_log['ccRecipients']}")

    # 7. Test Approval Email Notification
    print("\n--- Testing Approval Email Notification ---")
    status, res = request_json(f"{BASE_URL}/seminar/requests/{booking_id}/approve", method="PUT", token=admin_token)
    assert status == 200, f"Approval failed: {res}"
    print(f"[PASS] Booking {booking_id} approved")

    app_email_log = wait_for_email_log({"referenceId": booking_id, "eventCategory": "REQUEST_APPROVED"})
    assert app_email_log is not None, f"Email log should exist for approval of {booking_id}"
    assert "zsonsoul@gmail.com" in app_email_log["ccRecipients"], "Approval event must include CC zsonsoul@gmail.com"
    print(f"[PASS] Approval email logged with primary: {app_email_log['primaryRecipient']} and CC: {app_email_log['ccRecipients']}")

    # 8. Test Cancellation Email Notification
    print("\n--- Testing Cancellation Email Notification ---")
    cancel_payload = {"reason": "Testing email notification cancellation workflow"}
    status, res = request_json(f"{BASE_URL}/seminar/requests/{booking_id}/cancel", method="POST", data=cancel_payload, token=user_token)
    assert status == 200, f"Cancellation request failed: {res}"

    # Approve cancellation as AO Admin
    status, res = request_json(f"{BASE_URL}/seminar/requests/{booking_id}/cancel/approve", method="PUT", token=admin_token)
    assert status == 200, f"Cancellation approval failed: {res}"
    print(f"[PASS] Booking {booking_id} cancellation approved")

    cancel_email_log = wait_for_email_log({"referenceId": booking_id, "eventCategory": "REQUEST_CANCELLED"})
    assert cancel_email_log is not None, f"Email log should exist for cancellation of {booking_id}"
    assert "zsonsoul@gmail.com" in cancel_email_log["ccRecipients"], "Cancellation event must include CC zsonsoul@gmail.com"
    print(f"[PASS] Cancellation email logged with CC: {cancel_email_log['ccRecipients']}")

    # 9. Test Deduplication
    print("\n--- Testing Deduplication Logic ---")
    # Call test-email multiple times, check deduplication key behavior
    initial_count = db.email_logs.count_documents({"deduplicationKey": {"$regex": "^TEST:"}})
    status, res = request_json(f"{BASE_URL}/notifications/test-email", method="POST", token=admin_token)
    assert status == 200
    new_count = db.email_logs.count_documents({"deduplicationKey": {"$regex": "^TEST:"}})
    assert new_count == initial_count + 1
    print("[PASS] Deduplication key logic verified")

    print("\n==========================================")
    print("ALL EMAIL NOTIFICATION VERIFICATION TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    main()
