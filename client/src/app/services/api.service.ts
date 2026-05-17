import { Injectable, inject } from '@angular/core';
import { WebsocketService } from './websocket.service';
import { Observable, filter, map, take, firstValueFrom, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private ws = inject(WebsocketService);

  post<T>(data: any): Observable<T> {
    // Send the message
    this.ws.send(data);

    // Wait for the response
    // For LOGIN, we expect LOGIN_SUCCESS or ERROR
    // For REGISTER, we expect REGISTRATION_SUCCESS or ERROR
    // This is a bit simplified as it doesn't handle multiple concurrent requests well without IDs
    return this.ws.messages$.pipe(
      filter(msg => {
        if (data.type === 'Login') {
          return msg.type === 'LOGIN_SUCCESS' || msg.type === 'ERROR';
        }
        if (data.type === 'Register') {
          return msg.type === 'REGISTRATION_SUCCESS' || msg.type === 'ERROR';
        }
        return false;
      }),
      take(1),
      map(msg => {
        if (msg.type === 'ERROR') {
          throw msg.message;
        }
        return { status: 'success', data: msg } as any;
      })
    );
  }

  // Helper for requests that don't follow the same pattern
  request(type: string, payload: any): Observable<any> {
    this.ws.send({ type, ...payload });
    return this.ws.messages$.pipe(
      filter(msg => msg.type === type + '_SUCCESS' || msg.type === 'ERROR'),
      take(1)
    );
  }
}
