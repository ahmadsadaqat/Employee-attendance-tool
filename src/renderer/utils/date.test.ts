import { describe, expect, it } from 'vitest'
import { isWithinLocalDateRange, toLocalDateOnly } from './date'

describe('local calendar date filtering', () => {
  it('formats dates using the local calendar rather than UTC date-only parsing', () => {
    const lateOnTheTwentyFirst = new Date(2026, 9, 21, 23, 30, 0)
    expect(toLocalDateOnly(lateOnTheTwentyFirst)).toBe('2026-10-21')
  })

  it('does not include a previous local-calendar day', () => {
    const previousDay = new Date(2026, 9, 21, 23, 59, 59).toISOString()
    const selectedDay = new Date(2026, 9, 22, 0, 0, 0).toISOString()

    expect(
      isWithinLocalDateRange(previousDay, '2026-10-22', '2026-10-22'),
    ).toBe(false)
    expect(
      isWithinLocalDateRange(selectedDay, '2026-10-22', '2026-10-22'),
    ).toBe(true)
  })

  it('includes the full selected local-calendar day', () => {
    const endOfDay = new Date(2026, 9, 22, 23, 59, 59).toISOString()
    expect(
      isWithinLocalDateRange(endOfDay, '2026-10-22', '2026-10-22'),
    ).toBe(true)
  })
})
