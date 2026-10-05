# College Faculty Service Management System — Architecture Diagrams Reference
**Narasaraopet Engineering College (Autonomous)**

This document compiles the complete architectural, behavioural, and data model diagrams illustrating the system's design.

---

## 1. Overall System Architecture
Illustrates the 3-tier stateless client-server model across React, Spring Boot, and MongoDB.

```mermaid
graph TB
    subgraph ClientBrowser [Presentation Layer - Client Browser]
        ReactApp[React 19 SPA - Vite 8]
        AuthCtx[AuthContext - JWT in localStorage]
        NotifyCtx[NotificationContext]
        AxiosClient[Axios REST Client with Interceptors]
        ReactApp --> AuthCtx
        ReactApp --> NotifyCtx
        ReactApp --> AxiosClient
    end

    subgraph GatewayLayer [Security & Gateway Layer]
        CORSFilter[CORS Filter - Credentials & Headers]
        JWTAuthFilter[JwtAuthenticationFilter - HMAC-SHA256]
        SecFilterChain[Spring SecurityFilterChain]
        AxiosClient -->|HTTP Authorization: Bearer Token| CORSFilter
        CORSFilter --> JWTAuthFilter
        JWTAuthFilter --> SecFilterChain
    end

    subgraph BackendApp [Application Layer - Spring Boot 3.3.4]
        Controllers[REST Controllers: /api/*]
        Services[Business Logic & Conflict Prevention Services]
        DTOs[Jakarta Validated DTOs]
        SecFilterChain --> Controllers
        Controllers --> DTOs
        Controllers --> Services
    end

    subgraph DataPersistence [Persistence Layer - MongoDB 7.0+]
        SpringDataRepos[Spring Data MongoRepositories]
        MongoDB[(MongoDB: collegeservices_db)]
        Services --> SpringDataRepos
        SpringDataRepos --> MongoDB
    end
```

---

## 2. Authentication & Token Verification Flow
Depicts credential submission, BCrypt validation, JWT generation, and client session storage.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as User (Faculty/Admin)
    participant LoginUI as React LoginPage
    participant AuthCtrl as AuthController
    participant DaoAuth as DaoAuthenticationProvider
    participant UserRepo as UserRepository
    participant BCrypt as BCryptPasswordEncoder
    participant JWT as JwtUtils
    participant Storage as LocalStorage

    Faculty->>LoginUI: Enter User ID & Password
    LoginUI->>AuthCtrl: POST /api/auth/login {userId, password}
    AuthCtrl->>DaoAuth: authenticate(UsernamePasswordAuthenticationToken)
    DaoAuth->>UserRepo: findByUserId(userId)
    UserRepo-->>DaoAuth: Return User entity with hashed password
    DaoAuth->>BCrypt: matches(submittedPassword, storedHash)
    alt Invalid Password
        BCrypt-->>DaoAuth: false
        DaoAuth-->>AuthCtrl: BadCredentialsException
        AuthCtrl-->>LoginUI: 401 Unauthorized ("Invalid credentials")
    else Valid Password
        BCrypt-->>DaoAuth: true
        DaoAuth-->>AuthCtrl: Authentication successful
        AuthCtrl->>JWT: generateJwtToken(userId)
        JWT-->>AuthCtrl: Signed HMAC-SHA256 Token
        AuthCtrl-->>LoginUI: 200 OK {token, userId, role, department}
        LoginUI->>Storage: Store 'token' and 'user'
        LoginUI-->>Faculty: Redirect to Role Dashboard
    end
```

---

## 3. Universal Request Lifecycle
Traces the status transitions from departmental submission to administrative resolution.

```mermaid
stateDiagram-v2
    [*] --> Draft: Faculty opens booking form
    Draft --> PENDING: Submits valid requisition
    
    state PENDING {
        [*] --> InReview
        InReview: Awaiting administrative action
    }

    PENDING --> APPROVED: Service Admin or AO Approves
    PENDING --> REJECTED: Service Admin or AO Declines with Reason

    state APPROVED {
        [*] --> ResourceAllocated
        ResourceAllocated: Hall booked / Stock deducted / Vehicle scheduled
    }

    state REJECTED {
        [*] --> ReasonLogged
        ReasonLogged: Rejection feedback visible to faculty
    }

    APPROVED --> [*]
    REJECTED --> [*]
```

---

## 4. Role-Based Authorization & Boundary Map
Shows the boundaries between Department Users, Domain Admins, and the AO Super Admin.

```mermaid
graph LR
    subgraph DepartmentFaculty [Department Users: CSE, ECE, EEE, ME, CIVIL, AI, MBA, PHARM]
        D_Portal[Department Portal]
        D_Booking[Submit Requisitions]
        D_MyReq[Track /my-requests]
    end

    subgraph ServiceAdmins [Service Administrators]
        S_Sem[Seminar Admin: SEM001]
        S_Acc[Accommodation Admin: ACC001]
        S_Trn[Transport Admin: TRN001]
        S_Sta[Stationery Admin: STA001]
        S_Mea[Meals Admin: MEA001]
    end

    subgraph SuperAdmin [Campus Central Command]
        AO[Administrative Officer: AO001]
    end

    D_Portal -->|Creates Requests| S_Sem
    D_Portal -->|Creates Requests| S_Acc
    D_Portal -->|Creates Requests| S_Trn
    D_Portal -->|Creates Requests| S_Sta
    D_Portal -->|Creates Requests| S_Mea

    S_Sem -->|Approve/Reject| D_MyReq
    S_Acc -->|Approve/Reject| D_MyReq
    S_Trn -->|Approve/Reject| D_MyReq
    S_Sta -->|Approve/Reject| D_MyReq
    S_Mea -->|Approve/Reject| D_MyReq

    AO -.->|Master Oversight & Override| S_Sem
    AO -.->|Master Oversight & Override| S_Acc
    AO -.->|Master Oversight & Override| S_Trn
    AO -.->|Master Oversight & Override| S_Sta
    AO -.->|Master Oversight & Override| S_Mea
    AO -.->|Broadcast Notices| D_Portal
```

---

## 5. Seminar Hall Booking Flow
Illustrates client selection, slot conflict checking via compound index, and approval.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Department User
    participant Form as SeminarBooking.jsx
    participant API as SeminarController
    participant Svc as SeminarService
    participant DB as MongoDB (seminar_bookings)
    actor Admin as Seminar Admin (SEM001)

    Faculty->>Form: Select Hall, Date, Slot, and Title
    Form->>API: GET /api/seminar/availability?hallId=SH-1&date=2026-09-26
    API->>Svc: getAvailability(hallId, date)
    Svc->>DB: Query compound index {hallId, date, slot}
    DB-->>Svc: Return booked slots
    Svc-->>API-->>Form: Return available slots list
    Faculty->>Form: Submit Requisition
    Form->>API: POST /api/seminar/requests
    API->>Svc: createBooking(dto)
    Svc->>DB: Save booking with status 'PENDING'
    DB-->>Svc-->>API-->>Form: Booking confirmed (PENDING)
    Admin->>API: PUT /api/seminar/requests/{id}/approve
    API->>Svc: approveBooking(id)
    Svc->>DB: Update status to 'APPROVED'
    Svc-->>Faculty: Dispatch in-app notification
```

---

## 6. Guest House Accommodation Booking Flow
Shows room selection, check-in/out date calculation, and room reservation.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Department User
    participant UI as Accommodation.jsx
    participant API as AccommodationController
    participant Svc as AccommodationService
    participant DB as MongoDB (accommodation_requests)

    Faculty->>UI: Select Hostel (Girls/Boys) & Room Tier (AC/Non-AC)
    UI->>API: GET /api/accommodation/rooms?hostel=Girls Hostel
    API-->>UI: Return room catalogue
    Faculty->>UI: Select Check-in Date & Check-out Date (default today + 2 days)
    Faculty->>UI: Enter Guest details & Guest count <= capacity
    Faculty->>UI: Submit Request
    UI->>API: POST /api/accommodation/requests
    API->>Svc: createRequest(dto)
    Svc->>DB: Save request (PENDING)
    DB-->>UI: Requisition registered
```

---

## 7. Institutional Transport Requisition Flow
Details vehicle selection, schedule validation, and fleet dispatch.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Department User
    participant UI as Transport.jsx
    participant API as TransportController
    participant Svc as TransportService
    participant DB as MongoDB (transport_requests)

    Faculty->>UI: Select Trip Date, Vehicle Type, Passenger Count
    UI->>API: GET /api/transport/vehicles?date=YYYY-MM-DD
    API-->>UI: Return fleet with date availability status
    Faculty->>UI: Specify pickup, destination, departure & return times
    Faculty->>UI: Submit Request
    UI->>API: POST /api/transport/requests
    API->>Svc: createRequest(dto)
    Svc->>DB: Save transport request (PENDING)
    DB-->>UI: Trip recorded for admin dispatch
```

---

## 8. Departmental Stationery Order Flow
Shows cart assembly, multi-item ordering, and atomic inventory reduction upon approval.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Department User
    participant UI as Stationery.jsx
    participant API as StationeryController
    participant Svc as StationeryService
    participant ItemsDB as MongoDB (stationery_items)
    participant ReqDB as MongoDB (stationery_requests)
    actor Admin as Stationery Admin

    Faculty->>UI: Browse items & add quantities to Cart
    Faculty->>UI: Specify official exam/administrative purpose
    Faculty->>UI: Place Order
    UI->>API: POST /api/stationery/requests
    API->>Svc: createRequest(dto)
    Svc->>ReqDB: Save StationeryRequest (PENDING) with item array
    ReqDB-->>UI: Order submitted
    Admin->>API: PUT /api/stationery/requests/{id}/approve
    API->>Svc: approveRequest(id)
    Svc->>ItemsDB: Deduct approved quantities from current stock
    Svc->>ReqDB: Update status to 'APPROVED'
```

---

## 9. Snacks & Meals Catering Flow
Depicts dynamic venue resolution (`${user.department} Conference Hall`) and meal category breakdown.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Department User (e.g. CSE)
    participant UI as SnacksMeals.jsx
    participant API as MealController
    participant Svc as MealService
    participant DB as MongoDB (meal_requests)
    actor Admin as Meals Admin

    Faculty->>UI: Open Catering Requisition Form
    UI->>UI: Auto-set Venue to "CSE Conference Hall"
    Faculty->>UI: Check Meal Types (Breakfast, Lunch, Tea/Coffee)
    Faculty->>UI: Enter Guest count and delivery times per item
    Faculty->>UI: Submit Catering Request
    UI->>API: POST /api/meals/requests
    API->>Svc: createRequest(dto)
    Svc->>DB: Save MealRequest with status 'PENDING'
    Admin->>API: PUT /api/meals/requests/{id}/approve
    API->>Svc: approveRequest(id)
    Svc->>DB: Update status to 'APPROVED'
```

---

## 10. Database Entity-Relationship Diagram (Document Models)
Presents all primary document structures and relational references in `collegeservices_db`.

```mermaid
erDiagram
    users {
        string id PK
        string userId UK "e.g. CSE001, AO001"
        string password "BCrypt Salted Hash"
        string name
        string role "DEPARTMENT_USER, AO_ADMIN, etc."
        string department "CSE, ECE, ADMIN, etc."
        string email
        string phone
        date createdAt
    }

    seminar_bookings {
        string id PK
        string bookingId UK "e.g. SH-021"
        string department
        string eventTitle
        string date "YYYY-MM-DD"
        string hallId FK "SH-1, SH-2, etc."
        string hallName
        string slot "FORENOON, AFTERNOON, FULL_DAY"
        string status "PENDING, APPROVED, REJECTED"
        string requestedBy
        string rejectionReason
        int expectedParticipants
    }

    accommodation_requests {
        string id PK
        string requestId UK "e.g. AC-015"
        string department
        string hostel "Girls Hostel / Boys Hostel"
        string roomType "AC Room / Non-AC Room"
        string roomId FK "e.g. GH-AC-1"
        string checkInDate "YYYY-MM-DD"
        string checkOutDate "YYYY-MM-DD"
        int guestsCount
        string facultyOrGuestName
        string status "PENDING, APPROVED, REJECTED"
    }

    transport_requests {
        string id PK
        string requestId UK "e.g. TR-021"
        string department
        string tripType "College Bus, Mini Bus, etc."
        string tripDate "YYYY-MM-DD"
        string vehicleId FK "V-01, V-02, etc."
        string departureTime
        string returnTime
        int expectedPassengers
        string status "PENDING, APPROVED, REJECTED"
    }

    stationery_requests {
        string id PK
        string requestId UK "e.g. ST-014"
        string department
        list itemsRequested "Array of {itemId, quantity}"
        string purpose
        string status "PENDING, APPROVED, REJECTED"
    }

    meal_requests {
        string id PK
        string requestId UK "e.g. SM-018"
        string department
        string eventTitle
        string date "YYYY-MM-DD"
        string venue "e.g. CSE Conference Hall"
        list mealTypes "Breakfast, Lunch, etc."
        list mealItems "Array of {mealType, guestCount}"
        int totalGuests
        string status "PENDING, APPROVED, REJECTED"
    }

    announcements {
        string id PK
        string title
        string content
        string type "EVENT, MAINTENANCE, EXAM, URGENT"
        string date
        boolean active
    }

    notifications {
        string id PK
        string recipientRole
        string recipientDept
        string recipientUserId
        string title
        string message
        string service
        boolean read
        date createdAt
    }

    users ||--o{ seminar_bookings : creates
    users ||--o{ accommodation_requests : creates
    users ||--o{ transport_requests : creates
    users ||--o{ stationery_requests : creates
    users ||--o{ meal_requests : creates
    users ||--o{ notifications : receives
```
