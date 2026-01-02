"""
Script to validate Jira tickets in MariaDB once connection is restored
"""
import mariadb
import os
from dotenv import load_dotenv

load_dotenv()

def validate_jira_data():
    try:
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 3306)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=os.getenv("SKYSQL_PASSWORD"),
            database="finops_auditor",
            ssl=True
        )
        
        cursor = conn.cursor(dictionary=True)
        
        # Count total tickets
        cursor.execute("SELECT COUNT(*) as total FROM doc_embeddings WHERE source_type='jira'")
        result = cursor.fetchone()
        print(f"✅ Total Jira tickets: {result['total']}")
        
        # Sample tickets
        cursor.execute("SELECT source_id, LEFT(content, 100) as preview FROM doc_embeddings WHERE source_type='jira' LIMIT 5")
        tickets = cursor.fetchall()
        print("\n📋 Sample tickets:")
        for ticket in tickets:
            print(f"  - {ticket['source_id']}: {ticket['preview']}...")
        
        # Check vector embeddings
        cursor.execute("SELECT COUNT(*) as with_vectors FROM doc_embeddings WHERE embedding IS NOT NULL")
        result = cursor.fetchone()
        print(f"\n🔢 Tickets with embeddings: {result['with_vectors']}")
        
        conn.close()
        print("\n✅ Database validation complete!")
        
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        print("\n💡 Next steps:")
        print("1. Check SkySQL portal: https://app.skysql.com/")
        print("2. Verify IP allowlist includes your current IP")
        print("3. Confirm service is running (not paused)")
        print("4. Test credentials are still valid")

if __name__ == "__main__":
    validate_jira_data()
