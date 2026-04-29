# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is a **Design System Angular Kit** — a Storybook-driven showcase and documentation site for [design-angular-kit](https://github.com/italia/design-angular-kit), the AgID-compliant Angular component library for Italian public administration. It demonstrates multi-brand theming via design tokens (Style Dictionary) and integrates with Bootstrap Italia.

## Commands

```bash
# Dev server (runs token generation first)
npm start

# Generate design tokens only
npm run tokens

# Sync tokens from GitHub Token Studio repo, then regenerate
npm run sync          # requires GITHUB_TOKEN, TOKENS_REPO, TOKENS_BRANCH, TOKENS_DIR env vars

# Build (runs token generation first)
npm run build

# Run all tests (Vitest)
npm test

# Run a single test file
npx vitest run src/path/to/file.spec.ts

# Storybook (runs tokens + compodoc + storybook on :6006)
npm run storybook

# Generate Compodoc API documentation
npm run compodoc

# Visual regression testing
npm run chromatic
```

## Architecture

### Token → Theme Pipeline

The theming pipeline runs **before** any Angular build:

1. **`tokens/`** — Design token source files in W3C format (`$type`, `$value`, `$description`).
   - `tokens/core/` — global (primitives), semantic, and specific (aliases) base tokens.
   - `tokens/brands/{brand}/` — brand-specific overrides. Currently: `regione-lombardia`, `open2-plus`.
   - `brands.config.js` — **auto-discovers** all directories under `tokens/brands/`. Adding a new brand folder with `.json` files is sufficient; no registration needed. Files starting with `$` are skipped (Token Studio metadata).

2. **`build.mjs`** — Style Dictionary v5 pipeline. Registers two custom transforms:
   - `name/it-short`: strips structural category segments (`color`, `background`, `border`, `text`) and prepends `it-` (e.g. `color.background.primary` → `it-primary`).
   - `color/rgb-values`: converts hex to RGB channel values (e.g. `255, 102, 0`) — **applied only to `variables-rgb.css`**, not the main HEX file.

   Outputs per brand:
   - **SCSS** (`transformGroup: "scss"`): `src/styles/themes/{brand}/_variables.scss` — compiled into the Angular bundle at build time.
   - **CSS** (custom transforms): `src/assets/themes/{brand}/variables.css` (hex) and `variables-rgb.css` (RGB) — served as `/assets/themes/{brand}/variables.css` at runtime for theme switching.

3. **`src/styles.scss`** — Imports Bootstrap Italia CSS and maps generated `--it-*` CSS custom properties to Bootstrap's `--bs-*` equivalents (e.g. `--bs-primary: var(--it-primary)`). Also applies brand colors to `.it-header-wrapper`, `.it-nav-wrapper`, and `.it-footer-main`.

### Storybook Setup

Storybook is configured via **`angular.json`** (not a `.storybook/` directory — that folder does not exist). The configuration includes a global brand-theme switcher decorator that swaps the `<link>` tag pointing to `/assets/themes/{brand}/variables.css` at runtime, so all stories get brand switching without a rebuild.

- **`src/stories/`** — Demonstration stories (`button`, `header`, `page`, `AgidButton`). These showcase the library; they are not the library itself. `AgidButton` imports `DesignAngularKitModule.forRoot()` with `CUSTOM_ELEMENTS_SCHEMA` to consume Bootstrap Italia web components.

### Angular App

- **Standalone components only** — no NgModules anywhere.
- **`src/app/app.ts`** — Root component using `RouterOutlet` and Angular signals (`signal()`).
- **`src/app/app.config.ts`** — Application config: `provideRouter`, `provideBrowserGlobalErrorListeners`.
- The `design-angular-kit` npm package is the actual component library being demonstrated; import its components directly in stories.

### Showcase Page (`/showcase`)

The app's main route (`/`) redirects to `/showcase`, a live theme-preview page built with Bootstrap Italia classes.

- **`src/app/pages/showcase/showcase.component.ts`** — Displays a color palette (reading `--it-*` CSS vars), button variants, a reactive form with validation, and a multi-column footer. All data (colors, buttons, footer columns) is defined as typed arrays in the component class.
- **`src/app/services/theme.service.ts`** — Injectable service that manages the active brand. Uses an Angular `signal` for `currentBrand`. On change, an `effect` injects or updates a `<link id="brand-theme">` tag in `<head>` pointing to `/assets/themes/{brand}/variables.css`. The selection is persisted in `localStorage`. Available brands are hardcoded in the service (`open2-plus`, `regione-lombardia`). Adding a new brand requires updating both the token pipeline output **and** the `availableBrands` array in this service.

### Testing

Tests use **Vitest** (not Jest/Karma) with Angular's `TestBed`. `tsconfig.spec.json` includes `"vitest/globals"` in types so `describe`/`it`/`expect` are available globally without imports. Test files are `*.spec.ts` co-located with their component.

## Key Design Decisions

- **Style Dictionary v5** — the API changed significantly from v3. Transforms are registered on the `StyleDictionary` class directly (not on instances). Do not follow v3 documentation. `build.mjs` uses ES module import (`import StyleDictionary from 'style-dictionary'`) — no CommonJS compatibility shim needed.
- **Bootstrap Italia CSS variables** are the bridge between design tokens and the UI. The token pipeline outputs values that override Bootstrap's CSS custom properties, keeping the styling layer compatible with the upstream Bootstrap Italia framework.
- **Dual CSS output** (hex + RGB) matches Bootstrap's dual-variable pattern (`--bs-primary` + `--bs-primary-rgb`). The SCSS output is build-time only; the CSS output enables runtime brand switching in Storybook without a rebuild.
- **TypeScript strict mode is fully enabled** — `strict: true` plus `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `strictInjectionParameters`, `strictInputAccessModifiers`, `strictTemplates`. Angular compiler strict checks are also on.
