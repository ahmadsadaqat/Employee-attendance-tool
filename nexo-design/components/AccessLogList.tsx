
import React, { useRef } from 'react';
import { CheckInRecord } from '../types';
import { LogIn, LogOut, MapPin, TabletSmartphone, CloudUpload, RefreshCw, FileDown, CheckCircle2, Clock } from 'lucide-react';

interface AccessLogListProps {
  logs: CheckInRecord[];
  onImport: () => void;
  onSync: () => void;
}

export const AccessLogList: React.FC<AccessLogListProps> = ({ logs, onImport, onSync }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Logic for CSV upload if needed separate from the main sync
      // For now we just use the onSync prop for the "Push to ERP" button
      // and keep this for manual CSV uploads
      console.log("File selected");
    }
  };

  const handleExportCSV = () => {
    // Define headers
    const headers = ['ID', 'Employee Name', 'Employee ID', 'Department', 'Timestamp', 'Device', 'Location', 'Type', 'Synced'];
    
    // Map data to rows
    const rows = logs.map(log => [
      log.id,
      log.employeeName,
      log.employeeId,
      log.department,
      new Date(log.timestamp).toLocaleString(),
      log.device,
      log.location,
      log.type,
      log.syncedToErp ? 'Yes' : 'No'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')) // Escape cells with quotes
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `access_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingCount = logs.filter(l => !l.syncedToErp).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Access Logs</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Comprehensive history of biometric events</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Hidden File Input for CSV (Optional usage) */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv,.xlsx" 
            onChange={handleFileChange}
          />
          
          <button 
            onClick={onImport} // Reusing onImport prop for Fetch Logic based on parent binding, but component UI shows "Fetch"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw size={16} />
            Fetch from Devices
          </button>

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <FileDown size={16} />
            Export CSV
          </button>

          <button 
            onClick={onSync} // Reusing onSync prop for "Push to ERP"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <CloudUpload size={16} />
            Push to ERP
            {pendingCount > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs ml-1">{pendingCount}</span>}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Access Point</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">ERP Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                    No logs found. Waiting for device activity...
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={log.avatar} alt={log.employeeName} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" />
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{log.employeeName}</div>
                          <div className="text-xs text-slate-400">{log.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <MapPin size={14} className="text-slate-400" />
                            {log.location}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <TabletSmartphone size={12} />
                            {log.device}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border uppercase tracking-wide
                        ${log.type === 'CHECK_IN' 
                          ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800' 
                          : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                        }`}>
                        {log.type === 'CHECK_IN' ? <LogIn size={12} /> : <LogOut size={12} />}
                        {log.type === 'CHECK_IN' ? 'CHECK IN' : 'CHECK OUT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.syncedToErp ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={14} />
                          Synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                          <Clock size={14} className="animate-pulse" />
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
    </div>
  );
};
