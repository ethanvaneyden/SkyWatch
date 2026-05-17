import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { FlightListComponent } from '../flight-list/flight-list.component';
import { MapComponent } from '../map/map.component';
import { WebsocketService } from '../../services/websocket.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FlightListComponent, MapComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  authService = inject(AuthService);
  wsService = inject(WebsocketService);
  themeService = inject(ThemeService);
  
  user = this.authService.currentUser;
  
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
  }
}
