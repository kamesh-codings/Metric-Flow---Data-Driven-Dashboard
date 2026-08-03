# 📊 Business Listings Analytics Dashboard

Working Demo Video📺 : [ https://drive.google.com/drive/folders/1MOulD-ewQpLv9DrQkjpMhK1fMAwtA1Rd?usp=sharing ]


> A full-stack Business Listings Dashboard built with **React.js**, **FastAPI**, and **MySQL** — designed to collect, store, and visualize 500+ business directory listings with real-time analytics.

---

## 🖼️ Dashboard Preview

The dashboard features:
- **4 KPI Summary Cards** — Total Listings, Top City, Top Category, Lead Source
- **City-Wise Bar Chart** — Business count distribution across Indian metros
- **Category-Wise Bar Chart** — Horizontal bar chart for industry categories
- **Source-Wise Pie Chart** — Distribution of data sources (Google Maps, Justdial, Sulekha, etc.)
- **Searchable Data Table** — Interactive master listing directory with 500 records

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React.js 18, Chart.js, react-chartjs-2, Axios |
| Backend    | Python 3.x, FastAPI, Uvicorn        |
| Database   | MySQL 8.0                           |
| Data Gen   | Python Faker, Pandas                |
| Connector  | mysql-connector-python              |

---

## 📁 Project Structure

```
Business Dashboard/
├── backend/
│   ├── main.py                # FastAPI application with all endpoints
│   ├── database.py            # MySQL connection pool configuration
│   └── requirements.txt       # Python backend dependencies
├── frontend/
│   ├── public/
│   │   └── index.html         # HTML template
│   └── src/
│       ├── components/
│       │   └── Dashboard.jsx  # Main dashboard component with charts
│       ├── App.js             # Root React component
│       ├── index.js           # React entry point
│       └── index.css          # Global styling (dark glassmorphism theme)
├── generate_data.py           # Faker-based mock data generator (500 rows)
├── populate_db.py             # Script to bulk-insert CSV via API
├── schema.sql                 # MySQL database & table DDL
├── business_listings.csv      # Generated mock dataset (500 records)
├── database_dump.sql          # Full MySQL dump (schema + data)
└── README.md                  # This file
```

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- MySQL Server 8.0 (running on localhost:3306)

### Step 1: Clone / Open the Project
```bash
cd "Business Dashboard"
```

### Step 2: Set Up MySQL Database
```sql
-- Run schema.sql in MySQL Workbench or CLI:
SOURCE schema.sql;
```
Or use the command line:
```bash
mysql -u root -p < schema.sql
```

### Step 3: Generate Mock Data
```bash
pip install faker pandas
python generate_data.py
```
This creates `business_listings.csv` with 500 realistic Indian business listings.

### Step 4: Start the FastAPI Backend
```bash
pip install fastapi uvicorn mysql-connector-python pandas python-multipart
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
The API will be live at: `http://localhost:8000`

### Step 5: Populate the Database
```bash
python populate_db.py
```
This sends the CSV to `POST /api/listings/bulk-insert` which uses `executemany()` for efficient bulk insertion.

### Step 6: Start the React Frontend
```bash
cd frontend
npm install
npm start
```
The dashboard will be live at: `http://localhost:3000`

---

## 📡 API Endpoints

| Method | Endpoint                         | Description                        |
|--------|----------------------------------|------------------------------------|
| GET    | `/`                              | Health check                       |
| POST   | `/api/listings/bulk-insert`      | Upload CSV, bulk insert to MySQL   |
| GET    | `/api/dashboard/city-wise`       | Count of listings grouped by city  |
| GET    | `/api/dashboard/category-wise`   | Count of listings grouped by category |
| GET    | `/api/dashboard/source-wise`     | Count of listings grouped by source |
| GET    | `/api/listings?limit=50&offset=0`| Paginated raw listing records      |

### Sample API Response (`/api/dashboard/city-wise`):
```json
[
  {"city": "Pune", "count": 67},
  {"city": "Surat", "count": 57},
  {"city": "Chennai", "count": 54}
]
```

---

## 🗄️ Database Schema

```sql
CREATE TABLE listing_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    source VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚠️ Challenges Faced

### 1. Web Scraping IP Blocks (Cloudflare / Anti-Bot Protection)
The original assignment approach involved scraping business listing websites (Google Maps, Justdial, Sulekha). However, all major platforms deploy aggressive anti-bot measures:
- **Cloudflare CAPTCHA challenges** blocked automated requests
- **IP rate limiting** resulted in `403 Forbidden` responses after minimal requests
- **Dynamic JavaScript rendering** (Google Maps) required headless browsers which were also detected

**Solution**: As permitted by the assignment guidelines, we used Python's **Faker** library combined with **Pandas** to generate 500 realistic mock business records that match the exact schema structure. The generated data includes realistic Indian business names, addresses across 10 major cities, 10 industry categories, and 5 scraped data sources — maintaining full schema compatibility for the ETL pipeline demonstration.

### 2. MySQL `executemany()` for Bulk Insert Performance
Instead of inserting rows one-by-one (which would require 500 individual INSERT statements), we used `mysql-connector-python`'s `executemany()` method, which batches all 500 records into a single transaction for significantly improved performance.

### 3. CORS Configuration
Cross-Origin Resource Sharing (CORS) was required since the React frontend (port 3000) and FastAPI backend (port 8000) run on different ports. We configured `CORSMiddleware` with `allow_origins=["*"]` to permit cross-origin API requests during development.

---

## 📦 Database Dump

A complete MySQL dump including schema DDL and all 500 data records is included as `database_dump.sql`. To restore:
```bash
mysql -u root -p < database_dump.sql
```

---

## 👨‍💻 Author

Built as a Data Science Internship assignment demonstrating:
- Full-stack development (React + FastAPI + MySQL)
- Data pipeline design (generation → CSV → API → database → visualization)
- RESTful API design with FastAPI
- Interactive data visualization with Chart.js

---

View of the DashBoard 🪟:
<img width="877" height="650" alt="Screenshot 2026-08-03 102616" src="https://github.com/user-attachments/assets/8a4825da-19f0-4388-849b-3076a2abeb9e" />




*Generated on: August 2026*
