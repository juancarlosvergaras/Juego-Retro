const test=require('node:test'),assert=require('node:assert/strict');
const Z=require('../zombie-form'),S=require('../storm-zombie'),P=require('../physics'),E=require('../encounter'),N=require('../enemies'),M=require('../mission-combat'),V=require('../powers'),Progress=require('../progression'),D=require('../difficulty');
const floor={x:0,y:100,w:729,kind:'ground',thickness:12};
function setup(){const p=Object.assign(P.createPlayer(),{x:120,y:100,form:'zombie',h:68,grounded:true,ground:floor,zombieUnlocked:true,aim:{x:1,y:0}}),e=M.create({selected:3,owned:[1,3],ammo:{3:0}});return{p,e};}

test('zombie ignores high falls in both missions while soldier still takes landing damage',()=>{
 for(const mission of [1,2])for(const form of ['soldier','zombie','wolf']){
  const p=Object.assign(P.createPlayer(),{form,fallDamage:4,shield:3}),e=mission===1?E.createEncounter():M.create();
  e.boss.hp=0;e.finalBoss.hp=0;e.enemies=[];const hp=e.hp;
  if(mission===1)E.updateEncounter(e,p,{},1/120,[]);else M.update(e,p,{},1/120,[],V.create(),Progress.fresh());
  assert.equal(e.hp,form==='soldier'?hp-4:hp);assert.equal(p.fallDamage,0);assert.equal(p.shield,3);if(form!=='soldier')assert.ok(!p.hurt);
 }
});
test('three forms cycle with five-second cooldown and preserve health and inventory',()=>{
 const {p,e}=setup();p.form='soldier';e.hp=3.5;const inventory=e.inventory;
 assert.ok(Z.change(e,p));assert.equal(p.form,'wolf');assert.equal(p.formCooldown,5);p.transform=0;
 assert.equal(Z.change(e,p),false);Z.tick(p,4.9);assert.equal(Z.change(e,p),false);Z.tick(p,.11);assert.ok(Z.change(e,p));assert.equal(p.form,'zombie');
 assert.equal(e.hp,3.5);assert.equal(e.inventory,inventory);p.transform=0;Z.tick(p,5);assert.ok(Z.change(e,p,'soldier'));assert.equal(e.hp,3.5);
 const locked=setup();locked.p.zombieUnlocked=false;assert.equal(Z.change(locked.e,locked.p,'zombie'),false);
});
test('zombie resists twice as much damage and burrowing blocks hits and falls without spending shield',()=>{
 const {p,e}=setup();E.hurtPlayer(e,p,0,false,2);assert.equal(e.hp,7);e.invincible=0;p.hurt=0;p.shield=3;
 P.step(p,{down:true},1/120,[floor]);assert.ok(p.burrow);E.hurtPlayer(e,p,0,true,4);p.fallDamage=5;E.applyFallDamage(e,p);assert.equal(e.hp,7);assert.equal(p.shield,3);
});
test('burrow lasts three seconds, moves underground and needs a released down key to repeat',()=>{
 const {p}=setup();for(let i=0;i<359;i++)P.step(p,{down:true,right:true},1/120,[floor]);assert.ok(p.burrow);assert.ok(p.x>500);assert.equal(p.y,100);
 P.step(p,{down:true},2/120,[floor]);assert.equal(p.burrow,null);for(let i=0;i<60;i++)P.step(p,{down:true},1/120,[floor]);assert.equal(p.burrow,null);
 P.step(p,{},1/120,[floor]);P.step(p,{down:true},1/120,[floor]);assert.ok(p.burrow);
});
test('platform crouch never tunnels or grants immunity and zombie cannot activate jetpack',()=>{
 for(const kind of ['deck','ledge','barricade','wreck','bridge']){const {p,e}=setup(),platform={...floor,y:50,kind};Object.assign(p,{y:50,ground:platform});const mode=P.step(p,{down:true},1/120,[floor,platform]);assert.ok(mode.crouching);assert.ok(!p.burrow);E.hurtPlayer(e,p,0);assert.equal(e.hp,7.5);}
 const {p}=setup();P.step(p,{jetpackPressed:true},1/120,[floor]);assert.equal(p.jetpack,false);
});
test('rays are unlimited, aimed, stopped by solid geometry, and do not spend gun ammunition',()=>{
 const {p,e}=setup(),n=N.createSoldier({x:260,y:100},0);n.hp=n.maxHp=20;e.enemies=[n];
 for(let i=0;i<120;i++)Z.combat(e,p,{fire:true},1/120,[floor]);assert.ok(Math.abs(n.hp-17.6)<1e-7);assert.equal(e.inventory.ammo[3],0);assert.ok(e.zombieEffects.length<4);
 n.hp=20;p.rayWait=0;Z.combat(e,p,{fire:true},.01,[floor,{x:190,y:0,w:20,thickness:100}]);assert.equal(n.hp,20);
 p.burrow={age:1};p.rayWait=0;Z.combat(e,p,{fire:true,kick:true},.01,[]);assert.equal(e.playerPlasma.length,0);assert.equal(n.hp,20);
});
test('plasma sticks, slows enemy simulation, damages over time and expires',()=>{
 const {p,e}=setup(),n=N.createSoldier({x:240,y:100},0);n.hp=n.maxHp=20;e.enemies=[n];Z.combat(e,p,{kick:true},.01,[floor]);
 for(let i=0;i<40;i++)Z.combat(e,p,{},1/120,[floor]);assert.ok(n.sticky>3);assert.equal(n.hp,19);
 const normal=S.create(),slow=S.create();normal.active=slow.active=true;normal.x=slow.x=16800;slow.sticky=4;
 N.update([normal],{x:16400,y:620},.1,[],[],E.segmentHit);N.update([slow],{x:16400,y:620},.1,[],[],E.segmentHit);assert.ok(normal.x<slow.x);
 for(let i=0;i<500;i++)Z.combat(e,p,{},1/120,[floor]);assert.equal(n.sticky,0);assert.ok(Math.abs(n.hp-16.6)<.001);const hp=n.hp;Z.combat(e,p,{},1,[floor]);assert.equal(n.hp,hp);
});
test('both combat runtimes refuse zombie weapons while allowing native attacks',()=>{
 for(const mission of [1,2]){const {p,e}=setup();e.inventory.ammo[3]=36;e.boss={hp:0,active:false};e.finalBoss={hp:0,active:false};
 if(mission===1){const one=E.createEncounter();one.won=true;one.enemies=[];one.boss.hp=0;one.finalBoss.hp=0;E.updateEncounter(one,p,{fire:true},.02,[floor]);assert.equal(one.inventory.ammo[3],36);assert.ok(one.zombieEffects.some(f=>f.kind==='ray'));}
 else{M.update(e,p,{fire:true},.02,[floor],V.create(),Progress.fresh());assert.equal(e.inventory.ammo[3],36);assert.ok(e.zombieEffects.some(f=>f.kind==='ray'));}}
});
test('zombie can use purchased powers except flame, and none can fire underground',()=>{
 const {p,e}=setup(),profile=Progress.fresh();profile.owned=['flame','heal','wave'];profile.equipped='flame';const powers=V.create();
 assert.match(V.update(powers,e,p,profile,true,.02,[floor]),/solo soldado/);assert.equal(powers.flame,0);
 profile.equipped='heal';e.hp=3;V.update(powers,e,p,profile,true,.02,[floor]);assert.equal(e.hp,6);
 profile.equipped='wave';p.burrow={age:1};V.update(powers,e,p,profile,true,.02,[floor]);assert.ok(!powers.cooldowns.wave);
});
test('storm mini boss is slightly taller than wolf, telegraphs and cycles three attacks, persists health',()=>{
 const n=S.create(),p={x:16500,y:620,h:46};assert.ok(n.h>64&&n.h<100);const bullets=[],kinds=new Set();
 for(let i=0;i<1400;i++){S.update(n,p,1/120,bullets);kinds.add(n.phase);}assert.deepEqual([...kinds].sort(),['idle','plasma','ray','ring']);assert.ok(bullets.some(b=>b.stormRay));assert.ok(bullets.some(b=>b.zombiePlasma));assert.ok(bullets.some(b=>b.y===610&&b.vx<0));
 const saved=S.create({x:n.x,hp:12});assert.equal(saved.hp,12);const e=E.createEncounter();e.enemies=[saved];D.apply(e,'fuerte');assert.equal(saved.maxHp,57);assert.ok(Math.abs(saved.hp/saved.maxHp-12/42)<1e-9);
 N.damage(saved,100);assert.equal(saved.hp,0);S.update(saved,p,2,bullets);assert.equal(saved.death,0);
});
test('zombie unlock survives progression storage and applies in any mission',()=>{
 const data=new Map(),store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},profile=Progress.fresh();profile.zombieUnlocked=true;Progress.save(profile,store);const loaded=Progress.load(store),p=P.createPlayer(),e=E.createEncounter();Progress.apply(loaded,p,e,true);assert.ok(p.zombieUnlocked);assert.deepEqual(Z.forms(p,false),['soldier','wolf','zombie']);
});
test('native lightning preserves the first mission final boss mutation',()=>{
 const {p}=setup(),e=E.createEncounter();e.enemies=[];e.boss.hp=0;e.won=true;
 Object.assign(e.finalBoss,{x:240,y:100,hp:1,active:true,stage:1,phase:'chase'});
 Z.combat(e,p,{fire:true},.01,[]);
 assert.equal(e.finalBoss.stage,2);assert.equal(e.finalBoss.phase,'mutate');assert.ok(e.finalBoss.hp>0);
});


test('burrow emerges on clear ground rather than inside a solid car or on its roof',()=>{
 const {p}=setup(),car={x:180,y:65,w:160,thickness:35,solid:true,kind:'wreck'};
 P.step(p,{down:true},.01,[floor,car]);p.x=240;p.burrow.age=2.99;
 P.step(p,{},.02,[floor,car]);assert.equal(p.burrow,null);
 assert.ok(p.x+p.w/2<=car.x||p.x-p.w/2>=car.x+car.w);assert.equal(p.y,100);
 const x=p.x;P.step(p,{},.01,[floor,car]);assert.equal(p.y,100);assert.equal(p.x,x);
});
test('zombie transformations blend from and to the actual soldier or wolf portrait',()=>{
 const soldier={},wolf={},calls=[],c={save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},stroke(){},drawImage(...args){calls.push({image:args[0],alpha:this.globalAlpha});}};
 Z.setForms(soldier,[0,0,50,100],wolf,[0,0,70,100]);
 for(const [form,image]of [['soldier',soldier],['wolf',wolf]]){
  calls.length=0;Z.drawPlayer(c,{form:'zombie',transformFrom:form,transform:1.2,x:0,y:100,facing:1});assert.ok(calls.some(a=>a.image===image&&a.alpha===1));
  calls.length=0;Z.drawPlayer(c,{form,transformFrom:'zombie',transform:.001,x:0,y:100,facing:1});assert.ok(calls.some(a=>a.image===image&&a.alpha>.99));
  c.globalAlpha=.2;calls.length=0;
  Z.drawPlayer(c,{form:'zombie',transformFrom:form,transform:1.2,x:0,y:100,facing:1});
  assert.ok(calls.some(a=>a.image===image&&a.alpha===.2));c.globalAlpha=1;
 }
});
