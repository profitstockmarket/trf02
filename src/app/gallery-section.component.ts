import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, Input, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import justifiedLayout from 'justified-layout';

@Component({
  selector: 'app-gallery-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gallery-section.component.html',
  styleUrls: ['./gallery-section.component.css']
})
export class GallerySectionComponent implements AfterViewInit, OnDestroy {
  @Input() photos: any[] = [];

  layoutBoxes: any[] = [];
  layoutHeight = 0;
  containerWidth = 0;
  private io?: IntersectionObserver;
  private visible = false;
  private scrollRAF = 0;
  private visibleMask: boolean[] = [];

  @ViewChild('galleryContainer', { static: false }) galleryContainer?: ElementRef;

  private isBrowser = false;
  constructor(private cdr: ChangeDetectorRef, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      window.addEventListener('resize', this._onResize);
      window.addEventListener('scroll', this._onScroll, { passive: true });
      // Observe visibility to avoid laying out when hidden
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.visible = true;
              this.updateLayout();
              try { this.cdr.detectChanges(); } catch {}
              this.io?.disconnect();
            }
          }
        });
        if (this.galleryContainer) this.io.observe(this.galleryContainer.nativeElement);
      } else {
        // Fallback: just layout on next tick
        setTimeout(() => { this.updateLayout(); try { this.cdr.detectChanges(); } catch {} }, 0);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      try { window.removeEventListener('resize', this._onResize); } catch {}
      try { window.removeEventListener('scroll', this._onScroll as any); } catch {}
      try { this.io?.disconnect(); } catch {}
    }
  }

  private _onResize = () => this.updateLayout();
  private _onScroll = () => {
    if (!this.visible) return;
    if (this.scrollRAF) return;
    this.scrollRAF = requestAnimationFrame(() => {
      this.scrollRAF = 0;
      this.updateVisibleWindow();
    });
  };

  updateLayout() {
    if (!this.galleryContainer) return;
    const container = this.galleryContainer.nativeElement as HTMLElement;
    this.containerWidth = container.offsetWidth || 800;
    const aspectRatios = this.photos.map((p: any) => (p.width && p.height) ? p.width / p.height : 1.5);
    const layout = justifiedLayout(aspectRatios, {
      containerWidth: this.containerWidth,
      targetRowHeight: 220,
      boxSpacing: 8
    });
    this.layoutBoxes = layout.boxes;
    this.layoutHeight = (layout.containerHeight || (this.layoutBoxes.reduce((m, b) => Math.max(m, (b.top + b.height)), 0))) || 0;
    this.visibleMask = new Array(this.layoutBoxes.length).fill(false);
    this.updateVisibleWindow();
  }

  private updateVisibleWindow() {
    if (!this.galleryContainer) return;
    const el = this.galleryContainer.nativeElement as HTMLElement;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    // Visible range within container coordinates
    const visibleTop = Math.max(0, -rect.top);
    const visibleBottom = Math.max(0, vh - rect.top);
    const buffer = 300; // px
    const start = Math.max(0, visibleTop - buffer);
    const end = visibleBottom + buffer;
    for (let i = 0; i < this.layoutBoxes.length; i++) {
      const b = this.layoutBoxes[i];
      const boxBottom = b.top + b.height;
      const isVisible = boxBottom >= start && b.top <= end;
      this.visibleMask[i] = !!isVisible;
    }
    try { this.cdr.detectChanges(); } catch {}
  }

  isIndexVisible(i: number) { return this.visibleMask[i] ?? true; }
  trackIndex = (index: number) => index;
}
