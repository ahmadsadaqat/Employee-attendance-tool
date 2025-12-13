
import React from 'react';
import { Employee } from '../types';
import { Clock, Calendar, Mail } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees }) => {
  return (
    <div className="space-y-6">
       <div>
           <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Employees</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Personnel directory and shift assignments</p>
       </div>

       <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
         <table className="w-full text-left text-sm">
           <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
             <tr>
               <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Employee</th>
               <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Department</th>
               <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Shift Details</th>
               <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
             {employees.map((emp) => (
               <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                 <td className="px-6 py-4">
                   <div className="flex items-center gap-4">
                     <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
                     <div>
                       <div className="font-bold text-slate-800 dark:text-slate-200">{emp.name}</div>
                       <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                         <Mail size={12} /> {emp.employeeId}
                       </div>
                     </div>
                   </div>
                 </td>
                 <td className="px-6 py-4">
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                     {emp.department}
                   </span>
                   <div className="text-xs text-slate-400 mt-1">{emp.role}</div>
                 </td>
                 <td className="px-6 py-4">
                   <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                       <Calendar size={14} className="text-teal-500" />
                       {emp.shiftName}
                     </div>
                     <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                       <Clock size={12} />
                       {emp.shiftStart} - {emp.shiftEnd}
                     </div>
                   </div>
                 </td>
                 <td className="px-6 py-4">
                   <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                     emp.status === 'ACTIVE' 
                       ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
                       : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600'
                   }`}>
                     <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                     {emp.status}
                   </span>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
    </div>
  );
};
