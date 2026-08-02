import os
import mysql.connector
from mysql.connector import errorcode, pooling

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "business_dashboard"),
    "port": int(os.getenv("DB_PORT", 3306))
}

try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name="dashboard_pool",
        pool_size=10,
        pool_reset_session=True,
        **DB_CONFIG
    )
    print("MySQL Connection Pool initialized successfully.")
except mysql.connector.Error as err:
    print(f"Warning: Connection pool initialization failed: {err}")
    db_pool = None

def get_db_connection():
    if db_pool:
        try:
            return db_pool.get_connection()
        except mysql.connector.Error as err:
            print(f"Pool connection failed, attempting direct connection: {err}")
            return mysql.connector.connect(**DB_CONFIG)
    else:
        return mysql.connector.connect(**DB_CONFIG)

