export type DeviceCoordinateValidation =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; message: string }

export function validateDeviceCoordinates(
  latitude: unknown,
  longitude: unknown,
): DeviceCoordinateValidation {
  if (
    latitude === null ||
    latitude === undefined ||
    latitude === '' ||
    longitude === null ||
    longitude === undefined ||
    longitude === ''
  ) {
    return {
      ok: false,
      message:
        'Device coordinates are missing. Open Devices, choose Edit Location, and enter the latitude and longitude from the ERP Shift Location.',
    }
  }

  const parsedLatitude = Number(latitude)
  const parsedLongitude = Number(longitude)
  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return {
      ok: false,
      message: 'Device latitude and longitude must be valid numbers.',
    }
  }
  if (parsedLatitude < -90 || parsedLatitude > 90) {
    return {
      ok: false,
      message: 'Device latitude must be between -90 and 90.',
    }
  }
  if (parsedLongitude < -180 || parsedLongitude > 180) {
    return {
      ok: false,
      message: 'Device longitude must be between -180 and 180.',
    }
  }

  return {
    ok: true,
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  }
}
