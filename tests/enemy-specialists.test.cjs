const {test}=require('node:test'),assert=require('node:assert/strict');
const N=require('../enemies'),P=require('../physics'),E=require('../encounter'),C=require('../mission-combat'),A=require('../arsenal'),V=require('../powers'),U=require('../progression'),R=require('../enemy-specialists');
const floor=[{x:0,y:620,w:18000,kind:'ground',thickness:36}];
function fixture(kind,x=500){
 const n=N.createSoldier({kind,x,y:620,facing:-1},0),p=Object.assign(P.createPlayer(),{x:300,y:620,form:'soldier'}),bullets=[];
 return{n,p,bullets,step(dt=1/120,platforms=floor){N.update([n],p,dt,platforms,bullets,E.segmentHit);}};
}
test('mission two mixes rifle, turret and knife soldiers without changing total or saved IDs',()=>{
 const ns=C.cityEnemies([5,7,14,16]);assert.equal(ns.length,26);
 assert.equal(ns.filter(n=>n.kind==='turret').length,5);assert.equal(ns.filter(n=>n.kind==='knife').length,4);
 assert.deepEqual(ns.filter(n=>n.hp===0).map(n=>n.id),[5,7,14,16]);
 assert.ok(ns.some(n=>n.kind==='turret'&&n.y<620));assert.ok(ns.some(n=>n.kind==='knife'&&n.y<620));
});
test('turret remains planted, warns for one second, fires five rounds and pauses to reload',()=>{
 const f=fixture('turret');for(let i=0;i<110;i++)f.step();assert.equal(f.bullets.length,0);
 for(let i=0;i<90;i++)f.step();assert.equal(f.bullets.length,5);assert.equal(f.n.x,500);assert.equal(f.n.y,620);
 assert.ok(f.bullets.every(b=>b.fromTurret&&b.vx<0));for(let i=0;i<150;i++)f.step();assert.equal(f.bullets.length,5);
 for(let i=0;i<110;i++)f.step();assert.ok(f.bullets.length>5);
});
test('turret respects walls, freeze and death',()=>{
 const f=fixture('turret'),walls=[...floor,{x:390,y:500,w:20,thickness:120}];for(let i=0;i<400;i++)f.step(1/120,walls);assert.equal(f.bullets.length,0);
 f.n.frozen=5;for(let i=0;i<300;i++)f.step();assert.equal(f.bullets.length,0);
 N.damage(f.n,10);for(let i=0;i<300;i++)f.step();assert.equal(f.bullets.length,0);
});
test('knife soldier runs, never shoots, and only damages on the telegraphed thrust',()=>{
 const f=fixture('knife');for(let i=0;i<45;i++)f.step();assert.ok(f.n.vx< -200);assert.ok(f.n.runCycle>0);
 let attacks=0,contacts=0;for(let i=0;i<400;i++){f.step();if(f.n.attackAge!==null&&f.n.attackAge<.24){attacks++;assert.equal(N.contact(f.n,f.p,floor,E.segmentHit),false);}
 if(N.contact(f.n,f.p,floor,E.segmentHit)){contacts++;assert.equal(N.contact(f.n,f.p,floor,E.segmentHit),false);}}
 assert.ok(attacks>0);assert.ok(contacts>=1&&contacts<=3);assert.equal(f.bullets.length,0);
});
test('knife thrust can be dodged, cannot cross floors, and is interrupted by damage',()=>{
 const f=fixture('knife',340);f.n.attackAge=.23;f.n.alert=true;f.n.memory=5;f.n.shot=1;
 f.p.x=230;f.step(.02);assert.equal(N.contact(f.n,f.p,floor,E.segmentHit),false);
 f.p.x=300;f.n.strikePending=true;assert.equal(N.contact(f.n,f.p,[...floor,{x:310,y:550,w:10,thickness:70}],E.segmentHit),false);
 f.n.attackAge=.1;N.damage(f.n,1);f.step();assert.equal(f.n.attackAge,null);assert.equal(f.n.strikePending,false);
});
test('knife uses normal shield protection and does not inflict contact damage during windup',()=>{
 const f=fixture('knife',335),e=C.create(A.createInventory()),powers=V.create(),profile=U.fresh();e.enemies=[f.n];f.p.shield=1;
 for(let i=0;i<100;i++)C.update(e,f.p,{},1/120,floor,powers,profile);assert.equal(e.hp,8);assert.equal(f.p.shield,1);
 for(let i=0;i<70;i++)C.update(e,f.p,{},1/120,floor,powers,profile);assert.equal(e.hp,8);assert.equal(f.p.shield,0);
});
test('sprite frames follow distance, attack windup, thrust, recovery and death',()=>{
 const n=N.createSoldier({kind:'knife'},0);n.vx=235;assert.deepEqual([0,.25,.5,.75].map(t=>{n.runCycle=t;return R.frame(n);}),[0,1,2,3]);
 assert.deepEqual([0,.24,.4].map(t=>{n.attackAge=t;return R.frame(n);}),[5,6,7]);n.hp=0;n.death=.7;assert.equal(R.frame(n),10);n.death=.3;assert.equal(R.frame(n),11);
});
