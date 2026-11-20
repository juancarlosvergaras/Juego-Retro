const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('../soldier-animation'),E=require('../encounter'),P=require('../physics');
test('knife and axe have anticipation, contact, recovery and an integrated idle pose',()=>{
 const p={grounded:true,vx:0,vy:0,facing:1,anim:0};
 for(const slot of [1,2]){
  const e={inventory:{selected:slot},weaponAction:{slot,age:0,duration:.55}};
  for(const [age,frame] of [[0,1],[.2,2],[.3,3],[.5,4],[.6,5],[.8,6],[.95,7],[1,0]]){
   e.weaponAction.age=age*.55;const pose=S.pose(p,{},e);
   assert.equal(pose.sheet,'melee');assert.equal(pose.row,slot-1);assert.equal(pose.frame,frame);assert.equal(pose.armed,false);
  }
  e.weaponAction.age=.2;assert.equal(S.pose({...p,grounded:false}, {},e).sheet,'melee');
  assert.notEqual(S.pose({...p,ladder:{}},{},e).sheet,'melee');
 }
});
test('a melee attack damages once at contact, not while preparing, on either side',()=>{
 for(const slot of [1,2])for(const facing of [-1,1]){
  const e=E.createEncounter(),p=P.createPlayer();e.enemies=[];e.inventory.selected=slot;p.facing=facing;p.rateBonus=2;
  Object.assign(e.boss,{x:p.x+20*facing,y:p.y,hp:18,maxHp:18,frozen:10});
  E.updateEncounter(e,p,{fire:true},0,P.createPlatforms());assert.equal(e.boss.hp,18);
  const duration=e.weaponAction.duration;
  E.updateEncounter(e,p,{},duration*.27,P.createPlatforms());assert.equal(e.boss.hp,18);
  E.updateEncounter(e,p,{},duration*.02,P.createPlatforms());assert.equal(e.boss.hp,slot===1?16:14);
  const hp=e.boss.hp;E.updateEncounter(e,p,{},duration,P.createPlatforms());assert.equal(e.boss.hp,hp);
 }
});
test('switching weapons during the wind-up cancels its pending hit',()=>{
 const e=E.createEncounter(),p=P.createPlayer();e.enemies=[];e.inventory.selected=1;
 Object.assign(e.boss,{x:p.x+20,y:p.y,hp:18,maxHp:18,frozen:10});
 E.updateEncounter(e,p,{fire:true},0);e.inventory.selected=3;E.updateEncounter(e,p,{},.2);assert.equal(e.boss.hp,18);
});
test('jetpack keeps integrated blade hands and the same airborne legs through idle, swing and recovery',()=>{
 for(const slot of [1,2])for(const facing of [-1,1])for(const boost of [false,true]){
  const p={x:0,y:0,grounded:false,jetpack:true,jetBoost:boost,form:'soldier',facing,vx:facing*(boost?280:160),anim:1},e={inventory:{selected:slot}};
  const idle=S.pose(p,{},e);assert.equal(idle.sheet,'melee');assert.equal(idle.armed,false);const legs=S.gait(p);assert.ok(legs.flight);
  for(const age of [0,.1,.25,.4,.54,.8]){e.weaponAction={slot,age,duration:.55};const pose=S.pose(p,{},e);assert.equal(pose.sheet,'melee');assert.equal(pose.armed,false);assert.deepEqual(S.gait(p),legs);}
  for(const gun of [3,4,5,6,7,8,9]){e.inventory.selected=gun;p.aim={x:facing,y:-1};assert.equal(S.pose(p,{},e).armed,true);assert.deepEqual(S.gait(p),legs);}
  p.jetpack=false;assert.equal(S.gait(p),null);
 }
});
