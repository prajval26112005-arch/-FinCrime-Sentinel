'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KaggleStats, KaggleTransaction } from '../lib/types';
import { fetchKaggleStats, fetchKaggleTransactions } from '../lib/api';

interface KaggleExplorerProps {
  onInvestigateAccount: (accountId: string) => void;
  onLoadKaggleGraph: () => void;
}

export const KaggleExplorer: React.FC<KaggleExplorerProps> = ({
  onInvestigateAccount,
  onLoadKaggleGraph,
}) => {
  const [stats, setStats] = useState<KaggleStats | null>(null);
  const [transactions, setTransactions] = useState<KaggleTransaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [launderingOnly, setLaunderingOnly] = useState<boolean>(false);
  const [selectedTypology, setSelectedTypology] = useState<string>('ALL');

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, search, selectedBank, selectedCurrency, selectedFormat, launderingOnly, selectedTypology]);

  const loadStats = async () => {
    try {
      const data = await fetchKaggleStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load Kaggle stats', e);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const effectiveSearch = selectedTypology !== 'ALL' ? selectedTypology : search;
      const res = await fetchKaggleTransactions({
        page,
        limit,
        search: effectiveSearch,
        bank: selectedBank,
        currency: selectedCurrency,
        paymentFormat: selectedFormat,
        launderingOnly,
      });
      setTransactions(res.records);
      setTotalCount(res.total);
    } catch (e) {
      console.error('Failed to load Kaggle transactions', e);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const handleTypologyClick = (typology: string) => {
    setSelectedTypology(typology);
    setPage(1);
    if (typology !== 'ALL') {
      setLaunderingOnly(true);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 transition-all">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded tracking-wide">
              KAGGLE BENCHMARK
            </span>
            <span className="text-xs text-slate-300">IBM / Synthetic Multi-Bank AML Dataset</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Real-World AML Transaction Investigation Workbench</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-institution correspondent banking dataset with labeled money laundering typologies and CTR evasion patterns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLoadKaggleGraph}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow transition-all cursor-pointer"
            title="Load Kaggle laundering ring into the force graph"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Visualize Kaggle Rings in Graph
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Transactions</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats ? stats.total_transactions.toLocaleString() : '472'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Correspondent bank flows</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Flagged Laundering</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {stats ? stats.laundering_transactions : '22'}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({stats ? stats.laundering_rate_pct : '4.66'}%)
            </span>
          </div>
          <div className="text-[11px] text-red-600 font-medium mt-0.5">Confirmed illicit patterns</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Laundered Volume</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ${stats ? (stats.laundering_volume_usd / 1000000).toFixed(2) : '7.14'}M
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Total: ${stats ? (stats.total_volume_usd / 1000000).toFixed(2) : '8.25'}M USD
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Monitored Institutions</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">10 Banks</div>
          <div className="text-[11px] text-slate-500 mt-0.5">JPMorgan, Citi, HSBC, DB, UBS</div>
        </div>
      </div>

      {/* Typology Quick Filter Pills */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-600 mr-1">Laundering Typologies:</span>
        <button
          onClick={() => {
            setSelectedTypology('ALL');
            setLaunderingOnly(false);
            setPage(1);
          }}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            selectedTypology === 'ALL' && !launderingOnly
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Activity
        </button>
        <button
          onClick={() => {
            setSelectedTypology('ALL');
            setLaunderingOnly(true);
            setPage(1);
          }}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            selectedTypology === 'ALL' && launderingOnly
              ? 'bg-red-700 text-white'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }`}
        >
          ⚠️ All Laundering Cases ({stats?.laundering_transactions || 22})
        </button>
        <button
          onClick={() => handleTypologyClick('SWIFT Circular')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            selectedTypology.includes('SWIFT')
              ? 'bg-red-700 text-white'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }`}
        >
          🔄 Multi-Bank SWIFT Wire Loop ($1.2M)
        </button>
        <button
          onClick={() => handleTypologyClick('Structured Cash')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            selectedTypology.includes('Structured')
              ? 'bg-amber-700 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          💵 Cash Smurfing (CTR Evasion &lt;$10k)
        </button>
        <button
          onClick={() => handleTypologyClick('Currency Conversion')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            selectedTypology.includes('Currency')
              ? 'bg-purple-700 text-white'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          💱 FX Arbitrage Layering (USD-EUR-CHF)
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Search Tx ID (e.g. KAG_000045) or Account ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedTypology('ALL');
              setPage(1);
            }}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedBank}
          onChange={(e) => {
            setSelectedBank(e.target.value);
            setPage(1);
          }}
          className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Banks</option>
          <option value="JPMorgan">JPMorgan Chase</option>
          <option value="Citibank">Citibank NA</option>
          <option value="HSBC">HSBC Bank UK</option>
          <option value="Deutsche Bank">Deutsche Bank AG</option>
          <option value="UBS">UBS Switzerland</option>
          <option value="Barclays">Barclays Bank PLC</option>
          <option value="Standard Chartered">Standard Chartered</option>
          <option value="Bank of America">Bank of America</option>
        </select>

        <select
          value={selectedCurrency}
          onChange={(e) => {
            setSelectedCurrency(e.target.value);
            setPage(1);
          }}
          className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All Currencies</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="CHF">CHF (Fr)</option>
        </select>

        <select
          value={selectedFormat}
          onChange={(e) => {
            setSelectedFormat(e.target.value);
            setPage(1);
          }}
          className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All Payment Formats</option>
          <option value="SWIFT Wire">SWIFT Wire</option>
          <option value="ACH Transfer">ACH Transfer</option>
          <option value="Cash Deposit">Cash Deposit</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Cheque">Cheque</option>
        </select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={launderingOnly}
              onChange={(e) => {
                setLaunderingOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Show Suspicious / Laundering Only
          </label>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <th className="py-2.5 px-4">Tx ID</th>
              <th className="py-2.5 px-4">Timestamp</th>
              <th className="py-2.5 px-4">Origin (From)</th>
              <th className="py-2.5 px-4">Destination (To)</th>
              <th className="py-2.5 px-4 text-right">Amount Paid</th>
              <th className="py-2.5 px-4">Format</th>
              <th className="py-2.5 px-4">Typology / Status</th>
              <th className="py-2.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mr-2 align-middle"></div>
                  Loading Kaggle benchmark transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No transactions match the selected criteria.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isIllicit = tx.Is_Laundering === 1;
                return (
                  <tr
                    key={tx.Transaction_ID}
                    className={`hover:bg-slate-50 transition-colors ${
                      isIllicit ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                      {tx.Transaction_ID}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {tx.Timestamp}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-800">{tx.From_Bank.split(' (')[0]}</div>
                      <div
                        onClick={() => onInvestigateAccount(tx.From_Account)}
                        className="font-mono text-[11px] text-blue-600 hover:underline cursor-pointer"
                        title="Investigate origin account"
                      >
                        {tx.From_Account}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-800">{tx.To_Bank.split(' (')[0]}</div>
                      <div
                        onClick={() => onInvestigateAccount(tx.To_Account)}
                        className="font-mono text-[11px] text-blue-600 hover:underline cursor-pointer"
                        title="Investigate destination account"
                      >
                        {tx.To_Account}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      <span className={isIllicit ? 'text-red-700' : 'text-slate-800'}>
                        {tx.Amount_Paid.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.Payment_Currency}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                        {tx.Payment_Format}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {isIllicit ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                          {tx.Laundering_Type}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Commercial Clean</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onInvestigateAccount(isIllicit ? tx.From_Account : tx.To_Account)}
                        className="bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1 rounded text-[11px] font-medium border border-slate-200 transition-colors"
                      >
                        Trace Node
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing <span className="font-semibold text-slate-900">{transactions.length}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalCount}</span> transactions (Page {page} of {totalPages})
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
          >
            Previous
          </button>
          <span className="font-mono text-slate-700">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
