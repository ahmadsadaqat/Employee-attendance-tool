import net from 'node:net'

export class ZKClient {
  static async testConnection(ip: string, port = 4370, timeoutMs = 3000) {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const socket = new net.Socket()
      const onError = (err?: Error) => {
        try {
          socket.destroy()
        } catch {}
        resolve({ ok: false, error: err?.message || 'connection failed' })
      }
      socket.once('error', onError)
      socket.setTimeout(timeoutMs, () => onError(new Error('timeout')))
      socket.connect(port, ip, () => {
        socket.end()
        resolve({ ok: true })
      })
    })
  }

  // Fetch logs using zklib/node-zklib (tested with many ZKTeco models including K-series)
  static async fetchLogs(opts: {
    ip: string
    port?: number
    commKey?: string
    useUdp?: boolean
    startDate?: string // ISO date string (e.g., "2026-01-01")
    endDate?: string // ISO date string (e.g., "2026-01-31")
  }) {
    const { ip, port = 4370, commKey, useUdp, startDate, endDate } = opts
    // Lazy require to avoid ESM/CJS interop issues at compile time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ZKLib = require('node-zklib')

    // Constructor per README: (ip, port, timeout, inport)
    const zk = new ZKLib(ip, port, 15000, 5000)
    try {
      let logs: any[] = []
      let success = false

      // ATTEMPT 1: TCP
      if (!useUdp && zk.zklibTcp) {
        try {
          console.log('ZKClient: Attempting TCP Fetch...')

          // 1a. Connect TCP
          await zk.zklibTcp.createSocket(
            (err: any) => console.error('ZK TCP Error:', err),
            () => {}, // silence close warning during attempt
          )
          await zk.zklibTcp.connect()
          zk.zklibTcp.is_connect = true
          zk.connectionType = 'tcp'
          console.log('ZKClient: TCP Connected, fetching logs...')

          // 1b. Fetch
          const raw = await zk.getAttendances(() => {})
          logs = Array.isArray(raw) ? raw : raw?.data
          success = true
          console.log(
            `ZKClient: TCP Fetch Success. Got ${logs?.length} records.`,
          )
        } catch (e) {
          console.warn(
            `ZKClient: TCP attempt failed (${
              (e as any).message
            }), switching to UDP...`,
          )
          try {
            if (zk.zklibTcp.disconnect) await zk.zklibTcp.disconnect()
          } catch {}
        }
      }

      // ATTEMPT 2: UDP (Fallback or if useUdp=true)
      if (!success) {
        console.log('ZKClient: Attempting UDP Fetch...')
        try {
          // Cleanup if needed
          if (zk.zklibTcp?.socket)
            try {
              await zk.zklibTcp.disconnect()
            } catch {}

          zk.connectionType = 'udp'
          if (zk.zklibUdp) {
            await zk.zklibUdp.createSocket(
              (err: any) => console.error('ZK UDP Error:', err),
              () => console.warn('ZK UDP Closed'),
            )
            await zk.zklibUdp.connect()
          } else {
            await zk.createSocket() // standard fallback
          }

          console.log('ZKClient: UDP Connected, fetching logs...')
          const raw = await zk.getAttendances(() => {})
          logs = Array.isArray(raw) ? raw : raw?.data
          success = true
          console.log(
            `ZKClient: UDP Fetch Success. Got ${logs?.length} records.`,
          )
        } catch (e: any) {
          throw new Error(`Fetch failed (TCP & UDP): ${e.message || e}`)
        }
      }

      const list = logs
      if (!list) return []

      // Map to our schema
      const mapped = list.map((r: any, idx: number) => {
        const deviceUserId = String(
          r?.deviceUserId ?? r?.uid ?? r?.userId ?? r?.user?.id ?? '',
        )
        const ts = r?.recordTime || r?.timestamp || r?.time || Date.now()

        // node-zklib PR #60 decodes inOutStatus as a string ('IN' or 'OUT') internally
        let inOutStatus = r?.inOutStatus
        
        // Ensure backwards compatibility just in case we get a numeric value from an older logic
        if (inOutStatus === 0) inOutStatus = 'IN';
        if (inOutStatus === 1) inOutStatus = 'OUT';
        
        const status: 'IN' | 'OUT' = inOutStatus === 'OUT' ? 'OUT' : 'IN'

        // Always log raw record data for debugging
        console.log(
          `ZKClient: Record[${idx}] deviceUserId=${deviceUserId} ` +
          `inOutStatus=${inOutStatus} -> ${status} ` +
          `keys=[${Object.keys(r).join(',')}]`,
        )

        return {
          employee_id: deviceUserId,
          timestamp: new Date(ts).toISOString(),
          status,
        }
      })

      // Filter by date range if specified
      // Compare using local date strings (YYYY-MM-DD) to handle timezone properly
      if (startDate || endDate) {
        const filtered = mapped.filter((log) => {
          // Convert log timestamp to local date string (YYYY-MM-DD)
          const logDate = new Date(log.timestamp)
          const logDateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`

          // Compare date strings
          if (startDate && logDateStr < startDate) return false
          if (endDate && logDateStr > endDate) return false
          return true
        })

        console.log(
          `ZKClient: Filtered logs from ${mapped.length} to ${filtered.length} (date range: ${startDate || 'any'} to ${endDate || 'any'})`,
        )
        return filtered
      }

      return mapped
    } finally {
      try {
        await zk.disconnect()
      } catch {}
    }
  }
}
