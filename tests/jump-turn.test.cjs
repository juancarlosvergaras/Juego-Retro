const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../physics'), A = require('../arsenal'), Z = require('../zombie-form');
const Road = require('../road-war'), Sea = require('../sea-war'), Combat = require('../mission-combat');
const forms = ['soldier','wolf','zombie','robot','fighter','tank','hero'];
const dt = 1/120, floor = {x:0,y:1000,w:960,kind:'ground'};
const player = form => Object.assign(P.createPlayer(),{x:240,y:1000,form,maxJumps:4,ground:floor,aim:{x:1,y:0}});
const step = (p,input={}) => P.step(p,input,dt,[floor]);
const frames = (n,run) => {for(let i=0;i<n;i++)run();};

test('only the second deliberate jump turns once; direction is latched and landing rearms every form',()=>{
 for(const form of forms)for(const dir of [-1,1]){
  const p=player(form);p.facing=dir;
  const press=()=>step(p,{jumpPressed:true,jumpHeld:true});
  press();assert.equal(p.jumpPresses,1);assert.ok(!p.jumpTurn);
  frames(12,()=>step(p));press();assert.equal(p.jumpTurn.dir,dir);
  const matrices=[];
  frames(44,()=>{P.jumpTurn.apply({transform(...m){matrices.push(m);}},p);p.facing=-dir;step(p);});
  assert.ok(matrices.length>=40);assert.ok(!p.jumpTurn);
  let angle=0;
  for(const [a,b] of matrices){let next=Math.atan2(b,a);while(dir*(next-angle)<-.000001)next+=dir*2*Math.PI;assert.ok(Math.abs(next-angle)<.25);angle=next;}
  assert.ok(dir*angle>6.1&&dir*angle<=2*Math.PI);
  press();assert.equal(p.jumps,3);assert.ok(!p.jumpTurn);
  frames(225,()=>step(p));assert.ok(p.grounded);assert.equal(p.jumpPresses,0);
  press();assert.ok(!p.jumpTurn);
 }
});
test('walking off an edge, dropping through a deck or hovering does not spend a manual jump',()=>{
 const p=player('soldier');p.y=820;p.ground=null;p.grounded=false;p.coyote=0;
 step(p,{jumpPressed:true});assert.equal(p.jumps,2);assert.ok(!p.jumpTurn);
 step(p,{jumpPressed:true});assert.ok(p.jumpTurn);
 step(p,{jetpackPressed:true});assert.ok(p.jetpack);assert.ok(!p.jumpTurn);
 const q=player('soldier'),deck={x:100,y:800,w:250,kind:'deck'};q.ground=deck;q.y=800;
 P.step(q,{down:true,jumpPressed:true},dt,[floor,deck]);
 P.step(q,{jumpPressed:true},dt,[floor,deck]);assert.ok(!q.jumpTurn);
});
test('road and captain jumps use the same turn; ramp boosts and swimming do not trigger it',()=>{
 for(const form of forms){
  const p=player(form),e=Combat.create(A.createInventory()),s=Road.create({distance:80});
  p.lane=414;p.onMotorcycle=true;s.obstacles=[];
  const road=(jumpPressed=false)=>Road.update(s,p,e,{jumpPressed},dt);
  road(true);frames(9,()=>road());assert.ok(!p.jumpTurn);road(true);assert.ok(p.jumpTurn);road(true);assert.ok(!p.jumpTurn);
  frames(150,()=>road());assert.ok(p.grounded);assert.equal(p.jumpPresses,0);
  s.obstacles=[{type:'ramp',distance:s.distance+(p.x-220)/5,lane:414}];road();assert.ok(s.jump>0);road(true);assert.ok(!p.jumpTurn);
  const q=player(form),sea=Sea.create({started:true});
  Sea.update(sea,q,e,{jumpPressed:true},dt);Sea.update(sea,q,e,{jumpPressed:true},dt);assert.ok(!q.jumpTurn);
  Sea.enter(sea,q);Sea.update(sea,q,e,{jumpPressed:true},dt);assert.ok(!q.jumpTurn);
  Sea.update(sea,q,e,{jumpPressed:true},dt);assert.ok(q.jumpTurn);
 }
});
test('muzzles, eyes and palm use the same rotating pivot as the body, preserving aim and existing bullets',()=>{
 for(const form of ['soldier','robot','hero','tank','zombie']){
  const p=player(form);p.grounded=false;p.jumpTurn={age:.11,dir:-1};
  const flat={...p,jumpTurn:null},matrix=[];P.jumpTurn.apply({transform(...m){matrix.push(...m);}},p);
  const [a,b,c,d,e,f]=matrix;
  function compare(rot,base){assert.ok(Math.abs(rot.x-(a*base.x+c*base.y+e))<1e-7);assert.ok(Math.abs(rot.y-(b*base.x+d*base.y+f))<1e-7);}
  if(form==='zombie'){compare(Z.castOrigin(p),Z.castOrigin(flat));continue;}
  const first=A.fire(A.createInventory(),flat).bullets,second=A.fire(A.createInventory(),p).bullets;
  second.forEach((bullet,i)=>{compare(bullet,first[i]);assert.equal(bullet.vx,first[i].vx);assert.equal(bullet.vy,first[i].vy);});
 }
});
