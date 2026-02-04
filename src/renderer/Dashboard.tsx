import React, { useState, useEffect } from 'react'
import {
  useFrappeDocList,
  useDeviceLogs,
  useLocalAttendance,
} from './hooks/useData'
import {
  RefreshCw,
  Menu,
  Search,
  Bell,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Activity,
  Laptop,
  Fingerprint,
  CreditCard,
  Download,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { Sidebar } from './components/Sidebar'
import { StatCard } from './components/StatCard'
import { RecentTable } from './components/RecentTable'
import { DeviceManager } from './components/DeviceManager'
import { EmployeeList } from './components/EmployeeList'
import { AccessLogList } from './components/AccessLogList'
import { SettingsView } from './components/SettingsView'
import { AlertsModal } from './components/AlertsModal'
import { CheckInToast } from './components/CheckInToast'
import { ImportFilterModal } from './components/ImportFilterModal'
import { UserProfile } from './components/UserProfile'
import {
  AccessType,
  CheckInRecord,
  DailyStats,
  Device,
  Employee,
  AppSettings,
  SystemAlert,
  User,
} from './types'

// Mock Data Generators
const generateSingleCheckIn = (synced: boolean = false): CheckInRecord => {
  const names = [
    'Alice Johnson',
    'Bob Smith',
    'Charlie Brown',
    'Diana Prince',
    'Evan Wright',
    'Fiona Green',
    'George Hill',
  ]
  const depts = ['Engineering', 'Sales', 'HR', 'Marketing', 'Operations']
  const devicesAndLocs = [
    { device: 'Main Entrance Bio-1', location: 'Main Lobby' },
    { device: 'Lobby Turnstile', location: 'Lobby North' },
    { device: 'Warehouse Gate A', location: 'Loading Dock' },
    { device: 'Server Room Bio', location: 'Server Room' },
  ]

  const i = Math.floor(Math.random() * names.length)
  const devInfo =
    devicesAndLocs[Math.floor(Math.random() * devicesAndLocs.length)]

  return {
    id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    employeeId: `EMP-${1000 + i}`,
    employeeName: names[i],
    department: depts[i % depts.length],
    avatar: `https://picsum.photos/seed/${i + 205}/100/100`,
    timestamp: new Date().toISOString(),
    device: devInfo.device,
    location: devInfo.location,
    type: Math.random() > 0.4 ? 'CHECK_IN' : ('CHECK_OUT' as AccessType),
    syncStatus: synced ? 1 : 0,
  }
}

const generateMockCheckIns = (count: number): CheckInRecord[] => {
  return Array.from({ length: count })
    .map((_, idx) => {
      const rec = generateSingleCheckIn(Math.random() > 0.1)
      // Adjust timestamps for history
      rec.timestamp = new Date(
        Date.now() - Math.floor(Math.random() * 10000000),
      ).toISOString()
      return rec
    })
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
}

const chartData = [
  { time: '06:00', count: 0 },
  { time: '08:00', count: 0 },
  { time: '10:00', count: 0 },
  { time: '12:00', count: 0 },
  { time: '14:00', count: 0 },
  { time: '16:00', count: 0 },
  { time: '18:00', count: 0 },
]

interface DashboardProps {
  currentUser: string
  logout: () => void
}

export default function Dashboard({
  currentUser: username,
  logout,
}: DashboardProps) {
  // Fetch logged in user details
  const { data: userDocs } = useFrappeDocList('User', {
    filters: [['name', '=', username || 'Administrator']],
    fields: ['first_name', 'email', 'user_image', 'role_profile_name'],
    limit: 1,
  })

  const fetchedUser = userDocs?.[0]

  // Construct user object from prop
  const currentUser: User = {
    id: username || 'usr-1',
    name: fetchedUser?.first_name || 'Administrator',
    email: fetchedUser?.email || 'Administrator',
    role: 'System Administrator',
    avatar: fetchedUser?.user_image
      ? (window as any).frappeBaseUrl + fetchedUser.user_image
      : 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
    lastLogin: new Date().toISOString(),
  }

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(false)

  // App State
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [lastCheckIn, setLastCheckIn] = useState<CheckInRecord | null>(null)
  const [hasImportedLogs, setHasImportedLogs] = useState(false) // Gate auto-fetch until first import

  const [stats, setStats] = useState<DailyStats>({
    totalEmployees: 150,
    exceptions: 0,
    uptime: 98.5,
  })

  const [appSettings, setAppSettings] = useState<AppSettings>({
    erpEndpoint: 'https://api.nexo-erp.com/v1/sync',
    syncIntervalMinutes: 15,
    autoSync: true,
    emailNotifications: true,
    alertThreshold: 'MEDIUM',
    darkMode: true,
    retentionDays: 30,
    deviceFetchIntervalSeconds: 60,
    doublePunchThresholdSeconds: 5,
  })

  // Apply Dark Mode
  useEffect(() => {
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [appSettings.darkMode])

  // Load Devices from Backend
  const loadDevices = async () => {
    try {
      const list = (await (window as any).api?.listDevices?.()) as any[]
      if (list) {
        const mappedDevices: Device[] = list.map((d: any) => ({
          id: String(d.id),
          name: d.name,
          location: 'Unknown', // Backend doesn't store location yet
          status: 'OFFLINE', // Default status
          lastPing: '-',
          type: 'BIOMETRIC', // Default type
          ipAddress: d.ip,
          port: String(d.port),
        }))
        setDevices(mappedDevices)
      }
    } catch (e) {
      console.error('Failed to load devices', e)
      addNotification('Failed to load devices from system', 'WARNING', 'System')
    }
  }

  // Fetch Real Data from Frappe using TanStack Query
  const {
    data: frappeLogs,
    isLoading: frappeLoading,
    refetch: refetchLogs,
  } = useFrappeDocList('Employee Checkin', {
    fields: [
      'name',
      'employee',
      'employee_name',
      'time',
      'device_id',
      'log_type',
    ],
    orderBy: { field: 'time', order: 'desc' },
    limit: 500,
    refetchInterval: 30000, // Poll every 30s auto-magically
  })

  // NEW: Fetch Local Logs (Single Source of Truth for "Device Logs")
  const { data: localLogs, refetch: refetchLocalLogs } =
    useLocalAttendance(2500)

  // NEW: Fetch Employees to map IDs to Names for local logs
  const { data: employees } = useFrappeDocList('Employee', {
    fields: ['name', 'employee_name', 'department', 'image'],
    limit: 1000,
  })

  // ZKTeco Device Sync Mutation
  const deviceSync = useDeviceLogs()

  // Simple state for chart data
  const [realChartData, setRealChartData] = useState<
    { time: string; count: number }[]
  >([])

  // 1. Initial Load of Devices
  useEffect(() => {
    loadDevices()
  }, [])

  // 2. Process Real Data (Depends on logs & devices)
  useEffect(() => {
    // Prefer LOCAL logs if available, as they show the immediate state of the device sync
    // Fallback to Frappe logs if local is empty (e.g. fresh install with no local data yet but cloud data exists)
    const sourceLogs =
      localLogs && localLogs.length > 0 ? localLogs : frappeLogs

    if (sourceLogs) {
      // Helper to find employee info
      const getEmpInfo = (id: string) => {
        const e = employees?.find(
          (emp: any) => emp.name === id || emp.employee_name === id,
        )
        return {
          name: e?.employee_name || id,
          dept: e?.department || 'N/A',
          avatar: e?.image
            ? (window as any).frappeBaseUrl + e.image
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                e?.employee_name || id,
              )}&background=random`,
        }
      }

      // 1. Map to CheckInRecord
      const mappedRecords: CheckInRecord[] = sourceLogs.map((log: any) => {
        // Identify if source is Local or Frappe
        const isLocal = log.synced !== undefined // Local has 'synced' column (0 or 1)

        const empId = isLocal ? log.employee_id : log.employee
        const empInfo = getEmpInfo(empId)

        return {
          id: isLocal ? String(log.id) : log.name,
          employeeId: empId,
          employeeName: empInfo.name,
          department: empInfo.dept,
          timestamp: isLocal ? log.timestamp : log.time,
          device: isLocal
            ? devices.find((d) => d.id === String(log.device_id))?.name ||
              `Device ${log.device_id}`
            : log.device_id || 'Unknown Device',
          location: 'Main Office',
          type: ['IN', 'In', 'CHECK IN', 'Check In'].includes(
            isLocal ? log.status : log.log_type,
          )
            ? 'CHECK_IN'
            : 'CHECK_OUT',
          avatar: empInfo.avatar,
          syncStatus: isLocal ? (log.synced as 0 | 1 | 2 | 3 | 4) : 1, // Frappe logs are by definition synced
        }
      })

      setCheckIns(mappedRecords)

      // 2. Process for Traffic Chart (Today's data)
      const today = new Date().toISOString().split('T')[0]
      const todaysLogs = mappedRecords.filter((r) =>
        r.timestamp.startsWith(today),
      )

      // Initialize hours 06:00 to 18:00
      const hoursMap = new Map<string, number>()
      for (let i = 6; i <= 18; i++) {
        const hourKey = `${i.toString().padStart(2, '0')}:00`
        hoursMap.set(hourKey, 0)
      }

      todaysLogs.forEach((r) => {
        const date = new Date(r.timestamp)
        const hour = date.getHours()
        if (hour >= 6 && hour <= 18) {
          const key = `${hour.toString().padStart(2, '0')}:00`
          hoursMap.set(key, (hoursMap.get(key) || 0) + 1)
        }
      })

      const processedChartData = Array.from(hoursMap.entries()).map(
        ([time, count]) => ({
          time,
          count,
        }),
      )

      // Calculate cumulative if needed, or just raw count.
      // The original chart looked cumulative (rising curve), but "Entry/Exit events per hour" usually means frequency.
      // However, the original data was accumulated. Let's stick to frequency per hour for "Traffic Volume" as it's more standard,
      // OR invalidating the previous cumulative logic if it was just random numbers.
      // User asked for "Traffic Volume", let's do cumulative to match the "Curve" look if desired, but
      // "Events per hour" usually implies a bar or line of frequency.
      // Let's do Cumulative for the "Visual" match of the original screenshot if it was an Area chart.
      // Actually, let's do simple count first. If it looks too jagged, we can accumulate.
      // Looking at the screenshot, it's a smooth S-curve, implying Cumulative OR high volume.
      // Let's do Cumulative Count for "Total Events Over Time".

      let cumulative = 0
      const cumulativeChartData = processedChartData.map((d) => {
        cumulative += d.count
        return { ...d, count: cumulative }
      })

      setRealChartData(cumulativeChartData)
    }
  }, [frappeLogs, localLogs, employees, devices])

  // Polling is now handled by useFrappeDocList's refetchInterval

  const handleLogout = () => {
    logout()
  }

  const addNotification = (
    message: string,
    severity: SystemAlert['severity'],
    source: string = 'System',
  ) => {
    const newAlert: SystemAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      severity,
      source,
      timestamp: new Date().toISOString(),
    }
    setAlerts((prev) => [newAlert, ...prev])
  }

  const syncToERP = async (silent = false) => {
    try {
      if (!silent)
        addNotification('Syncing with ERP system...', 'INFO', 'ERP Integration')

      const result = await (window as any).api?.runSync?.()

      if (result?.synced > 0) {
        addNotification(
          `Successfully synced ${result.synced} records to ERP`,
          'SUCCESS',
          'ERP Integration',
        )
        // Refresh local view - mark synced, duplicates, and errors
        setCheckIns((prev) =>
          prev.map((c) => {
            if (result.syncedIds?.includes(c.id))
              return { ...c, syncStatus: 1 as const }
            if (result.duplicateIds?.includes(c.id))
              return { ...c, syncStatus: 2 as const }
            if (result.errorIds?.includes(c.id))
              return { ...c, syncStatus: 3 as const }
            return c
          }),
        )
        refetchLogs()
      } else if (result?.errors?.length > 0) {
        addNotification(
          `Sync completed with errors: ${result.errors[0]}`,
          'WARNING',
          'ERP Integration',
        )
      } else if (!silent) {
        addNotification(
          'All records are already in sync',
          'SUCCESS',
          'ERP Integration',
        )
      }
    } catch (e: any) {
      addNotification(
        `Sync failed: ${e.message}`,
        'CRITICAL',
        'ERP Integration',
      )
    }
  }

  /* Device Fetch Logic */
  const handleForceFetchDevices = async (options?: { silent?: boolean }) => {
    setIsLoading(true)
    try {
      const result = await deviceSync.mutateAsync({
        threshold: appSettings.doublePunchThresholdSeconds ?? 5,
      })

      const imported = result?.imported || 0
      const ignored = result?.ignored || 0

      if (!options?.silent) {
        let message = `Synced ${imported} logs from devices`
        if (ignored > 0) {
          message += ` (${ignored} double punches ignored)`
        }
        addNotification(message, 'SUCCESS', 'Device Sync')
      } else if (imported > 0 && options?.silent) {
        // Even in silent mode, if we found data, let the user know gently or debug
        console.log(`Auto-fetch: synced ${imported} logs, ${ignored} ignored`)
      }

      if (imported > 0) {
        setHasImportedLogs(true) // Enable auto-fetch after first successful import
        await syncToERP(true)
      }
    } catch (e: any) {
      if (!options?.silent) {
        addNotification(`Sync failed: ${e.message}`, 'CRITICAL', 'Device Sync')
      } else {
        console.error('Auto-fetch failed', e)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-Fetch Loop - Runs after initial import to fetch new logs
  // The initial import is done manually via "Import Logs" button to control date range
  // Subsequent syncs fetch all logs but DB deduplication ensures only new ones are inserted
  useEffect(() => {
    // Don't start auto-fetch until user has done at least one manual import
    if (!hasImportedLogs) {
      console.log('Auto-fetch: Waiting for initial manual import')
      return
    }

    const intervalSeconds = appSettings.deviceFetchIntervalSeconds || 60 // Default 60s
    console.log(`Setting up device auto-fetch interval: ${intervalSeconds}s`)

    const intervalId = setInterval(() => {
      handleForceFetchDevices({ silent: true })
    }, intervalSeconds * 1000)

    return () => clearInterval(intervalId)
  }, [appSettings.deviceFetchIntervalSeconds, hasImportedLogs])

  const handleImportConfirm = (start: string, end: string, count: number) => {
    setIsLoading(true)
    setTimeout(() => {
      const imported = generateMockCheckIns(count)
      // Mark them as not synced yet to simulate import flow
      const withSyncState = imported.map((r) => ({
        ...r,
        syncStatus: 0 as const,
      }))
      setCheckIns((prev) =>
        [...withSyncState, ...prev].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
      )
      setIsLoading(false)
      addNotification(
        `Imported ${count} logs from devices (${start} to ${end})`,
        'SUCCESS',
        'Manual Import',
      )
    }, 1000)
  }

  const handleAddDevice = async (device: Device) => {
    try {
      await (window as any).api?.addDevice?.(
        device.name,
        device.ipAddress,
        Number(device.port),
        { location: device.location }, // Pass location to Frappe
      )
      addNotification(
        `New device '${device.name}' added successfully`,
        'SUCCESS',
        'Device Manager',
      )
      loadDevices()
    } catch (e: any) {
      addNotification(
        `Failed to add device: ${e.message}`,
        'CRITICAL',
        'Device Manager',
      )
    }
  }

  const handleDeleteDevice = async (id: string) => {
    try {
      await (window as any).api?.removeDevice?.(Number(id))
      addNotification(`Device removed`, 'INFO', 'Device Manager')
      loadDevices()
    } catch (e: any) {
      addNotification(
        `Failed to remove device: ${e.message}`,
        'CRITICAL',
        'Device Manager',
      )
    }
  }

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings)
    addNotification(
      'System configuration saved successfully',
      'SUCCESS',
      'Settings',
    )
  }

  // Renamed to Force Fetch based on requirements
  const handleManualImport = () => {
    handleForceFetchDevices()
  }

  // "Import" button logic - Sends to ERP
  const handleForcePushToERP = () => {
    syncToERP()
  }

  // Handle import with date range from ImportLogsModal
  const handleImportWithDateRange = async (params: {
    deviceId: string
    deviceIp: string
    devicePort: number
    deviceName: string
    commKey?: string | null
    useUdp?: boolean
    startDate: string
    endDate: string
  }) => {
    setIsLoading(true)
    try {
      const result = await (window as any).api?.fetchLogs?.(
        params.deviceIp,
        params.devicePort,
        params.deviceName,
        params.commKey,
        params.useUdp,
        {
          startDate: params.startDate,
          endDate: params.endDate,
          doublePunchThreshold: appSettings.doublePunchThresholdSeconds ?? 5,
        },
      )

      const imported = result?.imported || 0
      const ignored = result?.ignored || 0

      let message = `Imported ${imported} logs from ${params.deviceName}`
      if (ignored > 0) {
        message += ` (${ignored} double punches ignored)`
      }
      message += ` (${params.startDate} to ${params.endDate})`
      addNotification(message, 'SUCCESS', 'Log Import')

      refetchLocalLogs()
      refetchLogs()

      // Auto-sync to ERP after import
      if (imported > 0) {
        setHasImportedLogs(true) // Enable auto-fetch after first successful import
        await syncToERP(true)
      }
    } catch (e: any) {
      addNotification(
        `Import failed: ${e.message || 'Unknown error'}`,
        'CRITICAL',
        'Log Import',
      )
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAlerts = () => {
    setAlerts([])
  }

  const handleConnectDevice = async (device: Device) => {
    try {
      addNotification(
        `Connecting to ${device.name}...`,
        'INFO',
        'Device Manager',
      )
      const result = await (window as any).api?.testDevice?.(
        device.ipAddress,
        Number(device.port),
      )

      if (result?.ok) {
        addNotification(
          `Successfully connected to ${device.name}`,
          'SUCCESS',
          'Device Manager',
        )
        setDevices((prev) =>
          prev.map((d) =>
            d.id === device.id
              ? { ...d, status: 'ONLINE', lastPing: 'Just now' }
              : d,
          ),
        )

        // Auto-fetch REMOVED - logs are now fetched manually via "Import Logs" button
        // This avoids performance issues when devices have 1k+ logs
      } else {
        throw new Error(result?.error || 'Connection timed out')
      }
    } catch (e: any) {
      addNotification(
        `Failed to connect to ${device.name}: ${e.message}`,
        'CRITICAL',
        'Device Manager',
      )
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id
            ? { ...d, status: 'OFFLINE', lastPing: 'Failed' }
            : d,
        ),
      )
    }
  }

  /* Force Resync Logic (Bulk) */
  const handleBulkResync = async (startDate: string, endDate: string) => {
    try {
      const result = await (window as any).api.resetSyncStatusByDate(
        startDate,
        endDate,
      )

      if (result.ok) {
        addNotification(
          `Marked ${result.updated} logs for resync. Please click "Push to ERP".`,
          'INFO',
          'Sync Manager',
        )

        // Trigger refetch to update UI status (changing Green 'Synced' to Yellow 'Pending')
        refetchLocalLogs()
      } else {
        addNotification(
          'Failed to reset sync status.',
          'WARNING',
          'Sync Manager',
        )
      }
    } catch (e) {
      console.error('Failed to reset sync status by date', e)
      addNotification('Failed to reset sync status', 'WARNING', 'Sync Manager')
    }
  }

  const renderContent = () => {
    switch (currentView) {
      case 'employees':
        return <EmployeeList />
      case 'devices':
        return (
          <DeviceManager
            devices={devices}
            onAddDevice={handleAddDevice}
            onDeleteDevice={handleDeleteDevice}
            onConnectDevice={handleConnectDevice}
          />
        )
      case 'logs':
        // Rewired props to match the new "Import Logs" and "Push" buttons
        return (
          <AccessLogList
            logs={checkIns}
            onImport={() => handleForceFetchDevices({ silent: false })}
            onSync={handleForcePushToERP}
            onImportWithDateRange={handleImportWithDateRange}
            devices={devices.map((d) => ({
              id: d.id,
              name: d.name,
              ip: d.ipAddress,
              port: Number(d.port),
            }))}
          />
        )
      case 'settings':
        return (
          <SettingsView settings={appSettings} onSave={handleSaveSettings} />
        )
      case 'profile':
        return <UserProfile user={currentUser} onLogout={handleLogout} />
      case 'dashboard':
      default:
        return (
          <>
            {/* Top Control Bar & Minimized Stats */}
            <div className='flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6'>
              <div className='flex flex-col sm:flex-row gap-4 w-full xl:w-auto'>
                <div className='flex-1 sm:flex-initial'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='flex h-2.5 w-2.5 relative'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75'></span>
                      <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500'></span>
                    </span>
                    <span className='text-sm font-medium text-teal-700 dark:text-teal-400'>
                      System Operational
                    </span>
                  </div>
                  <p className='text-slate-500 dark:text-slate-400 text-xs'>
                    Real-time sync active
                  </p>
                </div>

                {/* Minimal Stats */}
                <div className='flex gap-3'>
                  <StatCard
                    label='Active Alerts'
                    value={alerts.length}
                    icon={AlertCircle}
                    colorClass={
                      alerts.some((a) => a.severity === 'CRITICAL')
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }
                    bgClass={
                      alerts.some((a) => a.severity === 'CRITICAL')
                        ? 'bg-red-50 dark:bg-red-900/30'
                        : 'bg-blue-50 dark:bg-blue-900/30'
                    }
                    compact={true}
                    onClick={() => setIsAlertsModalOpen(true)}
                  />
                  <StatCard
                    label='Uptime'
                    value={`${stats.uptime.toFixed(1)}%`}
                    icon={CheckCircle2}
                    colorClass='text-blue-600 dark:text-blue-400'
                    bgClass='bg-blue-50 dark:bg-blue-900/30'
                    compact={true}
                  />
                </div>
              </div>

              {/* Action Buttons: Side by Side on Right */}
              <div className='flex flex-row gap-3 w-full xl:w-auto justify-end'>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  disabled={isLoading}
                  className='flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap'
                >
                  <Download size={16} />
                  Force Import
                </button>
                <button
                  onClick={() => handleForceFetchDevices()}
                  disabled={isLoading}
                  className='flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 shadow-sm shadow-teal-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap'
                >
                  <RefreshCw
                    size={16}
                    className={isLoading ? 'animate-spin' : ''}
                  />
                  Sync Devices
                </button>
              </div>
            </div>

            {/* Device Status Grid */}
            <div className='mb-8'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='font-bold text-slate-800 dark:text-slate-100 text-lg'>
                  Connected Devices
                </h3>
                <button
                  onClick={() => setCurrentView('devices')}
                  className='text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:underline'
                >
                  Manage Devices
                </button>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className='bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow'
                  >
                    <div className='flex justify-between items-start'>
                      <div
                        className={`p-2 rounded-lg ${
                          device.status === 'ONLINE'
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : device.status === 'OFFLINE'
                              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {device.type === 'BIOMETRIC' ? (
                          <Fingerprint size={20} />
                        ) : device.type === 'RFID' ? (
                          <CreditCard size={20} />
                        ) : (
                          <Laptop size={20} />
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${
                          device.status === 'ONLINE'
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800'
                            : device.status === 'OFFLINE'
                              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800'
                              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            device.status === 'ONLINE'
                              ? 'bg-green-500'
                              : device.status === 'OFFLINE'
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                          }`}
                        ></div>
                        {device.status}
                      </div>
                    </div>
                    <div>
                      <h4 className='font-bold text-slate-800 dark:text-slate-100 text-sm truncate'>
                        {device.name}
                      </h4>
                      <p className='text-xs text-slate-500 dark:text-slate-400 truncate'>
                        {device.location}
                      </p>
                    </div>
                    <div className='pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-mono'>
                      <span className='flex items-center gap-1'>
                        <Wifi size={10} /> {device.ipAddress}:{device.port}
                      </span>
                      <span>{device.lastPing}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
              {/* Chart Section - Minimal Height */}
              <div className='lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col'>
                <div className='flex justify-between items-center mb-6'>
                  <div>
                    <h3 className='font-bold text-slate-800 dark:text-slate-100'>
                      Traffic Volume
                    </h3>
                    <p className='text-xs text-slate-500 dark:text-slate-400'>
                      Entry/Exit events per hour
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <select className='text-xs border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5 text-slate-600 dark:text-slate-300 focus:outline-none'>
                      <option>Today</option>
                      <option>Yesterday</option>
                    </select>
                  </div>
                </div>
                {/* Reduced height to 200px for minimal look */}
                <div className='w-full h-[200px]'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart
                      data={
                        realChartData.length > 0 ? realChartData : chartData
                      }
                    >
                      <defs>
                        <linearGradient
                          id='colorCount'
                          x1='0'
                          y1='0'
                          x2='0'
                          y2='1'
                        >
                          <stop
                            offset='5%'
                            stopColor='#0d9488'
                            stopOpacity={0.1}
                          />
                          <stop
                            offset='95%'
                            stopColor='#0d9488'
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray='3 3'
                        vertical={false}
                        stroke={appSettings.darkMode ? '#334155' : '#f1f5f9'}
                      />
                      <XAxis
                        dataKey='time'
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: appSettings.darkMode
                            ? '#1e293b'
                            : '#fff',
                          borderRadius: '8px',
                          border: appSettings.darkMode
                            ? '1px solid #334155'
                            : '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          color: appSettings.darkMode ? '#f8fafc' : '#1e293b',
                        }}
                        cursor={{ stroke: '#0d9488', strokeWidth: 1 }}
                      />
                      <Area
                        type='monotone'
                        dataKey='count'
                        stroke='#0d9488'
                        strokeWidth={3}
                        fillOpacity={1}
                        fill='url(#colorCount)'
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Check-ins */}
              <div className='lg:col-span-1'>
                <RecentTable data={checkIns} />
              </div>
            </div>
          </>
        )
    }
  }

  return (
    <div className='flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300'>
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
      />

      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Header */}
        <header className='h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 lg:px-8 z-10 shrink-0 transition-colors duration-300'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => setSidebarOpen(true)}
              className='lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg'
            >
              <Menu size={20} />
            </button>
            <div className='hidden sm:block'>
              <h1 className='text-xl font-bold text-slate-800 dark:text-slate-100'>
                {currentView === 'dashboard'
                  ? 'Access Control Dashboard'
                  : currentView === 'devices'
                    ? 'Device Management'
                    : currentView === 'employees'
                      ? 'Employee Directory'
                      : currentView === 'logs'
                        ? 'Access Logs'
                        : currentView === 'profile'
                          ? 'My Profile'
                          : 'System Configuration'}
              </h1>
              <p className='text-xs text-slate-500 dark:text-slate-400'>
                Security Operations Center
              </p>
            </div>
          </div>

          <div className='flex items-center gap-4'>
            <button
              onClick={() => setIsAlertsModalOpen(true)}
              className='p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg relative transition-colors'
            >
              <Bell size={20} />
              {alerts.length > 0 && (
                <span className='absolute top-2 right-2 flex h-2 w-2'>
                  <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75'></span>
                  <span className='relative inline-flex rounded-full h-2 w-2 bg-red-500'></span>
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className='flex-1 overflow-y-auto p-4 lg:p-8'>
          {renderContent()}
        </main>
      </div>

      <CheckInToast data={lastCheckIn} onClose={() => setLastCheckIn(null)} />

      <AlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        alerts={alerts}
        onClearAll={handleClearAlerts}
      />

      <ImportFilterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={handleImportConfirm}
      />
    </div>
  )
}
