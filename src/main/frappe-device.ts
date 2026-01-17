/**
 * Frappe Device API Module
 *
 * Phase 13: Device storage migrated to Frappe API.
 * Frappe is the source of truth, SQLite is local cache for offline.
 *
 * Endpoints:
 *   - register_device: Create/update device in Frappe
 *   - list_devices: Fetch all devices for current instance
 *   - disable_device: Mark device inactive (soft delete)
 */

import { net } from 'electron'

export interface FrappeAuthConfig {
  sid?: string
  apiKey?: string
  apiSecret?: string
  mode?: 'session' | 'token'
}

export interface FrappeDevice {
  device_id: string
  device_name: string
  ip_address: string
  port: number
  is_active: boolean
}

export interface LocalDevice {
  id?: number
  name: string
  ip: string
  port: number
  location?: string // Human-readable location (e.g., "Building A, Floor 1")
  comm_key?: string | null
  use_udp?: number
  instance_url?: string
}

export interface DeviceApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Build authorization headers for Frappe API requests
 */
function buildHeaders(auth: FrappeAuthConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (auth.mode === 'token' && auth.apiKey && auth.apiSecret) {
    headers['Authorization'] = `token ${auth.apiKey}:${auth.apiSecret}`
  } else if (auth.sid) {
    headers['Cookie'] = `sid=${auth.sid}`
  }

  return headers
}

/**
 * Make HTTP request using Electron's net module
 */
async function frappeRequest<T>(
  url: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  body?: any,
): Promise<{ status: number; data: T | null; error?: string }> {
  return new Promise((resolve) => {
    const request = net.request({ method, url })

    for (const [key, value] of Object.entries(headers)) {
      request.setHeader(key, value)
    }

    let responseBody = ''

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseBody += chunk.toString()
      })

      response.on('end', () => {
        try {
          const json = JSON.parse(responseBody)
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ status: response.statusCode, data: json.message || json })
          } else {
            const errorMsg =
              json.exception || json.message || `HTTP ${response.statusCode}`
            resolve({
              status: response.statusCode,
              data: null,
              error: errorMsg,
            })
          }
        } catch {
          resolve({
            status: response.statusCode,
            data: null,
            error: responseBody.slice(0, 200),
          })
        }
      })

      response.on('error', (err) => {
        resolve({ status: 0, data: null, error: err.message })
      })
    })

    request.on('error', (err) => {
      resolve({ status: 0, data: null, error: err.message })
    })

    if (body) {
      request.write(JSON.stringify(body))
    }
    request.end()
  })
}

/**
 * Register a device with Frappe
 * Creates new device or updates existing one (idempotent by device_id)
 */
export async function registerDevice(
  device: LocalDevice,
  baseUrl: string,
  auth: FrappeAuthConfig,
): Promise<DeviceApiResult<FrappeDevice>> {
  // Generate device_id from IP:port for uniqueness and idempotency
  const deviceId = `${device.ip}:${device.port}`

  console.log(`Frappe Device: Registering ${device.name} (${deviceId})`)
  console.log(`Frappe Device: Location received: "${device.location}"`)

  const url = `${baseUrl.replace(/\/$/, '')}/api/method/attendance_bridge.api.devices.register_device`
  const headers = buildHeaders(auth)

  const payload = {
    device_id: deviceId,
    device_name: device.name,
    ip_address: device.ip,
    port: device.port,
    location: device.location || '', // Send location to Frappe
  }

  console.log('Frappe Device: Payload:', JSON.stringify(payload, null, 2))

  const response = await frappeRequest<any>(url, 'POST', headers, payload)

  console.log(
    'Frappe Device: Register response:',
    JSON.stringify(response.data, null, 2),
  )

  // Check both HTTP status AND the success field in response
  if (
    response.status >= 200 &&
    response.status < 300 &&
    response.data?.success
  ) {
    console.log(
      `Frappe Device: Registered successfully - ${response.data.device_id}`,
    )
    return {
      success: true,
      data: {
        device_id: response.data.device_id,
        device_name: device.name,
        ip_address: device.ip,
        port: device.port,
        is_active: true,
      },
    }
  } else {
    const errorMsg = response.data?.message || response.error || 'Unknown error'
    console.error(`Frappe Device: Registration failed - ${errorMsg}`)
    return { success: false, error: errorMsg }
  }
}

/**
 * Fetch all devices from Frappe for current instance
 */
export async function fetchDevices(
  baseUrl: string,
  auth: FrappeAuthConfig,
): Promise<DeviceApiResult<FrappeDevice[]>> {
  console.log('Frappe Device: Fetching devices...')

  const url = `${baseUrl.replace(/\/$/, '')}/api/method/attendance_bridge.api.devices.list_devices`
  const headers = buildHeaders(auth)

  const response = await frappeRequest<any>(url, 'GET', headers)

  console.log(
    'Frappe Device: Raw response:',
    JSON.stringify(response.data, null, 2),
  )

  if (response.status >= 200 && response.status < 300 && response.data) {
    // Handle different response structures:
    // 1. Direct array: [...]
    // 2. Object with devices key: { devices: [...] }
    // 3. Object with data key: { data: [...] }
    let devices: FrappeDevice[] = []

    if (Array.isArray(response.data)) {
      devices = response.data
    } else if (response.data.devices && Array.isArray(response.data.devices)) {
      devices = response.data.devices
    } else if (response.data.data && Array.isArray(response.data.data)) {
      devices = response.data.data
    } else {
      console.warn(
        'Frappe Device: Unexpected response structure:',
        typeof response.data,
      )
      return { success: false, error: 'Unexpected response structure' }
    }

    console.log(`Frappe Device: Fetched ${devices.length} devices`)
    return { success: true, data: devices }
  } else {
    console.error(`Frappe Device: Fetch failed - ${response.error}`)
    return { success: false, error: response.error }
  }
}

/**
 * Disable (soft delete) a device in Frappe
 */
export async function disableDevice(
  deviceId: string,
  baseUrl: string,
  auth: FrappeAuthConfig,
): Promise<DeviceApiResult<boolean>> {
  console.log(`Frappe Device: Disabling ${deviceId}`)

  const url = `${baseUrl.replace(/\/$/, '')}/api/method/attendance_bridge.api.devices.disable_device`
  const headers = buildHeaders(auth)

  const payload = { device_id: deviceId }

  const response = await frappeRequest<{ success: boolean }>(
    url,
    'POST',
    headers,
    payload,
  )

  if (response.status >= 200 && response.status < 300) {
    console.log(`Frappe Device: Disabled ${deviceId}`)
    return { success: true, data: true }
  } else {
    console.error(`Frappe Device: Disable failed - ${response.error}`)
    return { success: false, error: response.error }
  }
}

/**
 * Map Frappe device to local SQLite format
 */
export function mapFrappeToLocal(
  frappeDevice: FrappeDevice,
  instanceUrl: string,
): LocalDevice {
  return {
    name: frappeDevice.device_name,
    ip: frappeDevice.ip_address,
    port: frappeDevice.port,
    instance_url: instanceUrl,
  }
}

/**
 * Map local device to Frappe format (for display purposes)
 */
export function mapLocalToFrappe(
  localDevice: LocalDevice,
): Partial<FrappeDevice> {
  return {
    device_name: localDevice.name,
    ip_address: localDevice.ip,
    port: localDevice.port,
    is_active: true,
  }
}
