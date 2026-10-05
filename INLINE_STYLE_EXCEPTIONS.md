# INLINE STYLE EXCEPTIONS DOCUMENTATION
**Project:** Narasaraopet Engineering College — Faculty Service Management System  
**Theme:** Arctic Blue Glass  
**Inspection Date:** 2026-09-24  

---

## Overview
Every single static inline style across the entire frontend application has been systematically migrated into external modular CSS files located in `frontend/src/styles/` and applied via semantic classes adhering to the **Arctic Blue Glass** theme.

As mandated by the design rules, inline styles were ONLY retained when their values genuinely depend on runtime calculations or dynamic component props. In all such cases, they have been converted to CSS Custom Properties (Variables) to decouple presentation from dynamic runtime values.

Below is the complete exhaustive registry of every remaining inline style in the application.

---

### Exception 1
- **File:** `frontend/src/pages/admin/AOAdminDashboard.jsx`
- **Component:** `AOAdminDashboard`
- **Line:** 356
- **Element:** Service Utilization Progress Bar Fill
- **Inline Style Code:**
  ```jsx
  <div 
    className="ao-progress-fill" 
    style={{ '--progress-width': `${Math.max(pct, 2)}%` }} 
  />
  ```
- **Associated CSS Rule (`frontend/src/styles/components.css`):**
  ```css
  .ao-progress-fill {
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--arctic-blue-gradient);
    box-shadow: 0 0 10px rgba(120, 174, 245, 0.4);
    transition: width var(--transition-normal);
    width: var(--progress-width, 0%);
  }
  ```
- **Why it is dynamic:**  
  The progress bar fill width represents the percentage of total capacity currently allocated for each college service (Seminar Halls, Accommodation, Transport, Stationery, Snacks & Meals). This percentage (`pct`) is computed at runtime from active database requests.
- **Why it was not moved to static CSS:**  
  A fixed CSS class cannot represent arbitrary data-driven percentages ranging from 0% to 100%. Moving the static presentation (height, border-radius, gradient, glow, transition) into `.ao-progress-fill` while injecting only the runtime percentage via `--progress-width` is the standard, cleanest architectural pattern.

---

### Exception 2
- **File:** `frontend/src/pages/admin/AccommodationAdmin.jsx`
- **Component:** `AccommodationAdmin`
- **Line:** 244
- **Element:** Room Occupancy Progress Bar Fill
- **Inline Style Code:**
  ```jsx
  <div 
    className="progress-fill" 
    style={{ '--progress-width': `${Math.min(occupancyPct, 100)}%` }} 
  />
  ```
- **Associated CSS Rule (`frontend/src/styles/components.css`):**
  ```css
  .progress-fill {
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--arctic-blue-gradient);
    transition: width var(--transition-normal);
    width: var(--progress-width, 0%);
  }
  ```
- **Why it is dynamic:**  
  The occupancy percentage (`occupancyPct`) is calculated dynamically from real-time hostel bed counts: `(allocatedBeds / totalBeds) * 100`.
- **Why it was not moved to static CSS:**  
  The occupancy level fluctuates dynamically as guests are checked in, approved, or checked out. The visual styling is 100% externalized in `.progress-fill`, while the runtime numerical value is supplied through `--progress-width`.

---

### Exception 3
- **File:** `frontend/src/components/common/Modal.jsx`
- **Component:** `Modal`
- **Line:** 28
- **Element:** Modal Dialog Container
- **Inline Style Code:**
  ```jsx
  <div 
    className="modal-dialog" 
    style={{ '--modal-max-width': maxWidth }}
  >
  ```
- **Associated CSS Rule (`frontend/src/styles/components.css`):**
  ```css
  .modal-dialog {
    width: 100%;
    max-width: var(--modal-max-width, 550px);
    background: rgba(22, 34, 53, 0.94);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--glass-shadow-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    animation: fadeIn 0.22s ease-out;
  }
  ```
- **Why it is dynamic:**  
  `maxWidth` is an optional React component property passed in by caller pages depending on their content density (e.g., standard confirmation dialogs use default 550px, while wide audit views pass 750px or 900px).
- **Why it was not moved to static CSS:**  
  The `Modal` is a shared reusable primitive across the application. Applying `--modal-max-width` enables parent components to customize maximum viewport widths declaratively while keeping all glassmorphic appearance, frosted backdrop filters, borders, shadows, padding, and animations in `components.css`.

---

## Summary of Audit
- **Total JSX Files Inspected:** 24
- **Static Inline Styles Remaining:** 0
- **Total Dynamic Style Exceptions:** 3
- **All 3 Exceptions Converted to CSS Variables:** Yes (`--progress-width`, `--modal-max-width`)
