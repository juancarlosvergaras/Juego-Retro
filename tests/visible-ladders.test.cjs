const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../physics'),E=require('../encounter');
test('final access stays hidden and unusable until white wolf defeat',()=>{
 const ls=P.createLadders(),e=E.createEncounter(),p=P.createPlayer(),final=ls.find(l=>l.finalAccess);
 for(const active of [false,true]){
  e.boss.active=active;e.boss.hp=1;
  const available=P.availableLadders(ls,e);
  assert.ok(!available.some(l=>l.finalAccess));
  assert.equal(available.length,ls.length-1);
  Object.assign(p,{x:final.x,y:final.bottom,grounded:true,ladder:null});
  P.step(p,{up:true},1/120,P.createPlatforms(),{ladders:available});
  assert.equal(p.ladder,null);
 }
 e.boss.hp=0;E.transformWolf(e,p);
 assert.ok(P.availableLadders(ls,e).some(l=>l.finalAccess));
 Object.assign(p,{x:final.x,y:final.bottom,grounded:true,ladder:null});
 P.step(p,{up:true},1/120,P.createPlatforms(),{ladders:P.availableLadders(ls,e)});
 assert.equal(p.ladder,final);
});
test('living white wolf cannot climb the locked final ladder after player flies upstairs',()=>{
 const e=E.createEncounter(),p=P.createPlayer(),ps=P.createPlatforms();e.enemies=[];
 Object.assign(e.boss,{x:160,y:235,active:true,phase:'move',grounded:true});
 Object.assign(p,{x:300,y:-140});
 for(let i=0;i<600;i++){
  E.updateEncounter(e,p,{},1/120,ps);
  assert.ok(!e.boss.ladder?.finalAccess);
  assert.ok(!e.boss.traverse?.ladder?.finalAccess);
 }
 assert.notEqual(e.boss.y,-140);
});
