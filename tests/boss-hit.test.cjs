const test = require('node:test');
const assert = require('node:assert/strict');
const Encounter = require('../encounter'), Physics = require('../physics');
const Enemies = require('../enemies'), Final = require('../final-boss'), Q = require('../quimera');

test('a missed bullet leaves the foreman unmarked and a second hit refreshes his tint', () => {
  const e = Encounter.createEncounter(), p = Physics.createPlayer(), b = e.boss;
  e.enemies = [];
  Object.assign(p, {x:380, y:b.y, form:'soldier', cloak:2});
  function bullet(y) {
    e.bullets.push({x:b.x-45, y, vx:1200, vy:0, life:1, damage:1, slot:1});
    Encounter.updateEncounter(e,p,{},.04);
  }
  bullet(b.y-110);
  assert.equal(b.hp,b.maxHp);
  assert.ok(!b.hit);
  bullet(b.y-30);
  assert.equal(b.hp,b.maxHp-1);
  assert.ok(b.hit>0);
  const peak=b.hit;
  Encounter.updateEncounter(e,p,{},.08);
  assert.ok(b.hit<peak);
  bullet(b.y-30);
  assert.equal(b.hit,peak);
  Encounter.updateEncounter(e,p,{},.19);
  assert.equal(b.hit,0);
});

test('invulnerable bosses ignore damage, and an active attack keeps its pose on impact', () => {
  const city={kind:'cityBoss',active:true,invulnerable:true,hp:25,hit:0};
  Enemies.damage(city,3);
  assert.deepEqual([city.hp,city.hit],[25,0]);
  const b=Final.create();
  Object.assign(b,{active:true,phase:'attack',kind:'kick',age:.2});
  const pose=Final.pose(b);
  Final.damage(b,0);
  assert.equal(b.hit,0);
  Final.damage(b,2);
  assert.ok(b.hit>0);
  assert.deepEqual(Final.pose(b),pose);
  Final.update({finalBoss:b},{cloak:3},.3,()=>{});
  assert.equal(b.hit,0);
});

test('each Quimera boss marks an accepted punch even through armor and clears it during play', () => {
  const dt=1/120;
  for(const kind of ['blackWolf','gunner','scientist','lizard']){
    const s=Q.create(),x=7500,y=355;
    Object.assign(s,{wave:17,locked:true,arenaLeft:7100,pending:[]});
    const hp=Q.foes[kind].hp;
    const n={kind,x,y,z:0,hp,maxHp:hp,cool:2,face:-1,id:1,age:0,act:'idle',turn:0,stride:0,gaitWeight:0};
    s.enemies=[n];
    Object.assign(s.player,{x:x-35,y,face:1});
    Q.update(s,{attack:'jab'},dt);
    for(let i=0;i<18;i++)Q.update(s,{},dt);
    assert.ok(n.hp<hp,kind);
    assert.ok(n.hitUntil>s.age,kind);
    for(let i=0;i<28;i++)Q.update(s,{},dt);
    assert.ok(n.hitUntil<=s.age,kind);
  }
});

test('the last hit fades on the body during each vehicle or arena ending', () => {
  for(const file of ['road-war','sea-war','mall-world','space-world','new-york-world']){
    const world=require('../'+file), s=world.create({started:true});
    const p=Physics.createPlayer(), e=Encounter.createEncounter();
    p.grounded=true;
    Object.assign(s,{ending:0});
    Object.assign(s.boss,{hp:0,hit:.14});
    world.update(s,p,e,{},.04);
    assert.ok(s.boss.hit>0&&s.boss.hit<.14,file);
    for(let i=0;i<5;i++)world.update(s,p,e,{},.04);
    assert.equal(s.boss.hit,0,file);
  }
});
