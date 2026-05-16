import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { of, Observable } from 'rxjs';

export interface User {
  name: string;
  surname: string;
  email: string;
  user_type: 'Passenger' | 'ATC';
  apikey: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  currentUser = signal<User | null>(this.loadUserFromStorage());

  login(credentials: any): Observable<any> {
    const email = (credentials.email || '').toString().trim().toLowerCase();
    const password = (credentials.password || '').toString().trim();

    console.log('Login attempt:', { email, password });

    // DEFAULT TEST ACCOUNTS (These skip the server entirely)
    if (email === 'atc@skywatch.com' && password === 'password123') {
      console.log('Matched Test ATC account');
      const user: User = { name: 'ATC', surname: 'Test', email: email, user_type: 'ATC', apikey: 'test-atc-key' };
      this.saveUser(user);
      return of({ status: 'success', data: { apikey: 'test-atc-key' } });
    }

    if (email === 'passenger@skywatch.com' && password === 'password123') {
      console.log('Matched Test Passenger account');
      const user: User = { name: 'Passenger', surname: 'Test', email: email, user_type: 'Passenger', apikey: 'test-passenger-key' };
      this.saveUser(user);
      return of({ status: 'success', data: { apikey: 'test-passenger-key' } });
    }

    // If it's not a test account, try the Wheatley server
    console.log('Hitting Wheatley Server...');
    return this.api.post<any>({ type: 'Login', ...credentials }).pipe(
      tap(response => {
        if (response.status === 'success') {
          const user: User = {
            ...credentials,
            apikey: response.data.apikey,
            // These would normally come from the API, but for now we take them from the login attempt if possible
            // or we might need another GetUser info call.
            // The API docs say Login only returns apikey.
          };
          this.saveUser(user);
        }
      })
    );
  }

  register(userData: any) {
    return this.api.post<any>({ type: 'Register', ...userData }).pipe(
      tap(response => {
        if (response.status === 'success') {
          const user: User = {
            ...userData,
            apikey: response.data.apikey
          };
          this.saveUser(user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('skywatch_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private saveUser(user: User) {
    localStorage.setItem('skywatch_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  private loadUserFromStorage(): User | null {
    const data = localStorage.getItem('skywatch_user');
    return data ? JSON.parse(data) : null;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }
}
