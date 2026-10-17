'use client';

import React from 'react';
import { AlertCircle, FileText, Globe, Laptop, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { AlertItem } from '../lib/types';

interface SummaryBannerProps {
  activeAlert?: AlertItem | null;
  totalNodes: number;
  totalLinks: number;
  viewScope: 'CASE' | 'FULL';
  onToggleScope: (scope: 'CASE' | 'FULL') => void;
}

export const SummaryBanner: React.FC<SummaryBannerProps> = ({
  activeAlert,
  totalNodes,
  totalLinks,
  viewScope,
  onToggleScope,
}) => {
  const caseId = activeAlert?.id || 'CASE-SAR-2026-8812';
  const statute = activeAlert?.statute || '31 U.S.C. § 5324(a) (Structuring to Evade Reporting)';
  const totalVolume = activeAlert?.total_volume || 2401980.08;
  const hops = activeAlert?.hops !== undefined ? activeAlert.hops : 5;
  const sharedIp = activeAlert?.shared_ip || '10.0.0.99';
  const sharedDev = activeAlert?.shared_device || 'DEV_LOOP_101';
  const title = activeAlert?.title || 'Case SAR-2026-8812: 5-Hop Circular Laundering Cycle';

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
      {/* Case Header & Typology */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-bold tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          <span>TIER-1 AML PRIORITY</span>
        </div>
        <div>
          <span className="font-bold text-slate-900">{title}</span>
          <span className="hidden lg:inline-block text-slate-500 ml-2">
            | Statutory Ref: <span className="text-amber-800 font-semibold">{statute}</span>
          </span>
        </div>
      </div>

      {/* Financial Metrics Strip */}
      <div className="flex items-center gap-4 text-xs">
        {/* Total Layered Volume */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Traced Flow:</span>
          <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Hops */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-slate-500">Hops:</span>
          <span className="text-blue-800 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            {hops > 0 ? `${hops} HOPS (15M)` : 'MULE RING'}
          </span>
        </div>

        {/* Shared IP */}
        <div className="hidden md:flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">IP:</span>
          <span className="text-slate-800 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            {sharedIp}
          </span>
        </div>

        {/* Shared Hardware Terminal */}
        <div className="hidden lg:flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">Device:</span>
          <span className="text-slate-800 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            {sharedDev}
          </span>
        </div>

        {/* Graph Network Scope Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 rounded text-[11px]">
          <button
            onClick={() => onToggleScope('CASE')}
            className={`px-2.5 py-0.5 rounded transition-all ${
              viewScope === 'CASE'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ACTIVE CASE ({totalNodes} NODES)
          </button>
          <button
            onClick={() => onToggleScope('FULL')}
            className={`px-2.5 py-0.5 rounded transition-all ${
              viewScope === 'FULL'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            FULL NETWORK (177 NODES)
          </button>
        </div>
      </div>
    </div>
  );
};
