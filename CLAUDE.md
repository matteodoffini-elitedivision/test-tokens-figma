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
   - `brands.config.js` — **auto-discovers** all directories under `tokens/brands/` and maps each to its token files. Adding a new folder here is sufficient to create a new brand.

2. **`build.js`** — Style Dictionary v5 pipeline. Registers two custom transforms:
   - `name/it-short`: shortens token paths to AgID format (e.g. `color.background.primary` → `it-primary`).
   - `color/rgb-values`: converts hex colors to RGB channel values (e.g. `255, 102, 0`) needed by Bootstrap's `--bs-*-rgb` variables.
   Outputs per brand:
   - **SCSS**: `src/styles/themes/{brand}/_variables.scss` — SCSS variables imported into the Angular app at build time.
   - **CSS**: `public/themes/{brand}/variables.css` (hex) and `variables-rgb.css` (RGB) — loaded at runtime for theme switching.

3. **`src/styles.scss`** — Imports Bootstrap Italia CSS and maps generated `--it-*` token variables to Bootstrap's `--bs-*` CSS custom properties (e.g. `--bs-primary: var(--it-primary)`). Also applies brand colors to `.it-header-wrapper`, `.it-nav-wrapper`, and `.it-footer-main`.

### Storybook Setup

- **`.storybook/main.ts`** — Configures story globs, addons: `a11y`, `docs`, `designs`, `interactions`.
- **`.storybook/preview.ts`** — Adds a global brand-theme switcher decorator that swaps the `<link>` tag pointing to `/public/themes/{brand}/variables.css` at runtime. All stories get brand switching for free; no rebuild needed.
- **`src/stories/`** — Demonstration stories (`button`, `header`, `page`, `AgidButton`). These showcase the library; they are not the library itself. `AgidButton` imports from `design-angular-kit` with `CUSTOM_ELEMENTS_SCHEMA`.

### Angular App

- **Standalone components only** — no NgModules anywhere.
- **`src/app/app.ts`** — Root component using `RouterOutlet` and Angular signals (`signal()`).
- **`src/app/app.config.ts`** — Application config: `provideRouter`, `provideBrowserGlobalErrorListeners`.
- The `design-angular-kit` npm package is the actual component library being demonstrated; import its components directly in stories.

### Testing

Tests use **Vitest** (not Jest/Karma) with Angular's `TestBed`. `tsconfig.spec.json` includes `"vitest/globals"` in types so `describe`/`it`/`expect` are available globally. Test files are `*.spec.ts` co-located with their component.

## Key Design Decisions

- **Style Dictionary v5** — the API changed significantly from v3. Transforms and platforms are registered on the `StyleDictionary` class instance, not globally. Do not follow v3 documentation.
- **Bootstrap Italia CSS variables** are the bridge between design tokens and the UI. The token pipeline outputs values that override Bootstrap's CSS custom properties, keeping the styling layer compatible with the upstream Bootstrap Italia framework.
- **Brand switcher swaps a `<link>` tag** at runtime (not CSS class toggling), so the full cascade of each brand's variables is loaded independently. The hex and RGB files are separate to match Bootstrap's dual-variable pattern (`--bs-primary` + `--bs-primary-rgb`).
- **TypeScript strict mode is fully enabled** — `strict: true` plus `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `strictInjectionParameters`, `strictInputAccessModifiers`, `strictTemplates`. Angular compiler strict checks are also on.
