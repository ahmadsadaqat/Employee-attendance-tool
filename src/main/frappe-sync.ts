/**
 * Frappe API Sync Module
 *
 * PURPOSE:
 * This module handles syncing attendance logs to the Frappe API.
 * Phase 12: Frappe is now the SOLE sync destination. Supabase removed.
 * Phase 15: Sends device LOCATION instead of numeric device_id.
 * Phase 17: Optimized with batch processing and concurrent requests.
 *
 * BEHAVIOR:
 * - Logs are pushed to Frappe and marked synced on success
 * - Failed logs remain unsynced for retry
 * - Returns list of successfully synced IDs for marking
 * - Uses concurrent requests (up to 5 in parallel) for speed
 * - Removes per-log duplicate pre-check (server handles duplicates via error codes)
 */

import { net } from 'electron'
import { Database } from '../db/sqlite'

export interface FrappeAuthConfig {
  sid?: string
  apiKey?: string
  apiSecret?: string
  mode?: 'session' | 'token'
}

export interface AttendanceLog {
  id?: number
  device_id: number
  employee_id: string
  timestamp: string
  status: 'IN' | 'OUT'
  synced: 0 | 1 | 2 | 3 | 4 // 0=pending, 1=synced, 2=duplicate, 3=error, 4=double-punch
}

export interface FrappeSyncResult {
  success: boolean
  pushed: number
  errors: string[]
  syncedIds: number[] // IDs of logs successfully synced
  duplicateIds: number[] // IDs of logs that were duplicates
  errorIds: number[] // IDs of logs that had errors (e.g., employee not found)
}

/**
 * Get the Frappe base URL from environment or fallback
 */
export function getFrappeBaseUrl(fallbackUrl?: string): string | null {
  return process.env.FRAPPE_BASE_URL || fallbackUrl || null
}

/**
 * Fetch employee mapping (biometric ID -> Employee ID) from Frappe
 */
async function fetchEmployeeMapping(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<Map<string, string>> {
  const employeeMap = new Map<string, string>()

  try {
    const params = new URLSearchParams({
      fields: JSON.stringify(['name', 'attendance_device_id']),
      limit_page_length: '1000',
    })

    const url = `${baseUrl.replace(/\/$/, '')}/api/resource/Employee?${params.toString()}`

    const response = await new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        const request = net.request({ method: 'GET', url })
        for (const [key, value] of Object.entries(headers)) {
          request.setHeader(key, value)
        }

        let responseBody = ''
        request.on('response', (response) => {
          response.on('data', (chunk) => {
            responseBody += chunk.toString()
          })
          response.on('end', () => {
            resolve({ status: response.statusCode, body: responseBody })
          })
          response.on('error', (error) => reject(error))
        })
        request.on('error', (error) => reject(error))
        request.end()
      },
    )

    if (response.status >= 200 && response.status < 300) {
      const json = JSON.parse(response.body)
      const employees = json.data || []

      for (const emp of employees) {
        if (emp.attendance_device_id) {
          // Map: "5" -> "HR-EMP-00001"
          employeeMap.set(String(emp.attendance_device_id), emp.name)
        }
      }
      console.log(
        `Frappe Sync: Mapped ${employeeMap.size} employees with biometric IDs`,
      )
    }
  } catch (e) {
    console.warn(`Frappe Sync: Failed to fetch employee mapping: ${e}`)
  }

  return employeeMap
}

/**
 * Send a single log to Frappe and return the result.
 * Used internally by the concurrent processor.
 */
function pushSingleLog(
  url: string,
  headers: Record<string, string>,
  payload: any,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = net.request({ method: 'POST', url })

    for (const [key, value] of Object.entries(headers)) {
      request.setHeader(key, value)
    }

    let responseBody = ''

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseBody += chunk.toString()
      })

      request.on('error', (error) => {
        reject(error)
      })

      response.on('end', () => {
        resolve({
          status: response.statusCode,
          body: responseBody,
        })
      })

      response.on('error', (error) => {
        reject(error)
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.write(JSON.stringify(payload))
    request.end()
  })
}

/**
 * Classify a Frappe error response into a category
 */
function classifyError(
  statusCode: number,
  body: string,
): { errorMsg: string; isDuplicate: boolean; isEmployeeNotFound: boolean } {
  let errorMsg = `HTTP ${statusCode}`
  let isDuplicate = false
  let isEmployeeNotFound = false

  try {
    const json = JSON.parse(body)
    if (json.exception) {
      errorMsg += `: ${json.exception}`
      if (errorMsg.includes("'NoneType' object has no attribute 'start_time'")) {
        errorMsg = "Missing Shift Assignment for Employee. Please assign a shift in Frappe HR/ERPNext."
      }
    } else if (json._server_messages) {
      const msgs = JSON.parse(json._server_messages)
      const joined = msgs
        .map((m: any) => JSON.parse(m).message)
        .join(', ')
      if (joined) errorMsg += `: ${joined}`
    } else if (json.message) {
      errorMsg += `: ${json.message}`
    }

    if (
      errorMsg.toLowerCase().includes('already has a log') ||
      errorMsg.toLowerCase().includes('same timestamp') ||
      errorMsg.toLowerCase().includes('duplicate')
    ) {
      isDuplicate = true
    }

    if (
      errorMsg.toLowerCase().includes('employee') &&
      (errorMsg.toLowerCase().includes('not found') ||
        errorMsg.toLowerCase().includes('does not exist'))
    ) {
      isEmployeeNotFound = true
    }
  } catch {
    if (body) errorMsg += `: ${body.slice(0, 200)}`
  }

  return { errorMsg, isDuplicate, isEmployeeNotFound }
}

/**
 * Push attendance logs to Frappe API
 *
 * Optimized sync:
 * - Processes up to 5 logs concurrently for speed
 * - Removed per-log duplicate pre-check (let server reject duplicates)
 * - Device lookup is cached per device_id
 * - Employee mapping is fetched once at start
 */
export async function syncLogsToFrappe(
  logs: AttendanceLog[],
  baseUrl: string,
  auth: FrappeAuthConfig,
): Promise<FrappeSyncResult> {
  const result: FrappeSyncResult = {
    success: false,
    pushed: 0,
    errors: [],
    syncedIds: [],
    duplicateIds: [],
    errorIds: [],
  }

  if (!logs.length) {
    console.log('Frappe Sync: No logs to push')
    result.success = true
    return result
  }

  console.log(`Frappe Sync: Starting push of ${logs.length} logs...`)

  // Build headers with authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (auth.mode === 'token' && auth.apiKey && auth.apiSecret) {
    headers['Authorization'] = `token ${auth.apiKey}:${auth.apiSecret}`
  } else if (auth.sid) {
    headers['Cookie'] = `sid=${auth.sid}`
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/method/attendance_bridge.api.attendance.push_logs`

  // Fetch employee mapping once (biometric ID -> Employee ID)
  const employeeMap = await fetchEmployeeMapping(baseUrl, headers)

  // Cache device lookups to avoid repeated DB hits
  const deviceCache = new Map<number, ReturnType<typeof Database.getDeviceById>>()
  const getDevice = (deviceId: number) => {
    if (!deviceCache.has(deviceId)) {
      deviceCache.set(deviceId, Database.getDeviceById(deviceId))
    }
    return deviceCache.get(deviceId)
  }

  // Pre-filter logs: separate valid from invalid (no employee mapping)
  const validLogs: { log: AttendanceLog; employeeId: string }[] = []
  for (const log of logs) {
    if (log.id === undefined) continue

    const actualEmployeeId = employeeMap.get(String(log.employee_id))
    if (!actualEmployeeId) {
      result.errorIds.push(log.id)
      result.errors.push(
        `Log ${log.id}: No Employee found with attendance_device_id '${log.employee_id}'`,
      )
      continue
    }

    validLogs.push({ log, employeeId: actualEmployeeId })
  }

  if (validLogs.length === 0) {
    console.log('Frappe Sync: No valid logs to push (all had mapping errors)')
    result.success = result.errorIds.length > 0 // Mark success if we at least categorized errors
    return result
  }

  console.log(`Frappe Sync: Pushing ${validLogs.length} valid logs (${result.errorIds.length} skipped due to missing employee)`)

  // Process logs in concurrent batches of 5
  const CONCURRENCY = 5

  for (let i = 0; i < validLogs.length; i += CONCURRENCY) {
    const batch = validLogs.slice(i, i + CONCURRENCY)

    const promises = batch.map(async ({ log, employeeId }) => {
      const logId = log.id!

      try {
        const device = getDevice(log.device_id)
        const deviceLocation = device?.location || ''

        // Format timestamp to MySQL-compatible format (YYYY-MM-DD HH:MM:SS) in LOCAL time
        let formattedTimestamp = log.timestamp
        if (log.timestamp) {
          const date = new Date(log.timestamp)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            const seconds = String(date.getSeconds()).padStart(2, '0')
            formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
          }
        }

        const payload = {
          logs: [
            {
              local_id: logId,
              employee_id: employeeId,
              timestamp: formattedTimestamp,
              log_type: log.status,
              device_id: String(log.device_id),
              device_location: deviceLocation,
              latitude: device?.latitude != null ? Number(device.latitude) : 0.0001,
              longitude: device?.longitude != null ? Number(device.longitude) : 0.0001,
            },
          ],
        }

        const response = await pushSingleLog(url, headers, payload)

        if (response.status >= 200 && response.status < 300) {
          result.syncedIds.push(logId)
          result.pushed++
        } else {
          const { errorMsg, isDuplicate, isEmployeeNotFound } = classifyError(
            response.status,
            response.body,
          )

          if (isDuplicate) {
            result.duplicateIds.push(logId)
          } else if (isEmployeeNotFound) {
            result.errorIds.push(logId)
            result.errors.push(`Log ${logId}: ${errorMsg}`)
          } else {
            // Other error - remain pending for retry
            result.errors.push(`Log ${logId}: ${errorMsg}`)
            console.warn(`Frappe Sync: Log ${logId} failed - ${errorMsg}`)
          }
        }
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || 'Unknown error'
        result.errors.push(`Log ${logId}: ${errorMsg}`)
        console.error(`Frappe Sync: Log ${logId} exception - ${errorMsg}`)
      }
    })

    await Promise.all(promises)

    // Log progress every batch
    const processed = Math.min(i + CONCURRENCY, validLogs.length)
    if (processed % 25 === 0 || processed === validLogs.length) {
      console.log(`Frappe Sync: Progress ${processed}/${validLogs.length} (synced: ${result.syncedIds.length}, dup: ${result.duplicateIds.length})`)
    }
  }

  result.success = result.syncedIds.length > 0 || result.duplicateIds.length > 0

  console.log(
    `Frappe Sync: Complete. Synced: ${result.syncedIds.length}, Duplicates: ${result.duplicateIds.length}, Errors: ${result.errorIds.length}`,
  )

  return result
}
