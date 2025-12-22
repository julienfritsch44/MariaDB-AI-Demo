"""
Impact Scorer for Slow Queries
"""

class ImpactScorer:
    def __init__(self):
        # Weight configurations
        self.weights = {
            "query_time": 0.4,
            "scan_ratio": 0.3,
            "rows_examined": 0.3
        }
        
        # Baseline limits for normalization
        self.max_query_time = 30.0  # seconds
        self.max_rows = 10_000_000
        self.max_scan_ratio = 10_000

    def calculate_score(self, query_time: float, rows_examined: int, rows_sent: int) -> int:
        """
        Calculate a 0-100 impact score.
        Higher score means higher impact/problem.
        """
        # 1. Time Score (0-100)
        # Cap at max_query_time
        time_score = min(query_time / self.max_query_time, 1.0) * 100
        
        # 2. Scan Ratio Score (0-100)
        # Ratio of rows examined vs sent. High ratio = inefficient scan.
        if rows_sent > 0:
            ratio = rows_examined / rows_sent
        else:
            ratio = rows_examined  # Penalty for scanning without sending
            
        ratio_score = min(ratio / self.max_scan_ratio, 1.0) * 100
        
        # 3. Tablescan Magnitude Score (0-100)
        # Absolute number of rows examined
        rows_score = min(rows_examined / self.max_rows, 1.0) * 100
        
        # Weighted Average
        final_score = (
            (time_score * self.weights["query_time"]) +
            (ratio_score * self.weights["scan_ratio"]) +
            (rows_score * self.weights["rows_examined"])
        )
        
        return int(round(final_score))

    def get_impact_level(self, score: int) -> str:
        """Return qualitative impact level"""
        if score >= 80:
            return "CRITICAL"
        elif score >= 50:
            return "HIGH"
        elif score >= 20:
            return "MEDIUM"
        else:
            return "LOW"
