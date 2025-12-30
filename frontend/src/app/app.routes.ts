import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { SignupComponent } from './components/auth/signup/signup.component';
import { ProfileComponent } from './components/profile/profile.component';
import { WorkoutRoutineComponent } from './components/workout-routine/workout-routine.component';
import { ProgressTrackerComponent } from './components/progress-tracker/progress-tracker.component';
import { MealPlannerComponent } from './components/meal-planner/meal-planner.component';
import { NutritionTrackerComponent } from './components/nutrition-tracker/nutrition-tracker.component';
import { FoodSearchComponent } from './components/food-search/food-search.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { UserManagementComponent } from './components/admin/user-management/user-management.component';
import { TrainerDashboardComponent } from './components/trainer/trainer-dashboard/trainer-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },
  
  // User routes - require authentication
  { 
    path: 'profile', 
    component: ProfileComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'workouts', 
    component: WorkoutRoutineComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'progress', 
    component: ProgressTrackerComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'meals', 
    component: MealPlannerComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'nutrition', 
    component: NutritionTrackerComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'food-search', 
    component: FoodSearchComponent, 
    canActivate: [AuthGuard] 
  },
  
  // Trainer routes - require trainer or admin role
  { 
    path: 'trainer-dashboard', 
    component: TrainerDashboardComponent, 
    canActivate: [RoleGuard],
    data: { roles: ['trainer', 'admin'] }
  },
  
  // Admin routes - require admin role only
  { 
    path: 'admin/users', 
    component: UserManagementComponent, 
    canActivate: [RoleGuard],
    data: { roles: ['admin'] }
  },
  
  { path: '**', redirectTo: '' }
];
