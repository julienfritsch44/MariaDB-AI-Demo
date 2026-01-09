
import os
import mariadb
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)


import os
import mariadb
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(override=True)

def get_db_connection(database: str = None):
    """
    Get MariaDB connection from environment variables.
    Returns a mariadb.connection object.
    Throws an exception if connection fails.
    """
    try:
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 3306)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=os.getenv("SKYSQL_PASSWORD"),
            database=database,
            ssl=True,
            ssl_verify_cert=False,
            connect_timeout=10
        )
        logger.info(f"Successfully connected to MariaDB/SkySQL (db={database})")
        return conn
    except Exception as e:
        logger.error(f"FATAL: DB CONNECTION FAILED (db={database}): {e}")
        logger.error("Please verify SKYSQL_HOST, SKYSQL_USERNAME, SKYSQL_PASSWORD and network access.")
        raise e
