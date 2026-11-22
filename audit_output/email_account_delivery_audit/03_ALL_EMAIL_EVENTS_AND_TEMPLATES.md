# Inventory of All Email Events, Triggers and Templates

**Application:** NEC College Department Services Management System  
**Backend:** Spring Boot (Java)  
**Primary Notification Engine:** `NotificationService.java` & `EmailService.java`  
**Attachment Dispatch Engine:** `SeminarInspectionService.java` & `EmailService.sendEmailWithAttachment`  
**Authentication Engine:** `AuthService.java`

---

## 1. Complete Event Master Catalogue

The system defines 12 distinct email-generating event categories across its operational modules:

| Event Identifier | Functional Description | Source Method / Trigger Point | Primary Recipient Type | Has PDF Attachment | In-App Notification | Push (FCM) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`REQUEST_SUBMITTED`** | New service request created by department staff | `NotificationService.createNotification` via service controllers | HOD of requesting department (or AO if executive) | No | Yes | Yes |
| **`HOD_APPROVED`** | Request approved by Department HOD | Module service approval endpoint (e.g. `SeminarHallService.approveByHod`) | Administrative Officer (`ao@nrtec.in`) / Facility Coordinator | No | Yes | Yes |
| **`HOD_REJECTED`** | Request rejected by Department HOD | Module service reject endpoint | Requesting Staff Member | No | Yes | Yes |
| **`AO_APPROVED`** | Request approved by Administrative Officer | Module service approval endpoint (e.g. `SeminarHallService.approveByAo`) | Requesting Staff Member & Facility Coordinator | No | Yes | Yes |
| **`AO_REJECTED`** | Request rejected by Administrative Officer | Module service reject endpoint | Requesting Staff Member & Department HOD | No | Yes | Yes |
| **`COORDINATOR_APPROVED`** | Facility booking approved by Seminar Coordinator | `SeminarHallService.approveByCoordinator` | Requester, AO, Assigned Technician | No | Yes | Yes |
| **`COORDINATOR_REJECTED`** | Facility booking rejected by Seminar Coordinator | `SeminarHallService.rejectByCoordinator` | Requester & AO | No | Yes | Yes |
| **`REQUEST_CANCELLED`** | Request cancelled by requester or administrative override | Module cancellation endpoint | Approving authorities and assigned staff | No | Yes | Yes |
| **`INSPECTION_COMPLETED`** | Pre-event or post-event inspection report completed | `SeminarInspectionService.completeInspection` | Coordinator, Technician, Requester | **Yes (Signed PDF)** | Yes | Yes |
| **`GENERAL_NOTIFICATION`** | Operational update, ticket assignment, technician alert | Task assignment or status change in maintenance modules | Assigned technician or operator | No | Yes | Yes |
| **`PASSWORD_RESET`** | Password reset link / temporary token requested | `AuthService.forgotPassword` | Requesting User Account | No | No (Security) | No |
| **`SYSTEM_ALERT`** | Administrative alert or maintenance warning | System administrative tools | System Administrators / AO | No | Yes | Yes |

---

## 2. Module-by-Module Email Flow & Trigger Mapping

### A. Seminar Hall Booking & Inspection (`SeminarHallService`, `SeminarInspectionService`)
1. **Creation:** Requester submits booking -> Event `REQUEST_SUBMITTED` -> Sent to Requester's Department HOD.
2. **HOD Approval:** HOD approves -> Event `HOD_APPROVED` -> Sent to AO and Hall Coordinator.
3. **Coordinator Approval:** Coordinator approves -> Event `COORDINATOR_APPROVED` -> Sent to Requester, AO, and Hall Technician.
4. **Pre-Event Inspection:** Technician completes checklist -> `SeminarInspectionService.completeInspection` -> PDF generated (`SeminarInspectionPdfService`) -> Sent via `EmailService.sendEmailWithAttachment` to Coordinator, Technician, and Requester.
5. **Post-Event Inspection:** Technician completes checklist -> PDF generated -> Sent to Coordinator, Technician, and Requester.

### B. Accommodation Services (`AccommodationService`)
1. **Guest House Request:** Submitted -> `REQUEST_SUBMITTED` -> HOD -> AO -> Guest House In-Charge.
2. **Hostel Request (Girls/Boys):** Submitted -> `REQUEST_SUBMITTED` -> HOD -> AO -> Hostel Admin (`moturi` for Girls Hostel).

### C. Transport Services (`TransportService`)
1. **Vehicle Booking Request:** Submitted -> `REQUEST_SUBMITTED` -> HOD -> AO -> Transport Manager / Driver.

### D. Food & Refreshment Services (`FoodService`)
1. **Canteen / Guest Dining Request:** Submitted -> `REQUEST_SUBMITTED` -> HOD -> AO -> Canteen Supervisor.

### E. Stationery & Printing Services (`StationeryService`)
1. **Item Indent:** Submitted -> `REQUEST_SUBMITTED` -> HOD -> AO -> Stores In-Charge.

### F. Electrical & Maintenance Services (`ElectricalService`)
1. **Maintenance Ticket:** Submitted -> `REQUEST_SUBMITTED` -> AO / Electrician (`bvchsubbarao`).
2. **Ticket Status Update:** In Progress / Completed -> `GENERAL_NOTIFICATION` -> Requester.

### G. Generator & Fuel Services (`GeneratorService`)
1. **Diesel Log / Maintenance:** Submitted -> `REQUEST_SUBMITTED` -> AO / Generator Operator (`ravurisrinu28`).

### H. Account & Security (`AuthService`)
1. **Forgot Password:** User requests reset -> `AuthService.forgotPassword` -> `EmailService.sendPasswordResetEmail` -> Targeted exclusively to the user's registered email address with a 15-minute token link.

---

## 3. Email Subject Patterns & Structural Design

All transactional emails follow a standardized institutional subject template:
- Standard Format: `[NEC Services] {Service Name} - {Event Description} ({ReferenceId})`
- Example: `[NEC Services] New Seminar Hall Request (AO-SEM-0023)`
- Example: `[NEC Services] Seminar Hall Booking Approved (AO-SEM-0023)`
- Example: `[NEC Services] Inspection Report: Pre-Event Inspection for Seminar Hall 1 (AO-SEM-0023)`
- Password Reset Format: `[NEC Services] Password Reset Request`
