# Email Failure and Provider Architecture Forensic Analysis

**Audit Source:** 144 Email Log records in MongoDB Atlas  
**Provider Distribution:**
- `APPS_SCRIPT`: 83 records (57.6%) - 100% Success
- `DIRECT_SMTP`: 61 records (42.4%) - 55 Accepted (90.2%), 6 Failed (9.8%)  
**Total Failures:** 6 (4.2% overall failure rate)

---

## 1. Complete Forensic Log of All 6 Failed Email Dispatches

All 6 recorded failures occurred on **2026-11-22 between 10:06:34 UTC and 10:06:44 UTC** during backend test execution:

| Timestamp (UTC) | Masked Recipient Address | Service Module | Event Category | Exact Failure Reason |
| :--- | :--- | :--- | :--- | :--- |
| `2026-11-22T10:06:34.713000` | `a**********1@test.nec.edu` | Electrical Service | `GENERAL_NOTIFICATION` | Gmail SMTP 550-5.4.5: Daily user sending limit exceeded |
| `2026-11-22T10:06:34.712000` | `a**********2@test.nec.edu` | Electrical Service | `GENERAL_NOTIFICATION` | Gmail SMTP 550-5.4.5: Daily user sending limit exceeded |
| `2026-11-22T10:06:35.686000` | `a**********1@test.nec.edu` | Electrical Service | `REQUEST_CANCELLED` | Gmail SMTP 550-5.4.5: Daily user sending limit exceeded |
| `2026-11-22T10:06:36.050000` | `a**********2@test.nec.edu` | Electrical Service | `REQUEST_CANCELLED` | Gmail SMTP 550-5.4.5: Daily user sending limit exceeded |
| `2026-11-22T10:06:44.206000` | `a*@nrtec.in` | Electrical Service | `GENERAL_NOTIFICATION` | Gmail SMTP 550-5.4.5: Daily user sending limit exceeded |
| `2026-11-22T10:06:44.200000` | `a**********1@test.nec.edu` | Electrical Service | `GENERAL_NOTIFICATION` | Gmail SMTP 550-5.4.5: Daily user sending limit exceeded |

---

## 2. In-Depth Root Cause Analysis of the 6 Failures

### A. The Error Signature
The recorded exception across all 6 records is:
```
org.eclipse.angus.mail.smtp.SMTPSendFailedException: 550-5.4.5 Daily user sending limit exceeded.
For more information on Gmail sending limits go to https://support.google.com/a/answer/166852
```

### B. Technical Mechanism of Failure
1. **Gmail SMTP Relay Quota:**
   - When configured with direct Spring Boot JavaMailSender connecting to `smtp.gmail.com:587`, Google Workspace / Gmail enforces strict daily sending limits.
   - For free Gmail accounts, the rolling 24-hour limit is 500 recipients.
   - During automated testing on the morning of 2026-11-22, a batch of test dispatches for Electrical Service tickets exhausted the available quota of the test sender mailbox.
2. **Failure Handling in Spring Boot:**
   - `EmailService.java` caught the `SMTPSendFailedException`.
   - The catch block correctly extracted the error message and persisted the log with `status: FAILED` and `errorMessage` containing the full SMTP response.
   - In-app notification creation was **not rolled back**, proving that email failure is properly decoupled from in-app notification persistence.

---

## 3. Comparison of Dispatch Providers

| Architectural Property | Google Apps Script Web App Relay (`APPS_SCRIPT`) | Direct JavaMailSender (`DIRECT_SMTP`) |
| :--- | :--- | :--- |
| **Log Volume in Atlas** | 83 Dispatches | 61 Dispatches |
| **Success Rate** | **100.0% (83 / 83)** | **90.2% (55 / 61)** |
| **Connection Protocol** | HTTPS POST (Port 443) | SMTP / STARTTLS (Port 587) |
| **Port Blocking Risk** | **None** (Standard HTTPS port open everywhere) | High (Render and cloud hosts often throttle port 587/25) |
| **Daily Quota** | 1,500 emails/day (Workspace) / 100/day (Consumer) | 500 - 2,000 emails/day depending on Google Workspace tier |
| **Attachment Handling** | Encoded as base64 in JSON payload | Standard MIME multipart binary stream |
| **Timeout Characteristics** | Subject to Google Apps Script 6-minute ceiling | Configured via `mail.smtp.timeout` (typically 10-30s) |

---

## 4. Status Definitions in `EmailLog`

- **`SENT`:** The email was successfully handed off to the Google Apps Script Web App relay over HTTPS, which executed `MailApp.sendEmail()` without error.
- **`SMTP_ACCEPTED`:** The email was successfully submitted to the SMTP server (Google SMTP) via `javaMailSender.send()`, which returned a `250 OK` acknowledgment.
- **`FAILED`:** An exception occurred during transmission (e.g. SMTP 550 quota rejection, network timeout, or invalid credentials). The error message is captured in `errorMessage`.
- **`SKIPPED`:** A duplicate dispatch attempt was blocked by the atomic deduplication lease in `EmailDeduplicationService`. (Zero records in Atlas, confirming no duplicate collisions were dropped).
