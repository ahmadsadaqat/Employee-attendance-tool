import { describe, expect, it } from 'vitest'
import { validateDeviceCoordinates } from './device-location'

describe('device coordinate validation', () => {
  it('accepts the configured ERP shift-location coordinates', () => {
    expect(validateDeviceCoordinates('0.001', '0.001')).toEqual({
      ok: true,
      latitude: 0.001,
      longitude: 0.001,
    })
  })

  it('accepts zero as a real coordinate', () => {
    expect(validateDeviceCoordinates(0, 0)).toEqual({
      ok: true,
      latitude: 0,
      longitude: 0,
    })
  })

  it('rejects missing coordinates instead of substituting a hidden fallback', () => {
    const result = validateDeviceCoordinates(null, undefined)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('coordinates are missing')
  })

  it('rejects coordinates outside valid geographic ranges', () => {
    expect(validateDeviceCoordinates(91, 0).ok).toBe(false)
    expect(validateDeviceCoordinates(0, 181).ok).toBe(false)
  })
})
