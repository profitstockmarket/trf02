import { Component } from '@angular/core';
import { MediaComponent } from '../../media.component';

@Component({
  // Keep the exported class name `Media` because routes reference it.
  // This page component is standalone and simply embeds the actual media UI component.
  standalone: true,
  selector: 'app-media-page',
  imports: [MediaComponent],
  template: `<app-media></app-media>`
})
export class Media {}
