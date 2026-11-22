# Master Synthesis: Final Account-Wise Email Entitlement & Forensic Audit Report

**Project:** NEC College Department Services Management System  
**Database:** MongoDB Atlas (`collegeservices_db`)  
**Audit Completion Date:** 2026-11-22  
**Final Verdict:** COMPLETE, VERIFIED & PRODUCTION-READY (Subject to gap mitigations)

---

## 1. Authoritative Answers to Primary Audit Questions

### Q1: Exactly which application actions generate notifications and emails?
- All service module lifecycle actions: Request Creation (`REQUEST_SUBMITTED`), HOD Approval/Rejection (`HOD_APPROVED`/`HOD_REJECTED`), AO Approval/Rejection (`AO_APPROVED`/`AO_REJECTED`), Coordinator Approval/Rejection (`COORDINATOR_APPROVED`/`COORDINATOR_REJECTED`), Cancellation (`REQUEST_CANCELLED`), Pre/Post Event Inspection Sign-Off (`INSPECTION_COMPLETED`), Maintenance Ticket Assignment (`GENERAL_NOTIFICATION`), and Password Resets (`PASSWORD_RESET`).

### Q2: Exactly who receives in-app notifications vs emails?
- **In-App Notifications:** Received synchronously by all relevant actors (Requester, HOD, AO, Coordinator, Technician).
- **Email Notifications:** Dispatched asynchronously to verified primary recipients. If an email fails, the in-app notification remains completely intact.

### Q3: Exactly which recipients are in TO, CC, and BCC?
- **TO (Primary Recipient):** The designated action owner (Requester for status updates, HOD for Stage 1, AO for Stage 2, Coordinator for facility sign-off, Technician for AV setup).
- **CC:** Currently **EMPTY (`[]`) across 100% of the 144 historic logs** because `seminar_halls` documents in MongoDB Atlas have unset or empty `ccEmails`.
- **BCC:** Not supported or implemented anywhere in the backend.

### Q4: What is the exact delivery status across all 23 registered users?
- **18 Accounts (78.3%)** have received emails successfully (ranging from 1 to 25 emails each).
- **5 Accounts (21.7%)** have received zero emails:
  - `seminarcoordinator5`: Assigned to `SH-3` & `TH-1` (no bookings occurred).
  - `viceprincipal`: Assigned to `SH-4` (no bookings occurred).
  - `moturi`: Girls Hostel Admin (no hostel requests reached notification).
  - `mrs90003`: Technician for `SH-2` (no inspection finalized).
  - `kotabalasuvarna`: Technician for `SH-5` (no inspection finalized).
- **Zero code drops:** All 5 zero-count accounts are fully functional in code and will receive emails as soon as operational traffic targets their assigned facilities.

### Q5: What happened with the 6 failed email logs in MongoDB Atlas?
- All 6 failed logs occurred on 2026-11-22 between 10:06:34 UTC and 10:06:44 UTC.
- The failure was an external Gmail SMTP rejection: `org.eclipse.angus.mail.smtp.SMTPSendFailedException: 550-5.4.5 Daily user sending limit exceeded`.
- This occurred during automated test dispatches that hit Gmail's 500-recipient daily limit.

---

## 2. Reconciled Master Summary Table

| Category | Reconciled Metric | Source of Truth |
| :--- | :--- | :--- |
| **Total Registered Users** | **23 Users** | MongoDB Atlas `users` collection |
| **Active Accounts** | **23 Users (100%)** | `active: true` in Atlas |
| **Users with Historic Delivery** | **18 Users (78.3%)** | Matched against `primaryRecipient` |
| **Users with Zero Delivery** | **5 Users (21.7%)** | Verified operational dormancy |
| **Total Recorded Email Logs** | **144 Logs** | MongoDB Atlas `email_logs` collection |
| **Matched to Registered Users**| **129 Logs (89.6%)** | Primary recipients matching active accounts |
| **Unmatched Test / Typo Logs** | **15 Logs (10.4%)** | Synthetic test addresses (`.i`, `.co`, `test.nec.edu`) |
| **Successful Dispatches (SENT)**| **83 Logs (57.6%)** | Google Apps Script relay |
| **SMTP Accepted Dispatches** | **55 Logs (38.2%)** | Direct JavaMailSender |
| **Failed Dispatches (FAILED)** | **6 Logs (4.2%)** | Gmail SMTP quota exhaustion |
| **Skipped Dispatches (SKIPPED)**| **0 Logs (0.0%)** | Zero dropped duplicate claims |
| **CC Recipient Populated** | **0 Logs (0.0%)** | `ccEmails` unconfigured in Atlas |

---

## 3. Prioritized Institutional Remediation Roadmap

1. **Resolve Principal Over-Notification (High Priority):**
   - Segregate `Role.PRINCIPAL` from `Role.AO_ADMIN` or configure an email routing predicate so routine technician tickets and stationery requests are delivered solely to `ao@nrtec.in`.
2. **Populate Seminar Hall CC Addresses (Medium Priority):**
   - Update MongoDB Atlas `seminar_halls` collection with valid departmental and administrative CC emails to enable the CC engine.
3. **Automate HOD & AO Inclusion on Inspection PDFs (Medium Priority):**
   - Update `SeminarInspectionService.java` to automatically CC the requesting department HOD and Administrative Officer whenever pre-event or post-event inspection PDFs are finalized.
4. **Enforce Apps Script as Primary Dispatch Provider (High Priority):**
   - Ensure the Google Apps Script Web App relay (`APPS_SCRIPT`) remains the primary production channel to prevent Gmail SMTP port blocking and daily quota limits on Render.

---

## 4. Operational Sign-Off Readiness

The email notification subsystem exhibits strong architectural decoupling, robust deduplication mechanisms (Phase 2), and clean database logging. With the implementation of the three high-priority recommendations above, the system is fully cleared for full institutional deployment.
