const {test}=require('node:test'),assert=require('node:assert/strict');
const N=require('../enemies.js'),E=require('../encounter.js'),P=require('../physics.js');
const floor=[{x:0,y:1000,w:729,kind:'deck',thickness:16}];
test('los fusileros conservan espacio para disparar en ambos sentidos y junto al borde',()=>{
  for(const facing of [-1,1]){
    for(const crowded of [false,true]){
      const deck={x:90,w:550,y:1000,kind:'deck'};
      const mirror=x=>facing===1?x:2*deck.x+deck.w-x;
      const p=Object.assign(P.createPlayer(),{x:mirror(crowded?235:545),y:deck.y});
      const start=crowded?[100,100,100]:[160,235,310];
      const squad=start.map((x,id)=>N.createSoldier({x:mirror(x),y:deck.y,facing},id));
      const bullets=[];
      for(let i=0;i<720;i++){
        N.update(squad,p,1/120,[deck],bullets,()=>null);
        assert.ok(squad.every(n=>n.grounded&&n.x>=deck.x&&n.x<=deck.x+deck.w));
      }
      const positions=squad.map(n=>n.x).sort((a,b)=>a-b);
      assert.ok(positions[1]-positions[0]>=35&&positions[2]-positions[1]>=35);
      assert.ok(squad.every(n=>n.alert&&n.aimReady&&n.vx===0));
      bullets.length=0;
      for(let i=0;i<240;i++)N.update(squad,p,1/120,[deck],bullets,()=>null);
      assert.deepEqual(new Set(bullets.map(b=>b.x)),new Set(positions.map(x=>x+facing*20)));
    }
  }
});
function setup(){const e=E.createEncounter(),p=P.createPlayer(),n=e.enemies[0];e.enemies=[n];Object.assign(n,{x:300,y:1000,facing:1,shot:0,memory:0,alert:false});Object.assign(p,{x:220,y:1000,vx:0,grounded:true});return {e,p,n};}
test('a soldier idle for a long time waits a full second after spotting the player',()=>{
 const {e,p,n}=setup(),bullets=[];
 for(let i=0;i<600;i++)N.update([n],p,1/120,floor,bullets,()=>null);
 assert.equal(n.alert,false);p.x=380;
 N.update([n],p,1/120,floor,bullets,()=>null);assert.equal(n.shot,1);assert.equal(bullets.length,0);
 for(let i=0;i<119;i++)N.update([n],p,1/120,floor,bullets,()=>null);
 assert.equal(bullets.length,0);
 for(let i=0;i<2;i++)N.update([n],p,1/120,floor,bullets,()=>null);
 assert.equal(bullets.length,1);
});
test('ongoing noise does not reset the reaction or the normal firing interval',()=>{
 const {p,n}=setup(),bullets=[];p.x=380;
 for(let i=0;i<360;i++)N.update([n],p,1/120,floor,bullets,()=>null,[{x:p.x,y:p.y,radius:430}]);
 assert.equal(bullets.length,2);
});
test('after forgetting a target a new alert receives a fresh reaction second',()=>{
 const {p,n}=setup(),bullets=[];p.x=380;N.update([n],p,.01,floor,bullets,()=>null);
 p.x=700;p.y=2000;
 for(let i=0;i<610;i++)N.update([n],p,1/120,floor,bullets,()=>null);
 assert.equal(n.alert,false);p.x=n.x+n.facing*60;p.y=n.y;
 N.update([n],p,.01,floor,bullets,()=>null);assert.equal(n.shot,1);assert.equal(bullets.length,0);
});
test('hovering jetpack alerts nearby soldiers behind the player without waking the white wolf',()=>{
 const {e,p,n}=setup();Object.assign(p,{jetpack:true,fuel:100,grounded:false,vx:0,vy:0});
 Object.assign(e.boss,{x:220,y:900,active:false});
 const far={...n,id:99,x:650};e.enemies.push(far);
 E.updateEncounter(e,p,{},1/120,floor);
 assert.equal(n.alert,true);assert.equal(n.awareness,'sound');assert.deepEqual(n.lastKnown,{x:p.x,y:p.y});
 assert.equal(n.shot,1);assert.equal(e.bullets.length,0);assert.equal(far.alert,false);assert.equal(e.boss.active,false);
});
test('jetpack sound crosses a nearby floor but requires an active fueled engine',()=>{
 for(const mode of ['active','off','empty','wolf']){
   const {e,p,n}=setup();Object.assign(p,{x:220,y:1100,grounded:false,jetpack:mode!=='off',fuel:mode==='empty'?0:100,form:mode==='wolf'?'wolf':'soldier'});
   E.updateEncounter(e,p,{},1/120,[...floor,{x:0,y:1100,w:729,kind:'deck',thickness:16}]);
   assert.equal(n.alert,mode==='active',mode);
 }
});
test('switching off the jet leaves only the remembered position, which then expires',()=>{
 const {p,n}=setup(),bullets=[];Object.assign(p,{jetpack:true,fuel:100,grounded:false,y:1100});
 N.update([n],p,.01,floor,bullets,()=>0);assert.equal(n.alert,true);
 p.jetpack=false;p.x=700;p.y=2000;
 N.update([n],p,.01,floor,bullets,()=>0);assert.deepEqual(n.lastKnown,{x:220,y:1100});
 for(let i=0;i<610;i++)N.update([n],p,1/120,floor,bullets,()=>0);
 assert.equal(n.alert,false);
});
