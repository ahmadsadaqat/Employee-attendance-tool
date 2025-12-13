
import React from 'react';
import { User } from '../types';
import { LogOut, User as UserIcon, Shield, Clock, Camera, History, FileText, Settings, RefreshCw } from 'lucide-react';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

// Mock Activity Data
const mockActivities = [
  { id: 1, action: 'User Login', description: 'Successful login from IP 192.168.1.10', time: 'Just now', icon: LogOut },
  { id: 2, action: 'Manual Sync', description: 'Forced device sync for "Main Entrance"', time: '2 hours ago', icon: RefreshCw },
  { id: 3, action: 'Data Export', description: 'Downloaded access logs CSV', time: 'Yesterday, 4:30 PM', icon: FileText },
  { id: 4, action: 'System Update', description: 'Updated global retention settings', time: '3 days ago', icon: Settings },
  { id: 5, action: 'User Login', description: 'Successful login from IP 192.168.1.10', time: '3 days ago', icon: LogOut },
];

export const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">User Profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account settings and view activity</p>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-teal-500 to-emerald-600 relative">
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <div className="px-8 pb-6">
          <div className="relative flex justify-between items-end -mt-12 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 overflow-hidden bg-slate-200">
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 p-1.5 bg-slate-800 text-white rounded-full border-2 border-white dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={14} />
              </button>
            </div>
            
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-900/30 shadow-sm"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <Shield size={14} className="text-teal-500" />
                {user.role}
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Details Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
                <UserIcon size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Account Details</h3>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={user.name} 
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input 
                    type="text" 
                    value={user.email} 
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">User ID</label>
                  <input 
                    type="text" 
                    value={user.id} 
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Role</label>
                  <input 
                    type="text" 
                    value={user.role} 
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-center text-slate-400 dark:text-slate-500 italic">
                  Authentication is managed by the NEXO ERP. Please contact your system administrator to update credentials.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity History Column */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <History size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Activity History</h3>
            </div>

            <div className="relative space-y-6 pl-2">
              {/* Timeline Line */}
              <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-slate-100 dark:bg-slate-700"></div>

              {mockActivities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4 group">
                  {/* Timeline Dot */}
                  <div className={`
                    relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shrink-0
                    ${index === 0 ? 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}
                  `}>
                    <activity.icon size={14} />
                  </div>

                  <div className="pt-1.5 pb-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {activity.action}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <Clock size={10} />
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
              
              <button className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors mt-4">
                View Full Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
