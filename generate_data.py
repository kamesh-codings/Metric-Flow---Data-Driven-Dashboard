import random
import pandas as pd
from faker import Faker

fake = Faker('en_IN')

CITIES = [
    "Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Chennai",
    "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat"
]

CATEGORIES = [
    "IT Services & Consulting", "Restaurant & Cafe", "Healthcare & Clinic",
    "Real Estate & Housing", "Education & Training", "Retail & Supermarket",
    "Automobile & Repair", "Financial Services", "Hospitality & Hotel",
    "Fitness & Wellness"
]

SOURCES = ["Google Maps", "Justdial", "Sulekha", "YellowPages", "Bing Places"]

def generate_business_listings(count=500):
    data = []
    for _ in range(count):
        category = random.choice(CATEGORIES)
        city = random.choice(CITIES)
        source = random.choice(SOURCES)
        
        business_name = fake.company().strip()
        
        address = f"{fake.building_number()}, {fake.street_name()}, {fake.street_suffix()}, {city}"
        phone = fake.phone_number()
        
        if category == "IT Services & Consulting":
            rating = round(random.uniform(3.5, 5.0), 1)
            established_year = random.randint(1990, 2023)
            opening_time = "09:00"
            closing_time = "18:00"
        elif category == "Restaurant & Cafe":
            rating = round(random.uniform(3.0, 5.0), 1)
            established_year = random.randint(2000, 2024)
            opening_time = "11:00"
            closing_time = "23:00"
        elif category == "Healthcare & Clinic":
            rating = round(random.uniform(3.5, 5.0), 1)
            established_year = random.randint(1980, 2022)
            opening_time = random.choice(["24 Hours", "08:00"])
            closing_time = "24 Hours" if opening_time == "24 Hours" else "20:00"
        elif category == "Real Estate & Housing":
            rating = round(random.uniform(2.5, 4.8), 1)
            established_year = random.randint(1995, 2023)
            opening_time = "10:00"
            closing_time = "19:00"
        elif category == "Education & Training":
            rating = round(random.uniform(3.0, 4.9), 1)
            established_year = random.randint(1970, 2023)
            opening_time = "08:00"
            closing_time = "17:00"
        elif category == "Retail & Supermarket":
            rating = round(random.uniform(3.5, 5.0), 1)
            established_year = random.randint(1990, 2024)
            opening_time = "09:00"
            closing_time = "22:00"
        elif category == "Automobile & Repair":
            rating = round(random.uniform(3.0, 4.8), 1)
            established_year = random.randint(1980, 2020)
            opening_time = "09:00"
            closing_time = "20:00"
        elif category == "Financial Services":
            rating = round(random.uniform(3.5, 5.0), 1)
            established_year = random.randint(1950, 2020)
            opening_time = "09:00"
            closing_time = "17:00"
        elif category == "Hospitality & Hotel":
            rating = round(random.uniform(3.5, 5.0), 1)
            established_year = random.randint(1980, 2023)
            opening_time = "24 Hours"
            closing_time = "24 Hours"
        else:
            rating = round(random.uniform(3.8, 5.0), 1)
            established_year = random.randint(2010, 2024)
            opening_time = "05:00"
            closing_time = "22:00"
        
        data.append({
            "business_name": business_name,
            "category": category,
            "city": city,
            "address": address,
            "phone": phone,
            "source": source,
            "rating": rating,
            "established_year": established_year,
            "opening_time": opening_time,
            "closing_time": closing_time
        })
        
    df = pd.DataFrame(data)
    csv_filename = "business_listings.csv"
    df.to_csv(csv_filename, index=False)
    print(f"Successfully generated {len(df)} business listings into '{csv_filename}'.")
    return csv_filename

if __name__ == "__main__":
    generate_business_listings(500)
