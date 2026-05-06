import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParkingService, DashboardStats } from './parking.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="theme-wrapper" [class.dark-mode]="isDarkMode()">
      <div class="luxury-app">
        <header class="fancy-header">
          <div class="logo-area">
            <div class="car-avatar">
              <img src="/car-hero.png" alt="Icon">
            </div>
            <div class="branding">
              <h1>Smart Parking</h1>
              <p class="tagline">The Frictionless Intelligence Suite</p>
            </div>
          </div>
          <div class="header-actions">
            <button class="theme-toggle" (click)="toggleTheme()">
              {{ isDarkMode() ? '🌙' : '☀️' }}
            </button>
            <div class="live-pill">
              <span class="dot"></span> LIVE
            </div>
          </div>
        </header>

        <main class="dashboard-grid">
          <!-- Key Metrics -->
          <section class="metrics-row">
            <div class="metric-card main">
              <div class="card-header">
                <h3>Occupancy 
                  <span class="info-icon" data-tooltip="Percentage of parking spots currently filled.">ⓘ</span>
                </h3>
              </div>
              <div class="big-numbers">
                <span class="curr">{{ stats()?.occupancy || 0 }}</span>
                <span class="sep">/</span>
                <span class="total">100</span>
              </div>
              <div class="gauge-bar">
                <div class="gauge-fill" [style.width.%]="occupancyPercent()"></div>
              </div>
            </div>

            <div class="metric-card accent">
              <div class="card-header">
                <h3>Revenue 
                  <span class="info-icon" data-tooltip="Total fees collected from vehicles that have exited today.">ⓘ</span>
                </h3>
              </div>
              <div class="val">\${{ stats()?.total_revenue || 0 }}</div>
              <div class="trend">Daily Total</div>
            </div>

            <div class="metric-card score">
              <div class="card-header">
                <h3>Frustration Score 
                  <span class="info-icon" data-tooltip="A metric from 0-10 measuring driver ease. Higher scores mean higher congestion.">ⓘ</span>
                </h3>
              </div>
              <div class="val" [style.color]="scoreColor()">
                {{ stats()?.experience_score || 0 }}<small>/10</small>
              </div>
              <div class="level">{{ stats()?.congestion_level }} Congestion</div>
            </div>
          </section>

          <!-- Predictive Alert -->
          <div class="fancy-alert" *ngIf="stats()?.prediction_alert">
            <div class="alert-icon">⚡</div>
            <div class="alert-body">
              <strong>Predictive Insight:</strong> {{ stats()?.prediction_alert }}
            </div>
          </div>

          <div class="sub-grid">
            <!-- Operations -->
            <section class="card operations">
              <h2>Operations 
                <span class="info-icon" data-tooltip="Register new arrivals or process departures by license plate.">ⓘ</span>
              </h2>
              <div class="input-group">
                <input type="text" [(ngModel)]="licensePlate" placeholder="Plate Number (e.g. ABC-123)" (keyup.enter)="onEnter()">
              </div>
              <div class="actions">
                <button class="btn-primary" (click)="onEnter()">Check-In</button>
                <button class="btn-outline" (click)="onExit()">Check-Out</button>
              </div>
              <div class="hr"></div>
              <button class="btn-simulation" (click)="simulateRush()">
                Run Stress Simulation 
                <span class="info-icon" data-tooltip="Simulates a sudden arrival of 10 cars to test AI predictions.">ⓘ</span>
              </button>
            </section>

            <!-- Access List -->
            <section class="card access-list">
              <h2>Access Registry 
                <span class="info-icon" data-tooltip="List of vehicles currently inside the parking lot.">ⓘ</span>
              </h2>
              <div class="registry-container">
                <div class="registry-item" *ngFor="let v of activeVehicles()">
                  <span class="plate">{{ v.license_plate }}</span>
                  <span class="entry-time">{{ v.entry_time | date:'HH:mm' }}</span>
                </div>
                <div class="empty-msg" *ngIf="activeVehicles().length === 0">
                  No active vehicles in the lot.
                </div>
              </div>
            </section>

            <!-- Activity Chart -->
            <section class="card activity full-width">
              <h2>Recent Activity 
                <span class="info-icon" data-tooltip="Hourly trend of parking occupancy.">ⓘ</span>
              </h2>
              <div class="chart">
                <div class="bar-container" *ngFor="let h of hourlyData">
                  <div class="bar" [style.height.%]="h"></div>
                </div>
              </div>
              <div class="chart-footer">
                <span>Morning</span>
                <span>Evening</span>
              </div>
            </section>
          </div>
        </main>

        <footer class="fancy-footer">
          <p>Elegance in Urban Intelligence — SmartParking &copy; 2026</p>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin: 0;
      padding: 0;
    }

    .theme-wrapper {
      --bg: #FDFCF0;
      --card-bg: #FFFFFF;
      --text-main: #2D2D2D;
      --text-muted: #6B6B6B;
      --primary-accent: #800020; /* Burgundy */
      --secondary-accent: #4D0011;
      --border: #E8E6D1;
      --glass: rgba(128, 0, 32, 0.03);
      --btn-text: #FFFFFF;
      
      background-color: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      transition: all 0.4s ease;
      font-family: 'Inter', sans-serif;
    }

    .theme-wrapper.dark-mode {
      --bg: #0F0F0A; /* Darker neutral */
      --card-bg: #1A1A14;
      --text-main: #F5F5DC; /* Beige */
      --text-muted: #949488;
      --primary-accent: #D4AF37; /* Sophisticated Gold */
      --secondary-accent: #B8860B;
      --border: #2D2D24;
      --glass: rgba(212, 175, 55, 0.05);
      --btn-text: #0F0F0A;
    }

    .luxury-app {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Info Icon & Tooltip Bubble */
    .info-icon {
      position: relative;
      cursor: help;
      color: var(--primary-accent);
      font-size: 0.9rem;
      opacity: 0.7;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1px solid var(--primary-accent);
      margin-left: 0.5rem;
    }

    .info-icon:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--text-main);
      color: var(--bg);
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-size: 0.75rem;
      width: 180px;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 100;
      font-family: 'Inter', sans-serif;
      text-transform: none;
      letter-spacing: normal;
      font-weight: 400;
    }

    .info-icon:hover::before {
      content: '';
      position: absolute;
      bottom: 110%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--text-main);
      z-index: 100;
    }

    /* Header */
    .fancy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3rem;
      border-bottom: 2px solid var(--border);
      padding-bottom: 1.5rem;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .car-avatar {
      width: 50px;
      height: 50px;
      background: var(--primary-accent);
      border-radius: 14px;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .car-avatar img { width: 100%; height: auto; filter: brightness(1.2); }

    .branding h1 {
      margin: 0;
      font-family: 'Fraunces', serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary-accent);
    }

    .tagline {
      margin: 0;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .theme-toggle {
      background: var(--card-bg);
      border: 1px solid var(--border);
      width: 44px;
      height: 44px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 1.2rem;
      transition: transform 0.2s;
    }

    .theme-toggle:hover { transform: rotate(15deg); }

    .live-pill {
      background: var(--glass);
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 800;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dot { width: 8px; height: 8px; background: var(--primary-accent); border-radius: 50%; animation: blink 1.5s infinite; }
    @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

    /* Dashboard Metrics */
    .metrics-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--card-bg);
      padding: 1.5rem;
      border-radius: 24px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 15px rgba(0,0,0,0.03);
    }

    .card-header h3 {
      margin: 0;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      display: flex;
      align-items: center;
    }

    .big-numbers {
      font-family: 'Fraunces', serif;
      margin: 1rem 0;
    }

    .curr { font-size: 3.5rem; font-weight: 700; color: var(--primary-accent); }
    .sep { font-size: 1.5rem; color: var(--text-muted); margin: 0 0.5rem; }
    .total { font-size: 1.5rem; font-weight: 400; }

    .gauge-bar {
      height: 8px;
      background: var(--bg);
      border-radius: 10px;
      overflow: hidden;
    }

    .gauge-fill {
      height: 100%;
      background: var(--primary-accent);
      transition: width 1s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .metric-card.accent .val, .metric-card.score .val {
      font-family: 'Fraunces', serif;
      font-size: 2.25rem;
      font-weight: 700;
      margin-top: 1rem;
    }

    .trend, .level { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; }

    /* Alert */
    .fancy-alert {
      background: var(--primary-accent);
      color: var(--btn-text);
      padding: 1.25rem 2rem;
      border-radius: 20px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    }

    .alert-icon { font-size: 1.5rem; }
    .alert-body { font-size: 0.95rem; }

    /* Sub Grid */
    .sub-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .card {
      background: var(--card-bg);
      padding: 2rem;
      border-radius: 24px;
      border: 1px solid var(--border);
    }

    .full-width { grid-column: span 2; }

    h2 { font-family: 'Fraunces', serif; font-size: 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }

    .input-group input {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 1rem;
      border-radius: 12px;
      color: var(--text-main);
      font-size: 1rem;
      margin-bottom: 1.5rem;
      box-sizing: border-box;
    }

    .actions { display: flex; gap: 1rem; }

    button {
      padding: 0.8rem 1.5rem;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary { background: var(--primary-accent); color: var(--btn-text); flex: 1; }
    .btn-primary:hover { background: var(--secondary-accent); }

    .btn-outline { background: transparent; border: 2px solid var(--border); color: var(--text-main); flex: 1; }
    .btn-outline:hover { background: var(--bg); }

    .hr { height: 1px; background: var(--border); margin: 1.5rem 0; }

    .btn-simulation { width: 100%; background: var(--glass); color: var(--primary-accent); border: 1px solid var(--primary-accent); }
    .btn-simulation:hover { background: var(--primary-accent); color: var(--btn-text); }

    /* Access List */
    .registry-container {
      max-height: 200px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .registry-container::-webkit-scrollbar { width: 4px; }
    .registry-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

    .registry-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--bg);
      border-radius: 10px;
      margin-bottom: 0.5rem;
      border: 1px solid var(--border);
    }

    .plate { font-weight: 700; font-family: 'Fraunces', serif; color: var(--primary-accent); }
    .entry-time { font-size: 0.8rem; color: var(--text-muted); }
    .empty-msg { text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 1rem; }

    /* Chart */
    .chart { display: flex; align-items: flex-end; gap: 6px; height: 100px; margin-bottom: 1rem; background: var(--bg); padding: 10px; border-radius: 12px; }
    .bar-container { flex: 1; height: 100%; display: flex; align-items: flex-end; }
    .bar { width: 100%; background: var(--primary-accent); opacity: 0.3; border-radius: 4px 4px 0 0; transition: height 0.5s; }
    .bar:hover { opacity: 1; }
    .chart-footer { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); }

    .fancy-footer { text-align: center; margin-top: 4rem; color: var(--text-muted); font-size: 0.8rem; letter-spacing: 0.05em; }

    @media (max-width: 850px) {
      .metrics-row, .sub-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: span 1; }
    }
  `]
})
export class AppComponent {
  licensePlate = '';
  isConnected = true;
  lastUpdate = new Date();
  hourlyData = [20, 35, 45, 80, 95, 70, 50, 40, 30, 25, 40, 60];
  
  private _isDarkMode = signal(true);
  isDarkMode = computed(() => this._isDarkMode());

  stats: any;
  activeVehicles: any;

  occupancyPercent = computed(() => {
    const s = this.stats ? this.stats() : null;
    return s ? (s.occupancy / 100) * 100 : 0;
  });

  scoreColor = computed(() => {
    const score = (this.stats ? this.stats() : null)?.experience_score || 10;
    if (score > 7) return '#10b981';
    if (score > 4) return '#f59e0b';
    return '#ef4444';
  });

  constructor(private parkingService: ParkingService) {
    this.stats = this.parkingService.stats;
    this.activeVehicles = this.parkingService.activeVehicles;
  }

  toggleTheme() {
    this._isDarkMode.set(!this._isDarkMode());
  }

  onEnter() {
    if (!this.licensePlate) return;
    this.parkingService.enterVehicle(this.licensePlate).subscribe({
      next: () => {
        this.licensePlate = '';
        this.lastUpdate = new Date();
      },
      error: (err) => alert(err.error.detail)
    });
  }

  onExit() {
    if (!this.licensePlate) return;
    this.parkingService.exitVehicle(this.licensePlate).subscribe({
      next: () => {
        this.licensePlate = '';
        this.lastUpdate = new Date();
      },
      error: (err) => alert(err.error.detail)
    });
  }

  simulateRush() {
    this.parkingService.simulateRushHour(10).subscribe();
  }
}
