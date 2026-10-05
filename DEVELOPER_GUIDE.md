# College Faculty Service Management System — Developer Guide
**Narasaraopet Engineering College (Autonomous)**

---

## 1. Engineering Principles & Architecture Patterns

The application follows clean architectural principles across both frontend and backend codebases:

### 1.1 Backend Patterns
- **Layered Architecture**: Strict separation of concerns between Controllers (`@RestController`), Services (`@Service`), Repositories (`@Repository`), and Domain Models (`@Document`).
- **Data Transfer Object (DTO) Pattern**: Decouples network request/response shapes from persistent MongoDB documents.
- **Repository Pattern**: Utilizes Spring Data MongoRepository abstractions with derived query methods and compound index annotations.
- **Aspect-Oriented Security**: Declarative method-level authorization with `@PreAuthorize("hasRole('...')")` and centralized filter chains.
- **Standardized API Envelope**: All REST endpoints return generic `ApiResponse<T>` objects ensuring predictable client handling.

### 1.2 Frontend Patterns
- **Single Page Application (SPA)**: Powered by React 19 and React Router DOM v7.
- **Context API for Global State**: `AuthContext` for user session and credentials; `NotificationContext` for real-time alert polling.
- **Centralized API Client**: Axios instance in `api.js` equipped with automatic JWT request injection and global `401 Unauthorized` session cleanup interceptors.
- **Protected Routing**: `ProtectedRoute` wrapper enforcing role-based guard logic before rendering children components.
- **Dynamic Date Generation**: Date math encapsulated in `dateUtils.js` avoiding hardcoded stale dates.

---

## 2. Directory Layout & Key Files

### 2.1 Backend (`/backend`)
```
backend/
├── pom.xml                               # Maven build configuration (Boot 3.3.4, Java 21)
├── src/main/java/com/nec/collegeservices/
│   ├── CollegeServicesApplication.java   # Spring Boot entry point
│   ├── config/
│   │   └── DataSeeder.java               # Initial dataset bootstrap on empty DB
│   ├── controller/                       # REST endpoint controllers
│   │   ├── AuthController.java           # /api/auth/login, /api/auth/me
│   │   ├── SeminarController.java        # /api/seminar/**
│   │   ├── AccommodationController.java  # /api/accommodation/**
│   │   ├── TransportController.java      # /api/transport/**
│   │   ├── StationeryController.java     # /api/stationery/**
│   │   ├── MealController.java           # /api/meals/**
│   │   ├── RequestController.java        # /api/requests/my, /api/requests/all
│   │   ├── DashboardController.java      # /api/dashboard
│   │   ├── AnnouncementController.java   # /api/announcements
│   │   ├── NotificationController.java   # /api/notifications
│   │   └── DepartmentController.java     # /api/departments
│   ├── dto/                              # Request payloads and response wrappers
│   ├── exception/                        # Custom runtime exceptions and handlers
│   ├── model/                            # MongoDB document entities
│   ├── repository/                       # Spring Data Mongo repositories
│   ├── security/                         # JWT filters, UserDetails, SecurityConfig
│   └── service/                          # Business logic, overlap checks, stock deduction
└── src/main/resources/
    └── application.properties            # MongoDB URI, port 8080, JWT secrets
```

### 2.2 Frontend (`/frontend`)
```
frontend/
├── package.json                          # Vite, React 19, Axios, Lucide React
├── vite.config.js                        # Vite bundler plugins and settings
├── src/
│   ├── App.jsx                           # Master route map & role protections
│   ├── main.jsx                          # React DOM mount point
│   ├── components/common/                # Sidebar, Topbar, QuickCalendar, Announcements
│   ├── context/                          # AuthContext, NotificationContext
│   ├── layouts/                          # MainLayout (Sidebar + Topbar container)
│   ├── pages/
│   │   ├── auth/LoginPage.jsx            # Authentication form
│   │   ├── department/                   # 7 Department pages
│   │   └── admin/                        # 6 Admin management pages
│   ├── routes/ProtectedRoute.jsx         # Guard component
│   ├── services/api.js                   # Axios HTTP client
│   └── utils/dateUtils.js                # Centralized date functions
```

---

## 3. How to Add a New Service Pillar

To illustrate developer extension workflows, here is how to add a hypothetical new service (e.g. **Audio-Visual Equipment Service**):

### Step 1: Create the MongoDB Document Model
Create `AVEquipmentRequest.java` in `backend/src/main/java/com/nec/collegeservices/model/`:
```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "av_equipment_requests")
public class AVEquipmentRequest {
    @Id
    private String id;
    @Indexed(unique = true)
    private String requestId;
    private String department;
    private String equipmentType;
    private String date;
    private String status; // PENDING, APPROVED, REJECTED
    private String requestedBy;
}
```

### Step 2: Define the Repository
Create `AVEquipmentRequestRepository.java` in `com.nec.collegeservices.repository`:
```java
public interface AVEquipmentRequestRepository extends MongoRepository<AVEquipmentRequest, String> {
    List<AVEquipmentRequest> findByDepartment(String department);
    List<AVEquipmentRequest> findByDate(String date);
}
```

### Step 3: Implement Business Service
Create `AVEquipmentService.java` implementing validation, status transitions, and notifications.

### Step 4: Expose REST Endpoints
Create `AVEquipmentController.java` with `@PreAuthorize` guards for approvals.

### Step 5: Update Security Rules
In `SecurityConfig.java`, append matcher rules:
```java
.requestMatchers("/api/av/requests/*/approve").hasAnyRole("AO_ADMIN", "AV_ADMIN")
.requestMatchers("/api/av/**").hasAnyRole("AO_ADMIN", "AV_ADMIN", "DEPARTMENT_USER")
```

### Step 6: Frontend API & Views
1. Add endpoints in `frontend/src/services/api.js`.
2. Add departmental booking page in `frontend/src/pages/department/AVBooking.jsx`.
3. Add admin review page in `frontend/src/pages/admin/AVAdmin.jsx`.
4. Register routes in `frontend/src/App.jsx` with `<ProtectedRoute allowedRoles={['...']}>`.
5. Add navigation links to `Sidebar.jsx`.

---

## 4. Coding & Linting Conventions

### 4.1 Frontend Standards
- **Component Design**: Pure functional components with standard React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`).
- **Icons**: Import exclusively from `lucide-react`.
- **CSS Styling**: Maintain curated inline/glassmorphism design system; avoid introducing Tailwind unless requested.
- **Date Handling**: Never use hardcoded strings like `"2026-09-18"` for form defaults. Always import `getTodayStr()` or `getTomorrowStr()` from `dateUtils.js`.
- **Linting**: Execute `npm run lint` before committing. Ensure 0 errors.

### 4.2 Backend Standards
- **Entity Definitions**: Use Project Lombok (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`).
- **Indexing**: Define unique constraints with `@Indexed(unique = true)` and complex lookups with `@CompoundIndex`.
- **Validation**: Enforce inputs with Jakarta annotations (`@NotBlank`, `@NotNull`, `@Min`).
- **Transactions**: For operations modifying multiple collections (e.g. stationery stock deduction + request approval), ensure transactional consistency.

---

## 5. Development & Testing Commands

### 5.1 Local Verification Scripts
All regression and audit scripts reside in `scratch/`:
- `scratch/verify_topbar_fix.mjs`: Tests Topbar rendering, state declaration, and search navigation via Chrome CDP.
- `scratch/test_verification_suite.mjs`: Tests authentication, department isolation, and admin approvals.
- `scratch/capture_previews.mjs`: Captures full-resolution screenshots across all views.

### 5.2 Build & Test Pipeline
```powershell
# Backend compilation & test run
cd backend
mvn clean test
mvn spring-boot:run

# Frontend compilation & linting
cd ../frontend
npm run lint
npm run build
npm run dev
```
