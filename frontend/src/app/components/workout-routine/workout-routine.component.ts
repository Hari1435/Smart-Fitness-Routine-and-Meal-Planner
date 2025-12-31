import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkoutService, WorkoutMealPlan, Exercise } from '../../services/workout.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

// Progress Info Dialog Component
@Component({
  selector: 'app-progress-info-dialog',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <mat-card class="progress-info-card">
      <mat-card-header>
        <mat-card-title class="progress-title">
          <mat-icon>assessment</mat-icon>
          {{ data.title }}
        </mat-card-title>
        <button mat-icon-button (click)="close()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </mat-card-header>
      
      <mat-card-content class="progress-content">
        <div class="progress-stats">
          <div class="stat-item">
            <div class="stat-value">{{ data.completedExercises }}/{{ data.totalExercises }}</div>
            <div class="stat-label">exercises completed</div>
            <mat-progress-bar 
              mode="determinate" 
              [value]="(data.completedExercises / data.totalExercises) * 100"
              class="stat-progress">
            </mat-progress-bar>
          </div>
          
          <div class="stat-item">
            <div class="stat-value">{{ data.completedDays }}/{{ data.totalDays }}</div>
            <div class="stat-label">days completed</div>
            <mat-progress-bar 
              mode="determinate" 
              [value]="(data.completedDays / data.totalDays) * 100"
              class="stat-progress">
            </mat-progress-bar>
          </div>
          
          <div class="stat-item" *ngIf="data.currentStreak !== undefined">
            <div class="stat-value">{{ data.currentStreak }}</div>
            <div class="stat-label">day streak</div>
          </div>
          
          <div class="stat-item" *ngIf="data.weekNumber">
            <div class="stat-value">Week {{ data.weekNumber }}</div>
            <div class="stat-label">current week</div>
          </div>
        </div>
        
        <div class="progress-message" *ngIf="data.message">
          {{ data.message }}
        </div>
      </mat-card-content>
      
      <mat-card-actions class="progress-actions">
        <button mat-raised-button color="primary" (click)="close()">Close</button>
        <button mat-button *ngIf="data.showViewProgress" (click)="viewProgress()">View Detailed Progress</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .progress-info-card {
      min-width: 400px;
      max-width: 500px;
      margin: 0;
    }
    
    .progress-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    
    .close-btn {
      margin-left: auto;
    }
    
    .progress-content {
      padding: 16px 0;
    }
    
    .progress-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 16px;
    }
    
    .stat-item {
      text-align: center;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    
    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 8px;
    }
    
    .stat-progress {
      height: 6px;
      border-radius: 3px;
    }
    
    .progress-message {
      padding: 12px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
    }
    
    .progress-actions {
      display: flex;
      justify-content: space-between;
      padding: 16px;
    }
  `]
})
export class ProgressInfoDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ProgressInfoDialogComponent>,
    private router: Router
  ) {}
  
  close(): void {
    this.dialogRef.close();
  }
  
  viewProgress(): void {
    this.dialogRef.close();
    this.router.navigate(['/progress']);
  }
}

@Component({
  selector: 'app-workout-routine',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatCheckboxModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  templateUrl: './workout-routine.component.html',
  styleUrls: ['./workout-routine.component.scss']
})
export class WorkoutRoutineComponent implements OnInit {
  workoutPlans: WorkoutMealPlan[] = [];
  selectedDay: string = '';
  currentPlan: WorkoutMealPlan | null = null;
  loading = false;
  todayDay: string = '';
  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(
    private workoutService: WorkoutService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Ensure workoutPlans is always initialized as an array
    this.workoutPlans = this.workoutPlans || [];
    
    this.todayDay = this.workoutService.getTodayDayName();
    this.selectedDay = this.todayDay;
    
    // Check for weekly reset and show notification if needed
    this.checkWeeklyReset();
    
    this.loadWorkoutPlans();
  }

  // Check if a new week has started
  private checkWeeklyReset(): void {
    const currentWeekInfo = this.workoutService.getCurrentWeekInfo();
    const lastWeekNumber = localStorage.getItem('lastDisplayedWeek');
    
    if (lastWeekNumber && parseInt(lastWeekNumber) !== currentWeekInfo.weekNumber) {
      this.showWeeklyResetNotification(currentWeekInfo);
    }
    
    localStorage.setItem('lastDisplayedWeek', currentWeekInfo.weekNumber.toString());
  }

  // Show weekly reset notification
  private showWeeklyResetNotification(weekInfo: any): void {
    this.snackBar.open(
      `🗓️ New week started! Week ${weekInfo.weekNumber} - Fresh start for your fitness goals!`, 
      'View Archive', 
      { duration: 6000 }
    ).onAction().subscribe(() => {
      this.showArchivedWeeks();
    });
  }

  // Show archived weeks progress
  showArchivedWeeks(): void {
    this.workoutService.getArchivedWeeks(5).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const archives = response.data.archives;
          
          if (archives.length > 0) {
            // Show archived weeks in dialog
            this.dialog.open(ProgressInfoDialogComponent, {
              width: '600px',
              data: {
                title: 'Previous Weeks Progress',
                completedExercises: archives.reduce((sum, arch) => sum + arch.completedExercises, 0),
                totalExercises: archives.reduce((sum, arch) => sum + arch.totalExercises, 0),
                completedDays: archives.length,
                totalDays: archives.length,
                message: `Your progress over the last ${archives.length} weeks:\n` +
                        archives.map(arch => 
                          `Week ${arch.weekNumber}: ${arch.completionPercentage}% completed`
                        ).join('\n'),
                showViewProgress: true
              }
            });
          } else {
            this.snackBar.open('No archived weeks found', 'Close', { duration: 3000 });
          }
        }
      },
      error: (error) => {
        this.snackBar.open('Error loading archived weeks', 'Close', { duration: 3000 });
      }
    });
  }

  loadWorkoutPlans(): void {
    // Check if user is authenticated first
    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('Please log in to access your workout plans', 'Go to Login', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/unauthorized']);
      });
      this.loading = false;
      return;
    }

    this.loading = true;
    this.workoutService.getUserPlans().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.plans) {
          this.workoutPlans = Array.isArray(response.data.plans) ? response.data.plans : [];
          this.workoutService.updatePlansCache(this.workoutPlans);
          this.selectDay(this.selectedDay);
        } else {
          // Ensure workoutPlans is always an array
          this.workoutPlans = [];
          this.generateDefaultPlans();
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        
        // Ensure workoutPlans is always an array to prevent undefined errors
        if (!this.workoutPlans) {
          this.workoutPlans = [];
        }
        
        if (error.status === 401) {
          this.snackBar.open('Please log in to access your workout plans', 'Go to Login', {
            duration: 5000
          }).onAction().subscribe(() => {
            this.router.navigate(['/unauthorized']);
          });
        } else {
          this.generateDefaultPlans();
        }
      }
    });
  }

  generateDefaultPlans(): void {
    // Check if user is authenticated first
    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('Please log in to generate workout plans', 'Go to Login', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/unauthorized']);
      });
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user || !user.goal) {
      this.snackBar.open('Please set your fitness goal in your profile first', 'Close', {
        duration: 3000
      });
      return;
    }

    this.loading = true;
    this.workoutService.generateDefaultPlans(user.goal).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Personalized workout routine generated!', 'Close', {
            duration: 3000
          });
          this.loadWorkoutPlans();
        }
      },
      error: (error) => {
        this.loading = false;
        
        if (error.status === 401) {
          this.snackBar.open('Please log in to generate workout routines', 'Go to Login', {
            duration: 5000
          }).onAction().subscribe(() => {
            this.router.navigate(['/unauthorized']);
          });
        } else {
          this.snackBar.open('Error generating workout routine. Please try again.', 'Close', {
            duration: 3000
          });
        }
      }
    });
  }

  selectDay(day: string): void {
    this.selectedDay = day;
    // Add null check to prevent "Cannot read properties of undefined" error
    if (this.workoutPlans && Array.isArray(this.workoutPlans)) {
      this.currentPlan = this.workoutPlans.find(plan => plan.day === day) || null;
    } else {
      this.currentPlan = null;
    }
  }

  toggleExerciseCompletion(exercise: Exercise): void {
    if (!this.currentPlan) return;

    const isCompleted = this.currentPlan.completed_status.exercises[exercise.id];
    
    // Check if exercise completion is locked (cannot be reverted)
    if (isCompleted && this.workoutService.isExerciseCompletionLocked(this.currentPlan, exercise.id)) {
      this.snackBar.open('Exercise completion is locked and cannot be reverted', 'Close', {
        duration: 3000
      });
      return;
    }
    
    // Only allow marking as complete, not reverting (unless within lock period)
    if (isCompleted && !this.workoutService.isExerciseCompletionLocked(this.currentPlan, exercise.id)) {
      this.snackBar.open('Completed exercises cannot be unmarked to maintain progress integrity', 'Close', {
        duration: 3000
      });
      return;
    }

    this.workoutService.updateCompletedStatus(this.selectedDay, {
      exercise_id: exercise.id,
      completed: !isCompleted
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Update local plan with null check
          if (this.workoutPlans && Array.isArray(this.workoutPlans)) {
            const planIndex = this.workoutPlans.findIndex(p => p.day === this.selectedDay);
            if (planIndex !== -1) {
              this.workoutPlans[planIndex] = response.data.plan;
              this.currentPlan = response.data.plan;
              this.workoutService.updatePlansCache(this.workoutPlans);
            }
          }
          
          const message = !isCompleted ? 
            '🎉 Exercise completed! Great job!' : 
            'Exercise marked as incomplete';
          this.snackBar.open(message, 'Close', { duration: 2000 });

          // Check if day is fully completed for streak tracking
          this.checkDayCompletion();
        }
      },
      error: (error) => {
        this.snackBar.open('Error updating exercise status', 'Close', {
          duration: 3000
        });
      }
    });
  }

  // Check if current day is fully completed
  private checkDayCompletion(): void {
    if (!this.currentPlan) return;

    const completionPercentage = this.getCompletionPercentage(this.currentPlan);
    if (completionPercentage === 100) {
      this.snackBar.open('🔥 Day completed! Streak continues!', 'View Progress', {
        duration: 4000
      }).onAction().subscribe(() => {
        this.navigateToProgress();
      });
      
      // Update streak info
      this.updateStreakInfo();
    }
  }

  // Update streak information
  private updateStreakInfo(): void {
    this.workoutService.getStreakInfo().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const streak = response.data.streak;
          if (streak.currentStreak > 1) {
            setTimeout(() => {
              this.snackBar.open(`🔥 ${streak.currentStreak} day streak! Keep it up!`, 'Close', {
                duration: 3000
              });
            }, 2000);
          }
        }
      },
      error: (error) => {
        // Silent error handling for streak info
      }
    });
  }

  isExerciseCompleted(exercise: Exercise): boolean {
    return this.currentPlan?.completed_status.exercises[exercise.id] || false;
  }

  getCompletionPercentage(plan: WorkoutMealPlan): number {
    if (!plan) return 0;
    return this.workoutService.calculateCompletionPercentage(plan);
  }

  getDayCompletionCount(day: string): { completed: number; total: number } {
    // Add null check to prevent "Cannot read properties of undefined" error
    if (!this.workoutPlans || !Array.isArray(this.workoutPlans)) {
      return { completed: 0, total: 0 };
    }
    
    const plan = this.workoutPlans.find(p => p.day === day);
    if (!plan || !plan.exercises || !Array.isArray(plan.exercises) || !plan.completed_status) {
      return { completed: 0, total: 0 };
    }

    const completedExercises = plan.exercises.filter(ex => 
      plan.completed_status.exercises && plan.completed_status.exercises[ex.id]
    ).length;
    
    return {
      completed: completedExercises,
      total: plan.exercises.length
    };
  }

  getMuscleGroupColor(muscleGroup: string): string {
    const colors: { [key: string]: string } = {
      'chest': '#FF6B6B',
      'back': '#4ECDC4',
      'legs': '#45B7D1',
      'shoulders': '#96CEB4',
      'arms': '#FFEAA7',
      'core': '#DDA0DD',
      'cardio': '#98D8C8',
      'full_body': '#F7DC6F',
      'cardiovascular': '#85C1E9',
      'flexibility': '#F8C471'
    };
    return colors[muscleGroup?.toLowerCase()] || '#B0BEC5';
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  isToday(day: string): boolean {
    return day === this.todayDay;
  }

  navigateToProgress(): void {
    this.router.navigate(['/progress']);
  }

  trackByExerciseId(index: number, exercise: Exercise): string {
    return exercise.id;
  }

  // Enhanced methods for better progress tracking
  adjustWorkoutIntensity(): void {
    this.loading = true;
    this.workoutService.adjustWorkoutIntensity().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.workoutPlans = response.data.plans;
          this.workoutService.updatePlansCache(this.workoutPlans);
          this.selectDay(this.selectedDay);
          this.snackBar.open('Workout intensity adjusted based on your progress!', 'Close', {
            duration: 3000
          });
        }
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open('Error adjusting workout intensity', 'Close', {
          duration: 3000
        });
        this.loading = false;
      }
    });
  }

  getWeeklyOverview(): void {
    const weekInfo = this.workoutService.getCurrentWeekInfo();
    this.workoutService.getWeeklyProgress().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const progress = response.data.progress;
          
          // Show progress in dialog
          this.dialog.open(ProgressInfoDialogComponent, {
            width: '500px',
            data: {
              title: `Week ${weekInfo.weekNumber} Progress`,
              completedExercises: progress.completedExercises,
              totalExercises: progress.totalExercises,
              completedDays: progress.completedDays,
              totalDays: progress.totalDays,
              weekNumber: weekInfo.weekNumber,
              message: `Keep up the great work! You're ${Math.round((progress.completedExercises / progress.totalExercises) * 100)}% through this week's exercises.`,
              showViewProgress: true
            }
          });
        }
      },
      error: (error) => {
        this.snackBar.open('Error loading weekly progress', 'Close', { duration: 3000 });
      }
    });
  }

  // Check if exercise can be unmarked (within lock period)
  canUnmarkExercise(exercise: Exercise): boolean {
    if (!this.currentPlan) return false;
    
    const isCompleted = this.currentPlan.completed_status.exercises[exercise.id];
    if (!isCompleted) return true; // Can always mark as complete
    
    return !this.workoutService.isExerciseCompletionLocked(this.currentPlan, exercise.id);
  }

  // Get exercise completion status with lock info
  getExerciseStatus(exercise: Exercise): { completed: boolean; locked: boolean; lockTimeRemaining?: string } {
    if (!this.currentPlan) return { completed: false, locked: false };
    
    const completed = this.currentPlan.completed_status.exercises[exercise.id] || false;
    const locked = completed && this.workoutService.isExerciseCompletionLocked(this.currentPlan, exercise.id);
    
    let lockTimeRemaining: string | undefined;
    if (locked && this.currentPlan.completed_status.completion_locked) {
      const lockDate = this.currentPlan.completed_status.completion_locked[exercise.id];
      if (lockDate) {
        const lockTime = new Date(lockDate).getTime();
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const remaining = twentyFourHours - (now - lockTime);
        
        if (remaining > 0) {
          const hours = Math.floor(remaining / (60 * 60 * 1000));
          const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
          lockTimeRemaining = `${hours}h ${minutes}m`;
        }
      }
    }
    
    return { completed, locked, lockTimeRemaining };
  }

  getExerciseRecommendations(): void {
    this.workoutService.getExerciseRecommendations().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Show recommendations in a dialog or snackbar
          const recommendations = response.data.recommendations;
          if (recommendations.length > 0) {
            this.snackBar.open(`Recommended: ${recommendations[0].name}`, 'Close', {
              duration: 5000
            });
          }
        }
      },
      error: (error) => {
        // Silent error handling for recommendations
      }
    });
  }

  resetProgress(): void {
    if (confirm('Are you sure you want to reset all workout progress? This cannot be undone.')) {
      this.workoutService.resetWorkoutProgress().subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Workout progress reset successfully', 'Close', {
              duration: 3000
            });
            this.loadWorkoutPlans();
          }
        },
        error: (error) => {
          this.snackBar.open('Error resetting progress', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  getWorkoutStreak(): void {
    this.workoutService.getWorkoutStreak().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const streak = response.data.streak;
          
          // Show streak info in dialog
          this.dialog.open(ProgressInfoDialogComponent, {
            width: '450px',
            data: {
              title: 'Workout Streak',
              currentStreak: streak.currentStreak,
              longestStreak: streak.longestStreak,
              completedExercises: 0, // Not applicable for streak
              totalExercises: 1, // To avoid division by zero
              completedDays: streak.currentStreak,
              totalDays: streak.longestStreak || streak.currentStreak,
              message: streak.currentStreak > 0 ? 
                `🔥 Amazing! You're on a ${streak.currentStreak} day streak! Your best was ${streak.longestStreak} days.` :
                `Start your streak today! Your best streak was ${streak.longestStreak} days.`,
              showViewProgress: true
            }
          });
        }
      },
      error: (error) => {
        this.snackBar.open('Error loading streak information', 'Close', { duration: 3000 });
      }
    });
  }

  // Show current week info
  showCurrentWeekInfo(): void {
    const weekInfo = this.workoutService.getCurrentWeekInfo();
    const startDate = weekInfo.startDate.toLocaleDateString();
    const endDate = weekInfo.endDate.toLocaleDateString();
    
    this.snackBar.open(
      `📅 Week ${weekInfo.weekNumber}: ${startDate} - ${endDate}`, 
      'Close', 
      { duration: 4000 }
    );
  }
}