
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Media } from './pages/media/media';

export const routes: Routes = [
	{ path: '', component: Home },
	{ path: 'about', component: About },
	{ path: 'media', component: Media },
	{ path: '**', redirectTo: '' }
];
