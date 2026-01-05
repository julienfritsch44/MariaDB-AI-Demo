"""
Initialize the shop_demo database with the orders table for Self-Healing SQL demo.
"""
import os
import mariadb
from dotenv import load_dotenv

load_dotenv()

def init_database():
    try:
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 3306)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=os.getenv("SKYSQL_PASSWORD"),
            ssl=True,
            connect_timeout=10
        )
        cursor = conn.cursor()
        
        # Create shop_demo database if it doesn't exist
        print("Creating shop_demo database...")
        cursor.execute("CREATE DATABASE IF NOT EXISTS shop_demo")
        cursor.execute("USE shop_demo")
        
        # Create orders table
        print("Creating orders table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                product_name VARCHAR(255),
                quantity INT,
                price DECIMAL(10, 2),
                order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'pending'
            )
        """)
        
        # Create customers table  
        print("Creating customers table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255),
                status VARCHAR(50) DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check if data exists
        cursor.execute("SELECT COUNT(*) FROM orders")
        order_count = cursor.fetchone()[0]
        
        if order_count == 0:
            print("Inserting test data into orders (1000 rows)...")
            for i in range(1000):
                cursor.execute("""
                    INSERT INTO orders (customer_id, product_name, quantity, price, status)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    (i % 100) + 1,  # customer_id 1-100
                    f"Product_{i % 50}",
                    (i % 10) + 1,
                    round((i % 100) * 10.5, 2),
                    ['pending', 'shipped', 'delivered', 'cancelled'][i % 4]
                ))
            
            print("Inserting test data into customers (100 rows)...")
            for i in range(100):
                cursor.execute("""
                    INSERT INTO customers (name, email, status)
                    VALUES (%s, %s, %s)
                """, (
                    f"Customer_{i+1}",
                    f"customer{i+1}@example.com",
                    ['active', 'inactive'][i % 2]
                ))
            
            conn.commit()
            print("Test data inserted successfully!")
        else:
            print(f"Data already exists ({order_count} orders). Skipping insert.")
        
        conn.close()
        print("\n✓ Database initialization complete!")
        
    except mariadb.Error as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    init_database()
