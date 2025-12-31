import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
import { AuthService, SignupData } from '../../../services/auth.service';
import lottie from 'lottie-web';

@Component({
  selector: 'app-signup',
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
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent implements OnInit, AfterViewInit {
  @ViewChild('lottieContainer', { static: false }) lottieContainer!: ElementRef;
  
  signupForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;
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

  ngAfterViewInit(): void {
    this.loadLottieAnimation();
  }

  private loadLottieAnimation(): void {
    if (this.lottieContainer) {
      try {
        lottie.loadAnimation({
          container: this.lottieContainer.nativeElement,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '/assets/animations/FitnessAnimation.json'
        });
      } catch (error) {
        // Fallback: Add a simple fitness icon if animation fails
        this.lottieContainer.nativeElement.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 4rem; color: rgba(255,255,255,0.8);">
            🏋️‍♀️
          </div>
        `;
      }
    }
  }

  private initializeForm(): void {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email, this.gmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private gmailValidator(control: any) {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    const email = control.value.toLowerCase();
    if (!email.endsWith('@gmail.com')) {
      return { gmailRequired: true };
    }
    
    return null;
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

  onSubmit(): void {
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.serverError = '';
      this.fieldErrors = {};
      
      // Add role as 'user' to the form data
      const signupData: SignupData = {
        ...this.signupForm.value,
        role: 'user'
      };

      this.authService.signup(signupData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.snackBar.open('Welcome! Your account has been created successfully.', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.router.navigate(['/profile']);
          } else {
            this.serverError = response.message || 'Account creation failed. Please try again.';
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
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    // Check for server-side field errors first
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }
    
    // Then check for client-side validation errors
    const control = this.signupForm.get(fieldName);
    
    if (control?.hasError('required')) {
      const fieldLabels: { [key: string]: string } = {
        'name': 'Full name',
        'email': 'Email address',
        'password': 'Password',
        'confirmPassword': 'Password confirmation'
      };
      return `${fieldLabels[fieldName] || fieldName} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address (e.g., user@example.com)';
    }
    if (control?.hasError('gmailRequired')) {
      return 'Email must be a Gmail address (e.g., user@gmail.com)';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      if (fieldName === 'password') {
        return `Password must be at least ${minLength} characters long`;
      }
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${minLength} characters long`;
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
}
