import { inject, Injectable, signal, effect, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export interface Brand {
  key: string;
  label: string;
}

/**
 * Gestisce il caricamento dinamico del foglio CSS del brand attivo.
 *
 * Meccanismo: inietta (o aggiorna) un tag <link id="brand-theme"> nel <head>.
 * Cambiando `currentBrand`, l'`effect` sostituisce l'href senza ricaricare la pagina.
 *
 * I file CSS vengono da: /themes/{brand}/variables.css
 * (generati da Style Dictionary e serviti da Angular tramite la cartella public/).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly availableBrands: Brand[] = [
    { key: 'open2-plus', label: 'Open2 Plus' },
    { key: 'regione-lombardia', label: 'Regione Lombardia' },
  ];

  readonly currentBrand = signal<string>(this.getPersistedBrand());

  constructor() {
    effect(() => {
      const brand = this.currentBrand();
      if (isPlatformBrowser(this.platformId)) {
        this.applyTheme(brand);
        localStorage.setItem('brand', brand);
      }
    });
  }

  setBrand(key: string): void {
    if (this.availableBrands.some((b) => b.key === key)) {
      this.currentBrand.set(key);
    }
  }

  private applyTheme(brand: string): void {
    const LINK_ID = 'brand-theme';
    let link = this.document.getElementById(LINK_ID) as HTMLLinkElement | null;

    if (!link) {
      link = this.document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      this.document.head.appendChild(link);
    }

    link.href = `/assets/themes/${brand}/variables.css`;
  }

  private getPersistedBrand(): string {
    try {
      return localStorage.getItem('brand') ?? this.availableBrands[0].key;
    } catch {
      return this.availableBrands[0].key;
    }
  }
}
