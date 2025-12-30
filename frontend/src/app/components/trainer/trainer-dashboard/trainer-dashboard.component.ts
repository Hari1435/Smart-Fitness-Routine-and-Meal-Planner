import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, User } from '../../../services/auth.service';

interface Client {
  id: number;
  name: string;
  email: string;
  goal: string;
  progress: number;
  lastActive: Date;
  status: 'active' | 'inactive' | 'new';
}

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="trainer-dashboard-container">
      <div class="dashboard-header">
        <h1>Trainer Dashboard</h1>
        <p>Welcome back, {{ currentUser?.name }}!</p>
      </div>

      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon clients">group</mat-icon>
              <div class="stat-info">
                <h2>{{ getTotalClients() }}</h2>
                <p>Total Clients</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon active">trending_up</mat-icon>
              <div class="stat-info">
                <h2>{{ getActiveClients() }}</h2>
                <p>Active This Week</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon new">person_add</mat-icon>
              <div class="stat-info">
                <h2>{{ getNewClients() }}</h2>
                <p>New This Month</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon progress">assessment</mat-icon>
              <div class="stat-info">
                <h2>{{ getAverageProgress() }}%</h2>
                <p>Avg Progress</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="clients-section">
        <mat-card-header>
          <mat-card-title>Client Management</mat-card-title>
          <mat-card-subtitle>Manage your assigned clients</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="All Clients ({{ clients.length }})">
              <div class="clients-list">
                <mat-list>
                  <mat-list-item *ngFor="let client of clients" class="client-item">
                    <div matListItemAvatar>
                      <div class="client-avatar">{{ getClientInitials(client.name) }}</div>
                    </div>
                    <div matListItemTitle>{{ client.name }}</div>
                    <div matListItemLine>{{ client.email }}</div>
                    <div matListItemLine>
                      <mat-chip [color]="getStatusColor(client.status)" selected>
                        {{ client.status }}
                      </mat-chip>
                      <span class="goal-chip">{{ getGoalDisplayName(client.goal) }}</span>
                    </div>
                    <div matListItemMeta>
                      <div class="client-actions">
                        <span class="progress-text">{{ client.progress }}% progress</span>
                        <button mat-icon-button (click)="viewClientDetails(client)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                        <button mat-icon-button (click)="createWorkoutPlan(client)">
                          <mat-icon>fitness_center</mat-icon>
                        </button>
                        <button mat-icon-button (click)="createMealPlan(client)">
                          <mat-icon>restaurant</mat-icon>
                        </button>
                      </div>
                    </div>
                  </mat-list-item>
                </mat-list>
              </div>
            </mat-tab>

            <mat-tab label="Active ({{ getActiveClientsList().length }})">
              <div class="clients-list">
                <mat-list>
                  <mat-list-item *ngFor="let client of getActiveClientsList()" class="client-item">
                    <div matListItemAvatar>
                      <div class="client-avatar active">{{ getClientInitials(client.name) }}</div>
                    </div>
                    <div matListItemTitle>{{ client.name }}</div>
                    <div matListItemLine>Last active: {{ client.lastActive | date:'short' }}</div>
                    <div matListItemMeta>
                      <div class="client-actions">
                        <span class="progress-text">{{ client.progress }}% progress</span>
                        <button mat-icon-button (click)="viewClientDetails(client)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                      </div>
                    </div>
                  </mat-list-item>
                </mat-list>
              </div>
            </mat-tab>

            <mat-tab label="New ({{ getNewClientsList().length }})">
              <div class="clients-list">
                <mat-list>
                  <mat-list-item *ngFor="let client of getNewClientsList()" class="client-item">
                    <div matListItemAvatar>
                      <div class="client-avatar new">{{ getClientInitials(client.name) }}</div>
                    </div>
                    <div matListItemTitle>{{ client.name }}</div>
                    <div matListItemLine>{{ client.email }}</div>
                    <div matListItemLine>Goal: {{ getGoalDisplayName(client.goal) }}</div>
                    <div matListItemMeta>
                      <div class="client-actions">
                        <button mat-button color="primary" (click)="setupInitialPlan(client)">
                          Setup Plan
                        </button>
                      </div>
                    </div>
                  </mat-list-item>
                </mat-list>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .trainer-dashboard-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 24px;
    }

    .dashboard-header h1 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .dashboard-header p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      opacity: 0.9;
    }

    .stat-info h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .stat-info p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .clients-section {
      margin-top: 24px;
    }

    .clients-list {
      padding: 16px 0;
    }

    .client-item {
      border-bottom: 1px solid #eee;
      padding: 16px 0;
    }

    .client-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .client-avatar.active {
      background: #4CAF50;
    }

    .client-avatar.new {
      background: #FF9800;
    }

    .goal-chip {
      margin-left: 8px;
      padding: 4px 8px;
      background: #f5f5f5;
      border-radius: 12px;
      font-size: 12px;
      color: #666;
    }

    .client-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-direction: column;
    }

    .progress-text {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    @media (max-width: 768px) {
      .trainer-dashboard-container {
        padding: 10px;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .client-actions {
        flex-direction: row;
        flex-wrap: wrap;
      }
    }
  `]
})
export class TrainerDashboardComponent implements OnInit {
  currentUser: any = null;
  clients: Client[] = [];

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    // Mock data for demonstration
    this.clients = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        goal: 'muscle_gain',
        progress: 75,
        lastActive: new Date(),
        status: 'active'
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        goal: 'weight_loss',
        progress: 45,
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'active'
      },
      {
        id: 3,
        name: 'Mike Johnson',
        email: 'mike@example.com',
        goal: 'maintenance',
        progress: 0,
        lastActive: new Date(),
        status: 'new'
      },
      {
        id: 4,
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        goal: 'weight_loss',
        progress: 20,
        lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'inactive'
      }
    ];
  }

  getTotalClients(): number {
    return this.clients.length;
  }

  getActiveClients(): number {
    return this.clients.filter(c => c.status === 'active').length;
  }

  getNewClients(): number {
    return this.clients.filter(c => c.status === 'new').length;
  }

  getAverageProgress(): number {
    if (this.clients.length === 0) return 0;
    const total = this.clients.reduce((sum, client) => sum + client.progress, 0);
    return Math.round(total / this.clients.length);
  }

  getActiveClientsList(): Client[] {
    return this.clients.filter(c => c.status === 'active');
  }

  getNewClientsList(): Client[] {
    return this.clients.filter(c => c.status === 'new');
  }

  getClientInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'active': return 'primary';
      case 'new': return 'accent';
      default: return 'warn';
    }
  }

  getGoalDisplayName(goal: string): string {
    const goalNames: { [key: string]: string } = {
      'weight_loss': 'Weight Loss',
      'muscle_gain': 'Muscle Gain',
      'maintenance': 'Maintenance'
    };
    return goalNames[goal] || goal;
  }

  viewClientDetails(client: Client): void {
    this.snackBar.open(`Viewing details for ${client.name}`, 'Close', { duration: 2000 });
  }

  createWorkoutPlan(client: Client): void {
    this.snackBar.open(`Creating workout plan for ${client.name}`, 'Close', { duration: 2000 });
  }

  createMealPlan(client: Client): void {
    this.snackBar.open(`Creating meal plan for ${client.name}`, 'Close', { duration: 2000 });
  }

  setupInitialPlan(client: Client): void {
    this.snackBar.open(`Setting up initial plan for ${client.name}`, 'Close', { duration: 2000 });
  }
}