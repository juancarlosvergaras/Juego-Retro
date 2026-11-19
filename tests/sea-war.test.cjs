const test=require('node:test'),assert=require('node:assert/strict'),S=require('../sea-war'),R=require('../road-war'),A=require('../arsenal'),P=require('../physics'),E=require('../mission-combat'),Z=require('../zombie-form'),Progress=require('../progression'),C=require('../campaign'),F=require('../advanced-forms');
function game(saved={started:true},form='tank'){const s=S.create(saved),p=Object.assign(P.createPlayer(),{form,x:s.x,y:s.inside?S.FLOOR:s.y,facing:1,maxJumps:2,tankUnlocked:true,fighterUnlocked:true,robotUnlocked:true,zombieUnlocked:true}),e=E.create(A.createInventory());e.invincible=999;return{s,p,e};}
function tick(g,t,input={}){const out=[];for(let i=0;i<Math.ceil(t*120);i++){Z.tick(g.p,1/120);out.push(...S.update(g.s,g.p,g.e,input,1/120));}return out;}
test('sea introduction freezes combat, then free swimming descends and clamps to the seabed',()=>{const g=game({});tick(g,4,{fire:true,right:true,down:true});assert.equal(g.p.x,180);assert.equal(g.s.bullets.length,0);tick(g,4,{right:true,down:true,run:true});assert.ok(g.p.x>600);assert.ok(g.p.y>500);assert.ok(g.p.submersible);tick(g,20,{down:true});assert.ok(g.p.y<=S.seabed(g.p.x)-35);});
test('swimmers ease through reversals, mirror without dipping their nose, and level out at rest or a boundary',()=>{
 for(const form of ['soldier','wolf','zombie','robot','fighter','hero','tank']){
  const g=game({started:true,x:820,y:460},form);
  tick(g,.6,{up:true,right:true});
  const tilt=g.p.swimPitch;assert.ok(tilt<-.14&&tilt>-.32,form);
  const geometry=require('../sea-sprites');
  const before=geometry.point(g.p,50,0);
  tick(g,1/120,{up:true,left:true});
  const after=geometry.point(g.p,50,0);
  assert.ok(after.x<g.p.x&&before.x>after.x);
  assert.ok(Math.abs((before.y-after.y)-(165/Math.SQRT2/120))<.25);
  tick(g,1/120,{down:true});assert.ok(g.p.swimPitch<0&&g.p.swimPitch>tilt-.01);
  tick(g,.8,{down:true});assert.ok(g.p.swimPitch>.18);
  tick(g,1.5);assert.ok(Math.abs(g.p.swimPitch)<.001);
  g.p.y=90;tick(g,.8,{up:true});assert.ok(Math.abs(g.p.swimPitch)<.001);
 }
});
test('submerged shots leave the pictured barrel, palm or eyes in both directions while the player pitches',()=>{
 const geometry=require('../sea-sprites'),dt=1/120;
 for(const form of ['soldier','tank','zombie','robot','hero'])for(const facing of [-1,1])for(const down of [false,true]){
  const g=game({started:true,x:1020,y:450},form),motion={left:facing<0,right:facing>0,up:!down,down};
  g.s.enemies=[];g.s.mines=[];
  g.e.inventory={owned:[1,3,5],selected:3,secondary:5,ammo:{3:99,5:99}};
  tick(g,.32,motion);tick(g,dt,{...motion,fire:true,kick:form==='zombie'});
  const {p,s}=g,body=geometry.point(p,0,0),width= form==='tank'?118:124;
  const project=(x,y)=>{const a=p.swimPitch;
   return {x:body.x+facing*(Math.cos(a)*x-Math.sin(a)*y),y:body.y+Math.sin(a)*x+Math.cos(a)*y};};
  const near=(a,b)=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1.25,form+' '+JSON.stringify([a,b]));
  const shots=s.bullets.filter(b=>!b.enemy);assert.equal(shots.length,form==='robot'?2:1,form+' facing '+facing+' descending '+down);
  for(const b of shots){
   const born={x:b.x-b.vx*dt,y:b.y-b.vy*dt};let expected;
   if(form==='robot'){
    const arm=b.robotArm,wrist=arm?[32,8]:[40,13],tip=arm?[43,14]:[40,12];
    expected=project(wrist[0]+tip[0]-15,wrist[1]+tip[1]-20);
   }else if(form==='hero')expected=project(8.6,21-(Math.floor(p.anim*12)%12>=3&&Math.floor(p.anim*12)%12<=8?19.8:19.1));
   else {const cel={soldier:[174,69],zombie:[164,78],tank:[173,42]}[form];expected=project((cel[0]-96)*width/192,(cel[1]-64)*width/192);}
   near(born,expected);
   assert.ok(b.vx*facing>0&&b.vy*(down?1:-1)>0,form);
   if(form==='zombie')near(s.effects.find(f=>f.color==='ray'),born);
   if(form==='hero'){
    const rects=[],ctx={save(){},restore(){},translate(){},rotate(){},fillRect(x,y,w,h){rects.push([x,w]);}};
    require('../boss-attack-sprites').projectile(ctx,b);
    assert.ok(rects.length&&rects.every(([x])=>-x<=Math.hypot(b.x-born.x,b.y-born.y)+.001),'first ray frame stays ahead of the eyes');
   }
  }
 }
});
test('explicit aim keeps its world direction and changing aim does not move the submarine barrel',()=>{
 const g=game({started:true,x:920,y:450},'tank');tick(g,.45,{up:true,right:true});
 const before={...require('../sea-sprites').muzzle(g.p)};tick(g,1/120,{right:true,up:true,aimVector:{x:0,y:1},fire:true});
 const b=g.s.bullets.find(b=>b.superCannon);assert.ok(b.vy>0&&Math.abs(b.vx)<1e-6);
 assert.ok(Math.hypot(b.x-b.vx/120-before.x,b.y-b.vy/120-before.y)<2);
});
test('enemy divers do not shoot offscreen; nearby enemies turn and fire at player',()=>{const g=game();tick(g,2);assert.equal(g.s.bullets.filter(b=>b.enemy).length,0);const n=g.s.enemies[0];g.p.x=n.x-150;g.p.y=n.y;tick(g,2.5);assert.ok(g.s.bullets.some(b=>b.enemy));assert.equal(n.facing,-1);});
test('mini tank cannon has infinite ammunition, directional shots and a bounded firing rate',()=>{const g=game();const ammo=g.e.inventory.ammo[3];tick(g,1.1,{fire:true,aimUp:true});assert.equal(g.e.inventory.ammo[3],ammo);assert.ok(g.s.bullets.some(b=>b.superCannon&&b.vy<0));assert.ok(g.s.bullets.length<=2);const shot=F.shot({...g.p,aim:{x:-1,y:0}});assert.ok(shot.bullets[0].vx<0);assert.equal(shot.bullets[0].damage,8);});
test('airlock requires reaching the deepest far end, seals for four seconds and starts captain safely',()=>{const g=game();g.p.x=S.WIDTH-300;g.p.y=1000;tick(g,.02);assert.equal(g.s.inside,false);g.p.y=S.HEIGHT-300;tick(g,.02);assert.ok(g.s.airlock>=0&&g.s.airlock<.1);tick(g,3);assert.equal(g.s.inside,false);tick(g,1.1);assert.equal(g.s.inside,true);assert.equal(g.p.y,S.FLOOR);assert.equal(g.p.submersible,false);assert.equal(g.p.swimming,false);assert.equal(g.s.boss.phase,'arrival');assert.equal(g.s.checkpoint,3);assert.equal(g.s.bullets.length,0);});
test('captain chooses attacks by distance on both sides, then locks his turn through the wind-up',()=>{
 for(const dir of [-1,1])for(const [gap,phase] of [[116,'dashWarn'],[255,'grenadeWarn'],[398,'gunWarn']]){
  const g=game({started:true,inside:true}),b=g.s.boss;b.x=480;g.p.x=b.x+dir*gap;
  tick(g,1.46);assert.equal(b.phase,phase);assert.equal(b.facing,dir);
  g.p.x=b.x-dir*100;tick(g,.22);assert.equal(b.facing,dir);assert.equal(b.phase,phase);
 }
});
test('remaining far away draws gunfire first, then a marked missile salvo',()=>{
 const g=game({started:true,inside:true}),b=g.s.boss,phases=[],kinds=new Set();
 for(let i=0;i<1200;i++){
  tick(g,1/120);if(phases.at(-1)!==b.phase)phases.push(b.phase);
  if(b.phase==='missileWarn')assert.equal(b.targets.length,2);
  for(const shot of g.s.bullets)kinds.add(shot.type);
 }
 assert.deepEqual(phases.slice(0,9),['arrival','gunWarn','gun','recover','gunWarn','gun','recover','missileWarn','missile']);
 assert.deepEqual([...kinds].sort(),['missile','red']);assert.equal(g.s.hazards.length,0);
});
test('electric grenade leaves the release hand, arcs to the warned spot and fuses before damage',()=>{
 for(const dir of [-1,1]){
  const g=game({inside:true,started:true},'soldier'),b=g.s.boss;b.x=480;g.p.x=b.x+dir*245;
  const target=g.p.x;tick(g,1.46);assert.equal(b.phase,'grenadeWarn');assert.equal(b.targetX,target);
  g.p.x=b.x-dir*100;let frames=new Set();
  while(b.phase==='grenadeWarn'){frames.add(S.captainPose(b).frame);tick(g,1/120);}
  assert.equal(frames.size,5);assert.equal(S.captainPose(b).frame,5);
  const h=g.s.hazards[0],hand=S.captainSocket(b,'release');
  assert.deepEqual([h.x,h.y,h.age],[hand.x,hand.y,0]);assert.equal(h.stage,'flight');
  b.frozen=4;g.e.invincible=0;g.s.hitWait=0;g.p.x=target;const hp=g.e.hp;
  tick(g,h.flight*.25);assert.ok(h.y<hand.y);assert.ok((h.x-hand.x)*dir>0);
  tick(g,h.flight*.76);assert.equal(h.stage,'fuse');assert.equal(h.x,target);
  tick(g,.25);assert.equal(g.e.hp,hp);tick(g,.18);assert.equal(h.stage,'electric');assert.ok(g.e.hp<hp);
  tick(g,1.25);assert.equal(g.s.hazards.length,0);
 }
});
test('shoulder rush only damages during the lunge and can be jumped',()=>{
 for(const jump of [false,true]){
  const g=game({inside:true,started:true},'soldier'),b=g.s.boss;b.x=470;g.p.x=555;
  g.e.invincible=0;g.s.hitWait=0;const hp=g.e.hp;tick(g,1.98);assert.equal(g.e.hp,hp);
  tick(g,1/120,{jumpPressed:jump});tick(g,.65);assert.ok(b.x>g.p.x);
  assert.equal(g.e.hp,hp-(jump?0:2));
 }
});
test('inside the submarine jumping avoids floor electric hazard, while standing suffers damage',()=>{const g=game({inside:true,started:true});g.e.invincible=0;g.s.hitWait=0;g.s.hazards=[{stage:'electric',x:g.p.x,y:S.FLOOR-8,age:.12,radius:76}];g.p.y=S.FLOOR-100;g.p.vy=0;const hp=g.e.hp;tick(g,.02);assert.equal(g.e.hp,hp);g.p.y=S.FLOOR;tick(g,.02);assert.ok(g.e.hp<hp);});
test('zombie plasma creates a persistent damaging slow pool on the arena floor',()=>{const g=game({inside:true,started:true},'zombie');g.s.boss.phase='recover';g.s.boss.age=0;g.s.boss.x=420;g.p.x=250;tick(g,.4,{kick:true,aimDown:true});assert.ok(g.s.pools.length>0);g.s.boss.x=g.s.pools[0].x;const hp=g.s.boss.hp;tick(g,.2);assert.ok(g.s.boss.hp<hp);assert.ok(g.s.boss.sticky>0);tick(g,5);assert.equal(g.s.pools.length,0);});
test('sonar checkpoint preserves rewards and supplies but resets unfinished captain on retry',()=>{const g=game();const cp=S.stations[1];g.p.x=cp.x;g.p.y=cp.y;const events=tick(g,.01);assert.ok(events.some(e=>e.type==='checkpoint'));g.s.awarded.add('sea-1');g.s.taken.add('sea-item-1');const retry=S.retry(g.s);assert.equal(retry.x,cp.x);assert.equal(retry.y,cp.y);assert.ok(retry.awarded.has('sea-1'));assert.ok(retry.taken.has('sea-item-1'));assert.equal(retry.boss.hp,160);});
test('defeating captain grants fighter once, resolves simultaneous death and resumes final sequence safely',()=>{const g=game({inside:true,started:true});g.s.boss.hp=0;g.e.hp=.5;g.e.invincible=0;g.s.hitWait=0;g.s.bullets.push({x:g.p.x,y:g.p.y-20,enemy:true,life:1,vx:0,vy:0,damage:1});let events=tick(g,.02);assert.ok(g.p.fighterUnlocked);assert.equal(g.e.dead,false);assert.ok(g.e.hp>=1);assert.equal(events.filter(e=>e.type==='unlock').length,1);assert.equal(events.filter(e=>e.type==='points').length,1);g.s=S.create(S.snapshot(g.s,g.p));events=tick(g,14.1);assert.ok(g.s.complete);assert.equal(events.filter(e=>e.type==='points').length,0);assert.equal(events.filter(e=>e.type==='complete').length,1);});
test('tank reward is granted by convoy defeat and carried into mission 5 without altering mission-one loadout',()=>{const map=new Map([['cap-dollar.mission-one-loadout.v1','untouched']]),store={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},g=game();const r=R.create({distance:6600});r.boss.active=true;r.boss.hp=0;g.p.tankUnlocked=false;const ev=R.update(r,g.p,g.e,{},.02);assert.ok(g.p.tankUnlocked);assert.ok(ev.some(e=>e.type==='unlock'));C.transferFive(store,g.p,g.e,{total:99},{cooldowns:{wave:7}});assert.equal(C.read(store).level,5);assert.ok(C.read(store).tankUnlocked);assert.equal(C.read(store).cooldowns.wave,7);assert.equal(map.get('cap-dollar.mission-one-loadout.v1'),'untouched');});
test('new forms persist per profile, cycle with five-second cooldown, and fighter combos never spend ammo',()=>{const map=new Map(),store={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},profile=Progress.fresh();profile.tankUnlocked=profile.fighterUnlocked=true;Progress.save(profile,store);const g=game();Progress.apply(Progress.load(store),g.p,g.e,true);g.p.form='soldier';assert.ok(Z.change(g.e,g.p,'fighter'));assert.equal(g.p.formCooldown,5);assert.equal(Z.change(g.e,g.p,'tank'),false);g.p.transform=0;Z.tick(g.p,5);assert.ok(Z.change(g.e,g.p,'tank'));g.p.form='fighter';g.p.transform=0;g.p.fighterKickInput=true;const ammo=g.e.inventory.ammo[3];const shots=[A.fire(g.e.inventory,g.p),A.fire(g.e.inventory,g.p),A.fire(g.e.inventory,g.p)];assert.deepEqual(shots.map(x=>x.weapon.damage),[3,4,5]);assert.ok(g.p.fighterKick);assert.equal(g.e.inventory.ammo[3],ammo);});
test('fighter punches and kicks hit overlapping enemies and tank cannot use hook or jetpack in older worlds',()=>{const g=game({},'fighter');g.s.intro=5;g.s.enemies=[0,1].map(i=>({id:'close'+i,kind:'sea',type:'diver',x:g.p.x+70,y:g.p.y,homeX:g.p.x+70,homeY:g.p.y,w:64,h:48,hp:10,maxHp:10,age:0,shot:3,frozen:0,sticky:0}));tick(g,.02,{kick:true});assert.ok(g.s.enemies.every(n=>n.hp<10));assert.ok(g.p.fighterKick);const p=Object.assign(P.createPlayer(),{form:'tank',grounded:true,y:500,x:100,jetpack:true,fuel:600});P.step(p,{jetpackPressed:true,hookPressed:true},.016,[{x:0,y:500,w:600,kind:'ground'}]);assert.equal(p.jetpack,false);assert.equal(p.rope,null);});

test('the three cave passages allow the mini submarine to enter, cross the chamber and come back',()=>{
 for(const depth of [-535,-310,-104]){
  const start=S.reef.left-135,finish=S.reef.right+125;
  const g=game({started:true,x:start,y:S.seabed(start)+depth});
  for(const direction of [1,-1]){
   const destination=direction>0?finish:start;
   for(let i=0;i<1800&&direction*(destination-g.p.x)>1;i++){
    const desired=S.seabed(g.p.x)+depth;
    S.update(g.s,g.p,g.e,{right:direction>0,left:direction<0,up:g.p.y>desired+2,down:g.p.y<desired-2,run:true},1/120);
    assert.equal(S.reef.freeY(g.p.x,g.p.y,44,46),g.p.y);
   }
   assert.ok(Math.abs(destination-g.p.x)<4,`passage ${depth}, direction ${direction}, stopped at ${g.p.x}`);
   assert.equal(g.s.inside,false);
  }
 }
});
test('solid rock limits the swimmer and shots, and an old save inside new terrain resumes in water',()=>{
 const shelf=S.reef.rocks[1],mid=shelf.sections[32],x=mid.x;
 const g=game({started:true,x,y:mid.bottom+94});
 tick(g,2,{up:true});const limit=g.p.y;tick(g,.6,{up:true});
 assert.equal(g.p.y,limit);assert.ok(g.p.y>=mid.bottom+46);
 const bullet={x,y:mid.bottom+10,vx:0,vy:-300,life:3};
 g.s.bullets=[bullet];tick(g,.1);assert.ok(!g.s.bullets.includes(bullet));
 const restored=S.create({started:true,checkpoint:1,x,y:(mid.top+mid.bottom)/2});
 assert.equal(S.reef.freeY(x,restored.y,44,46),restored.y);assert.equal(restored.checkpoint,1);
 assert.deepEqual(restored.camera,{x:Math.round(x-340),y:Math.round(restored.y-280)});
});
test('squid jet in pulses, freeze and award points once across save and resume',()=>{
 const g=game(),n=g.s.enemies.find(e=>e.type==='squid');g.s.enemies=[n];g.p.x=n.x-120;g.p.y=n.y;
 const speeds=[];for(let i=0;i<130;i++){const x=n.x;tick(g,1/120);speeds.push(Math.abs(n.x-x)*120);}
 assert.ok(Math.max(...speeds)>4*Math.min(...speeds));
 const pose=n.stroke,oldX=n.x;n.frozen=1;tick(g,.4);assert.equal(n.stroke,pose);assert.equal(n.x,oldX);
 S.damage(n,n.hp);const rewards=tick(g,.1).filter(e=>e.type==='points');assert.equal(rewards.length,1);
 const restored=S.create(S.snapshot(g.s,g.p));assert.equal(restored.enemies.some(e=>e.id===n.id),false);
});
test('a charging shark keeps its heading as it passes the player and animates through recovery',()=>{
 const g=game(),n=g.s.enemies.find(e=>e.type==='shark');g.s.enemies=[n];
 g.p.x=n.x+45;g.p.y=n.y;n.phase='rush';n.dx=1;n.dy=0;n.phaseAge=0;n.stroke=0;
 tick(g,.45);assert.ok(n.x>g.p.x);assert.equal(n.facing,1);const pose=n.stroke;
 tick(g,.8);assert.equal(n.phase,'recover');assert.ok(n.stroke>pose);
});
