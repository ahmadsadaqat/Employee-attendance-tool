# Frappe Zkteco Bridge for Punches checkin and checkout

A robust, offline-first Electron and React desktop application designed to bridge the gap between ZKTeco biometric devices and your Frappe / ERPNext backend. It connects directly to your local hardware, securely local-caches attendance data, and seamlessly pushes check-in and check-out logs to your server.

## Table of Contents
1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Development](#3-development)

---

## 1. Overview

### What it provides
*   **Direct Hardware Connection:** Connects and interacts directly with ZKTeco biometric models over TCP/IP to fetch physical punches.
*   **Offline-First Reliability:** Implements a local SQLite cache. Network outages or Frappe downtime will never result in lost attendance logs.
*   **Intelligent Syncing:** Provides both manual "Force ERP Push" and background auto-sync functionality, ignoring previously synced or double punches.
*   **Centralized Analytics:** Offers a local UI dashboard to review fetched device entries before they hit your external Frappe instance.
*   **Zero-Touch Reboots:** Includes a built-in configuration to automatically launch the application and resume synchronization pipelines on Windows/System startup.

### Usage
1.  Run the application on a network that can reach your local ZKTeco devices.
2.  Login via the application UI using your Frappe instance URL, API Key, and API Secret.
3.  Add your ZKTeco device endpoints to the manager (`IP:Port`).
4.  Optionally enable "Auto Sync" in the settings, or simply wait for the automatic polling intervals to capture and relay recent punches.

---

## 2. Prerequisites

### Server-Side App Required: `attendance-bridge-module`
To run this application and successfully communicate with Frappe, you are required to install the `attendance-bridge-module`. It lives in its own repository and provides the custom endpoints necessary to accept the push logs from this app.

**Server Repo (Install & Server-Side Documentation):**  
[https://github.com/Nexo-ERP-Pvt-Limited/attendance-bridge-module](https://github.com/Nexo-ERP-Pvt-Limited/attendance-bridge-module)

**Install via Bench:**
```sh
cd /path/to/your/frappe-bench
bench get-app https://github.com/Nexo-ERP-Pvt-Limited/attendance-bridge-module
bench install-app attendance_bridge
bench migrate
```

> **Note:** All server‑side configuration, workflows, and ERP-end zkteco configurations belong deeply in that repository. This local Bridge repo focuses solely on the edge-networking for ZKTeco check-ins and check-outs, acting as the offline-first bridge.

---

## 3. Development

If you wish to contribute to the UI or Electron handlers:

```sh
# Install Dependencies
npm install

# Start the Development Server (Electron + Vite)
npm run dev
```

### Packaging / Build Release
To compile the raw React into static files and generate an executable for your platform (Linux/macOS natively):
```sh
npm run build
```

**Note on Windows Builds:**
Because this application is developed natively on Linux and utilizes native bindings (`better-sqlite3`), compiling the `.exe` directly on Linux involves heavy cross-compilation restrictions. 
To completely bypass this, we provide a fully automated **GitHub Action** (`windows-build.yml`). 
Simply push your code to the `main` branch or trigger it via the Actions tab, and GitHub will natively compile a standalone `.exe` for Windows x64.

*The resulting portable Windows executable is highly optimized, weighing in at an incredibly lightweight **~75 MB** footprint!*
