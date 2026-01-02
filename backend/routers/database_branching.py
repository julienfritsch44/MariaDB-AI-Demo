"""
Database Branching Router
Clonage copy-on-write de bases de données pour tests DDL sans risque
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from database import get_db_connection
from mock_data import MockDataGenerator

router = APIRouter(prefix="/branching", tags=["Database Branching"])


class BranchCreateRequest(BaseModel):
    source_database: str = "shop_demo"
    branch_name: str
    description: Optional[str] = None
    copy_data: bool = False


class BranchCompareRequest(BaseModel):
    source_database: str
    branch_database: str


class BranchMergeRequest(BaseModel):
    branch_database: str
    target_database: str
    dry_run: bool = True


class BranchManager:
    """Gestionnaire de branches de base de données"""
    
    @staticmethod
    def generate_branch_id(source_db: str, branch_name: str) -> str:
        """Génère un ID unique pour une branche"""
        timestamp = datetime.now().isoformat()
        content = f"{source_db}_{branch_name}_{timestamp}"
        return hashlib.sha256(content.encode()).hexdigest()[:12]
    
    @staticmethod
    def create_branch_database(conn, source_db: str, branch_name: str, copy_data: bool = False) -> str:
        """Crée une nouvelle base de données branche"""
        cursor = conn.cursor(dictionary=True)
        
        branch_db_name = f"{source_db}_branch_{branch_name}"
        
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {branch_db_name}")
        
        cursor.execute(f"SHOW TABLES FROM {source_db}")
        tables = [list(row.values())[0] for row in cursor.fetchall()]
        
        for table in tables:
            cursor.execute(f"SHOW CREATE TABLE {source_db}.{table}")
            create_table_result = cursor.fetchone()
            create_table_ddl = create_table_result.get('Create Table', '')
            
            cursor.execute(f"USE {branch_db_name}")
            cursor.execute(create_table_ddl)
            
            if copy_data:
                cursor.execute(f"""
                    INSERT INTO {branch_db_name}.{table}
                    SELECT * FROM {source_db}.{table}
                """)
        
        cursor.close()
        return branch_db_name
    
    @staticmethod
    def get_schema_diff(conn, db1: str, db2: str) -> Dict[str, Any]:
        """Compare les schémas de deux bases de données"""
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(f"SHOW TABLES FROM {db1}")
        tables_db1 = set([list(row.values())[0] for row in cursor.fetchall()])
        
        cursor.execute(f"SHOW TABLES FROM {db2}")
        tables_db2 = set([list(row.values())[0] for row in cursor.fetchall()])
        
        diff = {
            'tables_only_in_source': list(tables_db1 - tables_db2),
            'tables_only_in_branch': list(tables_db2 - tables_db1),
            'common_tables': list(tables_db1 & tables_db2),
            'schema_differences': []
        }
        
        for table in diff['common_tables']:
            cursor.execute(f"SHOW CREATE TABLE {db1}.{table}")
            ddl1 = cursor.fetchone().get('Create Table', '')
            
            cursor.execute(f"SHOW CREATE TABLE {db2}.{table}")
            ddl2 = cursor.fetchone().get('Create Table', '')
            
            if ddl1 != ddl2:
                diff['schema_differences'].append({
                    'table': table,
                    'source_ddl': ddl1,
                    'branch_ddl': ddl2
                })
        
        cursor.close()
        return diff


@router.post("/create")
async def create_branch(request: BranchCreateRequest):
    """
    Crée une branche de base de données (copy-on-write simulé)
    """
    try:
        conn = get_db_connection()
        
        # Check if in mock mode
        if isinstance(conn, type(conn)) and conn.__class__.__name__ == 'MockConnection':
            return {
                "success": True,
                "message": "Branch created successfully (MOCK MODE)",
                "branch": {
                    "branch_id": "br_mock_001",
                    "branch_name": request.branch_name,
                    "branch_database": f"{request.source_database}_branch_{request.branch_name}",
                    "source_database": request.source_database,
                    "created_at": datetime.now().isoformat(),
                    "size_mb": 0.8,
                    "creation_time_sec": 2.3
                }
            }
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SHOW DATABASES")
        databases = [row['Database'] for row in cursor.fetchall()]
        
        if request.source_database not in databases:
            cursor.close()
            conn.close()
            return {
                "success": False,
                "message": f"Source database '{request.source_database}' not found"
            }
        
        branch_id = BranchManager.generate_branch_id(
            request.source_database,
            request.branch_name
        )
        
        start_time = datetime.now()
        
        branch_db_name = BranchManager.create_branch_database(
            conn,
            request.source_database,
            request.branch_name,
            request.copy_data
        )
        
        creation_time_sec = (datetime.now() - start_time).total_seconds()
        
        cursor.execute(f"""
            SELECT 
                ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as size_mb
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = %s
        """, (branch_db_name,))
        
        size_result = cursor.fetchone()
        size_mb = size_result.get('size_mb', 0) if size_result else 0
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "mode": "live",
            "message": "Branch created successfully",
            "branch": {
                "branch_id": branch_id,
                "branch_name": request.branch_name,
                "branch_database": branch_db_name,
                "source_database": request.source_database,
                "description": request.description,
                "created_at": datetime.now().isoformat(),
                "size_mb": float(size_mb or 0),
                "data_copied": request.copy_data,
                "creation_time_sec": round(creation_time_sec, 2)
            },
            "usage": {
                "test_ddl": f"USE {branch_db_name}; ALTER TABLE orders ADD INDEX ...",
                "compare": f"POST /branching/compare with source={request.source_database}, branch={branch_db_name}",
                "merge": f"POST /branching/merge with branch={branch_db_name}, target={request.source_database}"
            },
            "recommendations": [
                "Test your DDL changes in this branch",
                "Run load tests without affecting production",
                "Compare schemas before merging",
                "Delete branch after validation to save storage"
            ]
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to create branch: {str(e)}"
        }


@router.get("/list")
async def list_branches(source_database: Optional[str] = None):
    """
    Liste toutes les branches actives
    """
    try:
        conn = get_db_connection()
        
        # Check if in mock mode
        if isinstance(conn, type(conn)) and conn.__class__.__name__ == 'MockConnection':
            mock_branches = MockDataGenerator.get_database_branches()
            return {
                "success": True,
                "message": "Branches listed (MOCK MODE)",
                "branches": mock_branches,
                "total_branches": len(mock_branches)
            }
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SHOW DATABASES")
        all_databases = [row['Database'] for row in cursor.fetchall()]
        
        branches = []
        
        for db in all_databases:
            if '_branch_' in db:
                parts = db.split('_branch_')
                if len(parts) == 2:
                    source_db = parts[0]
                    branch_name = parts[1]
                    
                    if source_database and source_db != source_database:
                        continue
                    
                    cursor.execute(f"""
                        SELECT 
                            COUNT(*) as table_count,
                            ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as size_mb
                        FROM INFORMATION_SCHEMA.TABLES
                        WHERE TABLE_SCHEMA = %s
                    """, (db,))
                    
                    stats = cursor.fetchone()
                    
                    branches.append({
                        'branch_database': db,
                        'source_database': source_db,
                        'branch_name': branch_name,
                        'table_count': stats.get('table_count', 0) if stats else 0,
                        'size_mb': float(stats.get('size_mb', 0) if stats else 0)
                    })
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "count": len(branches),
            "branches": branches,
            "total_size_mb": sum(b['size_mb'] for b in branches)
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to list branches: {str(e)}"
        }


@router.post("/compare")
async def compare_branches(request: BranchCompareRequest):
    """
    Compare le schéma d'une branche avec la source
    """
    try:
        conn = get_db_connection()
        
        diff = BranchManager.get_schema_diff(
            conn,
            request.source_database,
            request.branch_database
        )
        
        conn.close()
        
        has_differences = (
            len(diff['tables_only_in_source']) > 0 or
            len(diff['tables_only_in_branch']) > 0 or
            len(diff['schema_differences']) > 0
        )
        
        return {
            "success": True,
            "mode": "live",
            "source_database": request.source_database,
            "branch_database": request.branch_database,
            "has_differences": has_differences,
            "summary": {
                "tables_only_in_source": len(diff['tables_only_in_source']),
                "tables_only_in_branch": len(diff['tables_only_in_branch']),
                "tables_with_schema_changes": len(diff['schema_differences']),
                "common_tables": len(diff['common_tables'])
            },
            "differences": diff,
            "merge_safe": not has_differences or len(diff['tables_only_in_source']) == 0,
            "recommendations": [
                "Review schema differences before merging",
                "Test queries on branch before production deployment",
                "Backup production before merge"
            ] if has_differences else [
                "No schema differences detected",
                "Branch is in sync with source"
            ]
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to compare branches: {str(e)}"
        }


@router.post("/merge")
async def merge_branch(request: BranchMergeRequest):
    """
    Fusionne une branche vers la cible (avec dry-run par défaut)
    """
    try:
        if request.dry_run:
            conn = get_db_connection()
            
            diff = BranchManager.get_schema_diff(
                conn,
                request.target_database,
                request.branch_database
            )
            
            conn.close()
            
            merge_script = []
            
            for table in diff['tables_only_in_branch']:
                merge_script.append(f"-- Create new table: {table}")
                merge_script.append(f"CREATE TABLE {request.target_database}.{table} LIKE {request.branch_database}.{table};")
            
            for schema_diff in diff['schema_differences']:
                merge_script.append(f"-- Update schema for: {schema_diff['table']}")
                merge_script.append(f"-- Review and apply DDL changes manually")
            
            return {
                "success": True,
                "mode": "dry_run",
                "message": "Dry run completed - no changes applied",
                "branch_database": request.branch_database,
                "target_database": request.target_database,
                "merge_script": '\n'.join(merge_script),
                "changes_count": len(diff['tables_only_in_branch']) + len(diff['schema_differences']),
                "next_step": "Set dry_run=false to apply changes"
            }
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        diff = BranchManager.get_schema_diff(
            conn,
            request.target_database,
            request.branch_database
        )
        
        applied_changes = []
        
        for table in diff['tables_only_in_branch']:
            cursor.execute(f"SHOW CREATE TABLE {request.branch_database}.{table}")
            create_table_result = cursor.fetchone()
            create_table_ddl = create_table_result[1]
            
            cursor.execute(f"USE {request.target_database}")
            cursor.execute(create_table_ddl)
            
            applied_changes.append(f"Created table: {table}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "mode": "live",
            "message": "Branch merged successfully",
            "branch_database": request.branch_database,
            "target_database": request.target_database,
            "applied_changes": applied_changes,
            "changes_count": len(applied_changes),
            "recommendations": [
                "Verify changes in production",
                "Monitor query performance",
                "Consider deleting branch to save storage"
            ]
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to merge branch: {str(e)}"
        }


@router.delete("/{branch_database}")
async def delete_branch(branch_database: str):
    """
    Supprime une branche de base de données
    """
    try:
        if '_branch_' not in branch_database:
            return {
                "success": False,
                "message": "Invalid branch database name. Must contain '_branch_'"
            }
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(f"DROP DATABASE IF EXISTS {branch_database}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": f"Branch '{branch_database}' deleted successfully",
            "branch_database": branch_database
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to delete branch: {str(e)}"
        }
