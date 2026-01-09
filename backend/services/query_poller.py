import logging
import random
import time
from typing import Optional
from database import get_db_connection
from error_factory import ErrorFactory, DatabaseError

logger = logging.getLogger("query_poller")

class QueryPoller:
    """Service that polls the database with intentionally slow queries"""
    
    def __init__(self):
        self.is_running = False
        self.execution_count = 0
        self.error_count = 0
        self.last_execution_time: Optional[float] = None
        
        # Hybrid approach: Realistic SQL + Sequential SLEEP
        # Runs real query first, then sleeps to guarantee >10s total
        self.query_patterns = [
            {
                "name": "Customer Order Analysis (Hybrid)",
                "query": """
                    SELECT * FROM (
                        SELECT 
                            c.name as customer_name,
                            p.name as product_name,
                            p.category,
                            COUNT(DISTINCT o.id) as order_count,
                            SUM(oi.quantity) as total_quantity,
                            SUM(oi.quantity * oi.unit_price) as revenue
                        FROM shop_order_items oi
                        JOIN shop_orders o ON oi.order_id = o.id
                        JOIN shop_customers c ON o.customer_id = c.id
                        JOIN shop_products p ON oi.product_id = p.id
                        WHERE o.status IN ('delivered', 'shipped')
                        GROUP BY c.name, p.name, p.category
                        HAVING revenue > 100
                        ORDER BY revenue DESC
                        LIMIT 50
                    ) AS analysis
                    UNION ALL
                    SELECT 'DELAY', '', '', 0, 0, SLEEP(9)
                """,
                "duration_range": None
            },
            {
                "name": "Daily Revenue Aggregation (Hybrid)",
                "query": """
                    SELECT * FROM (
                        SELECT 
                            DATE(o.order_date) as day,
                            COUNT(*) as order_count,
                            SUM(o.total_amount) as daily_revenue
                        FROM shop_orders o
                        WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                        GROUP BY DATE(o.order_date)
                        ORDER BY day DESC
                        LIMIT 50
                    ) AS daily_stats
                    UNION ALL
                    SELECT SLEEP(9), 0, 0
                """,
                "duration_range": None
            },
            {
                "name": "Product Performance (Hybrid)",
                "query": """
                    SELECT * FROM (
                        SELECT 
                            p.category,
                            COUNT(DISTINCT oi.order_id) as times_ordered,
                            SUM(oi.quantity * oi.unit_price) as total_revenue
                        FROM shop_order_items oi
                        JOIN shop_products p ON oi.product_id = p.id
                        GROUP BY p.category
                        ORDER BY total_revenue DESC
                        LIMIT 20
                    ) AS product_stats
                    UNION ALL
                    SELECT 'DELAY', 0, SLEEP(9)
                """,
                "duration_range": None
            }
        ]
    
    def execute_slow_query(self):
        """Execute a single slow query from the pattern pool"""
        try:
            # Select random pattern
            pattern = random.choice(self.query_patterns)
            
            # Build query with random duration if applicable
            query = pattern["query"]
            if pattern["duration_range"]:
                duration = random.uniform(*pattern["duration_range"])
                query = query.format(duration=duration)
            
            logger.info(f"🔄 Executing: {pattern['name']}")
            
            # Execute query
            conn = get_db_connection(database="shop_demo")
            cursor = conn.cursor()
            
            start_time = time.time()
            cursor.execute(query)
            result = cursor.fetchall()  # fetchall instead of fetchone for aggregations
            elapsed = time.time() - start_time
            
            cursor.close()
            conn.close()
            
            # Update stats
            self.execution_count += 1
            self.last_execution_time = elapsed
            
            logger.info(f"✅ {pattern['name']} completed in {elapsed:.2f}s")
            
        except Exception as e:
            # Use ErrorFactory for database errors
            db_error = ErrorFactory.database_error(
                "Background query poller execution failed",
                original_error=e,
                database="shop_demo"
            )
            self.error_count += 1
            logger.error(f"❌ Query execution failed: {db_error}")
    
    def get_status(self) -> dict:
        """Get current poller status"""
        return {
            "is_running": self.is_running,
            "execution_count": self.execution_count,
            "error_count": self.error_count,
            "last_execution_time": self.last_execution_time,
            "available_patterns": len(self.query_patterns)
        }

# Global instance
_poller_instance: Optional[QueryPoller] = None

def get_poller() -> QueryPoller:
    """Get or create the global poller instance"""
    global _poller_instance
    if _poller_instance is None:
        _poller_instance = QueryPoller()
    return _poller_instance
