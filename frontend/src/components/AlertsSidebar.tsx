'use client';

import React, { useState } from 'react';
import { AlertItem } from '../lib/types';
import { FileText, ShieldAlert, AlertTriangle, Layers, ChevronRight, Hash, Building2 } from 'lucide-react';

interface AlertsSidebarProps {
  alerts: AlertItem[];
  selectedAlertId?: string;
  onSelectAlert: (alert: AlertItem) => void;
  onSelectAccount: (accountId: string) => void;
}

export const AlertsSidebar: React.FC<AlertsSidebarProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onSelectAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'LOOPS' | 'RINGS' | 'SMURFING' | 'SHELL'>('ALL');

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'LOOPS') return alert.type === 'CIRCULAR_LAUNDERING';
    if (activeTab === 'RINGS') return alert.type === 'SHARED_INFRASTRUCTURE';
    if (activeTab === 'SMURFING') return alert.type === 'SMURFING_FAN_IN';
    if (activeTab === 'SHELL') return alert.type === 'CROSS_BORDER_SHELL_LOOP';
    return true;
  });

  return (
    <aside className="w-[300px] min-w-[300px] max-w-[300px] h-full border-r border-slate-200 bg-white flex flex-col shrink-0 select-none shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800">
              Active Case Files
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 font-bold shadow-xs">
            {alerts.length} Dossiers
          </span>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-5 gap-1 text-[10px] font-semibold tracking-wider font-mono">
          {(['ALL', 'LOOPS', 'RINGS', 'SMURFING', 'SHELL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-1 rounded text-center transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab === 'SMURFING' ? 'SMURF' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Case Dossiers List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/40">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 font-mono">
            No matching case files found.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isSelected = alert.id === selectedAlertId;
            const isCritical = alert.severity === 'CRITICAL';

            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-600 shadow-sm ring-1 ring-blue-600/30'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Header: Case ID & Risk Score Badge */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-mono font-bold text-blue-700 tracking-wide">
                    {alert.id}
                  </span>

                  <div className="flex items-center gap-1 font-mono text-xs font-bold">
                    <span className="text-slate-500 text-[10px]">RISK:</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] ${
                        alert.risk_score >= 90
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {alert.risk_score}/100
                    </span>
                  </div>
                </div>

                {/* Case Title */}
                <h4 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                  {alert.title.replace(`${alert.id}: `, '')}
                </h4>

                {/* Statutory Reference */}
                {alert.statute && (
                  <p className="text-[10px] font-mono text-amber-800 font-medium mb-1.5 line-clamp-1">
                    Ref: {alert.statute}
                  </p>
                )}

                {/* Narrative Excerpt */}
                <p className="text-[11px] text-slate-600 line-clamp-2 mb-2 leading-relaxed font-sans">
                  {alert.explanation}
                </p>

                {/* Account Chips & Volume */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-1 overflow-x-hidden">
                    <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-700 font-medium">
                      {alert.accounts.slice(0, 3).join(', ')}
                      {alert.accounts.length > 3 ? ` +${alert.accounts.length - 3}` : ''}
                    </span>
                  </div>

                  {alert.total_volume && (
                    <span className="text-emerald-700 font-bold shrink-0">
                      ${(alert.total_volume / 1000).toFixed(0)}k USD
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
