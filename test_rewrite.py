import requests
import json

url = "http://localhost:8000/rewrite"
payload = {
    "sql": "SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE status = 'active')"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
