# 04. Email Subject and Body Catalogue

**Audit Date:** November 22, 2026  
**Execution Mode:** STRICTLY READ-ONLY  
**Source File:** `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` & `SeminarInspectionService.java`  

---

## 1. Overview of System Email Templates

The application utilizes four distinct email generation mechanisms:
1. **Generic Departmental Service Template (HTML & Plain Text):** Powers all routine notifications (Seminar, Accommodation, Transport, Stationery, Meals, Electrical, Generator, Announcements).
2. **Seminar Inspection Report Template with PDF Attachment (HTML & Plain Text):** Powers the formal distribution of inspection reports to Requester, Coordinator, and Technician.
3. **Password Reset Verification Template (HTML & Plain Text):** Powers the time-sensitive 15-minute token reset flow.
4. **Controlled Administrative Attachment Test Template:** Powers diagnostic validation in `AdminEmailTestController.java`.

---

## 2. Template 1: Generic Departmental Service Template

- **Method:** `EmailService.buildHtmlEmailBody()` (HTML) & `EmailService.buildPlainTextEmailBody()` (Text)
- **Source Lines:** `EmailService.java:1284-1416`
- **Reachability:** Reached by all 34 operational event categories.

### 2.1 Subject Line Expression:
`"[NEC Services] " + (notification.getTitle() != null ? notification.getTitle() : "Notification")`

### 2.2 Dynamic Badge Expressions:
- `REQUEST_SUBMITTED` $ightarrow$ `#0284c7` (Sky Blue) | **Submitted**
- `REQUEST_APPROVED` $ightarrow$ `#16a34a` (Green) | **Approved**
- `REQUEST_RESCHEDULED` $ightarrow$ `#0d9488` (Teal) | **Rescheduled**
- `REQUEST_REJECTED` $ightarrow$ `#dc2626` (Red) | **Rejected**
- `REQUEST_CANCELLED` $ightarrow$ `#ea580c` (Orange) | **Cancelled**
- `REQUEST_CANCEL_REQUESTED` $ightarrow$ `#d97706` (Amber) | **Cancellation Requested**
- `TEST_EVENT` $ightarrow$ `#7c3aed` (Purple) | **Test Verification**
- Default $ightarrow$ `#2563eb` (Blue) | **Notification**

### 2.3 HTML Body Template Excerpt:
```html
<!DOCTYPE html>
<html><head><meta charset='UTF-8'>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px; color: #ffffff; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
.header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
.body-content { padding: 28px 24px; }
.badge { background-color: {badgeColor}; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
.req-id { font-family: monospace; font-size: 14px; font-weight: 700; color: #334155; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
.card-title { font-size: 18px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }
.message-box { background-color: #f8fafc; border-left: 4px solid {badgeColor}; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; line-height: 1.5; color: #334155; }
.action-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
.footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style></head><body>
<div class='container'>
  <div class='header'>
    <h1>NARASARAOPETA ENGINEERING COLLEGE</h1>
    <p>College Department Services Management System</p>
  </div>
  <div class='body-content'>
    <div>
      <span class='badge'>{badgeText}</span>
      <span class='req-id' style='float: right;'>#{reqId}</span>
      <div style='clear: both;'></div>
    </div>
    <h2 class='card-title'>{notification.getTitle()}</h2>
    <div class='message-box'>{notification.getMessage()}</div>
    <table class='details-table'>
      <tr><td class='label'>Service</td><td class='value'>{serviceName}</td></tr>
      <tr><td class='label'>Request ID</td><td class='value'>{reqId}</td></tr>
      <tr><td class='label'>Status</td><td class='value'><strong style='color: {badgeColor};'>{badgeText}</strong></td></tr>
      <tr><td class='label'>Timestamp</td><td class='value'>{dateStr}</td></tr>
    </table>
    <div style='text-align: center; margin-top: 24px;'>
      <a href='{portalUrl}' class='action-btn' target='_blank'>View in Portal</a>
    </div>
  </div>
  <div class='footer'>
    <p>This is an automated notification from NEC Department Services Management System.</p>
    <p>Please do not reply directly to this email.</p>
    <p>&copy; {Year} Narasaraopeta Engineering College (Autonomous). All rights reserved.</p>
  </div>
</div>
</body></html>
```

### 2.4 Plain Text Body Template:
```text
=======================================================
NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)
College Department Services Management System
=======================================================

Notification: {notification.getTitle()}
Request ID: {reqId}
Service: {serviceName}
Event: {eventCategory}
Timestamp: {dateStr}

Details:
{notification.getMessage()}

View Request in Portal: {portalUrl}

-------------------------------------------------------
This is an automated notification. Please do not reply directly.
```

---

## 3. Template 2: Seminar Inspection Report Template (with PDF Attachment)

- **Method:** `SeminarInspectionService.buildReportEmailHtml()` & `buildReportEmailPlainText()`
- **Source Lines:** `SeminarInspectionService.java:650-745`
- **Reachability:** Reached exclusively upon successful pre- and post-event inspection completion.

### 3.1 Subject Line Expression:
`"[NEC Inspection] Event Inspection Report — " + inspection.getHallName() + " (" + inspection.getBookingId() + ")"`

### 3.2 HTML Body Template Excerpt:
```html
<!DOCTYPE html>
<html><head><meta charset='UTF-8'>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
.header { background: linear-gradient(135deg, #1e3a8a 0%, #15803d 100%); padding: 24px; color: #ffffff; text-align: center; }
.badge-pdf { background-color: #15803d; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.attachment-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
</style></head><body>
<div class='container'>
  <div class='header'>
    <h1>NARASARAOPETA ENGINEERING COLLEGE</h1>
    <p>Seminar Hall Inspection & Clearance Authority</p>
  </div>
  <div style='padding: 24px;'>
    <span class='badge-pdf'>OFFICIAL INSPECTION REPORT ATTACHED</span>
    <h2 style='color: #0f172a; margin-top: 12px;'>Inspection Report: {hallName}</h2>
    <p>The pre-event and post-event technical facility inspection for booking <strong>#{bookingId}</strong> ({eventTitle}) has been completed.</p>
    <div class='attachment-box'>
      <p style='color: #166534; font-weight: 600; margin: 0 0 8px 0;'>PDF Report Attached to this Email</p>
      <code style='background: #dcfce7; padding: 4px 8px; border-radius: 4px; font-size: 13px;'>{pdfFilename}</code>
    </div>
    <table style='width: 100%; border-collapse: collapse; font-size: 13px;'>
      <tr><td style='padding: 6px 0; color: #64748b;'>Hall</td><td><strong>{hallName}</strong></td></tr>
      <tr><td style='padding: 6px 0; color: #64748b;'>Occurrence Date</td><td>{occurrenceDate} ({slot})</td></tr>
      <tr><td style='padding: 6px 0; color: #64748b;'>Department</td><td>{department}</td></tr>
      <tr><td style='padding: 6px 0; color: #64748b;'>Coordinator</td><td>{coordinatorName} ({coordinatorUserId})</td></tr>
      <tr><td style='padding: 6px 0; color: #64748b;'>Technician</td><td>{technicianName} ({technicianUserId})</td></tr>
    </table>
  </div>
  <div style='background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;'>
    <p>Automated distribution from NEC Seminar Management Authority. The attached PDF contains full inspection checklists.</p>
  </div>
</div></body></html>
```

### 3.3 Attachment Specification:
- **Filename Pattern:** `NEC_Inspection_Report_{bookingId}_{occurrenceDate}.pdf`
- **MIME Type:** `application/pdf`
- **Magic Bytes Validation:** Enforces `%PDF-` (`0x25, 0x50, 0x44, 0x46, 0x2D`) at byte offset 0.
- **Size Bounds:** Typically 80 KB to 350 KB. Enforced maximum: 10 MB (relay), 2.5 MB (outbox).

---

## 4. Template 3: Password Reset Verification Template

- **Method:** `EmailService.buildPasswordResetHtml()` & `buildPasswordResetPlainText()`
- **Source Lines:** `EmailService.java:1462-1530`
- **Reachability:** Reached on `POST /api/auth/forgot-password`.

### 4.1 Subject Line Expression:
`"[NEC Services] Password Reset Request"`

### 4.2 Security Rules Enforced:
- Strictly **NO CC** recipients.
- Strictly **NO BCC** recipients.
- Reset token validity: **15 Minutes**.
- Deduplication key: `PWD_RESET:{cleanEmail}:{tokenHashPrefix}`.
- Reset URL: `{frontendUrl}/reset-password?token={rawToken}`.

### 4.3 HTML Body Template Excerpt:
```html
<div class='container'>
  <div class='header'>
    <h1>NARASARAOPETA ENGINEERING COLLEGE</h1>
    <p>College Department Services Management System</p>
  </div>
  <div class='body-content'>
    <h2 class='card-title'>Password Reset Request</h2>
    <p>{greeting}</p>
    <p>We received a request to reset your password for your institutional account on the NEC Services Management Portal.</p>
    <div style='text-align: center; margin: 24px 0;'>
      <a href='{resetLink}' class='action-btn' target='_blank'>Reset Password</a>
    </div>
    <div class='message-box'>
      <strong>Security Notice:</strong> This password reset link is valid for <strong>15 minutes</strong> and can only be used once. If you did not request this reset, you can safely ignore this email; your existing password will remain secure and unchanged.
    </div>
    <p class='expiry-note'>If the button above does not work, copy and paste the following link into your browser:<br>
    <span style='word-break: break-all; color: #2563eb;'>{resetLink}</span></p>
  </div>
  <div class='footer'>
    <p>This is an automated system email. Please do not reply directly.</p>
    <p>&copy; {Year} Narasaraopeta Engineering College (Autonomous). All rights reserved.</p>
  </div>
</div>
```

---

## 5. Template 4: Controlled Diagnostic Attachment Test Template

- **Method:** `AdminEmailTestController.dispatchTestAttachment()`
- **Source Lines:** `AdminEmailTestController.java:180-210`
- **Reachability:** Reached exclusively when `APP_MAIL_TEST_ATTACHMENT_ENABLED=true` by authenticated `AO_ADMIN`.

### 5.1 Subject Line Expression:
`"[NEC Diagnostic] Production PDF Email Attachment Test (Option 2)"`

### 5.2 Attachment Details:
- **Filename:** `NEC_Diagnostic_Test_Report.pdf`
- **MIME Type:** `application/pdf`
- **Recipient Restriction:** Strictly pinned to `collegeservice2026@gmail.com`.
- **Deduplication Key:** `PROD-ATTACHMENT-TEST-SINGLETON`.
