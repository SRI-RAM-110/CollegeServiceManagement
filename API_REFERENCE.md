# College Faculty Service Management System — REST API Reference

This reference documents every verified REST endpoint implemented in the Spring Boot backend (`http://localhost:8080/api`).

All endpoints return responses wrapped in a standard API envelope:
```json
{
  "success": true,
  "message": "Status description",
  "data": { ... }
}
```

---

## 1. Authentication & User Profile APIs

### 1.1 Authenticate User (Login)
- **Endpoint**: `POST /api/auth/login`
- **Authentication**: Public
- **Request Body**:
  ```json
  {
    "userId": "CSE001",
    "password": "deptPassword"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiJ9...",
      "type": "Bearer",
      "userId": "CSE001",
      "name": "CSE Department",
      "role": "DEPARTMENT_USER",
      "department": "CSE"
    }
  }
  ```
- **Error Responses**: `400 Bad Request` (missing fields), `401 Unauthorized` (invalid credentials).

### 1.2 Get Current User Details
- **Endpoint**: `GET /api/auth/me`
- **Authentication**: Required (`Bearer <token>`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Current user details",
    "data": {
      "id": "66e...",
      "userId": "CSE001",
      "name": "CSE Department",
      "role": "DEPARTMENT_USER",
      "department": "CSE",
      "email": "cse@nec.edu.in",
      "phone": "+91 98480 11111",
      "createdAt": "2026-09-24T10:00:00"
    }
  }
  ```

---

## 2. Seminar Hall Booking APIs

### 2.1 Get All Seminar Halls
- **Endpoint**: `GET /api/seminar/halls`
- **Authentication**: Required
- **Success Response (200 OK)**: Returns list of halls (`SH-1`, `SH-2`, `SH-3`, `SH-4`, `TECH-HUB`).

### 2.2 Check Slot Availability
- **Endpoint**: `GET /api/seminar/availability?hallId={hallId}&date={date}`
- **Authentication**: Required
- **Query Parameters**:
  - `hallId` (String, required): e.g. `SH-1`
  - `date` (String, required): `YYYY-MM-DD`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Slot availability",
    "data": {
      "hallId": "SH-1",
      "date": "2026-09-25",
      "availableSlots": ["FORENOON", "AFTERNOON", "FULL_DAY"],
      "bookedSlots": []
    }
  }
  ```

### 2.3 Create Seminar Hall Booking Request
- **Endpoint**: `POST /api/seminar/requests`
- **Authentication**: Required (`DEPARTMENT_USER`, `AO_ADMIN`)
- **Request Body**:
  ```json
  {
    "hallId": "SH-1",
    "date": "2026-09-26",
    "slot": "FORENOON",
    "eventTitle": "AI & ML Workshop",
    "purpose": "Faculty Development Program",
    "expectedParticipants": 120,
    "additionalRequirements": "Projector, AC, Wi-Fi"
  }
  ```
- **Error Responses**: `400 Bad Request` (validation errors), `409 Conflict` (slot already booked).

### 2.4 Get Seminar Booking Requests
- **Endpoint**: `GET /api/seminar/requests`
- **Authentication**: Required
- **Query Parameters**: `hallId`, `department`, `status`, `date` (all optional).
- *Note: Department users are automatically scoped to their own department.*

### 2.5 Approve Seminar Booking
- **Endpoint**: `PUT /api/seminar/requests/{id}/approve`
- **Authentication**: Required (`AO_ADMIN`, `SEMINAR_ADMIN`)
- **Path Parameter**: `id` (String): MongoDB ID or Booking ID.

### 2.6 Reject Seminar Booking
- **Endpoint**: `PUT /api/seminar/requests/{id}/reject`
- **Authentication**: Required (`AO_ADMIN`, `SEMINAR_ADMIN`)
- **Request Body** (Optional):
  ```json
  {
    "reason": "Hall undergoing scheduled electrical maintenance"
  }
  ```

---

## 3. Guest House Accommodation APIs

### 3.1 Get All Rooms
- **Endpoint**: `GET /api/accommodation/rooms`
- **Authentication**: Required
- **Query Parameters**: `hostel` (optional: `Girls Hostel` or `Boys Hostel`).

### 3.2 Create Accommodation Request
- **Endpoint**: `POST /api/accommodation/requests`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "hostel": "Girls Hostel",
    "roomType": "AC Room",
    "roomId": "GH-AC-1",
    "checkInDate": "2026-09-25",
    "checkOutDate": "2026-09-27",
    "guestsCount": 2,
    "facultyOrGuestName": "Dr. K. Sharma",
    "purpose": "External NBA Evaluator",
    "additionalNotes": "Late arrival expected"
  }
  ```

### 3.3 Get Accommodation Requests
- **Endpoint**: `GET /api/accommodation/requests`
- **Authentication**: Required
- **Query Parameters**: `status`, `hostel`, `date`, `department`.

### 3.4 Approve Accommodation Request
- **Endpoint**: `PUT /api/accommodation/requests/{id}/approve`
- **Authentication**: Required (`AO_ADMIN`, `ACCOMMODATION_ADMIN`)

### 3.5 Reject Accommodation Request
- **Endpoint**: `PUT /api/accommodation/requests/{id}/reject`
- **Authentication**: Required (`AO_ADMIN`, `ACCOMMODATION_ADMIN`)
- **Request Body**: `{"reason": "Rooms reserved for institutional accreditation panel"}`

---

## 4. Institutional Transport APIs

### 4.1 Get Vehicle Fleet
- **Endpoint**: `GET /api/transport/vehicles`
- **Authentication**: Required
- **Query Parameters**: `date` (optional: checks availability for date).

### 4.2 Get Trips for Date
- **Endpoint**: `GET /api/transport/trips?date={date}`
- **Authentication**: Required

### 4.3 Add New Vehicle to Fleet
- **Endpoint**: `POST /api/transport/vehicles/add`
- **Authentication**: Required (`AO_ADMIN`, `TRANSPORT_ADMIN`)

### 4.4 Submit Transport Requisition
- **Endpoint**: `POST /api/transport/requests`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "tripType": "College Bus",
    "tripDate": "2026-09-26",
    "roundTrip": true,
    "pickupLocation": "Campus Main Gate",
    "destination": "Guntur Railway Station",
    "purpose": "Student Industrial Visit",
    "departureTime": "08:00 AM",
    "returnTime": "06:00 PM",
    "expectedPassengers": 45,
    "vehicleId": "V-01"
  }
  ```

### 4.5 Get Transport Requests
- **Endpoint**: `GET /api/transport/requests`
- **Authentication**: Required
- **Query Parameters**: `status`, `tripType`, `date`, `department`.

### 4.6 Approve Transport Request
- **Endpoint**: `PUT /api/transport/requests/{id}/approve`
- **Authentication**: Required (`AO_ADMIN`, `TRANSPORT_ADMIN`)

### 4.7 Reject Transport Request
- **Endpoint**: `PUT /api/transport/requests/{id}/reject`
- **Authentication**: Required (`AO_ADMIN`, `TRANSPORT_ADMIN`)
- **Request Body**: `{"reason": "Vehicle scheduled for periodic RTA fitness inspection"}`

---

## 5. Stationery Store APIs

### 5.1 Get Stationery Catalogue
- **Endpoint**: `GET /api/stationery/items`
- **Authentication**: Required

### 5.2 Update Item Stock
- **Endpoint**: `PUT /api/stationery/items/{itemId}/stock`
- **Authentication**: Required (`AO_ADMIN`, `STATIONERY_ADMIN`)
- **Request Body**: `{"stock": 100}`

### 5.3 Submit Stationery Order
- **Endpoint**: `POST /api/stationery/requests`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "itemsRequested": [
      { "itemId": "ST-01", "name": "A4 Paper (500 sheets)", "quantity": 5, "unit": "packs" },
      { "itemId": "ST-03", "name": "Pens (Blue)", "quantity": 20, "unit": "pcs" }
    ],
    "purpose": "Mid-term Examinations",
    "additionalNotes": "Urgent delivery required"
  }
  ```

### 5.4 Get Stationery Requests
- **Endpoint**: `GET /api/stationery/requests`
- **Authentication**: Required
- **Query Parameters**: `status`, `department`.

### 5.5 Approve Stationery Request
- **Endpoint**: `PUT /api/stationery/requests/{id}/approve`
- **Authentication**: Required (`AO_ADMIN`, `STATIONERY_ADMIN`)
- *Action: Approves request and automatically deducts requested quantities from inventory.*

### 5.6 Reject Stationery Request
- **Endpoint**: `PUT /api/stationery/requests/{id}/reject`
- **Authentication**: Required (`AO_ADMIN`, `STATIONERY_ADMIN`)
- **Request Body**: `{"reason": "Exceeds monthly departmental stationery quota"}`

---

## 6. Snacks & Meals Catering APIs

### 6.1 Get Meal Options & Categories
- **Endpoint**: `GET /api/meals/options`
- **Authentication**: Required

### 6.2 Submit Catering Requisition
- **Endpoint**: `POST /api/meals/requests`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "eventTitle": "Board of Studies Meeting",
    "date": "2026-09-25",
    "venue": "CSE Conference Hall",
    "mealTypes": ["Lunch", "Tea / Coffee"],
    "totalGuests": 25,
    "specialRequirements": "Vegetarian meals. South Indian lunch spread.",
    "mealItems": [
      { "mealType": "Lunch", "guestCount": 25, "preferredTime": "01:00 PM" },
      { "mealType": "Tea / Coffee", "guestCount": 25, "preferredTime": "03:30 PM" }
    ]
  }
  ```

### 6.3 Get Meal Requests
- **Endpoint**: `GET /api/meals/requests`
- **Authentication**: Required
- **Query Parameters**: `status`, `mealType`, `date`, `department`.

### 6.4 Approve Meal Request
- **Endpoint**: `PUT /api/meals/requests/{id}/approve`
- **Authentication**: Required (`AO_ADMIN`, `MEALS_ADMIN`)

### 6.5 Reject Meal Request
- **Endpoint**: `PUT /api/meals/requests/{id}/reject`
- **Authentication**: Required (`AO_ADMIN`, `MEALS_ADMIN`)
- **Request Body**: `{"reason": "Canteen catering capacity booked for Annual Day"}`

---

## 7. Unified Tracking, Campus Notices & KPI APIs

### 7.1 Get Department Requests (Unified)
- **Endpoint**: `GET /api/requests/my`
- **Authentication**: Required (`DEPARTMENT_USER`)
- **Query Parameters**: `service`, `status`, `search`.

### 7.2 Get All Institutional Requests (Unified)
- **Endpoint**: `GET /api/requests/all`
- **Authentication**: Required (`AO_ADMIN`)
- **Query Parameters**: `service`, `department`, `status`, `search`.

### 7.3 Get Role-Specific Dashboard Metrics
- **Endpoint**: `GET /api/dashboard`
- **Authentication**: Required

### 7.4 Get Active Announcements
- **Endpoint**: `GET /api/announcements`
- **Authentication**: Required

### 7.5 Create Campus Announcement
- **Endpoint**: `POST /api/announcements`
- **Authentication**: Required (Any Admin Role)
- **Request Body**:
  ```json
  {
    "title": "Semester End Exam Preparation",
    "content": "All departments are advised to submit stationery requirements before Friday.",
    "type": "EXAM",
    "date": "26 Sep 2026"
  }
  ```

### 7.6 Get In-App Notifications
- **Endpoint**: `GET /api/notifications`
- **Authentication**: Required

### 7.7 Mark Notification Read
- **Endpoint**: `PUT /api/notifications/{id}/read`
- **Authentication**: Required

### 7.8 Mark All Notifications Read
- **Endpoint**: `PUT /api/notifications/read-all`
- **Authentication**: Required
