# Forensic Analysis of TO, CC, and BCC Email Routing

**Primary Finding:** 100% of the 144 historical email logs in MongoDB Atlas have `ccRecipients: []` (empty array).  
**BCC Status:** BCC is not supported or implemented anywhere in the backend notification subsystem.

---

## 1. Forensic Dissection: Why Are All CC Lists Empty?

In MongoDB Atlas, examining all 144 records in `email_logs` confirms:
- Field `primaryRecipient`: Populated in 100% of records.
- Field `ccRecipients`: Present in 100% of records as `[]` (empty list).

### A. Source Code Trace: `EmailService.java`
In `EmailService.java`, line 214:
```java
List<String> ccRecipients = resolveCcRecipients(eventCategory, notification, hall);
```
Looking at `resolveCcRecipients(eventCategory, notification, hall)`:
```java
private List<String> resolveCcRecipients(EventCategory eventCategory, Notification notification, SeminarHall hall) {
    List<String> cc = new ArrayList<>();
    if (hall != null && hall.getCcEmails() != null) {
        for (String email : hall.getCcEmails()) {
            if (isValidEmail(email)) {
                cc.add(email.trim().toLowerCase());
            }
        }
    }
    return cc;
}
```

### B. Database Evidence: `seminar_halls` Collection in Atlas
Querying the 6 seminar halls in MongoDB Atlas:
| Hall ID | Hall Name | Coordinator User ID | Technician User ID | `ccEmails` Field in Atlas |
| :--- | :--- | :--- | :--- | :--- |
| `SH-1` | Seminar Hall 1 (CSE) | `csehod` | `knag1999` | `[]` (Empty List) |
| `SH-2` | Seminar Hall 2 (ECE) | `ecehod` | `mrs90003` | `null` (Unset) |
| `SH-3` | Seminar Hall 3 (Mech) | `seminarcoordinator5`| `mallavarapubrijesh` | `null` (Unset) |
| `SH-4` | Seminar Hall 4 (Civil) | `viceprincipal` | `tandavakrishnaanumolu`| `null` (Unset) |
| `SH-5` | Seminar Hall 5 (Pharm) | `PHARM001` | `kotabalasuvarna` | `[]` (Empty List) |
| `TH-1` | Training Hall 1 (TPO) | `seminarcoordinator5`| `mallavarapubrijesh` | `null` (Unset) |

**Result:** Because `ccEmails` is `null` or `[]` in every single hall document, `resolveCcRecipients` returns an empty list every time.

---

## 2. Technical Support for CC across Dispatch Providers

### A. Google Apps Script Relay (`provider: APPS_SCRIPT`)
- In `EmailService.java` (`sendSingleEmailViaAppsScript`), the payload sent to Google Apps Script contains:
  ```json
  {
    "to": "recipient@nrtec.in",
    "cc": "cc1@nrtec.in, cc2@nrtec.in",
    "subject": "...",
    "body": "..."
  }
  ```
- If `ccRecipients` contains entries, the Java client joins them with commas and passes them in the `cc` property.
- Google Apps Script's `MailApp.sendEmail(options)` natively supports the `cc` option.

### B. Direct SMTP Provider (`provider: DIRECT_SMTP`)
- In `EmailService.java` (`sendSingleEmailViaSmtp`), the Spring `MimeMessageHelper` sets:
  ```java
  helper.setTo(recipient);
  if (ccRecipients != null && !ccRecipients.isEmpty()) {
      helper.setCc(ccRecipients.toArray(new String[0]));
  }
  ```
- The code handles CC correctly, but never receives any CC recipients from configuration.

---

## 3. Institutional Impact of Empty CC Recipients

1. **Department HOD Omission on Final Reports:**
   - When a pre-event or post-event inspection report is completed with the signed PDF, it is sent ONLY to the Coordinator, Technician, and Requester.
   - The Department HOD who approved the request in Stage 1 is **NOT CC'd**. The HOD has no record of facility handover or equipment damage unless they log into the portal.
2. **Administrative Officer Visibility:**
   - The Administrative Officer (`ao@nrtec.in`) is omitted from the CC list of finalized inspection PDFs.
3. **Recommendation:**
   - Configure institutional default CC lists in `seminar_halls` (e.g. `ao@nrtec.in` or departmental documentation mailboxes).
   - Add automated CC of the requester's Department HOD on all finalized inspection reports.
