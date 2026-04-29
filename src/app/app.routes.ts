import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'showcase',
    pathMatch: 'full',
  },
  {
    path: 'showcase',
    loadComponent: () =>
      import('./pages/showcase/showcase.component').then((m) => m.ShowcaseComponent),
    title: 'Design System Showcase',
  },
];
