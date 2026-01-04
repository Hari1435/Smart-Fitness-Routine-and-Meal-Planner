import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  goal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
  role: 'user';
  created_at?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: 'user';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private redirectUrl: string = '/home';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Check for existing session on service initialization
    this.checkExistingSession();
  }

  private checkExistingSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('currentUser');
      
      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        } catch (error) {
          // Invalid stored data, clear it
          this.clearStoredAuth();
        }
      }
    }
  }

  login(credentials: LoginCredentials): Observable<{ success: boolean; user?: User; message?: string }> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;
            
            // Store authentication data
            this.storeAuthData(user, accessToken, refreshToken);
            
            // Update subjects
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);
            
            return { success: true, user, message: response.message };
          } else {
            return { success: false, message: response.message || 'Login failed' };
          }
        }),
        catchError(error => {
          // Return structured error response
          let message = 'Login failed. Please try again.';
          
          if (error.error && error.error.message) {
            message = error.error.message;
          } else if (error.status === 0) {
            message = 'Unable to connect to the server. Please check your internet connection.';
          } else if (error.status >= 500) {
            message = 'Server error. Please try again later.';
          }
          
          return throwError(() => ({
            success: false,
            message,
            error: error.error || error
          }));
        })
      );
  }

  signup(signupData: SignupData): Observable<{ success: boolean; user?: User; message?: string }> {
    // Remove confirmPassword before sending to backend
    const { confirmPassword, ...backendData } = signupData;
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, backendData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;
            
            // Store authentication data
            this.storeAuthData(user, accessToken, refreshToken);
            
            // Update subjects
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);
            
            return { success: true, user, message: response.message };
          } else {
            return { success: false, message: response.message || 'Registration failed' };
          }
        }),
        catchError(error => {
          // Return structured error response
          let message = 'Registration failed. Please try again.';
          
          if (error.error && error.error.message) {
            message = error.error.message;
          } else if (error.status === 0) {
            message = 'Unable to connect to the server. Please check your internet connection.';
          } else if (error.status >= 500) {
            message = 'Server error. Please try again later.';
          }
          
          return throwError(() => ({
            success: false,
            message,
            error: error.error || error
          }));
        })
      );
  }

  logout(): void {
    // Call backend logout endpoint
    const token = this.getToken();
    if (token) {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers }).subscribe({
        next: () => {}, // Silent logout
        error: () => {} // Silent error handling
      });
    }
    
    // Clear local state
    this.clearStoredAuth();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  refreshToken(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const { accessToken } = response.data;
            this.storeToken(accessToken);
            return true;
          }
          return false;
        }),
        catchError(error => {
          this.logout(); // Force logout on refresh failure
          return throwError(() => error);
        })
      );
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  setRedirectUrl(url: string): void {
    this.redirectUrl = url;
  }

  getRedirectUrl(): string {
    const url = this.redirectUrl;
    this.redirectUrl = '/home'; // Reset after getting
    return url;
  }

  // Update user profile
  updateProfile(profileData: Partial<User>): Observable<{ success: boolean; user?: User; message?: string }> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No authentication token'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.put<AuthResponse>(`${this.apiUrl}/auth/profile`, profileData, { headers })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const updatedUser = response.data.user;
            
            // Update stored user data
            this.currentUserSubject.next(updatedUser);
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
            
            return { success: true, user: updatedUser, message: response.message };
          } else {
            return { success: false, message: response.message || 'Profile update failed' };
          }
        }),
        catchError(error => {
          const message = error.error?.message || 'Profile update failed. Please try again.';
          return throwError(() => ({ success: false, message }));
        })
      );
  }

  // Update user fitness goals
  updateGoals(goalsData: { goal: string; targetWeight?: number; timeframe?: string }): Observable<{ success: boolean; user?: User; message?: string }> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No authentication token'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.put<AuthResponse>(`${this.apiUrl}/auth/goals`, goalsData, { headers })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const updatedUser = response.data.user;
            
            // Update stored user data
            this.currentUserSubject.next(updatedUser);
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
            
            return { success: true, user: updatedUser, message: response.message };
          } else {
            return { success: false, message: response.message || 'Goals update failed' };
          }
        }),
        catchError(error => {
          const message = error.error?.message || 'Goals update failed. Please try again.';
          return throwError(() => ({ success: false, message }));
        })
      );
  }

  // Get user profile from backend
  getProfile(): Observable<User> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No authentication token'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/profile`, { headers })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const user = response.data.user;
            
            // Update local user data
            this.currentUserSubject.next(user);
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem('currentUser', JSON.stringify(user));
            }
            
            return user;
          } else {
            throw new Error(response.message || 'Failed to get profile');
          }
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/forgot-password`, { email }).pipe(
      map(response => {
        return response;
      }),
      catchError(error => {
        // Return structured error response
        let message = 'Failed to send reset email. Please try again.';
        
        if (error.error && error.error.message) {
          message = error.error.message;
        } else if (error.status === 0) {
          message = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.status >= 500) {
          message = 'Server error. Please try again later.';
        }
        
        return throwError(() => ({
          success: false,
          message,
          error: error.error || error
        }));
      })
    );
  }

  /**
   * Verify reset token
   */
  verifyResetToken(token: string): Observable<ApiResponse<{ email: string; name: string }>> {
    return this.http.get<ApiResponse<{ email: string; name: string }>>(`${this.apiUrl}/auth/verify-reset-token/${token}`).pipe(
      map(response => {
        return response;
      }),
      catchError(error => {
        // Return structured error response
        let message = 'Invalid or expired reset token.';
        
        if (error.error && error.error.message) {
          message = error.error.message;
        } else if (error.status === 0) {
          message = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.status >= 500) {
          message = 'Server error. Please try again later.';
        }
        
        return throwError(() => ({
          success: false,
          message,
          error: error.error || error
        }));
      })
    );
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, password: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/reset-password`, { token, password }).pipe(
      map(response => {
        return response;
      }),
      catchError(error => {
        // Return structured error response
        let message = 'Failed to reset password. Please try again.';
        
        if (error.error && error.error.message) {
          message = error.error.message;
        } else if (error.status === 0) {
          message = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.status >= 500) {
          message = 'Server error. Please try again later.';
        }
        
        return throwError(() => ({
          success: false,
          message,
          error: error.error || error
        }));
      })
    );
  }

  private storeAuthData(user: User, accessToken: string, refreshToken: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  private storeToken(accessToken: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('accessToken', accessToken);
    }
  }

  private clearStoredAuth(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  private validateSignupData(data: SignupData): boolean {
    return !!(
      data.name && 
      data.email && 
      data.password && 
      data.password === data.confirmPassword &&
      data.email.includes('@')
    );
  }
}
