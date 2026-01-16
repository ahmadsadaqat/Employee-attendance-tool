import React, { useState } from 'react'
import { X, RefreshCw } from 'lucide-react'

interface ResyncModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (startDate: string, endDate: string) => void
}

export const ResyncModal: React.FC<ResyncModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (startDate && endDate) {
      onConfirm(startDate, endDate)
      onClose()
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
      <div className='bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700'>
        <div className='flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700'>
          <h3 className='text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2'>
            <RefreshCw
              size={20}
              className='text-indigo-600 dark:text-indigo-400'
            />
            Resync Logs by Date
          </h3>
          <button
            onClick={onClose}
            className='text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors'
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-4 space-y-4'>
          <div className='p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm rounded-lg border border-amber-200 dark:border-amber-800'>
            Select a date range. All logs within this range will be marked as{' '}
            <strong>Pending</strong> and can be re-pushed to the ERP.
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                From Date
              </label>
              <input
                type='date'
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className='w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100'
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                To Date
              </label>
              <input
                type='date'
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className='w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100'
              />
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={!startDate || !endDate}
              className='px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Reset Sync Status
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
