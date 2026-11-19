const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const shell=require('../menu-shell.js');
const pages=['index.html','level-two.html','level-three.html','level-four.html','level-five.html','level-six.html','level-seven.html','level-eight.html'];
test('one menu definition serves the eight missions',()=>{
 assert.equal(shell.missions.length,8);
 pages.forEach((page,i)=>{const html=fs.readFileSync(page,'utf8');
  assert.match(html,new RegExp('<section id="main-menu"[^>]*data-mission="'+(i+1)+'"></section>'),page+' only declares the menu container');
  assert.equal((html.match(/<script src="/)||{}).index,html.indexOf('<script src="menu-shell.js">'),page+': menu-shell.js is the first script');});
});
test('the menu offers play, missions, shop, settings, help, restart, developer mode and exit',()=>{
 for(const mission of [1,5,8]){const html=shell.markup(mission);
  for(const id of ['menu-play','menu-shop','menu-restart','menu-developer','menu-exit','menu-back','menu-sound','menu-help','menu-shop-host','difficulty-choices','tutorial-enabled'])assert.ok(html.includes('id="'+id+'"'),id);
  for(const page of ['home','levels','shop','settings','help','exit'])assert.ok(html.includes('data-menu-page="'+page+'"'),page);
  assert.ok(html.includes('Modo desarrollador temporal'),'the temporary developer option stays in the menu');
  assert.equal((html.match(/class="secondary mission-card"/g)||[]).length,8);
  assert.ok(html.includes(shell.missions[mission-1].help),'help text matches the mission being played');}
});
test('mission cards use light thumbnails instead of full backgrounds',()=>{
 for(const m of shell.missions){assert.match(m.art,/^assets\/thumbs\/mision-0\d\.webp$/);assert.ok(fs.statSync(m.art).size<120000,m.art+' stays small');}
 assert.ok(!fs.readFileSync('mission-map.js','utf8').includes('assets/worlds/'),'special cards use thumbnails too');
});
test('pausing opens the same menu instead of a second pause panel',()=>{
 const menu=fs.readFileSync('main-menu.js','utf8'),css=fs.readFileSync('styles.css','utf8');
 assert.match(menu,/MutationObserver\(\(\)=>\{if\(layer\.hidden&&plainPause\(\)\)show\(\);\}\)/);
 assert.ok(css.includes('.menu-unified #pause-options,.menu-unified #show-shop{display:none!important}'));
 for(const file of ['game.js','level-two-game.js','level-three-game.js','level-four-game.js','level-five-game.js','level-six-game.js','level-seven-game.js','level-eight-game.js'])
  assert.ok(fs.readFileSync(file,'utf8').includes("'Partida en pausa'"),file+' announces a plain pause with the title the menu watches');
});
