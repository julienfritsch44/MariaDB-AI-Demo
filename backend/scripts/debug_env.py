
import os
import sys

# Add parent directory to path to find .env if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Try loading from backend/.env explicitly
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"Loading .env from: {env_path}")
load_dotenv(env_path)

def debug_env():
    print("\n--- Environment Debug ---")
    keys = ["SKYSQL_HOST", "SKYSQL_USERNAME", "SKYSQL_PORT", "SKYSQL_API_KEY", "GOOGLE_API_KEY"]
    for k in keys:
        val = os.getenv(k)
        print(f"{k}: {'Found' if val else 'MISSING'} {f'({val[:5]}...)' if val else ''}")

if __name__ == "__main__":
    debug_env()
