import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };
  error: string | null = null;
  loading = false;

  authService = inject(AuthService);
  router = inject(Router);
  themeService = inject(ThemeService);

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  onSubmit() {
    this.loading = true;
    this.error = null;
    this.authService.login(this.credentials).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = typeof err === 'string' ? err : 'Login failed. Please check your credentials.';
      }
    });
  }
}
