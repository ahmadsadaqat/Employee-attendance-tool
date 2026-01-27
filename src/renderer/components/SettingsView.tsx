import React, { useEffect } from 'react'
import { AppSettings } from '../types'
import {
  Save,
  Database,
  Loader2,
  Cloud as CloudIcon,
  Power,
} from 'lucide-react'
import { RetentionManager } from './RetentionLogic'

interface SettingsViewProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSave,
}) => {
  const [formData, setFormData] = React.useState<AppSettings>(settings)
  const [isSaving, setIsSaving] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState('')
  const [autoLaunchEnabled, setAutoLaunchEnabled] = React.useState(false)
  const [autoLaunchLoading, setAutoLaunchLoading] = React.useState(true)

  // Load auto-launch status on mount
  useEffect(() => {
    const loadAutoLaunch = async () => {
      try {
        const enabled = await (window as any).api.getAutoLaunch()
        setAutoLaunchEnabled(enabled)
      } catch (e) {
        console.error('Failed to load auto-launch status:', e)
      } finally {
        setAutoLaunchLoading(false)
      }
    }
    loadAutoLaunch()
  }, [])

  const handleAutoLaunchToggle = async () => {
    const newValue = !autoLaunchEnabled
    setAutoLaunchLoading(true)
    try {
      const success = await (window as any).api.setAutoLaunch(newValue)
      if (success) {
        setAutoLaunchEnabled(newValue)
        setStatusMessage(
          newValue
            ? 'App will start automatically on Windows startup.'
            : 'Auto-start disabled.',
        )
      } else {
        setStatusMessage('Failed to update auto-start setting.')
      }
    } catch (e) {
      setStatusMessage('Failed to update auto-start setting.')
    } finally {
      setAutoLaunchLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setStatusMessage('')

    try {
      // Save settings state locally/parent
      onSave(formData)

      // Execute cleanup logic using the imported component logic
      const deleted = await RetentionManager.runCleanup(formData.retentionDays)

      setStatusMessage(
        `Settings saved. Cleanup executed: ${deleted} old records deleted.`,
      )

      // Save Sync Interval (Frappe sync - Phase 12)
      if (
        formData.syncIntervalSeconds &&
        formData.syncIntervalSeconds !== settings.syncIntervalSeconds
      ) {
        await (window as any).api.setSyncInterval(formData.syncIntervalSeconds)
      }

      // The original setIsSaving(false) was in finally.
      // Moving it here as per instruction, wrapped in setTimeout.
      // This means if an error occurs after onSave but before this point,
      // isSaving might remain true.
      setTimeout(() => {
        setIsSaving(false)
      }, 0) // Using setTimeout to defer, similar to original finally block behavior but after successful operations.
    } catch (error) {
      console.error(error)
      setStatusMessage('Failed to execute cleanup.')
      setIsSaving(false) // Ensure saving state is reset on error
    }
  }

  return (
    <div className='space-y-6 max-w-4xl'>
      <div>
        <h2 className='text-xl font-bold text-slate-800 dark:text-slate-100'>
          System Settings
        </h2>
        <p className='text-sm text-slate-500 dark:text-slate-400'>
          Configure system preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Frappe Sync (Phase 12) */}
        <div className='bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden'>
          <div className='px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2'>
            <CloudIcon className='text-teal-600 dark:text-teal-400' size={18} />
            <h3 className='font-semibold text-slate-800 dark:text-slate-100'>
              ERP Sync (Frappe)
            </h3>
          </div>
          <div className='p-6 space-y-4'>
            <p className='text-xs text-slate-500 dark:text-slate-400'>
              Sync attendance logs to ERP. Uses authenticated session.
            </p>

            <div className='flex gap-2'>
              <button
                type='button'
                onClick={async () => {
                  try {
                    setIsSaving(true)
                    const res = await (window as any).api.syncToFrappe()
                    if (res.success)
                      setStatusMessage(
                        `Sync complete. Pushed ${res.pushed} logs.`,
                      )
                    else
                      setStatusMessage(
                        `Sync failed: ${res.error || res.errors?.join(', ')}`,
                      )
                  } catch (e) {
                    setStatusMessage('Sync failed.')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                className='text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50'
              >
                Sync Now
              </button>
            </div>

            <div className='pt-2 border-t border-slate-100 dark:border-slate-700'>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                Auto-Sync Interval:{' '}
                <span className='text-teal-600 dark:text-teal-400 font-mono'>
                  {formData.syncIntervalSeconds || 60}s
                </span>
              </label>
              <div className='flex items-center gap-4'>
                <input
                  type='range'
                  min='60'
                  max='1800'
                  step='60'
                  value={formData.syncIntervalSeconds || 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      syncIntervalSeconds: parseInt(e.target.value),
                    })
                  }
                  className='w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600'
                />
                <div className='text-xs text-slate-500 w-24 text-right'>
                  {Math.floor((formData.syncIntervalSeconds || 60) / 60)} min
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Startup Settings (Windows Auto-Launch) */}
        <div className='bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden'>
          <div className='px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2'>
            <Power className='text-teal-600 dark:text-teal-400' size={18} />
            <h3 className='font-semibold text-slate-800 dark:text-slate-100'>
              Startup Settings
            </h3>
          </div>
          <div className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>
                  Start on Windows Startup
                </label>
                <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
                  Automatically launch the app when Windows starts.
                </p>
              </div>
              <button
                type='button'
                disabled={autoLaunchLoading}
                onClick={handleAutoLaunchToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:opacity-50 ${
                  autoLaunchEnabled
                    ? 'bg-teal-600'
                    : 'bg-slate-200 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoLaunchEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Device Management Settings */}
        <div className='bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden'>
          <div className='px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2'>
            <Loader2
              className={`text-teal-600 dark:text-teal-400 ${
                formData.deviceFetchIntervalSeconds &&
                formData.deviceFetchIntervalSeconds < 300
                  ? 'animate-spin'
                  : ''
              }`}
              size={18}
            />
            <h3 className='font-semibold text-slate-800 dark:text-slate-100'>
              Device Auto-Fetch
            </h3>
          </div>
          <div className='p-6'>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
              Fetch Interval:{' '}
              <span className='text-teal-600 dark:text-teal-400 font-mono'>
                {formData.deviceFetchIntervalSeconds || 60}s
              </span>
            </label>
            <div className='flex items-center gap-4'>
              <input
                type='range'
                min='30'
                max='300'
                step='30'
                value={formData.deviceFetchIntervalSeconds || 60}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deviceFetchIntervalSeconds: parseInt(e.target.value),
                  })
                }
                className='w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600'
              />
              <div className='text-xs text-slate-500 w-24 text-right'>
                {Math.floor((formData.deviceFetchIntervalSeconds || 60) / 60)}m{' '}
                {(formData.deviceFetchIntervalSeconds || 60) % 60}s
              </div>
            </div>
            <p className='text-xs text-slate-500 dark:text-slate-400 mt-2'>
              How often the system should automatically check for new logs from
              connected devices.
            </p>

            <div className='mt-4 pt-4 border-t border-slate-100 dark:border-slate-700'>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                Double Punch Prevention:{' '}
                <span className='text-teal-600 dark:text-teal-400 font-mono'>
                  {formData.doublePunchThresholdSeconds ?? 5}s
                </span>
              </label>
              <div className='flex items-center gap-4'>
                <input
                  type='range'
                  min='0'
                  max='300'
                  step='1'
                  value={formData.doublePunchThresholdSeconds ?? 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      doublePunchThresholdSeconds: parseInt(e.target.value),
                    })
                  }
                  className='w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600'
                />
                <div className='text-xs text-slate-500 w-24 text-right'>
                  {formData.doublePunchThresholdSeconds === 0
                    ? 'Disabled'
                    : `${formData.doublePunchThresholdSeconds ?? 60}s`}
                </div>
              </div>
              <p className='text-xs text-slate-500 dark:text-slate-400 mt-2'>
                Ignore logs from the same employee if they occur within this
                time frame (to prevent accidental double scans). Set to 0 to
                disable.
              </p>
            </div>
          </div>
        </div>
        {/* Data Management */}
        <div className='bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden'>
          <div className='px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2'>
            <Database className='text-teal-600 dark:text-teal-400' size={18} />
            <h3 className='font-semibold text-slate-800 dark:text-slate-100'>
              Data Retention
            </h3>
          </div>
          <div className='p-6'>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
              Local Log Retention (Days)
            </label>
            <p className='text-xs text-slate-500 dark:text-slate-400 mb-4'>
              Attendance logs older than this limit will be automatically
              deleted from this computer to save space.
            </p>
            <input
              type='range'
              min='7'
              max='365'
              value={formData.retentionDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  retentionDays: parseInt(e.target.value),
                })
              }
              className='w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600'
            />
            <div className='flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2'>
              <span>7 Days</span>
              <span className='font-bold text-teal-700 dark:text-teal-400'>
                {formData.retentionDays} Days
              </span>
              <span>365 Days</span>
            </div>

            {/* Clear All Logs Button */}
            <div className='mt-6 pt-4 border-t border-slate-100 dark:border-slate-700'>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                Clear All Local Logs
              </label>
              <p className='text-xs text-slate-500 dark:text-slate-400 mb-3'>
                This will permanently delete ALL attendance logs stored locally
                on this computer. Logs already synced to ERP will not be
                affected.
              </p>
              <button
                type='button'
                onClick={async () => {
                  if (
                    window.confirm(
                      'Are you sure you want to DELETE ALL local attendance logs? This action cannot be undone.',
                    )
                  ) {
                    try {
                      setIsSaving(true)
                      const deleted = await (window as any).api.clearAllLogs()
                      setStatusMessage(`Cleared ${deleted} attendance logs.`)
                    } catch (e) {
                      setStatusMessage('Failed to clear logs.')
                    } finally {
                      setIsSaving(false)
                    }
                  }
                }}
                disabled={isSaving}
                className='text-xs px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 font-medium disabled:opacity-50'
              >
                Clear All Logs
              </button>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between pt-4'>
          {statusMessage && (
            <p
              className={`text-sm ${
                statusMessage.includes('Failed')
                  ? 'text-red-500'
                  : 'text-emerald-600'
              }`}
            >
              {statusMessage}
            </p>
          )}
          <div className='flex-1'></div>
          <button
            type='submit'
            disabled={isSaving}
            className='flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed'
          >
            {isSaving ? (
              <Loader2 className='animate-spin' size={18} />
            ) : (
              <Save size={18} />
            )}
            {isSaving ? 'Saving & Cleaning...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}
