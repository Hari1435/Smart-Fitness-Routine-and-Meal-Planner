import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { User, CreateUserRequest, UpdateProfileRequest, UpdateGoalsRequest } from '../types';
import { PasswordUtils } from '../utils/password';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserRequest): Promise<User> {
    const connection = await pool.getConnection();
    
    try {
      // Hash password
      const hashedPassword = await PasswordUtils.hashPassword(userData.password);
      
      // Insert user
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        [userData.name, userData.email, hashedPassword, userData.role || 'user']
      );

      if (result.affectedRows === 0) {
        throw new AppError('Failed to create user', 500, 'USER_CREATION_FAILED');
      }

      // Fetch and return the created user
      const createdUser = await this.findById(result.insertId);
      if (!createdUser) {
        throw new AppError('User created but could not be retrieved', 500, 'USER_RETRIEVAL_FAILED');
      }

      logger.info(`User created successfully: ${userData.email}`);
      return createdUser;
    } catch (error) {
      if ((error as any).code === 'ER_DUP_ENTRY') {
        throw new AppError('Email already exists', 409, 'EMAIL_EXISTS');
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM users WHERE id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM users WHERE email = ?`,
        [email.toLowerCase()]
      );

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: number, profileData: UpdateProfileRequest): Promise<User> {
    const connection = await pool.getConnection();
    
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      // Build dynamic update query
      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      });

      if (updateFields.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_UPDATE_FIELDS');
      }

      updateValues.push(userId);

      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      if (result.affectedRows === 0) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Fetch and return updated user
      const updatedUser = await this.findById(userId);
      if (!updatedUser) {
        throw new AppError('User updated but could not be retrieved', 500, 'USER_RETRIEVAL_FAILED');
      }

      logger.info(`User profile updated: ${userId}`);
      return updatedUser;
    } finally {
      connection.release();
    }
  }

  /**
   * Update user goals
   */
  static async updateGoals(userId: number, goalsData: UpdateGoalsRequest): Promise<User> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE users SET goal = ? WHERE id = ?`,
        [goalsData.goal, userId]
      );

      if (result.affectedRows === 0) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Fetch and return updated user
      const updatedUser = await this.findById(userId);
      if (!updatedUser) {
        throw new AppError('User updated but could not be retrieved', 500, 'USER_RETRIEVAL_FAILED');
      }

      logger.info(`User goals updated: ${userId}`);
      return updatedUser;
    } finally {
      connection.release();
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId: number, newPassword: string): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      const hashedPassword = await PasswordUtils.hashPassword(newPassword);
      
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE users SET password = ? WHERE id = ?`,
        [hashedPassword, userId]
      );

      if (result.affectedRows === 0) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      logger.info(`User password updated: ${userId}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Delete user
   */
  static async delete(userId: number): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `DELETE FROM users WHERE id = ?`,
        [userId]
      );

      if (result.affectedRows === 0) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      logger.info(`User deleted: ${userId}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get all users (admin only)
   */
  static async findAll(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
    const connection = await pool.getConnection();
    
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const [countRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM users`
      );
      const total = countRows[0].total;

      // Get users with pagination
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const users = rows.map(row => this.mapRowToUser(row));

      return { users, total };
    } finally {
      connection.release();
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string, excludeUserId?: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      let query = `SELECT COUNT(*) as count FROM users WHERE email = ?`;
      const params: any[] = [email.toLowerCase()];

      if (excludeUserId) {
        query += ` AND id != ?`;
        params.push(excludeUserId);
      }

      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      return rows[0].count > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get user statistics
   */
  static async getStatistics(): Promise<{
    totalUsers: number;
    usersByRole: { role: string; count: number }[];
    usersByGoal: { goal: string; count: number }[];
    recentUsers: number;
  }> {
    const connection = await pool.getConnection();
    
    try {
      // Total users
      const [totalRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM users`
      );
      const totalUsers = totalRows[0].total;

      // Users by role
      const [roleRows] = await connection.execute<RowDataPacket[]>(
        `SELECT role, COUNT(*) as count FROM users GROUP BY role`
      );
      const usersByRole = roleRows.map(row => ({ role: row.role, count: row.count }));

      // Users by goal
      const [goalRows] = await connection.execute<RowDataPacket[]>(
        `SELECT goal, COUNT(*) as count FROM users WHERE goal IS NOT NULL GROUP BY goal`
      );
      const usersByGoal = goalRows.map(row => ({ goal: row.goal, count: row.count }));

      // Recent users (last 30 days)
      const [recentRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );
      const recentUsers = recentRows[0].count;

      return {
        totalUsers,
        usersByRole,
        usersByGoal,
        recentUsers,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Map database row to User object
   */
  private static mapRowToUser(row: RowDataPacket): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      age: row.age,
      gender: row.gender,
      height: row.height,
      weight: row.weight,
      goal: row.goal,
      role: row.role,
      created_at: row.created_at,
    };
  }

  /**
   * Get user without password
   */
  static async findByIdSafe(id: number): Promise<Omit<User, 'password'> | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const { password, ...safeUser } = user;
    return safeUser;
  }
}