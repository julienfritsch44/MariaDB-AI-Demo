
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

def check_perf_schema():
    try:
        print(f"Connecting to {DB_HOST}...")
        conn = mariadb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_DATABASE,
            ssl=True
        )
        cursor = conn.cursor(dictionary=True)
        
        print("\n--- Checking Performance Schema ---")
        try:
            cursor.execute("SHOW VARIABLES LIKE 'performance_schema'")
            row = cursor.fetchone()
            print(f"performance_schema: {row['Value'] if row else 'OFF'}")
            
            if row and row['Value'] == 'ON':
                print("-> Performance Schema is ON! Checking tables...")
                
                tables = [
                    "performance_schema.events_statements_history_long",
                    "performance_schema.events_statements_summary_by_digest"
                ]
                
                for table in tables:
                    try:
                        cursor.execute(f"SELECT count(*) as cnt FROM {table}")
                        r = cursor.fetchone()
                        print(f"Running SELECT count(*) ON {table}: OK (Rows: {r['cnt']})")
                    except Exception as e:
                        print(f"Failed to read {table}: {e}")
            else:
                print("-> Performance Schema is OFF.")
                
        except Exception as e:
            print(f"Error checking variables: {e}")

        conn.close()

    except mariadb.Error as e:
        print(f"Error connecting to MariaDB: {e}")

if __name__ == "__main__":
    check_perf_schema()
