const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const pages=['index.html','level-two.html','level-three.html','level-four.html','level-five.html','level-six.html','level-seven.html','level-eight.html','quimera.html','fuga.html'];
test('hashed files are served as immutable and the documents are always revalidated',()=>{
 const install=fs.readFileSync('deployment/install.py','utf8');
 assert.match(install,/location ~\* "\\\\\.\[0-9a-f\]\{16\}\\\\\.\(\?:js\|css\|png\|webp\|jpg\|ogg\|mp3\|wav\)\$"/,'one rule covers every content-addressed file');
 assert.ok(install.includes('add_header Cache-Control "public, max-age=31536000, immutable" always;'));
 assert.ok(install.includes('add_header Cache-Control "no-cache" always;'),'HTML keeps revalidating');
 assert.ok(install.indexOf("'nginx', '-t'")<install.indexOf("'nginx', '-s', 'reload'"),'the configuration is validated before reloading');
});
test('the optimized package converts images and renames them by content',()=>{
 const build=fs.readFileSync('deployment/build.py','utf8');
 for(const piece of ["'WEBP'",'def hashed(','ARCADE_ASSETS','PAGE_REF','release.tar.gz'])assert.ok(build.includes(piece),piece);
 assert.match(fs.readFileSync('quimera.js','utf8'),/published\('assets\/sprites\/quimera-'\+kind\+'\.png'\)/,'dynamic sprite paths go through the published-name map');
 assert.ok(fs.readFileSync('.gitignore','utf8').includes('deployment/cache/'));
});
test('both packagers follow the missions linked from the shared menu',()=>{
 const node=fs.readFileSync('deployment/build.cjs','utf8');
 assert.ok(node.includes(".html)(?:[?#][^\"']*)?[\"']/g"),'build.cjs follows page links found in scripts');
 const shell=fs.readFileSync('menu-shell.js','utf8');
 for(const page of pages.slice(1,8))assert.ok(shell.includes("'"+page+"'"),page+' is reachable from the menu');
 const map=fs.readFileSync('mission-map.js','utf8');assert.ok(map.includes("'quimera.html'")&&map.includes("'fuga.html'"));
});
test('every page declares its icons and the manifest lists installable ones',()=>{
 for(const page of pages){const html=fs.readFileSync(page,'utf8');
  assert.ok(html.includes('<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">'),page);
  assert.ok(html.includes('<link rel="apple-touch-icon" href="icons/icon-180.png">'),page);
  assert.match(html,/<meta name="description" content="[^"]{40,}">/,page);}
 const manifest=JSON.parse(fs.readFileSync('game.webmanifest','utf8'));
 assert.equal(manifest.name,'Cap Dollar, The Hunter');assert.ok(manifest.icons.length>=2);
 for(const icon of manifest.icons)assert.ok(fs.statSync(icon.src).size>500,icon.src);
});
