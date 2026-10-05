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
