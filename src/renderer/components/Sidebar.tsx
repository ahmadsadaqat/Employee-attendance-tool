import React from 'react'
import {
  LayoutDashboard,
  Users,
  Fingerprint,
  Settings,
  ShieldCheck,
  CloudUpload,
} from 'lucide-react'
import logoSrc from '../assets/logo.svg'
import { User } from '../types'

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  currentView: string
  setCurrentView: (view: string) => void
  currentUser: User | null
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'employees', icon: Users, label: 'Employees' },
  { id: 'logs', icon: Fingerprint, label: 'Access Logs' },
  { id: 'devices', icon: ShieldCheck, label: 'Devices' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  currentView,
  setCurrentView,
  currentUser,
}) => {
  if (!currentUser) return null

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className='fixed inset-0 bg-black/50 z-20 lg:hidden'
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        <div className='h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-700'>
          <img src={logoSrc} alt='NEXO ERP' className='w-[150px]' />
        </div>

        <div className='p-4 space-y-1'>
          <div className='text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2'>
            Main Menu
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id)
                setIsOpen(false)
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                ${
                  currentView === item.id
                    ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              <item.icon
                size={20}
                className={
                  currentView === item.id
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-400 dark:text-slate-500'
                }
              />
              {item.label}
            </button>
          ))}
        </div>

        <div className='absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-700'>
          <button
            onClick={() => {
              setCurrentView('profile')
              setIsOpen(false)
            }}
            className={`flex items-center gap-3 px-2 py-2 w-full rounded-lg transition-colors text-left ${
              currentView === 'profile'
                ? 'bg-slate-100 dark:bg-slate-700/50'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <div className='w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-100'>
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className='w-full h-full object-cover'
              />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-slate-900 dark:text-slate-200 truncate'>
                {currentUser.name}
              </p>
              <p className='text-xs text-slate-500 dark:text-slate-400 truncate'>
                {currentUser.role}
              </p>
            </div>
          </button>
        </div>
      </aside>
    </>
  )
}
