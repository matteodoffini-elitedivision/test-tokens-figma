/**
 * Style Dictionary v5 — pipeline multi-brand da cartella tokens/brands/.
 *
 * Input:  tokens/core/*.json          (token condivisi)
 *         tokens/brands/{brand}/*.json (override per brand)
 *
 * Output: src/assets/themes/{brand}/variables.css      (hex — runtime Angular)
 *         src/assets/themes/{brand}/variables-rgb.css  (RGB — Bootstrap 5)
 *         src/styles/themes/{brand}/_variables.scss    (build-time Angular)
 *
 * Il brand discovery è automatico: aggiungere una cartella in tokens/brands/
 * fa generare automaticamente il nuovo brand.
 */

import StyleDictionary from 'style-dictionary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// TRASFORMAZIONI PERSONALIZZATE
// ---------------------------------------------------------------------------

/**
 * name/it-short
 * ["color","background","primary"] → "it-primary"
 * Rimuove le categorie strutturali e aggiunge il prefisso AgID "it-".
 */
StyleDictionary.registerTransform({
  name: 'name/it-short',
  type: 'name',
  transform: (token) => {
    const SKIP = new Set(['color', 'background', 'border', 'text', 'theme']);
    const shortPath = token.path.filter((p) => !SKIP.has(p));
    return ['it', ...shortPath].join('-');
  },
});

/**
 * color/rgb-values
 * Converte HEX in "R, G, B" per le variabili *-rgb di Bootstrap 5.
 * Gestisce hex a 6 e 8 cifre (ignora l'alpha).
 */
StyleDictionary.registerTransform({
  name: 'color/rgb-values',
  type: 'value',
  matcher: (token) => token.$type === 'color' || token.type === 'color',
  transform: (token) => {
    const raw = token.value ?? token.$value ?? '';
    const hex = String(raw).replace(/^#/, '');
    if (hex.length < 6) return raw;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  },
});

// ---------------------------------------------------------------------------
// BRAND DISCOVERY (tokens/brands/{brand}/tokens.json)
// ---------------------------------------------------------------------------

function discoverBrands() {
  const brandsDir = path.join(__dirname, 'tokens', 'brands');
  if (!fs.existsSync(brandsDir)) return [];

  return fs
    .readdirSync(brandsDir)
    .filter((name) => fs.statSync(path.join(brandsDir, name)).isDirectory())
    .map((brandKey) => {
      const tokenFile = path.join(brandsDir, brandKey, 'tokens.json');
      const label = brandKey
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      return { key: brandKey, label, tokenFile };
    })
    .filter(({ tokenFile }) => fs.existsSync(tokenFile));
}

// ---------------------------------------------------------------------------
// NORMALIZZAZIONE VALORI FIGMA
//
// Figma esporta i colori come oggetti:
//   { colorSpace: "srgb", components: [0.16, 0.47, 0.21], alpha: 1, hex: "#297A38" }
// Style Dictionary si aspetta stringhe CSS valide.
// ---------------------------------------------------------------------------

function normalizeFigmaColors(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rawValue = v['$value'] ?? v['value'];

      if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        let hexColor = rawValue.hex ?? null;

        if (!hexColor && rawValue.colorSpace === 'srgb' && Array.isArray(rawValue.components)) {
          const [r, g, b] = rawValue.components.map((c) => Math.round(c * 255));
          hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }

        if (hexColor) {
          result[k] = normalizeFigmaColors({ ...v, '$value': hexColor });
        } else {
          result[k] = normalizeFigmaColors(v);
        }
      } else {
        result[k] = normalizeFigmaColors(v);
      }
    } else {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Rimuove i metadati $* dai nodi-gruppo che hanno anche figli-token.
 * SD v5 tratta qualsiasi nodo con $value come foglia e ignora i figli,
 * rendendo irrisolvibili i riferimenti {color.black.10}.
 */
function sanitizeGroups(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const META = new Set(['$value', '$type', '$description', '$extensions', '$deprecated']);
  const childKeys = Object.keys(obj).filter((k) => !META.has(k));
  const hasTokenChildren = childKeys.some(
    (k) => obj[k] !== null && typeof obj[k] === 'object' && !Array.isArray(obj[k])
  );

  if (hasTokenChildren && ('$value' in obj || 'value' in obj)) {
    const cleaned = {};
    for (const k of childKeys) {
      cleaned[k] = sanitizeGroups(obj[k]);
    }
    return cleaned;
  }

  const result = {};
  for (const k of Object.keys(obj)) {
    result[k] = META.has(k) ? obj[k] : sanitizeGroups(obj[k]);
  }
  return result;
}

function deepMerge(target, source) {
  for (const [key, src] of Object.entries(source)) {
    const isLeaf =
      src !== null &&
      typeof src === 'object' &&
      !Array.isArray(src) &&
      ('$value' in src || 'value' in src) &&
      !Object.keys(src).some((k) => !k.startsWith('$') && k !== 'value' && typeof src[k] === 'object');

    if (isLeaf) {
      target[key] = src;
    } else if (src !== null && typeof src === 'object' && !Array.isArray(src)) {
      if (typeof target[key] !== 'object' || target[key] === null) target[key] = {};
      deepMerge(target[key], src);
    } else {
      target[key] = src;
    }
  }
}

/**
 * Token Studio salva il file come multi-set: ogni set è una chiave top-level
 * (es. "global/global", "semantic/semantic"). Le chiavi che iniziano con "$"
 * sono metadati da ignorare. Questo merge appiattisce tutti i set in un unico
 * oggetto così Style Dictionary può risolvere i riferimenti incrociati.
 */
function readAndNormalize(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const merged = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('$') || typeof value !== 'object' || Array.isArray(value)) continue;
    deepMerge(merged, sanitizeGroups(normalizeFigmaColors(value)));
  }
  return merged;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function run() {
  const brands = discoverBrands();
  if (brands.length === 0) {
    console.error('❌ Nessun brand trovato in tokens/brands/. Verifica la struttura cartelle.');
    process.exit(1);
  }

  const tmpDir = path.join(__dirname, '.tmp-tokens');
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`\n📦 Brand trovati: ${brands.map((b) => b.key).join(', ')}\n`);

  for (const brand of brands) {
    console.log(`\n🚀  [${brand.label}]`);

    const merged = readAndNormalize(brand.tokenFile);

    const tmpFile = path.join(tmpDir, `${brand.key}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(merged, null, 2), 'utf-8');

    const sd = new StyleDictionary({
      source: [tmpFile],
      log: { warnings: 'disabled' },
      platforms: {
        scss: {
          transformGroup: 'scss',
          buildPath: `src/styles/themes/${brand.key}/`,
          files: [
            {
              destination: '_variables.scss',
              format: 'scss/variables',
              options: { outputReferences: false },
            },
          ],
        },

        css: {
          buildPath: `src/assets/themes/${brand.key}/`,
          transforms: ['attribute/cti', 'name/it-short', 'color/css'],
          files: [
            {
              destination: 'variables.css',
              format: 'css/variables',
              options: { outputReferences: false },
            },
          ],
        },

        'css-rgb': {
          buildPath: `src/assets/themes/${brand.key}/`,
          transforms: ['attribute/cti', 'name/it-short', 'color/rgb-values'],
          files: [
            {
              destination: 'variables-rgb.css',
              format: 'css/variables',
              options: { outputReferences: false },
            },
          ],
        },
      },
    });

    await sd.buildAllPlatforms();
  }

  console.log('\n✅ Build completata!');
}

run().catch((err) => {
  console.error('❌ Errore build:', err);
  process.exit(1);
});
