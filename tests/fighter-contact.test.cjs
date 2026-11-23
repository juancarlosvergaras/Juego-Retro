const test = require('node:test');
const assert = require('node:assert/strict');
const Arsenal = require('../arsenal');
const Physics = require('../physics');
const Encounter = require('../encounter');
const Mission = require('../mission-combat');
const Powers = require('../powers');
const Enemies = require('../enemies');
const Forms = require('../advanced-forms');
const Road = require('../road-war');
const floor = {kind:'ground',x:0,y:472,w:1000,thickness:12};
const dt = 1/120;

function ground(firstMission, facing=1) {
  const p = Object.assign(Physics.createPlayer(), {form:'fighter',x:400,y:472,facing,ground:floor,grounded:true});
  const e = firstMission ? Encounter.createEncounter() : Mission.create(Arsenal.createInventory());
  const powers = Powers.create(), profile={owned:[],levels:{}}, sounds=[];
  const n = Enemies.createSoldier({kind:'rifle',x:p.x+facing*32,y:p.y,ground:floor,grounded:true},0);
  e.enemies=[n];e.invincible=20;e.inventory.ammo[e.inventory.selected]=0;
  function step(input={},platforms=[floor]) {
    if(firstMission) Encounter.updateEncounter(e,p,input,dt,platforms);
    else {
      Forms.tick(p,dt);
      Mission.update(e,p,input,dt,platforms,powers,profile,{left:0,right:960,top:0,bottom:540},(_,sound)=>sounds.push(sound));
    }
  }
  return {p,e,n,sounds,step};
}
for(const first of [true,false]) for(const facing of [-1,1]){
  test((first?'construction':'campaign')+' fighter connects on the extended cel, once, in direction '+facing,()=>{
    const {p,e,n,step}=ground(first,facing);
    const second={...n,id:1,x:n.x+facing*6},behind={...n,id:2,x:p.x-facing*35};
    e.enemies.push(second,behind);step({fire:true});
    for(let i=0;i<16;i++)step();
    assert.equal(n.hp,3);
    for(let i=0;i<8;i++)step();
    assert.equal(n.hp,2.15);assert.ok(p.fighterImpact);assert.ok(n.fighterStagger>0);
    assert.equal(Forms.fighterFrame(p,12),6);assert.equal(second.hp,3);assert.equal(behind.hp,3);
    for(let i=0;i<28;i++)step();
    assert.equal(n.hp,2.15);assert.ok(!p.fighterImpact);assert.equal(e.bullets.some(b=>!b.enemy),false);
  });
}
test('a miss, wall, different floor or interrupted windup produces no impact',()=>{
 for(const condition of ['out of reach','wall','upper floor','hurt','changed form']){
  const {p,n,sounds,step}=ground(false);step({fire:true});
  const platforms=[floor];
  if(condition==='wall')platforms.push({x:p.x+18,y:380,w:4,thickness:95,solid:true});
  if(condition==='out of reach')n.x=p.x+110;
  if(condition==='upper floor')n.y=p.y-76;
  if(condition==='hurt')p.hurt=.4;
  if(condition==='changed form')p.form='soldier';
  for(let i=0;i<40;i++)step({},platforms);
  assert.equal(n.hp,3,condition);assert.ok(!sounds.includes('punch'),condition);assert.ok(!p.fighterImpact,condition);
 }
});
test('normal guard takes a three-punch combination, upgrades still help, a weakened guard can fall immediately',()=>{
 for(const [hp,bonus] of [[3,1],[3,1.5],[.5,1]]){
  const {p,n,sounds,step}=ground(false);p.damageBonus=bonus;n.hp=hp;
  for(let i=0;i<27;i++)step({fire:true});
  assert.equal(n.hp,Math.max(0,hp-.85*bonus));assert.equal(sounds.filter(s=>s==='punch').length,1);
  for(let i=0;i<114;i++)step({fire:true});
  assert.equal(n.hp,0);
  if(hp===3&&bonus===1)assert.equal(sounds.filter(s=>s==='punch').length,3);
 }
});
test('mounted fighter hits a rider at extension, and misses at the old range or in the next lane',()=>{
 for(const [gap,lane,hit] of [[29,414,true],[169,414,false],[29,462,false]]){
  const s=Road.create({distance:100}),p={...Physics.createPlayer(),x:200,y:414,lane:414,form:'fighter',onMotorcycle:true};
  const e=Mission.create(Arsenal.createInventory()),n=Road.spawn(s,0);
  Object.assign(n,{x:200+gap,targetX:200+gap,y:lane,frozen:8});s.enemies.push(n);
  const advance=i=>{Forms.tick(p,dt);return Road.update(s,p,e,i,dt);};
  advance({fire:true});for(let i=0;i<16;i++)advance({});
  assert.equal(n.hp,3);const sounds=[];for(let i=0;i<34;i++)sounds.push(...advance({}).map(ev=>ev.sound));
  assert.equal(n.hp,hit?2.15:3);assert.equal(sounds.filter(v=>v==='punch').length,hit?1:0);
  assert.equal(s.ram,0);
 }
});
test('touching a rifle guard leaves the fighter free to strike, while a knife slash still hurts',()=>{
  const {p,n}=ground(false);
  n.x=p.x+15;
  assert.equal(Enemies.contact(n,p,[floor],Encounter.segmentHit),false);
  n.kind='knife';n.strikePending=true;n.facing=-1;
  assert.equal(Enemies.contact(n,p,[floor],Encounter.segmentHit),true);
  assert.equal(Enemies.contact(n,p,[floor],Encounter.segmentHit),false);
});
test('the rider can strike alongside an opponent without taking collision damage, but the same track is dangerous',()=>{
  for(const [offset,expectedHp] of [[-20,8],[0,7]]){
    const s=Road.create({distance:100}),p={...Physics.createPlayer(),form:'fighter',x:200,lane:414,onMotorcycle:true};
    const e=Mission.create(Arsenal.createInventory()),n=Road.spawn(s,0);
    Object.assign(n,{x:229,targetX:229,y:414+offset,shot:8});s.hitWait=0;s.enemies.push(n);
    for(let i=0;i<30;i++){Forms.tick(p,dt);Road.update(s,p,e,{fire:true},dt);}
    assert.equal(e.hp,expectedHp);
    if(offset)assert.equal(n.hp,2.15);
  }
});
