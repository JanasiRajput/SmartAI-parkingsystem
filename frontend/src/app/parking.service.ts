import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface DashboardStats {
  occupancy: number;
  available_spots: number;
  active_vehicles: number;
  total_revenue: number;
  prediction_alert?: string;
  experience_score: number;
  congestion_level: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParkingService {
  private apiUrl = 'http://localhost:8000';
  private wsUrl = 'ws://localhost:8000/ws';
  private socket?: WebSocket;

  stats = signal<DashboardStats | null>(null);
  activeVehicles = signal<any[]>([]);

  constructor(private http: HttpClient) {
    this.connectWebSocket();
    this.fetchInitialStats();
    this.fetchActiveVehicles();
  }

  private connectWebSocket() {
    this.socket = new WebSocket(this.wsUrl);
    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'STATS_UPDATE') {
        this.stats.set(msg.data);
        this.fetchActiveVehicles();
      }
    };
    this.socket.onclose = () => {
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  private fetchInitialStats() {
    this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`).subscribe(data => {
      this.stats.set(data);
    });
  }

  fetchActiveVehicles() {
    this.http.get<any[]>(`${this.apiUrl}/vehicles/active`).subscribe(data => {
      this.activeVehicles.set(data);
    });
  }

  enterVehicle(license_plate: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/vehicles/entry`, { license_plate });
  }

  exitVehicle(license_plate: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/vehicles/exit/${license_plate}`, {});
  }

  simulateRushHour(count: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/simulate/rush-hour`, { count });
  }
}
