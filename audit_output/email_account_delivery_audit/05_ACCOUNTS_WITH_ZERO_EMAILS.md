# Deep-Dive Forensic Audit: Accounts with ZERO Historic Emails

**Total Registered Accounts:** 23  
**Accounts with Zero Delivery:** 5 (21.7%)  
**Audit Objective:** Determine the exact technical and operational reasons why these 5 accounts have never received an email notification from the system.

---

## 1. Summary of Accounts with Zero Historic Emails

| User ID | Full Name | Masked Email | Primary Role | Assigned Facility / Scope | Root Cause Category | Action Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `seminarcoordinator5` | Dr. K. Placement | `t******g@nrtec.in` | `SEMINAR_COORDINATOR` | Seminar Hall 3 (`SH-3`), Training Hall 1 (`TH-1`) | Inactive Facility (Zero Booking Requests) | None (Operational Dormancy) |
| `viceprincipal` | Dr. Vice Principal | `v***********l@nrtec.in` | `SEMINAR_COORDINATOR` | Seminar Hall 4 (`SH-4`) | Inactive Facility (Zero Booking Requests) | None (Operational Dormancy) |
| `moturi` | S. Moturi | `m****i@nrtec.in` | `DEPARTMENT_USER` + `GIRLS_HOSTEL_ADMIN` | Girls Hostel (`assignedHostels: ["GIRLS_HOSTEL"]`) | Inactive Module (Zero Hostel Approvals) | Verification of Hostel Workflow |
| `mrs90003` | M. R. S. Technician | `m*********3@gmail.com` | `SEMINAR_TECHNICIAN` | Seminar Hall 2 (`SH-2`) | Zero Completed Inspection Workflows | Facility Inspection Test Required |
| `kotabalasuvarna` | K. Bala Suvarna | `k*************a@gmail.com` | `SEMINAR_TECHNICIAN` | Seminar Hall 5 (`SH-5`) | Zero Completed Inspection Workflows | Facility Inspection Test Required |

---

## 2. Detailed Technical Investigation per Account

### A. Account 1: `seminarcoordinator5` (Placement Officer)
- **Profile:** User ID `seminarcoordinator5`, Name: "Dr. K. Placement", Email: `t******g@nrtec.in`.
- **Role & Assignments:** Primary role `SEMINAR_COORDINATOR`. Assigned halls in MongoDB `seminar_halls` collection:
  - `SH-3`: Mechanical Seminar Hall
  - `TH-1`: Training Hall 1 (Placement Cell)
- **Forensic Findings:**
  1. Inspection of `seminar_hall_requests` in Atlas revealed that during the audit window, zero booking requests were created targeting `SH-3` or `TH-1`.
  2. Because `SeminarHallService` routes `REQUEST_SUBMITTED` to the HOD, and subsequent approval notifications to the coordinator of the **specific hall requested**, the coordinator for `SH-3` and `TH-1` was never targeted by the routing logic.
  3. No code defects or filtering bugs exist for this account. The lack of emails is strictly an artifact of facility request distribution in test data.

### B. Account 2: `viceprincipal` (Vice Principal)
- **Profile:** User ID `viceprincipal`, Name: "Dr. Vice Principal", Email: `v***********l@nrtec.in`.
- **Role & Assignments:** Primary role `SEMINAR_COORDINATOR`. Assigned hall:
  - `SH-4`: Civil Seminar Hall
- **Forensic Findings:**
  1. Similar to `seminarcoordinator5`, no booking requests in the database targeted `SH-4`.
  2. `viceprincipal` does not hold the `AO_ADMIN` role and was therefore not routed general administrative approvals or executive notifications.
  3. Delivery count of 0 is mathematically expected given the absence of activity on `SH-4`.

### C. Account 3: `moturi` (Girls Hostel Administrator)
- **Profile:** User ID `moturi`, Name: "S. Moturi", Email: `m****i@nrtec.in`.
- **Role & Assignments:** Primary role `DEPARTMENT_USER`, additional granted role `GIRLS_HOSTEL_ADMIN`, `assignedHostels: ["GIRLS_HOSTEL"]`.
- **Forensic Findings:**
  1. `moturi` is designated to approve female student/guest accommodation indents.
  2. During the operational period recorded in `email_logs`, all test accommodation indents submitted were either general Guest House bookings (routed to AO) or remained in draft status.
  3. No Girls Hostel accommodation request progressed to the stage where `AccommodationService` triggers a notification to hostel wardens.
  4. Routing logic in `EmailService.java` correctly checks for `GIRLS_HOSTEL_ADMIN` when hostel type is `GIRLS`, but no qualifying event occurred.

### D. Account 4: `mrs90003` (Technician for Seminar Hall 2)
- **Profile:** User ID `mrs90003`, Email: `m*********3@gmail.com`.
- **Role & Assignments:** Primary role `SEMINAR_TECHNICIAN`. Assigned hall: `SH-2` (ECE Seminar Hall).
- **Forensic Findings:**
  1. Technicians do NOT receive initial booking submission or HOD approval emails.
  2. In `EmailService.java` and `SeminarInspectionService.java`, technicians are ONLY emailed when:
     - Coordinator approves a booking and triggers technician setup instructions.
     - A pre-event or post-event inspection report is finalized and the signed PDF is generated.
  3. For `SH-2`, while bookings occurred (Coordinator `ecehod` received 3 emails), no inspection was formally submitted and signed off through `SeminarInspectionService.completeInspection`.
  4. Consequently, no inspection PDF email was generated for `mrs90003`.

### E. Account 5: `kotabalasuvarna` (Technician for Seminar Hall 5)
- **Profile:** User ID `kotabalasuvarna`, Email: `k*************a@gmail.com`.
- **Role & Assignments:** Primary role `SEMINAR_TECHNICIAN`. Assigned hall: `SH-5` (Pharmacy Seminar Hall).
- **Forensic Findings:**
  1. Exactly parallel to `mrs90003`: Hall 5 had 4 booking notifications sent to its HOD/Coordinator (`PHARM001`), but no pre-event or post-event checklist was executed by the technician.
  2. Without an executed inspection event, `SeminarInspectionService` never called `emailService.sendEmailWithAttachment`.

---

## 3. Comparative Verification: Why Did Other Technicians Receive Emails?

| Technician Account | Assigned Hall | Total Emails | Why Did They Receive Emails? |
| :--- | :--- | :--- | :--- |
| `knag1999` | `SH-1` (CSE) | 1 | Pre-event inspection completed on `SH-1` with PDF attachment dispatched. |
| `tandavakrishnaanumolu` | `SH-4` (Civil) | 5 | Manual testing of technician notification endpoints and status change dispatches. |
| `mallavarapubrijesh` | `SH-3` / `TH-1` | 3 | TPO operational alerts and maintenance ticket dispatches. |
| `mrs90003` | `SH-2` (ECE) | 0 | No completed inspection on `SH-2`. |
| `kotabalasuvarna` | `SH-5` (Pharm) | 0 | No completed inspection on `SH-5`. |

---

## 4. Conclusion & Recommendations

1. **No Silent Code Drops:** None of the 5 accounts were suppressed due to application bugs, bad regex, or dropped exceptions.
2. **Operational Gaps:** The zero delivery is 100% attributable to the fact that the specific operational lifecycle events tied to these accounts (requests for SH-3/SH-4, Girls Hostel requests, and SH-2/SH-5 inspections) were never executed during the audit period.
3. **Pre-Production Readiness Test:** Before final institutional go-live, a simulated end-to-end booking and inspection flow should be executed for `SH-2`, `SH-3`, `SH-4`, and `SH-5`, alongside a test Girls Hostel request, to guarantee delivery across all 23 registered mailboxes.
