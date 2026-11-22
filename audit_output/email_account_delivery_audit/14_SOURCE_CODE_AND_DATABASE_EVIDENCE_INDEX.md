# Source Code Line Reference and Database Evidence Index

**Audit Scope:** Comprehensive citation index linking all findings to exact source code files, lines, methods, and MongoDB Atlas queries.

---

## 1. Backend Source Code Evidence

| Component / Functionality | Source File Path | Line Range | Methods Audited | Evidence Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Notification Engine & Dispatch** | `src/main/java/com/nec/collegeservices/service/NotificationService.java` | L45 - L120 | `createNotification`, `sendPushNotification` | Synchronous DB persistence of notification followed by async push and `emailService.sendNotificationEmailAsync`. |
| **Email Orchestration & Routing** | `src/main/java/com/nec/collegeservices/service/EmailService.java` | L180 - L290 | `processAndSendNotificationEmail`, `resolvePrimaryRecipients`, `resolveCcRecipients` | Logic resolving recipient user IDs to email addresses, classifying events, and invoking providers. |
| **AO & Developer Filter** | `src/main/java/com/nec/collegeservices/service/EmailService.java` | L458 - L470 | `resolvePrimaryRecipients` | Hardcoded exclusion of `sriramsriram123654` and fallback routing to `ao@nrtec.in`. |
| **Inspection PDF Attachment Flow** | `src/main/java/com/nec/collegeservices/service/SeminarInspectionService.java` | L557 - L635 | `completeInspection` | Retrieval of hall coordinator, technician, and requester; invocation of `emailService.sendEmailWithAttachment`. |
| **PDF Rendering Engine** | `src/main/java/com/nec/collegeservices/service/SeminarInspectionPdfService.java` | L30 - L180 | `generateInspectionReportPdf` | Generation of iText PDF byte array with digital signature placeholders and checklist tables. |
| **Atomic Deduplication Claim** | `src/main/java/com/nec/collegeservices/service/EmailDeduplicationService.java` | L40 - L110 | `tryClaim`, `markSent`, `release` | Atomic MongoDB `findAndModify` claim preventing duplicate dispatches across threads/nodes. |
| **Apps Script Web App Relay** | `src/main/java/com/nec/collegeservices/service/EmailService.java` | L320 - L390 | `sendSingleEmailViaAppsScript` | JSON payload serialization and HTTPS POST to Google Apps Script deployment URL. |
| **Direct JavaMailSender (SMTP)** | `src/main/java/com/nec/collegeservices/service/EmailService.java` | L400 - L450 | `sendSingleEmailViaSmtp` | MimeMessageHelper configuration and `javaMailSender.send()`. |
| **Password Reset Dispatch** | `src/main/java/com/nec/collegeservices/service/AuthService.java` | L210 - L265 | `forgotPassword`, `resetPassword` | 15-minute token generation, user validation, and targeted single-recipient email dispatch. |

---

## 2. MongoDB Atlas Database Query Evidence

**Database:** `collegeservices_db` (Cluster: `tzw0cfl.mongodb.net`)

### A. Collection Statistics:
- `users`: 23 documents (100% active)
- `email_logs`: 144 documents
- `seminar_halls`: 6 documents
- `departments`: 8 documents
- `email_deduplication_claims`: 0 documents (idle state)

### B. Audit Query Citations:
1. **User Role Audit:**
   ```javascript
   db.users.find({}, { userId: 1, name: 1, email: 1, role: 1, roles: 1, active: 1, assignedHallIds: 1 });
   // Returned: 23 records, 0 inactive
   ```
2. **Email Log Status Summary:**
   ```javascript
   db.email_logs.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
   // Returned: SENT: 83, SMTP_ACCEPTED: 55, FAILED: 6, SKIPPED: 0 (Total: 144)
   ```
3. **CC Recipient Audit:**
   ```javascript
   db.email_logs.find({ "ccRecipients.0": { $exists: true } }).count();
   // Returned: 0 (Every record has empty ccRecipients: [])
   ```
4. **Hall CC Emails Audit:**
   ```javascript
   db.seminar_halls.find({}, { name: 1, ccEmails: 1, coordinatorId: 1, technicianId: 1 });
   // Returned: All 6 halls have null or [] for ccEmails
   ```
5. **Failed Dispatches Forensic Audit:**
   ```javascript
   db.email_logs.find({ status: "FAILED" });
   // Returned: 6 records, all with '550-5.4.5 Daily user sending limit exceeded' on 2026-11-22
   ```
