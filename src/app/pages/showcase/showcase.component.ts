import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

interface ColorToken {
  label: string;
  cssVar: string;
  textClass: string;
}

interface FooterColumn {
  title: string;
  links: string[];
}

@Component({
  selector: 'app-showcase',
  imports: [ReactiveFormsModule, TitleCasePipe],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.scss',
})
export class ShowcaseComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    region: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue],
  });

  protected readonly colorPalette: ColorToken[] = [
    { label: 'Primary',         cssVar: '--it-primary',         textClass: 'text-white'   },
    { label: 'Primary Light',   cssVar: '--it-primary-light',   textClass: 'text-primary' },
    { label: 'Primary Lighter', cssVar: '--it-primary-lighter', textClass: 'text-primary' },
    { label: 'Secondary',       cssVar: '--it-secondary',       textClass: 'text-white'   },
    { label: 'Success',         cssVar: '--it-success',         textClass: 'text-white'   },
    { label: 'Warning',         cssVar: '--it-warning',         textClass: 'text-dark'    },
    { label: 'Danger',          cssVar: '--it-danger',          textClass: 'text-white'   },
    { label: 'Primary Muted',   cssVar: '--it-primary-muted',   textClass: 'text-primary' },
  ];

  protected readonly buttonVariants = [
    { label: 'Primary',           classes: 'btn btn-primary'           },
    { label: 'Secondary',         classes: 'btn btn-secondary'         },
    { label: 'Outline Primary',   classes: 'btn btn-outline-primary'   },
    { label: 'Outline Secondary', classes: 'btn btn-outline-secondary' },
    { label: 'Danger',            classes: 'btn btn-danger'            },
    { label: 'Link',              classes: 'btn btn-link'              },
  ];

  protected readonly sizeVariants = [
    { label: 'Large',   classes: 'btn btn-primary btn-lg' },
    { label: 'Default', classes: 'btn btn-primary'        },
    { label: 'Small',   classes: 'btn btn-primary btn-sm' },
  ];

  protected readonly regions = [
    'Lombardia', 'Veneto', 'Piemonte', 'Toscana', 'Lazio', 'Campania', 'Sicilia',
  ];

  protected readonly footerColumns: FooterColumn[] = [
    { title: 'Amministrazione', links: ['Chi siamo', 'Struttura', 'Bandi e gare', 'Documenti'] },
    { title: 'Servizi',         links: ['Servizi digitali', 'Prenotazioni', 'Certificati', 'Sportello'] },
    { title: 'Novità',          links: ['Notizie', 'Comunicati stampa', 'Agenda', 'Newsletter'] },
    { title: 'Contatti',        links: ['Uffici', 'Posta certificata', 'Social', 'Segnalazioni'] },
  ];

  protected onSubmit(): void {
    if (this.form.valid) {
      console.log('Form inviato:', this.form.value);
    }
  }
}
