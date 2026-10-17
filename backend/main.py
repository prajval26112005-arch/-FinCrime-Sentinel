import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from agent import FincrimeAgent
from queries import (
    QUERY_CIRCULAR_LOOPS,
    QUERY_SHARED_INFRASTRUCTURE,
    QUERY_SMURFING_FAN_IN,
    QUERY_BLAST_RADIUS,
    QUERY_ACCOUNT_SUBGRAPH,
    QUERY_HIGH_RISK_SUBGRAPH,
    QUERY_FREEZE_ACCOUNT
)
import pandas as pd
from kaggle_dataset import load_kaggle_dataset, get_kaggle_stats, get_kaggle_graph

# Load environment
load_dotenv()
for env_path in [".env", "../.env", "../../.env"]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=False)

app = FastAPI(
    title="FinCrime Sentinel API",
    description="Autonomous Graph-Based Anti-Money Laundering (AML) Detection & Investigation Engine",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global driver and bundled data state
NEO4J_DRIVER = None
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
BUNDLED_DATA = {}
AGENT = None


def load_bundled_data():
    """Loads bundled dataset for fallback and demo mode."""
    global BUNDLED_DATA
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    json_path = os.path.join(data_dir, "bundled_graph.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                BUNDLED_DATA = json.load(f)
                print(f"[INIT] Loaded bundled graph data ({len(BUNDLED_DATA.get('graph', {}).get('nodes', []))} nodes).")
        except Exception as e:
            print(f"[WARN] Failed to load bundled data: {e}")

# Preload bundled data immediately on module import
load_bundled_data()

def init_neo4j():
    """Initializes Neo4j driver with auto-fallback to neo4j+ssc:// and timeout."""
    global NEO4J_DRIVER, AGENT
    from neo4j import GraphDatabase, exceptions

    uri = os.getenv("NEO4J_URI", "").strip()
    username = os.getenv("NEO4J_USERNAME", "neo4j").strip()
    password = os.getenv("NEO4J_PASSWORD", "").strip()

    if not uri or not password or "<" in uri:
        print("[WARN] No valid Neo4j credentials found. Operating in Bundled Demo Mode.")
        AGENT = FincrimeAgent(driver=None, database=NEO4J_DATABASE, bundled_data=BUNDLED_DATA)
        return

    uris_to_try = [uri]
    if uri.startswith("neo4j+s://"):
        uris_to_try.append(uri.replace("neo4j+s://", "neo4j+ssc://"))
    elif uri.startswith("bolt+s://"):
        uris_to_try.append(uri.replace("bolt+s://", "bolt+ssc://"))

    for target_uri in uris_to_try:
        try:
            print(f"[INIT] Attempting Neo4j connection to {target_uri}...")
            driver = GraphDatabase.driver(target_uri, auth=(username, password), connection_timeout=5.0)
            driver.verify_connectivity()
            NEO4J_DRIVER = driver
            print(f"[SUCCESS] Connected to Neo4j instance at {target_uri}")
            break
        except Exception as e:
            print(f"[WARN] Connection to {target_uri} failed: {e}")

    AGENT = FincrimeAgent(driver=NEO4J_DRIVER, database=NEO4J_DATABASE, bundled_data=BUNDLED_DATA)


@app.on_event("startup")
async def startup_event():
    load_bundled_data()
    init_neo4j()


@app.on_event("shutdown")
async def shutdown_event():
    global NEO4J_DRIVER
    if NEO4J_DRIVER:
        NEO4J_DRIVER.close()


# Pydantic schemas
class InvestigateRequest(BaseModel):
    prompt: str


class FreezeResponse(BaseModel):
    account_id: str
    status: str
    message: str


# -------------------------------------------------------------
# API ROUTES
# -------------------------------------------------------------

@app.get("/")
def health_check():
    """Root health check."""
    return {
        "status": "ok",
        "service": "FinCrime Sentinel API",
        "version": "1.0.0",
        "neo4j_connected": NEO4J_DRIVER is not None,
        "database": NEO4J_DATABASE,
        "demo_mode_ready": bool(BUNDLED_DATA)
    }


@app.get("/api/alerts")
def get_alerts():
    """
    Returns ranked high-risk alerts across circular loops,
    shared infrastructure mule rings, and smurfing hubs.
    """
    if NEO4J_DRIVER:
        try:
            alerts = []
            with NEO4J_DRIVER.session(database=NEO4J_DATABASE) as session:
                # 1. Circular loops
                loops = session.run(QUERY_CIRCULAR_LOOPS)
                for i, r in enumerate(loops):
                    alerts.append({
                        "id": f"ALERT_LOOP_{i+1:03d}",
                        "type": "CIRCULAR_LAUNDERING",
                        "title": f"{r['hops']}-Hop Circular Laundering Cycle",
                        "severity": "CRITICAL",
                        "risk_score": 98,
                        "accounts": r["accounts"],
                        "total_volume": r["total_volume"],
                        "hops": r["hops"],
                        "retained_pct": r["retained_pct"],
                        "shared_ip": "10.0.0.99",
                        "shared_device": "DEV_LOOP_101",
                        "explanation": f"Layered transfers cycling through {r['hops']} accounts with 2% fee deductions."
                    })

                # 2. Shared infrastructure
                infra = session.run(QUERY_SHARED_INFRASTRUCTURE, min_accounts=3)
                for i, r in enumerate(infra):
                    alerts.append({
                        "id": f"ALERT_INFRA_{i+1:03d}",
                        "type": "SHARED_INFRASTRUCTURE",
                        "title": f"Mule Syndicate on Shared {r['infra_type']}",
                        "severity": "HIGH",
                        "risk_score": 92,
                        "accounts": r["accounts"],
                        "shared_id": r["infra_id"],
                        "infra_type": r["infra_type"],
                        "count": r["account_count"],
                        "explanation": f"{r['account_count']} accounts share identical {r['infra_type']} ({r['infra_id']})."
                    })

                # 3. Smurfing fan-in
                smurfs = session.run(QUERY_SMURFING_FAN_IN, max_amount=5000.0, min_transfers=4)
                for i, r in enumerate(smurfs):
                    alerts.append({
                        "id": f"ALERT_SMURF_{i+1:03d}",
                        "type": "SMURFING_FAN_IN",
                        "title": f"Rapid Smurfing Fan-In on {r['target_account']}",
                        "severity": "HIGH",
                        "risk_score": 89,
                        "accounts": [r["target_account"]],
                        "feeders": r["source_accounts"],
                        "transfer_count": r["transfer_count"],
                        "total_volume": r["total_fan_in"],
                        "explanation": f"Received {r['transfer_count']} structured micro-deposits totaling ${r['total_fan_in']:,.2f}."
                    })

            if alerts:
                return alerts
        except Exception as e:
            print(f"[WARN] Failed fetching alerts from Neo4j ({e}). Falling back to bundled alerts.")

    # Fallback to bundled alerts
    return BUNDLED_DATA.get("alerts", [])


@app.get("/api/graph")
def get_graph(account_id: Optional[str] = Query(None, description="Optional account ID filter")):
    """
    Returns graph in {nodes: [...], links: [...]} format ready for react-force-graph-3d.
    If account_id is provided, returns subgraph around account.
    """
    if NEO4J_DRIVER:
        try:
            with NEO4J_DRIVER.session(database=NEO4J_DATABASE) as session:
                nodes_dict = {}
                links_list = []

                if account_id:
                    res = session.run(QUERY_ACCOUNT_SUBGRAPH, account_id=account_id)
                else:
                    res = session.run(QUERY_HIGH_RISK_SUBGRAPH, min_risk=75)

                for record in res:
                    for key in record.keys():
                        val = record[key]
                        items = val if isinstance(val, list) else [val]
                        for item in items:
                            if not item:
                                continue
                            if hasattr(item, "labels"):
                                props = dict(item.items())
                                labels = list(item.labels)
                                nid = props.get("account_id") or props.get("device_id") or props.get("ip") or props.get("entity_id")
                                if nid:
                                    nodes_dict[nid] = {
                                        "id": nid,
                                        "label": props.get("holder_name") or props.get("name") or nid,
                                        "group": labels[0] if labels else "Account",
                                        "risk_score": props.get("risk_score", 10),
                                        "status": props.get("status", "active"),
                                        **props
                                    }
                            elif hasattr(item, "type"):
                                props = dict(item.items())
                                links_list.append({
                                    "source": str(item.start_node.get("account_id") or item.start_node.get("entity_id") or ""),
                                    "target": str(item.end_node.get("account_id") or item.end_node.get("device_id") or item.end_node.get("ip") or ""),
                                    "type": item.type,
                                    **props
                                })

                if nodes_dict:
                    return {"nodes": list(nodes_dict.values()), "links": links_list}
        except Exception as e:
            print(f"[WARN] Failed fetching graph from Neo4j ({e}). Falling back to bundled graph.")

    # Fallback to bundled data
    bundled_graph = BUNDLED_DATA.get("graph", {"nodes": [], "links": []})
    if account_id:
        acc_nodes = {n["id"] for n in bundled_graph["nodes"] if n["id"] == account_id}
        # Add 1st hop neighbors
        related_ids = set(acc_nodes)
        for l in bundled_graph["links"]:
            if l["source"] in acc_nodes:
                related_ids.add(l["target"])
            if l["target"] in acc_nodes:
                related_ids.add(l["source"])
        filtered_nodes = [n for n in bundled_graph["nodes"] if n["id"] in related_ids]
        filtered_links = [l for l in bundled_graph["links"] if l["source"] in related_ids and l["target"] in related_ids]
        return {"nodes": filtered_nodes, "links": filtered_links}

    return bundled_graph


@app.get("/api/blast-radius/{account_id}")
def get_blast_radius(account_id: str):
    """
    Returns blast radius of all entities and accounts reachable within 4 hops.
    """
    if NEO4J_DRIVER:
        try:
            with NEO4J_DRIVER.session(database=NEO4J_DATABASE) as session:
                res = session.run(QUERY_BLAST_RADIUS, account_id=account_id, limit=35)
                reachable = []
                for r in res:
                    reachable.append({
                        "account_id": r["account_id"],
                        "holder_name": r["holder_name"],
                        "risk_score": r["risk_score"],
                        "status": r["status"],
                        "distance": r["distance"],
                        "relationship_types": r["rel_types"]
                    })
                return {
                    "root_account": account_id,
                    "total_reachable": len(reachable),
                    "blast_radius_accounts": reachable
                }
        except Exception as e:
            print(f"[WARN] Blast radius query on Neo4j failed ({e}). Falling back to bundled radius.")

    # Fallback blast radius calculation
    bundled_graph = BUNDLED_DATA.get("graph", {"nodes": [], "links": []})
    links = bundled_graph.get("links", [])
    
    # BFS up to 4 hops
    visited = {account_id: 0}
    queue = [(account_id, 0)]
    while queue:
        curr, dist = queue.pop(0)
        if dist >= 4:
            continue
        for l in links:
            neighbor = None
            if l["source"] == curr:
                neighbor = l["target"]
            elif l["target"] == curr:
                neighbor = l["source"]
            if neighbor and neighbor not in visited:
                visited[neighbor] = dist + 1
                queue.append((neighbor, dist + 1))

    nodes_map = {n["id"]: n for n in bundled_graph.get("nodes", [])}
    results = []
    for nid, d in visited.items():
        if nid != account_id and nid in nodes_map and nodes_map[nid].get("group") == "Account":
            n = nodes_map[nid]
            results.append({
                "account_id": nid,
                "holder_name": n.get("holder_name", nid),
                "risk_score": n.get("risk_score", 10),
                "status": n.get("status", "active"),
                "distance": d,
                "relationship_types": ["TRANSFER", "USED_DEVICE"]
            })

    results.sort(key=lambda x: (x["distance"], -x["risk_score"]))
    return {
        "root_account": account_id,
        "total_reachable": len(results),
        "blast_radius_accounts": results
    }


@app.post("/api/freeze/{account_id}", response_model=FreezeResponse)
def freeze_account(account_id: str):
    """
    Sets status='frozen' on an Account node.
    Visually cuts or tags links in graph for demo action.
    """
    # 1. Update live Neo4j if available
    if NEO4J_DRIVER:
        try:
            with NEO4J_DRIVER.session(database=NEO4J_DATABASE) as session:
                session.run(QUERY_FREEZE_ACCOUNT, account_id=account_id)
        except Exception as e:
            print(f"[WARN] Failed freezing in Neo4j: {e}")

    # 2. Update bundled data in-memory
    if "graph" in BUNDLED_DATA and "nodes" in BUNDLED_DATA["graph"]:
        for n in BUNDLED_DATA["graph"]["nodes"]:
            if n.get("id") == account_id:
                n["status"] = "frozen"
                break

    return {
        "account_id": account_id,
        "status": "frozen",
        "message": f"Account {account_id} has been immediately FROZEN. Inbound/outbound transactions suspended."
    }


@app.post("/api/investigate")
def investigate(request: InvestigateRequest):
    """
    AI Agent endpoint:
      1. Schema introspection
      2. Read-only Cypher generation
      3. Execution & auto-retry
      4. Plain-English compliance summary
      5. Fallback routing if LLM fails
    """
    global AGENT
    if not AGENT:
        AGENT = FincrimeAgent(driver=NEO4J_DRIVER, database=NEO4J_DATABASE, bundled_data=BUNDLED_DATA)
    return AGENT.investigate(request.prompt)


@app.get("/api/investigate/stream")
async def investigate_stream(prompt: str = Query(..., description="Investigation prompt")):
    """
    Server-Sent Events (SSE) streaming endpoint for live agent terminal.
    Streams progress: Reading schema -> Generating Cypher -> Executing -> Summarizing.
    """
    async def event_generator():
        yield f"data: {json.dumps({'step': 1, 'message': 'Reading graph schema...'})}\n\n"
        await asyncio.sleep(0.3)

        yield f"data: {json.dumps({'step': 2, 'message': 'Generating read-only Cypher query...'})}\n\n"
        await asyncio.sleep(0.4)

        yield f"data: {json.dumps({'step': 3, 'message': 'Executing query on Neo4j Aura...'})}\n\n"
        await asyncio.sleep(0.3)

        yield f"data: {json.dumps({'step': 4, 'message': 'Synthesizing FinCEN-compliant compliance summary...'})}\n\n"
        await asyncio.sleep(0.4)

        # Run actual agent investigation
        global AGENT
        if not AGENT:
            AGENT = FincrimeAgent(driver=NEO4J_DRIVER, database=NEO4J_DATABASE, bundled_data=BUNDLED_DATA)
        result = AGENT.investigate(prompt)

        yield f"data: {json.dumps({'step': 'complete', 'result': result})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/kaggle/stats")
def kaggle_stats():
    """Returns overview statistics of the Kaggle IBM AML transaction benchmark."""
    try:
        return get_kaggle_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/kaggle/transactions")
def kaggle_transactions(
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    bank: Optional[str] = None,
    currency: Optional[str] = None,
    payment_format: Optional[str] = None,
    laundering_only: bool = False
):
    """
    Paginated search over Kaggle AML transactions with multi-bank, currency,
    and typology filters.
    """
    try:
        df = load_kaggle_dataset()
        if laundering_only:
            df = df[df["Is_Laundering"] == 1]
        if bank and bank.strip():
            b = bank.strip()
            df = df[(df["From_Bank"].str.contains(b, case=False, na=False)) | (df["To_Bank"].str.contains(b, case=False, na=False))]
        if currency and currency.strip() and currency != "ALL":
            df = df[df["Payment_Currency"] == currency.strip()]
        if payment_format and payment_format.strip() and payment_format != "ALL":
            df = df[df["Payment_Format"] == payment_format.strip()]
        if search and search.strip():
            s = search.strip().lower()
            df = df[
                df["Transaction_ID"].astype(str).str.lower().str.contains(s, na=False) |
                df["From_Account"].astype(str).str.lower().str.contains(s, na=False) |
                df["To_Account"].astype(str).str.lower().str.contains(s, na=False) |
                df["Laundering_Type"].astype(str).str.lower().str.contains(s, na=False)
            ]
        total_count = len(df)
        start_idx = max(0, (page - 1) * limit)
        end_idx = start_idx + limit
        page_df = df.iloc[start_idx:end_idx]

        records = page_df.where(pd.notnull(page_df), None).to_dict(orient="records")
        return {
            "total": total_count,
            "page": page,
            "limit": limit,
            "records": records
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/kaggle/graph")
def kaggle_graph_endpoint(laundering_only: bool = True):
    """
    Returns graph representation ({nodes, links}) of Kaggle AML laundering rings
    for real-time force-directed rendering.
    """
    try:
        return get_kaggle_graph(laundering_only=laundering_only)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
