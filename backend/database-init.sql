-- Smart Fitness Planner Database Initialization Script
-- Run this script in MySQL Workbench to create the database

-- Create database
CREATE DATABASE IF NOT EXISTS smart_fitness_planner;
USE smart_fitness_planner;

-- Create Users table (as per requirements)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  age INT,
  gender ENUM('male', 'female', 'other'),
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  goal ENUM('weight_loss', 'muscle_gain', 'maintenance'),
  role ENUM('user') DEFAULT 'user',
  reset_token VARCHAR(255) NULL,
  reset_token_expires TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_goal (goal),
  INDEX idx_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create WorkoutMealPlans table (Combined table as per requirements)
CREATE TABLE IF NOT EXISTS workoutmealplans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  exercises JSON COMMENT 'List of exercises with details',
  meals JSON COMMENT 'Meal plan with calories',
  completed_status JSON COMMENT 'Tracks completed exercises/meals',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_day (day),
  UNIQUE KEY unique_user_day (user_id, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Show created tables
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE workoutmealplans;

-- Display success message
SELECT 'Database initialized successfully! You can now start the backend server.' AS message;