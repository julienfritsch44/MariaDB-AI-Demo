"""
Mock Data Generator for Demo Mode
Provides realistic responses for all advanced features
"""

from typing import Dict, List, Any
from datetime import datetime, timedelta
import random


class MockDataGenerator:
    """Generates realistic mock data for demo purposes"""
    
    @staticmethod
    def get_plan_stability_baseline() -> Dict[str, Any]:
        """Mock data for Plan Stability Baseline"""
        return {
            "fingerprint": "a1b2c3d4e5f6g7h8",
            "query_pattern": "SELECT * FROM orders WHERE customer_id = ?",
            "best_plan": {
                "query_block": {
                    "select_id": 1,
                    "table": {
                        "table_name": "orders",
                        "access_type": "ref",
                        "possible_keys": ["idx_customer_id"],
                        "key": "idx_customer_id",
                        "used_key_parts": ["customer_id"],
                        "key_length": "4",
                        "rows_examined_per_scan": 5,
                        "filtered": 100.0,
                        "cost_info": {
                            "read_cost": 8.5,
                            "eval_cost": 1.0,
                            "prefix_cost": 12.5,
                            "data_read_per_join": "2K"
                        }
                    }
                }
            },
            "best_execution_time_ms": 45,
            "best_cost": 12.5,
            "created_at": datetime.now().isoformat(),
            "last_validated": datetime.now().isoformat()
        }
    
    @staticmethod
    def get_plan_flip_detected() -> Dict[str, Any]:
        """Mock data for Plan Flip Detection"""
        return {
            "flip_detected": True,
            "severity": "CRITICAL",
            "baseline_plan": {
                "execution_time_ms": 45,
                "cost": 12.5,
                "access_type": "ref",
                "key_used": "idx_customer_id",
                "rows_examined": 5
            },
            "current_plan": {
                "execution_time_ms": 28000,
                "cost": 450000,
                "access_type": "ALL",
                "key_used": None,
                "rows_examined": 1200000
            },
            "degradation_factor": 622.2,
            "suggested_hints": [
                "USE INDEX(idx_customer_id)",
                "FORCE INDEX(idx_customer_id)"
            ],
            "suggested_query": "SELECT * FROM orders USE INDEX(idx_customer_id) WHERE customer_id = ?"
        }
    
    @staticmethod
    def get_schema_drift_report() -> Dict[str, Any]:
        """Mock data for Schema Drift Detection"""
        return {
            "drift_detected": True,
            "severity": "HIGH",
            "total_issues": 7,
            "issues": [
                {
                    "type": "missing_index",
                    "table": "orders",
                    "severity": "HIGH",
                    "description": "Index 'idx_status_created' exists in Git but missing in Production",
                    "fix_sql": "ALTER TABLE orders ADD INDEX idx_status_created(status, created_at);"
                },
                {
                    "type": "missing_index",
                    "table": "customers",
                    "severity": "MEDIUM",
                    "description": "Index 'idx_email' exists in Git but missing in Production",
                    "fix_sql": "ALTER TABLE customers ADD INDEX idx_email(email);"
                },
                {
                    "type": "extra_column",
                    "table": "orders",
                    "severity": "MEDIUM",
                    "description": "Column 'temp_flag' exists in Production but not in Git (hotfix?)",
                    "fix_sql": "-- Manual review required: ALTER TABLE orders DROP COLUMN temp_flag;"
                },
                {
                    "type": "type_mismatch",
                    "table": "products",
                    "severity": "HIGH",
                    "description": "Column 'price': Git=DECIMAL(10,2), Production=DECIMAL(8,2)",
                    "fix_sql": "ALTER TABLE products MODIFY COLUMN price DECIMAL(10,2);"
                },
                {
                    "type": "missing_index",
                    "table": "order_items",
                    "severity": "LOW",
                    "description": "Index 'idx_product_id' exists in Git but missing in Production",
                    "fix_sql": "ALTER TABLE order_items ADD INDEX idx_product_id(product_id);"
                },
                {
                    "type": "charset_mismatch",
                    "table": "customers",
                    "severity": "LOW",
                    "description": "Table charset: Git=utf8mb4, Production=utf8",
                    "fix_sql": "ALTER TABLE customers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                },
                {
                    "type": "constraint_missing",
                    "table": "orders",
                    "severity": "MEDIUM",
                    "description": "Foreign key 'fk_customer_id' exists in Git but missing in Production",
                    "fix_sql": "ALTER TABLE orders ADD CONSTRAINT fk_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);"
                }
            ],
            "summary": {
                "missing_indexes": 3,
                "extra_columns": 1,
                "type_mismatches": 1,
                "charset_mismatches": 1,
                "constraint_issues": 1
            },
            "estimated_fix_time": "15 minutes",
            "rollback_safe": True
        }
    
    @staticmethod
    def get_archiving_candidates() -> Dict[str, Any]:
        """Mock data for Intelligent Archiving"""
        return {
            "total_candidates": 5,
            "total_size_gb": 420,
            "estimated_savings_monthly": 1260,
            "candidates": [
                {
                    "table": "orders_2022",
                    "size_gb": 180,
                    "last_access_days": 127,
                    "access_frequency_30d": 3,
                    "archive_probability": 0.94,
                    "estimated_savings_monthly": 540,
                    "recommendation": "ARCHIVE",
                    "priority": "HIGH"
                },
                {
                    "table": "logs_2023_q1",
                    "size_gb": 95,
                    "last_access_days": 89,
                    "access_frequency_30d": 8,
                    "archive_probability": 0.87,
                    "estimated_savings_monthly": 285,
                    "recommendation": "ARCHIVE",
                    "priority": "MEDIUM"
                },
                {
                    "table": "audit_trail_2022",
                    "size_gb": 67,
                    "last_access_days": 156,
                    "access_frequency_30d": 1,
                    "archive_probability": 0.96,
                    "estimated_savings_monthly": 201,
                    "recommendation": "ARCHIVE",
                    "priority": "HIGH"
                },
                {
                    "table": "sessions_old",
                    "size_gb": 45,
                    "last_access_days": 203,
                    "access_frequency_30d": 0,
                    "archive_probability": 0.99,
                    "estimated_savings_monthly": 135,
                    "recommendation": "ARCHIVE",
                    "priority": "HIGH"
                },
                {
                    "table": "temp_analytics_2023",
                    "size_gb": 33,
                    "last_access_days": 78,
                    "access_frequency_30d": 12,
                    "archive_probability": 0.73,
                    "estimated_savings_monthly": 99,
                    "recommendation": "MONITOR",
                    "priority": "LOW"
                }
            ],
            "roi_analysis": {
                "current_monthly_cost": 2100,
                "projected_monthly_cost": 840,
                "monthly_savings": 1260,
                "annual_savings": 15120,
                "reduction_percentage": 60
            }
        }
    
    @staticmethod
    def get_data_masking_analysis() -> Dict[str, Any]:
        """Mock data for Dynamic Data Masking"""
        return {
            "pii_columns_detected": 8,
            "tables_analyzed": 12,
            "compliance_status": "NON_COMPLIANT",
            "columns": [
                {
                    "table": "customers",
                    "column": "email",
                    "pii_type": "EMAIL",
                    "confidence": 0.99,
                    "sample_masked": "j***@e***.com",
                    "masking_strategy": "partial",
                    "gdpr_compliant": True
                },
                {
                    "table": "customers",
                    "column": "phone",
                    "pii_type": "PHONE",
                    "confidence": 0.97,
                    "sample_masked": "***-***-1234",
                    "masking_strategy": "partial",
                    "gdpr_compliant": True
                },
                {
                    "table": "customers",
                    "column": "address",
                    "pii_type": "ADDRESS",
                    "confidence": 0.89,
                    "sample_masked": "*** *** Street, City",
                    "masking_strategy": "partial",
                    "gdpr_compliant": True
                },
                {
                    "table": "payments",
                    "column": "credit_card",
                    "pii_type": "CREDIT_CARD",
                    "confidence": 1.0,
                    "sample_masked": "****-****-****-9010",
                    "masking_strategy": "partial",
                    "gdpr_compliant": True
                },
                {
                    "table": "payments",
                    "column": "cvv",
                    "pii_type": "CVV",
                    "confidence": 1.0,
                    "sample_masked": "***",
                    "masking_strategy": "full",
                    "gdpr_compliant": True
                },
                {
                    "table": "employees",
                    "column": "ssn",
                    "pii_type": "SSN",
                    "confidence": 0.98,
                    "sample_masked": "***-**-1234",
                    "masking_strategy": "partial",
                    "gdpr_compliant": True
                },
                {
                    "table": "customers",
                    "column": "date_of_birth",
                    "pii_type": "DOB",
                    "confidence": 0.92,
                    "sample_masked": "****-**-15",
                    "masking_strategy": "partial",
                    "gdpr_compliant": True
                },
                {
                    "table": "customers",
                    "column": "ip_address",
                    "pii_type": "IP_ADDRESS",
                    "confidence": 0.95,
                    "sample_masked": "192.168.***.***",
                    "masking_strategy": "partial",
                    "gdpr_compliant": True
                }
            ],
            "recommendations": [
                "Enable proxy-level masking for all DBA access",
                "Configure role-based masking rules",
                "Enable audit trail for PII access",
                "Review and update masking policies quarterly"
            ],
            "estimated_overhead_ms": 3.2
        }
    
    @staticmethod
    def get_database_branches() -> List[Dict[str, Any]]:
        """Mock data for Database Branching"""
        return [
            {
                "branch_id": "br_migration_001",
                "branch_name": "add_composite_index",
                "source_database": "shop_demo",
                "status": "ACTIVE",
                "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
                "size_gb": 0.8,
                "changes": [
                    "ALTER TABLE orders ADD INDEX idx_customer_status(customer_id, status)"
                ],
                "test_results": {
                    "performance_gain": "+42%",
                    "queries_tested": 1247,
                    "errors": 0
                }
            },
            {
                "branch_id": "br_schema_update_002",
                "branch_name": "add_audit_columns",
                "source_database": "shop_demo",
                "status": "TESTING",
                "created_at": (datetime.now() - timedelta(hours=5)).isoformat(),
                "size_gb": 1.2,
                "changes": [
                    "ALTER TABLE customers ADD COLUMN last_modified_at TIMESTAMP",
                    "ALTER TABLE orders ADD COLUMN last_modified_by VARCHAR(100)"
                ],
                "test_results": {
                    "performance_gain": "0%",
                    "queries_tested": 523,
                    "errors": 0
                }
            }
        ]
    
    @staticmethod
    def get_safe_transaction_status() -> Dict[str, Any]:
        """Mock data for Safe Transaction Mode"""
        return {
            "mode": "strict",
            "enabled": True,
            "scope": "global",
            "statistics": {
                "total_validations": 15847,
                "blocked_queries": 23,
                "warnings_issued": 156,
                "autocommit_violations": 23,
                "last_violation": (datetime.now() - timedelta(minutes=15)).isoformat(),
                "prevention_rate": 1.0
            },
            "recent_violations": [
                {
                    "timestamp": (datetime.now() - timedelta(minutes=15)).isoformat(),
                    "query": "UPDATE orders SET status = 'shipped' WHERE id = 123",
                    "user": "dev_user_42",
                    "action": "BLOCKED",
                    "suggested_fix": "BEGIN; UPDATE orders SET status = 'shipped' WHERE id = 123; COMMIT;"
                },
                {
                    "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                    "query": "DELETE FROM temp_cache WHERE created_at < NOW() - INTERVAL 1 DAY",
                    "user": "dev_user_17",
                    "action": "BLOCKED",
                    "suggested_fix": "BEGIN; DELETE FROM temp_cache WHERE created_at < NOW() - INTERVAL 1 DAY; COMMIT;"
                }
            ],
            "impact": {
                "corruptions_prevented": 23,
                "estimated_downtime_avoided_hours": 4.6,
                "estimated_cost_savings": 18400
            }
        }
    
    @staticmethod
    def get_blast_radius_analysis(sql: str) -> Dict[str, Any]:
        """Mock data for Blast Radius Analyzer"""
        return {
            "query": sql,
            "blast_radius_score": 75,
            "severity": "HIGH",
            "directly_affected": {
                "tables": ["orders"],
                "services": ["orders_service"],
                "users": 10000
            },
            "cascade_impact": {
                "level_1": {
                    "services": ["notification_service", "payment_service"],
                    "users": 8000
                },
                "level_2": {
                    "services": ["billing_api", "analytics_service"],
                    "users": 2000
                }
            },
            "total_users_affected": 20000,
            "cascade_depth": 2,
            "lock_analysis": {
                "estimated_lock_duration_ms": 1500,
                "lock_type": "WRITE",
                "blocking_potential": "HIGH"
            },
            "recommendations": [
                "Execute during low-traffic hours (2-4 AM UTC)",
                "Enable maintenance mode for orders_service",
                "Notify affected teams 24h in advance",
                "Prepare rollback script",
                "Monitor cascade services during execution"
            ],
            "safe_execution_windows": [
                {"start": "02:00", "end": "04:00", "timezone": "UTC", "estimated_impact": "MINIMAL"},
                {"start": "14:00", "end": "16:00", "timezone": "UTC", "estimated_impact": "LOW"}
            ]
        }
    
    @staticmethod
    def get_vector_optimizer_results() -> Dict[str, Any]:
        """Mock data for Adaptive Vector Optimizer"""
        return {
            "optimization_applied": True,
            "initial_params": {
                "threshold": 0.7,
                "limit": 10
            },
            "optimized_params": {
                "threshold": 0.85,
                "limit": 15
            },
            "performance_metrics": {
                "search_time_ms": 45,
                "results_returned": 12,
                "fill_rate": 0.8,
                "avg_distance": 0.23,
                "distribution_quality": 0.87,
                "parameter_efficiency": 0.92
            },
            "performance_gain": "+35%",
            "recommendations": [
                "Consider increasing vector dimensions to 768 for better accuracy",
                "Current index is well-optimized for this query pattern",
                "Cache these parameters for similar queries"
            ],
            "cache_stats": {
                "hit_rate": 0.67,
                "total_searches": 1547,
                "cache_hits": 1036
            }
        }
    
    @staticmethod
    def get_query_history() -> List[Dict[str, Any]]:
        """Mock data for Query History"""
        base_time = datetime.now()
        queries = []
        
        risk_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        sql_samples = [
            "SELECT * FROM orders WHERE customer_id IN (1,2,3,4,5)",
            "UPDATE customers SET last_login = NOW() WHERE id = 42",
            "DELETE FROM temp_cache WHERE created_at < NOW() - INTERVAL 1 DAY",
            "SELECT o.*, c.name FROM orders o JOIN customers c ON o.customer_id = c.id",
            "INSERT INTO logs (message, level) VALUES ('Test', 'INFO')"
        ]
        
        for i in range(20):
            queries.append({
                "id": f"query_{i+1}",
                "sql": random.choice(sql_samples),
                "risk_level": random.choice(risk_levels),
                "risk_score": random.randint(20, 95),
                "cost_estimate": random.randint(10, 500),
                "execution_time_ms": random.randint(5, 2000),
                "timestamp": (base_time - timedelta(hours=i)).isoformat(),
                "optimized": random.choice([True, False])
            })
        
        return queries
    
    @staticmethod
    def get_executive_summary() -> Dict[str, Any]:
        """Mock data for Executive Dashboard"""
        return {
            "period": "last_30_days",
            "financial": {
                "monthly_savings": 15583,
                "annual_projection": 187000,
                "cost_reduction_percentage": 42,
                "top_savings_source": "Intelligent Archiving"
            },
            "incidents": {
                "total_prevented": 47,
                "critical_prevented": 12,
                "medium_prevented": 23,
                "low_prevented": 12,
                "estimated_downtime_avoided_hours": 18.5,
                "prevention_rate": 0.94
            },
            "optimizations": {
                "queries_analyzed": 15847,
                "queries_optimized": 1247,
                "avg_performance_gain": "+67%",
                "indexes_suggested": 23,
                "indexes_applied": 18
            },
            "compliance": {
                "gdpr_compliant": True,
                "pii_columns_masked": 8,
                "audit_trail_complete": True,
                "last_audit": (datetime.now() - timedelta(days=7)).isoformat()
            },
            "trends": [
                {"date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"), 
                 "risk_score_avg": random.randint(30, 70),
                 "queries_analyzed": random.randint(400, 600),
                 "incidents_prevented": random.randint(0, 3)}
                for i in range(30, 0, -1)
            ]
        }
