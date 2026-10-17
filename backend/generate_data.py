import os
import json
import random
from datetime import datetime, timedelta
import pandas as pd

def generate_fin_crime_data(output_dir: str = None, seed: int = 42):
    """
    Generates synthetic financial data for FinCrime Sentinel AML platform.
    Produces:
      - 60 normal accounts, ~400 normal transactions ($50-$4500)
      - Fraud scenario 1: 5-hop circular laundering loop ($500k, 2% fee/hop, 15 min apart)
      - Fraud scenario 2: Shared-infrastructure mule ring (6 accounts, 1 device, 1 IP, fan-in smurfing)
      - Fraud scenario 3: 3-hop loop across shell entities in multiple jurisdictions
      - Fraud accounts placed under recently created shell entities
    """
    random.seed(seed)
    
    if output_dir is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_dir = os.path.join(base_dir, "data")
    os.makedirs(output_dir, exist_ok=True)
    
    now = datetime(2026, 10, 16, 12, 0, 0)
    
    # -------------------------------------------------------------
    # 1. ENTITIES (Legitimate businesses + Recent Shell Entities)
    # -------------------------------------------------------------
    entities = []
    
    # Legitimate long-standing entities
    legit_jurisdictions = ["United States", "United Kingdom", "Germany", "Japan", "Canada", "Singapore"]
    legit_names = [
        ("ENT_001", "Summit Logistics LLC", "United States", 750),
        ("ENT_002", "Nordic Horizon Imports", "Germany", 620),
        ("ENT_003", "Kestrel Retail Group", "United Kingdom", 900),
        ("ENT_004", "Pacifica Retail Solutions", "Singapore", 510),
        ("ENT_005", "Maple Leaf Trading Corp", "Canada", 430),
        ("ENT_006", "Tokyo Harbor Services", "Japan", 840),
        ("ENT_007", "Beacon Health Systems", "United States", 1100),
        ("ENT_008", "Apex Precision Tools", "Germany", 600),
    ]
    for eid, name, jur, age_days in legit_names:
        c_at = (now - timedelta(days=age_days)).strftime("%Y-%m-%d")
        entities.append({
            "entity_id": eid,
            "name": name,
            "jurisdiction": jur,
            "created_at": c_at,
            "is_shell": False
        })
        
    # Recently created shell entities (High-risk AML jurisdictions, 12-30 days ago)
    shell_entities_data = [
        ("ENT_SHELL_01", "Golden Crest Holding Ltd", "Cyprus", 18),
        ("ENT_SHELL_02", "Mariner Offshore Trading Ltd", "Seychelles", 21),
        ("ENT_SHELL_03", "Horizon Gateway Capital Corp", "Panama", 14),
        ("ENT_SHELL_04", "Blue Ocean Merchant S.A.", "British Virgin Islands", 25),
        ("ENT_SHELL_05", "Vanguard Global Trust LLC", "Belize", 15),
        ("ENT_SHELL_06", "Silverline Commercial Holdings", "Cayman Islands", 28),
    ]
    for eid, name, jur, age_days in shell_entities_data:
        c_at = (now - timedelta(days=age_days)).strftime("%Y-%m-%d")
        entities.append({
            "entity_id": eid,
            "name": name,
            "jurisdiction": jur,
            "created_at": c_at,
            "is_shell": True
        })
        
    df_entities = pd.DataFrame(entities)
    
    # -------------------------------------------------------------
    # 2. ACCOUNTS
    # -------------------------------------------------------------
    accounts = []
    
    # Normal background accounts (ACC_0001 to ACC_0060)
    first_names = ["James", "Emma", "Liam", "Olivia", "Noah", "Sophia", "Lucas", "Mia", "Alexander", "Isabella"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Taylor", "Anderson"]
    
    for i in range(1, 61):
        acc_id = f"ACC_{i:04d}"
        holder = f"{random.choice(first_names)} {random.choice(last_names)}"
        created_days = random.randint(180, 1000)
        c_at = (now - timedelta(days=created_days)).strftime("%Y-%m-%d")
        accounts.append({
            "account_id": acc_id,
            "holder_name": holder,
            "created_at": c_at,
            "risk_score": random.randint(5, 25),
            "status": "active",
            "account_type": "normal"
        })
        
    # Fraud Ring 1: 5-hop Circular Laundering Accounts
    loop_accounts = ["MULE_101", "MULE_102", "MULE_103", "MULE_104", "MULE_105"]
    for acc_id in loop_accounts:
        c_at = (now - timedelta(days=random.randint(20, 35))).strftime("%Y-%m-%d")
        accounts.append({
            "account_id": acc_id,
            "holder_name": f"Proxy Agent {acc_id}",
            "created_at": c_at,
            "risk_score": 96,
            "status": "active",
            "account_type": "circular_loop"
        })
        
    # Fraud Ring 2: Shared Infrastructure Mule Ring (6 Accounts)
    mule_ring_accounts = [f"MULE_RING_{i:02d}" for i in range(1, 7)]
    for acc_id in mule_ring_accounts:
        c_at = (now - timedelta(days=random.randint(15, 28))).strftime("%Y-%m-%d")
        accounts.append({
            "account_id": acc_id,
            "holder_name": f"Syndicate Account {acc_id}",
            "created_at": c_at,
            "risk_score": 91,
            "status": "active",
            "account_type": "shared_infra_ring"
        })
        
    # Fraud Ring 3: 3-Hop Shell Entity Accounts
    shell_accounts = ["SHELL_ACC_01", "SHELL_ACC_02", "SHELL_ACC_03"]
    for acc_id in shell_accounts:
        c_at = (now - timedelta(days=random.randint(12, 24))).strftime("%Y-%m-%d")
        accounts.append({
            "account_id": acc_id,
            "holder_name": f"Shell Corp Account {acc_id}",
            "created_at": c_at,
            "risk_score": 88,
            "status": "active",
            "account_type": "shell_loop"
        })
        
    df_accounts = pd.DataFrame(accounts)
    
    # -------------------------------------------------------------
    # 3. ENTITY OWNERSHIP (OWNS)
    # -------------------------------------------------------------
    entity_owns = []
    # Assign some normal accounts to legit business entities
    for i, ent in enumerate(legit_names):
        entity_owns.append({
            "entity_id": ent[0],
            "account_id": f"ACC_{(i*5 + 1):04d}"
        })
        entity_owns.append({
            "entity_id": ent[0],
            "account_id": f"ACC_{(i*5 + 2):04d}"
        })
        
    # Assign fraud-ring accounts under recently created shell entities!
    entity_owns.append({"entity_id": "ENT_SHELL_01", "account_id": "MULE_101"})
    entity_owns.append({"entity_id": "ENT_SHELL_01", "account_id": "MULE_102"})
    entity_owns.append({"entity_id": "ENT_SHELL_05", "account_id": "MULE_103"})
    entity_owns.append({"entity_id": "ENT_SHELL_05", "account_id": "MULE_104"})
    entity_owns.append({"entity_id": "ENT_SHELL_06", "account_id": "MULE_105"})
    
    entity_owns.append({"entity_id": "ENT_SHELL_02", "account_id": "SHELL_ACC_01"})
    entity_owns.append({"entity_id": "ENT_SHELL_03", "account_id": "SHELL_ACC_02"})
    entity_owns.append({"entity_id": "ENT_SHELL_04", "account_id": "SHELL_ACC_03"})
    
    for acc_id in mule_ring_accounts:
        entity_owns.append({"entity_id": "ENT_SHELL_05", "account_id": acc_id})
        
    df_owns = pd.DataFrame(entity_owns)

    # -------------------------------------------------------------
    # 4. DEVICES & IP ADDRESSES
    # -------------------------------------------------------------
    devices = []
    ips = []
    account_devices = []
    account_ips = []
    
    # Background devices & IPs
    for i in range(1, 45):
        devices.append({"device_id": f"DEV_NORM_{i:03d}"})
    for i in range(1, 40):
        ips.append({"ip": f"192.168.{random.randint(10, 80)}.{random.randint(2, 250)}"})
        
    for i in range(1, 61):
        acc_id = f"ACC_{i:04d}"
        dev = f"DEV_NORM_{random.randint(1, 44):03d}"
        ip = ips[random.randint(0, len(ips)-1)]["ip"]
        account_devices.append({"account_id": acc_id, "device_id": dev})
        account_ips.append({"account_id": acc_id, "ip": ip})
        
    # Fraud Scenario 1: Shared Device & IP for 5-Hop loop
    loop_dev = "DEV_LOOP_101"
    loop_ip = "10.0.0.99"
    devices.append({"device_id": loop_dev})
    ips.append({"ip": loop_ip})
    for acc_id in loop_accounts:
        account_devices.append({"account_id": acc_id, "device_id": loop_dev})
        account_ips.append({"account_id": acc_id, "ip": loop_ip})
        
    # Fraud Scenario 2: Shared-infrastructure mule ring (6 accounts on ONE device + ONE IP)
    ring_dev = "DEV_MULE_RING_01"
    ring_ip = "198.51.100.88"
    devices.append({"device_id": ring_dev})
    ips.append({"ip": ring_ip})
    for acc_id in mule_ring_accounts:
        account_devices.append({"account_id": acc_id, "device_id": ring_dev})
        account_ips.append({"account_id": acc_id, "ip": ring_ip})
        
    # Fraud Scenario 3: Shell accounts
    shell_dev = "DEV_SHELL_VPN_99"
    shell_ip = "203.0.113.195"
    devices.append({"device_id": shell_dev})
    ips.append({"ip": shell_ip})
    for acc_id in shell_accounts:
        account_devices.append({"account_id": acc_id, "device_id": shell_dev})
        account_ips.append({"account_id": acc_id, "ip": shell_ip})

    df_devices = pd.DataFrame(devices).drop_duplicates()
    df_ips = pd.DataFrame(ips).drop_duplicates()
    df_acc_dev = pd.DataFrame(account_devices).drop_duplicates()
    df_acc_ip = pd.DataFrame(account_ips).drop_duplicates()

    # -------------------------------------------------------------
    # 5. TRANSACTIONS (TRANSFER)
    # -------------------------------------------------------------
    transfers = []
    tx_counter = 1
    
    # 400 normal transactions ($50 - $4500)
    tx_start_date = now - timedelta(days=14)
    normal_accounts_list = [f"ACC_{i:04d}" for i in range(1, 61)]
    for _ in range(400):
        src, dst = random.sample(normal_accounts_list, 2)
        amt = round(random.uniform(50.0, 4500.0), 2)
        rand_sec = random.randint(0, 14 * 86400)
        t_time = (tx_start_date + timedelta(seconds=rand_sec)).strftime("%Y-%m-%d %H:%M:%S")
        transfers.append({
            "tx_id": f"TX_{tx_counter:05d}",
            "source_account": src,
            "target_account": dst,
            "amount": amt,
            "timestamp": t_time,
            "category": "normal"
        })
        tx_counter += 1
        
    # Fraud Scenario 1: 5-hop circular loop ($500k, 2% fee/hop, 15 min apart)
    # MULE_101 -> MULE_102 -> MULE_103 -> MULE_104 -> MULE_105 -> MULE_101
    loop_path = ["MULE_101", "MULE_102", "MULE_103", "MULE_104", "MULE_105", "MULE_101"]
    loop_start_time = now - timedelta(days=2, hours=14)
    current_amt = 500000.0
    for hop in range(len(loop_path) - 1):
        src = loop_path[hop]
        dst = loop_path[hop + 1]
        t_time = (loop_start_time + timedelta(minutes=15 * hop)).strftime("%Y-%m-%d %H:%M:%S")
        amt = round(current_amt, 2)
        transfers.append({
            "tx_id": f"TX_{tx_counter:05d}",
            "source_account": src,
            "target_account": dst,
            "amount": amt,
            "timestamp": t_time,
            "category": "circular_loop"
        })
        tx_counter += 1
        current_amt *= 0.98  # 2% fee deduction per hop
        
    # Fraud Scenario 2: Smurfing / Fan-in to MULE_RING_01, then fan-out
    # Feeders (MULE_RING_02..06) send 15 small structured transactions into MULE_RING_01
    smurf_start_time = now - timedelta(days=1, hours=8)
    smurf_feeders = mule_ring_accounts[1:]  # 5 feeder mules
    for i in range(12):
        feeder = random.choice(smurf_feeders)
        amt = round(random.uniform(2200.0, 4800.0), 2)  # just below $5000 reporting threshold
        t_time = (smurf_start_time + timedelta(minutes=i * 18)).strftime("%Y-%m-%d %H:%M:%S")
        transfers.append({
            "tx_id": f"TX_{tx_counter:05d}",
            "source_account": feeder,
            "target_account": "MULE_RING_01",
            "amount": amt,
            "timestamp": t_time,
            "category": "smurfing_fan_in"
        })
        tx_counter += 1
        
    # Fan-out: MULE_RING_01 sends aggregated funds to 2 external cashout accounts
    for i, cashout_dst in enumerate(["ACC_0059", "ACC_0060"]):
        t_time = (smurf_start_time + timedelta(hours=5, minutes=i * 20)).strftime("%Y-%m-%d %H:%M:%S")
        transfers.append({
            "tx_id": f"TX_{tx_counter:05d}",
            "source_account": "MULE_RING_01",
            "target_account": cashout_dst,
            "amount": 21500.00,
            "timestamp": t_time,
            "category": "fan_out_cashout"
        })
        tx_counter += 1

    # Fraud Scenario 3: 3-hop loop across shell entities in different jurisdictions
    # SHELL_ACC_01 -> SHELL_ACC_02 -> SHELL_ACC_03 -> SHELL_ACC_01
    shell_path = ["SHELL_ACC_01", "SHELL_ACC_02", "SHELL_ACC_03", "SHELL_ACC_01"]
    shell_start_time = now - timedelta(days=3, hours=10)
    shell_amt = 150000.0
    for hop in range(len(shell_path) - 1):
        src = shell_path[hop]
        dst = shell_path[hop + 1]
        t_time = (shell_start_time + timedelta(hours=hop * 1)).strftime("%Y-%m-%d %H:%M:%S")
        amt = round(shell_amt, 2)
        transfers.append({
            "tx_id": f"TX_{tx_counter:05d}",
            "source_account": src,
            "target_account": dst,
            "amount": amt,
            "timestamp": t_time,
            "category": "shell_loop"
        })
        tx_counter += 1
        shell_amt *= 0.98

    df_transfers = pd.DataFrame(transfers)

    # -------------------------------------------------------------
    # SAVE CSV FILES
    # -------------------------------------------------------------
    df_accounts.to_csv(os.path.join(output_dir, "accounts.csv"), index=False)
    df_entities.to_csv(os.path.join(output_dir, "entities.csv"), index=False)
    df_devices.to_csv(os.path.join(output_dir, "devices.csv"), index=False)
    df_ips.to_csv(os.path.join(output_dir, "ips.csv"), index=False)
    df_acc_dev.to_csv(os.path.join(output_dir, "account_devices.csv"), index=False)
    df_acc_ip.to_csv(os.path.join(output_dir, "account_ips.csv"), index=False)
    df_owns.to_csv(os.path.join(output_dir, "entity_owns.csv"), index=False)
    df_transfers.to_csv(os.path.join(output_dir, "transfers.csv"), index=False)
    
    # Also save bundled graph JSON for instant offline demo mode
    generate_bundled_json(df_accounts, df_entities, df_devices, df_ips, df_acc_dev, df_acc_ip, df_owns, df_transfers, output_dir)
    
    print("=" * 65)
    print("FinCrime Sentinel Data Generation Complete!")
    print(f"  * Accounts:      {len(df_accounts)} ({len(normal_accounts_list)} normal + {len(loop_accounts) + len(mule_ring_accounts) + len(shell_accounts)} fraud ring)")
    print(f"  * Entities:      {len(df_entities)} ({len(legit_names)} legit + {len(shell_entities_data)} shell entities)")
    print(f"  * Devices:       {len(df_devices)}")
    print(f"  * IP Addresses:  {len(df_ips)}")
    print(f"  * Transfers:     {len(df_transfers)} (400 normal + 5 loop + 14 smurf/fanout + 3 shell loop)")
    print(f"  * Saved to:      {output_dir}")
    print("=" * 65)


def generate_bundled_json(df_accounts, df_entities, df_devices, df_ips, df_acc_dev, df_acc_ip, df_owns, df_transfers, output_dir):
    """
    Constructs a bundled JSON graph dataset for offline Demo Mode.
    Format is directly compatible with react-force-graph-3d.
    """
    nodes = []
    node_ids = set()
    
    # Account nodes
    for _, row in df_accounts.iterrows():
        nid = str(row["account_id"])
        node_ids.add(nid)
        nodes.append({
            "id": nid,
            "label": nid,
            "group": "Account",
            "holder_name": str(row["holder_name"]),
            "created_at": str(row["created_at"]),
            "risk_score": int(row["risk_score"]),
            "status": str(row["status"]),
            "account_type": str(row["account_type"])
        })
        
    # Entity nodes
    for _, row in df_entities.iterrows():
        nid = str(row["entity_id"])
        node_ids.add(nid)
        nodes.append({
            "id": nid,
            "label": str(row["name"]),
            "group": "Entity",
            "jurisdiction": str(row["jurisdiction"]),
            "is_shell": bool(row["is_shell"]),
            "risk_score": 85 if row["is_shell"] else 10
        })
        
    # Device nodes
    for _, row in df_devices.iterrows():
        nid = str(row["device_id"])
        node_ids.add(nid)
        is_mule = "MULE" in nid or "LOOP" in nid
        nodes.append({
            "id": nid,
            "label": nid,
            "group": "Device",
            "risk_score": 90 if is_mule else 10
        })
        
    # IPAddress nodes
    for _, row in df_ips.iterrows():
        nid = str(row["ip"])
        node_ids.add(nid)
        is_mule = nid in ["10.0.0.99", "198.51.100.88", "203.0.113.195"]
        nodes.append({
            "id": nid,
            "label": nid,
            "group": "IPAddress",
            "risk_score": 90 if is_mule else 10
        })
        
    links = []
    # TRANSFER links
    for _, row in df_transfers.iterrows():
        src = str(row["source_account"])
        dst = str(row["target_account"])
        if src in node_ids and dst in node_ids:
            links.append({
                "source": src,
                "target": dst,
                "type": "TRANSFER",
                "tx_id": str(row["tx_id"]),
                "amount": float(row["amount"]),
                "timestamp": str(row["timestamp"]),
                "category": str(row["category"])
            })
            
    # USED_DEVICE links
    for _, row in df_acc_dev.iterrows():
        acc = str(row["account_id"])
        dev = str(row["device_id"])
        if acc in node_ids and dev in node_ids:
            links.append({
                "source": acc,
                "target": dev,
                "type": "USED_DEVICE"
            })
            
    # LOGGED_IN_IP links
    for _, row in df_acc_ip.iterrows():
        acc = str(row["account_id"])
        ip = str(row["ip"])
        if acc in node_ids and ip in node_ids:
            links.append({
                "source": acc,
                "target": ip,
                "type": "LOGGED_IN_IP"
            })
            
    # OWNS links
    for _, row in df_owns.iterrows():
        ent = str(row["entity_id"])
        acc = str(row["account_id"])
        if ent in node_ids and acc in node_ids:
            links.append({
                "source": ent,
                "target": acc,
                "type": "OWNS"
            })
            
    # Prebuilt alerts for instant demo
    alerts = [
        {
            "id": "ALERT_001",
            "type": "CIRCULAR_LAUNDERING",
            "title": "5-Hop Circular Laundering Cycle",
            "severity": "CRITICAL",
            "risk_score": 98,
            "accounts": ["MULE_101", "MULE_102", "MULE_103", "MULE_104", "MULE_105"],
            "total_volume": 2401980.08,
            "initial_volume": 500000.0,
            "hops": 5,
            "retained_pct": 92.24,
            "shared_ip": "10.0.0.99",
            "shared_device": "DEV_LOOP_101",
            "time_span": "1 hour 15 mins",
            "explanation": "High-velocity funds cycling through 5 mule accounts with 2% fee deduction per hop under shell company ownership."
        },
        {
            "id": "ALERT_002",
            "type": "SHARED_INFRASTRUCTURE",
            "title": "Shared-Infrastructure Mule Syndicate",
            "severity": "HIGH",
            "risk_score": 92,
            "accounts": ["MULE_RING_01", "MULE_RING_02", "MULE_RING_03", "MULE_RING_04", "MULE_RING_05", "MULE_RING_06"],
            "total_volume": 84200.0,
            "hops": 0,
            "shared_ip": "198.51.100.88",
            "shared_device": "DEV_MULE_RING_01",
            "explanation": "6 accounts controlled from identical device fingerprint DEV_MULE_RING_01 and single IP address 198.51.100.88."
        },
        {
            "id": "ALERT_003",
            "type": "SMURFING_FAN_IN",
            "title": "Rapid Smurfing Fan-In Hub",
            "severity": "HIGH",
            "risk_score": 89,
            "accounts": ["MULE_RING_01"],
            "feeders": ["MULE_RING_02", "MULE_RING_03", "MULE_RING_04", "MULE_RING_05", "MULE_RING_06"],
            "total_volume": 41200.0,
            "hops": 1,
            "time_span": "3 hours 36 mins",
            "explanation": "Target account MULE_RING_01 received 12 structured transfers below $5,000 threshold within 4 hours, followed by rapid fan-out cashouts."
        },
        {
            "id": "ALERT_004",
            "type": "CROSS_BORDER_SHELL_LOOP",
            "title": "Multi-Jurisdiction Shell Entity Loop",
            "severity": "CRITICAL",
            "risk_score": 94,
            "accounts": ["SHELL_ACC_01", "SHELL_ACC_02", "SHELL_ACC_03"],
            "entities": ["Mariner Offshore Trading Ltd (Seychelles)", "Horizon Gateway Capital Corp (Panama)", "Blue Ocean Merchant S.A. (BVI)"],
            "total_volume": 441060.0,
            "hops": 3,
            "retained_pct": 96.04,
            "time_span": "2 hours",
            "explanation": "Triangular international layering loop across offshore shell corporations incorporated in high-secrecy jurisdictions."
        }
    ]
    
    payload = {
        "graph": {"nodes": nodes, "links": links},
        "alerts": alerts,
        "metadata": {
            "total_nodes": len(nodes),
            "total_links": len(links),
            "generated_at": datetime.now().isoformat()
        }
    }
    
    json_path = os.path.join(output_dir, "bundled_graph.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"  * Bundled demo JSON: {json_path}")


if __name__ == "__main__":
    generate_fin_crime_data()
