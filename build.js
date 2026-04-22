const StyleDictionaryModule = require('style-dictionary');

// Gestione compatibilità v3/v4
const StyleDictionary = StyleDictionaryModule.StyleDictionary || StyleDictionaryModule.default || StyleDictionaryModule;

const brands = require('./brands.config.js');

// --- 1. TRASFORMAZIONE NOMI (Da "color-background-primary" a "it-primary") ---
StyleDictionary.registerTransform({
  name: 'name/it-short',
  type: 'name',
  transform: (token) => {
    // Filtriamo via le categorie strutturali per avere nomi semantici brevi
    const shortPath = token.path.filter(part => 
      part !== 'color' && 
      part !== 'background' && 
      part !== 'border' && 
      part !== 'text'
    );
    // Uniamo con il prefisso 'it' richiesto da AgID
    return ['it', ...shortPath].join('-');
  }
});

// --- 2. TRASFORMAZIONE VALORI RGB (Necessaria per Bootstrap 5) ---
StyleDictionary.registerTransform({
  name: 'color/rgb-values',
  type: 'value',
  matcher: (token) => token.$type === 'color' || token.type === 'color',
  transform: (token) => {
    const color = token.value;
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
});

async function run() {
  for (const [brandKey, config] of Object.entries(brands)) {
    console.log(`\n🚀 Generazione Brand: [${config.label}]`);

    const sd = new StyleDictionary({
      source: [
        "tokens/core/*.json",
        ...config.tokenFiles
      ],
      platforms: {
        // Piattaforma SCSS per uso interno Angular
        scss: {
          transformGroup: "scss",
          buildPath: `src/styles/themes/${brandKey}/`,
          files: [{
            destination: "_variables.scss",
            format: "scss/variables",
            options: { outputReferences: true }
          }]
        },
        // Piattaforma CSS per Storybook e runtime
        css: {
          buildPath: `public/themes/${brandKey}/`,
          // Usiamo le nostre trasformazioni personalizzate
          transforms: ['attribute/cti', 'name/it-short', 'color/css'],
          files: [
            {
              // File principale con colori HEX
              destination: "variables.css",
              format: "css/variables",
              options: { outputReferences: true }
            },
            {
              // File con valori RGB separati per Bootstrap
              destination: "variables-rgb.css",
              format: "css/variables",
              transforms: ['attribute/cti', 'name/it-short', 'color/rgb-values'],
              options: { outputReferences: true }
            }
          ]
        }
      }
    });

    await sd.buildAllPlatforms();
  }
  console.log('\n✅ Build completata con successo!');
}

run().catch((err) => console.error("❌ Errore durante la build:", err));