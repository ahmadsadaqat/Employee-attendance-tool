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
  runSync: () => ipcRenderer.invoke('sync:run'),
  setCredentials: (baseUrl: string, auth: any) =>
    ipcRenderer.invoke('credentials:set', { baseUrl, auth }),
  getCredentials: () => ipcRenderer.invoke('credentials:get'),
  getNetworkStatus: () => ipcRenderer.invoke('network:status'),
})
