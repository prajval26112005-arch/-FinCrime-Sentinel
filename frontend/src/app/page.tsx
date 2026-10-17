'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { HeroBanner } from '../components/HeroBanner';
import { SearchBar } from '../components/SearchBar';
import { SummaryBanner } from '../components/SummaryBanner';
import { AlertsSidebar } from '../components/AlertsSidebar';
import { GraphView } from '../components/GraphView';
import { NodeDetailPanel } from '../components/NodeDetailPanel';
import { AgentTerminal } from '../components/AgentTerminal';
import { KaggleExplorer } from '../components/KaggleExplorer';
import {
  GraphData,
  GraphNode,
  AlertItem,
  InvestigationResult,
  BlastRadiusResult,
} from '../lib/types';
import {
  fetchAlerts,
  fetchGraph,
  investigatePrompt,
  freezeAccount,
  fetchBlastRadius,
  checkBackendHealth,
  fetchKaggleGraph,
} from '../lib/api';
import { Radar, X, CheckCircle2, ShieldAlert, Database, Layers } from 'lucide-react';

export default function Home() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isAuraConnected, setIsAuraConnected] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [frozenAccounts, setFrozenAccounts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFreezing, setIsFreezing] = useState<boolean>(false);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewScope, setViewScope] = useState<'CASE' | 'FULL'>('CASE');
  const [activeTab, setActiveTab] = useState<'FEDERAL_CASES' | 'KAGGLE_BENCHMARK'>('FEDERAL_CASES');

  const handleLoadKaggleGraph = async () => {
    setIsLoading(true);
    try {
      const kGraph = await fetchKaggleGraph(true);
      if (kGraph && kGraph.nodes && kGraph.nodes.length > 0) {
        setGraphData(kGraph);
        setSelectedNode(kGraph.nodes[0]);
        setActiveTab('FEDERAL_CASES');
        showToast(`Visualizing ${kGraph.nodes.length} multi-bank Kaggle laundering nodes in graph.`);
      } else {
        showToast('Loaded Kaggle AML network graph.');
      }
    } catch (e) {
      console.error(e);
      showToast('Could not fetch Kaggle graph.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvestigateKaggleAccount = async (accId: string) => {
    setActiveTab('FEDERAL_CASES');
    await handleSearch(`Investigate transactions and correspondent hops for ${accId}`);
  };

  // Load initial data
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const isOnline = await checkBackendHealth();
      setIsAuraConnected(isOnline);

      const alertList = await fetchAlerts(isDemoMode);
      setAlerts(alertList);

      if (alertList.length > 0) {
        const firstAlert = alertList[0];
        setSelectedAlert(firstAlert);

        // Fetch subgraph for initial case
        const caseGraph = await fetchGraph(firstAlert.accounts[0], isDemoMode);
        setGraphData(caseGraph);

        // Select the root mule node
        const rootMule = caseGraph.nodes.find((n) => n.id === firstAlert.accounts[0]) || null;
        setSelectedNode(rootMule);
      } else {
        const allGraph = await fetchGraph(undefined, isDemoMode);
        setGraphData(allGraph);
      }

      // Initial investigation query
      const initialInv = await investigatePrompt('Case SAR-2026-8812: 5-hop circular laundering loop', isDemoMode);
      setInvestigation(initialInv);

      setIsLoading(false);
    }
    init();
  }, [isDemoMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle Full Network vs Case View
  const handleToggleScope = async (scope: 'CASE' | 'FULL') => {
    setViewScope(scope);
    setIsLoading(true);
    try {
      if (scope === 'FULL') {
        const fullGraph = await fetchGraph(undefined, isDemoMode);
        setGraphData(fullGraph);
        showToast('Displaying full network topology (177 nodes).');
      } else if (selectedAlert) {
        const caseGraph = await fetchGraph(selectedAlert.accounts[0], isDemoMode);
        setGraphData(caseGraph);
        showToast(`Filtered graph to ${selectedAlert.id}.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Search / Prompt investigation
  const handleSearch = async (prompt: string) => {
    setIsLoading(true);
    try {
      const result = await investigatePrompt(prompt, isDemoMode);
      setInvestigation(result);

      if (result.graphData && result.graphData.nodes.length > 0) {
        setGraphData(result.graphData);
      }

      // If prompt matched an alert, update selected alert
      const matchedAlert = alerts.find(
        (a) => prompt.toLowerCase().includes(a.id.toLowerCase()) || prompt.toLowerCase().includes(a.accounts[0].toLowerCase())
      );
      if (matchedAlert) {
        setSelectedAlert(matchedAlert);
      }

      showToast(`Agent completed analysis: "${prompt.slice(0, 32)}..."`);
    } catch (e) {
      console.error(e);
      showToast('Error during investigation. Reverted to cached evidence.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Alert Selection
  const handleSelectAlert = async (alert: AlertItem) => {
    setSelectedAlert(alert);
    setIsLoading(true);
    try {
      const primeAcc = alert.accounts[0];
      const alertGraph = await fetchGraph(primeAcc, isDemoMode);
      setGraphData(alertGraph);

      const matchingNode = alertGraph.nodes.find((n) => n.id === primeAcc) || null;
      setSelectedNode(matchingNode);

      const result = await investigatePrompt(alert.title, isDemoMode);
      setInvestigation(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Node Click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  // Handle Freeze Action
  const handleFreeze = async (accountId: string) => {
    setIsFreezing(true);
    try {
      const res = await freezeAccount(accountId, isDemoMode);
      setFrozenAccounts((prev) => new Set(prev).add(accountId));
      showToast(`[REGULATORY ACTION] ${res.message}`);

      if (selectedNode && selectedNode.id === accountId) {
        setSelectedNode({ ...selectedNode, status: 'frozen' });
      }
    } catch (e) {
      console.error(e);
      showToast(`Failed freezing ${accountId}`);
    } finally {
      setIsFreezing(false);
    }
  };

  // Handle Blast Radius
  const handleTraceBlastRadius = async (accountId: string) => {
    setIsLoading(true);
    try {
      const br = await fetchBlastRadius(accountId, isDemoMode);
      setBlastRadius(br);
    } catch (e) {
      console.error(e);
      showToast('Could not compute blast radius.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-screen overflow-x-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded bg-white border border-blue-600 text-slate-900 text-xs font-mono shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Official Header */}
      <Header
        isAuraConnected={isAuraConnected}
        isDemoMode={isDemoMode}
        onToggleDemoMode={(val) => {
          setIsDemoMode(val);
          showToast(val ? 'Offline Evidence Cache Activated.' : 'Connecting to Live Neo4j Aura Database...');
        }}
        totalAlerts={alerts.length}
      />

      {/* Hero Overview Section with Starting Image */}
      <HeroBanner onQuickInspect={handleSearch} />

      {/* Primary Investigation View Switcher */}
      <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('FEDERAL_CASES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
              activeTab === 'FEDERAL_CASES'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-300 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>Federal FinCEN SAR Cases & Graph Network</span>
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-100 text-red-800 font-bold">
              4 Cases Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab('KAGGLE_BENCHMARK')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
              activeTab === 'KAGGLE_BENCHMARK'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-300 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Database className="w-4 h-4 text-blue-600" />
            <span>Kaggle Real-World AML Benchmark</span>
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-blue-800 font-bold">
              472 Transactions
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Institutional Multi-Bank Telemetry Active
          </span>
        </div>
      </div>

      {/* View 1: Federal SAR Cases & High-Level 2D Force Graph */}
      {activeTab === 'FEDERAL_CASES' && (
        <>
          {/* Query Bar + Real Case Selectors */}
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {/* Case Overview Metrics Strip */}
          <SummaryBanner
            activeAlert={selectedAlert}
            totalNodes={graphData.nodes?.length || 0}
            totalLinks={graphData.links?.length || 0}
            viewScope={viewScope}
            onToggleScope={handleToggleScope}
          />

          {/* Main 3-Column Command Center Workspace */}
          <div className="h-[700px] flex overflow-hidden relative border-t border-slate-200 w-full">
            {/* Left: Ranked Case Files Sidebar */}
            <AlertsSidebar
              alerts={alerts}
              selectedAlertId={selectedAlert?.id}
              onSelectAlert={handleSelectAlert}
              onSelectAccount={(accId) => fetchGraph(accId, isDemoMode).then(setGraphData)}
            />

            {/* Center: Interactive Graph Canvas */}
            <div className="flex-1 min-w-0 h-full relative overflow-hidden bg-white">
              <GraphView
                graphData={graphData}
                selectedNodeId={selectedNode?.id}
                onNodeClick={handleNodeClick}
                frozenAccounts={frozenAccounts}
              />
            </div>

            {/* Middle/Right Drawer: Node Evidence Dossier */}
            {selectedNode && (
              <NodeDetailPanel
                node={selectedNode}
                links={graphData.links}
                onClose={() => setSelectedNode(null)}
                onFreeze={handleFreeze}
                onTraceBlastRadius={handleTraceBlastRadius}
                isFreezing={isFreezing}
              />
            )}

            {/* Far Right: Agent Terminal & SAR Brief */}
            <AgentTerminal investigation={investigation} isLoading={isLoading} />
          </div>
        </>
      )}

      {/* View 2: Kaggle Real-World AML Benchmark Workbench */}
      {activeTab === 'KAGGLE_BENCHMARK' && (
        <div className="p-6 bg-slate-50 flex-1">
          <KaggleExplorer
            onInvestigateAccount={handleInvestigateKaggleAccount}
            onLoadKaggleGraph={handleLoadKaggleGraph}
          />
        </div>
      )}

      {/* 4-Hop Blast Radius Modal */}
      {blastRadius && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-2xl bg-white border border-slate-300 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-mono text-xs">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-blue-700">
                <Radar className="w-4 h-4" />
                <span className="font-bold uppercase tracking-wider text-slate-900">
                  4-Hop Blast Radius: {blastRadius.root_account}
                </span>
              </div>
              <button
                onClick={() => setBlastRadius(null)}
                className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between text-slate-600 text-xs border-b border-slate-200 pb-2">
                <span>Total Entities Reachable: <b className="text-blue-700">{blastRadius.total_reachable}</b></span>
                <span>Max Graph Distance: <b className="text-amber-700">4 Hops</b></span>
              </div>

              <div className="space-y-1.5">
                {blastRadius.blast_radius_accounts.map((acc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{acc.account_id}</span>
                        <span className="text-slate-500 text-[11px] font-sans">({acc.holder_name})</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Via: {acc.relationship_types?.join(', ') || 'TRANSFER'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px] shadow-xs">
                        Hop {acc.distance}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          acc.risk_score >= 80
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        Risk {acc.risk_score}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setBlastRadius(null)}
                className="px-4 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
