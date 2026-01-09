
import mariadb
import time
import random
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

import json

# Database Config
DB_USER = os.getenv("SKYSQL_USERNAME")
DB_PASSWORD = os.getenv("SKYSQL_PASSWORD")
DB_HOST = os.getenv("SKYSQL_HOST")
DB_PORT = int(os.getenv("SKYSQL_PORT", 3306))
DB_DATABASE = "shop_demo"

# Stats Persistence
STATS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "services", "simulation_stats.json")

def save_stats(stats):
    try:
        with open(STATS_FILE, "w") as f:
            json.dump(stats, f)
    except Exception as e:
        print(f"Failed to save stats: {e}")

# SkySQL slow query threshold is 10 seconds
SKYSQL_SLOW_THRESHOLD = 10.0

def get_connection(database=DB_DATABASE):
    try:
        conn = mariadb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            database=database,
            ssl=True
        )
        return conn
    except mariadb.Error as e:
        print(f"Error connecting to MariaDB ({database}): {e}")
        return None

# =============================================================================
# EXTREME SLOW QUERIES - Designed to take > 10 seconds
# =============================================================================

def simulate_triple_cross_join(cursor):
    """
    EXTREMELY SLOW: Triple cross join creating millions of row combinations
    """
    sql = """
        SELECT 
            c1.name as customer1,
            c2.name as customer2,
            c3.name as customer3,
            COUNT(*) as combination_count
        FROM shop_customers c1
        CROSS JOIN shop_customers c2
        CROSS JOIN shop_customers c3
        WHERE c1.id <= 20 AND c2.id <= 20 AND c3.id <= 20
        GROUP BY c1.name, c2.name, c3.name
        ORDER BY combination_count DESC
        LIMIT 100
    """
    # 20^3 = 8000 combinations, but forces full processing
    
    print("[EXTREME] Running TRIPLE cross join (20^3 = 8000 combinations)...")
    start = time.time()
    try:
        cursor.execute(sql)
        res = cursor.fetchall()
    except Exception as e:
        print(f"[EXTREME] Query failed: {e}")
        return 0, sql, 0, 0
    duration = time.time() - start
    
    print(f"[EXTREME] Triple cross join completed in {duration:.2f}s")
    return duration, sql, len(res), 8000

def simulate_massive_subquery_chain(cursor):
    """
    EXTREMELY SLOW: Nested correlated subqueries that must be evaluated row-by-row
    """
    sql = """
        SELECT 
            c.id,
            c.name,
            c.country,
            (SELECT COUNT(*) FROM shop_orders o WHERE o.customer_id = c.id) as order_count,
            (SELECT SUM(total_amount) FROM shop_orders o WHERE o.customer_id = c.id) as total_spent,
            (SELECT COUNT(*) FROM shop_order_items oi 
             JOIN shop_orders o ON oi.order_id = o.id 
             WHERE o.customer_id = c.id) as items_count,
            (SELECT AVG(oi.unit_price) FROM shop_order_items oi 
             JOIN shop_orders o ON oi.order_id = o.id 
             WHERE o.customer_id = c.id) as avg_price,
            (SELECT MAX(o.order_date) FROM shop_orders o WHERE o.customer_id = c.id) as last_order,
            (SELECT MIN(o.order_date) FROM shop_orders o WHERE o.customer_id = c.id) as first_order,
            (SELECT COUNT(DISTINCT oi.product_id) FROM shop_order_items oi 
             JOIN shop_orders o ON oi.order_id = o.id 
             WHERE o.customer_id = c.id) as unique_products
        FROM shop_customers c
        ORDER BY total_spent DESC
    """
    # 8 correlated subqueries for EACH of 5000 customers = massive overhead
    
    print("[EXTREME] Running 8 correlated subqueries for ALL 5000 customers...")
    start = time.time()
    try:
        cursor.execute(sql)
        res = cursor.fetchall()
    except Exception as e:
        print(f"[EXTREME] Query failed: {e}")
        return 0, sql, 0, 0
    duration = time.time() - start
    
    print(f"[EXTREME] Massive subquery chain completed in {duration:.2f}s")
    return duration, sql, len(res), 5000 * 8

def simulate_full_order_rebuild(cursor):
    """
    EXTREMELY SLOW: Compute full order analytics with string operations
    """
    sql = """
        SELECT 
            o.id,
            o.order_date,
            c.name as customer,
            c.country,
            o.status,
            GROUP_CONCAT(DISTINCT p.name SEPARATOR ', ') as products,
            GROUP_CONCAT(DISTINCT p.category SEPARATOR ', ') as categories,
            SUM(oi.quantity) as total_items,
            SUM(oi.quantity * oi.unit_price) as subtotal,
            o.total_amount,
            CASE 
                WHEN o.total_amount > 1000 THEN 'VIP'
                WHEN o.total_amount > 500 THEN 'PREMIUM'
                WHEN o.total_amount > 100 THEN 'STANDARD'
                ELSE 'BASIC'
            END as tier,
            DATEDIFF(NOW(), o.order_date) as days_since_order
        FROM shop_orders o
        JOIN shop_customers c ON o.customer_id = c.id
        JOIN shop_order_items oi ON o.id = oi.order_id
        JOIN shop_products p ON oi.product_id = p.id
        GROUP BY o.id, o.order_date, c.name, c.country, o.status, o.total_amount
        HAVING total_items > 1
        ORDER BY subtotal DESC
    """
    
    print("[EXTREME] Running full order rebuild with GROUP_CONCAT...")
    start = time.time()
    try:
        cursor.execute(sql)
        res = cursor.fetchall()
    except Exception as e:
        print(f"[EXTREME] Query failed: {e}")
        return 0, sql, 0, 0
    duration = time.time() - start
    
    print(f"[EXTREME] Full order rebuild completed in {duration:.2f}s")
    return duration, sql, len(res), 20000 * 60000

def simulate_product_analysis_with_ranking(cursor):
    """
    VERY SLOW: Product sales analysis with window functions and multiple passes
    """
    sql = """
        SELECT 
            p.id,
            p.name,
            p.category,
            p.price,
            COUNT(DISTINCT oi.order_id) as order_count,
            SUM(oi.quantity) as total_sold,
            SUM(oi.quantity * oi.unit_price) as revenue,
            AVG(oi.quantity) as avg_quantity_per_order,
            ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity * oi.unit_price) DESC) as revenue_rank,
            ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY SUM(oi.quantity) DESC) as category_rank,
            PERCENT_RANK() OVER (ORDER BY SUM(oi.quantity * oi.unit_price)) as revenue_percentile,
            (SELECT COUNT(DISTINCT c.country) 
             FROM shop_order_items oi2 
             JOIN shop_orders o ON oi2.order_id = o.id 
             JOIN shop_customers c ON o.customer_id = c.id 
             WHERE oi2.product_id = p.id) as countries_sold_in
        FROM shop_products p
        LEFT JOIN shop_order_items oi ON p.id = oi.product_id
        GROUP BY p.id, p.name, p.category, p.price
        ORDER BY revenue DESC
    """
    
    print("[EXTREME] Running product analysis with window functions + correlated subquery...")
    start = time.time()
    try:
        cursor.execute(sql)
        res = cursor.fetchall()
    except Exception as e:
        print(f"[EXTREME] Query failed: {e}")
        return 0, sql, 0, 0
    duration = time.time() - start
    
    print(f"[EXTREME] Product analysis completed in {duration:.2f}s")
    return duration, sql, len(res), 2000 * 60000

def simulate_date_range_explosion(cursor):
    """
    EXTREMELY SLOW: Generate date series and cross with data
    Using recursive CTE if supported, otherwise fallback
    """
    # This query tries to create an artificial delay by processing data multiple ways
    sql = """
        SELECT 
            YEAR(o.order_date) as year,
            MONTH(o.order_date) as month,
            DAYOFWEEK(o.order_date) as dow,
            o.status,
            c.country,
            p.category,
            COUNT(*) as count,
            SUM(oi.quantity * oi.unit_price) as revenue,
            AVG(oi.unit_price) as avg_price,
            MIN(oi.unit_price) as min_price,
            MAX(oi.unit_price) as max_price,
            STDDEV(oi.unit_price) as stddev_price,
            COUNT(DISTINCT c.id) as unique_customers,
            COUNT(DISTINCT p.id) as unique_products
        FROM shop_orders o
        CROSS JOIN (SELECT 1 as n UNION SELECT 2 UNION SELECT 3) as multiplier
        JOIN shop_customers c ON o.customer_id = c.id
        JOIN shop_order_items oi ON o.id = oi.order_id
        JOIN shop_products p ON oi.product_id = p.id
        GROUP BY year, month, dow, o.status, c.country, p.category
        WITH ROLLUP
    """
    
    print("[EXTREME] Running date range explosion with ROLLUP...")
    start = time.time()
    try:
        cursor.execute(sql)
        res = cursor.fetchall()
    except Exception as e:
        print(f"[EXTREME] Query failed: {e}")
        return 0, sql, 0, 0
    duration = time.time() - start
    
    print(f"[EXTREME] Date range explosion completed in {duration:.2f}s")
    return duration, sql, len(res), 60000 * 3

def simulate_sleep_query(cursor):
    """
    GUARANTEED SLOW: Use SLEEP() to ensure query exceeds threshold
    This is useful for testing that the observability API works
    """
    sleep_time = random.randint(11, 15)  # 11-15 seconds
    sql = f"""
        SELECT 
            SLEEP({sleep_time}) as waited,
            COUNT(*) as total_products,
            AVG(price) as avg_price
        FROM shop_products
        WHERE price > 0
    """
    
    print(f"[SLEEP] Running query with SLEEP({sleep_time})...")
    start = time.time()
    try:
        cursor.execute(sql)
        res = cursor.fetchall()
    except Exception as e:
        print(f"[SLEEP] Query failed: {e}")
        return 0, sql, 0, 0
    duration = time.time() - start
    
    print(f"[SLEEP] Sleep query completed in {duration:.2f}s")
    return duration, sql, len(res), 2000

def simulate_fast_query(cursor):
    """Fast query for background noise"""
    pid = random.randint(1, 2000)
    sql = f"SELECT * FROM shop_products WHERE id = {pid}"
    
    start = time.time()
    cursor.execute(sql)
    res = cursor.fetchall()
    duration = time.time() - start
    
    return duration, sql, len(res), 1

# =============================================================================
# MAIN LOOP
# =============================================================================

def main():
    print("=" * 70)
    print("SHOP DEMO - EXTREME Heavy Traffic Simulator")
    print("=" * 70)
    print(f"Target: Generate queries > {SKYSQL_SLOW_THRESHOLD}s for SkySQL Observability API")
    print("Using SLEEP() queries to GUARANTEE slow query log entries!")
    print("Press Ctrl+C to stop.")
    print("=" * 70)
    
    conn = get_connection()
    if not conn:
        return

    cursor = conn.cursor()
    
    # Include SLEEP query to guarantee slow logs
    extreme_queries = [
        simulate_sleep_query,  # GUARANTEED to exceed 10s
        simulate_triple_cross_join,
        simulate_massive_subquery_chain,
        simulate_full_order_rebuild,
        simulate_product_analysis_with_ranking,
        simulate_date_range_explosion,
    ]

    slow_query_count = 0
    total_query_count = 0

    try:
        while True:
            # Check connection
            try:
                conn.ping()
            except mariadb.Error:
                print("Reconnecting...")
                conn = get_connection()
                if not conn:
                    time.sleep(5)
                    continue
                cursor = conn.cursor()

            # 50% chance of extreme query (including SLEEP)
            rand = random.random()
            
            try:
                if rand < 0.5:
                    # Run an EXTREME query
                    query_func = random.choice(extreme_queries)
                    duration, sql, rows_sent, rows_examined = query_func(cursor)
                    
                    if duration > SKYSQL_SLOW_THRESHOLD:
                        slow_query_count += 1
                        print(f"\n*** SUCCESS! Query took {duration:.2f}s - WILL appear in SkySQL slow logs! ***")
                        print(f"*** Total slow queries generated: {slow_query_count} ***\n")
                    elif duration > 0:
                        print(f"[INFO] Query took {duration:.2f}s - under threshold")
                else:
                    # Run a fast query
                    duration, sql, rows_sent, rows_examined = simulate_fast_query(cursor)
                
                total_query_count += 1
                        
            except mariadb.Error as e:
                print(f"Query Error: {e}")

            # Small delay between queries
            time.sleep(random.uniform(1.0, 3.0))

            # Update and save stats
            stats = {
                "total_queries": total_query_count,
                "slow_queries": slow_query_count,
                "revenue": 124590 + (total_query_count * 5.25), # Base + estimate $5.25 per query
                "orders": 1402 + (total_query_count // 3), # Estimate 1 order every 3 queries
                "active_users": 342 + random.randint(-10, 10),
                "last_update": datetime.now().isoformat()
            }
            save_stats(stats)

    except KeyboardInterrupt:
        print("\n" + "=" * 70)
        print(f"Stopping simulator.")
        print(f"Total queries executed: {total_query_count}")
        print(f"Slow queries (>{SKYSQL_SLOW_THRESHOLD}s): {slow_query_count}")
        print("=" * 70)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
