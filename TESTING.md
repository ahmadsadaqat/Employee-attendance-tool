# Project Testing Guidelines & Scenarios

To ensure the **Frappe Zkteco Bridge** runs flawlessly across different operating systems and handles networking scenarios securely, all open-source contributions (PRs) should be evaluated against the following test suites.

## 1. Core Testing Strategy

For an Electron + React offline-first application, you should focus your automated testing around **Vitest** (or Jest) for unit testing local database interactions/logic, and **Playwright** for Electron UI End-to-End (E2E) testing.

---

## 2. Unit Testing (Focus: Data Integrity)
Unit tests ensure that individual components of the system behave predictably when disconnected from the hardware.

### A. Database Integrity (`src/db/sqlite.ts`)
The SQLite database serves as the absolute source of truth.
*   **Duplicate Punch Prevention**: Simulate fetching identical attendance records for the same employee at the exact same timestamp. *Test that SQLite strictly enforces the `ON CONFLICT IGNORE` or unique index constraint.*
*   **Double-Punch Thresholds**: Insert a log for an employee, and then simulate another punch 2 seconds later. *Test that the system flags the second logic as `synced=4` (Ignored/Double Punch).*
*   **Safe Migrations**: Simulate reading from an older schema version (e.g., missing `location` or `use_udp` columns), then triggering `.init()`. *Test that standard columns apply cleanly via `ALTER TABLE` without corrupting rows.*

### B. Payload Parsing (`node-zklib`)
Since different biometric models (UFace 800 vs K77) have unique TCP packet shapes, pure decoding logic must be tested tightly.
*   **Check-In vs Check-Out Flag**: Feed static hex response buffers to the decoder. *Test that `0` correctly assigns `IN` and `1` correctly assigns `OUT`.*
*   **Packet Alignment**: Send buffers with exactly `1960` bytes (ambiguous size chunks). *Test that the module safely discovers boundary margins rather than skipping punches.*

---

## 3. Integration Testing (Focus: System Flow)
Integration tests ensure the Main Process (Node) properly communicates with the Renderer Process (React).

### A. IPC Boundaries (`src/main/main.ts` & `preload.ts`)
Since Node code has OS privileges and React does not, test the context bridge strictly.
*   **Error Catching**: Simulate a `ZKClient.fetchLogs` rejection (e.g., "ECONNREFUSED"). *Test that the main process catches this gracefully and returns `{ imported: 0, error: '...' }` to the UI without crashing the Electron pipeline.*
*   **Device Memory Lookup**: Add a device via standard IPC to the database in memory, then query it. *Test that the React component successfully populates the dynamic dropdown listing the newly created device.*

### B. Frappe Bridge Flow
*   **Auth Payload**: Provide mock API credentials. *Test that the `Authorization: token x:y` request executes correctly against a mockup Node HTTP server.*
*   **Unsynced Queue Loop**: Push 5 fake logs into SQLite, all set to `synced=0`. Trigger a manual sync. *Test that the system pulls exactly 5 logs, sends them to the ERP, and successfully transitions their local state to `synced=1` once the HTTP success resolves.*

---

## 4. End-to-End Testing (Focus: Real Usage)
E2E testing replicates what the Windows or Linux user actually sees.

### A. App Mounting
*   **Startup Sequence**: *Test that the window successfully opens, React hydrates, and no generic "Blank White Screens" or JavaScript console errors emerge on boot.*

### B. Hardware UX Scenarios
*   **Silent Reconnections**: Disable the network adapter / mock offline mode. *Test that the Dashboard explicitly catches the "Network Error" state and defers syncing without showing blocking error modals.*
*   **Date Window Restrictions**: In the Import Logs modal, set "From" and "To" in reverse order. *Test that the UI refuses to trigger the hardware scan and shows a validation error.*
*   **Auto-Start (Windows)**: Verify that when toggled from settings, the `auto-launch` registry edits construct effectively behind the scenes.
