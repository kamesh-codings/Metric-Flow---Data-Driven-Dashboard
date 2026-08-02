import io
import pandas as pd
from decimal import Decimal
from datetime import datetime, date
from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
try:
    from backend.database import get_db_connection
except ImportError:
    from database import get_db_connection

app = FastAPI(
    title="Business Listings Dashboard API",
    description="Backend service for storing, processing, and visualising business listings.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def safe_float(val):
    if val is None or val == '' or pd.isna(val):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def safe_int(val):
    if val is None or val == '' or pd.isna(val):
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None

def serialize_row(row):
    for key, val in row.items():
        if isinstance(val, Decimal):
            row[key] = float(val)
        elif isinstance(val, (datetime, date)):
            row[key] = val.isoformat()
    return row

@app.get("/")
def read_root():
    return {"status": "online", "message": "Business Listings Dashboard API active"}

@app.post("/api/listings/bulk-insert", status_code=status.HTTP_201_CREATED)
async def bulk_insert_listings(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Uploaded file must be a CSV file.")
    
    conn = None
    cursor = None
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        df = df.fillna('')
        
        required_cols = ["business_name", "category", "city", "address", "phone", "source", "rating", "established_year", "opening_time", "closing_time"]
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required CSV column: {col}")
        
        records = [
            (
                str(row['business_name']),
                str(row['category']),
                str(row['city']),
                str(row['address']),
                str(row['phone']),
                str(row['source']),
                safe_float(row['rating']),
                safe_int(row['established_year']),
                str(row['opening_time']),
                str(row['closing_time'])
            )
            for _, row in df.iterrows()
        ]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            INSERT INTO listing_master (business_name, category, city, address, phone, source, rating, established_year, opening_time, closing_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.executemany(query, records)
        conn.commit()
        inserted_count = cursor.rowcount
        
        return {
            "status": "success",
            "message": f"Successfully bulk inserted {inserted_count} listings into database.",
            "records_processed": len(records)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting listings: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.get("/api/dashboard/city-wise")
def get_city_wise_count():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT city, COUNT(*) as count 
            FROM listing_master 
            GROUP BY city 
            ORDER BY count DESC
        """
        cursor.execute(query)
        results = cursor.fetchall()
        return [serialize_row(r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.get("/api/dashboard/category-wise")
def get_category_wise_count():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT category, COUNT(*) as count 
            FROM listing_master 
            GROUP BY category 
            ORDER BY count DESC
        """
        cursor.execute(query)
        results = cursor.fetchall()
        return [serialize_row(r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.get("/api/dashboard/source-wise")
def get_source_wise_count():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT source, COUNT(*) as count 
            FROM listing_master 
            GROUP BY source 
            ORDER BY count DESC
        """
        cursor.execute(query)
        results = cursor.fetchall()
        return [serialize_row(r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.get("/api/listings")
def get_recent_listings(limit: int = 500, offset: int = 0):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT id, business_name, category, city, address, phone, source, rating, established_year, opening_time, closing_time, created_at 
            FROM listing_master 
            ORDER BY id DESC 
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, (limit, offset))
        results = cursor.fetchall()
        
        cursor.execute("SELECT COUNT(*) as total FROM listing_master")
        total_row = cursor.fetchone()
        total = total_row["total"] if total_row else 0
        
        serialized_results = [serialize_row(r) for r in results]
        return {"total": total, "listings": serialized_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
