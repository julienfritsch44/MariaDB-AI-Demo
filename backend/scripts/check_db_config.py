
import mariadb
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Database Config
DB_USER = os.getenv("SKYSQL_USERNAME")
DB_PASSWORD = os.getenv("SKYSQL_PASSWORD")
DB_HOST = os.getenv("SKYSQL_HOST")
DB_PORT = int(os.getenv("SKYSQL_PORT", 3306))
DB_DATABASE = "shop_demo"

def check_config():
    try:
        print(f"Connecting to {DB_HOST} as {DB_USER}...")
        conn = mariadb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_DATABASE,
            ssl=True
        )
        cursor = conn.cursor(dictionary=True)
        
        # Check privileges (approximated by trying to set variables)
        print("\n--- Checking Slow Log Configuration ---")
        
        variables = [
            'slow_query_log',
            'long_query_time',
            'log_output',
            'min_examined_row_limit'
        ]
        
        for var in variables:
            cursor.execute(f"SHOW GLOBAL VARIABLES LIKE '{var}'")
            row = cursor.fetchone()
            if row:
                print(f"{row['Variable_name']}: {row['Value']}")
        
        print("\n--- Trying to Enable Slow Log (Test Permissions) ---")
        try:
            cursor.execute("SET GLOBAL slow_query_log = 'ON'")
            cursor.execute("SET GLOBAL long_query_time = 0.1") # Very sensitive for demo
            cursor.execute("SET GLOBAL log_output = 'TABLE'")
            print("SUCCESS: Changed slow log settings!")
            print("-> Pointing to mysql.slow_log table")
        except mariadb.Error as e:
            print(f"FAILED to change settings: {e}")
            print("-> User likely lacks SUPER/SYSTEM_VARIABLES_ADMIN privileges")

        # Check if we can read mysql.slow_log
        print("\n--- Checking Access to mysql.slow_log ---")
        try:
            cursor.execute("SELECT count(*) as cnt FROM mysql.slow_log")
            row = cursor.fetchone()
            print(f"SUCCESS: Can read mysql.slow_log. Rows: {row['cnt']}")
        except mariadb.Error as e:
            print(f"FAILED to read mysql.slow_log: {e}")

        conn.close()

    except mariadb.Error as e:
        print(f"Error connecting to MariaDB: {e}")

if __name__ == "__main__":
    check_config()
