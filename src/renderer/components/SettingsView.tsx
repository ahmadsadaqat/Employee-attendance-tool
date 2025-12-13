
import React from 'react';
import { AppSettings } from '../types';
import { Save, Server, Bell, Shield, Database, Moon } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = React.useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">System Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure ERP integration and system preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
         {/* Theme Settings */}
         <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2">
            <Moon className="text-teal-600 dark:text-teal-400" size={18} />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Appearance</h3>
          </div>
          <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Dark Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Switch between light and dark themes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.darkMode}
                  onChange={e => setFormData({...formData, darkMode: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
        </div>

        {/* ERP Integration Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2">
            <Server className="text-teal-600 dark:text-teal-400" size={18} />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">ERP Integration</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ERP API Endpoint</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm">https://</span>
                <input 
                  type="text" 
                  value={formData.erpEndpoint.replace('https://', '')}
                  onChange={e => setFormData({...formData, erpEndpoint: `https://${e.target.value}`})}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-r-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm font-mono"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sync Interval (Minutes)</label>
                <input 
                  type="number" 
                  value={formData.syncIntervalMinutes}
                  onChange={e => setFormData({...formData, syncIntervalMinutes: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="flex items-center h-full pt-6">
                 <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={formData.autoSync}
                        onChange={e => setFormData({...formData, autoSync: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-sync with ERP</span>
                 </label>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications & Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2">
            <Bell className="text-teal-600 dark:text-teal-400" size={18} />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Alerts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receive emails for critical device failures</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.emailNotifications}
                  onChange={e => setFormData({...formData, emailNotifications: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Alert Sensitivity Threshold</label>
              <div className="flex gap-4">
                {['LOW', 'MEDIUM', 'HIGH'].map((level) => (
                  <label key={level} className={`
                    flex-1 flex items-center justify-center px-4 py-2 border rounded-lg cursor-pointer text-sm font-medium transition-colors
                    ${formData.alertThreshold === level 
                      ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}
                  `}>
                    <input 
                      type="radio" 
                      name="threshold" 
                      value={level}
                      checked={formData.alertThreshold === level}
                      onChange={e => setFormData({...formData, alertThreshold: e.target.value as any})}
                      className="sr-only"
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2">
            <Database className="text-teal-600 dark:text-teal-400" size={18} />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Data Retention</h3>
          </div>
          <div className="p-6">
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Local Log Retention (Days)</label>
             <input 
                type="range" 
                min="7" 
                max="365" 
                value={formData.retentionDays}
                onChange={e => setFormData({...formData, retentionDays: parseInt(e.target.value)})}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
             />
             <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
               <span>7 Days</span>
               <span className="font-bold text-teal-700 dark:text-teal-400">{formData.retentionDays} Days</span>
               <span>365 Days</span>
             </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium"
          >
            <Save size={18} />
            {isSaved ? 'Changes Saved!' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
