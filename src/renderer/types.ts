export type AccessType = 'CHECK_IN' | 'CHECK_OUT'

export interface CheckInRecord {
  id: string
  employeeId: string
  employeeName: string
  department: string
  timestamp: string // ISO string
  device: string
  location: string
  type: AccessType
  avatar: string
  syncStatus: 0 | 1 | 2 | 3 // 0=pending, 1=synced, 2=duplicate, 3=error
}

export interface Employee {
  id: string
  employeeId: string
  name: string
  role: string
  department: string
  shiftName: string
  shiftStart: string
  shiftEnd: string
  avatar: string
  status: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  avatar: string
  lastLogin: string
}

export interface DailyStats {
  totalEmployees: number
  exceptions: number
  uptime: number
}

export interface ChartDataPoint {
  time: string
  count: number
}

export interface Device {
  id: string
  name: string
  location: string
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
  lastPing: string
  type: 'BIOMETRIC' | 'RFID' | 'GATE'
  ipAddress: string
  port: string
}

export interface SystemAlert {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS'
  message: string
  timestamp: string
  source: string
}

export interface AppSettings {
  erpEndpoint: string
  syncIntervalMinutes: number
  autoSync: boolean
  emailNotifications: boolean
  alertThreshold: 'LOW' | 'MEDIUM' | 'HIGH'
  darkMode: boolean
  retentionDays: number
  syncIntervalSeconds?: number // Seconds, default 60 (Frappe sync interval)
  deviceFetchIntervalSeconds?: number // Seconds, default 60 (30s - 300s)
  doublePunchThresholdSeconds?: number // Seconds, default 5
}
