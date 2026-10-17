"""
queries.py - Parameterized Cypher queries and detection engine for FinCrime Sentinel
"""

# 1. Circular Loop Detection (3 to 6 hops)
# Deduplicates cycle rotations by enforcing the lexicographical minimum account_id is first
QUERY_CIRCULAR_LOOPS = """
MATCH path=(a:Account)-[:TRANSFER*3..6]->(a)
WHERE all(i IN range(0, size(relationships(path))-2)
      WHERE (relationships(path)[i]).timestamp <= (relationships(path)[i+1]).timestamp)
WITH path,
     [n IN nodes(path) | n.account_id] AS raw_accounts,
     relationships(path) AS txs
// Rotation deduplication: retain only the cycle representation starting at the minimum account_id
WHERE reduce(m = raw_accounts[0], x IN raw_accounts[0..-1] | CASE WHEN x < m THEN x ELSE m END) = raw_accounts[0]
WITH raw_accounts[0..-1] AS cycle_accounts,
     size(txs) AS hops,
     reduce(s = 0.0, r IN txs | s + r.amount) AS total_volume,
     txs[0].amount AS start_amount,
     txs[-1].amount AS end_amount,
     txs[0].timestamp AS start_time,
     txs[-1].timestamp AS end_time,
     [r IN txs | {tx_id: r.tx_id, amount: r.amount, timestamp: r.timestamp}] AS transfers
RETURN cycle_accounts AS accounts,
       hops,
       round(total_volume, 2) AS total_volume,
       round((end_amount / start_amount) * 100, 2) AS retained_pct,
       start_time,
       end_time,
       transfers
ORDER BY total_volume DESC
"""

# 2. Shared Infrastructure Detection (Device or IP >= min_accounts)
QUERY_SHARED_INFRASTRUCTURE = """
MATCH (a:Account)-[:USED_DEVICE]->(d:Device)
WITH 'Device' AS infra_type, d.device_id AS infra_id, collect(DISTINCT a.account_id) AS accounts
WHERE size(accounts) >= $min_accounts
RETURN infra_type, infra_id, accounts, size(accounts) AS account_count
UNION
MATCH (a:Account)-[:LOGGED_IN_IP]->(i:IPAddress)
WITH 'IPAddress' AS infra_type, i.ip AS infra_id, collect(DISTINCT a.account_id) AS accounts
WHERE size(accounts) >= $min_accounts
RETURN infra_type, infra_id, accounts, size(accounts) AS account_count
ORDER BY account_count DESC
"""

# 3. Smurfing / Rapid Fan-In Detection
QUERY_SMURFING_FAN_IN = """
MATCH (src:Account)-[r:TRANSFER]->(target:Account)
WHERE r.amount <= $max_amount
WITH target,
     collect(r) AS small_transfers,
     collect(DISTINCT src.account_id) AS source_accounts,
     count(r) AS transfer_count,
     sum(r.amount) AS total_fan_in
WHERE transfer_count >= $min_transfers
RETURN target.account_id AS target_account,
       target.holder_name AS target_holder,
       transfer_count,
       round(total_fan_in, 2) AS total_fan_in,
       source_accounts,
       [tx IN small_transfers | {tx_id: tx.tx_id, amount: tx.amount, timestamp: tx.timestamp}] AS transfers
ORDER BY transfer_count DESC
"""

# 4. Blast Radius (Reachable within 4 hops via TRANSFER or Shared Infra)
QUERY_BLAST_RADIUS = """
MATCH (root:Account {account_id: $account_id})
MATCH path = (root)-[r:TRANSFER|USED_DEVICE|LOGGED_IN_IP*1..4]-(other:Account)
WHERE root <> other
WITH other, min(length(path)) AS distance, collect(DISTINCT type(r[0])) AS rel_types
RETURN other.account_id AS account_id,
       other.holder_name AS holder_name,
       other.risk_score AS risk_score,
       other.status AS status,
       distance,
       rel_types
ORDER BY distance ASC, other.risk_score DESC
LIMIT $limit
"""

# 5. Subgraph Extraction around Account or Alert
QUERY_ACCOUNT_SUBGRAPH = """
MATCH (a:Account {account_id: $account_id})
OPTIONAL MATCH (a)-[r:TRANSFER]-(other:Account)
OPTIONAL MATCH (a)-[:USED_DEVICE]->(d:Device)
OPTIONAL MATCH (a)-[:LOGGED_IN_IP]->(i:IPAddress)
OPTIONAL MATCH (e:Entity)-[:OWNS]->(a)
RETURN a, collect(DISTINCT r) AS transfers,
       collect(DISTINCT other) AS connected_accounts,
       collect(DISTINCT d) AS devices,
       collect(DISTINCT i) AS ips,
       collect(DISTINCT e) AS entities
"""

# 6. Full Investigation / High-Risk Subgraph
QUERY_HIGH_RISK_SUBGRAPH = """
MATCH (a:Account)
WHERE a.risk_score >= $min_risk OR a.status = 'frozen'
OPTIONAL MATCH (a)-[r:TRANSFER]-(b:Account)
OPTIONAL MATCH (a)-[:USED_DEVICE]->(d:Device)
OPTIONAL MATCH (a)-[:LOGGED_IN_IP]->(i:IPAddress)
OPTIONAL MATCH (e:Entity)-[:OWNS]->(a)
RETURN collect(DISTINCT a) + collect(DISTINCT b) AS accounts,
       collect(DISTINCT r) AS transfers,
       collect(DISTINCT d) AS devices,
       collect(DISTINCT i) AS ips,
       collect(DISTINCT e) AS entities
"""

# 7. Freeze Account Action
QUERY_FREEZE_ACCOUNT = """
MATCH (a:Account {account_id: $account_id})
SET a.status = 'frozen', a.frozen_at = datetime()
RETURN a.account_id AS account_id, a.holder_name AS holder_name, a.status AS status
"""

# 8. Schema Introspection for AI Agent
QUERY_SCHEMA_INTROSPECTION = """
CALL db.schema.visualization()
"""


def compute_risk_scoring(driver):
    """
    Evaluates AML detection rules across Neo4j and updates risk scores on Account nodes.
    Returns calculated risk breakdowns.
    """
    account_scores = {}
    account_explanations = {}

    def add_risk(acc_id, points, explanation):
        if acc_id not in account_scores:
            account_scores[acc_id] = 10
            account_explanations[acc_id] = []
        account_scores[acc_id] = min(100, account_scores[acc_id] + points)
        if explanation not in account_explanations[acc_id]:
            account_explanations[acc_id].append(explanation)

    with driver.session() as session:
        # Check loops
        loop_res = session.run(QUERY_CIRCULAR_LOOPS)
        for record in loop_res:
            for acc in record["accounts"]:
                add_risk(acc, 45, f"Member of {record['hops']}-hop circular laundering cycle (${record['total_volume']:,.2f})")

        # Check shared infra
        infra_res = session.run(QUERY_SHARED_INFRASTRUCTURE, min_accounts=3)
        for record in infra_res:
            for acc in record["accounts"]:
                add_risk(acc, 35, f"Shared {record['infra_type']} ({record['infra_id']}) with {record['account_count']} accounts")

        # Check smurfing fan-in
        smurf_res = session.run(QUERY_SMURFING_FAN_IN, max_amount=5000.0, min_transfers=4)
        for record in smurf_res:
            target = record["target_account"]
            add_risk(target, 30, f"Smurfing fan-in hub: {record['transfer_count']} structured transfers (${record['total_fan_in']:,.2f})")
            for feeder in record["source_accounts"]:
                add_risk(feeder, 20, f"Smurfing feeder account for hub {target}")

        # Check shell entity ownership
        shell_res = session.run("""
            MATCH (e:Entity)-[:OWNS]->(a:Account)
            WHERE e.jurisdiction IN ['Cyprus', 'Panama', 'Seychelles', 'British Virgin Islands', 'Belize', 'Cayman Islands']
            RETURN a.account_id AS account_id, e.name AS entity_name, e.jurisdiction AS jurisdiction
        """)
        for record in shell_res:
            add_risk(record["account_id"], 25, f"Owned by offshore shell entity: {record['entity_name']} ({record['jurisdiction']})")

        # Update in Neo4j
        for acc_id, score in account_scores.items():
            session.run("""
                MATCH (a:Account {account_id: $acc_id})
                SET a.risk_score = $score, a.risk_reasons = $reasons
            """, acc_id=acc_id, score=score, reasons=account_explanations.get(acc_id, []))

    return account_scores, account_explanations
