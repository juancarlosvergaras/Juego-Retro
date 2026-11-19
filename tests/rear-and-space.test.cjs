const test = require('node:test');
const assert = require('node:assert/strict');
const Road = require('../road-war'), Mall = require('../mall-world'), Space = require('../space-world');
const P = require('../physics'), C = require('../mission-combat'), A = require('../arsenal');
const N = require('../enemies'), E = require('../encounter'), S = require('../sovereign-animation');
const dt = 1/120;
const encounter = () => C.create(A.createInventory());

test('rear riders enter in view before contact, overtake and then fire back from the barrel', () => {
 const s = Road.create({distance:519.8}), p = Object.assign(P.createPlayer(),{x:200,lane:414}), e = encounter();
 const events=Road.update(s,p,e,{},dt);
 const n=s.enemies.find(n=>n.rear);
 assert.ok(n.x+n.w/2<0);assert.ok(events.some(ev=>ev.type==='rear'));
 assert.equal(new Set(Array.from({length:35},(_,i)=>Road.spawn(s,i+1)).filter(n=>n.rear).map(n=>n.type)).size,2);
 let crossed=false, fired=false;
 for(let i=0;i<700&&!fired;i++){
  const prev=n.x;Road.update(s,p,e,{},dt);
  assert.ok(Math.abs(n.x-prev)<3);
  if(n.x>=p.x)crossed=true;
  if(n.flash>0){
   assert.ok(crossed);
   const b=s.bullets.find(b=>b.enemy),m=Road.enemyMuzzle(n);
   assert.ok(b.vx<0);assert.ok(Math.hypot(b.x-m.x,b.y-m.y)<3);fired=true;
  }
 }
 assert.ok(fired);
});

test('rear guards patrol through the visible edge, persist across reloads and are not rewarded twice',()=>{
 for(const floor of [0,1,2]){
  const s=Mall.create({floor,x:1625,started:true}),p=P.createPlayer(),e=encounter();Mall.configure(s,p,e);
  p.cloak=1;Mall.update(s,p,e,{},dt);assert.ok(!s.enemies.some(n=>n.rear));p.cloak=0;
  assert.ok(Mall.update(s,p,e,{},dt).some(ev=>ev.type==='rear'));
  const n=s.enemies.find(n=>n.rear);assert.ok(n.x+n.w/2<s.camera.x);
  for(let i=0;i<120;i++)N.update([n],p,dt,s.geometry.platforms,[],E.segmentHit);
  assert.ok(n.x>s.camera.x);assert.equal(n.facing,1);n.hp=1;
  const restored=Mall.create(Mall.snapshot(s,p));assert.equal(restored.enemies.find(a=>a.id===n.id).hp,1);
  n.hp=0;assert.equal(Mall.update(s,p,e,{},dt).filter(ev=>ev.type==='points').length,1);
  assert.equal(Mall.update(s,p,e,{},dt).filter(ev=>ev.type==='points').length,0);
  const retry=Mall.retry(s);p.x=1630;Mall.update(retry,p,e,{},dt);assert.ok(!retry.enemies.some(a=>a.id===n.id));
 }
});

test('airlocks change sectors behind the closed shutter and resume on the correct side',()=>{
 for(const floor of [0,1]){
  const s=Space.create({floor,started:true}),p=P.createPlayer(),e=encounter();Space.configure(s,p,e);
  p.x=Space.widths[floor]-330;assert.equal(Space.interact(s,p),null);
  p.x+=160;assert.equal(Space.interact(s,p),'airlock');assert.equal(Space.interact(s,p),null);
  let saves=0;
  for(let i=0;i<245;i++){
   for(const ev of Space.update(s,p,e,{},dt))if(ev.type==='checkpoint')saves++;
   if(i===50||i===150){
    const restored=Space.create(Space.snapshot(s,p));assert.equal(restored.floor,i===50?floor:floor+1);
    const player=P.createPlayer();Space.configure(restored,player,encounter());
    if(i===50)assert.ok(Space.atAirlock(restored,player));else assert.equal(player.x,140);
   }
  }
  assert.equal(saves,1);assert.equal(s.travel,-1);assert.equal(P.WORLD.top,0);
 }
});

test('all three crew weapons release at their firing pose, in both directions, after entering view',()=>{
 const s=Space.create({started:true});
 for(const kind of ['alien','alienElite','alienPilot'])for(const dir of [-1,1]){
  const n={...s.enemies.find(n=>n.kind===kind),x:475,shot:0};const p={x:n.x+dir*190,y:120};const bullets=[];
  Space.enemyUpdate(n,p,dt,bullets,{left:700,right:1660});assert.equal(bullets.length,0);
  n.shot=0;Space.enemyUpdate(n,p,dt,bullets,{left:0,right:960});
  assert.equal(bullets.length,kind==='alienElite'?3:1);
  const muzzle=Space.crewMuzzle(n),b=bullets[Math.floor(bullets.length/2)];
  assert.equal(n.facing,dir);assert.equal(b.x,muzzle.x);assert.equal(b.y,muzzle.y);assert.equal(Math.sign(b.vx),dir);assert.ok(b.vy<0);
 }
});

test('the Sovereign shows its attack under fire and spent hazards keep moving during cloak',()=>{
 const s=Space.create({floor:2,started:true}),p=P.createPlayer(),e=encounter();Space.configure(s,p,e);
 Object.assign(s.boss,{active:true,phase:'lash',age:1.1,hit:.1});p.x=900;Space.update(s,p,e,{},dt);
 assert.equal(s.boss.waveDir,1);assert.equal(S.pose(s.boss).sheet,'attack');
 s.boss.age=1.2;Space.update(s,p,e,{},dt);
 assert.ok(s.hazards[0].vx>0);p.cloak=2;const start=s.hazards[0].x,hp=e.hp;
 for(let i=0;i<380;i++)Space.update(s,p,e,{},dt);
 assert.equal(s.hazards.length,0);assert.ok(start<p.x);assert.equal(e.hp,hp);
 Object.assign(s.boss,{phase:'recover',age:2.1});p.y=80;p.cloak=0;Space.update(s,p,e,{},dt);
 assert.equal(s.boss.phase,'laserWarn');assert.equal(s.boss.facing,1);
 assert.ok(Space.laserSegment(s.boss,55,p.x).x>s.boss.x);assert.equal(S.pose({phase:'laser',age:1.15}).index,15);
});

test('el suministro dibujado entrega un solo premio y conserva su sorteo al cargar o reintentar',()=>{
 for(const world of [Mall,Space]){
  const s=world.create({started:true}), p=P.createPlayer(), e=encounter();
  world.configure(s,p,e);
  const items=world.pickups(s);
  assert.equal(new Set(items.map(i=>i.x)).size,items.length);
  assert.deepEqual(world.pickups(world.create(world.snapshot(s,p))),items);
  assert.deepEqual(world.pickups(world.retry(s)),items);
  const item=items.find(i=>i.type==='ammo'||i.type==='fuel');
  p.x=item.x;p.y=item.y;p.fuel=0;
  const before={...e.inventory.ammo};
  const events=world.update(s,p,e,{},dt);
  assert.equal(events.filter(ev=>ev.type==='pickup').length,1);
  assert.ok(s.taken.has(item.id));
  const changed=Object.keys(e.inventory.ammo).filter(slot=>e.inventory.ammo[slot]!==before[slot]).map(Number);
  assert.deepEqual(changed,item.type==='ammo'?[item.slot]:[]);
  if(item.type==='fuel')assert.equal(p.fuel,p.fuelMax);
  assert.ok(world.create(world.snapshot(s,p)).taken.has(item.id));
  assert.ok(!world.update(s,p,e,{},dt).some(ev=>ev.type==='pickup'));
 }
});
