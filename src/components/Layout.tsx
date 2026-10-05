import React from 'react';
import { Terminal, Shield, BookOpen, Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ToastContainer from './ToastContainer';

interface LayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  onNavigate?: (path: string) => void; // Used in non-router state
}

export default function Layout({ children, currentPath = '/', onNavigate }: LayoutProps) {
  // Navigation tabs helper
  const navItems = [
    { label: 'Dashboard', path: '/', icon: Terminal },
    { label: 'API Demo', path: '/api-demo', icon: Shield },
    { label: 'Docs & Guides', path: '/docs', icon: BookOpen },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200">
      {/* Premium glow indicators */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-10 right-1/4 w-[300px] h-[300px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100 text-lg">
                Vite<span className="text-indigo-500 font-medium">Kit</span>
              </span>
            </div>

            {/* Main Navigation (Used when onNavigate callback is supplied, e.g. non-router SPA tabs) */}
            {onNavigate && (
              <nav className="hidden md:flex items-center gap-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => onNavigate(item.path)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${isActive
                          ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="GitHub Repository"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Sticky footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Open Source MIT License.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* Toast notifications container */}
      <ToastContainer />
    </div>
  );
}
