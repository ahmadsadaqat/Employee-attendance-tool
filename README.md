# Nexo Employees

Electron + React app to sync ZKTeco attendance logs with ERPNext (offline-first).

## Dev

```sh
npm install
npm run start
```

This starts Vite (renderer) and Electron.

## Notes

- Local database at `data/attendance.db` using better-sqlite3.
- IPC exposed via `window.api` in preload.
- ZKTeco client currently has a connection test stub; implement log fetching per model.
