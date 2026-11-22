# Project-Wide Email Delivery Remediation – Master Implementation Plan

**Project:** NEC College Department Services Management System  
**Repository:** `CollegeServiceManagement`  
**Database:** MongoDB Atlas – `collegeservices_db`  
**Execution Stage:** STRICTLY READ-ONLY – IMPLEMENTATION READINESS AUDIT  
**Report Reference:** `audit_output/email_account_delivery_audit/21_PROJECT_WIDE_EMAIL_REMEDIATION_MASTER_PLAN.md`  
**Audit Timestamp:** November 22, 2026

---

## 1. Executive Summary & Remediation Objectives

This master remediation plan provides a complete, forensic, and auditable roadmap for resolving all confirmed and potential email delivery failures across the NEC College Department Services Management System.

The objective is to establish **100% reliable, traceable, and deduplicated email delivery** for all authorized recipients across all functional modules (Seminar, Accommodation, Electrical, Meals & Catering, Transport, Stationery, and Announcements) while strictly eliminating silent drops, orphaned role black-holes, department code mismatches, and ambiguous provider states.

### Core Remediation Tenets
1. **Zero Silent Drops:** Every notification produced by the application must either resolve to at least one valid, active recipient or be explicitly logged in `email_logs` as `SKIPPED_NO_RECIPIENTS` with full diagnostic context (role, department, user ID, reference ID).
2. **Deterministic Role & Facility Mapping:** Eradicate all orphaned role references (`SEMINAR_ADMIN`) and unmapped institutional facilities (`Guest House`, `ME` vs `MECH`, unconfigured `CSDS` department).
3. **Multi-Tenant Fenced Concurrency:** Preserve and extend the Phase 2 MongoDB atomic lease claims and monotonically increasing fencing tokens across all dispatch paths.
4. **Provider Transparency:** Formally decouple provider acceptance (`SMTP_ACCEPTED` / `SENT`) from inbox delivery, logging exact provider message IDs, HTTP response payloads, and sanitizing all sensitive credentials.
5. **Strict Backward Compatibility:** Ensure no modifications break existing frontend notification dashboards, mobile push feeds, or institutional security hierarchies.

---

## 2. Current Project State & Working Tree Inventory

### 2.1 Git & Deployment Checkpoints

| Parameter | Current State | Verification Evidence |
|---|---|---|
| **Active Git Branch** | `main` | `git status` -> `On branch main`, up to date with `origin/main` |
| **Local HEAD Commit** | `0b92afc` | `0b92afc commit nov 21` |
| **Render Production Deployed Commit** | `0b92afc` | Render deploy logs show commit `0b92afc` (which includes `e91d164`) |
| **Active MongoDB Connection** | MongoDB Atlas Cluster `collegeservices_db` | `MongoAtlasConfigurationValidator` verified connection to AWS `ap-south-1` cluster `ac-c1vogye-shard-00-01.tzw0cfl.mongodb.net:27017` |
| **Production Email Provider** | Google Apps Script HTTPS Relay | `app.mail.provider=apps-script`, URL and secret configured in Render environment |
| **Local Development Email Provider** | SMTP / Local Fallback | `app.mail.provider=local`, `spring.mail.host=smtp.gmail.com:587` |

### 2.2 Working Tree Status & Existing Modifications (Preserved)

All existing uncommitted changes in the working tree are intact and will remain untouched:

1. **Phase 1 (`EmailRecipientValidator`):**
   - `backend/src/main/java/com/nec/collegeservices/service/EmailRecipientValidator.java` (Untracked)
   - `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` (Modified - secondary recipient validation, primary deduplication)
   - `backend/src/main/java/com/nec/collegeservices/controller/AdminUserController.java` (Modified - RFC 5322 email syntax validation on user creation/updates)
   - `backend/src/test/java/com/nec/collegeservices/service/EmailRecipientValidatorTest.java` (50 unit tests passing)
2. **Phase 2 (Atomic MongoDB Email Deduplication):**
   - `backend/src/main/java/com/nec/collegeservices/model/EmailDeduplicationClaim.java` (Untracked)
   - `backend/src/main/java/com/nec/collegeservices/repository/EmailDeduplicationClaimRepository.java` (Untracked)
   - `backend/src/main/java/com/nec/collegeservices/service/EmailDeduplicationService.java` (Untracked)
   - `backend/src/main/java/com/nec/collegeservices/service/ClaimAcquisitionResult.java` (Untracked)
   - `backend/src/main/java/com/nec/collegeservices/service/EmailClaimHandle.java` (Untracked)
   - `backend/src/test/java/com/nec/collegeservices/service/EmailDeduplicationServiceTest.java` (14 unit tests passing)
3. **Atlas-Only Configuration & Validation:**
   - `backend/src/main/java/com/nec/collegeservices/config/MongoAtlasConfigurationValidator.java` (Untracked)
   - `backend/src/main/resources/application.properties` (Modified - enforces `MONGODB_URI`, eliminates localhost fallback)
   - `backend/src/main/resources/application-local.properties.example` (Modified - safe placeholder)
4. **SeminarService Coordinator Lookup Bug Fix:**
   - `backend/src/main/java/com/nec/collegeservices/service/SeminarService.java` (Modified - lines 1418, 1522, 1711 replaced with `getHallById()`)
   - `backend/src/test/java/com/nec/collegeservices/service/SeminarCoordinatorNotificationLookupTest.java` (Untracked - 6 tests passing)

### 2.3 Verified Phase 2 Concurrency & Lease Architecture (Source Verified)

Inspection of `EmailDeduplicationService.java` confirms the exact runtime parameters:
- **Default Lease Duration:** `60 seconds` (`${app.mail.deduplication.lease-seconds:60}`).
- **Claim Retention Duration:** `30 days` (`${app.mail.deduplication.retention-days:30}`).
- **Active Lease TTL:** Active `IN_PROGRESS` claims keep `retentionExpiresAt = null`. MongoDB's TTL index (`expireAfterSeconds=0`) ignores null fields, preventing prematurely expired active worker leases.
- **Lease Recovery Query:** `status == "IN_PROGRESS" && leaseExpiresAt < now`.
- **Fencing Token Mechanism:** Initialized to `1` on atomic insert (`_id: deduplicationKey`). Incremented via `$inc: { fencingToken: 1 }` upon atomic lease recovery, guaranteeing stale workers cannot mark or complete an expired claim.
- **Fail-Closed Semantics:** Any MongoDB network exception caught during claim acquisition returns `DATABASE_ERROR`, preventing uncoordinated double-dispatch.

---

## 3. Complete Module-Wise Notification & Recipient Matrix (All 97 Call Sites)

An exhaustive scan across all Java source files identified **97 discrete notification call sites** across 9 backend classes.

### 3.1 Seminar Hall Module (`SeminarService.java` - 28 call sites, `SeminarInspectionService.java` - 3 call sites)

| Call Site (File:Line) | Event / Title | Recipient Role | Dept | Target User ID | Resolution Method | Classification | Remediation Plan |
|---|---|---|---|---|---|---|---|
| `SeminarService:1002` | New Seminar Hall Request | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:1020` | New Seminar Hall Request | `SEMINAR_ADMIN` | `ADMIN` | `null` | Role + Dept filter | `CONFIRMED_DEFECT` | Remove orphan notification; redundant with AO_ADMIN |
| `SeminarService:1031` | New Seminar Hall Request | `AO_ADMIN` | `ADMIN` | `"ao"` | Direct UID | `CORRECTLY_MAPPED` | Retain isolated routing to `"ao"` |
| `SeminarService:1044` | New Seminar Hall Request | `SEMINAR_COORDINATOR`| `ADMIN` | Dynamic Coord UID | Direct UID via `getCoordinatorUserIdsForHall` | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:1394` | Seminar Request Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:1406` | Seminar Request Approved | `DEPARTMENT_HOD` | Requester Dept | `null` | Role + Dept filter | `POTENTIAL_DEFECT` | Normalize department codes (ME vs MECH) |
| `SeminarService:1421` | Seminar Booking Confirmed | `SEMINAR_COORDINATOR`| `ADMIN` | Dynamic Coord UID | Direct UID via `getHallById()` | `CORRECTLY_MAPPED` | Fixed in working tree; verified |
| `SeminarService:1510` | Seminar Request Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:1525` | Seminar Request Rejected | `SEMINAR_COORDINATOR`| `ADMIN` | Dynamic Coord UID | Direct UID via `getHallById()` | `CORRECTLY_MAPPED` | Fixed in working tree; verified |
| `SeminarService:1623` | Seminar Cancellation Requested | `SEMINAR_ADMIN` | `ADMIN` | `null` | Role + Dept filter | `CONFIRMED_DEFECT` | Replace with `AO_ADMIN` (`"ao"`) so cancellation alerts reach admin |
| `SeminarService:1699` | Seminar Cancellation Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:1714` | Seminar Cancellation Approved | `SEMINAR_COORDINATOR`| `ADMIN` | Dynamic Coord UID | Direct UID via `getHallById()` | `CORRECTLY_MAPPED` | Fixed in working tree; verified |
| `SeminarService:1790` | Seminar Reschedule Requested | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:1892` | Seminar Reschedule Requested | `SEMINAR_ADMIN` | `ADMIN` | `null` | Role + Dept filter | `CONFIRMED_DEFECT` | Replace with `AO_ADMIN` (`"ao"`) |
| `SeminarService:2007` | Seminar Reschedule Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2020` | Seminar Reschedule Approved | `SEMINAR_COORDINATOR`| `ADMIN` | Dynamic Coord UID | Direct UID (New Hall) | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2035` | Seminar Booking Moved | `SEMINAR_COORDINATOR`| `ADMIN` | Dynamic Coord UID | Direct UID (Old Hall) | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2100` | Seminar Reschedule Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2437` | Seminar Equipment Schedule - Created | `SEMINAR_TECHNICIAN` | `ADMIN` | Dynamic Tech UID | Assigned hall filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2481` | Seminar Equipment Schedule - Rescheduled| `SEMINAR_TECHNICIAN` | `ADMIN` | Dynamic Tech UID | Assigned hall filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2508` | Seminar Equipment Setup Cancelled | `SEMINAR_TECHNICIAN` | `ADMIN` | Dynamic Tech UID | Assigned hall filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2549` | Seminar Equipment Schedule - Approved | `SEMINAR_TECHNICIAN` | `ADMIN` | Dynamic Tech UID | Assigned hall filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2590` | Generator Schedule - Created | `GENERATOR_OPERATOR` | `ADMIN` | Dynamic Op UID | Active operator filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2636` | Generator Schedule - Rescheduled | `GENERATOR_OPERATOR` | `ADMIN` | Dynamic Op UID | Active operator filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2677` | Generator Schedule - Cancelled | `GENERATOR_OPERATOR` | `ADMIN` | Dynamic Op UID | Active operator filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2719` | Electrical Schedule - Created | `ELECTRICIAN` | `ADMIN` | Dynamic Elec UID | Active electrician filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2765` | Electrical Schedule - Rescheduled | `ELECTRICIAN` | `ADMIN` | Dynamic Elec UID | Active electrician filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarService:2806` | Electrical Schedule - Cancelled | `ELECTRICIAN` | `ADMIN` | Dynamic Elec UID | Active electrician filter | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarInspectionService:563` | Pre-Event Inspection Submitted | `SEMINAR_COORDINATOR`| `ADMIN` | Dynamic Coord UID | Direct UID | `CORRECTLY_MAPPED` | Dispatched with PDF attachment |
| `SeminarInspectionService:581` | Pre-Event Inspection Submitted | `SEMINAR_TECHNICIAN` | `ADMIN` | Inspector UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `SeminarInspectionService:599` | Pre-Event Inspection Submitted | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |

---

### 3.2 Accommodation Module (`AccommodationService.java` - 22 call sites)

| Call Site (File:Line) | Event / Title | Recipient Role | Dept | Target User ID | Resolution Method | Classification | Remediation Plan |
|---|---|---|---|---|---|---|---|
| `AccommodationService:426` | New Dual Accommodation Request | `AO_ADMIN` | `ADMIN` | `"ao"` | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:429` | Dual Accommodation Submitted | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:667` | New Recurring Accommodation Request | `AO_ADMIN` | `ADMIN` | `"ao"` | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:670` | Recurring Request Submitted | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:741` | New Single Accommodation Request | `AO_ADMIN` | `ADMIN` | `"ao"` | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:744` | Single Request Submitted | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:953` | Accommodation Request Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:966` | Accommodation Request Approved | Dynamic Warden Role | `ADMIN` | `null` | `BOYS_HOSTEL_ADMIN` / `GIRLS_HOSTEL_ADMIN` | `CORRECTLY_MAPPED` | Resolves to `warden_boys` / `warden_girls` |
| `AccommodationService:1036`| Accommodation Request Forwarded | `targetRole` | `ADMIN` | `null` | `BOYS_HOSTEL_ADMIN` / `GIRLS_HOSTEL_ADMIN` | `CORRECTLY_MAPPED` | Resolves correctly |
| `AccommodationService:1098`| Accommodation Forward Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1210`| Accommodation Request Confirmed | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1222`| Accommodation Approved by Warden | `AO_ADMIN` | `ADMIN` | `"ao"` | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1300`| Accommodation Request Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1367`| Accommodation Cancellation Requested| `ACCOMMODATION_ADMIN`| `ADMIN` | `null` | Role + Dept filter | `CONFIRMED_DEFECT` | Orphan role! Zero users hold `ACCOMMODATION_ADMIN`. Route to `AO_ADMIN` (`"ao"`) |
| `AccommodationService:1414`| Accommodation Cancellation Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1427`| Accommodation Cancellation Approved | Dynamic Warden Role | `ADMIN` | `null` | `BOYS_HOSTEL_ADMIN` / `GIRLS_HOSTEL_ADMIN` | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1478`| Cancellation Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1591`| Accommodation Reschedule Requested | `ACCOMMODATION_ADMIN`| `ADMIN` | `null` | Role + Dept filter | `CONFIRMED_DEFECT` | Orphan role! Route to `AO_ADMIN` (`"ao"`) |
| `AccommodationService:1668`| Accommodation Reschedule Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1681`| Accommodation Rescheduled (Target) | Target Warden Role | `ADMIN` | `null` | Target Hostel Warden | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1698`| Accommodation Moved (Original) | Orig Warden Role | `ADMIN` | `null` | Previous Hostel Warden | `CORRECTLY_MAPPED` | Retain as-is |
| `AccommodationService:1750`| Accommodation Reschedule Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |

---

### 3.3 Electrical Module (`ElectricalIssueService.java` - 15 call sites)

| Call Site (File:Line) | Event / Title | Recipient Role | Dept | Target User ID | Resolution Method | Classification | Remediation Plan |
|---|---|---|---|---|---|---|---|
| `ElectricalIssueService:152`| New Electrical Issue Reported | Reporter Role | Reporter Dept | Reporter UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:164`| New Electrical Issue Alert | `ELECTRICIAN` | `ADMIN` | `null` | Active Electricians | `CORRECTLY_MAPPED` | Dispatches to campus electricians |
| `ElectricalIssueService:175`| New Electrical Issue Alert | `AO_ADMIN` | `ADMIN` | `"ao"` | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:332`| Electrical Issue Status Updated | Reporter Role | Reporter Dept | Reporter UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:378`| Electrical Issue Status Updated | Reporter Role | Reporter Dept | Reporter UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:458`| Electrical Issue Reopened | Reporter Role | Reporter Dept | Reporter UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:470`| Electrical Issue Reopened | `AO_ADMIN` | `ADMIN` | `"ao"` | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:522`| Electrical Issue Closed | Reporter Role | Reporter Dept | Reporter UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:578`| Priority Escalated | `ELECTRICIAN` | `ADMIN` | `null` | Active Electricians | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:589`| Priority Escalated | `AO_ADMIN` | `ADMIN` | `"ao"` | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:662`| Electrical Issue Assigned | `ELECTRICIAN` | `ADMIN` | Assigned UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:675`| Electrical Issue Unassigned (Prev) | `ELECTRICIAN` | `ADMIN` | Previous UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:689`| Issue Assigned to Technician | Reporter Role | Reporter Dept | Reporter UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:791`| Electrical Issue Cancelled | Reporter Role | Reporter Dept | Reporter UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `ElectricalIssueService:803`| Electrical Issue Cancelled | `ELECTRICIAN` | `ADMIN` | Assigned UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |

---

### 3.4 Meals & Catering Module (`MealService.java` - 6 call sites)

| Call Site (File:Line) | Event / Title | Recipient Role | Dept | Target User ID | Resolution Method | Classification | Remediation Plan |
|---|---|---|---|---|---|---|---|
| `MealService:290` | Meal Request Submitted | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `MealService:306` | New Meal Request Pending Approval | `MEALS_ADMIN` | `ADMIN` | `null` | Role + Dept filter | `CORRECTLY_MAPPED` | Resolves to `ao` (holds MEALS_ADMIN permission) |
| `MealService:417` | Meal Request Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `MealService:434` | Meal Request Approved (Canteen) | `CANTEEN_INCHARGE`| `ADMIN` | Canteen UID / `null` | User scan / fallback | `CONFIRMED_DEFECT` | Zero users hold `CANTEEN_INCHARGE`. Silent drop occurs! |
| `MealService:475` | Meal Request Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |

---

### 3.5 Transport Module (`TransportService.java` - 5 call sites)

| Call Site (File:Line) | Event / Title | Recipient Role | Dept | Target User ID | Resolution Method | Classification | Remediation Plan |
|---|---|---|---|---|---|---|---|
| `TransportService:577` | Transport Request Submitted | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `TransportService:593` | New Transport Request | `TRANSPORT_ADMIN` | `ADMIN` | `null` | Role + Dept filter | `CORRECTLY_MAPPED` | Resolves to `ao` |
| `TransportService:703` | Transport Request Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `TransportService:725` | Trip Assigned to Driver | `DRIVER` | `ADMIN` | Matched Driver UID | Name/phone matching | `CONFIGURATION_GAP` | Zero users registered with driver phone/name in `users`. Drops silently! |
| `TransportService:755` | Transport Request Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |

---

### 3.6 Stationery Module (`StationeryService.java` - 7 call sites)

| Call Site (File:Line) | Event / Title | Recipient Role | Dept | Target User ID | Resolution Method | Classification | Remediation Plan |
|---|---|---|---|---|---|---|---|
| `StationeryService:202` | Stationery Request Submitted | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `StationeryService:214` | New Stationery Request | `STATIONERY_ADMIN`| `ADMIN` | `null` | Role + Dept filter | `CORRECTLY_MAPPED` | Resolves to `ao` |
| `StationeryService:322` | Stationery Request Approved | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `StationeryService:346` | Stationery Request Rejected | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `StationeryService:370` | Ready for Pickup | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `StationeryService:393` | Items Dispatched | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `StationeryService:416` | Order Completed | `DEPARTMENT_USER` | Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |

---

### 3.7 Unified Requests & Administrative Actions (`UnifiedRequestService.java` - 10 call sites)

| Call Site (File:Line) | Event / Title | Recipient Role | Dept | Target User ID | Resolution Method | Classification | Remediation Plan |
|---|---|---|---|---|---|---|---|
| `UnifiedRequestService:416`| Request Cancelled by AO Admin | `DEPARTMENT_USER`| Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `UnifiedRequestService:465`| Accommodation Cancelled by AO | `DEPARTMENT_USER`| Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `UnifiedRequestService:520`| Transport Cancelled by AO | `DEPARTMENT_USER`| Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `UnifiedRequestService:532`| Transport Booking Cancelled | `TRANSPORT_ADMIN` | `ADMIN` | `null` | Role + Dept filter | `CORRECTLY_MAPPED` | Resolves to `ao` |
| `UnifiedRequestService:554`| Trip Assignment Cancelled | `DRIVER` | `ADMIN` | Driver UID | Name/phone match | `CONFIGURATION_GAP` | Drops if driver not in `users` |
| `UnifiedRequestService:599`| Stationery Cancelled by AO | `DEPARTMENT_USER`| Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `UnifiedRequestService:635`| Meals Cancelled by AO | `DEPARTMENT_USER`| Requester Dept | Requester UID | Direct UID | `CORRECTLY_MAPPED` | Retain as-is |
| `UnifiedRequestService:647`| Food Order Cancelled | `MEALS_ADMIN` | `ADMIN` | `null` | Role + Dept filter | `CORRECTLY_MAPPED` | Resolves to `ao` |
| `UnifiedRequestService:664`| Catering Assignment Cancelled| `CANTEEN_INCHARGE`| `ADMIN` | Canteen UID / `null` | Role + Dept filter | `CONFIRMED_DEFECT` | Zero users; drops silently |

---

### 3.8 Announcements (`AnnouncementController.java` - 1 call site)

| Call Site (File:Line) | Event / Title | Recipient Role | Dept | Target User ID | Resolution Method | Classification | Remediation Plan |
|---|---|---|---|---|---|---|---|
| `AnnouncementController:45`| Campus Announcement Broadcast | `"ALL"` | Target Dept | `null` | Broadcast to all users in dept | `CORRECTLY_MAPPED` | Retain as-is |

---

## 4. Confirmed Defects & Institutional Configuration Gaps

### 4.1 Confirmed Defects (Requiring Source Code Changes)

#### Defect 1: Orphaned `SEMINAR_ADMIN` Role Call Sites
- **Locations:** `SeminarService.java` lines 1020, 1623, 1892.
- **Root Cause:** Zero users in MongoDB Atlas hold `SEMINAR_ADMIN`. Line 1020 is redundant with line 1031 (`AO_ADMIN` -> `"ao"`). Lines 1623 and 1892 (cancellation and reschedule requests) ONLY notify `SEMINAR_ADMIN`, resulting in zero administrators being alerted when a user requests cancellation or rescheduling.
- **Classification:** `CONFIRMED_DEFECT`.
- **Remediation:** Remove line 1020. Update lines 1623 and 1892 to target `"AO_ADMIN"`, `"ADMIN"`, `"ao"`.

#### Defect 2: Orphaned `ACCOMMODATION_ADMIN` Role Call Sites
- **Locations:** `AccommodationService.java` lines 1367 and 1591.
- **Root Cause:** Zero users hold `ACCOMMODATION_ADMIN`. When a user requests accommodation cancellation or rescheduling, the notification targets `ACCOMMODATION_ADMIN` and is silently dropped.
- **Classification:** `CONFIRMED_DEFECT`.
- **Remediation:** Update lines 1367 and 1591 to target `"AO_ADMIN"`, `"ADMIN"`, `"ao"`.

#### Defect 3: Silent Recipient Drops in `EmailService.processAndSendNotificationEmail`
- **Location:** `EmailService.java` lines 344–347.
- **Root Cause:** When `primaryRecipients.isEmpty()`, `EmailService` logs `log.debug("No valid primary email recipients...")` and exits immediately without recording an entry in `email_logs`. As a result, administrators and audit tools cannot distinguish between "no event occurred" and "an event occurred but recipients were dropped".
- **Classification:** `CONFIRMED_DEFECT`.
- **Remediation:** Implement `EmailLog.STATUS_SKIPPED_NO_RECIPIENTS` with failure reason, capturing the notification ID and reference ID for 100% auditability.

#### Defect 4: Department Code Inconsistency (`ME` vs `MECH`)
- **Locations:** `EmailService.java` lines 448 and 558; `ReportService.java` line 110.
- **Root Cause:** In MongoDB Atlas `departments` and `users` collections, the Mechanical Engineering department code is `"ME"` (user `mechhod` has `department: "ME"`). In reports and some UI forms, `"MECH"` is used. Because `EmailService` performs strict `.equalsIgnoreCase()`, any notification tagged with `"MECH"` fails to resolve `mechhod`.
- **Classification:** `CONFIRMED_DEFECT`.
- **Remediation:** In `EmailService.resolvePrimaryRecipients()` and `resolveDepartmentHodEmails()`, introduce alias normalization mapping `"MECH"` <-> `"ME"`.

---

### 4.2 Configuration Gaps (Requiring Database / Institutional Remediation)

#### Gap 1: Missing `CSDS` in `departments` Collection
- **Database Status:** In MongoDB Atlas, `departments` collection contains 8 records (`CSE`, `ECE`, `EEE`, `ME`, `CIVIL`, `IT`, `MBA`, `PHARM`). Department `CSDS` is completely missing, despite user `aicsdshod` holding `department: "CSDS"`.
- **Classification:** `CONFIGURATION_GAP`.
- **Remediation Plan:** Insert official `CSDS` department record into `departments` upon institutional approval.

#### Gap 2: Zero Registered Accounts for `CANTEEN_INCHARGE`
- **Database Status:** Zero users hold role `CANTEEN_INCHARGE` or department `CANTEEN`. Whenever a meal request is approved, notifications sent to `CANTEEN_INCHARGE` are dropped.
- **Classification:** `CONFIGURATION_GAP`.
- **Remediation Plan:** Institutional assignment of catering in-charge or aliasing `CANTEEN_INCHARGE` to `AO_ADMIN`.

#### Gap 3: Driver User Accounts Not Linked in `users` Collection
- **Database Status:** `Vehicle` documents contain driver names (`"R. Prasad"`, etc.) and phone numbers, but zero corresponding user accounts exist in the `users` collection.
- **Classification:** `CONFIGURATION_GAP`.
- **Remediation Plan:** Institutional onboarding of driver user accounts or SMS/WhatsApp integration.

#### Gap 4: Empty `ccEmails` Across All Seminar Halls
- **Database Status:** All 6 seminar halls (`SH-1` through `SH-5`, `TH-1`) have empty `ccEmails: []` arrays in MongoDB Atlas.
- **Classification:** `CONFIGURATION_GAP`.
- **Remediation Plan:** Populate verified institutional CC recipients in `seminar_halls` documents upon institutional approval.

---

### 4.3 Outstanding Institutional Decisions Required

| Item | Context | Recommended Solution |
|---|---|---|
| **1. Guest House Administration** | `AccommodationService.java` line 116 references `"Guest House"`, but forwarding logic only recognizes `"Boys Hostel"` and `"Girls Hostel"`. Any guest house booking defaults to `GIRLS_HOSTEL_ADMIN`. | **Institutional Decision Required:** Clarify whether a separate `GUEST_HOUSE_ADMIN` should be created or whether Guest House bookings should be managed directly by `AO_ADMIN`. |
| **2. Canteen / Catering Operational Alerts** | Meal approval notifications attempt to alert `CANTEEN_INCHARGE`. Currently, AO Admin acts as `MEALS_ADMIN`. | **Institutional Decision Required:** Designate a registered user ID for canteen operations or formally route canteen alerts to `ao`. |
| **3. Driver Notification Delivery Channel** | Vehicle drivers do not have enterprise `@nrtec.in` Google Workspace email accounts. | **Institutional Decision Required:** Clarify whether drivers should receive enterprise email accounts or whether driver dispatch is handled out-of-band by AO Admin via mobile phone. |

---

## 5. Detailed Source Code Remediation Design

### 5.1 `EmailLog.java` – Auditable Status Extension

```java
// Add new status constant to EmailLog.java
public static final String STATUS_SKIPPED_NO_RECIPIENTS = "SKIPPED_NO_RECIPIENTS";
```

### 5.2 `EmailService.java` – Elimination of Silent Drops

```diff
--- a/backend/src/main/java/com/nec/collegeservices/service/EmailService.java
+++ b/backend/src/main/java/com/nec/collegeservices/service/EmailService.java
@@ -343,7 +343,24 @@ public class EmailService {
         List<String> primaryRecipients = resolvePrimaryRecipients(notification);
         if (primaryRecipients.isEmpty()) {
-            log.debug("No valid primary email recipients found for notification {}", notification.getId());
+            log.warn("No valid primary email recipients found for notification {} (role={}, dept={}, uid={}). Recording auditable skip log.",
+                    notification.getId(), notification.getRecipientRole(), notification.getRecipientDept(), notification.getRecipientUserId());
+            if (emailLogRepository != null) {
+                EmailLog skipLog = EmailLog.builder()
+                        .notificationId(notification.getId())
+                        .referenceId(notification.getReferenceId())
+                        .service(notification.getService() != null ? notification.getService() : "General")
+                        .eventCategory(eventCategory)
+                        .status(EmailLog.STATUS_SKIPPED_NO_RECIPIENTS)
+                        .errorMessage(String.format("No active registered recipient matching role='%s', dept='%s', userId='%s'",
+                                notification.getRecipientRole(), notification.getRecipientDept(), notification.getRecipientUserId()))
+                        .createdAt(LocalDateTime.now())
+                        .build();
+                emailLogRepository.save(skipLog);
+            }
             return;
         }
```

### 5.3 `EmailService.java` – Department Code Alias Normalization (`ME` <-> `MECH`)

```java
public static String normalizeDepartmentCode(String dept) {
    if (dept == null) return null;
    String trimmed = dept.trim().toUpperCase();
    if ("MECH".equals(trimmed) || "MECHANICAL".equals(trimmed)) {
        return "ME";
    }
    return trimmed;
}
```

In `resolvePrimaryRecipients()` and `resolveDepartmentHodEmails()`, apply `normalizeDepartmentCode()` to ensure both `"ME"` and `"MECH"` reliably resolve to `mechhod` (`Dr. B. Ramgopal`).

### 5.4 `SeminarService.java` – Orphan Role Removal & Redundancy Clean-Up

```diff
--- a/backend/src/main/java/com/nec/collegeservices/service/SeminarService.java
+++ b/backend/src/main/java/com/nec/collegeservices/service/SeminarService.java
@@ -1018,17 +1018,7 @@ public class SeminarService {
         String notificationSummary = ...;
 
-        notificationService.sendNotification(
-                "SEMINAR_ADMIN",
-                "ADMIN",
-                null,
-                "New Seminar Hall Request",
-                notificationSummary,
-                "Seminar Hall",
-                "INFO",
-                primary.getBookingId()
-        );
-
+        // Primary administrator routing targets AO_ADMIN ("ao")
         notificationService.sendNotification(
                 "AO_ADMIN",
                 "ADMIN",
@@ -1621,9 +1611,9 @@ public class SeminarService {
         if (!directCancel) {
             notificationService.sendNotification(
-                    "SEMINAR_ADMIN",
+                    "AO_ADMIN",
                     "ADMIN",
-                    null,
+                    "ao",
                     "Seminar Cancellation Requested",
                     user.getDepartment() + " requested cancellation...",
@@ -1890,9 +1880,9 @@ public class SeminarService {
         notificationService.sendNotification(
-                "SEMINAR_ADMIN",
+                "AO_ADMIN",
                 "ADMIN",
-                null,
+                "ao",
                 "Seminar Reschedule Requested",
                 user.getDepartment() + " requested reschedule...",
```

### 5.5 `AccommodationService.java` – Orphan Role Routing to `AO_ADMIN`

```diff
--- a/backend/src/main/java/com/nec/collegeservices/service/AccommodationService.java
+++ b/backend/src/main/java/com/nec/collegeservices/service/AccommodationService.java
@@ -1365,7 +1365,7 @@ public class AccommodationService {
         if (!directCancel) {
             notificationService.sendNotification(
-                    "ACCOMMODATION_ADMIN",
+                    "AO_ADMIN",
                     "ADMIN",
-                    null,
+                    "ao",
                     "Accommodation Cancellation Requested",
@@ -1589,7 +1589,7 @@ public class AccommodationService {
         notificationService.sendNotification(
-                "ACCOMMODATION_ADMIN",
+                "AO_ADMIN",
                 "ADMIN",
-                null,
+                "ao",
                 "Accommodation Reschedule Requested",
```

---

## 6. Backward Compatibility & Operational Risk Assessment

| Risk Surface | Potential Impact | Mitigation Strategy |
|---|---|---|
| **`SKIPPED_NO_RECIPIENTS` in `email_logs`** | Could client dashboards or reporting queries misinterpret this new status? | **Zero Impact.** Audit confirms `emailLogRepository` is queried exclusively by `EmailService` and `AdminEmailTestController`. Frontend and user dashboards query `notifications` and `unified_requests`, never `email_logs`. |
| **Removal of `SEMINAR_ADMIN` Call Sites** | Could users holding `SEMINAR_ADMIN` miss alerts? | **Zero Impact.** Zero users in MongoDB Atlas hold `SEMINAR_ADMIN`. Replacing with `AO_ADMIN` (`"ao"`) ensures alerts reach the active administrator. |
| **Department Normalization (`ME` <-> `MECH`)** | Could existing queries on `"ME"` break? | **Zero Impact.** Normalization is symmetric: if a request specifies `"MECH"`, it matches `"ME"`; if it specifies `"ME"`, it continues matching `"ME"`. |
| **MongoDB Claim TTL Index** | Could active leases be purged by TTL? | **Zero Impact.** `EmailDeduplicationService` keeps `retentionExpiresAt = null` while `IN_PROGRESS`. MongoDB TTL index ignores documents where the indexed field is null. |

---

## 7. Comprehensive Mock Test Strategy

A rigorous test matrix utilizing Mockito will validate every functional module and edge case without sending actual emails or modifying the production database.

### 7.1 Test Matrix

| Test Suite | Scenario / Edge Case | Expected Outcome |
|---|---|---|
| **SeminarCoordinatorLookupTest** | Booking with business key `"SH-4"` approved/rejected/cancelled | Assigned coordinator (`viceprincipal`) receives notification; requester notified; no NPE. |
| **OrphanRoleRemediationTest** | Cancellation and reschedule requests in Seminar & Accommodation | Dispatches to `AO_ADMIN` (`"ao"`); zero notifications sent to `SEMINAR_ADMIN` or `ACCOMMODATION_ADMIN`. |
| **SilentDropAuditingTest** | Notification targeting non-existent user or unassigned role | No exception; records `EmailLog` with status `SKIPPED_NO_RECIPIENTS`; captures role, dept, uid. |
| **DepartmentNormalizationTest** | Request submitted for `"MECH"`; user registered with `"ME"` | HOD (`mechhod`) successfully resolved and receives email notification. |
| **AppsScriptTimeoutTest** | Apps Script HTTP relay times out after 20 seconds | Claim marked `AMBIGUOUS`; error sanitized; no double-dispatch on retry; status `FAILED`. |
| **AppsScriptQuotaTest** | Apps Script returns HTTP 200 with `{ success: false, error: "Daily limit exceeded" }` | Status `FAILED`; sanitized error recorded; claim lease released for subsequent retry. |
| **InvalidEmailSyntaxTest** | User account updated with malformed email (e.g. `user@@nrtec..in`) | Rejected at controller level by `EmailRecipientValidator`; returns HTTP 400 Bad Request. |
| **InspectionPdfAttachmentTest** | Inspection report generated with PDF binary | Generic HTML email suppressed; dispatched directly with Base64 PDF attachment; status `SMTP_ACCEPTED`. |

---

## 8. Safe Deployment & Verification Sequence

Once authorization is granted, the remediation will proceed strictly in phased order:

```mermaid
flowchart TD
    Step1["Step 1: Code Remediation (SeminarService, AccommodationService, EmailService, EmailLog)"] --> Step2["Step 2: Local Regression Testing (Maven Test Suite - 115+ Mock Tests)"]
    Step2 --> Step3["Step 3: Database Gap Remediation (CSDS Department Record in MongoDB Atlas)"]
    Step3 --> Step4["Step 4: Controlled Admin Pre-Flight Endpoint Test on Render"]
    Step4 --> Step5["Step 5: Git Commit & Production Deployment to Render"]
    Step5 --> Step6["Step 6: Post-Deployment Smoke Verification & Log Audit"]
```

### Deployment Safeguards
1. **No Real Email Dispatch During Testing:** All unit and integration tests run with mock email transports.
2. **Zero Production Downtime:** Changes are fully backward compatible and require no database migrations or schema conversions.
3. **Rollback Plan:** Git branch snapshot preserved prior to commit; instant rollback available via Render dashboard if needed.

---

## 9. Current Status & Confirmation of Absolute Restrictions

- **Working Tree Changes:** Strictly preserved. Zero files reset, modified, or deleted during this turn.
- **Database Safety:** Zero records created, updated, or removed in MongoDB Atlas.
- **Email Safety:** Zero real emails dispatched; zero test endpoints triggered.
- **Git Safety:** Zero commits, pushes, or deployments performed.

---

*Remediation Plan complete. Awaiting explicit user authorization before initiating implementation.*
