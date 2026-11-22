# 01. Forensic Audit Executive Summary

**Project:** NEC College Department Services Management System  
**Repository:** `CollegeServiceManagement`  
**Audit Date:** November 22, 2026  
**Execution Mode:** STRICTLY READ-ONLY (Zero source code, database, or environment modifications)  
**Authoritative Database:** `collegeservices_db` (MongoDB Atlas Schema / Local Authoritative Node)  

---

## 1. Executive Summary & Audit Context

A comprehensive forensic audit was conducted across the entire notification, email routing, and user account subsystem of the Narasaraopeta Engineering College (NEC) College Department Services Management System. The objective was to establish an evidence-based, mathematically verified record of every notification trigger, email dispatch path, recipient resolution rule, registered user account, and cross-collection audit log.

All findings in this report are backed by exact source file paths, line numbers, and database document queries.

---

## 2. Key Audit Metrics & Reconciled Totals

| Forensic Dimension | Reconciled Total | Primary Evidence Source | Verification Status |
| :--- | :--- | :--- | :--- |
| **Total Backend Source Files Inspected** | **38 Files** | `backend/src/main/java` tree | **VERIFIED** |
| **Total Discovered Notification Invocation Sites** | **97 Sites** | AST/Regex Codebase Scan across all Services | **VERIFIED** |
| **Total Distinct Notification Event Categories** | **36 Events** | Event Master Matrix (Module Mappings) | **VERIFIED** |
| **Total Email Templates Catalogued** | **4 Core Templates** | `EmailService.java` & `SeminarInspectionService.java` | **VERIFIED** |
| **Total Registered User Accounts Reconciled** | **44 Accounts** | `users` collection in `collegeservices_db` | **VERIFIED (100% Reconciled)** |
| **Total Departments Reconciled** | **9 Departments** | `departments` collection in `collegeservices_db` | **VERIFIED** |
| **Total Seminar Halls Reconciled** | **7 Halls** | `seminar_halls` collection in `collegeservices_db` | **VERIFIED** |
| **Total Historical Notification Documents** | **3,275 Records** | `notifications` collection in `collegeservices_db` | **VERIFIED** |
| **Total Historical Email Log Documents** | **1,421 Records** | `email_logs` collection in `collegeservices_db` | **VERIFIED** |
| **Total Deduplication Claims Examined** | **22 Claims** | `email_deduplication_claims` collection | **VERIFIED** |
| **Total Password Reset Tokens Examined** | **8 Tokens** | `password_reset_tokens` collection | **VERIFIED** |
| **Total Identified Routing & Account Defects** | **14 Defects** | Defect Catalogue (CRITICAL: 3, HIGH: 5, MED: 4, LOW: 2) | **VERIFIED** |

---

## 3. Top Critical & High Severity Findings

### CRITICAL DEFECTS:
1. **[DEF-01] Developer Account Compromising Departmental HOD & AO Routing (Confidential Leakage):**
   - **Account:** User `sriramsriram123654` (Name: `soulfinder`, Email: `sriramsriram123654@gmail.com`).
   - **Issue:** Holds both `DEPARTMENT_HOD` (for department `CSE`) and `AO_ADMIN`.
   - **Impact:** For every CSE department request (Approval, Rejection, Cancellation, Status Update), the system resolves HOD CC emails dynamically from `users`. As a result, both Dr. S. N. Thirumala Rao (`csehod@nrtec.in`) AND the external personal Gmail account `sriramsriram123654@gmail.com` receive departmental CC notifications! Furthermore, this account received 174 emails in `email_logs`.
2. **[DEF-02] Inactive Principal Account with Malformed TLD (.i instead of .in):**
   - **Account:** User `PRINCIPAL001` (Name: `Dr. S. Venkateswarlu`, Email: `principal@nrtec.i`, Role: `AO_ADMIN`, Active: `false`).
   - **Issue:** The email address has a corrupted TLD (`.i` instead of `.in`). The account is inactive. If activated or referenced by legacy role queries, dispatch fails RFC 5322 regex checks.
3. **[DEF-03] 17 Operational Accounts Configured with `.local` Domains (Production Delivery Drop):**
   - **Accounts:** 17 users (including department users `CSE001`, `ECE001`, facility admins `ACC001`, `TRN001`, `STA001`, `MEA001`, `SEM001`) have emails ending in `@nrtec.local`.
   - **Impact:** In production, Phase 1 recipient validation strictly rejects `.local` domains. As a consequence, 42+ recent email notifications failed with `Invalid primary recipient email address: cse001@nrtec.local`. These users never receive email notifications in production.

### HIGH SEVERITY DEFECTS:
4. **[DEF-04] Department HOD Fields Completely Unpopulated in `departments` Collection:**
   - In all 9 department documents, `hodUserId = null`, `hodName = null`, `hodEmail = null`.
   - The application is forced to fall back on querying the `users` collection dynamically by role and department.
5. **[DEF-05] Missing HODs for IT and CSDS Departments:**
   - Zero users exist in the database with role `DEPARTMENT_HOD` and department `IT` or `CSDS`.
   - Departmental approval notifications for IT and CSDS requests fail silently without CC to an HOD.
6. **[DEF-06] Unassigned Coordinators for Seminar Halls `SH-6` and `SH-07`:**
   - `SH-6` (Block 2 Seminar hall) and `SH-07` (theater) have `coordinatorUserIds: []`.
   - Bookings created for these halls result in zero coordinator notifications.
7. **[DEF-07] Password Reset Deduplication Bypass via Dynamic Millisecond Timestamp:**
   - `EmailService.java:1439` constructs dedupKey using `System.currentTimeMillis()`. Every click generates a unique key, completely bypassing Phase 2 deduplication.
8. **[DEF-08] Free Consumer Gmail Relay Bound by 100 Recipients/Day:**
   - Production uses `collegeservice2026@gmail.com` (Consumer Gmail account).
   - Google enforces a hard ceiling of 100 recipients/day. Because operational emails include primary + 2 CCs (3 recipients), daily throughput is capped at ~33 multi-recipient emails per day.

---

## 4. Directory Structure of Deliverables

All 12 audit reports are generated in `audit_output/`:
- `01_EXECUTIVE_SUMMARY.md`: High-level summary, metrics, and defect register.
- `02_COMPLETE_USER_ACCOUNT_REGISTER.md`: 100% reconciled table of all 44 user accounts.
- `03_NOTIFICATION_EVENT_MASTER_MATRIX.md`: Complete matrix of all 36 distinct event types across 97 call sites.
- `04_EMAIL_SUBJECT_AND_BODY_CATALOGUE.md`: Exhaustive catalogue of every email template (HTML and plain-text).
- `05_USER_BY_USER_NOTIFICATION_ENTITLEMENTS.md`: Account-by-account entitlement and exclusion audit.
- `06_MODULE_WISE_RECIPIENT_ROUTING.md`: Workflow-by-workflow routing breakdown across all 12 modules.
- `07_AO_HOD_COORDINATOR_AND_TECHNICIAN_AUDIT.md`: Special forensic investigation of administrative routing.
- `08_EMAIL_PROVIDER_AND_DELIVERY_AUDIT.md`: Provider configuration, log statuses, and Apps Script relay analysis.
- `09_EMAIL_LOG_AND_NOTIFICATION_RECONCILIATION.md`: Cross-collection reconciliation between notifications and email_logs.
- `10_DEFECTS_AND_RECOMMENDATIONS.md`: Formal defect log with severities, evidence, and remediation plans.
- `11_SOURCE_CODE_EVIDENCE_INDEX.md`: Source code index with exact file paths and method line references.
- `12_DATABASE_QUERY_AND_COUNT_EVIDENCE.md`: MongoDB query evidence, pipelines, and raw document samples.

---
**Strict Safety Affirmation:** This audit was executed in strictly read-only mode. Zero source files were modified, zero database records were altered, zero emails were sent, and zero production configurations were changed.
