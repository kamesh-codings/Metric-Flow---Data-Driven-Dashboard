import requests
import os

API_URL = os.getenv("API_URL", "http://localhost:8000/api/listings/bulk-insert")
CSV_PATH = os.getenv("CSV_PATH", "business_listings.csv")

def seed_database():
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file '{CSV_PATH}' not found. Please run generate_data.py first.")
        return

    print(f"Sending '{CSV_PATH}' to {API_URL}...")
    try:
        with open(CSV_PATH, 'rb') as f:
            files = {'file': (CSV_PATH, f, 'text/csv')}
            response = requests.post(API_URL, files=files)
            
        if response.status_code == 201:
            print("Success! Response from server:")
            print(response.json())
        else:
            print(f"Failed with status code {response.status_code}: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to backend server at {API_URL}: {e}")

if __name__ == "__main__":
    seed_database()
