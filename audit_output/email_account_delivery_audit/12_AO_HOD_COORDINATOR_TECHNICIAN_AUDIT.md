# Dedicated Forensic Audit: AO, HOD, Coordinator, and Technician Stakeholders

**Focus Group:** The 4 primary administrative and technical tiers responsible for institutional workflow approvals and facility management.

---

## 1. Administrative Officers & Executive Tier

| User ID | Full Name | Masked Email | Assigned Role | Historic Emails | Status / Operational Profile |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ao` | Administrative Officer | `ao@nrtec.in` | `AO_ADMIN` | **21 logs** | Official Administrative Officer. Approves Stage 2 indents, manages logistics and campus services. |
| `PRINCIPAL001` | Dr. Principal | `p*******l@nrtec.in` | `AO_ADMIN` | **19 logs** | College Principal. Holds administrative approval privileges; currently receives duplicate operational alerts. |
| `sriramsriram123654` | Sriram Developer | `s***************4@gmail.com` | `AO_ADMIN` | **25 logs** | Developer test account. Suppressed in current code (`EmailService.java` line 460) from receiving routine notifications. |

---

## 2. Department Heads (HODs) - All 8 Registered Departments

| User ID | Department | Full Name | Masked Email | Assigned Halls | Historic Emails | Delivery Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `csehod` | CSE | Dr. CSE HOD | `c*****d@nrtec.in` | `SH-1` (Coord) | **6 logs** | Verified: Receives CSE booking requests and SH-1 coordinator notifications. |
| `ecehod` | ECE | Dr. ECE HOD | `e*****d@nrtec.in` | `SH-2` (Coord) | **3 logs** | Verified: Receives ECE booking requests and SH-2 coordinator notifications. |
| `PHARM001` | PHARM | Dr. Pharmacy HOD | `p******1@nrtec.in` | `SH-5` (Coord) | **4 logs** | Verified: Receives Pharmacy indents and SH-5 coordinator notifications. |
| `aihod` | IT / AI | Dr. AI HOD | `a****d@nrtec.in` | None | **4 logs** | Verified: Receives AI/IT department booking and service requests. |
| `mbahod` | MBA | Dr. Y. Anki Reddy | `m*****d@nrtec.in` | None | **1 log** | Verified: Receives MBA department service requests. |
| `civilhod` | CIVIL | Dr. Civil HOD | `c******d@nrtec.in` | None | **1 log** | Verified: Receives Civil department service requests. |
| `mechhod` | MECH | Dr. Mech HOD | `m*****d@nrtec.in` | None | **1 log** | Verified: Receives Mechanical department service requests. |
| `hodeee` | EEE | Dr. EEE HOD | `h****e@nrtec.in` | None | **1 log** | Verified: Receives Electrical & Electronics department service requests. |
| `aicsdshod` | CSDS | Dr. CSDS HOD | `a*******d@nrtec.in` | None | **1 log** | Verified: Receives Computer Science Data Science service requests. |

---

## 3. Seminar Hall Coordinators

| User ID | Primary Role | Full Name | Masked Email | Assigned Facility | Historic Emails | Status & Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `csehod` | `DEPARTMENT_HOD` | Dr. CSE HOD | `c*****d@nrtec.in` | `SH-1` | **6 logs** | Active. Dual role (HOD + Coordinator). Approves CSE hall bookings. |
| `ecehod` | `DEPARTMENT_HOD` | Dr. ECE HOD | `e*****d@nrtec.in` | `SH-2` | **3 logs** | Active. Dual role (HOD + Coordinator). Approves ECE hall bookings. |
| `PHARM001` | `DEPARTMENT_HOD` | Dr. Pharmacy HOD | `p******1@nrtec.in` | `SH-5` | **4 logs** | Active. Dual role (HOD + Coordinator). Approves Pharmacy hall bookings. |
| `seminarcoordinator5` | `SEMINAR_COORDINATOR` | Dr. K. Placement | `t******g@nrtec.in` | `SH-3`, `TH-1` | **0 logs** | Zero logs because no requests targeted SH-3 or TH-1 during test window. |
| `viceprincipal` | `SEMINAR_COORDINATOR` | Dr. Vice Principal | `v***********l@nrtec.in` | `SH-4` | **0 logs** | Zero logs because no requests targeted SH-4 during test window. |

---

## 4. Seminar Technicians

| User ID | Full Name | Masked Email | Assigned Facility | Historic Emails | Status & Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `knag1999` | K. Naga Raju | `k******9@gmail.com` | `SH-1` (CSE) | **1 log** | Received completed inspection report with PDF attachment for SH-1. |
| `tandavakrishnaanumolu` | T. Krishna | `t*******************u@gmail.com` | `SH-4` (Civil) | **5 logs** | Received maintenance updates and technician dispatch alerts. |
| `mallavarapubrijesh` | M. Brijesh | `m*****************h@gmail.com` | `SH-3`, `TH-1` | **3 logs** | Received TPO facility setup and operational alerts. |
| `mrs90003` | M. R. S. Tech | `m*********3@gmail.com` | `SH-2` (ECE) | **0 logs** | Zero logs because no inspection workflow was finalized on SH-2. |
| `kotabalasuvarna` | K. Bala Suvarna | `k*************a@gmail.com` | `SH-5` (Pharm) | **0 logs** | Zero logs because no inspection workflow was finalized on SH-5. |
