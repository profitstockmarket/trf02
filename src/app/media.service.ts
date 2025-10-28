import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MediaService {
  // Runtime config placeholders; populated in constructor with SSR-safe guards.
  private cfg: any = {};
  private apiKey: string = 'YOUR_API_KEY_HERE';
  private listUrl: string = 'YOUR_LIST_PHOTOS_API_URL';
  private uploadUrl: string = 'YOUR_UPLOAD_PHOTO_API_URL';

  private isBrowser = false;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      // Access window only in browser to avoid SSR ReferenceError
      const w = window as any;
      this.cfg = w.__TRF_MEDIA_CONFIG || {};
      this.apiKey = this.cfg.apiKey || this.apiKey;
      this.listUrl = this.cfg.listUrl || this.listUrl;
      this.uploadUrl = this.cfg.uploadUrl || this.uploadUrl;
      // For local dev, use dev-server proxy to avoid CORS and inject headers
      try {
        const host = location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
          this.listUrl = '/api/list-photos';
          this.uploadUrl = '/api/upload-photo';
        }
      } catch {}
      // runtime debug
      console.log('MediaService config:', { listUrl: this.listUrl, uploadUrl: this.uploadUrl, apiKey: this.apiKey });
    } else {
      // On server we can still set from process.env if desired in future.
      this.cfg = {};
    }
  }

  getPhotos(): Observable<any[]> {
    // Avoid SSR/network calls on the server and avoid invalid placeholder URLs
    if (!this.isBrowser) {
      return of([]);
    }
    if (!this.listUrl || this.listUrl.startsWith('YOUR_')) {
      console.warn('MediaService.getPhotos skipped: invalid listUrl', this.listUrl);
      return of([]);
    }
    console.log('MediaService.getPhotos ->', this.listUrl);
    return this.http.get<any>(this.listUrl, {
      headers: new HttpHeaders({ 'x-api-key': this.apiKey })
    }).pipe(
      // API Gateway + Lambda proxy may return an object { statusCode, headers, body }
      // where body is a JSON string. Normalize to an array of photo objects.
      map(resp => {
        if (!resp) return [];
        // If response already an array
        if (Array.isArray(resp)) return resp;
        // If Lambda proxy shape
        if (resp.body) {
          try {
            const parsed = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body;
            return parsed;
          } catch (e) {
            return [];
          }
        }
        // Unexpected shape
        return [];
      })
    );
  }

  uploadPhoto(file: File, prefix?: string): Observable<any> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const body = {
          filename: file.name,
          filetype: file.type,
          data: base64,
          // Optional target folder/prefix in the bucket
          ...(prefix ? { prefix } : {})
        };
        this.http.post<any>(this.uploadUrl, body, {
          headers: new HttpHeaders({ 'x-api-key': this.apiKey })
        }).subscribe({
          next: res => observer.next(res),
          error: err => observer.error(err),
          complete: () => observer.complete()
        });
      };
      reader.readAsDataURL(file);
    });
  }
}
