"""
MariaDB Slow Query Log Parser
"""

import re
from typing import Dict, Any, Optional

class SlowQueryParser:
    def __init__(self):
        pass

    def parse_log_entry(self, entry: str) -> Dict[str, Any]:
        """
        Parse a single raw slow log entry (from file content)
        Note: When reading from mysql.slow_log table, this is not needed as fields are already structured.
        This is useful for parsing uploaded log files or specific formats.
        """
        # ... logic if needed, but we prioritize TABLE access
        pass

    def normalize_query(self, sql: str) -> str:
        """
        Normalize SQL query for fingerprinting
        - Replaces values with ?
        - Unifies whitespace
        """
        if not sql:
            return ""
        
        # Replace numbers
        sql = re.sub(r'\b\d+\b', '?', sql)
        # Replace strings
        sql = re.sub(r"'[^']*'", '?', sql)
        sql = re.sub(r'"[^"]*"', '?', sql)
        # Normalize whitespace
        sql = re.sub(r'\s+', ' ', sql).strip()
        
        return sql

    def get_query_type(self, sql: str) -> str:
        """Determine query type (SELECT, UPDATE, DELETE, etc.)"""
        first_word = sql.strip().split(' ')[0].upper() if sql else "UNKNOWN"
        return first_word
