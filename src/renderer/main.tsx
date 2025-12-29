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
import { Mail, Lock, ArrowRight, AlertCircle, Globe, Key } from 'lucide-react'
import Dashboard from './Dashboard'


type Stats = { total: number; unsynced: number; today: number }

// Custom hook to check auth status manually
function useCustomAuth(onUrlChange: (url: string) => void) {
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const checkAuth = async () => {
    setIsLoading(true)
    setError(undefined)
    try {
      // Get stored URL first
      const creds = await window.api?.getCredentials?.()
      if (creds?.baseUrl) {
        onUrlChange(creds.baseUrl)
        // Set global for fetch patch
        ;(window as any).frappeRealUrl = creds.baseUrl

        // Manual verification
        const res = await fetch(`${creds.baseUrl}/api/method/frappe.auth.get_logged_user`)
        if (res.status === 200) {
           const json = await res.json()
           // Standard Frappe response: { message: "Administrator" }
           if (json.message && json.message !== 'Guest') {
             setCurrentUser(json.message)
             window.api?.log('info', 'Auth check success:', json.message)
           } else {
             setCurrentUser(null)
             window.api?.log('info', 'Auth check returned Guest or invalid user')
           }
        } else {
           setCurrentUser(null)
           window.api?.log('warn', 'Auth check failed with status:', res.status)
        }
      } else {
        window.api?.log('info', 'No credentials found')
        setCurrentUser(null)
      }
    } catch (e: any) {
      console.error('Auth check error:', e)
      window.api?.log('error', 'Auth check exception:', e.message)
      setError(e.message)
      setCurrentUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial check
  useEffect(() => {
    checkAuth()
  }, [])

  return { currentUser, isLoading, error, checkAuth }
}

function App({ onUrlChange }: { onUrlChange: (url: string) => void }) {
  const { currentUser, isLoading, error, checkAuth } = useCustomAuth(onUrlChange)
  const { logout: sdkLogout } = useFrappeAuth() // Still use SDK's logout if useful, or implement custom

  // Custom logout handler
  const handleLogout = async () => {
    try {
      if (sdkLogout) await sdkLogout()

      // Call Main Process logout to clear stored credentials
      await window.api?.logout?.()

      // Force reload to reset app state (will now fail checkAuth and show Login)
      window.location.reload()
    } catch (e) {
      console.error('Logout failed', e)
      window.location.reload()
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-slate-600'>Loading session...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Login onUrlChange={onUrlChange} />
  }

  return <Dashboard currentUser={currentUser} logout={handleLogout} />
}

function Login({ onUrlChange }: { onUrlChange: (url: string) => void }) {
  const [mode, setMode] = useState<'password' | 'token'>('password')
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
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
          if (creds.auth) {
              if (creds.auth.mode === 'token') {
                  setMode('token')
                  if (creds.auth.apiKey) setApiKey(creds.auth.apiKey)
                  if (creds.auth.apiSecret) setApiSecret(creds.auth.apiSecret)
              } else {
                  setMode('password')
                  if (creds.auth.username) setEmail(creds.auth.username)
                  if (creds.auth.password) setPassword(creds.auth.password)
              }
          }
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
      // Force sync update for fetch patch to work immediately for the login request
      ;(window as any).frappeRealUrl = url

      let result
      if (mode === 'token') {
          // Token Login
          result = await window.api!.loginWithToken(url, apiKey, apiSecret)
      } else {
          // Password Login
          result = await window.api!.login(url, email, password)
      }

      console.log('Login result:', result)

      // Force reload to ensure session/token is picked up and redirect happens
      window.location.reload()

      // Success is handled by App component observing currentUser
    } catch (e: any) {
      console.error('Login error:', e)
      let errorMessage = 'Unknown error'
      if (e?.message) {
        if (e.message.includes('401') || e.message.includes('Unauthorized')) {
          errorMessage = 'Invalid credentials'
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
          {/* Mode Toggle */}
          <div className="flex p-1 mb-6 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('password')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'password'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setMode('token')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'token'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              API Token
            </button>
          </div>

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

            {mode === 'password' ? (
                <>
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
                </>
            ) : (
                <>
                     <div>
                    <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'>
                        API Key
                    </label>
                    <div className='relative'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <Key size={18} className='text-slate-400' />
                        </div>
                        <input
                        type='text'
                        required
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className='block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all sm:text-sm font-mono'
                        placeholder='e.g. 394857398457'
                        />
                    </div>
                    </div>

                    <div>
                    <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'>
                        API Secret
                    </label>
                    <div className='relative'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <Lock size={18} className='text-slate-400' />
                        </div>
                        <input
                        type='password'
                        required
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        className='block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all sm:text-sm font-mono'
                        placeholder='••••••••'
                        />
                    </div>
                    </div>
                </>
            )}


            <button
              type='submit'
              disabled={isLoading}
              className='w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all'
            >
              {isLoading ? (
                <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              ) : (
                <>
                  {mode === 'password' ? 'Sign In' : 'Connect Instance'} <ArrowRight size={16} />
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
          // Set synchronous global for fetch patch to see immediately
          ;(window as any).frappeRealUrl = creds.baseUrl
          console.log('AppWrapper: Set global frappeRealUrl to', creds.baseUrl)
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

  // Use the real URL directly. Main Process handles auth injection and CORS is disabled.
  const providerUrl = frappeUrl
  useEffect(() => {
    ;(window as any).frappeBaseUrl = providerUrl
    ;(window as any).frappeRealUrl = frappeUrl // Store real URL for the proxy header injection
  }, [providerUrl, frappeUrl])

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
      login: (url: string, usr: string, pwd: string) => Promise<any>
      loginWithToken: (url: string, apiKey: string, apiSecret: string) => Promise<any>
      logout: () => Promise<boolean>
      getNetworkStatus: () => Promise<boolean>
      log: (level: string, ...args: any[]) => void
    }
  }
}
