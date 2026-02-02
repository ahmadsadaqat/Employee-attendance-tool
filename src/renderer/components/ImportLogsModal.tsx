import React, { useState, useEffect } from 'react'
import { X, Calendar, Download, Loader2 } from 'lucide-react'

interface Device {
  id: string
  name: string
  ip: string
  port: number
  commKey?: string | null
  useUdp?: number
}

interface ImportLogsModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (params: {
    deviceId: string
    deviceIp: string
    devicePort: number
    deviceName: string
    commKey?: string | null
    useUdp?: boolean
    startDate: string
    endDate: string
  }) => Promise<void>
  devices: Device[]
}

export const ImportLogsModal: React.FC<ImportLogsModalProps> = ({
  isOpen,
  onClose,
  onImport,
  devices,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set default dates (last 7 days)
  useEffect(() => {
    if (isOpen) {
      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      setEndDate(today.toISOString().split('T')[0])
      setStartDate(sevenDaysAgo.toISOString().split('T')[0])

      // Select first device by default
      if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].id)
      }

      setError(null)
    }
  }, [isOpen, devices])

  const handleImport = async () => {
    if (!selectedDeviceId) {
      setError('Please select a device')
      return
    }
    if (!startDate || !endDate) {
      setError('Please select both start and end dates')
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date')
      return
    }

    const device = devices.find((d) => d.id === selectedDeviceId)
    if (!device) {
      setError('Selected device not found')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onImport({
        deviceId: device.id,
        deviceIp: device.ip,
        devicePort: device.port,
        deviceName: device.name,
        commKey: device.commKey,
        useUdp: device.useUdp === 1,
        startDate,
        endDate,
      })
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to import logs')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Modal */}
      <div className='relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg'>
              <Download className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
            </div>
            <h2 className='text-lg font-bold text-slate-800 dark:text-slate-100'>
              Import Logs from Device
            </h2>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors'
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className='p-6 space-y-5'>
          {/* Device Selector */}
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
              Select Device
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              disabled={isLoading}
            >
              <option value=''>-- Select a device --</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.ip}:{device.port})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                <Calendar className='inline w-4 h-4 mr-1' />
                From Date
              </label>
              <input
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className='w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                disabled={isLoading}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                <Calendar className='inline w-4 h-4 mr-1' />
                To Date
              </label>
              <input
                type='date'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className='w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Info Notice */}
          <div className='p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg'>
            <p className='text-xs text-blue-700 dark:text-blue-400'>
              <strong>Note:</strong> Only logs within the selected date range
              will be imported. This helps manage devices with large log
              volumes.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className='p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-lg'>
              <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'>
          <button
            onClick={onClose}
            disabled={isLoading}
            className='px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading || !selectedDeviceId || !startDate || !endDate}
            className='flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                Importing...
              </>
            ) : (
              <>
                <Download size={16} />
                Import Logs
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
