
import React from 'react';

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-3">
      {/* Icon Graphic mimicking the bars in the user image */}
      <div className="flex items-end gap-1 h-8">
        <div className="w-1.5 h-4 bg-teal-600 rounded-sm"></div>
        <div className="w-1.5 h-6 bg-teal-600 rounded-sm"></div>
        <div className="w-1.5 h-8 bg-teal-600 rounded-sm"></div>
        <div className="w-1.5 h-5 bg-teal-600 rounded-sm"></div>
      </div>
      <div className="flex gap-2 font-bold text-xl tracking-widest text-slate-800 dark:text-slate-100">
        <span>NEXO</span>
        <span className="font-normal text-slate-500 dark:text-slate-400">ERP</span>
      </div>
    </div>
  );
};
