# Executive Summary: System-Wide Email Delivery, Notification Entitlement & Recipient Forensic Audit

**Project:** NEC College Department Services Management System  
**Repository:** `CollegeServiceManagement`  
**Database:** MongoDB Atlas (`collegeservices_db`)  
**Audit Date:** 2026-11-22 16:03:22  
**Audit Scope:** Complete system-wide email routing, user account registry, email logs history, recipient resolution, and role-based entitlements.  
**Execution Mode:** STRICTLY READ-ONLY (No code, database, configuration, or user modifications).

---

## 1. High-Level Audit Metrics

| Metric Category | Count / Value | Description |
| :--- | :--- | :--- |
| **Total Registered Users in MongoDB Atlas** | **23** | Complete set of registered accounts in `users` collection |
| **Active User Accounts** | **23** | 100% of accounts have `active: true` |
| **Users with Historic Email Delivery** | **18 (78.3%)** | Accounts that have at least one recorded email log |
| **Users with ZERO Historic Emails** | **5 (21.7%)** | Accounts that have never received any system email |
| **Total Email Logs Recorded** | **144** | Historical email dispatches recorded in `email_logs` |
| **Successful Dispatches (SENT)** | **83 (57.6%)** | Processed via Google Apps Script Web App relay |
| **Direct Dispatches (SMTP_ACCEPTED)** | **55 (38.2%)** | Processed via direct Spring Boot JavaMailSender (SMTP) |
| **Failed Dispatches (FAILED)** | **6 (4.2%)** | Rejected by Gmail SMTP server (`550-5.4.5 Daily sending limit exceeded`) |
| **Skipped Dispatches (SKIPPED)** | **0 (0.0%)** | Zero dispatches dropped due to deduplication locks |
| **Total CC Recipient Records** | **0 (0.0%)** | Every recorded email log has `ccRecipients: []` |
| **Unmatched Test / Typo Email Logs** | **15 (10.4%)** | Dispatched to non-existent or domain-typo addresses (`.i`, `.co`, `test.nec.edu`) |

---

## 2. Executive Forensic Findings

### A. Core Delivery Pipeline Health
1. **Dual Dispatch Infrastructure:** The system historically used two dispatch channels:
   - **Google Apps Script Web App Relay (`provider: APPS_SCRIPT`):** 83 records. Successful, bypasses local SMTP ports.
   - **Direct SMTP Relay (`provider: DIRECT_SMTP`):** 61 records (55 accepted, 6 failed). Used during high-throughput testing.
2. **Quota Exhaustion Root Cause:** On 2026-11-22, 6 electrical service notification emails failed with `org.eclipse.angus.mail.smtp.SMTPSendFailedException: 550-5.4.5 Daily user sending limit exceeded`. The Gmail account used for testing exceeded its 500-recipient rolling 24-hour limit during stress testing.

### B. User Account & Notification Distribution
1. **Administrative Officers & Executives:**
   - `ao` (`ao@nrtec.in`): 21 emails received across Seminar, Electrical, Generator, and Stationery requests.
   - `PRINCIPAL001` (`p*******l@nrtec.in`): 19 emails received. The Principal holds role `AO_ADMIN` and was routed all routine operational notifications alongside the Administrative Officer.
   - `sriramsriram123654` (`s***************4@gmail.com`): 25 emails received. Developer test account configured with `AO_ADMIN` received high volume prior to exclusion filters.
2. **Department Heads (HODs):**
   - 8 HOD accounts are registered (`mbahod`, `ecehod`, `csehod`, `civilhod`, `aihod`, `mechhod`, `PHARM001`, `hodeee`, `aicsdshod`).
   - All 8 HODs have received email notifications (ranging from 1 to 6 emails each), verifying that department-based HOD resolution functions when requests originate from their respective departments.
3. **Seminar Hall Coordinators & Technicians:**
   - Only 2 out of 5 Coordinators have received booking confirmation emails (`csehod` - 6, `ecehod` - 3).
   - Only 2 out of 5 Technicians have received inspection/setup emails (`knag1999` - 1, `tandavakrishnaanumolu` - 5).
   - `mallavarapubrijesh` (`TPO`, 3 emails) received operational notifications.

### C. The 5 Accounts with ZERO Emails (Root Cause Analysis)
Forensic investigation revealed the exact operational reason why 5 accounts have never received an email:
1. `seminarcoordinator5` (`t******g@nrtec.in`, Placement Officer, Coordinator for SH-3 and TH-1): Zero requests were submitted or approved for Seminar Hall 3 or Training Hall 1 during live testing.
2. `viceprincipal` (`v***********l@nrtec.in`, Vice Principal, Coordinator for SH-4): Zero requests were submitted or approved for Seminar Hall 4.
3. `mrs90003` (`m*********3@gmail.com`, Technician for SH-2): No pre-event or post-event inspection PDF was completed and distributed for Seminar Hall 2.
4. `kotabalasuvarna` (`k*************a@gmail.com`, Technician for SH-5): No inspection was completed and distributed for Seminar Hall 5 (Pharmacy Seminar Hall).
5. `moturi` (`m****i@nrtec.in`, Girls Hostel Admin / Department User): No Girls Hostel accommodation requests reached notification trigger status.

### D. Systemic Architecture Vulnerabilities Identified
1. **Empty CC Recipients System-Wide:** All 144 logs show `ccRecipients: []`. Inspection of `seminar_halls` collection confirmed that `ccEmails` is either `null` or `[]` across all halls. Department HODs and AO are never CC'd on inspection reports.
2. **Principal Over-Notification:** Because `PRINCIPAL001` possesses role `AO_ADMIN`, the system routes every routine service request, technician assignment, and reminder to the Principal unless explicitly suppressed.
3. **Domain Typo Test Logs:** 15 logs were generated to malformed email addresses (`p*******l@nrtec.i`, `n*************7@gmail.co`, `t*******************u@gmail.co`, etc.) revealing lack of strict RFC 5322 TLD validation prior to Phase 1 implementation.

---

## 3. Report Navigation Index

This audit contains 15 comprehensive forensic reports located in `audit_output/email_account_delivery_audit/`:

- [01_EXECUTIVE_SUMMARY.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/01_EXECUTIVE_SUMMARY.md): Executive briefing and core audit findings.
- [02_COMPLETE_USER_ACCOUNT_REGISTER.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/02_COMPLETE_USER_ACCOUNT_REGISTER.md): Exhaustive census of all 23 user accounts in MongoDB Atlas.
- [03_ALL_EMAIL_EVENTS_AND_TEMPLATES.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/03_ALL_EMAIL_EVENTS_AND_TEMPLATES.md): Inventory of all email-triggering application events and templates.
- [04_ACCOUNT_WISE_EMAIL_DELIVERY_HISTORY.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/04_ACCOUNT_WISE_EMAIL_DELIVERY_HISTORY.md): Detailed delivery metrics and log histories per account.
- [05_ACCOUNTS_WITH_ZERO_EMAILS.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/05_ACCOUNTS_WITH_ZERO_EMAILS.md): Root cause diagnosis for the 5 accounts with zero delivery history.
- [06_ROLE_BASED_EXPECTED_EMAIL_ENTITLEMENTS.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/06_ROLE_BASED_EXPECTED_EMAIL_ENTITLEMENTS.md): Institutional entitlement matrix vs actual implementation.
- [07_MODULE_WISE_EMAIL_RECIPIENT_MATRIX.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/07_MODULE_WISE_EMAIL_RECIPIENT_MATRIX.md): Service-by-service lifecycle recipient routing analysis.
- [08_TO_CC_BCC_RECIPIENT_ANALYSIS.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/08_TO_CC_BCC_RECIPIENT_ANALYSIS.md): Forensic investigation of TO vs CC vs BCC delivery states.
- [09_EMAIL_FAILURE_AND_PROVIDER_ANALYSIS.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/09_EMAIL_FAILURE_AND_PROVIDER_ANALYSIS.md): Detailed post-mortem of provider routing and the 6 failed dispatches.
- [10_EMAIL_VS_IN_APP_AND_PUSH_COMPARISON.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/10_EMAIL_VS_IN_APP_AND_PUSH_COMPARISON.md): Tri-channel synchronization and decoupling evaluation.
- [11_MISSING_AND_UNAUTHORIZED_NOTIFICATION_GAPS.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/11_MISSING_AND_UNAUTHORIZED_NOTIFICATION_GAPS.md): Defect and over-notification vulnerability catalogue.
- [12_AO_HOD_COORDINATOR_TECHNICIAN_AUDIT.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/12_AO_HOD_COORDINATOR_TECHNICIAN_AUDIT.md): Deep-dive into key institutional administrative roles.
- [13_EMAIL_SUBJECT_AND_BODY_CATALOGUE.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/13_EMAIL_SUBJECT_AND_BODY_CATALOGUE.md): Complete catalogue of rendered subjects and HTML email bodies.
- [14_SOURCE_CODE_AND_DATABASE_EVIDENCE_INDEX.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/14_SOURCE_CODE_AND_DATABASE_EVIDENCE_INDEX.md): Comprehensive source code and query citation index.
- [15_FINAL_ACCOUNT_WISE_EMAIL_ENTITLEMENT_REPORT.md](file:///c:/Users/srira/Desktop/CollegeServiceManagement/audit_output/email_account_delivery_audit/15_FINAL_ACCOUNT_WISE_EMAIL_ENTITLEMENT_REPORT.md): Definitive institutional audit conclusion and readiness checklist.
