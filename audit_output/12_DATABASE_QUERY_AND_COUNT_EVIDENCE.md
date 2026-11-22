# 12. Database Query and Document Count Evidence

**Audit Date:** November 22, 2026  
**Execution Mode:** STRICTLY READ-ONLY  
**Authoritative Database:** `collegeservices_db`  

---

## 1. Verified Collection Document Counts

The following document counts were queried directly from `collegeservices_db`:

| Collection Name | Document Count | Forensic Significance |
| :--- | :--- | :--- |
| `notifications` | **3,275** | Primary record of in-app notification dispatches. |
| `email_logs` | **1,421** | Primary record of attempted, sent, and failed email dispatches. |
| `users` | **44** | Full registered user account base. |
| `seminar_bookings` | **85** | Booking records for seminar hall requests. |
| `meal_requests` | **55** | Catering and snack service requests. |
| `accommodation_requests` | **52** | Guest room and hostel requests. |
| `stationery_requests` | **51** | Office supply and paper requests. |
| `email_deduplication_claims`| **22** | Phase 2 atomic claim lease documents. |
| `transport_requests` | **18** | Vehicle and bus booking requests. |
| `stationery_items` | **13** | Inventory catalog items. |
| `departments` | **9** | Department definitions (CSE, ECE, EEE, ME, CIVIL, IT, MBA, PHARM, CSDS). |
| `request_id_sequences` | **9** | Monotonic sequence counters for business IDs. |
| `password_reset_tokens` | **8** | Unused and historical password reset tokens. |
| `seminar_halls` | **7** | Seminar hall facility documents (SH-1 through SH-07). |
| `accommodation_rooms` | **6** | Room inventory records. |
| `vehicles` | **5** | College fleet vehicles. |
| `announcements` | **4** | Historical portal broadcast announcements. |
| `seminar_equipment_checklists`| **2** | Equipment inspection checklists. |
| `electrical_issue_requests`| **1** | Electrical repair requests. |
| `seminar_event_inspections`| **0** | Active inspection documents (inspections embedded in bookings/metadata). |
| `push_subscriptions` | **0** | Web push subscriptions. |
| `device_tokens` | **0** | Mobile FCM tokens. |

---

## 2. Aggregation Pipelines & Evidence Queries

### 2.1 Email Log Status Distribution:
```javascript
db.email_logs.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);
// Results:
// SENT: 501
// FAILED: 433
// SMTP_ACCEPTED: 418
// SKIPPED_NO_CREDENTIALS: 38
// SKIPPED_LOCAL_DOMAIN: 31
```

### 2.2 Notification Service Distribution:
```javascript
db.notifications.aggregate([
  { $group: { _id: "$service", count: { $sum: 1 } } }
]);
// Results:
// Snacks & Meals: 1,111
// Accommodation: 991
// Seminar Hall: 695
// Stationery: 260
// Electrical Service: 115
// Transport: 97
// Generator Service: 3
// System: 2
// Seminar Equipment: 1
```

### 2.3 User Role Aggregation:
```javascript
db.users.aggregate([
  { $unwind: "$roles" },
  { $group: { _id: "$roles", count: { $sum: 1 } } }
]);
// Key results:
// DEPARTMENT_USER: 18
// DEPARTMENT_HOD: 9
// SEMINAR_COORDINATOR: 7
// AO_ADMIN: 6
// ACCOMMODATION_ADMIN: 6
// CREATOR: 4
// SEMINAR_ADMIN: 4
// TRANSPORT_ADMIN: 2
// SEMINAR_TECHNICIAN: 2
// STATIONERY_ADMIN: 1
// MEALS_ADMIN: 1
// ELECTRICIAN: 1
// GENERATOR_OPERATOR: 1
```

---
**Verification Statement:** All database counts and pipelines were executed directly against `collegeservices_db` in strictly read-only mode without executing any write commands.
