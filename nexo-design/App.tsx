
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Menu,
  Search,
  Bell,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Activity,
  Laptop,
  Fingerprint,
  CreditCard,
  Download
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { RecentTable } from './components/RecentTable';
import { DeviceManager } from './components/DeviceManager';
import { EmployeeList } from './components/EmployeeList';
import { AccessLogList } from './components/AccessLogList';
import { SettingsView } from './components/SettingsView';
import { AlertsModal } from './components/AlertsModal';
import { CheckInToast } from './components/CheckInToast';
import { ImportFilterModal } from './components/ImportFilterModal';
import { Login } from './components/Login';
import { UserProfile } from './components/UserProfile';
import { AccessType, CheckInRecord, DailyStats, Device, Employee, AppSettings, SystemAlert, User } from './types';

// Mock Data Generators
const generateSingleCheckIn = (synced: boolean = false): CheckInRecord => {
  const names = ["Alice Johnson", "Bob Smith", "Charlie Brown", "Diana Prince", "Evan Wright", "Fiona Green", "George Hill"];
  const depts = ["Engineering", "Sales", "HR", "Marketing", "Operations"];
  const devicesAndLocs = [
    { device: "Main Entrance Bio-1", location: "Main Lobby" },
    { device: "Lobby Turnstile", location: "Lobby North" },
    { device: "Warehouse Gate A", location: "Loading Dock" },
    { device: "Server Room Bio", location: "Server Room" },
  ];
  
  const i = Math.floor(Math.random() * names.length);
  const devInfo = devicesAndLocs[Math.floor(Math.random() * devicesAndLocs.length)];

  return {
    id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    employeeId: `EMP-${1000 + i}`,
    employeeName: names[i],
    department: depts[i % depts.length],
    avatar: `https://picsum.photos/seed/${i + 205}/100/100`,
    timestamp: new Date().toISOString(),
    device: devInfo.device,
    location: devInfo.location,
    type: Math.random() > 0.4 ? 'CHECK_IN' : 'CHECK_OUT' as AccessType,
    syncedToErp: synced, 
  };
};

const generateMockCheckIns = (count: number): CheckInRecord[] => {
   return Array.from({ length: count }).map((_, idx) => {
       const rec = generateSingleCheckIn(Math.random() > 0.1);
       // Adjust timestamps for history
       rec.timestamp = new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString();
       return rec;
   }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const mockEmployees: Employee[] = [
  { id: '1', employeeId: 'EMP-1000', name: 'Alice Johnson', role: 'Senior Engineer', department: 'Engineering', shiftName: 'Standard Day', shiftStart: '09:00', shiftEnd: '17:00', avatar: 'https://picsum.photos/seed/205/100/100', status: 'ACTIVE' },
  { id: '2', employeeId: 'EMP-1001', name: 'Bob Smith', role: 'Sales Manager', department: 'Sales', shiftName: 'Standard Day', shiftStart: '09:00', shiftEnd: '17:00', avatar: 'https://picsum.photos/seed/206/100/100', status: 'ACTIVE' },
  { id: '3', employeeId: 'EMP-1002', name: 'Charlie Brown', role: 'Warehouse Lead', department: 'Operations', shiftName: 'Early Bird', shiftStart: '06:00', shiftEnd: '14:00', avatar: 'https://picsum.photos/seed/207/100/100', status: 'ACTIVE' },
  { id: '4', employeeId: 'EMP-1003', name: 'Diana Prince', role: 'HR Specialist', department: 'HR', shiftName: 'Standard Day', shiftStart: '08:30', shiftEnd: '16:30', avatar: 'https://picsum.photos/seed/208/100/100', status: 'ON_LEAVE' },
  { id: '5', employeeId: 'EMP-1004', name: 'Evan Wright', role: 'Marketing Lead', department: 'Marketing', shiftName: 'Standard Day', shiftStart: '09:00', shiftEnd: '17:00', avatar: 'https://picsum.photos/seed/209/100/100', status: 'ACTIVE' },
];

const mockDevices: Device[] = [
  { id: 'd1', name: 'Main Entrance Bio-1', location: 'Lobby', status: 'ONLINE', lastPing: 'Just now', type: 'BIOMETRIC', ipAddress: '192.168.1.10', port: '4370' },
  { id: 'd2', name: 'Warehouse Gate A', location: 'Zone B', status: 'ONLINE', lastPing: '2s ago', type: 'RFID', ipAddress: '192.168.1.12', port: '8080' },
  { id: 'd3', name: 'Server Room Bio', location: 'Secure Zone', status: 'MAINTENANCE', lastPing: '2h ago', type: 'BIOMETRIC', ipAddress: '192.168.1.15', port: '4370' },
  { id: 'd4', name: 'Parking Barrier', location: 'B1', status: 'OFFLINE', lastPing: '5m ago', type: 'GATE', ipAddress: '192.168.1.20', port: '80' },
];

const mockAlerts: SystemAlert[] = [
  { id: 'a1', severity: 'CRITICAL', message: "Device 'Parking Barrier' is OFFLINE", source: 'System Monitor', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 'a2', severity: 'WARNING', message: "High latency detected on Warehouse Gate A", source: 'Network', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
];

const chartData = [
  { time: '06:00', count: 2 },
  { time: '07:00', count: 15 },
  { time: '08:00', count: 85 },
  { time: '09:00', count: 124 },
  { time: '10:00', count: 132 },
  { time: '11:00', count: 135 },
  { time: '12:00', count: 135 },
];

function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  
  // App State
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [alerts, setAlerts] = useState<SystemAlert[]>(mockAlerts);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInRecord | null>(null);

  const [stats, setStats] = useState<DailyStats>({
    totalEmployees: 150,
    exceptions: mockAlerts.length,
    uptime: 98.5
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    erpEndpoint: 'https://api.nexo-erp.com/v1/sync',
    syncIntervalMinutes: 15,
    autoSync: true,
    emailNotifications: true,
    alertThreshold: 'MEDIUM',
    darkMode: false,
    retentionDays: 30
  });

  // Apply Dark Mode
  useEffect(() => {
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings.darkMode]);

  // Initial Data Load
  useEffect(() => {
    if (currentUser) {
       handleForceFetchDevices();
    }
  }, [currentUser]);

  // SIMULATION: Real-time traffic & Background Sync
  useEffect(() => {
    if (!currentUser) return;

    // Generate a new check-in every 10-20 seconds to simulate live traffic
    const interval = setInterval(() => {
        const newRecord = generateSingleCheckIn(true); // Synced immediately
        
        // 1. Add to local list
        setCheckIns(prev => [newRecord, ...prev]);
        
        // 2. Trigger Welcome Popup
        setLastCheckIn(newRecord);
        
        // 3. Update stats slightly
        setStats(prev => ({
            ...prev,
            uptime: Math.min(100, prev.uptime + 0.01)
        }));

    }, 12000); 

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogin = (email: string, url: string) => {
    setCurrentUser({
      id: 'usr-1',
      name: 'John Doe',
      email: email,
      role: 'System Administrator',
      avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
      lastLogin: new Date().toISOString()
    });
    
    // Update settings with the client-specific URL
    setAppSettings(prev => ({
        ...prev,
        erpEndpoint: url
    }));

    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const addNotification = (message: string, severity: SystemAlert['severity'], source: string = 'System') => {
    const newAlert: SystemAlert = {
      id: Date.now().toString(),
      message,
      severity,
      source,
      timestamp: new Date().toISOString()
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleForceFetchDevices = () => {
    setIsLoading(true);
    // Simulate fetching from devices (Adding recent logs)
    setTimeout(() => {
      const newCheckIns = generateMockCheckIns(5); // Fetch last 5 logs from devices
      const merged = [...newCheckIns, ...checkIns].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setCheckIns(merged);
      setIsLoading(false);
      addNotification("Successfully fetched logs from 4 connected devices", 'SUCCESS', 'Device Sync');
    }, 1500);
  };

  const handleImportConfirm = (start: string, end: string, count: number) => {
    setIsLoading(true);
    setTimeout(() => {
        const imported = generateMockCheckIns(count);
        // Mark them as not synced yet to simulate import flow
        const withSyncState = imported.map(r => ({...r, syncedToErp: false}));
        setCheckIns(prev => [...withSyncState, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setIsLoading(false);
        addNotification(`Imported ${count} logs from devices (${start} to ${end})`, 'SUCCESS', 'Manual Import');
    }, 1000);
  };

  const handleAddDevice = (device: Device) => {
    setDevices([...devices, device]);
    addNotification(`New device '${device.name}' added successfully`, 'SUCCESS', 'Device Manager');
  };

  const handleDeleteDevice = (id: string) => {
    const device = devices.find(d => d.id === id);
    setDevices(devices.filter(d => d.id !== id));
    addNotification(`Device '${device?.name || 'Unknown'}' removed`, 'INFO', 'Device Manager');
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    addNotification('System configuration saved successfully', 'SUCCESS', 'Settings');
  };

  // Renamed to Force Fetch based on requirements
  const handleManualImport = () => {
    handleForceFetchDevices();
  };

  // "Import" button logic - Sends to ERP
  const handleForcePushToERP = () => {
      setIsLoading(true);
      setTimeout(() => {
          const pendingCount = checkIns.filter(c => !c.syncedToErp).length;
          setCheckIns(prev => prev.map(c => ({...c, syncedToErp: true})));
          setIsLoading(false);
          addNotification(`Successfully pushed ${pendingCount} records to ERP System`, 'SUCCESS', 'ERP Integration');
      }, 1500);
  };

  const handleClearAlerts = () => {
      setAlerts([]);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch(currentView) {
      case 'employees':
        return <EmployeeList employees={mockEmployees} />;
      case 'devices':
        return <DeviceManager devices={devices} onAddDevice={handleAddDevice} onDeleteDevice={handleDeleteDevice} />;
      case 'logs':
        // Rewired props to match the new "Fetch" and "Push" buttons
        return <AccessLogList logs={checkIns} onImport={handleManualImport} onSync={handleForcePushToERP} />;
      case 'settings':
        return <SettingsView settings={appSettings} onSave={handleSaveSettings} />;
      case 'profile':
        return <UserProfile user={currentUser} onLogout={handleLogout} />;
      case 'dashboard':
      default:
        return (
          <>
            {/* Top Control Bar & Minimized Stats */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
              <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                 <div className="flex-1 sm:flex-initial">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                      </span>
                      <span className="text-sm font-medium text-teal-700 dark:text-teal-400">System Operational</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Real-time sync active</p>
                 </div>
                 
                 {/* Minimal Stats */}
                 <div className="flex gap-3">
                    <StatCard 
                      label="Active Alerts" 
                      value={alerts.length} 
                      icon={AlertCircle} 
                      colorClass={alerts.some(a => a.severity === 'CRITICAL') ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}
                      bgClass={alerts.some(a => a.severity === 'CRITICAL') ? "bg-red-50 dark:bg-red-900/30" : "bg-blue-50 dark:bg-blue-900/30"}
                      compact={true}
                      onClick={() => setIsAlertsModalOpen(true)}
                    />
                    <StatCard 
                      label="Uptime" 
                      value={`${stats.uptime.toFixed(1)}%`} 
                      icon={CheckCircle2} 
                      colorClass="text-blue-600 dark:text-blue-400" 
                      bgClass="bg-blue-50 dark:bg-blue-900/30"
                      compact={true}
                    />
                 </div>
              </div>

              {/* Action Buttons: Side by Side on Right */}
              <div className="flex flex-row gap-3 w-full xl:w-auto justify-end">
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap"
                >
                  <Download size={16} />
                  Force Import
                </button>
                <button 
                  onClick={handleForceFetchDevices}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 shadow-sm shadow-teal-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap"
                >
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                  Sync Devices
                </button>
              </div>
            </div>

            {/* Device Status Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Connected Devices</h3>
                <button 
                  onClick={() => setCurrentView('devices')}
                  className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:underline"
                >
                  Manage Devices
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {devices.map((device) => (
                  <div key={device.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-lg ${
                        device.status === 'ONLINE' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        device.status === 'OFFLINE' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {device.type === 'BIOMETRIC' ? <Fingerprint size={20} /> : 
                         device.type === 'RFID' ? <CreditCard size={20} /> : <Laptop size={20} />}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${
                        device.status === 'ONLINE' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' :
                        device.status === 'OFFLINE' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                      }`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${
                            device.status === 'ONLINE' ? 'bg-green-500' :
                            device.status === 'OFFLINE' ? 'bg-red-500' : 'bg-amber-500'
                         }`}></div>
                         {device.status}
                      </div>
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{device.name}</h4>
                       <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{device.location}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-mono">
                       <span className="flex items-center gap-1"><Wifi size={10} /> {device.ipAddress}:{device.port}</span>
                       <span>{device.lastPing}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chart Section - Minimal Height */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Traffic Volume</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Entry/Exit events per hour</p>
                  </div>
                  <div className="flex gap-2">
                    <select className="text-xs border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1.5 text-slate-600 dark:text-slate-300 focus:outline-none">
                      <option>Today</option>
                      <option>Yesterday</option>
                    </select>
                  </div>
                </div>
                {/* Reduced height to 200px for minimal look */}
                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={appSettings.darkMode ? "#334155" : "#f1f5f9"} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: appSettings.darkMode ? '#1e293b' : '#fff', 
                          borderRadius: '8px', 
                          border: appSettings.darkMode ? '1px solid #334155' : '1px solid #e2e8f0', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          color: appSettings.darkMode ? '#f8fafc' : '#1e293b'
                        }}
                        cursor={{ stroke: '#0d9488', strokeWidth: 1 }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Check-ins */}
              <div className="lg:col-span-1">
                <RecentTable data={checkIns} />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        currentUser={currentUser}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 lg:px-8 z-10 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {currentView === 'dashboard' ? 'Access Control Dashboard' : 
                 currentView === 'devices' ? 'Device Management' : 
                 currentView === 'employees' ? 'Employee Directory' : 
                 currentView === 'logs' ? 'Access Logs' : 
                 currentView === 'profile' ? 'My Profile' : 'System Configuration'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Security Operations Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm w-72 bg-slate-50 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <button 
              onClick={() => setIsAlertsModalOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg relative transition-colors"
            >
              <Bell size={20} />
              {alerts.length > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {renderContent()}
        </main>
      </div>

      <CheckInToast 
        data={lastCheckIn} 
        onClose={() => setLastCheckIn(null)} 
      />

      <AlertsModal 
        isOpen={isAlertsModalOpen} 
        onClose={() => setIsAlertsModalOpen(false)} 
        alerts={alerts}
        onClearAll={handleClearAlerts}
      />

      <ImportFilterModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={handleImportConfirm}
      />
    </div>
  );
}

export default App;
