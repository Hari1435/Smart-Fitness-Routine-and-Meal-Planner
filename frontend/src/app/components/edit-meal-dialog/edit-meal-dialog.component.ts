import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { FoodSearchComponent } from '../food-search/food-search.component';
import { MealService, Meal, Food } from '../../services/meal.service';

export interface EditMealDialogData {
  meal: Meal;
  day: string;
}

@Component({
  selector: 'app-edit-meal-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatDividerModule,
    FoodSearchComponent
  ],
  template: `
    <div class="edit-meal-dialog">
      <div mat-dialog-title class="dialog-header">
        <div class="title-section">
          <mat-icon class="meal-icon" [style.color]="getMealTypeColor()">{{ getMealTypeIcon() }}</mat-icon>
          <div class="title-content">
            <h2>Edit {{ data.meal.name }}</h2>
            <p class="meal-type">{{ data.meal.type | titlecase }} • {{ data.day }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="meal-tabs">
          <!-- Current Meal Tab -->
          <mat-tab label="Current Meal">
            <div class="tab-content">
              <!-- Meal Info Form -->
              <form [formGroup]="mealForm" class="meal-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Meal Name</mat-label>
                  <input matInput formControlName="name" placeholder="Enter meal name">
                  <mat-error *ngIf="mealForm.get('name')?.hasError('required')">
                    Meal name is required
                  </mat-error>
                </mat-form-field>
              </form>

              <!-- Current Foods List -->
              <div class="current-foods">
                <div class="section-header">
                  <h3>Current Foods ({{ editedMeal.foods.length }})</h3>
                  <div class="nutrition-summary">
                    <span class="calories">{{ getTotalCalories() }} cal</span>
                    <span class="macros">P: {{ getTotalProtein() }}g | C: {{ getTotalCarbs() }}g | F: {{ getTotalFat() }}g</span>
                  </div>
                </div>

                <div class="foods-list" *ngIf="editedMeal.foods.length > 0">
                  <mat-card *ngFor="let food of editedMeal.foods; let i = index" class="food-item-card">
                    <mat-card-content class="food-content">
                      <div class="food-info">
                        <div class="food-main">
                          <h4 class="food-name">{{ food.name }}</h4>
                          <div class="food-details">
                            <span class="quantity">{{ food.quantity }}{{ food.unit }}</span>
                            <span class="calories">{{ food.calories }} cal</span>
                          </div>
                        </div>
                        <div class="food-nutrition">
                          <span class="nutrient">P: {{ food.protein || 0 }}g</span>
                          <span class="nutrient">C: {{ food.carbs || 0 }}g</span>
                          <span class="nutrient">F: {{ food.fat || 0 }}g</span>
                        </div>
                      </div>
                      <div class="food-actions">
                        <button mat-icon-button (click)="editFoodQuantity(i)" class="edit-btn">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button (click)="removeFood(i)" class="remove-btn" color="warn">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div class="empty-state" *ngIf="editedMeal.foods.length === 0">
                  <mat-icon class="empty-icon">restaurant_menu</mat-icon>
                  <p>No foods in this meal</p>
                  <p class="empty-subtitle">Add foods using the search tab</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Add Foods Tab -->
          <mat-tab label="Add Foods">
            <div class="tab-content">
              <app-food-search (foodSelected)="onFoodSelected($event)"></app-food-search>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <div class="actions-left">
          <button mat-button (click)="resetMeal()" [disabled]="isSaving">
            <mat-icon>refresh</mat-icon>
            Reset
          </button>
        </div>
        <div class="actions-right">
          <button mat-button mat-dialog-close [disabled]="isSaving">Cancel</button>
          <button 
            mat-raised-button 
            color="primary" 
            (click)="saveMeal()" 
            [disabled]="isSaving || mealForm.invalid">
            <mat-icon *ngIf="isSaving">hourglass_empty</mat-icon>
            <mat-icon *ngIf="!isSaving">save</mat-icon>
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .edit-meal-dialog {
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e0e0e0;
      margin: -24px -24px 0 -24px;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .meal-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .title-content h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .meal-type {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }

    .close-btn {
      color: #666;
    }

    .dialog-content {
      padding: 0 !important;
      margin: 0 -24px;
      max-height: 60vh;
      overflow: hidden;
    }

    .meal-tabs {
      height: 100%;
    }

    .tab-content {
      padding: 24px;
      max-height: 55vh;
      overflow-y: auto;
    }

    .meal-form {
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
    }

    .current-foods {
      margin-top: 16px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .section-header h3 {
      margin: 0;
      color: #333;
    }

    .nutrition-summary {
      display: flex;
      gap: 16px;
      font-size: 14px;
    }

    .calories {
      color: #ff6b35;
      font-weight: 500;
    }

    .macros {
      color: #666;
    }

    .foods-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .food-item-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      transition: box-shadow 0.2s;
    }

    .food-item-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .food-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px !important;
    }

    .food-info {
      flex: 1;
    }

    .food-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .food-name {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    .food-details {
      display: flex;
      gap: 12px;
      font-size: 14px;
    }

    .quantity {
      color: #666;
      font-weight: 500;
    }

    .food-nutrition {
      display: flex;
      gap: 12px;
    }

    .nutrient {
      font-size: 12px;
      color: #666;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .food-actions {
      display: flex;
      gap: 8px;
    }

    .edit-btn {
      color: #2196f3;
    }

    .remove-btn {
      color: #f44336;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .empty-state p {
      margin: 8px 0;
    }

    .empty-subtitle {
      font-size: 14px;
      color: #999;
    }

    .dialog-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      margin: 0 -24px -24px -24px;
    }

    .actions-left,
    .actions-right {
      display: flex;
      gap: 12px;
    }

    @media (max-width: 768px) {
      .edit-meal-dialog {
        max-width: 100vw;
        max-height: 100vh;
      }

      .food-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .food-details {
        gap: 8px;
      }

      .nutrition-summary {
        flex-direction: column;
        gap: 4px;
        text-align: right;
      }

      .dialog-actions {
        flex-direction: column;
        gap: 12px;
      }

      .actions-left,
      .actions-right {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class EditMealDialogComponent implements OnInit {
  mealForm: FormGroup;
  editedMeal: Meal;
  selectedTabIndex = 0;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private mealService: MealService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<EditMealDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditMealDialogData
  ) {
    // Create a deep copy of the meal to edit
    this.editedMeal = JSON.parse(JSON.stringify(data.meal));
    
    this.mealForm = this.fb.group({
      name: [this.editedMeal.name, [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    // Ensure all foods have nutrition data (add defaults if missing)
    this.editedMeal.foods = this.editedMeal.foods.map(food => this.ensureFoodNutrition(food));

    // Update meal name when form changes
    this.mealForm.get('name')?.valueChanges.subscribe(name => {
      if (name) {
        this.editedMeal.name = name;
      }
    });
  }

  private ensureFoodNutrition(food: Food): Food {
    // If nutrition data is missing, estimate based on food name and calories
    if (food.protein === undefined || food.carbs === undefined || food.fat === undefined) {
      const estimated = this.estimateNutritionFromFood(food);
      return {
        ...food,
        protein: food.protein ?? estimated.protein,
        carbs: food.carbs ?? estimated.carbs,
        fat: food.fat ?? estimated.fat,
        fiber: food.fiber ?? estimated.fiber
      };
    }
    return food;
  }

  private estimateNutritionFromFood(food: Food): { protein: number; carbs: number; fat: number; fiber: number } {
    const name = food.name.toLowerCase();
    const calories = food.calories;
    
    // Basic estimation based on food type and calories
    // This is a rough estimation for foods without nutrition data
    
    if (name.includes('chicken') || name.includes('turkey') || name.includes('beef') || name.includes('fish') || name.includes('salmon') || name.includes('tuna')) {
      // High protein foods
      return {
        protein: Math.round(calories * 0.8 / 4), // 80% protein
        carbs: Math.round(calories * 0.05 / 4),  // 5% carbs
        fat: Math.round(calories * 0.15 / 9),    // 15% fat
        fiber: 0
      };
    } else if (name.includes('rice') || name.includes('pasta') || name.includes('bread') || name.includes('oat') || name.includes('quinoa')) {
      // High carb foods
      return {
        protein: Math.round(calories * 0.15 / 4), // 15% protein
        carbs: Math.round(calories * 0.70 / 4),   // 70% carbs
        fat: Math.round(calories * 0.15 / 9),     // 15% fat
        fiber: Math.round(calories * 0.05 / 4)    // Some fiber
      };
    } else if (name.includes('oil') || name.includes('butter') || name.includes('nuts') || name.includes('avocado') || name.includes('cheese')) {
      // High fat foods
      return {
        protein: Math.round(calories * 0.10 / 4), // 10% protein
        carbs: Math.round(calories * 0.10 / 4),   // 10% carbs
        fat: Math.round(calories * 0.80 / 9),     // 80% fat
        fiber: 0
      };
    } else if (name.includes('vegetable') || name.includes('broccoli') || name.includes('spinach') || name.includes('lettuce') || name.includes('tomato')) {
      // Vegetables
      return {
        protein: Math.round(calories * 0.20 / 4), // 20% protein
        carbs: Math.round(calories * 0.60 / 4),   // 60% carbs
        fat: Math.round(calories * 0.05 / 9),     // 5% fat
        fiber: Math.round(calories * 0.15 / 4)    // 15% fiber
      };
    } else if (name.includes('fruit') || name.includes('apple') || name.includes('banana') || name.includes('berries') || name.includes('orange')) {
      // Fruits
      return {
        protein: Math.round(calories * 0.05 / 4), // 5% protein
        carbs: Math.round(calories * 0.90 / 4),   // 90% carbs
        fat: Math.round(calories * 0.05 / 9),     // 5% fat
        fiber: Math.round(calories * 0.10 / 4)    // 10% fiber
      };
    } else {
      // Default balanced estimation
      return {
        protein: Math.round(calories * 0.25 / 4), // 25% protein
        carbs: Math.round(calories * 0.45 / 4),   // 45% carbs
        fat: Math.round(calories * 0.30 / 9),     // 30% fat
        fiber: Math.round(calories * 0.05 / 4)    // 5% fiber
      };
    }
  }

  onFoodSelected(food: Food): void {
    // Add the selected food to the meal
    this.editedMeal.foods.push(food);
    this.updateMealNutrition();
    
    // Switch back to current meal tab to show the added food
    this.selectedTabIndex = 0;
    
    this.snackBar.open(`Added ${food.name} to meal`, 'Close', {
      duration: 2000
    });
  }

  removeFood(index: number): void {
    const food = this.editedMeal.foods[index];
    this.editedMeal.foods.splice(index, 1);
    this.updateMealNutrition();
    
    this.snackBar.open(`Removed ${food.name} from meal`, 'Close', {
      duration: 2000
    });
  }

  editFoodQuantity(index: number): void {
    const food = this.editedMeal.foods[index];
    const newQuantity = prompt(`Enter new quantity for ${food.name} (${food.unit}):`, food.quantity.toString());
    
    if (newQuantity && !isNaN(Number(newQuantity)) && Number(newQuantity) > 0) {
      const oldQuantity = food.quantity;
      const multiplier = Number(newQuantity) / oldQuantity;
      
      // Update quantity and scale nutrition values
      food.quantity = Number(newQuantity);
      food.calories = Math.round(food.calories * multiplier);
      food.protein = Math.round((food.protein || 0) * multiplier);
      food.carbs = Math.round((food.carbs || 0) * multiplier);
      food.fat = Math.round((food.fat || 0) * multiplier);
      
      this.updateMealNutrition();
      
      this.snackBar.open(`Updated ${food.name} quantity`, 'Close', {
        duration: 2000
      });
    }
  }

  updateMealNutrition(): void {
    // Recalculate meal totals based on current foods
    this.editedMeal.calories = this.getTotalCalories();
    this.editedMeal.protein = this.getTotalProtein();
    this.editedMeal.carbs = this.getTotalCarbs();
    this.editedMeal.fat = this.getTotalFat();
  }

  getTotalCalories(): number {
    return Math.round(this.editedMeal.foods.reduce((total, food) => total + food.calories, 0));
  }

  getTotalProtein(): number {
    return Math.round(this.editedMeal.foods.reduce((total, food) => total + (food.protein || 0), 0));
  }

  getTotalCarbs(): number {
    return Math.round(this.editedMeal.foods.reduce((total, food) => total + (food.carbs || 0), 0));
  }

  getTotalFat(): number {
    return Math.round(this.editedMeal.foods.reduce((total, food) => total + (food.fat || 0), 0) * 10) / 10;
  }

  resetMeal(): void {
    if (confirm('Are you sure you want to reset all changes? This cannot be undone.')) {
      // Reset to original meal data
      this.editedMeal = JSON.parse(JSON.stringify(this.data.meal));
      this.mealForm.patchValue({
        name: this.editedMeal.name
      });
      
      this.snackBar.open('Meal reset to original state', 'Close', {
        duration: 2000
      });
    }
  }

  async saveMeal(): Promise<void> {
    if (this.mealForm.invalid) {
      this.snackBar.open('Please fix form errors before saving', 'Close', {
        duration: 3000
      });
      return;
    }

    this.isSaving = true;

    try {
      // Update meal nutrition totals
      this.updateMealNutrition();

      // Call the meal service to update the meal
      const response = await this.mealService.updateMeal(
        this.data.day,
        this.editedMeal.id,
        this.editedMeal
      ).toPromise();

      if (response?.success) {
        this.snackBar.open('Meal updated successfully!', 'Close', {
          duration: 3000
        });
        
        // Update the meal service cache to notify other components (like nutrition tracker)
        // We need to reload the current meal plan to get the updated data
        this.reloadMealPlan();
        
        // Return the updated meal to the parent component
        this.dialogRef.close(this.editedMeal);
      } else {
        throw new Error('Failed to update meal');
      }
    } catch (error) {
      this.snackBar.open('Failed to save meal. Please try again.', 'Close', {
        duration: 3000
      });
    } finally {
      this.isSaving = false;
    }
  }

  getMealTypeIcon(): string {
    return this.mealService.getMealTypeIcon(this.data.meal.type);
  }

  getMealTypeColor(): string {
    return this.mealService.getMealTypeColor(this.data.meal.type);
  }

  private reloadMealPlan(): void {
    // Reload the meal plan to update the cache and notify other components
    this.mealService.getMealPlanByDay(this.data.day).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.mealPlan) {
          // Convert and update the meal plan cache
          const updatedPlan = this.convertBackendToFrontend(response.data.mealPlan);
          this.mealService.updateMealPlanCache(updatedPlan);
        }
      },
      error: (error) => {
        // Silent error handling for background reload
      }
    });
  }

  private convertBackendToFrontend(backendPlan: any): any {
    const dateStr = new Date().toISOString().split('T')[0]; // Today's date
    
    // Convert backend meals to frontend format
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

    // Calculate totals
    const totalCalories = frontendMeals.reduce((sum: number, meal: any) => sum + meal.calories, 0);
    const totalProtein = frontendMeals.reduce((sum: number, meal: any) => sum + meal.protein, 0);
    const totalCarbs = frontendMeals.reduce((sum: number, meal: any) => sum + meal.carbs, 0);
    const totalFat = frontendMeals.reduce((sum: number, meal: any) => sum + meal.fat, 0);
    const totalFiber = frontendMeals.reduce((sum: number, meal: any) => sum + meal.fiber, 0);

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
      target_calories: totalCalories, // Use actual calories as target for now
      target_protein: Math.round(totalCalories * 0.25 / 4), // 25% protein
      target_carbs: Math.round(totalCalories * 0.45 / 4),   // 45% carbs
      target_fat: Math.round(totalCalories * 0.30 / 9),     // 30% fat
      created_at: new Date(backendPlan.created_at),
      updated_at: new Date(backendPlan.updated_at)
    };
  }
}