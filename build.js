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

const StyleDictionaryModule = require('style-dictionary');
const StyleDictionary =
  StyleDictionaryModule.StyleDictionary ||
  StyleDictionaryModule.default ||
  StyleDictionaryModule;
const fs = require('fs');
const path = require('path');

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
// BRAND DISCOVERY (cartella tokens/brands/)
// ---------------------------------------------------------------------------

function discoverBrands() {
  const brandsDir = path.join(__dirname, 'tokens', 'brands');
  if (!fs.existsSync(brandsDir)) return [];

  return fs
    .readdirSync(brandsDir)
    .filter((name) => fs.statSync(path.join(brandsDir, name)).isDirectory())
    .map((brandKey) => {
      const brandDir = path.join(brandsDir, brandKey);
      const tokenFiles = fs
        .readdirSync(brandDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(brandDir, f));

      const label = brandKey
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      return { key: brandKey, label, tokenFiles };
    });
}

// ---------------------------------------------------------------------------
// NORMALIZZAZIONE VALORI FIGMA
//
// Figma esporta i colori come oggetti:
//   { colorSpace: "srgb", components: [0.16, 0.47, 0.21], alpha: 1, hex: "#297A38" }
// Style Dictionary si aspetta stringhe CSS valide.
// Questa funzione normalizza ricorsivamente i token prima di scriverli nel
// file temporaneo usato come sorgente da SD.
// ---------------------------------------------------------------------------

function normalizeFigmaColors(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rawValue = v['$value'] ?? v['value'];

      if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        // Figma color object → estrai hex
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
    // Nodo misto gruppo+token: rimuoviamo i $-metadati a questo livello
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

function readAndNormalize(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return sanitizeGroups(normalizeFigmaColors(raw));
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const src = source[key];
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

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function run() {
  const brands = discoverBrands();
  if (brands.length === 0) {
    console.error('❌ Nessun brand trovato in tokens/brands/. Verifica la struttura cartelle.');
    process.exit(1);
  }

  const coreDir = path.join(__dirname, 'tokens', 'core');
  const coreFiles = fs.existsSync(coreDir)
    ? fs.readdirSync(coreDir).filter((f) => f.endsWith('.json')).map((f) => path.join(coreDir, f))
    : [];

  const tmpDir = path.join(__dirname, '.tmp-tokens');
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`\n📦 Brand trovati: ${brands.map((b) => b.key).join(', ')}\n`);

  for (const brand of brands) {
    console.log(`\n🚀  [${brand.label}]`);

    // Merge: core (base) + brand (override)
    const merged = {};
    for (const f of [...coreFiles, ...brand.tokenFiles]) {
      deepMerge(merged, readAndNormalize(f));
    }

    // Scrive file temporaneo già normalizzato — SD risolve i riferimenti da file
    const tmpFile = path.join(tmpDir, `${brand.key}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(merged, null, 2), 'utf-8');

    const sd = new StyleDictionary({
      source: [tmpFile],
      platforms: {
        // SCSS — variabili statiche per il build Angular (@use in componenti)
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

        // CSS HEX — custom properties per runtime (ThemeService) e Storybook
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

        // CSS RGB — canali separati richiesti dal pattern --bs-*-rgb di Bootstrap 5
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
