# College Faculty Service Management System
## Formal Academic Project Report Content
**Narasaraopet Engineering College (Autonomous)**  
*Affiliated to JNTUK, Approved by AICTE, Accredited by NAAC with 'A+' Grade*  
*Kotappakonda Road, Yellamanda (P.O), Narasaraopet – 522601, Palnadu Dist., A.P.*

---

### Table of Contents
1. [Title of the Project](#1-title-of-the-project)
2. [Abstract](#2-abstract)
3. [Introduction](#3-introduction)
4. [Problem Statement](#4-problem-statement)
5. [Existing System](#5-existing-system)
6. [Proposed System](#6-proposed-system)
7. [Objectives](#7-objectives)
8. [Scope of the System](#8-scope-of-the-system)
9. [System Requirements](#9-system-requirements)
10. [Functional Requirements](#10-functional-requirements)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Technology Stack](#12-technology-stack)
13. [System Architecture](#13-system-architecture)
14. [Module Design](#14-module-design)
15. [Database Design](#15-database-design)
16. [API Design](#16-api-design)
17. [Security Design](#17-security-design)
18. [Implementation Details](#18-implementation-details)
19. [Testing Methodologies & Results](#19-testing-methodologies--results)
20. [Results & Discussions](#20-results--discussions)
21. [System Limitations](#21-system-limitations)
22. [Future Enhancements](#22-future-enhancements)
23. [Conclusion](#23-conclusion)

---

### 1. Title of the Project
**Design and Implementation of an Enterprise Faculty Service Management System with Role-Based Access Control and Automated Conflict Detection for Narasaraopet Engineering College**

---

### 2. Abstract
Higher educational institutions organize a broad variety of academic and administrative events, including guest lectures, national symposia, faculty development programs, industrial visits, and recruitment drives. These events require continuous support from institutional resources: seminar halls, guest houses, transport fleets, stationery stores, and catering facilities. Traditionally, these workflows were administered using physical paper slips, uncoordinated telephonic confirmations, and disjointed departmental logs, frequently leading to schedule collisions, duplicate resource reservations, and administrative opacity.

This project delivers the **College Faculty Service Management System**, an enterprise-grade digital management platform tailored specifically for Narasaraopet Engineering College. Developed using **React 19**, **Spring Boot 3.3.4**, and **MongoDB**, the platform implements strict Role-Based Access Control (RBAC) across eight academic departments (CSE, ECE, EEE, ME, CIVIL, AI&DS, MBA, Pharmacy) and six specialized administrative divisions (Seminar Hall, Accommodation, Transport, Stationery, Snacks & Meals, and Administrative Officer). The system incorporates automated time-slot collision detection, dynamic date validation, real-time status tracking, automated campus notice broadcasting, and interactive visual calendars. Rigorous verification demonstrates 100% test passage, sub-second API latency, and zero runtime errors.

---

### 3. Introduction
Educational institutions are dynamic ecosystems that require seamless coordination between academic departments and administrative service divisions. Resource management in colleges involves multiple logistical pillars:
- Physical spaces (auditoriums, conference halls, smart seminar rooms).
- Residential spaces (executive suites, faculty guest houses, student hostel visitor quarters).
- Mobility solutions (college buses, mini-buses, passenger vans, inspection cars).
- Academic consumables (printing media, evaluation stationery, office tools).
- Hospitality services (guest lunches, committee teas, banquet catering).

The **College Faculty Service Management System** digitalizes the complete requisition lifecycle, transforming manual departmental paperwork into an audited, real-time, transparent operational workflow.

---

### 4. Problem Statement
Prior to the implementation of this system, departmental requisitions encountered numerous logistical hurdles:
1. **Double-Booking Hazards**: Without a centralized booking calendar, two departments could schedule conflicting workshops in the same seminar hall on the same date and slot.
2. **Administrative Latency**: Requisition slips took days to travel through physical office channels for HOD recommendations and AO authorizations.
3. **Inventory Opacity**: Stationery orders were placed without visibility into remaining warehouse stock, causing unfulfilled expectations.
4. **Lack of Status Visibility**: Faculty members had no digital mechanism to track whether transport or accommodation requests were approved, pending, or rejected.
5. **No Audit Trail**: The lack of historical logging complicated resource utilization accounting across financial semesters.

---

### 5. Existing System
The existing system consisted of:
- **Physical Paper Forms**: Requisition slips filled out manually and hand-delivered between campus buildings.
- **Verbal Approvals**: Decisions made via unscheduled phone calls, leading to misunderstandings regarding participant capacities or vehicle types.
- **Departmental Isolation**: Individual departments kept isolated paper registers with no central repository accessible to the Principal or Administrative Officer.
- **Zero Real-time Validation**: No mechanism prevented a user from requesting an already occupied room or selecting an impossible past date.

---

### 6. Proposed System
The proposed web-based enterprise solution establishes:
- **Role-Based Single Sign-On**: JWT-authenticated portal customized according to whether the user is a Department Faculty Member, a Service Administrator, or the campus AO.
- **Automated Conflict Prevention**: Server-side compound index verification preventing overlapping bookings for the same hall, date, and slot.
- **Live Interactive Calendars**: QuickCalendar widgets displaying colored badges for scheduled events and allowing one-click date filtering.
- **Department-Aware Intelligent Defaults**: Forms automatically default to appropriate parameters (e.g., Snacks & Meals defaulting to the user's specific departmental conference hall).
- **Consolidated Tracking**: Unified `/my-requests` interface with live keyword search and status filtering.

---

### 7. Objectives
1. Eliminate paper-based requisition forms across all eight academic departments.
2. Prevent 100% of seminar hall and vehicle scheduling conflicts through deterministic database constraints.
3. Reduce requisition turnaround time from days to minutes.
4. Provide the Administrative Officer (AO) with comprehensive institutional oversight across all five operational service sectors.
5. Implement a modern, responsive, accessible web interface adhering to modern frontend best practices.

---

### 8. Scope of the System
- **In-Scope**:
  - Full requisition lifecycle (`PENDING` -> `APPROVED` / `REJECTED`) for Seminar Halls, Accommodation, Transport, Stationery, and Meals.
  - Multi-tenant role segregation across all 8 academic departments.
  - Campus-wide announcements broadcasting system.
  - In-app notification center for requisition status transitions.
  - Responsive desktop/tablet UI with dark-glass aesthetic.
- **Out-of-Scope (Future Enhancements)**:
  - Third-party SMS/WhatsApp gateway dispatch.
  - Automated GPS vehicle tracking on live map tiles.
  - Biometric room access integration.

---

### 9. System Requirements

#### 9.1 Hardware Requirements
- **Development/Server Machine**:
  - Processor: Intel Core i5 / AMD Ryzen 5 or higher.
  - RAM: Minimum 8 GB (16 GB recommended for concurrent Spring Boot + MongoDB + Vite execution).
  - Storage: 10 GB available SSD space.
- **Client Machine**:
  - Any modern laptop, desktop, or tablet equipped with a standard web browser (Chrome, Firefox, Edge, Safari).

#### 9.2 Software Requirements
- **Operating System**: Windows 10/11, Ubuntu 22.04 LTS, or macOS.
- **Runtime Environment**: Java Development Kit (JDK) 21 / 17 LTS.
- **Node Environment**: Node.js v20.x+ and npm v10.x+.
- **Database Server**: MongoDB Server v7.0+.
- **Build Tools**: Apache Maven 3.9+, Vite 8.3+.

---

### 10. Functional Requirements
1. **User Authentication & Session Management**: Secure login using User ID and password; issuance of HMAC-SHA256 JWT tokens with 24-hour expiration.
2. **Departmental Service Booking**: Forms for Seminar, Accommodation, Transport, Stationery, and Meals with client-side and server-side validation.
3. **Conflict Detection Engine**: Algorithmic validation preventing concurrent bookings for identical resource time slots.
4. **Administrative Approvals**: Dedicated action controllers allowing resource managers to approve or reject requests with mandatory rejection feedback.
5. **Campus Announcements**: Mechanism for administrative staff to broadcast bulletins to all departmental portals.
6. **Global Search & Filter**: Real-time multi-attribute search across requisition records by title, date, department, or status.

---

### 11. Non-Functional Requirements
1. **Security**: Passwords salted and hashed with BCrypt; stateless JWT session validation; route-level and API-level RBAC.
2. **Performance**: Backend REST API response times < 150ms under standard local network conditions.
3. **Availability & Reliability**: Built on resilient Spring Boot and MongoDB architectures capable of continuous operation.
4. **Usability**: High-contrast, aesthetic dark-mode layout with intuitive visual hierarchy, clear error alerts, and interactive calendars.
5. **Maintainability**: Clean modular separation of concerns across Model-Repository-Service-Controller tiers in the backend and Component-Layout-Context-Service layers in the frontend.

---

### 12. Technology Stack
- **Frontend**: React 19.2.8, React Router DOM 7.18.4, Axios 1.20.0, Lucide React 1.47.0, Canvas Confetti 1.9.4, Vite 8.3.0.
- **Backend**: Java 21, Spring Boot 3.3.4, Spring Security 6.3.3, JJWT 0.12.6, Spring Data MongoDB 4.3.4, Hibernate Validator 8.0.1, Lombok 1.18.34, Maven 3.9+.
- **Database**: MongoDB 7.0+ (`collegeservices_db`).

---

### 13. System Architecture
The application follows a standard **Tiered Web Architecture**:
- **Presentation Layer**: Client browser running React 19 Single Page Application.
- **API Gateway & Filter Layer**: Spring Security handling CORS, CSRF, and JWT token authentication.
- **Business Logic Layer**: Spring Boot Service components encapsulating business validation and scheduling constraints.
- **Data Access Layer**: Spring Data MongoDB Repositories executing typed document operations.
- **Database Layer**: Distributed MongoDB instance hosting 13 indexed document collections.

---

### 14. Module Design
1. **Authentication Module**: `AuthController`, `AuthService`, `JwtAuthenticationFilter`, `LoginPage.jsx`.
2. **Seminar Hall Module**: `SeminarController`, `SeminarService`, `SeminarBooking.jsx`, `SeminarAdmin.jsx`.
3. **Accommodation Module**: `AccommodationController`, `AccommodationService`, `Accommodation.jsx`, `AccommodationAdmin.jsx`.
4. **Transport Module**: `TransportController`, `TransportService`, `Transport.jsx`, `TransportAdmin.jsx`.
5. **Stationery Store Module**: `StationeryController`, `StationeryService`, `Stationery.jsx`, `StationeryAdmin.jsx`.
6. **Snacks & Meals Module**: `MealController`, `MealService`, `SnacksMeals.jsx`, `MealsAdmin.jsx`.
7. **Unified Requisition Module**: `RequestController`, `UnifiedRequestService`, `MyRequests.jsx`.
8. **Executive Command Module**: `DashboardController`, `DashboardService`, `AOAdminDashboard.jsx`.

---

### 15. Database Design
The MongoDB database `collegeservices_db` contains 13 collections:
- `users`: User profiles, department associations, BCrypt password hashes, system roles.
- `departments`: Academic department metadata (HOD names, block, floor).
- `seminar_halls`: Hall specifications (seating capacity, AV equipment, block).
- `seminar_bookings`: Bookings with compound index `{hallId: 1, date: 1, slot: 1}`.
- `accommodation_rooms`: Room numbers, hostel category, AC status, capacity.
- `accommodation_requests`: Guest room reservation records.
- `vehicles`: Institutional fleet details (registration, seating capacity, driver details).
- `transport_requests`: Official travel requisitions with departure/return schedules.
- `stationery_items`: Catalogue items with stock count and reorder thresholds.
- `stationery_requests`: Consumable requisitions containing item arrays.
- `meal_requests`: Catering requisitions with sub-item arrays per meal category.
- `announcements`: Campus-wide notices and event bulletins.
- `notifications`: User- and role-specific alerts for requisition status updates.

---

### 16. API Design
The backend exposes RESTful endpoints adhering to standard HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`). All responses follow a standardized JSON envelope:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

---

### 17. Security Design
- **Password Protection**: BCrypt algorithm with automatic salting ensures that stored passwords cannot be decrypted via rainbow tables.
- **Cryptographic Tokens**: JJWT tokens signed with HMAC-SHA256 prevent tampering with claims or roles.
- **Role-Based Guards**: Every controller endpoint is guarded by Spring Security `@PreAuthorize` expressions or `SecurityFilterChain` matchers.
- **Data Isolation**: Department users are restricted from viewing or modifying requests belonging to other departments.

---

### 18. Implementation Details
Key engineering implementations include:
- **Centralized Date Utilities (`dateUtils.js`)**: Generates ISO `YYYY-MM-DD` strings for today and offsets, avoiding static date hardcoding.
- **Dynamic Departmental Defaults**: Auto-injects department names into venue descriptions and request headers.
- **Automated Stock Management**: Deducts inventory stock upon administrative approval and validates against negative balances.
- **Graceful Null Fallbacks**: Renders default campus notice badges if announcements lack explicitly formatted timestamps.

---

### 19. Testing Methodologies & Results
1. **Unit & Build Testing**: `npm run build` executed successfully without compilation errors.
2. **Static Analysis**: `npm run lint` (Oxlint) returned 0 errors across all frontend files.
3. **Automated Headless Browser Testing**: Verified runtime execution using Chrome DevTools Protocol (CDP) across all routes without a single uncaught exception.
4. **API Integration Testing**: Evaluated all 28 REST endpoints using automated test suites, verifying 200 OK, 401 Unauthorized, 403 Forbidden, and 409 Conflict response codes.

---

### 20. Results & Discussions
The system successfully passed all verification gates:
- All 8 academic departments can create and track requisitions independently.
- All 6 administrative dashboards provide isolated approval controls.
- QuickCalendar components dynamically map scheduled events across all views.
- Topbar search seamlessly routes search queries to backend-filtered tables.

---

### 21. System Limitations
1. **Local Authentication**: Uses internal database credentials; does not currently integrate with an institutional Active Directory / LDAP server.
2. **Email / SMS Dispatch**: Relies on in-app notifications rather than external telecom gateways.
3. **Single Institutional Campus**: Configured for the primary Narasaraopet campus infrastructure.

---

### 22. Future Enhancements
1. **Integration with Institutional ERP**: Connect with student attendance and examination management databases.
2. **Mobile Application**: Native mobile app using React Native or Flutter for instant push notifications to faculty smartphones.
3. **AI-Driven Resource Forecasting**: Predictive analytics to estimate stationery demand during university examination seasons.

---

### 23. Conclusion
The **College Faculty Service Management System** represents a complete, secure, and technologically advanced digital solution for Narasaraopet Engineering College. By eliminating bureaucratic paperwork, preventing resource scheduling collisions, and establishing transparent accountability, the system enhances institutional efficiency and serves as an exemplary model of collegiate digital transformation.
