'use client';

import React, { useState } from 'react';
import { Search, Loader2, ArrowRight, FileSearch } from 'lucide-react';

interface SearchBarProps {
  onSearch: (prompt: string) => void;
  isLoading: boolean;
}

const CASE_PROMPTS = [
  {
    id: 'SAR-2026-8812',
    label: 'Case SAR-2026-8812 (5-Hop Circular Laundering Loop)',
    prompt: 'Execute investigation on Case SAR-2026-8812: 5-hop circular wire laundering loop passing sequentially through MULE_101 to MULE_105',
  },
  {
    id: 'SAR-2026-4409',
    label: 'Case SAR-2026-4409 (Shared Hardware Mule Syndicate)',
    prompt: 'Investigate Case SAR-2026-4409: shared-hardware mule ring with 6 accounts controlled via device DEV_MULE_RING_01 and IP 198.51.100.88',
  },
  {
    id: 'SAR-2026-9021',
    label: 'Case SAR-2026-9021 (Smurfing Fan-In Hub)',
    prompt: 'Query Case SAR-2026-9021: rapid smurfing fan-in deposits below $5,000 threshold into hub MULE_RING_01 with outward fan-out wires',
  },
  {
    id: 'SAR-2026-3184',
    label: 'Case SAR-2026-3184 (Offshore Shell Company Loop)',
    prompt: 'Trace Case SAR-2026-3184: offshore triangular shell entity loop across Seychelles, Panama, and British Virgin Islands',
  },
];

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSearch(input.trim());
    }
  };

  const handleCaseClick = (prompt: string) => {
    setInput(prompt);
    onSearch(prompt);
  };

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 px-6 py-2.5">
      {/* Search Bar Input */}
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter investigation prompt, account ID, hardware fingerprint, or Cypher pattern (e.g. 'Case SAR-2026-8812', 'MULE_101', 'DEV_LOOP_101')..."
          className="w-full h-10 pl-10 pr-28 rounded bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all font-mono shadow-sm"
          disabled={isLoading}
        />

        <div className="absolute right-1.5 flex items-center">
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono font-semibold text-white transition-colors shadow-sm"
          >
            <span>Query Graph</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Real AML Case Fast-Selectors */}
      <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-0.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] font-bold uppercase tracking-wider shrink-0">
          <FileSearch className="w-3.5 h-3.5 text-blue-600" />
          <span>Case Shortcuts:</span>
        </div>
        {CASE_PROMPTS.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCaseClick(c.prompt)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5 font-mono text-[11px] shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
