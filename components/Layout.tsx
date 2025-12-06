import React, { ReactNode } from 'react';
import { ShieldAlert, Terminal, Activity } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'advisor' | 'config';
  onTabChange: (tab: 'advisor' | 'config') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500">
              Gemini FairLens: AI Credit Suitability Copilot
            </h1>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => onTabChange('advisor')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'advisor'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Suitability Check
            </button>
            <button
              onClick={() => onTabChange('config')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'config'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Configure Products (Demo)
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      {/* Footer / Disclaimer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Prototype Disclaimer</h3>
              <p className="text-xs leading-relaxed">
                This tool is a prototype decision-support assistant for exploring financial product suitability using AI. 
                It does <strong>not</strong> provide financial advice, does <strong>not</strong> make binding credit decisions, 
                and should <strong>not</strong> be used in production or as a substitute for regulatory-compliant risk systems. 
                All outputs must be reviewed by qualified professionals.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;