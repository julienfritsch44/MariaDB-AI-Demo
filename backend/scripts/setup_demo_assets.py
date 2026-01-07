
import sqlite3
import datetime
import json
import os

# Create or connect to the demo database
# Using a local sqlite for the demo state if SkySQL is not fully initialized
DB_PATH = os.path.join(os.getcwd(), 'backend', 'demo_state.db')

def init_demo_assets():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Setup Table for Plan Stability / Baselines
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS query_plan_baselines (
            fingerprint TEXT PRIMARY KEY,
            query_pattern TEXT,
            best_plan TEXT,
            best_execution_time_ms INTEGER,
            best_cost REAL,
            created_at TIMESTAMP
        )
    ''')

    # 2. Setup Table for Schema Drift simulation
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schema_drift_state (
            id INTEGER PRIMARY KEY,
            table_name TEXT,
            issue_type TEXT,
            severity TEXT,
            description TEXT
        )
    ''')

    # 3. Setup Table for Branching simulation
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY,
            name TEXT,
            status TEXT,
            source TEXT,
            created_at TIMESTAMP,
            size_gb REAL
        )
    ''')

    # 4. Setup Table for Archiving candidates
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS archiving_candidates (
            id INTEGER PRIMARY KEY,
            table_name TEXT,
            size_gb REAL,
            potential_savings_usd REAL,
            last_access_days INTEGER
        )
    ''')

    # Clear old state
    cursor.execute('DELETE FROM query_plan_baselines')
    cursor.execute('DELETE FROM schema_drift_state')
    cursor.execute('DELETE FROM branches')
    cursor.execute('DELETE FROM archiving_candidates')

    # Inject "Realistic" Scenario Data
    
    # Drift Alert
    cursor.execute("INSERT INTO schema_drift_state (table_name, issue_type, severity, description) VALUES (?, ?, ?, ?)", 
                   ('customers', 'MISSING_INDEX', 'HIGH', 'Index idx_created_at exists in staging but missing in production.'))

    # Archiving
    cursor.execute("INSERT INTO archiving_candidates (table_name, size_gb, potential_savings_usd, last_access_days) VALUES (?, ?, ?, ?)", 
                   ('orders_2022', 450, 1200, 780))
    cursor.execute("INSERT INTO archiving_candidates (table_name, size_gb, potential_savings_usd, last_access_days) VALUES (?, ?, ?, ?) ", 
                   ('logs_audit_old', 210, 950, 900))

    # Existing Baseline for Plan Flip demo
    cursor.execute("INSERT INTO query_plan_baselines (fingerprint, query_pattern, best_plan, best_execution_time_ms, best_cost, created_at) VALUES (?, ?, ?, ?, ?, ?)", 
                   ('q_orders_fr', 'SELECT * FROM orders WHERE customer_id IN ...', 'Index Scan on idx_customer_id', 45, 12.5, '2024-12-24 10:00:00'))

    conn.commit()
    conn.close()
    print("Demo assets initialized successfully.")

if __name__ == "__main__":
    init_demo_assets()
