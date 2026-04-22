// Scarica i token JSON da GitHub (dove Token Studio sincronizza) e li scrive in tokens/
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const {
  GITHUB_TOKEN,
  TOKENS_REPO,
  TOKENS_BRANCH = 'main',
  TOKENS_DIR = 'tokens',
} = process.env;

if (!GITHUB_TOKEN) {
  console.error("❌ GITHUB_TOKEN mancante. Crea un Personal Access Token GitHub e aggiungilo al file .env");
  process.exit(1);
}
if (!TOKENS_REPO) {
  console.error('❌ TOKENS_REPO mancante (es. "myorg/design-tokens"). Aggiungilo al file .env');
  process.exit(1);
}

const BASE = `https://api.github.com/repos/${TOKENS_REPO}`;

async function githubFetch(endpoint, raw = false) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github.v3+json',
    },
  });
  if (res.status === 404) {
    throw new Error(`Percorso non trovato: ${endpoint}\nVerifica che TOKENS_REPO e TOKENS_DIR siano corretti.`);
  }
  if (!res.ok) {
    throw new Error(`GitHub API errore ${res.status} su: ${endpoint}`);
  }
  return raw ? res.text() : res.json();
}

async function syncDir(remotePath, localPath) {
  const entries = await githubFetch(`/contents/${remotePath}?ref=${TOKENS_BRANCH}`);
  fs.mkdirSync(localPath, { recursive: true });

  for (const entry of entries) {
    const localEntry = path.join(localPath, entry.name);
    if (entry.type === 'dir') {
      await syncDir(entry.path, localEntry);
    } else if (entry.type === 'file' && entry.name.endsWith('.json') && !entry.name.startsWith('$')) {
      // I file che iniziano con $ sono metadata di Token Studio ($metadata.json, $themes.json), li saltiamo
      const content = await githubFetch(`/contents/${entry.path}?ref=${TOKENS_BRANCH}`, true);
      fs.writeFileSync(localEntry, content, 'utf-8');
      console.log(`  ✓ ${entry.path}`);
    }
  }
}

async function run() {
  console.log(`\n📥 Sync tokens da ${TOKENS_REPO} (branch: ${TOKENS_BRANCH}, path: ${TOKENS_DIR})\n`);
  await syncDir(TOKENS_DIR, 'tokens');
  console.log('\n✅ Sync completata!\n');
}

run().catch(err => {
  console.error('\n❌ Errore durante la sync:', err.message);
  process.exit(1);
});
