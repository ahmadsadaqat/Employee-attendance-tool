import React, { useRef, useState, useMemo } from 'react'
import { CheckInRecord } from '../types'
import {
  LogIn,
  LogOut,
  MapPin,
  TabletSmartphone,
  CloudUpload,
  FileDown,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Calendar,
} from 'lucide-react'
import { ImportLogsModal } from './ImportLogsModal'

interface Device {
  id: string
  name: string
  ip: string
  port: number
  commKey?: string | null
  useUdp?: number
}

interface AccessLogListProps {
  logs: CheckInRecord[]
  onImport: () => void
  onSync: () => void
  onImportWithDateRange?: (params: {
    deviceId: string
    deviceIp: string
    devicePort: number
    deviceName: string
    commKey?: string | null
    useUdp?: boolean
    startDate: string
    endDate: string
  }) => Promise<void>
  devices?: Device[]
}

export const AccessLogList: React.FC<AccessLogListProps> = ({
  logs,
  onImport,
  onSync,
  onImportWithDateRange,
  devices = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log('File selected')
    }
  }

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Employee Name',
      'Employee ID',
      'Department',
      'Timestamp',
      'Device',
      'Location',
      'Type',
      'Synced',
    ]
    const rows = filteredLogs.map((log) => [
      log.id,
      log.employeeName,
      log.employeeId,
      log.department,
      new Date(log.timestamp).toLocaleString(),
      log.device,
      log.location,
      log.type,
      log.syncStatus === 1
        ? 'Synced'
        : log.syncStatus === 2
          ? 'Duplicate'
          : log.syncStatus === 3
            ? 'Error'
            : 'Pending',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `access_logs_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter logs based on search and date range
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter (employee ID or name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesId = log.employeeId.toLowerCase().includes(query)
        const matchesName = log.employeeName.toLowerCase().includes(query)
        if (!matchesId && !matchesName) return false
      }

      // Date range filter
      if (startDate) {
        const logDate = new Date(log.timestamp)
        const filterStart = new Date(startDate)
        filterStart.setHours(0, 0, 0, 0)
        if (logDate < filterStart) return false
      }

      if (endDate) {
        const logDate = new Date(log.timestamp)
        const filterEnd = new Date(endDate)
        filterEnd.setHours(23, 59, 59, 999)
        if (logDate > filterEnd) return false
      }

      return true
    })
  }, [logs, searchQuery, startDate, endDate])

  // Pagination State
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(0)
  }

  const handleStartDateChange = (value: string) => {
    setStartDate(value)
    setPage(0)
  }

  const handleEndDateChange = (value: string) => {
    setEndDate(value)
    setPage(0)
  }

  const handleChangePage = (newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  const count = filteredLogs.length
  const totalPages = Math.ceil(count / rowsPerPage)
  const displayedLogs = filteredLogs.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  )

  const startRange = count === 0 ? 0 : page * rowsPerPage + 1
  const endRange = Math.min((page + 1) * rowsPerPage, count)

  const pendingCount = logs.filter((l) => l.syncStatus === 0).length

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h2 className='text-xl font-bold text-slate-800 dark:text-slate-100'>
            Access Logs
          </h2>
          <p className='text-sm text-slate-500 dark:text-slate-400'>
            Comprehensive history of biometric events
          </p>
        </div>

        <div className='flex flex-wrap gap-3'>
          <input
            type='file'
            ref={fileInputRef}
            className='hidden'
            accept='.csv,.xlsx'
            onChange={handleFileChange}
          />

          <button
            onClick={() => setIsImportModalOpen(true)}
            className='flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm'
          >
            <Download size={16} />
            Import Logs
          </button>

          <button
            onClick={handleExportCSV}
            className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm'
          >
            <FileDown size={16} />
            Export CSV
          </button>

          <button
            onClick={onSync}
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm'
          >
            <CloudUpload size={16} />
            Push to ERP
            {pendingCount > 0 && (
              <span className='bg-white/20 px-1.5 py-0.5 rounded text-xs ml-1'>
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className='flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm'>
        {/* Search Input */}
        <div className='relative flex-1'>
          <Search
            size={16}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'
          />
          <input
            type='text'
            placeholder='Search by Employee ID or Name...'
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
          />
        </div>

        {/* Date Range Filters */}
        <div className='flex items-center gap-2'>
          <Calendar size={16} className='text-slate-400' />
          <input
            type='date'
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className='px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'
          />
          <span className='text-slate-400 text-sm'>to</span>
          <input
            type='date'
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className='px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'
          />
          {(searchQuery || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStartDate('')
                setEndDate('')
                setPage(0)
              }}
              className='px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors'
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className='bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700'>
              <tr>
                <th className='px-6 py-4 font-semibold text-xs uppercase tracking-wider'>
                  Timestamp
                </th>
                <th className='px-6 py-4 font-semibold text-xs uppercase tracking-wider'>
                  Employee
                </th>
                <th className='px-6 py-4 font-semibold text-xs uppercase tracking-wider'>
                  Access Point
                </th>
                <th className='px-6 py-4 font-semibold text-xs uppercase tracking-wider'>
                  Type
                </th>
                <th className='px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right'>
                  ERP Sync
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 dark:divide-slate-700'>
              {displayedLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className='px-6 py-8 text-center text-slate-400 dark:text-slate-500'
                  >
                    No logs found. Waiting for device activity...
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className='hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors'
                  >
                    <td className='px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs whitespace-nowrap'>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <img
                          src={log.avatar}
                          alt={log.employeeName}
                          className='w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600'
                        />
                        <div>
                          <div className='font-semibold text-slate-800 dark:text-slate-200'>
                            {log.employeeName}
                          </div>
                          <div className='text-xs text-slate-400'>
                            {log.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-col'>
                        <div className='flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium'>
                          <MapPin size={14} className='text-slate-400' />
                          {log.location}
                        </div>
                        <div className='flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
                          <TabletSmartphone size={12} />
                          {log.device}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border uppercase tracking-wide
                        ${
                          log.type === 'CHECK_IN'
                            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800'
                            : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        {log.type === 'CHECK_IN' ? (
                          <LogIn size={12} />
                        ) : (
                          <LogOut size={12} />
                        )}
                        {log.type === 'CHECK_IN' ? 'CHECK IN' : 'CHECK OUT'}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      {log.syncStatus === 1 ? (
                        <span className='inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800'>
                          <CheckCircle2 size={14} />
                          Synced
                        </span>
                      ) : log.syncStatus === 2 ? (
                        <span className='inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800'>
                          <CheckCircle2 size={14} />
                          Duplicate
                        </span>
                      ) : log.syncStatus === 3 ? (
                        <span className='inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800'>
                          <Clock size={14} />
                          Error
                        </span>
                      ) : log.syncStatus === 4 ? (
                        <span className='inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600'>
                          <Clock size={14} />
                          Double Punch
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800'>
                          <Clock size={14} className='animate-pulse' />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className='flex items-center justify-between px-2'>
        <div className='text-sm text-slate-500 dark:text-slate-400'>
          Showing <span className='font-medium'>{startRange}</span> to{' '}
          <span className='font-medium'>{endRange}</span> of{' '}
          <span className='font-medium'>{count}</span> entries
        </div>

        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-slate-500 dark:text-slate-400'>
              Rows per page:
            </span>
            <select
              value={rowsPerPage}
              onChange={handleChangeRowsPerPage}
              className='text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500'
            >
              <option value={20}>20</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={2000}>2000</option>
              <option value={2500}>2500</option>
            </select>
          </div>

          <div className='flex items-center gap-1'>
            <button
              onClick={() => handleChangePage(Math.max(0, page - 1))}
              disabled={page === 0}
              className='p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronLeft
                size={20}
                className='text-slate-600 dark:text-slate-400'
              />
            </button>
            <span className='text-sm text-slate-600 dark:text-slate-300 font-medium px-2'>
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() =>
                handleChangePage(Math.min(totalPages - 1, page + 1))
              }
              disabled={page >= totalPages - 1}
              className='p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronRight
                size={20}
                className='text-slate-600 dark:text-slate-400'
              />
            </button>
          </div>
        </div>
      </div>

      {onImportWithDateRange && (
        <ImportLogsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={onImportWithDateRange}
          devices={devices}
        />
      )}
    </div>
  )
}
