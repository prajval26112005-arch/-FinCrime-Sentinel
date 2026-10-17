import os
import sys
import pandas as pd
from dotenv import load_dotenv
from neo4j import GraphDatabase

def load_data_to_neo4j(csv_path: str = "transactions.csv", batch_size: int = 50):
    """
    Imports financial transactions into Neo4j graph database.
    Creates schema constraints, nodes, and graph relationships.
    """
    # 1. Load environment variables
    load_dotenv()
    
    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")
    
    print("=" * 60)
    print("       FinCrime Sentinel - Neo4j Ingestion Pipeline")
    print("=" * 60)
    
    if not uri or not username or not password or "<your-" in uri or "<your-" in password:
        print("\n[ERROR] Neo4j credentials are not configured properly in .env file!")
        print("Please update your .env with valid credentials:")
        print("  NEO4J_URI=neo4j+s://<your-db-id>.databases.neo4j.io")
        print("  NEO4J_USERNAME=neo4j")
        print("  NEO4J_PASSWORD=<your-aura-password>")
        sys.exit(1)
        
    if not os.path.exists(csv_path):
        print(f"\n[ERROR] Dataset '{csv_path}' not found!")
        print("Please run 'python generate_data.py' first.")
        sys.exit(1)

    print(f"\n[1/4] Connecting to Neo4j instance at: {uri} ...")
    try:
        driver = GraphDatabase.driver(uri, auth=(username, password))
        driver.verify_connectivity()
        print("[SUCCESS] Connected to Neo4j successfully.")
    except Exception as e:
        print(f"[FAILED] Could not connect to Neo4j: {e}")
        sys.exit(1)

    try:
        # 2. Define schema uniqueness constraints
        print("\n[2/4] Defining schema uniqueness constraints...")
        constraints = [
            (
                "Account ID uniqueness",
                "CREATE CONSTRAINT account_id_unique IF NOT EXISTS FOR (a:Account) REQUIRE a.id IS UNIQUE"
            ),
            (
                "IPAddress address uniqueness",
                "CREATE CONSTRAINT ip_address_unique IF NOT EXISTS FOR (i:IPAddress) REQUIRE i.address IS UNIQUE"
            ),
            (
                "Device ID uniqueness",
                "CREATE CONSTRAINT device_id_unique IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE"
            ),
        ]
        
        with driver.session() as session:
            for name, query in constraints:
                session.run(query)
                print(f"  + Applied constraint: {name}")
        print("[SUCCESS] All schema constraints verified.")

        # 3. Read dataset
        print(f"\n[3/4] Reading dataset from '{csv_path}'...")
        df = pd.read_csv(csv_path)
        total_rows = len(df)
        print(f"  + Total transactions to import: {total_rows}")

        # Cypher query for batch loading
        import_query = """
        UNWIND $batch AS row
        // Merge Account nodes
        MERGE (src:Account {id: row.source_account})
        MERGE (dst:Account {id: row.target_account})
        
        // Merge IPAddress node and relationship
        MERGE (ip:IPAddress {address: row.ip_address})
        MERGE (src)-[:LOGGED_IN_FROM]->(ip)
        
        // Merge Device node and relationship
        MERGE (dev:Device {id: row.device_id})
        MERGE (src)-[:USED_DEVICE]->(dev)
        
        // Create Transaction relationship
        CREATE (src)-[:TRANSFERRED {
            transaction_id: row.transaction_id,
            amount: toFloat(row.amount),
            timestamp: row.timestamp,
            tx_type: row.tx_type,
            is_laundering: row.is_laundering
        }]->(dst)
        """

        records = df.to_dict(orient="records")
        print("\n[4/4] Ingesting nodes and relationships in batches...")
        
        with driver.session() as session:
            for i in range(0, total_rows, batch_size):
                batch = records[i : i + batch_size]
                session.run(import_query, batch=batch)
                processed = min(i + batch_size, total_rows)
                print(f"  -> Processed {processed}/{total_rows} transactions...")

        print("\n[SUCCESS] Data ingestion completed successfully!")

        # 4. Summary verification counts
        print("\n--- Graph Summary & Verification ---")
        summary_queries = {
            "Total Accounts (:Account)": "MATCH (a:Account) RETURN count(a) AS count",
            "Total IP Addresses (:IPAddress)": "MATCH (i:IPAddress) RETURN count(i) AS count",
            "Total Devices (:Device)": "MATCH (d:Device) RETURN count(d) AS count",
            "Total Transfers ([:TRANSFERRED])": "MATCH ()-[r:TRANSFERRED]->() RETURN count(r) AS count",
            "Mule Device Transfers": "MATCH (a:Account)-[:USED_DEVICE]->(d:Device {id: 'DEV_999_MULE'}) RETURN count(distinct a) AS count"
        }
        
        with driver.session() as session:
            for label, query in summary_queries.items():
                result = session.run(query)
                record = result.single()
                count = record["count"] if record else 0
                print(f"  * {label}: {count}")

        print("\nFinCrime Sentinel database is ready for graph algorithms and investigation!")
        print("=" * 60)

    finally:
        driver.close()


if __name__ == "__main__":
    load_data_to_neo4j()
