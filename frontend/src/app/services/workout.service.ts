import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  instructions?: string;
  muscle_group?: string;
  completed_at?: Date;
  locked?: boolean; // Prevent reverting completed exercises
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
  consumed_at?: Date;
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
  completion_locked?: { [exerciseId: string]: Date }; // Lock completed exercises
}

export interface WorkoutMealPlan {
  id: number;
  user_id: number;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  exercises: Exercise[];
  meals: Meal[];
  completed_status: CompletedStatus;
  created_at: Date;
  updated_at: Date;
  week_number?: number; // Track which week this plan belongs to
  archived?: boolean; // Mark old weeks as archived
}

export interface WeeklyProgress {
  totalDays: number;
  completedDays: number;
  completedExercises: number;
  completedMeals: number;
  totalExercises: number;
  totalMeals: number;
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: Date;
  streakBroken: boolean;
  streakStartDate?: Date;
}

export interface WeeklyArchive {
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  totalExercises: number;
  completedExercises: number;
  completionPercentage: number;
  streakDays: number;
  achievements: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  private apiUrl = 'http://localhost:3000/api/v1';
  private currentPlansSubject = new BehaviorSubject<WorkoutMealPlan[]>([]);
  public currentPlans$ = this.currentPlansSubject.asObservable();
  
  private currentWeekNumber: number;
  private weekStartDate: Date;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.currentWeekNumber = this.getCurrentWeekNumber();
    this.weekStartDate = this.getWeekStartDate();
    this.checkWeeklyReset();
  }

  private getHeaders(): HttpHeaders {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('accessToken') || '';
    }
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private isAuthenticated(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('accessToken');
      return !!token;
    }
    return false;
  }

  // Get current week number (ISO week)
  private getCurrentWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  }

  // Get start of current week (Monday)
  private getWeekStartDate(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(now.setDate(diff));
  }

  // Check if we need to reset for new week
  private checkWeeklyReset(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const lastWeekNumber = localStorage.getItem('lastWeekNumber');
    const currentWeek = this.getCurrentWeekNumber();

    if (lastWeekNumber && parseInt(lastWeekNumber) !== currentWeek) {
      this.performWeeklyReset();
    }

    localStorage.setItem('lastWeekNumber', currentWeek.toString());
  }

  // Perform weekly reset - archive current progress and create new plans
  private performWeeklyReset(): void {
    this.archiveCurrentWeek().subscribe({
      next: () => {
        this.generateNewWeekPlans().subscribe({
          next: () => {
            console.log('Weekly reset completed successfully');
          },
          error: (error) => {
            console.error('Error generating new week plans:', error);
          }
        });
      },
      error: (error) => {
        console.error('Error archiving current week:', error);
      }
    });
  }

  // Archive current week's progress
  archiveCurrentWeek(): Observable<ApiResponse<{ archive: WeeklyArchive }>> {
    return this.http.post<ApiResponse<{ archive: WeeklyArchive }>>(
      `${this.apiUrl}/workouts/archive-week`,
      { weekNumber: this.currentWeekNumber - 1 },
      { headers: this.getHeaders() }
    );
  }

  // Generate new week plans
  generateNewWeekPlans(): Observable<ApiResponse<{ plans: WorkoutMealPlan[] }>> {
    return this.http.post<ApiResponse<{ plans: WorkoutMealPlan[] }>>(
      `${this.apiUrl}/workouts/generate-week`,
      { weekNumber: this.currentWeekNumber },
      { headers: this.getHeaders() }
    );
  }

  // Get all workout meal plans for current user
  getUserPlans(): Observable<ApiResponse<{ plans: WorkoutMealPlan[] }>> {
    return this.http.get<ApiResponse<{ plans: WorkoutMealPlan[] }>>(
      `${this.apiUrl}/workouts?week=${this.currentWeekNumber}`,
      { headers: this.getHeaders() }
    );
  }

  // Get workout meal plan for specific day
  getPlanByDay(day: string): Observable<ApiResponse<{ plan: WorkoutMealPlan }>> {
    return this.http.get<ApiResponse<{ plan: WorkoutMealPlan }>>(
      `${this.apiUrl}/workouts/${day}?week=${this.currentWeekNumber}`,
      { headers: this.getHeaders() }
    );
  }

  // Update completed status for exercises (with locking mechanism)
  updateCompletedStatus(day: string, statusUpdate: {
    exercise_id?: string;
    meal_id?: string;
    completed: boolean;
  }): Observable<ApiResponse<{ plan: WorkoutMealPlan }>> {
    return this.http.post<ApiResponse<{ plan: WorkoutMealPlan }>>(
      `${this.apiUrl}/workouts/${day}/complete-exercise`,
      {
        ...statusUpdate,
        weekNumber: this.currentWeekNumber,
        lockCompletion: true // Lock completed exercises to prevent reverting
      },
      { headers: this.getHeaders() }
    );
  }

  // Get weekly progress with enhanced tracking
  getWeeklyProgress(): Observable<ApiResponse<{ progress: WeeklyProgress }>> {
    return this.http.get<ApiResponse<{ progress: WeeklyProgress }>>(
      `${this.apiUrl}/workouts/progress?week=${this.currentWeekNumber}`,
      { headers: this.getHeaders() }
    );
  }

  // Get streak information with break detection
  getStreakInfo(): Observable<ApiResponse<{ streak: StreakInfo }>> {
    return this.http.get<ApiResponse<{ streak: StreakInfo }>>(
      `${this.apiUrl}/progress/streak-enhanced`,
      { headers: this.getHeaders() }
    );
  }

  // Get archived weeks for progress history
  getArchivedWeeks(limit: number = 10): Observable<ApiResponse<{ archives: WeeklyArchive[] }>> {
    return this.http.get<ApiResponse<{ archives: WeeklyArchive[] }>>(
      `${this.apiUrl}/workouts/archived-weeks?limit=${limit}`,
      { headers: this.getHeaders() }
    );
  }

  // Generate default plans based on goal
  generateDefaultPlans(goal: 'weight_loss' | 'muscle_gain' | 'maintenance'): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/workouts/generate`,
      { 
        goal,
        weekNumber: this.currentWeekNumber,
        weekStartDate: this.weekStartDate
      },
      { headers: this.getHeaders() }
    );
  }

  // Update local plans cache
  updatePlansCache(plans: WorkoutMealPlan[]): void {
    this.currentPlansSubject.next(plans);
  }

  // Get current plans from cache
  getCurrentPlans(): WorkoutMealPlan[] {
    return this.currentPlansSubject.value;
  }

  // Helper method to get today's day name
  getTodayDayName(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }

  // Helper method to get all days of the week
  getAllDays(): string[] {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  }

  // Enhanced completion percentage calculation
  calculateCompletionPercentage(plan: WorkoutMealPlan): number {
    if (!plan || !plan.exercises || !plan.meals || !plan.completed_status) {
      return 0;
    }

    const exercises = Array.isArray(plan.exercises) ? plan.exercises : [];
    const meals = Array.isArray(plan.meals) ? plan.meals : [];
    const totalItems = exercises.length + meals.length;
    
    if (totalItems === 0) return 0;

    const completedExercises = exercises.filter(ex => 
      plan.completed_status.exercises && plan.completed_status.exercises[ex.id]
    ).length;
    
    const completedMeals = meals.filter(meal => 
      plan.completed_status.meals && plan.completed_status.meals[meal.id]
    ).length;

    return Math.round(((completedExercises + completedMeals) / totalItems) * 100);
  }

  // Check if exercise completion is locked (cannot be reverted)
  isExerciseCompletionLocked(plan: WorkoutMealPlan, exerciseId: string): boolean {
    if (!plan.completed_status.completion_locked) return false;
    
    const lockDate = plan.completed_status.completion_locked[exerciseId];
    if (!lockDate) return false;

    // Lock completion for 24 hours after marking as complete
    const lockTime = new Date(lockDate).getTime();
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    return (now - lockTime) < twentyFourHours;
  }

  // Get current week info
  getCurrentWeekInfo(): { weekNumber: number; startDate: Date; endDate: Date } {
    const endDate = new Date(this.weekStartDate);
    endDate.setDate(endDate.getDate() + 6);

    return {
      weekNumber: this.currentWeekNumber,
      startDate: this.weekStartDate,
      endDate: endDate
    };
  }

  // Calculate accurate streak with break detection
  calculateStreakFromPlans(plans: WorkoutMealPlan[]): StreakInfo {
    const sortedPlans = plans.sort((a, b) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastWorkoutDate: Date | undefined;
    let streakBroken = false;
    let streakStartDate: Date | undefined;

    const today = new Date();
    const todayDayName = this.getTodayDayName();

    // Check each day up to today
    for (const plan of sortedPlans) {
      const isDayCompleted = this.isDayFullyCompleted(plan);
      
      if (isDayCompleted) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        lastWorkoutDate = plan.updated_at;
        
        if (!streakStartDate) {
          streakStartDate = plan.updated_at;
        }
        
        // If this is today or before today, count towards current streak
        if (plan.day === todayDayName || this.isDayBeforeToday(plan.day)) {
          currentStreak = tempStreak;
        }
      } else {
        // Streak broken
        if (tempStreak > 0) {
          streakBroken = true;
        }
        tempStreak = 0;
        streakStartDate = undefined;
        
        // If we haven't reached today yet, reset current streak
        if (this.isDayBeforeToday(plan.day) || plan.day === todayDayName) {
          currentStreak = 0;
        }
      }
    }

    return {
      currentStreak,
      longestStreak,
      lastWorkoutDate,
      streakBroken,
      streakStartDate
    };
  }

  private isDayFullyCompleted(plan: WorkoutMealPlan): boolean {
    if (!plan.exercises || plan.exercises.length === 0) return false;
    
    return plan.exercises.every(exercise => 
      plan.completed_status.exercises && plan.completed_status.exercises[exercise.id]
    );
  }

  private isDayBeforeToday(dayName: string): boolean {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    const dayIndex = days.indexOf(dayName);
    
    return dayIndex < today;
  }

  // Existing methods with enhanced functionality
  getExerciseRecommendations(): Observable<ApiResponse<{ recommendations: any[] }>> {
    return this.http.get<ApiResponse<{ recommendations: any[] }>>(
      `${this.apiUrl}/workouts/recommendations?week=${this.currentWeekNumber}`,
      { headers: this.getHeaders() }
    );
  }

  adjustWorkoutIntensity(): Observable<ApiResponse<{ plans: WorkoutMealPlan[] }>> {
    return this.http.post<ApiResponse<{ plans: WorkoutMealPlan[] }>>(
      `${this.apiUrl}/workouts/adjust-intensity`,
      { weekNumber: this.currentWeekNumber },
      { headers: this.getHeaders() }
    );
  }

  getWorkoutStatistics(): Observable<ApiResponse<{ statistics: any }>> {
    return this.http.get<ApiResponse<{ statistics: any }>>(
      `${this.apiUrl}/workouts/statistics?week=${this.currentWeekNumber}`,
      { headers: this.getHeaders() }
    );
  }

  resetWorkoutProgress(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/workouts/reset-progress`,
      { weekNumber: this.currentWeekNumber },
      { headers: this.getHeaders() }
    );
  }

  getProgressDashboard(): Observable<ApiResponse<{ dashboard: any }>> {
    return this.http.get<ApiResponse<{ dashboard: any }>>(
      `${this.apiUrl}/progress/dashboard?week=${this.currentWeekNumber}`,
      { headers: this.getHeaders() }
    );
  }

  getWeeklyReport(): Observable<ApiResponse<{ report: any }>> {
    return this.http.get<ApiResponse<{ report: any }>>(
      `${this.apiUrl}/progress/weekly-report?week=${this.currentWeekNumber}`,
      { headers: this.getHeaders() }
    );
  }

  getWorkoutStreak(): Observable<ApiResponse<{ streak: any }>> {
    return this.getStreakInfo();
  }

  getMuscleGroupProgress(): Observable<ApiResponse<{ muscleGroups: any[] }>> {
    return this.http.get<ApiResponse<{ muscleGroups: any[] }>>(
      `${this.apiUrl}/progress/muscle-groups?week=${this.currentWeekNumber}`,
      { headers: this.getHeaders() }
    );
  }
}