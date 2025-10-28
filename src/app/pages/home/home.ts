import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { MediaService } from '../../media.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, NgOptimizedImage],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {
  latestPhotos: any[] = [];
  isLoadingLatest = true;
  private isBrowser = false;

  constructor(private media: MediaService, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.media.getPhotos().subscribe({
      next: photos => {
        // Sort by lastModified if available (desc)
        const sorted = [...photos].sort((a: any, b: any) => {
          const aT = a.lastModified ? Date.parse(a.lastModified) : 0;
          const bT = b.lastModified ? Date.parse(b.lastModified) : 0;
          return bT - aT;
        });
        this.latestPhotos = sorted.slice(0, 8);
        this.isLoadingLatest = false;
      },
      error: () => { this.latestPhotos = []; this.isLoadingLatest = false; }
    });
  }
}
