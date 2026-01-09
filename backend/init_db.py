import os
import mariadb
import sys
from dotenv import load_dotenv
from error_factory import ErrorFactory

load_dotenv()

def get_db_connection():
    try:
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 3306)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=os.getenv("SKYSQL_PASSWORD"),
            ssl=True
        )
        return conn
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Init DB Connection",
            "Failed to connect to MariaDB for initialization",
            original_error=e
        )
        print(db_error)
        sys.exit(1)

def init_db():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print("Checking for finops_auditor database...")
        cursor.execute("CREATE DATABASE IF NOT EXISTS finops_auditor")
        cursor.execute("USE finops_auditor")

        print("Creating query_plan_baselines table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS query_plan_baselines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fingerprint VARCHAR(64) UNIQUE NOT NULL,
                query_text TEXT NOT NULL,
                best_plan_json JSON,
                best_execution_time_ms FLOAT,
                best_cost FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_validated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        print("Creating doc_embeddings table (if not exists)...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS doc_embeddings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                source_id VARCHAR(255) NOT NULL,
                source_type VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                embedding BLOB NOT NULL,
                metadata JSON,
                UNIQUE KEY (source_id)
            )
        """)

        conn.commit()
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Database Schema Initialization",
            "Failed to create tables or database",
            original_error=e
        )
        print(db_error)
        sys.exit(1)
    
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
