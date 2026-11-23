const test=require('node:test'), assert=require('node:assert/strict');
const G=require('../grenades'), E=require('../encounter'), N=require('../enemies'), P=require('../physics');
const C=require('../mission-combat'), A=require('../arsenal'), Mall=require('../mall-world');
const Road=require('../road-war'), Sea=require('../sea-war'), Fuga=require('../fuga'), Q=require('../quimera');
const dt=1/120, floor=[{x:0,y:472,w:1000,kind:'ground',thickness:60}];
const combat=()=>C.create(A.createInventory());

test('all six platform missions have grenade throwers; the mall adds two flying patrols on each shopping floor',()=>{
  const Air=require('../level-three'),Space=require('../space-world'),NY=require('../new-york-world');
  for(const troops of [N.create(),C.cityEnemies(),Air.soldiers(),Mall.create().enemies,
    Space.create().enemies,NY.create().enemies])assert.ok(troops.some(n=>n.grenadier));
  for(const level of [0,1,2]){
    const s=Mall.create({floor:level,started:true}),p=P.createPlayer(),e=combat();
    Mall.configure(s,p,e);
    for(const x of [1620,2120,2600,3240,3700,4120]){
      p.x=x;s.camera.x=Mall.cameraX(s.floor,p.x);s.patrolWait=0;
      const previous=s.enemies.length;
      Mall.update(s,p,e,{},dt);
      assert.equal(s.enemies.length,previous+1);
      const n=s.enemies.at(-1);assert.ok(n.rear&&n.x<s.camera.x);
      if(n.kind==='jetSoldier')assert.ok(n.grenadier&&n.y<p.y-90);
    }
    assert.equal(s.enemies.filter(n=>n.rear&&n.kind==='jetSoldier').length,2);
    const saved=Mall.create(Mall.snapshot(s,p));assert.equal(saved.enemies.filter(n=>n.rear).length,6);
  }
});

test('ground and jet troops release from the hand, land on a real deck, and give the player time to leave the marked area',()=>{
  for(const flying of [false,true]){
    const thrower={hp:3,kind:flying?'jetSoldier':'rifle',x:100,y:flying?340:472,h:46,grenadier:true,grenadeWait:0};
    const p={x:380,y:472,h:46},bullets=[];
    G.soldier(thrower,{...p,cloak:2},dt,bullets);assert.equal(thrower.throwAge,null);
    G.soldier(thrower,p,dt,bullets,{left:160,right:1100});assert.equal(thrower.throwAge,null);
    for(let i=0;i<70&&!bullets.length;i++)G.soldier(thrower,p,dt,bullets);
    const g=bullets[0];assert.ok(g.enemy&&g.x>thrower.x&&g.y<thrower.y);
    for(let i=0;i<400&&!g.armed;i++)E.stepGrenade(g,dt,floor);
    assert.equal(g.floorY,472);assert.ok(g.armed&&g.life>=.85);
    assert.ok(Math.abs(g.x-p.x)<4);
    for(const distance of [g.blastRadius-1,g.blastRadius+1]){
      const e=combat();E.enemyBlast(e,{...p,x:g.x+distance},g);
      assert.equal(e.hp<e.maxHp,distance<g.blastRadius);
      assert.equal(e.explosions[0].radius,g.blastRadius);
    }
    const originalX=g.x;E.stepGrenade(g,.5,floor);assert.equal(g.x,originalX);assert.ok(g.life>0);
  }
});

test('the motorcycle jet trooper, the diver and the car passenger launch live grenades',()=>{
  const s=Road.create({distance:800}),p=Object.assign(P.createPlayer(),{x:210,y:414,lane:414}),e=combat();
  const jet=Road.spawn(s,3);Object.assign(jet,{x:560,shot:0});s.enemies=[jet];
  Road.update(s,p,e,{},dt);
  assert.equal(s.grenades.length,1);
  const target=s.grenades[0].tx;const before=target-s.scroll;
  Road.update(s,p,e,{},dt);assert.equal(s.grenades[0].tx,target);assert.ok(target-s.scroll<before);
  const underwater=Sea.create({x:680,y:390,started:true}),diver=underwater.enemies.find(n=>n.grenadier);
  p.x=underwater.x;p.y=underwater.y;diver.shot=0;
  Sea.update(underwater,p,e,{},dt);assert.equal(underwater.grenades.length,1);
  assert.equal(underwater.grenades[0].ty,Sea.seabed(p.x));
  const drive=Fuga.create();drive.mode='race';drive.boss.z=300;drive.speed=55;
  Fuga.update(drive,{},dt);Object.assign(drive.cars[0],{z:50,shot:0});Fuga.update(drive,{},dt);
  assert.equal(drive.grenades.length,1);assert.ok(drive.grenades[0].ty>drive.z);
});

test('the beat-em-up grenade uses the same ground ellipse as its hit test, and detonates only once',()=>{
  function attempt(distance){
    const s=Q.create(),p=s.player,g=G.lob(p.x,p.y,40,p.x,p.y-distance,56,{depth:.52});
    s.grenades.push(g);
    for(let i=0;i<225;i++)Q.update(s,{},dt);
    assert.equal(s.grenades.length,0);return p.hp;
  }
  assert.equal(attempt(28),88);assert.equal(attempt(30),100);
});
