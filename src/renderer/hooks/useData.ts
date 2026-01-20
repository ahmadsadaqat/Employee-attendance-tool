import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FrappeApp } from 'frappe-js-sdk'

// Helper to get the current Frappe client or constructed URL
const getBaseUrl = () => {
  return (window as any).frappeBaseUrl || '/frappe' // Fallback
}

// Generic Frappe DocList fetcher
export const fetchDocList = async (
  doctype: string,
  filters?: any,
  fields?: string[],
  orderBy?: { field: string; order: 'desc' | 'asc' },
  limit_start?: number,
  limit?: number,
) => {
  const baseUrl = getBaseUrl()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Inject proxy header if needed (for browser dev) - REMOVED: Main Process handles auth injection now
  // if ((window as any).frappeRealUrl) {
  //     headers['X-Proxy-Target'] = (window as any).frappeRealUrl;
  // }

  const params = new URLSearchParams({
    // doctype is already in the URL path, do not add it here as it causes "multiple values" error
    fields: JSON.stringify(fields || ['*']),
    filters: JSON.stringify(filters || []),
    limit_start: timestamp(limit_start || 0),
    limit_page_length: timestamp(limit || 20),
    order_by: orderBy ? `${orderBy.field} ${orderBy.order}` : 'modified desc',
  })

  // We use the patched fetch which handles credentials and proxy headers
  const response = await fetch(
    `${baseUrl}/api/resource/${doctype}?${params.toString()}`,
    {
      method: 'GET',
      headers,
    },
  )

  if (!response.ok) {
    // Handle 417 Expectation Failed as empty list (Server quirk)
    if (response.status === 417) {
      console.warn('Frappe API 417 (Expectation Failed) treated as empty list.')
      return []
    }

    let errorMessage = response.statusText
    try {
      const errorJson = await response.json()
      if (errorJson.exception) errorMessage = errorJson.exception
      else if (errorJson.message) errorMessage = errorJson.message
      else if (errorJson._server_messages) {
        const msgs = JSON.parse(errorJson._server_messages)
        errorMessage = msgs.map((m: any) => JSON.parse(m).message).join(', ')
      }
    } catch (e) {
      // Failed to parse error JSON, fall back to statusText
    }
    throw new Error(`Frappe fetch error: ${errorMessage}`)
  }

  const json = await response.json()
  return json.data
}

// Helper for params
function timestamp(n: number) {
  return n.toString()
}

// Hook for fetching logs from ZKTeco devices via IPC
export const useFrappeDocList = (
  doctype: string,
  options?: {
    filters?: any
    fields?: string[]
    orderBy?: { field: string; order: 'desc' | 'asc' }
    limit?: number
    page?: number // Offset
    enabled?: boolean
    refetchInterval?: number
  },
) => {
  // Include URL in key to force refetch on switch
  const currentUrl = (window as any).frappeBaseUrl || ''

  // Calculate limit_start from page (0-based) and limit
  const limit = options?.limit || 20
  const start = (options?.page || 0) * limit

  return useQuery({
    queryKey: ['frappe', currentUrl, doctype, options?.filters, limit, start],
    queryFn: () =>
      fetchDocList(
        doctype,
        options?.filters,
        options?.fields,
        options?.orderBy,
        start,
        limit,
      ),
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
  })
}

// Hook for fetching logs from ZKTeco devices via IPC
export const useDeviceLogs = (enabled: boolean = false) => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ threshold }: { threshold?: number } = {}) => {
      // Logic to fetch from ALL devices
      const devices = await (window as any).api.listDevices()
      let totalImported = 0
      let totalIgnored = 0

      for (const device of devices) {
        try {
          const result = await (window as any).api.fetchLogs(
            device.ip,
            device.port,
            device.name,
            device.commKey,
            device.useUdp === 1,
            { doublePunchThreshold: threshold },
          )
          if (result.imported) totalImported += result.imported
          if (result.ignored) totalIgnored += result.ignored
        } catch (e) {
          console.error(
            `Failed to fetch from device ${device.name} (${device.ip}):`,
            e,
          )
        }
      }
      return { imported: totalImported, ignored: totalIgnored }
    },
    onSuccess: () => {
      // Broadly invalidate frappe queries to pick up new data regardless of URL
      queryClient.invalidateQueries({ queryKey: ['frappe'] })
    },
  })

  return mutation
}

// Hook for fetching local attendance from SQLite
export const useLocalAttendance = (limit: number = 500) => {
  return useQuery({
    queryKey: ['localAttendance', limit],
    queryFn: async () => {
      return await (window as any).api.listAttendance(limit)
    },
    refetchInterval: 5000, // Poll frequently to show new logs immediately
  })
}

// Hook for fetching total count of a Doctype
export const useFrappeCount = (doctype: string, filters?: any) => {
  const currentUrl = (window as any).frappeBaseUrl || ''

  return useQuery({
    queryKey: ['frappe', 'count', currentUrl, doctype, filters],
    queryFn: async () => {
      const baseUrl = getBaseUrl()
      const params = new URLSearchParams({
        fields: JSON.stringify(['name']),
        filters: JSON.stringify(filters || []),
        limit_page_length: '99999', // Fetch all to count
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      const response = await fetch(
        `${baseUrl}/api/resource/${doctype}?${params.toString()}`,
        { method: 'GET', headers },
      )

      if (!response.ok) return 0
      const json = await response.json()
      return json.data ? json.data.length : 0
    },
    // Cache count for longer as it changes less frequently
    staleTime: 1000 * 60 * 5,
  })
}
