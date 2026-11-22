# Module-Wise Email Recipient Matrix Across Lifecycle Events

**Audit Scope:** End-to-end lifecycle mapping of all 8 core functional modules in `CollegeServiceManagement`.

---

## 1. Seminar Hall Management Module

| Lifecycle Stage | Event Type | Primary Recipient (TO) | CC Recipients | In-App Notification | Push (FCM) | PDF Attachment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Request Created** | `REQUEST_SUBMITTED` | Department HOD of Requester | None | Yes (Requester + HOD) | Yes | No |
| **2. HOD Approves** | `HOD_APPROVED` | Administrative Officer (`ao@nrtec.in`) + Hall Coordinator | None | Yes (AO + Coordinator) | Yes | No |
| **3. HOD Rejects** | `HOD_REJECTED` | Requesting Staff Member | None | Yes (Requester) | Yes | No |
| **4. AO Approves** | `AO_APPROVED` | Requesting Staff Member + Hall Coordinator | None | Yes (Requester + Coord) | Yes | No |
| **5. AO Rejects** | `AO_REJECTED` | Requesting Staff Member + Department HOD | None | Yes (Requester + HOD) | Yes | No |
| **6. Coordinator Approves** | `COORDINATOR_APPROVED`| Requester + Assigned Technician | None | Yes (Requester + Tech) | Yes | No |
| **7. Pre-Event Inspection** | `INSPECTION_COMPLETED` | Hall Coordinator, Technician, Requester | None (`ccEmails: []`) | Yes (All 3) | Yes | **YES (Signed Pre-Event PDF)** |
| **8. Post-Event Inspection** | `INSPECTION_COMPLETED`| Hall Coordinator, Technician, Requester | None (`ccEmails: []`) | Yes (All 3) | Yes | **YES (Signed Post-Event PDF)** |
| **9. Cancellation** | `REQUEST_CANCELLED` | Requester, HOD, AO, Coordinator, Technician | None | Yes (All parties) | Yes | No |

---

## 2. Accommodation Management Module

| Lifecycle Stage | Event Type | Primary Recipient (TO) | CC Recipients | In-App Notification | Push (FCM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Request Created** | `REQUEST_SUBMITTED` | Department HOD | None | Yes | Yes |
| **2. HOD Approves** | `HOD_APPROVED` | Administrative Officer (`ao@nrtec.in`) | None | Yes | Yes |
| **3. AO Approves (Guest House)** | `AO_APPROVED` | Requester + Guest House In-Charge | None | Yes | Yes |
| **4. AO Approves (Girls Hostel)**| `AO_APPROVED` | Requester + Girls Hostel Admin (`moturi`) | None | Yes | Yes |
| **5. AO Approves (Boys Hostel)** | `AO_APPROVED` | Requester + AO (Acting Boys Hostel Admin)| None | Yes | Yes |
| **6. Rejection (HOD or AO)** | `HOD_REJECTED` / `AO_REJECTED` | Requester | None | Yes | Yes |

---

## 3. Transport Management Module

| Lifecycle Stage | Event Type | Primary Recipient (TO) | CC Recipients | In-App Notification | Push (FCM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Vehicle Requisition Created**| `REQUEST_SUBMITTED` | Department HOD | None | Yes | Yes |
| **2. HOD Approves** | `HOD_APPROVED` | Administrative Officer (`ao@nrtec.in`) | None | Yes | Yes |
| **3. AO Allocates Vehicle & Driver**| `AO_APPROVED` | Requester + Transport Supervisor | None | Yes | Yes |
| **4. Trip Completed** | `GENERAL_NOTIFICATION` | Requester | None | Yes | Yes |

---

## 4. Food & Refreshment Services Module

| Lifecycle Stage | Event Type | Primary Recipient (TO) | CC Recipients | In-App Notification | Push (FCM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Food Indent Created** | `REQUEST_SUBMITTED` | Department HOD | None | Yes | Yes |
| **2. HOD Approves** | `HOD_APPROVED` | Administrative Officer (`ao@nrtec.in`) | None | Yes | Yes |
| **3. AO Approves & Orders** | `AO_APPROVED` | Requester + Canteen Supervisor | None | Yes | Yes |
| **4. Refreshments Delivered**| `GENERAL_NOTIFICATION` | Requester | None | Yes | Yes |

---

## 5. Stationery & Printing Services Module

| Lifecycle Stage | Event Type | Primary Recipient (TO) | CC Recipients | In-App Notification | Push (FCM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Indent Submitted** | `REQUEST_SUBMITTED` | Department HOD | None | Yes | Yes |
| **2. HOD Approves** | `HOD_APPROVED` | Administrative Officer (`ao@nrtec.in`) | None | Yes | Yes |
| **3. AO Dispatches to Stores** | `AO_APPROVED` | Requester + Stores In-Charge | None | Yes | Yes |
| **4. Items Issued** | `GENERAL_NOTIFICATION` | Requester | None | Yes | Yes |

---

## 6. Electrical & Maintenance Services Module

| Lifecycle Stage | Event Type | Primary Recipient (TO) | CC Recipients | In-App Notification | Push (FCM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Maintenance Ticket Created** | `REQUEST_SUBMITTED` | AO + Electrician (`bvchsubbarao`) | None | Yes | Yes |
| **2. Work Assigned / In Progress**| `GENERAL_NOTIFICATION` | Requester + Electrician | None | Yes | Yes |
| **3. Work Completed** | `GENERAL_NOTIFICATION` | Requester + AO | None | Yes | Yes |

---

## 7. Generator & Diesel Logging Module

| Lifecycle Stage | Event Type | Primary Recipient (TO) | CC Recipients | In-App Notification | Push (FCM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Diesel Refill Indent** | `REQUEST_SUBMITTED` | AO + Generator Operator (`ravurisrinu28`) | None | Yes | Yes |
| **2. Run Log Recorded** | `GENERAL_NOTIFICATION` | Administrative Officer | None | Yes | Yes |
| **3. Preventive Maintenance** | `SYSTEM_ALERT` | AO + Generator Operator | None | Yes | Yes |

---

## 8. Authentication & Password Security Module

| Lifecycle Stage | Event Type | Primary Recipient (TO) | CC Recipients | In-App Notification | Push (FCM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Forgot Password Requested** | `PASSWORD_RESET` | Requesting User's Registered Email | **STRICTLY NONE** | **NO (Security)** | **NO** |
| **2. Password Changed** | `GENERAL_NOTIFICATION` | Requesting User's Registered Email | **STRICTLY NONE** | Yes (Security Alert)| Yes |
