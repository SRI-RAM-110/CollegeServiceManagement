# College Faculty Service Management System — Database Documentation

**Database Engine**: MongoDB Server (v7.0+)  
**Database Name**: `collegeservices_db`  
**Host & Port**: `localhost:27017`  
**Object-Document Mapper**: Spring Data MongoDB 4.3.4  
**Auto-Index Creation**: Enabled (`spring.data.mongodb.auto-index-creation=true`)

---

## 1. Overview of Collections

The database manages 13 collections structured around institutional service entities and user roles:

| Collection Name | Associated Entity Class | Primary Responsibility |
| :--- | :--- | :--- |
| `users` | `com.nec.collegeservices.model.User` | User identity, department, role, salted password hash |
| `departments` | `com.nec.collegeservices.model.Department` | Academic department metadata and HOD names |
| `seminar_halls` | `com.nec.collegeservices.model.SeminarHall` | Seminar halls, capacities, location, facilities |
| `seminar_bookings` | `com.nec.collegeservices.model.SeminarBooking` | Hall bookings, slot reservations, approval statuses |
| `accommodation_rooms` | `com.nec.collegeservices.model.AccommodationRoom`| Guest house rooms, hostel categories, amenities |
| `accommodation_requests`| `com.nec.collegeservices.model.AccommodationRequest`| Guest room reservations, check-in/out schedules |
| `vehicles` | `com.nec.collegeservices.model.Vehicle` | Institutional buses, vans, passenger capacity |
| `transport_requests` | `com.nec.collegeservices.model.TransportRequest` | Travel requests, pickup/drop times, passenger counts |
| `stationery_items` | `com.nec.collegeservices.model.StationeryItem` | Inventory catalogue, current stock, threshold |
| `stationery_requests` | `com.nec.collegeservices.model.StationeryRequest` | Material requisition orders with item lists |
| `meal_requests` | `com.nec.collegeservices.model.MealRequest` | Catering orders, meal types, guest counts, venues |
| `announcements` | `com.nec.collegeservices.model.Announcement` | Campus notices and administrative bulletins |
| `notifications` | `com.nec.collegeservices.model.Notification` | In-app alerts, unread status, service links |

---

## 2. Collection Schemas & Field Specifications

### 2.1 `users`
Stores user credentials and role definitions for authentication and authorization.
- **Indexes**:
  - `_id`: Default ObjectId index.
  - `userId`: Unique Ascending index (`@Indexed(unique = true)`).
- **Fields**:
  - `id` (String / ObjectId): Unique MongoDB identifier.
  - `userId` (String): Unique identifier (e.g. `CSE001`, `AO001`).
  - `password` (String): BCrypt salted password hash (never plain text).
  - `name` (String): Display name (e.g. "Computer Science & Engineering").
  - `role` (String): Role string (`DEPARTMENT_USER`, `AO_ADMIN`, `SEMINAR_ADMIN`, `ACCOMMODATION_ADMIN`, `TRANSPORT_ADMIN`, `STATIONERY_ADMIN`, `MEALS_ADMIN`).
  - `department` (String): Department code (`CSE`, `ECE`, `EEE`, `ME`, `CIVIL`, `AI`, `MBA`, `PHARM`, `ADMIN`).
  - `email` (String): Official contact email.
  - `phone` (String): Contact phone number.
  - `createdAt` (ISODate): Account creation timestamp.
- **Sample Safe Document**:
  ```json
  {
    "_id": { "$oid": "66e850000000000000000001" },
    "userId": "CSE001",
    "password": "$2a$10$e8w...[SALTED_BCRYPT_HASH]...",
    "name": "CSE Department",
    "role": "DEPARTMENT_USER",
    "department": "CSE",
    "email": "cse@nec.edu.in",
    "phone": "+91 98480 11111",
    "createdAt": { "$date": "2026-09-24T10:00:00Z" }
  }
  ```

---

### 2.2 `seminar_bookings`
Stores reservation records for college seminar halls and auditoriums.
- **Indexes**:
  - `bookingId`: Unique Ascending index (`@Indexed(unique = true)`).
  - Compound Index: `hall_date_slot_idx` on `{ "hallId": 1, "date": 1, "slot": 1 }`.
- **Fields**:
  - `bookingId` (String): Human-readable ID (e.g. `SH-021`).
  - `department` (String): Requesting department code.
  - `eventTitle` (String): Title of event.
  - `purpose` (String): Purpose description.
  - `expectedParticipants` (Integer): Estimated attendees.
  - `additionalRequirements` (String): Notes (e.g. "Audio System, AC, Projector").
  - `date` (String): Event date (`YYYY-MM-DD`).
  - `hallId` (String): Referenced hall ID (`SH-1`, `SH-2`, `SH-3`, `SH-4`, `TECH-HUB`).
  - `hallName` (String): Name of hall.
  - `slot` (String): `FORENOON`, `AFTERNOON`, or `FULL_DAY`.
  - `status` (String): `PENDING`, `APPROVED`, `REJECTED`, or `BOOKED`.
  - `requestedBy` (String): Creator name/dept.
  - `rejectionReason` (String, nullable): Reason provided if rejected.
  - `createdAt` (ISODate), `updatedAt` (ISODate).
- **Sample Safe Document**:
  ```json
  {
    "_id": { "$oid": "66e850000000000000000021" },
    "bookingId": "SH-021",
    "department": "CSE",
    "eventTitle": "Technical Seminar on AI",
    "purpose": "Guest talk on Deep Learning",
    "expectedParticipants": 100,
    "additionalRequirements": "Projector, AC, Wi-Fi",
    "date": "2026-09-26",
    "hallId": "SH-1",
    "hallName": "Seminar Hall 1",
    "slot": "FORENOON",
    "status": "APPROVED",
    "requestedBy": "CSE Department",
    "createdAt": { "$date": "2026-09-24T11:00:00Z" },
    "updatedAt": { "$date": "2026-09-24T11:30:00Z" }
  }
  ```

---

### 2.3 `accommodation_requests`
Stores guest house and room allocation bookings.
- **Indexes**:
  - `requestId`: Unique Ascending index.
- **Fields**:
  - `requestId` (String): e.g. `AC-015`.
  - `department` (String): Requesting department.
  - `facultyOrGuestName` (String): Name of visitor.
  - `hostel` (String): `Girls Hostel` or `Boys Hostel`.
  - `roomType` (String): `AC Room` or `Non-AC Room`.
  - `roomId` (String): e.g. `GH-AC-1`.
  - `checkInDate` (String): `YYYY-MM-DD`.
  - `checkOutDate` (String): `YYYY-MM-DD`.
  - `guestsCount` (Integer): Number of guests.
  - `purpose` (String): Visit justification.
  - `status` (String): `PENDING`, `APPROVED`, or `REJECTED`.
  - `rejectionReason` (String, nullable).
- **Sample Safe Document**:
  ```json
  {
    "_id": { "$oid": "66e850000000000000000031" },
    "requestId": "AC-015",
    "department": "ECE",
    "facultyOrGuestName": "Dr. R. K. Varma",
    "hostel": "Boys Hostel",
    "roomType": "AC Room",
    "roomId": "BH-AC-1",
    "checkInDate": "2026-09-25",
    "checkOutDate": "2026-09-27",
    "guestsCount": 2,
    "purpose": "NBA Accreditation Inspection",
    "status": "APPROVED",
    "requestedBy": "ECE Department",
    "createdAt": { "$date": "2026-09-24T09:00:00Z" }
  }
  ```

---

### 2.4 `transport_requests`
Stores vehicle booking requisitions.
- **Indexes**:
  - `requestId`: Unique Ascending index.
- **Fields**:
  - `requestId` (String): e.g. `TR-021`.
  - `department` (String): Requesting department.
  - `tripType` (String): `College Bus`, `Mini Bus`, `Tempo Traveller`, `Innova`.
  - `tripDate` (String): `YYYY-MM-DD`.
  - `roundTrip` (Boolean): True for round trip.
  - `pickupLocation` (String): Departure origin.
  - `destination` (String): Target location.
  - `purpose` (String): Official purpose.
  - `departureTime` (String): e.g. "08:30 AM".
  - `returnTime` (String): e.g. "05:00 PM".
  - `expectedPassengers` (Integer): Passenger count.
  - `vehicleId` (String): Allocated vehicle ID (e.g. `V-01`).
  - `status` (String): `PENDING`, `APPROVED`, or `REJECTED`.
- **Sample Safe Document**:
  ```json
  {
    "_id": { "$oid": "66e850000000000000000041" },
    "requestId": "TR-021",
    "department": "ME",
    "tripType": "College Bus",
    "tripDate": "2026-09-26",
    "roundTrip": true,
    "pickupLocation": "Main Gate",
    "destination": "NTPC Vijayawada",
    "purpose": "Mechanical Industrial Tour",
    "departureTime": "07:30 AM",
    "returnTime": "07:00 PM",
    "expectedPassengers": 45,
    "vehicleId": "V-01",
    "status": "PENDING",
    "requestedBy": "Mechanical Department",
    "createdAt": { "$date": "2026-09-24T12:00:00Z" }
  }
  ```

---

### 2.5 `stationery_items` & `stationery_requests`
Stores stationery warehouse stock and departmental orders.
- **`stationery_items` Fields**:
  - `itemId` (String): e.g. `ST-01`.
  - `name` (String): e.g. "A4 Paper (500 sheets)".
  - `category` (String): `Paper`, `Writing`, `Office Tools`, `Filing`.
  - `stock` (Integer): Current units available.
  - `unit` (String): `packs`, `pcs`, `boxes`, `sheets`, `cartridges`.
  - `minStockThreshold` (Integer): Alert threshold.
- **`stationery_requests` Fields**:
  - `requestId` (String): e.g. `ST-014`.
  - `department` (String): Requesting department.
  - `itemsRequested` (Array of Subdocuments):
    - `itemId`, `name`, `quantity`, `unit`.
  - `purpose` (String), `status` (String: `PENDING`, `APPROVED`, `REJECTED`).
- **Sample Safe Request Document**:
  ```json
  {
    "_id": { "$oid": "66e850000000000000000051" },
    "requestId": "ST-014",
    "department": "CSE",
    "itemsRequested": [
      { "itemId": "ST-01", "name": "A4 Paper (500 sheets)", "quantity": 5, "unit": "packs" },
      { "itemId": "ST-03", "name": "Pens (Blue)", "quantity": 20, "unit": "pcs" }
    ],
    "purpose": "Internal Assessment Tests",
    "status": "APPROVED",
    "requestedBy": "CSE Department",
    "createdAt": { "$date": "2026-09-24T10:15:00Z" }
  }
  ```

---

### 2.6 `meal_requests`
Stores catering and refreshment orders.
- **Indexes**:
  - `requestId`: Unique Ascending index.
- **Fields**:
  - `requestId` (String): e.g. `SM-018`.
  - `department` (String): Requesting department.
  - `eventTitle` (String): Event description.
  - `date` (String): Delivery date (`YYYY-MM-DD`).
  - `venue` (String): Delivery venue (e.g. "CSE Conference Hall").
  - `mealTypes` (Array of Strings): `["Lunch", "Tea / Coffee"]`.
  - `totalGuests` (Integer): Sum of guests.
  - `specialRequirements` (String): Dietary notes.
  - `mealItems` (Array of Subdocuments):
    - `mealType`, `guestCount`, `preferredTime`, `description`.
  - `status` (String): `PENDING`, `APPROVED`, `REJECTED`.
- **Sample Safe Document**:
  ```json
  {
    "_id": { "$oid": "66e850000000000000000061" },
    "requestId": "SM-018",
    "department": "CSE",
    "eventTitle": "Advisory Board Meeting",
    "date": "2026-09-25",
    "venue": "CSE Conference Hall",
    "mealTypes": ["Lunch", "Tea / Coffee"],
    "totalGuests": 20,
    "specialRequirements": "Vegetarian south Indian thali",
    "mealItems": [
      { "mealType": "Lunch", "guestCount": 20, "preferredTime": "01:00 PM" },
      { "mealType": "Tea / Coffee", "guestCount": 20, "preferredTime": "03:30 PM" }
    ],
    "status": "APPROVED",
    "requestedBy": "CSE Department",
    "createdAt": { "$date": "2026-09-24T08:45:00Z" }
  }
  ```

---

### 2.7 `announcements` & `notifications`
- **`announcements`**:
  - `title`, `content`, `type` (`EVENT`, `MAINTENANCE`, `EXAM`, `URGENT`), `date`, `active` (boolean).
- **`notifications`**:
  - `recipientRole`, `recipientDept`, `recipientUserId`, `title`, `message`, `service`, `type`, `read` (boolean), `referenceId`, `createdAt`.

---

## 3. Database Backup, Snapshot Assets, and Safe Disaster Recovery Procedures

### 3.1 Classification of Existing Backup Assets

The `backups/` directory in the project repository contains the following asset:

* **Path**: `backups/resources_pre_migration_20261101/`
  * `accommodation_rooms.json` (2.7 KB)
  * `seminar_halls.json` (3.4 KB)
  * `stationery_items.json` (4.9 KB)
  * `vehicles.json` (2.2 KB)

> [!IMPORTANT]
> **CLASSIFICATION: PARTIAL STATIC REFERENCE CATALOG ONLY (NOT A COMPLETE DATABASE BACKUP)**  
> This directory contains an export of four static institutional resource catalogs taken on 2026-11-01 before a schema update.
> 
> **CRITICAL RESTRICTION**:
> * It **DOES NOT** contain transactional records or requisitions (`seminar_bookings`, `accommodation_requests`, `transport_requests`, `stationery_requests`, `meal_requests`, `electrical_issues`).
> * It **DOES NOT** contain user accounts or hashed credentials (`users`).
> * It **DOES NOT** contain in-app notification history (`notifications`).
> * It **DOES NOT** contain email delivery logs or audit records (`email_logs`).
> * It **DOES NOT** contain academic department records (`departments`) or campus announcements (`announcements`).
> 
> **NEVER** attempt to restore `backups/resources_pre_migration_20261101/` as a full database restore. Restoring this directory will NOT restore faculty accounts, user requests, booking schedules, or system audit trails.

---

### 3.2 Deprecation and Danger of `mongorestore --drop`

> [!CAUTION]
> **HIGH-RISK COMMAND WARNING: NEVER USE `mongorestore --drop` IN PRODUCTION**  
> The `--drop` command-line flag directs MongoDB to **drop each target collection from the database before restoring documents from the dump archive**.
> 
> **Catastrophic Failure Modes of `--drop`**:
> 1. **Irreversible Data Destruction**: All user accounts, faculty requisitions, booking approvals, and audit entries created after the timestamp of the backup archive are permanently dropped and unrecoverable.
> 2. **Partial Dump Destruction**: If `--drop` is executed with a partial snapshot (such as `resources_pre_migration_20261101/`), all live seminar halls, guest rooms, vehicles, and stationery items will be dropped and replaced with outdated 2026-11-01 records, wiping out newly created coordinators or room configurations.
> 3. **Service Disruption**: Dropping collections destroys live indexes and invalidates query plans, causing immediate errors for connected web and mobile users.
> 
> **POLICY**: The `--drop` flag is strictly deprecated and prohibited for live production operations at Narasaraopeta Engineering College.

---

### 3.3 Safe Multi-Phase Disaster Recovery Protocol

Any database recovery procedure must follow this disciplined, phased protocol. Backup and restore commands must **NEVER** be executed against production without formal written approval from the Administrative Officer (AO) and IT Systems Lead.

```
+---------------------------------------------------------------------------------------------------+
|                            SAFE DISASTER RECOVERY PIPELINE                                        |
|                                                                                                   |
| [1. Validate Archive] ---> [2. Live Safety Dump] ---> [3. Isolated Staging Restore]               |
|                                                                 |                                 |
|                                                                 v                                 |
| [6. Selective Live Merge] <-- [5. Formal Sign-Off] <--- [4. Schema & Count Verification]          |
+---------------------------------------------------------------------------------------------------+
```

#### Step 1: Backup Identification and Completeness Verification
1. Verify the exact backup archive filename, creation timestamp, and SHA-256 checksum.
2. Confirm that the backup contains all 13 required collections if a full recovery is intended, or document the exact sub-collections if performing a selective repair.
3. Test archive integrity without writing to any database:
   ```bash
   mongorestore --gzip --archive="<PATH_TO_BACKUP_ARCHIVE>.gz" --dryRun
   ```

#### Step 2: Capture an Immediate Pre-Recovery Safety Backup
Before executing any write or restore operation against the target environment, take a fresh, immutable snapshot of the existing live database:
```bash
# Capture immediate point-in-time state of the live database
mongodump --uri="<MONGODB_PRODUCTION_URI_PLACEHOLDER>" \
  --gzip \
  --archive="./backups/pre_recovery_safety_dump_$(date +%Y%m%d_%H%M%S).gz"
```

#### Step 3: Restore into an Isolated Verification Database
**NEVER** restore directly into the active production database (`collegeservices_db`). Always restore into an isolated staging namespace using namespace remapping (`--nsFrom` and `--nsTo`):
```bash
# Restore into an isolated temporary database for inspection
mongorestore --uri="<MONGODB_STAGING_URI_PLACEHOLDER>" \
  --nsFrom="collegeservices_db.*" \
  --nsTo="collegeservices_recovery_verify.*" \
  --gzip \
  --archive="<PATH_TO_VERIFIED_BACKUP>.gz"
```

#### Step 4: Verification and Count Comparison
Inspect the restored verification database (`collegeservices_recovery_verify`) and verify:
1. All expected collections are present.
2. Document counts match expectations across all collections.
3. Indexes (including unique constraints on `userId`, `email`, `bookingId`, `requestId`) are intact.
4. Compare representative documents with the pre-recovery safety backup.

#### Step 5: Formal Administrative Sign-Off
Present the verification report (document counts, timestamp, affected collections) to the Administrative Officer (AO) and obtain explicit sign-off before proceeding with any production data modifications.

#### Step 6: Controlled Production Recovery
1. When restoring specific corrupted collections, use targeted collection flags (`--nsInclude`) rather than restoring the entire database.
2. If individual documents must be recovered, prefer exporting specific records from the staging verification database and merging them with surgical update operations.

---

### 3.4 MongoDB Atlas Cloud Backup Verification & Retention Checks

The College Services Management System utilizes MongoDB Atlas for cloud database hosting in production. Note the following operational requirements:

* **Independent Verification Required**: Do not assume that automated cloud backups or continuous point-in-time backups are enabled by default. Backup features depend on the Atlas cluster tier and project configuration.
* **Administrative Console Verification Checklist**:
  1. Log in to the [MongoDB Atlas Console](https://cloud.mongodb.com).
  2. Navigate to **Database Deployments** -> Select your Cluster -> **Backup** tab.
  3. Verify that **Cloud Backup** is active.
  4. Confirm the **Snapshot Schedule**:
     * Daily snapshots retained for a minimum of 7 days (recommended: 30 days).
     * Continuous Cloud Backup / Point-in-Time Restore (PITR) enabled if available on the cluster tier.
  5. Test an on-demand snapshot creation to ensure project permissions are active.

---

### 3.5 Credential and Environment Safety

* All connection strings in operational documentation, scripts, and logs must use placeholders (e.g. `<MONGODB_URI>`, `<USER>`, `<PASSWORD>`).
* Real database credentials, connection URIs, and Atlas admin tokens must **NEVER** be committed to Git, stored in documentation files, or printed in terminal logs.

