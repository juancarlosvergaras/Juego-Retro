const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../mausoleum-king'),P=require('../physics'),N=require('../enemies'),C=require('../mission-combat'),A=require('../arsenal'),V=require('../powers'),U=require('../progression'),L=require('../level-two');
const initialWorld={...P.WORLD};test.beforeEach(()=>Object.assign(P.WORLD,L.WORLD,{width:L.INTERIOR_WIDTH}));test.afterEach(()=>Object.assign(P.WORLD,initialWorld));
const player=(x=1750)=>Object.assign(P.createPlayer(),{x,y:620,grounded:true,form:'soldier'});
test('stone king transforms between and above both scaffolds, even after a zero-health interrupted landing',()=>{
 const platforms=L.geometry(true).platforms;
 for(const x of [920,1025,1130,1215,1290,1400,1520])for(const interrupted of [false,true]){
  const k=K.create({active:true,x}),p=player(1700);k.cooldown=99;
  K.update(k,p,.01,()=>{},[],platforms);
  if(interrupted){k.hp=0;k.phase='leap';k.frozen=3;k.age=1.7;k.startX=x;k.targetX=x;}else K.damage(k,1000);
  for(let i=0;i<900;i++)K.update(k,p,1/120,()=>{},[],platforms);
  assert.equal(k.stage,2);assert.equal(k.phase,'walk');assert.equal(k.hp,120);assert.equal(k.frozen,0);
  assert.ok(!platforms.some(s=>s.solid&&k.x+k.w/2>s.x&&k.x-k.w/2<s.x+s.w&&k.y>s.y+.01&&k.y-k.h<s.y+s.thickness));
 }
});
test('stone king crosses a scaffold with a landing above its masonry, never an invalid zombie sprite',()=>{
 const platforms=L.geometry(true).platforms,k=K.create({active:true,x:830}),p=player(1650);k.cooldown=99;
 for(let i=0;i<900;i++){K.update(k,p,1/120,()=>{},[],platforms);const pose=K.pose(k);assert.equal(pose.sheet,'kingStone');assert.ok(pose.row>=0&&pose.row<5);}
 assert.ok(k.x>1150);assert.equal(k.stage,1);
});
function tick(k,p,seconds,hurt=()=>{}){for(let i=0;i<Math.ceil(seconds*120);i++)K.update(k,p,1/120,hurt);}
function active(stage=1){return K.create({active:true,stage,x:1800},1);}
test('mausoleum has six standing zombies and four wall-roost bats with distinct persistent IDs',()=>{
 const all=K.interiorEnemies([302,321]),z=all.filter(n=>n.kind==='zombie'),b=all.filter(n=>n.kind==='bat');assert.equal(z.length,6);assert.equal(b.length,4);assert.equal(new Set(all.map(n=>n.id)).size,10);
 assert.ok(z.every(n=>n.spawnType==='sleep'&&n.phase==='dormant'));assert.ok(b.every(n=>n.phase==='sleep'&&n.wallRoost&&n.scaffold!==undefined));assert.equal(z[2].hp,0);assert.equal(b[1].hp,0);
 const bat=b[0];require('../cemetery-bat').update(bat,player(bat.x),.01);assert.equal(bat.phase,'wake');
});
test('king descends continuously from the original plinth before becoming vulnerable',()=>{
 const k=K.create(),p=player(1000);tick(k,p,1);assert.equal(k.phase,'dormant');assert.equal(k.y,524);assert.equal(K.damage(k,999),false);p.x=1900;
 let previous={x:k.x,y:k.y};for(let i=0;i<440;i++){K.update(k,p,1/120);assert.ok(Math.abs(k.x-previous.x)<3&&Math.abs(k.y-previous.y)<3);previous={x:k.x,y:k.y};}assert.equal(k.phase,'walk');assert.equal(k.y,620);assert.equal(K.targetable(k),true);
});
test('king waits for arrival at the plinth and living nearby zombies, including waking sleepers',()=>{
 const k=K.create(),p=player(1650),z={kind:'zombie',x:1810,y:620,hp:3,phase:'active'};
 K.update(k,p,.1,undefined,[]);assert.equal(k.phase,'dormant','not while crossing the hall');
 p.x=1900;
 for(const phase of ['dormant','waking','active']){z.phase=phase;K.update(k,p,.1,undefined,[z]);assert.equal(k.phase,'dormant');assert.equal(k.active,false);assert.equal(k.rocks.length,0);}
 z.hp=0;p.y=400;K.update(k,p,.1,undefined,[z]);assert.equal(k.phase,'dormant','must reach the boss height');
 p.y=620;K.update(k,p,.1,undefined,[z,{kind:'zombie',x:320,y:620,hp:3},{kind:'bat',x:1950,y:560,hp:3}]);assert.equal(k.phase,'descend');
 z.hp=3;K.update(k,p,.1,undefined,[z]);assert.equal(k.phase,'descend','a started introduction is not reset');
 assert.equal(K.create(K.snapshot(k)).phase,'descend');
});
test('mission combat supplies the live zombie list to the king activation gate',()=>{
 const p=player(1900),e=C.create(A.createInventory()),k=e.king=K.create(),powers=V.create(),profile=U.fresh();
 e.enemies=K.interiorEnemies([300,301,302,303,305,320,321,322,323]);
 for(let i=0;i<240;i++)C.update(e,p,{},1/120,L.geometry(true).platforms,powers,profile,{left:1500,right:2500,top:0,bottom:700});
 assert.equal(k.phase,'dormant');e.enemies.find(n=>n.id===304).hp=0;
 C.update(e,p,{},1/120,L.geometry(true).platforms,powers,profile,{left:1500,right:2500,top:0,bottom:700});assert.equal(k.phase,'descend');
});
test('stone shell breaks over time, zombie screams, and only the second death completes the fight',()=>{
 const k=active(),p=player();K.damage(k,1000);assert.equal(k.phase,'crack');assert.equal(k.defeated,false);assert.equal(K.damage(k,1000),false);
 tick(k,p,4.81);assert.equal(k.stage,2);assert.equal(k.phase,'roar');assert.equal(k.hp,120);assert.equal(K.damage(k,1000),false);tick(k,p,2.61);assert.equal(k.phase,'walk');
 K.damage(k,1000);assert.equal(k.phase,'death');assert.equal(k.defeated,false);tick(k,p,3.81);assert.equal(k.defeated,true);assert.equal(k.pools.length,0);assert.equal(k.active,false);
 const restored=K.create(K.snapshot(k));assert.equal(restored.defeated,true);assert.equal(restored.hp,0);
});
test('sword and claws hit only on extension and in the committed direction',()=>{
 for(const [stage,phase,impact] of [[1,'sword',.83],[2,'claw',.78]]){const k=active(stage),p=player(1690);Object.assign(k,{phase,age:0,facing:-1});let hits=0;tick(k,p,impact-.05,()=>hits++);assert.equal(hits,0);tick(k,p,.1,()=>hits++);assert.equal(hits,1);tick(k,p,.3,()=>hits++);assert.equal(hits,1);
 const behind=active(stage);Object.assign(behind,{phase,age:0,facing:1});tick(behind,p,1.1,()=>hits++);assert.equal(hits,1);}
});
test('stomp is telegraphed and its expanding ground wave can be jumped',()=>{
 for(const y of [620,560]){const k=active(),p=Object.assign(player(1910),{y});Object.assign(k,{phase:'stomp',age:0});let hits=0;tick(k,p,.95,()=>hits++);assert.equal(hits,0);tick(k,p,.6,()=>hits++);assert.equal(hits,y===620?1:0);}
});
test('distant rock attack locks a marked landing point and lets the player evade',()=>{
 const k=active(),p=player(1150);k.cooldown=0;tick(k,p,.01);assert.equal(k.phase,'rock');assert.equal(k.rocks[0].target,1150);assert.equal(k.rocks[0].warning,true);p.x=1450;let hits=0;tick(k,p,2.5,()=>hits++);assert.equal(hits,0);assert.equal(k.rocks[0].target,1150);assert.equal(k.rocks[0].landed,true);
});
test('vomit is a sustained fluid stream that leaves bounded, harmful, temporary pools',()=>{
 const k=active(2),p=player(1200);Object.assign(k,{phase:'vomit',age:0,facing:-1,streamClock:0});tick(k,p,2.5);assert.ok(k.fluid.length>10);assert.ok(k.pools.length>0&&k.pools.length<=12);k.phase='walk';k.cooldown=100;tick(k,p,1.6);const pool=k.pools[0];p.x=pool.x;let hits=0;K.update(k,p,.01,()=>hits++);assert.ok(hits>0);p.y=550;hits=0;K.update(k,p,.01,()=>hits++);assert.equal(hits,0);
 k.phase='walk';k.cooldown=100;tick(k,p,7);assert.equal(k.pools.length,0);assert.equal(k.fluid.length,0);
});
test('leap lands at the chosen target and the giant remains on the floor afterward',()=>{
 const k=active(2),p=player(1250);k.sequence=1;k.cooldown=0;tick(k,p,.01);assert.equal(k.phase,'leap');const target=k.targetX;p.x=1550;tick(k,p,1);assert.ok(k.y<500);tick(k,p,1.36);assert.equal(k.y,620);assert.ok(Math.abs(k.x-target)<1);assert.equal(k.phase,'walk');
});
test('weapons, explosive splash, wolf attacks and powers damage the same boss',()=>{
 const floor=L.geometry(true).platforms;
 for(const attack of ['bullet','rocket','grenade','claw','ram','orbital']){const p=player(1680),e=C.create(A.createInventory()),k=e.king=active(),powers=V.create(),profile=U.fresh();k.cooldown=99;k.x=1730;e.enemies=[];p.facing=1;
  if(attack==='bullet')e.bullets.push({x:1660,y:600,vx:500,vy:0,life:1,enemy:false,slot:3,damage:2});
  if(attack==='rocket')e.bullets.push({x:1720,y:600,vx:0,vy:0,life:0.001,enemy:false,slot:6,damage:4});
  if(attack==='grenade')e.bullets.push({x:1720,y:600,vx:0,vy:0,life:0.001,age:0,gravity:420,enemy:false,slot:9,damage:4});
  if(attack==='orbital')powers.beams.push({x:k.x,y:620,r:145,age:.44,hits:new Set()});
  if(attack==='claw'||attack==='ram'){p.form='wolf';p.h=64;}if(attack==='ram'){p.x=1710;p.vx=310;p.sprinting=true;}
  p.x+=240;k.x+=240;for(const b of e.bullets)b.x+=240;for(const b of powers.beams)b.x+=240;
  for(let i=0;i<35;i++)C.update(e,p,{fire:attack==='claw'||attack==='ram'},1/120,floor,powers,profile,{left:0,right:2500,top:0,bottom:700});assert.ok(k.hp<90,attack+' should damage the king');
 }
});
test('interruption and save/reload preserve phase boundaries and difficulty health proportions',()=>{
 const k=active();K.damage(k,45);K.rescale(k,1.35);assert.equal(k.hp/k.maxHp,.5);K.damage(k,1000);const resumed=K.create(K.snapshot(k),1.35);assert.equal(resumed.phase,'crack');assert.equal(resumed.defeated,false);tick(resumed,player(),5);assert.equal(resumed.stage,2);assert.equal(resumed.hp,162);
 for(const phase of Object.keys(K.durations)){const stage=['vomit','leap','claw','death'].includes(phase)?2:1;for(let i=0;i<60;i++){const p=K.pose({...active(stage),phase,age:K.durations[phase]*i/60});assert.ok(p.frame>=0&&p.frame<6);assert.ok(p.row>=0&&p.row<(p.sheet==='kingTransform'?2:5));}}
});


