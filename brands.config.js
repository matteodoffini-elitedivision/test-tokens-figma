// Auto-discovery dei brand dalla cartella tokens/brands/
// Aggiungere un nuovo brand = creare tokens/brands/{nome-brand}/*.json (via Token Studio sync)
const fs = require('fs');
const path = require('path');

const brandsDir = path.join(__dirname, 'tokens', 'brands');

function discoverBrands() {
  if (!fs.existsSync(brandsDir)) return {};

  return Object.fromEntries(
    fs.readdirSync(brandsDir)
      .filter(name => fs.statSync(path.join(brandsDir, name)).isDirectory())
      .map(brandKey => {
        const brandDir = path.join(brandsDir, brandKey);
        const tokenFiles = fs.readdirSync(brandDir)
          .filter(f => f.endsWith('.json') && !f.startsWith('$'))
          .map(f => `tokens/brands/${brandKey}/${f}`);

        const label = brandKey
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        return [brandKey, { label, tokenFiles }];
      })
  );
}

module.exports = discoverBrands();
