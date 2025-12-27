import React, { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import {
  FrappeProvider,
  useFrappeAuth,
  useFrappeGetDocList,
  useFrappeGetDocCount,
  useFrappeCreateDoc,
} from 'frappe-react-sdk'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import logoUrl from './assets/logo.svg'
import { Logo } from './Logo'
import { Mail, Lock, ArrowRight, AlertCircle, Globe } from 'lucide-react'
import Dashboard from './Dashboard'

type Stats = { total: number; unsynced: number; today: number }

function App({ onUrlChange }: { onUrlChange: (url: string) => void }) {
  const { currentUser, logout } = useFrappeAuth()

  useEffect(() => {
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
    loadSavedUrl()
  }, [])

  if (!currentUser) {
    return <Login onUrlChange={onUrlChange} />
  }

  return <Dashboard currentUser={currentUser} logout={logout} />
}



function Login({ onUrlChange }: { onUrlChange: (url: string) => void }) {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, updateCurrentUser } = useFrappeAuth()

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const creds = await window.api?.getCredentials?.()
        if (creds) {
          if (creds.baseUrl) setUrl(creds.baseUrl)
          if (creds.auth?.username) setEmail(creds.auth.username)
          if (creds.auth?.password) setPassword(creds.auth.password)
          setRememberMe(true)
        }
      } catch (err) {
        console.error('Failed to load credentials:', err)
      }
    }
    loadCredentials()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate URL
      try {
        const urlObj = new URL(url)
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          throw new Error('Invalid protocol')
        }
      } catch {
        setError('Please enter a valid URL (http:// or https://)')
        setIsLoading(false)
        return
      }

      // Update provider URL
      onUrlChange(url)

      // Login
      const result = await login({ username: email, password })
      console.log('Login result:', result)

      // Persist credentials only if Remember Me is checked
      if (rememberMe) {
        await window.api?.setCredentials?.(url, {
          mode: 'password',
          username: email,
          password,
        })
      }

      // Force reload to ensure session is picked up and redirect happens
      window.location.reload()

      // Success is handled by App component observing currentUser
    } catch (e: any) {
      console.error('Login error:', e)
      let errorMessage = 'Unknown error'
      if (e?.message) {
        if (e.message.includes('401') || e.message.includes('Unauthorized')) {
          errorMessage = 'Invalid username or password'
        } else if (
          e.message.includes('404') ||
          e.message.includes('Not Found')
        ) {
          errorMessage = 'Server not found. Check the URL.'
        } else if (
          e.message.includes('NetworkError') ||
          e.message.includes('fetch')
        ) {
          errorMessage = 'Network error. Check your connection and URL.'
        } else {
          errorMessage = e.message
        }
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300'>
      <div className='max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden'>
        {/* Header Section */}
        <div className='px-8 pt-8 pb-6 text-center'>
          <div className='flex justify-center mb-6'>
            <Logo />
          </div>
          <h2 className='text-2xl font-bold text-slate-800 dark:text-slate-100'>
            Welcome Back
          </h2>
          <p className='text-slate-500 dark:text-slate-400 mt-2 text-sm'>
            Sign in to access the control panel
          </p>
        </div>

        {/* Form Section */}
        <div className='px-8 pb-8'>
          <form onSubmit={handleSubmit} className='space-y-5'>
            {error && (
              <div className='bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in'>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'>
                ERP Server URL
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Globe size={18} className='text-slate-400' />
                </div>
                <input
                  type='url'
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className='block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all sm:text-sm font-mono'
                  placeholder='https://api.client-erp.com'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'>
                Email Address
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Mail size={18} className='text-slate-400' />
                </div>
                <input
                  type='text'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all sm:text-sm'
                  placeholder='name@company.com'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'>
                Password
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Lock size={18} className='text-slate-400' />
                </div>
                <input
                  type='password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all sm:text-sm'
                  placeholder='••••••••'
                />
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center'>
                <input
                  id='remember-me'
                  name='remember-me'
                  type='checkbox'
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className='h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded'
                />
                <label
                  htmlFor='remember-me'
                  className='ml-2 block text-sm text-slate-600 dark:text-slate-400'
                >
                  Remember me
                </label>
              </div>
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all'
            >
              {isLoading ? (
                <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-xs text-slate-500 dark:text-slate-400'>
              By signing in, you agree to our{' '}
              <a
                href='#'
                className='underline hover:text-slate-800 dark:hover:text-slate-200'
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href='#'
                className='underline hover:text-slate-800 dark:hover:text-slate-200'
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        {/* Footer decoration */}
        <div className='bg-slate-50 dark:bg-slate-700/50 py-3 px-8 border-t border-slate-100 dark:border-slate-700 flex justify-center gap-4'>
          <div className='h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600'></div>
          <div className='h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600'></div>
          <div className='h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600'></div>
        </div>
      </div>
    </div>
  )
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

  // Compute provider URL and expose base URL globally BEFORE any conditional return
  const providerUrl = import.meta.env.DEV ? '/frappe' : frappeUrl
  useEffect(() => {
    ;(window as any).frappeBaseUrl = providerUrl
  }, [providerUrl])

const queryClient = new QueryClient()

  if (!isUrlLoaded) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-slate-600'>Loading...</div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <FrappeProvider url={providerUrl} enableSocket={false} key={providerUrl}>
        <App onUrlChange={handleUrlChange} />
      </FrappeProvider>
    </QueryClientProvider>
  )
}

// Ensure we only create root once, even with HMR
const container = document.getElementById('root')!
const root = (container as any)._reactRoot || createRoot(container)
;(container as any)._reactRoot = root
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
        name?: string,
        commKey?: string,
        useUdp?: boolean
      ) => Promise<{ imported: number; error?: string }>
      listAttendance: (limit?: number) => Promise<
        {
          id: number
          employee_id: string
          timestamp: string
          status: 'IN' | 'OUT'
          synced: 0 | 1
        }[]
      >
      listAttendanceByDevice: (
        deviceId: number,
        limit?: number
      ) => Promise<
        {
          id: number
          employee_id: string
          timestamp: string
          status: 'IN' | 'OUT'
          synced: 0 | 1
        }[]
      >
      listUnsyncedAttendance: () => Promise<
        {
          id: number
          device_id: number
          employee_id: string
          timestamp: string
          status: 'IN' | 'OUT'
        }[]
      >
      markAttendanceSynced: (
        ids: number[]
      ) => Promise<{ ok: true; updated: number }>
      listDevices: () => Promise<
        {
          id: number
          name: string
          ip: string
          port: number
          comm_key?: string
          use_udp?: number
        }[]
      >
      addDevice: (
        name: string,
        ip: string,
        port: number,
        opts?: { commKey?: string; useUdp?: boolean }
      ) => Promise<{ id: number }>
      removeDevice: (id: number) => Promise<void>
      runSync: () => Promise<{ synced: number; errors: string[] }>
      setCredentials: (baseUrl: string, auth: any) => Promise<void>
      getCredentials: () => Promise<{ baseUrl: string; auth: any } | null>
      getNetworkStatus: () => Promise<boolean>
    }
  }
}
