
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  compact?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, value, icon: Icon, colorClass, bgClass, compact = false, onClick
}) => {
  const containerClasses = onClick 
    ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors active:scale-95 transform transition-transform" 
    : "";

  if (compact) {
    return (
      <div 
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 px-5 py-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between ${containerClasses}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgClass}`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
          </div>
          <div>
             <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</h3>
             <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-start justify-between ${containerClasses}`}
    >
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
    </div>
  );
};
