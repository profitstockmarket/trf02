
import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from './media.service';
import { AuthService } from './auth.service';
import { GallerySectionComponent } from './gallery-section.component';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [CommonModule, FormsModule, GallerySectionComponent],
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.css']
})
export class MediaComponent implements OnInit, AfterViewInit, OnDestroy {

  photos: any[] = [];
  groups: Array<{ name: string; photos: any[]; count: number; latest?: number }> = [];
  loading = true;
  uploading = false;
  error = '';
  previewSrc: string | null = null;
  
  // Accordion state: which group names are expanded
  expanded = new Set<string>();
  // Sorting state
  sortBy: 'name' | 'count' | 'recent' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';
  // Grouping depth (1: top-level, 2: two-level prefixes)
  groupDepth: 1 | 2 = 1;
  // Upload target folder
  selectedFolder: string = '';
  
  @ViewChild('fileInput', { static: false }) fileInput?: ElementRef<HTMLInputElement>;

  private isBrowser = false;
  constructor(private mediaService: MediaService, private cdr: ChangeDetectorRef, public auth: AuthService, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }


  ngOnInit() {
    // Load photos only in browser to avoid SSR HTTP calls
    if (this.isBrowser) {
      this.restoreAccordionState();
      this.restoreSortPrefs();
      this.loadPhotos();
    }
  }

  ngAfterViewInit() {
    // nothing to do; sections manage their own layout
  }

  ngOnDestroy() {
    // no-op
  }

  openFilePicker() {
    if (!this.auth.isAdmin) { return; }
    try {
      this.fileInput?.nativeElement.click();
    } catch (e) {
      // fallback
      const el = document.getElementById('fileInput') as HTMLInputElement | null;
      el?.click();
    }
  }


  loadPhotos() {
    this.loading = true;
    this.mediaService.getPhotos().subscribe({
      next: photos => {
        this.photos = photos;
  this.groups = this.computeGroups(this.photos);
        // Restore or set default upload target
        const restored = this.restoreSelectedFolder();
        this.selectedFolder = restored && this.groups.find(g => g.name === restored)
          ? restored
          : (this.groups[0]?.name || 'root');
        // Expand the first group by default for better UX
        if (this.groups.length && this.expanded.size === 0) {
          this.expanded.add(this.groups[0].name);
        }
        // Re-apply restored expansion for existing groups
        this.expanded = new Set([...this.expanded].filter(n => this.groups.find(g => g.name === n)));
        console.log('media: loaded photos', photos);
        this.loading = false;
        try { this.cdr.markForCheck(); this.cdr.detectChanges(); } catch {}
      },
      error: err => {
        this.error = 'Failed to load photos.';
        console.error('media: error loading photos', err);
        this.loading = false;
      }
    });
  }

  private computeGroups(photos: any[]): Array<{ name: string; photos: any[]; count: number; latest?: number }> {
    const byFolder: Record<string, any[]> = {};
    for (const p of photos || []) {
      const key: string = p.key || '';
      const parts = key.split('/');
      const folder = parts.length > 1
        ? (this.groupDepth === 2 && parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0])
        : 'root';
      (byFolder[folder] ||= []).push(p);
    }
    let groups: Array<{ name: string; photos: any[]; count: number; latest?: number }> = Object.entries(byFolder).map(([name, arr]) => ({
      name,
      photos: arr,
      count: arr.length,
      latest: this.computeLatest(arr)
    }));
    groups = this.sortGroups(groups);
    return groups;
  }

  private computeLatest(arr: any[]): number | undefined {
    // Prefer lastModified timestamp if available; else undefined
    const ts = arr
      .map(p => {
        const lm = (p.lastModified || p.LastModified);
        if (!lm) return undefined;
        try { return typeof lm === 'string' ? Date.parse(lm) : (lm instanceof Date ? lm.getTime() : undefined); } catch { return undefined; }
      })
      .filter((x: any) => typeof x === 'number') as number[];
    if (!ts.length) return undefined;
    return Math.max(...ts);
  }

  private sortGroups(groups: Array<{ name: string; photos: any[]; count: number; latest?: number }>) {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return groups.sort((a, b) => {
      if (this.sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (this.sortBy === 'count') return ((a.count) - (b.count)) * dir;
      if (this.sortBy === 'recent') return (((a.latest || 0) - (b.latest || 0)) || 0) * dir;
      return 0;
    });
  }

  onFileSelected(event: any) {
    if (!this.auth.isAdmin) { return; }
    const file = event.target.files[0];
    if (!file) return;
    // Confirm creating a new folder if selectedFolder is not among existing group names (and not 'root')
    const names = new Set(this.groups.map(g => g.name));
    const folder = (this.selectedFolder || '').trim();
    if (folder && folder !== 'root' && !names.has(folder)) {
      const ok = this.isBrowser ? window.confirm(`Create new folder "${folder}" and upload here?`) : true;
      if (!ok) { return; }
    }
    // Show a preview
    const reader = new FileReader();
    reader.onload = () => {
      this.previewSrc = reader.result as string;
    };
    reader.readAsDataURL(file);

    this.uploading = true;
    this.error = '';
    const prefix = this.getTargetPrefix();
    this.mediaService.uploadPhoto(file, prefix).subscribe({
      next: () => {
        this.uploading = false;
        this.previewSrc = null;
        // reload photos and recalc layout
        this.loadPhotos();
      },
      error: err => {
        this.uploading = false;
        this.error = 'Upload failed.';
      }
    });
  }

  // Accordion helpers
  isExpanded(name: string): boolean { return this.expanded.has(name); }
  toggleGroup(name: string) {
    if (this.expanded.has(name)) this.expanded.delete(name); else this.expanded.add(name);
    this.persistAccordionState();
  }
  expandAll() { for (const g of this.groups) this.expanded.add(g.name); }
  collapseAll() { this.expanded.clear(); this.persistAccordionState(); }

  trackGroup = (index: number, g: {name: string}) => g.name;

  onSortChange() {
    this.persistSortPrefs();
    this.groups = this.sortGroups([...this.groups]);
  }
  onGroupDepthChange() {
    // Recompute groups with new depth
    this.groups = this.computeGroups(this.photos);
    // Keep existing expanded names that still exist
    this.expanded = new Set([...this.expanded].filter(n => this.groups.find(g => g.name === n)));
  }

  private persistAccordionState() {
    try { localStorage.setItem('trf_media_expanded', JSON.stringify([...this.expanded])); } catch {}
  }
  private restoreAccordionState() {
    try {
      const raw = localStorage.getItem('trf_media_expanded');
      if (raw) this.expanded = new Set(JSON.parse(raw));
    } catch {}
  }

  private getTargetPrefix(): string | undefined {
    const s = (this.selectedFolder || '').trim();
    if (!s) return undefined;
    // Normalize: strip leading/trailing slashes
    return s.replace(/^\/+|\/+$/g, '');
  }

  private persistSortPrefs() {
    try {
      localStorage.setItem('trf_media_sort', JSON.stringify({ by: this.sortBy, dir: this.sortDir, depth: this.groupDepth }));
    } catch {}
  }
  private restoreSortPrefs() {
    try {
      const raw = localStorage.getItem('trf_media_sort');
      if (raw) {
        const v = JSON.parse(raw);
        if (v?.by) this.sortBy = v.by;
        if (v?.dir) this.sortDir = v.dir;
        if (v?.depth === 1 || v?.depth === 2) this.groupDepth = v.depth;
      }
    } catch {}
  }

  // Selected folder persistence
  onSelectedFolderChange(value: string) {
    this.selectedFolder = (value || '').trim();
    try { localStorage.setItem('trf_media_selected_folder', this.selectedFolder); } catch {}
  }
  private restoreSelectedFolder(): string | undefined {
    try { return localStorage.getItem('trf_media_selected_folder') || undefined; } catch { return undefined; }
  }
}
