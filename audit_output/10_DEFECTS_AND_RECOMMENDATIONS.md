# 10. Classified Defects & Architectural Recommendations

**Audit Date:** November 22, 2026  
**Execution Mode:** STRICTLY READ-ONLY  
**Defect Severity Scale:** CRITICAL, HIGH, MEDIUM, LOW  

---

## 1. Summary of Identified Defects

| Finding ID | Severity | Affected Module | Short Description | Primary Risk |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | **CRITICAL** | User Accounts & Routing | Developer account `sriramsriram123654` has `DEPARTMENT_HOD` and `AO_ADMIN`. | Confidential institutional leakage to personal Gmail. |
| **DEF-02** | **CRITICAL** | User Accounts | Inactive Principal account `PRINCIPAL001` has corrupted TLD (`.i`). | Malformed email address, broken administrative escalation. |
| **DEF-03** | **CRITICAL** | User Accounts & Routing | 17 operational user accounts have `.local` domain emails. | Phase 1 validator blocks dispatches; operational users receive no emails. |
| **DEF-04** | **HIGH** | Departments Collection | All 9 departments have `hodUserId`, `hodName`, `hodEmail` set to `null`. | Fragile dynamic fallback queries; database schema disorganization. |
| **DEF-05** | **HIGH** | Routing & Departments | Missing HOD accounts for IT and CSDS departments. | Departmental CC notifications for IT and CSDS fail silently. |
| **DEF-06** | **HIGH** | Seminar Halls | Halls `SH-6` and `SH-07` have empty `coordinatorUserIds: []`. | Bookings in these halls dispatch zero coordinator notifications. |
| **DEF-07** | **HIGH** | Authentication | Password reset key uses `System.currentTimeMillis()`. | Bypasses deduplication on rapid clicks; generates multiple reset emails. |
| **DEF-08** | **HIGH** | Routing / AO_ADMIN | `isOperationalWorkflow` filters by `userId == "ao"`, but DB has `AO001`. | Role-based operational notifications targeting AO_ADMIN match zero users. |
| **DEF-09** | **MEDIUM** | Apps Script Relay | Free consumer account (`collegeservice2026@gmail.com`) limited to 100 recipients/day. | Quota exhaustion under burst notifications (capped at ~33 multi-recipient emails/day). |
| **DEF-10** | **MEDIUM** | Relay Idempotency | `idempotencyKey` omitted from standard notification payload to Apps Script. | Relay cannot track idempotency on non-attachment notifications. |
| **DEF-11** | **MEDIUM** | Historical Logs | 211 duplicate deduplicationKey groups exist historically in `email_logs`. | Legacy duplicate dispatches prior to Phase 2 hardening. |
| **DEF-12** | **MEDIUM** | Email Deduplication | 22 claims in `email_deduplication_claims` remain in `IN_PROGRESS` state. | Claims from integration tests left without completion in test environment. |
| **DEF-13** | **LOW** | Email Templates | Email HTML footer hardcodes copyright year or uses system time. | Minor presentation inconsistency. |
| **DEF-14** | **LOW** | User Metadata | Incomplete designations and phone numbers for several test accounts. | Cosmetic gap in user profiles. |

---

## 2. Detailed Defect Analysis & Recommended Remediations

### DEF-01: Developer Account Compromising Departmental HOD & AO Routing
- **Severity:** **CRITICAL**
- **Affected Account:** `sriramsriram123654` (`sriramsriram123654@gmail.com`).
- **Evidence:** Document in `users` collection: `role: "DEPARTMENT_HOD"`, `roles: ["DEPARTMENT_HOD", "AO_ADMIN"]`, `department: "CSE"`.
- **Actual Behavior:** In `EmailService.java:555-565`, `resolveDepartmentHodEmails("CSE")` returns all users with role `DEPARTMENT_HOD` in `CSE`. Both `csehod@nrtec.in` and `sriramsriram123654@gmail.com` receive copy emails for all CSE request approvals, rejections, and cancellations.
- **Recommended Remediation:**
  1. Revoke `DEPARTMENT_HOD` and `AO_ADMIN` roles from user `sriramsriram123654`.
  2. Assign a non-administrative role (e.g. `DEVELOPER_TEST`) or deactivate in production.

### DEF-02: Inactive Principal Account with Malformed TLD (.i instead of .in)
- **Severity:** **CRITICAL**
- **Affected Account:** `PRINCIPAL001` (`principal@nrtec.i`).
- **Evidence:** Document in `users`: `email: "principal@nrtec.i"`, `active: false`.
- **Actual Behavior:** Address fails RFC 5322 regex checks in Phase 1 validator.
- **Recommended Remediation:**
  Update email address to `principal@nrtec.in` and reconcile active status with college administrative policy.

### DEF-03: 17 Operational Accounts Configured with `.local` Domains
- **Severity:** **CRITICAL**
- **Affected Accounts:** `cse001@nrtec.local`, `ece001@nrtec.local`, `acc001@nrtec.local`, etc. (17 accounts).
- **Evidence:** 68 failed records in `email_logs` with error `Invalid primary recipient email address: ...@nrtec.local`.
- **Actual Behavior:** Phase 1 recipient validation blocks all dispatches to `.local` domains in production. Operational users receive zero email notifications.
- **Recommended Remediation:**
  Update all 17 accounts to valid institutional email addresses (`@nrtec.in` or `@nec.edu.in`).

### DEF-04 & DEF-05: Unpopulated Department Collection & Missing HODs for IT / CSDS
- **Severity:** **HIGH**
- **Evidence:** All 9 documents in `departments` have `hodUserId: null`. `users` collection has 0 users with `DEPARTMENT_HOD` for `IT` or `CSDS`.
- **Recommended Remediation:**
  1. Populate `hodUserId`, `hodName`, `hodEmail` in all 9 department documents.
  2. Register authorized faculty accounts as HODs for IT and CSDS departments.

### DEF-06: Unassigned Coordinators for Seminar Halls `SH-6` and `SH-07`
- **Severity:** **HIGH**
- **Evidence:** In `seminar_halls`, `SH-6` and `SH-07` have `coordinatorUserIds: []`.
- **Recommended Remediation:**
  Assign designated seminar coordinators to `SH-6` and `SH-07` in `seminar_halls` documents.

### DEF-07: Password Reset Key Uses Millisecond Timestamp
- **Severity:** **HIGH**
- **Evidence:** `EmailService.java:1439`: `dedupKey = "PWD_RESET:" + System.currentTimeMillis() + ":" + recipientEmail.toLowerCase();`
- **Recommended Remediation:**
  Replace with two-phase atomic sliding-window rate limiter in `AuthService.java` using `PWD_RESET:{email}:{tokenHashPrefix}`.

### DEF-08: `AO_ADMIN` Operational Filter Matches `userId == "ao"` but DB has `AO001`
- **Severity:** **HIGH**
- **Evidence:** `EmailService.java:461`: `filter(u -> "ao".equalsIgnoreCase(u.getUserId()))`.
- **Actual Behavior:** The primary AO account has `userId = "AO001"`. Role-based operational queries find 0 recipients.
- **Recommended Remediation:**
  Update filter to check both `"ao"` and `"AO001"`: `filter(u -> "ao".equalsIgnoreCase(u.getUserId()) || "AO001".equalsIgnoreCase(u.getUserId()))`.
