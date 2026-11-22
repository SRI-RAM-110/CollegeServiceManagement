# 06. Module-Wise Recipient Routing Specification

**Audit Date:** November 22, 2026  
**Execution Mode:** STRICTLY READ-ONLY  
**Scope:** Complete Lifecycle Routing across all 12 Application Modules  

---

## 1. Seminar Hall Booking Subsystem

### 1.1 Booking Lifecycle & Call Chain:
1. **Booking Submission (`SeminarService.bookSeminarHall`):**
   - In-app notification sent to `AO_ADMIN` (Dept: `ADMIN`, User: `ao`).
   - In-app notification sent to Seminar Coordinators assigned to the hall.
   - If requester is a department faculty member, notification sent to `DEPARTMENT_HOD` for departmental endorsement.
   - Email dispatch: Primary TO = Requester. CC = Hall CCs (`hall.getCcEmails()`).
2. **Booking Approval (`SeminarService.approveBooking`):**
   - Triggered by `AO_ADMIN`.
   - In-app notification sent to Requester (`SUCCESS`).
   - Email dispatch: Primary TO = Requester. CC = Department HOD (`resolveDepartmentHodEmails`), Hall CCs.
3. **Booking Rejection (`SeminarService.rejectBooking`):**
   - Triggered by `AO_ADMIN`.
   - In-app notification sent to Requester (`DANGER`).
   - Email dispatch: Primary TO = Requester. CC = Department HOD.
4. **Booking Rescheduling (`SeminarService.rescheduleBooking`):**
   - In-app notification sent to Requester, `AO_ADMIN`, and Hall Coordinator.
   - Email dispatch: Primary TO = Requester. CC = Department HOD, Hall CCs.
5. **Cancellation Requested (`SeminarService.requestCancellation`):**
   - Requester asks to cancel.
   - In-app notification sent to `AO_ADMIN` and Hall Coordinator.
   - Email dispatch: Primary TO = `AO_ADMIN` (`ao`). CC = Hall CCs.
6. **Cancellation Approved (`SeminarService.cancelBooking`):**
   - In-app notification sent to Requester (`DANGER`).
   - Email dispatch: Primary TO = Requester. CC = Department HOD, Hall CCs.
7. **Coordinator & Technician Assignment (`assignCoordinator`, `assignTechnician`):**
   - Direct assignment in-app notifications sent to specific assigned user IDs.
   - Technician emails are strictly excluded from CC lists (`EmailService.java:486`).

---

## 2. Pre-Event & Post-Event Inspection PDF Subsystem

### 2.1 Inspection Lifecycle & Routing:
1. **Inspection Submission (`SeminarInspectionService.submitInspection`):**
   - Completed by assigned technician or coordinator.
   - In-app notifications generated for:
     1. Assigned Coordinator (`SEMINAR_COORDINATOR`, user: `coordinatorUserId`).
     2. Assigned Technician (`SEMINAR_TECHNICIAN`, user: `technicianUserId`).
     3. Requester (`DEPARTMENT_USER`, dept: `department`, user: `requesterUserId`).
2. **Generic Email Suppression:**
   - `EmailService.java:337-340`: Generic HTML email is explicitly suppressed for notifications titled `"Seminar Event Inspection Report: ..."`.
3. **PDF Attachment Distribution:**
   - Generated dynamically using OpenPDF (`generateInspectionPdf`).
   - Filename: `NEC_Inspection_Report_{bookingId}_{occurrenceDate}.pdf` (MIME: `application/pdf`).
   - Dispatched directly via `emailService.sendEmailWithAttachment()`.
   - Recipient List (`targetEmails`): Assigned Coordinator, Assigned Technician, Requester.
   - Strictly NO CC recipients.

---

## 3. Accommodation Management Subsystem

### 3.1 Routing Specification:
1. **Standard Request Submission (`AccommodationService.submitRequest`):**
   - In-app: `AO_ADMIN` (`ADMIN`, user: `ao`), `ACCOMMODATION_ADMIN`.
   - Email: `AO_ADMIN` (`ao`), Hostel Admin.
2. **Dual Request Submission (`submitDualRequest`):**
   - In-app: `AO_ADMIN`, Boys Hostel Warden (`ACC_BOYS`), Girls Hostel Warden (`ACC_GIRLS`).
   - Email: `AO_ADMIN` (`ao`), respective Wardens.
3. **Request Forwarding (`forwardRequest`):**
   - In-app: Target Warden (`ACCOMMODATION_ADMIN`).
4. **Approval & Rejection:**
   - In-app: Requester (`userId`).
   - Email: Requester (TO), Department HOD (CC).
5. **Room Allocation & Checkout:**
   - In-app: Requester (`userId`).
   - Email: Requester (TO), No CC.

---

## 4. Transport Management Subsystem

### 4.1 Routing Specification:
1. **Submission (`TransportService.bookTransport`):**
   - In-app: `TRANSPORT_ADMIN`, `AO_ADMIN`.
   - Email: Transport Admin (`TRN001`), `AO001`.
2. **Approval & Rejection:**
   - In-app: Requester.
   - Email: Requester (TO), Department HOD (CC).
3. **Vehicle & Driver Assignment:**
   - In-app: Requester (`ASSIGNMENT`).
   - Email: Requester (TO), No CC.

---

## 5. Stationery Management Subsystem

### 5.1 Routing Specification:
1. **Submission (`StationeryService.requestStationery`):**
   - In-app: `STATIONERY_ADMIN`, `AO_ADMIN`.
   - Email: Stationery Admin (`STA001`), `AO001`.
   - **Crucial Rule:** `EmailService.java:492` strictly excludes Stationery from receiving CC emails.
2. **Approval & Rejection:**
   - In-app: Requester.
   - Email: Requester (TO), Department HOD (CC).
3. **Items Issued / Completed:**
   - In-app: Requester.
   - Email: Requester (TO), No CC.

---

## 6. Snacks & Meals Subsystem

### 6.1 Routing Specification:
1. **Submission (`MealService.requestMeals`):**
   - In-app: `MEALS_ADMIN`, `AO_ADMIN`.
   - Email: Meals Admin (`MEA001`), `AO001`.
2. **Approval & Rejection:**
   - In-app: Requester.
   - Email: Requester (TO), Department HOD (CC).
3. **Preparation & Completion:**
   - In-app: Requester.
   - Email: Requester (TO), No CC.

---

## 7. Electrical & Generator Services Subsystems

### 7.1 Routing Specification:
1. **Issue Reported (`ElectricalIssueService.reportIssue`):**
   - In-app: `ELECTRICIAN`, `AO_ADMIN`.
   - Email: Electrician (`electrician_user`), `AO001`.
   - **Strict Exclusion:** Electrical Service is strictly excluded from CC lists (`EmailService.java:491`).
2. **Assignment & Resolution:**
   - In-app: Electrician, Requester.
   - Email: Requester (TO), No CC.
3. **Generator Service (`SeminarService.requestGenerator`):**
   - In-app: `GENERATOR_OPERATOR`.
   - Email: Operator (`gen_operator`). Strictly NO CC (`EmailService.java:490`).

---

## 8. Department Service Requests (Unified Workflow)

### 8.1 Routing Specification:
1. **Multi-Service Request Submitted (`UnifiedRequestService.submitRequest`):**
   - In-app: Department HOD (`DEPARTMENT_HOD`), `AO_ADMIN`.
2. **HOD Endorsement (`endorseByHod`):**
   - In-app: `AO_ADMIN`, Requester.
3. **AO Approval / Rejection (`approveByAo`, `rejectByAo`):**
   - In-app: Relevant Facility Administrators (Canteen, Transport, Hostel, Stationery), Requester.
   - Email: Requester (TO), Department HOD (CC).

---

## 9. Announcements Subsystem

### 9.1 Routing Specification:
- **Trigger:** `POST /api/announcements/broadcast` (`AnnouncementController.broadcast`).
- **Targeting:** Role-based, Department-based, or `ALL`.
- **In-App:** In-app notification created for all active users matching target criteria.
- **Email:** Dispatched to matching target users (`resolvePrimaryRecipients`).

---

## 10. Authentication & Security Subsystem

### 10.1 Routing Specification:
- **Trigger:** `POST /api/auth/forgot-password` (`AuthService.forgotPassword`).
- **Targeting:** User identified by normalized email address.
- **In-App:** None (Security flow).
- **Email:** Synchronous fast-path email with 15-minute reset token. Strictly NO CC, NO BCC.
