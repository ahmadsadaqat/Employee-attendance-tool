import { describe, expect, it } from 'vitest'
import { classifySuccessfulFrappeResponse } from './frappe-response'

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
