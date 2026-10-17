import random
from datetime import datetime, timedelta
import pandas as pd

def generate_financial_data(
    num_normal_tx: int = 300,
    output_file: str = "transactions.csv",
    seed: int = 42
) -> pd.DataFrame:
    """
    Generates a synthetic financial dataset with normal background transactions
    and a hidden 5-hop circular money laundering loop.
    """
    random.seed(seed)
    
    # 1. Accounts Pool (ACC_0001 to ACC_0050)
    accounts = [f"ACC_{i:04d}" for i in range(1, 51)]
    
    # Pool of realistic background IP addresses and Device IDs
    bg_ips = [
        f"192.168.{random.randint(1, 20)}.{random.randint(2, 254)}"
        for _ in range(25)
    ] + [
        f"172.16.{random.randint(1, 10)}.{random.randint(2, 254)}"
        for _ in range(15)
    ] + [
        f"203.0.113.{random.randint(10, 200)}"
        for _ in range(10)
    ]
    # Ensure suspicious IP is not in background pool
    bg_ips = [ip for ip in bg_ips if ip != "10.0.0.99"]
    
    bg_devices = [f"DEV_{i:03d}_{random.choice(['IOS', 'AND', 'WEB', 'WIN'])}" for i in range(1, 60)]
    bg_devices = [d for d in bg_devices if d != "DEV_999_MULE"]
    
    # Base timestamp: 7 days window
    start_time = datetime(2026, 10, 10, 8, 0, 0)
    
    transactions = []
    
    # 2. Generate 300 Normal Background Transactions
    for _ in range(num_normal_tx):
        src, dst = random.sample(accounts, 2)
        amount = round(random.uniform(50.0, 4500.0), 2)
        
        # Random time within the 7-day window
        random_seconds = random.randint(0, 7 * 24 * 3600)
        tx_time = start_time + timedelta(seconds=random_seconds)
        
        ip = random.choice(bg_ips)
        device = random.choice(bg_devices)
        
        transactions.append({
            "source_account": src,
            "target_account": dst,
            "amount": amount,
            "timestamp": tx_time.strftime("%Y-%m-%d %H:%M:%S"),
            "ip_address": ip,
            "device_id": device,
            "tx_type": "TRANSFER",
            "is_laundering": False
        })
        
    # 3. Inject Hidden 5-Hop Circular Laundering Loop ($500,000 total volume)
    # Loop: ACC_0001 -> ACC_0012 -> ACC_0023 -> ACC_0034 -> ACC_0045 -> ACC_0001
    loop_nodes = ["ACC_0001", "ACC_0012", "ACC_0023", "ACC_0034", "ACC_0045", "ACC_0001"]
    initial_volume = 500000.0
    fee_rate = 0.02  # 2% fee deduction per hop
    
    # Fixed suspicious signature
    suspicious_ip = "10.0.0.99"
    suspicious_device = "DEV_999_MULE"
    
    # Specific stealth time window (late night during the 7-day period)
    loop_start_time = datetime(2026, 10, 14, 2, 15, 0)
    
    current_amount = initial_volume
    print("\n--- Injecting Circular Laundering Pattern ---")
    for hop in range(len(loop_nodes) - 1):
        src = loop_nodes[hop]
        dst = loop_nodes[hop + 1]
        
        # 15 minutes apart per hop
        tx_time = loop_start_time + timedelta(minutes=15 * hop)
        
        transfer_amount = round(current_amount, 2)
        print(f"  Hop {hop + 1}: {src} -> {dst} | ${transfer_amount:,.2f} | {tx_time.strftime('%Y-%m-%d %H:%M:%S')} | IP: {suspicious_ip} | Device: {suspicious_device}")
        
        transactions.append({
            "source_account": src,
            "target_account": dst,
            "amount": transfer_amount,
            "timestamp": tx_time.strftime("%Y-%m-%d %H:%M:%S"),
            "ip_address": suspicious_ip,
            "device_id": suspicious_device,
            "tx_type": "TRANSFER",
            "is_laundering": True
        })
        
        # Deduct 2% fee for next hop
        current_amount *= (1.0 - fee_rate)
        
    # 4. Assemble DataFrame and Sort Chronologically
    df = pd.DataFrame(transactions)
    df["timestamp_dt"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by="timestamp_dt").reset_index(drop=True)
    
    # Generate unique transaction IDs
    df["transaction_id"] = [f"TX_{i+1:05d}" for i in range(len(df))]
    
    # Clean up auxiliary columns for export
    export_cols = [
        "transaction_id",
        "source_account",
        "target_account",
        "amount",
        "timestamp",
        "ip_address",
        "device_id",
        "tx_type",
        "is_laundering"
    ]
    df_export = df[export_cols]
    
    # Save to CSV
    df_export.to_csv(output_file, index=False)
    print(f"\n[SUCCESS] Generated {len(df_export)} transactions ({num_normal_tx} normal + 5 laundering hops).")
    print(f"[SUCCESS] Saved dataset to '{output_file}'.")
    
    return df_export


if __name__ == "__main__":
    generate_financial_data()
