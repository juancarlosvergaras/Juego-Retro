// Package only browser dependencies; never publish the workspace or test fixtures.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const id = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const output = path.join(__dirname, 'packages', id);
const publicDir = path.join(output, 'public');
const files = new Set(['index.html']);
const pending = ['index.html'];
while (pending.length) {
  const file = pending.shift();
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const refs = file.endsWith('.html')
    ? [...source.matchAll(/(?:src|href)=["']([^"'?#]+\.(?:js|css|html|png|webp|jpg|webmanifest))(?:[?#][^"']*)?["']/g)].map(m => m[1])
    : [...source.matchAll(/["'](assets\/[^"']+\.(?:png|webp|jpg|ogg|mp3|wav))["']/g)].map(m => m[1]);
  // The shared menu links the missions from JavaScript (menu-shell.js, mission-map.js).
  if (file.endsWith('.js')) refs.push(...[...source.matchAll(/["']([a-z0-9-]+\.html)(?:[?#][^"']*)?["']/g)].map(m => m[1]).filter(page => fs.existsSync(path.join(root, page))));
  if (file === 'quimera-game.js') refs.push(...Object.values(require('../quimera').characterSprites()));
  for (const raw of refs) {
    const ref = raw.replace(/^\.\//, '');
    if (ref.includes('..') || path.isAbsolute(ref)) throw new Error('Unsafe dependency: ' + ref);
    if (!files.has(ref)) {
      files.add(ref);
      if (/\.(?:js|css|html)$/.test(ref)) pending.push(ref);
    }
  }
}
const manifest = {id, domain: 'juego.proyectoia.org', files: []};
// Cloudflare can override browser cache TTLs. Content-addressed names ensure a
// new HTML document never loads scripts or styles from a previous release.
const publishedNames = new Map([...files].map(file => {
  if (!/\.(?:js|css)$/.test(file)) return [file, file];
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 16);
  return [file, file.replace(/\.(js|css)$/, '.' + hash + '.$1')];
}));
for (const file of [...files].sort()) {
  let data = fs.readFileSync(path.join(root, file));
  if (file.endsWith('.html')) data = Buffer.from(data.toString('utf8').replace(/((?:src|href)=["'])([^"'?#]+)([?#][^"']*)?(["'])/g, (all, prefix, ref, query, suffix) => prefix + (publishedNames.get(ref.replace(/^\.\//, '')) || ref) + (query || '') + suffix));
  const published = publishedNames.get(file);
  const target = path.join(publicDir, published);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, data);
  manifest.files.push({path: published, source: file, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex')});
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({id, output, count: files.size, bytes: manifest.files.reduce((n, f) => n + f.bytes, 0)}));
