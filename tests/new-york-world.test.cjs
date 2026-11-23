const test=require('node:test'),assert=require('node:assert/strict'),M=require('../new-york-world'),P=require('../physics'),C=require('../mission-combat'),N=require('../enemies'),V=require('../powers'),Campaign=require('../campaign');
const setup=(floor=0)=>{const s=M.create({floor,started:true}),p=P.createPlayer(),e=C.create({owned:[1,3],selected:3,ammo:{3:200}});M.configure(s,p,e);return{s,p,e};};const tick=(g,t)=>{const events=[];for(let i=0;i<Math.ceil(t*60);i++)events.push(...M.update(g.s,g.p,g.e,{},1/60));return events;};
test('two long districts, thirty soldiers and shared supplies',()=>{assert.deepEqual(M.widths,[6000,5400,960]);let stars=0;for(const floor of [0,1]){const {s}=setup(floor);assert.equal(s.enemies.length,15);assert.ok(s.enemies.some(n=>n.kind==='cityAssault'));assert.ok(s.enemies.some(n=>n.kind==='cityGrenadier'));assert.ok(s.enemies.every(n=>Number.isFinite(n.shot)));stars+=s.districtLoot[floor].filter(v=>v.type==='star').length;}assert.equal(stars,4);});
test('crossing warning precedes traffic and jumping/burrowing avoids collision',()=>{assert.equal(M.trafficAt(1,0).warn,true);assert.equal(M.trafficAt(3,0).active,true);const g=setup();g.s.time=2.95;g.s.trafficWait=0;g.p.x=1250;g.p.y=390;g.e.invincible=0;tick(g,.02);assert.equal(g.e.hp,8);g.s.time=2.95;g.p.y=472;g.p.burrow={};tick(g,.02);assert.equal(g.e.hp,8);g.s.time=2.95;g.p.burrow=null;tick(g,.02);assert.equal(g.e.hp,6);});
test('police recruit by proximity, fire friendly bullets and persist into final plaza',()=>{const g=setup();g.p.x=565;tick(g,.03);assert.equal(g.s.recruited.size,1);g.s.enemies[0].x=850;tick(g,1.2);assert.ok(g.e.bullets.some(b=>b.fromPolice&&!b.enemy));const saved=M.snapshot(g.s,g.p);const resumed=M.create({...saved,floor:2});assert.equal(resumed.allies.length,1);assert.equal(resumed.allies[0].joined,true);});
test('district exit preserves recruits and retry uses last checkpoint',()=>{const g=setup();g.p.x=2000;tick(g,.02);assert.equal(g.s.checkpointX,1900);const retried=M.retry(g.s);assert.equal(retried.x,1900);g.p.x=5900;g.p.grounded=true;assert.equal(M.interact(g.s,g.p),'street');tick(g,3.1);assert.equal(g.s.floor,1);assert.equal(g.p.x,140);assert.equal(g.s.checkpointX,140);});
test('commander remains inactive until arrival and first defeat cannot finish campaign',()=>{const g=setup(2);tick(g,4);assert.equal(g.s.boss.active,false);g.p.x=300;tick(g,2.1);assert.equal(g.s.boss.active,true);g.s.boss.hp=0;const ev=tick(g,.03);assert.equal(g.s.boss.phase,'retreat');assert.equal(g.s.boss.invulnerable,true);assert.equal(g.s.ending,-1);assert.ok(!ev.some(v=>v.type==='points'));N.damage(g.s.boss,1000);assert.equal(g.s.boss.hp,0);});
test('commander runs, climbs, closes cockpit and enters a fresh giant robot phase',()=>{const g=setup(2);g.p.x=300;g.s.boss.active=true;g.s.boss.hp=0;const phases=new Set();for(let i=0;i<270;i++){M.update(g.s,g.p,g.e,{},1/60);phases.add(g.s.boss.phase);}for(const p of ['retreat','climb','cockpit','robotArrival'])assert.ok(phases.has(p),p);assert.equal(g.s.boss.stage,2);assert.equal(g.s.boss.hp,280);assert.equal(g.s.boss.invulnerable,false);assert.equal(g.s.boss.y,472);assert.equal(g.s.boss.h,238);});
test('all commander and robot attacks have telegraphed phases',()=>{const g=setup(2);g.p.x=300;g.e.invincible=999;let phases=new Set();for(let i=0;i<1200;i++){M.update(g.s,g.p,g.e,{},1/60);phases.add(g.s.boss.phase);}for(const p of ['rifleWarn','rifle','grenadeWarn','grenade','slideWarn','slide','recover'])assert.ok(phases.has(p),p);g.s.boss.hp=0;tick(g,6);phases=new Set();for(let i=0;i<1800;i++){M.update(g.s,g.p,g.e,{},1/60);phases.add(g.s.boss.phase);}for(const p of ['gatlingWarn','gatling','missileWarn','missile','stompWarn','stomp','sweepWarn','sweep','recover'])assert.ok(phases.has(p),p);});
test('shared gun damages commander and giant; transition is protected',()=>{const g=setup(2);g.s.boss.active=true;g.s.boss.phase='recover';g.e.enemies=[g.s.boss];g.p.x=620;g.p.aim={x:1,y:0};g.e.invincible=999;const powers=V.create(),profile={owned:[],levels:{}};for(let i=0;i<60;i++)C.update(g.e,g.p,{fire:true},1/120,g.s.geometry.platforms,powers,profile,{left:0,right:960,top:0,bottom:540});assert.ok(g.s.boss.hp<90);g.s.boss.hp=0;tick(g,6);g.p.x=550;g.e.cooldown=0;const before=g.s.boss.hp;for(let i=0;i<80;i++)C.update(g.e,g.p,{fire:true},1/120,g.s.geometry.platforms,powers,profile,{left:0,right:960,top:0,bottom:540});assert.ok(g.s.boss.hp<before);});
test('final defeat rewards once and saved ending resumes without resurrecting boss',()=>{const g=setup(2);g.s.boss.active=true;g.s.boss.stage=2;g.s.boss.hp=0;g.s.boss.targets=[100];g.e.explosions=[{x:100,y:472,life:.2}];const events=tick(g,.02);assert.equal(events.filter(v=>v.amount===15000).length,1);assert.equal(g.s.boss.targets.length,0);assert.equal(g.e.explosions.length,0);const s=M.create(M.snapshot(g.s,g.p));assert.equal(s.ending,g.s.ending);assert.equal(s.boss.hp,0);const more=tick({...g,s},15.1);assert.equal(s.complete,true);assert.equal(more.filter(v=>v.type==='points').length,0);});
test('new soldiers remain finite, respect ram reaction and wait when distant',()=>{const g=setup();const n=g.s.enemies.find(n=>n.kind==='cityAssault');g.p.x=50;for(let i=0;i<600;i++)N.update([n],g.p,1/60,g.s.geometry.platforms,g.e.bullets,()=>null);assert.equal(g.e.bullets.length,0);g.p.x=n.x-200;for(let i=0;i<180;i++)N.update([n],g.p,1/60,g.s.geometry.platforms,g.e.bullets,()=>null);assert.ok(g.e.bullets.length>0);assert.ok(Number.isFinite(n.x+n.y));n.ramHit={age:0,dir:1};n.vy=-150;n.grounded=false;N.update([n],g.p,1/60,g.s.geometry.platforms,g.e.bullets,()=>null);assert.ok(n.ramHit.age>0);});
test('mission eight transfer retains earned forms and weapons',()=>{const data=new Map(),store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};Campaign.transferEight(store,{form:'robot',robotUnlocked:true},{hp:2,inventory:{owned:[3,7],selected:7,ammo:{7:90}}},{total:200},{cooldowns:{}});assert.equal(Campaign.read(store).level,8);assert.equal(Campaign.read(store).inventory.selected,7);assert.equal(Campaign.read(store).robotUnlocked,true);});

test('cars travel continuously between the horizon and foreground and collide only in the crosswalk',()=>{
 for(const floor of [0,1])for(let i=0;i<M.crossings.length;i++)for(const pass of [2,3]){
  const start=pass*9-i*2.3;
  let last=null,seen=false;
  for(let frame=0;frame<1080;frame++){
   const car=M.trafficAt(start+frame/120,i,floor);
   if(car.active){assert.ok(car.visible);assert.ok(Math.abs(car.y-M.FLOOR)<20);seen=true;}
   if(last&&car.visible&&last.visible){
    assert.ok(Math.abs(car.y-last.y)<4);assert.ok(Math.abs(car.x-last.x)<2);
    assert.ok(car.outbound?car.y<=last.y+.001:car.y>=last.y-.001);
   }
   if(last&&car.visible!==last.visible){
    const visible=car.visible?car:last;
    assert.ok(visible.w<3||visible.y-visible.h>537);
   }
   last=car;
  }
  assert.ok(seen);
 }
});

test('each car sounds one warning and can hit each grounded actor only once',()=>{
 const g=setup(),{s,p,e}=g;
 s.time=.6;s.trafficWait=0;p.x=M.crossings[0]-25;e.invincible=0;
 const n=s.enemies[0];Object.assign(n,{x:p.x,y:M.FLOOR,hp:18});
 let horns=0,hits=0;
 for(let i=0;i<510;i++){
  e.invincible=0;
  const hp=e.hp,events=M.update(s,p,e,{},1/120);
  horns+=events.filter(v=>v.type==='trafficHorn').length;
  if(e.hp<hp){assert.ok(s.traffic[0].visible&&s.traffic[0].active);hits++;}
 }
 assert.equal(horns,1);assert.equal(hits,1);assert.equal(n.hp,16);
 for(const [x,y] of [[M.crossings[0]+100,M.FLOOR],[M.crossings[0],M.FLOOR-90]]){
  p.x=x;p.y=y;s.time=2.52;s.playerCarHit=null;e.invincible=0;
  const hp=e.hp;tick(g,1);assert.equal(e.hp,hp);
 }
});

test('resume keeps cars in place, and saving during a district change keeps its correct entrance',()=>{
 const {s,p,e}=setup();s.time=12.18;
 const saved=M.create(M.snapshot(s,p));M.configure(saved,p,e);
 assert.deepEqual(saved.traffic[0],M.trafficAt(12.18,0));
 assert.equal(M.create({started:true}).time,0);
 p.x=5900;p.grounded=true;M.interact(s,p);assert.equal(M.interact(s,p),null);
 tick({s,p,e},1);assert.equal(M.snapshot(s,p).floor,0);
 tick({s,p,e},.6);const arrival=M.snapshot(s,p);
 assert.equal(arrival.floor,1);assert.equal(arrival.x,140);assert.equal(s.camera.x,0);
 tick({s,p,e},1.5);assert.equal(s.travel,-1);
});

test('only the active street item can be collected, and returning to a skipped item works',()=>{
 for(const floor of [0,1]){
  const {s,p,e}=setup(floor),items=s.districtLoot[floor];
  assert.equal(s.activePickup.id,items[0].id);
  p.y=M.FLOOR-90;
  for(p.x=140;p.x<1800;p.x+=15)M.update(s,p,e,{},1/60);
  assert.equal(s.taken.size,0);
  for(;p.x>140;p.x-=15)M.update(s,p,e,{},1/60);
  assert.equal(s.activePickup.id,items[0].id);
  p.y=M.FLOOR;
  for(const item of items){
   p.x=item.x;
   const events=M.update(s,p,e,{},1/60);
   assert.equal(events.filter(ev=>ev.type==='pickup').length,1);
   assert.ok(s.taken.has(item.id));assert.equal(s.activePickup,null);
   assert.equal(M.update(s,p,e,{},1/60).filter(ev=>ev.type==='pickup').length,0);
  }
  assert.equal(s.taken.size,9);assert.equal(s.stars.size,2);assert.equal(s.activePickup,null);
 }
});

test('random rewards and the visible choice survive reload, checkpoints and older saves',t=>{
 const original=['health','ammo','fuel','star','health','ammo','fuel','star','health'];
 const rng=t.mock.method(Math,'random',()=>.999);
 const a=M.create({started:true});
 assert.deepEqual(a.districtLoot[0].map(i=>i.type),original);
 rng.mock.mockImplementation(()=>0);
 const {s,p,e}=setup();
 assert.notDeepEqual(s.districtLoot[0].map(i=>i.type),original);
 p.y=M.FLOOR-100;p.x=780;M.update(s,p,e,{},.02);
 p.x=660;M.update(s,p,e,{},.02);
 // At this camera position both locations fit, and the first is closer now.
 assert.equal(s.activePickup.id,'0-1');
 const saved=JSON.parse(JSON.stringify(M.snapshot(s,p)));
 rng.mock.mockImplementation(()=>.5);
 const restored=M.create(saved);M.configure(restored,p,e);
 assert.equal(restored.activePickup.id,'0-1');
 assert.deepEqual(restored.districtLoot,s.districtLoot);
 assert.deepEqual(M.retry(restored).districtLoot,s.districtLoot);
 const legacy=M.create({floor:1,started:true,taken:['1-3','1-4'],stars:['1-3']});
 M.configure(legacy,p,e);
 assert.equal(legacy.districtLoot[1][3].type,'star');
 assert.equal(legacy.districtLoot[1].filter(item=>item.type==='star'&&!legacy.taken.has(item.id)).length,1);
 p.x=5900;p.grounded=true;assert.equal(M.interact(s,p),'street');tick({s,p,e},3.1);
 assert.equal(s.activePickup.id,'1-0');
 p.x=5300;p.grounded=true;M.interact(s,p);tick({s,p,e},3.1);assert.equal(s.activePickup,null);
});

test('each police resupply in the plaza grants only one randomly selected ammunition type',t=>{
 const {s,p,e}=setup(2);s.boss.active=true;s.boss.phase='recover';
 const rng=t.mock.method(Math,'random',()=>0);
 for(const [choice,slot] of [[0,3],[.999,5]]){
  rng.mock.mockImplementation(()=>choice);
  const before={...e.inventory.ammo};s.supplyAge=10;
  const events=M.update(s,p,e,{},.01);
  assert.equal(events.filter(ev=>ev.type==='pickup').length,1);
  assert.deepEqual(e.inventory.ammo,{...before,[slot]:(before[slot]||0)+35});
 }
});
