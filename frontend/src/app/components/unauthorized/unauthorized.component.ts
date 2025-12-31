import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
          <div mat-card-avatar [class]="currentUser ? 'unauthorized-avatar' : 'unauthorized-avatar login-required'">
            <mat-icon>{{ currentUser ? 'block' : 'login' }}</mat-icon>
          </div>
          <mat-card-title>
            <span *ngIf="currentUser">Access Denied</span>
            <span *ngIf="!currentUser">Authentication Required</span>
          </mat-card-title>
          <mat-card-subtitle>
            <span *ngIf="currentUser">You don't have permission to access this page</span>
            <span *ngIf="!currentUser">Please log in to continue</span>
          </mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="unauthorized-content">
            <mat-icon [class]="currentUser ? 'large-icon access-denied' : 'large-icon login-required'">{{ currentUser ? 'security' : 'account_circle' }}</mat-icon>
            <h2 *ngIf="currentUser">Access Restricted</h2>
            <h2 *ngIf="!currentUser">Authentication Required</h2>
            
            <p *ngIf="currentUser">
              Your current account doesn't have the necessary permissions to view this content.
            </p>
            <p *ngIf="!currentUser">
              This page requires authentication. Please sign in to your account to continue.
            </p>
            
            <div class="user-info" *ngIf="currentUser">
              <p><strong>Account:</strong> {{ currentUser.name }}</p>
              <p><strong>Role:</strong> {{ getRoleDisplayName(currentUser.role) }}</p>
              <p><strong>Email:</strong> {{ currentUser.email }}</p>
            </div>
            
            <div class="help-text" *ngIf="currentUser">
              <p>
                <mat-icon style="vertical-align: middle; margin-right: 8px; font-size: 18px;">info</mat-icon>
                If you believe this is an error, please contact support.
              </p>
            </div>
            
            <div class="help-text" *ngIf="!currentUser">
              <p>
                <mat-icon style="vertical-align: middle; margin-right: 8px; font-size: 18px;">info</mat-icon>
                Please use the navigation bar above to sign in or create an account.
              </p>
            </div>
          </div>
        </mat-card-content>
        
        
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
      position: relative;
    }

    .unauthorized-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="20" cy="80" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
      opacity: 0.3;
      pointer-events: none;
    }

    .unauthorized-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border-radius: 16px;
      overflow: hidden;
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.95);
      position: relative;
      z-index: 1;
      animation: slideInUp 0.6s ease-out;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    .unauthorized-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #ea6666ff, #d31500ff);
    }

    mat-card-header {
      padding: 24px 24px 16px;
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
    }

    .unauthorized-avatar {
      background: linear-gradient(135deg, #ff1100ff, #ff0000ff);
      color: white;
      box-shadow: 0 4px 12px rgba(255, 17, 0, 1);
      transform: scale(1.1);
      animation: fadeIn 0.8s ease-out 0.2s both;
    }
    
    .unauthorized-avatar.login-required {
      background: linear-gradient(135deg, #ff0000ff, #8f0500ff);
      box-shadow: 0 4px 12px rgba(243, 61, 33, 0.3);
    }

    mat-card-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #cc1800e0;
      margin-bottom: 8px;
    }

    mat-card-subtitle {
      font-size: 1rem;
      color: #7f8c8d;
      line-height: 1.4;
    }

    .unauthorized-content {
      padding: 32px 24px;
      background: white;
      animation: fadeIn 0.8s ease-out 0.3s both;
    }

    .large-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
      opacity: 0.9;
      animation: fadeIn 1s ease-out 0.4s both;
    }
    
    .large-icon.access-denied {
      color: #ff1900ff;
      filter: drop-shadow(0 4px 8px rgba(231, 76, 60, 0.2));
    }
    
    .large-icon.login-required {
      color: #3498db;
      filter: drop-shadow(0 4px 8px rgba(52, 152, 219, 0.2));
    }

    h2 {
      color: #ff0000ff;
      margin: 0 0 16px 0;
      font-size: 1.75rem;
      font-weight: 500;
    }

    p {
      color: #ff1100ff;
      font-size: 1.1rem;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }

    .user-info {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 20px;
      border-radius: 12px;
      margin: 24px 0;
      text-align: left;
      border: 1px solid #dee2e6;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .user-info p {
      margin: 8px 0;
      font-size: 0.95rem;
    }

    .user-info strong {
      color: #495057;
      font-weight: 600;
    }

    .help-text {
      margin-top: 24px;
      padding: 16px;
      background: rgba(52, 152, 219, 0.1);
      border-radius: 8px;
      border-left: 4px solid #3498db;
    }

    .help-text p {
      color: #2980b9;
      font-size: 0.95rem;
      margin: 0;
      font-weight: 500;
    }

    mat-card-actions {
      padding: 20px 24px 24px;
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
      border-top: 1px solid #e9ecef;
      justify-content: center;
    }

    .action-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6c757d;
      font-size: 0.95rem;
      font-weight: 500;
      padding: 8px 16px;
      background: rgba(108, 117, 125, 0.1);
      border-radius: 20px;
      border: 1px solid rgba(108, 117, 125, 0.2);
      animation: fadeIn 1.2s ease-out 0.6s both;
      transition: all 0.3s ease;
    }

    .action-message:hover {
      background: rgba(108, 117, 125, 0.15);
      border-color: rgba(108, 117, 125, 0.3);
    }

    .action-message mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    @media (max-width: 600px) {
      .unauthorized-container {
        padding: 16px;
        min-height: calc(100vh - 56px);
      }
      
      .unauthorized-card {
        border-radius: 12px;
      }

      mat-card-header {
        padding: 20px 20px 12px;
      }

      .unauthorized-content {
        padding: 24px 20px;
      }

      .large-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      h2 {
        font-size: 1.5rem;
      }

      p {
        font-size: 1rem;
      }
      
      mat-card-actions {
        padding: 16px 20px 20px;
      }
      
      .action-message {
        font-size: 0.9rem;
        padding: 6px 12px;
      }
    }

    @media (max-width: 400px) {
      .unauthorized-container {
        padding: 12px;
      }

      .unauthorized-card {
        border-radius: 8px;
      }

      mat-card-title {
        font-size: 1.25rem;
      }

      h2 {
        font-size: 1.25rem;
      }
    }
  `]
})
export class UnauthorizedComponent {
  currentUser: any = null;

  constructor(
    private authService: AuthService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'user': 'Regular User'
    };
    return roleNames[role] || role;
  }
}