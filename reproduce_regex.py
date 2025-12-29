
import re

sql = "SELECT id, customer_id, order_date, total_amount, status FROM orders WHERE customer_id IN ( SELECT id FROM customers WHERE status = 'active' ) AND total_amount > 1000 ORDER BY created_at DESC"

columns_match = re.findall(r'(\w+)\s*=\s*\w+\.\w+|(\w+)\s*=\s*[:\w\d?]+', sql)
print(f"Original Regex Matches: {columns_match}")

# Proposed Fix
columns_match_fix = re.findall(r'(\w+)\s*=\s*\w+\.\w+|(\w+)\s*=\s*(?:[\'"][\w\s\-_]+[\'"]|[:\w\d?]+)', sql)
print(f"Fixed Regex Matches: {columns_match_fix}")
