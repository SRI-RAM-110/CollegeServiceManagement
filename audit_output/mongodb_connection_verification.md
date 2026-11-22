# Read-Only MongoDB Connection Verification Report

**Project:** NEC College Department Services Management System (`CollegeServiceManagement`)  
**Audit Date:** 2026-11-22  
**Audit Mode:** STRICTLY READ-ONLY (No config modifications, no backend restarts, no record mutations)  
**Target:** Spring Boot Backend MongoDB Connection Configuration & Runtime Status  

---

## 1. Executive Summary & Connection Verdict

| Attribute | Verified Status |
| :--- | :--- |
| **Active Connection Type** | **Local Standalone MongoDB Instance** |
| **Active Database Name** | `collegeservices_db` |
| **Active Host / Socket** | `127.0.0.1:27017` (Localhost) |
| **Cloud / Atlas Status** | **NOT CONNECTED to MongoDB Atlas** |
| **Connection Health** | **UP (100% Active)** — 6 established TCP connections from Spring Boot |
| **Role of MongoDB Compass** | **Client GUI Tool Only** (Not running, not a database server/proxy) |
| **Shares DB with Render Backend?** | **NO** (Local backend connects to local disk; Render connects to Atlas) |

The currently running local Spring Boot backend (PID `23524`) is actively and exclusively connected to a local standalone MongoDB instance (PID `5776`, version 8.3.7) running on `127.0.0.1:27017`. It does not connect to MongoDB Atlas, nor does it share a database with the live production Render backend.

---

## 2. Configuration Analysis & Resolution Hierarchy

Spring Boot resolves the MongoDB connection URI using the standard Spring Data MongoDB configuration hierarchy.

### 2.1 Configuration Sources Inspected

1. **`backend/src/main/resources/application.properties`**:
   ```properties
   spring.data.mongodb.uri=${MONGODB_URI:mongodb://127.0.0.1:27017/collegeservices_db}
   spring.data.mongodb.auto-index-creation=true
   spring.config.import=optional:classpath:application-local.properties,optional:file:./application-local.properties
   ```
   - Defines the default fallback URI: `mongodb://127.0.0.1:27017/collegeservices_db`.
   - Reads environment variable `MONGODB_URI` if present.

2. **`backend/src/main/resources/application-local.properties`**:
   - Contains only local developer overrides for email credentials (`local.mail.username` and `local.mail.password`).
   - Contains **no** `MONGODB_URI` or `spring.data.mongodb.uri` setting.

3. **OS Process Environment Variables**:
   - Inspected via PowerShell: `[bool]$env:MONGODB_URI` -> `False` (Not defined).

4. **JVM Command Line Arguments**:
   - Running process PID `23524` was launched without any `-Dspring.data.mongodb.uri` or `-DMONGODB_URI` flags.

### 2.2 Resolution Outcome
Because neither the system environment nor `application-local.properties` defines `MONGODB_URI`, Spring Boot resolves to the default fallback:
$$\text{URI} = \text{mongodb://127.0.0.1:27017/collegeservices_db}$$

---

## 3. Runtime Verification Evidence

Verification was conducted via non-invasive OS-level socket inspection and HTTP endpoint probes.

### 3.1 Local Processes
- **MongoDB Server:**
  - Process Name: `mongod.exe`
  - PID: `5776`
  - Version: MongoDB v8.3.7
  - Listening Port: `127.0.0.1:27017`
- **Spring Boot Backend:**
  - Process Name: `java.exe` (`CollegeServicesApplication`)
  - PID: `23524`
  - HTTP Port: `8080`

### 3.2 Network Socket Table (OS Ground Truth)
Inspection of TCP socket connections owned by PID `23524` confirms:

```text
LocalAddress    LocalPort  RemoteAddress  RemotePort  State        OwningProcess
127.0.0.1       65288      127.0.0.1      27017       Established  23524
127.0.0.1       65287      127.0.0.1      27017       Established  23524
127.0.0.1       60878      127.0.0.1      27017       Established  23524
127.0.0.1       57367      127.0.0.1      27017       Established  23524
127.0.0.1       57365      127.0.0.1      27017       Established  23524
127.0.0.1       57364      127.0.0.1      27017       Established  23524
```
- **Local Sockets:** 6 established TCP connections directly between `CollegeServicesApplication` and `mongod.exe` on `127.0.0.1:27017`.
- **Remote / Cloud Sockets:** **0** outbound connections from PID `23524` to any external IP, cloud provider, or Atlas cluster.

### 3.3 Backend Health Endpoint
A probe to the running application health endpoint confirmed normal connectivity:
- **Request:** `GET http://localhost:8080/api/health`
- **Response:** `HTTP 200 OK`
- **Body:** `{"status": "UP", "service": "College Services Backend"}`

---

## 4. Role of MongoDB Compass

A common area of confusion is whether the application connects "through" or "to" MongoDB Compass.

1. **What Compass Is:**
   - MongoDB Compass (version 1.53.3 installed at `C:\Users\srira\AppData\Local\MongoDBCompass\MongoDBCompass.exe`) is an **administrative graphical user interface (GUI) client**.
2. **Current Execution State:**
   - Compass is **not currently running** on the host machine.
3. **Architectural Separation:**
   - The backend does **not** connect to or through Compass.
   - Compass and the Spring Boot backend are both client applications that connect to the underlying database engine (`mongod.exe`).

---

## 5. Comparison: Local Backend vs. Production Render Backend

| Dimension | Local Developer Backend | Production Render Backend |
| :--- | :--- | :--- |
| **Runtime Environment** | Windows 11 Host (`127.0.0.1`) | Linux Container (Render Cloud) |
| **Connection String** | `mongodb://127.0.0.1:27017/collegeservices_db` | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/collegeservices_db?retryWrites=true&w=majority` |
| **Topology** | Standalone Single-Node `mongod` | MongoDB Atlas 3-Node Replica Set (`primary` + 2 `secondaries`) |
| **Shared Data?** | **NO** — Operates on local storage. | **NO** — Operates on MongoDB Atlas cloud cluster. |
| **Multi-Doc Transactions** | Not supported (Standalone local MongoDB lacks oplog / replica set). | Supported (Atlas replica set with write concern `majority`). |

---

## 6. Conclusion & Recommendations

1. **Current State:** The local development backend is securely isolated from the production database. All local testing, user creation, and service requests write exclusively to local storage.
2. **Transaction Note for Phase 3:** Because the local instance is a standalone `mongod` server (without replica set clustering enabled), MongoDB multi-document transactions cannot execute locally unless the local `mongod` is initiated as a single-node replica set (`--replSet rs0`). On Render production, MongoDB Atlas is already a replica set.
