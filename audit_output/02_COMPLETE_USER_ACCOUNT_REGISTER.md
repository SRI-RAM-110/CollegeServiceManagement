# 02. Complete User Account Register & Forensic Analysis

**Audit Database:** `collegeservices_db`  
**Collection:** `users`  
**Total Documents Reconciled:** 44 Accounts  
**Execution Mode:** STRICTLY READ-ONLY  

---

## 1. Complete Account Master Table

The table below lists every single user account currently registered in the production database. No accounts have been omitted, fabricated, or truncated.

| # | User ID | Name | Email Address | Dept | Primary Role | Effective Roles | Status | Assigned Halls | Other Metadata / Assignments |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `ACC001` | Accommodation Administrator | `acc001@nrtec.local` | HOSTEL | `ACCOMMODATION_ADMIN` | `ACCOMMODATION_ADMIN` | **ACTIVE** | None | Phone: +91 90000 00022 |
| 2 | `ACC_BOYS` | Boys Hostel Administrator | `acc_boys@nrtec.local` | ADMIN | `ACCOMMODATION_ADMIN` | `ACCOMMODATION_ADMIN` | **ACTIVE** | None | Designation: Hostel Admin |
| 3 | `ACC_BOYS_TEST` | Boys Warden | `acc_boys_test@nrtec.local` | ADMIN | `ACCOMMODATION_ADMIN` | `ACCOMMODATION_ADMIN` | **ACTIVE** | None | None |
| 4 | `ACC_GIRLS` | Girls Hostel Administrator | `acc_girls@nrtec.local` | ADMIN | `ACCOMMODATION_ADMIN` | `ACCOMMODATION_ADMIN` | **ACTIVE** | None | Designation: Hostel Admin |
| 5 | `ACC_GIRLS_TEST` | Girls Warden | `acc_girls_test@nrtec.local` | ADMIN | `ACCOMMODATION_ADMIN` | `ACCOMMODATION_ADMIN` | **ACTIVE** | None | None |
| 6 | `AI001` | AI Department User | `ai001@nrtec.local` | IT | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | Phone: +91 90000 00006 |
| 7 | `AO001` | Mr. I. Sridhar | `ao@nrtec.in` | ADMIN | `AO_ADMIN` | `AO_ADMIN` | **ACTIVE** | None | Designation: Administrative Officer; Phone: 08647-239905 |
| 8 | `CIVIL001` | Civil Department User | `civil001@nrtec.local` | CIVIL | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | Phone: +91 90000 00005 |
| 9 | `CREATOR001` | System Creator | `creator@nrtec.in` | ADMIN | `CREATOR` | `CREATOR` | **ACTIVE** | None | Designation: System Creator |
| 10 | `CSE001` | CSE Department User | `cse001@nrtec.local` | CSE | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | Phone: +91 90000 00001 |
| 11 | `ECE001` | ECE Department User | `ece001@nrtec.local` | ECE | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | Phone: +91 90000 00002 |
| 12 | `EEE001` | EEE Department User | `eee001@nrtec.local` | EEE | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | Phone: +91 90000 00003 |
| 13 | `MBA001` | MBA Department User | `mba001@nrtec.local` | MBA | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | Phone: +91 90000 00007 |
| 14 | `ME001` | Mechanical Department User | `me001@nrtec.local` | ME | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | Phone: +91 90000 00004 |
| 15 | `MEA001` | Meals Administrator | `mea001@nrtec.local` | CANTEEN | `MEALS_ADMIN` | `MEALS_ADMIN` | **ACTIVE** | None | Phone: +91 90000 00025 |
| 16 | `PHARM001` | Pharmacy Department User | `pharm001@nrtec.local` | PHARM | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | Phone: +91 90000 00008 |
| 17 | `PRINCIPAL001` | Dr. S. Venkateswarlu | `principal@nrtec.i` | ADMIN | `AO_ADMIN` | `AO_ADMIN` | **INACTIVE** | None | Designation: Principal; Phone: +91 91546 86203 |
| 18 | `SEM001` | Seminar Administrator | `sem001@nrtec.local` | SEMINAR | `SEMINAR_ADMIN` | `SEMINAR_ADMIN` | **ACTIVE** | None | Phone: +91 90000 00021 |
| 19 | `STA001` | Stationery Administrator | `sta001@nrtec.local` | STORE | `STATIONERY_ADMIN` | `STATIONERY_ADMIN` | **ACTIVE** | None | Phone: +91 90000 00024 |
| 20 | `TRN001` | Transport Administrator | `trn001@nrtec.local` | TRANSPORT | `TRANSPORT_ADMIN` | `TRANSPORT_ADMIN` | **ACTIVE** | None | Phone: +91 90000 00023 |
| 21 | `aihod` | Dr. B. Jhansi Vazram | `aihod@nrtec.in` | IT | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | **ACTIVE** | None | Designation: Professor & HOD - AI & IT; Phone: +91 98480 66001 |
| 22 | `ao_seminar_admin` | N/A | `ao_seminar_admin@nrtec.edu` | N/A | `AO_ADMIN` | `AO_ADMIN, SEMINAR_ADMIN` | **ACTIVE** | None | None |
| 23 | `ao_user` | N/A | `ao_user@nrtec.edu` | N/A | `AO_ADMIN` | `AO_ADMIN` | **ACTIVE** | None | None |
| 24 | `civilhod` | Dr. P. Naga Sowjanya | `civilhod@nrtec.in` | CIVIL | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | **ACTIVE** | None | Designation: Professor & HOD - Civil; Phone: +91 98480 55001 |
| 25 | `creator_seminar_user` | N/A | `creator_seminar_user@nrtec.edu` | N/A | `CREATOR` | `CREATOR, SEMINAR_ADMIN` | **ACTIVE** | None | None |
| 26 | `creator_user` | N/A | `creator_user@nrtec.edu` | N/A | `CREATOR` | `CREATOR` | **ACTIVE** | None | None |
| 27 | `csehod` | Dr. S. N. Thirumala Rao | `csehod@nrtec.in` | CSE | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER, SEMINAR_COORDINATOR, SEMINAR_TECHNICIAN` | **ACTIVE** | SH-6 | Designation: Professor & HOD - CSE; Phone: +91 98852 71324 |
| 28 | `dept_user_blocked` | Dept User Blocked | `dept.blocked@nec.edu.in` | N/A | `DEPARTMENT_USER` | `DEPARTMENT_USER` | **ACTIVE** | None | None |
| 29 | `ecehod` | Dr. V. Venkata Rao | `ecehod@nrtec.in` | ECE | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER, SEMINAR_COORDINATOR` | **ACTIVE** | SH-1 | Designation: Professor & HOD - ECE; Phone: +91 98480 22001 |
| 30 | `eeehod` | Dr. Shaik Mahammad Shareef | `eeehod@nrtec.in` | EEE | `ACCOMMODATION_ADMIN` | `DEPARTMENT_HOD, DEPARTMENT_USER, ACCOMMODATION_ADMIN` | **ACTIVE** | None | Designation: Associate Professor & HOD - EEE; Phone: +91 98480 33001 |
| 31 | `electrician_user` | Campus Electrician | `campus.electrician@nec.edu.in` | N/A | `ELECTRICIAN` | `ELECTRICIAN` | **ACTIVE** | None | None |
| 32 | `gen_operator` | Generator Operator | `gen.operator@nec.edu.in` | N/A | `GENERATOR_OPERATOR` | `GENERATOR_OPERATOR` | **ACTIVE** | None | None |
| 33 | `mbahod` | Dr. Y. Anki Reddy | `mbahod@nrtec.in` | MBA | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | **ACTIVE** | None | Designation: Professor & HOD - MBA; Phone: +91 98480 77001 |
| 34 | `mechhod` | Dr. B. Venkata Siva | `mechhod@nrtec.in` | ME | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | **ACTIVE** | None | Designation: Professor & HOD - Mechanical; Phone: +91 98480 44001 |
| 35 | `mod_user` | N/A | `mod_user@nrtec.edu` | N/A | `SEMINAR_ADMIN` | `SEMINAR_ADMIN, TRANSPORT_ADMIN, DEPARTMENT_USER` | **ACTIVE** | None | None |
| 36 | `pharmhod` | Sample Pharmacy HOD | `sample.pharm.hod@nrtec.in` | PHARM | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, DEPARTMENT_USER` | **ACTIVE** | None | Designation: Sample HOD - Pharmacy; Phone: +91 98480 88001 |
| 37 | `seminarcoordinator1` | Seminar Coordinator 1 | `seminarcoordinator1@nrtec.in` | CSE | `SEMINAR_COORDINATOR` | `SEMINAR_COORDINATOR` | **ACTIVE** | SH-1 | Designation: Seminar Coordinator; Phone: +91 90000 00031 |
| 38 | `seminarcoordinator2` | Seminar Coordinator 2 | `seminarcoordinator2@nrtec.in` | ECE | `SEMINAR_COORDINATOR` | `SEMINAR_COORDINATOR` | **ACTIVE** | SH-2 | Designation: Seminar Coordinator; Phone: +91 90000 00032 |
| 39 | `seminarcoordinator3` | Seminar Coordinator 3 | `seminarcoordinator3@nrtec.in` | ME | `SEMINAR_COORDINATOR` | `SEMINAR_COORDINATOR` | **ACTIVE** | SH-3 | Designation: Seminar Coordinator; Phone: +91 90000 00033 |
| 40 | `seminarcoordinator4` | Seminar Coordinator 4 | `seminarcoordinator4@nrtec.in` | PHARM | `SEMINAR_COORDINATOR` | `SEMINAR_COORDINATOR` | **ACTIVE** | SH-4 | Designation: Seminar Coordinator; Phone: +91 90000 00034 |
| 41 | `seminarcoordinator5` | Seminar Coordinator 5 | `seminarcoordinator5@nrtec.in` | IT | `SEMINAR_COORDINATOR` | `SEMINAR_COORDINATOR` | **ACTIVE** | SH-5 | Designation: Seminar Coordinator; Phone: +91 90000 00035 |
| 42 | `sriramsriram123654` | soulfinder | `sriramsriram123654@gmail.com` | CSE | `DEPARTMENT_HOD` | `DEPARTMENT_HOD, AO_ADMIN` | **ACTIVE** | None | Phone: 9347158744 |
| 43 | `super_ao_user` | N/A | `super_ao_user@nrtec.edu` | N/A | `AO_ADMIN` | `AO_ADMIN, CREATOR` | **ACTIVE** | None | None |
| 44 | `tandavakrishnaanumolu` | A.Tandava krishna | `tandavakrishnaanumolu@gmail.com` | CSE | `SEMINAR_TECHNICIAN` | `SEMINAR_TECHNICIAN` | **ACTIVE** | SH-3 | Phone: 9493924576 |

---

## 2. Reconciled Account Breakdown & Analysis

### 2.1 Role Distribution Summary
Across the 44 registered user accounts, the distribution of assigned roles is as follows:
- **`DEPARTMENT_USER` (18 accounts):** Faculty and departmental requesters.
- **`DEPARTMENT_HOD` (9 accounts):** Heads of departments for CSE, ECE, EEE, ME, CIVIL, MBA, PHARM, AI.
- **`SEMINAR_COORDINATOR` (7 accounts):** Hall coordinators (`seminarcoordinator1` through `5`, plus `ecehod` and `csehod`).
- **`AO_ADMIN` (6 accounts):** `AO001` (Administrative Officer), `PRINCIPAL001` (Principal - Inactive), `sriramsriram123654` (Developer/HOD), `ao_user`, `super_ao_user`, `ao_seminar_admin`.
- **`ACCOMMODATION_ADMIN` (6 accounts):** `ACC001`, `ACC_BOYS`, `ACC_GIRLS`, `ACC_BOYS_TEST`, `ACC_GIRLS_TEST`, and `eeehod`.
- **`CREATOR` (4 accounts):** `CREATOR001`, `creator_user`, `super_ao_user`, `creator_seminar_user`.
- **`SEMINAR_ADMIN` (4 accounts):** `SEM001`, `mod_user`, `ao_seminar_admin`, `creator_seminar_user`.
- **`TRANSPORT_ADMIN` (2 accounts):** `TRN001`, `mod_user`.
- **`SEMINAR_TECHNICIAN` (2 accounts):** `tandavakrishnaanumolu` (`SH-3`), and `csehod` (`SH-6`).
- **`STATIONERY_ADMIN` (1 account):** `STA001`.
- **`MEALS_ADMIN` (1 account):** `MEA001`.
- **`ELECTRICIAN` (1 account):** `electrician_user`.
- **`GENERATOR_OPERATOR` (1 account):** `gen_operator`.

### 2.2 Inactive & Suspended Accounts
- **`PRINCIPAL001`:**
  - Name: Dr. S. Venkateswarlu
  - Registered Email: `principal@nrtec.i` (corrupted TLD!)
  - Status: **INACTIVE** (`active: false`)
  - Finding: The Principal's account has been deactivated in the database, and its registered email is syntactically invalid (`.i` instead of `.in`).

### 2.3 Non-Production & `.local` Domain Accounts (17 Accounts)
The following 17 accounts use mock or intranet `.local` domains:
1. `cse001@nrtec.local`
2. `ece001@nrtec.local`
3. `eee001@nrtec.local`
4. `me001@nrtec.local`
5. `civil001@nrtec.local`
6. `ai001@nrtec.local`
7. `mba001@nrtec.local`
8. `pharm001@nrtec.local`
9. `sem001@nrtec.local`
10. `acc001@nrtec.local`
11. `trn001@nrtec.local`
12. `sta001@nrtec.local`
13. `mea001@nrtec.local`
14. `acc_boys_test@nrtec.local`
15. `acc_girls_test@nrtec.local`
16. `acc_boys@nrtec.local`
17. `acc_girls@nrtec.local`

**Production Consequence:** Phase 1 recipient validation strictly rejects `.local` domains. All dispatches to these addresses in production are rejected before transmission, explaining why these accounts fail to receive email notifications.

### 2.4 Multi-Role Accounts of Significant Risk
1. **`sriramsriram123654` (`sriramsriram123654@gmail.com`):**
   - Holds: `AO_ADMIN` and `DEPARTMENT_HOD` (CSE).
   - This account is an active developer email that receives both administrative escalation emails and CSE departmental HOD emails.
2. **`eeehod` (`eeehod@nrtec.in`):**
   - Holds: `DEPARTMENT_HOD` (EEE), `DEPARTMENT_USER`, and `ACCOMMODATION_ADMIN`.
   - Primary role in DB is set to `ACCOMMODATION_ADMIN` instead of `DEPARTMENT_HOD`, though `roles` array contains `DEPARTMENT_HOD`.
3. **`csehod` (`csehod@nrtec.in`):**
   - Holds: `DEPARTMENT_HOD`, `DEPARTMENT_USER`, `SEMINAR_COORDINATOR`, `SEMINAR_TECHNICIAN`.
   - Assigned hall: `SH-6`.
