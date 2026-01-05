
import mariadb
import sys
import os
import random
from faker import Faker
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

# Database Config
# Database Config
DB_USER = os.getenv("SKYSQL_USERNAME")
DB_PASSWORD = os.getenv("SKYSQL_PASSWORD")
DB_HOST = os.getenv("SKYSQL_HOST")
DB_PORT = int(os.getenv("SKYSQL_PORT", 3306))

print(f"DEBUG: Connecting to {DB_HOST}:{DB_PORT} as {DB_USER}")

def get_connection():
    try:
        # SkySQL usually requires SSL
        conn = mariadb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            ssl=True,
            connect_timeout=10
            # database=DB_DATABASE # Connect without DB first to create it
        )
        return conn
    except mariadb.Error as e:
        print(f"Error connecting to MariaDB: {e}")
        sys.exit(1)

fake = Faker()

def setup_schema(cursor):
    print("Creating schema...")
    
    # Create DB if needed
    try:
        cursor.execute("CREATE DATABASE IF NOT EXISTS shop_demo")
        cursor.execute("USE shop_demo")
    except mariadb.Error as e:
        print(f"Error creating/using database: {e}")
        return

    tables = [
        "DROP TABLE IF EXISTS shop_order_items",
        "DROP TABLE IF EXISTS shop_orders",
        "DROP TABLE IF EXISTS shop_products",
        "DROP TABLE IF EXISTS shop_customers",
        """
        CREATE TABLE shop_customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100),
            country VARCHAR(100),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE shop_products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200),
            category VARCHAR(100),
            price DECIMAL(10, 2),
            stock INT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE shop_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT,
            total_amount DECIMAL(12, 2),
            status VARCHAR(20),
            order_date DATETIME,
            shipping_address TEXT,
            FOREIGN KEY (customer_id) REFERENCES shop_customers(id)
        )
        """,
        """
        CREATE TABLE shop_order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT,
            product_id INT,
            quantity INT,
            unit_price DECIMAL(10, 2),
            FOREIGN KEY (order_id) REFERENCES shop_orders(id),
            FOREIGN KEY (product_id) REFERENCES shop_products(id)
        )
        """
    ]

    for sql in tables:
        try:
            cursor.execute(sql)
        except mariadb.Error as e:
            print(f"Error executing schema SQL: {sql[:50]}... -> {e}")

    print("Schema created successfully!")

def seed_data(conn, cursor):
    print("Seeding data (this might take a minute)...")
    
    # 1. Customers
    print("  -> Generating 5,000 Customers...")
    customers = []
    for _ in range(5000):
        customers.append((
            fake.name(),
            fake.email(),
            fake.country(),
            fake.date_time_between(start_date="-2y", end_date="now")
        ))
    cursor.executemany(
        "INSERT INTO shop_customers (name, email, country, created_at) VALUES (?, ?, ?, ?)",
        customers
    )
    conn.commit()

    # 2. Products
    print("  -> Generating 2,000 Products...")
    categories = ['Electronics', 'Books', 'Clothing', 'Home', 'Garden', 'Toys', 'Sports']
    products = []
    for _ in range(2000):
        products.append((
            fake.catch_phrase(),
            random.choice(categories),
            round(random.uniform(10, 1000), 2),
            random.randint(0, 500),
            fake.text(max_nb_chars=200),
            fake.date_time_between(start_date="-2y", end_date="now")
        ))
    cursor.executemany(
        "INSERT INTO shop_products (name, category, price, stock, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        products
    )
    conn.commit()

    # 3. Orders
    print("  -> Generating 20,000 Orders...")
    
    # Get IDs
    cursor.execute("SELECT id FROM shop_customers")
    cust_ids = [r[0] for r in cursor.fetchall()]
    
    cursor.execute("SELECT id, price FROM shop_products")
    prod_data = cursor.fetchall() # list of (id, price)
    
    orders = []
    order_items = []
    
    statuses = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']

    # Batch insert manually to avoid massive memory usage if we scaled up, but for 20k it's fine.
    # We need order IDs for items, so we might insert orders first or use a procedure. 
    # To keep it simple in python: insert orders, then knowing IDs are auto-inc, insert items? 
    # Or just insert one by one? 20k is small enough for batching.
    
    # Actually, simplest is to loop and insert, but that's slow.
    # Faster: Generate CSV and LOAD DATA? Or executemany.
    # Let's use executemany but we need order IDs.
    
    # Strategy: Insert Orders in chunks, get last_insert_id? No, executemany doesn't easily give back IDs for all rows.
    # Compromise: Generate data, insert Orders. fetch all order IDs. Generate Items.
    
    batch_size = 1000
    for i in range(0, 20000, batch_size):
        chunk_orders = []
        for _ in range(batch_size):
            chunk_orders.append((
                random.choice(cust_ids),
                0, # Placeholder total_amount, update later or calculate now? Let's ignore total_amount correctness for demo speed
                random.choice(statuses),
                fake.date_time_between(start_date="-1y", end_date="now"),
                fake.address().replace('\n', ', ')
            ))
        cursor.executemany(
            "INSERT INTO shop_orders (customer_id, total_amount, status, order_date, shipping_address) VALUES (?, ?, ?, ?, ?)",
            chunk_orders
        )
        conn.commit()
        print(f"    ... seeded {i + batch_size} orders")

    # 4. Order Items (Random generation)
    print("  -> Generating Order Items...")
    # Get all order IDs
    cursor.execute("SELECT id FROM shop_orders")
    order_ids = [r[0] for r in cursor.fetchall()]
    
    items = []
    count = 0
    for oid in order_ids:
        # 1-5 items per order
        num_items = random.randint(1, 5)
        for _ in range(num_items):
            pid, price = random.choice(prod_data)
            qty = random.randint(1, 3)
            items.append((oid, pid, qty, price))
            count += 1
            
        if len(items) >= 5000:
            cursor.executemany(
                "INSERT INTO shop_order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                items
            )
            conn.commit()
            items = []
            print(f"    ... seeded {count} items")
            
    if items:
        cursor.executemany(
            "INSERT INTO shop_order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
            items
        )
        conn.commit()

    print("Seeding complete!")

def main():
    conn = get_connection()
    cursor = conn.cursor()
    
    setup_schema(cursor)
    seed_data(conn, cursor)
    
    conn.close()

if __name__ == "__main__":
    main()
