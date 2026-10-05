# College Faculty Service Management System — Non-Technical User Manual
**Narasaraopet Engineering College (Autonomous)**

---

## 1. Welcome & Introduction
Welcome to the **College Faculty Service Management System**. This web platform provides a centralized, digital gateway for academic departments to request campus resources and for administrative officers to process approvals smoothly.

### Key Benefits
- **No Paperwork**: Submit all requisition requests online without physical paper forms.
- **Instant Availability**: View available seminar halls, vehicles, and rooms in real time.
- **Transparent Status**: Track whether your request is **Pending**, **Approved**, or **Rejected**.
- **Interactive Calendar**: Review scheduled bookings at a glance.

---

## 2. Getting Started & Logging In

1. Open your web browser (Google Chrome, Microsoft Edge, or Mozilla Firefox).
2. Navigate to the portal URL: `http://127.0.0.1:5173`.
3. You will see the **Campus Service Management System Login** screen.
4. Enter your **User ID** and **Password**:
   - **Department Users**: User ID corresponds to your department code (e.g. `CSE001`, `ECE001`, `EEE001`, `ME001`, `CIVIL001`, `AI001`, `MBA001`, `PHARM001`). Default seed password: `dept123`.
   - **Administrators**: User ID corresponds to your admin post (e.g. `AO001` for AO Admin, `SEM001` for Seminar Admin, `ACC001` for Accommodation Admin, `TRN001` for Transport Admin, `STA001` for Stationery Admin, `MEA001` for Meals Admin). Default seed password: `admin123`.
5. Click **Sign In**.

---

## 3. Department Faculty Portal Guide

### 3.1 Department Dashboard (`/dashboard`)
Upon logging in, department users land on the central dashboard:
- **Metric Tiles**: Quick counts of Active Bookings, Pending Approvals, Approved Requests, and Recent Notices.
- **Quick Service Launchers**: Direct action cards to initiate bookings for Seminar Halls, Accommodation, Transport, Stationery, and Meals.
- **Quick Calendar**: Displays current month schedule with colored dots marking days that contain active bookings.
- **Campus Announcements**: Highlights campus-wide administrative circulars and event notices.

---

### 3.2 Seminar Hall Booking (`/seminar-booking`)
1. Click **Seminar Booking** in the sidebar.
2. Select your desired hall from the interactive hall cards:
   - **Seminar Hall 1** (Block 3, Ground Floor, 300 Seats)
   - **Seminar Hall 2** (Block 3, Third Floor, 200 Seats)
   - **Seminar Hall 3** (Block 4, Ground Floor, 350 Seats)
   - **Seminar Hall 4** (Pharma Block, Ground Floor, 200 Seats)
   - **Tech Hub** (Block 3, Third Floor, 150 Seats)
3. Pick an **Event Date** using the calendar picker (dates start from today).
4. Select your preferred **Slot**:
   - `Forenoon (09:00 AM - 12:00 PM)`
   - `Afternoon (12:00 PM - 04:00 PM)`
   - `Full Day (09:00 AM - 04:00 PM)`
5. Enter the **Event Title** (e.g. *"National AI Symposium"*), **Purpose**, and **Expected Participants**.
6. Check any required facilities (Projector, AC, Audio System, Wi-Fi).
7. Click **Submit Booking Request**. If the hall is available, your booking is recorded with `PENDING` status.

---

### 3.3 Guest House Accommodation (`/accommodation`)
1. Click **Accommodation** in the sidebar.
2. Select the hostel category: **Girls Hostel** or **Boys Hostel**.
3. Choose the room tier: **AC Room** or **Non-AC Room**.
4. Set the **Check-in Date** and **Check-out Date** (automatically defaults to today and +2 days).
5. Specify the **Number of Guests** and enter the **Guest Name & Designation** (e.g. *"Dr. K. Sharma, NBA Evaluator"*).
6. State the official visit purpose and add any notes (e.g. *"Late arrival around 10:00 PM"*).
7. Click **Submit Accommodation Request**.

---

### 3.4 Institutional Transport Booking (`/transport`)
1. Click **Transport** in the sidebar.
2. Select the vehicle class based on group size:
   - **College Bus** (40–50 seats) for student field visits or symposium transportation.
   - **Mini Bus** (25 seats) for faculty committees or athletic squads.
   - **Tempo Traveller** (12 seats) for visiting guest panels.
   - **Innova** (7 seats) for chief guest or VIP airport/station pickups.
3. Select the **Trip Date**, **Departure Time**, and **Return Time**.
4. Check **Round Trip** if return transportation is needed.
5. Provide **Pickup Point**, **Destination**, and **Passenger Count**.
6. Click **Submit Transport Request**.

---

### 3.5 Stationery Store Order (`/stationery`)
1. Click **Stationery** in the sidebar.
2. Browse through the available catalogue items (A4/A3 Paper, Pens, Pencils, Markers, Staplers, Folders, Chart Paper, Printer Ink).
3. Use the `+` and `-` buttons on item cards to add items to your cart.
4. Review the cart summary at the bottom or side panel.
5. Enter the **Purpose** (e.g. *"Semester-End Practical Examinations"*).
6. Click **Place Stationery Request**.

---

### 3.6 Snacks & Meals Catering (`/snacks-meals`)
1. Click **Snacks & Meals** in the sidebar.
2. Enter the **Event Title**. The **Venue** automatically defaults to your department's conference hall (e.g. *"CSE Conference Hall"*).
3. Select the required **Meal Types** (Breakfast, Lunch, Dinner, Snacks, Tea / Coffee).
4. Specify the **Total Guests** and break down individual guest counts and delivery times per meal category.
5. Note any dietary preferences (e.g. *"Pure Vegetarian South Indian Lunch with mineral water bottles"*).
6. Click **Submit Catering Request**.

---

### 3.7 Tracking Requisitions (`/my-requests`)
1. Click **My Requests** in the sidebar.
2. All your departmental requests are displayed in a clean, unified table.
3. **Filter by Status**: Click tabs for `All`, `Pending`, `Approved`, or `Rejected`.
4. **Search**: Type an event title, reference ID (e.g. `SH-021`), or purpose in the search box.
5. If a request is rejected, the table displays the specific reason provided by the administrative officer.

---

## 4. Administrative User Guide

### 4.1 Service Administrators (Seminar, Accommodation, Transport, Stationery, Meals)
1. Log in with your respective administrator account (`SEM001`, `ACC001`, `TRN001`, `STA001`, `MEA001`).
2. Your dashboard immediately displays:
   - **KPI Metrics**: Total Requests, Pending Approvals, Approved Count, Rejected Count.
   - **Action Queue**: Filterable list of all departmental requisitions for your service.
   - **Quick Calendar**: Month view highlighting dates with scheduled events.
3. **Approving a Request**:
   - Locate the request in the queue and click the green **Approve** button.
   - The status updates to `APPROVED` in real time, and the department receives an in-app confirmation notification.
4. **Rejecting a Request**:
   - Click the red **Reject** button.
   - A modal prompt will ask for a **Rejection Reason** (e.g. *"Vehicle undergoing maintenance on that date"*).
   - Enter the reason and confirm. The department will see this explanation on their tracking screen.
5. **Adjusting Stock (Stationery Admin only)**:
   - Click the stock adjustment button on any item card to record received shipments or update warehouse counts.

---

### 4.2 Administrative Officer (AO Super Admin)
1. Log in with `AO001`.
2. The **AO Central Command** dashboard provides:
   - High-level KPIs across all five service sectors.
   - Master filter table displaying requests across all departments and all service types.
   - Direct authorization buttons allowing the AO to approve or override any request across campus.
3. **Publishing Announcements**:
   - Click **+ New Announcement** in the header.
   - Enter Title, Notice Content, Category (`EVENT`, `MAINTENANCE`, `EXAM`, or `URGENT`), and Date.
   - Click **Publish**. The announcement is immediately visible on every department and admin dashboard.

---

## 5. Frequently Asked Questions (FAQ)

- **Q: Can I edit a request after submitting it?**  
  *A: Requisitions cannot be edited once submitted. If you need to make changes, ask the service administrator to reject the existing request with a note, then submit a revised requisition.*

- **Q: What happens if two departments request the same seminar hall on the same date?**  
  *A: The system automatically detects slot collisions. Once one department's booking is confirmed, the system prevents double-booking for that slot.*

- **Q: How long are login sessions valid?**  
  *A: Login sessions remain active for 24 hours. If your session expires, you will be smoothly redirected to the login page.*
