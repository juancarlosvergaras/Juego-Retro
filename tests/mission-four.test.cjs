const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../road-war.js'),S=require('../road-stage.js'),Story=require('../mission-four-story.js'),Phys=require('../physics.js'),Combat=require('../mission-combat.js'),Expansion=require('../expansion-enemies.js'),Mecha=require('../air-mecha.js');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
function game(distance=0,form='soldier',saved={}){const p=Phys.createPlayer(),e=Combat.create({owned:[1,3,5],selected:3,ammo:{3:400,5:400}});Object.assign(p,{x:200,y:414,lane:414,form,facing:1});e.hp=e.maxHp=8;const s=R.create({distance,...saved},1);if(distance)s.intro=R.INTRO;return{s,p,e};}
function tick(g,seconds,input={},each){let events=[];for(let i=0;i<Math.round(seconds*120);i++){const batch=R.update(g.s,g.p,g.e,input,1/120);events=events.concat(batch);each?.(batch);}return events;}

test('the road has two checkpoints, like every other mission, and both fire once',()=>{
 assert.deepEqual(R.CHECKPOINTS,[3200,7800]);
 for(const [i,cp] of R.CHECKPOINTS.entries()){const g=game(cp-20);g.s.wave=99;g.e.invincible=999;const events=tick(g,1.5);
  assert.equal(events.filter(ev=>ev.type==='checkpoint').length,1,'post '+(i+1));assert.equal(g.s.checkpoint,cp);
  const again=R.retry(g.s);assert.equal(again.distance,cp);assert.equal(again.intro,R.INTRO,'a retry does not replay the introduction');}
 const html=read('level-four.html');assert.ok(html.includes('Hay dos checkpoints'));assert.ok(read('road-renderer.js').includes('War?.CHECKPOINTS'),'the posts drawn are the posts that save');
});
test('the star counter matches the stars the road really hands out',()=>{
 const g=game(1);g.e.invincible=1e9;g.s.obstacles=[];const stars=new Set();
 for(let i=0;i<120*150&&!g.s.boss.active;i++){R.update(g.s,g.p,g.e,{run:true},1/120);for(const item of g.s.pickups)if(item.type==='star')stars.add(item.id);}
 assert.ok(g.s.boss.active,'the whole road was ridden');assert.equal(stars.size,R.STARS);assert.equal(R.STARS,5);
 assert.ok(read('level-four-game.js').includes("' / '+ArcadeRoadWar.STARS"),'the HUD shows the real total');
});
test('escorts that share a lane never share the same spot on it',()=>{
 const s=R.create({},1);
 for(let i=1;i<=R.WAVES-3;i++){const a=R.spawn(s,i),b=R.spawn(s,i+3);if(a.type==='jetSoldier'||b.type==='jetSoldier')continue;assert.equal(a.y,b.y,'same lane');assert.ok(Math.abs(a.targetX-b.targetX)>=150,'waves '+i+' and '+(i+3));}
 const xs=new Set(Array.from({length:R.WAVES},(_,i)=>R.spawn(s,i+1).targetX));assert.deepEqual([...xs].sort((a,b)=>a-b),[520,670,820]);
});
test('the jetpack soldier over the road is hit where he is drawn',()=>{
 const jet=Array.from({length:12},(_,i)=>R.spawn(R.create({},1),i+1)).find(n=>n.type==='jetSoldier');
 const drawn=Expansion.JET_HEIGHT*R.JET_SCALE;assert.ok(jet.h>=drawn&&jet.h<=drawn+8,jet.h+' vs '+drawn);
 // Riders on the road are drawn larger than soldiers on foot, and he grows with them.
 assert.ok(drawn>=52&&drawn<=64,'as big as a seated rider: '+drawn);assert.ok(read('road-renderer.js').includes('scale:War?.JET_SCALE'));assert.ok(read('expansion-enemies.js').includes('const k=n.scale||1'));
});
test('when the rig arrives the escort clears the road and only its two guards ride with it',()=>{
 const g=game(R.LENGTH-30);g.e.invincible=1e9;g.s.wave=R.WAVES;g.s.enemies=[1,2,3,4].map(i=>({...R.spawn(g.s,i),x:520+i*60}));
 const events=tick(g,1,{run:true});assert.equal(events.filter(ev=>ev.type==='boss').length,1);assert.ok(g.s.boss.active);
 tick(g,.2);for(const n of g.s.enemies.filter(n=>!n.guard))assert.ok(n.type==='jetSoldier'?n.y<235:n.x>520,'the old escort is leaving');
 tick(g,6);const guards=g.s.enemies.filter(n=>n.guard);
 assert.equal(g.s.enemies.length,R.GUARDS,'nobody else is left over the boss');assert.equal(guards.length,2);assert.equal(R.GUARDS,2);
 assert.deepEqual(guards.map(n=>n.y).sort((a,b)=>a-b),[R.LANES[0],R.LANES[2]],'one on each outer lane, the middle stays open');
 for(const n of guards){assert.equal(n.type,'bike');assert.ok(n.x>300&&n.x<560,'between the hunter and the rig: '+n.x);}
 // They stay for the whole fight instead of retiring like the road escort.
 tick(g,22);assert.equal(g.s.enemies.filter(n=>n.guard&&n.hp>0).length,2);
 // Once destroyed they pay like a bike and never come back, not even after a retry.
 for(const n of g.s.enemies)n.hp=0;const points=tick(g,.1).filter(ev=>ev.type==='points');assert.equal(points.length,2);assert.ok(points.every(ev=>ev.amount===100));
 tick(g,4);assert.equal(g.s.enemies.length,0);assert.equal(R.tally(g.s).total,R.WAVES,'guards do not change the road count');
 const again={s:R.retry(g.s),p:g.p,e:g.e};again.s.distance=R.LENGTH-5;tick(again,1,{run:true});assert.ok(again.s.boss.active);assert.equal(again.s.enemies.filter(n=>n.guard).length,0);
});
test('a pothole always throws the bike, even when the hit itself is spared',()=>{
 for(const spared of [false,true]){const g=game(100);g.s.obstacles=[{id:0,distance:104,lane:414,type:'pothole',used:false}];g.e.invincible=0;g.s.hitWait=spared?5:0;const hp=g.e.hp;
  tick(g,.2);assert.ok(g.s.crash>0,'thrown'+(spared?' while protected':''));assert.equal(g.e.hp,spared?hp:hp-1);}
 const air=game(100);air.s.obstacles=[{id:0,distance:104,lane:414,type:'pothole',used:false}];air.s.jump=60;air.s.jumpV=200;tick(air,.2);assert.equal(air.s.crash,0,'jumping still clears it');
});
test('play time survives a retry and a reload, and the introduction does not count',()=>{
 const g=game(0);tick(g,3);assert.equal(g.s.elapsed,0);R.skipIntro(g.s);assert.equal(g.s.intro,R.INTRO);g.e.invincible=999;tick(g,2);assert.ok(Math.abs(g.s.elapsed-2)<.02);
 const back=R.create(JSON.parse(JSON.stringify(R.snapshot(g.s))),1);assert.ok(Math.abs(back.elapsed-2)<.02);assert.ok(Math.abs(R.retry(g.s).elapsed-2)<.02);
 assert.equal(R.create({elapsed:'x'},1).elapsed,0);
});
test('the debrief counts enemies by identity, not by what is on screen',()=>{
 const g=game(500);g.s.awarded=new Set(['road-1','road-2','road-17','road-rig','boss-ammo-3']);g.s.collected=new Set(['road-supply-7']);g.s.elapsed=83;
 assert.deepEqual(R.tally(g.s),{fallen:3,total:R.WAVES,stars:1,starTotal:R.STARS,seconds:83});
});
test('every attack says which sound it makes',()=>{
 const sound=(form,input,inventory)=>{const g=game(100,form);if(inventory)Object.assign(g.e.inventory,inventory);return tick(g,.05,input).find(ev=>ev.type==='attack')?.sound;};
 assert.equal(sound('soldier',{fire:true}),'pistol');assert.equal(sound('soldier',{fire:true},{selected:5}),'rifle');
 assert.equal(sound('wolf',{fire:true}),'claw');assert.equal(sound('zombie',{fire:true}),'plasma');assert.equal(sound('soldier',{kick:true}),'kick');
 const game4=read('level-four-game.js');assert.ok(game4.includes("audio.play(ev.sound||'pistol'"));
});
test('the finale brakes to a stop, burns, and only then drives off',()=>{
 assert.equal(R.endingSpeed(0),R.CRUISE);assert.ok(R.endingSpeed(2)<R.CRUISE&&R.endingSpeed(2)>0);
 for(const t of [4,6,9,10.4])assert.equal(R.endingSpeed(t),0,'stopped at '+t);assert.ok(R.endingSpeed(13)>200);
 const g=game(R.LENGTH);g.s.boss.active=true;g.s.boss.hp=0;const first=tick(g,.05);assert.ok(first.some(ev=>ev.type==='ending'));
 const blasts=tick(g,3.6).filter(ev=>ev.type==='blast');assert.ok(blasts.length>=7,'chained detonations: '+blasts.length);assert.equal(blasts.filter(ev=>ev.big).length,1,'one of them is the big one');
 const scroll=g.s.scroll;tick(g,3);assert.ok(g.s.scroll-scroll<40,'the road is still while he looks at the wreck');
 assert.equal(tick(g,.5).filter(ev=>ev.type==='blast').length,0);
 const done=tick(g,8);assert.equal(done.filter(ev=>ev.type==='complete').length,1);assert.equal(g.s.complete,true);
});

test('introduction: the convoy leaves, the helicopter peels away and the hunter rides in to his lane',()=>{
 const start=S.intro(0);assert.equal(start.rider.visible,false);assert.ok(start.rider.x<-100);assert.equal(start.convoy.length,2);assert.equal(start.title,false);assert.equal(start.bars,0);
 let prev=start;for(let t=1/30;t<=S.INTRO;t+=1/30){const s=S.intro(t);assert.ok(s.rider.x>=prev.rider.x-1e-9,'never rolls backwards');assert.ok(s.rider.x-prev.rider.x<12,'no jump at '+t.toFixed(2));
  for(const n of s.convoy)assert.ok(n.x>=690,'the convoy only pulls away');assert.ok(s.heli.x>prev.heli.x);prev=s;}
 const end=S.intro(S.INTRO);assert.equal(end.rider.x,S.REST);assert.equal(end.rider.wheelie,0);assert.equal(end.rider.boost,false);assert.equal(end.convoy.length,0);assert.equal(end.heli.visible,false);assert.equal(end.done,true);assert.ok(end.bars<.01);
 assert.equal(S.REST,200,'he ends exactly where play begins');assert.ok(S.intro(1.4).rider.wheelie>.1,'front wheel up while he accelerates');assert.ok(S.intro(3.5).heli.y<S.intro(1).heli.y-80,'the helicopter climbs away');
 assert.equal(S.intro(2).title,true);assert.equal(S.intro(1).bars,1);assert.equal(S.INTRO,R.INTRO);
});
test('ending script: breaking, blast, wreck, the mini tank and the way out',()=>{
 assert.deepEqual([0,1.5,1.7,2.4,2.6,9].map(t=>S.ending(t).phase),['breaking','breaking','blast','blast','wreck','wreck']);
 assert.deepEqual([0,2,3,13].map(t=>S.ending(t).rigFrame),[3,4,5,5]);
 assert.equal(S.ending(2).fire,0);assert.equal(S.ending(4).fire,1);assert.equal(S.ending(3).quake,0);assert.ok(S.ending(1).quake>0);
 assert.equal(S.ending(7.4,300).form,'rider');assert.equal(S.ending(7.5,300).form,'tank');assert.equal(S.ending(6).burst,-1);assert.ok(S.ending(7.3).burst>=0&&S.ending(7.3).burst<1);assert.equal(S.ending(8).burst,-1);
 for(const t of [0,5,10.5])assert.equal(S.ending(t,300).x,300,'he stays put until the tank is his');assert.ok(S.ending(13.5,300).x>1100,'and then leaves the screen');
 assert.equal(S.ending(7).reward,false);assert.equal(S.ending(8).reward,true);assert.equal(S.ending(13.9).done,false);assert.equal(S.ending(14).done,true);
 // The wreck slides back exactly as far as the road has moved since everything stopped.
 let moved=0;for(let t=10.5;t<13.5;t+=1/240){moved+=R.endingSpeed(t)/240;}assert.ok(Math.abs(S.ending(13.5).drift-moved)<2,S.ending(13.5).drift+' vs '+moved);assert.equal(S.ending(9).drift,0);
});
test('street lamps are planted on the guardrail and travel with the road',()=>{
 const a=S.lamps(1000),b=S.lamps(1100);assert.ok(a.length>=2);
 for(const l of a){const later=b.find(q=>q.id===l.id);if(later)assert.ok(Math.abs(l.x-later.x-100)<1e-9,'one pixel per pixel of road');assert.equal(l.y,S.LAMP_Y);assert.equal(l.foot,S.RAIL_Y);}
 const xs=a.map(l=>l.x).sort((p,q)=>p-q);for(let i=1;i<xs.length;i++)assert.ok(Math.abs(xs[i]-xs[i-1]-S.LAMP_GAP)<1e-9);
 for(let scroll=0;scroll<6000;scroll+=137)for(const l of S.lamps(scroll))assert.ok(l.x>-90&&l.x<1050);
});
test('mounted soldier rounds and their light originate at the painted pistol in every lane',()=>{
 const dt=1/120;
 for(const lane of R.LANES)for(const jumping of [false,true]){
  const {s,p,e}=game(150);p.lane=lane;
  R.update(s,p,e,{fire:true,run:true,jumpPressed:jumping},dt);
  const b=s.bullets[0],light=S.lights(s,p).find(l=>l.glow==='255,214,140');
  assert.ok(b&&light);const x=b.x-b.vx*dt,y=b.y-b.vy*dt;
  assert.ok(Math.hypot(x-light.x,y-light.y)<.001);
  // Measured barrel relative to the wheels of the displayed 104 px bike.
  const angle=jumping?Math.max(-.16,-s.jumpV*.0005):0;
  const dx=34.4*Math.cos(angle)+69.2*Math.sin(angle),dy=34.4*Math.sin(angle)-69.2*Math.cos(angle);
  assert.ok(Math.hypot(x-p.x-dx,y-p.y-dy)<1.1);
 }
});
test('the mounted zombie ray stays attached to the open palm with valid dusk lights on every frame',()=>{
 for(const jumping of [false,true]){
  const g=game(1020,'zombie'),{s,p,e}=g,dt=1/120;
  R.update(s,p,e,{fire:true,jumpPressed:jumping},dt);
  const ray=s.effects.find(f=>f.color==='ray');
  assert.ok(ray);
  const initial={x:ray.x,y:ray.y};
  let frames=0;
  while(s.effects.includes(ray)&&frames<30){
   const lights=S.lights(s,p),palm=lights.find(l=>l.glow==='150,240,255');
   assert.ok(lights.every(l=>Number.isFinite(l.x)&&Number.isFinite(l.y)&&Number.isFinite(l.r)&&l.r>0));
   assert.ok(s.shotFlash>0&&palm);
   // Raster coordinates of the first spark at the fingertips in the 104 px motorcycle sprite.
   const angle=s.jump?Math.max(-.16,Math.min(.13,-s.jumpV*.0005)):Math.sin(s.time*17)*.009;
   const px=p.x+37.7*Math.cos(angle)+72.2*Math.sin(angle),py=p.y+37.7*Math.sin(angle)-72.2*Math.cos(angle);
   assert.ok(Math.hypot(ray.x-px,ray.y-py)<2.2);
   assert.deepEqual([palm.x,palm.y],[ray.x,ray.y]);
   assert.equal(ray.toY,ray.y);assert.ok(Math.abs(ray.toX-ray.x-400)<1e-8);
   R.update(s,p,e,{right:true,up:true},dt);frames++;
  }
  assert.ok(frames>=25&&frames<=27);assert.ok(!s.effects.includes(ray));
  assert.ok(ray.x>initial.x+25&&ray.y<initial.y-15);
 }
});
test('zombie plasma leaves the same palm while the beam tracks a struck rider and deals damage once',()=>{
 const {s,p,e}=game(1020,'zombie'),dt=1/120;
 const foe={...R.spawn(s,4),x:470,y:p.y,targetX:400};s.enemies=[foe];
 R.update(s,p,e,{fire:true,kick:true},dt);
 const ray=s.effects.find(f=>f.color==='ray'),plasma=s.bullets.find(b=>b.plasma);
 assert.ok(ray&&plasma);assert.equal(foe.hp,foe.maxHp-2);
 assert.ok(Math.hypot(plasma.x-plasma.vx*dt-ray.x,plasma.y-plasma.vy*dt-ray.y)<.001);
 for(let i=0;i<15;i++){
  R.update(s,p,e,{left:true},dt);
  assert.equal(ray.toX,foe.x-foe.w/2+12);assert.equal(ray.toY,foe.y-foe.h*.65);
  assert.equal(foe.hp,foe.maxHp-2);
 }
});
test('the dusk lighting follows the bike, the boss, the shots and the fire',()=>{
 const g=game(500);g.s.time=3;const idle=S.lights(g.s,g.p),head=idle.filter(l=>l.glow==='255,236,180');
 assert.equal(head.length,2);assert.ok(head.every(l=>l.x>g.p.x),'the headlight points ahead');assert.ok(idle.some(l=>l.glow==='255,70,50'&&l.x<g.p.x),'tail light behind');
 for(const l of idle)for(const k of ['x','y','r','a'])assert.ok(Number.isFinite(l[k]),k);
 g.s.shotFlash=.12;assert.ok(S.lights(g.s,g.p).some(l=>l.glow==='255,214,140'&&l.a===1),'muzzle flash');g.s.shotFlash=0;
 g.s.enemies=[{...R.spawn(g.s,1),x:600,flash:.1},{...R.spawn(g.s,4),x:700,hp:0}];const fight=S.lights(g.s,g.p);
 assert.ok(fight.some(l=>l.glow==='255,180,120'));assert.ok(fight.some(l=>l.glow==='255,150,70'&&l.x===700),'a burning jeep lights the road');
 g.s.enemies=[];g.s.boss.active=true;g.s.boss.x=740;assert.ok(S.lights(g.s,g.p).some(l=>l.glow==='255,150,60'&&Math.abs(l.x-728)<1),'the furnace glows');
 g.s.bullets=Array.from({length:60},(_,i)=>({x:i*10,y:300,enemy:i%2===0}));const many=S.lights(g.s,g.p).length;g.s.bullets=[];assert.equal(many-S.lights(g.s,g.p).length,28,'shots are capped');
 g.s.ending=3;const wreck=S.lights(g.s,g.p);assert.ok(wreck.some(l=>l.r===190),'the wreck burns');assert.ok(!wreck.some(l=>l.glow==='255,150,60'),'the furnace is gone');
 g.s.ending=7.2;assert.ok(S.lights(g.s,g.p).some(l=>l.glow==='190,240,255'),'the tank arrives in a flash');
 const cut=game(0);cut.s.intro=.2;assert.equal(S.lights(cut.s,cut.p).filter(l=>l.glow==='255,236,180').length,0,'no headlight before he rides in');
});

test('mission 4 has its briefing, objectives and a radio that follows the chase',()=>{
 assert.equal(Story.briefing.length,3);assert.equal(Story.briefing[2].objectives.length,3);for(const page of Story.briefing){assert.ok(page.title);assert.ok(page.text.length>120);}
 assert.equal(Story.config.scenes,'four');assert.match(Story.config.eyebrow,/^MISIÓN 04/);assert.ok(Story.config.epilogue.length>40);
 const ids=Story.beats.map(b=>b.id);assert.equal(new Set(ids).size,ids.length);
 const base={riding:false,vehicles:0,jets:0,rampNear:false,crashed:false,hp:8,distance:0,bossActive:false,bossStage:0,reward:false},fired=c=>Story.beats.filter(b=>b.when({...base,...c})).map(b=>b.id);
 assert.deepEqual(fired({}),[]);assert.deepEqual(fired({riding:true}),['start']);assert.deepEqual(fired({vehicles:2}),['escort']);assert.deepEqual(fired({jets:1}),['jets']);
 assert.deepEqual(fired({crashed:true}),['crash']);assert.deepEqual(fired({hp:3}),['hurt']);assert.deepEqual(fired({hp:0}),[]);assert.deepEqual(fired({distance:9000}),['mid','near']);
 assert.deepEqual(fired({bossActive:true,bossStage:2}),['boss','turret','last']);assert.deepEqual(fired({reward:true}),['tank','sea']);
 assert.equal(Story.beats.find(b=>b.id==='sea').after,'tank');
 for(const b of Story.beats)assert.ok(!Story.config.ambient.test(b.id)||!/^(start|boss|turret|last|tank|sea)$/.test(b.id),'key beats are never skipped as ambient: '+b.id);
});
test('the fire on the wreck sits on the wreck and is made of flames, not bars',()=>{
 const renderer=read('road-renderer.js'),spots=JSON.parse(renderer.match(/const HOT=(\[\[.*?\]\]),STACKS/)[1].replace(/(^|[\[,])\./g,'$10.')),stacks=JSON.parse(renderer.match(/STACKS=(\[\[.*?\]\]),rnd/)[1].replace(/(^|[\[,])\./g,'$10.'));
 // Top of the wrecked heap along its width, measured on the art (left to right, as a fraction of its height).
 const top=[[.1,.673],[.2,.591],[.3,.89],[.4,.833],[.5,.598],[.6,.633],[.7,.673],[.8,.701],[.9,.423]],height=x=>{let best=top[0];for(const t of top)if(Math.abs(t[0]-x)<Math.abs(best[0]-x))best=t;return best[1];};
 assert.equal(spots.length,5);for(const [x,y,size] of spots){assert.ok(x>.05&&x<.95);assert.ok(y<=height(x)+.02,'flame at '+x+' starts on the wreck, not above it: '+y+' vs '+height(x));assert.ok(size<=1.15,'a flame is never stretched into separate bars');}
 for(const [x,y] of stacks)assert.ok(y<=height(x)+.02,'smoke rises from the heap');
 assert.ok(!renderer.includes('spot[2]*2.1'));assert.match(renderer,/Fire\.flame\(c,fx-6,fy\+1.*Fire\.flame\(c,fx\+6,fy\+1.*Fire\.flame\(c,fx,fy,spot\[2\]/,'a bigger fire is several flames side by side');
});
test('one mission selector in every mission: the map',()=>{
 for(const page of ['index.html','level-two.html','level-three.html','level-four.html','level-five.html','level-six.html','level-seven.html','level-eight.html']){const html=read(page);
  assert.ok(html.includes('mission-map.css'),page+' styles the map');assert.ok(html.includes('"mission-map.js"'),page+' loads the map');assert.ok(html.indexOf('"main-menu.js"')<html.indexOf('"mission-map.js"'),page+': the map mounts over the menu list');
  assert.ok(html.indexOf('"menu-shell.js"')>0&&html.indexOf('"menu-shell.js"')<html.indexOf('"player-profiles.js"'),page+': the shared menu is built before the modules that extend it');
  assert.ok(html.includes('id="main-menu"')&&!html.includes('data-menu-page'),page+' no longer carries its own copy of the menu');}
 assert.ok(read('menu-shell.js').includes('class="level-choices"'),'the shared menu keeps the list the map replaces');
 const map=read('mission-map.js');assert.ok(map.includes('list.hidden=true'),'the plain list is never shown next to the map');
});
test('mission 4 is wired to the shared systems of missions 1 to 3',()=>{
 const html=read('level-four.html'),source=read('level-four-game.js'),renderer=read('road-renderer.js'),order=name=>{const i=html.indexOf('"'+name+'"');assert.ok(i>0,'loads '+name);return i;};
 for(const css of ['mission-one-polish.css','mission-map.css'])assert.ok(html.includes(css),css);
 const last=order('level-four-game.js');for(const script of ['mission-map.js','armory.js','shop-ui.js','mission-one-fx.js','power-fx.js','boss-presentation.js','mission-kit.js','mission-results.js','mission-one-story.js','mission-four-story.js','mission-four-scenes.js','road-stage.js','helicopter-atlas.js'])assert.ok(order(script)<last,script+' before the game');
 assert.ok(order('road-war.js')<order('road-renderer.js')&&order('road-stage.js')<order('road-renderer.js'));assert.ok(order('mission-one-scenes.js')<order('mission-four-scenes.js')&&order('road-renderer.js')<order('mission-four-scenes.js'));
 assert.ok(order('mission-kit.js')<order('mission-results.js'));
 assert.ok(source.includes("presentation.title('MISIÓN 04','FURIA EN LA CARRETERA'"));assert.ok(source.includes("kicker:'MISIÓN 04 COMPLETADA'"));assert.ok(source.includes("label:'Continuar · Misión 05'"));assert.ok(source.includes("retry:{label:'Repetir misión'"));
 for(const cue of ['presentation?.intro(','presentation?.phase(','presentation?.defeat('])assert.ok(source.includes(cue),cue);
 assert.match(source,/ArcadeMissionKit\.debug\(/);assert.ok(source.includes("$('victory-screen').hidden=false"),'the old victory screen remains as a fallback');
 for(const file of ['level-four-game.js','road-renderer.js'])assert.doesNotMatch(read(file),/MISIÓN 4(?!\d)/,file+' uses two digits');
 assert.ok(renderer.includes('Kit.enemyBar(')&&renderer.includes('ArcadeMissionOneFx.lightmap(')&&renderer.includes('ArcadePowerFx?.draw('));
 for(const name of ['flame','smoke','blast'])assert.equal(typeof Mecha[name],'function','one fire for every wreck: '+name);
 assert.ok(read('mission-four-scenes.js').includes("Scenes.register('four'"));assert.ok(read('mission-one-scenes.js').includes('function register(set,files,list)'));
 assert.ok(!renderer.includes('ArcadeExpansionEnemies.sprite(c,images.expansion,s.crashAge'),'the soldier crashes with his own art, not a different style');
});
