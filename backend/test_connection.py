import os
import mariadb
from dotenv import load_dotenv

load_dotenv()

def test_connection():
    try:
        print("Tentative de connexion à MariaDB SkySQL...")
        print(f"Host: {os.getenv('SKYSQL_HOST')}")
        print(f"Port: {os.getenv('SKYSQL_PORT')}")
        print(f"User: {os.getenv('SKYSQL_USERNAME')}")
        print(f"Password length: {len(os.getenv('SKYSQL_PASSWORD', ''))}")
        print(f"Password first 5 chars: {os.getenv('SKYSQL_PASSWORD', '')[:5]}")
        
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 4049)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=os.getenv("SKYSQL_PASSWORD"),
            ssl_verify_cert=False,
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        
        print(f"\n✅ Connexion réussie!")
        print(f"Version MariaDB: {version[0]}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur de connexion: {e}")
        return False

if __name__ == "__main__":
    test_connection()
