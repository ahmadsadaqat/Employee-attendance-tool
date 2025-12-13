import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, X, Search, RefreshCw, ArrowRight } from 'lucide-react';

interface ImportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string, newRecordsCount: number) => void;
}

export const ImportFilterModal: React.FC<ImportFilterModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState<'DATE_SELECT' | 'SCANNING' | 'REVIEW'>('DATE_SELECT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scanStats, setScanStats] = useState({ total: 0, duplicates: 0, new: 0 });

  if (!isOpen) return null;

  const handleScan = () => {
    if (!startDate || !endDate) return;
    setStep('SCANNING');
    
    // Simulate API scan delay
    setTimeout(() => {
      // Mock logic: generate random stats based on "scan"
      const total = Math.floor(Math.random() * 50) + 20;
      const duplicates = Math.floor(total * 0.3); // 30% duplicates
      const newRecs = total - duplicates;
      
      setScanStats({ total, duplicates, new: newRecs });
      setStep('REVIEW');
    }, 2000);
  };

  const handleConfirm = () => {
    onConfirm(startDate, endDate, scanStats.new);
    handleClose();
  };

  const handleClose = () => {
    setStep('DATE_SELECT');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
           <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
             <Download size={18} className="text-teal-600 dark:text-teal-400" />
             Force Import Logs
           </h3>
           <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
             <X size={20} />
           </button>
        </div>

        <div className="p-6">
          {step === 'DATE_SELECT' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select a date range to fetch missing logs from biometric devices. The system will automatically filter out duplicates before importing.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">From Date</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">To Date</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleScan}
                  disabled={!startDate || !endDate}
                  className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Search size={18} />
                  Scan for Records
                </button>
              </div>
            </div>
          )}

          {step === 'SCANNING' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
               <RefreshCw size={40} className="text-teal-600 animate-spin" />
               <div className="text-center">
                 <h4 className="font-semibold text-slate-800 dark:text-slate-100">Scanning Databases...</h4>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Comparing local logs with device records</p>
               </div>
            </div>
          )}

          {step === 'REVIEW' && (
            <div className="space-y-5 animate-fade-in">
               <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 dark:border-slate-600">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Records Found</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{scanStats.total}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm text-amber-600 dark:text-amber-400">
                       <span className="flex items-center gap-2"><AlertCircle size={14} /> Duplicates (Skipped)</span>
                       <span className="font-medium">{scanStats.duplicates}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                       <span className="flex items-center gap-2"><CheckCircle2 size={14} /> New Records</span>
                       <span className="font-bold">{scanStats.new}</span>
                    </div>
                  </div>
               </div>
               
               <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                 {scanStats.new} new records will be imported and queued for ERP sync.
               </p>

               <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => setStep('DATE_SELECT')}
                   className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                 >
                   Back
                 </button>
                 <button 
                   onClick={handleConfirm}
                   className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                 >
                   Confirm Import <ArrowRight size={16} />
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};