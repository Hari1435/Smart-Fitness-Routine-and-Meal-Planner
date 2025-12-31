import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  isLoading = false;
  emailSent = false;
  serverError: string = '';
  fieldErrors: { [key: string]: string } = {};

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.serverError = '';
      this.fieldErrors = {};
      
      const email = this.forgotPasswordForm.get('email')?.value;

      this.authService.requestPasswordReset(email).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.emailSent = true;
            this.snackBar.open('Password reset instructions sent to your email!', 'Close', {
              duration: 5000,
              panelClass: ['success-snackbar']
            });
          } else {
            this.serverError = response.message || 'Failed to send reset email. Please try again.';
          }
        },
        error: (error) => {
          this.isLoading = false;
          
          // Handle different types of errors
          if (error.error && error.error.message) {
            this.serverError = error.error.message;
          } else if (error.error && error.error.errors) {
            // Handle validation errors
            this.fieldErrors = {};
            error.error.errors.forEach((err: any) => {
              if (err.field) {
                this.fieldErrors[err.field] = err.message;
              }
            });
            
            if (Object.keys(this.fieldErrors).length === 0) {
              this.serverError = 'Please check your input and try again.';
            }
          } else {
            // Network or other errors
            this.serverError = 'Unable to connect to the server. Please check your internet connection and try again.';
          }
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      const control = this.forgotPasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    // Check for server-side field errors first
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }
    
    // Then check for client-side validation errors
    const control = this.forgotPasswordForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'Email address is required';
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address (e.g., user@example.com)';
    }
    return '';
  }

  clearServerErrors(): void {
    this.serverError = '';
    this.fieldErrors = {};
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }

  resendEmail(): void {
    this.emailSent = false;
    this.onSubmit();
  }
}