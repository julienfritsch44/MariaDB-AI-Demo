"""
Script pour vérifier et activer le slow query log sur SkySQL
"""

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

config = {
    'host': os.getenv('SKYSQL_HOST'),
    'user': os.getenv('SKYSQL_USER'),
    'password': os.getenv('SKYSQL_PASSWORD'),
    'database': 'mysql',
    'port': int(os.getenv('SKYSQL_PORT', 3306)),
}

def check_slow_query_log():
    """Vérifie si le slow query log est activé et contient des données"""
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        print("🔍 Vérification du Slow Query Log...")
        
        # 1. Vérifier si le slow query log est activé
        cursor.execute("SHOW VARIABLES LIKE 'slow_query_log'")
        result = cursor.fetchone()
        print(f"\n1. Slow Query Log Status: {result[1] if result else 'NOT FOUND'}")
        
        # 2. Vérifier le threshold
        cursor.execute("SHOW VARIABLES LIKE 'long_query_time'")
        result = cursor.fetchone()
        print(f"2. Long Query Time Threshold: {result[1] if result else 'NOT FOUND'} seconds")
        
        # 3. Vérifier si la table slow_log existe
        cursor.execute("SHOW TABLES FROM mysql LIKE 'slow_log'")
        result = cursor.fetchone()
        print(f"3. Table mysql.slow_log exists: {'YES' if result else 'NO'}")
        
        if result:
            # 4. Compter les entrées
            cursor.execute("SELECT COUNT(*) FROM mysql.slow_log")
            count = cursor.fetchone()[0]
            print(f"4. Slow queries recorded: {count}")
            
            if count > 0:
                # 5. Montrer un exemple
                cursor.execute("SELECT query_time, rows_examined, sql_text FROM mysql.slow_log LIMIT 1")
                sample = cursor.fetchone()
                print(f"\n📊 Sample slow query:")
                print(f"   Time: {sample[0]}s")
                print(f"   Rows: {sample[1]}")
                print(f"   SQL: {sample[2][:100]}...")
        
        print("\n💡 Recommandation:")
        print("   Pour avoir des données réelles, il faut:")
        print("   1. Activer le slow query log (si pas déjà fait)")
        print("   2. Exécuter des requêtes lentes sur shop_demo")
        print("   3. Attendre que SkySQL les enregistre")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    check_slow_query_log()
