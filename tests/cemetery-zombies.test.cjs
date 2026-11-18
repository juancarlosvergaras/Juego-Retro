const {test}=require('node:test'),assert=require('node:assert/strict');
const Z=require('../cemetery-zombies'),N=require('../enemies'),P=require('../physics'),L=require('../level-two'),C=require('../mission-combat'),E=require('../encounter'),A=require('../arsenal'),V=require('../powers'),U=require('../progression');
P.WORLD.width=18000;
const floor=[{x:0,y:620,w:18000,kind:'ground',thickness:36}],geo=L.geometry();
test('twenty varied cemetery zombies have stable save IDs and emerge outside solid cover',()=>{
 const zombies=Z.create([101,117],geo.platforms);assert.equal(zombies.length,20);assert.equal(new Set(zombies.map(n=>n.id)).size,20);assert.equal(new Set(zombies.map(n=>n.spawnType)).size,3);
 assert.deepEqual(zombies.filter(n=>n.hp===0).map(n=>n.id),[101,117]);
 for(const n of zombies){assert.ok(n.x>=9700&&n.x<L.ENTRANCE);assert.equal(n.y,620);assert.ok(!geo.platforms.some(s=>s.solid&&n.x>s.x-25&&n.x<s.x+s.w+25));assert.ok(zombies.every(other=>other===n||Math.abs(n.x-other.x)>200));}
 assert.equal(C.cityEnemies().length,26);
});
test('grave entrances do not cover randomized loot and remain stable after saving',()=>{
 const Loot=require('../mission-two-loot');
 for(let seed=0;seed<150;seed++){const loot=Loot.create(geo.platforms,seed),items=[...loot.weapons,...loot.stars,...loot.medkits,...loot.fuelTanks],zombies=Z.create([],geo.platforms,items);
  for(const n of zombies.filter(n=>n.spawnType==='grave'))assert.ok(items.every(item=>Math.abs(n.homeX-item.x)>75));
  assert.deepEqual(Z.create([103],geo.platforms,items).map(n=>n.x),zombies.map(n=>n.x));
 }
});
test('each emergence wakes near the player, plays six frames and warns before plasma',()=>{
 for(const type of ['earth','sleep','grave']){
  const n=Z.create().find(n=>n.spawnType===type),p={x:n.x-280,y:620,vx:0,h:46},shots=[];
  N.update([n],{...p,x:n.x-900},1,floor,shots,E.segmentHit);assert.equal(n.phase,'dormant');
  const frames=new Set();for(let i=0;i<215;i++){N.update([n],p,1/120,floor,shots,E.segmentHit);frames.add(Z.pose(n).frame);assert.equal(shots.length,0);}
  assert.equal(frames.size,6);for(let i=0;i<120;i++)N.update([n],p,1/120,floor,shots,E.segmentHit);assert.equal(shots.length,0);
  for(let i=0;i<180;i++)N.update([n],p,1/120,floor,shots,E.segmentHit);assert.ok(shots.length>=1);assert.ok(shots.every(b=>b.zombiePlasma&&b.vx<0&&b.damage===1));
 }
});
test('zombie walking uses collision and stops at barricades while attacks reach through',()=>{
 const n=Z.create()[0];Object.assign(n,{x:1000,phase:'active',grounded:true,shot:.2});const p={x:1350,y:620,h:46},shots=[],platforms=[...floor,{x:1080,y:510,w:130,thickness:110,kind:'barricade',solid:true}];
 for(let i=0;i<1200;i++)N.update([n],p,1/120,platforms,shots,E.segmentHit);
 assert.ok(n.x>1000&&n.x<=1080-n.w/2+.1);assert.ok(n.runCycle>0);assert.ok(shots.length>0);assert.ok(!N.blocksShot(shots[0],platforms[1]));
});
test('buried zombies cannot take damage or contact damage; freeze and death stop throwing',()=>{
 const n=Z.create()[0],p={x:n.x,y:n.y},shots=[];N.damage(n,10);assert.equal(n.hp,3);assert.equal(N.contact(n,p,floor,E.segmentHit),false);
 n.phase='active';n.frozen=2;for(let i=0;i<120;i++)N.update([n],p,1/120,floor,shots,E.segmentHit);assert.equal(shots.length,0);
 N.damage(n,3);assert.equal(n.hp,0);assert.equal(n.death,1.3);for(let i=0;i<240;i++)N.update([n],p,1/120,floor,shots,E.segmentHit);assert.equal(shots.length,0);assert.equal(N.contact(n,p,floor,E.segmentHit),false);
});
test('plasma crosses decks and barricades, hits once with bullet damage and respects shields',()=>{
 for(const shield of [0,1]){
  const e=C.create(A.createInventory()),p=Object.assign(P.createPlayer(),{x:550,y:620,shield,form:'soldier'}),powers=V.create(),profile=U.fresh();
  const platforms=[...floor,{x:330,y:460,w:80,thickness:160,kind:'barricade',solid:true},{x:240,y:400,w:100,thickness:15,kind:'deck'}];
  e.bullets=[{x:250,y:340,vx:190,vy:160,life:4.3,age:0,enemy:true,zombiePlasma:true,damage:1}];const hp=e.hp;
  let splashes=0;for(let i=0;i<250;i++){C.update(e,p,{},1/120,platforms,powers,profile);splashes=Math.max(splashes,e.explosions.filter(b=>b.kind==='plasma').length);}
  assert.equal(e.hp,hp-(shield?0:1));assert.equal(p.shield,0);assert.equal(e.bullets.length,0);assert.equal(splashes,1);
 }
});
test('green splashes stop at ground, expire, and never apply explosion damage',()=>{
 const e=C.create(A.createInventory()),p=Object.assign(P.createPlayer(),{x:1010,y:620,form:'soldier'}),powers=V.create(),profile=U.fresh(),hp=e.hp;
 e.bullets=[{x:980,y:610,vx:0,vy:190,life:4.3,age:0,enemy:true,zombiePlasma:true,damage:1}];
 for(let i=0;i<10;i++)C.update(e,p,{},1/120,floor,powers,profile);
 assert.equal(e.bullets.length,0);assert.equal(e.explosions[0].kind,'plasma');assert.equal(e.explosions[0].y,620);assert.equal(e.hp,hp);
 for(let i=0;i<180;i++)C.update(e,p,{},1/120,floor,powers,profile);assert.equal(e.explosions.length,0);assert.equal(e.hp,hp);
});
test('zombie roles differ: the runner closes in and lunges while the spitter keeps its distance',()=>{
 const run=variant=>{const n=Z.create().find(n=>n.variant===variant);Object.assign(n,{x:1000,phase:'active',grounded:true,shot:99});const p={x:1300,y:620,h:46};let lunged=false,minGap=Infinity;for(let i=0;i<1200;i++){N.update([n],p,1/120,floor,[],E.segmentHit);lunged=lunged||n.lunge!==null;minGap=Math.min(minGap,Math.abs(p.x-n.x));}return{lunged,minGap,n};};
 const spitter=run(0),runner=run(1),lurker=run(2);
 assert.equal(spitter.lunged,false);assert.ok(spitter.minGap>=200&&spitter.minGap<215);
 assert.equal(runner.lunged,true);assert.ok(runner.minGap<24,'the lunge reaches biting range: '+runner.minGap);
 assert.ok(lurker.minGap>=105&&lurker.minGap<120);assert.equal(lurker.lunged,false);
 assert.equal(Z.role(runner.n).name,'runner');
});
test('a lunge telegraphs before it lands and a hit interrupts it with a stagger',()=>{
 const n=Z.create().find(n=>n.variant===1);Object.assign(n,{x:1000,phase:'active',grounded:true,shot:99});const p={x:1060,y:620,h:46};
 N.update([n],p,1/120,floor,[],E.segmentHit);assert.equal(n.lunge,0);const start=n.x;
 for(let i=0;i<30;i++)N.update([n],p,1/120,floor,[],E.segmentHit);assert.ok(Math.abs(n.x-start)<.01,'no movement during the wind-up');assert.equal(Z.pose(n).row,4);assert.ok(Z.motion(n).lean<0,'rears back first');
 for(let i=0;i<20;i++)N.update([n],p,1/120,floor,[],E.segmentHit);assert.ok(n.x>start+10);assert.ok(Z.motion(n).lean>.2);
 N.damage(n,1);N.update([n],p,1/120,floor,[],E.segmentHit);assert.equal(n.lunge,null);assert.ok(n.recoil>0);const hitX=n.x;
 for(let i=0;i<20;i++)N.update([n],p,1/120,floor,[],E.segmentHit);assert.ok(n.x<hitX,'shoved away from the player');
 for(let i=0;i<300;i++)N.update([n],{...p,x:n.x+400},1/120,floor,[],E.segmentHit);assert.equal(n.speedBonus,n.baseSpeed,'temporary speed changes never stick');
});
test('idle zombies sway and breathe, walkers bob with their stride, and dormant ones stay still',()=>{
 const n=Z.create()[0];assert.deepEqual(Z.motion(n),{lean:0,bob:0,stretch:1,shake:0});
 n.phase='active';const leans=new Set();for(let i=0;i<40;i++){n.anim=i*.2;const m=Z.motion(n);leans.add(m.lean.toFixed(3));assert.ok(Math.abs(m.lean)<=.031&&Math.abs(m.stretch-1)<=.015);}assert.ok(leans.size>10);
 n.vx=40;n.runCycle=.25;assert.ok(Z.motion(n).bob<-1);n.runCycle=.5;assert.ok(Math.abs(Z.motion(n).bob)<.01);
 n.phase='waking';n.wakeAge=.1;assert.notEqual(Z.motion(n).shake,0);
});
