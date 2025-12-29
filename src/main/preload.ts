import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getStats: () => ipcRenderer.invoke('db:get-stats'),
  testDevice: (ip: string, port: number) =>
    ipcRenderer.invoke('device:test', { ip, port }),
  addDevice: (
    name: string,
    ip: string,
    port: number,
    opts?: { commKey?: string; useUdp?: boolean }
  ) => ipcRenderer.invoke('device:add', { name, ip, port, ...(opts || {}) }),
  listDevices: () => ipcRenderer.invoke('device:list'),
  removeDevice: (id: number) => ipcRenderer.invoke('device:remove', id),
  fetchLogs: (
    ip: string,
    port?: number,
    name?: string,
    commKey?: string,
    useUdp?: boolean
  ) =>
    ipcRenderer.invoke('device:fetchLogs', { ip, port, name, commKey, useUdp }),
  listAttendance: (limit?: number) =>
    ipcRenderer.invoke('attendance:list', { limit }),
  listAttendanceByDevice: (deviceId: number, limit?: number) =>
    ipcRenderer.invoke('attendance:listByDevice', { deviceId, limit }),
  listUnsyncedAttendance: () => ipcRenderer.invoke('attendance:unsynced'),
  markAttendanceSynced: (ids: number[]) =>
    ipcRenderer.invoke('attendance:markSynced', ids),
  runSync: () => ipcRenderer.invoke('sync:run'),
  setCredentials: (baseUrl: string, auth: any) =>
    ipcRenderer.invoke('credentials:set', { baseUrl, auth }),
  getCredentials: () => ipcRenderer.invoke('credentials:get'),
  login: (url: string, username: string, password: string) =>
    ipcRenderer.invoke('auth:login', { url, username, password }),
  loginWithToken: (url: string, apiKey: string, apiSecret: string) =>
    ipcRenderer.invoke('auth:login-token', { url, apiKey, apiSecret }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getNetworkStatus: () => ipcRenderer.invoke('network:status'),
  log: (level: string, ...args: any[]) => ipcRenderer.send('log', level, ...args)
})
