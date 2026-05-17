import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebsocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-flight-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flight-list.component.html',
  styleUrls: ['./flight-list.component.css']
})
export class FlightListComponent implements OnInit {
  private ws = inject(WebsocketService);
  private auth = inject(AuthService);

  flights = signal<any[]>([]);
  loading = signal<boolean>(true);
  user = this.auth.currentUser;

  ngOnInit() {
    this.loadFlights();
    this.listenForUpdates();
  }

  loadFlights() {
    this.loading.set(true);
    // Request flights based on role
    const message = this.user()?.user_type === 'ATC' 
      ? { type: 'GET_ALL_FLIGHTS' } 
      : { type: 'GET_MY_FLIGHTS' };
    
    this.ws.send(message);
  }

  listenForUpdates() {
    this.ws.messages$.subscribe(msg => {
      if (msg.type === 'FLIGHT_LIST') {
        this.flights.set(msg.flights);
        this.loading.set(false);
      }
      if (msg.type === 'BOARDING_CALL' || msg.type === 'DISPATCHED') {
        this.loadFlights();
      }
    });
  }

  dispatchFlight(flightId: number) {
    this.ws.send({ type: 'DISPATCH', flight_id: flightId });
  }

  trackFlight(flightId: number) {
    this.ws.send({ type: 'TRACK', flight_id: flightId });
  }

  boardFlight(flightId: number) {
    this.ws.send({ type: 'BOARD', flight_id: flightId });
  }
}
