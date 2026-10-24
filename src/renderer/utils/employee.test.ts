import { describe, expect, it } from 'vitest'
import { findEmployeeForLog } from './employee'

const employees = [
  {
    name: 'HR-EMP-0001',
    employee_name: 'Ayesha Khan',
    attendance_device_id: '73',
  },
  {
    name: 'HR-EMP-0002',
    employee_name: 'Bilal Ahmed',
    attendance_device_id: 74,
  },
]

describe('employee mapping', () => {
  it('maps a local biometric ID to the ERPNext Employee record', () => {
    expect(findEmployeeForLog(employees, '73', true)?.employee_name).toBe(
      'Ayesha Khan',
    )
    expect(findEmployeeForLog(employees, '74', true)?.name).toBe(
      'HR-EMP-0002',
    )
  })

  it('maps an ERPNext check-in by Employee document ID', () => {
    expect(
      findEmployeeForLog(employees, 'HR-EMP-0001', false)?.employee_name,
    ).toBe('Ayesha Khan')
  })

  it('does not mistake a biometric ID for an Employee document ID', () => {
    expect(findEmployeeForLog(employees, '73', false)).toBeUndefined()
  })
})
