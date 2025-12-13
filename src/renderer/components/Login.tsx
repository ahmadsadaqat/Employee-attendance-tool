
import React, { useState } from 'react';
import { Logo } from './Logo';
import { Mail, Lock, ArrowRight, AlertCircle, Globe } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, url: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [url, setUrl] = useState('https://api.nexo-erp.com');
  const [email, setEmail] = useState('admin@nexo.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      if (email && password.length > 3 && url) {
        onLogin(email, url);
      } else {
        setError('Invalid credentials or missing Server URL. Please try again.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header Section */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Sign in to access the control panel</p>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ERP Server URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe size={18} className="text-slate-400" />
                </div>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all sm:text-sm font-mono"
                  placeholder="https://api.client-erp.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 dark:text-slate-400">
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              By signing in, you agree to our <a href="#" className="underline hover:text-slate-800 dark:hover:text-slate-200">Terms of Service</a> and <a href="#" className="underline hover:text-slate-800 dark:hover:text-slate-200">Privacy Policy</a>.
            </p>
          </div>
        </div>
        
        {/* Footer decoration */}
        <div className="bg-slate-50 dark:bg-slate-700/50 py-3 px-8 border-t border-slate-100 dark:border-slate-700 flex justify-center gap-4">
           <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
           <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
           <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
        </div>
      </div>
    </div>
  );
};
