import DatabaseDriver from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

export type Attendance = {
  id?: number
  device_id: number
  employee_id: string
  timestamp: string // ISO
  status: 'IN' | 'OUT'
  synced: 0 | 1
}

export type Device = {
  id?: number
  name: string
  ip: string
  port: number
  comm_key?: string | null
  use_udp?: number // 0 or 1
  instance_url?: string // Scoped to ERP instance
}

export class Database {
  private static db: DatabaseDriver.Database
  private static dbPath: string

  static async init(storagePath: string, currentInstanceUrl?: string) {
    const dataDir = storagePath
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

    this.dbPath = path.join(dataDir, 'attendance.db')
    this.db = new DatabaseDriver(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ip TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 4370,
        comm_key TEXT,
        use_udp INTEGER NOT NULL DEFAULT 0,
        instance_url TEXT
      );
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        employee_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status in ('IN','OUT')),
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(device_id) REFERENCES devices(id)
      );
      CREATE INDEX IF NOT EXISTS idx_attendance_synced ON attendance(synced);
      CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_dedupe
        ON attendance(device_id, employee_id, timestamp, status);
    `)

    // Backfill columns for older DBs
    try {
      const cols = this.db
        .prepare("PRAGMA table_info('devices')")
        .all() as any[]
      const names = cols.map((c) => c.name)

      if (!names.includes('comm_key')) {
        this.db.exec('ALTER TABLE devices ADD COLUMN comm_key TEXT')
      }
      if (!names.includes('use_udp')) {
        this.db.exec(
          'ALTER TABLE devices ADD COLUMN use_udp INTEGER NOT NULL DEFAULT 0'
        )
      }
      if (!names.includes('instance_url')) {
        this.db.exec('ALTER TABLE devices ADD COLUMN instance_url TEXT')
        // Backfill existing devices to current URL if provided, assuming they belong to the first-seen instance
        if (currentInstanceUrl) {
          this.db
            .prepare(
              'UPDATE devices SET instance_url = ? WHERE instance_url IS NULL'
            )
            .run(currentInstanceUrl)
        }
      }
    } catch {}
  }

  static insertDevice(device: Device) {
    const stmt = this.db.prepare(
      'INSERT INTO devices (id, name, ip, port, comm_key, use_udp, instance_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const info = stmt.run(
      device.id ?? null,
      device.name,
      device.ip,
      device.port,
      device.comm_key ?? null,
      device.use_udp ?? 0,
      device.instance_url ?? null
    )
    return info.lastInsertRowid as number
  }

  static listDevices(instanceUrl?: string): Device[] {
    if (instanceUrl) {
      return this.db
        .prepare('SELECT * FROM devices WHERE instance_url = ?')
        .all(instanceUrl) as Device[]
    }
    return this.db.prepare('SELECT * FROM devices').all() as Device[]
  }

  static getDeviceByIpPort(
    ip: string,
    port: number,
    instanceUrl?: string
  ): Device | undefined {
    // If instanceUrl is provided, ensure we pick the one matching it (allowing same IP for different instances conceptually, though rare locally)
    let sql = 'SELECT * FROM devices WHERE ip=? AND port=?'
    const args: any[] = [ip, port]

    if (instanceUrl) {
      sql += ' AND instance_url = ?'
      args.push(instanceUrl)
    }

    return this.db.prepare(sql).get(...args) as Device | undefined
  }

  static ensureDevice(
    name: string,
    ip: string,
    port: number,
    comm_key?: string | null,
    use_udp?: number,
    instanceUrl?: string,
    preferredId?: number
  ): number {
    // 1. Check by ID first if restoring
    if (preferredId) {
      const byId = this.getDeviceById(preferredId)
      if (byId) {
        this.updateDevice(byId.id!, {
          name,
          comm_key: comm_key ?? byId.comm_key ?? null,
          use_udp: use_udp ?? byId.use_udp ?? 0,
        })
        return byId.id!
      }
    }

    // 2. Fallback to check by IP/Port
    const existing = this.getDeviceByIpPort(ip, port, instanceUrl)
    if (existing?.id) {
      // If we found by IP but we have a preferred ID that DOESNT match, we have a conflict.
      // E.g. Cloud says {id: 11, ip: 10.0.0.5} but Local says {id: 5, ip: 10.0.0.5}.
      // In this case, we update the local one to match cloud's data, but we can't easily change ID if there are FKs.
      // For now, return existing ID to be safe, unless we force re-insert (delete old one?).
      // Let's stick to returning existing ID to align with "Sync".

      this.updateDevice(existing.id, {
        name,
        comm_key: comm_key ?? existing.comm_key ?? null,
        use_udp: use_udp ?? existing.use_udp ?? 0,
        // Don't change instance_url implicitly
      })
      return existing.id
    }

    // 3. Insert new
    return this.insertDevice({
      id: preferredId,
      name,
      ip,
      port,
      comm_key: comm_key ?? null,
      use_udp: use_udp ?? 0,
      instance_url: instanceUrl,
    })
  }

  static getDeviceById(id: number): Device | undefined {
    return this.db.prepare('SELECT * FROM devices WHERE id=?').get(id) as
      | Device
      | undefined
  }

  static deleteOldLogs(days: number, instanceUrl?: string): number {
    if (instanceUrl) {
      // Delete logs linked to devices of this instance
      const info = this.db
        .prepare(
          `
         DELETE FROM attendance
         WHERE timestamp < date('now', '-' || ? || ' days')
         AND device_id IN (SELECT id FROM devices WHERE instance_url = ?)
       `
        )
        .run(days, instanceUrl)
      return info.changes
    }

    // Global delete (fallback)
    const info = this.db
      .prepare(
        `
      DELETE FROM attendance
      WHERE timestamp < date('now', '-' || ? || ' days')
    `
      )
      .run(days)
    return info.changes
  }

  static deleteDevice(id: number) {
    // Remove dependent attendance rows first to satisfy FK constraint
    this.db.prepare('DELETE FROM attendance WHERE device_id=?').run(id)
    this.db.prepare('DELETE FROM devices WHERE id=?').run(id)
  }

  static insertAttendance(a: Attendance) {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO attendance (device_id, employee_id, timestamp, status, synced) VALUES (?, ?, ?, ?, ?)'
    )
    const info = stmt.run(
      a.device_id,
      a.employee_id,
      a.timestamp,
      a.status,
      a.synced ?? 0
    )
    return info.lastInsertRowid as number
  }

  static markSynced(ids: number[]) {
    if (!ids.length) return
    const stmt = this.db.prepare('UPDATE attendance SET synced=1 WHERE id=?')
    const tx = this.db.transaction((rows: number[]) =>
      rows.forEach((id) => stmt.run(id))
    )
    tx(ids)
  }

  static getUnsynced(
    limit = 100,
    instanceUrl?: string
  ): Attendance[] & { id: number }[] {
    if (instanceUrl) {
      return this.db
        .prepare(
          `
            SELECT a.*, a.status as log_type FROM attendance a
            JOIN devices d ON a.device_id = d.id
            WHERE a.synced=0 AND d.instance_url = ?
            ORDER BY a.timestamp ASC
            LIMIT ?
        `
        )
        .all(instanceUrl, limit) as any
    }
    return this.db
      .prepare(
        'SELECT *, status as log_type FROM attendance WHERE synced=0 ORDER BY timestamp ASC LIMIT ?'
      )
      .all(limit) as any
  }

  static getStats(instanceUrl?: string) {
    if (instanceUrl) {
      const total = this.db
        .prepare(
          'SELECT COUNT(a.id) as c FROM attendance a JOIN devices d ON a.device_id = d.id WHERE d.instance_url = ?'
        )
        .get(instanceUrl) as any
      const unsynced = this.db
        .prepare(
          'SELECT COUNT(a.id) as c FROM attendance a JOIN devices d ON a.device_id = d.id WHERE a.synced=0 AND d.instance_url = ?'
        )
        .get(instanceUrl) as any
      const today = this.db
        .prepare(
          "SELECT COUNT(a.id) as c FROM attendance a JOIN devices d ON a.device_id = d.id WHERE date(a.timestamp)=date('now') AND d.instance_url = ?"
        )
        .get(instanceUrl) as any
      return { total: total.c, unsynced: unsynced.c, today: today.c }
    }

    const total = this.db
      .prepare('SELECT COUNT(*) as c FROM attendance')
      .get() as any
    const unsynced = this.db
      .prepare('SELECT COUNT(*) as c FROM attendance WHERE synced=0')
      .get() as any
    const today = this.db
      .prepare(
        "SELECT COUNT(*) as c FROM attendance WHERE date(timestamp)=date('now')"
      )
      .get() as any
    return { total: total.c, unsynced: unsynced.c, today: today.c }
  }

  static listAttendance(limit = 100, instanceUrl?: string) {
    if (instanceUrl) {
      return this.db
        .prepare(
          `
            SELECT a.* FROM attendance a
            JOIN devices d ON a.device_id = d.id
            WHERE d.instance_url = ?
            ORDER BY datetime(a.timestamp) DESC LIMIT ?
        `
        )
        .all(instanceUrl, limit) as Attendance[] & { id: number }[]
    }

    return this.db
      .prepare(
        'SELECT * FROM attendance ORDER BY datetime(timestamp) DESC LIMIT ?'
      )
      .all(limit) as Attendance[] & { id: number }[]
  }

  static listAttendanceByDevice(deviceId: number, limit = 100) {
    return this.db
      .prepare(
        'SELECT * FROM attendance WHERE device_id=? ORDER BY datetime(timestamp) DESC LIMIT ?'
      )
      .all(deviceId, limit) as Attendance[] & { id: number }[]
  }

  static updateDevice(
    id: number,
    fields: Partial<Pick<Device, 'name' | 'comm_key' | 'use_udp'>>
  ) {
    const sets: string[] = []
    const values: any[] = []
    if (fields.name !== undefined) {
      sets.push('name=?')
      values.push(fields.name)
    }
    if (fields.comm_key !== undefined) {
      sets.push('comm_key=?')
      values.push(fields.comm_key)
    }
    if (fields.use_udp !== undefined) {
      sets.push('use_udp=?')
      values.push(fields.use_udp)
    }
    if (!sets.length) return
    values.push(id)
    const sql = `UPDATE devices SET ${sets.join(', ')} WHERE id=?`
    this.db.prepare(sql).run(...values)
  }
}
