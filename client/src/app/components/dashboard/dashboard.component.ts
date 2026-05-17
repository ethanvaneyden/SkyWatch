import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { FlightListComponent } from '../flight-list/flight-list.component';
import { MapComponent } from '../map/map.component';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FlightListComponent, MapComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  authService = inject(AuthService);
  wsService = inject(WebsocketService);
  
  user = this.authService.currentUser;
  
  logout() {
    this.authService.logout();
  }
}
