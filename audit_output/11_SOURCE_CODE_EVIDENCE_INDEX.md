# 11. Source Code Evidence Index

**Audit Date:** November 22, 2026  
**Execution Mode:** STRICTLY READ-ONLY  

---

## 1. Key Source Files & Method References

| Component | Repository-Relative Path | Relevant Lines | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **`NotificationService`** | `backend/src/main/java/com/nec/collegeservices/service/NotificationService.java` | Lines 26–72 | In-app notification creation, Web Push, FCM, and async email trigger. |
| **`EmailService`** | `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` | Lines 320–359 | Async entry point, event classification, recipient resolution. |
| **`EmailService` (AO Filtering)** | `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` | Lines 453–470 | Operational vs Executive AO_ADMIN recipient filtering. |
| **`EmailService` (CC Logic)** | `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` | Lines 485–514 | CC recipient resolution (Hall CCs, HOD CCs, exclusions). |
| **`EmailService` (HOD CCs)** | `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` | Lines 549–565 | Dynamic resolution of department HOD emails from `users`. |
| **`EmailService` (Templates)** | `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` | Lines 1284–1416 | HTML and plain-text generic email body generation. |
| **`EmailService` (Password Reset)** | `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` | Lines 1429–1530 | Password reset template, reset link, and timestamp key flaw. |
| **`EmailService` (Attachments)** | `backend/src/main/java/com/nec/collegeservices/service/EmailService.java` | Lines 1565–1864 | PDF attachment validation, base64 encoding, magic bytes check. |
| **`SeminarService`** | `backend/src/main/java/com/nec/collegeservices/service/SeminarService.java` | Lines 620–1410 | Seminar booking lifecycle notifications. |
| **`SeminarInspectionService`**| `backend/src/main/java/com/nec/collegeservices/service/SeminarInspectionService.java` | Lines 550–640 | Pre/post inspection notification and PDF distribution. |
| **`AccommodationService`** | `backend/src/main/java/com/nec/collegeservices/service/AccommodationService.java` | Lines 426–1750 | Accommodation request lifecycle notifications. |
| **`TransportService`** | `backend/src/main/java/com/nec/collegeservices/service/TransportService.java` | Lines 577–755 | Transport request lifecycle notifications. |
| **`StationeryService`** | `backend/src/main/java/com/nec/collegeservices/service/StationeryService.java` | Lines 202–416 | Stationery request lifecycle notifications. |
| **`MealService`** | `backend/src/main/java/com/nec/collegeservices/service/MealService.java` | Lines 214–335 | Meal/snack request lifecycle notifications. |
| **`ElectricalIssueService`**| `backend/src/main/java/com/nec/collegeservices/service/ElectricalIssueService.java` | Lines 152–578 | Electrical issue reporting and resolution notifications. |
| **`UnifiedRequestService`**| `backend/src/main/java/com/nec/collegeservices/service/UnifiedRequestService.java` | Lines 416–674 | Multi-service unified request lifecycle notifications. |
| **`AnnouncementController`**| `backend/src/main/java/com/nec/collegeservices/controller/AnnouncementController.java` | Lines 45–60 | Announcement broadcast notifications. |
| **`AuthService`** | `backend/src/main/java/com/nec/collegeservices/service/AuthService.java` | Lines 140–185 | Password reset request handling and token generation. |
| **`EmailRecipientValidator`**| `backend/src/main/java/com/nec/collegeservices/service/EmailRecipientValidator.java` | Lines 20–110 | Strict RFC 5322 regex validation and email normalization. |
| **`EmailDeduplicationService`**| `backend/src/main/java/com/nec/collegeservices/service/EmailDeduplicationService.java` | Lines 88–355 | MongoDB-backed atomic lease claims and fencing token protection. |
