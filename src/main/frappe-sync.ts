/**
 * Frappe API Sync Module
 *
 * PURPOSE:
 * This module handles syncing attendance logs to the Frappe API.
 * Phase 12: Frappe is now the SOLE sync destination. Supabase removed.
 *
 * BEHAVIOR:
 * - Logs are pushed to Frappe and marked synced on success
 * - Failed logs remain unsynced for retry
 * - Returns list of successfully synced IDs for marking
 */

import { net } from 'electron'

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
  synced: 0 | 1
}

export interface FrappeSyncResult {
  success: boolean
  pushed: number
  errors: string[]
  syncedIds: number[] // IDs of logs successfully synced (for marking)
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
  }

  if (!logs.length) {
    console.log('Frappe Sync: No logs to push')
    result.success = true
    return result
  }

  console.log('Frappe Sync: Starting push...')
  console.log(`Frappe Sync: Payload count: ${logs.length}`)

  try {
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

    // Prepare payload matching expected Frappe API format
    // The endpoint expects logs with: employee_id, timestamp, status (log_type), device_id
    const payload = {
      logs: logs.map((log) => ({
        employee_id: log.employee_id,
        timestamp: log.timestamp,
        log_type: log.status, // IN or OUT
        device_id: String(log.device_id),
      })),
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/method/attendance_bridge.api.attendance.push_logs`

    console.log(`Frappe Sync: Calling ${url}`)

    // Use Electron's net module for consistent behavior with session
    const response = await new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        const request = net.request({
          method: 'POST',
          url,
        })

        // Set headers
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

    // Parse response
    if (response.status >= 200 && response.status < 300) {
      console.log(`Frappe Sync: Response status: ${response.status}`)
      try {
        const json = JSON.parse(response.body)
        console.log('Frappe Sync: Response:', JSON.stringify(json, null, 2))
        result.success = true
        result.pushed = logs.length
        result.syncedIds = logs
          .filter((l) => l.id !== undefined)
          .map((l) => l.id as number)
      } catch {
        console.log('Frappe Sync: Response (raw):', response.body)
        result.success = true
        result.pushed = logs.length
        result.syncedIds = logs
          .filter((l) => l.id !== undefined)
          .map((l) => l.id as number)
      }
    } else {
      // Non-success status
      let errorMsg = `HTTP ${response.status}`
      try {
        const json = JSON.parse(response.body)
        if (json.exception) errorMsg += `: ${json.exception}`
        else if (json._server_messages) {
          const msgs = JSON.parse(json._server_messages)
          const joined = msgs.map((m: any) => JSON.parse(m).message).join(', ')
          if (joined) errorMsg += `: ${joined}`
        } else if (json.message) {
          errorMsg += `: ${json.message}`
        }
      } catch {
        if (response.body) errorMsg += `: ${response.body.slice(0, 200)}`
      }

      console.error(`Frappe Sync: Error - ${errorMsg}`)
      result.errors.push(errorMsg)
    }
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || 'Unknown error'
    console.error(`Frappe Sync: Error - ${errorMsg}`)
    result.errors.push(errorMsg)
  }

  console.log(
    `Frappe Sync: Complete. Pushed: ${result.pushed}, Errors: ${result.errors.length}`,
  )

  return result
}
