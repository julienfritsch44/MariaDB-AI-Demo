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
        self.max_query_time = 12.0  # seconds (closer to our 10s hybrid queries)
        self.max_rows = 2_000_000   # 2M is a lot for a demo
        self.max_scan_ratio = 5_000 # 5K rows examined per sent is definitely slow

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

    def calculate_cost(self, rows_examined: int) -> float:
        """
        Estimate the financial cost of a query based on IOPS/CPU consumption.
        Formula: (Rows / 1M) * $0.05 + base cost per execution.
        """
        base_cost = 0.01
        io_unit_cost = 0.05 # $0.05 per million rows examined
        estimated_cost = (rows_examined / 1_000_000) * io_unit_cost + base_cost
        return round(estimated_cost, 4)

    def get_financial_impact(self, rows_examined: int) -> dict:
        """Return a formatted object for the UI"""
        cost = self.calculate_cost(rows_examined)
        return {
            "estimated_cost_usd": cost,
            "monthly_forecast_usd": round(cost * 3600 * 24 * 30 / 100, 2), # Assuming freq
            "efficiency_roi": "High" if rows_examined > 100_000 else "Low"
        }

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
