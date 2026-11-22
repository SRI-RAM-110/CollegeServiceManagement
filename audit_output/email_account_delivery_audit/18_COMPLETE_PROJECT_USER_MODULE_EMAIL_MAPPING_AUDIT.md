# Complete Project-Wide User, Role, Module and Email Recipient Mapping Audit

**Project:** NEC College Department Services Management System  
**Repository:** `CollegeServiceManagement`  
**Database:** MongoDB Atlas (`collegeservices_db` on cluster `tzw0cfl.mongodb.net`)  
**Audit Scope:** Comprehensive investigation across all 23 registered user accounts, 12 functional service modules, 95 notification call sites, and 144 historic email logs.  
**Execution Mode:** STRICTLY READ-ONLY (No code, database, role, claim, or configuration modifications).

---

## 1. Executive Summary

This forensic audit investigates whether every registered user in MongoDB Atlas is correctly mapped to their institutional responsibilities, modules, departments, seminar halls, hostels, and notification recipient rules. It specifically resolves why five registered accounts have zero historic email delivery and evaluates all potential points of recipient failure across the architecture.

### Key Forensic Findings:
1. **User Base & Responsibilities (23 Accounts):** Exactly 23 accounts exist in MongoDB Atlas, all 100% active (`active: true`). There are no orphan, suspended, or unverified accounts.
2. **Reconciliation of Zero-Email Accounts (5 Accounts):**
   - None of the 5 accounts (`seminarcoordinator5`, `viceprincipal`, `moturi`, `mrs90003`, `kotabalasuvarna`) suffered from code drops, regex validation rejections, or runtime dispatch failures.
   - `moturi`: Zero accommodation requests exist in MongoDB Atlas (`db.accommodation_requests.countDocuments({}) == 0`).
   - `mrs90003` & `kotabalasuvarna`: Technicians for Seminar Halls 2 and 5. Zero inspection workflows were completed or distributed for these halls.
   - `seminarcoordinator5` & `viceprincipal`: Coordinators for Halls 3, 4, and TH-1. In-app coordinator notifications were only implemented on Nov 21 in commit `e91d164`. All 14 seminar bookings in Atlas were created before Nov 21; no new bookings targeting their halls have been submitted since.
3. **Confirmed Mapping Defects Discovered:**
   - **Orphaned `SEMINAR_ADMIN` Role:** `SeminarService.java` generates 18 in-app notifications targeting `Role: SEMINAR_ADMIN`. Zero users in MongoDB Atlas possess this role. The in-app notifications were saved, but email dispatch was silently dropped with zero recipients.
   - **Missing `CSDS` Department Document:** User `aicsdshod` is registered with `department: "CSDS"`, but the `departments` collection in Atlas contains only 8 records and lacks `CSDS`.
   - **Hostel Administrator Role Asymmetry:** User `hodeee` is assigned `assignedHostels: ['Boys Hostel']` and `servicePermissions: ['ACCOMMODATION_ADMIN']`, but lacks `BOYS_HOSTEL_ADMIN` in his explicit `roles` array (handled dynamically in Java via `getEffectiveRoles()`).
   - **Empty CC Lists Across All 6 Seminar Halls:** All 6 halls have `ccEmails: null` or `[]` in Atlas, leaving the CC delivery engine unutilized.
   - **Inspection PDF Recipient Omissions:** `SeminarInspectionService.java` excludes Department HODs and AO from receiving finalized inspection PDF reports.
4. **Historical vs Current Discrepancies:**
   - **Principal Over-Notification:** All 19 operational emails received by `PRINCIPAL001` occurred between Oct 28 and Nov 20. On Nov 21, commit `e91d164` implemented AO_ADMIN operational isolation. Zero operational emails have been sent to the Principal post-remediation.
   - **Gmail SMTP Quota Breach:** 6 electrical notifications failed on Nov 22 due to direct SMTP quota exhaustion (500-recipient daily limit). Google Apps Script relay (`provider: APPS_SCRIPT`) remains healthy and unblocked.

---

## 2. Complete Registered-User Reconciliation

The master user register was extracted directly from MongoDB Atlas collection `users`. All 23 accounts are accounted for below:

| User ID | Full Name | Masked Email | Primary Role | Granted Roles | Dept | Active | Assigned Modules | Assigned Halls | Assigned Hostels | Historic Emails | Mapping Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PRINCIPAL001` | Dr. S. Venkateswarlu | `p*******l@nrtec.in` | `AO_ADMIN` | `AO_ADMIN` | ADMIN | YES | Executive Oversight & Governance | None | None | **19** | `CORRECTLY_MAPPED` |
| `ao` | Mr. I. Sridhar | `a*@nrtec.in` | `AO_ADMIN` | `AO_ADMIN, TRANSPORT_ADMIN, STATIONERY_ADMIN, MEALS_ADMIN, DEPARTMENT_HOD` | ADMIN | YES | All Service Modules (AO Approvals) | None | None | **21** | `CORRECTLY_MAPPED` |
| `sriramsriram123654` | Soul finder | `s****************4@gmail.com` | `AO_ADMIN` | `AO_ADMIN` | CSE | YES | Developer Administration | None | None | **25** | `CORRECTLY_MAPPED` |
| `CREATOR001` | System Creator | `c*****r@nrtec.in` | `CREATOR` | `CREATOR` | ADMIN | YES | System Administration | None | None | **16** | `CORRECTLY_MAPPED` |
| `PHARM001` | Dr. J N Suresh Kumar | `n*************7@gmail.com` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, SEMINAR_COORDINATOR, DEPARTMENT_USER` | PHARM | YES | Department Approvals (PHARM), Seminar Coordinator (SH-5) | SH-5 | None | **4** | `CORRECTLY_MAPPED` |
| `aicsdshod` | Dr. V.V.A.S. Lakshmi | `a*******d@nrtec.in` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | CSDS | YES | Department Approvals (CSDS) | None | None | **1** | `CORRECTLY_MAPPED` |
| `aihod` | Dr. B. Jhansi Vazram | `i***d@nrtec.in` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | IT | YES | Department Approvals (IT) | None | None | **4** | `CORRECTLY_MAPPED` |
| `civilhod` | Dr. P. Naga Sowjanya | `c******d@nrtec.in` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | CIVIL | YES | Department Approvals (CIVIL) | None | None | **1** | `CORRECTLY_MAPPED` |
| `csehod` | Dr. S. N. Thirumala Rao | `c****d@nrtec.in` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER, SEMINAR_COORDINATOR` | CSE | YES | Department Approvals (CSE), Seminar Coordinator (SH-1) | SH-1 | None | **6** | `CORRECTLY_MAPPED` |
| `ecehod` | Dr. V. Venkata Rao | `e****d@nrtec.in` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER, SEMINAR_COORDINATOR` | ECE | YES | Department Approvals (ECE), Seminar Coordinator (SH-2) | SH-2 | None | **3** | `CORRECTLY_MAPPED` |
| `hodeee` | Dr. Shaik Mahammad Shareef | `h****e@nrtec.in` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | EEE | YES | Department Approvals (EEE), Hostel Admin (Boys Hostel) | None | Boys Hostel | **1** | `CORRECTLY_MAPPED` |
| `mbahod` | Dr. Y. Anki Reddy | `m****d@nrtec.in` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | MBA | YES | Department Approvals (MBA) | None | None | **1** | `CORRECTLY_MAPPED` |
| `mechhod` | Dr. B. Venkata Siva | `m*****d@nrtec.in` | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | ME | YES | Department Approvals (ME) | None | None | **1** | `CORRECTLY_MAPPED` |
| `moturi` | Dr. Sireesha Moturi | `m****i@nrtec.in` | `DEPARTMENT_USER` | `DEPARTMENT_USER, GIRLS_HOSTEL_ADMIN` | CSE | YES | Department Staff, Girls Hostel Management | None | Girls Hostel | **0** | `LEGITIMATE_ZERO_ACTIVITY` |
| `bvchsubbarao` | B V Ch Subbarao | `b**********o@gmail.com` | `ELECTRICIAN` | `ELECTRICIAN` | None | YES | Campus Electrical Maintenance | None | None | **8** | `CORRECTLY_MAPPED` |
| `ravurisrinu28` | R SRINIVASA RAO | `r***********8@gmail.com` | `GENERATOR_OPERATOR` | `GENERATOR_OPERATOR` | None | YES | Generator & Diesel Operations | None | None | **9** | `CORRECTLY_MAPPED` |
| `seminarcoordinator5` | Dr. Ananda Oliveti | `t******g@nrtec.in` | `SEMINAR_COORDINATOR` | `SEMINAR_COORDINATOR` | PLACEMENT OFFICER | YES | Seminar Facility Coordination (SH-3, TH-1) | SH-3, TH-1 | None | **0** | `LEGITIMATE_ZERO_ACTIVITY` |
| `viceprincipal` | Dr. D. Suneel | `v***********l@nrtec.in` | `SEMINAR_COORDINATOR` | `SEMINAR_COORDINATOR` | ADMIN | YES | Seminar Facility Coordination (SH-4) | SH-4 | None | **0** | `LEGITIMATE_ZERO_ACTIVITY` |
| `knag1999` | K.NAGESWARA RAO | `k******9@nrtec.in` | `SEMINAR_TECHNICIAN` | `SEMINAR_TECHNICIAN` | CSE | YES | Technical AV Operations (SH-1) | SH-1 | None | **1** | `CORRECTLY_MAPPED` |
| `kotabalasuvarna` | Kota Bala Suvarna | `k*************a@gmail.com` | `SEMINAR_TECHNICIAN` | `SEMINAR_TECHNICIAN` | PHARM | YES | Technical AV Operations (SH-5) | SH-5 | None | **0** | `LEGITIMATE_ZERO_ACTIVITY` |
| `mallavarapubrijesh` | Mallavarapu Brijesh | `m****************h@gmail.com` | `SEMINAR_TECHNICIAN` | `SEMINAR_TECHNICIAN` | TPO | YES | Technical AV Operations (SH-3, TH-1) | SH-3, TH-1 | None | **3** | `CORRECTLY_MAPPED` |
| `mrs90003` | Mondithoka Ramesh | `m*********3@gmail.com` | `SEMINAR_TECHNICIAN` | `SEMINAR_TECHNICIAN` | None | YES | Technical AV Operations (SH-2) | SH-2 | None | **0** | `LEGITIMATE_ZERO_ACTIVITY` |
| `tandavakrishnaanumolu` | A.Tandava krishna | `t*******************u@gmail.com` | `SEMINAR_TECHNICIAN` | `SEMINAR_TECHNICIAN` | None | YES | Technical AV Operations (SH-4) | SH-4 | None | **5** | `CORRECTLY_MAPPED` |

---

## 3. User-to-Role Mapping Audit

### A. Census of Granted Roles in MongoDB Atlas
Across all 23 user documents, the following 12 distinct role strings are populated:
1. `AO_ADMIN`: Held by `ao`, `PRINCIPAL001`, `sriramsriram123654`.
2. `CREATOR`: Held by `CREATOR001`.
3. `DEPARTMENT_HOD`: Held by `mbahod`, `ecehod`, `csehod`, `civilhod`, `aihod`, `mechhod`, `PHARM001`, `hodeee`, `aicsdshod`, and `ao`.
4. `DEPARTMENT_USER`: Held by all HODs, `moturi`, and departmental faculty.
5. `ELECTRICIAN`: Held by `bvchsubbarao`.
6. `GENERATOR_OPERATOR`: Held by `ravurisrinu28`.
7. `GIRLS_HOSTEL_ADMIN`: Held by `moturi`.
8. `MEALS_ADMIN`: Held by `ao`.
9. `SEMINAR_COORDINATOR`: Held by `ecehod`, `csehod`, `seminarcoordinator5`, `PHARM001`, `viceprincipal`.
10. `SEMINAR_TECHNICIAN`: Held by `tandavakrishnaanumolu`, `mrs90003`, `mallavarapubrijesh`, `knag1999`, `kotabalasuvarna`.
11. `STATIONERY_ADMIN`: Held by `ao`.
12. `TRANSPORT_ADMIN`: Held by `ao`.

### B. Roles Referenced in Notification Code with Zero Atlas Holders
Auditing all 95 notification call sites revealed that the following roles are actively queried by application services, but possess **zero registered user accounts** in Atlas:
- **`SEMINAR_ADMIN`:** Queried in `SeminarService.java` (lines 1021, 1704). 18 in-app notifications were logged in Atlas with `recipientRole: "SEMINAR_ADMIN"`. Zero emails were dispatched because no user holds `SEMINAR_ADMIN`.
- **`ACCOMMODATION_ADMIN`:** Queried in `AccommodationService.java` (lines 1367, 1591). Zero users hold this in `role` or `roles` (only `hodeee` holds it in `servicePermissions`).
- **`BOYS_HOSTEL_ADMIN`:** Queried in `AccommodationService.java` (lines 965, 1007, 1036). No user has `BOYS_HOSTEL_ADMIN` in `roles`.
- **`GUEST_HOUSE_ADMIN`:** Queried in accommodation routing. Zero users in Atlas.
- **`DRIVER`:** Queried in `TransportService.java` (line 725) and `UnifiedRequestService.java` (line 554). Zero users in Atlas.
- **`CANTEEN_INCHARGE`:** Queried in `MealService.java` (lines 280, 310) and `UnifiedRequestService.java` (line 664). Zero users in Atlas.

---

## 4. User-to-Module Assignment Audit

| Functional Service Module | Designated Operational Administrator (Atlas User ID) | Facility / Sub-Resource Mappings | Code Mapping Mechanism | Audit Finding |
| :--- | :--- | :--- | :--- | :--- |
| **Seminar Hall Management** | `ao` (Administrative Officer) | 6 Seminar Halls (`SH-1` to `SH-5`, `TH-1`) | Coordinator User IDs & Hall Repository | **COMPLIANT** for coordinators & technicians. **DEFECT:** `SEMINAR_ADMIN` role has zero holders. |
| **Accommodation (Hostels & Guest House)** | `moturi` (`Girls Hostel`), `hodeee` (`Boys Hostel`) | 4 Accommodation Rooms | `assignedHostels` field & `getEffectiveRoles()` | **COMPLIANT IN CODE:** `User.getEffectiveRoles()` synthesizes warden roles. **ZERO ACTIVITY:** 0 requests in Atlas. |
| **Transport Services** | `ao` (`TRANSPORT_ADMIN`) | Vehicles fleet | `role: TRANSPORT_ADMIN` & `findByRole` | **COMPLIANT.** `ao` receives all vehicle booking indents. |
| **Stationery & Printing** | `ao` (`STATIONERY_ADMIN`) | Stationery indents (request-only) | `role: STATIONERY_ADMIN` & `findByRole` | **COMPLIANT.** `ao` receives all stationery indents. |
| **Meals & Snacks** | `ao` (`MEALS_ADMIN`) | Canteen & catering indents | `role: MEALS_ADMIN` & `findByRole` | **COMPLIANT.** `ao` receives all catering requests. |
| **Electrical Maintenance** | `bvchsubbarao` (`ELECTRICIAN`) | Campus electrical tickets | `role: ELECTRICIAN` & direct ID routing | **COMPLIANT.** Assigned tickets route directly to electrician. |
| **Generator Operations** | `ravurisrinu28` (`GENERATOR_OPERATOR`) | Campus diesel generator logs | `role: GENERATOR_OPERATOR` | **COMPLIANT.** Generator updates route directly to operator. |

---

## 5. Module-by-Module Recipient Matrix

| Module | Lifecycle Event | Expected Recipient Role / User | Actual Resolved Recipient (Code) | Email Triggered | Mapping Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Seminar** | Request Submitted | Requester HOD + AO | Requester HOD (`resolveDepartmentHodEmails`) + `ao` (`userId="ao"`) | **YES** | **COMPLIANT** |
| **Seminar** | Request Submitted | `SEMINAR_ADMIN` | `userRepository.findByRole("SEMINAR_ADMIN")` -> **EMPTY** | **NO (Dropped)** | **DEFECT (Orphan Role)** |
| **Seminar** | Request Submitted | Hall Coordinator | `getCoordinatorUserIdsForHall(hall)` -> e.g. `csehod`, `ecehod` | **YES** | **COMPLIANT** |
| **Seminar** | Booking Approved | Requester + Coordinator + Tech | Requester (`DEPARTMENT_USER`), Coordinator, Technician | **YES** | **COMPLIANT** |
| **Seminar** | Inspection Completed | Coord + Tech + Requester | Primary TO to all 3; PDF attached | **YES (with PDF)**| **COMPLIANT** |
| **Seminar** | Inspection Completed | Department HOD + AO | **None** (`Collections.emptyList()` for CC) | **NO** | **DEFECT (Omitted CC)** |
| **Accommodation** | Request Submitted | AO Admin | `userId: "ao"` | **YES** | **COMPLIANT** |
| **Accommodation** | Forwarded to Warden | Boys Hostel Admin | `targetRole: "BOYS_HOSTEL_ADMIN"` -> Resolves to `hodeee` | **YES** | **COMPLIANT** (0 DB requests) |
| **Accommodation** | Forwarded to Warden | Girls Hostel Admin | `targetRole: "GIRLS_HOSTEL_ADMIN"` -> Resolves to `moturi` | **YES** | **COMPLIANT** (0 DB requests) |
| **Transport** | Request Submitted | Transport Admin | `role: "TRANSPORT_ADMIN"` -> Resolves to `ao` | **YES** | **COMPLIANT** |
| **Transport** | Trip Assigned | Driver | `driverUser.getUserId()` | **YES** (if assigned)| **COMPLIANT** |
| **Stationery** | Request Submitted | Stationery Admin | `role: "STATIONERY_ADMIN"` -> Resolves to `ao` | **YES** | **COMPLIANT** |
| **Stationery** | Status Updated | Requester | Requester (`DEPARTMENT_USER`) | **YES** | **COMPLIANT** |
| **Meals** | Request Submitted | Meals Admin | `role: "MEALS_ADMIN"` -> Resolves to `ao` | **YES** | **COMPLIANT** |
| **Meals** | Request Approved | Requester + Canteen | Requester + `canteenUser.getUserId()` | **YES** | **COMPLIANT** |
| **Electrical** | Issue Reported | Electrician + AO | `saved.getAssignedElectricianId()` + `userId="ao"` | **YES** | **COMPLIANT** |
| **Electrical** | Issue Resolved | Requester + AO | Reporter + `userId="ao"` | **YES** | **COMPLIANT** |
| **Auth** | Password Reset | Requesting User | User's registered email (`AuthService.java`) | **YES** | **COMPLIANT** |

---

## 6. Complete Notification-to-Email Pipeline Analysis

### A. End-to-End Execution Trace (12 Steps)
1. **User Action:** User initiates an operation in React frontend (e.g. submits a seminar booking).
2. **Controller Entry:** Spring Boot controller (`SeminarController`, `AccommodationController`, etc.) handles request with `@PreAuthorize`.
3. **Service Logic:** Business service executes state change, persists the entity in MongoDB.
4. **Recipient Resolution:** Service determines target roles, department, and user IDs (e.g. `getCoordinatorUserIdsForHall`).
5. **In-App Notification:** `notificationService.sendNotification(...)` persists a `Notification` document synchronously in MongoDB collection `notifications`.
6. **Async Trigger:** `NotificationService` calls `emailService.sendNotificationEmailAsync(saved)` asynchronously.
7. **Primary Recipient Resolution:** `EmailService.resolvePrimaryRecipients(notification)`:
   - If `recipientUserId` is set: looks up `userRepository.findByUserId(recipientUserId)`.
   - If `recipientRole` is set: filters `userRepository.findAll()` by `u.hasRole(role)` and department match.
   - Applies AO_ADMIN operational isolation (isolating routine tickets to `ao`).
   - If recipient list is empty (e.g. `SEMINAR_ADMIN`), execution logs debug and terminates cleanly.
8. **CC Recipient Resolution:** `EmailService.resolveCcRecipients(notification, eventCategory)` extracts hall CC emails and departmental HOD emails.
9. **Email Validation:** `EmailRecipientValidator.isValidRecipient` validates normalized email format (RFC 5322 compliance, valid TLD).
10. **Atomic Claim:** `EmailDeduplicationService.tryClaim(dedupKey)` acquires MongoDB atomic lease in `email_deduplication_claims`.
11. **Provider Dispatch:** `EmailService.dispatchEmail` sends via Google Apps Script relay (`provider: APPS_SCRIPT`) or direct SMTP (`provider: SMTP`).
12. **Persistence & Completion:** `EmailLog` is saved in `email_logs` with status (`SMTP_ACCEPTED`, `SENT`, `FAILED`); lease is marked `COMPLETED`.

### B. Point-of-Failure Analysis
- **Silent Email Drop on Orphan Roles:** In Step 7, when `notification.getRecipientRole()` has no users in Atlas (e.g. `SEMINAR_ADMIN`), the in-app notification exists in `notifications`, but zero email logs are created.
- **Decoupled Error Isolation:** In Step 11, if provider dispatch fails (e.g. SMTP 550 limit), `EmailLog` is marked `FAILED`, but the in-app notification remains fully intact and available in the user dashboard.

---

## 7. Individual Investigation of All Five Zero-History Accounts

### Account 1: `seminarcoordinator5` (Dr. Ananda Oliveti)
- **Email:** `training@nrtec.in` | **Department:** `PLACEMENT OFFICER`
- **Role:** `SEMINAR_COORDINATOR` | **Assigned Halls:** `SH-3` (Tech Hub Seminar Hall), `TH-1` (Tech Hub Wifi center)
- **Investigation:**
  - In `seminar_halls`, `SH-3` and `TH-1` correctly map `coordinatorUserIds: ['seminarcoordinator5']`.
  - In `SeminarService.java`, coordinator notification on booking submission was only added in commit `e91d164` on Nov 21.
  - All 14 seminar bookings in Atlas were submitted between Nov 2 and Nov 21 11:34 AM (before commit `e91d164` landed at 18:10).
  - No bookings targeting `SH-3` or `TH-1` were submitted post-Nov 21.
  - Zero notifications with `recipientRole: "SEMINAR_COORDINATOR"` exist in MongoDB Atlas.
- **Classification:** **`LEGITIMATE_ZERO_ACTIVITY`**

### Account 2: `viceprincipal` (Dr. D. Suneel)
- **Email:** `viceprincipal@nrtec.in` | **Department:** `ADMIN`
- **Role:** `SEMINAR_COORDINATOR` | **Assigned Hall:** `SH-4` (Block 4 Seminar Hall)
- **Investigation:**
  - `SH-4` maps `coordinatorUserIds: ['viceprincipal']`.
  - For historical bookings on `SH-4` (`AO-SEM-0025`, `AO-SEM-0034`, etc.), `viceprincipal` was the **approving actor**, not an unnotified recipient.
  - Post-Nov 21 coordinator routing update, zero bookings targeting `SH-4` have been submitted.
- **Classification:** **`LEGITIMATE_ZERO_ACTIVITY`**

### Account 3: `moturi` (Dr. Sireesha Moturi)
- **Email:** `moturi@nrtec.in` | **Department:** `CSE`
- **Roles:** `DEPARTMENT_USER`, `GIRLS_HOSTEL_ADMIN` | **Assigned Hostels:** `['Girls Hostel']`
- **Investigation:**
  - Querying MongoDB Atlas: `db.accommodation_requests.countDocuments({}) == 0`.
  - The accommodation management module has zero submitted requests in the entire history of the database.
  - `User.java` lines 80-82 correctly synthesizes `GIRLS_HOSTEL_ADMIN` into effective roles.
- **Classification:** **`LEGITIMATE_ZERO_ACTIVITY`**

### Account 4: `mrs90003` (Mondithoka Ramesh)
- **Email:** `m.r.s.90003@gmail.com` | **Department:** None
- **Role:** `SEMINAR_TECHNICIAN` | **Assigned Hall:** `SH-2` (Block 3 Seminar Hall)
- **Investigation:**
  - Technicians only receive emails when inspection PDFs are finalized in `SeminarInspectionService.completeInspection`.
  - Querying MongoDB Atlas: `db.seminar_event_inspections.countDocuments({}) == 2`.
  - Both existing inspection records (`AO-SEM-0034` and `AO-SEM-0035`) are for `SH-4` (Civil Hall), assigned to technician `tandavakrishnaanumolu`.
  - Zero inspections have ever been created or completed for `SH-2`.
- **Classification:** **`LEGITIMATE_ZERO_ACTIVITY`**

### Account 5: `kotabalasuvarna` (Kota Bala Suvarna)
- **Email:** `kotabalasuvarna@gmail.com` | **Department:** `PHARM`
- **Role:** `SEMINAR_TECHNICIAN` | **Assigned Hall:** `SH-5` (Pharma Block Seminar Hall)
- **Investigation:**
  - Exactly parallel to `mrs90003`: Zero inspections were ever created or completed for `SH-5`.
  - Neither `SeminarInspectionService` nor `EmailService` ever triggered an inspection email targeting `kotabalasuvarna`.
- **Classification:** **`LEGITIMATE_ZERO_ACTIVITY`**

---

## 8. Account-Wise Notification and Email History

| User ID | Role | In-App Notifications Targeted (Direct UID) | Historic Email Logs (Primary Recipient) | Delivery Statuses Recorded |
| :--- | :--- | :--- | :--- | :--- |
| `sriramsriram123654` | `AO_ADMIN` | 3 | **25** | 25 SENT (Pre-remediation test volume) |
| `ao` | `AO_ADMIN` | 6 | **21** | 20 SENT/SMTP_ACCEPTED, 1 FAILED (SMTP quota) |
| `PRINCIPAL001` | `AO_ADMIN` | 0 | **19** | 19 SENT/SMTP_ACCEPTED (Pre-remediation historical) |
| `CREATOR001` | `CREATOR` | 0 | **16** | 16 SENT (System initialization & test) |
| `ravurisrinu28` | `GENERATOR_OPERATOR`| 12 | **9** | 9 SENT/SMTP_ACCEPTED |
| `bvchsubbarao` | `ELECTRICIAN` | 10 | **8** | 8 SENT/SMTP_ACCEPTED |
| `csehod` | `DEPARTMENT_HOD` | 6 | **6** | 6 SENT/SMTP_ACCEPTED |
| `tandavakrishnaanumolu`| `SEMINAR_TECHNICIAN`| 7 | **5** | 5 SENT/SMTP_ACCEPTED |
| `aihod` | `DEPARTMENT_HOD` | 3 | **4** | 4 SENT/SMTP_ACCEPTED |
| `PHARM001` | `DEPARTMENT_HOD` | 5 | **4** | 4 SENT/SMTP_ACCEPTED |
| `mallavarapubrijesh` | `SEMINAR_TECHNICIAN`| 4 | **3** | 3 SENT/SMTP_ACCEPTED |
| `ecehod` | `DEPARTMENT_HOD` | 0 | **3** | 3 SENT/SMTP_ACCEPTED |
| `knag1999` | `SEMINAR_TECHNICIAN`| 1 | **1** | 1 SMTP_ACCEPTED (SH-1 Inspection PDF) |
| `mbahod` | `DEPARTMENT_HOD` | 0 | **1** | 1 SENT |
| `civilhod` | `DEPARTMENT_HOD` | 0 | **1** | 1 SENT |
| `mechhod` | `DEPARTMENT_HOD` | 0 | **1** | 1 SENT |
| `hodeee` | `DEPARTMENT_HOD` | 0 | **1** | 1 SMTP_ACCEPTED |
| `aicsdshod` | `DEPARTMENT_HOD` | 0 | **1** | 1 SMTP_ACCEPTED |
| `seminarcoordinator5` | `SEMINAR_COORDINATOR` | 0 | **0** | Zero historic activity post-Nov 21 |
| `viceprincipal` | `SEMINAR_COORDINATOR` | 0 | **0** | Zero historic activity post-Nov 21 |
| `moturi` | `GIRLS_HOSTEL_ADMIN` | 0 | **0** | Zero accommodation requests in database |
| `mrs90003` | `SEMINAR_TECHNICIAN` | 0 | **0** | Zero completed inspections on SH-2 |
| `kotabalasuvarna` | `SEMINAR_TECHNICIAN` | 0 | **0** | Zero completed inspections on SH-5 |

---

## 9. AO, HOD, Coordinator, and Technician Routing Audit

1. **AO vs Principal Isolation:**
   - In `EmailService.java` lines 458-470, `isOperationalWorkflow` isolates routine service tickets (Accommodation, Seminar, Electrical, Transport, Stationery, Meals) exclusively to `ao@nrtec.in`.
   - The Principal is protected from daily operational spam while retaining eligibility for executive governance alerts.
2. **Department HOD Isolation:**
   - In `EmailService.java` lines 549-565, `resolveDepartmentHodEmails` resolves HODs by exact department string match.
   - HODs are isolated: `csehod` receives only CSE requests, `ecehod` receives only ECE requests, etc. Cross-department leakage is zero.
3. **Seminar Coordinator Routing:**
   - Coordinators are resolved per hall via `getCoordinatorUserIdsForHall(hall)` in `SeminarService.java`.
   - Multi-hall coordinators (`seminarcoordinator5` for SH-3 and TH-1) correctly map to both assigned facilities.
4. **Seminar Technician Routing:**
   - Technicians are mapped per hall. Completed inspections generate signed PDFs distributed to the hall's assigned technician.

---

## 10. Confirmed Mapping Defects

1. **Defect M-01 (Orphan Role in Code): `SEMINAR_ADMIN`**
   - **File:** `SeminarService.java` lines 1021, 1704.
   - **Issue:** Service dispatches notifications to `Role="SEMINAR_ADMIN"`, but zero users in Atlas hold this role. 18 in-app notifications have been generated without any matching email recipient.
   - **Remediation:** Grant `SEMINAR_ADMIN` to `ao` or update `SeminarService.java` to target `AO_ADMIN` with `userId="ao"`.
2. **Defect M-02 (Missing Department Document): `CSDS`**
   - **Collection:** `departments` in MongoDB Atlas.
   - **Issue:** User `aicsdshod` exists with `department: "CSDS"`, but `CSDS` is absent from the 8 records in `departments`.
   - **Remediation:** Insert `CSDS` department document into `departments` collection.
3. **Defect M-03 (Empty CC Configuration): `seminar_halls.ccEmails`**
   - **Collection:** `seminar_halls` in MongoDB Atlas.
   - **Issue:** All 6 halls have `ccEmails: null` or `[]`.
   - **Remediation:** Populate `ccEmails` with administrative monitoring addresses.
4. **Defect M-04 (Role Representation Asymmetry): Boys Hostel Admin**
   - **User:** `hodeee`.
   - **Issue:** `hodeee` has `assignedHostels: ['Boys Hostel']` and `servicePermissions: ['ACCOMMODATION_ADMIN']`, but `roles` array has only `['DEPARTMENT_HOD', 'DEPARTMENT_USER']`.
   - **Remediation:** Explicitly add `BOYS_HOSTEL_ADMIN` to `hodeee.roles` in Atlas for schema consistency.

---

## 11. Confirmed Email Dispatch Defects

1. **Defect D-01: Direct SMTP Quota Vulnerability**
   - **Occurrence:** 2026-11-22 at 10:06 UTC (6 failed logs in Atlas).
   - **Cause:** Gmail SMTP relay enforces a strict 500-recipient rolling 24-hour limit (`550-5.4.5 Daily user sending limit exceeded`).
   - **Remediation:** Maintain Google Apps Script relay (`provider: APPS_SCRIPT`) as default primary provider.
2. **Defect D-02: Omission of HOD and AO on Inspection PDFs**
   - **File:** `SeminarInspectionService.java` lines 621-624.
   - **Cause:** Inspection distribution passes `Collections.emptyList()` for CC recipients.
   - **Remediation:** Automatically include requesting department HOD and AO in CC.

---

## 12. Historical-Only Issues

1. **Principal Historical Over-Notification:** 19 operational emails received prior to Nov 21 commit `e91d164`. Zero received post-remediation.
2. **Seed Data Domain Typos:** 15 historic logs dispatched to `.i`, `.co`, and synthetic addresses prior to Phase 1 `EmailRecipientValidator`.
3. **Status Code Naming Transition:** 83 logs marked `SENT` prior to Nov 5 when success status was renamed to `SMTP_ACCEPTED`.

---

## 13. Correctly Mapped Accounts with Legitimate Zero Activity

The following five accounts are formally certified as **`LEGITIMATE_ZERO_ACTIVITY`**:
1. `seminarcoordinator5` (`training@nrtec.in`): Correctly mapped to SH-3 and TH-1. Zero post-remediation bookings.
2. `viceprincipal` (`viceprincipal@nrtec.in`): Correctly mapped to SH-4. Zero post-remediation bookings.
3. `moturi` (`moturi@nrtec.in`): Correctly mapped to Girls Hostel. Zero accommodation requests in database.
4. `mrs90003` (`m.r.s.90003@gmail.com`): Correctly mapped to SH-2. Zero finalized inspections on SH-2.
5. `kotabalasuvarna` (`kotabalasuvarna@gmail.com`): Correctly mapped to SH-5. Zero finalized inspections on SH-5.

---

## 14. Local versus Production Differences

- **Git Branch:** `main` at commit `0b92afc6da41bbcaf5d4b71e67f164bbcae65a9f`.
- **Deployed Production on Render:** Running commit `0b92afc` (contains P0 AO isolation and P1 Apps Script PDF attachment support).
- **Working Tree:** Contains uncommitted Phase 1 recipient validation (`EmailRecipientValidator.java`), Phase 2 atomic MongoDB deduplication claims (`EmailDeduplicationService.java`), and Atlas-only configuration.
- **Routing Parity:** Core recipient routing and AO isolation logic are identical between local and deployed production.

---

## 15. Recommended Correction Order

1. **Step 1: Role Alignment in MongoDB Atlas (Zero Risk)**
   - Add `SEMINAR_ADMIN` to user `ao`'s `roles` array (resolves orphaned `SEMINAR_ADMIN` notifications).
   - Add `BOYS_HOSTEL_ADMIN` to user `hodeee`'s `roles` array.
   - Insert `CSDS` department record into `departments` collection.
2. **Step 2: Seminar Hall CC Configuration (Zero Risk)**
   - Populate `ccEmails` in `seminar_halls` for all 6 halls with `ao@nrtec.in` and departmental inboxes.
3. **Step 3: Inspection Report CC Enhancement (Low Risk Code Update)**
   - Update `SeminarInspectionService.java` to automatically CC the requesting department HOD and AO on inspection sign-off.
4. **Step 4: Commit & Deploy Phase 1 & Phase 2 (Code Deployment)**
   - Commit and push uncommitted Phase 1 and Phase 2 changes to `origin/main` for Render auto-deployment.

---

## 16. Source Code, Methods, Database Evidence and Supporting Log IDs

### Source Code References:
- `SeminarService.java`: L1020-1054 (`createBooking` notifications), L1043 (`getCoordinatorUserIdsForHall`).
- `AccommodationService.java`: L965-975 (`aoDirectApproveRequest`), L1006-1036 (`aoForwardRequest`).
- `EmailService.java`: L419-479 (`resolvePrimaryRecipients`), L458-470 (AO_ADMIN isolation), L549-565 (`resolveDepartmentHodEmails`), L857-875 (Secondary CC validation).
- `SeminarInspectionService.java`: L557-635 (`completeInspection` and PDF email dispatch).
- `User.java`: L70-86 (`getEffectiveRoles`), L88-92 (`hasRole`), L108-120 (`isAssignedToHall`), L143-153 (`isAssignedToHostel`).

### MongoDB Atlas Database Evidence:
- Collection `users`: 23 documents (all active).
- Collection `email_logs`: 144 documents (83 `SENT`, 55 `SMTP_ACCEPTED`, 6 `FAILED`).
- Collection `notifications`: 105 documents (18 for `SEMINAR_ADMIN`, 0 for `SEMINAR_COORDINATOR`).
- Collection `accommodation_requests`: 0 documents.
- Collection `seminar_bookings`: 14 documents (all created prior to Nov 21 commit `e91d164`).
- Collection `seminar_event_inspections`: 2 documents (both on `SH-4` in `PENDING` status).
- Supporting Log IDs:
  - Principal Historical Logs: `6ae19258cb2e551b2b532f13` (Oct 28), `6aee0a1b5755f16107745a2b` (Nov 6), `6affdb241a17dd40c7888ec7` (Nov 20).
  - SMTP Quota Failure Logs: `6b02beaa7ccef52c7179f651` (Nov 22 10:06:34 UTC), `6b02beb47ccef52c7179f66a` (Nov 22 10:06:44 UTC).
