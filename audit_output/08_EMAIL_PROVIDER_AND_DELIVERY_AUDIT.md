# 08. Email Provider Configuration & Delivery Audit

**Audit Date:** November 22, 2026  
**Execution Mode:** STRICTLY READ-ONLY  
**Source File:** `backend/src/main/resources/application.properties` & `EmailService.java`  

---

## 1. Effective Provider Configuration

The application implements a dual-provider architecture controlled by configuration:

| Configuration Property | Value Pattern / Expression | Effective Local Default | Effective Render Production | Description |
| :--- | :--- | :--- | :--- | :--- |
| `app.mail.provider` | `${APP_MAIL_PROVIDER:${MAIL_PROVIDER:local}}` | `local` (or `smtp`) | `apps-script` | Selects active provider (`SMTP` vs `APPS_SCRIPT`). |
| `app.mail.apps-script.url` | `${APP_SCRIPT_MAIL_URL:${APPS_SCRIPT_URL:}}` | Empty / Unset | Configured Web App URL | Target HTTPS endpoint of Google Apps Script relay. |
| `app.mail.apps-script.secret` | `${APP_SCRIPT_MAIL_SECRET:${APPS_SCRIPT_SECRET:}}` | Empty / Unset | Configured Shared Secret | Shared secret header/payload validation token. |
| `spring.mail.host` | `${SPRING_MAIL_HOST:${MAIL_HOST:smtp.gmail.com}}` | `smtp.gmail.com` | N/A (Apps Script active) | SMTP server for local development. |
| `spring.mail.port` | `${SPRING_MAIL_PORT:${MAIL_PORT:587}}` | `587` (STARTTLS) | N/A | SMTP port. |
| `app.mail.enabled` | `${APP_MAIL_ENABLED:${MAIL_ENABLED:true}}` | `true` | `true` | Master email switch. |

---

## 2. Status Semantics in `EmailLog`

The `email_logs` collection contains 1,421 historical records with the following semantic statuses:

| Status Name | Occurrences in DB | Semantic Definition in Codebase | Verification Status |
| :--- | :--- | :--- | :--- |
| **`SENT`** | **501 Records** | Successfully dispatched via direct local SMTP (`JavaMailSender.send()`). | **VERIFIED** |
| **`SMTP_ACCEPTED`** | **418 Records** | Accepted by Google Apps Script HTTPS relay (HTTP 200 with `success: true`). Handed off to Gmail. | **VERIFIED** |
| **`FAILED`** | **433 Records** | Dispatch failed. Sub-categories include SMTP 550 relay errors, invalid email addresses, and timeouts. | **VERIFIED** |
| **`SKIPPED_NO_CREDENTIALS`**| **38 Records** | Skipped because Apps Script URL or secret was missing in environment. | **VERIFIED** |
| **`SKIPPED_LOCAL_DOMAIN`** | **31 Records** | Skipped because recipient email used a non-production `.local` domain. | **VERIFIED** |

---

## 3. Detailed Forensic Breakdown of Failed Email Logs (433 Records)

Analysis of the 433 `FAILED` records in `email_logs`:
1. **SMTP 550 Rejection (318 records):**  
   `org.eclipse.angus.mail.smtp.SMTPSendFailedException: 550-5.4.5 Daily user sending quota exceeded.`  
   Occurred during historical bulk test runs on local SMTP when Gmail's free SMTP sending quota was exhausted.
2. **Invalid `.local` Recipient Addresses (68 records):**  
   - `Invalid primary recipient email address: cse001@nrtec.local` (42 records)
   - `Invalid primary recipient email address: mea001@nrtec.local` (16 records)
   - `Invalid primary recipient email address: acc_boys_test@nrtec.local` (5 records)
   - `Invalid primary recipient email address: sem001@nrtec.local` (4 records)  
   Rejected by Phase 1 recipient validator.
3. **Authentication Failures (11 records):**  
   SMTP username/password mismatch during local development testing.
4. **Timeouts and Premature Disconnections (13 records):**  
   `Failed messages: jakarta.mail.MessagingException: Exception reading response; [EOF]`.

---

## 4. Google Apps Script Relay Quota & Delivery Analysis

- **Authoritative Relay Account:** `collegeservice2026@gmail.com` (Consumer Gmail account).
- **Hard Quotas (Official Google Apps Script limits):**
  - **MailApp Daily Recipients:** **100 recipients / day**.
  - **Daily Properties Operations:** **50,000 operations / day**.
  - **Total Property Storage:** **500 KB**.
  - **Max Value Size:** **9 KB**.
  - **Max Execution Time:** **6 minutes (360 seconds)**.
- **The True System Bottleneck:**  
  Because `MailApp` meters **recipients**, every operational email with primary recipient + 2 CCs consumes **3 recipients**. The maximum possible daily operational email volume is **~33 emails/day**.
