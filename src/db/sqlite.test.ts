import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from './sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

describe('Offline SQLite Database Integration', () => {
  let testDataDir: string

  beforeAll(async () => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexo-db-test-'))
    await Database.init(testDataDir)
  })

  afterAll(() => {
    fs.rmSync(testDataDir, { recursive: true, force: true })
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
    expect(unsynced.length).toBe(2)
    const emp99 = unsynced.find(u => u.employee_id === '99')
    expect(emp99).toBeDefined()
    expect(emp99!.synced).toBe(0)
    
    // Test transitioning to synced
    Database.markSynced(unsynced.map(u => u.id as number))
    
    const rechecked = Database.getUnsynced(10)
    expect(rechecked.length).toBe(0)
  })

  it('deletes only selected attendance logs', () => {
    const deviceId = Database.listDevices()[0].id!
    const first = Database.insertAttendance({
      device_id: deviceId,
      employee_id: 'delete-me',
      timestamp: '2026-10-22T08:00:00Z',
      status: 'IN',
      synced: 0,
    })
    const second = Database.insertAttendance({
      device_id: deviceId,
      employee_id: 'keep-me',
      timestamp: '2026-10-22T09:00:00Z',
      status: 'IN',
      synced: 0,
    })

    expect(Database.deleteAttendance([first.id], 'http://other-erp.com')).toBe(
      0,
    )
    expect(
      Database.listAttendance(100).some((log) => log.id === first.id),
    ).toBe(true)

    expect(
      Database.deleteAttendance([first.id], 'http://test-erp.com'),
    ).toBe(1)

    const remaining = Database.listAttendance(100)
    expect(remaining.some((log) => log.id === first.id)).toBe(false)
    expect(remaining.some((log) => log.id === second.id)).toBe(true)
  })

  it('stores and clears the ERPNext error for a log', () => {
    const deviceId = Database.listDevices()[0].id!
    const inserted = Database.insertAttendance({
      device_id: deviceId,
      employee_id: 'sync-error-test',
      timestamp: '2026-10-23T09:01:09Z',
      status: 'IN',
      synced: 0,
    })

    Database.markError([inserted.id], {
      [inserted.id]: 'Geofence validation failed',
    })
    const failed = Database.listAttendance(100).find(
      (log) => log.id === inserted.id,
    )
    expect(failed?.synced).toBe(3)
    expect(failed?.sync_error).toBe('Geofence validation failed')

    Database.resetSyncStatus([inserted.id])
    const reset = Database.listAttendance(100).find(
      (log) => log.id === inserted.id,
    )
    expect(reset?.synced).toBe(0)
    expect(reset?.sync_error).toBeNull()
  })
})
