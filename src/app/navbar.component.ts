import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
// ThemeService removed temporarily; theme toggling disabled

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  template: `
  <nav class="navbar navbar-expand-sm navbar-light bg-transparent border-0 py-3 app-navbar-surface">
    <div class="container">
      <a class="navbar-brand fw-semibold text-dark" routerLink="/">The Raghuvansh Foundation</a>
      <div class="d-flex align-items-center gap-3 ms-4">
        <a class="nav-link link-dark" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
        <a class="nav-link link-dark" routerLink="/about" routerLinkActive="active">About</a>
        <a class="nav-link link-dark" routerLink="/media" routerLinkActive="active">Media</a>
      </div>
    </div>
  </nav>
  `,
  styles: [`
    .app-navbar-surface {
      background-color: var(--fusion-link-water);
      background-image:
        radial-gradient(700px 180px at 100% 0%, color-mix(in srgb, var(--fusion-viking) 16%, transparent), transparent 60%),
        linear-gradient(var(--fusion-gradient-angle),
          color-mix(in srgb, var(--fusion-link-water) 80%, var(--fusion-white)) 0%,
          color-mix(in srgb, var(--fusion-light-wisteria) 55%, transparent) 52%,
          color-mix(in srgb, var(--fusion-viking) 36%, transparent) 100%
        );
    }
    .theme-dark .app-navbar-surface {
      background-color: #0c0f14;
      background-image:
        radial-gradient(700px 180px at 100% 0%, color-mix(in srgb, var(--fusion-viking) 12%, transparent), transparent 60%),
        linear-gradient(var(--fusion-gradient-angle),
          color-mix(in srgb, var(--fusion-black) 92%, var(--fusion-light-wisteria) 8%) 0%,
          color-mix(in srgb, var(--fusion-black) 88%, var(--fusion-link-water) 12%) 100%
        );
    }
    .app-navbar-surface .navbar-brand,
    .app-navbar-surface .nav-link { color: var(--fg) !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {}
