import React, { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import {
  FrappeProvider,
  useFrappeAuth,
  useFrappeGetDocList,
  useFrappeGetDocCount,
} from 'frappe-react-sdk'

type Stats = { total: number; unsynced: number; today: number }

function App({ onUrlChange }: { onUrlChange: (url: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [refreshingStats, setRefreshingStats] = useState(false)
  const [view, setView] = useState<
    'dashboard' | 'devices' | 'login' | 'employees'
  >('login')
  const [online, setOnline] = useState<boolean>(navigator.onLine)
  const { currentUser, logout } = useFrappeAuth()

  // Check network status using is-online package
  const checkNetworkStatus = useCallback(async () => {
    try {
      const isOnlineStatus = await window.api?.getNetworkStatus?.()
      setOnline(isOnlineStatus ?? false)
    } catch (error) {
      console.error('Failed to check network status:', error)
      setOnline(false)
    }
  }, [])

  // Set initial view based on authentication status
  useEffect(() => {
    console.log('Auth state changed, currentUser:', currentUser)
    if (currentUser) {
      console.log('User authenticated, switching to dashboard')
      setView('dashboard')
    } else {
      console.log('User not authenticated, switching to login')
      setView('login')
    }
  }, [currentUser])

  // Debug authentication state
  useEffect(() => {
    console.log('App component mounted/updated, currentUser:', currentUser)
  }, [])

  useEffect(() => {
    ;(window as any).setView = setView
    ;(window as any).setStats = setStats

    const loadStats = async () => {
      try {
        const statsData = await window.api?.getStats?.()
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    }

    const loadSavedUrl = async () => {
      try {
        const creds = await window.api?.getCredentials?.()
        if (creds?.baseUrl) {
          onUrlChange(creds.baseUrl)
        }
      } catch (error) {
        console.error('Failed to load saved URL:', error)
      }
    }

    loadStats()
    loadSavedUrl()
    checkNetworkStatus()

    // Check network status periodically
    const networkInterval = setInterval(checkNetworkStatus, 10000) // Check every 10 seconds

    // Online/offline detection as fallback
    const onOnline = () => checkNetworkStatus()
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      clearInterval(networkInterval)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [checkNetworkStatus])

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <header className='px-4 py-3 border-b bg-white flex items-center gap-3'>
        <h1 className='font-semibold text-lg'>Nexo Employees</h1>
        <span
          className={online ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}
        >
          {online ? 'Online' : 'Offline'}
        </span>
        <nav className='ml-auto flex gap-2 text-sm'>
          {currentUser && (
            <>
              <button
                className='px-3 py-1 rounded hover:bg-slate-100'
                onClick={() => setView('dashboard')}
              >
                Dashboard
              </button>
              <button
                className='px-3 py-1 rounded hover:bg-slate-100'
                onClick={() => setView('devices')}
              >
                Devices
              </button>
              <button
                className='px-3 py-1 rounded hover:bg-slate-100'
                onClick={() => setView('employees')}
              >
                Employees
              </button>
              <button
                className='px-3 py-1 rounded hover:bg-slate-100 text-red-600'
                onClick={() => {
                  logout()
                  setView('login')
                }}
              >
                Logout ({currentUser})
              </button>
            </>
          )}
        </nav>
      </header>
      <main className='p-4'>
        {currentUser ? (
          <>
            {view === 'dashboard' && <Dashboard stats={stats} />}
            {view === 'devices' && <Devices />}
            {view === 'employees' && <Employees />}
          </>
        ) : (
          <Login onUrlChange={onUrlChange} />
        )}
      </main>
    </div>
  )
}

function Dashboard({ stats }: { stats: Stats | null }) {
  const [syncResult, setSyncResult] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)
  const [recentLogs, setRecentLogs] = useState<
    {
      id: number
      employee_id: string
      timestamp: string
      status: 'IN' | 'OUT'
      synced: 0 | 1
    }[]
  >([])
  const { currentUser } = useFrappeAuth()

  // Always call hooks; disable fetch using SWR null key until logged-in
  const {
    data: employeeCount,
    error: employeeCountError,
    mutate: refetchEmployeeCount,
  } = useFrappeGetDocCount(
    'Employee',
    undefined,
    false,
    false,
    currentUser ? undefined : (null as any)
  )
  const {
    data: shiftCount,
    error: shiftCountError,
    mutate: refetchShiftCount,
  } = useFrappeGetDocCount(
    'Shift Type',
    undefined,
    false,
    false,
    currentUser ? undefined : (null as any)
  )

  const refreshData = async () => {
    setRefreshing(true)
    try {
      // Refresh stats from local database
      const statsData = await window.api?.getStats?.()
      if (statsData) {
        // Update stats in parent component
        ;(window as any).setStats?.(statsData)
      }

      // Refresh Frappe data
      await Promise.all([refetchEmployeeCount(), refetchShiftCount()])

      // Load recent logs
      const logs = await window.api?.listAttendance?.(20)
      setRecentLogs((logs as any) || [])
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const erpStatus = currentUser ? 'connected' : 'disconnected'
  const employees = employeeCount ?? 0
  const shifts = shiftCount ?? 0

  const sync = async () => {
    const res = await window.api?.runSync?.()
    setSyncResult(
      `Synced ${res?.synced ?? 0} records. Errors: ${res?.errors?.length ?? 0}`
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Dashboard</h2>
        <button className='btn' onClick={refreshData} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
      <div className='grid grid-cols-5 gap-4'>
        <Card title='Today' value={stats?.today ?? 0} />
        <Card title='Unsynced' value={stats?.unsynced ?? 0} />
        <Card title='Total' value={stats?.total ?? 0} />
        <Card title='Employees' value={employees} />
        <Card title='Shifts' value={shifts} />
      </div>
      <div className='bg-white p-4 rounded border'>
        <div className='flex items-center gap-4'>
          <div>
            ERPNext:{' '}
            <span
              className={
                erpStatus === 'connected' ? 'text-green-600' : 'text-red-600'
              }
            >
              {erpStatus}
            </span>
          </div>
          {currentUser && (
            <span className='text-sm text-slate-600'>
              Logged in as: {currentUser}
            </span>
          )}
          <button className='btn' onClick={sync}>
            Sync Now
          </button>
        </div>
        {syncResult && (
          <div className='text-sm text-slate-600 mt-2'>{syncResult}</div>
        )}
        {(employeeCountError || shiftCountError) && (
          <div className='text-sm text-red-600 mt-2'>
            Error loading counts. Please check your connection.
          </div>
        )}
      </div>

      <div className='bg-white p-4 rounded border'>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold'>Recent Attendance</h3>
          <button className='btn' onClick={refreshData} disabled={refreshing}>
            {refreshing ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className='mt-3 overflow-x-auto'>
          {recentLogs && recentLogs.length > 0 ? (
            <table className='w-full text-sm'>
              <thead className='bg-slate-50'>
                <tr>
                  <th className='text-left px-3 py-2'>Employee</th>
                  <th className='text-left px-3 py-2'>Timestamp</th>
                  <th className='text-left px-3 py-2'>Status</th>
                  <th className='text-left px-3 py-2'>Synced</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((row) => (
                  <tr key={row.id} className='border-t'>
                    <td className='px-3 py-2'>{row.employee_id}</td>
                    <td className='px-3 py-2'>
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className='px-3 py-2'>{row.status}</td>
                    <td className='px-3 py-2'>{row.synced ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className='text-slate-500 text-sm'>No attendance found</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className='bg-white p-4 rounded border'>
      <div className='text-slate-500 text-sm'>{title}</div>
      <div className='text-3xl font-semibold'>{value}</div>
    </div>
  )
}

function Devices() {
  const [name, setName] = useState('Main Entrance')
  const [ip, setIp] = useState('192.168.1.201')
  const [port, setPort] = useState(4370)
  const [result, setResult] = useState<string>('')
  const [commKey, setCommKey] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [devices, setDevices] = useState<
    { id: number; name: string; ip: string; port: number }[]
  >([])
  const [useUdp, setUseUdp] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [deviceLogs, setDeviceLogs] = useState<
    {
      id: number
      employee_id: string
      timestamp: string
      status: 'IN' | 'OUT'
      synced: 0 | 1
    }[]
  >([])

  const loadDevices = useCallback(async () => {
    try {
      const list = (await window.api?.listDevices?.()) as any
      setDevices(list || [])
      if ((list || []).length && selectedDeviceId == null) {
        setSelectedDeviceId(list[0].id)
        setName(list[0].name)
        setIp(list[0].ip)
        setPort(list[0].port)
      }
    } catch (e) {
      console.error('Failed to load devices', e)
    }
  }, [selectedDeviceId])

  const loadDeviceLogs = useCallback(async (deviceId: number | null) => {
    if (!deviceId) {
      setDeviceLogs([])
      return
    }
    try {
      const logs = (await window.api?.listAttendanceByDevice?.(
        deviceId,
        20
      )) as any
      setDeviceLogs(logs || [])
    } catch (e) {
      console.error('Failed to load device logs', e)
    }
  }, [])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  useEffect(() => {
    loadDeviceLogs(selectedDeviceId)
  }, [selectedDeviceId, loadDeviceLogs])
  const test = async () => {
    const res = await window.api?.testDevice?.(ip, Number(port))
    setResult(res?.ok ? 'Connected' : `Failed: ${res?.error}`)
  }
  const save = async () => {
    setSaving(true)
    setResult('')
    try {
      const out = (await window.api?.addDevice?.(name, ip, Number(port), {
        commKey: commKey || undefined,
        useUdp,
      })) as any
      if (out?.id) setSelectedDeviceId(out.id)
      await loadDevices()
      setResult('Device saved')
    } catch (e: any) {
      setResult(`Failed: ${e?.message || 'Could not save device'}`)
    } finally {
      setSaving(false)
    }
  }
  const fetchLogs = async () => {
    setFetching(true)
    setResult('')
    try {
      const res = (await window.api?.fetchLogs?.(
        ip,
        Number(port),
        name,
        commKey || undefined,
        useUdp
      )) as any
      if (res?.error) {
        throw new Error(res.error)
      }
      const imported = res?.imported ?? 0
      // Update stats after import
      const statsData = await window.api?.getStats?.()
      ;(window as any).setStats?.(statsData)
      // Reload device logs
      await loadDeviceLogs(selectedDeviceId)
      // Auto sync to ERPNext
      const syncRes = await window.api?.runSync?.()
      setResult(
        `Imported ${imported} logs. Synced ${syncRes?.synced ?? 0}. Errors: ${
          syncRes?.errors?.length ?? 0
        }`
      )
    } catch (e: any) {
      setResult(`Failed: ${e?.message || 'Unknown error'}`)
    } finally {
      setFetching(false)
    }
  }
  return (
    <div className='grid md:grid-cols-2 gap-4'>
      <div className='bg-white p-4 rounded border space-y-3'>
        <div className='text-lg font-semibold'>Manage Devices</div>
        <div className='grid grid-cols-3 gap-2 items-center'>
          <label>Name</label>
          <input
            className='col-span-2 input'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label>IP</label>
          <input
            className='col-span-2 input'
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
          <label>Port</label>
          <input
            className='col-span-2 input'
            type='number'
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
          />
          <label>Comm Key</label>
          <input
            className='col-span-2 input'
            placeholder='e.g. 12345'
            value={commKey}
            onChange={(e) => setCommKey(e.target.value)}
          />
          <label>Use UDP</label>
          <input
            className='col-span-2'
            type='checkbox'
            checked={useUdp}
            onChange={(e) => setUseUdp(e.target.checked)}
          />
        </div>
        <div className='flex gap-2'>
          <button className='btn' onClick={test}>
            Test Connection
          </button>
          <button className='btn' onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Device'}
          </button>
          <button className='btn' onClick={fetchLogs} disabled={fetching}>
            {fetching ? 'Fetching Logs...' : 'Fetch Logs'}
          </button>
        </div>
        {result && <div className='text-sm text-slate-600'>{result}</div>}
        <div className='text-sm text-slate-700 mt-2'>Saved Devices</div>
        <div className='border rounded divide-y'>
          {devices.length ? (
            devices.map((d) => (
              <div
                key={d.id}
                className={`p-2 cursor-pointer ${
                  selectedDeviceId === d.id ? 'bg-slate-100' : ''
                }`}
                onClick={() => {
                  setSelectedDeviceId(d.id)
                  setName(d.name)
                  setIp(d.ip)
                  setPort(d.port)
                  setUseUdp(Boolean((d as any).use_udp))
                  setCommKey(((d as any).comm_key as string) || '')
                }}
              >
                <div className='font-medium'>{d.name}</div>
                <div className='text-xs text-slate-500'>
                  {d.ip}:{d.port}
                </div>
                <div className='text-xs text-slate-500'>
                  UDP: {Boolean((d as any).use_udp) ? 'Yes' : 'No'}
                </div>
              </div>
            ))
          ) : (
            <div className='p-2 text-sm text-slate-500'>No devices saved</div>
          )}
        </div>
        {selectedDeviceId && (
          <div className='pt-2'>
            <button
              className='btn text-red-600'
              onClick={async () => {
                await window.api?.removeDevice?.(selectedDeviceId)
                setSelectedDeviceId(null)
                setResult('Device deleted')
                await loadDevices()
              }}
            >
              Delete Device
            </button>
          </div>
        )}
      </div>
      <div className='bg-white p-4 rounded border'>
        <div className='flex items-center justify-between'>
          <div className='text-lg font-semibold'>Recent Logs</div>
          <button
            className='btn'
            onClick={() => loadDeviceLogs(selectedDeviceId)}
            disabled={!selectedDeviceId}
          >
            Refresh
          </button>
        </div>
        <div className='mt-3 overflow-x-auto'>
          {deviceLogs && deviceLogs.length ? (
            <table className='w-full text-sm'>
              <thead className='bg-slate-50'>
                <tr>
                  <th className='text-left px-3 py-2'>Employee</th>
                  <th className='text-left px-3 py-2'>Timestamp</th>
                  <th className='text-left px-3 py-2'>Status</th>
                  <th className='text-left px-3 py-2'>Synced</th>
                </tr>
              </thead>
              <tbody>
                {deviceLogs.map((row) => (
                  <tr key={row.id} className='border-t'>
                    <td className='px-3 py-2'>{row.employee_id}</td>
                    <td className='px-3 py-2'>
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className='px-3 py-2'>{row.status}</td>
                    <td className='px-3 py-2'>{row.synced ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className='text-slate-500 text-sm'>No logs yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

type Employee = {
  name: string
  employee_name: string
  attendance_device_id?: string
  branch?: string
  default_shift?: string
}

function Employees() {
  const { currentUser } = useFrappeAuth()

  // Fetch employees using frappe-react-sdk
  const {
    data: employees,
    error,
    isValidating: loading,
    mutate: refetchEmployees,
  } = useFrappeGetDocList<Employee>(
    'Employee',
    {
      fields: [
        'name',
        'employee_name',
        'attendance_device_id',
        'branch',
        'default_shift',
      ],
      limit: 100,
    },
    currentUser ? undefined : (null as any)
  )

  const fetchEmployees = () => {
    refetchEmployees()
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Employees</h2>
        <button className='btn' onClick={fetchEmployees} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {!currentUser && (
        <div className='bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700'>
          Please login first to view employees
        </div>
      )}

      {error && (
        <div className='bg-red-50 border border-red-200 rounded p-3 text-red-700'>
          {error.message || 'Failed to fetch employees'}
        </div>
      )}

      {employees && employees.length > 0 ? (
        <div className='bg-white rounded border overflow-hidden'>
          <table className='w-full'>
            <thead className='bg-slate-50'>
              <tr>
                <th className='px-4 py-3 text-left text-sm font-medium text-slate-700'>
                  ID
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-slate-700'>
                  Name
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-slate-700'>
                  Device ID
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-slate-700'>
                  Branch
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-slate-700'>
                  Default Shift
                </th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((emp) => (
                <tr key={emp.name} className='border-t'>
                  <td className='px-4 py-3 text-sm'>{emp.name}</td>
                  <td className='px-4 py-3 text-sm font-medium'>
                    {emp.employee_name}
                  </td>
                  <td className='px-4 py-3 text-sm'>
                    {emp.attendance_device_id || '-'}
                  </td>
                  <td className='px-4 py-3 text-sm'>{emp.branch || '-'}</td>
                  <td className='px-4 py-3 text-sm'>
                    {emp.default_shift || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading &&
        !error && (
          <div className='bg-white p-8 rounded border text-center text-slate-500'>
            No employees found
          </div>
        )
      )}
    </div>
  )
}

function Login({ onUrlChange }: { onUrlChange: (url: string) => void }) {
  const [username, setUsername] = useState('Administrator')
  const [password, setPassword] = useState('')
  const [frappeUrl, setFrappeUrl] = useState('https://portal.nexo4erp.com')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, currentUser } = useFrappeAuth()

  // Debug currentUser in Login component
  useEffect(() => {
    console.log('Login component - currentUser changed:', currentUser)
  }, [currentUser])

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const doLogin = async () => {
    if (!validateUrl(frappeUrl)) {
      setResult('Please enter a valid URL (http:// or https://)')
      return
    }

    setLoading(true)
    setResult('')
    try {
      console.log('Attempting login with:', username, 'to:', frappeUrl)

      // Update the provider URL before attempting login
      onUrlChange(frappeUrl)

      // Use correct credential keys per frappe-react-sdk
      const result = await login({ username, password })
      console.log('Login result:', result)
      setResult('Login successful')

      // Persist credentials for main process sync
      await window.api?.setCredentials?.(frappeUrl, {
        mode: 'password',
        username,
        password,
      })

      console.log('Credentials saved, login successful')
    } catch (e: any) {
      console.error('Login error:', e)
      let errorMessage = 'Unknown error'

      if (e?.message) {
        if (e.message.includes('401') || e.message.includes('Unauthorized')) {
          errorMessage = 'Invalid username or password'
        } else if (
          e.message.includes('403') ||
          e.message.includes('Forbidden')
        ) {
          errorMessage = 'Access denied. Check your credentials.'
        } else if (
          e.message.includes('404') ||
          e.message.includes('Not Found')
        ) {
          errorMessage = 'Server not found. Check the URL.'
        } else if (
          e.message.includes('500') ||
          e.message.includes('Internal Server Error')
        ) {
          errorMessage = 'Server error. Please try again later.'
        } else if (
          e.message.includes('NetworkError') ||
          e.message.includes('fetch')
        ) {
          errorMessage = 'Network error. Check your connection and URL.'
        } else {
          errorMessage = e.message
        }
      }

      setResult(`Login failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='max-w-lg bg-white p-4 rounded border space-y-3'>
      <div className='text-lg font-semibold'>ERPNext Login</div>

      <div className='space-y-3'>
        <div className='grid grid-cols-3 gap-2 items-center'>
          <label>Server URL</label>
          <input
            className='col-span-2 input'
            value={frappeUrl}
            onChange={(e) => setFrappeUrl(e.target.value)}
            placeholder='https://your-frappe-instance.com'
          />
        </div>

        <div className='grid grid-cols-3 gap-2 items-center'>
          <label>Username</label>
          <input
            className='col-span-2 input'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className='grid grid-cols-3 gap-2 items-center'>
          <label>Password</label>
          <input
            className='col-span-2 input'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      <button className='btn w-full' onClick={doLogin} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      {result && (
        <div
          className={`text-sm p-2 rounded ${
            result.includes('successful')
              ? 'text-green-700 bg-green-50 border border-green-200'
              : result.includes('failed') || result.includes('error')
              ? 'text-red-700 bg-red-50 border border-red-200'
              : 'text-slate-600 bg-slate-50 border border-slate-200'
          }`}
        >
          {result}
        </div>
      )}
    </div>
  )
}

// Ensure we only create root once
let root: any = null
if (!root) {
  root = createRoot(document.getElementById('root')!)
}

// Create a wrapper component that can handle URL changes
function AppWrapper() {
  const [frappeUrl, setFrappeUrl] = useState<string>(
    'https://portal.nexo4erp.com'
  )
  const [isUrlLoaded, setIsUrlLoaded] = useState(false)

  useEffect(() => {
    const loadSavedUrl = async () => {
      try {
        const creds = await window.api?.getCredentials?.()
        if (creds?.baseUrl) {
          setFrappeUrl(creds.baseUrl)
        }
      } catch (error) {
        console.error('Failed to load saved URL:', error)
      } finally {
        setIsUrlLoaded(true)
      }
    }
    loadSavedUrl()
  }, [])

  // Simple URL change handler without forced re-mount
  const handleUrlChange = useCallback(
    (newUrl: string) => {
      console.log('URL changing from', frappeUrl, 'to', newUrl)
      if (newUrl !== frappeUrl) {
        setFrappeUrl(newUrl)
      }
    },
    [frappeUrl]
  )

  if (!isUrlLoaded) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-slate-600'>Loading...</div>
      </div>
    )
  }

  const providerUrl = import.meta.env.DEV ? '/frappe' : frappeUrl

  return (
    <FrappeProvider url={providerUrl} enableSocket={false}>
      <App onUrlChange={handleUrlChange} />
    </FrappeProvider>
  )
}

root.render(<AppWrapper />)

declare global {
  interface Window {
    api?: {
      getStats: () => Promise<Stats>
      testDevice: (
        ip: string,
        port: number
      ) => Promise<{ ok: boolean; error?: string }>
      fetchLogs: (
        ip: string,
        port?: number,
        name?: string
      ) => Promise<{ imported: number }>
      listAttendance: (limit?: number) => Promise<
        {
          id: number
          employee_id: string
          timestamp: string
          status: 'IN' | 'OUT'
          synced: 0 | 1
        }[]
      >
      runSync: () => Promise<{ synced: number; errors: string[] }>
      setCredentials: (baseUrl: string, auth: any) => Promise<void>
      getCredentials: () => Promise<{ baseUrl: string; auth: any } | null>
      getNetworkStatus: () => Promise<boolean>
    }
  }
}
