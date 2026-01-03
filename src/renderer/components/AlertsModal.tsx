
import React from 'react';
import { SystemAlert } from '../types';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle2, Bell } from 'lucide-react';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SystemAlert[];
  onClearAll: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ isOpen, onClose, alerts, onClearAll }) => {
  // Use a transition effect for the drawer
  const drawerClasses = isOpen
    ? "translate-x-0"
    : "translate-x-full";

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${drawerClasses}`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Bell className="text-slate-600 dark:text-slate-300" size={20} />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Notifications</h3>
              <span className="bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
            </div>
            <div className="flex gap-2">
                {alerts.length > 0 && (
                    <button
                        onClick={onClearAll}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-medium px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Clear All
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                >
                    <X size={20} />
                </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 px-4 text-center">
                 <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
                    <Bell size={24} className="text-slate-300 dark:text-slate-500" />
                 </div>
                 <p className="font-medium text-slate-600 dark:text-slate-400">No new notifications</p>
                 <p className="text-xs">We'll notify you when something important happens.</p>
               </div>
            ) : (
              alerts.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border flex gap-3 animate-fade-in ${
                    alert.severity === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900' :
                    alert.severity === 'WARNING' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900' :
                    alert.severity === 'SUCCESS' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900' :
                    'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {alert.severity === 'CRITICAL' && <AlertTriangle className="text-red-600 dark:text-red-400" size={18} />}
                    {alert.severity === 'WARNING' && <AlertCircle className="text-amber-600 dark:text-amber-400" size={18} />}
                    {alert.severity === 'INFO' && <Info className="text-blue-600 dark:text-blue-400" size={18} />}
                    {alert.severity === 'SUCCESS' && <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className={`text-sm font-semibold pr-2 ${
                          alert.severity === 'CRITICAL' ? 'text-red-800 dark:text-red-200' :
                          alert.severity === 'WARNING' ? 'text-amber-800 dark:text-amber-200' :
                          alert.severity === 'SUCCESS' ? 'text-emerald-800 dark:text-emerald-200' :
                          'text-slate-800 dark:text-slate-200'
                      }`}>{alert.message}</p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                        {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{alert.source}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};
