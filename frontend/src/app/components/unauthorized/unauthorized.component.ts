import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="unauthorized-container">
      <mat-card class="unauthorized-card">
        <mat-card-header>
          <div mat-card-avatar class="unauthorized-avatar">
            <mat-icon>block</mat-icon>
          </div>
          <mat-card-title>Access Denied</mat-card-title>
          <mat-card-subtitle>You don't have permission to access this page</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="unauthorized-content">
            <mat-icon class="large-icon">security</mat-icon>
            <h2>Unauthorized Access</h2>
            <p>Sorry, you don't have the required permissions to view this page.</p>
            
            <div class="user-info" *ngIf="currentUser">
              <p><strong>Current Role:</strong> {{ getRoleDisplayName(currentUser.role) }}</p>
              <p><strong>User:</strong> {{ currentUser.name }}</p>
            </div>
            
            <div class="help-text">
              <p>If you believe this is an error, please contact your administrator or try logging in with a different account.</p>
            </div>
          </div>
        </mat-card-content>
        
        <mat-card-actions align="end">
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Go Back
          </button>
          <button mat-button (click)="goHome()">
            <mat-icon>home</mat-icon>
            Home
          </button>
          <button mat-raised-button color="primary" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Switch Account
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 64px);
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .unauthorized-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
    }

    .unauthorized-avatar {
      background: #f44336;
      color: white;
    }

    .unauthorized-content {
      padding: 20px 0;
    }

    .large-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #f44336;
      margin-bottom: 16px;
    }

    .user-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      text-align: left;
    }

    .user-info p {
      margin: 4px 0;
    }

    .help-text {
      margin-top: 16px;
      color: #666;
      font-size: 14px;
    }

    h2 {
      color: #333;
      margin: 16px 0;
    }

    mat-card-actions {
      padding: 16px 24px;
    }

    button {
      margin: 0 4px;
    }

    @media (max-width: 600px) {
      .unauthorized-container {
        padding: 10px;
      }
      
      mat-card-actions {
        flex-direction: column;
        align-items: stretch;
      }
      
      button {
        margin: 4px 0;
        width: 100%;
      }
    }
  `]
})
export class UnauthorizedComponent {
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'user': 'Regular User',
      'trainer': 'Trainer',
      'admin': 'Administrator'
    };
    return roleNames[role] || role;
  }

  goBack(): void {
    window.history.back();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}