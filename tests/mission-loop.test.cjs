const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Kit=require('../mission-kit.js'),Results=require('../mission-results.js'),Outro=require('../mission-two-outro.js'),Boss=require('../boss-presentation.js'),Expansion=require('../expansion-enemies.js');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const atlas=(()=>{const sandbox={window:{}};vm.runInNewContext(read('enemy-atlas.js'),sandbox);return JSON.parse(JSON.stringify(sandbox.window.ENEMY_FRAMES));})();
// Lienzo falso que anota lo que se le pide dibujar.
function canvas(){const calls=[];return{calls,globalAlpha:1,fillStyle:'',font:'',save(){calls.push(['save']);},restore(){calls.push(['restore']);},translate(x,y){calls.push(['translate',x,y]);},scale(x,y){calls.push(['scale',x,y]);},drawImage(...a){calls.push(['drawImage',...a,this.globalAlpha]);},fillRect(...a){calls.push(['fillRect',...a,this.fillStyle]);},fillText(...a){calls.push(['fillText',...a]);}};}
const soldier=extra=>({x:100,y:620,hp:3,maxHp:3,facing:1,grounded:true,vx:0,vy:0,anim:0,runCycle:0,hit:0,flash:0,death:0,...extra});

test('the enemy soldier picks one pose per situation, the same in every mission',()=>{
 assert.deepEqual(Kit.enemyPose(soldier()),{row:0,frame:0});
 assert.deepEqual(Kit.enemyPose(soldier({anim:.6})),{row:0,frame:2});
 // Steps follow distance travelled, not the clock.
 assert.deepEqual(Kit.enemyPose(soldier({vx:80,runCycle:.3})),{row:1,frame:1});
 assert.deepEqual(Kit.enemyPose(soldier({vx:-80,runCycle:.8})),{row:1,frame:3});
 assert.deepEqual(Kit.enemyPose(soldier({grounded:false,vy:-300})),{row:2,frame:1});
 assert.deepEqual(Kit.enemyPose(soldier({grounded:false,vy:0})),{row:2,frame:2});
 assert.deepEqual(Kit.enemyPose(soldier({grounded:false,vy:200})),{row:2,frame:3});
 assert.deepEqual(Kit.enemyPose(soldier({flash:.12})),{row:3,frame:0});
 assert.deepEqual(Kit.enemyPose(soldier({hit:.1,vx:80})),{row:3,frame:2},'a hit interrupts the run');
 // Death staggers first and only then lies on the floor.
 assert.deepEqual(Kit.enemyPose(soldier({hp:0,death:.8})),{row:3,frame:2});
 assert.deepEqual(Kit.enemyPose(soldier({hp:0,death:.3})),{row:3,frame:3});
});
test('enemy soldiers are drawn with their feet on the given point and mirrored by facing',()=>{
 const c=canvas(),image={};Kit.drawEnemy(c,soldier({x:100.4,y:619.6,facing:-1}),image,atlas);
 assert.deepEqual(c.calls.find(a=>a[0]==='translate'),['translate',100,620]);
 assert.deepEqual(c.calls.find(a=>a[0]==='scale'),['scale',-1,1]);
 const d=c.calls.find(a=>a[0]==='drawImage'),f=atlas[0][0];
 assert.deepEqual(d.slice(2,6),f.slice(0,4));
 assert.ok(Math.abs(d[7]+f[3]*Kit.SCALE)<1e-9&&Math.abs(d[9]-f[3]*Kit.SCALE)<1e-9,'the frame hangs from the feet upwards');
 assert.ok(Math.abs(d[6]+f[2]/2*Kit.SCALE)<1e-9,'centred when the frame has no anchor');
 // A frame with an anchor is centred on the torso instead of the cell.
 const anchored=[[[0,0,200,240,0,70]]],c2=canvas();Kit.drawEnemy(c2,soldier(),image,anchored);
 assert.ok(Math.abs(c2.calls.find(a=>a[0]==='drawImage')[6]+70*Kit.SCALE)<1e-9);
 // A fallen soldier fades out; a missing sheet draws nothing.
 const c3=canvas();Kit.drawEnemy(c3,soldier({hp:0,death:.2}),image,atlas);assert.ok(Math.abs(c3.calls.find(a=>a[0]==='drawImage').at(-1)-.4)<1e-9);
 const c4=canvas();Kit.drawEnemy(c4,soldier(),null,atlas);assert.equal(c4.calls.length,0);
});
test('the health bar shows one segment per hit point and nothing for the dead',()=>{
 const c=canvas();Kit.enemyBar(c,soldier({hp:2,maxHp:3}));
 const rects=c.calls.filter(a=>a[0]==='fillRect');
 assert.deepEqual(rects[0].slice(1,5),[81,561,38,6]);assert.equal(rects[1][3],24,'two thirds of 36');
 assert.equal(rects.length,4,'frame, fill and two dividers');
 assert.equal(c.calls.some(a=>a[0]==='fillText'),false);
 const alert=canvas();Kit.enemyBar(alert,soldier({alert:true,awareness:'sight'}));assert.equal(alert.calls.find(a=>a[0]==='fillText')[1],'!');
 const heard=canvas();Kit.enemyBar(heard,soldier({alert:true,awareness:'sound'}));assert.equal(heard.calls.find(a=>a[0]==='fillText')[1],'?');
 const dead=canvas();Kit.enemyBar(dead,soldier({hp:0}));assert.equal(dead.calls.length,0);
});
test('boss cues fire once per run and the clock reads minutes and seconds',()=>{
 const said=[],staged={},cue=Kit.once(staged,{intro:(...text)=>said.push(text)});
 assert.equal(cue('king','intro','REY','Mausoleo'),true);assert.equal(cue('king','intro','REY','Mausoleo'),false);
 assert.deepEqual(said,[['REY','Mausoleo']]);assert.equal(Kit.once({},null)('x','intro'),false);
 assert.equal(Kit.clock(0),'0:00');assert.equal(Kit.clock(59.9),'0:59');assert.equal(Kit.clock(125),'2:05');assert.equal(Kit.clock(-4),'0:00');assert.equal(Kit.clock(undefined),'0:00');
});
test('the debug harness steps the simulation at 120 Hz, redraws once and stops on death',()=>{
 let steps=0,draws=0,dead=false;const g=Kit.debug({name:'x'},{step:dt=>{assert.equal(dt,1/120);if(++steps===30)dead=true;},redraw:()=>draws++,dead:()=>dead});
 assert.equal(g.name,'x');g.advance(.1);assert.equal(steps,12);assert.equal(draws,1);
 g.advance(1);assert.equal(steps,30,'no simulation after the player has fallen');assert.equal(draws,2);
});

test('the debrief counts the fallen and formats score and time',()=>{
 const rows=Results.rows({total:12500},{enemies:[{hp:0},{hp:2},{hp:-1}],seconds:83,extra:[['Estrellas','2 / 5']]});
 assert.deepEqual(rows.map(r=>r[0]),['Puntos','Enemigos abatidos','Tiempo','Estrellas']);
 assert.equal(rows[0][1].replace(/\D/g,''),'12500');assert.equal(rows[1][1],'2 / 3');assert.equal(rows[2][1],'1:23');assert.equal(rows[3][1],'2 / 5');
 assert.deepEqual(Results.rows(null).map(r=>r[1]),['0','0 / 0','0:00']);
});
test('all three missions close on the same card, with continue and retry',()=>{
 for(const [file,next] of [['game.js','Continuar · Misión 02'],['level-two-game.js','Aire · Misión 03'],['level-three-game.js','Bajo el abismo · Misión 05']]){
  const source=read(file);assert.match(source,/ArcadeMissionResults\.show\(/,file);
  assert.ok(source.includes("label:'"+next+"'"),file+' continues to '+next);assert.ok(source.includes("retry:{label:'Repetir misión'"),file+' offers a retry');
  if(file==='level-three-game.js'){
    const story=require('../mission-three-story'),cinema=require('../story-cinema');
    assert.match(source,/story\.briefing\(/);
    assert.equal(cinema.titleFrom(story.config.eyebrow).title,'GUERRA EN EL AIRE');
    assert.doesNotMatch(source,/presentation\??\.title\(/,'el rótulo de la historia se muestra antes de bajar a cubierta');
  }else assert.match(source,/presentation\??\.title\('MISIÓN 0\d'/,file+' opens with the shared title card');
  assert.match(source,/ArcadeMissionKit\.drawEnemy\(/,file);assert.match(source,/ArcadeMissionKit\.debug\(/,file);
 }
 for(const page of ['index.html','level-two.html','level-three.html']){const html=read(page);for(const script of ['mission-kit.js','mission-results.js','boss-presentation.js'])assert.ok(html.includes(script),page+' loads '+script);
  assert.ok(html.indexOf('mission-kit.js')<html.indexOf('mission-results.js'),page+': the kit loads before the card that uses it');}
 assert.ok(read('level-two.html').includes('mission-two-outro.js'));
});

test('a mission title shows its card without stopping the action',()=>{
 const line=Boss.timeline();const cue=line.cue('title','LA OBRA','Veinte pisos','MISIÓN 01');
 assert.deepEqual([cue.kind,cue.title,cue.subtitle,cue.kicker,cue.tone],['title','LA OBRA','Veinte pisos','MISIÓN 01','title']);
 assert.equal(line.tick(1/60),1);assert.equal(line.state.shake,0);assert.equal(line.flashAlpha(),0);
 // A boss arriving meanwhile waits for the title instead of stepping on it.
 assert.equal(line.cue('intro','EL CAPATAZ'),null);
 let lost=0;for(let i=0;i<Math.round(Boss.CUES.title.banner*60)+2;i++)lost+=1-line.tick(1/60);
 assert.equal(line.state.cue.kind,'intro');assert.ok(lost>0,'the queued entrance brings its own freeze');
});

test('mission 2 exit: the hunter runs to the helicopter, boards it and it leaves',()=>{
 const door=17500,at=t=>Outro.script(t,door),first=at(0);
 assert.ok(Math.abs(first.player.x-(door-18))<1e-9);assert.equal(first.player.y,Outro.GROUND);assert.equal(first.player.hidden,false);assert.equal(first.done,false);
 assert.ok(first.heli.y<Outro.GROUND-300&&first.heli.x<first.pick-400,'the helicopter starts high and off to the left');
 assert.equal(first.pick,door-Outro.PICKUP);
 // A helicopter, not a toy: several times the 46 px soldier, and its nose stays clear of the mausoleum front.
 assert.ok(Outro.HELI>=.58&&Outro.HELI<=.7);assert.ok(504*Outro.HELI>46*6);assert.ok(first.pick+Outro.DOOR+172*Outro.HELI<door-315,'the nose does not touch the facade');assert.ok(Math.abs(Outro.DOOR-(332-241)*Outro.HELI)<2,'he stops at the cabin door, not at the cockpit');
 let prev=first,arrived=null,hidAt=null;
 for(let t=1/60;t<=Outro.DURATION+1e-9;t+=1/60){const s=at(t),dx=s.player.x-prev.player.x;
  assert.ok(dx<=1e-9&&dx>-170/60,'a steady run, never backwards, at '+t.toFixed(2));assert.equal(s.rope,0,'no rope to slide up');
  assert.ok(s.player.y<=Outro.GROUND+1e-9&&s.player.y>Outro.GROUND-30,'feet on the ground but for the hop aboard');
  if(arrived===null&&Math.abs(s.player.x-s.pick)<1e-6)arrived=t;if(hidAt===null&&s.player.hidden)hidAt=t;
  if(!s.player.grounded&&!s.player.hidden)assert.ok(Math.abs(s.heli.x-(s.pick+Outro.DOOR))<2&&Math.abs(s.heli.y-(Outro.GROUND-27))<3,'he hops into a helicopter that is waiting at ground level');
  prev=s;}
 assert.ok(arrived>3&&arrived<3.4,'reaches the cabin after a real run: '+arrived);assert.ok(Math.abs(hidAt-Outro.BOARD)<.02);assert.ok(hidAt>arrived+.2,'the hop aboard takes a moment');
 const waiting=at(arrived);assert.ok(waiting.light>.95,'the helicopter is already down when he arrives');assert.ok(at(1).player.vx<-100&&at(1).player.vx>-170);assert.equal(at(arrived+.05).player.vx,0);
 const end=at(Outro.DURATION);assert.equal(end.done,true);assert.equal(end.player.hidden,true);
 assert.ok(end.heli.x>end.pick+600&&end.heli.y<Outro.GROUND-300,'the helicopter is gone up and to the east');assert.ok(end.dawn>.99&&end.light<.05);
 assert.ok(Math.abs(at(hidAt+.4).heli.x-at(hidAt).heli.x)<2,'it only leaves once he is aboard');assert.ok(at(hidAt+2).heli.x>at(hidAt).heli.x+100);
});
test('mission 2 exit draws nothing without art and never throws on a bare canvas',()=>{
 const c=canvas();Outro.draw(c,3,17500,null,0);assert.equal(c.calls.length,0);
});

test('the jetpack soldier is no taller than a standing soldier',()=>{
 const standing=Math.max(...atlas[0].map(f=>f[3]))*Kit.SCALE;
 assert.ok(Expansion.JET_HEIGHT<=standing,'tucked legs: '+Expansion.JET_HEIGHT+' vs '+standing.toFixed(1));
 assert.ok(Expansion.JET_HEIGHT>=standing*.75,'but still the same build');
});
test('mission labels use two digits everywhere in missions 1 to 3',()=>{
 for(const file of ['game.js','level-two-game.js','level-three-game.js','mission-endings.js','level-four-game.js','road-renderer.js'])assert.doesNotMatch(read(file),/MISIÓN [1-4](?!\d)/,file);
});
