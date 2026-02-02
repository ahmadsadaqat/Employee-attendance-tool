/**
 * Frappe API Sync Module
 *
 * PURPOSE:
 * This module handles syncing attendance logs to the Frappe API.
 * Phase 12: Frappe is now the SOLE sync destination. Supabase removed.
 * Phase 15: Sends device LOCATION instead of numeric device_id.
 *
 * BEHAVIOR:
 * - Logs are pushed to Frappe and marked synced on success
 * - Failed logs remain unsynced for retry
 * - Returns list of successfully synced IDs for marking
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
 * Check if Frappe sync is enabled via environment variable
 */
export function isFrappeSyncEnabled(): boolean {
  const enabled = process.env.FRAPPE_SYNC_ENABLED
  return enabled === 'true' || enabled === '1'
}

/**
 * Get the Frappe base URL from environment or fallback
 */
export function getFrappeBaseUrl(fallbackUrl?: string): string | null {
  return process.env.FRAPPE_BASE_URL || fallbackUrl || null
}

/**
 * Check if an Employee Checkin already exists in Frappe for the given employee and timestamp
 * Returns true if a matching checkin exists, false otherwise
 */
async function checkExistingCheckin(
  employeeId: string, // Actual Employee ID like "HR-EMP-00001"
  timestamp: string, // Formatted as "YYYY-MM-DD HH:MM:SS"
  baseUrl: string,
  headers: Record<string, string>,
): Promise<boolean> {
  try {
    // Query Employee Checkin with employee AND time filters
    const filters = JSON.stringify([
      ['employee', '=', employeeId],
      ['time', '=', timestamp],
    ])
    const params = new URLSearchParams({
      filters,
      limit_page_length: '1',
    })

    const url = `${baseUrl.replace(/\/$/, '')}/api/resource/Employee Checkin?${params.toString()}`
    console.log(
      `Frappe Sync: Checking for existing checkin: employee=${employeeId}, time=${timestamp}`,
    )

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
      const data = json.data || []
      if (data.length > 0) {
        console.log(
          `Frappe Sync: Found existing checkin for ${employeeId} at ${timestamp}`,
        )
        return true
      }
    }
  } catch (e) {
    console.warn(`Frappe Sync: Failed to check existing checkin: ${e}`)
  }
  return false // Assume not duplicate if check fails
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
 * Push attendance logs to Frappe API
 *
 * This calls the existing Frappe endpoint:
 *   /api/method/attendance_bridge.api.attendance.push_logs
 *
 * The function:
 * - Logs request start, payload count (no PII), response, and errors
 * - Does NOT throw on failure (returns result object instead)
 * - Returns syncedIds for caller to mark logs as synced
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

  console.log('Frappe Sync: Starting push...')
  console.log(`Frappe Sync: Processing ${logs.length} logs individually`)

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

  // Fetch employee mapping (biometric ID -> Employee ID) from Frappe
  const employeeMap = await fetchEmployeeMapping(baseUrl, headers)

  // Process each log individually
  for (const log of logs) {
    if (log.id === undefined) continue

    try {
      // Look up device to get location for the custom field
      const device = Database.getDeviceById(log.device_id)
      const deviceLocation = device?.location || ''

      // Map biometric ID to actual Employee ID
      const actualEmployeeId = employeeMap.get(String(log.employee_id))
      if (!actualEmployeeId) {
        // Employee not found - mark as error
        result.errorIds.push(log.id)
        result.errors.push(
          `Log ${log.id}: No Employee found with attendance_device_id '${log.employee_id}'`,
        )
        console.log(
          `Frappe Sync: Log ${log.id} error - no employee with biometric ID '${log.employee_id}'`,
        )
        continue
      }

      // Format timestamp to MySQL-compatible format (YYYY-MM-DD HH:MM:SS) in LOCAL time
      // Using local components to avoid UTC conversion issues (4:00 AM PKT != 23:00 UTC)
      let formattedTimestamp = log.timestamp
      if (log.timestamp) {
        const date = new Date(log.timestamp)
        if (!isNaN(date.getTime())) {
          // Use local time components, not UTC
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          const seconds = String(date.getSeconds()).padStart(2, '0')
          formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        }
      }

      // Pre-check: Query Frappe to see if this checkin already exists
      const existingCheck = await checkExistingCheckin(
        actualEmployeeId,
        formattedTimestamp,
        baseUrl,
        headers,
      )
      if (existingCheck) {
        // Already exists in ERP - mark as duplicate without pushing
        result.duplicateIds.push(log.id)
        console.log(
          `Frappe Sync: Log ${log.id} already exists in ERP (pre-check), marking as duplicate`,
        )
        continue
      }

      const payload = {
        logs: [
          {
            local_id: log.id,
            employee_id: actualEmployeeId, // Use mapped Employee ID, not biometric ID
            timestamp: formattedTimestamp,
            log_type: log.status,
            device_id: String(log.device_id),
            device_location: deviceLocation,
            latitude: 0.0001,
            longitude: 0.0001,
          },
        ],
      }

      // Use Electron's net module for consistent behavior with session
      const response = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
          const request = net.request({
            method: 'POST',
            url,
          })

          for (const [key, value] of Object.entries(headers)) {
            request.setHeader(key, value)
          }

          let responseBody = ''

          request.on('response', (response) => {
            response.on('data', (chunk) => {
              responseBody += chunk.toString()
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
        },
      )

      // Parse response for this individual log
      if (response.status >= 200 && response.status < 300) {
        // Success - mark as synced
        result.syncedIds.push(log.id)
        result.pushed++
        console.log(`Frappe Sync: Log ${log.id} synced successfully`)
      } else {
        // Error - categorize based on response
        let errorMsg = `HTTP ${response.status}`
        let isDuplicate = false
        let isEmployeeNotFound = false

        try {
          const json = JSON.parse(response.body)
          if (json.exception) errorMsg += `: ${json.exception}`
          else if (json._server_messages) {
            const msgs = JSON.parse(json._server_messages)
            const joined = msgs
              .map((m: any) => JSON.parse(m).message)
              .join(', ')
            if (joined) errorMsg += `: ${joined}`
          } else if (json.message) {
            errorMsg += `: ${json.message}`
          }

          // Detect duplicate pattern
          if (
            errorMsg.toLowerCase().includes('already has a log') ||
            errorMsg.toLowerCase().includes('same timestamp') ||
            errorMsg.toLowerCase().includes('duplicate')
          ) {
            isDuplicate = true
          }

          // Detect employee not found pattern
          if (
            errorMsg.toLowerCase().includes('employee') &&
            (errorMsg.toLowerCase().includes('not found') ||
              errorMsg.toLowerCase().includes('does not exist'))
          ) {
            isEmployeeNotFound = true
          }
        } catch {
          if (response.body) errorMsg += `: ${response.body.slice(0, 200)}`
        }

        if (isDuplicate) {
          result.duplicateIds.push(log.id)
          console.log(`Frappe Sync: Log ${log.id} is duplicate`)
        } else if (isEmployeeNotFound) {
          result.errorIds.push(log.id)
          result.errors.push(`Log ${log.id}: ${errorMsg}`)
          console.log(`Frappe Sync: Log ${log.id} error - employee not found`)
        } else {
          // Other error - don't add to any list, will remain as pending for retry
          result.errors.push(`Log ${log.id}: ${errorMsg}`)
          console.warn(`Frappe Sync: Log ${log.id} failed - ${errorMsg}`)
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'Unknown error'
      result.errors.push(`Log ${log.id}: ${errorMsg}`)
      console.error(`Frappe Sync: Log ${log.id} exception - ${errorMsg}`)
      // Don't add to any list - will remain pending for retry
    }
  }

  result.success = result.syncedIds.length > 0 || result.duplicateIds.length > 0

  console.log(
    `Frappe Sync: Complete. Synced: ${result.syncedIds.length}, Duplicates: ${result.duplicateIds.length}, Errors: ${result.errorIds.length}`,
  )

  return result
}
