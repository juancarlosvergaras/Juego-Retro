const test=require('node:test');
const assert=require('node:assert/strict');
const World=require('../new-york-world');
const Physics=require('../physics');
const Combat=require('../mission-combat');
const Powers=require('../powers');

function setup(saved={}){
  const s=World.create({started:true,...saved}),p=Physics.createPlayer();
  const e=Combat.create({owned:[3],selected:3,ammo:{3:99}});
  World.configure(s,p,e);
  return {s,p,e,powers:Powers.create()};
}
function shoot(g,x,y,shot,extra={}){
  g.e.bullets.push({x:x-5,y,vx:1200,vy:0,life:2,slot:3,damage:1,carShot:shot,...extra});
  Combat.update(g.e,g.p,{},1/120,g.s.geometry.platforms,g.powers,{owned:[],levels:{}},{left:0,right:2450,top:0,bottom:540});
  World.update(g.s,g.p,g.e,{},1/120);
}

test('police cruiser takes level-two damage stages and the wreck remains after resume',()=>{
  const g=setup(),left=g.s.parked[0].x-120*.46;
  for(let i=1;i<=10;i++){
    shoot(g,left,436,i);
    assert.equal(g.s.parked[0].hp,10-i);
    assert.equal(g.s.parked[0].stage,i>=10?3:i>=6?2:i>=3?1:0);
  }
  const resumed=setup(World.snapshot(g.s,g.p));
  assert.equal(resumed.s.parked[0].stage,3);
  assert.ok(!resumed.e.streetTargets.some(b=>Math.abs(b.x-left)<1));
  assert.equal(resumed.s.parked[1].stage,undefined);
});
test('crossing cars brake on impact, retain direction and cannot run over actors as wrecks',()=>{
  for(const time of [3,12]){
    const g=setup({trafficTime:time}),car=g.s.traffic[0],x=car.x-car.w*.46;
    shoot(g,x,car.y-car.h*.4,1);
    const hit=g.s.traffic[0];assert.equal(hit.hp,9);assert.equal(hit.outbound,car.outbound);
    for(let i=0;i<10;i++)World.update(g.s,g.p,g.e,{},.05);
    for(let shot=2;shot<=10;shot++){
      const c=g.s.traffic[0];shoot(g,c.x-c.w*.46,c.y-c.h*.45,shot);
    }
    for(let i=0;i<200;i++)World.update(g.s,g.p,g.e,{},.05);
    const wreck=g.s.traffic[0];assert.equal(wreck.stage,3);assert.equal(wreck.active,false);
    const resumed=setup(World.snapshot(g.s,g.p)).s;
    assert.equal(resumed.traffic[0].id,car.id);assert.equal(resumed.traffic[0].stage,3);
    const next=setup({...World.snapshot(g.s,g.p),floor:1});
    assert.equal(next.s.traffic[0].stage,undefined);
  }
});
test('a direct rocket and its blast count once, while a police bullet leaves the cruiser intact',()=>{
  const g=setup(),box=g.e.streetTargets.find(b=>b.x<510&&b.x>400);
  shoot(g,box.x,455,55,{fromPolice:true});assert.equal(g.s.parked[0].hp,undefined);
  shoot(g,box.x,455,56,{slot:6});assert.equal(g.s.parked[0].hp,9);
  shoot(g,box.x,455,56);assert.equal(g.s.parked[0].hp,9);
});

test('four distinct shots bring down an officer, including hostile fire, and he stays down on resume',()=>{
  const g=setup(),a=g.s.allies[0];
  g.p.x=a.x+80;World.update(g.s,g.p,g.e,{},1/120);
  const fire=(id,extra)=>shoot(g,a.x-a.w/2,a.y-30,id,extra);
  fire(1,{fromPolice:true});assert.equal(a.hp,4);
  fire(2,{slot:6});fire(2);assert.equal(a.hp,3);
  fire(3,{enemy:true});fire(4);assert.equal(a.hp,1);
  assert.equal(g.s.recruited.has(a.id),true);
  fire(5);assert.equal(a.hp,0);assert.ok(a.death>1);
  assert.equal(g.s.recruited.has(a.id),false);
  for(let i=0;i<100;i++)World.update(g.s,g.p,g.e,{},.02);
  assert.equal(a.death,0);assert.ok(!g.e.streetTargets.some(box=>box.police===a));
  const saved=World.snapshot(g.s,g.p);
  assert.equal(setup(saved).s.allies[0].hp,0);
  assert.ok(!setup({...saved,floor:2}).s.allies.some(actor=>actor.id===a.id));
});

test('barricade intercepts shots, breaks once and stops blocking movement and gunfire',()=>{
  const g=setup(),bar=g.s.barriers[0],a=g.s.allies[0];
  g.p.x=bar.x+150;a.x=bar.x+bar.w+25;a.joined=false;
  for(let shot=1;shot<=5;shot++){
    shoot(g,bar.x,bar.y+9,shot);
    assert.equal(bar.hp,5-shot);assert.equal(a.hp,4);
    assert.equal(g.s.geometry.platforms.includes(bar),shot<5);
  }
  assert.ok(!g.e.streetTargets.includes(bar));
  const saved=World.snapshot(g.s,g.p),again=setup(saved);
  assert.equal(again.s.barriers[0].hp,0);
  assert.ok(!again.s.geometry.platforms.includes(again.s.barriers[0]));
  assert.equal(setup({...saved,floor:1}).s.barriers[0].hp,5);
});

test('the main detonation fires once at the wreck pose and is not replayed on reload',()=>{
  const g=setup({floor:2,ending:true,endingTime:2.3}),events=[];
  for(let i=0;i<46;i++)events.push(...World.update(g.s,g.p,g.e,{},.05));
  assert.deepEqual(events.filter(e=>e.type==='collapseSound').map(e=>e.name),['explosion','steelTear','titanBlast']);
  const again=setup(World.snapshot(g.s,g.p));
  for(let i=0;i<80;i++)assert.ok(!World.update(again.s,again.p,again.e,{},.02).some(e=>e.name==='titanBlast'));
});
