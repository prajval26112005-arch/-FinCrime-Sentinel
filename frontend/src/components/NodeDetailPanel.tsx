'use client';

import React from 'react';
import { GraphNode, GraphLink } from '../lib/types';
import {
  X,
  ShieldAlert,
  Snowflake,
  Radar,
  User,
  Building2,
  HardDrive,
  Globe,
  Loader2,
  Lock,
} from 'lucide-react';

interface NodeDetailPanelProps {
  node: GraphNode | null;
  links: GraphLink[];
  onClose: () => void;
  onFreeze: (accountId: string) => void;
  onTraceBlastRadius: (accountId: string) => void;
  isFreezing?: boolean;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  links,
  onClose,
  onFreeze,
  onTraceBlastRadius,
  isFreezing = false,
}) => {
  if (!node) return null;

  const isAccount = node.group === 'Account';
  const isFrozen = node.status === 'frozen';
  const risk = node.risk_score || 10;

  // Connected links
  const connectedLinks = links.filter((l) => {
    const src = typeof l.source === 'object' ? l.source.id : l.source;
    const dst = typeof l.target === 'object' ? l.target.id : l.target;
    return src === node.id || dst === node.id;
  });

  const transfers = connectedLinks.filter((l) => l.type === 'TRANSFER');
  const totalVolume = transfers.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="w-[300px] min-w-[300px] max-w-[300px] h-full border-l border-slate-200 bg-white flex flex-col shrink-0 select-none shadow-sm z-30 font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          {isAccount ? (
            <User className="w-4 h-4 text-blue-600" />
          ) : node.group === 'Entity' ? (
            <Building2 className="w-4 h-4 text-purple-600" />
          ) : node.group === 'Device' ? (
            <HardDrive className="w-4 h-4 text-amber-600" />
          ) : (
            <Globe className="w-4 h-4 text-emerald-600" />
          )}
          <span className="font-bold uppercase tracking-wider text-slate-800">
            {node.group} Evidence Dossier
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node ID & Status */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">IDENTIFIER</span>
            {isFrozen ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 border border-slate-300">
                <Lock className="w-3 h-3 text-slate-600" />
                FROZEN
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                ACTIVE IN NETWORK
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900 break-all">
            {node.id}
          </h3>
          {node.holder_name && (
            <p className="text-xs text-slate-600 font-sans mt-0.5">{node.holder_name}</p>
          )}
        </div>

        {/* Risk Score Assessment */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">Composite AML Risk Score</span>
            <span
              className={`text-sm font-bold ${
                risk >= 80 ? 'text-red-600' : risk >= 50 ? 'text-amber-600' : 'text-blue-600'
              }`}
            >
              {risk} / 100
            </span>
          </div>

          <div className="w-full h-2 rounded bg-slate-200 overflow-hidden">
            <div
              className={`h-full ${
                risk >= 80 ? 'bg-red-600' : risk >= 50 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${risk}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-between font-semibold">
            <span>LOW (&lt;50)</span>
            <span>ELEVATED</span>
            <span className="text-red-600 font-bold">CRITICAL (&gt;80)</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block mb-0.5 uppercase font-semibold">Direct Links</span>
            <span className="font-bold text-slate-900">{connectedLinks.length} Edges</span>
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block mb-0.5 uppercase font-semibold">Wire Transfers</span>
            <span className="font-bold text-slate-900">{transfers.length} Transactions</span>
          </div>
        </div>

        {totalVolume > 0 && (
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block mb-0.5 uppercase font-semibold">Total Traced Flow</span>
            <span className="text-emerald-700 font-bold text-sm">
              ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {node.jurisdiction && (
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block mb-0.5 uppercase font-semibold">Registered Jurisdiction</span>
            <span className="text-purple-700 font-semibold">{node.jurisdiction}</span>
          </div>
        )}

        {/* Real Regulatory Action Suite */}
        {isAccount && (
          <div className="pt-2 space-y-2">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
              Regulatory Interventions
            </div>

            {/* Freeze Account Button */}
            <button
              onClick={() => onFreeze(node.id)}
              disabled={isFrozen || isFreezing}
              className={`w-full py-2.5 px-3 rounded flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-xs ${
                isFrozen
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
              }`}
            >
              {isFreezing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>TRANSMITTING FREEZE ORDER...</span>
                </>
              ) : isFrozen ? (
                <>
                  <Lock className="w-4 h-4 text-slate-600" />
                  <span>ACCOUNT OFFICIALLY FROZEN</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-white" />
                  <span>ISSUE REGULATORY FREEZE (SEC 311)</span>
                </>
              )}
            </button>

            {/* Trace Blast Radius */}
            <button
              onClick={() => onTraceBlastRadius(node.id)}
              className="w-full py-2.5 px-3 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Radar className="w-4 h-4 text-blue-600" />
              <span>TRACE 4-HOP SYNDICATE RADIUS</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
