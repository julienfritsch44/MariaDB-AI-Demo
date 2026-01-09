import os
import sys
import mariadb
from dotenv import load_dotenv

# Add parent directory to path to import database config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection

def check_config():
    print("🔍 Checking MariaDB Configuration for DBA Copilot...\n")
    
    try:
        conn = get_db_connection()
        # The mariadb connector doesn't support 'dictionary=True' in the same way, 
        # but we can use buffered/dictionary cursor if needed. 
        # For simplicity, we'll use a regular cursor and fetch results by index or name.
        cursor = conn.cursor()
        
        # 1. Check Global Variables
        vars_to_check = [
            'slow_query_log',
            'long_query_time',
            'performance_schema',
            'log_slow_verbosity',
            'log_output'
        ]
        
        print("--- Global Variables ---")
        for var in vars_to_check:
            cursor.execute(f"SHOW GLOBAL VARIABLES LIKE '{var}'")
            res = cursor.fetchone()
            if res:
                name, val = res
                status = "✅" if val in ['ON', 'FILE', 'TABLE'] or (var == 'long_query_time' and float(val) <= 1.0) else "⚠️"
                print(f"{status} {var}: {val}")
            else:
                print(f"❌ {var}: Not found")
        
        # 2. Check Global Status
        print("\n--- Global Status ---")
        cursor.execute("SHOW GLOBAL STATUS LIKE 'slow_queries'")
        res = cursor.fetchone()
        if res:
            print(f"📊 slow_queries: {res[1]}")
            
        # 3. Check Current User Privileges
        print("\n--- Current User Privileges ---")
        cursor.execute("SELECT USER(), CURRENT_USER()")
        user_info = cursor.fetchone()
        print(f"👤 Connected as: {user_info[0]}")
        print(f"🔑 Effective user: {user_info[1]}")
        
        cursor.execute("SHOW GRANTS")
        grants = cursor.fetchall()
        print("📜 Active Grants:")
        for grant in grants:
            print(f"  - {grant[0]}")
            
        # 4. Check system catalog access
        print("\n--- System Catalog Access ---")
        try:
            cursor.execute("CREATE DATABASE IF NOT EXISTS sky_sys_catalog_test")
            cursor.execute("DROP DATABASE sky_sys_catalog_test")
            print("✅ Permission to CREATE/DROP DATABASE (for sky_sys_catalog)")
        except mariadb.Error as e:
            print(f"❌ DATABASE creation denied: {e}")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"💥 Error: {e}")

if __name__ == "__main__":
    check_config()
