"""
Populate database with realistic data to generate naturally slow queries.
This creates tables with enough data to cause performance issues without indexes.
"""

import random
import time
from datetime import datetime, timedelta
from database import get_db_connection

def create_tables():
    """Create tables for realistic slow query testing"""
    print("[SETUP] Creating tables...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Select the database
    cursor.execute("USE finops_auditor")
    
    # Drop existing tables if they exist
    cursor.execute("DROP TABLE IF EXISTS order_items")
    cursor.execute("DROP TABLE IF EXISTS orders")
    cursor.execute("DROP TABLE IF EXISTS products")
    cursor.execute("DROP TABLE IF EXISTS customers")
    
    # Create customers table
    cursor.execute("""
        CREATE TABLE customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100),
            city VARCHAR(50),
            country VARCHAR(50),
            signup_date DATE
        )
    """)
    
    # Create products table
    cursor.execute("""
        CREATE TABLE products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200),
            category VARCHAR(50),
            price DECIMAL(10,2),
            stock INT
        )
    """)
    
    # Create orders table (NO INDEX on customer_id initially - this causes slow queries)
    cursor.execute("""
        CREATE TABLE orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT,
            order_date DATETIME,
            total_amount DECIMAL(10,2),
            status VARCHAR(20)
        )
    """)
    
    # Create order_items table (NO INDEX on order_id/product_id - causes slow JOINs)
    cursor.execute("""
        CREATE TABLE order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT,
            product_id INT,
            quantity INT,
            price DECIMAL(10,2)
        )
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    print("✅ Tables created")

def populate_customers(count=10000):
    """Insert customer records"""
    print(f"[DATA] Inserting {count} customers...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("USE finops_auditor")
    
    cities = ['Paris', 'London', 'New York', 'Tokyo', 'Berlin', 'Sydney', 'Toronto', 'Mumbai']
    countries = ['France', 'UK', 'USA', 'Japan', 'Germany', 'Australia', 'Canada', 'India']
    
    batch_size = 1000
    for i in range(0, count, batch_size):
        values = []
        for j in range(batch_size):
            if i + j >= count:
                break
            name = f"Customer_{i+j}"
            email = f"customer{i+j}@example.com"
            city = random.choice(cities)
            country = random.choice(countries)
            signup_date = (datetime.now() - timedelta(days=random.randint(1, 1000))).date()
            values.append(f"('{name}', '{email}', '{city}', '{country}', '{signup_date}')")
        
        if values:
            query = f"INSERT INTO customers (name, email, city, country, signup_date) VALUES {','.join(values)}"
            cursor.execute(query)
            conn.commit()
            print(f"  Inserted {min(i+batch_size, count)}/{count} customers")
    
    cursor.close()
    conn.close()
    print("✅ Customers populated")

def populate_products(count=1000):
    """Insert product records"""
    print(f"[DATA] Inserting {count} products...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("USE finops_auditor")
    
    categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Toys', 'Sports', 'Home', 'Beauty']
    
    batch_size = 500
    for i in range(0, count, batch_size):
        values = []
        for j in range(batch_size):
            if i + j >= count:
                break
            name = f"Product_{i+j}"
            category = random.choice(categories)
            price = round(random.uniform(10, 1000), 2)
            stock = random.randint(0, 500)
            values.append(f"('{name}', '{category}', {price}, {stock})")
        
        if values:
            query = f"INSERT INTO products (name, category, price, stock) VALUES {','.join(values)}"
            cursor.execute(query)
            conn.commit()
            print(f"  Inserted {min(i+batch_size, count)}/{count} products")
    
    cursor.close()
    conn.close()
    print("✅ Products populated")

def populate_orders(count=50000):
    """Insert order records"""
    print(f"[DATA] Inserting {count} orders...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("USE finops_auditor")
    
    statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    
    batch_size = 1000
    for i in range(0, count, batch_size):
        values = []
        for j in range(batch_size):
            if i + j >= count:
                break
            customer_id = random.randint(1, 10000)
            order_date = datetime.now() - timedelta(days=random.randint(1, 365))
            total_amount = round(random.uniform(20, 5000), 2)
            status = random.choice(statuses)
            values.append(f"({customer_id}, '{order_date}', {total_amount}, '{status}')")
        
        if values:
            query = f"INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES {','.join(values)}"
            cursor.execute(query)
            conn.commit()
            print(f"  Inserted {min(i+batch_size, count)}/{count} orders")
    
    cursor.close()
    conn.close()
    print("✅ Orders populated")

def populate_order_items(count=150000):
    """Insert order item records"""
    print(f"[DATA] Inserting {count} order items...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("USE finops_auditor")
    
    batch_size = 1000
    for i in range(0, count, batch_size):
        values = []
        for j in range(batch_size):
            if i + j >= count:
                break
            order_id = random.randint(1, 50000)
            product_id = random.randint(1, 1000)
            quantity = random.randint(1, 10)
            price = round(random.uniform(10, 1000), 2)
            values.append(f"({order_id}, {product_id}, {quantity}, {price})")
        
        if values:
            query = f"INSERT INTO order_items (order_id, product_id, quantity, price) VALUES {','.join(values)}"
            cursor.execute(query)
            conn.commit()
            print(f"  Inserted {min(i+batch_size, count)}/{count} order items")
    
    cursor.close()
    conn.close()
    print("✅ Order items populated")

if __name__ == "__main__":
    print("=" * 60)
    print("REALISTIC DATA POPULATION")
    print("=" * 60)
    print("\nThis will create tables and populate them with data.")
    print("Expected time: 5-10 minutes")
    print("\nTables to create:")
    print("  - customers (10,000 rows)")
    print("  - products (1,000 rows)")
    print("  - orders (50,000 rows)")
    print("  - order_items (150,000 rows)")
    print("\n⚠️  WARNING: This will DROP existing tables if they exist!")
    print("=" * 60)
    print("\nStarting population...")
    
    start_time = time.time()
    
    create_tables()
    populate_customers(10000)
    populate_products(1000)
    populate_orders(50000)
    populate_order_items(150000)
    
    elapsed = time.time() - start_time
    print(f"\n✅ ALL DONE in {elapsed:.1f} seconds")
    print("\nNext step: Run the query poller to generate naturally slow queries!")
