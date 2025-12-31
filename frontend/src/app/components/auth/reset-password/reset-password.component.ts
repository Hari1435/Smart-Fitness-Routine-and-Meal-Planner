import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
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
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  resetToken: string = '';
  tokenValid = false;
  tokenChecked = false;
  passwordReset = false;
  userEmail = '';
  userName = '';
  serverError: string = '';
  fieldErrors: { [key: string]: string } = {};

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkResetToken();
  }

  private initializeForm(): void {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (confirmPassword?.hasError('passwordMismatch')) {
      delete confirmPassword.errors!['passwordMismatch'];
      if (Object.keys(confirmPassword.errors!).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  private checkResetToken(): void {
    this.resetToken = this.route.snapshot.queryParams['token'];
    
    if (!this.resetToken) {
      this.tokenValid = false;
      this.tokenChecked = true;
      this.serverError = 'Invalid reset link. Please request a new password reset.';
      return;
    }

    this.authService.verifyResetToken(this.resetToken).subscribe({
      next: (response) => {
        this.tokenChecked = true;
        if (response.success && response.data) {
          this.tokenValid = true;
          this.userEmail = response.data.email;
          this.userName = response.data.name;
        } else {
          this.tokenValid = false;
          this.serverError = response.message || 'Invalid or expired reset token.';
        }
      },
      error: (error) => {
        this.tokenChecked = true;
        this.tokenValid = false;
        if (error.error && error.error.message) {
          this.serverError = error.error.message;
        } else {
          this.serverError = 'Invalid or expired reset token. Please request a new password reset.';
        }
      }
    });
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && this.tokenValid) {
      this.isLoading = true;
      this.serverError = '';
      this.fieldErrors = {};
      
      const password = this.resetPasswordForm.get('password')?.value;

      this.authService.resetPassword(this.resetToken, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.passwordReset = true;
            this.snackBar.open('Password reset successfully! You can now log in with your new password.', 'Close', {
              duration: 5000,
              panelClass: ['success-snackbar']
            });
          } else {
            this.serverError = response.message || 'Failed to reset password. Please try again.';
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
    Object.keys(this.resetPasswordForm.controls).forEach(key => {
      const control = this.resetPasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    // Check for server-side field errors first
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }
    
    // Then check for client-side validation errors
    const control = this.resetPasswordForm.get(fieldName);
    
    if (control?.hasError('required')) {
      if (fieldName === 'password') {
        return 'New password is required';
      } else if (fieldName === 'confirmPassword') {
        return 'Password confirmation is required';
      }
      return `${fieldName} is required`;
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 8 characters long';
    }
    if (control?.hasError('passwordMismatch')) {
      return 'Passwords do not match. Please make sure both passwords are identical.';
    }
    
    return '';
  }

  clearServerErrors(): void {
    this.serverError = '';
    this.fieldErrors = {};
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.hidePassword = !this.hidePassword;
    } else {
      this.hideConfirmPassword = !this.hideConfirmPassword;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  requestNewReset(): void {
    this.router.navigate(['/forgot-password']);
  }

  getPasswordStrengthClass(): string {
    const password = this.resetPasswordForm.get('password')?.value || '';
    
    if (password.length === 0) return '';
    if (password.length < 8) return 'weak';
    
    let strength = 0;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    
    if (strength < 2) return 'weak';
    if (strength < 4) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const strengthClass = this.getPasswordStrengthClass();
    switch (strengthClass) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  }

  hasSpecialChar(password: string): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  }

  hasMinLength(password: string): boolean {
    return password.length >= 8;
  }

  hasLowercase(password: string): boolean {
    return /[a-z]/.test(password);
  }

  hasUppercase(password: string): boolean {
    return /[A-Z]/.test(password);
  }

  hasNumber(password: string): boolean {
    return /\d/.test(password);
  }
}