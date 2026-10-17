'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, GraphNode, GraphLink } from '../lib/types';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Filter,
  Activity,
  Layers,
} from 'lucide-react';

// Dynamic import with SSR disabled for 2D force graph
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white text-slate-500 font-mono text-xs">
      <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-3" />
      <span>INITIALIZING FINANCIAL CRIME TOPOLOGY GRAPH...</span>
    </div>
  ),
});

interface GraphViewProps {
  graphData: GraphData;
  selectedNodeId?: string | null;
  onNodeClick: (node: GraphNode) => void;
  frozenAccounts?: Set<string>;
}

export const GraphView: React.FC<GraphViewProps> = ({
  graphData,
  selectedNodeId,
  onNodeClick,
  frozenAccounts = new Set(),
}) => {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 650 });
  const [filterType, setFilterType] = useState<string>('ALL');

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: h });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    const timer1 = setTimeout(updateSize, 50);
    const timer2 = setTimeout(updateSize, 250);
    const timer3 = setTimeout(updateSize, 600);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Process and memoize graph data
  const processedData = useMemo(() => {
    const rawNodes = graphData?.nodes || [];
    const rawLinks = graphData?.links || [];

    // Filter nodes if user selected specific entity type
    let filteredNodes = rawNodes;
    if (filterType !== 'ALL') {
      filteredNodes = rawNodes.filter((n) => n.group === filterType);
    }
    const nodeSet = new Set(filteredNodes.map((n) => n.id));

    const nodes = filteredNodes.map((node) => {
      const isFrozen = frozenAccounts.has(node.id) || node.status === 'frozen';
      const isSelected = selectedNodeId === node.id;
      const risk = node.risk_score || 10;

      let color = '#2563eb'; // Blue - Standard Account
      let radius = 7.5;

      if (isFrozen) {
        color = '#64748b'; // Slate gray
        radius = 6.5;
      } else if (node.group === 'Device') {
        color = '#d97706'; // Amber - Hardware terminal
        radius = 6.5;
      } else if (node.group === 'IPAddress') {
        color = '#059669'; // Emerald - Network IP
        radius = 6.5;
      } else if (node.group === 'Entity') {
        color = node.is_shell ? '#dc2626' : '#7c3aed'; // Deep Crimson vs Royal Purple
        radius = 9.5;
      } else if (risk >= 80) {
        color = '#dc2626'; // Deep Crimson - High Risk Mule
        radius = 9.5;
      } else if (risk >= 60) {
        color = '#ea580c'; // Orange - Elevated
        radius = 8;
      }

      return {
        ...node,
        color,
        radius,
        isSelected,
        isFrozen,
      };
    });

    const links = rawLinks
      .filter((link) => {
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const dstId = typeof link.target === 'object' ? link.target.id : link.target;
        return nodeSet.has(srcId) && nodeSet.has(dstId);
      })
      .map((link) => {
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const isSrcFrozen = frozenAccounts.has(srcId);
        const isTransfer = link.type === 'TRANSFER';
        const isHighValue = isTransfer && (link.amount || 0) >= 50000;

        let strokeColor = '#94a3b8'; // Slate edge
        let width = 1.2;

        if (isSrcFrozen && isTransfer) {
          strokeColor = '#cbd5e1'; // Cut/dimmed for frozen
        } else if (isHighValue) {
          strokeColor = '#dc2626'; // Crimson for large suspicious wire
          width = 2.4;
        } else if (isTransfer) {
          strokeColor = '#2563eb'; // Blue for regular transfer
          width = 1.6;
        } else if (link.type === 'USED_DEVICE') {
          strokeColor = '#d97706'; // Amber for hardware link
          width = 1.4;
        } else if (link.type === 'LOGGED_IN_IP') {
          strokeColor = '#059669'; // Emerald for IP link
          width = 1.4;
        } else if (link.type === 'OWNS') {
          strokeColor = '#7c3aed'; // Purple for corporate ownership
          width = 1.6;
        }

        return {
          ...link,
          strokeColor,
          width,
          isHighValue,
        };
      });

    return { nodes, links };
  }, [graphData, selectedNodeId, frozenAccounts, filterType]);

  // Auto-center and zoom to fit whenever graphData or dimensions change
  useEffect(() => {
    if (fgRef.current && processedData.nodes.length > 0) {
      const t1 = setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50);
      }, 300);
      const t2 = setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50);
      }, 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [processedData.nodes.length, dimensions.width]);

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 60);
    }
  };

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.3, 300);
    }
  };

  // Node Canvas Rendering on White Background
  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const radius = node.radius || 7.5;
    const isSelected = node.isSelected;

    // Node outer ring / border
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + (isSelected ? 3.5 : 1.5), 0, 2 * Math.PI, false);
    ctx.fillStyle = isSelected ? '#1d4ed8' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isSelected ? '#1d4ed8' : '#cbd5e1';
    ctx.stroke();

    // Node Body
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color;
    ctx.fill();

    // Node Label Pill
    const label = node.id || '';
    const fontSize = Math.max(11 / globalScale, 3.5);
    ctx.font = `600 ${fontSize}px "Inter", -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const textWidth = ctx.measureText(label).width;
    const paddingX = 4 / globalScale;
    const paddingY = 2 / globalScale;

    // Label background pill (Crisp White with subtle shadow)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fillRect(
      node.x - textWidth / 2 - paddingX,
      node.y + radius + 3 / globalScale,
      textWidth + paddingX * 2,
      fontSize + paddingY * 2
    );

    // Label border
    ctx.strokeStyle = isSelected ? '#1d4ed8' : '#cbd5e1';
    ctx.lineWidth = 1 / globalScale;
    ctx.strokeRect(
      node.x - textWidth / 2 - paddingX,
      node.y + radius + 3 / globalScale,
      textWidth + paddingX * 2,
      fontSize + paddingY * 2
    );

    // Label Text
    ctx.fillStyle = isSelected ? '#1d4ed8' : '#0f172a';
    ctx.fillText(label, node.x, node.y + radius + 4 / globalScale);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#f8fafc] overflow-hidden select-none">
      {/* 2D Canvas Graph */}
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={processedData}
        backgroundColor="#f8fafc"
        nodeCanvasObject={drawNode}
        nodeCanvasObjectMode={() => 'replace'}
        nodeRelSize={7}
        linkColor={(link: any) => link.strokeColor}
        linkWidth={(link: any) => link.width}
        linkDirectionalArrowLength={4.5}
        linkDirectionalArrowRelPos={0.95}
        linkDirectionalParticles={(link: any) => (link.type === 'TRANSFER' ? 2 : 0)}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={1.8}
        linkDirectionalParticleColor={(link: any) => (link.isHighValue ? '#dc2626' : '#2563eb')}
        linkCurvature={0.12}
        onNodeClick={(node: any) => {
          onNodeClick(node);
          if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 600);
          }
        }}
        cooldownTicks={120}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      {/* Official Graph Viewport Toolbar */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
        {/* Entity Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded text-[11px] font-mono text-slate-700 shadow-sm">
          <span className="px-2 py-0.5 text-slate-500 font-semibold uppercase text-[10px] flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" />
            FILTER:
          </span>
          {(['ALL', 'Account', 'Device', 'IPAddress', 'Entity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterType === t
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL' ? 'ALL NODES' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom / Navigation Controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded text-xs text-slate-700 font-mono shadow-sm z-20">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-200" />
        <button
          onClick={handleResetView}
          className="p-1.5 rounded hover:bg-slate-100 hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold"
          title="Fit Graph to View"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-[10px]">FIT VIEW</span>
        </button>
      </div>

      {/* Official Graph Legend */}
      <div className="absolute top-4 right-4 bg-white border border-slate-200 p-3 rounded text-[11px] font-mono text-slate-700 space-y-2 z-20 pointer-events-none shadow-sm">
        <div className="text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>GRAPH TOPOLOGY LEGEND</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 border border-red-200" />
            <span className="text-slate-800 font-medium">High-Risk Mule</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-200" />
            <span className="text-slate-800 font-medium">Standard Account</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-600 border border-amber-200" />
            <span className="text-slate-800 font-medium">Hardware Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-200" />
            <span className="text-slate-800 font-medium">Access IP Address</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600 border border-purple-200" />
            <span className="text-slate-800 font-medium">Corporate Entity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-500 border border-slate-300" />
            <span className="text-slate-700 font-medium">Frozen Account</span>
          </div>
        </div>
      </div>
    </div>
  );
};
