import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MealService, DailyMealPlan, Meal, NutritionProgress } from '../../services/meal.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { EditMealDialogComponent } from '../edit-meal-dialog/edit-meal-dialog.component';

@Component({
  selector: 'app-meal-planner',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  templateUrl: './meal-planner.component.html',
  styleUrls: ['./meal-planner.component.scss']
})
export class MealPlannerComponent implements OnInit {
  currentMealPlan: DailyMealPlan | null = null;
  selectedDate: Date = new Date();
  nutritionProgress: NutritionProgress | null = null;
  loading = false;
  weekDates: Date[] = [];
  mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Add property to store weekly meal plans
  weeklyMealPlans: { [key: string]: any } = {};

  constructor(
    private mealService: MealService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateWeekDates();
    this.loadMealPlan();
    this.loadWeeklyMealPlans(); // Load all days to show variety
  }

  generateWeekDates(): void {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    this.weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      this.weekDates.push(date);
    }
  }

  loadMealPlan(): void {
    // Check if user is authenticated first
    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('Please log in to access your meal plans', 'Login', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/unauthorized']);
      });
      this.loading = false;
      return;
    }

    this.loading = true;
    
    // Convert date to day name for backend API
    const dayName = this.getDayName(this.selectedDate);
    
    this.mealService.getMealPlanByDay(dayName).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.mealPlan) {
          // Convert backend format to frontend format
          this.currentMealPlan = this.convertBackendToFrontend(response.data.mealPlan);
          this.nutritionProgress = this.mealService.calculateDayProgress(this.currentMealPlan);
          this.mealService.updateMealPlanCache(this.currentMealPlan);
        } else {
          // No meal plan exists, generate one
          this.generateNewMealPlan();
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        
        if (error.status === 401) {
          this.snackBar.open('Please log in to access meal plans', 'Go to Login', {
            duration: 5000
          }).onAction().subscribe(() => {
            this.router.navigate(['/unauthorized']);
          });
        } else if (error.status === 404) {
          // No meal plan found, generate one
          this.generateNewMealPlan();
        } else {
          this.snackBar.open('Error loading meal plan. Please try again.', 'Close', {
            duration: 3000
          });
        }
      }
    });
  }

  selectDate(date: Date): void {
    this.selectedDate = date;
    this.loadMealPlan();
  }

  toggleMealConsumption(meal: Meal): void {
    if (!this.currentMealPlan) return;

    const dayName = this.getDayName(this.selectedDate);
    const wasConsumed = meal.consumed;
    
    this.mealService.markMealAsConsumed(dayName, meal.id, !wasConsumed).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Update local meal plan with backend response
          this.currentMealPlan = this.convertBackendToFrontend(response.data.plan);
          this.nutritionProgress = this.mealService.calculateDayProgress(this.currentMealPlan);
          
          // Update the meal service cache to notify other components
          this.mealService.updateMealPlanCache(this.currentMealPlan);
          
          const message = !wasConsumed ? 'Meal marked as consumed!' : 'Meal marked as not consumed';
          this.snackBar.open(message, 'Close', { duration: 2000 });
        }
      },
      error: (error) => {
        this.snackBar.open('Error updating meal status', 'Close', {
          duration: 3000
        });
      }
    });
  }

  getMealsByType(type: string): Meal[] {
    if (!this.currentMealPlan) return [];
    return this.currentMealPlan.meals.filter(meal => meal.type === type);
  }

  getConsumedMealsCount(): number {
    if (!this.currentMealPlan) return 0;
    return this.currentMealPlan.meals.filter(meal => meal.consumed).length;
  }

  getTotalMealsCount(): number {
    if (!this.currentMealPlan) return 0;
    return this.currentMealPlan.meals.length;
  }

  getCompletionPercentage(): number {
    const total = this.getTotalMealsCount();
    if (total === 0) return 0;
    return Math.round((this.getConsumedMealsCount() / total) * 100);
  }

  getMealTypeIcon(type: string): string {
    return this.mealService.getMealTypeIcon(type);
  }

  getMealTypeColor(type: string): string {
    return this.mealService.getMealTypeColor(type);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isSelectedDate(date: Date): boolean {
    return date.toDateString() === this.selectedDate.toDateString();
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  generateNewMealPlan(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.goal) {
      this.snackBar.open('Please set your fitness goal in your profile first', 'Close', {
        duration: 3000
      });
      return;
    }

    this.loading = true;
    
    this.mealService.generatePersonalizedMealPlan().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.plans) {
          this.snackBar.open('Personalized meal plan generated!', 'Close', {
            duration: 3000
          });
          // Reload the current day's meal plan
          this.loadMealPlan();
        }
      },
      error: (error) => {
        this.loading = false;
        
        if (error.status === 401) {
          this.snackBar.open('Please log in to generate meal plans', 'Go to Login', {
            duration: 5000
          }).onAction().subscribe(() => {
            this.router.navigate(['/unauthorized']);
          });
        } else {
          this.snackBar.open('Error generating meal plan. Please try again.', 'Close', {
            duration: 3000
          });
        }
      }
    });
  }

  navigateToNutrition(): void {
    this.router.navigate(['/nutrition']);
  }

  // Helper method to get day name from date
  getDayName(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  // Helper method to convert backend meal plan format to frontend format
  convertBackendToFrontend(backendPlan: any): DailyMealPlan {
    const dateStr = this.mealService.formatDate(this.selectedDate);
    
    // Convert backend meals to frontend format
    const frontendMeals: Meal[] = backendPlan.meals.map((meal: any) => ({
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

    // Calculate totals from all meals (planned nutrition)
    const totalCalories = frontendMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const totalProtein = frontendMeals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCarbs = frontendMeals.reduce((sum, meal) => sum + meal.carbs, 0);
    const totalFat = frontendMeals.reduce((sum, meal) => sum + meal.fat, 0);
    const totalFiber = frontendMeals.reduce((sum, meal) => sum + meal.fiber, 0);

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

  // Load meal plans for the entire week to show variety
  loadWeeklyMealPlans(): void {
    if (!this.authService.isAuthenticated()) return;

    this.mealService.getMealPlansForWeek().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.plans) {
          // Store meal plans by day for quick access
          response.data.plans.forEach((plan: any) => {
            this.weeklyMealPlans[plan.day] = plan;
          });
        }
      },
      error: (error) => {
        // Silent error handling for background loading
      }
    });
  }

  // Get meal preview for a specific day (for week view)
  getMealPreviewForDay(date: Date): string {
    const dayName = this.getDayName(date);
    const plan = this.weeklyMealPlans[dayName];
    
    if (plan && plan.meals && plan.meals.length > 0) {
      // Return the first meal name as preview
      return plan.meals[0].name;
    }
    
    return 'No meals planned';
  }

  addCustomMeal(): void {
    // This would open a dialog to add custom meals
    this.snackBar.open('Custom meal feature coming soon!', 'Close', {
      duration: 2000
    });
  }

  editMeal(meal: Meal): void {
    const dialogRef = this.dialog.open(EditMealDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        meal: meal,
        day: this.getDayName(this.selectedDate)
      },
      disableClose: false,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Meal was updated, reload the meal plan to show changes
        this.loadMealPlan();
        this.snackBar.open('Meal updated successfully!', 'Close', {
          duration: 3000
        });
      }
    });
  }

  getCalorieProgressColor(): string {
    if (!this.nutritionProgress) return '#757575';
    const percentage = this.nutritionProgress.percentages.calories;
    if (percentage < 80) return '#FF9800';
    if (percentage <= 110) return '#4CAF50';
    return '#F44336';
  }

  getNutrientProgressColor(percentage: number): string {
    if (percentage < 70) return '#FF9800';
    if (percentage <= 120) return '#4CAF50';
    return '#F44336';
  }

  trackByMealId(index: number, meal: Meal): string {
    return meal.id;
  }
}