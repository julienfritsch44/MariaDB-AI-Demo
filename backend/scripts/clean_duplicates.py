import sys
import os
import mariadb
from dotenv import load_dotenv

# Fix Windows encoding
sys.stdout.reconfigure(encoding='utf-8')

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.vector_store import VectorStore

# Load env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

def get_db_params():
    return {
        "host": os.getenv("SKYSQL_HOST"),
        "port": int(os.getenv("SKYSQL_PORT", 3306)),
        "user": os.getenv("SKYSQL_USERNAME"),
        "password": os.getenv("SKYSQL_PASSWORD"),
        "ssl": True,
        "database": "finops_auditor"
    }

def check_and_clean_duplicates():
    print("🔍 Checking for duplicates in MariaDB Vector Store...")
    
    try:
        conn = mariadb.connect(**get_db_params())
        cursor = conn.cursor(dictionary=True)
        
        # 1. Get stats
        cursor.execute("SELECT COUNT(*) as total FROM doc_embeddings")
        total = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(DISTINCT source_id) as unique_count FROM doc_embeddings WHERE source_type='jira'")
        unique_jira = cursor.fetchone()['unique_count']
        
        print(f"📊 Total documents: {total}")
        print(f"📊 Unique Jira tickets: {unique_jira}")
        
        # 2. Find duplicates
        cursor.execute("""
            SELECT source_id, COUNT(*) as cnt 
            FROM doc_embeddings 
            WHERE source_type='jira' 
            GROUP BY source_id 
            HAVING cnt > 1
        """)
        duplicates = cursor.fetchall()
        
        if not duplicates:
            print("✅ No duplicates found.")
            return

        print(f"⚠️ Found {len(duplicates)} Jira tickets with duplicates.")
        
        # 3. Clean duplicates (keep latest id)
        print("🧹 Cleaning up duplicates (keeping latest entries)...")
        deleted_count = 0
        
        for dup in duplicates:
            source_id = dup['source_id']
            # Find all IDs for this source_id, ordered by ID desc
            cursor.execute("SELECT id FROM doc_embeddings WHERE source_id=%s ORDER BY id DESC", (source_id,))
            ids = [row['id'] for row in cursor.fetchall()]
            
            # Keep first (newest), delete rest
            ids_to_delete = ids[1:]
            
            if ids_to_delete:
                # Use simple loop for safety
                for del_id in ids_to_delete:
                    cursor.execute("DELETE FROM doc_embeddings WHERE id = %s", (del_id,))
                    deleted_count += 1
        
        conn.commit()
        print(f"✅ Deleted {deleted_count} duplicate entries.")
        
        # 4. Final Verification
        cursor.execute("SELECT COUNT(*) as total FROM doc_embeddings")
        final_total = cursor.fetchone()['total']
        print(f"🏁 Final document count: {final_total}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_and_clean_duplicates()
