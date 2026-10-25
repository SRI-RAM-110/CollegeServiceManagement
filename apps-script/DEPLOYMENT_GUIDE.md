# Google Apps Script Email Relay Deployment Guide

This guide walks you through deploying the Google Apps Script HTTPS Email Relay for Narasaraopeta Engineering College Services Management System.

---

## Architecture & How It Works

- **Render Free Limitation**: Outbound SMTP connections to ports 25, 465, and 587 on Render Free tier are blocked or time out (`SocketTimeoutException`).
- **Solution**: The backend sends an HTTPS POST request (`https://script.google.com/macros/s/.../exec`) to your deployed Google Apps Script web app over port 443 (standard HTTPS).
- **Security**: The web app executes under your Google Account (`Execute as: Me`) and is accessible by `Anyone` server-to-server. Every incoming request must provide a shared secret matching `RELAY_SECRET` configured in Script Properties. Unauthorized requests and malformed payloads are immediately rejected.
- **Privacy & Hall CC**: Only seminar hall booking emails will include CC addresses configured for that specific seminar hall in MongoDB. All other workflows (Transport, Accommodation, Meals, Stationery, Password Reset, and Test Emails) use an empty CC list (`[]`).

---

## Step 1: Open Google Apps Script

1. In your browser, navigate to: [https://script.google.com/home](https://script.google.com/home).
2. Sign in with your Google account (e.g., your institution or department Gmail).
3. Click **New project** (top-left).
4. Rename the project to: `NEC College Email Relay`.

---

## Step 2: Paste the Relay Code

1. In the Apps Script code editor, delete any code inside `Code.gs`.
2. Open [`apps-script/Code.gs`](file:///c:/Users/srira/Desktop/CollegeServiceManagement/apps-script/Code.gs) and copy its entire contents.
3. Paste the contents into `Code.gs` in the Apps Script editor.
4. Click the **Save** icon (floppy disk) or press `Ctrl + S`.

---

## Step 3: Configure the Shared Secret (Script Properties)

1. In the left sidebar of the Google Apps Script editor, click on **Project Settings** (the gear icon ⚙️).
2. Scroll down to the **Script Properties** section.
3. Click **Add script property**.
4. Set:
   - **Property**: `RELAY_SECRET`
   - **Value**: Generate a strong random key (e.g., `nec_relay_sec_` followed by 32 random alphanumeric characters, such as `nec_relay_sec_8f9a2b4c6e1d3f5a7b9c0e2d4f6a8b1c`).
5. Click **Save script properties**.

> **Note**: Save this secret securely; you will need to add it to your Render Environment Variables.

---

## Step 4: Deploy as Web App

1. In the top-right corner, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment configuration:
   - **Description**: `NEC Production Email Relay v1`
   - **Execute as**: **Me (your-email@gmail.com)** *(Crucial: allows server-to-server execution using your quota)*
   - **Who has access**: **Anyone** *(Crucial: enables Render backend to call the URL without an interactive Google login prompt)*
4. Click **Deploy**.
5. When prompted with **Authorization required**:
   - Click **Authorize access**.
   - Select your Google account.
   - If you see *"Google hasn't verified this app"*, click **Advanced** (bottom left), then click **Go to NEC College Email Relay (unsafe)**.
   - Click **Allow** to grant permissions for sending email.
6. Once deployed, copy the **Web app URL**:
   - Example: `https://script.google.com/macros/s/AKfycbz.../exec`

---

## Step 5: Verify the Deployment in Your Browser

Open the copied Web app URL in a browser tab. You should receive a JSON response:
```json
{
  "success": true,
  "status": "ONLINE",
  "service": "NEC College Service Management - Email Relay",
  "secretConfigured": true,
  "timestamp": "2026-10-25T..."
}
```
If `secretConfigured` is `true`, your relay is deployed and ready.

---

## Step 6: Configure Render Environment Variables

In your Render Dashboard for the `collegeservices-backend` web service:

1. Go to **Environment** tab.
2. Add/update the following environment variables:

| Key | Value | Description |
|---|---|---|
| `APP_MAIL_PROVIDER` | `apps-script` | Selects Google Apps Script HTTPS relay mode |
| `APP_SCRIPT_MAIL_URL` | `https://script.google.com/macros/s/.../exec` | Deployed Web App URL from Step 4 |
| `APP_SCRIPT_MAIL_SECRET` | *(The exact secret entered in Step 3)* | Matches `RELAY_SECRET` in Apps Script |

3. Click **Save Changes**. Render will automatically redeploy the backend with the new configuration.

---

## Step 7: Local Development vs Production

- **Localhost (`local`)**:
  - `APP_MAIL_PROVIDER` defaults to `local`.
  - Spring Boot continues using `JavaMailSender` and local Gmail SMTP (`application-local.properties` or environment variables).
  - No changes needed for local development.

- **Render Production (`apps-script`)**:
  - Setting `APP_MAIL_PROVIDER=apps-script` routes all outgoing emails via HTTPS POST to your Google Apps Script relay.
