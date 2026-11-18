const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../cemetery-bat'),N=require('../enemies'),E=require('../encounter');
const floor=[{x:0,y:620,w:18000,kind:'ground',thickness:36}];
const step=(n,p,seconds)=>{for(let t=0;t<seconds;t+=1/120)N.update([n],p,1/120,floor,[],E.segmentHit);};

test('cemetery and mausoleum bats die on one hit in every difficulty, without reviving saved defeats',()=>{
 const D=require('../difficulty'),K=require('../mausoleum-king');
 for(const level of D.levels){
  const bats=[...B.createAll(),...K.interiorEnemies().filter(n=>n.kind==='bat')];
  const e=E.createEncounter();e.enemies=bats;D.apply(e,level.id);
  for(const n of bats){assert.equal(n.hp,1);assert.equal(n.maxHp,1);N.damage(n,.25);assert.equal(n.hp,0);assert.ok(n.death>0);}
  D.apply(e,'extrema');assert.ok(bats.every(n=>n.hp===0));
 }
 const old=B.create();old.hp=5;old.maxHp=5;N.damage(old,1);assert.equal(old.hp,0);
});

test('one pistol bullet or one melee hit kills a bat in real mission combat',()=>{
 const C=require('../mission-combat'),P=require('../physics'),A=require('../arsenal'),V=require('../powers'),U=require('../progression');
 for(const slot of [1,3]){
  const p=Object.assign(P.createPlayer(),{x:300,y:620,form:'soldier',aim:{x:1,y:0}}),n=B.create(),e=C.create(A.createInventory());
  Object.assign(n,{x:340,y:600,frozen:10});e.enemies=[n];e.inventory={selected:slot,owned:[slot],ammo:{3:1}};
  const power=V.create(),profile=U.fresh();C.update(e,p,{fire:true},1/120,floor,power,profile);
  for(let i=0;i<100;i++)C.update(e,p,{},1/120,floor,power,profile);
  assert.equal(n.hp,0,'slot '+slot);if(slot===3)assert.equal(e.inventory.ammo[3],0);
 }
});
test('five grounded cemetery trees and one persistent bat attached to first branch',()=>{
 const trees=B.trees(),n=B.create();assert.equal(trees.length,5);assert.equal(new Set(trees.map(t=>t.x)).size,5);for(const t of trees){assert.equal(t.y,620);assert.ok(t.x>9700&&t.x<17000);}assert.ok(n.x>trees[0].x);assert.ok(n.y<600);assert.equal(B.create([200]).hp,0);
});

test('six bats cover all five trees with separate branches, stable IDs and independent saved defeats',()=>{
 const bats=B.createAll([200,202,205]),trees=B.trees();assert.equal(bats.length,6);assert.equal(new Set(bats.map(n=>n.treeIndex)).size,5);
 assert.deepEqual(bats.map(n=>n.id),[200,201,202,203,204,205]);assert.deepEqual(bats.filter(n=>n.hp===0).map(n=>n.id),[200,202,205]);assert.deepEqual(bats[0],B.create([200]));
 for(const n of bats){const t=trees[n.treeIndex];assert.ok(Math.abs(n.x-t.x)<256*t.scale);assert.ok(n.y<600&&n.y>420);assert.deepEqual(n.home,{x:n.x,y:n.y});}
 assert.ok(Math.hypot(bats[2].x-bats[5].x,bats[2].y-bats[5].y)>70);
 const alive=B.createAll();for(const n of alive){const target={x:n.home.x+80,y:620,h:46};step(n,target,1.4);assert.notEqual(n.phase,'sleep');step(n,{...target,x:8000},8);assert.equal(n.phase,'sleep');assert.equal(n.x,n.home.x);assert.equal(n.y,n.home.y);}
});
test('bat sleeps, warns nearby player, dives continuously, strikes once and recovers',()=>{
 const n=B.create(),p={x:n.x+100,y:620,h:46};step(n,{...p,x:9000},2);assert.equal(n.phase,'sleep');const home={x:n.x,y:n.y};step(n,p,.5);assert.equal(n.phase,'wake');assert.equal(n.x,home.x);step(n,p,.7);assert.equal(n.phase,'dive');
 let contacts=0;for(let i=0;i<100;i++){const x=n.x,y=n.y;step(n,p,1/120);assert.ok(Math.hypot(n.x-x,n.y-y)<3);if(N.contact(n,p,floor,E.segmentHit))contacts++;}assert.equal(contacts,1);assert.equal(N.contact(n,p,floor,E.segmentHit),false);
});
test('bat returns to branch when player leaves, freeze prevents attack, death falls to road',()=>{
 const n=B.create(),p={x:n.x+80,y:620,h:46};step(n,p,1.4);n.frozen=1;const pos=[n.x,n.y];step(n,p,.5);assert.deepEqual([n.x,n.y],pos);assert.equal(N.contact(n,p,floor,E.segmentHit),false);step(n,{...p,x:16000},8);assert.equal(n.phase,'sleep');assert.equal(n.x,n.home.x);assert.equal(n.y,n.home.y);
 N.damage(n,3);step(n,p,2);assert.equal(n.hp,0);assert.equal(n.y,620);assert.equal(n.death,0);
});
test('real mission combat applies one bat hit and the shield absorbs it',()=>{
 const C=require('../mission-combat'),P=require('../physics'),A=require('../arsenal'),V=require('../powers'),U=require('../progression');
 for(const shield of [0,1]){const e=C.create(A.createInventory()),n=B.create(),p=Object.assign(P.createPlayer(),{x:n.x,y:620,shield,form:'soldier'});Object.assign(n,{phase:'dive',attackReady:true,y:598,vx:0,vy:0});e.enemies=[n];const powers=V.create(),profile=U.fresh();
 C.update(e,p,{},1/120,floor,powers,profile);assert.equal(e.hp,shield?8:7);assert.equal(p.shield,0);assert.equal(n.phase,'recover');
 for(let i=0;i<60;i++)C.update(e,p,{},1/120,floor,powers,profile);assert.equal(e.hp,shield?8:7);
 }
});
