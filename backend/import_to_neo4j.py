import os
import sys
import argparse
import pandas as pd
from dotenv import load_dotenv
from neo4j import GraphDatabase, exceptions

# Import local data generator if CSVs missing
try:
    from generate_data import generate_fin_crime_data
    from queries import compute_risk_scoring
except ImportError:
    from backend.generate_data import generate_fin_crime_data
    from backend.queries import compute_risk_scoring


def get_driver():
    """
    Connects to Neo4j using credentials from .env.
    Automatically handles neo4j+s:// fallback to neo4j+ssc:// if SSL routing fails.
    """
    # Look for .env in current and parent directory
    load_dotenv()
    for env_path in [".env", "../.env", "../../.env"]:
        if os.path.exists(env_path):
            load_dotenv(env_path, override=False)

    uri = os.getenv("NEO4J_URI", "").strip()
    username = os.getenv("NEO4J_USERNAME", "neo4j").strip()
    password = os.getenv("NEO4J_PASSWORD", "").strip()
    database = os.getenv("NEO4J_DATABASE", "neo4j").strip()

    if not uri or not password or "<" in uri or "<" in password:
        print("\n[CONFIG ERROR] Missing required Neo4j credentials in .env file!")
        print("Please check your .env configuration:")
        print("  NEO4J_URI=neo4j+s://<id>.databases.neo4j.io")
        print("  NEO4J_USERNAME=neo4j")
        print("  NEO4J_PASSWORD=<your-password>")
        sys.exit(1)

    uris_to_try = [uri]
    if uri.startswith("neo4j+s://"):
        uris_to_try.append(uri.replace("neo4j+s://", "neo4j+ssc://"))
    elif uri.startswith("bolt+s://"):
        uris_to_try.append(uri.replace("bolt+s://", "bolt+ssc://"))

    last_error = None
    for attempt_uri in uris_to_try:
        try:
            print(f"Connecting to Neo4j instance at: {attempt_uri} ...")
            driver = GraphDatabase.driver(attempt_uri, auth=(username, password))
            driver.verify_connectivity()
            print(f"[SUCCESS] Connected to Neo4j successfully via {attempt_uri}")
            return driver, database
        except exceptions.AuthError as e:
            print(f"\n[AUTH ERROR] Neo4j authentication failed for user '{username}' on {attempt_uri}.")
            print("Please verify the NEO4J_PASSWORD in your .env file matches your Neo4j Aura instance.")
            last_error = e
            break
        except exceptions.ServiceUnavailable as e:
            print(f"[WARN] Connection to {attempt_uri} failed ({e}), checking fallback...")
            last_error = e
        except Exception as e:
            last_error = e
            break

    print(f"\n[FATAL] Unable to establish connection to Neo4j: {last_error}")
    raise last_error


def run_batch_query(session, query: str, data: list, batch_size: int = 500, label: str = "items"):
    total = len(data)
    for i in range(0, total, batch_size):
        batch = data[i : i + batch_size]
        session.run(query, batch=batch)
        processed = min(i + batch_size, total)
        print(f"    -> Processed {processed}/{total} {label}...")


def import_fin_crime_graph(reset: bool = False, data_dir: str = None):
    """
    Imports FinCrime Sentinel entities, accounts, infrastructure, and transactions.
    Ensures constraints, performs batched loading, and computes graph AML risk scores.
    """
    if data_dir is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, "data")
    
    # Check if data files exist; generate if needed
    accounts_csv = os.path.join(data_dir, "accounts.csv")
    if not os.path.exists(accounts_csv):
        print("[INFO] Data files not found. Generating fresh dataset...")
        generate_fin_crime_data(data_dir)

    driver, database = get_driver()

    print("\n" + "=" * 65)
    print("        FINCRIME SENTINEL - NEO4J INGESTION PIPELINE")
    print("=" * 65)

    try:
        with driver.session(database=database) as session:
            # 1. Reset database if requested
            if reset:
                print("\n[Step 1/6] Clearing existing database (--reset specified)...")
                session.run("MATCH (n) DETACH DELETE n")
                print("  [SUCCESS] All existing nodes and relationships cleared.")
            else:
                print("\n[Step 1/6] Skipping DB wipe (idempotent MERGE mode enabled).")

            # 2. Schema Constraints (Uniqueness)
            print("\n[Step 2/6] Enforcing schema uniqueness constraints...")
            constraints = [
                ("Account uniqueness", "CREATE CONSTRAINT account_id_unique IF NOT EXISTS FOR (a:Account) REQUIRE a.account_id IS UNIQUE"),
                ("Device uniqueness", "CREATE CONSTRAINT device_id_unique IF NOT EXISTS FOR (d:Device) REQUIRE d.device_id IS UNIQUE"),
                ("IPAddress uniqueness", "CREATE CONSTRAINT ip_unique IF NOT EXISTS FOR (i:IPAddress) REQUIRE i.ip IS UNIQUE"),
                ("Entity uniqueness", "CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.entity_id IS UNIQUE"),
            ]
            for name, query in constraints:
                session.run(query)
                print(f"  + Enforced: {name}")

            # 3. Ingest Nodes
            print("\n[Step 3/6] Ingesting nodes (Entities, Accounts, Devices, IPs)...")
            
            # Entities
            df_entities = pd.read_csv(os.path.join(data_dir, "entities.csv"))
            query_entities = """
            UNWIND $batch AS row
            MERGE (e:Entity {entity_id: row.entity_id})
            SET e.name = row.name,
                e.jurisdiction = row.jurisdiction,
                e.created_at = row.created_at,
                e.is_shell = toBoolean(row.is_shell)
            """
            run_batch_query(session, query_entities, df_entities.to_dict(orient="records"), label="entities")

            # Accounts
            df_accounts = pd.read_csv(os.path.join(data_dir, "accounts.csv"))
            query_accounts = """
            UNWIND $batch AS row
            MERGE (a:Account {account_id: row.account_id})
            SET a.holder_name = row.holder_name,
                a.created_at = row.created_at,
                a.risk_score = toInteger(row.risk_score),
                a.status = row.status,
                a.account_type = row.account_type
            """
            run_batch_query(session, query_accounts, df_accounts.to_dict(orient="records"), label="accounts")

            # Devices
            df_devices = pd.read_csv(os.path.join(data_dir, "devices.csv"))
            query_devices = """
            UNWIND $batch AS row
            MERGE (d:Device {device_id: row.device_id})
            """
            run_batch_query(session, query_devices, df_devices.to_dict(orient="records"), label="devices")

            # IP Addresses
            df_ips = pd.read_csv(os.path.join(data_dir, "ips.csv"))
            query_ips = """
            UNWIND $batch AS row
            MERGE (i:IPAddress {ip: row.ip})
            """
            run_batch_query(session, query_ips, df_ips.to_dict(orient="records"), label="IPs")

            # 4. Ingest Relationships
            print("\n[Step 4/6] Connecting relationships (OWNS, USED_DEVICE, LOGGED_IN_IP)...")
            
            # (Entity)-[:OWNS]->(Account)
            df_owns = pd.read_csv(os.path.join(data_dir, "entity_owns.csv"))
            query_owns = """
            UNWIND $batch AS row
            MATCH (e:Entity {entity_id: row.entity_id})
            MATCH (a:Account {account_id: row.account_id})
            MERGE (e)-[:OWNS]->(a)
            """
            run_batch_query(session, query_owns, df_owns.to_dict(orient="records"), label="OWNS relationships")

            # (Account)-[:USED_DEVICE]->(Device)
            df_acc_dev = pd.read_csv(os.path.join(data_dir, "account_devices.csv"))
            query_dev = """
            UNWIND $batch AS row
            MATCH (a:Account {account_id: row.account_id})
            MATCH (d:Device {device_id: row.device_id})
            MERGE (a)-[:USED_DEVICE]->(d)
            """
            run_batch_query(session, query_dev, df_acc_dev.to_dict(orient="records"), label="USED_DEVICE relationships")

            # (Account)-[:LOGGED_IN_IP]->(IPAddress)
            df_acc_ip = pd.read_csv(os.path.join(data_dir, "account_ips.csv"))
            query_ip = """
            UNWIND $batch AS row
            MATCH (a:Account {account_id: row.account_id})
            MATCH (i:IPAddress {ip: row.ip})
            MERGE (a)-[:LOGGED_IN_IP]->(i)
            """
            run_batch_query(session, query_ip, df_acc_ip.to_dict(orient="records"), label="LOGGED_IN_IP relationships")

            # (Account)-[:TRANSFER]->(Account)
            print("\n[Step 5/6] Ingesting financial TRANSFER transactions...")
            df_transfers = pd.read_csv(os.path.join(data_dir, "transfers.csv"))
            query_transfer = """
            UNWIND $batch AS row
            MATCH (src:Account {account_id: row.source_account})
            MATCH (dst:Account {account_id: row.target_account})
            CREATE (src)-[:TRANSFER {
                tx_id: row.tx_id,
                amount: toFloat(row.amount),
                timestamp: row.timestamp,
                category: row.category
            }]->(dst)
            """
            run_batch_query(session, query_transfer, df_transfers.to_dict(orient="records"), batch_size=500, label="transfers")

            # 5. Risk Scoring Engine Execution
            print("\n[Step 6/6] Computing and enriching Graph AML Risk Scores...")
            scores, reasons = compute_risk_scoring(driver)
            print(f"  [SUCCESS] Calculated and persisted dynamic risk scores for {len(scores)} accounts.")

            # 6. Final Graph Verification Counts
            print("\n" + "=" * 65)
            print("         GRAPH INGESTION COMPLETE - FINAL METRICS")
            print("=" * 65)
            metric_queries = {
                "Total Accounts (:Account)": "MATCH (a:Account) RETURN count(a) AS c",
                "Total Entities (:Entity)": "MATCH (e:Entity) RETURN count(e) AS c",
                "Total Devices (:Device)": "MATCH (d:Device) RETURN count(d) AS c",
                "Total IPAddresses (:IPAddress)": "MATCH (i:IPAddress) RETURN count(i) AS c",
                "Total Transfers ([:TRANSFER])": "MATCH ()-[r:TRANSFER]->() RETURN count(r) AS c",
                "Total Ownerships ([:OWNS])": "MATCH ()-[r:OWNS]->() RETURN count(r) AS c",
                "High Risk Accounts (score >= 80)": "MATCH (a:Account) WHERE a.risk_score >= 80 RETURN count(a) AS c",
            }
            for label, q in metric_queries.items():
                res = session.run(q).single()
                print(f"  * {label:<35}: {res['c']}")
            print("=" * 65 + "\n")

    finally:
        driver.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FinCrime Sentinel Neo4j Ingestion Pipeline")
    parser.add_argument("--reset", action="store_true", help="Clear all existing nodes/edges prior to loading")
    args = parser.parse_args()
    
    import_fin_crime_graph(reset=args.reset)
