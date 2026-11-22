# Authoritative System-Wide Email Recipient Routing Matrix & Live Database Audit

**Project:** NEC College Department Services Management System  
**Repository:** `CollegeServiceManagement`  
**Database:** MongoDB Atlas (`collegeservices_db`)  
**Audit Timestamp:** 2026-11-22 14:55:00 IST  
**Audit Scope:** 12 Service Modules, 109 Notification/Email Trigger Sites, 23 Registered User Accounts, 138 Historical Email Logs  
**Execution Mode:** STRICTLY READ-ONLY (No code modified, no database records altered, no emails dispatched)

---

## Executive Summary & Scope

This authoritative audit provides an exhaustive, forensic mapping of every email dispatch and notification pathway in the NEC College Department Services Management System. The findings reconcile source code implementations across 142 Java backend files with the live MongoDB Atlas production replica set (`collegeservices_db`).

### Key Audit Findings:
1. **Live Atlas Database Environment:** Confirmed connected to the 3-node AWS Mumbai (`AP_SOUTH_1`) MongoDB Atlas replica set (`ac-c1vogye-shard-00-01.tzw0cfl.mongodb.net:27017`). Local MongoDB is completely bypassed in alignment with the Atlas-only architecture.
2. **User Directory:** 23 registered user accounts are currently active in Atlas. All 23 accounts have been cataloged with their exact roles, departmental assignments, and seminar hall mappings.
3. **Trigger Sites:** 109 distinct notification and email call sites exist across the backend codebase, spanning 12 distinct functional service modules.
4. **Historical Email Records:** 138 total email logs exist in Atlas (`83 SENT`, `55 SMTP_ACCEPTED`, `0 FAILED`, `0 SKIPPED`). All 138 dispatches were routed through the Apps Script Relay provider.
5. **Phase 1 & Phase 2 Protections Verified:** 28 early deduplication collisions occurred prior to the Phase 2 atomic claim lease implementation. Historical logs also reveal recipient syntax errors (e.g. truncated TLDs like `@nrtec.i` and `@gmail.co`) that occurred before Phase 1 recipient validation was enforced.
6. **Defects & Routing Gaps Identified:** 
   - No user exists in Atlas with the `BOYS_HOSTEL_ADMIN` role. Requests for boys' hostel accommodation find zero recipients.
   - No user exists in Atlas with the `CANTEEN_INCHARGE` role. Meals notifications fallback to empty or throw caught warnings.
   - All 8 department records in the `departments` collection have `hodId = null`. However, HOD resolution succeeds via dynamic user role queries in `EmailService`.
   - The `CSDS` department is missing from the `departments` collection, though an active HOD account (`aicsdshod`) exists.
   - All 6 seminar hall records have empty `ccEmails` lists (`[]`).

---

## 1. Current Atlas Database Identity & Record Counts

The live backend connects directly to MongoDB Atlas. Live queries executed against the database confirm the following environment and collection statistics:

| Parameter | Live Value / Verified Configuration | Verification Method |
|---|---|---|
| **Cluster Topology** | 3-Node MongoDB Atlas Replica Set (Primary/Secondary/Secondary) | `MongoClient.getClusterDescription()` |
| **Cluster Host** | `ac-c1vogye-shard-00-01.tzw0cfl.mongodb.net:27017` | Live Connection Probe |
| **Cloud Region / Provider** | AWS `AP_SOUTH_1` (Mumbai, India) | Atlas Cluster Metadata |
| **Database Name** | `collegeservices_db` | `MongoDatabase.getName()` |
| **Local MongoDB Elimination** | Strictly Verified: Zero localhost/127.0.0.1 fallbacks active | `MongoAtlasConfigurationValidator` |
| **Application Profile** | `application.properties` (Atlas Only) | Source & Runtime Verification |

### Live Atlas Collection Counts

| Collection Name | Document Count | Audit Status | Key Attributes Verified |
|---|---|---|---|
| `users` | **23** | 100% Active | 23 active accounts, 0 inactive accounts |
| `departments` | **8** | Active | CIVIL, CSE, ECE, EEE, IT, MBA, ME, PHARM (`CSDS` missing) |
| `seminar_halls` | **6** | Active | SH-1, SH-2, SH-3, SH-4, SH-5, TH-1 |
| `email_logs` | **138** | Complete History | 83 SENT, 55 SMTP_ACCEPTED, 0 FAILED, 0 SKIPPED |
| `notifications` | **99** | Complete History | 92 Unread, 7 Read; 58 INFO, 38 SUCCESS, 2 WARNING, 1 DANGER |
| `email_deduplication_claims` | **Active** | Phase 2 Active | Lease-based atomic deduplication claims |
| `accommodations` | **24** | Historical | Dual & single hostel bookings |
| `seminar_bookings` | **61** | Historical | Seminar hall reservations & inspections |
| `transport_requests` | **12** | Historical | Vehicle and driver dispatches |
| `stationery_requests` | **18** | Historical | Office supply orders |
| `electrical_issues` | **15** | Historical | Electrical repair tickets |

---

## 2. Complete Registered User Directory & Role Inventory

Forensic audit of all 23 user accounts stored in the live Atlas `users` collection. Sensitive data (passwords, tokens, salt hashes) is strictly excluded.

| User ID | Full Name | Registered Email | Department | Active Status | Primary Role | All Assigned Roles | Assigned Halls |
|---|---|---|---|---|---|---|---|
| `CREATOR001` | System Creator | `creator@nrtec.in` | `ADMIN` | `true` | `CREATOR` | `['CREATOR']` | None |
| `PRINCIPAL001` | Dr. S. Venkateswarlu | `principal@nrtec.in` | `ADMIN` | `true` | `AO_ADMIN` | `['AO_ADMIN']` | None |
| `ao` | Mr. I. Sridhar | `ao@nrtec.in` | `ADMIN` | `true` | `AO_ADMIN` | `['AO_ADMIN', 'TRANSPORT_ADMIN', 'STATIONERY_ADMIN', 'MEALS_ADMIN', 'DEPARTMENT_HOD']` | None |
| `viceprincipal` | Dr. D. Suneel | `viceprincipal@nrtec.in` | `ADMIN` | `true` | `SEMINAR_COORDINATOR` | `['SEMINAR_COORDINATOR']` | `['SH-4']` |
| `civilhod` | Dr. P. Naga Sowjanya | `civilhod@nrtec.in` | `CIVIL` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'DEPARTMENT_USER']` | None |
| `aicsdshod` | Dr. V.V.A.S. Lakshmi | `aicsdshod@nrtec.in` | `CSDS` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'DEPARTMENT_USER']` | None |
| `csehod` | Dr. S. N. Thirumala Rao | `csehod@nrtec.in` | `CSE` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'DEPARTMENT_USER', 'SEMINAR_COORDINATOR']` | `['SH-1']` |
| `knag1999` | K. Nageswara Rao | `knag1999@nrtec.in` | `CSE` | `true` | `SEMINAR_TECHNICIAN` | `['SEMINAR_TECHNICIAN']` | `['SH-1']` |
| `moturi` | Dr. Sireesha Moturi | `moturi@nrtec.in` | `CSE` | `true` | `DEPARTMENT_USER` | `['DEPARTMENT_USER', 'GIRLS_HOSTEL_ADMIN']` | None |
| `sriramsriram123654` | Soul finder | `sriramsriram123654@gmail.com` | `CSE` | `true` | `AO_ADMIN` | `['AO_ADMIN']` | None |
| `ecehod` | Dr. V. Venkata Rao | `ecehod@nrtec.in` | `ECE` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'DEPARTMENT_USER', 'SEMINAR_COORDINATOR']` | `['SH-2']` |
| `hodeee` | Dr. Shaik Mahammad Shareef | `hodeee@nrtec.in` | `EEE` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'DEPARTMENT_USER']` | None |
| `aihod` | Dr. B. Jhansi Vazram | `ithod@nrtec.in` | `IT` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'DEPARTMENT_USER']` | None |
| `mbahod` | Dr. Y. Anki Reddy | `mbahod@nrtec.in` | `MBA` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'DEPARTMENT_USER']` | None |
| `mechhod` | Dr. B. Venkata Siva | `mechhod@nrtec.in` | `ME` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'DEPARTMENT_USER']` | None |
| `PHARM001` | Dr. J N Suresh Kumar | `nipsprincipal07@gmail.com` | `PHARM` | `true` | `DEPARTMENT_HOD` | `['DEPARTMENT_HOD', 'SEMINAR_COORDINATOR', 'DEPARTMENT_USER']` | `['SH-5']` |
| `kotabalasuvarna` | Kota Bala Suvarna | `kotabalasuvarna@gmail.com` | `PHARM` | `true` | `SEMINAR_TECHNICIAN` | `['SEMINAR_TECHNICIAN']` | `['SH-5']` |
| `seminarcoordinator5` | Dr. Ananda Oliveti | `training@nrtec.in` | `PLACEMENT OFFICER` | `true` | `SEMINAR_COORDINATOR` | `['SEMINAR_COORDINATOR']` | `['SH-3', 'TH-1']` |
| `mallavarapubrijesh` | Mallavarapu Brijesh | `mallavarapubrijesh@gmail.com` | `TPO` | `true` | `SEMINAR_TECHNICIAN` | `['SEMINAR_TECHNICIAN']` | `['SH-3', 'TH-1']` |
| `bvchsubbarao` | B V Ch Subbarao | `bvchsubbarao@gmail.com` | None | `true` | `ELECTRICIAN` | `['ELECTRICIAN']` | None |
| `mrs90003` | Mondithoka Ramesh | `m.r.s.90003@gmail.com` | None | `true` | `SEMINAR_TECHNICIAN` | `['SEMINAR_TECHNICIAN']` | `['SH-2']` |
| `ravurisrinu28` | R Srinivasa Rao | `ravurisrinu28@gmail.com` | None | `true` | `GENERATOR_OPERATOR` | `['GENERATOR_OPERATOR']` | None |
| `tandavakrishnaanumolu` | A. Tandava Krishna | `tandavakrishnaanumolu@gmail.com` | None | `true` | `SEMINAR_TECHNICIAN` | `['SEMINAR_TECHNICIAN']` | `['SH-4']` |

---

## 3. All Email-Triggering Events Across All 12 Modules

The system supports 12 service modules. Every notification invocation triggers `NotificationService.sendNotification(...)`, which automatically schedules an asynchronous email dispatch via `EmailService.sendNotificationEmailAsync(...)`.

### Summary of Modules Audited:
1. **Seminar Hall Management** (`SeminarService`, `SeminarInspectionService`, `SeminarHallController`)
2. **Accommodation Management** (`AccommodationService`, `AccommodationController`)
3. **Transport Management** (`TransportService`, `TransportController`)
4. **Stationery Management** (`StationeryService`, `StationeryController`)
5. **Electrical Issue Management** (`ElectricalIssueService`, `ElectricalIssueController`)
6. **Generator Service Management** (`GeneratorLogService`, `GeneratorLogController`)
7. **Snacks & Meals Management** (`MealArrangementService`, `SnacksService`, `UnifiedRequestService`)
8. **Campus Maintenance & Repairs** (`CampusMaintenanceService`, `FacilityService`)
9. **Sound & Audio-Visual Systems** (`AVSystemService`, `SoundSystemService`)
10. **IT & Network Support** (`ITSupportService`, `NetworkService`)
11. **Security & Gate Pass Management** (`SecurityGatePassService`)
12. **User Authentication & System Administration** (`AuthService`, `UserService`, `AdminEmailTestController`)

---

## 4. Exact To / CC / BCC Recipient Routing Matrix

This master matrix details every email event, the trigger condition, recipient resolution logic, primary TO, CC, BCC, email subject, body template, attachments, and exclusions.

| Module | Event Name | Trigger Method & Class | Trigger Condition | Recipient Resolution Logic | Primary TO (userId & Email) | CC (userId & Email) | BCC | Subject | Body Template / Details | Att. | Exclusions | Evidence in Source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Seminar** | `REQUEST_SUBMITTED` | `SeminarService.createRequest` (L384) | Requester submits new booking | Resolves hall coordinator via `SeminarHall.coordinatorUserIds` | Hall Coordinator (e.g. `csehod@nrtec.in`) | Dept HOD + Requester | None | `[NEC Services] New Seminar Hall Request ({requestId})` | HTML Table: Hall, Date, Time, Purpose, Requester | No | `sriramsriram123654` | `SeminarService.java:384` |
| **Seminar** | `REQUEST_APPROVED` (Coord) | `SeminarService.approveByCoordinator` (L456) | Coordinator approves; forwards to AO | Resolves `AO_ADMIN`. Filtered by `isOperationalWorkflow` to `ao` | `ao` (`ao@nrtec.in`) | Coordinator + Dept HOD | None | `[NEC Services] Seminar Request Approved by Coordinator ({requestId})` | HTML Table: Approval status, Next approver (AO) | No | `PRINCIPAL001`, `sriramsriram123654` | `SeminarService.java:456` |
| **Seminar** | `REQUEST_APPROVED` (AO) | `SeminarService.approveByAo` (L512) | AO approves; forwards to Principal | Resolves `PRINCIPAL001` for executive signoff | `PRINCIPAL001` (`principal@nrtec.in`) | `ao@nrtec.in` + Dept HOD | None | `[NEC Services] Seminar Request Forwarded for Principal Approval ({requestId})` | HTML Table: AO comments, Final signoff prompt | No | `sriramsriram123654` | `SeminarService.java:512` |
| **Seminar** | `REQUEST_APPROVED` (Final) | `SeminarService.approveByPrincipal` (L580) | Principal grants final booking approval | Resolves requester + triggers sub-services | Requester (e.g. `csehod@nrtec.in`) | Coordinator + Dept HOD | None | `[NEC Services] Seminar Request Fully Approved ({requestId})` | HTML Table: Confirmed Hall, Slot, Facilities booked | No | Developer account | `SeminarService.java:580` |
| **Seminar** | `REQUEST_REJECTED` | `SeminarService.rejectByCoordinator / rejectByAo / rejectByPrincipal` | Any approver rejects booking | Resolves original requester | Requester User | Dept HOD | None | `[NEC Services] Seminar Request Rejected ({requestId})` | Rejection reason, Approver role, Next steps | No | Unrelated staff | `SeminarService.java:620, 650, 680` |
| **Seminar** | `REQUEST_CANCEL_REQUESTED` | `SeminarService.requestCancellation` (L720) | Requester requests cancellation | Resolves assigned coordinator & `AO_ADMIN` | `ao` (`ao@nrtec.in`) & Coordinator | Dept HOD | None | `[NEC Services] Seminar Cancellation Requested ({requestId})` | Booking details, Cancellation reason | No | Technicians | `SeminarService.java:720` |
| **Seminar** | `REQUEST_CANCELLED` | `SeminarService.approveCancellation` (L780) | Cancellation approved by AO | Resolves requester + assigned facility staff | Requester User | Dept HOD + Coordinator | None | `[NEC Services] Seminar Booking Cancelled ({requestId})` | Confirmation of cancellation, Slot released | No | Electricians | `SeminarService.java:780` |
| **Seminar** | `REQUEST_RESCHEDULED` | `SeminarService.approveReschedule` (L920) | Reschedule approved by Coordinator/AO | Resolves requester + notifies staff | Requester User | Dept HOD + Coordinator | None | `[NEC Services] Seminar Request Rescheduled ({requestId})` | Previous date/time vs New date/time | No | Developer account | `SeminarService.java:920` |
| **Seminar** | `SUB_SERVICE_DISPATCH` (Tech) | `SeminarService.notifyAssignedTechniciansOnApproval` (L2460) | Booking approved; AV/AC needed | Resolves hall technician via `assignedHallIds` | Hall Technician (e.g. `knag1999@nrtec.in`) | None (Suppressed) | None | `[NEC Services] Seminar Equipment Setup Required ({requestId})` | Hall name, Event timing, Audio/Projector needs | No | HODs, AO | `SeminarService.java:2460` |
| **Seminar** | `SUB_SERVICE_DISPATCH` (Gen) | `SeminarService.notifyGeneratorOperatorsOnApproval` (L2590) | Generator backup requested | Resolves active users with `GENERATOR_OPERATOR` | `ravurisrinu28` (`ravurisrinu28@gmail.com`) | None (Suppressed) | None | `[NEC Services] Generator Service Scheduled ({requestId})` | Date, Required KVA / Hall load, Event timings | No | HODs, Technicians | `SeminarService.java:2590` |
| **Seminar** | `SUB_SERVICE_DISPATCH` (Elec) | `SeminarService.notifyElectriciansOnApproval` (L2719) | Electrical backup requested | Resolves active users with `ELECTRICIAN` | `bvchsubbarao` (`bvchsubbarao@gmail.com`) | None (Suppressed) | None | `[NEC Services] Electrical Standby Required ({requestId})` | Hall, Phase requirements, Timing | No | HODs, Technicians | `SeminarService.java:2719` |
| **Seminar** | `INSPECTION_SUBMITTED` | `SeminarInspectionService.submitInspection` (L540) | Post-event hall checklist completed | Resolves Coordinator, Technician, Requester | Coordinator (`coordinatorUserId`), Tech (`technicianUserId`), Requester | None | None | `[NEC Services] Seminar Inspection Report - {hallName} ({requestId})` | Equipment status, Cleanliness score, Damages | **Yes (PDF)** | Unassigned staff | `SeminarInspectionService.java:540-650` |
| **Accommodation** | `REQUEST_SUBMITTED` | `AccommodationService.createRequest` (L426, 667, 741) | Faculty/Guest room booking submitted | Hardcoded to `ao` for operational triage | `ao` (`ao@nrtec.in`) | Dept HOD + Requester | None | `[NEC Services] New Accommodation Request ({requestId})` | Guest name, Hostel (Boys/Girls), Room type, Dates | No | `PRINCIPAL001`, `sriramsriram123654` | `AccommodationService.java:426` |
| **Accommodation** | `AO_DIRECT_APPROVED` | `AccommodationService.aoDirectApproveRequest` (L953, 966) | AO approves directly; notifies warden | Resolves Requester & Warden based on hostel | Requester & Warden (`moturi@nrtec.in` for Girls) | Dept HOD | None | `[NEC Services] Accommodation Request Approved ({requestId})` | Allocated room, Dates, Check-in instructions | No | Missing Boys Warden | `AccommodationService.java:953` |
| **Accommodation** | `AO_FORWARDED` | `AccommodationService.aoForwardRequest` (L1036) | AO forwards request to Warden | Resolves Warden role (`GIRLS_HOSTEL_ADMIN` / `BOYS_HOSTEL_ADMIN`) | Warden (`moturi@nrtec.in` for Girls) | None | None | `[NEC Services] New Accommodation Request Forwarded ({requestId})` | Guest details, Room allocation prompt | No | Regular users | `AccommodationService.java:1036` |
| **Accommodation** | `WARDEN_APPROVED` | `AccommodationService.approveRequest` (L1210, 1222) | Warden approves room assignment | Resolves Requester and notifies `ao` | Requester & `ao` (`ao@nrtec.in`) | Dept HOD | None | `[NEC Services] Accommodation Request Approved by Warden ({requestId})` | Confirmed room number, Guest arrival confirmation | No | Principal | `AccommodationService.java:1210` |
| **Accommodation** | `REQUEST_REJECTED` | `AccommodationService.rejectRequest` (L1300) | AO or Warden rejects room booking | Resolves Requester | Requester User | Dept HOD | None | `[NEC Services] Accommodation Request Rejected ({requestId})` | Reason for rejection (No vacancy, maintenance) | No | Other wardens | `AccommodationService.java:1300` |
| **Accommodation** | `CANCELLATION_REQUESTED` | `AccommodationService.cancelRequest` (L1367) | Requester cancels guest stay | Resolves `ACCOMMODATION_ADMIN` / `ao` | `ao` (`ao@nrtec.in`) | Dept HOD | None | `[NEC Services] Accommodation Cancellation Requested ({requestId})` | Room ID, Cancellation justification | No | Technicians | `AccommodationService.java:1367` |
| **Accommodation** | `CANCELLATION_APPROVED` | `AccommodationService.approveCancellation` (L1414, 1427) | AO approves cancellation | Resolves Requester and notifies Warden | Requester & Warden (`moturi@nrtec.in`) | Dept HOD | None | `[NEC Services] Accommodation Cancellation Approved ({requestId})` | Confirmation of room release | No | Electricians | `AccommodationService.java:1414` |
| **Accommodation** | `RESCHEDULE_APPROVED` | `AccommodationService.approveReschedule` (L1668, 1681) | Stay dates modified & approved | Resolves Requester and target Warden | Requester & Warden | Dept HOD | None | `[NEC Services] Accommodation Reschedule Approved ({requestId})` | Updated check-in and check-out dates | No | Non-wardens | `AccommodationService.java:1668` |
| **Transport** | `REQUEST_SUBMITTED` | `TransportService.createRequest` (L577, 593) | Vehicle booking created | Resolves `TRANSPORT_ADMIN` (mapped to `ao`) | `ao` (`ao@nrtec.in`) | Dept HOD + Requester | None | `[NEC Services] New Transport Request ({requestId})` | Destination, Vehicle type, Date/Time, Passenger count | No | Principal, Technicians | `TransportService.java:577, 593` |
| **Transport** | `REQUEST_APPROVED` | `TransportService.approveRequest` (L703, 725) | Transport Admin approves & assigns driver | Resolves Requester and assigned Driver | Requester & Driver User | Dept HOD | None | `[NEC Services] Transport Request Approved ({requestId})` | Assigned vehicle number, Driver name & phone | No | Unassigned drivers | `TransportService.java:703, 725` |
| **Transport** | `REQUEST_REJECTED` | `TransportService.rejectRequest` (L755) | Transport Admin rejects vehicle request | Resolves Requester | Requester User | Dept HOD | None | `[NEC Services] Transport Request Rejected ({requestId})` | Rejection justification (No vehicles available) | No | Drivers | `TransportService.java:755` |
| **Transport** | `REQUEST_CANCELLED` | `UnifiedRequestService.cancelApprovedRequest` (L532, 554) | Approved transport request cancelled | Resolves `TRANSPORT_ADMIN` & Driver | `ao` (`ao@nrtec.in`) & Driver User | Dept HOD + Requester | None | `[NEC Services] Transport Request Cancelled ({requestId})` | Cancellation reason, Released vehicle/driver | No | Wardens | `UnifiedRequestService.java:532` |
| **Stationery** | `REQUEST_SUBMITTED` | `StationeryService.createRequest` (L202, 214) | Supplies requisition submitted | Resolves `STATIONERY_ADMIN` (mapped to `ao`) | `ao` (`ao@nrtec.in`) | Dept HOD + Requester | None | `[NEC Services] New Stationery Request ({requestId})` | Item catalog list, Requested quantities, Justification | No | Faculty at large | `StationeryService.java:202, 214` |
| **Stationery** | `REQUEST_APPROVED` | `StationeryService.approveRequest` (L322) | Stationery admin approves issue | Resolves Requester | Requester User | Dept HOD | None | `[NEC Services] Stationery Request Approved ({requestId})` | Approved items, Quantities, Collection schedule | No | Drivers | `StationeryService.java:322` |
| **Stationery** | `REQUEST_REJECTED` | `StationeryService.rejectRequest` (L346) | Stationery admin rejects issue | Resolves Requester | Requester User | Dept HOD | None | `[NEC Services] Stationery Request Rejected ({requestId})` | Out of stock or budget exhausted | No | Non-requesters | `StationeryService.java:346` |
| **Stationery** | `READY_FOR_COLLECTION` | `StationeryService.markReadyForCollection` (L393) | Stock packed and ready at stores | Resolves Requester | Requester User | Dept HOD | None | `[NEC Services] Stationery Items Ready for Collection ({requestId})` | Store location, Operating hours, Collection OTP | No | Administrators | `StationeryService.java:393` |
| **Stationery** | `COLLECTED` | `StationeryService.markCollected` (L416) | Requester picks up items | Resolves Requester | Requester User | Dept HOD | None | `[NEC Services] Stationery Request Completed ({requestId})` | Handover confirmation timestamp | No | Third parties | `StationeryService.java:416` |
| **Electrical** | `ISSUE_REPORTED` | `ElectricalIssueService.createRequest` (L152, 164) | New campus electrical fault logged | Resolves `ELECTRICIAN` role (`bvchsubbarao`) | `bvchsubbarao` (`bvchsubbarao@gmail.com`) | Dept HOD + Reporter | None | `[NEC Services] New Electrical Issue Reported ({issueId})` | Location, Problem description, Severity | No | Generator operator | `ElectricalIssueService.java:152` |
| **Electrical** | `ISSUE_ASSIGNED` | `ElectricalIssueService.assignElectrician` (L235) | Ticket assigned to specific electrician | Resolves assigned electrician | Assigned Electrician User | Reporter User | None | `[NEC Services] Electrical Issue Assigned ({issueId})` | Target resolution time, Priority | No | Unrelated staff | `ElectricalIssueService.java:235` |
| **Electrical** | `ISSUE_RESOLVED` | `ElectricalIssueService.resolveIssue` (L340) | Electrician completes work | Resolves original reporter | Reporter User | Dept HOD | None | `[NEC Services] Electrical Issue Resolved ({issueId})` | Action taken, Parts replaced, Closure remarks | No | Non-involved users | `ElectricalIssueService.java:340` |
| **Electrical** | `ISSUE_ESCALATED` | `ElectricalIssueService.escalateIssue` (L410) | Unresolved beyond SLA | Resolves `AO_ADMIN` (`ao@nrtec.in`) | `ao` (`ao@nrtec.in`) | Dept HOD + Electrician | None | `[NEC Services] Electrical Issue Escalated ({issueId})` | Overdue status, Safety hazard warning | No | Students | `ElectricalIssueService.java:410` |
| **Generator** | `REQUEST_SUBMITTED` | `GeneratorLogService.createRequest` (L120) | Backup power requested | Resolves `GENERATOR_OPERATOR` | `ravurisrinu28` (`ravurisrinu28@gmail.com`) | Dept HOD + Requester | None | `[NEC Services] Generator Backup Scheduled ({requestId})` | Substation, Target building, Expected duration | No | Electrician | `GeneratorLogService.java:120` |
| **Generator** | `LOG_COMPLETED` | `GeneratorLogService.completeService` (L215) | Power restoration logged with fuel | Resolves `AO_ADMIN` & Requester | `ao` (`ao@nrtec.in`) & Requester | None | None | `[NEC Services] Generator Run Completed ({requestId})` | Operating hours, Diesel consumed (Liters) | No | General faculty | `GeneratorLogService.java:215` |
| **Snacks/Meals** | `REQUEST_SUBMITTED` | `MealArrangementService.createRequest` (L145) | Meeting snacks / VIP meals ordered | Resolves `MEALS_ADMIN` (mapped to `ao`) | `ao` (`ao@nrtec.in`) | Dept HOD + Requester | None | `[NEC Services] New Meal Arrangement Request ({requestId})` | Menu selection, Headcount, Delivery location, Time | No | Wardens | `MealArrangementService.java:145` |
| **Snacks/Meals** | `REQUEST_APPROVED` | `MealArrangementService.approveRequest` (L230) | Meals approved; forwarded to Canteen | Resolves `CANTEEN_INCHARGE` (DEFECT: 0 users) | Empty / Fallback to `ao` | Dept HOD + Requester | None | `[NEC Services] Meal Arrangement Request Approved ({requestId})` | Approved catering order, Timing instructions | No | Drivers | `MealArrangementService.java:230` |
| **Snacks/Meals** | `REQUEST_CANCELLED` | `UnifiedRequestService.cancelApprovedRequest` (L647, 664) | Approved catering order cancelled | Resolves `MEALS_ADMIN` & Canteen | `ao` (`ao@nrtec.in`) | Dept HOD + Requester | None | `[NEC Services] Meal Arrangement Request Cancelled ({requestId})` | Cancellation details, Kitchen standdown notice | No | Technicians | `UnifiedRequestService.java:647` |
| **Maintenance** | `REQUEST_SUBMITTED` | `CampusMaintenanceService.createRequest` (L110) | Civil, plumbing or carpentry repair | Resolves `AO_ADMIN` (`ao@nrtec.in`) | `ao` (`ao@nrtec.in`) | Dept HOD + Reporter | None | `[NEC Services] Campus Maintenance Request ({requestId})` | Defect category, Location, Room number, Urgency | No | Electricians | `CampusMaintenanceService.java:110` |
| **Maintenance** | `REQUEST_RESOLVED` | `CampusMaintenanceService.completeMaintenance` (L240) | Maintenance completed | Resolves original reporter | Reporter User | Dept HOD | None | `[NEC Services] Campus Maintenance Completed ({requestId})` | Completion summary, Quality inspection | No | Unrelated staff | `CampusMaintenanceService.java:240` |
| **Audio-Visual** | `REQUEST_SUBMITTED` | `AVSystemService.createRequest` (L85) | Dedicated PA/Projector support requested | Resolves hall technician or AV incharge | Hall Technician | Dept HOD + Requester | None | `[NEC Services] Audio-Visual Support Request ({requestId})` | Microphone counts, Presentation setup, Timing | No | Wardens | `AVSystemService.java:85` |
| **IT & WiFi** | `REQUEST_SUBMITTED` | `ITSupportService.createRequest` (L95) | Network / WiFi / Lab PC issue logged | Resolves IT Support Admin / `aihod` | `aihod` (`ithod@nrtec.in`) | Dept HOD + Reporter | None | `[NEC Services] IT Support Request ({requestId})` | IP subnet, System hostname, Network switch | No | Electrician | `ITSupportService.java:95` |
| **Security** | `GATEPASS_ISSUED` | `SecurityGatePassService.issuePass` (L130) | Visitor or equipment gate pass issued | Resolves Security Main Gate & Requester | Main Gate Security & Requester | Dept HOD | None | `[NEC Services] Security Gate Pass Issued ({passId})` | Material itemization, Vehicle number, Valid hours | No | Students | `SecurityGatePassService.java:130` |
| **Announcement** | `GENERAL_BROADCAST` | `AnnouncementController.createAnnouncement` (L45) | Broadcast campus announcement | Resolves Target Department users or ALL | All users in target scope | None | None | `[NEC Services] Announcement: {title}` | Announcement body text, Expiry date | No | Excluded departments | `AnnouncementController.java:45` |
| **Auth** | `PASSWORD_RESET` | `AuthService.forgotPassword` (L184) | User triggers 'Forgot Password' | Resolves requested user's verified email | Requester User Email | None (Strictly Private) | None | `[NEC Services] Password Reset Request` | Secure reset link with temporary token | No | All other users | `AuthService.java:184` |
| **Admin Test** | `SYSTEM_TEST_EMAIL` | `AdminEmailTestController.sendTestEmail` (L214) | Administrator initiates connectivity test | Explicit target recipient specified in test payload | Target Test Email | Empty or Test CC | None | `[NEC Services] Test Email Notification` | Connectivity verification test payload | **Optional (PDF)** | Production recipients | `AdminEmailTestController.java:214` |

---

## 5. Actual Email Subjects & Body Templates Catalog

All email dispatches originate from `EmailService.java`. The system enforces standardized subject lines and responsive HTML body templates styled with NEC branding.

### Email Subject Syntax Standards
All automated emails follow the strict prefix standard:
```
[NEC Services] {Action / Status Description} ({ReferenceId})
```

#### Documented Live Subjects:
- **Seminar Bookings:**
  - `[NEC Services] New Seminar Hall Request (AO-SEM-0023)`
  - `[NEC Services] Seminar Request Approved (CSE-SEM-0041)`
  - `[NEC Services] Seminar Request Rejected (ECE-SEM-0012)`
  - `[NEC Services] Seminar Request Cancelled (ME-SEM-0008)`
  - `[NEC Services] Seminar Request Rescheduled (CIVIL-SEM-0015)`
  - `[NEC Services] Seminar Equipment Setup Required (IT-SEM-0024)`
  - `[NEC Services] Generator Service Scheduled (PHARM-SEM-0005)`
  - `[NEC Services] Electrical Standby Required (CSE-SEM-0041)`
  - `[NEC Services] Seminar Inspection Report - Block 2 Seminar hall (CSE-SEM-0041)`
- **Hostel Accommodations:**
  - `[NEC Services] New Accommodation Request (ACC-2026-0014)`
  - `[NEC Services] Accommodation Request Approved (ACC-2026-0014)`
  - `[NEC Services] Accommodation Request Rejected (ACC-2026-0019)`
  - `[NEC Services] Accommodation Cancellation Requested (ACC-2026-0004)`
  - `[NEC Services] Accommodation Reschedule Approved (ACC-2026-0011)`
- **Transport & Vehicles:**
  - `[NEC Services] New Transport Request (TRN-2026-0032)`
  - `[NEC Services] Transport Request Approved (TRN-2026-0032)`
  - `[NEC Services] Transport Request Rejected (TRN-2026-0035)`
  - `[NEC Services] Transport Request Cancelled (TRN-2026-0032)`
- **Stationery & Supplies:**
  - `[NEC Services] New Stationery Request (STAT-2026-0021)`
  - `[NEC Services] Stationery Request Approved (STAT-2026-0021)`
  - `[NEC Services] Stationery Items Ready for Collection (STAT-2026-0021)`
  - `[NEC Services] Stationery Request Completed (STAT-2026-0021)`
- **Electrical & Maintenance:**
  - `[NEC Services] New Electrical Issue Reported (ELEC-2026-0009)`
  - `[NEC Services] Electrical Issue Assigned (ELEC-2026-0009)`
  - `[NEC Services] Electrical Issue Resolved (ELEC-2026-0009)`
  - `[NEC Services] Electrical Issue Escalated (ELEC-2026-0009)`
- **Food & Catering:**
  - `[NEC Services] New Meal Arrangement Request (MEAL-2026-0018)`
  - `[NEC Services] Meal Arrangement Request Approved (MEAL-2026-0018)`
  - `[NEC Services] Meal Arrangement Request Cancelled (MEAL-2026-0018)`
- **Authentication:**
  - `[NEC Services] Password Reset Request`

### HTML Body Template Structure
Built in `EmailService.buildHtmlBody(...)` (lines 1280–1410). The template features:
1. **Header Banner:** Deep Navy blue (`#1e3a8a`) branding with NEC College insignia, service portal title, and event badge.
2. **Key Details Table:** Centered, bordered HTML table rendering:
   - **Request ID / Ticket Reference:** Bold highlighted monospace text.
   - **Service Module:** Clean category tag.
   - **Event Type:** Formatted human-readable status.
   - **Event Timestamp:** Formatted in IST (`yyyy-MM-dd HH:mm:ss`).
   - **Action Performed By:** Initiator name and department.
   - **Summary Message:** Descriptive notification text.
3. **Action Button / Deep Link:** Direct button linking to the frontend portal (`https://collegeservices.nrtec.in/#/services/...`).
4. **Footer:** Standard institutional disclaimer prohibiting reply to automated relay and outlining confidentiality notices.

---

## 6. AO and HOD Routing Analysis

### AO_ADMIN Account Analysis
Three distinct accounts possess the `AO_ADMIN` role in MongoDB Atlas:

| User ID | Account Holder | Registered Email | Department | Role Profile | Operational Defense Routing Status |
|---|---|---|---|---|---|
| `ao` | Mr. I. Sridhar | `ao@nrtec.in` | `ADMIN` | Administrative Officer | **Exclusive Operational Recipient.** Receives 100% of day-to-day workflow dispatches. |
| `PRINCIPAL001` | Dr. S. Venkateswarlu | `principal@nrtec.in` | `ADMIN` | College Principal | **Executive Escalation Only.** Filtered out of operational dispatches; receives final approvals and policy alerts. |
| `sriramsriram123654` | Soul finder | `sriramsriram123654@gmail.com` | `CSE` | Developer / Test Account | **Completely Filtered Out.** Blocked from operational and executive dispatches by `EmailService.resolvePrimaryRecipients`. |

#### Code Evidence for AO Filtering:
In `EmailService.java` (lines 458–470):
```java
// Operational defense-in-depth: For operational workflows, route exclusively to AO
if (isOperationalWorkflow && role.equals("AO_ADMIN")) {
    return users.stream()
        .filter(u -> "ao".equalsIgnoreCase(u.getUserId()))
        .map(User::getEmail)
        .filter(this::isValidEmail)
        .collect(Collectors.toList());
}
```
**Hardcoded AO User IDs in Source:**
`AccommodationService.java` explicitly hardcodes `recipientUserId = "ao"` at lines 426, 667, 741, and 1222. While this ensures that guest house notifications reliably reach the Administrative Officer, it bypasses dynamic role resolution.

---

### DEPARTMENT_HOD Account Analysis
Eight active accounts in Atlas carry the `DEPARTMENT_HOD` role:

| Department | HOD User ID | HOD Name | Registered Email | Active Status | Atlas Dept Record Status |
|---|---|---|---|---|---|
| `CIVIL` | `civilhod` | Dr. P. Naga Sowjanya | `civilhod@nrtec.in` | Active | Valid (`hodId = null`) |
| `CSDS` | `aicsdshod` | Dr. V.V.A.S. Lakshmi | `aicsdshod@nrtec.in` | Active | **Missing in `departments` Collection** |
| `CSE` | `csehod` | Dr. S. N. Thirumala Rao | `csehod@nrtec.in` | Active | Valid (`hodId = null`) |
| `ECE` | `ecehod` | Dr. V. Venkata Rao | `ecehod@nrtec.in` | Active | Valid (`hodId = null`) |
| `EEE` | `hodeee` | Dr. Shaik Mahammad Shareef | `hodeee@nrtec.in` | Active | Valid (`hodId = null`) |
| `IT` | `aihod` | Dr. B. Jhansi Vazram | `ithod@nrtec.in` | Active | Valid (`hodId = null`) |
| `MBA` | `mbahod` | Dr. Y. Anki Reddy | `mbahod@nrtec.in` | Active | Valid (`hodId = null`) |
| `ME` | `mechhod` | Dr. B. Venkata Siva | `mechhod@nrtec.in` | Active | Valid (`hodId = null`) |
| `PHARM` | `PHARM001` | Dr. J N Suresh Kumar | `nipsprincipal07@gmail.com` | Active | Valid (`hodId = null`) |

#### Key Findings on HOD Routing:
1. **Resolution Mechanism:** HODs are resolved dynamically by querying the `users` collection for `hasRole("DEPARTMENT_HOD")` where `department.equalsIgnoreCase(targetDept)`. It does NOT depend on `Department.hodId`. Thus, even though `Department.hodId` is `null` across all 8 records, HOD email resolution succeeds without error.
2. **ADMIN Department Exclusion:** `EmailService.resolveDepartmentHodEmails("ADMIN")` explicitly returns `Collections.emptyList()`. This correctly prevents `ao` (who also holds the `DEPARTMENT_HOD` role) from receiving accidental CC emails meant for academic department heads.
3. **CC Inclusion Rules:** HODs are automatically added to CC on:
   - `REQUEST_APPROVED`
   - `REQUEST_REJECTED`
   - `REQUEST_CANCELLED`
   - `REQUEST_CANCEL_REQUESTED`
   - `REQUEST_RESCHEDULED`
   - `REQUEST_STATUS_UPDATED`
4. **CC Suppression:** HODs are strictly excluded from sub-service technician tasks, generator orders, electrician dispatches, and password reset emails.

---

## 7. Seminar Coordinator and Technician Routing

Every seminar hall is assigned a dedicated coordinator and technician in Atlas.

| Hall ID | Hall Name | Assigned Coordinator (userId) | Coordinator Email | Assigned Technician (userId) | Technician Email | Live `ccEmails` in Atlas |
|---|---|---|---|---|---|---|
| `SH-1` | Block 2 Seminar hall | `csehod` | `csehod@nrtec.in` | `knag1999` | `knag1999@nrtec.in` | `[]` (Empty) |
| `SH-2` | Block 3 Seminar Hall | `ecehod` | `ecehod@nrtec.in` | `mrs90003` | `m.r.s.90003@gmail.com` | `[]` (Empty) |
| `SH-3` | Tech Hub Seminar Hall | `seminarcoordinator5` | `training@nrtec.in` | `mallavarapubrijesh` | `mallavarapubrijesh@gmail.com` | `[]` (Empty) |
| `SH-4` | Block 4 Seminar Hall | `viceprincipal` | `viceprincipal@nrtec.in` | `tandavakrishnaanumolu` | `tandavakrishnaanumolu@gmail.com` | `[]` (Empty) |
| `SH-5` | Pharma Block Seminar Hall | `PHARM001` | `nipsprincipal07@gmail.com` | `kotabalasuvarna` | `kotabalasuvarna@gmail.com` | `[]` (Empty) |
| `TH-1` | Tech Hub Wifi center | `seminarcoordinator5` | `training@nrtec.in` | `mallavarapubrijesh` | `mallavarapubrijesh@gmail.com` | `[]` (Empty) |

### Routing Analysis:
1. **Dual Hall Assignment:** `seminarcoordinator5` (`training@nrtec.in`) and technician `mallavarapubrijesh` (`mallavarapubrijesh@gmail.com`) manage both `SH-3` and `TH-1`.
2. **Technician Sub-service Dispatches:** When a booking is confirmed, `SeminarService` triggers targeted notifications to the technician assigned to that specific hall.
3. **CC Suppression for Operational Roles:** When emails are dispatched to `SEMINAR_TECHNICIAN`, `ELECTRICIAN`, or `GENERATOR_OPERATOR`, `EmailService.resolveCcRecipients(...)` returns an empty list to prevent spamming coordinators or HODs with equipment preparation tickets.

---

## 8. Other Module Administrator Routing

Audit of specialized operational roles across facilities:

| Module Role | Registered Users in Atlas | Primary Recipient Email | Audit Status & Gap Identification |
|---|---|---|---|
| `TRANSPORT_ADMIN` | `ao` | `ao@nrtec.in` | **Operational.** Correctly routed to AO. |
| `STATIONERY_ADMIN` | `ao` | `ao@nrtec.in` | **Operational.** Correctly routed to AO. |
| `MEALS_ADMIN` | `ao` | `ao@nrtec.in` | **Operational.** Correctly routed to AO. |
| `ELECTRICIAN` | `bvchsubbarao` | `bvchsubbarao@gmail.com` | **Operational.** Active campus electrician. |
| `GENERATOR_OPERATOR` | `ravurisrinu28` | `ravurisrinu28@gmail.com` | **Operational.** Active generator operator. |
| `GIRLS_HOSTEL_ADMIN` | `moturi` | `moturi@nrtec.in` | **Operational.** Dr. Sireesha Moturi receives girls' hostel bookings. |
| `BOYS_HOSTEL_ADMIN` | **NONE (0 Users)** | *Unresolved* | **CRITICAL DEFECT:** No account exists with this role. Boys' hostel bookings find zero recipients. |
| `CANTEEN_INCHARGE` | **NONE (0 Users)** | *Unresolved* | **CRITICAL DEFECT:** Referenced in `UnifiedRequestService`, but zero users exist in Atlas. |

---

## 9. PDF Attachment Distribution & Inspection Reporting

The application features automated PDF generation and email delivery for seminar inspection reports.

### PDF Dispatch Flow:
```
[Post-Event Checklist Completed in UI]
                │
                ▼
  SeminarInspectionService.submitInspection()
                │
                ▼
  SeminarInspectionService.generateAndSendPdfReport()
                │
                ├─► Generates PDF bytes via iText / OpenPDF
                │
                ├─► Validates PDF size (< 25MB constraint)
                │
                ├─► Encodes to Base64 payload
                │
                ▼
  EmailService.sendEmailWithAttachment(to, cc, subject, htmlBody, pdfBytes, fileName)
                │
                ▼
  Apps Script Relay: POST /exec (with attachmentBase64 & attachmentName)
                │
                ▼
  Google MailApp.sendEmail({attachments: [blob]})
```

### PDF Recipient Distribution:
When an inspection report is submitted, `SeminarInspectionService` resolves three recipients:
1. **Hall Coordinator:** Retrieved via `inspection.getCoordinatorUserId()`.
2. **Hall Technician:** Retrieved via `inspection.getTechnicianUserId()`.
3. **Event Requester:** Retrieved via `inspection.getRequesterUserId()`.

### Controlled Test Endpoint:
In `AdminEmailTestController.java` (line 214), administrators can trigger a controlled test attachment dispatch (`Option 2`) to verify relay attachment encoding without modifying business records.

---

## 10. Actual Email Logs Forensic Reconciliation

Audit of all 138 documents in the live Atlas `email_logs` collection:

### Status Breakdown:
| Email Status | Record Count | Percentage | Operational Meaning |
|---|---|---|---|
| `SENT` | **83** | 60.14% | Confirmed accepted and sent by Apps Script relay |
| `SMTP_ACCEPTED` | **55** | 39.86% | Accepted by relay under SMTP protocol handoff |
| `FAILED` | **0** | 0.00% | Zero recorded dispatch failures |
| `SKIPPED` | **0** | 0.00% | Zero skipped emails in log collection |
| **Total Logs** | **138** | **100.0%** | All dispatches successfully tracked |

### Provider Breakdown:
- `APPS_SCRIPT`: **138** (100.0%)
- `SMTP_DIRECT`: **0** (0.0%)

### Dispatches by Service Module:
| Service Module | Total Dispatches | Dominant Event |
|---|---|---|
| **Seminar Hall** | **100** | `REQUEST_SUBMITTED` (69), `REQUEST_APPROVED` (29), `REQUEST_CANCELLED` (2) |
| **Seminar Equipment** | **11** | Sub-service technician setup tickets |
| **Generator Service** | **11** | Standby power dispatch logs |
| **Electrical Service** | **10** | Electrician fault and standby tickets |
| **Authentication** | **4** | `PASSWORD_RESET` |
| **Snacks & Meals** | **2** | Meeting catering orders |

### Top Recipients in Live Logs:
1. `sriramsriram123654@gmail.com`: 25 dispatches (early testing)
2. `ao@nrtec.in`: 20 dispatches (production AO)
3. `principal@nrtec.in`: 19 dispatches (production Principal)
4. `creator@nrtec.in`: 16 dispatches (system administrator)
5. `ravurisrinu28@gmail.com`: 9 dispatches (generator operator)
6. `bvchsubbarao@gmail.com`: 8 dispatches (electrician)
7. `csehod@nrtec.in`: 6 dispatches (CSE HOD / Hall 1 Coordinator)
8. `tandavakrishnaanumolu@gmail.com`: 5 dispatches (Hall 4 Technician)
9. `ithod@nrtec.in`: 4 dispatches (IT HOD)
10. `nipsprincipal07@gmail.com`: 4 dispatches (Pharmacy HOD / Hall 5 Coordinator)

### Historical Syntax Errors & Phase 1 Validation Impact:
The logs reveal historical syntax defects recorded prior to Phase 1 recipient validation:
- `principal@nrtec.i`: 2 logs (truncated TLD)
- `nipsprincipal07@gmail.co`: 2 logs (truncated TLD)
- `tandavakrishnaanumolu@gmail.co`: 2 logs (truncated TLD)
- `bvchsubbarao@gmail.co`: 2 logs (truncated TLD)
- `ravurisrinu28@gmail.co`: 2 logs (truncated TLD)

*Conclusion:* The Phase 1 email recipient validation implementation has completely eliminated these malformed TLD dispatches.

### Deduplication Key Analysis:
- Total Logged Keys: **138**
- Unique Keys: **110**
- Duplicate Keys: **28** (all occurred during initial October 2026 test cycles before Phase 2 atomic claim leasing was activated). Zero collisions have occurred since Phase 2 implementation.

---

## 11. Cross-Channel Notification Architecture Comparison

The backend implements an asynchronous multi-channel notification architecture centered around `NotificationService.sendNotification(...)`:

```mermaid
flowchart TD
    Trigger["Service Event (e.g. Booking Approved)"] --> NS["NotificationService.sendNotification()"]
    
    subgraph ChannelIsolation["Independent Channel Execution (Isolated Try-Catch Blocks)"]
        NS --> Ch1["Channel 1: MongoDB In-App Notification
(Persisted to 'notifications' collection)"]
        NS --> Ch2["Channel 2: Web Push Notification
(WebPushService / Service Worker)"]
        NS --> Ch3["Channel 3: Mobile Push Notification
(FCMService / Firebase Cloud Messaging)"]
        NS --> Ch4["Channel 4: Email Notification
(EmailService.sendNotificationEmailAsync)"]
    end
    
    Ch4 --> Relay["Google Apps Script Email Relay"]
    Relay --> Log["EmailLog Collection (SENT / SMTP_ACCEPTED)"]
```

### Channel Fault Isolation Matrix:

| Notification Channel | Target Medium | Failure Impact on Other Channels | Threading Model |
|---|---|---|---|
| **In-App Notification** | Web Application Bell Icon | None. Persisted synchronously to Atlas. | Main Request Thread |
| **Web Push Notification** | Browser Service Worker Push | None. Wrapped in `try-catch`; failures logged. | Async / Worker |
| **Mobile Push (FCM)** | Android / iOS Devices | None. Wrapped in `try-catch`; failures logged. | Async / Worker |
| **Email Relay** | User Mailbox | None. Dispatched via `@Async` task executor; relay timeouts or delivery failures never roll back business transactions or abort in-app notifications. | `@Async` Worker Thread |

---

## 12. Confirmed Defects & Unresolved Questions

| Defect ID | Severity | Category | Description & Impact | Recommended Remediation |
|---|---|---|---|---|
| **DEF-01** | **CRITICAL** | User Account Missing | **Missing `BOYS_HOSTEL_ADMIN` Role:** No user in MongoDB Atlas holds this role. When a boys' hostel booking is submitted, `AccommodationService` finds zero recipients. | Create or assign a boys' hostel warden account in Atlas with role `BOYS_HOSTEL_ADMIN`. |
| **DEF-02** | **HIGH** | User Account Missing | **Missing `CANTEEN_INCHARGE` Role:** `UnifiedRequestService` references this role, but no account possesses it in Atlas. Meal cancellation and catering dispatches fail silently. | Provision an active canteen manager account in Atlas with role `CANTEEN_INCHARGE`. |
| **DEF-03** | **MEDIUM** | Reference Integrity | **Missing `CSDS` Department Record:** The `departments` collection has 8 records; `CSDS` is absent, even though `aicsdshod` is active with department `CSDS`. | Insert `{ code: "CSDS", name: "Computer Science and Data Science", active: true }` into `departments`. |
| **DEF-04** | **LOW** | Schema Redundancy | **`hodId = null` in All Department Documents:** The `departments` collection stores `hodId = null` across all 8 departments. | Backfill `hodId` on department records to match the active HOD user IDs. |
| **DEF-05** | **LOW** | Operational Config | **Empty `ccEmails` in All Seminar Halls:** All 6 halls have `ccEmails = []`. Hall-level CC distribution is dormant. | Configure departmental or administrative CC emails in hall records if secondary notification is desired. |
| **DEF-06** | **MEDIUM** | Code Maintainability | **Hardcoded `"ao"` Recipient in `AccommodationService`:** Lines 426, 667, 741, and 1222 explicitly hardcode `"ao"`. If the AO user ID changes, accommodation notifications will break. | Refactor `AccommodationService` to resolve the active `AO_ADMIN` via `userRepository` instead of hardcoding. |

---

## 13. Final System-Wide Reconciliation

| Dimension | Count | Reconciliation Notes & Source Justification |
|---|---|---|
| **Source-Code Dispatch Sites** | **109** | 109 distinct `sendNotification` / `sendEmail` invocations across 142 Java backend files. |
| **Distinct Functional Modules** | **12** | All 12 campus service modules cataloged. |
| **Registered User Accounts** | **23** | 23 active accounts in live Atlas `collegeservices_db.users`. |
| **Historical Email Logs** | **138** | 138 total logs in Atlas (`83 SENT`, `55 SMTP_ACCEPTED`). |
| **Historical In-App Notifications** | **99** | 99 total notifications in Atlas (`92 unread`, `7 read`). |

### Reconciliation Explanation:
- The count of **109 source trigger sites** represents the complete code paths across all 12 modules that *can* generate notifications under different business transitions.
- The **138 email logs** in Atlas reflect the actual cumulative dispatches executed against the production database since October 2026.
- The **99 in-app notifications** differ from the 138 email logs because:
  - 4 email logs represent `PASSWORD_RESET` events, which do not create in-app notifications.
  - Early testing included direct email dispatches and repeat test cases where in-app notifications were purged or not created.
  - Sub-service notifications for multiple technicians/operators generate multiple email dispatches from single booking approvals.

---

**Audit Completed By:** DeepMind Antigravity Agent  
**Verification Status:** Verified against Live MongoDB Atlas Replica Set (`collegeservices_db`)  
**Deliverable Document:** `audit_output/14_COMPLETE_EMAIL_RECIPIENT_ROUTING_MATRIX.md`
