import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService, User } from '../../services/auth.service';

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance';
  activityLevel: string;
  targetWeight?: number;
  medicalConditions?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTabsModule,
    MatChipsModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  goalsForm!: FormGroup;
  isLoading = false;
  currentUser: User | null = null;

  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  fitnessGoals = [
    {
      value: 'weight_loss',
      label: 'Weight Loss',
      description: 'Burn calories and reduce body weight',
      icon: 'trending_down',
      color: '#ff6b6b'
    },
    {
      value: 'muscle_gain',
      label: 'Muscle Gain',
      description: 'Build lean muscle mass and strength',
      icon: 'fitness_center',
      color: '#4ecdc4'
    },
    {
      value: 'maintenance',
      label: 'Maintenance',
      description: 'Maintain current fitness level',
      icon: 'balance',
      color: '#45b7d1'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initializeForms();
    this.loadUserProfile();
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      age: ['', [Validators.required, Validators.min(13), Validators.max(120)]],
      gender: ['', Validators.required],
      height: ['', [Validators.required, Validators.min(100), Validators.max(250)]],
      weight: ['', [Validators.required, Validators.min(30), Validators.max(300)]]
    });

    this.goalsForm = this.fb.group({
      goal: ['', Validators.required]
    });
  }

  private loadUserProfile(): void {
    if (this.currentUser) {
      // Load from current user first
      this.profileForm.patchValue({
        name: this.currentUser.name || '',
        age: this.currentUser.age || '',
        gender: this.currentUser.gender || '',
        height: this.currentUser.height || '',
        weight: this.currentUser.weight || ''
      });

      this.goalsForm.patchValue({
        goal: this.currentUser.goal || ''
      });
    }

    // Also fetch fresh data from backend
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.profileForm.patchValue({
          name: user.name || '',
          age: user.age || '',
          gender: user.gender || '',
          height: user.height || '',
          weight: user.weight || ''
        });

        this.goalsForm.patchValue({
          goal: user.goal || ''
        });
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        // Continue with cached user data if backend fails
      }
    });
  }

  onSaveProfile(): void {
    if (this.profileForm.valid) {
      this.isLoading = true;
      
      const profileData = {
        name: this.profileForm.get('name')?.value,
        age: parseInt(this.profileForm.get('age')?.value),
        gender: this.profileForm.get('gender')?.value,
        height: parseFloat(this.profileForm.get('height')?.value),
        weight: parseFloat(this.profileForm.get('weight')?.value)
      };

      this.authService.updateProfile(profileData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            // Update current user data
            this.currentUser = response.user || this.currentUser;
            this.snackBar.open(response.message || 'Profile updated successfully!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          } else {
            this.snackBar.open(response.message || 'Failed to update profile', 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Profile update error:', error);
          this.snackBar.open(error.message || 'Failed to update profile. Please try again.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  onSaveGoals(): void {
    if (this.goalsForm.valid) {
      this.isLoading = true;
      
      const goalsData = {
        goal: this.goalsForm.get('goal')?.value,
        // Note: targetWeight and timeframe are not in the backend model
        // The backend expects just the goal field
      };

      this.authService.updateGoals(goalsData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            // Update current user data
            this.currentUser = response.user || this.currentUser;
            this.snackBar.open(response.message || 'Fitness goals updated successfully!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          } else {
            this.snackBar.open(response.message || 'Failed to update goals', 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Goals update error:', error);
          this.snackBar.open(error.message || 'Failed to update goals. Please try again.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.markFormGroupTouched(this.goalsForm);
    }
  }

  selectGoal(goalValue: string): void {
    this.goalsForm.patchValue({ goal: goalValue });
  }

  calculateBMI(): number {
    const height = this.profileForm.get('height')?.value;
    const weight = this.profileForm.get('weight')?.value;
    
    if (height && weight) {
      const heightInMeters = height / 100;
      return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }
    return 0;
  }

  getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  getBMIColor(bmi: number): string {
    if (bmi < 18.5) return '#3498db';
    if (bmi < 25) return '#2ecc71';
    if (bmi < 30) return '#f39c12';
    return '#e74c3c';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const control = formGroup.get(fieldName);
    
    if (control?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (control?.hasError('min')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is too low`;
    }
    if (control?.hasError('max')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is too high`;
    }
    if (control?.hasError('minlength')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is too short`;
    }
    
    return '';
  }

  getUserInitials(): string {
    if (this.currentUser?.name) {
      const names = this.currentUser.name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      } else {
        return names[0][0].toUpperCase();
      }
    }
    return 'U';
  }
}
