"""
Intelligent Archiving Router
Archivage prédictif basé sur ML pour optimiser les coûts de stockage
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from database import get_db_connection
from mock_data import MockDataGenerator

router = APIRouter(prefix="/archiving", tags=["Intelligent Archiving"])


class ArchivingAnalyzeRequest(BaseModel):
    database: str = "shop_demo"
    tables: Optional[List[str]] = None
    min_size_gb: float = 1.0
    min_age_days: int = 90


class ArchivingSimulateRequest(BaseModel):
    database: str = "shop_demo"
    table: str
    archive_strategy: str = "s3"
    retention_days: int = 90


class ArchivingExecuteRequest(BaseModel):
    database: str = "shop_demo"
    table: str
    archive_strategy: str = "s3"
    retention_days: int = 90
    dry_run: bool = True


class StorageCostCalculator:
    """Calculateur de coûts de stockage"""
    
    PRICING = {
        'mariadb_skysql_ssd': {
            'cost_per_gb_month': 0.25,
            'iops_cost_per_1k': 0.10
        },
        's3_standard': {
            'cost_per_gb_month': 0.023,
            'retrieval_cost_per_gb': 0.0004
        },
        's3_glacier': {
            'cost_per_gb_month': 0.004,
            'retrieval_cost_per_gb': 0.01
        },
        'aria_s3': {
            'cost_per_gb_month': 0.020,
            'retrieval_cost_per_gb': 0.0
        }
    }
    
    @classmethod
    def calculate_monthly_cost(cls, size_gb: float, storage_type: str) -> float:
        """Calcule le coût mensuel de stockage"""
        pricing = cls.PRICING.get(storage_type, cls.PRICING['mariadb_skysql_ssd'])
        return size_gb * pricing['cost_per_gb_month']
    
    @classmethod
    def calculate_savings(cls, size_gb: float, from_storage: str, to_storage: str) -> Dict[str, float]:
        """Calcule les économies potentielles"""
        current_cost = cls.calculate_monthly_cost(size_gb, from_storage)
        archive_cost = cls.calculate_monthly_cost(size_gb, to_storage)
        
        monthly_savings = current_cost - archive_cost
        annual_savings = monthly_savings * 12
        
        return {
            'current_monthly_cost': round(current_cost, 2),
            'archive_monthly_cost': round(archive_cost, 2),
            'monthly_savings': round(monthly_savings, 2),
            'annual_savings': round(annual_savings, 2),
            'savings_percentage': round((monthly_savings / current_cost * 100) if current_cost > 0 else 0, 1)
        }


class AccessPatternAnalyzer:
    """Analyseur de patterns d'accès"""
    
    @staticmethod
    def analyze_table_access(conn, database: str, table: str, days: int = 30) -> Dict[str, Any]:
        """Analyse les patterns d'accès d'une table"""
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute(f"""
                SELECT 
                    COUNT_READ,
                    COUNT_WRITE,
                    SUM_TIMER_READ / 1000000000 as total_read_time_sec,
                    SUM_TIMER_WRITE / 1000000000 as total_write_time_sec
                FROM performance_schema.table_io_waits_summary_by_table
                WHERE OBJECT_SCHEMA = %s AND OBJECT_NAME = %s
            """, (database, table))
            
            stats = cursor.fetchone()
            
            if not stats:
                return {
                    'read_count': 0,
                    'write_count': 0,
                    'total_read_time_sec': 0,
                    'total_write_time_sec': 0,
                    'access_frequency': 'unknown',
                    'last_access_estimate': None
                }
            
            read_count = stats.get('COUNT_READ', 0) or 0
            write_count = stats.get('COUNT_WRITE', 0) or 0
            
            total_access = read_count + write_count
            
            if total_access == 0:
                access_frequency = 'never'
            elif total_access < 10:
                access_frequency = 'rare'
            elif total_access < 100:
                access_frequency = 'low'
            elif total_access < 1000:
                access_frequency = 'medium'
            else:
                access_frequency = 'high'
            
            return {
                'read_count': read_count,
                'write_count': write_count,
                'total_read_time_sec': round(stats.get('total_read_time_sec', 0) or 0, 2),
                'total_write_time_sec': round(stats.get('total_write_time_sec', 0) or 0, 2),
                'access_frequency': access_frequency,
                'total_access': total_access
            }
            
        except Exception as e:
            return {
                'read_count': 0,
                'write_count': 0,
                'total_read_time_sec': 0,
                'total_write_time_sec': 0,
                'access_frequency': 'unknown',
                'error': str(e)
            }
        finally:
            cursor.close()


class ArchivingPredictor:
    """Prédicteur ML pour l'archivage (version simplifiée sans scikit-learn)"""
    
    @staticmethod
    def predict_archiving_score(
        size_gb: float,
        access_frequency: str,
        age_days: int,
        growth_rate: float
    ) -> Dict[str, Any]:
        """
        Prédit le score d'archivage (0-100)
        Plus le score est élevé, plus la table est candidate à l'archivage
        """
        score = 0
        reasons = []
        
        if size_gb > 10:
            score += 30
            reasons.append(f"Large table size: {size_gb:.1f} GB")
        elif size_gb > 5:
            score += 20
            reasons.append(f"Moderate table size: {size_gb:.1f} GB")
        
        access_scores = {
            'never': 40,
            'rare': 30,
            'low': 20,
            'medium': 10,
            'high': 0,
            'unknown': 15
        }
        access_score = access_scores.get(access_frequency, 15)
        score += access_score
        
        if access_frequency in ['never', 'rare']:
            reasons.append(f"Very low access frequency: {access_frequency}")
        elif access_frequency == 'low':
            reasons.append(f"Low access frequency: {access_frequency}")
        
        if age_days > 365:
            score += 20
            reasons.append(f"Old data: {age_days} days")
        elif age_days > 180:
            score += 15
            reasons.append(f"Aging data: {age_days} days")
        elif age_days > 90:
            score += 10
            reasons.append(f"Moderate age: {age_days} days")
        
        if growth_rate < 0.01:
            score += 10
            reasons.append("Minimal growth rate")
        
        score = min(score, 100)
        
        if score >= 80:
            recommendation = "HIGHLY_RECOMMENDED"
            priority = "HIGH"
        elif score >= 60:
            recommendation = "RECOMMENDED"
            priority = "MEDIUM"
        elif score >= 40:
            recommendation = "CONSIDER"
            priority = "LOW"
        else:
            recommendation = "NOT_RECOMMENDED"
            priority = "NONE"
        
        return {
            'archiving_score': score,
            'recommendation': recommendation,
            'priority': priority,
            'reasons': reasons,
            'confidence': 0.85 if len(reasons) >= 3 else 0.70
        }


@router.post("/analyze")
async def analyze_archiving_candidates(request: ArchivingAnalyzeRequest):
    """
    Analyse les tables candidates à l'archivage
    """
    try:
        conn = get_db_connection()
        
        # Check if in mock mode
        if isinstance(conn, type(conn)) and conn.__class__.__name__ == 'MockConnection':
            mock_data = MockDataGenerator.get_archiving_candidates()
            return {
                "success": True,
                "message": "Archiving analysis complete (MOCK MODE)",
                **mock_data
            }
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(f"USE {request.database}")
        
        if request.tables:
            tables_clause = "AND TABLE_NAME IN (" + ','.join(['%s'] * len(request.tables)) + ")"
            cursor.execute(f"""
                SELECT 
                    TABLE_NAME,
                    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024 / 1024, 2) as size_gb,
                    TABLE_ROWS,
                    CREATE_TIME,
                    UPDATE_TIME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = %s {tables_clause}
                AND TABLE_TYPE = 'BASE TABLE'
                ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
            """, (request.database, *request.tables))
        else:
            cursor.execute(f"""
                SELECT 
                    TABLE_NAME,
                    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024 / 1024, 2) as size_gb,
                    TABLE_ROWS,
                    CREATE_TIME,
                    UPDATE_TIME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = %s
                AND TABLE_TYPE = 'BASE TABLE'
                AND (DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024 / 1024 >= %s
                ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
            """, (request.database, request.min_size_gb))
        
        tables = cursor.fetchall()
        
        candidates = []
        total_archivable_gb = 0
        total_potential_savings = 0
        
        for table_info in tables:
            table_name = table_info['TABLE_NAME']
            size_gb = float(table_info['size_gb'] or 0)
            
            if size_gb < request.min_size_gb:
                continue
            
            access_pattern = AccessPatternAnalyzer.analyze_table_access(
                conn, request.database, table_name
            )
            
            update_time = table_info.get('UPDATE_TIME')
            if update_time:
                age_days = (datetime.now() - update_time).days
            else:
                age_days = 0
            
            if age_days < request.min_age_days:
                continue
            
            prediction = ArchivingPredictor.predict_archiving_score(
                size_gb=size_gb,
                access_frequency=access_pattern['access_frequency'],
                age_days=age_days,
                growth_rate=0.01
            )
            
            if prediction['recommendation'] in ['HIGHLY_RECOMMENDED', 'RECOMMENDED']:
                savings = StorageCostCalculator.calculate_savings(
                    size_gb, 'mariadb_skysql_ssd', 's3_standard'
                )
                
                candidates.append({
                    'table': table_name,
                    'size_gb': size_gb,
                    'rows': table_info['TABLE_ROWS'],
                    'age_days': age_days,
                    'access_pattern': access_pattern,
                    'prediction': prediction,
                    'potential_savings': savings
                })
                
                total_archivable_gb += size_gb
                total_potential_savings += savings['monthly_savings']
        
        candidates.sort(key=lambda x: x['prediction']['archiving_score'], reverse=True)
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "mode": "live",
            "database": request.database,
            "summary": {
                "tables_analyzed": len(tables),
                "archiving_candidates": len(candidates),
                "total_archivable_gb": round(total_archivable_gb, 2),
                "total_monthly_savings": round(total_potential_savings, 2),
                "total_annual_savings": round(total_potential_savings * 12, 2)
            },
            "candidates": candidates[:10],
            "recommendations": [
                f"Archive {len(candidates)} tables to save ${total_potential_savings:.0f}/month",
                "Start with highest priority tables first",
                "Test archiving process in staging environment",
                "Monitor query performance after archiving"
            ] if candidates else [
                "No archiving candidates found matching criteria"
            ]
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to analyze archiving candidates: {str(e)}"
        }


@router.get("/candidates")
async def get_archiving_candidates(
    database: str = "shop_demo",
    limit: int = 10
):
    """
    Récupère la liste des tables candidates à l'archivage
    """
    try:
        result = await analyze_archiving_candidates(
            ArchivingAnalyzeRequest(database=database)
        )
        
        if not result.get('success'):
            return result
        
        return {
            "success": True,
            "candidates": result.get('candidates', [])[:limit],
            "summary": result.get('summary', {})
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to get archiving candidates: {str(e)}"
        }


@router.post("/simulate")
async def simulate_archiving(request: ArchivingSimulateRequest):
    """
    Simule l'archivage d'une table et calcule les économies
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(f"""
            SELECT 
                TABLE_NAME,
                ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024 / 1024, 2) as size_gb,
                TABLE_ROWS,
                UPDATE_TIME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
        """, (request.database, request.table))
        
        table_info = cursor.fetchone()
        
        if not table_info:
            cursor.close()
            conn.close()
            return {
                "success": False,
                "message": f"Table {request.table} not found"
            }
        
        size_gb = float(table_info['size_gb'] or 0)
        
        access_pattern = AccessPatternAnalyzer.analyze_table_access(
            conn, request.database, request.table
        )
        
        storage_mapping = {
            's3': 's3_standard',
            's3_glacier': 's3_glacier',
            'aria_s3': 'aria_s3'
        }
        archive_storage = storage_mapping.get(request.archive_strategy, 's3_standard')
        
        savings = StorageCostCalculator.calculate_savings(
            size_gb, 'mariadb_skysql_ssd', archive_storage
        )
        
        cursor.execute(f"""
            SELECT COUNT(*) as old_rows
            FROM {request.database}.{request.table}
            WHERE updated_at < DATE_SUB(NOW(), INTERVAL %s DAY)
        """, (request.retention_days,))
        
        old_rows_result = cursor.fetchone()
        old_rows = old_rows_result.get('old_rows', 0) if old_rows_result else 0
        
        archivable_percentage = (old_rows / table_info['TABLE_ROWS'] * 100) if table_info['TABLE_ROWS'] > 0 else 0
        archivable_size_gb = size_gb * (archivable_percentage / 100)
        
        adjusted_savings = StorageCostCalculator.calculate_savings(
            archivable_size_gb, 'mariadb_skysql_ssd', archive_storage
        )
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "mode": "simulation",
            "table": request.table,
            "current_state": {
                "size_gb": size_gb,
                "total_rows": table_info['TABLE_ROWS'],
                "storage_type": "mariadb_skysql_ssd",
                "monthly_cost": savings['current_monthly_cost']
            },
            "archiving_plan": {
                "strategy": request.archive_strategy,
                "retention_days": request.retention_days,
                "rows_to_archive": old_rows,
                "archivable_percentage": round(archivable_percentage, 1),
                "archivable_size_gb": round(archivable_size_gb, 2)
            },
            "projected_savings": adjusted_savings,
            "access_impact": {
                "hot_data_access": "No impact (remains in MariaDB)",
                "cold_data_access": "Slower (S3 retrieval: ~100-200ms overhead)",
                "query_transparency": "Unified view via FEDERATED ENGINE"
            },
            "recommendations": [
                "Create unified view combining hot and cold data",
                "Monitor query performance after archiving",
                "Set up automated archiving schedule",
                f"Estimated ROI: {adjusted_savings['annual_savings']:.0f}$/year"
            ]
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to simulate archiving: {str(e)}"
        }


@router.post("/execute")
async def execute_archiving(request: ArchivingExecuteRequest):
    """
    Exécute l'archivage d'une table (async)
    """
    try:
        if request.dry_run:
            return {
                "success": True,
                "mode": "dry_run",
                "message": "Dry run completed - no data archived",
                "table": request.table,
                "next_steps": [
                    "Review simulation results",
                    "Set dry_run=false to execute archiving",
                    "Ensure backup is completed before archiving"
                ]
            }
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        archive_table = f"{request.table}_archive"
        
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {request.database}.{archive_table}
            LIKE {request.database}.{request.table}
        """)
        
        cursor.execute(f"""
            INSERT INTO {request.database}.{archive_table}
            SELECT * FROM {request.database}.{request.table}
            WHERE updated_at < DATE_SUB(NOW(), INTERVAL %s DAY)
        """, (request.retention_days,))
        
        archived_rows = cursor.rowcount
        
        cursor.execute(f"""
            DELETE FROM {request.database}.{request.table}
            WHERE updated_at < DATE_SUB(NOW(), INTERVAL %s DAY)
        """, (request.retention_days,))
        
        deleted_rows = cursor.rowcount
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "mode": "live",
            "message": "Archiving completed successfully",
            "table": request.table,
            "archive_table": archive_table,
            "archived_rows": archived_rows,
            "deleted_rows": deleted_rows,
            "status": "COMPLETED",
            "next_steps": [
                f"Verify data in {archive_table}",
                "Create unified view for transparent access",
                "Monitor query performance",
                "Schedule periodic archiving"
            ]
        }
        
    except Exception as e:
        return {
            "success": False,
            "mode": "error",
            "message": f"Failed to execute archiving: {str(e)}"
        }
