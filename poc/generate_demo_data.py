import mariadb
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv('backend/.env')

def get_connection():
    return mariadb.connect(
        host=os.getenv("SKYSQL_HOST"),
        port=int(os.getenv("SKYSQL_PORT", 3306)),
        user=os.getenv("SKYSQL_USERNAME"),
        password=os.getenv("SKYSQL_PASSWORD"),
        ssl=True
    )

def inject_demo_queries():
    print("Connecting to MariaDB to inject demo slow queries...")
    conn = get_connection()
    cursor = conn.cursor()

    # Queries to simulate
    queries = [
        {
            "sql": "SELECT * FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL 30 DAY",
            "examined": 1500000,
            "sent": 120,
            "time": 8.45,
            "db": "sales_db"
        },
        {
            "sql": "SELECT customer_id, SUM(amount) FROM transactions GROUP BY customer_id HAVING SUM(amount) > 1000",
            "examined": 5000000,
            "sent": 450,
            "time": 25.12,
            "db": "finance_db"
        },
        {
            "sql": "UPDATE products SET inventory_count = inventory_count - 1 WHERE sku IN (SELECT sku FROM temporary_orders)",
            "examined": 100000,
            "sent": 0,
            "time": 4.20,
            "db": "warehouse_db"
        },
        {
            "sql": "SELECT p.* FROM products p JOIN categories c ON p.cat_id = c.id WHERE c.name LIKE '%Electronics%'",
            "examined": 2500000,
            "sent": 5000,
            "time": 12.87,
            "db": "catalog_db"
        }
    ]

    # Create demo table in finops_auditor DB
    try:
        cursor.execute("CREATE DATABASE IF NOT EXISTS finops_auditor")
        cursor.execute("USE finops_auditor")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS demo_slow_queries (
                start_time TIMESTAMP,
                user_host VARCHAR(255),
                query_time DOUBLE,
                lock_time DOUBLE,
                rows_sent INT,
                rows_examined INT,
                db VARCHAR(255),
                sql_text TEXT
            )
        """)
        
        # Clear previous demo data
        cursor.execute("TRUNCATE TABLE demo_slow_queries")
        
        insert_sql = """
            INSERT INTO demo_slow_queries (
                start_time, user_host, query_time, lock_time, rows_sent, rows_examined, db, sql_text
            ) VALUES (
                NOW(), 'demo_user[demo_user] @ localhost []', %s, 0.0, %s, %s, %s, %s
            )
        """
        
        for q in queries:
            print(f"Injecting demo query: {q['sql'][:50]}...")
            cursor.execute(insert_sql, (q['time'], q['sent'], q['examined'], q['db'], q['sql']))
            
        conn.commit()
        print("Demo data injection complete!")
    except Exception as e:
        print(f"Error during simulation: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inject_demo_queries()
