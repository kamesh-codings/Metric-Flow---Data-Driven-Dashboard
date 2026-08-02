-- MySQL Database Setup Script for Business Listings Dashboard
CREATE DATABASE IF NOT EXISTS business_dashboard;
USE business_dashboard;

DROP TABLE IF EXISTS listing_master;

CREATE TABLE IF NOT EXISTS listing_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    source VARCHAR(100) NOT NULL,
    rating DECIMAL(3, 1),
    established_year INT,
    opening_time VARCHAR(20),
    closing_time VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
