
import React, { useEffect, useState } from 'react';
import { CheckInRecord } from '../types';
import { LogIn, LogOut, MapPin, X } from 'lucide-react';

interface CheckInToastProps {
  data: CheckInRecord | null;
  onClose: () => void;
}

export const CheckInToast: React.FC<CheckInToastProps> = ({ data, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (data) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [data, onClose]);

  if (!data) return null;

  return (
    <div 
      className={`fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
      }`}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-96 relative overflow-hidden">
        {/* Accent Bar */}
        <div className={`absolute top-0 left-0 bottom-0 w-2 ${data.type === 'CHECK_IN' ? 'bg-teal-500' : 'bg-indigo-500'}`}></div>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={20} />
        </button>

        <div className="flex gap-5 pl-2 items-center">
          <img 
            src={data.avatar} 
            alt={data.employeeName} 
            className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-md" 
          />
          <div className="flex-1">
             <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
               {data.type === 'CHECK_IN' ? 'Welcome Back!' : 'See You Later!'}
             </h4>
             <p className="font-semibold text-teal-600 dark:text-teal-400 text-lg leading-tight mt-1">
               {data.employeeName}
             </p>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5">
               {data.employeeId}
             </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-sm">
           <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
             <MapPin size={14} className="text-slate-400" />
             {data.location}
           </div>
           <div className={`flex items-center gap-1.5 font-bold ${data.type === 'CHECK_IN' ? 'text-teal-600 dark:text-teal-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {data.type === 'CHECK_IN' ? <LogIn size={14} /> : <LogOut size={14} />}
              {data.type === 'CHECK_IN' ? 'CHECK IN' : 'CHECK OUT'}
           </div>
        </div>
        
        <div className="absolute top-[-10px] right-[-10px] p-2 opacity-5 pointer-events-none">
           {data.type === 'CHECK_IN' ? <LogIn size={120} /> : <LogOut size={120} />}
        </div>
      </div>
    </div>
  );
};
