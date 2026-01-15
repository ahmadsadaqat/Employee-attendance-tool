import React, { useState } from 'react'
import { Device } from '../types'
import {
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Activity,
  Laptop,
  Monitor,
  Fingerprint,
  CreditCard,
} from 'lucide-react'

interface DeviceManagerProps {
  devices: Device[]
  onAddDevice: (device: Device) => void
  onDeleteDevice: (id: string) => void
  onConnectDevice: (device: Device) => Promise<void>
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  devices,
  onAddDevice,
  onDeleteDevice,
  onConnectDevice,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [newDevice, setNewDevice] = useState<Partial<Device>>({
    name: '',
    location: '',
    type: 'BIOMETRIC',
    ipAddress: '192.168.1.X',
    port: '4370',
  })

  const handleConnect = async (device: Device) => {
    setConnectingId(device.id)
    try {
      await onConnectDevice(device)
    } finally {
      setConnectingId(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newDevice.name && newDevice.location) {
      onAddDevice({
        id: Date.now().toString(),
        name: newDevice.name,
        location: newDevice.location,
        type: newDevice.type as any,
        status: 'ONLINE',
        lastPing: 'Just now',
        ipAddress: newDevice.ipAddress || '192.168.1.100',
        port: newDevice.port || '4370',
      })
      setIsModalOpen(false)
      setNewDevice({
        name: '',
        location: '',
        type: 'BIOMETRIC',
        ipAddress: '192.168.1.X',
        port: '4370',
      })
    }
  }

  const getDeviceIcon = (type: string, size: number) => {
    switch (type) {
      case 'BIOMETRIC':
        return <Fingerprint size={size} />
      case 'RFID':
        return <CreditCard size={size} />
      case 'GATE':
        return <Laptop size={size} />
      default:
        return <Monitor size={size} />
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-xl font-bold text-slate-800 dark:text-slate-100'>
            Device Management
          </h2>
          <p className='text-sm text-slate-500 dark:text-slate-400'>
            Manage biometric terminals and controllers
          </p>
        </div>
        <div className='flex'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm'
          >
            <Plus size={18} />
            Add Device
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {devices.map((device) => (
          <div
            key={device.id}
            className='bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group'
          >
            <div className='p-5'>
              <div className='flex justify-between items-start mb-4'>
                <div
                  className={`p-3 rounded-lg ${
                    device.status === 'ONLINE'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : device.status === 'OFFLINE'
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {getDeviceIcon(device.type, 20)}
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => handleConnect(device)}
                    disabled={connectingId === device.id}
                    className='text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors p-1 disabled:opacity-50'
                    title='Connect to Device'
                  >
                    <Activity
                      size={18}
                      className={
                        connectingId === device.id ? 'animate-spin' : ''
                      }
                    />
                  </button>
                  <button
                    onClick={() => onDeleteDevice(device.id)}
                    className='text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1'
                    title='Remove Device'
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className='font-bold text-slate-800 dark:text-slate-100 text-lg mb-1'>
                {device.name}
              </h3>
              <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>
                {device.location}
              </p>

              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                  device.status === 'ONLINE'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800'
                    : device.status === 'OFFLINE'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                }`}
              >
                {device.status === 'ONLINE' ? (
                  <Wifi size={16} />
                ) : device.status === 'OFFLINE' ? (
                  <WifiOff size={16} />
                ) : (
                  <Activity size={16} />
                )}
                <span>{device.status}</span>

                {/* Device Type Indicator */}
                <span className='mx-1 opacity-40'>|</span>
                <span
                  className='flex items-center gap-1.5'
                  title={`Type: ${device.type}`}
                >
                  {getDeviceIcon(device.type, 14)}
                  <span className='text-[10px] uppercase opacity-90 hidden sm:inline-block tracking-wide'>
                    {device.type}
                  </span>
                </span>

                <span className='ml-auto text-xs opacity-75 font-normal'>
                  Ping: {device.lastPing}
                </span>
              </div>
            </div>
            <div className='bg-slate-50 dark:bg-slate-700/50 px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center'>
              <span className='text-xs text-slate-500 dark:text-slate-400 font-mono'>
                ID: {device.id.slice(0, 8)}
              </span>
              <span className='text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono'>
                {device.ipAddress}:{device.port}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border dark:border-slate-700'>
            <h3 className='text-lg font-bold text-slate-800 dark:text-slate-100 mb-4'>
              Add New Device
            </h3>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Device Name
                </label>
                <input
                  required
                  type='text'
                  value={newDevice.name}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, name: e.target.value })
                  }
                  className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none'
                  placeholder='e.g. Lobby Turnstile 1'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Location
                </label>
                <input
                  required
                  type='text'
                  value={newDevice.location}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, location: e.target.value })
                  }
                  className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none'
                  placeholder='e.g. Building A, Floor 1'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                    Type
                  </label>
                  <select
                    value={newDevice.type}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        type: e.target.value as any,
                      })
                    }
                    className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none'
                  >
                    <option value='BIOMETRIC'>Biometric</option>
                    <option value='RFID'>RFID</option>
                    <option value='GATE'>Gate</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                    Port
                  </label>
                  <input
                    type='text'
                    value={newDevice.port}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, port: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none'
                    placeholder='4370'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  IP Address
                </label>
                <input
                  type='text'
                  value={newDevice.ipAddress}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, ipAddress: e.target.value })
                  }
                  className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none'
                />
              </div>
              <div className='flex justify-end gap-3 mt-6'>
                <button
                  type='button'
                  onClick={() => setIsModalOpen(false)}
                  className='px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium'
                >
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
