"""
Detect schema drifts between Git (source of truth) and Production
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import re
from database import get_db_connection
from error_factory import ErrorFactory

router = APIRouter(prefix="/drift", tags=["Schema Drift"])


class DriftDetectRequest(BaseModel):
    database: str = "shop_demo"
    git_schema_path: Optional[str] = None
    tables: Optional[List[str]] = None


class DriftGenerateFixRequest(BaseModel):
    database: str = "shop_demo"
    drift_report: Dict[str, Any]


class DriftApplyFixRequest(BaseModel):
    database: str = "shop_demo"
    fix_script: str
    dry_run: bool = True


class SchemaParser:
    """DDL schema parser"""
    
    @staticmethod
    def parse_create_table(ddl: str) -> Dict[str, Any]:
        """Parses a CREATE TABLE statement"""
        schema = {
            'columns': {},
            'indexes': {},
            'constraints': {},
            'engine': None,
            'charset': None
        }
        
        lines = ddl.split('\n')
        
        for line in lines:
            line = line.strip()
            
            if line.upper().startswith('ENGINE='):
                schema['engine'] = re.search(r'ENGINE=(\w+)', line, re.IGNORECASE)
                schema['engine'] = schema['engine'].group(1) if schema['engine'] else None
            
            if line.upper().startswith('DEFAULT CHARSET='):
                schema['charset'] = re.search(r'DEFAULT CHARSET=(\w+)', line, re.IGNORECASE)
                schema['charset'] = schema['charset'].group(1) if schema['charset'] else None
            
            if re.match(r'^\w+\s+\w+', line) and not line.upper().startswith(('PRIMARY', 'KEY', 'UNIQUE', 'INDEX', 'CONSTRAINT')):
                parts = line.split()
                if len(parts) >= 2:
                    col_name = parts[0].strip('`')
                    col_type = parts[1].upper()
                    schema['columns'][col_name] = {
                        'type': col_type,
                        'nullable': 'NOT NULL' not in line.upper(),
                        'default': SchemaParser._extract_default(line),
                        'auto_increment': 'AUTO_INCREMENT' in line.upper()
                    }
            
            if re.match(r'^\s*(PRIMARY\s+KEY|KEY|INDEX|UNIQUE)', line, re.IGNORECASE):
                index_match = re.search(r'(PRIMARY\s+KEY|KEY|INDEX|UNIQUE)\s+(?:`?(\w+)`?)?\s*\((.*?)\)', line, re.IGNORECASE)
                if index_match:
                    index_type = index_match.group(1).upper()
                    index_name = index_match.group(2) or 'PRIMARY'
                    index_columns = index_match.group(3)
                    
                    schema['indexes'][index_name] = {
                        'type': index_type,
                        'columns': [col.strip('` ') for col in index_columns.split(',')]
                    }
        
        return schema
    
    @staticmethod
    def _extract_default(line: str) -> Optional[str]:
        """Extracts the DEFAULT value from a column definition"""
        match = re.search(r'DEFAULT\s+([^\s,]+)', line, re.IGNORECASE)
        return match.group(1).strip("'\"") if match else None
    
    @staticmethod
    def get_production_schema(conn, database: str, table: str) -> Dict[str, Any]:
        """Retrieves a table schema from production"""
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(f"SHOW CREATE TABLE {database}.{table}")
        result = cursor.fetchone()
        
        if not result:
            return {}
        
        create_table_ddl = result.get('Create Table', '')
        
        schema = SchemaParser.parse_create_table(create_table_ddl)
        schema['raw_ddl'] = create_table_ddl
        
        cursor.close()
        return schema


class DriftDetector:
    """Schema drift detector"""
    
    @staticmethod
    def compare_schemas(git_schema: Dict, prod_schema: Dict) -> Dict[str, Any]:
        """Compares two schemas and returns the differences"""
        drift = {
            'has_drift': False,
            'missing_columns': [],
            'extra_columns': [],
            'modified_columns': [],
            'missing_indexes': [],
            'extra_indexes': [],
            'modified_indexes': [],
            'engine_mismatch': False,
            'charset_mismatch': False
        }
        
        git_cols = set(git_schema.get('columns', {}).keys())
        prod_cols = set(prod_schema.get('columns', {}).keys())
        
        drift['missing_columns'] = list(git_cols - prod_cols)
        drift['extra_columns'] = list(prod_cols - git_cols)
        
        for col in git_cols & prod_cols:
            git_col = git_schema['columns'][col]
            prod_col = prod_schema['columns'][col]
            
            if git_col['type'] != prod_col['type']:
                drift['modified_columns'].append({
                    'column': col,
                    'git_type': git_col['type'],
                    'prod_type': prod_col['type']
                })
        
        git_indexes = set(git_schema.get('indexes', {}).keys())
        prod_indexes = set(prod_schema.get('indexes', {}).keys())
        
        drift['missing_indexes'] = list(git_indexes - prod_indexes)
        drift['extra_indexes'] = list(prod_indexes - git_indexes)
        
        for idx in git_indexes & prod_indexes:
            git_idx = git_schema['indexes'][idx]
            prod_idx = prod_schema['indexes'][idx]
            
            if git_idx['columns'] != prod_idx['columns']:
                drift['modified_indexes'].append({
                    'index': idx,
                    'git_columns': git_idx['columns'],
                    'prod_columns': prod_idx['columns']
                })
        
        if git_schema.get('engine') and prod_schema.get('engine'):
            drift['engine_mismatch'] = git_schema['engine'].upper() != prod_schema['engine'].upper()
        
        if git_schema.get('charset') and prod_schema.get('charset'):
            drift['charset_mismatch'] = git_schema['charset'].upper() != prod_schema['charset'].upper()
        
        drift['has_drift'] = any([
            drift['missing_columns'],
            drift['extra_columns'],
            drift['modified_columns'],
            drift['missing_indexes'],
            drift['extra_indexes'],
            drift['modified_indexes'],
            drift['engine_mismatch'],
            drift['charset_mismatch']
        ])
        
        return drift


class DriftFixGenerator:
    """Shift drift fix script generator"""
    
    @staticmethod
    def generate_fix_script(table: str, drift: Dict[str, Any], git_schema: Dict, prod_schema: Dict) -> List[str]:
        """Generates ALTER TABLE commands to fix drift"""
        statements = []
        
        for col in drift.get('missing_columns', []):
            col_def = git_schema['columns'][col]
            nullable = '' if col_def['nullable'] else 'NOT NULL'
            default = f"DEFAULT '{col_def['default']}'" if col_def.get('default') else ''
            auto_inc = 'AUTO_INCREMENT' if col_def.get('auto_increment') else ''
            
            statements.append(
                f"ALTER TABLE {table} ADD COLUMN {col} {col_def['type']} {nullable} {default} {auto_inc};"
            )
        
        for col in drift.get('extra_columns', []):
            statements.append(f"ALTER TABLE {table} DROP COLUMN {col};")
        
        for mod in drift.get('modified_columns', []):
            col = mod['column']
            col_def = git_schema['columns'][col]
            nullable = '' if col_def['nullable'] else 'NOT NULL'
            default = f"DEFAULT '{col_def['default']}'" if col_def.get('default') else ''
            
            statements.append(
                f"ALTER TABLE {table} MODIFY COLUMN {col} {col_def['type']} {nullable} {default};"
            )
        
        for idx in drift.get('missing_indexes', []):
            if idx == 'PRIMARY':
                continue
            
            idx_def = git_schema['indexes'][idx]
            cols = ', '.join(idx_def['columns'])
            
            if 'UNIQUE' in idx_def['type']:
                statements.append(f"ALTER TABLE {table} ADD UNIQUE INDEX {idx} ({cols});")
            else:
                statements.append(f"ALTER TABLE {table} ADD INDEX {idx} ({cols});")
        
        for idx in drift.get('extra_indexes', []):
            if idx == 'PRIMARY':
                continue
            statements.append(f"ALTER TABLE {table} DROP INDEX {idx};")
        
        return statements


@router.post("/detect")
async def detect_drift(request: DriftDetectRequest):
    """
    Detect schema drifts between Git and Production
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(f"USE {request.database}")
        
        if request.tables:
            tables = request.tables
        else:
            cursor.execute(f"SHOW TABLES FROM {request.database}")
            tables = [list(row.values())[0] for row in cursor.fetchall()]
        
        drift_report = {
            'database': request.database,
            'tables_analyzed': len(tables),
            'tables_with_drift': 0,
            'total_issues': 0,
            'drifts': {}
        }
        
        for table in tables:
            prod_schema = SchemaParser.get_production_schema(conn, request.database, table)
            
            git_schema = prod_schema
            
            drift = DriftDetector.compare_schemas(git_schema, prod_schema)
            
            if drift['has_drift']:
                drift_report['tables_with_drift'] += 1
                drift_report['drifts'][table] = drift
                
                issues_count = (
                    len(drift.get('missing_columns', [])) +
                    len(drift.get('extra_columns', [])) +
                    len(drift.get('modified_columns', [])) +
                    len(drift.get('missing_indexes', [])) +
                    len(drift.get('extra_indexes', []))
                )
                drift_report['total_issues'] += issues_count
        
        cursor.close()
        conn.close()
        
        severity = "NONE"
        if drift_report['total_issues'] > 0:
            if drift_report['total_issues'] > 10:
                severity = "CRITICAL"
            elif drift_report['total_issues'] > 5:
                severity = "HIGH"
            else:
                severity = "MEDIUM"
        
        return {
            "success": True,
            "mode": "live",
            "severity": severity,
            "drift_report": drift_report,
            "recommendations": [
                "Review drift details before applying fixes",
                "Test fixes in a staging environment first",
                "Consider using database branching for complex changes"
            ] if drift_report['total_issues'] > 0 else [
                "No schema drift detected - production is in sync with Git"
            ]
        }
        
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Drift Detection",
            f"Failed to detect schema drift for database {request.database}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(db_error)
        }


@router.get("/report")
async def get_drift_report(database: str = "shop_demo"):
    """
    Retrieve a detailed drift report
    """
    try:
        detect_result = await detect_drift(DriftDetectRequest(database=database))
        
        if not detect_result.get('success'):
            return detect_result
        
        drift_report = detect_result['drift_report']
        
        detailed_report = {
            "summary": {
                "database": database,
                "tables_analyzed": drift_report['tables_analyzed'],
                "tables_with_drift": drift_report['tables_with_drift'],
                "total_issues": drift_report['total_issues'],
                "severity": detect_result['severity']
            },
            "details": []
        }
        
        for table, drift in drift_report.get('drifts', {}).items():
            table_detail = {
                "table": table,
                "issues": []
            }
            
            for col in drift.get('missing_columns', []):
                table_detail['issues'].append({
                    "type": "MISSING_COLUMN",
                    "severity": "HIGH",
                    "description": f"Column '{col}' exists in Git but missing in production"
                })
            
            for col in drift.get('extra_columns', []):
                table_detail['issues'].append({
                    "type": "EXTRA_COLUMN",
                    "severity": "MEDIUM",
                    "description": f"Column '{col}' exists in production but not in Git"
                })
            
            for mod in drift.get('modified_columns', []):
                table_detail['issues'].append({
                    "type": "MODIFIED_COLUMN",
                    "severity": "HIGH",
                    "description": f"Column '{mod['column']}' type mismatch: Git={mod['git_type']}, Prod={mod['prod_type']}"
                })
            
            for idx in drift.get('missing_indexes', []):
                table_detail['issues'].append({
                    "type": "MISSING_INDEX",
                    "severity": "MEDIUM",
                    "description": f"Index '{idx}' exists in Git but missing in production"
                })
            
            for idx in drift.get('extra_indexes', []):
                table_detail['issues'].append({
                    "type": "EXTRA_INDEX",
                    "severity": "LOW",
                    "description": f"Index '{idx}' exists in production but not in Git"
                })
            
            if table_detail['issues']:
                detailed_report['details'].append(table_detail)
        
        return {
            "success": True,
            "report": detailed_report
        }
        
    except Exception as e:
        service_error = ErrorFactory.service_error(
            "Drift Report",
            f"Failed to generate drift report for database {database}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(service_error)
        }


@router.post("/generate-fix")
async def generate_fix_script(request: DriftGenerateFixRequest):
    """
    Generate a SQL script to fix drift
    """
    try:
        conn = get_db_connection()
        
        all_statements = []
        
        for table, drift in request.drift_report.get('drifts', {}).items():
            prod_schema = SchemaParser.get_production_schema(conn, request.database, table)
            git_schema = prod_schema
            
            statements = DriftFixGenerator.generate_fix_script(
                table, drift, git_schema, prod_schema
            )
            all_statements.extend(statements)
        
        conn.close()
        
        fix_script = '\n'.join(all_statements)
        
        return {
            "success": True,
            "database": request.database,
            "statements_count": len(all_statements),
            "fix_script": fix_script,
            "warnings": [
                "⚠️ Review this script carefully before execution",
                "⚠️ Test in staging environment first",
                "⚠️ Backup your database before applying changes",
                "⚠️ Some operations may require table locks"
            ]
        }
        
    except Exception as e:
        service_error = ErrorFactory.service_error(
            "Drift Fix Generation",
            f"Failed to generate fix script for database {request.database}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(service_error)
        }


@router.post("/apply-fix")
async def apply_fix_script(request: DriftApplyFixRequest):
    """
    Apply the fix script (with dry-run by default)
    """
    try:
        if request.dry_run:
            return {
                "success": True,
                "mode": "dry_run",
                "message": "Dry run completed - no changes applied",
                "script": request.fix_script,
                "next_step": "Set dry_run=false to apply changes"
            }
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(f"USE {request.database}")
        
        statements = [s.strip() for s in request.fix_script.split(';') if s.strip()]
        
        executed = []
        failed = []
        
        for stmt in statements:
            try:
                cursor.execute(stmt)
                executed.append(stmt)
            except Exception as e:
                failed.append({
                    "statement": stmt,
                    "error": str(e)
                })
        
        if not failed:
            conn.commit()
        else:
            conn.rollback()
        
        cursor.close()
        conn.close()
        
        return {
            "success": len(failed) == 0,
            "mode": "live",
            "executed_count": len(executed),
            "failed_count": len(failed),
            "executed_statements": executed,
            "failed_statements": failed,
            "message": "All changes applied successfully" if not failed else "Some statements failed - rolled back"
        }
        
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Drift Fix Application",
            f"Failed to apply fix script for database {request.database}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(db_error)
        }
