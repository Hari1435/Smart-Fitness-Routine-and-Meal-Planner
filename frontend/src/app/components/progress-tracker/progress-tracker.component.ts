import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { WorkoutService, WorkoutMealPlan, WeeklyProgress } from '../../services/workout.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

interface ProgressStats {
  totalWorkouts: number;
  completedWorkouts: number;
  completionRate: number;
  totalExercises: number;
  completedExercises: number;
  exerciseCompletionRate: number;
  currentStreak: number;
  longestStreak: number;
}

@Component({
  selector: 'app-progress-tracker',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule
  ],
  templateUrl: './progress-tracker.component.html',
  styleUrls: ['./progress-tracker.component.scss']
})
export class ProgressTrackerComponent implements OnInit {
  @ViewChild('weeklyChart', { static: false }) weeklyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('completionChart', { static: false }) completionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('muscleGroupChart', { static: false }) muscleGroupChartRef!: ElementRef<HTMLCanvasElement>;

  workoutPlans: WorkoutMealPlan[] = [];
  weeklyProgress: WeeklyProgress | null = null;
  progressStats: ProgressStats = {
    totalWorkouts: 0,
    completedWorkouts: 0,
    completionRate: 0,
    totalExercises: 0,
    completedExercises: 0,
    exerciseCompletionRate: 0,
    currentStreak: 0,
    longestStreak: 0
  };
  loading = false;

  private weeklyChart: Chart | null = null;
  private completionChart: Chart | null = null;
  private muscleGroupChart: Chart | null = null;

  constructor(
    private workoutService: WorkoutService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProgressData();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded
  }

  loadProgressData(): void {
    this.loading = true;

    // Load progress dashboard data
    this.workoutService.getProgressDashboard().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const dashboard = response.data.dashboard;
          this.progressStats = {
            totalWorkouts: dashboard.weeklyStats.totalWorkouts,
            completedWorkouts: dashboard.weeklyStats.completedWorkouts,
            completionRate: dashboard.overview.completionRate,
            totalExercises: dashboard.overview.totalExercises,
            completedExercises: dashboard.overview.completedExercises,
            exerciseCompletionRate: Math.round((dashboard.overview.completedExercises / dashboard.overview.totalExercises) * 100) || 0,
            currentStreak: dashboard.overview.currentStreak,
            longestStreak: 0, // Will be loaded separately
          };
          
          // Load workout plans for charts
          this.loadWorkoutPlans();
        } else {
          this.loadWorkoutPlans(); // Fallback to original method
        }
      },
      error: (error) => {
        this.loadWorkoutPlans(); // Fallback to original method
      }
    });
  }

  loadWorkoutPlans(): void {
    // Load workout plans
    this.workoutService.getUserPlans().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.workoutPlans = response.data.plans;
          if (this.progressStats.totalWorkouts === 0) {
            this.calculateProgressStats(); // Only if not loaded from dashboard
          }
          this.loadWeeklyProgress();
        } else {
          this.loading = false;
          this.snackBar.open('No workout data found. Please create a workout plan first.', 'Close', {
            duration: 3000
          });
        }
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Error loading progress data', 'Close', {
          duration: 3000
        });
      }
    });
  }

  loadWeeklyProgress(): void {
    this.workoutService.getWeeklyProgress().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.weeklyProgress = response.data.progress;
        }
        this.loading = false;
        setTimeout(() => this.createCharts(), 100);
      },
      error: (error) => {
        this.loading = false;
      }
    });
  }

  calculateProgressStats(): void {
    // Add null check to prevent errors
    if (!this.workoutPlans || !Array.isArray(this.workoutPlans)) {
      this.progressStats = {
        totalWorkouts: 0,
        completedWorkouts: 0,
        completionRate: 0,
        totalExercises: 0,
        completedExercises: 0,
        exerciseCompletionRate: 0,
        currentStreak: 0,
        longestStreak: 0
      };
      return;
    }

    const stats: ProgressStats = {
      totalWorkouts: this.workoutPlans.length,
      completedWorkouts: 0,
      completionRate: 0,
      totalExercises: 0,
      completedExercises: 0,
      exerciseCompletionRate: 0,
      currentStreak: 0,
      longestStreak: 0
    };

    this.workoutPlans.forEach(plan => {
      stats.totalExercises += plan.exercises.length;
      
      const completedExercises = plan.exercises.filter(ex => 
        plan.completed_status.exercises[ex.id]
      ).length;
      
      stats.completedExercises += completedExercises;
      
      if (completedExercises === plan.exercises.length && plan.exercises.length > 0) {
        stats.completedWorkouts++;
      }
    });

    stats.completionRate = stats.totalWorkouts > 0 ? 
      Math.round((stats.completedWorkouts / stats.totalWorkouts) * 100) : 0;
    
    stats.exerciseCompletionRate = stats.totalExercises > 0 ? 
      Math.round((stats.completedExercises / stats.totalExercises) * 100) : 0;

    // Calculate streaks (simplified - based on consecutive completed days)
    stats.currentStreak = this.calculateCurrentStreak();
    stats.longestStreak = this.calculateLongestStreak();

    this.progressStats = stats;
  }

  calculateCurrentStreak(): number {
    // Add null check to prevent errors
    if (!this.workoutPlans || !Array.isArray(this.workoutPlans)) {
      return 0;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date().getDay();
    let streak = 0;

    // Start from today and go backwards
    for (let i = 0; i < 7; i++) {
      const dayIndex = (today - 1 - i + 7) % 7; // -1 because Sunday is 0, but we want Monday as 0
      const dayName = days[dayIndex];
      const plan = this.workoutPlans.find(p => p.day === dayName);
      
      if (plan && this.isDayCompleted(plan)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  calculateLongestStreak(): number {
    // Add null check to prevent errors
    if (!this.workoutPlans || !Array.isArray(this.workoutPlans)) {
      return 0;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let longestStreak = 0;
    let currentStreak = 0;

    days.forEach(day => {
      const plan = this.workoutPlans.find(p => p.day === day);
      if (plan && this.isDayCompleted(plan)) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return longestStreak;
  }

  isDayCompleted(plan: WorkoutMealPlan): boolean {
    if (plan.exercises.length === 0) return false;
    return plan.exercises.every(ex => plan.completed_status.exercises[ex.id]);
  }

  createCharts(): void {
    this.createWeeklyChart();
    this.createCompletionChart();
    this.createMuscleGroupChart();
  }

  createWeeklyChart(): void {
    if (!this.weeklyChartRef) return;

    const ctx = this.weeklyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const completionData = days.map(day => {
      const fullDay = day === 'Mon' ? 'Monday' : 
                     day === 'Tue' ? 'Tuesday' :
                     day === 'Wed' ? 'Wednesday' :
                     day === 'Thu' ? 'Thursday' :
                     day === 'Fri' ? 'Friday' :
                     day === 'Sat' ? 'Saturday' : 'Sunday';
      
      // Add null check to prevent errors
      if (!this.workoutPlans || !Array.isArray(this.workoutPlans)) {
        return 0;
      }
      
      const plan = this.workoutPlans.find(p => p.day === fullDay);
      return plan ? this.workoutService.calculateCompletionPercentage(plan) : 0;
    });

    const config: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: days,
        datasets: [{
          label: 'Completion %',
          data: completionData,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    };

    if (this.weeklyChart) {
      this.weeklyChart.destroy();
    }
    this.weeklyChart = new Chart(ctx, config);
  }

  createCompletionChart(): void {
    if (!this.completionChartRef) return;

    const ctx = this.completionChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'doughnut' as ChartType,
      data: {
        labels: ['Completed', 'Remaining'],
        datasets: [{
          data: [this.progressStats.completedExercises, this.progressStats.totalExercises - this.progressStats.completedExercises],
          backgroundColor: ['#4CAF50', '#E0E0E0'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };

    if (this.completionChart) {
      this.completionChart.destroy();
    }
    this.completionChart = new Chart(ctx, config);
  }

  createMuscleGroupChart(): void {
    if (!this.muscleGroupChartRef) return;

    const ctx = this.muscleGroupChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Count exercises by muscle group
    const muscleGroups: { [key: string]: number } = {};
    
    // Add null check to prevent errors
    if (this.workoutPlans && Array.isArray(this.workoutPlans)) {
      this.workoutPlans.forEach(plan => {
        plan.exercises.forEach(exercise => {
          const group = exercise.muscle_group || 'Other';
          muscleGroups[group] = (muscleGroups[group] || 0) + 1;
        });
      });
    }

    const labels = Object.keys(muscleGroups);
    const data = Object.values(muscleGroups);
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];

    const config: ChartConfiguration = {
      type: 'pie' as ChartType,
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };

    if (this.muscleGroupChart) {
      this.muscleGroupChart.destroy();
    }
    this.muscleGroupChart = new Chart(ctx, config);
  }

  navigateToWorkouts(): void {
    this.router.navigate(['/workouts']);
  }

  refreshData(): void {
    this.loadProgressData();
  }

  ngOnDestroy(): void {
    if (this.weeklyChart) {
      this.weeklyChart.destroy();
    }
    if (this.completionChart) {
      this.completionChart.destroy();
    }
    if (this.muscleGroupChart) {
      this.muscleGroupChart.destroy();
    }
  }

  getStreakArray(streak: number): number[] {
    return Array(Math.min(streak, 7)).fill(0);
  }

  // Enhanced features methods
  loadWeeklyReport(): void {
    this.workoutService.getWeeklyReport().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const report = response.data.report;
          
          if (report.achievements && report.achievements.length > 0) {
            this.snackBar.open(`🎉 ${report.achievements[0]}`, 'Close', {
              duration: 4000
            });
          }
        }
      },
      error: (error) => {
        // Silent error handling
      }
    });
  }

  loadMuscleGroupProgress(): void {
    this.workoutService.getMuscleGroupProgress().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const muscleGroups = response.data.muscleGroups;
          // Update muscle group chart with enhanced data
          setTimeout(() => this.createEnhancedMuscleGroupChart(muscleGroups), 100);
        }
      },
      error: (error) => {
        // Silent error handling
      }
    });
  }

  loadWorkoutStreak(): void {
    this.workoutService.getWorkoutStreak().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const streak = response.data.streak;
          this.progressStats.currentStreak = streak.currentStreak;
          this.progressStats.longestStreak = streak.longestStreak;
          
          // Show streak information
          this.snackBar.open(`🔥 Current streak: ${streak.currentStreak} days! Best: ${streak.longestStreak} days`, 'Close', {
            duration: 4000
          });
        }
      },
      error: (error) => {
        // Silent error handling
      }
    });
  }

  getWorkoutStatistics(): void {
    this.workoutService.getWorkoutStatistics().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const stats = response.data.statistics;
          
          // Update progress stats with enhanced data
          this.progressStats = {
            ...this.progressStats,
            totalWorkouts: stats.totalDays || this.progressStats.totalWorkouts,
            completedWorkouts: stats.completedDays || this.progressStats.completedWorkouts,
            completionRate: stats.completionPercentage || this.progressStats.completionRate,
            currentStreak: stats.currentStreak || this.progressStats.currentStreak,
            longestStreak: stats.longestStreak || this.progressStats.longestStreak
          };
          
          // Recreate charts with updated data
          setTimeout(() => this.createCharts(), 100);
        }
      },
      error: (error) => {
        // Silent error handling
      }
    });
  }

  // Enhanced muscle group chart with backend data
  createEnhancedMuscleGroupChart(muscleGroups: any[]): void {
    if (!this.muscleGroupChartRef) return;

    const ctx = this.muscleGroupChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = muscleGroups.map(mg => mg.muscleGroup);
    const data = muscleGroups.map(mg => mg.total);
    const completionData = muscleGroups.map(mg => mg.completed);
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];

    const config: ChartConfiguration = {
      type: 'doughnut' as ChartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Exercises',
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#fff'
          },
          {
            label: 'Completed Exercises',
            data: completionData,
            backgroundColor: colors.slice(0, labels.length).map(color => color + '80'), // Add transparency
            borderWidth: 1,
            borderColor: '#fff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const muscleGroup = muscleGroups[context.dataIndex];
                return `${context.label}: ${context.parsed} (${muscleGroup.percentage}% complete)`;
              }
            }
          }
        }
      }
    };

    if (this.muscleGroupChart) {
      this.muscleGroupChart.destroy();
    }
    this.muscleGroupChart = new Chart(ctx, config);
  }

  // Show weekly report in UI
  showWeeklyReport(): void {
    this.loadWeeklyReport();
  }

  // Show muscle group details
  showMuscleGroupDetails(): void {
    this.loadMuscleGroupProgress();
  }

  // Show streak details
  showStreakDetails(): void {
    this.loadWorkoutStreak();
  }
}