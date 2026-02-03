import 'dotenv/config'
import {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  session,
  net,
  Tray,
  Menu,
  nativeImage,
} from 'electron'
import path from 'node:path'
import Store from 'electron-store'
import AutoLaunch from 'auto-launch'
import { FrappeApp } from 'frappe-js-sdk'
import {
  syncLogsToFrappe,
  isFrappeSyncEnabled,
  getFrappeBaseUrl,
} from './frappe-sync'
import {
  registerDevice,
  fetchDevices,
  disableDevice,
  mapFrappeToLocal,
} from './frappe-device'

// -------------------- GLOBAL SAFETY & CONFIG --------------------

// Disable hardware acceleration to prevent blank screens/crashes on Windows
app.disableHardwareAcceleration()

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err)
})

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED PROMISE:', err)
})

let win: BrowserWindow | null = null
let tray: Tray | null = null // Must be global to prevent garbage collection
let isQuitting = false

const store = new Store()

ipcMain.on('log', (_event, level, ...args) => {
  console.log(`Renderer [${level}]:`, ...args)
})

// -------------------- HELPERS --------------------

// Helper to get credentials
async function getCredentials() {
  try {
    const encrypted = store.get('erp-credentials') as string
    if (!encrypted) return null
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encrypted, 'hex')
      const decrypted = safeStorage.decryptString(buffer)
      return JSON.parse(decrypted)
    } else {
      // Fallback for dev envs where safeStorage might not be available
      return JSON.parse(encrypted)
    }
  } catch (e) {
    console.error('Failed to retrieve credentials:', e)
    return null
  }
}

// Helper to inject auth headers into all requests to the ERP
function setupAuthInjection(
  baseUrl: string,
  auth: {
    mode?: string
    sid?: string
    apiKey?: string
    apiSecret?: string
  } | null,
) {
  // If no auth provided, strictly exit (listener is already effectively cleared/overwritten below if we use the same filter context,
  // but to be safe lets explicitly clear specifically for the old URL if possible, or just use a global tracker).
  // "Passing null as listener removes validity."

  if (!baseUrl || !auth) {
    console.log('Main process: Clearing auth injection')
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*/*'] },
      null,
    )
    return
  }

  const filter = { urls: [`${baseUrl}/*`] }

  session.defaultSession.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      if (auth.mode === 'token' && auth.apiKey && auth.apiSecret) {
        // Inject Token Authorization header
        details.requestHeaders['Authorization'] =
          `token ${auth.apiKey}:${auth.apiSecret}`
      } else if (auth.sid) {
        // Inject the session cookie as if it were a token
        details.requestHeaders['Cookie'] =
          `sid=${auth.sid}; system_user=yes; user_id=Administrator`
      }

      // Only set Origin if needed, avoid setting Host as it's handled by the network stack
      try {
        details.requestHeaders['Origin'] = baseUrl
      } catch (e) {}

      // console.log(`Main process: Injecting auth (${auth.mode || 'session'}) for ${details.url}`)
      callback({ requestHeaders: details.requestHeaders })
    },
  )
  console.log(
    `Main process: Auth injection enabled for ${baseUrl} [Mode: ${
      auth.mode || 'session'
    }]`,
  )
}

// function getIconPath() { ... } // Removed

function createTray() {
  const isWin = process.platform === 'win32'
  // Use app.getAppPath() for production builds, process.cwd() for dev
  const basePath = process.env.VITE_DEV_SERVER
    ? process.cwd()
    : app.getAppPath()
  // Windows tray icons should be 16x16 for best display
  const iconPath = path.join(
    basePath,
    isWin ? 'assets/nexo-16x16.ico' : 'assets/nexo-16x16.png',
  )
  console.log('Tray icon path:', iconPath)
  const trayIcon = nativeImage.createFromPath(iconPath)

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        win?.show()
      },
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('Nexo Employees')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (win?.isVisible()) {
      win.hide()
    } else {
      win?.show()
    }
  })
}

function createWindow() {
  const isWin = process.platform === 'win32'
  // Use app.getAppPath() for production builds, process.cwd() for dev
  const basePath = process.env.VITE_DEV_SERVER
    ? process.cwd()
    : app.getAppPath()
  const iconPath = path.join(
    basePath,
    isWin ? 'assets/nexo-256x256.ico' : 'assets/nexo-64x64.png',
  )

  win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable CORS to allow direct requests to ERP
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
  })

  // Prevent closing, hide instead
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win?.hide()
      return false
    }
  })

  // Restore session if available
  getCredentials().then((creds) => {
    if (creds?.baseUrl && creds?.auth) {
      setupAuthInjection(creds.baseUrl, creds.auth)
    }
  })

  if (process.env.VITE_DEV_SERVER) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // Correct production path
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// -------------------- APP READY & IPC --------------------

app.whenReady().then(async () => {
  console.log('Main process ready')

  // Import native modules ONLY after app is ready to verify they don't break the build/start
  const { Database } = await import('../db/sqlite')
  const { ZKClient } = await import('./zkclient')

  // Determine DB Path
  let dataPath = ''
  if (process.env.VITE_DEV_SERVER) {
    dataPath = path.join(process.cwd(), 'data')
  } else {
    // In production, use standard User Data directory
    dataPath = path.join(app.getPath('userData'), 'data')
  }

  // Create data dir if not exists (init handles it, but good to ensure parent exists)
  // Database.init checks internally.

  // Initialize DB, potentially backfilling with current URL if available
  const initialCreds = await getCredentials()
  await Database.init(dataPath, initialCreds?.baseUrl)

  createWindow()
  createTray()

  console.log('Main process: Window created, IPC handlers registered')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // -------------------- IPC HANDLERS (MOVED INSIDE) --------------------

  ipcMain.handle('db:get-stats', async () => {
    const creds = await getCredentials()
    return Database.getStats(creds?.baseUrl)
  })

  ipcMain.handle(
    'device:test',
    async (_e, { ip, port }: { ip: string; port: number }) => {
      return ZKClient.testConnection(ip, port)
    },
  )

  ipcMain.handle('data:cleanup', async (_, days: number) => {
    const creds = await getCredentials()
    const count = Database.deleteOldLogs(days, creds?.baseUrl)
    return count
  })

  ipcMain.handle('data:clear-all', async () => {
    const creds = await getCredentials()
    const count = Database.clearAllLogs(creds?.baseUrl)
    console.log(`Main: Cleared ${count} attendance logs`)
    return count
  })

  // Device CRUD (Phase 13: Frappe is source of truth, SQLite is cache)
  ipcMain.handle(
    'device:add',
    async (
      _e,
      d: {
        name: string
        ip: string
        port: number
        location?: string // Human-readable location for Frappe
        commKey?: string
        useUdp?: boolean
      },
    ) => {
      const creds = await getCredentials()

      // Try to register with Frappe first (source of truth)
      if (creds?.baseUrl && creds?.auth) {
        const result = await registerDevice(
          {
            name: d.name,
            ip: d.ip,
            port: d.port,
            location: d.location, // Pass location to Frappe
            comm_key: d.commKey,
            use_udp: d.useUdp ? 1 : 0,
          },
          creds.baseUrl,
          creds.auth,
        )
        if (!result.success) {
          console.warn(
            'Frappe device registration failed, saving locally only:',
            result.error,
          )
        }
      }

      // Always cache locally for offline use
      const id = Database.ensureDevice(
        d.name,
        d.ip,
        d.port,
        d.location ?? null, // Human-readable location
        d.commKey ?? null,
        d.useUdp ? 1 : 0,
        creds?.baseUrl,
      )
      return { id }
    },
  )

  ipcMain.handle('device:list', async () => {
    const creds = await getCredentials()

    // Try to fetch from Frappe (source of truth) and sync to local cache
    if (creds?.baseUrl && creds?.auth) {
      try {
        const result = await fetchDevices(creds.baseUrl, creds.auth)
        if (result.success && result.data) {
          // Sync Frappe devices to local SQLite cache
          for (const frappeDevice of result.data) {
            if (frappeDevice.is_active) {
              Database.ensureDevice(
                frappeDevice.device_name,
                frappeDevice.ip_address,
                frappeDevice.port,
                (frappeDevice as any).location ?? null, // Location from Frappe
                null,
                0,
                creds.baseUrl,
              )
            }
          }
          console.log(
            `Synced ${result.data.length} devices from Frappe to local cache`,
          )
        }
      } catch (e) {
        console.warn(
          'Failed to fetch devices from Frappe, using local cache:',
          e,
        )
      }
    }

    // Return local cache (works offline)
    return Database.listDevices(creds?.baseUrl)
  })

  ipcMain.handle('device:remove', async (_e, id: number) => {
    const creds = await getCredentials()

    // Get device info before deleting locally
    const device = Database.getDeviceById(id)

    // Try to disable in Frappe first
    if (device && creds?.baseUrl && creds?.auth) {
      const deviceId = `${device.ip}:${device.port}` // Use IP:port as identifier
      const result = await disableDevice(deviceId, creds.baseUrl, creds.auth)
      if (!result.success) {
        console.warn('Frappe device disable failed:', result.error)
      }
    }

    // Always delete locally
    Database.deleteDevice(id)
  })

  // Fetch logs from biometric device
  ipcMain.handle(
    'device:fetchLogs',
    async (
      _e,
      {
        ip,
        port = 4370,
        name,
        commKey,
        useUdp,
        doublePunchThreshold,
        startDate,
        endDate,
      }: any,
    ) => {
      try {
        const creds = await getCredentials()
        const deviceName = name || `Device ${ip}`
        const deviceId = Database.ensureDevice(
          deviceName,
          ip,
          port ?? 4370,
          null, // location not available during log fetch
          commKey ?? null,
          useUdp ? 1 : 0,
          creds?.baseUrl,
        )

        const logs = await ZKClient.fetchLogs({
          ip,
          port,
          commKey,
          useUdp,
          startDate,
          endDate,
        })
        console.log(`Main: Fetched ${logs.length} logs from ZKClient`)

        // Sort logs by timestamp ascending to ensure we process them in order
        logs.sort(
          (a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )

        let imported = 0
        let ignored = 0
        const thresholdMs = (doublePunchThreshold ?? 5) * 1000

        // Track last log per employee DURING batch processing (not just from DB)
        const lastLogPerEmployee = new Map<
          string,
          { timestamp: string; status: 'IN' | 'OUT' }
        >()

        for (const log of logs) {
          // 1. Get last status for this employee - check in-memory first, then DB
          let lastLog = lastLogPerEmployee.get(log.employee_id)
          if (!lastLog) {
            const dbLog = Database.getLastLog(log.employee_id)
            if (dbLog) {
              lastLog = { timestamp: dbLog.timestamp, status: dbLog.status }
            }
          }

          let newStatus: 'IN' | 'OUT' = 'IN' // Default to IN if no history

          if (lastLog) {
            // Check for double punch (configurable threshold)
            const timeDiff =
              new Date(log.timestamp).getTime() -
              new Date(lastLog.timestamp).getTime()
            if (timeDiff < thresholdMs && timeDiff >= 0) {
              console.log(
                `Main: Recording double punch for ${log.employee_id} within ${timeDiff}ms (Threshold: ${thresholdMs}ms)`,
              )
              // Save as double punch (synced=4) so it appears in UI instead of being ignored
              const dpResult = Database.insertAttendance({
                device_id: deviceId,
                employee_id: log.employee_id,
                timestamp: log.timestamp,
                status: lastLog.status, // Keep same status as previous log
                synced: 4, // 4 = double-punch (ignored)
              })
              if (dpResult.inserted) {
                ignored++
              }
              continue
            }

            // Toggle Status
            if (lastLog.status === 'IN') {
              newStatus = 'OUT'
            }
          }

          const result = Database.insertAttendance({
            device_id: deviceId,
            employee_id: log.employee_id,
            timestamp: log.timestamp,
            status: newStatus,
            synced: 0,
          })
          if (result.inserted) {
            imported += 1
            // Update in-memory tracking for next iteration ONLY if actually inserted
            lastLogPerEmployee.set(log.employee_id, {
              timestamp: log.timestamp,
              status: newStatus,
            })
          }
        }
        console.log(
          `Main: Imported ${imported} new logs into DB (${ignored} double punches ignored)`,
        )

        return { imported, ignored }
      } catch (e: any) {
        const errObj = e?.err || e
        const msg =
          (typeof errObj === 'string' && errObj) ||
          errObj?.message ||
          errObj?.toString?.() ||
          'Unknown device error'
        console.error("Error occurred in handler for 'device:fetchLogs':", e)
        return { imported: 0, error: msg }
      }
    },
  )

  // Attendance
  ipcMain.handle(
    'attendance:list',
    async (_e, { limit = 100 } = { limit: 100 }) => {
      const creds = await getCredentials()
      return Database.listAttendance(limit, creds?.baseUrl)
    },
  )

  ipcMain.handle(
    'attendance:listByDevice',
    async (
      _e,
      { deviceId, limit = 100 }: { deviceId: number; limit?: number },
    ) => {
      return Database.listAttendanceByDevice(deviceId, limit)
    },
  )

  ipcMain.handle('attendance:unsynced', async () => {
    const creds = await getCredentials()
    return Database.getUnsynced(creds?.baseUrl)
  })

  ipcMain.handle('attendance:markSynced', async (_e, ids: number[]) => {
    Database.markSynced(ids)
    return { ok: true, updated: ids?.length || 0 }
  })

  ipcMain.handle('attendance:resetSyncStatus', async (_e, ids: number[]) => {
    Database.resetSyncStatus(ids)
    return { ok: true, updated: ids?.length || 0 }
  })

  ipcMain.handle(
    'attendance:resetSyncStatusByDate',
    async (_e, { startDate, endDate }) => {
      const result = Database.resetSyncStatusByDate(startDate, endDate)
      return { ok: true, updated: result.changes }
    },
  )

  // Sync Logic
  ipcMain.handle('sync:run', async () => {
    console.log('Main: Starting Sync Run...')

    // We need credentials first to know which instance we are syncing for
    const creds = await getCredentials()
    if (!creds) {
      console.warn('Main: No ERP credentials found')
      return { synced: 0, errors: ['No ERP credentials stored'] }
    }

    // Get unsynced from DB filtered by instance URL
    const unsynced = Database.getUnsynced(100, creds.baseUrl)
    console.log(
      `Main: Found ${unsynced.length} unsynced records for ${creds.baseUrl}`,
    )

    if (!unsynced.length) return { synced: 0, errors: [] }

    console.log(`Main: Using credentials for ${creds.baseUrl}`)

    const { baseUrl, auth } = creds

    // Helper for direct requests (bypassing SDK cookie issues in Node)
    const frappeRequest = async (
      endpoint: string,
      method: string = 'GET',
      body?: any,
    ) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (auth.sid) {
        headers['Cookie'] = `sid=${auth.sid}`
      } else if (auth.apiKey) {
        headers['Authorization'] = `token ${auth.apiKey}:${auth.apiSecret}`
      }

      const url = `${baseUrl.replace(/\/$/, '')}/api/resource/${endpoint}`
      const options: RequestInit = { method, headers }
      if (body) options.body = JSON.stringify(body)

      const res = await fetch(url, options)
      if (!res.ok) {
        const text = await res.text()
        let msg = text
        try {
          const json = JSON.parse(text)
          // Try to extract readable message
          if (json.exception) msg = json.exception
          if (json._server_messages) {
            const msgs = JSON.parse(json._server_messages)
            const joined = msgs
              .map((m: any) => JSON.parse(m).message)
              .join(', ')
            if (joined) msg = joined
          }
        } catch {}
        throw new Error(`Request failed (${res.status}): ${msg}`)
      }
      return res.json()
    }

    // Fetch Employees to map Biometric ID -> Employee ID
    console.log('Main: Fetching employee mapping...')
    let employeeMap = new Map<string, string>()
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify(['name', 'attendance_device_id']),
        limit_page_length: '1000',
      })
      const response = await frappeRequest(`Employee?${params.toString()}`)
      const employees = response.data || []

      for (const emp of employees) {
        if (emp.attendance_device_id) {
          // Store mapping: "5" -> "HR-EMP-00001"
          employeeMap.set(String(emp.attendance_device_id), emp.name)
        }
      }
      console.log(
        `Main: Mapped ${employeeMap.size} employees with biometric IDs`,
      )
    } catch (e: any) {
      console.error('Main: Failed to fetch employee mapping', e)
      return { synced: 0, errors: [`Failed to map employees: ${e.message}`] }
    }

    const results: { ok: boolean; error?: string }[] = []
    console.log(`Main: Syncing ${unsynced.length} records...`)

    for (const u of unsynced) {
      try {
        // Resolve Real Employee ID
        const realEmployeeId = employeeMap.get(String(u.employee_id))

        if (!realEmployeeId) {
          throw new Error(
            `No Employee found in ERP with Attendance Device ID '${u.employee_id}'`,
          )
        }

        // Format timestamp to YYYY-MM-DD HH:mm:ss (Local Time)
        // Stored timestamp is ISO (UTC). We need to send "Device Wall Clock" time to Frappe.
        // Assuming the PC running this app is in the same timezone as the Device and the ERP Server.
        const dateObj = new Date(u.timestamp)

        // Get local components
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        const hours = String(dateObj.getHours()).padStart(2, '0')
        const minutes = String(dateObj.getMinutes()).padStart(2, '0')
        const seconds = String(dateObj.getSeconds()).padStart(2, '0')

        const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

        const payload = {
          employee: realEmployeeId,
          time: formattedTime,
          log_type: u.status, // "IN" or "OUT"
          device_id: String(u.device_id),
          latitude: '0.000000',
          longitude: '0.000000',
        }

        await frappeRequest('Employee Checkin', 'POST', payload)
        results.push({ ok: true })
      } catch (e: any) {
        console.error(`Main: Failed to sync record ${u.id}:`, e?.message)
        results.push({ ok: false, error: e?.message || 'Unknown error' })
      }
    }

    const syncedIds = results.filter((r) => r.ok).map((_, i) => unsynced[i].id!)
    Database.markSynced(syncedIds)

    console.log(
      `Main: Sync complete. Synced: ${syncedIds.length}, Errors: ${
        results.filter((r) => !r.ok).length
      }`,
    )

    return {
      synced: syncedIds.length,
      errors: results.filter((r) => !r.ok).map((r) => r.error as string),
      syncedIds, // Return IDs so UI can update state locally
    }
  })

  // Auth & Credentials Handlers (could be outside, but safer here if we wanted consistent pattern, though they don't depend on DB)
  // Moving them here for consistency as user requested "IPC HANDLERS" inside.

  ipcMain.handle(
    'credentials:set',
    async (_e, { baseUrl, auth }: { baseUrl: string; auth: any }) => {
      console.log('Main process: Setting credentials for', baseUrl)
      try {
        const data = JSON.stringify({ baseUrl, auth })
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(data)
          store.set('erp-credentials', encrypted.toString('hex'))
          console.log('Main process: Credentials encrypted and saved')
        } else {
          store.set('erp-credentials', data)
          console.warn(
            'Main process: Encryption unavailable, saved as plain text',
          )
        }
      } catch (e) {
        console.error('Main process: Failed to save credentials:', e)
        throw e
      }
    },
  )

  ipcMain.handle('credentials:get', async () => {
    console.log('Main process: Getting credentials...')
    return await getCredentials()
  })

  ipcMain.handle('auth:login', async (_e, { url, username, password }) => {
    console.log('Main process: Attempting login to', url)

    return new Promise((resolve, reject) => {
      // Ensure no trailing slash
      const cleanUrl = url.trim().replace(/\/$/, '')
      const targetUrl = `${cleanUrl}/api/method/login`
      console.log('Main process: Target URL:', targetUrl)

      const request = net.request({ method: 'POST', url: targetUrl })
      request.setHeader('Content-Type', 'application/json')
      request.setHeader('Origin', cleanUrl)

      request.on('response', (response) => {
        console.log(
          `Main process: Login response status: ${response.statusCode}`,
        )

        // Collect body first, then decide
        let body = ''
        response.on('data', (chunk) => (body += chunk))

        response.on('end', async () => {
          // 1. Handle Errors (Non-200)
          if (response.statusCode !== 200) {
            let msg = `Login failed with status ${response.statusCode}`
            try {
              const json = JSON.parse(body)
              if (json.message) msg += `: ${json.message}`
              else if (json.exception) msg += `: ${json.exception}`
            } catch {
              // Body might be HTML or empty
              if (response.statusCode === 404) msg = `Instance not found (404)`
              if (response.statusCode === 401) msg = `Invalid credentials (401)`
              if (response.statusCode === 403) msg = `Access denied (403)`
            }
            reject(new Error(msg))
            return
          }

          // 2. Handle Success (200)
          try {
            // Determine SID either from Cookie or Body
            let sid = ''

            // Check Cookies
            const cookies = response.headers['set-cookie']
            if (cookies) {
              const cookieList = Array.isArray(cookies) ? cookies : [cookies]
              cookieList.forEach((c) => {
                if (c.startsWith('sid=')) {
                  sid = c.split(';')[0].split('=')[1]
                }
              })
            }

            // Parse Body
            let json = {}
            try {
              json = JSON.parse(body)
            } catch (e) {
              throw new Error('Invalid JSON response from server')
            }

            // Fallback: sometimes 'login' returns 'message': 'Logged In', but we need SID.
            // If we didn't get SID from cookies, we can't really persist session cleanly.
            if (!sid) {
              reject(
                new Error(
                  'Login successful but no session ID (sid) found in cookies',
                ),
              )
              return
            }

            console.log('Main process: Captured Session ID (sid)')

            const authData = { username, password, sid, mode: 'session' }
            setupAuthInjection(url, authData)

            const data = JSON.stringify({ baseUrl: url, auth: authData })

            if (safeStorage.isEncryptionAvailable()) {
              const encrypted = safeStorage.encryptString(data)
              store.set('erp-credentials', encrypted.toString('hex'))
            } else {
              store.set('erp-credentials', data)
            }

            resolve({ ...json, sid })
          } catch (e) {
            reject(e)
          }
        })
      })

      request.on('error', (error) => {
        console.error('Main process: Login request error:', error)
        reject(error)
      })

      request.write(JSON.stringify({ usr: username, pwd: password }))
      request.end()
    })
  })

  ipcMain.handle('auth:login-token', async (_e, { url, apiKey, apiSecret }) => {
    console.log('Main process: Attempting token login to', url)

    const cleanUrl = url.trim().replace(/\/$/, '')
    const targetUrl = `${cleanUrl}/api/method/frappe.auth.get_logged_user`

    return new Promise((resolve, reject) => {
      const request = net.request({ method: 'GET', url: targetUrl })
      request.setHeader('Authorization', `token ${apiKey}:${apiSecret}`)
      request.setHeader('Origin', cleanUrl)

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Token verification failed with status ${response.statusCode}`,
            ),
          )
          return
        }

        let body = ''
        response.on('data', (chunk) => (body += chunk))
        response.on('end', () => {
          try {
            const json = JSON.parse(body)
            const authData = {
              apiKey,
              apiSecret,
              mode: 'token',
              username: json.message,
            }

            setupAuthInjection(cleanUrl, authData)

            const data = JSON.stringify({ baseUrl: cleanUrl, auth: authData })
            if (safeStorage.isEncryptionAvailable()) {
              const encrypted = safeStorage.encryptString(data)
              store.set('erp-credentials', encrypted.toString('hex'))
            } else {
              store.set('erp-credentials', data)
            }

            resolve(json)
          } catch (e) {
            reject(e)
          }
        })
      })

      request.on('error', (e) => reject(e))
      request.end()
    })
  })

  ipcMain.handle('auth:logout', async () => {
    console.log('Main process: Logging out...')
    try {
      store.delete('erp-credentials')
      const cookies = await session.defaultSession.cookies.get({})
      for (const cookie of cookies) {
        let url =
          (cookie.secure ? 'https://' : 'http://') + cookie.domain + cookie.path
        await session.defaultSession.cookies.remove(url, cookie.name)
      }
      setupAuthInjection('', null)
      console.log('Main process: Logout successful')
      return true
    } catch (e) {
      console.error('Main process: Logout failed', e)
      return false
    }
  })

  ipcMain.handle('network:status', async () => {
    try {
      const { default: isOnline } = await import('is-online')
      return await isOnline({ timeout: 2000 })
    } catch (error) {
      console.error('Main process: Failed to determine network status:', error)
      return false
    }
  })

  // -------------------- AUTO-LAUNCH (Start on Windows Boot) --------------------
  const autoLauncher = new AutoLaunch({
    name: 'Nexo Employees',
    path: app.getPath('exe'),
  })

  ipcMain.handle('settings:get-auto-launch', async () => {
    try {
      return await autoLauncher.isEnabled()
    } catch (error) {
      console.error('Failed to get auto-launch status:', error)
      return false
    }
  })

  ipcMain.handle('settings:set-auto-launch', async (_e, enabled: boolean) => {
    try {
      if (enabled) {
        await autoLauncher.enable()
        console.log('Auto-launch enabled')
      } else {
        await autoLauncher.disable()
        console.log('Auto-launch disabled')
      }
      return true
    } catch (error) {
      console.error('Failed to set auto-launch:', error)
      return false
    }
  })

  // -------------------- AUTO SYNC LOOP --------------------
  // Phase 12: Frappe is now the sole sync destination. Supabase removed.

  let autoSyncInterval: NodeJS.Timeout | null = null
  let currentSyncInterval = 60 // Default 60s

  // Load saved interval
  const savedInterval = store.get('cloudSyncInterval') as number
  if (savedInterval && savedInterval >= 60) {
    currentSyncInterval = savedInterval
  }

  const runAutoSync = async () => {
    // 1. Check online status first
    const { default: isOnline } = await import('is-online')
    if (!(await isOnline({ timeout: 2000 }))) return

    // 2. Check if Frappe sync is enabled
    if (!isFrappeSyncEnabled()) {
      return
    }

    // 3. Get credentials for auth
    const creds = await getCredentials()
    if (!creds) {
      console.log('AutoSync: Skipped - no credentials')
      return
    }

    // 4. Determine base URL
    const baseUrl = getFrappeBaseUrl(creds.baseUrl)
    if (!baseUrl) {
      console.log('AutoSync: Skipped - no base URL configured')
      return
    }

    // 5. Get unsynced logs
    const logs = Database.getUnsynced(100, creds.baseUrl)
    if (logs.length === 0) {
      return
    }

    console.log(`AutoSync: Pushing ${logs.length} logs to Frappe at ${baseUrl}`)

    try {
      // 6. Push to Frappe API
      const result = await syncLogsToFrappe(logs, baseUrl, creds.auth)

      // 7. Mark logs based on result status
      if (result.syncedIds && result.syncedIds.length > 0) {
        Database.markSynced(result.syncedIds)
        console.log(
          `AutoSync: Marked ${result.syncedIds.length} logs as synced.`,
        )
      }

      if (result.duplicateIds && result.duplicateIds.length > 0) {
        Database.markDuplicate(result.duplicateIds)
        console.log(
          `AutoSync: Marked ${result.duplicateIds.length} logs as duplicate.`,
        )
      }

      if (result.errorIds && result.errorIds.length > 0) {
        Database.markError(result.errorIds)
        console.log(`AutoSync: Marked ${result.errorIds.length} logs as error.`)
      }

      if (result.errors.length > 0) {
        console.warn('AutoSync: Completed with errors:', result.errors)
      }
    } catch (e) {
      console.error('AutoSync Error:', e)
    }
  }

  const startAutoSync = (intervalSeconds: number) => {
    if (autoSyncInterval) clearInterval(autoSyncInterval)
    currentSyncInterval = intervalSeconds
    console.log(`AutoSync: Started with interval ${intervalSeconds}s`)
    autoSyncInterval = setInterval(runAutoSync, intervalSeconds * 1000)
  }

  // Start on launch
  startAutoSync(currentSyncInterval)

  // IPC to update interval
  ipcMain.handle('sync:set-interval', (_e, seconds: number) => {
    if (seconds < 60) seconds = 60
    store.set('cloudSyncInterval', seconds)
    startAutoSync(seconds)
    return true
  })

  // -------------------- FRAPPE SYNC HANDLERS --------------------
  // Frappe is now the sole remote sync destination (Phase 12)

  ipcMain.handle('frappe:get-config', () => {
    return {
      enabled: isFrappeSyncEnabled(),
      baseUrl: getFrappeBaseUrl(),
    }
  })

  ipcMain.handle('frappe:sync', async () => {
    console.log('Main: Manual Frappe sync triggered')

    if (!isFrappeSyncEnabled()) {
      return {
        success: false,
        error: 'Frappe sync is disabled. Set FRAPPE_SYNC_ENABLED=true in .env',
      }
    }

    try {
      const creds = await getCredentials()
      if (!creds) {
        return { success: false, error: 'No credentials stored' }
      }

      const baseUrl = getFrappeBaseUrl(creds.baseUrl)
      if (!baseUrl) {
        return { success: false, error: 'No Frappe base URL configured' }
      }

      const logs = Database.getUnsynced(100, creds.baseUrl)
      if (logs.length === 0) {
        return { success: true, pushed: 0, message: 'No unsynced logs' }
      }

      const result = await syncLogsToFrappe(logs, baseUrl, creds.auth)

      // Mark logs based on result status
      if (result.syncedIds && result.syncedIds.length > 0) {
        Database.markSynced(result.syncedIds)
        console.log(
          `Frappe Sync: Marked ${result.syncedIds.length} logs as synced`,
        )
      }

      if (result.duplicateIds && result.duplicateIds.length > 0) {
        Database.markDuplicate(result.duplicateIds)
        console.log(
          `Frappe Sync: Marked ${result.duplicateIds.length} logs as duplicate`,
        )
      }

      if (result.errorIds && result.errorIds.length > 0) {
        Database.markError(result.errorIds)
        console.log(
          `Frappe Sync: Marked ${result.errorIds.length} logs as error`,
        )
      }

      return result
    } catch (e: any) {
      console.error('Main: Manual Frappe sync error:', e)
      return { success: false, error: e.message }
    }
  })
}) // End of app.whenReady

app.on('window-all-closed', () => {
  // Do NOT quit here
  // if (process.platform !== 'darwin') app.quit()
})
