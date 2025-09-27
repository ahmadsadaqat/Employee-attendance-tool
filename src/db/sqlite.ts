import DatabaseDriver from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const dataDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dataDir, 'attendance.db')

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
}

export class Database {
  private static db: DatabaseDriver.Database

  static async init() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    this.db = new DatabaseDriver(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ip TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 4370,
        comm_key TEXT,
        use_udp INTEGER NOT NULL DEFAULT 0
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
    } catch {}
  }

  static insertDevice(device: Device) {
    const stmt = this.db.prepare(
      'INSERT INTO devices (name, ip, port, comm_key, use_udp) VALUES (?, ?, ?, ?, ?)'
    )
    const info = stmt.run(
      device.name,
      device.ip,
      device.port,
      device.comm_key ?? null,
      device.use_udp ?? 0
    )
    return info.lastInsertRowid as number
  }

  static listDevices(): Device[] {
    return this.db.prepare('SELECT * FROM devices').all() as Device[]
  }

  static getDeviceByIpPort(ip: string, port: number): Device | undefined {
    return this.db
      .prepare('SELECT * FROM devices WHERE ip=? AND port=?')
      .get(ip, port) as Device | undefined
  }

  static ensureDevice(
    name: string,
    ip: string,
    port: number,
    comm_key?: string | null,
    use_udp?: number
  ): number {
    const existing = this.getDeviceByIpPort(ip, port)
    if (existing?.id) {
      // Update stored properties if changed
      this.updateDevice(existing.id, {
        name,
        comm_key: comm_key ?? existing.comm_key ?? null,
        use_udp: use_udp ?? existing.use_udp ?? 0,
      })
      return existing.id
    }
    return this.insertDevice({
      name,
      ip,
      port,
      comm_key: comm_key ?? null,
      use_udp: use_udp ?? 0,
    })
  }

  static getDeviceById(id: number): Device | undefined {
    return this.db.prepare('SELECT * FROM devices WHERE id=?').get(id) as
      | Device
      | undefined
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

  static getUnsynced(): Attendance[] & { id: number }[] {
    return this.db
      .prepare('SELECT * FROM attendance WHERE synced=0 ORDER BY timestamp ASC')
      .all() as any
  }

  static getStats() {
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

  static listAttendance(limit = 100) {
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
