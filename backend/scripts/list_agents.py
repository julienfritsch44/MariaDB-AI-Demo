
import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SKYSQL_API_KEY")

def list_agents():
    url = "https://api.skysql.com/copilot/v1/agent/"
    headers = {"X-API-Key": API_KEY}
    
    print(f"Fetching agents from {url}...")
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200:
        agents = resp.json()
        print(f"Found {len(agents)} agents:")
        for agent in agents:
            print(f" - ID: {agent.get('id')}")
            print(f"   Name: {agent.get('name')}")
            print(f"   Status: {agent.get('status')}")
            print("---")
            
        return agents
    else:
        print(f"Error {resp.status_code}: {resp.text}")
        return []

if __name__ == "__main__":
    list_agents()
