# Catalogue of System Email Subjects and HTML Body Templates

**Brand Identity:** Narasaraopeta Engineering College (NEC) Autonomous Services Management  
**Rendering Engine:** Thymeleaf / Spring MimeMessageHelper HTML Templates

---

## 1. Subject Header Standards

The system adheres to an institutional naming convention for all generated email subjects:
```
[NEC Services] {Service Name} - {Event Description} ({ReferenceId})
```

### Complete Subject Line Catalogue:
1. **New Request:** `[NEC Services] New Seminar Hall Request (AO-SEM-0023)`
2. **HOD Approval:** `[NEC Services] Request Approved by HOD (AO-SEM-0023)`
3. **HOD Rejection:** `[NEC Services] Request Rejected by HOD (AO-SEM-0023)`
4. **AO Approval:** `[NEC Services] Request Approved by AO (AO-SEM-0023)`
5. **AO Rejection:** `[NEC Services] Request Rejected by AO (AO-SEM-0023)`
6. **Coordinator Approval:** `[NEC Services] Seminar Hall Booking Confirmed (AO-SEM-0023)`
7. **Inspection PDF Delivery:** `[NEC Services] Inspection Report: Pre-Event Inspection for Seminar Hall 1 (AO-SEM-0023)`
8. **Inspection Post-Event Delivery:** `[NEC Services] Inspection Report: Post-Event Inspection for Seminar Hall 1 (AO-SEM-0023)`
9. **Cancellation Notice:** `[NEC Services] Request Cancelled (AO-SEM-0023)`
10. **Maintenance Alert:** `[NEC Services] Electrical Maintenance Ticket Assigned (AO-ELEC-0012)`
11. **Password Reset:** `[NEC Services] Password Reset Request`

---

## 2. Standard Transactional Email Body Template Structure

All HTML emails feature responsive corporate styling with institutional branding:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background: #1a365d; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 25px; color: #2d3748; line-height: 1.6; }
        .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .details-table td { padding: 8px 12px; border-bottom: 1px solid #edf2f7; }
        .details-table td.label { font-weight: bold; color: #4a5568; width: 35%; }
        .button { display: inline-block; padding: 12px 24px; background: #2b6cb0; color: #ffffff; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { background: #edf2f7; color: #718096; padding: 15px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Narasaraopeta Engineering College</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Autonomous - Department Services Portal</p>
        </div>
        <div class="content">
            <h2 style="color: #2b6cb0; margin-top: 0;">{EVENT_TITLE}</h2>
            <p>Dear {RECIPIENT_NAME},</p>
            <p>{EVENT_MESSAGE}</p>
            <table class="details-table">
                <tr><td class="label">Reference ID:</td><td><strong>{REFERENCE_ID}</strong></td></tr>
                <tr><td class="label">Service Module:</td><td>{SERVICE_NAME}</td></tr>
                <tr><td class="label">Status:</td><td>{STATUS_BADGE}</td></tr>
                <tr><td class="label">Requested By:</td><td>{REQUESTER_NAME} ({DEPARTMENT})</td></tr>
                <tr><td class="label">Date / Time:</td><td>{DATE_TIME}</td></tr>
            </table>
            <div style="text-align: center;">
                <a href="{PORTAL_ACTION_URL}" class="button">View Details in Portal</a>
            </div>
        </div>
        <div class="footer">
            <p>This is an automated notification from the NEC College Department Services Management System.</p>
            <p>&copy; Narasaraopeta Engineering College. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

---

## 3. Password Reset Security Template

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f7fafc; padding: 20px;">
    <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 25px; border-radius: 6px; border: 1px solid #e2e8f0;">
        <h3 style="color: #2d3748; margin-top: 0;">Password Reset Request</h3>
        <p>Hello,</p>
        <p>We received a request to reset the password for your account in the NEC College Services portal.</p>
        <p>Click the button below to choose a new password. This link is valid for <strong>15 minutes</strong>.</p>
        <div style="text-align: center; margin: 25px 0;">
            <a href="{RESET_LINK}" style="background: #e53e3e; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #718096;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
</body>
</html>
```
