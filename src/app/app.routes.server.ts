import { RenderMode, ServerRoute } from '@angular/ssr';

// In dev, serve all routes via SSR to avoid 404s like "Cannot GET /media".
// You can switch specific paths to Prerender for production if desired.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
