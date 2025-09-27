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
      await zk.createSocket()
      if (useUdp && zk.connectionType !== 'udp') {
        try {
          await zk.zklibTcp?.disconnect?.()
        } catch {}
        try {
          await zk.zklibUdp?.createSocket?.()
          await zk.zklibUdp?.connect?.()
          zk.connectionType = 'udp'
        } catch {}
      }
      // Try getAttendances with internal progress callback to prolong device read
      const raw = await zk.getAttendances(() => {})
      const list = Array.isArray(raw) ? raw : raw?.data
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
