import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Import Bootstrap JS for navbar toggler functionality
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
