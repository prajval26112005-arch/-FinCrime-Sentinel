'use client';

import React from 'react';
import { ShieldCheck, Database, Server, RefreshCw } from 'lucide-react';

interface HeaderProps {
  isAuraConnected: boolean;
  isDemoMode: boolean;
  onToggleDemoMode: (val: boolean) => void;
  totalAlerts: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAuraConnected,
  isDemoMode,
  onToggleDemoMode,
  totalAlerts,
}) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {/* Brand & Agency Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded bg-blue-50 border border-blue-200 text-blue-600">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 font-sans">
              FINCRIME SENTINEL
            </h1>
            <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              GRAPH AML WORKSTATION
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              OFFICIAL USE ONLY // LAW ENFORCEMENT GRADE
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Federal Financial Crimes Enforcement & Autonomous Graph Network Defense
          </p>
        </div>
      </div>

      {/* Systems Status & Controls */}
      <div className="flex items-center gap-3">
        {/* Active Cases Badge */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-red-600" />
          <span className="text-slate-500">Active Cases:</span>
          <span className="text-red-600 font-bold">{totalAlerts} Flagged</span>
        </div>

        {/* Database Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-mono">
          <Server className={`w-3.5 h-3.5 ${isAuraConnected && !isDemoMode ? 'text-emerald-600' : 'text-blue-600'}`} />
          <span className="text-slate-500">Backend:</span>
          <span className={`font-semibold ${isAuraConnected && !isDemoMode ? 'text-emerald-700' : 'text-blue-700'}`}>
            {isDemoMode ? 'Offline Evidence Cache' : isAuraConnected ? 'Neo4j Aura Connected' : 'Local Intelligence'}
          </span>
        </div>

        {/* Powered by Neo4j Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600 text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-500">Engine:</span>
          <span className="text-slate-800 font-bold">Neo4j Aura</span>
        </div>

        {/* Demo Mode Toggle */}
        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1 rounded transition-colors">
          <span className="text-xs font-mono text-slate-700 select-none font-medium">Demo Mode</span>
          <input
            type="checkbox"
            checked={isDemoMode}
            onChange={(e) => onToggleDemoMode(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
          />
        </label>
      </div>
    </header>
  );
};
