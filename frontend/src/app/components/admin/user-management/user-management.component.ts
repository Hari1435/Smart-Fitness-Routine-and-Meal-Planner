import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthService, User } from '../../../services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="user-management-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>User Management</mat-card-title>
          <mat-card-subtitle>Manage system users and their roles</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="actions-bar">
            <button mat-raised-button color="primary" (click)="addUser()">
              <mat-icon>person_add</mat-icon>
              Add User
            </button>
            <button mat-button (click)="refreshUsers()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>

          <div class="table-container">
            <table mat-table [dataSource]="users" class="users-table">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let user">{{ user.name }}</td>
              </ng-container>

              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let user">{{ user.email }}</td>
              </ng-container>

              <!-- Role Column -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let user">
                  <mat-chip [color]="getRoleColor(user.role)" selected>
                    {{ getRoleDisplayName(user.role) }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Goal Column -->
              <ng-container matColumnDef="goal">
                <th mat-header-cell *matHeaderCellDef>Goal</th>
                <td mat-cell *matCellDef="let user">
                  <span *ngIf="user.goal">{{ getGoalDisplayName(user.goal) }}</span>
                  <span *ngIf="!user.goal" class="no-goal">Not set</span>
                </td>
              </ng-container>

              <!-- Created Date Column -->
              <ng-container matColumnDef="created">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let user">
                  {{ user.created_at | date:'short' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let user">
                  <button mat-icon-button (click)="editUser(user)" [disabled]="user.id === currentUser?.id">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteUser(user)" [disabled]="user.id === currentUser?.id">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div class="stats-section">
            <div class="stat-card">
              <h3>{{ getTotalUsers() }}</h3>
              <p>Total Users</p>
            </div>
            <div class="stat-card">
              <h3>{{ getUsersByRole('user').length }}</h3>
              <p>Regular Users</p>
            </div>
            <div class="stat-card">
              <h3>{{ getUsersByRole('trainer').length }}</h3>
              <p>Trainers</p>
            </div>
            <div class="stat-card">
              <h3>{{ getUsersByRole('admin').length }}</h3>
              <p>Admins</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .user-management-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .actions-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .table-container {
      overflow-x: auto;
      margin-bottom: 20px;
    }

    .users-table {
      width: 100%;
      min-width: 600px;
    }

    .no-goal {
      color: #999;
      font-style: italic;
    }

    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .stat-card {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-card h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #667eea;
    }

    .stat-card p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .user-management-container {
        padding: 10px;
      }
      
      .actions-bar {
        flex-direction: column;
      }
      
      .actions-bar button {
        width: 100%;
      }
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  currentUser: any = null;
  displayedColumns: string[] = ['name', 'email', 'role', 'goal', 'created', 'actions'];

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    // Mock data for demonstration
    // In real implementation, this would call an API
    this.users = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        goal: 'muscle_gain',
        created_at: new Date('2024-01-15')
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'trainer',
        created_at: new Date('2024-01-10')
      },
      {
        id: 3,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        created_at: new Date('2024-01-01')
      },
      {
        id: 4,
        name: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'user',
        goal: 'weight_loss',
        created_at: new Date('2024-02-01')
      }
    ];
  }

  refreshUsers(): void {
    this.loadUsers();
    this.snackBar.open('Users refreshed', 'Close', { duration: 2000 });
  }

  addUser(): void {
    this.snackBar.open('Add user feature coming soon!', 'Close', { duration: 3000 });
  }

  editUser(user: User): void {
    this.snackBar.open(`Edit user: ${user.name}`, 'Close', { duration: 2000 });
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete user: ${user.name}?`)) {
      this.users = this.users.filter(u => u.id !== user.id);
      this.snackBar.open(`User ${user.name} deleted`, 'Close', { duration: 2000 });
    }
  }

  getRoleColor(role: string): 'primary' | 'accent' | 'warn' {
    switch (role) {
      case 'admin': return 'warn';
      case 'trainer': return 'accent';
      default: return 'primary';
    }
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'user': 'User',
      'trainer': 'Trainer',
      'admin': 'Admin'
    };
    return roleNames[role] || role;
  }

  getGoalDisplayName(goal: string): string {
    const goalNames: { [key: string]: string } = {
      'weight_loss': 'Weight Loss',
      'muscle_gain': 'Muscle Gain',
      'maintenance': 'Maintenance'
    };
    return goalNames[goal] || goal;
  }

  getTotalUsers(): number {
    return this.users.length;
  }

  getUsersByRole(role: string): User[] {
    return this.users.filter(user => user.role === role);
  }
}