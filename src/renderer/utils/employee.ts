export interface EmployeeMappingRecord {
  name?: string
  employee_name?: string
  attendance_device_id?: string | number | null
  department?: string
  image?: string
}

export function findEmployeeForLog(
  employees: EmployeeMappingRecord[] | undefined,
  identifier: string,
  identifierIsBiometric: boolean,
): EmployeeMappingRecord | undefined {
  return employees?.find((employee) => {
    if (identifierIsBiometric) {
      return (
        String(employee.attendance_device_id ?? '') === String(identifier)
      )
    }

    return (
      String(employee.name ?? '') === String(identifier) ||
      String(employee.employee_name ?? '') === String(identifier)
    )
  })
}
