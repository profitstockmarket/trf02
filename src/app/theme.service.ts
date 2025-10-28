import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _isBrowser = false;
  private _dark = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this._isBrowser = isPlatformBrowser(platformId);
    this.init();
  }

  init() {
    if (!this._isBrowser) return;
    // Themeing disabled: always use light theme
    this._dark = false;
    // Optionally clear previously saved preference
    try { localStorage.removeItem('trf_theme'); } catch {}
    this.apply();
  }

  toggle() { /* no-op while themes are disabled */ }

  isDark() { return false; }

  private apply() {
    if (!this._isBrowser) return;
    const root = document.documentElement;
    // Ensure dark theme class is not applied
    root.classList.remove('theme-dark');
  }
}
