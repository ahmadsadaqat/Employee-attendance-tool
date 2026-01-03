import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

export const initSupabase = (url: string, key: string) => {
  if (!url || !key) {
      console.warn('Supabase: Init skipped, missing URL or Key')
      return
  }
  try {
    supabase = createClient(url, key)
    console.log('Supabase: Initialized client for', url)
  } catch (e) {
    console.error('Supabase: Failed to initialize', e)
    supabase = null
  }
}

export const getClient = () => supabase

export const testConnection = async () => {
    if (!supabase) return false
    try {
        const { data, error } = await supabase.from('devices').select('count', { count: 'exact', head: true })
        if (error) throw error
        return true
    } catch(e) {
        console.error("Supabase Test Failed:", e)
        return false
    }
}

export const syncDevices = async (devices: any[]) => {
  if (!supabase) return
  if (!devices.length) return

  // Map local device shape to Supabase schema if needed
  // Local: { id, name, ip, port, instance_url, ... }
  // Remote: { id, name, ip, port, location, status, ... }
  // We'll trust the caller to pass compatible objects or mapped ones
  console.log(`Supabase: Syncing ${devices.length} devices...`, devices.map(d => ({id: d.id, name: d.name})))

  // Sanitize payload to match Supabase schema exactly
  const cleanDevices = devices.map(d => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      port: d.port,
      // created_at: undefined // Let Supabase handle defaults if new
      // comm_key, use_udp: Not sending unless schema has them
  }))

  const { data, error } = await supabase
    .from('devices')
    .upsert(cleanDevices, { onConflict: 'id' })
    .select()

  if (error) {
      console.error('Supabase: Device sync error FULL DETAILS:', JSON.stringify(error, null, 2))
      throw error
  } else {
      console.log('Supabase: Device sync success. Data:', data)
  }
}

export const syncLogs = async (logs: any[]) => {
  if (!supabase) return 0
  if (!logs.length) return 0

  // logs expected: { id, device_id, employee_id, timestamp, status, synced }
  const { error } = await supabase
    .from('attendance_logs')
    .upsert(logs, { onConflict: 'id', ignoreDuplicates: true })

  if (error) {
      console.error('Supabase: Log sync error', error)
      throw error
  }
  return logs.map(l => l.id)
}
