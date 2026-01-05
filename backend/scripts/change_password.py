
import os
import sys
import mariadb
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv(override=True)

DB_USER = os.getenv("SKYSQL_USERNAME")
DB_PASSWORD = os.getenv("SKYSQL_PASSWORD")
DB_HOST = os.getenv("SKYSQL_HOST")
DB_PORT = int(os.getenv("SKYSQL_PORT", 3306))

NEW_PASSWORD = "MariaDB_AI_Competition_2026!"

def change_password():
    print(f"Connecting to {DB_HOST} as {DB_USER}...")
    try:
        conn = mariadb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            ssl=True
        )
        cursor = conn.cursor()
        
        print("Changing password...")
        # Using the syntax from the screenshot
        # SET PASSWORD FOR 'user'@'%' = PASSWORD('new_pass');
        # Since we are logged in as the user, we can often just use SET PASSWORD = ...
        # But let's use the explicit syntax provided to be safe, assuming we have permissions.
        # Actually, usually on SkySQL/Cloud, 'user'@'%' is the user.
        
        sql = f"SET PASSWORD FOR '{DB_USER}'@'%' = PASSWORD('{NEW_PASSWORD}')"
        cursor.execute(sql)
        conn.commit()
        
        print(f"Password changed successfully to: {NEW_PASSWORD}")
        print("Please update your .env file immediately.")
        
        conn.close()
        
    except mariadb.Error as e:
        print(f"Error changing password: {e}")
        sys.exit(1)

if __name__ == "__main__":
    change_password()
