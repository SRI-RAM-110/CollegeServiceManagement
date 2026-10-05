# Complete Read-Only UI Layout, Size, Spacing, and Placement Audit Report
**Project:** Narasaraopet Engineering College — Faculty Service Management System  
**Audit Type:** Complete Read-Only Frontend UI/UX, Layout, Dimension, Spacing & Placement Audit  
**Scope:** All 14 Page Views (Department, Admin, Auth), 7 Shared Components, 10 Modular CSS Files + `index.css`  
**Execution Mode:** STRICT READ-ONLY (No source code files modified)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Audit Scope](#2-audit-scope)
3. [Pages Audited](#3-pages-audited)
4. [CSS Files Audited](#4-css-files-audited)
5. [Global Layout Audit](#5-global-layout-audit)
6. [Sidebar Audit](#6-sidebar-audit)
7. [Topbar Audit](#7-topbar-audit)
8. [Department Dashboard Audit](#8-department-dashboard-audit)
9. [Seminar Booking Audit](#9-seminar-booking-audit)
10. [Accommodation Audit](#10-accommodation-audit)
11. [Transport Audit](#11-transport-audit)
12. [Stationery Audit](#12-stationery-audit)
13. [Snacks & Meals Audit](#13-snacks--meals-audit)
14. [My Requests Audit](#14-my-requests-audit)
15. [AO Admin Audit](#15-ao-admin-audit)
16. [Seminar Admin Audit](#16-seminar-admin-audit)
17. [Accommodation Admin Audit](#17-accommodation-admin-audit)
18. [Transport Admin Audit](#18-transport-admin-audit)
19. [Stationery Admin Audit](#19-stationery-admin-audit)
20. [Meals Admin Audit](#20-meals-admin-audit)
21. [Quick Calendar Audit](#21-quick-calendar-audit)
22. [Announcements Audit](#22-announcements-audit)
23. [Forms Audit](#23-forms-audit)
24. [Buttons Audit](#24-buttons-audit)
25. [Tables Audit](#25-tables-audit)
26. [Modals Audit](#26-modals-audit)
27. [Card Size Audit](#27-card-size-audit)
28. [Placement Audit](#28-placement-audit)
29. [Spacing Audit](#29-spacing-audit)
30. [Desktop Responsive Audit (1440px, 1280px, 1024px)](#30-desktop-responsive-audit)
31. [Tablet Responsive Audit (912px, 834px, 768px)](#31-tablet-responsive-audit)
32. [Mobile Responsive Audit (430px, 390px, 375px, 360px)](#32-mobile-responsive-audit)
33. [CSS Conflict & Duplication Audit](#33-css-conflict--duplication-audit)
34. [Component Consistency Matrix](#34-component-consistency-matrix)
35. [Issues by Severity](#35-issues-by-severity)
36. [Recommended CSS Changes](#36-recommended-css-changes)
37. [Files That Would Need Changes](#37-files-that-would-need-changes)
38. [Final Summary](#38-final-summary)

---

## 1. Executive Summary

This comprehensive audit was conducted across the entire frontend repository of the **Narasaraopet Engineering College Faculty Service Management System**. The visual design tokens (the *Arctic Blue Glass* theme) have successfully resolved color vibrancy and contrast. However, an in-depth spatial, layout, sizing, and placement inspection revealed several critical layout defects, selector collisions, and dimension anomalies that impair visual hierarchy and responsive stability.

### Key Findings Summary:
1. **Critical Overflow & Clipping in Accommodation (`Accommodation.jsx` & `cards.css`):**
   The class `.recent-card-panel` was recently introduced with a rigid `max-height: 500px` without `overflow-y: auto`. Furthermore, `<QuickCalendar>` was nested beneath the table within this exact card. Because the table and calendar combined demand ~640px, the calendar overflows and gets clipped. In addition, `.recent-card-panel` is declared twice in `cards.css` without a `:hover` pseudo-selector on the second block, locking the card in a perpetual hover state.
2. **Conflicting Global Layout Definitions (`layout.css` vs `index.css`):**
   `.two-column-layout` is declared in `layout.css` as `grid-template-columns: 1fr 340px; align-items: flex-start;`, but redefined in `index.css` as `grid-template-columns: 2fr 1fr;`. Because `index.css` appears after the `@import` statements, it overrides `layout.css`, destroying the intended fixed-width sidebar column on desktop.
3. **Ghost Table Container Classes (`.custom-table-container` & `.custom-table`):**
   All 7 Department pages wrap tables in `<div className="custom-table-container"><table className="custom-table">`. Neither class has any CSS rules in `tables.css` or `index.css`. Consequently, department tables lack `overflow-x: auto` and rounded glass borders, causing horizontal spill and clipping on viewports $\le 1024\text{px}$.
4. **Calendar Stretched Disproportion in Admin Views (`AOAdminDashboard.jsx` & `StationeryAdmin.jsx`):**
   On AO Admin and Stationery Admin, `<QuickCalendar>` is wrapped in `lg:col-span-2` (occupying ~66% of the screen width, up to 950px). This forces the 7 day columns to stretch to ~130px wide while remaining 38px tall, resulting in flattened, distorted date cells instead of square/balanced calendar buttons.
5. **Severe Vertical Imbalance in Transport (`Transport.jsx`):**
   `Transport.jsx` implements a 3-column layout where Column 1 (Form) is ~600px tall, Column 2 (5 vehicles) is ~380px tall, and Column 3 stacks 4 separate widgets (Trips on Date, Guidelines, Announcements, QuickCalendar) totaling ~1420px tall, leaving over 1000px of dead void below Column 2.
6. **Breakpoint & Z-Index Discrepancy for Mobile Sidebar (`responsive.css` vs `index.css`):**
   `responsive.css` transforms `.app-sidebar` into a drawer at `@media (max-width: 834px)` with `z-index: 100 !important;`, whereas `index.css` specifies `@media (max-width: 768px)` with `z-index: 60 !important;`. The resulting collision causes inconsistent behavior between 768px and 834px.

---

## 2. Audit Scope

| Dimension | Coverage |
| :--- | :--- |
| **Total Pages** | 14 pages (7 Department, 6 Admin, 1 Auth) |
| **Shared Components** | Topbar, Sidebar, MainLayout, QuickCalendar, AnnouncementsCard, StatCard, Modal, StatusBadge |
| **Stylesheets Audited** | 10 modular stylesheets (`variables.css`, `global.css`, `layout.css`, `components.css`, `cards.css`, `forms.css`, `buttons.css`, `tables.css`, `calendar.css`, `responsive.css`) + `index.css` + `App.css` |
| **Viewports Evaluated** | Desktop: 1440×900, 1280×800, 1024×768<br>Tablet: 912×1368, 834×1194, 768×1024<br>Mobile: 430×932, 390×844, 375×812, 360×800 |
| **Inspection Focus** | Width, height, min/max dimensions, padding, margins, gaps, flex/grid alignment, text wrapping, overflow, visual hierarchy |

---

## 3. Pages Audited

1. **Department Dashboard** (`frontend/src/pages/department/DepartmentDashboard.jsx`)
2. **Seminar Hall Booking** (`frontend/src/pages/department/SeminarBooking.jsx`)
3. **Accommodation** (`frontend/src/pages/department/Accommodation.jsx`)
4. **Transport** (`frontend/src/pages/department/Transport.jsx`)
5. **Stationery** (`frontend/src/pages/department/Stationery.jsx`)
6. **Snacks & Meals** (`frontend/src/pages/department/SnacksMeals.jsx`)
7. **My Requests** (`frontend/src/pages/department/MyRequests.jsx`)
8. **Administrative Officer (AO) Dashboard** (`frontend/src/pages/admin/AOAdminDashboard.jsx`)
9. **Seminar Admin** (`frontend/src/pages/admin/SeminarAdmin.jsx`)
10. **Accommodation Admin** (`frontend/src/pages/admin/AccommodationAdmin.jsx`)
11. **Transport Admin** (`frontend/src/pages/admin/TransportAdmin.jsx`)
12. **Stationery Admin** (`frontend/src/pages/admin/StationeryAdmin.jsx`)
13. **Meals Admin** (`frontend/src/pages/admin/MealsAdmin.jsx`)
14. **Login Portal** (`frontend/src/pages/auth/LoginPage.jsx`)

---

## 4. CSS Files Audited

| File | Lines | Primary Responsibility | Primary Layout / Sizing Findings |
| :--- | :--- | :--- | :--- |
| `variables.css` | 102 | Central Design Tokens | Good radii & glass tokens; `--glass-blur: blur(18px)`. No standard layout width tokens. |
| `global.css` | 160 | Reset, Typography, Utilities | Sets `font-size: 16px`, `box-sizing: border-box`, standard flex utilities (`gap-sm`, `gap-md`, `gap-lg`). |
| `layout.css` | 243 | Core Layout Containers, Banners | Defines `.page-banner` (padding: 26px 32px), `.two-column-layout` (`1fr 340px`), `.column-stack`. |
| `components.css` | 1054 | Topbar, Sidebar, Modal, Announcements, Login | Defines `.topbar-header` (height: 60px), `.app-sidebar` (width: 270px), `.announcements-card` (`max-height: 450px`). |
| `cards.css` | 928 | Stat cards, Grid catalogs, Panels | Contains duplicate `.recent-card-panel` with hardcoded `max-height: 500px`. Defines `.stat-card-gradient` (`min-height: 105px`). |
| `forms.css` | 229 | Inputs, Textareas, Selects, Filters | Standard input padding: 10px 14px; `.filter-search-input` height: 38px. `.form-row-2col` `1fr 1fr`. |
| `buttons.css` | 157 | Button sizing and states | `.btn`: padding: 10px 18px; `.btn-sm`: 6px 12px; `.btn-lg`: 12px 24px. Good touch sizing. |
| `tables.css` | 130 | Table and badge rules | Defines `.table-container` with `overflow-x: auto`. Missing `.custom-table-container` and `.custom-table`. |
| `calendar.css` | 273 | Quick Calendar layout & grid | Weekday & day grid `repeat(7, 1fr)`. Day button `min-height: 38px`. No max-width on `.calendar-card`. |
| `responsive.css` | 173 | Breakpoints: 1280, 1024, 834, 640, 390 | Media queries for responsive drawer, font sizes, grid reductions. Clashes with `index.css`. |
| `index.css` | 421 | Master stylesheet & utility classes | Overrides `.two-column-layout` to `2fr 1fr`; overrides `.app-sidebar` at 768px with `z-index: 60 !important;`. |
| `App.css` | 185 | Unused Vite boilerplate | Not imported anywhere in `main.jsx` or `App.jsx`. Dead file. |

---

## 5. Global Layout Audit

- **Root Structure:**
  `MainLayout.jsx` renders `.main-layout-container` (`display: flex; min-height: 100vh; position: relative;`).
- **Content Wrapper:**
  `.main-layout-content-wrapper` (`flex: 1; display: flex; flex-direction: column; min-width: 0;`). The `min-width: 0` is correctly implemented to allow internal flex items to truncate and avoid flexbox overflow blowout.
- **Main Viewport:**
  `.main-content-layout` (`flex: 1; padding: 24px 30px; overflow-y: auto;`).
  - *Finding G-01:* Padding on desktop is `24px 30px`. At 1280px it drops to `20px 24px`. At 834px in `responsive.css` it drops to `16px 18px`. However, `index.css` at line 319 has `@media (max-width: 768px) { .main-content-layout { padding: 16px !important; } }`. The `!important` rule overrides the 640px rule (`padding: 14px 12px`), causing mobile screens to retain excessive 16px padding on tiny 360px viewports.
- **Page Hero Banners:**
  `.page-banner, .welcome-banner` have `padding: 26px 32px; border-radius: var(--radius-lg); margin-bottom: 24px;`.
  - Content on left: title (1.75rem, font-weight: 800), subtitle (0.92rem), quote (0.86rem).
  - Meta on right: `.page-banner-badge` and `.banner-tagline`.
  - *Finding G-02:* On viewports between 834px and 1024px, the quote and tagline wrap aggressively into 3-4 narrow vertical lines when long titles are present.

---

## 6. Sidebar Audit

- **Desktop Placement & Dimensions:**
  - Width: `270px; min-width: 270px;` (Fixed width).
  - Height: `100vh; position: sticky; top: 0;`
  - Overflow: `overflow-y: auto`.
- **Emblem & Branding:**
  - Emblem circle: `46px × 46px; border-radius: 50%;` centered with Lucide `ShieldCheck (26px)`.
  - Title: `.sidebar-title` (`font-size: 0.98rem; font-weight: 800;`).
  - Subtitle: `.sidebar-subtitle` (`font-size: 0.85rem; font-weight: 700;`).
  - Tagline: `.sidebar-tagline` (`font-size: 0.7rem; letter-spacing: 0.02em;`).
  - Total header padding: `24px 20px; border-bottom: 1px solid var(--glass-border);`.
- **Navigation Links:**
  - Links: `padding: 11px 16px; border-radius: var(--radius-sm); font-size: 0.88rem; gap: 14px;`.
  - List gap: `gap: 6px;` inside `.sidebar-nav-container` (`padding: 16px 14px; flex: 1;`).
  - Active state: Subtle Arctic gradient with 1px border and 20px blue glow shadow.
- **Footer Placement:**
  - `.sidebar-footer`: `margin: 14px; padding: 16px; border-radius: var(--radius-md);`.
  - Text: quote 0.82rem, description 0.72rem.
- **Mobile Drawer Behavior:**
  - Backdrop: `.mobile-drawer-backdrop` (`position: fixed; inset: 0; z-index: 45;`).
  - Drawer transformation:
    - In `responsive.css` (line 50): `@media (max-width: 834px) { position: fixed !important; z-index: 100 !important; transform: translateX(-100%); }`
    - In `index.css` (line 306): `@media (max-width: 768px) { position: fixed !important; z-index: 60 !important; transform: translateX(-100%); }`
  - *Finding SB-01 (Severity: HIGH):* Dual media queries create conflicting z-index values (`z-index: 100` vs `z-index: 60`). When a Modal (`z-index: 100`) is active, the sidebar drawer behavior varies erratically depending on screen width.

---

## 7. Topbar Audit

- **Header Dimensions:**
  - Height: `60px;` (Recently adjusted from 68px).
  - Positioning: `position: sticky; top: 0; z-index: 30;`.
  - Horizontal padding: `padding: 0 24px;` (desktop), `0 18px` ($\le 1024\text{px}$), `0 12px` ($\le 640\text{px}$), `0 10px` ($\le 390\text{px}$).
- **Search Component:**
  - Form: `position: relative; width: 100%; max-width: 420px;`.
  - Input: `.topbar-search-input` (`height: 40px !important; border-radius: var(--radius-pill) !important; padding-left: 42px !important; font-size: 0.86rem;`).
  - Search Icon: Lucide `Search (18px)` positioned at `left: 14px; top: 50%; -translate-y-1/2`.
  - *Finding TB-01:* On tablet viewports between 640px and 768px, the 420px search bar + user profile pill + notification bell exceed the available container width, causing the user name to truncate prematurely or crowd the bell button.
  - On $\le 640\text{px}$: `.topbar-search-form { display: none; }` is correctly triggered, collapsing the search.
- **Notifications Flyout:**
  - Flyout dimensions: `width: 360px; max-height: 440px; position: absolute; top: 50px; right: 0; z-index: 60;`.
  - Internal list: `max-height: 350px; overflow-y: auto;`.
  - Header: `padding: 14px 18px;`.
- **User Profile Pill & Menu:**
  - Pill: `padding: 5px 14px 5px 6px; border-radius: var(--radius-pill); gap: 12px;`.
  - Avatar: `width: 34px; height: 34px; border-radius: 50%; font-size: 0.9rem;`.
  - Text block: Name (0.84rem, font-weight: 600) + Role (0.68rem, uppercase).
  - Dropdown: `width: 220px; top: 48px; right: 0; z-index: 60; padding: 6px;`.
  - On $\le 640\text{px}$: `.user-menu-pill span { display: none; }` collapses text and preserves only the 34px avatar. Excellent space management.

---

## 8. Department Dashboard Audit

- **Layout Structure:**
  Banner $\to$ Service Cards Grid (5 cards) $\to$ `.two-column-layout` (Left: 2 Tables; Right: QuickCalendar + Announcements).
- **Service Cards Grid:**
  - Class: `.service-cards-grid` (`display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;`).
  - On 1440px+: 5 columns in a single balanced horizontal row.
  - Between 1024px and 1280px: 5 cards break into a 3-card top row and a 2-card bottom row with stretched items.
  - *Finding DD-01:* The `minmax(200px, 1fr)` causes the bottom 2 cards to stretch to 1.5× the width of the top 3 cards when wrapped at ~1150px.
- **Two Column Layout & Tables:**
  - Left Column: Upcoming Events Table + Recent Requests Table.
  - Right Column: QuickCalendar + AnnouncementsCard.
  - Both tables are rendered inside `<div className="custom-table-container">`.
  - *Finding DD-02 (Severity: HIGH):* `.custom-table-container` is an unstyled class. On viewports below 1100px, the 5 columns of Upcoming Bookings (`Date`, `Service`, `Details`, `Status`, `Action`) compress until `Details` truncates severely or forces cell wrapping, because no `overflow-x: auto` is supplied by the container.
- **Visual Balance:**
  - Height of Left Column: Two cards with tables (~500px).
  - Height of Right Column: QuickCalendar (~430px) + AnnouncementsCard (~380px) = ~810px.
  - *Finding DD-03:* The right column exceeds the left column height by ~310px on typical dashboard loads, leaving the left column with bottom empty space unless requests list exceeds 6 items.

---

## 9. Seminar Hall Booking Audit

- **Layout Structure:**
  Banner $\to$ Filter Card (Dates + Hall select) $\to$ Available Slots Panel (3 slot cards) $\to$ `.two-column-layout` (Left: Booking Form; Right: Bookings for Selected Date Table).
- **Filter Card Sizing:**
  - Form grid: `.filter-card-grid-3col` (`grid-template-columns: 1.2fr 1.8fr auto; gap: 24px; align-items: flex-end;`).
  - Date inputs: `.date-range-row` (`display: flex; gap: 10px;`).
  - Check Availability button: aligned to bottom baseline.
- **Slot Selection Cards:**
  - Container: `.slot-grid` (`display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 12px;`).
  - Cards: `.slot-card` (`padding: 20px; border-radius: var(--radius-md); min-height: 120px;`).
  - Elements: Slot name + Status badge on top row, time range (0.82rem) in middle, selection indicator at bottom.
  - *Finding SB-02:* On tablet devices ($\le 834\text{px}$), the 3-column slot grid does not collapse into 1 column unless responsive utilities are added, squeezing each slot card to under 160px and causing the time range "12:00 PM – 04:00 PM" to wrap into 2 lines.
- **Bottom Two Column Balance:**
  - Left Form: 5 vertical inputs (`Event Title`, `Purpose` textarea, `Expected Participants`, `Additional Requirements`, `Preferred Slot`) + Action Buttons row. Total height: ~480px.
  - Right Table: Bookings on Selected Date. When 0 bookings are present, table height is only ~140px, causing a 340px vertical imbalance.

---

## 10. Accommodation Audit

- **Layout Structure:**
  Banner $\to$ Hostel Cards Grid $\to$ Room Selection Grid $\to$ Two-Column Layout (Left: Recent Requests + QuickCalendar; Right: Booking Form + Guidelines + Announcements).
- **CRITICAL DEFECT AC-01 (Severity: CRITICAL):**
  In the user's latest modification to `Accommodation.jsx` (lines 260-331), `<QuickCalendar>` was added *inside* `<div className="recent-card-panel">` directly below the table container:
  ```jsx
  <div className="recent-card-panel">
    <div className="card-header">...</div>
    <div className="custom-table-container">...</div>
    <QuickCalendar ... />
  </div>
  ```
  In `cards.css` (lines 26-42), `.recent-card-panel` was defined with:
  ```css
  .recent-card-panel {
    max-height: 500px;
    ...
  }
  ```
  - The table with 4 rows is ~220px tall.
  - `QuickCalendar` is ~430px tall.
  - Total nested content height is ~650px.
  - Because `.recent-card-panel` has `max-height: 500px` and **no `overflow-y: auto`**, the QuickCalendar is severely clipped and overflows out of the card boundary!
- **CSS SELECTOR DEFECT AC-02 (Severity: HIGH):**
  In `cards.css` lines 38-42, the hover state for `.recent-card-panel` was written without `:hover`:
  ```css
  .recent-card-panel {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32), 0 0 20px rgba(77, 163, 255, 0.10);
  }
  ```
  This immediately overrides the default glass background, causing the panel to remain stuck in an active hover style continuously.
- **Right Column Over-Density:**
  With QuickCalendar moved to the left, the right column contains the Request Form (~450px) + Guidelines Card (~180px) + AnnouncementsCard (~450px) = ~1080px. The left column (if calendar was properly displayed) would be ~650px, maintaining an imbalance.

---

## 11. Transport Audit

- **Layout Structure:**
  Banner $\to$ 3 Stat Cards (`.stat-grid-3`) $\to$ `.three-column-layout` (Col 1: Form; Col 2: Available Vehicles; Col 3: Trips on Date + Guidelines + Announcements + QuickCalendar) $\to$ Bottom Table.
- **Column 3 Vertical Overload (`Transport.jsx` lines 407-485):**
  - Col 1 (Form): 10 form fields + actions $\approx 640\text{px}$.
  - Col 2 (Vehicles): 5 vehicles in vertical list $\approx 420\text{px}$.
  - Col 3:
    1. Trips on Selected Date (`.trips-scroll-list`, max-height 280px) $\approx 320\text{px}$.
    2. Transport Guidelines card $\approx 190\text{px}$.
    3. Announcements card (`max-height: 450px`) $\approx 450\text{px}$.
    4. QuickCalendar card $\approx 430\text{px}$.
    - **Total Column 3 Height:** $320 + 190 + 450 + 430 = \mathbf{1390\text{px}}$.
  - *Finding TR-01 (Severity: HIGH):* Column 3 is more than $3.3\times$ taller than Column 2 ($1390\text{px}$ vs $420\text{px}$). This creates a $970\text{px}$ empty canyon directly beneath Column 2 on all desktop viewports $> 1200\text{px}$.
- **Responsive Collapse Abruptness:**
  In `index.css` line 361:
  ```css
  @media (max-width: 1200px) {
    .three-column-layout {
      grid-template-columns: 1fr !important;
    }
  }
  ```
  *Finding TR-02:* At 1199px (standard small laptop screen), the layout collapses directly from 3 columns to 1 single column, causing the user to scroll through a staggering ~2800px vertical page without an intermediate 2-column state.

---

## 12. Stationery Audit

- **Layout Structure:**
  Banner $\to$ 4 Stat Cards (`.stat-grid-4`) $\to$ `.two-column-layout` (Left: Catalog Grid; Right: Cart + Guidelines + Announcements + QuickCalendar) $\to$ Recent Stationery Requests Table.
- **Catalog Grid Density (`Stationery.jsx` line 251):**
  - Grid: `.stationery-grid` (`grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;`).
  - Item Card: `.stationery-item-card` (`padding: 16px; min-height: 200px; text-align: center;`).
  - Icon box: `64px × 64px; border-radius: var(--radius-md);`.
  - Button: `btn-sm w-full mt-2`.
  - *Finding ST-01:* Sizing and alignment of catalog cards are well proportioned on wide screens. However, when 20+ items are rendered, the catalog height easily reaches 1200px, which balances the right column's stacked widgets (Cart + Guidelines + Announcements + QuickCalendar $\approx 1250\text{px}$).
- **Cart Items Scroll:**
  - Class: `.cart-items-scroll` (`max-height: 250px; overflow-y: auto;`).
  - *Finding ST-02:* Quantity control buttons (`.cart-qty-btn`) are `24px × 24px`. On touch devices, 24px falls well below the 44px recommended touch target, making item quantity increments difficult on mobile.

---

## 13. Snacks & Meals Audit

- **Layout Structure:**
  Banner $\to$ 4 Stat Cards (`.stat-grid-4`) $\to$ Select Meal Types Panel (5 horizontal cards) $\to$ `.two-column-layout` (Left: Event Form; Right: Selected Meals + Guidelines + Announcements + QuickCalendar) $\to$ Recent Meal Requests Table.
- **Meal Types Grid Sizing (`SnacksMeals.jsx` lines 312-342):**
  - Grid: `.meal-types-grid` (`display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;`).
  - Card: `.meal-type-card` (`padding: 16px; border: 2px solid var(--glass-border);`).
  - Icon: 54px circular box with Lucide `Utensils (24px)`.
  - Checkbox indicator: 20px × 20px badge at `top: 12px; left: 12px;`.
  - *Finding SM-01:* The 5 meal cards render cleanly in a single row on screens $\ge 1280\text{px}$. On 1024px screens, they wrap to 3 top and 2 bottom (stretched).
- **Responsive Form Grid:**
  - Class: `.responsive-form-grid-2` (`display: grid; grid-template-columns: 1fr 1fr; gap: 12px;`).
  - Correctly collapses to 1 column at $\le 640\text{px}$.
- **Right Column Stacking:**
  - Selected Meals List + Guidelines + AnnouncementsCard + QuickCalendar $\approx 1200\text{px}$.
  - Left Form: $\approx 540\text{px}$.
  - Creates a ~660px vertical discrepancy between left and right columns.

---

## 14. My Requests Audit

- **Layout Structure:**
  Banner $\to$ Service Tabs Pills Bar $\to$ `.two-column-layout` (Left: Filter Toolbar + Full Requests Table; Right: AnnouncementsCard + QuickCalendar).
- **Filter Toolbar Sizing (`MyRequests.jsx` lines 116-144):**
  - Toolbar: `.filter-toolbar` (`display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;`).
  - Search Form: `.filter-search-form` (`position: relative; width: 320px;`).
  - Search Input: `.filter-search-input` (`height: 38px !important; padding-left: 38px !important;`).
  - Select Filter: `.filter-select` (`height: 38px !important; width: 140px !important;`).
- **Table Sizing & Column Spacing:**
  - 6 Columns: `Request ID`, `Date`, `Service`, `Details`, `Status`, `Action`.
  - `.table-cell-desc` has `max-width: 320px;`.
  - *Finding MR-01:* In the 2-column layout on desktop, the left column width is ~65% of screen width (~700px on a 1280px display). A 6-column table with a 320px details column requires at least 680px minimum width. Any screen width reduction below 1200px immediately squeezes the `Action` button and causes text wrapping in `Service` badge.
  - Because it uses `.custom-table-container` (which lacks `overflow-x: auto`), horizontal scroll is not triggered; instead, cells compress awkwardly.

---

## 15. AO Admin Audit

- **Layout Structure:**
  Header with Super Admin Badge $\to$ Primary KPI Stats (4 cards) $\to$ Service Statistics Grid (5 cards) $\to$ 3-Column Grid (Service Volume Breakdown 2 cols; Quick Management links 1 col) $\to$ 3-Column Grid (QuickCalendar 2 cols; Notices & Operations 1 col) $\to$ Master Requests Register Table.
- **Calendar Distortion (`AOAdminDashboard.jsx` lines 434-448):**
  - Container: `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">` with `<div className="lg:col-span-2">` wrapping `<QuickCalendar>`.
  - *Finding AO-01 (Severity: HIGH):* On a 1440px viewport, `lg:col-span-2` is **~890px wide**.
  - `QuickCalendar` is designed with `.calendar-days-grid` (`grid-template-columns: repeat(7, 1fr)`).
  - An 890px container means each of the 7 day cells is **~122px wide**, but the button height remains `min-height: 38px`.
  - This results in day buttons that are long, flat horizontal bars ($122\text{px} \times 38\text{px}$, aspect ratio > 3:1) rather than balanced, square calendar cells. Event dots are shifted to the left edge of the wide bar.
- **Service Statistics Cards (5 Cards):**
  - Class: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5`.
  - Padding: `p-4; border-radius: 12px;`.
  - Displays icon, service name, request count, and pending badge.
  - Visual density and spacing are well balanced.
- **Master Requests Table:**
  - Wrapped in `<div className="overflow-x-auto border border-slate-800/80 rounded-lg">`.
  - Unlike Department pages, horizontal overflow scrolling works properly here because `.overflow-x-auto` is explicitly provided.

---

## 16. Seminar Admin Audit

- **Layout Structure:**
  Header $\to$ 4 Stat Cards (`grid-cols-4`) $\to$ 3-Column Grid:
  - Left (2 cols): Hall & Slot Availability panel with date picker and 2-column hall cards.
  - Right (1 col): QuickCalendar + AnnouncementsCard.
  $\to$ Full-width Requests Table with Search and Status Filter.
- **Sizing Evaluation:**
  - Sizing in `SeminarAdmin.jsx` is balanced. QuickCalendar is placed in `1 col` (~360px), which gives its day cells a nearly square aspect ratio (~46px × 38px).
  - Slot availability cards inside the left column: 2-column grid (`grid-cols-1 md:grid-cols-2 gap-3.5`). Each hall card displays name, capacity, and 3 slots (`Forenoon`, `Afternoon`, `Full Day`).
  - Table: 8 columns with action buttons (`Approve`, `Reject`, `View`).
  - Sizing and alignment are clean across all desktop widths.

---

## 17. Accommodation Admin Audit

- **Layout Structure:**
  Header $\to$ 4 Stat Cards $\to$ 3-Column Grid:
  - Left (2 cols): Room Availability & Capacity (with progress bars) + Today's Check-ins & Check-outs.
  - Right (1 col): QuickCalendar + AnnouncementsCard.
  $\to$ Full-width Requests Table.
- **Sizing Evaluation:**
  - Room occupancy bars: `.progress-fill` with dynamic `--progress-width`. Bar height: `h-2` (8px). Well proportioned.
  - Today's Check-ins & Check-outs panels: 2 equal sub-columns (`grid-cols-1 sm:grid-cols-2 gap-4`).
  - QuickCalendar: 1 column (~360px). Maintains proper cell geometry.
  - Master Table: 9 columns. Uses `overflow-x-auto`.

---

## 18. Transport Admin Audit

- **Layout Structure:**
  Header $\to$ 4 Stat Cards $\to$ 3-Column Grid:
  - Left (2 cols): Vehicle Fleet Status (grid of vehicle cards) + Today's Scheduled Trips list.
  - Right (1 col): QuickCalendar + AnnouncementsCard.
  $\to$ Full-width Transport Requests Table.
- **Sizing Evaluation:**
  - Vehicle cards: 2-column grid (`grid-cols-1 sm:grid-cols-2 gap-3.5`). Displays type, registration number, capacity, status badge, driver name.
  - QuickCalendar: 1 column. Properly sized.
  - Table: 9 columns with actions.

---

## 19. Stationery Admin Audit

- **Layout Structure:**
  Header $\to$ 4 Stat Cards $\to$ 3-Column Grid:
  - Left (2 cols): QuickCalendar (`lg:col-span-2`).
  - Right (1 col): AnnouncementsCard + Requisitions Summary card.
  $\to$ Full-width Orders Table.
- **Calendar Sizing Anomaly (`StationeryAdmin.jsx` line 179):**
  - *Finding SA-01 (Severity: HIGH):* Identical issue to AO Admin: `QuickCalendar` is placed in `lg:col-span-2`, resulting in an 850px-wide stretched calendar with flat day buttons.
  - *Comparison:* In Seminar Admin and Accommodation Admin, QuickCalendar is placed in the 1-column slot, which is visually balanced. In Stationery Admin, it is placed in the 2-column slot without a layout rationale.

---

## 20. Meals Admin Audit

- **Layout Structure:**
  Header $\to$ 4 Stat Cards $\to$ 3-Column Grid:
  - Left (2 cols): Today's Catering Headcount (5 mini-cards: Breakfast, Lunch, Dinner, Snacks, Tea/Coffee) + Today's Meal Schedule.
  - Right (1 col): QuickCalendar + AnnouncementsCard.
  $\to$ Full-width Catering Requests Table.
- **Sizing Evaluation:**
  - Today's Headcount mini-cards: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`. Each card features uppercase category, bold count (1.125rem), and label. Very cohesive and scannable.
  - QuickCalendar: placed in the 1-column right slot (~360px). Correct proportions.
  - Table: 8 columns with status badges and action buttons.

---

## 21. Quick Calendar Audit

Across the application, `<QuickCalendar>` is instantiated in **12 different locations**.

### Detailed Dimension & Placement Analysis:

| Page | Location & Column Class | Measured Width (1440px) | Day Cell Size (W × H) | Visual Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **Department Dashboard** | Right Column (`.two-column-layout`) | ~360px | 44px × 38px | **Optimal** |
| **Seminar Booking** | Right Column (`.two-column-layout`) | ~360px | 44px × 38px | **Optimal** |
| **Accommodation** | Left Card (`.recent-card-panel`) | ~720px | 96px × 38px | **CRITICAL: Clipped by max-height: 500px** |
| **Transport** | Col 3 of `.three-column-layout` | ~340px | 42px × 38px | **Optimal geometry; severe vertical stacking** |
| **Stationery** | Right Column (`.two-column-layout`) | ~360px | 44px × 38px | **Optimal** |
| **Snacks & Meals** | Right Column (`.two-column-layout`) | ~360px | 44px × 38px | **Optimal** |
| **My Requests** | Right Column (`.two-column-layout`) | ~360px | 44px × 38px | **Optimal** |
| **AO Admin** | `lg:col-span-2` (Left 2 cols) | ~890px | 122px × 38px | **POOR: Stretched into flat bars** |
| **Seminar Admin** | 1 Col Right (`space-y-6`) | ~360px | 44px × 38px | **Optimal** |
| **Accommodation Admin** | 1 Col Right (`space-y-6`) | ~360px | 44px × 38px | **Optimal** |
| **Transport Admin** | 1 Col Right (`space-y-6`) | ~360px | 44px × 38px | **Optimal** |
| **Stationery Admin** | `lg:col-span-2` (Left 2 cols) | ~890px | 122px × 38px | **POOR: Stretched into flat bars** |
| **Meals Admin** | 1 Col Right (`space-y-6`) | ~360px | 44px × 38px | **Optimal** |

### Internal Elements:
- Header: Title (0.96rem, font-weight: 700), active date badge (0.74rem).
- Nav Bar: `.calendar-nav-bar` (`padding: 4px 6px; margin-bottom: 12px; border-radius: var(--radius-sm);`).
- Month Title: `font-size: 0.88rem; font-weight: 700;`.
- Day of Week Cells: `font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 4px 0;`.
- Day Buttons: `border-radius: var(--radius-sm); min-height: 38px; font-size: 0.78rem;`.
- Event Dot: `width: 4px; height: 4px; border-radius: 50%; bottom: 3px; position: absolute;`.
- Events List on Selected Date: `.calendar-events-section` with header and up to 4 items (`max-height: 130px; overflow-y: auto;`).
- Legend: `.calendar-legend-container` (`gap: 12px; margin-top: 12px; font-size: 0.72rem;`).

---

## 22. Announcements Audit

- **Container:**
  Class: `.announcements-card` in `components.css`.
  - *User Modification:* The user recently added `max-height: 450px;` to `.announcements-card`.
  - In `AnnouncementsCard.jsx`, the user added `.slice(0, 3)` to the announcements map.
- **Card Spacing & Dimensions:**
  - Header: `.announcements-header` (`margin-bottom: 14px;`).
  - Title: `.announcements-title` (`font-size: 0.96rem; font-weight: 700;`).
  - Refresh button: `.announcements-refresh-btn` (`font-size: 0.78rem;`).
  - Items list: `.announcements-list` (`display: flex; flex-direction: column; gap: 12px;`).
  - Item card: `.announcement-item` (`padding: 12px 14px; border-radius: var(--radius-md); gap: 12px;`).
  - Icon badge: `width: 36px; height: 36px; border-radius: 50%;`.
  - Date text: `font-size: 0.72rem; color: var(--text-muted);`.
  - Content snippet: `font-size: 0.78rem; line-height: 1.45;`.
- **Finding AN-01:**
  With `.slice(0, 3)` in place, 3 announcement items occupy ~310px total height, comfortably within the `max-height: 450px` cap. However, `.announcements-list` does not have `overflow-y: auto;` declared. If more items were ever displayed, text would spill out of the 450px card.

---

## 23. Forms Audit

### Dimension & Spacing Measurements:

| Element | Class / Selector | Height | Padding | Font Size | Border Radius | Spacing Below |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard Input** | `input[type="text"], input[type="date"], select` | ~42px | `10px 14px` | `0.88rem` | `8px` (`--radius-sm`) | `18px` (`.form-group`) |
| **Textarea** | `textarea` | `min-height: 85px` | `10px 14px` | `0.88rem` | `8px` | `18px` |
| **Filter Search Input** | `.filter-search-input` | `38px !important` | `padding-left: 38px !important` | `0.84rem` | `8px` | `0` |
| **Topbar Search Input** | `.topbar-search-input` | `40px !important` | `padding-left: 42px !important` | `0.86rem` | `9999px` (`--radius-pill`) | `0` |
| **Admin Filter Select** | `.bg-slate-900\/90` in Admin | ~32px | `px-2.5 py-1.5` | `text-xs` (12px) | `8px` (`rounded-lg`) | `0` |
| **Form Label** | `.form-label` | Auto | `0` | `0.84rem` | N/A | `6px` |
| **Two-Column Row** | `.form-row-2col`, `.responsive-form-grid-2` | Auto | `0` | N/A | N/A | `12px gap` |

### Form Inconsistencies:
- *Finding FO-01:* Department forms use `.form-label` (font-size 0.84rem) with inputs styled via `forms.css` (height ~42px). Admin forms use inline Tailwind utility classes: `text-xs` (12px), `py-1.5` (height ~32px). This creates an uncoordinated visual jump when navigating between Department and Admin portals.
- *Finding FO-02:* Date picker inputs on Firefox render slightly different default height than Chrome because WebKit calendar picker indicators have custom padding while Firefox applies native padding.

---

## 24. Buttons Audit

### Standard Button Sizing (Defined in `buttons.css`):
- `.btn`: `padding: 10px 18px; font-size: 0.88rem; font-weight: 600; border-radius: var(--radius-sm); min-height: 40px;`
- `.btn-sm`: `padding: 6px 12px; font-size: 0.8rem; min-height: 32px;`
- `.btn-lg`: `padding: 12px 24px; font-size: 0.95rem; min-height: 48px;`
- `.btn-icon`: `padding: 8px; width: 40px; height: 40px;`

### Button Dimension Comparison:

| Button Usage | Declared Classes | Height | Padding | Visual Assessment |
| :--- | :--- | :--- | :--- | :--- |
| **Department Submit** | `.btn .btn-primary` | ~42px | `10px 18px` | Prominent, easy to tap |
| **Department Reset** | `.btn .btn-outline` | ~42px | `10px 18px` | Balanced with primary button |
| **Admin Quick Action (Approve)** | `px-2.5 py-1 rounded text-[11px]` | ~28px | `4px 10px` | Compact; difficult touch target on mobile |
| **Admin Quick Action (Reject)** | `px-2.5 py-1 rounded text-[11px]` | ~28px | `4px 10px` | Compact; difficult touch target on mobile |
| **Table Action (View)** | `.action-view-btn` | Auto | `0` | Subtle inline text button with icon |
| **Table Action (Dept View)** | `.btn .btn-outline .table-action-btn` | ~30px | `6px 14px` | Well defined |
| **Cart Quantity Buttons** | `.cart-qty-btn` | **24px** | `0` | **TOO SMALL for touch** (24×24px) |

---

## 25. Tables Audit

### Architecture Breakdown:
- **Department Tables:**
  - Implemented as `<div className="custom-table-container"><table className="custom-table">`.
  - *Finding TA-01 (Severity: HIGH):* Neither class exists in any CSS stylesheet.
  - The tables rely solely on the generic `table`, `thead`, `th`, `tbody tr`, `td` element selectors in `tables.css`.
  - The container provides **no `overflow-x: auto`**, **no background**, and **no border**.
  - Cell padding: `th` has `padding: 13px 16px; font-size: 0.76rem;`; `td` has `padding: 14px 16px; font-size: 0.88rem;`.
  - On viewports below 1100px, 6-to-8 column tables (e.g. Accommodation requests, Transport requests) clip the rightmost columns (`Status` and `Action`) or stretch the parent card horizontally.
- **Admin Tables:**
  - Implemented as `<div className="overflow-x-auto border border-slate-800/80 rounded-lg"><table className="w-full text-left text-xs">`.
  - Header padding: `py-3 px-4; font-size: 10px;`.
  - Row padding: `py-3 px-4; font-size: 12px;`.
  - *Finding TA-02:* Admin tables correctly scroll horizontally on narrow screens without breaking parent container bounds.

---

## 26. Modals Audit

- **Backdrop:**
  `.modal-backdrop` (`position: fixed; inset: 0; background-color: rgba(7, 17, 31, 0.85); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;`).
- **Dialog Dimensions:**
  - Class: `.modal-dialog` (`width: 100%; max-width: var(--modal-max-width, 550px); max-height: 90vh; border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden;`).
  - Header: `padding: 18px 24px; border-bottom: 1px solid var(--glass-border);`.
  - Body: `padding: 24px; overflow-y: auto;`.
  - Close button: `padding: 5px; border-radius: var(--radius-xs);`.
- **Mobile Responsive Behavior:**
  - In `responsive.css` (line 123):
    ```css
    @media (max-width: 640px) {
      .modal-dialog {
        max-width: 95vw !important;
        margin: 10px;
      }
      .modal-body {
        padding: 16px;
      }
    }
    ```
- **Evaluation:**
  Modals have appropriate sizing, clean flex-column centering, internal scrolling when content exceeds 90vh, and proper touch escape logic.

---

## 27. Card Size Audit

| Card Type | Page / Component | Declared Width / Max-Width | Measured Height | Internal Padding | Border Radius | Evaluation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Glass Card Panel** | Global (`.card-panel`) | 100% of container | Content-dependent | `22px` | `18px` (`--radius-lg`) | **Balanced** |
| **Recent Card Panel** | `Accommodation.jsx` (`.recent-card-panel`) | 100% of container | **max-height: 500px** | `22px` | `18px` | **DEFECTIVE: Content overflows & clips** |
| **Stat Card (Gradient)** | Dashboard & Service Pages | 100% of grid cell | `min-height: 105px` | `20px 22px` | `12px` (`--radius-md`) | **Well proportioned** |
| **Slot Card** | `SeminarBooking.jsx` (`.slot-card`) | 100% of 3-col grid | ~125px | `20px` | `12px` | **Cramped at $\le 834\text{px}$** |
| **Stationery Item Card** | `Stationery.jsx` (`.stationery-item-card`) | minmax(180px, 1fr) | ~220px | `16px` | `12px` | **Consistent grid** |
| **Meal Type Card** | `SnacksMeals.jsx` (`.meal-type-card`) | minmax(200px, 1fr) | ~140px | `16px` | `12px` | **Good proportions** |
| **Vehicle Row Card** | `Transport.jsx` (`.vehicle-item-row`) | 100% of column | ~70px | `14px` | `8px` | **Clean single-row item** |
| **Quick Calendar** | Global (`.calendar-card`) | 100% of parent | ~430px | `18px 20px` | `18px` | **Distorted in 2-col span** |
| **Announcements Card** | Global (`.announcements-card`) | 100% of parent | **max-height: 450px** | `18px 20px` | `18px` | **Good with 3 items** |
| **Guidelines Card** | Global (`.guidelines-card`) | 100% of parent | ~180px | `18px` | `12px` | **Clean informational block** |

---

## 28. Placement Audit

- **Banner Placement:**
  All pages place the banner at the top of `.page-stack` or `.column-stack`. Margin bottom is consistently 24px.
- **Stat Cards Placement:**
  - Department Dashboard, Stationery, Snacks & Meals: Placed directly below banner, stretching full content width.
  - AO Admin & Service Admins: Placed below header in 4-column or 5-column grids.
  - Sizing and alignment are clean.
- **Two-Column Grid Placement:**
  - Standard intention: Left side receives primary operational content (forms, tables); Right side receives secondary/support widgets (calendar, guidelines, announcements).
  - *Placement Anomaly PL-01:* In `Accommodation.jsx`, QuickCalendar was placed inside the left operational column, while Announcements remained on the right. This inverts the established structural pattern seen across all other department pages.
- **Three-Column Grid Placement:**
  - In `Transport.jsx`, Column 1 has the form, Column 2 has available vehicles, Column 3 has trips, guidelines, announcements, and calendar. Placing 4 full widgets in Column 3 is a clear placement defect that should be split into a 2-column or 2-row layout.

---

## 29. Spacing Audit

- **Global Margins & Padding:**
  - Page margin: 0 (viewport edge).
  - Main viewport padding: `24px 30px` (desktop), `16px 18px` (tablet), `14px 12px` (mobile).
  - Section stack gap: `24px` (`.page-stack`, `.column-stack`, `.two-column-layout`).
- **Card Padding Consistency:**
  - `.card-panel`: `22px`
  - `.calendar-card`: `18px 20px`
  - `.announcements-card`: `18px 20px`
  - `.guidelines-card`: `18px`
  - Admin cards (`p-5`): `20px`
  - Admin mini-cards (`p-4`, `p-3.5`): `16px`, `14px`
- **Internal Form Spacing:**
  - `.form-group`: `margin-bottom: 18px; gap: 6px;`
  - `.form-group-sm`: `margin-bottom: 12px; gap: 4px;`
  - Button row gap: `12px` (`.form-actions-row`)

---

## 30. Desktop Responsive Audit (1440px, 1280px, 1024px)

### 1440 × 900 (Large Desktop):
- Layouts are expansive.
- Service cards grid (5 cards) displays in 1 complete horizontal row.
- Two-column layouts have ample space.
- *Issue at 1440px:* QuickCalendar on AO Admin and Stationery Admin stretches to ~890px wide, creating distorted day buttons.

### 1280 × 800 (Standard Desktop / Laptop):
- `.main-content-layout` padding drops from `30px` to `24px`.
- Page banner padding drops from `32px` to `26px`.
- `.page-grid-2col` reduces gap to 20px.
- *Issue at 1280px:* In `SeminarBooking.jsx`, the 3 slot cards start crowding if participants/facilities text is long. In `Transport.jsx`, the 3-column layout is very tight (each column is ~300px wide).

### 1024 × 768 (Small Desktop / Landscape Tablet):
- `layout.css` triggers `@media (max-width: 1024px)`.
- `.page-grid-2col` switches to `grid-template-columns: 1fr;`.
- `.service-cards-grid` shifts to `repeat(auto-fit, minmax(170px, 1fr))`.
- *Issue at 1024px:* All department tables (`.custom-table-container`) lack horizontal scroll, causing horizontal page stretching if browser zoom is above 100%.

---

## 31. Tablet Responsive Audit (912px, 834px, 768px)

### 912 × 1368 (Surface Pro / Tablet Portrait):
- Sidebar is still visible as a fixed 270px column if using 834px breakpoint, leaving only 642px for content.
- 642px is too narrow for 3-column layouts; `Transport.jsx` collapses to 1 column at 1200px, resulting in an exceptionally tall page.

### 834 × 1194 (iPad Pro 11"):
- `responsive.css` triggers `@media (max-width: 834px)`.
- Sidebar transforms to off-canvas drawer (`transform: translateX(-100%); z-index: 100 !important;`).
- Hamburger button in Topbar becomes the only way to navigate.
- `.page-banner` flex direction becomes column (`flex-direction: column; align-items: flex-start; gap: 16px;`).
- Banner glow increases to `width: 80%`.
- Form rows collapse to `grid-template-columns: 1fr;`.

### 768 × 1024 (iPad Mini / Standard Tablet):
- `index.css` line 305 triggers `@media (max-width: 768px)`.
- *Collision Point:* `index.css` overrides the sidebar drawer styling:
  `box-shadow: 4px 0 24px rgba(0, 0, 0, 0.8); z-index: 60 !important;`.
- Main content padding forced to `16px !important`.

---

## 32. Mobile Responsive Audit (430px, 390px, 375px, 360px)

### 430 × 932 (iPhone 14/15 Pro Max):
- Topbar height drops to `60px; padding: 0 12px;`.
- Search form is hidden (`display: none`).
- User profile pill hides name and role, showing only 34px avatar.
- Modal dialog adjusts to `max-width: 95vw !important; margin: 10px;`.

### 390 × 844 (iPhone 12/13/14/15):
- Banner title drops to `1.25rem`.
- Calendar card padding reduces to `12px`.
- Calendar day buttons reduce to `min-height: 32px; font-size: 0.72rem;`.

### 360 × 800 (Compact Android):
- *Issue M-01:* Because `.main-content-layout` has `padding: 16px !important` from `index.css`, usable content width is only $360 - 32 = 328\text{px}$.
- In `QuickCalendar`, a 7-column grid inside 304px (328px minus 24px card padding) gives each day cell only $304 / 7 \approx \mathbf{43\text{px}}$ width. At 32px height, day numbers and event dots fit, but legend dots crowd tightly.
- *Issue M-02:* Department tables with 6-8 columns without horizontal scroll cause the whole mobile viewport to scroll horizontally, breaking the fixed navbar alignment.

---

## 33. CSS Conflict & Duplication Audit

| Conflict ID | Files Involved | Selectors Involved | Conflict Nature | Resulting Bug |
| :--- | :--- | :--- | :--- | :--- |
| **CF-01** | `cards.css` (lines 26-42) | `.recent-card-panel` | Duplicate static rule without `:hover` | Card permanently rendered in hover state with drop shadow |
| **CF-02** | `layout.css` (line 111) vs `index.css` (line 331) | `.two-column-layout` | `1fr 340px` vs `2fr 1fr` | Desktop right sidebar column stretches dynamically instead of maintaining 340px width |
| **CF-03** | `responsive.css` (line 50) vs `index.css` (line 306) | `.app-sidebar` | `@media (max-width: 834px)` (`z-index: 100`) vs `@media (max-width: 768px)` (`z-index: 60`) | Breakpoint gap between 768px and 834px; z-index collision with modals |
| **CF-04** | `responsive.css` (line 98) vs `index.css` (line 319) | `.main-content-layout` | `padding: 14px 12px;` vs `padding: 16px !important;` | Mobile screens below 640px cannot reduce padding because `!important` takes precedence |
| **CF-05** | `tables.css` vs Department JSX files | `.custom-table-container`, `.custom-table` | Class referenced in JSX but completely absent from CSS | Missing horizontal scroll container on all 7 Department tables |
| **CF-06** | `cards.css` vs `index.css` | `.service-cards-grid` | Redundant media query rules at 640px | Duplicate CSS declarations |
| **CF-07** | `App.css` | Entire file | Unused template code | 185 lines of dead CSS loaded nowhere |

---

## 34. Component Consistency Matrix

| Component | Department Dashboard | Seminar Booking | Accommodation | Transport | Stationery | Snacks & Meals | My Requests | Admin Pages | Consistent? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Banner** | Welcome Banner | Welcome Banner | Welcome Banner | Page Banner | Page Banner | Page Banner | Welcome Banner | Title Header (No banner) | **No** (Admin uses compact header) |
| **Primary Grid** | 2-Column (2:1) | 2-Column (2:1) | 2-Column (2:1) | 3-Column (1.2:1:1) | 2-Column (2:1) | 2-Column (2:1) | 2-Column (2:1) | 3-Column (2:1) | **Mostly** (Except Transport) |
| **Table Container** | `.custom-table-container` | `.custom-table-container` | `.custom-table-container` | `.custom-table-container` | `.custom-table-container` | `.custom-table-container` | `.custom-table-container` | `.overflow-x-auto border` | **No** (Dept unstyled, Admin styled) |
| **Calendar Placement** | Right Column (1 col) | None | Inside Left Table Card | Col 3 (bottom) | Right Column (bottom) | Right Column (bottom) | Right Column (bottom) | Varied (1-col or 2-col) | **No** (Inconsistent placement) |
| **Calendar Width** | ~360px | N/A | ~720px (clipped) | ~340px | ~360px | ~360px | ~360px | 360px or 890px | **No** (Severely inconsistent) |
| **Announcements** | Right Column | None | Right Column | Col 3 | Right Column | Right Column | Right Column | Right Column | **Yes** (Standard 1-col widget) |
| **Stat Cards** | 5 Cards (Gradient) | None | None | 3 Cards (Gradient) | 4 Cards (Gradient) | 4 Cards (Gradient) | None | 4 KPI Cards + mini-cards | **Yes** (Shared `StatCard` component) |
| **Action Buttons** | `.btn .btn-primary` | `.btn .btn-primary` | `.btn .btn-primary` | `.btn .btn-primary` | `.btn .btn-primary` | `.btn .btn-primary` | `.btn .btn-primary` | Utility classes (`px-2.5 py-1`) | **No** (Admin uses compact buttons) |

---

## 35. Issues by Severity

### CRITICAL (Must Fix to Prevent Broken Rendering)
- **ISSUE-01 [Accommodation]:**
  - **Component:** `.recent-card-panel` containing `<QuickCalendar>`
  - **File:** `frontend/src/styles/cards.css` (line 26) & `frontend/src/pages/department/Accommodation.jsx` (lines 261, 314)
  - **Problem:** Rigid `max-height: 500px` without `overflow-y: auto` causes the 650px combined content (table + calendar) to overflow and clip catastrophically.
  - **CSS Selector:** `.recent-card-panel`
  - **Likely Cause:** Hardcoded max-height added without accounting for calendar addition.
  - **Recommended Adjustment:** Remove `max-height: 500px;` or set `max-height: none;` and place QuickCalendar outside the table panel in its own card.

### HIGH (Major Visual Distortion, Overflows, or Structural Clashes)
- **ISSUE-02 [Global / Cards]:**
  - **Component:** `.recent-card-panel`
  - **File:** `frontend/src/styles/cards.css` (lines 38-42)
  - **Problem:** Duplicate `.recent-card-panel` block is missing `:hover`, locking card permanently in hover background and shadow.
  - **Recommended Adjustment:** Change `.recent-card-panel {` at line 38 to `.recent-card-panel:hover {`.
- **ISSUE-03 [Global / Layout]:**
  - **Component:** `.two-column-layout`
  - **File:** `frontend/src/styles/layout.css` (line 111) vs `frontend/src/index.css` (line 331)
  - **Problem:** `index.css` overrides `1fr 340px` with `2fr 1fr`, causing right sidebar widgets (calendar, announcements) to stretch unpredictably on ultra-wide screens.
  - **Recommended Adjustment:** Consolidate `.two-column-layout` into `layout.css` and remove the duplicate override from `index.css`.
- **ISSUE-04 [Department Pages / Tables]:**
  - **Component:** `.custom-table-container`
  - **File:** All Department pages & `frontend/src/styles/tables.css`
  - **Problem:** `.custom-table-container` has zero CSS rules. Tables lack `overflow-x: auto` and spill outside cards on $\le 1024\text{px}$.
  - **Recommended Adjustment:** Add `.custom-table-container { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }` to `tables.css`.
- **ISSUE-05 [AO Admin & Stationery Admin / Calendar]:**
  - **Component:** `<QuickCalendar>` inside `lg:col-span-2`
  - **File:** `frontend/src/pages/admin/AOAdminDashboard.jsx` (line 436) & `frontend/src/pages/admin/StationeryAdmin.jsx` (line 180)
  - **Problem:** Calendar expands to ~890px wide, stretching 7 day buttons into distorted $122\text{px} \times 38\text{px}$ bars.
  - **Recommended Adjustment:** Set max-width on `.calendar-card` (e.g. `max-width: 440px; margin: 0 auto;`) or place calendar inside a 1-column container.
- **ISSUE-06 [Transport / Layout Balance]:**
  - **Component:** `.three-column-layout`
  - **File:** `frontend/src/pages/department/Transport.jsx` (lines 198, 407)
  - **Problem:** Column 3 stacks 4 widgets totaling 1390px, leaving a 970px vertical canyon below Column 2.
  - **Recommended Adjustment:** Restructure page into a 2-column layout or move QuickCalendar and Announcements into a horizontal bottom row.
- **ISSUE-07 [Global / Responsive Sidebar]:**
  - **Component:** `.app-sidebar`
  - **File:** `frontend/src/styles/responsive.css` (line 50) vs `frontend/src/index.css` (line 306)
  - **Problem:** Breakpoint and z-index clash between 834px (`z-index: 100`) and 768px (`z-index: 60`).
  - **Recommended Adjustment:** Consolidate mobile drawer styling in `responsive.css` at `834px` with `z-index: 90;` and remove duplicate block from `index.css`.

### MEDIUM (Inconsistent Sizing, Spacing, or Density)
- **ISSUE-08 [Stationery / Touch Accessibility]:**
  - **Component:** `.cart-qty-btn`
  - **File:** `frontend/src/styles/cards.css` (line 521)
  - **Problem:** Quantity buttons are `24px × 24px`, failing touch accessibility guidelines (minimum 44px recommended).
  - **Recommended Adjustment:** Increase size to `32px × 32px` or add touch padding.
- **ISSUE-09 [Global / Mobile Padding]:**
  - **Component:** `.main-content-layout`
  - **File:** `frontend/src/styles/index.css` (line 319)
  - **Problem:** `padding: 16px !important;` at 768px overrides `14px 12px` on small 360px mobile screens.
  - **Recommended Adjustment:** Remove `!important` from `index.css`.
- **ISSUE-10 [Seminar Booking / Slot Grid Tablet]:**
  - **Component:** `.slot-grid`
  - **File:** `frontend/src/styles/cards.css` (line 761)
  - **Problem:** Does not collapse at tablet widths ($\le 834\text{px}$), squeezing slot cards below 160px width.
  - **Recommended Adjustment:** Add `@media (max-width: 768px) { .slot-grid { grid-template-columns: 1fr; } }`.
- **ISSUE-11 [Announcements / Overflow]:**
  - **Component:** `.announcements-list`
  - **File:** `frontend/src/styles/components.css` (line 629)
  - **Problem:** Card has `max-height: 450px`, but list lacks `overflow-y: auto`.
  - **Recommended Adjustment:** Add `overflow-y: auto; max-height: 380px;` to `.announcements-list`.
- **ISSUE-12 [Admin vs Department / Form Control Heights]:**
  - **Component:** Form inputs & selects
  - **File:** `forms.css` vs Tailwind classes in Admin views
  - **Problem:** Department inputs are ~42px tall; Admin inputs are ~32px tall.
  - **Recommended Adjustment:** Harmonize height across both portals to ~38-40px.

### LOW & INFO (Polish, Cleanliness, Dead Code)
- **ISSUE-13 [Dead Code]:** `frontend/src/App.css` (185 lines) is never imported. Can be safely deleted.
- **ISSUE-14 [Date Picker Icons]:** In `forms.css`, WebKit calendar picker filter creates subtle hue variation on dark background.
- **ISSUE-15 [Status Badges]:** `.badge` padding (`4px 11px`) and typography (0.74rem) are consistent, but Admin uses slightly smaller inline badges (`text-[10px]`, `text-[11px]`).

---

## 36. Recommended CSS Changes

*(Note: In strict accordance with the READ-ONLY instruction, none of these adjustments have been applied to project files. They are provided as engineering recommendations for future implementation.)*

### 1. Fix `.recent-card-panel` in `cards.css`:
```css
/* Fix duplicate rule and remove rigid max-height */
.recent-card-panel {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
  padding: 22px;
  position: relative;
  transition: all var(--transition-normal);
}

.recent-card-panel:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32), 0 0 20px rgba(77, 163, 255, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
```

### 2. Add `.custom-table-container` to `tables.css`:
```css
.custom-table-container,
.table-container,
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: rgba(11, 27, 48, 0.65);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;
}
```

### 3. Prevent Calendar Stretched Distortion in `calendar.css`:
```css
.calendar-card {
  padding: 18px 20px;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}
```

### 4. Remove Duplicate Overrides from `index.css`:
- Remove `.two-column-layout { grid-template-columns: 2fr 1fr; }` from `index.css` (lines 331-335) so that `layout.css`'s `1fr 340px` is respected.
- Remove duplicate `@media (max-width: 768px)` sidebar block from `index.css` (lines 305-325).

---

## 37. Files That Would Need Changes

If authorized in a future task, the following files would receive targeted adjustments:

1. **`frontend/src/styles/cards.css`** (Fix `.recent-card-panel` selector & max-height; tablet slot grid)
2. **`frontend/src/styles/tables.css`** (Add `.custom-table-container` and `.custom-table` definitions)
3. **`frontend/src/styles/calendar.css`** (Add max-width constraint to prevent wide-screen distortion)
4. **`frontend/src/styles/components.css`** (Add `overflow-y: auto` to `.announcements-list`)
5. **`frontend/src/index.css`** (Remove conflicting duplicate layout and sidebar rules)
6. **`frontend/src/pages/department/Accommodation.jsx`** (Extract QuickCalendar out of table card into separate card)
7. **`frontend/src/pages/department/Transport.jsx`** (Restructure 3-column vertical overload)
8. **`frontend/src/App.css`** (Delete unused boilerplate file)

---

## 38. Final Summary

The frontend application presents an attractive, high-contrast visual aesthetic following the Arctic Blue Glass palette updates. However, from a structural, sizing, and layout perspective, the project contains **1 Critical Defect**, **6 High-Severity Issues**, **5 Medium-Severity Issues**, and **3 Low/Cleanup Issues**.

The most pressing items are:
1. The **clipping and overflow of QuickCalendar** inside `.recent-card-panel` in Accommodation.
2. The **perpetual hover state** on `.recent-card-panel` in `cards.css`.
3. The **lack of horizontal scrolling** on all 7 Department tables due to unstyled `.custom-table-container`.
4. The **distorted calendar cells** when stretched across wide 2-column spans in Admin views.
5. The **CSS selector conflicts** between `layout.css`, `responsive.css`, and `index.css`.

This complete audit provides an exact, actionable roadmap of every dimension, placement, and responsive issue across the entire application without having altered any project files.
