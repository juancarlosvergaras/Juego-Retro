const fs = require('node:fs');
const crypto = require('node:crypto');
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const origin = process.argv[3] || 'https://juego.proyectoia.org/';
const queue = [...manifest.files];
let verified = 0;
async function worker() {
  while (queue.length) {
    const item = queue.shift();
    const response = await fetch(new URL(item.path, origin), {signal: AbortSignal.timeout(30000)});
    if (response.status !== 200) throw new Error(`${item.path}: HTTP ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length !== item.bytes || crypto.createHash('sha256').update(data).digest('hex') !== item.sha256) throw new Error('Different content: ' + item.path);
    verified++;
  }
}
(async () => {
  await Promise.all(Array.from({length: 4}, worker));
  const excluded = ['tests/audio-preview.html', 'server.cjs', 'README.md', 'private/tunnel.json', 'manifest.json', 'deployment/install.py'];
  for (const file of excluded) {
    const response = await fetch(new URL(file, origin), {signal: AbortSignal.timeout(15000)});
    if (response.status !== 404) throw new Error(`Unexpected public file ${file}: ${response.status}`);
  }
  console.log(JSON.stringify({origin, release: manifest.id, verified, excludedFilesReturn404: excluded.length}));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
