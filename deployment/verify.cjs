const fs = require('node:fs');
const crypto = require('node:crypto');
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const origin = process.argv[3] || 'https://juego.proyectoia.org/';
const queue = [...manifest.files];
let verified = 0;
async function readPublic(item) {
  const url = new URL(item.path, origin);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(120000)});
      if (response.status !== 200) throw new Error('HTTP ' + response.status);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 3) throw new Error(item.path + ': ' + error.message);
      console.warn('Retry', attempt, item.path, error.message);
    }
  }
}
async function worker() {
  while (queue.length) {
    const item = queue.shift();
    const data = await readPublic(item);
    if (data.length !== item.bytes || crypto.createHash('sha256').update(data).digest('hex') !== item.sha256) throw new Error('Different content: ' + item.path);
    verified++;
    if (verified % 50 === 0) console.log('SHA256', verified, '/', manifest.files.length);
  }
}
(async () => {
  await Promise.all(Array.from({length: 4}, worker));
  const excluded = ['tests/audio-preview.html', 'server.cjs', 'README.md', 'private/tunnel.json', 'manifest.json', 'deployment/install.py'];
  for (const file of excluded) {
    const response = await fetch(new URL(file, origin), {method: 'HEAD', signal: AbortSignal.timeout(30000)});
    if (response.status !== 404) throw new Error(`Unexpected public file ${file}: ${response.status}`);
  }
  console.log(JSON.stringify({origin, release: manifest.id, verified, excludedFilesReturn404: excluded.length}));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
