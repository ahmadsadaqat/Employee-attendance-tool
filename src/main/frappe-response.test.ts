import { describe, expect, it } from 'vitest'
import {
  classifyEmployeeCheckinVerification,
  classifySuccessfulFrappeResponse,
} from './frappe-response'

describe('Frappe attendance response classification', () => {
  it('unwraps standard whitelisted-method responses', () => {
    expect(
      classifySuccessfulFrappeResponse(
        JSON.stringify({ message: { synced_ids: [42] } }),
        42,
      ),
    ).toEqual({ status: 'synced' })
  })

  it('preserves a wrapped backend error message', () => {
    expect(
      classifySuccessfulFrappeResponse(
        JSON.stringify({
          message: {
            error_ids: ['42'],
            errors: ['log 42: Geofence validation failed'],
          },
        }),
        42,
      ),
    ).toEqual({
      status: 'error',
      message: 'log 42: Geofence validation failed',
    })
  })

  it('does not treat an ambiguous HTTP 200 response as synced', () => {
    expect(
      classifySuccessfulFrappeResponse(
        JSON.stringify({ message: { success: true } }),
        42,
      ).status,
    ).toBe('unknown')
  })

  it('does not treat invalid JSON as synced', () => {
    expect(classifySuccessfulFrappeResponse('<html>OK</html>', 42).status).toBe(
      'unknown',
    )
  })
})

describe('ERP Employee Checkin read-back verification', () => {
  it('accepts an Employee Checkin returned by the resource API', () => {
    expect(
      classifyEmployeeCheckinVerification(
        JSON.stringify({ data: [{ name: 'EMP-CKIN-2026-00001' }] }),
      ),
    ).toEqual({ found: true, name: 'EMP-CKIN-2026-00001' })
  })

  it('rejects an empty result even when the response itself is valid', () => {
    expect(
      classifyEmployeeCheckinVerification(JSON.stringify({ data: [] })).found,
    ).toBe(false)
  })

  it('rejects malformed verification responses', () => {
    expect(classifyEmployeeCheckinVerification('<html>OK</html>').found).toBe(
      false,
    )
  })
})
