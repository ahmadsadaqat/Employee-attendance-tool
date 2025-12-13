
import React from 'react';
import { CheckInRecord } from '../types';
import { Clock, MapPin, LogIn, LogOut } from 'lucide-react';

interface RecentTableProps {
  data: CheckInRecord[];
}

export const RecentTable: React.FC<RecentTableProps> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Live Biometric Feed</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Real-time entry & exit logs</p>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 border border-teal-100 dark:border-teal-900 text-teal-700 dark:text-teal-400 rounded-full text-[10px] font-bold shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          LIVE
        </span>
      </div>
      <div className="overflow-y-auto max-h-[400px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Employee</th>
              <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Location</th>
              <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Time</th>
              <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Clock size={24} className="text-slate-300 dark:text-slate-600" />
                    <p>No recent logs.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={record.avatar} alt={record.employeeName} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{record.employeeName}</div>
                        <div className="text-[10px] font-mono text-slate-400">ID: {record.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-xs">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="font-medium">{record.location}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs font-mono">
                     {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-tight w-24 justify-center
                      ${record.type === 'CHECK_IN' 
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800' 
                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                      }`}>
                      {record.type === 'CHECK_IN' ? <LogIn size={10} /> : <LogOut size={10} />}
                      {record.type === 'CHECK_IN' ? 'CHECK IN' : 'CHECK OUT'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/20 text-center mt-auto">
        <button className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:text-teal-700 dark:hover:text-teal-300 uppercase tracking-wide">View Full History</button>
      </div>
    </div>
  );
};
