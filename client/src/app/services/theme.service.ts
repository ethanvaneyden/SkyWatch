import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private theme = signal<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  constructor() {
    // Apply theme on initialization
    this.applyTheme(this.theme());
    
    // Effect to update localStorage and DOM when signal changes
    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem('theme', currentTheme);
      this.applyTheme(currentTheme);
    });
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  get currentTheme() {
    return this.theme;
  }

  private applyTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
