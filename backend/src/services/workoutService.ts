import { WorkoutMealPlanModel } from '../models/WorkoutMealPlan';
import { UserModel } from '../models/User';
import { Exercise, WorkoutMealPlan, User } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface WorkoutProgress {
  totalDays: number;
  completedDays: number;
  completedExercises: number;
  totalExercises: number;
  completionPercentage: number;
  currentStreak: number;
  longestStreak: number;
  weeklyStats: {
    [day: string]: {
      completed: boolean;
      completionPercentage: number;
      exercisesCompleted: number;
      totalExercises: number;
    };
  };
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  instructions: string;
  muscle_group: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
}

export class WorkoutService {
  /**
   * Generate personalized workout routine based on user profile and goals
   */
  static async generatePersonalizedWorkout(userId: number): Promise<WorkoutMealPlan[]> {
    try {
      // Get user profile
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Generate workout plans for each day of the week
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const workoutPlans: WorkoutMealPlan[] = [];

      for (const day of days) {
        const exercises = this.generateDayExercises(user, day);
        const meals = this.generateDayMeals(user, day);

        const planData = {
          day: day as any,
          exercises,
          meals,
        };

        const plan = await WorkoutMealPlanModel.createOrUpdate(userId, planData);
        workoutPlans.push(plan);
      }

      logger.info(`Personalized workout routine generated for user ${userId}`);
      return workoutPlans;
    } catch (error) {
      logger.error('Error generating personalized workout:', error);
      throw error;
    }
  }

  /**
   * Get workout progress analytics for a user
   */
  static async getWorkoutProgress(userId: number): Promise<WorkoutProgress> {
    try {
      const plans = await WorkoutMealPlanModel.findByUserId(userId);
      
      let totalExercises = 0;
      let completedExercises = 0;
      let completedDays = 0;
      const weeklyStats: WorkoutProgress['weeklyStats'] = {};

      // Calculate statistics for each day
      plans.forEach(plan => {
        const dayExercises = plan.exercises.length;
        const dayCompletedExercises = plan.exercises.filter(ex => 
          plan.completed_status.exercises[ex.id]
        ).length;

        totalExercises += dayExercises;
        completedExercises += dayCompletedExercises;

        const dayCompletionPercentage = dayExercises > 0 ? 
          Math.round((dayCompletedExercises / dayExercises) * 100) : 0;

        const isDayCompleted = dayCompletionPercentage === 100;
        if (isDayCompleted) {
          completedDays++;
        }

        weeklyStats[plan.day] = {
          completed: isDayCompleted,
          completionPercentage: dayCompletionPercentage,
          exercisesCompleted: dayCompletedExercises,
          totalExercises: dayExercises,
        };
      });

      const completionPercentage = totalExercises > 0 ? 
        Math.round((completedExercises / totalExercises) * 100) : 0;

      // Calculate streaks
      const { currentStreak, longestStreak } = this.calculateStreaks(weeklyStats);

      return {
        totalDays: plans.length,
        completedDays,
        completedExercises,
        totalExercises,
        completionPercentage,
        currentStreak,
        longestStreak,
        weeklyStats,
      };
    } catch (error) {
      logger.error('Error getting workout progress:', error);
      throw error;
    }
  }

  /**
   * Mark exercise as completed
   */
  static async markExerciseCompleted(
    userId: number, 
    day: string, 
    exerciseId: string, 
    completed: boolean
  ): Promise<WorkoutMealPlan> {
    try {
      const updatedPlan = await WorkoutMealPlanModel.updateCompletedStatus(userId, day, {
        exercise_id: exerciseId,
        completed,
      });

      logger.info(`Exercise ${exerciseId} marked as ${completed ? 'completed' : 'incomplete'} for user ${userId} on ${day}`);
      return updatedPlan;
    } catch (error) {
      logger.error('Error marking exercise as completed:', error);
      throw error;
    }
  }

  /**
   * Get exercise recommendations based on user progress
   */
  static async getExerciseRecommendations(userId: number): Promise<ExerciseTemplate[]> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const progress = await this.getWorkoutProgress(userId);
      
      // Determine user's fitness level based on progress
      let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
      if (progress.completionPercentage > 70) {
        difficulty = 'advanced';
      } else if (progress.completionPercentage > 40) {
        difficulty = 'intermediate';
      }

      return this.getExerciseTemplatesByGoalAndDifficulty(user.goal || 'maintenance', difficulty);
    } catch (error) {
      logger.error('Error getting exercise recommendations:', error);
      throw error;
    }
  }

  /**
   * Update workout intensity based on user progress
   */
  static async adjustWorkoutIntensity(userId: number): Promise<WorkoutMealPlan[]> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const progress = await this.getWorkoutProgress(userId);
      const currentPlans = await WorkoutMealPlanModel.findByUserId(userId);

      // Adjust intensity based on completion rate
      const adjustedPlans: WorkoutMealPlan[] = [];

      for (const plan of currentPlans) {
        const dayStats = progress.weeklyStats[plan.day];
        let adjustedExercises = [...plan.exercises];

        if (dayStats.completionPercentage > 80) {
          // Increase intensity
          adjustedExercises = this.increaseExerciseIntensity(adjustedExercises);
        } else if (dayStats.completionPercentage < 40) {
          // Decrease intensity
          adjustedExercises = this.decreaseExerciseIntensity(adjustedExercises);
        }

        const updatedPlan = await WorkoutMealPlanModel.createOrUpdate(userId, {
          day: plan.day as any,
          exercises: adjustedExercises,
          meals: plan.meals,
        });

        adjustedPlans.push(updatedPlan);
      }

      logger.info(`Workout intensity adjusted for user ${userId}`);
      return adjustedPlans;
    } catch (error) {
      logger.error('Error adjusting workout intensity:', error);
      throw error;
    }
  }

  /**
   * Generate exercises for a specific day based on user profile
   */
  private static generateDayExercises(user: User, day: string): Exercise[] {
    const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);
    
    // Different focus for each day based on goal
    const focusAreas = this.getDayFocusAreas(user.goal || 'maintenance', dayIndex);
    
    return focusAreas.flatMap(area => this.getExercisesForMuscleGroup(area, user.goal || 'maintenance'));
  }

  /**
   * Generate meals for a specific day (simplified version)
   */
  private static generateDayMeals(user: User, day: string): any[] {
    // This is a simplified version - in a real app, this would be more complex
    const baseCalories = this.calculateBaseCalories(user);
    
    return [
      {
        id: `${day}-breakfast`,
        name: 'Healthy Breakfast',
        type: 'breakfast',
        calories: Math.round(baseCalories * 0.25),
        protein: 20,
        carbs: 30,
        fat: 10,
        foods: [],
      },
      {
        id: `${day}-lunch`,
        name: 'Nutritious Lunch',
        type: 'lunch',
        calories: Math.round(baseCalories * 0.35),
        protein: 25,
        carbs: 40,
        fat: 15,
        foods: [],
      },
      {
        id: `${day}-dinner`,
        name: 'Balanced Dinner',
        type: 'dinner',
        calories: Math.round(baseCalories * 0.3),
        protein: 30,
        carbs: 25,
        fat: 18,
        foods: [],
      },
    ];
  }

  /**
   * Get focus areas for each day based on goal
   */
  private static getDayFocusAreas(goal: string, dayIndex: number): string[] {
    const focusPlans = {
      'weight_loss': [
        ['cardiovascular', 'full_body'], // Monday
        ['core', 'legs'], // Tuesday
        ['cardiovascular', 'arms'], // Wednesday
        ['full_body', 'core'], // Thursday
        ['cardiovascular', 'legs'], // Friday
        ['flexibility', 'core'], // Saturday
        ['cardiovascular'], // Sunday
      ],
      'muscle_gain': [
        ['chest', 'arms'], // Monday
        ['legs', 'core'], // Tuesday
        ['back', 'shoulders'], // Wednesday
        ['arms', 'core'], // Thursday
        ['legs', 'chest'], // Friday
        ['shoulders', 'back'], // Saturday
        ['flexibility', 'core'], // Sunday
      ],
      'maintenance': [
        ['full_body'], // Monday
        ['cardiovascular'], // Tuesday
        ['core', 'flexibility'], // Wednesday
        ['full_body'], // Thursday
        ['cardiovascular'], // Friday
        ['flexibility'], // Saturday
        ['core'], // Sunday
      ],
    };

    return focusPlans[goal as keyof typeof focusPlans]?.[dayIndex] || ['full_body'];
  }

  /**
   * Get exercises for specific muscle group
   */
  private static getExercisesForMuscleGroup(muscleGroup: string, goal: string): Exercise[] {
    const exerciseDatabase: { [key: string]: Exercise[] } = {
      'cardiovascular': [
        { id: `cardio-1`, name: 'Jumping Jacks', sets: 3, reps: 20, instructions: 'Full body cardio exercise', muscle_group: 'cardiovascular' },
        { id: `cardio-2`, name: 'High Knees', sets: 3, reps: 15, instructions: 'Cardio exercise for legs', muscle_group: 'cardiovascular' },
        { id: `cardio-3`, name: 'Burpees', sets: 3, reps: 8, instructions: 'High intensity full body exercise', muscle_group: 'cardiovascular' },
      ],
      'chest': [
        { id: `chest-1`, name: 'Push-ups', sets: 3, reps: 12, instructions: 'Standard push-ups for chest', muscle_group: 'chest' },
        { id: `chest-2`, name: 'Incline Push-ups', sets: 3, reps: 10, instructions: 'Easier variation of push-ups', muscle_group: 'chest' },
        { id: `chest-3`, name: 'Chest Dips', sets: 3, reps: 8, instructions: 'Advanced chest exercise', muscle_group: 'chest' },
      ],
      'legs': [
        { id: `legs-1`, name: 'Squats', sets: 3, reps: 15, instructions: 'Basic squat exercise', muscle_group: 'legs' },
        { id: `legs-2`, name: 'Lunges', sets: 3, reps: 12, instructions: 'Alternating leg lunges', muscle_group: 'legs' },
        { id: `legs-3`, name: 'Calf Raises', sets: 3, reps: 20, instructions: 'Calf strengthening exercise', muscle_group: 'legs' },
      ],
      'core': [
        { id: `core-1`, name: 'Planks', sets: 3, reps: 1, duration: 60, instructions: 'Hold plank position', muscle_group: 'core' },
        { id: `core-2`, name: 'Crunches', sets: 3, reps: 15, instructions: 'Basic abdominal crunches', muscle_group: 'core' },
        { id: `core-3`, name: 'Mountain Climbers', sets: 3, reps: 20, instructions: 'Dynamic core exercise', muscle_group: 'core' },
      ],
      'arms': [
        { id: `arms-1`, name: 'Tricep Dips', sets: 3, reps: 10, instructions: 'Tricep strengthening exercise', muscle_group: 'arms' },
        { id: `arms-2`, name: 'Arm Circles', sets: 3, reps: 15, instructions: 'Shoulder and arm exercise', muscle_group: 'arms' },
        { id: `arms-3`, name: 'Wall Push-ups', sets: 3, reps: 12, instructions: 'Easier arm exercise', muscle_group: 'arms' },
      ],
      'back': [
        { id: `back-1`, name: 'Superman', sets: 3, reps: 12, instructions: 'Lower back strengthening', muscle_group: 'back' },
        { id: `back-2`, name: 'Reverse Fly', sets: 3, reps: 10, instructions: 'Upper back exercise', muscle_group: 'back' },
        { id: `back-3`, name: 'Cat-Cow Stretch', sets: 2, reps: 10, instructions: 'Back mobility exercise', muscle_group: 'back' },
      ],
      'shoulders': [
        { id: `shoulders-1`, name: 'Shoulder Rolls', sets: 3, reps: 15, instructions: 'Shoulder mobility exercise', muscle_group: 'shoulders' },
        { id: `shoulders-2`, name: 'Pike Push-ups', sets: 3, reps: 8, instructions: 'Shoulder strengthening exercise', muscle_group: 'shoulders' },
        { id: `shoulders-3`, name: 'Arm Raises', sets: 3, reps: 12, instructions: 'Lateral shoulder exercise', muscle_group: 'shoulders' },
      ],
      'full_body': [
        { id: `fullbody-1`, name: 'Burpees', sets: 3, reps: 8, instructions: 'Full body high intensity exercise', muscle_group: 'full_body' },
        { id: `fullbody-2`, name: 'Jumping Jacks', sets: 3, reps: 20, instructions: 'Full body cardio exercise', muscle_group: 'full_body' },
        { id: `fullbody-3`, name: 'Bear Crawl', sets: 3, reps: 10, instructions: 'Full body strength exercise', muscle_group: 'full_body' },
      ],
      'flexibility': [
        { id: `flex-1`, name: 'Forward Fold', sets: 2, reps: 1, duration: 30, instructions: 'Hamstring and back stretch', muscle_group: 'flexibility' },
        { id: `flex-2`, name: 'Hip Circles', sets: 2, reps: 10, instructions: 'Hip mobility exercise', muscle_group: 'flexibility' },
        { id: `flex-3`, name: 'Shoulder Stretch', sets: 2, reps: 1, duration: 20, instructions: 'Shoulder flexibility exercise', muscle_group: 'flexibility' },
      ],
    };

    const exercises = exerciseDatabase[muscleGroup] || exerciseDatabase['full_body'];
    
    // Adjust intensity based on goal
    return exercises.map(exercise => ({
      ...exercise,
      id: `${muscleGroup}-${exercise.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      sets: goal === 'muscle_gain' ? exercise.sets + 1 : exercise.sets,
      reps: goal === 'weight_loss' ? exercise.reps + 5 : exercise.reps,
    }));
  }

  /**
   * Calculate base calories for user
   */
  private static calculateBaseCalories(user: User): number {
    // Simplified BMR calculation
    let bmr = 0;
    
    if (user.gender === 'male') {
      bmr = 88.362 + (13.397 * (user.weight || 70)) + (4.799 * (user.height || 175)) - (5.677 * (user.age || 25));
    } else {
      bmr = 447.593 + (9.247 * (user.weight || 60)) + (3.098 * (user.height || 165)) - (4.330 * (user.age || 25));
    }

    // Adjust based on goal
    switch (user.goal) {
      case 'weight_loss':
        return Math.round(bmr * 1.2 - 300); // Deficit for weight loss
      case 'muscle_gain':
        return Math.round(bmr * 1.5 + 300); // Surplus for muscle gain
      default:
        return Math.round(bmr * 1.3); // Maintenance
    }
  }

  /**
   * Calculate current and longest streaks
   */
  private static calculateStreaks(weeklyStats: WorkoutProgress['weeklyStats']): { currentStreak: number; longestStreak: number } {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const completedDays = days.map(day => weeklyStats[day]?.completed || false);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate from the end (most recent days)
    for (let i = completedDays.length - 1; i >= 0; i--) {
      if (completedDays[i]) {
        tempStreak++;
        if (i === completedDays.length - 1 || currentStreak === 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Get exercise templates by goal and difficulty
   */
  private static getExerciseTemplatesByGoalAndDifficulty(
    goal: string, 
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): ExerciseTemplate[] {
    // This would typically come from a database
    const templates: ExerciseTemplate[] = [
      {
        id: 'template-1',
        name: 'Push-ups',
        sets: difficulty === 'beginner' ? 2 : difficulty === 'intermediate' ? 3 : 4,
        reps: difficulty === 'beginner' ? 8 : difficulty === 'intermediate' ? 12 : 15,
        instructions: 'Standard push-up exercise',
        muscle_group: 'chest',
        difficulty,
        equipment: [],
      },
      {
        id: 'template-2',
        name: 'Squats',
        sets: difficulty === 'beginner' ? 2 : difficulty === 'intermediate' ? 3 : 4,
        reps: difficulty === 'beginner' ? 10 : difficulty === 'intermediate' ? 15 : 20,
        instructions: 'Basic squat exercise',
        muscle_group: 'legs',
        difficulty,
        equipment: [],
      },
      // Add more templates as needed
    ];

    return templates.filter(template => 
      template.difficulty === difficulty &&
      this.isExerciseRelevantForGoal(template, goal)
    );
  }

  /**
   * Check if exercise is relevant for user's goal
   */
  private static isExerciseRelevantForGoal(exercise: ExerciseTemplate, goal: string): boolean {
    const goalRelevance = {
      'weight_loss': ['cardiovascular', 'full_body', 'core'],
      'muscle_gain': ['chest', 'legs', 'arms', 'back', 'shoulders'],
      'maintenance': ['full_body', 'core', 'flexibility'],
    };

    const relevantGroups = goalRelevance[goal as keyof typeof goalRelevance] || [];
    return relevantGroups.includes(exercise.muscle_group);
  }

  /**
   * Increase exercise intensity
   */
  private static increaseExerciseIntensity(exercises: Exercise[]): Exercise[] {
    return exercises.map(exercise => ({
      ...exercise,
      sets: Math.min(exercise.sets + 1, 5), // Max 5 sets
      reps: exercise.reps ? Math.min(exercise.reps + 2, 25) : exercise.reps, // Max 25 reps
      duration: exercise.duration ? Math.min(exercise.duration + 15, 300) : exercise.duration, // Max 5 minutes
    }));
  }

  /**
   * Decrease exercise intensity
   */
  private static decreaseExerciseIntensity(exercises: Exercise[]): Exercise[] {
    return exercises.map(exercise => ({
      ...exercise,
      sets: Math.max(exercise.sets - 1, 1), // Min 1 set
      reps: exercise.reps ? Math.max(exercise.reps - 2, 5) : exercise.reps, // Min 5 reps
      duration: exercise.duration ? Math.max(exercise.duration - 15, 30) : exercise.duration, // Min 30 seconds
    }));
  }
}