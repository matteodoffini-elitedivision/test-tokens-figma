# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is a **Design System Angular Kit** — a Storybook-driven showcase and documentation site for [design-angular-kit](https://github.com/italia/design-angular-kit), the AgID-compliant Angular component library for Italian public administration. It demonstrates multi-brand theming via design tokens (Style Dictionary) and integrates with Bootstrap Italia.

## Commands

```bash
# Dev server
npm start

# Generate design tokens (required before build/storybook)
npm run tokens

# Build (runs token generation first)
npm run build

# Run all tests (Vitest)
ng test

# Run tests in watch mode
ng test --watch

# Storybook (runs tokens + compodoc + storybook on :6006)
npm run storybook

# Generate Compodoc API documentation
npm run compodoc

# Visual regression testing
npm run chromatic
```

To run a **single test file**, Vitest does not have a dedicated Angular CLI flag — use the `--reporter` or filter via the Vitest config, or run `npx vitest run src/path/to/file.spec.ts` directly.

## Architecture

### Token → Theme Pipeline

The theming pipeline runs **before** any Angular build:

1. **`tokens/`** — Design token source files in W3C format (`$.type`, `$.value`, `$.description`).
   - `tokens/core/` — global, semantic, and specific base tokens.
   - `tokens/brands/{brand}/` — brand-specific overrides (`regione-lombardia`, `open2-plus`).
   - `brands.config.js` — maps brand keys to their token file paths.

2. **`build.js`** — Style Dictionary pipeline. Registers two custom transforms:
   - `name/it-short`: shortens token names to AgID format (e.g. `it-primary`).
   - `color/rgb-values`: converts hex colors to RGB channel values for Bootstrap variables.
   Outputs:
   - **SCSS**: `src/styles/themes/{brand}/_variables.scss` — imported into the Angular app.
   - **CSS**: `public/themes/{brand}/` — hex and RGB variants loaded at runtime for theme switching.

3. **`src/styles.scss`** — Imports Bootstrap Italia CSS and maps generated SCSS token variables to Bootstrap CSS custom properties.

### Storybook Setup

- **`.storybook/main.ts`** — Configures story globs, addons (a11y, docs, designs, interactions).
- **`.storybook/preview.ts`** — Adds a global brand-theme switcher decorator (dropdown that swaps the CSS theme file) and initializes the design-angular-kit. All stories get theme switching for free via this decorator.
- **`src/stories/`** — Example components (`button`, `header`, `page`) with `.stories.ts` and `.spec.ts` files. These are demonstration stories, not the library itself.

### Angular App

- **Standalone components only** — no NgModules anywhere. All components use the standalone API.
- **`src/app/app.ts`** — Root component using `RouterOutlet` and Angular signals.
- **`src/app/app.config.ts`** — Application config (`provideRouter`, global error listeners).
- The `design-angular-kit` npm package is the actual component library being demonstrated; components from it are imported directly in stories.

### Testing

Tests use **Vitest** (not Jest/Karma) with Angular's `TestBed`. The `tsconfig.spec.json` includes `"vitest/globals"` types. Test files follow the `*.spec.ts` convention co-located with their component.

## Key Design Decisions

- **Style Dictionary v5** is used — the API changed significantly from v3; transforms and platforms are registered with the new `StyleDictionary` class API.
- **Bootstrap Italia CSS variables** are the bridge between design tokens and the UI — the token pipeline outputs values that override Bootstrap's CSS custom properties, keeping the styling layer compatible with the upstream Bootstrap Italia framework.
- Storybook's brand switcher swaps a `<link>` tag pointing to `/public/themes/{brand}/` CSS at runtime, so no rebuild is needed when switching brands in the UI.
