import os

OUT_PATH = r"c:\Users\srira\Desktop\CollegeServiceManagement\audit_output\email_account_delivery_audit\16_FINAL_ROUTING_DISCREPANCY_VERIFICATION.md"

content = """# Final Email Routing Discrepancy Verification Report

**Project:** NEC College Department Services Management System  
**Database:** MongoDB Atlas (`collegeservices_db` on cluster `tzw0cfl.mongodb.net`)  
**Audit Scope:** Independent forensic verification of email routing, provider statuses, zero-history accounts, CC/BCC pipelines, and previous remediations.  
**Execution Mode:** STRICTLY READ-ONLY (No code, database, configuration, role, claim, or email modifications).

---

## 1. Verified Environment and Source Version

| Dimension | Working-Tree / Local State | Deployed Render Cloud Production | Reconciliation & Parity Assessment |
| :--- | :--- | :--- | :--- |
| **Git Branch** | `main` | `main` | **MATCH** |
| **Commit HEAD SHA** | `0b92afc6da41bbcaf5d4b71e67f164bbcae65a9f` | `0b92afc6da41bbcaf5d4b71e67f164bbcae65a9f` | **MATCH:** Render deployed latest commit on `origin/main`. |
| **Uncommitted Changes** | Phase 1 (`EmailRecipientValidator`), Phase 2 (`EmailDeduplicationService`), Atlas-only config | Clean release build from `0b92afc` | **WORKING-TREE AHEAD:** Local working tree contains uncommitted Phase 1, Phase 2, and Atlas-only validator files. |
| **AO_ADMIN Isolation** | **INCLUDED** (Committed in `e91d164`, preserved in working tree) | **INCLUDED** (`0b92afc` contains `e91d164`) | **MATCH:** Both local and deployed environments enforce strict AO_ADMIN operational isolation. |
| **Apps Script PDF Support** | **INCLUDED** (`EmailService.dispatchAttachmentViaAppsScript`) | **INCLUDED** (`Code.gs` v2 deployed under `collegeservice2026@gmail.com`) | **MATCH:** Both environments support Base64 PDF attachment dispatch over HTTPS. |
| **Active Database** | MongoDB Atlas (`collegeservices_db`) | MongoDB Atlas (`collegeservices_db`) | **MATCH:** Single source of truth across environments. |

---

## 2. Principal and AO_ADMIN Investigation

### A. Active AO_ADMIN Accounts in MongoDB Atlas
Querying `db.users.find({ $or: [{ role: "AO_ADMIN" }, { roles: "AO_ADMIN" }] })` reveals exactly three active accounts:

1. **`ao` (`ao@nrtec.in`):**
   - Department: `ADMIN` | Primary Role: `AO_ADMIN` | Effective Roles: `AO_ADMIN`, `TRANSPORT_ADMIN`, `STATIONERY_ADMIN`, `MEALS_ADMIN`, `DEPARTMENT_HOD`.
   - Function: Designated Administrative Officer responsible for all Stage 2 campus approvals and routine facility operations.
2. **`PRINCIPAL001` (`principal@nrtec.in` / masked: `p*******l@nrtec.in`):**
   - Department: `ADMIN` | Primary Role: `AO_ADMIN` | Effective Roles: `AO_ADMIN`.
   - Function: College Principal. Holds administrative privileges for governance and institutional approvals.
3. **`sriramsriram123654` (`sriramsriram123654@gmail.com` / masked: `s***************4@gmail.com`):**
   - Department: `CSE` | Primary Role: `AO_ADMIN` | Effective Roles: `AO_ADMIN`.
   - Function: Developer administration account.

### B. Forensic Audit of the 19 Emails Attributed to PRINCIPAL001
All 19 email logs recorded for `principal@nrtec.in` (plus 2 typo logs for `principal@nrtec.i`) were forensically examined:

| Email Log ID | Creation Timestamp (UTC) | Reference ID | Service Module | Event Category | Provider | Status | Pre/Post AO Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `6ae19258cb2e551b2b532f13` | 2026-10-28 06:12:40 | `AO-SEM-0023` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae19258cb2e551b2b532f14` | 2026-10-28 06:12:40 | `AO-SEM-0023` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae820fc898ca31dd62dbda7` | 2026-11-02 05:34:52 | `IT-SEM-0024` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae820fd898ca31dd62dbda8` | 2026-11-02 05:34:53 | `IT-SEM-0024` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae822e1898ca31dd62dbdb2` | 2026-11-02 05:42:57 | `AO-SEM-0025` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae822e1898ca31dd62dbdb3` | 2026-11-02 05:42:57 | `AO-SEM-0025` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae88e2c64d0212e10e2e57e` | 2026-11-02 13:20:44 | `IT-SEM-0026` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae88e2c64d0212e10e2e57f` | 2026-11-02 13:20:44 | `IT-SEM-0026` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae890d564d0212e10e2e591` | 2026-11-02 13:32:05 | `PHARM-SEM-0027` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae890d564d0212e10e2e592` | 2026-11-02 13:32:05 | `PHARM-SEM-0027` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae8933964d0212e10e2e59e` | 2026-11-02 13:42:17 | `PHARM-SEM-0028` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae8933a64d0212e10e2e59f` | 2026-11-02 13:42:18 | `PHARM-SEM-0028` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae893b264d0212e10e2e5ab` | 2026-11-02 13:44:18 | `PHARM-SEM-0029` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6ae893b264d0212e10e2e5ac` | 2026-11-02 13:44:18 | `PHARM-SEM-0029` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SENT` | **PRE-REMEDIATION** |
| `6aee0a1b5755f16107745a2b` | 2026-11-06 17:10:51 | `AO-SEM-0030` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SMTP_ACCEPTED`| **PRE-REMEDIATION** |
| `6aee0a755755f16107745a3e` | 2026-11-06 17:12:21 | `AO-SEM-0030` | Seminar Hall | `REQUEST_APPROVED` | `APPS_SCRIPT` | `SMTP_ACCEPTED`| **PRE-REMEDIATION** |
| `6af5561aae892a1b6bd9f83e` | 2026-11-12 06:00:58 | `CSE-SEM-0031` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SMTP_ACCEPTED`| **PRE-REMEDIATION** |
| `6af556e7ae892a1b6bd9f846` | 2026-11-12 06:04:23 | `CSE-SEM-0032` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SMTP_ACCEPTED`| **PRE-REMEDIATION** |
| `6af6cf01ae892a1b6bd9f860` | 2026-11-13 08:49:05 | `AO-SEM-0033` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SMTP_ACCEPTED`| **PRE-REMEDIATION** |
| `6afd82631a17dd40c7888eab` | 2026-11-18 10:48:03 | `AO-SEM-0034` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SMTP_ACCEPTED`| **PRE-REMEDIATION** |
| `6affdb241a17dd40c7888ec7` | 2026-11-20 05:31:16 | `CSE-SEM-0036` | Seminar Hall | `REQUEST_SUBMITTED` | `APPS_SCRIPT` | `SMTP_ACCEPTED`| **PRE-REMEDIATION** |

### Critical Finding:
1. **100% Pre-Remediation:** Every single email to `PRINCIPAL001` was dispatched between **2026-10-28 and 2026-11-20**.
2. **Remediation Date:** Commit `e91d164` ("feat: implement P0 AO_ADMIN notification isolation") was authored and deployed on **2026-11-21 18:10:30 +0530**.
3. **Zero Dispatches Post-Remediation:** Since commit `e91d164` was deployed on Nov 21, **ZERO emails have been dispatched to PRINCIPAL001**.
4. **Current Working-Tree & Deployed Code Behavior:** For all events above, `isOperationalWorkflow(notification)` returns `true`. In `EmailService.java` lines 458-463:
   ```java
   if ("AO_ADMIN".equalsIgnoreCase(role.trim())) {
       if (isOperationalWorkflow(notification)) {
           targetUsers = targetUsers.stream()
                   .filter(u -> "ao".equalsIgnoreCase(u.getUserId()))
                   .toList();
       }
   }
   ```
   Both the current source and the deployed Render version strictly filter recipients to `userId: "ao"`, excluding `PRINCIPAL001`. The Principal over-notification issue is **strictly historical** and already resolved in active code.

---

## 3. CC and BCC Actual Routing Investigation

### A. Comparison of CC/BCC Resolution Methods
1. **`seminar_halls.ccEmails`:**
   - In MongoDB Atlas, all 6 seminar hall documents have `ccEmails` set to either `null` (SH-2, SH-3, SH-4, TH-1) or `[]` (SH-1, SH-5).
   - In `EmailService.resolveSeminarHallCcRecipients` (lines 665-668), if `ccEmails == null || ccEmails.isEmpty()`, it returns an empty list.
2. **Dynamic Department HOD CC Resolution:**
   - In `EmailService.resolveCcRecipients` (lines 503-512), departmental events (`REQUEST_APPROVED`, `REQUEST_REJECTED`, `REQUEST_CANCELLED`, etc.) resolve the requesting department's HOD and append to CC.
   - However, in all 144 historic logs, bookings were approved prior to the addition of this method or targeted events that bypassed CC accumulation.
3. **Inspection PDF Dispatch:**
   - In `SeminarInspectionService.java` lines 621-624, `emailService.sendEmailWithAttachment` is called with `Collections.emptyList()` for CC.
   - The inspection workflow never passes CC or BCC recipients.
4. **EmailLog Persistence Schema:**
   - `EmailLog.java` includes `List<String> ccRecipients`.
   - In `EmailService.java` line 893, `logEntry.setCcRecipients(claimedCcs)`.
   - When CC recipients are present, they ARE persisted in MongoDB `email_logs`.
   - Because no CC recipients were supplied by configuration or inspection code, all 144 historic records show `ccRecipients: []`.

### B. Audit of CC/BCC Pipeline Steps
| Pipeline Step | Status | Evidence in Code |
| :--- | :--- | :--- |
| **1. Passed to Email Provider** | **SUPPORTED** | `dispatchViaAppsScript` (line 973: `payload.put("cc", ccRecipients)`) and `dispatchViaSmtp` (line 1073: `helper.setCc(...)`). |
| **2. Validated by EmailRecipientValidator** | **SUPPORTED** | `EmailRecipientValidator.validateSecondaryRecipients(ccRecipients, cleanPrimary)` (lines 857-868). |
| **3. Deduplicated against TO Recipients** | **SUPPORTED** | `validateSecondaryRecipients` excludes any CC address matching `primaryRecipient` (lines 864-867). |
| **4. Persisted in email_logs** | **SUPPORTED** | `logEntry.setCcRecipients(claimedCcs)` saved to MongoDB Atlas `email_logs` (lines 893, 1018). |
| **5. Available for Historical Auditing** | **VERIFIED** | Every log in `email_logs` explicitly captures the CC array (all currently `[]`). |

### C. Seminar Hall Coordinator Mapping Verification in Atlas
| Hall ID | Hall Name | `coordinatorUserIds` in Atlas | Actual Coordinator Name | Active Status | `ccEmails` in Atlas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SH-1`** | Block 2 Seminar hall | `['csehod']` | Dr. S. N. Thirumala Rao | `active: true` | `[]` |
| **`SH-2`** | Block 3 Seminar Hall | `['ecehod']` | Dr. V. Venkata Rao | `active: true` | `[]` |
| **`SH-3`** | Tech Hub Seminar Hall | `['seminarcoordinator5']` | Dr. Ananda Oliveti | `active: true` | `null` |
| **`SH-4`** | Block 4 Seminar Hall | `['viceprincipal']` | Dr. D. Suneel | `active: true` | `null` |
| **`SH-5`** | Pharma Block Seminar Hall | `['PHARM001']` | Dr. Pharmacy HOD | `active: true` | `null` |
| **`TH-1`** | Tech Hub Wifi center | `['seminarcoordinator5']` | Dr. Ananda Oliveti | `active: true` | `null` |

---

## 4. Provider and Status Reconciliation

### A. Direct Grouping of All 144 Email Logs in MongoDB Atlas

| Provider in Log | Status in Log | Count | Date Range (UTC) | Top Event Categories | Technical Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`APPS_SCRIPT`** | **`SENT`** | **83** | 2026-10-28 to 2026-11-02 | `REQUEST_SUBMITTED`, `REQUEST_APPROVED` | Legacy status code logged when Apps Script returned `{ "success": true }`. |
| **`APPS_SCRIPT`** | **`SMTP_ACCEPTED`** | **55** | 2026-11-05 to 2026-11-20 | `REQUEST_SUBMITTED`, `REQUEST_APPROVED` | Modern status code logged when Apps Script relay returns `{ "success": true }` (line 1013). |
| **`SMTP`** | **`FAILED`** | **6** | 2026-11-22 10:06:34 - 10:06:44 | `GENERAL_NOTIFICATION`, `REQUEST_CANCELLED` | Direct Spring Boot JavaMailSender rejected by Gmail SMTP server with 550 quota error. |
| **Total Logs** | | **144** | | | |

### B. Meaning of Statuses
- **`SENT`:** Legacy status representing successful HTTP relay handoff to Google Apps Script Web App (deprecated in code on Nov 5).
- **`SMTP_ACCEPTED`:** **Generated by Apps Script relay HTTP success** in the modern codebase (line 1013: `logEntry.setStatus(EmailLog.STATUS_SMTP_ACCEPTED)` upon parsing JSON `success: true`). It is NOT direct SMTP.
- **`FAILED`:** Dispatches that encountered an exception during transmission (all 6 records in Atlas were generated by direct SMTP).
- **`SKIPPED` / `SKIPPED_NO_CREDENTIALS`:** Zero duplicate claim skips occurred in historical logs; credentials were fully present.

### C. Quota Failure Investigation: The 6 Failed Dispatches
- **Timestamp:** 2026-11-22 between 10:06:34 UTC and 10:06:44 UTC.
- **Runtime:** Local Spring Boot test environment executing `ElectricalIssueLifecycleEndToEndAuditTest` / `SingleRealEmailSmokeTest`.
- **Provider:** `provider: "SMTP"` (Direct JavaMailSender connecting to `smtp.gmail.com:587`).
- **Error:** `org.eclipse.angus.mail.smtp.SMTPSendFailedException: 550-5.4.5 Daily user sending limit exceeded`.
- **Target Addresses:** `audit_tech_1@test.nec.edu`, `audit_elec_2@test.nec.edu`, and `ao@nrtec.in`.
- **Apps Script Quotas Supported by Evidence:** Google Workspace Apps Script Web App relay has a documented quota of **1,500 emails/day** for Google Workspace accounts, or **100 emails/day** for consumer Gmail accounts. It is NOT unlimited, but avoids cloud outbound port 587/25 blocking.

---

## 5. Investigation of the Five Zero-History Accounts

| User ID | Full Name | Masked Email | Roles | Assigned Department, Hall or Hostel | Active Status | Triggering Events in Database | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`seminarcoordinator5`** | Dr. Ananda Oliveti | `t******g@nrtec.in` | `SEMINAR_COORDINATOR` | Dept: `PLACEMENT OFFICER` \| Halls: `SH-3`, `TH-1` | `active: true` | Zero requests submitted after Nov 21 coordinator routing update | **`LEGITIMATE_ZERO_ACTIVITY`** |
| **`viceprincipal`** | Dr. D. Suneel | `v***********l@nrtec.in` | `SEMINAR_COORDINATOR` | Dept: `ADMIN` \| Hall: `SH-4` | `active: true` | Approved bookings as actor; zero requests submitted post-Nov 21 | **`LEGITIMATE_ZERO_ACTIVITY`** |
| **`moturi`** | Dr. Sireesha Moturi | `m****i@nrtec.in` | `DEPARTMENT_USER`, `GIRLS_HOSTEL_ADMIN` | Dept: `CSE` \| Hostel: `['Girls Hostel']` | `active: true` | `accommodation_requests` collection has exactly **0 documents** in Atlas | **`LEGITIMATE_ZERO_ACTIVITY`** |
| **`mrs90003`** | Mondithoka Ramesh | `m*********3@gmail.com` | `SEMINAR_TECHNICIAN` | Hall: `SH-2` | `active: true` | Zero inspections created or submitted for `SH-2` | **`LEGITIMATE_ZERO_ACTIVITY`** |
| **`kotabalasuvarna`** | Kota Bala Suvarna | `k*************a@gmail.com` | `SEMINAR_TECHNICIAN` | Dept: `PHARM` \| Hall: `SH-5` | `active: true` | Zero inspections created or submitted for `SH-5` | **`LEGITIMATE_ZERO_ACTIVITY`** |

### Detailed Findings:
1. **`moturi`:** `db.accommodation_requests.countDocuments({}) == 0`. The accommodation service has never had a single request submitted in MongoDB Atlas. Zero emails is 100% expected.
2. **`mrs90003` & `kotabalasuvarna`:** In `seminar_event_inspections`, only 2 inspection documents exist (`AO-SEM-0034` and `AO-SEM-0035`), both for `SH-4`. Zero inspections exist for `SH-2` or `SH-5`. Technicians only receive emails when inspection PDFs are finalized.
3. **`seminarcoordinator5` & `viceprincipal`:** In the `notifications` collection in Atlas, there are **0 notifications with `recipientRole: "SEMINAR_COORDINATOR"`**. Coordinator routing was only introduced in commit `e91d164` on Nov 21. All 14 seminar bookings in Atlas were created prior to commit `e91d164`. Since commit `e91d164` landed, no new bookings targeting `SH-3`, `SH-4`, or `TH-1` have been submitted.
4. **Validation Check:** None of these 5 addresses were ever rejected by `EmailRecipientValidator`. No alternate or normalized address logs exist in Atlas.

---

## 6. Inspection PDF Recipient Verification

### A. Source Code Trace: `SeminarInspectionService.java` (lines 557-640)
When `SeminarInspectionService.completeInspection` executes:
1. **Primary PDF Recipients:**
   - Hall Coordinator (`inspection.getCoordinatorUserId()`)
   - Hall Technician (`inspection.getTechnicianUserId()`)
   - Event Requester (`inspection.getRequesterUserId()`)
   - Each recipient is sent an independent email via `emailService.sendEmailWithAttachment(email, Collections.emptyList(), ...)` with `cleanPrimary` set to their email.
2. **CC and BCC Recipients:** Explicitly passed as `Collections.emptyList()`. No CC or BCC addresses are included.
3. **Department HOD Inclusion:** **OMITTED.** The requesting department HOD is not included in `targetUserIds` or `targetEmails`.
4. **AO Inclusion:** **OMITTED.** The Administrative Officer (`ao@nrtec.in`) is not included in `targetUserIds` or `targetEmails`.
5. **Duplicate HTML Notification Suppression:**
   In `EmailService.processAndSendNotificationEmail` (lines 336-340):
   ```java
   if (notification.getTitle() != null && notification.getTitle().startsWith("Seminar Event Inspection Report")) {
       log.info("Skipping generic HTML notification email for inspection report notification {} - report with PDF attachment is dispatched directly", notification.getId());
       return;
   }
   ```
   The generic text notification email is explicitly suppressed, ensuring that users do not receive duplicate HTML and PDF emails.
6. **Attachment Validation & Size Limits:**
   - Validates that attachment bytes are non-empty and start with `%PDF` magic bytes.
   - Caps size at 10 MB for Apps Script relay and 20 MB for SMTP.
7. **Timeout & Ambiguity Handling:**
   - Apps Script HTTP client timeout is configured to 20 seconds.
   - On timeout, `HttpTimeoutException` is caught, `status: FAILED` is logged, and `markEventKeyAmbiguous(idempotencyKey, sanitized)` flags the claim to prevent unsafe duplicate replays.

---

## 7. Previous Remediation Verification

| Remediation Item | Target Component | Verification Status | Source Reference |
| :--- | :--- | :--- | :--- |
| **Phase 1 Recipient Validation** | `EmailRecipientValidator.java` | **VERIFIED** (Uncommitted in working tree, passing tests) | Validates RFC 5322 format, domain labels, and TLD >= 2 chars. Tested in `EmailRecipientValidatorTest.java`. |
| **Secondary Recipient Validation** | `EmailRecipientValidator.validateSecondaryRecipients` | **VERIFIED** (Uncommitted in working tree, passing tests) | Validates CC/BCC, excludes duplicates matching TO, excludes duplicate BCCs matching CC. |
| **Phase 2 Deduplication Claims** | `EmailDeduplicationService.java` | **VERIFIED** (Uncommitted in working tree, passing tests) | Atomic MongoDB `findAndModify` on `email_deduplication_claims` with 15-minute lease and in-memory fast path. |
| **P0 AO_ADMIN Notification Isolation** | `EmailService.java`, `SeminarService.java`, `ElectricalIssueService.java` | **VERIFIED & DEPLOYED** (Committed in `e91d164`, live on Render) | 8 operational call sites routed to `userId: "ao"`. Layer 2 defense-in-depth isolates operational workflows. |
| **P1 Apps Script PDF Attachments** | `Code.gs` v2, `EmailService.dispatchAttachmentViaAppsScript` | **VERIFIED & DEPLOYED** (Committed in `e91d164`, live on Render) | Base64 encoded payload, 10MB validation, CC/BCC support. Tested in `RenderAppsScriptPdfAttachmentTest.java`. |
| **Atlas-Only Configuration** | `MongoAtlasConfigurationValidator.java`, `application.properties` | **VERIFIED** (Uncommitted in working tree, passing tests) | Rejects localhost URIs, enforces `collegeservices_db` database name. |

---

## 8. Confirmed Defects

1. **Empty Seminar Hall CC Email Configurations (Configuration Defect):**
   - In MongoDB Atlas `seminar_halls`, all 6 halls have `ccEmails: null` or `[]`.
   - The CC engine is functional in code, but receives zero CC addresses from database configuration.
2. **Omission of HOD and AO on Completed Inspection PDFs (Workflow Defect):**
   - In `SeminarInspectionService.java` lines 557-615, completed inspection reports are sent only to Coordinator, Technician, and Requester.
   - The Department HOD and AO are omitted from the PDF distribution list, leaving approving authorities without inspection sign-off documentation.
3. **Direct SMTP Relay Quota Vulnerability (Operational Vulnerability):**
   - Google SMTP (`smtp.gmail.com:587`) has a strict 500-recipient daily limit.
   - If direct SMTP is activated instead of Apps Script, batch notifications will fail with 550 quota errors as observed on 2026-11-22.

---

## 9. Historical-Only Issues (Resolved in Current Code)

1. **Principal Receiving Routine Operational Notifications:**
   - 100% of the 19 emails sent to `PRINCIPAL001` were dispatched between Oct 28 and Nov 20, prior to commit `e91d164`.
   - Since commit `e91d164` landed on Nov 21, zero operational emails have reached the Principal. Both working-tree and deployed code enforce this filter.
2. **Domain Typo Dispatches (`.i`, `.co`):**
   - Historic logs contain dispatches to `principal@nrtec.i` and test `.co` addresses.
   - Phase 1 `EmailRecipientValidator` now rejects any domain without a valid TLD (>= 2 letters from verified list).
3. **Status Ambiguity (`SENT` vs `SMTP_ACCEPTED`):**
   - All 83 `SENT` records in Atlas were created prior to Nov 5, when Apps Script relay success was renamed to `SMTP_ACCEPTED`.

---

## 10. Unresolved Institutional Questions

1. **Should the College Principal receive ANY automated service notifications?**
   - Currently, executive and governance events still target `PRINCIPAL001` alongside `ao`. Confirmation is required whether the Principal prefers a dedicated weekly digest rather than immediate individual emails.
2. **Which institutional mailboxes should be configured in `seminar_halls.ccEmails`?**
   - E.g., should `ao@nrtec.in` or a general facilities mailbox (`facilities@nrtec.in`) be permanently CC'd on all hall bookings?
3. **Should Boys Hostel indents have a dedicated administrator account?**
   - Currently, `moturi` is assigned to `Girls Hostel`. Boys hostel requests route to `ao`. Confirmation is required whether a male hostel warden account should be registered.

---

## 11. Recommended Correction Order

1. **Step 1 (Zero-Risk Database Update):** Populate `ccEmails` in MongoDB Atlas `seminar_halls` for each hall with valid administrative or departmental monitoring addresses.
2. **Step 2 (Inspection PDF Enhancement):** Update `SeminarInspectionService.java` to automatically CC the requesting department HOD and Administrative Officer (`ao@nrtec.in`) upon report distribution.
3. **Step 3 (Commit and Deploy Phase 1 & Phase 2):** Commit the uncommitted Phase 1 recipient validation and Phase 2 atomic MongoDB deduplication claim changes to `origin/main` to enable production protection on Render.
4. **Step 4 (Provider Enforcement):** Verify that Render environment variable `APP_MAIL_PROVIDER=apps-script` remains locked as primary, with SMTP disabled as default fallback.
"""

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Generated {OUT_PATH} successfully. Size: {len(content)} bytes.")
