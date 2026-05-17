import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  
  public messages$ = this.messageSubject.asObservable();
  public isConnected = signal<boolean>(false);

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.socket = new WebSocket(environment.wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket Connected');
        this.isConnected.set(true);
      };

      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.messageSubject.next(message);
      };

      this.socket.onclose = () => {
        console.log('WebSocket Disconnected');
        this.isConnected.set(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }

  send(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open. Message not sent:', message);
    }
  }
}
