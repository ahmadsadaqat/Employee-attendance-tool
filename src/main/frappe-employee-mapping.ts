export interface EmployeeMappingRecord {
  name?: unknown
  attendance_device_id?: unknown
}

export const EMPLOYEE_LOOKUP_CHUNK_SIZE = 100

export function normalizeBiometricId(value: unknown): string {
  return String(value ?? '').trim()
}

export function uniqueBiometricIds(values: unknown[]): string[] {
  return Array.from(
    new Set(values.map(normalizeBiometricId).filter((value) => value.length > 0)),
  )
}

export function chunkBiometricIds(
  values: string[],
  chunkSize = EMPLOYEE_LOOKUP_CHUNK_SIZE,
): string[][] {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('Employee lookup chunk size must be a positive integer.')
  }

  const chunks: string[][] = []
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize))
  }
  return chunks
}

export function parseEmployeeMappingResponse(
  status: number,
  body: string,
): Map<string, string> {
  if (status < 200 || status >= 300) {
    let detail = ''
    try {
      const parsed = JSON.parse(body)
      detail = String(parsed?.message || parsed?.exception || '').trim()
    } catch {}

    throw new Error(
      `ERPNext employee lookup failed with HTTP ${status}${detail ? `: ${detail}` : ''}`,
    )
  }

  let parsed: any
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new Error(
      'ERPNext returned an invalid response while loading employee mappings.',
    )
  }

  if (!Array.isArray(parsed?.data)) {
    throw new Error(
      'ERPNext returned an unexpected response while loading employee mappings.',
    )
  }

  const employeeMap = new Map<string, string>()
  for (const employee of parsed.data as EmployeeMappingRecord[]) {
    const biometricId = normalizeBiometricId(employee.attendance_device_id)
    const employeeId = normalizeBiometricId(employee.name)
    if (biometricId && employeeId) employeeMap.set(biometricId, employeeId)
  }

  return employeeMap
}
