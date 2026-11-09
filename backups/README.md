# Database Backup Directory Documentation
**Narasaraopeta Engineering College — College Services Management System**

---

## 1. Asset Inventory and Classification

### `backups/resources_pre_migration_20261101/`
* **Created**: 2026-11-01
* **Contents**:
  * `accommodation_rooms.json` (2.7 KB)
  * `seminar_halls.json` (3.4 KB)
  * `stationery_items.json` (4.9 KB)
  * `vehicles.json` (2.2 KB)
* **CLASSIFICATION**: **PARTIAL STATIC REFERENCE CATALOG ONLY**
* **PURPOSE**: This directory contains a pre-migration baseline of physical college resource configurations.

### CRITICAL SCOPE RESTRICTION
This snapshot **DOES NOT** contain:
* User accounts, authentication credentials, or role mappings (`users`)
* Booking records or event schedules (`seminar_bookings`)
* Guest room requisitions (`accommodation_requests`)
* Vehicle travel requests (`transport_requests`)
* Stationery requisitions (`stationery_requests`)
* Catering and refreshment orders (`meal_requests`)
* Maintenance tickets (`electrical_issues`)
* Dispatch telemetry and audit logs (`email_logs`)
* In-app notifications (`notifications`)
* Department metadata (`departments`)
* Campus bulletins (`announcements`)

> [!WARNING]
> **DO NOT ATTEMPT TO RESTORE THIS DIRECTORY AS A FULL DATABASE BACKUP.**  
> It does not contain transactional data, user accounts, or operational history.

---

## 2. Operational Rules

1. **NEVER USE `mongorestore --drop`**:
   The `--drop` command drops existing database collections before restoring, causing catastrophic, permanent loss of all user accounts, booking schedules, and operational history.
2. **ISOLATED STAGING RESTORES ONLY**:
   Any restoration test must be executed into an isolated verification database (e.g. `collegeservices_recovery_verify`) using namespace remapping (`--nsFrom` / `--nsTo`). Never restore directly over production `collegeservices_db`.
3. **MANDATORY SAFETY SNAPSHOT**:
   Before performing any maintenance or recovery on production, capture a complete point-in-time safety dump of the active database.
4. **CREDENTIAL PROTECTION**:
   Never commit raw connection strings, usernames, or passwords in backup directories or scripts.

