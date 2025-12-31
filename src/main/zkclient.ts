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
  }) {
    const { ip, port = 4370, commKey, useUdp } = opts
    // Lazy require to avoid ESM/CJS interop issues at compile time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ZKLib = require('node-zklib')

    // Constructor per README: (ip, port, timeout, inport)
    const zk = new ZKLib(ip, port, 15000, 5000)
    try {
      let logs: any[] = [];
      let success = false;

      // ATTEMPT 1: TCP
      if (!useUdp && zk.zklibTcp) {
          try {
             console.log('ZKClient: Attempting TCP Fetch...')

             // 1a. Connect TCP
             await zk.zklibTcp.createSocket(
               (err: any) => console.error('ZK TCP Error:', err),
               () => {} // silence close warning during attempt
             )
             await zk.zklibTcp.connect()
             zk.connectionType = 'tcp'
             console.log('ZKClient: TCP Connected, fetching logs...')

             // 1b. Fetch
             const raw = await zk.getAttendances(() => {})
             logs = Array.isArray(raw) ? raw : raw?.data
             success = true
             console.log(`ZKClient: TCP Fetch Success. Got ${logs?.length} records.`)
          } catch(e) {
             console.warn(`ZKClient: TCP attempt failed (${(e as any).message}), switching to UDP...`)
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
             if (zk.zklibTcp?.socket) try { await zk.zklibTcp.disconnect() } catch {}

             zk.connectionType = 'udp'
             if (zk.zklibUdp) {
                await zk.zklibUdp.createSocket(
                  (err: any) => console.error('ZK UDP Error:', err),
                  () => console.warn('ZK UDP Closed')
                )
                await zk.zklibUdp.connect()
             } else {
                await zk.createSocket() // standard fallback
             }

             console.log('ZKClient: UDP Connected, fetching logs...')
             const raw = await zk.getAttendances(() => {})
             logs = Array.isArray(raw) ? raw : raw?.data
             success = true
             console.log(`ZKClient: UDP Fetch Success. Got ${logs?.length} records.`)
         } catch(e: any) {
             throw new Error(`Fetch failed (TCP & UDP): ${e.message || e}`)
         }
      }

      const list = logs
      if (!list) return []

      // Map to our schema
      const mapped = list.map((r: any) => {
        const deviceUserId = String(
          r?.deviceUserId ?? r?.uid ?? r?.userId ?? r?.user?.id ?? ''
        )
        const ts = r?.recordTime || r?.timestamp || r?.time || Date.now()
        const attType = r?.attendanceType ?? r?.type ?? r?.state ?? 0
        const status = attType === 1 ? 'OUT' : 'IN'
        return {
          employee_id: deviceUserId,
          timestamp: new Date(ts).toISOString(),
          status: status as 'IN' | 'OUT',
        }
      })
      return mapped

    } finally {
      try {
        await zk.disconnect()
      } catch {}
    }
  }
}
