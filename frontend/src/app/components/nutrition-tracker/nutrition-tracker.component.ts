import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
import { MatSelectModule } from '@angular/material/select';
import { MealService, DailyMealPlan, NutritionProgress, WeeklyNutritionSummary } from '../../services/meal.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

interface NutritionStats {
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  calorieGoalDays: number;
  proteinGoalDays: number;
  currentStreak: number;
  longestStreak: number;
  totalMealsConsumed: number;
  totalMealsPlanned: number;
}

@Component({
  selector: 'app-nutrition-tracker',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  templateUrl: './nutrition-tracker.component.html',
  styleUrls: ['./nutrition-tracker.component.scss']
})
export class NutritionTrackerComponent implements OnInit, OnDestroy {
  @ViewChild('calorieChart', { static: false }) calorieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('macroChart', { static: false }) macroChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('weeklyChart', { static: false }) weeklyChartRef!: ElementRef<HTMLCanvasElement>;

  weeklyPlans: DailyMealPlan[] = [];
  todayProgress: NutritionProgress | null = null;
  weeklyNutritionSummary: WeeklyNutritionSummary | null = null;
  nutritionStats: NutritionStats = {
    averageCalories: 0,
    averageProtein: 0,
    averageCarbs: 0,
    averageFat: 0,
    calorieGoalDays: 0,
    proteinGoalDays: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalMealsConsumed: 0,
    totalMealsPlanned: 0
  };
  loading = false;
  selectedPeriod = 'week';

  private calorieChart: Chart | null = null;
  private macroChart: Chart | null = null;
  private weeklyChart: Chart | null = null;
  private mealPlanSubscription: Subscription | null = null;

  constructor(
    private mealService: MealService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/unauthorized']);
      return;
    }

    this.loadNutritionData();
    
    // Subscribe to meal plan updates
    this.mealPlanSubscription = this.mealService.currentMealPlan$.subscribe(plan => {
      if (plan) {
        // Refresh nutrition data when meal plan is updated
        setTimeout(() => this.loadNutritionData(), 500); // Small delay to ensure data is updated
      }
    });
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded
  }

  loadNutritionData(): void {
    this.loading = true;

    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('Please log in to view nutrition data', 'Login', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/unauthorized']);
      });
      this.loading = false;
      return;
    }

    // Load real meal plans from backend
    this.mealService.getMealPlansForWeek().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.plans) {
          this.processRealMealData(response.data.plans);
          
          // Also get meal progress from backend for more accurate data
          this.mealService.getMealProgress().subscribe({
            next: (progressResponse) => {
              if (progressResponse.success && progressResponse.data) {
                this.updateWithBackendProgress(progressResponse.data.progress);
              }
              this.calculateNutritionStats();
              this.loading = false;
              setTimeout(() => this.createCharts(), 100);
            },
            error: (error) => {
              this.calculateNutritionStats();
              this.loading = false;
              setTimeout(() => this.createCharts(), 100);
            }
          });
        } else {
          // No meal plans found, generate mock data for demo
          this.generateMockNutritionData();
          this.calculateNutritionStats();
          this.loading = false;
          setTimeout(() => this.createCharts(), 100);
        }
      },
      error: (error) => {
        if (error.status === 401) {
          this.snackBar.open('Please log in to view nutrition data', 'Login', {
            duration: 5000
          }).onAction().subscribe(() => {
            this.router.navigate(['/unauthorized']);
          });
        } else {
          // Fallback to mock data if API fails
          this.snackBar.open('Using demo data. Please check your connection.', 'Close', {
            duration: 3000
          });
          this.generateMockNutritionData();
          this.calculateNutritionStats();
        }
        
        this.loading = false;
        setTimeout(() => this.createCharts(), 100);
      }
    });
  }

  processRealMealData(plans: any[]): void {
    // Convert backend meal plans to frontend format
    this.weeklyPlans = [];
    const today = new Date();
    
    // Create a map of existing plans by day
    const plansByDay: { [key: string]: any } = {};
    plans.forEach(plan => {
      plansByDay[plan.day] = plan;
    });

    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = this.mealService.formatDate(date);
      const dayName = this.getDayName(date);
      
      let dailyPlan: DailyMealPlan;
      
      if (plansByDay[dayName]) {
        // Convert backend plan to frontend format
        dailyPlan = this.convertBackendToFrontend(plansByDay[dayName], dateStr);
      } else {
        // Generate mock plan for missing days
        const user = this.authService.getCurrentUser();
        const goal = user?.goal || 'maintenance';
        dailyPlan = this.mealService.generateMockMealPlan(dateStr, goal);
      }
      
      this.weeklyPlans.push(dailyPlan);
    }

    // Get today's progress
    const todayPlan = this.weeklyPlans[this.weeklyPlans.length - 1];
    this.todayProgress = this.mealService.calculateDayProgress(todayPlan);

    // Generate weekly summary
    this.weeklyNutritionSummary = {
      totalDays: 7,
      averageCalories: this.weeklyPlans.reduce((sum, plan) => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.calories, 0);
        return sum + consumed;
      }, 0) / 7,
      averageProtein: this.weeklyPlans.reduce((sum, plan) => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.protein, 0);
        return sum + consumed;
      }, 0) / 7,
      averageCarbs: this.weeklyPlans.reduce((sum, plan) => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.carbs, 0);
        return sum + consumed;
      }, 0) / 7,
      averageFat: this.weeklyPlans.reduce((sum, plan) => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.fat, 0);
        return sum + consumed;
      }, 0) / 7,
      calorieGoalDays: this.weeklyPlans.filter(plan => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.calories, 0);
        return consumed >= plan.target_calories * 0.8 && consumed <= plan.target_calories * 1.2;
      }).length,
      proteinGoalDays: this.weeklyPlans.filter(plan => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.protein, 0);
        return consumed >= plan.target_protein * 0.8;
      }).length,
      streak: this.calculateCurrentStreak()
    };
  }

  // Helper method to get day name from date
  getDayName(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  // Helper method to convert backend meal plan format to frontend format
  convertBackendToFrontend(backendPlan: any, dateStr: string): DailyMealPlan {
    // Convert backend meals to frontend format with proper nutrition data
    const frontendMeals = backendPlan.meals.map((meal: any) => ({
      id: meal.id,
      name: meal.name,
      type: meal.type,
      calories: meal.calories,
      protein: meal.protein || 0,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      fiber: 5, // Default fiber value
      consumed: backendPlan.completed_status?.meals?.[meal.id] || false,
      consumed_at: backendPlan.completed_status?.meals?.[meal.id] ? new Date() : undefined,
      foods: meal.foods || []
    }));

    // Calculate totals from all meals (not just consumed ones)
    const totalCalories = frontendMeals.reduce((sum: number, meal: any) => sum + meal.calories, 0);
    const totalProtein = frontendMeals.reduce((sum: number, meal: any) => sum + meal.protein, 0);
    const totalCarbs = frontendMeals.reduce((sum: number, meal: any) => sum + meal.carbs, 0);
    const totalFat = frontendMeals.reduce((sum: number, meal: any) => sum + meal.fat, 0);
    const totalFiber = frontendMeals.reduce((sum: number, meal: any) => sum + meal.fiber, 0);

    // Use the total planned nutrition as targets (this represents the full day's plan)
    return {
      id: backendPlan.id,
      user_id: backendPlan.user_id || 1,
      date: dateStr,
      meals: frontendMeals,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      total_fiber: totalFiber,
      target_calories: totalCalories, // Use planned calories as target
      target_protein: totalProtein,   // Use planned protein as target
      target_carbs: totalCarbs,       // Use planned carbs as target
      target_fat: totalFat,           // Use planned fat as target
      created_at: new Date(backendPlan.created_at),
      updated_at: new Date(backendPlan.updated_at)
    };
  }

  updateWithBackendProgress(backendProgress: any): void {
    // Update nutrition stats with real backend data
    if (backendProgress) {
      this.nutritionStats.totalMealsConsumed = backendProgress.consumedMeals || this.nutritionStats.totalMealsConsumed;
      this.nutritionStats.totalMealsPlanned = backendProgress.totalMeals || this.nutritionStats.totalMealsPlanned;
      
      // Update weekly summary with backend data if available
      if (this.weeklyNutritionSummary && backendProgress.nutritionBreakdown) {
        this.weeklyNutritionSummary.averageProtein = backendProgress.nutritionBreakdown.protein?.consumed || this.weeklyNutritionSummary.averageProtein;
        this.weeklyNutritionSummary.averageCarbs = backendProgress.nutritionBreakdown.carbs?.consumed || this.weeklyNutritionSummary.averageCarbs;
        this.weeklyNutritionSummary.averageFat = backendProgress.nutritionBreakdown.fat?.consumed || this.weeklyNutritionSummary.averageFat;
      }
    }
  }

  generateMockNutritionData(): void {
    const user = this.authService.getCurrentUser();
    const goal = user?.goal || 'maintenance';
    
    // Generate weekly plans
    this.weeklyPlans = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = this.mealService.formatDate(date);
      
      const plan = this.mealService.generateMockMealPlan(dateStr, goal);
      
      // Simulate some meals as consumed
      plan.meals.forEach((meal, index) => {
        if (Math.random() > 0.3) { // 70% chance of being consumed
          meal.consumed = true;
          meal.consumed_at = new Date(date.getTime() + (index * 2 + 8) * 60 * 60 * 1000); // Spread throughout the day
        }
      });
      
      this.weeklyPlans.push(plan);
    }

    // Get today's progress
    const todayPlan = this.weeklyPlans[this.weeklyPlans.length - 1];
    this.todayProgress = this.mealService.calculateDayProgress(todayPlan);

    // Generate weekly summary
    this.weeklyNutritionSummary = {
      totalDays: 7,
      averageCalories: this.weeklyPlans.reduce((sum, plan) => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.calories, 0);
        return sum + consumed;
      }, 0) / 7,
      averageProtein: this.weeklyPlans.reduce((sum, plan) => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.protein, 0);
        return sum + consumed;
      }, 0) / 7,
      averageCarbs: this.weeklyPlans.reduce((sum, plan) => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.carbs, 0);
        return sum + consumed;
      }, 0) / 7,
      averageFat: this.weeklyPlans.reduce((sum, plan) => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.fat, 0);
        return sum + consumed;
      }, 0) / 7,
      calorieGoalDays: this.weeklyPlans.filter(plan => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.calories, 0);
        return consumed >= plan.target_calories * 0.8 && consumed <= plan.target_calories * 1.2;
      }).length,
      proteinGoalDays: this.weeklyPlans.filter(plan => {
        const consumed = plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.protein, 0);
        return consumed >= plan.target_protein * 0.8;
      }).length,
      streak: this.calculateCurrentStreak()
    };
  }

  calculateNutritionStats(): void {
    if (!this.weeklyNutritionSummary) return;

    this.nutritionStats = {
      averageCalories: Math.round(this.weeklyNutritionSummary.averageCalories),
      averageProtein: Math.round(this.weeklyNutritionSummary.averageProtein),
      averageCarbs: Math.round(this.weeklyNutritionSummary.averageCarbs),
      averageFat: Math.round(this.weeklyNutritionSummary.averageFat),
      calorieGoalDays: this.weeklyNutritionSummary.calorieGoalDays,
      proteinGoalDays: this.weeklyNutritionSummary.proteinGoalDays,
      currentStreak: this.weeklyNutritionSummary.streak,
      longestStreak: Math.max(this.weeklyNutritionSummary.streak, 5), // Mock longest streak
      totalMealsConsumed: this.weeklyPlans.reduce((total, plan) => 
        total + plan.meals.filter(m => m.consumed).length, 0),
      totalMealsPlanned: this.weeklyPlans.reduce((total, plan) => 
        total + plan.meals.length, 0)
    };
  }

  calculateCurrentStreak(): number {
    let streak = 0;
    for (let i = this.weeklyPlans.length - 1; i >= 0; i--) {
      const plan = this.weeklyPlans[i];
      const consumedMeals = plan.meals.filter(m => m.consumed).length;
      const totalMeals = plan.meals.length;
      
      if (consumedMeals >= totalMeals * 0.75) { // 75% of meals consumed
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  createCharts(): void {
    this.createCalorieChart();
    this.createMacroChart();
    this.createWeeklyChart();
  }

  createCalorieChart(): void {
    if (!this.calorieChartRef || !this.todayProgress) return;

    const ctx = this.calorieChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const consumed = this.todayProgress.consumed.calories;
    const target = this.todayProgress.targets.calories;
    const remaining = Math.max(0, target - consumed);

    const config: ChartConfiguration = {
      type: 'doughnut' as ChartType,
      data: {
        labels: ['Consumed', 'Remaining'],
        datasets: [{
          data: [consumed, remaining],
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

    if (this.calorieChart) {
      this.calorieChart.destroy();
    }
    this.calorieChart = new Chart(ctx, config);
  }

  createMacroChart(): void {
    if (!this.macroChartRef || !this.todayProgress) return;

    const ctx = this.macroChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          label: 'Consumed (g)',
          data: [
            this.todayProgress.consumed.protein,
            this.todayProgress.consumed.carbs,
            this.todayProgress.consumed.fat
          ],
          backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
          borderRadius: 8,
        }, {
          label: 'Target (g)',
          data: [
            this.todayProgress.targets.protein,
            this.todayProgress.targets.carbs,
            this.todayProgress.targets.fat
          ],
          backgroundColor: ['#FFB3B3', '#B3E5E0', '#B3D9F0'],
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    if (this.macroChart) {
      this.macroChart.destroy();
    }
    this.macroChart = new Chart(ctx, config);
  }

  createWeeklyChart(): void {
    if (!this.weeklyChartRef) return;

    const ctx = this.weeklyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.weeklyPlans.map(plan => {
      const date = new Date(plan.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    const calorieData = this.weeklyPlans.map(plan => {
      return plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.calories, 0);
    });

    const targetData = this.weeklyPlans.map(plan => plan.target_calories);

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: labels,
        datasets: [{
          label: 'Calories Consumed',
          data: calorieData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true,
        }, {
          label: 'Calorie Target',
          data: targetData,
          borderColor: '#FF9800',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    if (this.weeklyChart) {
      this.weeklyChart.destroy();
    }
    this.weeklyChart = new Chart(ctx, config);
  }

  navigateToMealPlanner(): void {
    this.router.navigate(['/meals']);
  }

  refreshData(): void {
    this.loadNutritionData();
  }

  getStreakArray(streak: number): number[] {
    return Array(Math.min(streak, 7)).fill(0);
  }

  getMacroPercentage(consumed: number, target: number): number {
    return target > 0 ? Math.round((consumed / target) * 100) : 0;
  }

  getProgressColor(percentage: number): string {
    if (percentage < 70) return '#FF9800';
    if (percentage <= 120) return '#4CAF50';
    return '#F44336';
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.mealPlanSubscription) {
      this.mealPlanSubscription.unsubscribe();
    }
    
    // Clean up charts
    if (this.calorieChart) {
      this.calorieChart.destroy();
    }
    if (this.macroChart) {
      this.macroChart.destroy();
    }
    if (this.weeklyChart) {
      this.weeklyChart.destroy();
    }
  }
}