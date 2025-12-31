import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MealService, USDAFood, USDASearchResult, Food } from '../../services/meal.service';

@Component({
  selector: 'app-food-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="food-search-container">
      <mat-card class="search-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>search</mat-icon>
            Food Search
          </mat-card-title>
          <mat-card-subtitle>Search USDA database for accurate nutrition data</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <!-- Food Search -->
          <div class="search-section">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search for foods</mat-label>
              <input 
                matInput 
                [(ngModel)]="searchQuery" 
                (keyup.enter)="searchFoods()"
                placeholder="e.g., chicken breast, apple, quinoa">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            <button 
              mat-raised-button 
              color="primary" 
              (click)="searchFoods()"
              [disabled]="isLoading || !searchQuery.trim()">
              Search
            </button>
          </div>

          <!-- Loading Spinner -->
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Searching USDA database...</p>
          </div>

          <!-- Search Results -->
          <div *ngIf="searchResults && searchResults.foods.length > 0" class="results-container">
            <div class="results-header">
              <h3>Search Results</h3>
              <p>Found {{searchResults.totalHits}} foods (showing {{searchResults.foods.length}})</p>
            </div>

            <div class="food-grid">
              <mat-card 
                *ngFor="let food of searchResults.foods" 
                class="food-card"
                (click)="selectFood(food)">
                <mat-card-header>
                  <mat-card-title class="food-title">{{food.description}}</mat-card-title>
                  <mat-card-subtitle>
                    <mat-chip class="data-type-chip">{{food.dataType}}</mat-chip>
                    <span *ngIf="food.brandOwner" class="brand">{{food.brandOwner}}</span>
                  </mat-card-subtitle>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="nutrition-preview" *ngIf="food.foodNutrients && food.foodNutrients.length > 0">
                    <div class="nutrient" *ngFor="let nutrient of getMainNutrients(food.foodNutrients)">
                      <span class="nutrient-name">{{nutrient.nutrientName}}:</span>
                      <span class="nutrient-value">{{nutrient.value}} {{nutrient.unitName}}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <!-- Pagination -->
            <div class="pagination" *ngIf="searchResults.totalPages > 1">
              <button 
                mat-button 
                [disabled]="currentPage <= 1"
                (click)="loadPage(currentPage - 1)">
                Previous
              </button>
              <span class="page-info">
                Page {{currentPage}} of {{searchResults.totalPages}}
              </span>
              <button 
                mat-button 
                [disabled]="currentPage >= searchResults.totalPages"
                (click)="loadPage(currentPage + 1)">
                Next
              </button>
            </div>
          </div>

          <!-- No Results -->
          <div *ngIf="searchResults && searchResults.foods.length === 0" class="no-results">
            <mat-icon>search_off</mat-icon>
            <h3>No foods found</h3>
            <p>Try a different search term or check your spelling.</p>
          </div>

          <!-- API Status -->
          <div class="api-status" *ngIf="!apiKeyValid">
            <mat-icon color="warn">warning</mat-icon>
            <span>USDA API key not configured. Please contact support.</span>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    
    .food-search-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .search-card {
      margin-bottom: 20px;
    }

    .search-section {
      display: flex;
      gap: 16px;
      align-items: center;
      margin: 20px 0;
    }

    .search-field {
      flex: 1;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
    }

    .loading-container p {
      margin-top: 16px;
      color: #666;
    }

    .results-container {
      margin-top: 20px;
    }

    .results-header {
      margin-bottom: 20px;
    }

    .results-header h3 {
      margin: 0;
      color: #333;
    }

    .results-header p {
      margin: 5px 0 0 0;
      color: #666;
      font-size: 14px;
    }

    .food-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .food-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .food-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .food-title {
      font-size: 16px !important;
      line-height: 1.3 !important;
      margin-bottom: 8px !important;
    }

    .data-type-chip {
      font-size: 12px;
      height: 20px;
      line-height: 20px;
    }

    .brand {
      font-size: 12px;
      color: #666;
      margin-left: 8px;
    }

    .nutrition-preview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }

    .nutrient {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .nutrient-name {
      color: #666;
    }

    .nutrient-value {
      font-weight: 500;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 20px;
    }

    .page-info {
      font-size: 14px;
      color: #666;
    }

    .no-results {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .no-results mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .api-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .food-grid {
        grid-template-columns: 1fr;
      }
      
      .search-section {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class FoodSearchComponent implements OnInit {
  @Output() foodSelected = new EventEmitter<Food>();

  searchQuery = '';
  searchResults: USDASearchResult | null = null;
  isLoading = false;
  currentPage = 1;
  pageSize = 12;
  apiKeyValid = true;

  constructor(
    private mealService: MealService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.checkApiStatus();
  }

  checkApiStatus(): void {
    this.mealService.validateUSDAApiKey().subscribe({
      next: (response: any) => {
        this.apiKeyValid = response.data?.apiKeyValid || false;
        if (!this.apiKeyValid) {
          this.snackBar.open('USDA API not configured. Contact support.', 'Close', {
            duration: 5000,
            panelClass: ['warning-snackbar']
          });
        }
      },
      error: (error: any) => {
        this.apiKeyValid = false;
      }
    });
  }

  searchFoods(): void {
    if (!this.searchQuery.trim()) return;
    
    this.isLoading = true;
    this.currentPage = 1;
    
    this.mealService.searchFoods(this.searchQuery, this.pageSize, this.currentPage).subscribe({
      next: (response: any) => {
        this.searchResults = response.data?.searchResult || null;
        this.isLoading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
        this.snackBar.open('Search failed. Please try again.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  loadPage(page: number): void {
    if (page < 1 || !this.searchResults || page > this.searchResults.totalPages) return;
    
    this.currentPage = page;
    this.isLoading = true;
    
    this.mealService.searchFoods(this.searchQuery, this.pageSize, page).subscribe({
      next: (response: any) => {
        this.searchResults = response.data?.searchResult || null;
        this.isLoading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
        this.snackBar.open('Failed to load page. Please try again.', 'Close', {
          duration: 3000
        });
      }
    });
  }

  selectFood(usdaFood: USDAFood): void {
    // Convert USDA food to our Food interface with default 100g serving
    const food = this.mealService.convertUSDAFoodToFood(usdaFood, 100, 'g');
    this.foodSelected.emit(food);
    
    this.snackBar.open(`Added ${food.name} to meal`, 'Close', {
      duration: 2000,
      panelClass: ['success-snackbar']
    });
  }

  getMainNutrients(nutrients: any[]): any[] {
    // Show only the main nutrients (calories, protein, carbs, fat)
    const mainNutrientIds = [1008, 1003, 1005, 1004]; // calories, protein, carbs, fat
    return nutrients
      .filter(n => mainNutrientIds.includes(n.nutrientId))
      .slice(0, 4);
  }
}