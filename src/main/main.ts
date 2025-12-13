import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
import path from 'node:path'
import { Database } from '../db/sqlite'
import { ZKClient } from './zkclient'
import { FrappeApp } from 'frappe-js-sdk'
import Store from 'electron-store'

const store = new Store()

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    const prodIndex = path.join(process.resourcesPath, 'dist', 'index.html')
    win.loadFile(prodIndex)
  }
}

app.whenReady().then(async () => {
  console.log('Main process: App ready, initializing...')
  await Database.init()
  createWindow()
  console.log('Main process: Window created, IPC handlers registered')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC Handlers
console.log('Main process: Registering IPC handlers...')

ipcMain.handle('db:get-stats', async () => {
  return Database.getStats()
})

ipcMain.handle(
  'device:test',
  async (_e, { ip, port }: { ip: string; port: number }) => {
    return ZKClient.testConnection(ip, port)
  }
)

// Device CRUD
ipcMain.handle(
  'device:add',
  async (
    _e,
    d: {
      name: string
      ip: string
      port: number
      commKey?: string
      useUdp?: boolean
    }
  ) => {
    const id = Database.ensureDevice(
      d.name,
      d.ip,
      d.port,
      d.commKey ?? null,
      d.useUdp ? 1 : 0
    )
    return { id }
  }
)

ipcMain.handle('device:list', async () => {
  return Database.listDevices()
})

ipcMain.handle('device:remove', async (_e, id: number) => {
  Database.deleteDevice(id)
})

// ERP-related IPC removed; ERP is now accessed directly from the renderer using frappe-react-sdk

// Fetch logs from biometric device and store in DB
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
    }: {
      ip: string
      port?: number
      name?: string
      commKey?: string
      useUdp?: boolean
    }
  ) => {
    try {
      const deviceName = name || `Device ${ip}`
      const deviceId = Database.ensureDevice(
        deviceName,
        ip,
        port ?? 4370,
        commKey ?? null,
        useUdp ? 1 : 0
      )

      const logs = await ZKClient.fetchLogs({ ip, port, commKey, useUdp })
      let imported = 0
      for (const log of logs) {
        const id = Database.insertAttendance({
          device_id: deviceId,
          employee_id: log.employee_id,
          timestamp: log.timestamp,
          status: log.status,
          synced: 0,
        })
        if (id) imported += 1
      }

      return { imported }
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
  }
)

// List recent attendance rows
ipcMain.handle(
  'attendance:list',
  async (_e, { limit = 100 } = { limit: 100 }) => {
    return Database.listAttendance(limit)
  }
)

ipcMain.handle(
  'attendance:listByDevice',
  async (
    _e,
    { deviceId, limit = 100 }: { deviceId: number; limit?: number }
  ) => {
    return Database.listAttendanceByDevice(deviceId, limit)
  }
)

// Expose unsynced attendance for renderer-side syncing
ipcMain.handle('attendance:unsynced', async () => {
  return Database.getUnsynced()
})

// Allow renderer to mark rows as synced after successful ERP push
ipcMain.handle('attendance:markSynced', async (_e, ids: number[]) => {
  Database.markSynced(ids)
  return { ok: true, updated: ids?.length || 0 }
})

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

ipcMain.handle('sync:run', async () => {
  const unsynced = Database.getUnsynced()
  if (!unsynced.length) return { synced: 0, errors: [] }

  const creds = await getCredentials()
  if (!creds) return { synced: 0, errors: ['No ERP credentials stored'] }

  const { baseUrl, auth } = creds

  // Initialize Frappe app with appropriate auth
  let app: FrappeApp
  if (auth?.mode === 'token') {
    app = new FrappeApp(baseUrl, {
      useToken: true,
      token: () => `${auth.apiKey}:${auth.apiSecret}`,
      type: 'token',
    })
  } else {
    app = new FrappeApp(baseUrl)
    try {
      await app.auth().loginWithUsernamePassword({
        username: auth.username,
        password: auth.password,
      })
    } catch (e: any) {
      const message =
        (e && e.message) ||
        (typeof e === 'string' ? e : 'Failed to login to ERP')
      return { synced: 0, errors: [`ERP login failed: ${message}`] }
    }
  }

  const results: { ok: boolean; error?: string }[] = []
  for (const u of unsynced) {
    try {
      const payload = {
        employee: u.employee_id,
        attendance_date: u.timestamp.split('T')[0],
        in_time: u.status === 'IN' ? u.timestamp : undefined,
        out_time: u.status === 'OUT' ? u.timestamp : undefined,
        status: 'Present',
      }
      await app.db().createDoc('Attendance', payload)
      results.push({ ok: true })
    } catch (e: any) {
      results.push({ ok: false, error: e?.message || 'Unknown error' })
    }
  }

  const syncedIds = results.filter((r) => r.ok).map((_, i) => unsynced[i].id!)
  Database.markSynced(syncedIds)

  return {
    synced: syncedIds.length,
    errors: results.filter((r) => !r.ok).map((r) => r.error as string),
  }
})

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
        console.warn('Main process: Encryption unavailable, saved as plain text')
      }
    } catch (e) {
      console.error('Main process: Failed to save credentials:', e)
      throw e
    }
  }
)

ipcMain.handle('credentials:get', async () => {
  console.log('Main process: Getting credentials...')
  return await getCredentials()
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
