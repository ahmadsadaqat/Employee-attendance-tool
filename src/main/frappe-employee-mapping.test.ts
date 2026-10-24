import { describe, expect, it } from 'vitest'
import {
  chunkBiometricIds,
  normalizeBiometricId,
  parseEmployeeMappingResponse,
  uniqueBiometricIds,
} from './frappe-employee-mapping'

describe('ERPNext employee mapping', () => {
  it('normalizes whitespace and keeps each biometric ID once', () => {
    expect(uniqueBiometricIds([' 26 ', 26, '62', '', null])).toEqual([
      '26',
      '62',
    ])
    expect(normalizeBiometricId(' 001 ')).toBe('001')
  })

  it('splits targeted lookups into bounded request chunks', () => {
    expect(chunkBiometricIds(['1', '2', '3', '4', '5'], 2)).toEqual([
      ['1', '2'],
      ['3', '4'],
      ['5'],
    ])
  })

  it('parses employee mappings and trims ERP values', () => {
    const mapping = parseEmployeeMappingResponse(
      200,
      JSON.stringify({
        data: [
          { name: ' HR-EMP-00057 ', attendance_device_id: ' 26 ' },
          { name: 'HR-EMP-00066', attendance_device_id: 62 },
        ],
      }),
    )

    expect(mapping.get('26')).toBe('HR-EMP-00057')
    expect(mapping.get('62')).toBe('HR-EMP-00066')
  })

  it('reports lookup failures instead of treating every employee as missing', () => {
    expect(() =>
      parseEmployeeMappingResponse(
        403,
        JSON.stringify({ message: 'Not permitted' }),
      ),
    ).toThrow('ERPNext employee lookup failed with HTTP 403: Not permitted')
  })
})
