
import os
import sys
import mariadb
from dotenv import load_dotenv

# Path hack to import from parent dir
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection

def execute_sql_file(cursor, file_path):
    print(f"Executing {file_path}...")
    if not os.path.exists(file_path):
        print(f"⚠️  File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Handle DELIMITER //
    if 'DELIMITER //' in content:
        # Split by DELIMITER //
        blocks = content.split('DELIMITER //')
        for block in blocks:
            if 'DELIMITER ;' in block:
                subblocks = block.split('DELIMITER ;')
                # The first part is the procedure block ending with //
                proc_block = subblocks[0].strip()
                if proc_block.endswith('//'):
                    proc_block = proc_block[:-2].strip()
                if proc_block:
                    try:
                        cursor.execute(proc_block)
                        print(f"✅ Procedure/Block executed.")
                    except Exception as e:
                        print(f"❌ Error executing block: {e}")
                
                # The rest are normal statements separated by ;
                for i in range(1, len(subblocks)):
                    statements = [s.strip() for s in subblocks[i].split(';') if s.strip()]
                    for sql in statements:
                        try:
                            cursor.execute(sql)
                            print(f"✅ Statement executed.")
                        except Exception as e:
                            print(f"❌ Error executing statement: {e}")
            else:
                # Normal splitting by ;
                statements = [s.strip() for s in block.split(';') if s.strip()]
                for sql in statements:
                    if sql == '//' or sql == 'DELIMITER': continue
                    try:
                        cursor.execute(sql)
                        print(f"✅ Statement executed.")
                    except Exception as e:
                        print(f"❌ Error executing statement: {e}")
    else:
        statements = [s.strip() for s in content.split(';') if s.strip()]
        for sql in statements:
            try:
                cursor.execute(sql)
                print(f"✅ Statement executed.")
            except Exception as e:
                print(f"❌ Error executing statement: {e}")

def init_db():
    load_dotenv(override=True)
    db_name = os.getenv("SKYSQL_DATABASE", "shop_demo")
    conn = get_db_connection(database=db_name)
    
    if conn.__class__.__name__ == 'MockConnection':
        print("⚠️  Working in MOCK MODE. Skipping physical table creation.")
        return

    cursor = conn.cursor()
    
    # 1. Plan Baselines
    sql_plan = os.path.join(os.path.dirname(__file__), 'create_plan_baselines_table.sql')
    execute_sql_file(cursor, sql_plan)
    
    # 2. Shop Demo Schema (orders table etc)
    # Correct path relative to backend/scripts/
    sql_shop = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'poc', 'init', '01-init.sql')
    execute_sql_file(cursor, sql_shop)
    
    conn.commit()
    print("✅ Database initialization complete.")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    init_db()
