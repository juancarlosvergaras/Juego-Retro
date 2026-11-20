const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const B=require('../frame-budget.js');
const pages=['index.html','level-two.html','level-three.html','level-four.html','level-five.html','level-six.html','level-seven.html','level-eight.html'];
test('the close-up camera eases in and out and never exceeds its limit',()=>{
 const view=B.createView(1.5);assert.equal(view.state.zoom,1);
 let previous=1;for(let i=0;i<240;i++){const z=view.update(1.5,1/60);assert.ok(z>=previous-1e-9&&z<=1.5,'monotonic towards the target');previous=z;}
 assert.equal(view.state.zoom,1.5,'settles exactly on the limit');
 view.update(9,1);assert.equal(view.state.zoom,1.5);
 for(let i=0;i<240;i++)view.update(1,1/60);assert.equal(view.state.zoom,1,'bosses and cinematics get the whole frame back');
});
test('the close-up keeps the player in view and the floor on screen',()=>{
 const view=B.createView(1.5);for(let i=0;i<240;i++)view.update(1.5,1/60);
 for(const [x,y] of [[20,480],[480,480],[940,480],[480,60],[480,538]]){
  const f=view.frame(960,540,x,y,0,0);
  assert.ok(Math.abs(f.w-640)<1e-9&&Math.abs(f.h-360)<1e-9);
  assert.ok(f.x>=0&&f.x+f.w<=960+1e-9&&f.y>=0&&f.y+f.h<=540+1e-9,'the window stays inside the drawn frame');
  assert.ok(x>=f.x-1e-9&&x<=f.x+f.w+1e-9&&y>=f.y-1e-9&&y<=f.y+f.h+1e-9,'the player is inside the window');}
 assert.equal(view.frame(960,540,480,500,0,0).y,180,'on the ground the view is anchored to the bottom of the scene');
 const calls=[],c={save(){calls.push('save');},restore(){calls.push('restore');},beginPath(){},rect(){},clip(){},translate(x,y){calls.push(['t',x,y]);},scale(x,y){calls.push(['s',x,y]);}};
 view.draw(c,960,540,480,500,0,0,()=>calls.push('paint'));
 assert.deepEqual(calls,['save',['t',-240,-270],['s',1.5,1.5],'paint','restore']);
 const flat=B.createView(1.5),plain=[];flat.draw({save(){plain.push('save');}},960,540,480,500,0,0,()=>plain.push('paint'));assert.deepEqual(plain,['paint'],'without zoom nothing is transformed');
});
test('missions 5 to 8 draw through the close-up camera and relax it for bosses and cinematics',()=>{
 for(const [file,zoom] of [['level-five-game.js','1.3'],['level-six-game.js','1.5'],['level-seven-game.js','1.4'],['level-eight-game.js','1.55']]){const src=fs.readFileSync(file,'utf8');
  assert.ok(src.includes('ArcadeFrameBudget.createView?.('+zoom+')'),file+' zoom');
  assert.ok(src.includes("closeUp=()=>!stage?.classList?.contains?.('road-cinematic')&&!!$('boss-hud')?.hidden"),file+' relaxes the zoom');
  if(file==='level-six-game.js')assert.ok(src.includes('&&!s.stairs?.active;'),'the close-up opens while riding the escalators');
  assert.ok(src.includes('view.update(closeUp()?view.limit:1,dt);view.draw(ctx,960,540,p.x-s.camera.x,'),file+' wraps the renderer');}
 for(const file of ['mall-renderer.js','new-york-renderer.js','space-renderer.js','sea-renderer.js'])assert.ok(!/setTransform|resetTransform/.test(fs.readFileSync(file,'utf8')),file+' must not reset the camera transform');
});
test('missions 1 to 3 draw their characters larger',()=>{
 assert.ok(fs.readFileSync('game.js','utf8').includes('zoom=Math.max(1,Math.min(1.9,bounds.height/450))'));
 for(const file of ['level-two-game.js','level-three-game.js'])assert.ok(fs.readFileSync(file,'utf8').includes('canvas.width=Math.min(880,Math.max(window.ArcadeMobile?.active?430:640,Math.round(r.width/(window.ArcadeMobile?.active?1.1:1.75))));'),file);
});
test('on desktop the game frame fills the window',()=>{
 const css=fs.readFileSync('game-frame.css','utf8');
 for(const page of pages){const html=fs.readFileSync(page,'utf8');assert.ok(html.indexOf('href="game-frame.css"')>html.indexOf('href="mission-one-polish.css"')&&html.indexOf('href="game-frame.css"')<html.indexOf('href="touch-screen.css"'),page+' loads the frame after the mission styles');}
 assert.ok(css.includes('--scene-height:max(300px,calc(100dvh - var(--bar) - var(--dock) - var(--strip)))'),'the scene takes everything the bars leave');
 assert.ok(css.includes('body main:has(#level-two){max-width:none;min-height:100dvh;margin:0;padding:0'),'no outer margins');
 assert.ok(css.includes('.game-card>.boss-hud{position:absolute;top:0;left:50%'),'the boss bar lives in the top bar instead of reserving an empty strip');
 assert.ok(css.includes('.game-card>.boss-hud[hidden]{display:none}'));
 assert.ok(css.includes('@media (min-width:721px) and (min-aspect-ratio:2/1)')&&css.includes('--dock:0px;--side:104px'),'very wide windows move the weapons to a side column');
 assert.ok(!/:root(?!:not\(\.mobile-play\))[^{]*\{/.test(css.replace(/@media[^{]*\{/g,'')),'touch layout is left alone');
});
