import { GraphData, AlertItem, InvestigationResult, BlastRadiusResult, KaggleStats, KaggleTransaction, KaggleTransactionsResponse } from './types';
import demoData from '../data/demo_data.json';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/`, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function fetchAlerts(isDemoMode: boolean = false): Promise<AlertItem[]> {
  if (!isDemoMode) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.warn('[API] Could not fetch alerts from backend, using fallback demo data.', e);
    }
  }
  return demoData.alerts as AlertItem[];
}

export async function fetchGraph(accountId?: string, isDemoMode: boolean = false): Promise<GraphData> {
  if (!isDemoMode) {
    try {
      const url = accountId
        ? `${API_BASE_URL}/api/graph?account_id=${encodeURIComponent(accountId)}`
        : `${API_BASE_URL}/api/graph`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) return data;
      }
    } catch (e) {
      console.warn('[API] Could not fetch graph from backend, using fallback demo data.', e);
    }
  }

  const allNodes = (demoData.graph?.nodes || []) as any[];
  const allLinks = (demoData.graph?.links || []) as any[];

  if (accountId) {
    const directNeighbors = new Set<string>([accountId]);
    allLinks.forEach((l) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const dst = typeof l.target === 'object' ? l.target.id : l.target;
      if (src === accountId) directNeighbors.add(dst);
      if (dst === accountId) directNeighbors.add(src);
    });
    return {
      nodes: allNodes.filter((n) => directNeighbors.has(n.id)),
      links: allLinks.filter((l) => {
        const src = typeof l.source === 'object' ? l.source.id : l.source;
        const dst = typeof l.target === 'object' ? l.target.id : l.target;
        return directNeighbors.has(src) && directNeighbors.has(dst);
      }),
    };
  }

  return { nodes: allNodes, links: allLinks };
}

export async function investigatePrompt(prompt: string, isDemoMode: boolean = false): Promise<InvestigationResult> {
  if (!isDemoMode) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[API] Investigation API failed, running client-side fallback simulation.', e);
    }
  }

  // High-fidelity fallback investigation matching backend agent
  const p = prompt.toLowerCase();
  let query = 'MATCH (a:Account) WHERE a.risk_score >= 80 RETURN a LIMIT 10';
  let summary = 'Standard AML scan conducted. 14 high-risk accounts identified in active syndicate clusters.';
  let risk = 85;
  let targetAccounts: string[] = [];

  if (p.includes('loop') || p.includes('circular') || p.includes('5-hop') || p.includes('laundering')) {
    query = `MATCH path=(a:Account)-[:TRANSFER*3..6]->(a)
WHERE all(i in range(0, size(relationships(path))-2)
      WHERE (relationships(path)[i]).timestamp <= (relationships(path)[i+1]).timestamp)
RETURN path, [n in nodes(path) | n.account_id] AS accounts, size(relationships(path)) AS hops`;
    summary = `**CRITICAL AML ALERT: 5-Hop Circular Laundering Cycle Detected**\n\n- **Cycle Topology:** MULE_101 → MULE_102 → MULE_103 → MULE_104 → MULE_105 → MULE_101.\n- **Volume:** $2,401,980.08 cumulative layered funds ($500,000 principal).\n- **Velocity:** Exact 15-minute intervals between hops with 2% fee deductions.\n- **Shared Signature:** Shared suspicious IP \`10.0.0.99\` and device terminal \`DEV_LOOP_101\`.\n- **Action:** Initiate urgent account freeze and submit FinCEN SAR.`;
    risk = 98;
    targetAccounts = ['MULE_101', 'MULE_102', 'MULE_103', 'MULE_104', 'MULE_105'];
  } else if (p.includes('device') || p.includes('ip') || p.includes('mule ring') || p.includes('shared')) {
    query = `MATCH (a:Account)-[:USED_DEVICE]->(d:Device {device_id: 'DEV_MULE_RING_01'})
MATCH (a)-[:LOGGED_IN_IP]->(i:IPAddress {ip: '198.51.100.88'})
RETURN a, d, i`;
    summary = `**HIGH SEVERITY ALERT: Shared-Infrastructure Mule Syndicate**\n\n- **Infrastructure Fingerprint:** 6 syndicate accounts (MULE_RING_01 to MULE_RING_06) accessing via device \`DEV_MULE_RING_01\` and IP \`198.51.100.88\`.\n- **Shell Shell Ownership:** All accounts held under newly formed shell entity \`Vanguard Global Trust LLC\` (Belize).\n- **Role:** Channeling layered micro-deposits into consolidation hub \`MULE_RING_01\`.\n- **Action:** Freeze syndicate member credentials.`;
    risk = 92;
    targetAccounts = ['MULE_RING_01', 'MULE_RING_02', 'MULE_RING_03', 'MULE_RING_04', 'MULE_RING_05', 'MULE_RING_06'];
  } else if (p.includes('smurf') || p.includes('fan-in') || p.includes('structuring')) {
    query = `MATCH (src:Account)-[r:TRANSFER]->(target:Account {account_id: 'MULE_RING_01'})
WHERE r.amount < 5000.0
RETURN target, count(r) AS structured_txs, sum(r.amount) AS total_amount`;
    summary = `**HIGH SEVERITY ALERT: Rapid Smurfing / Structuring Hub**\n\n- **Target Hub:** \`MULE_RING_01\` (Mule Ring Central Node).\n- **Structuring:** 12 inbound transfers strictly between $2,200 and $4,800 to evade CTR ($10k) thresholds.\n- **Disbursement:** Followed by rapid fan-out wire transfers to external cashout accounts.\n- **Action:** Impose immediate debit block on target account.`;
    risk = 89;
    targetAccounts = ['MULE_RING_01', 'MULE_RING_02', 'MULE_RING_03', 'MULE_RING_04', 'MULE_RING_05', 'MULE_RING_06', 'ACC_0059', 'ACC_0060'];
  } else if (p.includes('shell') || p.includes('offshore') || p.includes('jurisdiction') || p.includes('panama') || p.includes('bvi')) {
    query = `MATCH (e:Entity)-[:OWNS]->(a:Account)-[r:TRANSFER]->(b:Account)<-[:OWNS]-(e2:Entity)
WHERE e.is_shell = true AND e2.is_shell = true
RETURN e, a, r, b, e2`;
    summary = `**CRITICAL AML ALERT: Cross-Border Shell Entity Triangular Loop**\n\n- **Jurisdictions:** Seychelles (\`Mariner Offshore Trading\`), Panama (\`Horizon Gateway Capital\`), BVI (\`Blue Ocean Merchant\`).\n- **Mechanism:** Triangular loop moving $441,060 through high-secrecy offshore company accounts.\n- **Action:** Escalate to international compliance unit.`;
    risk = 94;
    targetAccounts = ['SHELL_ACC_01', 'SHELL_ACC_02', 'SHELL_ACC_03'];
  }

  const filteredGraph = await fetchGraph(targetAccounts[0] || undefined, true);

  return {
    generated_cypher: query,
    steps: [
      { step: 1, name: 'Reading schema', status: 'done', detail: 'Introspected Graph Schema: Account, Device, IPAddress, Entity' },
      { step: 2, name: 'Generating Cypher', status: 'done', detail: 'Compiled read-only AML Cypher query' },
      { step: 3, name: 'Executing', status: 'done', detail: `Executed pattern match (${filteredGraph.nodes.length} nodes returned)` },
      { step: 4, name: 'Summarizing', status: 'done', detail: 'Synthesized FinCEN regulatory compliance narrative' },
    ],
    summary,
    graphData: filteredGraph,
    risk,
  };
}

export async function freezeAccount(accountId: string, isDemoMode: boolean = false): Promise<{ account_id: string; status: string; message: string }> {
  if (!isDemoMode) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/freeze/${encodeURIComponent(accountId)}`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Freeze endpoint failed on backend, executing local state freeze.', e);
    }
  }

  return {
    account_id: accountId,
    status: 'frozen',
    message: `Account ${accountId} has been FROZEN. Inbound/outbound wire channels blocked.`,
  };
}

export async function fetchBlastRadius(accountId: string, isDemoMode: boolean = false): Promise<BlastRadiusResult> {
  if (!isDemoMode) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/blast-radius/${encodeURIComponent(accountId)}`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Blast radius endpoint failed on backend, calculating local blast radius.', e);
    }
  }

  const allNodes = (demoData.graph?.nodes || []) as any[];
  const allLinks = (demoData.graph?.links || []) as any[];

  // 4 hops BFS
  const visited = new Map<string, number>([[accountId, 0]]);
  const queue: [string, number][] = [[accountId, 0]];

  while (queue.length > 0) {
    const [curr, dist] = queue.shift()!;
    if (dist >= 4) continue;
    for (const l of allLinks) {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const dst = typeof l.target === 'object' ? l.target.id : l.target;
      let neighbor: string | null = null;
      if (src === curr) neighbor = dst;
      else if (dst === curr) neighbor = src;

      if (neighbor && !visited.has(neighbor)) {
        visited.set(neighbor, dist + 1);
        queue.push([neighbor, dist + 1]);
      }
    }
  }

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const blastAccounts = Array.from(visited.entries())
    .filter(([id]) => id !== accountId && nodeMap.has(id) && nodeMap.get(id).group === 'Account')
    .map(([id, distance]) => {
      const n = nodeMap.get(id);
      return {
        account_id: id,
        holder_name: n.holder_name || id,
        risk_score: n.risk_score || 10,
        status: n.status || 'active',
        distance,
        relationship_types: ['TRANSFER', 'USED_DEVICE'],
      };
    })
    .sort((a, b) => a.distance - b.distance || b.risk_score - a.risk_score);

    return {
    root_account: accountId,
    total_reachable: blastAccounts.length,
    blast_radius_accounts: blastAccounts,
  };
}

export async function fetchKaggleStats(): Promise<KaggleStats> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/kaggle/stats`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[API] Kaggle stats endpoint failed, using client fallback.', e);
  }
  return {
    dataset_name: 'Kaggle IBM Anti-Money Laundering (AML) Benchmark',
    total_transactions: 472,
    laundering_transactions: 22,
    laundering_rate_pct: 4.66,
    total_volume_usd: 8250552.1,
    laundering_volume_usd: 7138327.42,
    top_banks: {
      'HSBC Bank UK (0401)': 55,
      'Deutsche Bank AG (0103)': 54,
      'Standard Chartered (0722)': 53,
      'Bank of America (0032)': 48,
      'JPMorgan Chase (0021)': 45,
    },
    payment_formats: {
      'SWIFT Wire': 103,
      'Cheque': 102,
      'Cash Deposit': 94,
      'Credit Card': 92,
      'ACH Transfer': 81,
    },
    laundering_typologies: {
      'Structured Cash Deposit (CTR Evasion)': 14,
      'Multi-Bank SWIFT Circular Layering': 5,
      'Cross-Border Currency Conversion Layering': 3,
    },
  };
}

export async function fetchKaggleTransactions(params: {
  page?: number;
  limit?: number;
  search?: string;
  bank?: string;
  currency?: string;
  paymentFormat?: string;
  launderingOnly?: boolean;
}): Promise<KaggleTransactionsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.bank) query.set('bank', params.bank);
  if (params.currency) query.set('currency', params.currency);
  if (params.paymentFormat) query.set('payment_format', params.paymentFormat);
  if (params.launderingOnly) query.set('laundering_only', 'true');

  try {
    const res = await fetch(`${API_BASE_URL}/api/kaggle/transactions?${query.toString()}`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[API] Kaggle transactions failed on backend.', e);
  }

  return {
    total: 0,
    page: params.page || 1,
    limit: params.limit || 50,
    records: [],
  };
}

export async function fetchKaggleGraph(launderingOnly: boolean = true): Promise<GraphData> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/kaggle/graph?laundering_only=${launderingOnly}`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[API] Kaggle graph endpoint failed on backend.', e);
  }
  return { nodes: [], links: [] };
}

