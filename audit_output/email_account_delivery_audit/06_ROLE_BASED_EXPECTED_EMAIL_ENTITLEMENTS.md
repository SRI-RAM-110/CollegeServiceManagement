# Institutional Role-Based Email Entitlements vs System Implementation

**Audit Authority:** Forensic Audit Team  
**Focus:** Defining what each institutional role is legitimately entitled to receive vs what the current codebase dispatches vs what MongoDB Atlas logs reflect.

---

## 1. Master Role Entitlement Matrix

| Role | Policy Entitlement (What They SHOULD Receive) | Current Implementation in `EmailService.java` | Actual Delivery Evidence in Atlas Logs | Audit Compliance Status |
| :--- | :--- | :--- | :--- | :--- |
| **`AO_ADMIN` (Administrative Officer: `ao`)** | All Stage 2 approvals, high-level operational escalations, executive summaries, hostel/transport/food indents, major maintenance alerts. | Receives all requests after HOD approval; receives maintenance tickets; excluded from developer filtering. | **21 logs recorded** (Seminar, Electrical, Stationery, Generator). Fully active. | **COMPLIANT** |
| **`AO_ADMIN` (Principal: `PRINCIPAL001`)** | Executive notifications, high-value approvals (> ₹50,000 / major events), VIP guest house indents, emergency campus alerts. | **Treated identically to AO.** System sends every routine technician dispatch, electrical alert, and seminar approval to the Principal. | **19 logs recorded** (Identical operational alerts to `ao`). | **OVER-NOTIFICATION RISK** (High priority gap) |
| **`AO_ADMIN` (Developer: `sriramsriram123654`)** | Dev / Staging alerts only. Zero production operational emails. | Filtered in `EmailService.java` (lines 458-470) to prevent operational noise, but historically received alerts. | **25 logs recorded** (Pre-filter period during initial setup). | **CONTROLLED** (Filter active in code) |
| **`DEPARTMENT_HOD` (8 Accounts)** | Stage 1 approvals for staff in their department; rejection alerts; completion notices for their department's requests. | Resolved dynamically by `department` field matching. Receives `REQUEST_SUBMITTED` when department matches. | **1 to 6 logs each** across all 8 HODs (`csehod`, `ecehod`, `aihod`, `mechhod`, `mbahod`, etc.). | **COMPLIANT** |
| **`DEPARTMENT_USER` (Staff Requesters)** | Status change updates on their own submitted requests (Approved, Rejected, Completed); pre/post inspection reports. | Resolved by `createdBy` / `requesterEmail`. Receives status transitions. | Multiple requester logs recorded (e.g. `sriramsriram123654`, HODs submitting requests). | **COMPLIANT** |
| **`SEMINAR_COORDINATOR` (5 Accounts)** | Booking requests for their assigned halls; HOD-approved indents; scheduling conflicts; inspection PDF reports. | Resolved via `seminar_halls.coordinatorId`. Receives `HOD_APPROVED` and inspection PDF reports. | Received for active halls (`csehod`: 6, `ecehod`: 3). Zero for inactive halls (`SH-3`, `SH-4`). | **COMPLIANT** (Pending facility bookings) |
| **`SEMINAR_TECHNICIAN` (5 Accounts)** | Setup instructions when booking confirmed; inspection checklist assignments; copy of completed signed inspection PDF. | Resolved via `seminar_halls.technicianId`. Receives inspection completion notices with PDF attachment. | Received for active halls (`knag1999`: 1, `tandavakrishnaanumolu`: 5). Zero for inactive halls. | **COMPLIANT** |
| **`ELECTRICIAN` (`bvchsubbarao`)** | New electrical maintenance tickets, urgent repair escalations, ticket reassignment notifications. | Direct recipient for electrical maintenance module events. | **8 logs recorded** (`GENERAL_NOTIFICATION`, ticket assignments). | **COMPLIANT** |
| **`GENERATOR_OPERATOR` (`ravurisrinu28`)** | Generator run logs, fuel replenishment requests, maintenance reminders. | Direct recipient for generator module events. | **9 logs recorded** (Diesel logs, generator maintenance alerts). | **COMPLIANT** |
| **`GIRLS_HOSTEL_ADMIN` (`moturi`)** | Female student and guest room booking requests, emergency leave alerts. | Filtered in `AccommodationService` for `hostelType == GIRLS`. | **0 logs recorded** (No qualifying requests reached approval). | **DORMANT** (Awaiting operational traffic) |
| **`BOYS_HOSTEL_ADMIN`** | Male student and guest room booking requests. | Filtered in `AccommodationService` for `hostelType == BOYS`. | No user currently assigned exclusively to `BOYS_HOSTEL_ADMIN`. Routed to AO. | **GAP** (Delegated to AO) |
| **`CANTEEN_ADMIN`** | Food & refreshment indents, VIP dining requirements, event catering orders. | Direct recipient for food service events. | Routed to AO / General staff. | **GAP** (Dedicated role unassigned in Atlas) |

---

## 2. In-Depth Variance Analysis

### A. The Principal Over-Notification Anomaly
- In a standard university administration model, the College Principal should not be inundated with daily electrical repair tickets, low-level seminar AV setup reminders, or stationery indents.
- In `EmailService.java`, the method `resolvePrimaryRecipients` queries `userRepository.findByRole(Role.AO_ADMIN)`.
- Because both `ao` and `PRINCIPAL001` possess `role: AO_ADMIN`, both accounts receive every single email routed to AO_ADMIN.
- **Recommendation:** Implement role segregation or preference toggles: `Role.AO_ADMIN` for operational administration and `Role.PRINCIPAL` for executive escalation, or add an `@EventListener` that restricts routine tickets to `ao@nrtec.in`.

### B. Department Head Boundary Integrity
- All 8 registered HODs have successfully received department-level emails in Atlas.
- When an assistant professor in Mechanical Engineering submits a seminar hall request, the notification is routed to `mechhod@nrtec.in` based on matching `department: MECH`.
- Cross-department leakage was tested and verified: HODs do not receive requests from other departments.
