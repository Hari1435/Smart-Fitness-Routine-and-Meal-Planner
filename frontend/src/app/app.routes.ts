import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { SignupComponent } from './components/auth/signup/signup.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password.component';
import { ProfileComponent } from './components/profile/profile.component';
import { WorkoutRoutineComponent } from './components/workout-routine/workout-routine.component';
import { ProgressTrackerComponent } from './components/progress-tracker/progress-tracker.component';
import { MealPlannerComponent } from './components/meal-planner/meal-planner.component';
import { NutritionTrackerComponent } from './components/nutrition-tracker/nutrition-tracker.component';
import { FoodSearchComponent } from './components/food-search/food-search.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
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
  
  { path: '**', redirectTo: '' }
];
