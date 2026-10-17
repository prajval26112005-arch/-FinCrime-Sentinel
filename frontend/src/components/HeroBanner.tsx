'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShieldCheck, Database, FileText, ArrowRight, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';

interface HeroBannerProps {
  onQuickInspect: (prompt: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onQuickInspect }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isExpanded) {
    return (
      <div className="bg-white border-b border-slate-200 px-6 py-1.5 flex items-center justify-between text-xs text-slate-600 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800">FINCRIME SENTINEL EXECUTIVE BRIEFING</span>
          <span className="text-slate-400">| 4 Active Tier-1 Financial Crime Cases Monitored</span>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
        >
          <span>Expand Overview</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 transition-all">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left: Executive Compliance Overview */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[11px] font-bold tracking-wider uppercase">
              Regulatory Intelligence Platform
            </span>
            <span className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px]">
              FATF Typology 4.2 Compliant
            </span>
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">
              Autonomous Graph AML & Mule Syndicate Interception
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Real-time graph intelligence platform correlating multi-hop wire layering cycles, shared hardware fingerprints, and offshore shell entities across international bank clearing networks.
            </p>
          </div>

          {/* Key Intelligence Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Intercepted Volume</span>
              <span className="text-sm font-bold text-emerald-600">$2,401,980.08</span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Active Cases</span>
              <span className="text-sm font-bold text-red-600">4 Tier-1 Files</span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Topology Scope</span>
              <span className="text-sm font-bold text-blue-600">177 Graph Nodes</span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Graph Database</span>
              <span className="text-sm font-bold text-slate-800">Neo4j Aura Engine</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onQuickInspect('Case SAR-2026-8812: 5-hop circular laundering loop')}
              className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Inspect Case SAR-2026-8812</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onQuickInspect('Find shared device and IP address infrastructure mule rings')}
              className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-mono text-xs font-semibold transition-colors"
            >
              <span>Scan Mule Syndicate Rings</span>
            </button>
          </div>
        </div>

        {/* Right: Starting Image Banner */}
        <div className="relative w-full lg:w-96 h-48 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-slate-100">
          <Image
            src="/hero-aml.jpg"
            alt="Enterprise AML Compliance Network"
            fill
            className="object-cover"
            priority
          />
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 p-1 rounded bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm transition-all"
            title="Minimize Overview"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
