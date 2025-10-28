import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  template: `
  <footer class="site-footer mt-5">
    <div class="container py-5">
      <div class="row g-4 align-items-center">
        <div class="col-12 col-lg d-flex align-items-center gap-3 order-1 order-lg-1 justify-content-center justify-content-lg-start text-center text-lg-start">
          <div class="brand-dot"></div>
          <div>
            <div class="fw-semibold">The Raghuvansh Foundation</div>
            <div class="text-secondary small"></div>
          </div>
        </div>
        <div class="col-12 col-lg-auto ms-lg-auto d-flex flex-wrap gap-3 order-2 order-lg-2 justify-content-center justify-content-lg-start">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="foot-link">Home</a>
          <a routerLink="/about" routerLinkActive="active" class="foot-link">About</a>
          <a routerLink="/media" routerLinkActive="active" class="foot-link">Media</a>
        </div>
        <div class="col-12 col-lg-auto d-flex align-items-center gap-3 order-3 order-lg-3 justify-content-center justify-content-lg-end">
          <a href="#" aria-label="GitHub" class="icon-link" rel="noopener">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.85 9.68.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.61-3.37-1.37-3.37-1.37-.45-1.17-1.1-1.48-1.1-1.48-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.37 1.12 2.95.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.04A9.34 9.34 0 0 1 12 7.52c.85 0 1.7.12 2.5.34 1.9-1.31 2.74-1.04 2.74-1.04.56 1.42.21 2.47.1 2.73.64.71 1.03 1.62 1.03 2.74 0 3.94-2.34 4.8-4.57 5.06.36.32.68.93.68 1.89 0 1.36-.01 2.46-.01 2.8 0 .26.18.59.69.49A10.08 10.08 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"/>
            </svg>
          </a>
          <a href="#" aria-label="LinkedIn" class="icon-link" rel="noopener">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.94 8.92H4.13V20h2.81V8.92ZM5.53 7.56a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28Zm5.84 12.44h2.81v-6.13c0-1.54.55-2.6 1.93-2.6 1.05 0 1.58.71 1.84 1.39.1.25.13.59.13.95V20h2.81v-6.58c0-3.52-1.88-5.16-4.4-5.16-2.02 0-2.91 1.13-3.4 1.92h.02v-1.65h-2.74c.04 1.07 0 11.47 0 11.47Z"/>
            </svg>
          </a>
          <a href="#" aria-label="Email" class="icon-link" rel="noopener">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 2v.01L12 13 4 6.01V6h16ZM4 18V8.24l8 6.99 8-6.99V18H4Z"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Newsletter micro form -->
      <div class="row g-3 mt-2 justify-content-center">
        <div class="col-12 col-lg-6">
          <form novalidate #form="ngForm" (ngSubmit)="subscribe(form)" class="newsletter input-group input-group-sm">
            <input
              class="form-control"
              type="email"
              name="email"
              [(ngModel)]="email"
              required
              placeholder="Your email"
              [class.is-invalid]="form.submitted && form.controls['email']?.invalid"
              aria-label="Email address" />
            <button class="btn btn-primary" type="submit" [disabled]="loading || form.invalid">
              {{ loading ? 'Subscribing…' : 'Subscribe' }}
            </button>
          </form>
          <div class="small text-secondary mt-1 text-center text-lg-start" *ngIf="!success">No spam. Unsubscribe any time.</div>
          <div class="small text-success mt-1 text-center text-lg-start" *ngIf="success">Thanks! Please check your inbox to confirm.</div>
          <div class="small text-danger mt-1 text-center text-lg-start" *ngIf="error">Something went wrong. Please try again.</div>
        </div>
      </div>

      <div class="divider my-4"></div>

      <div class="d-flex justify-content-center justify-content-lg-between flex-wrap gap-2 small text-secondary text-center text-lg-start">
        <span>© {{ year }} The Raghuvansh Foundation</span>
        <span>Built with Angular SSR & AWS</span>
      </div>
    </div>
  </footer>
  `,
  styles: [`
    .site-footer {
      border-top: 1px solid var(--border);
      background-color: var(--fusion-link-water);
      background-image:
        radial-gradient(800px 220px at 100% 0%, color-mix(in srgb, var(--fusion-viking) 18%, transparent), transparent 62%),
        linear-gradient(var(--fusion-gradient-angle),
          color-mix(in srgb, var(--fusion-link-water) 80%, var(--fusion-white)) 0%,
          color-mix(in srgb, var(--fusion-light-wisteria) 65%, transparent) 52%,
          color-mix(in srgb, var(--fusion-viking) 40%, transparent) 100%
        );
    }

    .theme-dark .site-footer {
      background-color: #0c0f14;
      background-image:
        radial-gradient(800px 220px at 100% 0%, color-mix(in srgb, var(--fusion-viking) 14%, transparent), transparent 62%),
        linear-gradient(var(--fusion-gradient-angle),
          color-mix(in srgb, var(--fusion-black) 92%, var(--fusion-light-wisteria) 8%) 0%,
          color-mix(in srgb, var(--fusion-black) 88%, var(--fusion-link-water) 12%) 100%
        );
    }
    .foot-link { color: var(--muted); text-decoration: none; }
    .foot-link:hover, .foot-link.active { color: var(--fg); }
    .icon-link { color: var(--muted); display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; transition: transform .15s ease, color .15s ease, background-color .15s ease; }
    .icon-link:hover { color: var(--fg); transform: translateY(-1px); background: rgba(0,0,0,0.03); }
    .theme-dark .icon-link:hover { background: rgba(255,255,255,0.05); }
    .brand-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 20%, transparent); }
    .newsletter .form-control { background: transparent; border-color: var(--border); color: var(--fg); }
    .newsletter .form-control::placeholder { color: var(--muted); }
    .newsletter .btn-primary { background: var(--accent); border-color: var(--accent); }
    .newsletter .btn-primary:hover { filter: brightness(0.95); }
    @supports not (color: color-mix(in srgb, black, white)) { .brand-dot { box-shadow: none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
  email = '';
  loading = false;
  success = false;
  error = false;

  subscribe(form: NgForm) {
    this.error = false;
    this.success = false;
    if (form.invalid) return;
    this.loading = true;
    // Placeholder async: integrate with your newsletter API endpoint here
    setTimeout(() => {
      this.loading = false;
      this.success = true;
      this.email = '';
      form.resetForm();
    }, 700);
  }
}
