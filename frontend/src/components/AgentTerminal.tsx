'use client';

import React, { useState } from 'react';
import { AgentStep, InvestigationResult } from '../lib/types';
import {
  Terminal,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Code2,
  FileCheck2,
} from 'lucide-react';

interface AgentTerminalProps {
  investigation: InvestigationResult | null;
  isLoading: boolean;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({
  investigation,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopy = () => {
    if (investigation?.generated_cypher) {
      navigator.clipboard.writeText(investigation.generated_cypher);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const steps: AgentStep[] = investigation?.steps || [
    { step: 1, name: 'Schema Introspection', status: 'done', detail: 'Introspected Neo4j Graph Schema: Account, Device, IPAddress, Entity' },
    { step: 2, name: 'Cypher Query Compilation', status: 'done', detail: 'Compiled read-only AML detection query' },
    { step: 3, name: 'Graph Execution', status: 'done', detail: 'Executed pattern match on Neo4j Aura' },
    { step: 4, name: 'Compliance Synthesis', status: 'done', detail: 'Generated FinCEN regulatory compliance brief' },
  ];

  if (isCollapsed) {
    return (
      <aside className="w-10 min-w-10 max-w-10 h-full border-l border-slate-200 bg-white flex flex-col items-center py-4 shrink-0 shadow-sm z-30 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Expand Agent Terminal"
        >
          <Terminal className="w-5 h-5 text-blue-600" />
        </button>
        <span className="font-mono text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-8 [writing-mode:vertical-rl] rotate-180">
          Agent Terminal
        </span>
      </aside>
    );
  }

  return (
    <aside className="w-[320px] min-w-[320px] max-w-[320px] h-full border-l border-slate-200 bg-white flex flex-col shrink-0 select-none shadow-sm z-30 font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-600" />
          <span className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
            Agent Terminal
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            AUDIT ACTIVE
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-[11px] font-bold"
            title="Collapse Terminal"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Step Progression Timeline */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-200">
            <span>PIPELINE EXECUTION TRACE</span>
            {isLoading && <span className="text-blue-600">ANALYZING...</span>}
          </div>

          <div className="space-y-2 pt-1">
            {steps.map((s, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {s.status === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : s.status === 'running' ? (
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{s.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Step {s.step}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generated Cypher Code Block */}
        {investigation?.generated_cypher && (
          <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
              <div className="flex items-center gap-1.5 text-blue-700">
                <Code2 className="w-3.5 h-3.5" />
                <span>EXECUTED CYPHER (READ-ONLY)</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors text-[10px] shadow-xs"
                title="Copy Cypher to Clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {investigation.generated_cypher}
            </div>
          </div>
        )}

        {/* Regulatory SAR Compliance Briefing */}
        {investigation?.summary && (
          <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
              <div className="flex items-center gap-1.5 text-amber-700">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>SAR COMPLIANCE FINDING</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                EVIDENCE TIER-1
              </span>
            </div>

            <div className="p-2.5 rounded bg-white border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans shadow-xs">
              {investigation.summary}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
