# College Faculty Service Management System — Viva & Technical Defense Guide
**Narasaraopet Engineering College (Autonomous)**

This guide prepares students and engineers for academic viva voce, technical reviews, external examinations, and project demonstrations.

---

## 1. Fast Pitches & Explanations

### 1.1 The 2-Minute Elevator Pitch
> *"Our project is the **College Faculty Service Management System**, designed and implemented for **Narasaraopet Engineering College**. In colleges, academic departments routinely need institutional resources like seminar halls, guest rooms, college buses, stationery, and refreshments for conferences and workshops. Traditionally, these workflows relied on paper requisition slips and verbal phone calls, leading to double-bookings, delayed approvals, and zero visibility.*  
> *We replaced that paper process with a modern, secure web application built on **React 19**, **Spring Boot 3.3.4**, and **MongoDB**. The system provides self-service booking for all 8 departments, isolated admin dashboards for each service manager, and a central command console for the Administrative Officer. It features real-time conflict prevention, dynamic date validation, interactive quick calendars, and in-app notifications. In testing, the application demonstrated 100% test passage with sub-second response times and zero runtime errors."*

---

### 1.2 The 5-Minute Technical Deep-Dive
> *"Architecturally, our system is a **stateless 3-tier enterprise web application**.  
> On the frontend, we use **React 19** with **Vite 8** and **React Router DOM 7**. We implemented global state management using React Context: `AuthContext` holds the session and token, and `NotificationContext` handles real-time alerts. Outgoing requests are automatically tagged with Bearer JWT tokens via Axios interceptors, which also handle global 401 token invalidation.  
> On the backend, we built a RESTful API using **Spring Boot 3.3.4** and **Java 21**. We chose a stateless architecture (`SessionCreationPolicy.STATELESS`) using **Spring Security 6** and **JJWT 0.12.6**. Passwords are encrypted with **BCrypt**, salting each hash to prevent rainbow table attacks. We enforce strict Role-Based Access Control (RBAC) across seven distinct roles: `DEPARTMENT_USER`, `AO_ADMIN`, `SEMINAR_ADMIN`, `ACCOMMODATION_ADMIN`, `TRANSPORT_ADMIN`, `STATIONERY_ADMIN`, and `MEALS_ADMIN`.  
> For data storage, we selected **MongoDB 7.0+** using **Spring Data MongoDB**. This document model gives us flexible storage for multi-item arrays in stationery and catering orders, while compound indexing on `{hallId: 1, date: 1, slot: 1}` ensures algorithmic detection of double-booking attempts. The system also features live search query parameter sync, dynamic calendar date mapping, and campus-wide notice broadcasting."*

---

## 2. Core Architectural Justifications (Why These Technologies?)

### Q1: Why did you choose MongoDB over a traditional SQL database like MySQL or PostgreSQL?
**Answer**:
1. **Hierarchical Document Structures**: Several services require dynamic lists of sub-items within a single request. For example, a stationery request contains an array of `RequestedItem` objects (item ID, name, quantity, unit), and a meal request contains nested `MealItemDetail` records with preferred delivery times. In SQL, this requires multiple normalized tables with foreign key joins; in MongoDB, it is naturally persisted as an embedded document, offering faster reads and simplified writes.
2. **Flexible Schema Evolution**: Administrative attributes (such as facility checklists for seminar halls or amenities for guest rooms) can vary across resources without requiring rigid SQL schema migrations.
3. **Compound Indexing Performance**: MongoDB supports high-speed compound indexes (e.g. `{hallId: 1, date: 1, slot: 1}`), allowing the conflict-detection engine to query slot availability in single-digit milliseconds.

### Q2: Why did you choose JWT instead of standard server-side HTTP session cookies?
**Answer**:
1. **Stateless Scalability**: With JWT, the server does not maintain session memory or server-side state in an `HttpSession`. Every request contains all required identity and role claims inside the cryptographically signed token.
2. **Decoupled Client-Server**: Allows the React frontend (running on port 5173 or an external CDN) to communicate seamlessly with the Spring Boot backend (running on port 8080) across cross-origin boundaries without cookie sharing complications.
3. **Built-in Expiration**: The token payload contains standard `exp` claims (set to 24 hours), which are validated automatically during cryptographic signature verification.

### Q3: Why BCrypt instead of SHA-256 or MD5 for passwords?
**Answer**:
MD5 and SHA-256 are designed for high-speed file checksums, making them vulnerable to modern GPU brute-force attacks (billions of hashes per second). **BCrypt** is an adaptive, salted key derivation function based on the Blowfish cipher. It includes a built-in random salt and a configurable work factor (computational cost), making brute-force and precomputed rainbow table attacks virtually impossible.

---

## 3. Key Technical Challenges & Solutions

| Technical Challenge | Root Cause | Engineering Solution Implemented |
| :--- | :--- | :--- |
| **Seminar Hall Double-Booking** | Multiple departments booking the same hall on the same date/slot concurrently. | Enforced compound indexing `{hallId: 1, date: 1, slot: 1}` in MongoDB and implemented pre-save conflict queries in `SeminarService.java` returning `409 Conflict`. |
| **Hardcoded Static Dates** | UI forms defaulted to old hardcoded date strings (e.g. `2026-09-18`), causing past-date validation failures. | Created centralized `dateUtils.js` module computing dynamic dates (`getTodayStr()`, `getTomorrowStr()`, `getDateOffsetStr()`). |
| **Department Bias in Meals Booking** | Venue defaulted to a hardcoded `"CSE Conference Hall"`. | Updated `SnacksMeals.jsx` to dynamically evaluate the logged-in user's department: `${user?.department} Conference Hall`. |
| **Missing State in Topbar (DEF-01)** | Uncaught `ReferenceError: showUserMenu is not defined` when opening user menu. | Declared missing React state hook: `const [showUserMenu, setShowUserMenu] = useState(false);` in `Topbar.jsx`. |
| **Dead Admin Sidebar Links** | Admin sidebars displayed inactive links (e.g. Meals Inventory, Transport Drivers). | Refactored `Sidebar.jsx` to render only verified, active functional routes for each specific administrative role. |

---

## 4. Probable Viva Questions & Model Answers

### Q4: Explain the request lifecycle from creation to approval.
**Answer**:
A department user submits a requisition form. Client-side validation checks date validity and guest limits before sending a `POST` request to `/api/{service}/requests`. The backend validates the DTO with Jakarta annotations, checks for schedule conflicts, sets status to `PENDING`, and saves it to MongoDB. The designated service administrator (or AO) views the pending queue on their dashboard, inspects details, and triggers `PUT /api/{service}/requests/{id}/approve` (or reject with reason). The database status updates to `APPROVED`, and an in-app notification is dispatched to the requesting department.

### Q5: How do you enforce Department Isolation so one department cannot view another department's requests?
**Answer**:
In `RequestController.java`, the endpoint `/api/requests/my` does not trust client-supplied department parameters. Instead, it extracts the authenticated user from Spring Security's `SecurityContextHolder` via `authService.getCurrentUser()`. It then queries MongoDB strictly using `user.getDepartment()`, guaranteeing that department users only receive their own records.

### Q6: What is the purpose of the Administrative Officer (AO) Super-Admin role?
**Answer**:
While individual service administrators manage only their specific domain (e.g. Transport Admin only handles vehicles), the Administrative Officer oversees campus-wide operations. The AO dashboard provides consolidated KPIs across all 5 services, allows cross-departmental filtering, enables publishing campus notices, and grants master override authority to approve or reject any requisition on campus.

### Q7: How does the global search feature work?
**Answer**:
The `Topbar.jsx` component provides a search input. When submitted, it pushes a URL query parameter `?q=<term>` to `/my-requests` for faculty or `/admin/<service>` for administrators. The destination pages read the query parameter using `useSearchParams()`, populate their local search state, and dispatch filtered API requests to the backend.

### Q8: What happens when an administrator approves a stationery requisition?
**Answer**:
In `StationeryService.java`, the approval method performs an atomic inventory allocation. It iterates through the requested item list and decrements the `stock` count of each corresponding `StationeryItem` in MongoDB, ensuring that real-time stock levels accurately reflect consumed campus supplies.
