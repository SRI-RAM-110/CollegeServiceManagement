# Vulnerability and Notification Gap Analysis

**Audit Classification:** Forensic Security & Defect Catalogue  
**Severity Scale:** CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL

---

## 1. Summary of Identified Gaps

| Gap ID | Severity | Category | Defect Title / Description | Primary Affected Accounts |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | **HIGH** | Over-Notification | College Principal receiving all routine administrative and maintenance alerts | `PRINCIPAL001` (`p*******l@nrtec.in`) |
| **GAP-02** | **MEDIUM** | Missing Notification | Seminar inspection PDF reports omit Department HOD and AO from CC list | Department HODs, `ao` |
| **GAP-03** | **MEDIUM** | Configuration Defect | All 6 Seminar Halls have `null` or empty `ccEmails` in MongoDB Atlas | All Seminar Coordinators |
| **GAP-04** | **HIGH** | Delivery Failure | Direct SMTP provider quota exhaustion (6 failed dispatches on 2026-11-22) | `ao`, `audit_tech_1`, `audit_elec_2` |
| **GAP-05** | **LOW** | Legacy Data Quality | Historical dispatches sent to invalid domain typos (`.i`, `.co`) | Unregistered test addresses |
| **GAP-06** | **MEDIUM** | Role Mapping Gap | Boys Hostel Admin role unassigned in Atlas; routed to general AO | Male hostel students & wardens |
| **GAP-07** | **LOW** | Filter Exception | Hardcoded developer email suppression in `EmailService.java` | `sriramsriram123654` |

---

## 2. In-Depth Technical Defect Analysis

### Gap 01: Principal Over-Notification (Severity: HIGH)
- **Root Cause:** Both the Administrative Officer (`ao`) and the College Principal (`PRINCIPAL001`) hold the role `AO_ADMIN`. In `EmailService.java` line 452:
  ```java
  List<User> aoAdmins = userRepository.findByRole(Role.AO_ADMIN);
  ```
  The code treats all users with `AO_ADMIN` as equal recipients for all operational tickets.
- **Impact:** The College Principal received 19 operational emails, including low-level electrical repair assignments and routine stationery indents.
- **Remediation:** Introduce a dedicated `Role.PRINCIPAL` or add a filter predicate in `resolvePrimaryRecipients` so routine tickets are sent solely to `ao@nrtec.in`.

### Gap 02: Omission of Department HOD and AO on Inspection PDFs (Severity: MEDIUM)
- **Root Cause:** In `SeminarInspectionService.java` lines 580-610, the distribution list for completed pre/post-event inspection PDFs includes only:
  1. The Seminar Hall Coordinator
  2. The Assigned Technician
  3. The Staff Requester
- **Impact:** The Department HOD who approved the event and the Administrative Officer have no record of facility handover or equipment condition.
- **Remediation:** Automatically include the requesting department HOD and AO in the CC list of inspection completion events.

### Gap 03: Empty `ccEmails` in `seminar_halls` Collection (Severity: MEDIUM)
- **Root Cause:** MongoDB Atlas `seminar_halls` documents were seeded without `ccEmails` or with empty arrays `[]`.
- **Impact:** The CC functionality remains completely unutilized across the entire system.
- **Remediation:** Populate `ccEmails` in Atlas for each hall with relevant departmental and facilities management addresses.

### Gap 04: SMTP Provider Quota Exhaustion (Severity: HIGH)
- **Root Cause:** Google SMTP imposes a 500-recipient daily limit. During test execution on 2026-11-22, 6 dispatches failed with `550-5.4.5 Daily user sending limit exceeded`.
- **Impact:** Critical notifications are dropped when quota is breached.
- **Remediation:** Enforce Google Apps Script Web App relay (`APPS_SCRIPT`) as the primary production provider (1,500/day limit) with automatic fallback and durable outbox retry.

### Gap 05: Malformed Email Domain Input in Historical Logs (Severity: LOW)
- **Root Cause:** In early testing prior to Phase 1 recipient validation, requests could be submitted with typo domains such as `p*******l@nrtec.i` and `n*************7@gmail.co`.
- **Impact:** Emails were dispatched to non-existent domains.
- **Remediation:** Phase 1 recipient validation has resolved this by enforcing RFC 5322 validation and domain TLD checks before dispatch.
