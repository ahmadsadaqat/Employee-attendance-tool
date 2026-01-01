
import React from 'react';
import { AppSettings } from '../types';
import { Save, Database, Loader2 } from 'lucide-react';
import { RetentionManager } from './RetentionLogic';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = React.useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage('');

    try {
        // Save settings state locally/parent
        onSave(formData);

        // Execute cleanup logic using the imported component logic
        const deleted = await RetentionManager.runCleanup(formData.retentionDays);

        setStatusMessage(`Settings saved. Cleanup executed: ${deleted} old records deleted.`);
    } catch (error) {
        console.error(error);
        setStatusMessage('Failed to execute cleanup.');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">System Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure system preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Data Management */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2">
            <Database className="text-teal-600 dark:text-teal-400" size={18} />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Data Retention</h3>
          </div>
          <div className="p-6">
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Local Log Retention (Days)</label>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                 Attendance logs older than this limit will be automatically deleted from this computer to save space.
             </p>
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

        <div className="flex items-center justify-between pt-4">
           {statusMessage && (
               <p className={`text-sm ${statusMessage.includes('Failed') ? 'text-red-500' : 'text-emerald-600'}`}>
                   {statusMessage}
               </p>
           )}
           <div className="flex-1"></div>
           <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Saving & Cleaning...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
