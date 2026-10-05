# College Faculty Service Management System — Project Changelog
**Narasaraopet Engineering College (Autonomous)**

All documented releases, audits, remediations, and enhancements are recorded below based on verified project commit and audit history.

---

## [Version 1.0.0] — Final Release & Verification (September 2026)

### Fixed & Remediated
- **Resolved Defect DEF-01 (Topbar Runtime Error)**:
  - Declared missing React state `const [showUserMenu, setShowUserMenu] = useState(false);` in `frontend/src/components/common/Topbar.jsx`.
  - Resolved `Uncaught ReferenceError: showUserMenu is not defined`.
  - Verified user profile dropdown toggling, user information display, and clean sign-out routing with zero console exceptions.
- **Dynamic Date Generation Across All Requisition Forms**:
  - Created centralized utility `frontend/src/utils/dateUtils.js` with `getTodayStr()`, `getTomorrowStr()`, `getDateOffsetStr()`, and `formatDateDisplay()`.
  - Replaced hardcoded static date strings across `SeminarBooking.jsx`, `Accommodation.jsx`, `Transport.jsx`, `SnacksMeals.jsx`, and `StationeryAdmin.jsx`.
  - Enforced dynamic check-in (today) and check-out (today + 2 days) defaults in `Accommodation.jsx`.
  - Enforced dynamic trip date (tomorrow) default in `Transport.jsx`.
- **Department-Aware Catering Venue Resolution**:
  - Eliminated hardcoded `"CSE Conference Hall"` bias in `SnacksMeals.jsx`.
  - Updated venue field to dynamically initialize to `${user?.department} Conference Hall`.
- **Universal AnnouncementsCard Coverage**:
  - Mounted `AnnouncementsCard` across all 13 application views (7 department pages + 6 admin pages).
  - Added defensive null-date fallback in `AnnouncementsCard.jsx` displaying `"Campus Notice"` when backend notices omit explicit calendar dates.
- **Admin Sidebar Route Sanitization**:
  - Refactored `frontend/src/components/common/Sidebar.jsx` to eliminate non-functional dead links.
  - Removed phantom routes: *Meals Inventory*, *Transport Drivers*, *Stationery Suppliers*, and unmapped *Reports/Settings* tabs.
- **QuickCalendar Event Mapping & Interactive Filtering**:
  - Fixed date and slot mapping in `SeminarAdmin.jsx`, `AccommodationAdmin.jsx`, `TransportAdmin.jsx`, and `MealsAdmin.jsx`.
  - Wired `selectedDate` state and `onSelectDate` callback to enable one-click date filtering of administrative action queues.
- **Global Search Route Integration**:
  - Wired Topbar search input to navigate with URL query parameters (`/my-requests?q=...` or `/admin/{service}?q=...`).
  - Added query param extraction via `useSearchParams()` in `MyRequests.jsx`.
- **Administrative Officer Announcement Management**:
  - Added announcement publishing modal in `AOAdminDashboard.jsx` connected to `POST /api/announcements`.

---

## [Version 0.9.0] — Full Application Audit & Quality Verification

### Audited & Verified
- **Frontend Architecture Audit**:
  - Completed comprehensive evaluation of all 13 pages, sidebars, modals, and forms recorded in `FRONTEND_DETAILED_AUDIT_REPORT.md`.
  - Verified role-based routing and protection in `App.jsx` and `ProtectedRoute.jsx`.
- **Backend API & RBAC Audit**:
  - Audited 28 REST endpoints across 11 Spring Boot controllers.
  - Verified department data isolation in `RequestController.java` (`/api/requests/my`).
  - Verified service-specific approval authorization boundaries in `SecurityConfig.java`.
- **Database Schema & Indexing Audit**:
  - Verified 13 MongoDB collections in `collegeservices_db`.
  - Verified compound index `{hallId: 1, date: 1, slot: 1}` on `seminar_bookings`.
  - Verified unique indexes on user IDs and request reference codes.

---

## [Version 0.1.0] — Initial System Inception & Baseline Architecture

### Added
- Initial project scaffolding: Spring Boot 3.3.4 + React 19 + MongoDB.
- Core domain entities: `User`, `Department`, `SeminarHall`, `SeminarBooking`, `AccommodationRoom`, `AccommodationRequest`, `Vehicle`, `TransportRequest`, `StationeryItem`, `StationeryRequest`, `MealRequest`, `Announcement`, `Notification`.
- `DataSeeder.java` populating initial accounts, 8 academic departments, 5 seminar halls, 4 accommodation rooms, 5 vehicles, 12 stationery items, and sample announcements.
- JWT authentication filter and BCrypt password encryption.
