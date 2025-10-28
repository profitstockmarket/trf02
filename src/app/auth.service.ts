import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isBrowser = false;
  private _isAdmin = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this._isBrowser = isPlatformBrowser(platformId);
    this._bootstrap();
  }

  private _bootstrap() {
    if (!this._isBrowser) return;
    // Derive admin from URL (?admin=1) for dev convenience
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get('admin');
      if (q === '1' || q === 'true') {
        localStorage.setItem('trf_is_admin', '1');
      } else if (q === '0' || q === 'false') {
        localStorage.removeItem('trf_is_admin');
      }
    } catch {}

    // Priority: runtime config user role -> localStorage flag
    try {
      const cfg: any = (window as any).__TRF_MEDIA_CONFIG || {};
      if (cfg?.user?.role === 'admin') {
        this._isAdmin = true;
        return;
      }
    } catch {}

    try {
      this._isAdmin = localStorage.getItem('trf_is_admin') === '1';
    } catch { this._isAdmin = false; }
  }

  get isAdmin(): boolean {
    return this._isAdmin;
  }
}
