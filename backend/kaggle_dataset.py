import os
import json
import random
from datetime import datetime, timedelta
import pandas as pd

KAGGLE_BANKS = [
    ("JPMorgan Chase (0021)", "United States", "USD"),
    ("Citibank NA (0008)", "United States", "USD"),
    ("HSBC Bank UK (0401)", "United Kingdom", "GBP"),
    ("Deutsche Bank AG (0103)", "Germany", "EUR"),
    ("BNP Paribas (0211)", "France", "EUR"),
    ("Standard Chartered (0722)", "Singapore", "SGD"),
    ("Barclays Bank PLC (0029)", "United Kingdom", "GBP"),
    ("UBS Switzerland (0206)", "Switzerland", "CHF"),
    ("Bank of America (0032)", "United States", "USD"),
    ("DBS Bank Ltd (0717)", "Singapore", "SGD"),
]

PAYMENT_FORMATS = ["SWIFT Wire", "ACH Transfer", "Credit Card", "Cheque", "Cash Deposit"]


def generate_kaggle_aml_dataset(output_path: str = None, count: int = 500, seed: int = 101):
    """
    Generates a realistic Kaggle IBM / PaySim AML benchmark transaction dataset.
    Features authentic multi-bank routing codes, multi-currency pairs,
    payment channels, and labeled laundering topologies.
    """
    random.seed(seed)
    
    if output_path is None:
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        os.makedirs(data_dir, exist_ok=True)
        output_path = os.path.join(data_dir, "kaggle_aml_transactions.csv")

    base_time = datetime(2026, 10, 10, 8, 30, 0)
    records = []
    tx_id = 1

    # Normal accounts pool across banks
    accounts_by_bank = {}
    for bank, country, curr in KAGGLE_BANKS:
        accounts_by_bank[bank] = [f"ACC_KAG_{random.randint(10000, 99999)}" for _ in range(12)]

    all_banks = [b[0] for b in KAGGLE_BANKS]

    # 1. Normal Banking Transactions (~450 rows)
    for _ in range(count - 50):
        src_bank = random.choice(all_banks)
        dst_bank = random.choice(all_banks)
        src_acc = random.choice(accounts_by_bank[src_bank])
        dst_acc = random.choice(accounts_by_bank[dst_bank])
        while dst_acc == src_acc:
            dst_acc = random.choice(accounts_by_bank[dst_bank])

        curr = random.choice(["USD", "USD", "EUR", "GBP", "CHF"])
        amt = round(random.uniform(75.0, 4800.0), 2)
        fmt = random.choice(PAYMENT_FORMATS)
        t_time = (base_time + timedelta(minutes=random.randint(5, 7 * 24 * 60))).strftime("%Y/%m/%d %H:%M:%S")

        records.append({
            "Transaction_ID": f"KAG_{tx_id:06d}",
            "Timestamp": t_time,
            "From_Bank": src_bank,
            "From_Account": src_acc,
            "To_Bank": dst_bank,
            "To_Account": dst_acc,
            "Amount_Paid": amt,
            "Payment_Currency": curr,
            "Amount_Received": round(amt * (0.995 if src_bank != dst_bank else 1.0), 2),
            "Receiving_Currency": curr,
            "Payment_Format": fmt,
            "Is_Laundering": 0,
            "Laundering_Type": "None (Legitimate Commercial Transfer)"
        })
        tx_id += 1

    # 2. Kaggle Laundering Scenario A: Multi-Bank SWIFT Wire Circular Cycle ($1.2M)
    # JPMorgan -> Deutsche Bank -> UBS Switzerland -> HSBC UK -> Barclays -> JPMorgan
    cycle_banks = [
        ("JPMorgan Chase (0021)", "ACC_KAG_MULE_01"),
        ("Deutsche Bank AG (0103)", "ACC_KAG_MULE_02"),
        ("UBS Switzerland (0206)", "ACC_KAG_MULE_03"),
        ("HSBC Bank UK (0401)", "ACC_KAG_MULE_04"),
        ("Barclays Bank PLC (0029)", "ACC_KAG_MULE_05"),
        ("JPMorgan Chase (0021)", "ACC_KAG_MULE_01"),
    ]
    cycle_start = datetime(2026, 10, 13, 14, 0, 0)
    cycle_amt = 1200000.0
    for hop in range(len(cycle_banks) - 1):
        s_bank, s_acc = cycle_banks[hop]
        d_bank, d_acc = cycle_banks[hop + 1]
        t_time = (cycle_start + timedelta(minutes=25 * hop)).strftime("%Y/%m/%d %H:%M:%S")
        amt_paid = round(cycle_amt, 2)
        records.append({
            "Transaction_ID": f"KAG_{tx_id:06d}",
            "Timestamp": t_time,
            "From_Bank": s_bank,
            "From_Account": s_acc,
            "To_Bank": d_bank,
            "To_Account": d_acc,
            "Amount_Paid": amt_paid,
            "Payment_Currency": "USD",
            "Amount_Received": round(amt_paid * 0.985, 2),
            "Receiving_Currency": "USD",
            "Payment_Format": "SWIFT Wire",
            "Is_Laundering": 1,
            "Laundering_Type": "Multi-Bank SWIFT Circular Layering"
        })
        tx_id += 1
        cycle_amt *= 0.985  # 1.5% correspondent deduction

    # 3. Kaggle Laundering Scenario B: Structured Micro-Cash Smurfing (<$10k CTR Evasion)
    # 15 structured deposits into a single consolidation hub at Citibank
    smurf_start = datetime(2026, 10, 14, 9, 15, 0)
    hub_bank = "Citibank NA (0008)"
    hub_acc = "ACC_KAG_HUB_77"
    for i in range(14):
        feeder_acc = f"ACC_KAG_SMURF_{i+1:02d}"
        t_time = (smurf_start + timedelta(minutes=i * 12)).strftime("%Y/%m/%d %H:%M:%S")
        amt = round(random.uniform(3200.0, 4950.0), 2)
        records.append({
            "Transaction_ID": f"KAG_{tx_id:06d}",
            "Timestamp": t_time,
            "From_Bank": "Cash Teller Branch #14",
            "From_Account": feeder_acc,
            "To_Bank": hub_bank,
            "To_Account": hub_acc,
            "Amount_Paid": amt,
            "Payment_Currency": "USD",
            "Amount_Received": amt,
            "Receiving_Currency": "USD",
            "Payment_Format": "Cash Deposit",
            "Is_Laundering": 1,
            "Laundering_Type": "Structured Cash Deposit (CTR Evasion)"
        })
        tx_id += 1

    # 4. Kaggle Laundering Scenario C: Cross-Currency Arbitrage Layering
    # USD -> EUR -> CHF -> GBP pass-through
    fx_start = datetime(2026, 10, 15, 11, 0, 0)
    fx_hops = [
        ("Citibank NA (0008)", "ACC_KAG_FX_01", "Deutsche Bank AG (0103)", "ACC_KAG_FX_02", 450000.0, "USD", "EUR", 412000.0),
        ("Deutsche Bank AG (0103)", "ACC_KAG_FX_02", "UBS Switzerland (0206)", "ACC_KAG_FX_03", 412000.0, "EUR", "CHF", 398000.0),
        ("UBS Switzerland (0206)", "ACC_KAG_FX_03", "Standard Chartered (0722)", "ACC_KAG_FX_04", 398000.0, "CHF", "USD", 442000.0),
    ]
    for hop_i, (sb, sa, db, da, ap, pc, rc, ar) in enumerate(fx_hops):
        t_time = (fx_start + timedelta(hours=hop_i * 2)).strftime("%Y/%m/%d %H:%M:%S")
        records.append({
            "Transaction_ID": f"KAG_{tx_id:06d}",
            "Timestamp": t_time,
            "From_Bank": sb,
            "From_Account": sa,
            "To_Bank": db,
            "To_Account": da,
            "Amount_Paid": ap,
            "Payment_Currency": pc,
            "Amount_Received": ar,
            "Receiving_Currency": rc,
            "Payment_Format": "SWIFT Wire",
            "Is_Laundering": 1,
            "Laundering_Type": "Cross-Border Currency Conversion Layering"
        })
        tx_id += 1

    df = pd.DataFrame(records)
    df.to_csv(output_path, index=False)
    print(f"[KAGGLE DATASET] Generated {len(df)} transactions -> {output_path}")
    return df


def load_kaggle_dataset(csv_path: str = None) -> pd.DataFrame:
    if csv_path is None:
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        csv_path = os.path.join(data_dir, "kaggle_aml_transactions.csv")
    if not os.path.exists(csv_path):
        return generate_kaggle_aml_dataset(csv_path)
    return pd.read_csv(csv_path)


def get_kaggle_stats(df: pd.DataFrame = None) -> dict:
    if df is None:
        df = load_kaggle_dataset()

    total_tx = len(df)
    laundering_df = df[df["Is_Laundering"] == 1]
    laundering_tx = len(laundering_df)
    laundering_volume = float(laundering_df["Amount_Paid"].sum())
    total_volume = float(df["Amount_Paid"].sum())

    top_banks = df["From_Bank"].value_counts().head(5).to_dict()
    formats = df["Payment_Format"].value_counts().to_dict()
    types = laundering_df["Laundering_Type"].value_counts().to_dict()

    return {
        "dataset_name": "Kaggle IBM Anti-Money Laundering (AML) Benchmark",
        "total_transactions": total_tx,
        "laundering_transactions": laundering_tx,
        "laundering_rate_pct": round((laundering_tx / total_tx) * 100, 2),
        "total_volume_usd": round(total_volume, 2),
        "laundering_volume_usd": round(laundering_volume, 2),
        "top_banks": top_banks,
        "payment_formats": formats,
        "laundering_typologies": types
    }


def get_kaggle_graph(df: pd.DataFrame = None, laundering_only: bool = True) -> dict:
    if df is None:
        df = load_kaggle_dataset()

    if laundering_only:
        filtered = df[df["Is_Laundering"] == 1]
    else:
        filtered = df.head(80)

    nodes = {}
    links = []

    for _, row in filtered.iterrows():
        s_acc = str(row["From_Account"])
        d_acc = str(row["To_Account"])
        s_bank = str(row["From_Bank"])
        d_bank = str(row["To_Bank"])
        is_laundering = int(row["Is_Laundering"]) == 1

        # Account nodes
        if s_acc not in nodes:
            nodes[s_acc] = {
                "id": s_acc,
                "label": s_acc,
                "group": "Account",
                "bank": s_bank,
                "risk_score": 95 if is_laundering else 15,
                "status": "frozen" if "MULE" in s_acc else "active"
            }
        if d_acc not in nodes:
            nodes[d_acc] = {
                "id": d_acc,
                "label": d_acc,
                "group": "Account",
                "bank": d_bank,
                "risk_score": 95 if is_laundering else 15,
                "status": "active"
            }

        # Bank nodes
        if s_bank not in nodes:
            nodes[s_bank] = {
                "id": s_bank,
                "label": s_bank.split(" (")[0],
                "group": "Bank",
                "risk_score": 75 if is_laundering else 10
            }
        if d_bank not in nodes:
            nodes[d_bank] = {
                "id": d_bank,
                "label": d_bank.split(" (")[0],
                "group": "Bank",
                "risk_score": 75 if is_laundering else 10
            }

        # Transfer link
        links.append({
            "source": s_acc,
            "target": d_acc,
            "type": "TRANSFER",
            "amount": float(row["Amount_Paid"]),
            "currency": str(row["Payment_Currency"]),
            "format": str(row["Payment_Format"]),
            "timestamp": str(row["Timestamp"]),
            "is_laundering": is_laundering,
            "laundering_type": str(row["Laundering_Type"])
        })

        # Bank relationship
        links.append({"source": s_acc, "target": s_bank, "type": "HELD_AT_BANK"})
        links.append({"source": d_acc, "target": d_bank, "type": "HELD_AT_BANK"})

    return {
        "nodes": list(nodes.values()),
        "links": links
    }


if __name__ == "__main__":
    df = generate_kaggle_aml_dataset()
    stats = get_kaggle_stats(df)
    print("Kaggle AML Stats:", json.dumps(stats, indent=2))
