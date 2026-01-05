
import os
import mariadb
from dotenv import load_dotenv

load_dotenv(override=True)

host = os.getenv("SKYSQL_HOST")
port = os.getenv("SKYSQL_PORT")
user = os.getenv("SKYSQL_USERNAME")
pw = os.getenv("SKYSQL_PASSWORD")

print(f"DEBUG: ENV HOST='{host}'")
print(f"DEBUG: ENV PORT='{port}'")
print(f"DEBUG: ENV USER='{user}'")
print(f"DEBUG: ENV PASS='{pw}'")

try:
    conn = mariadb.connect(
        host=host,
        port=int(port) if port else 3306,
        user=user,
        password=pw,
        ssl=True,
        connect_timeout=5
    )
    print("SUCCESS: Connected to MariaDB!")
    conn.close()
except Exception as e:
    print(f"FAILURE: {e}")
