export interface GraphNode {
  id: string;
  label?: string;
  group: 'Account' | 'Device' | 'IPAddress' | 'Entity' | string;
  holder_name?: string;
  created_at?: string;
  risk_score?: number;
  status?: string;
  account_type?: string;
  jurisdiction?: string;
  is_shell?: boolean;
  x?: number;
  y?: number;
  z?: number;
  [key: string]: any;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'TRANSFER' | 'USED_DEVICE' | 'LOGGED_IN_IP' | 'OWNS' | string;
  amount?: number;
  timestamp?: string;
  tx_id?: string;
  category?: string;
  [key: string]: any;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface AlertItem {
  id: string;
  type: 'CIRCULAR_LAUNDERING' | 'SHARED_INFRASTRUCTURE' | 'SMURFING_FAN_IN' | 'CROSS_BORDER_SHELL_LOOP' | string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  risk_score: number;
  statute?: string;
  accounts: string[];
  total_volume?: number;
  initial_volume?: number;
  hops?: number;
  retained_pct?: number;
  shared_ip?: string;
  shared_device?: string;
  time_span?: string;
  explanation: string;
  feeders?: string[];
  entities?: string[];
}

export interface AgentStep {
  step: number | string;
  name: string;
  status: 'done' | 'running' | 'waiting';
  detail: string;
}

export interface InvestigationResult {
  generated_cypher: string;
  steps: AgentStep[];
  summary: string;
  graphData: GraphData;
  risk: number;
}

export interface BlastRadiusAccount {
  account_id: string;
  holder_name: string;
  risk_score: number;
  status: string;
  distance: number;
  relationship_types: string[];
}

export interface BlastRadiusResult {
  root_account: string;
  total_reachable: number;
  blast_radius_accounts: BlastRadiusAccount[];
}

export interface KaggleStats {
  dataset_name: string;
  total_transactions: number;
  laundering_transactions: number;
  laundering_rate_pct: number;
  total_volume_usd: number;
  laundering_volume_usd: number;
  top_banks: Record<string, number>;
  payment_formats: Record<string, number>;
  laundering_typologies: Record<string, number>;
}

export interface KaggleTransaction {
  Transaction_ID: string;
  Timestamp: string;
  From_Bank: string;
  From_Account: string;
  To_Bank: string;
  To_Account: string;
  Amount_Paid: number;
  Payment_Currency: string;
  Amount_Received: number;
  Receiving_Currency: string;
  Payment_Format: string;
  Is_Laundering: number;
  Laundering_Type: string;
}

export interface KaggleTransactionsResponse {
  total: number;
  page: number;
  limit: number;
  records: KaggleTransaction[];
}

