export type LogSyncDisposition =
  | { status: 'synced' }
  | { status: 'duplicate' }
  | { status: 'error'; message: string }
  | { status: 'unknown'; message: string }

function hasId(value: unknown, logId: number): boolean {
  return (
    Array.isArray(value) &&
    value.some((candidate) => String(candidate) === String(logId))
  )
}

function normalizeMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {}
  }
  return null
}

function extractErrorMessage(payload: any, logId: number): string {
  const rawErrors: Array<string | null> = Array.isArray(payload?.errors)
    ? payload.errors.map((error: unknown) => normalizeMessage(error))
    : [normalizeMessage(payload?.errors)]
  const errors = rawErrors.filter(
    (message): message is string => Boolean(message),
  )
  const matchingError = errors.find((message) =>
    message?.toLowerCase().includes(`log ${logId}`),
  )

  return (
    matchingError ||
    errors.join(', ') ||
    normalizeMessage(payload?.error) ||
    normalizeMessage(payload?.message) ||
    'ERPNext rejected this check-in without an error description.'
  )
}

/**
 * Frappe wraps values returned by whitelisted methods in a `message` field.
 * Some attendance_bridge versions return the payload directly, so support
 * both forms while requiring an explicit result for the current local ID.
 */
export function classifySuccessfulFrappeResponse(
  responseBody: string,
  logId: number,
): LogSyncDisposition {
  let parsed: any
  try {
    parsed = JSON.parse(responseBody)
  } catch {
    return {
      status: 'unknown',
      message: 'ERPNext returned a non-JSON response; the check-in was not marked as synced.',
    }
  }

  let payload = parsed?.message ?? parsed
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      return {
        status: 'unknown',
        message: `ERPNext returned an unexpected response: ${payload}`,
      }
    }
  }

  if (hasId(payload?.error_ids, logId)) {
    return {
      status: 'error',
      message: extractErrorMessage(payload, logId),
    }
  }
  if (hasId(payload?.duplicate_ids, logId)) return { status: 'duplicate' }
  if (hasId(payload?.synced_ids, logId)) return { status: 'synced' }

  if (payload?.success === false || payload?.error || payload?.errors) {
    return {
      status: 'error',
      message: extractErrorMessage(payload, logId),
    }
  }

  return {
    status: 'unknown',
    message:
      'ERPNext did not explicitly confirm this check-in. It remains pending for retry.',
  }
}
