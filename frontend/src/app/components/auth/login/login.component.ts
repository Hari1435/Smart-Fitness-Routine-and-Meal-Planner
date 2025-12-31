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
import { AuthService, LoginCredentials } from '../../../services/auth.service';
import lottie from 'lottie-web';

@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('lottieContainer', { static: false }) lottieContainer!: ElementRef;
  
  loginForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
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
          path: '/assets/animations/Healthyfoodfordietfitness.json'
        });
      } catch (error) {
        // Fallback: Add a simple food icon if animation fails
        this.lottieContainer.nativeElement.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 4rem; color: rgba(255,255,255,0.8);">
            🥗
          </div>
        `;
      }
    }
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, this.gmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
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

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.serverError = '';
      this.fieldErrors = {};
      
      const credentials: LoginCredentials = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.snackBar.open('Welcome back! Login successful.', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            
            // Redirect to the originally requested URL or default to profile
            const redirectUrl = this.authService.getRedirectUrl();
            this.router.navigate([redirectUrl]);
          } else {
            this.serverError = response.message || 'Login failed. Please try again.';
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
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    // Check for server-side field errors first
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }
    
    // Then check for client-side validation errors
    const control = this.loginForm.get(fieldName);
    if (control?.hasError('required')) {
      return fieldName === 'email' ? 'Email address is required' : 'Password is required';
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address (e.g., user@example.com)';
    }
    if (control?.hasError('gmailRequired')) {
      return 'Email must be a Gmail address (e.g., user@gmail.com)';
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  }

  clearServerErrors(): void {
    this.serverError = '';
    this.fieldErrors = {};
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}
