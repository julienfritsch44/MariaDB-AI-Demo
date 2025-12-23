
import mariadb
import time
import random
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Database Config (Same as setup)
DB_USER = os.getenv("SKYSQL_USERNAME")
DB_PASSWORD = os.getenv("SKYSQL_PASSWORD")
DB_HOST = os.getenv("SKYSQL_HOST")
DB_PORT = int(os.getenv("SKYSQL_PORT", 3306))
DB_DATABASE = "shop_demo"

def get_connection():
    try:
        conn = mariadb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_DATABASE,
            ssl=True
        )
        return conn
    except mariadb.Error as e:
        print(f"Error connecting to MariaDB: {e}")
        return None

def simulate_view_product(cursor):
    """Fast query: PK lookup"""
    pid = random.randint(1, 2000)
    cursor.execute("SELECT * FROM shop_products WHERE id = ?", (pid,))
    cursor.fetchall()
    # print(f"[FAST] Viewed product {pid}")

def simulate_search_products(cursor):
    """Slow query: Wildcard search on non-indexed column"""
    terms = ["gadget", "widget", "awesome", "blue", "red", "steel", "plastic"]
    term = random.choice(terms)
    # Using %term% prevents index usage usually
    cursor.execute(f"SELECT * FROM shop_products WHERE description LIKE '%{term}%'")
    results = cursor.fetchall()
    print(f"[SLOW] Searched products for '{term}': {len(results)} found")

def simulate_admin_report(cursor):
    """Slow query: Function on indexed column (preventing index usage if it existed) + aggregation"""
    year = random.choice([2023, 2024, 2025])
    # YEAR(order_date) is not sargable usually without functional index
    cursor.execute("SELECT count(*), sum(total_amount) FROM shop_orders WHERE YEAR(order_date) = ?", (year,))
    cursor.fetchall()
    print(f"[SLOW] Generated admin report for {year}")

def simulate_customer_history(cursor):
    """Medium query: Join with filtering"""
    cid = random.randint(1, 5000)
    sql = """
        SELECT o.id, o.order_date, sum(oi.unit_price * oi.quantity) 
        FROM shop_orders o
        JOIN shop_order_items oi ON o.id = oi.order_id
        WHERE o.customer_id = ?
        GROUP BY o.id
    """
    cursor.execute(sql, (cid,))
    cursor.fetchall()
    # print(f"[MED] Customer history for {cid}")

def simulate_complex_analytics(cursor):
    """Very Slow query: Multi-join, sorting on non-indexed column, no limit"""
    sql = """
        SELECT c.country, p.category, count(o.id) as order_count, sum(oi.quantity * oi.unit_price) as revenue
        FROM shop_orders o
        JOIN shop_customers c ON o.customer_id = c.id
        JOIN shop_order_items oi ON o.id = oi.order_id
        JOIN shop_products p ON oi.product_id = p.id
        WHERE o.status = 'DELIVERED'
        GROUP BY c.country, p.category
        ORDER BY revenue DESC
        LIMIT 10
    """
    cursor.execute(sql)
    cursor.fetchall()
    print(f"[VERY SLOW] Ran complex analytics")

def main():
    print("Starting Traffic Simulator for shop_demo...")
    print("Press Ctrl+C to stop.")
    
    conn = get_connection()
    if not conn:
        return

    cursor = conn.cursor()

    try:
        while True:
            # Check connection
            try:
                conn.ping()
            except mariadb.Error:
                print("Reconnecting...")
                conn = get_connection()
                cursor = conn.cursor()

            # Pick action
            # Weights: 70% fast, 20% slow, 10% very slow
            rand = random.random()
            
            try:
                if rand < 0.7:
                    simulate_view_product(cursor)
                    # Also maybe small insert?
                elif rand < 0.9:
                    if random.random() < 0.5:
                        simulate_search_products(cursor)
                    else:
                        simulate_customer_history(cursor)
                else:
                    if random.random() < 0.5:
                        simulate_admin_report(cursor)
                    else:
                        simulate_complex_analytics(cursor)
            except mariadb.Error as e:
                print(f"Query Error: {e}")

            # Sleep a bit to not D-DOS completely (or maybe we want to?)
            # Demo needs to feel "active" but not crash my machine (though requests go to SkySQL)
            time.sleep(random.uniform(0.1, 1.0))

    except KeyboardInterrupt:
        print("\nStopping simulator.")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
