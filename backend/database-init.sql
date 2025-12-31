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
  role ENUM('user', 'admin') DEFAULT 'user',
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



-- Insert sample admin user (password: Admin123!)
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@smartfitness.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.VpO/G.', 'admin')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample trainer user (password: Trainer123!)
INSERT INTO users (name, email, password, role) VALUES 
('Trainer User', 'trainer@smartfitness.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.VpO/G.', 'trainer')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample workout rules
INSERT INTO workout_rules (goal, day, exercises, difficulty_level, duration_minutes) VALUES
('weight_loss', 'Monday', '[{"name":"Jumping Jacks","sets":3,"reps":20,"duration":30,"calories_burned":50},{"name":"Push-ups","sets":3,"reps":10,"duration":0,"calories_burned":30},{"name":"Squats","sets":3,"reps":15,"duration":0,"calories_burned":40}]', 'beginner', 30),
('weight_loss', 'Tuesday', '[{"name":"Burpees","sets":3,"reps":8,"duration":0,"calories_burned":60},{"name":"Mountain Climbers","sets":3,"reps":20,"duration":30,"calories_burned":45},{"name":"Plank","sets":3,"reps":1,"duration":30,"calories_burned":25}]', 'beginner', 30),
('muscle_gain', 'Monday', '[{"name":"Bench Press","sets":4,"reps":8,"duration":0,"calories_burned":40},{"name":"Deadlifts","sets":4,"reps":6,"duration":0,"calories_burned":50},{"name":"Pull-ups","sets":3,"reps":5,"duration":0,"calories_burned":35}]', 'intermediate', 45),
('muscle_gain', 'Tuesday', '[{"name":"Squats","sets":4,"reps":10,"duration":0,"calories_burned":45},{"name":"Overhead Press","sets":4,"reps":8,"duration":0,"calories_burned":35},{"name":"Rows","sets":4,"reps":10,"duration":0,"calories_burned":40}]', 'intermediate', 45),
('maintenance', 'Monday', '[{"name":"Walking","sets":1,"reps":1,"duration":1800,"calories_burned":150},{"name":"Light Stretching","sets":1,"reps":1,"duration":600,"calories_burned":30}]', 'beginner', 30),
('maintenance', 'Tuesday', '[{"name":"Yoga","sets":1,"reps":1,"duration":1800,"calories_burned":120},{"name":"Balance Exercises","sets":3,"reps":10,"duration":0,"calories_burned":25}]', 'beginner', 30)
ON DUPLICATE KEY UPDATE exercises = VALUES(exercises);

-- Insert sample meal rules
INSERT INTO meal_rules (goal, meal_type, meals, calories_range) VALUES
('weight_loss', 'breakfast', '[{"name":"Greek Yogurt Bowl","calories":250,"protein":20,"carbs":25,"fat":8,"foods":[{"name":"Greek Yogurt","quantity":150,"unit":"g","calories":100},{"name":"Berries","quantity":100,"unit":"g","calories":50},{"name":"Almonds","quantity":15,"unit":"g","calories":90}]}]', '200-300'),
('weight_loss', 'lunch', '[{"name":"Grilled Chicken Salad","calories":350,"protein":30,"carbs":20,"fat":15,"foods":[{"name":"Grilled Chicken","quantity":120,"unit":"g","calories":200},{"name":"Mixed Greens","quantity":100,"unit":"g","calories":20},{"name":"Olive Oil Dressing","quantity":15,"unit":"ml","calories":120}]}]', '300-400'),
('muscle_gain', 'breakfast', '[{"name":"Power Oatmeal","calories":500,"protein":25,"carbs":60,"fat":18,"foods":[{"name":"Oatmeal","quantity":80,"unit":"g","calories":300},{"name":"Protein Powder","quantity":30,"unit":"g","calories":120},{"name":"Banana","quantity":1,"unit":"piece","calories":100}]}]', '450-550'),
('muscle_gain', 'lunch', '[{"name":"Chicken Rice Bowl","calories":600,"protein":40,"carbs":65,"fat":18,"foods":[{"name":"Grilled Chicken","quantity":150,"unit":"g","calories":250},{"name":"Brown Rice","quantity":100,"unit":"g","calories":350},{"name":"Vegetables","quantity":150,"unit":"g","calories":60}]}]', '550-650'),
('maintenance', 'breakfast', '[{"name":"Balanced Toast","calories":350,"protein":15,"carbs":40,"fat":16,"foods":[{"name":"Whole Grain Toast","quantity":2,"unit":"slices","calories":160},{"name":"Avocado","quantity":50,"unit":"g","calories":80},{"name":"Eggs","quantity":1,"unit":"piece","calories":70}]}]', '300-400'),
('maintenance', 'lunch', '[{"name":"Mediterranean Bowl","calories":450,"protein":25,"carbs":45,"fat":20,"foods":[{"name":"Quinoa","quantity":80,"unit":"g","calories":300},{"name":"Grilled Chicken","quantity":100,"unit":"g","calories":165},{"name":"Vegetables","quantity":100,"unit":"g","calories":40}]}]', '400-500')
ON DUPLICATE KEY UPDATE meals = VALUES(meals);

-- Show created tables
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE workoutmealplans;
DESCRIBE workout_rules;
DESCRIBE meal_rules;

-- Display success message
SELECT 'Database initialized successfully! You can now start the backend server.' AS message;