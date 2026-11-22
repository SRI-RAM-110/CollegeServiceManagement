# 07. Special Routing Audit: AO_ADMIN, HOD, Coordinator & Technician

**Audit Date:** November 22, 2026  
**Execution Mode:** STRICTLY READ-ONLY  

---

## 1. Special Investigation A: `AO_ADMIN`

### 1.1 Registered Accounts Holding `AO_ADMIN`:
The database contains 6 accounts with role `AO_ADMIN`:
1. `AO001` (Mr. I. Sridhar, `ao@nrtec.in`) – Authoritative Administrative Officer.
2. `PRINCIPAL001` (Dr. S. Venkateswarlu, `principal@nrtec.i`) – Inactive (`active: false`).
3. `sriramsriram123654` (`sriramsriram123654@gmail.com`) – Developer / Multi-Role account (**CRITICAL DEFECT**).
4. `ao_user` (`ao_user@nrtec.edu`) – Test account.
5. `super_ao_user` (`super_ao_user@nrtec.edu`) – Test account.
6. `ao_seminar_admin` (`ao_seminar_admin@nrtec.edu`) – Test account.

### 1.2 Operational Defense-in-Depth in `EmailService.java:458-470`:
- **Operational Filtering:**
  ```java
  if ("AO_ADMIN".equalsIgnoreCase(role.trim())) {
      if (isOperationalWorkflow(notification)) {
          targetUsers = targetUsers.stream()
                  .filter(u -> "ao".equalsIgnoreCase(u.getUserId()))
                  .toList();
      } else {
          targetUsers = targetUsers.stream()
                  .filter(u -> !"sriramsriram123654".equalsIgnoreCase(u.getUserId()))
                  .toList();
      }
  }
  ```
- **Finding:** While `isOperationalWorkflow` successfully protects the Principal from routine operational noise, notice that `targetUsers.filter(u -> "ao".equalsIgnoreCase(u.getUserId()))` expects `userId == "ao"`.
  However, in the database, the Administrative Officer's `userId` is **`AO001`**, not `"ao"`!
  As a consequence, when role-based queries target `AO_ADMIN` for operational workflows, **`AO001` does not match `"ao"`**, resulting in zero recipients!
  Fortunately, call sites like `AccommodationService` pass `recipientUserId = "ao"`, but wherever role queries run, this discrepancy exists.

---

## 2. Special Investigation B: Department HOD Routing

### 2.1 The Unpopulated `departments` Collection:
- Across all 9 documents in `departments`, `hodUserId`, `hodName`, and `hodEmail` are **NULL**.
- The application relies entirely on dynamic queries against the `users` collection:
  `userRepository.findAll().stream().filter(u -> u.getActive() && u.hasRole("DEPARTMENT_HOD") && u.getDepartment().equalsIgnoreCase(dept))`

### 2.2 Department-by-Department HOD Audit:
| Department | Reconciled HOD Account(s) | HOD Email | Audit Status |
| :--- | :--- | :--- | :--- |
| **CSE** | `csehod` (Dr. S. N. Thirumala Rao) **AND** `sriramsriram123654` | `csehod@nrtec.in`, `sriramsriram123654@gmail.com` | **CRITICAL DEFECT: Duplicate HOD & Developer Leak** |
| **ECE** | `ecehod` (Dr. V. Venkata Rao) | `ecehod@nrtec.in` | **VERIFIED** |
| **EEE** | `eeehod` (Dr. Shaik Mahammad Shareef) | `eeehod@nrtec.in` | **VERIFIED (Primary role in DB is ACC_ADMIN)** |
| **ME** | `mechhod` (Dr. B. Venkata Siva) | `mechhod@nrtec.in` | **VERIFIED** |
| **CIVIL** | `civilhod` (Dr. P. Naga Sowjanya) | `civilhod@nrtec.in` | **VERIFIED** |
| **IT** | **NONE** | None | **HIGH DEFECT: Missing HOD Account** |
| **MBA** | `mbahod` (Dr. Y. Anki Reddy) | `mbahod@nrtec.in` | **VERIFIED** |
| **PHARM** | `pharmhod` (Sample Pharmacy HOD) | `sample.pharm.hod@nrtec.in` | **VERIFIED** |
| **CSDS** | **NONE** | None | **HIGH DEFECT: Missing HOD Account** |

---

## 3. Special Investigation C: Seminar Hall Coordinator Routing

### 3.1 Hall-by-Hall Coordinator Audit:
| Hall ID | Hall Name | `coordinatorUserIds` in Hall | User's `assignedHallIds` | Reconciled Coordinator Account | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SH-1** | Block 3 Seminar Hall | `['seminarcoordinator1']` | `ecehod` (`SH-1`), `seminarcoordinator1` (`SH-1`) | `seminarcoordinator1` (`seminarcoordinator1@nrtec.in`) | **VERIFIED** |
| **SH-2** | Block 3 Seminar Hall | `['seminarcoordinator2']` | `seminarcoordinator2` (`SH-2`) | `seminarcoordinator2` (`seminarcoordinator2@nrtec.in`) | **VERIFIED** |
| **SH-3** | Seminar Hall 3 | `['seminarcoordinator3']` | `seminarcoordinator3` (`SH-3`), `tandavakrishnaanumolu` (`SH-3`) | `seminarcoordinator3` (`seminarcoordinator3@nrtec.in`) | **VERIFIED** |
| **SH-4** | Pharma Block Seminar Hall | `['seminarcoordinator4']` | `seminarcoordinator4` (`SH-4`) | `seminarcoordinator4` (`seminarcoordinator4@nrtec.in`) | **VERIFIED** |
| **SH-5** | Tech Hub | `['seminarcoordinator5']` | `seminarcoordinator5` (`SH-5`) | `seminarcoordinator5` (`seminarcoordinator5@nrtec.in`) | **VERIFIED** |
| **SH-6** | Block 2 Seminar hall | `[]` (EMPTY!) | `csehod` (`SH-6`) | **NONE in Hall Document** | **HIGH DEFECT: Missing Coordinator in Hall** |
| **SH-07** | theater | `[]` (EMPTY!) | None | **NONE** | **HIGH DEFECT: No Coordinator Assigned** |

---

## 4. Special Investigation D: Technician & Facility Staff Routing

- **Technicians:** `tandavakrishnaanumolu` (`SH-3`) and `csehod` (`SH-6`).
- **Electrician:** `electrician_user` (`campus.electrician@nec.edu.in`).
- **Generator Operator:** `gen_operator` (`gen.operator@nec.edu.in`).
- **CC Exclusion Enforcement:**
  `EmailService.java:486-494` strictly excludes `SEMINAR_TECHNICIAN`, `GENERATOR_OPERATOR`, `ELECTRICIAN`, `Seminar Equipment`, `Generator Service`, `Electrical Service`, and `Stationery` from receiving secondary CC emails. This prevents flooding operational staff with routine departmental copy emails.
