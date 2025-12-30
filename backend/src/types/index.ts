import { Request } from 'express';

// User Types (Simplified as per requirements)
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  goal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
  role: 'user' | 'trainer' | 'admin';
  created_at: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'trainer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
}

export interface UpdateGoalsRequest {
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance';
}

// WorkoutMealPlans Types (Combined table as per requirements)
export interface WorkoutMealPlan {
  id: number;
  user_id: number;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  exercises: Exercise[];
  meals: Meal[];
  completed_status: CompletedStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  instructions?: string;
  muscle_group?: string;
}

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  foods: Food[];
}

export interface Food {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
}

export interface CompletedStatus {
  exercises: { [exerciseId: string]: boolean };
  meals: { [mealId: string]: boolean };
  date_completed?: Date;
}

export interface CreateWorkoutMealPlanRequest {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  exercises: Exercise[];
  meals: Meal[];
}

export interface UpdateCompletedStatusRequest {
  exercise_id?: string;
  meal_id?: string;
  completed: boolean;
}

// JWT Types
export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Database Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
}

// Environment Configuration Types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiVersion: string;
  corsOrigin: string;
  corsCredentials: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  bcryptSaltRounds: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  maxFileSize: number;
  uploadPath: string;
}

// Authentication Response Types
export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: string;
}