# Tri-Channel Notification Comparison: Email vs In-App vs Push (FCM)

**Application Engine:** `NotificationService.java`  
**Channels Evaluated:**
1. In-App Notification (MongoDB `notifications` collection)
2. Email Notification (MongoDB `email_logs` collection via `EmailService.java`)
3. Web Push / Mobile Push (Firebase Cloud Messaging via `FcmService.java`)

---

## 1. Tri-Channel Architecture Overview

```
                      [Application Service Event]
                                   │
                                   ▼
                       NotificationService.java
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   [In-App Store]          [Push Dispatcher]         [Email Dispatcher]
MongoDB: notifications     FCM Web / Mobile Push     EmailService.java
Synchronous Write          Asynchronous Task         Asynchronous Task
Guaranteed Delivery        Device Token Required     Apps Script / SMTP
```

---

## 2. Channel Feature Comparison Matrix

| Operational Dimension | In-App Notifications | Email Notifications | Push Notifications (FCM) |
| :--- | :--- | :--- | :--- |
| **Persistence Store** | MongoDB Atlas `notifications` collection | MongoDB Atlas `email_logs` collection | Ephemeral (delivered to client browser/device) |
| **Delivery Model** | Synchronous with business transaction | Asynchronous (`@Async` thread pool) | Asynchronous (`CompletableFuture`) |
| **Failure Decoupling** | Critical failure aborts business action | **Decoupled:** Email failure never rolls back DB | **Decoupled:** Push failure is swallowed |
| **Recipient Identifier** | `userId` (e.g. `csehod`) | `primaryRecipient` (email address) | FCM Registration Token |
| **Delivery Guarantee** | Immediate DB record availability | At-least-once via outbox / retry | Best-effort (depends on user browser active state) |
| **Rich Attachments** | Action URL / Deep link | **Signed PDF Attachments** | Short summary + icon |
| **Read Tracking** | `isRead: true/false`, timestamp | Unopened / Opened tracking not implemented | Interaction tracking via client analytics |
| **Offline Availability** | Available on next user login | Stored in user's external email inbox | Stored in system notification tray |

---

## 3. Discrepancy & Isolation Analysis

### A. Failure Isolation
When the 6 email dispatches failed on 2026-11-22 due to SMTP quota limits:
- The corresponding `Notification` records in MongoDB Atlas were **successfully created and retained**.
- Affected users (`ao`, `audit_tech_1`, etc.) still received in-app notifications in their web portal dashboards.
- This confirms robust architecture: **Email service outages do not break in-app workflow progression.**

### B. Recipient Mapping Divergence
- In-App notifications are tied directly to `userId` (e.g. `userId: "ao"`).
- Email notifications require resolving `userId` to `email` via `UserRepository`.
- If an account has an invalid, typo-ridden, or missing email address in MongoDB, in-app notifications will succeed, but email dispatch will fail or be skipped.

### C. Password Reset Exception
- Password reset events generate **strictly Email notifications**.
- In-app and push channels are intentionally bypassed for password resets to prevent session-hijacking and security token leakage.
