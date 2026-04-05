import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from './sqlite'

describe('Offline SQLite Database Integration', () => {
  beforeAll(async () => {
    // Pass ':memory:' to better-sqlite3 for temporary test db
    await Database.init(':memory:')
  })

  it('should insert and fetch a device correctly', () => {
    const deviceId = Database.ensureDevice(
      'Test Device',
      '192.168.1.100',
      4370,
      'Test Area',
      '0',
      0,
      'http://test-erp.com'
    )

    expect(deviceId).toBeGreaterThan(0)

    const devices = Database.listDevices('http://test-erp.com')
    expect(devices.length).toBe(1)
    expect(devices[0].name).toBe('Test Device')
    expect(devices[0].ip).toBe('192.168.1.100')
  })

  it('should strictly prevent duplicate exact punches', () => {
    const deviceId = Database.listDevices()[0].id!

    // First Punch - Should succeed
    const firstInsert = Database.insertAttendance({
      device_id: deviceId,
      employee_id: '1',
      timestamp: '2026-04-05T08:00:00Z',
      status: 'IN',
      synced: 0
    })
    expect(firstInsert.inserted).toBe(true)

    // Second Punch identical - Should fail insertion completely gracefully
    const duplicateInsert = Database.insertAttendance({
      device_id: deviceId,
      employee_id: '1',
      timestamp: '2026-04-05T08:00:00Z',
      status: 'IN',
      synced: 0
    })
    expect(duplicateInsert.inserted).toBe(false)
  })

  it('should fetch ONLY unsynced logs', () => {
    const deviceId = Database.listDevices()[0].id!

    // Insert a synced log
    Database.insertAttendance({
      device_id: deviceId,
      employee_id: '1',
      timestamp: '2026-04-05T17:00:00Z',
      status: 'OUT',
      synced: 1
    })

    // Insert an unsynced log
    const unsyncedLog = Database.insertAttendance({
      device_id: deviceId,
      employee_id: '99',
      timestamp: '2026-04-05T18:00:00Z',
      status: 'OUT',
      synced: 0
    })

    const unsynced = Database.getUnsynced(10)
    expect(unsynced.length).toBe(1)
    expect(unsynced[0].employee_id).toBe('99')
    expect(unsynced[0].synced).toBe(0)
    
    // Test transitioning to synced
    Database.markSynced([unsynced[0].id])
    
    const rechecked = Database.getUnsynced(10)
    expect(rechecked.length).toBe(0)
  })
})
