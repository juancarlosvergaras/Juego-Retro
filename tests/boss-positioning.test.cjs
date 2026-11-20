const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../physics'),C=require('../mission-combat'),E=require('../encounter');
const Mall=require('../mall-world'),Space=require('../space-world'),NY=require('../new-york-world');
const dt=1/120;
function run(seconds,step){for(let i=0;i<Math.ceil(seconds/dt);i++)step();}
function room(world,floor,x,y){
 const s=world.create({started:true,floor,x,y}),p=P.createPlayer(),e=C.create();
 world.configure(s,p,e);Object.assign(p,{x,y,jetpack:!p.grounded});e.invincible=0;
 return {s,p,e};
}
test('the Colossus can hit both roof edges at floor, jump and flight height, with a fixed warning and a dodge window',()=>{
 for(const [x,y] of [[24,472],[936,472],[24,46],[936,46],[725,115],[300,290]]){
  for(const dodge of [false,true]){
   const {s,p,e}=room(Mall,3,x,y);
   Object.assign(s.boss,{active:true,phase:'recover',age:1.71});
   Mall.update(s,p,e,{},dt);
   if(s.boss.phase!=='throwWarn'){assert.equal(y,472);continue;}
   assert.equal(s.boss.aim.x,x);
   const hp=e.hp;
   if(dodge){p.x+=x<480?175:-175;p.y=y<210?350:110;}
   run(.90,()=>Mall.update(s,p,e,{},dt));
   assert.equal(e.hp,hp);assert.equal(s.boss.aim.x,x);
   run(2,()=>Mall.update(s,p,e,{},dt));
   assert.equal(e.hp<hp,!dodge,`x=${x}, y=${y}, dodge=${dodge}`);
  }
 }
 const {s,p,e}=room(Mall,3,936,472);
 Object.assign(s.boss,{active:true,phase:'fistWarn',age:0});
 run(1.8,()=>Mall.update(s,p,e,{},dt));assert.ok(e.damageTaken>0);
});
test('the final rooftop and high flight have a full exterior view; indoor crossings finish even when the player stops',()=>{
 for(const x of [20,270,400,936])assert.equal(Mall.cameraX(3,x),0);
 const {s,p,e}=room(Mall,3,80,72);assert.equal(s.camera.x,0);assert.equal(s.camera.y,0);
 s.boss.active=true;s.boss.hp=0;Mall.update(s,p,e,{},dt);assert.equal(s.camera.x,0);assert.equal(s.camera.y,0);
 const st=Mall.escalator(0),g=room(Mall,0,st.exit-1,Mall.treadY(st,st.exit));
 Mall.stepPlayer(g.s,g.p,{right:true},dt);Mall.update(g.s,g.p,g.e,{right:true},dt);assert.equal(g.s.stairs.active,true);
 run(1.2,()=>{Mall.stepPlayer(g.s,g.p,{},dt);Mall.update(g.s,g.p,g.e,{},dt);});
 assert.equal(g.s.floor,1);assert.equal(g.s.stairs.active,false);assert.equal(g.s.stairs.fade,0);
});
test('the Sovereign locks one visible beam through the actual target on either side, including directly above its mouth',()=>{
 for(const x of [24,646,936]){
  for(const dodge of [false,true]){
   const {s,p,e}=room(Space,2,x,80);
   Object.assign(s.boss,{active:true,phase:'arrival',age:3});
   Space.update(s,p,e,{},dt);
   assert.equal(s.boss.phase,'laserWarn');assert.equal(s.boss.laserX,x);
   if(dodge){p.y=465;p.x=x<480?500:110;}
   run(2.1,()=>Space.update(s,p,e,{},dt));
   assert.equal(e.damageTaken>0,!dodge);
  }
 }
});
test('both forms of the mausoleum king can reach a stationary flyer; leaving the marked lane avoids the strike',()=>{
 const K=require('../mausoleum-king');
 for(const stage of [1,2])for(const dodge of [false,true]){
  const k=K.create({stage,active:true,x:1750}),p={x:420,y:60,h:46};
  k.cooldown=0;let hits=0;
  K.update(k,p,dt,()=>hits++);
  assert.equal(k.phase,stage===1?'rock':'vomit');
  if(dodge){p.x=800;p.y=620;}
  run(3.6,()=>K.update(k,p,dt,()=>hits++));
  assert.equal(hits>0,!dodge,'mausoleum stage '+stage);
 }
});
test('the foreman shoots from the raised barrel and the two pack leader phases can intercept flight above the roof',()=>{
 const F=require('../final-boss');
 const p=Object.assign(P.createPlayer(),{x:220,y:-300,jetpack:true,grounded:false});
 const e=E.createEncounter();e.enemies=[];e.boss.active=true;e.boss.shot=0;e.invincible=0;
 const hp=e.hp;run(4,()=>E.updateEncounter(e,p,{},dt,[]));assert.ok(e.hp<hp);
 for(const x of [180,225,320]){
  const rifle=F.whiteGun({x:225,y:235},{x,y:45,grounded:true});
  const aimX=x-rifle.x,aimY=20-rifle.y;
  assert.ok(Math.abs(aimX*Math.sin(rifle.angle)-aimY*rifle.facing*Math.cos(rifle.angle))<1);
 }
 for(const stage of [1,2]){
  const g=E.createEncounter(),b=g.finalBoss;g.won=true;
  Object.assign(b,{active:true,engaged:true,stage,phase:'chase',missileWait:0,leapWait:0});
  let hits=0;run(4.6,()=>F.update(g,p,dt,()=>hits++,[{x:0,y:F.ARENA.y,w:729}]));
  assert.ok(hits>0,'stage '+stage);
 }
});
test('the airship Sentinel marks a missile above a high flyer at either extreme of its arena',()=>{
 const M=require('../air-mecha');
 for(const x of [6170,7610]){
  const b=M.create(),p={x,y:-490,h:46},bullets=[];
  Object.assign(b,{active:true,phase:'missiles',age:0});
  M.update(b,p,dt,bullets);assert.ok(b.markers.some(m=>m.x===x&&m.y<p.y-p.h));
  run(1.5,()=>M.update(b,p,dt,bullets));assert.ok(bullets.some(v=>v.x===x&&v.y<p.y-p.h&&v.vy>0));
 }
});
test('the Titan missiles hit in flight on both flanks, and can be evaded after the warning',()=>{
 for(const x of [24,936])for(const dodge of [false,true]){
  const {s,p,e}=room(NY,2,x,110);
  Object.assign(s.boss,{stage:2,active:true,phase:'missileWarn',age:0});
  NY.update(s,p,e,{},dt);assert.equal(s.boss.targets[0],x);
  if(dodge)p.x=x<480?500:420;
  run(2.3,()=>NY.update(s,p,e,{},dt));assert.equal(e.damageTaken>0,!dodge);
 }
});
test('the Siege Tank and Heraldo return fire at a distant attacker who damages them outside the camera',()=>{
 const T=require('../city-tank'),H=require('../storm-zombie'),N=require('../enemies');
 for(const [api,b,hit] of [[T,T.create(),T.damage],[H,H.create(),N.damage]]){
  const p={x:b.x-850,y:145,h:46},view={left:b.x-1150,right:b.x-400,top:0,bottom:450},shots=[];
  const step=()=>api===T?T.update(b,p,dt,shots,[],view):H.update(b,p,dt,shots,view);
  run(2,step);assert.equal(shots.length,0);hit(b,2);run(3,step);
  assert.ok(shots.some(shot=>shot.vy<0&&shot.vx<0));
 }
});
test('the convoy truck covers the back of each motorcycle lane',()=>{
 const R=require('../road-war');
 for(const lane of [366,414,462]){
  const s=R.create({distance:R.LENGTH}),e=C.create(),p=Object.assign(P.createPlayer(),{x:85,lane,y:lane});
  s.intro=5;s.hitWait=0;e.invincible=0;Object.assign(s.boss,{active:true,x:740,phase:'volley',age:1,shot:0});
  const hp=e.hp;run(3.8,()=>R.update(s,p,e,{},dt));assert.ok(e.hp<hp);
 }
});
test('the dock gunner can cover the lane directly below the firing position',()=>{
 const Q=require('../quimera'),s=Q.create();
 s.wave=11;s.player.x=Q.waves[11].x-75;
 let gunner;
 for(let i=0;i<500;i++){
  Q.update(s,{},dt);gunner=s.enemies[0];
  if(gunner&&!gunner.entry)break;
 }
 assert.equal(gunner.kind,'gunner');
 Object.assign(s.player,{x:gunner.x+20,y:gunner.y<370?429:306,immune:0});
 Object.assign(gunner,{cool:0,volley:0,wind:0,overheat:0});
 const hp=s.player.hp;run(2,()=>Q.update(s,{},dt));assert.ok(s.player.hp<hp);
});
test('jumping straight above the submarine captain draws a marked overhead salvo',()=>{
 const Sea=require('../sea-war');
 const s=Sea.create({inside:true,started:true}),p=Object.assign(P.createPlayer(),{x:s.boss.x,y:s.boss.y-150,grounded:false,vy:0}),e=C.create();
 Object.assign(s.boss,{phase:'recover',active:true,age:1});
 Sea.update(s,p,e,{},dt);
 assert.equal(s.boss.phase,'missileWarn');assert.deepEqual(s.boss.targets,[p.x]);
});
