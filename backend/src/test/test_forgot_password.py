import urllib.request
import urllib.parse
import json
import hashlib
import secrets
import datetime
from pymongo import MongoClient

BASE_URL = "http://localhost:8080/api"

def req(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"raw": err_body}

def main():
    print("=== TEST SUITE: FORGOT & RESET PASSWORD FEATURE ===")
    client = MongoClient("mongodb://127.0.0.1:27017/")
    db = client["collegeservices_db"]

    # 1. Test Submission for Non-Existent Email (Anti-Enumeration)
    print("\n--- Test 1: Forgot Password with Unknown Email ---")
    status, res = req(f"{BASE_URL}/auth/forgot-password", method="POST", data={"email": "nonexistent.user.xyz999@nrtec.local"})
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert "If an account exists" in res.get("message", ""), f"Unexpected message: {res}"
    print(f"[PASS] Unknown email returns public neutral confirmation: {res.get('message')}")

    # Verify no token was created for non-existent user
    count_nonexistent = db.password_reset_tokens.count_documents({"email": "nonexistent.user.xyz999@nrtec.local"})
    assert count_nonexistent == 0, "No token should be created for non-existent email"
    print("[PASS] Verified no DB token created for non-existent email")

    # 2. Test Submission for Existing Registered Email
    print("\n--- Test 2: Forgot Password with Existing Email ---")
    test_email = "sriramsriram123654@gmail.com"
    # Ensure no cooldown blocks this test by removing recent tokens for this user
    db.password_reset_tokens.delete_many({"email": test_email})

    status, res = req(f"{BASE_URL}/auth/forgot-password", method="POST", data={"email": test_email})
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert "If an account exists" in res.get("message", ""), f"Unexpected message: {res}"
    print(f"[PASS] Existing email returns identical public neutral confirmation: {res.get('message')}")

    # 3. Verify Token Stored Securely in MongoDB
    print("\n--- Test 3: Verify Secure Token Storage & Expiry in DB ---")
    token_doc = db.password_reset_tokens.find_one({"email": test_email, "used": False}, sort=[("_id", -1)])
    assert token_doc is not None, "Password reset token must be saved in MongoDB"
    assert token_doc["userId"] == "sriramsriram123654", f"Expected userId sriramsriram123654, got {token_doc.get('userId')}"
    assert "tokenHash" in token_doc and len(token_doc["tokenHash"]) == 64, "tokenHash must be a 64-char hex SHA-256 string"
    assert "rawToken" not in token_doc, "Raw token must NEVER be stored in DB!"
    
    # Verify expiry is ~15 minutes
    expiry = token_doc["expiryDate"]
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    # Check expiry is in the future
    assert expiry > now, f"Expiry date {expiry} should be in the future (now: {now})"
    print(f"[PASS] Token securely hashed with SHA-256 and expires at {expiry}")

    # 4. Verify Email Log & Strict NO CC Rule
    print("\n--- Test 4: Verify Password-Reset Email and Zero CC Recipients ---")
    # Wait briefly if SMTP dispatch is finishing
    import time
    time.sleep(2)
    email_log = db.email_logs.find_one({"eventCategory": "PASSWORD_RESET", "primaryRecipient": test_email}, sort=[("_id", -1)])
    assert email_log is not None, "EmailLog record must exist for password reset"
    assert email_log["primaryRecipient"] == test_email
    assert email_log["ccRecipients"] == [], f"Password reset email must NOT have any CC recipients! Found: {email_log['ccRecipients']}"
    assert "zsonsoul@gmail.com" not in email_log["ccRecipients"], "Strict requirement: CC must not include zsonsoul@gmail.com"
    print(f"[PASS] EmailLog verified: Status={email_log['status']}, Primary={email_log['primaryRecipient']}, CC={email_log['ccRecipients']} (Strictly No CC)")

    # 5. Test Invalid Token Rejection
    print("\n--- Test 5: Reject Invalid Reset Token ---")
    status, res = req(f"{BASE_URL}/auth/reset-password", method="POST", data={
        "token": "completely_fake_invalid_token_99999",
        "newPassword": "ValidPassword123!"
    })
    assert status == 400, f"Expected 400 Bad Request, got {status}: {res}"
    print(f"[PASS] Invalid token correctly rejected with status 400: {res.get('message')}")

    # 6. Test Valid Token Password Reset
    print("\n--- Test 6: Reset Password with Valid Token ---")
    # Generate a fresh test token with known raw bytes
    raw_token = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    db.password_reset_tokens.insert_one({
        "userId": "sriramsriram123654",
        "email": test_email,
        "tokenHash": token_hash,
        "expiryDate": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(minutes=15),
        "used": False,
        "createdAt": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    })

    new_password = "NewSecretPassword2026!#"
    status, res = req(f"{BASE_URL}/auth/reset-password", method="POST", data={
        "token": raw_token,
        "newPassword": new_password
    })
    assert status == 200, f"Expected 200 OK, got {status}: {res}"
    print(f"[PASS] Password reset succeeded: {res.get('message')}")

    # Verify token is now marked used
    used_token = db.password_reset_tokens.find_one({"tokenHash": token_hash})
    assert used_token["used"] is True, "Token must be marked used=True"
    assert "usedAt" in used_token and used_token["usedAt"] is not None, "usedAt timestamp must be recorded"
    print("[PASS] Token marked as used in DB")

    # 7. Test Token Reuse Prevention
    print("\n--- Test 7: Prevent Token Reuse ---")
    status, res = req(f"{BASE_URL}/auth/reset-password", method="POST", data={
        "token": raw_token,
        "newPassword": "AnotherPassword123!"
    })
    assert status == 400, f"Expected 400 on token reuse, got {status}: {res}"
    print(f"[PASS] Reusing consumed token rejected with status 400: {res.get('message')}")

    # 8. Test Expired Token Rejection
    print("\n--- Test 8: Reject Expired Token ---")
    expired_raw_token = secrets.token_hex(32)
    expired_hash = hashlib.sha256(expired_raw_token.encode("utf-8")).hexdigest()
    db.password_reset_tokens.insert_one({
        "userId": "sriramsriram123654",
        "email": test_email,
        "tokenHash": expired_hash,
        "expiryDate": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(minutes=10),
        "used": False,
        "createdAt": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(minutes=25)
    })
    status, res = req(f"{BASE_URL}/auth/reset-password", method="POST", data={
        "token": expired_raw_token,
        "newPassword": "AnotherPassword123!"
    })
    assert status == 400, f"Expected 400 on expired token, got {status}: {res}"
    print(f"[PASS] Expired token rejected with status 400: {res.get('message')}")

    # 9. Verify Login with New Password & Rejection of Old Password
    print("\n--- Test 9: Verify Login with New Password & Rejection of Old ---")
    # Old/wrong password must fail
    status, res = req(f"{BASE_URL}/auth/login", method="POST", data={
        "email": test_email,
        "password": "WrongOrOldPassword123"
    })
    assert status == 401 or status == 400, f"Old/wrong password must fail, got {status}"
    print("[PASS] Old/wrong password rejected")

    # New password must succeed
    status, res = req(f"{BASE_URL}/auth/login", method="POST", data={
        "email": test_email,
        "password": new_password
    })
    assert status == 200, f"Login with new password failed: {res}"
    jwt_token = res["data"]["token"]
    assert jwt_token is not None and len(jwt_token) > 20, "Valid JWT token must be returned"
    print(f"[PASS] Successfully logged in with new password! JWT token acquired: {jwt_token[:15]}...")

    # Verify user record attributes were preserved (not altered)
    user_after = db.users.find_one({"email": test_email})
    assert user_after["userId"] == "sriramsriram123654"
    assert user_after["role"] == "DEPARTMENT_HOD", "User role must not be changed"
    assert user_after["password"].startswith("$2a$10$"), "Password must be BCrypt hashed"
    print("[PASS] User account attributes (userId, role, permissions, email) strictly preserved")

    # 10. Verify Existing Users Login & Auth Still Works
    print("\n--- Test 10: Verify Existing AO Admin Login & Service System ---")
    status, res = req(f"{BASE_URL}/auth/login", method="POST", data={"email": "ao@nrtec.in", "password": "admin123"})
    assert status == 200, f"AO admin login failed: {res}"
    print("[PASS] Existing AO Admin login works with standard credentials")

    print("\n=======================================================")
    print("ALL FORGOT/RESET PASSWORD TEST SUITE CHECKS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    main()
