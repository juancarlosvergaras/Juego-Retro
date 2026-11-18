const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../cemetery-events.js'),P=require('../physics.js'),L=require('../level-two.js'),Z=require('../cemetery-zombies.js'),N=require('../enemies.js'),K=require('../checkpoints.js');
P.WORLD.width=18000;
const player=o=>Object.assign(P.createPlayer(),{x:9000,y:620,grounded:true,h:46,vx:0},o);
const world=(s,o={})=>({stats:{bullets:[],explosions:[]},enemies:[],platforms:[],dt:1/60,inside:false,hurts:[],...o,hurt(e,p,x,projectile,amount){this.hurts.push(amount);},damage:(n,a)=>N.damage(n,a)});
const run=(s,ctx,seconds)=>{const all=[];for(let i=0;i<seconds*60;i++)all.push(...C.update(s,ctx));return all;};
test('tombs are reachable one-way platforms clear of zombies, barricades and checkpoints',()=>{
 const tombs=C.platforms(),geo=L.geometry(),zombies=Z.create([],geo.platforms);
 assert.equal(tombs.length,11);assert.equal(new Set([...geo.platforms,...tombs,...C.gates()].map(p=>p.id)).size,geo.platforms.length+tombs.length+2);
 for(const t of tombs){
  assert.equal(t.kind,'deck');assert.ok(!t.solid);assert.ok(t.x>C.ZONE.from&&t.x+t.w<C.ZONE.to);
  assert.ok(620-t.y<=86,'a single jump reaches every tomb');
  assert.ok(!geo.platforms.some(s=>s.solid&&t.x<s.x+s.w+20&&t.x+t.w>s.x-20),'clear of barricades');
  assert.ok(zombies.every(z=>z.homeX<t.x-8||z.homeX>t.x+t.w+8),'no grave under tomb at '+t.x);
  assert.ok(K.stations(2).every(k=>k.x<t.x-30||k.x>t.x+t.w+30));
  assert.ok(L.CRATERS.every(a=>t.x>a.x+a.w||t.x+t.w<a.x));
 }
 const p=player({x:tombs[1].x+20});for(let i=0;i<200;i++)P.step(p,{jumpPressed:i===0,jumpHeld:true},1/120,[geo.platforms[0],...tombs]);
 assert.equal(p.ground,tombs[1],'the tall tomb is landed on from a standing jump');
});
test('souls are collected once, counted, and survive a save',()=>{
 const s=C.create(),first=s.souls[0],p=player({x:first.x,y:first.y+23}),ctx=world(s,{player:p});
 const events=run(s,ctx,.1).filter(e=>e.type==='soul');assert.equal(events.length,1);assert.equal(events[0].count,1);assert.equal(events[0].total,s.souls.length);
 assert.ok(s.souls.length>=14);assert.equal(new Set(s.souls.map(x=>x.id)).size,s.souls.length);
 const again=C.create(JSON.parse(JSON.stringify(C.snapshot(s))));assert.equal(again.souls.filter(x=>x.taken).length,1);
 assert.equal(run(again,world(again,{player:p}),.1).filter(e=>e.type==='soul').length,0);
});
test('headstones break under bullets, blasts and melee and always drop something',()=>{
 const s=C.create(),stone=s.stones[0],p=player({x:stone.x-200}),stats={bullets:[{x:stone.x,y:600,life:1,damage:1,enemy:false}],explosions:[]},ctx=world(s,{player:p,stats});
 assert.equal(run(s,ctx,.05).filter(e=>e.type==='stone').length,0);assert.equal(stone.hp,1);assert.equal(stats.bullets[0].life,0,'the bullet stops in the stone');
 stats.bullets.push({x:stone.x,y:600,life:1,damage:1,enemy:false});const broke=run(s,ctx,.05).filter(e=>e.type==='stone');
 assert.equal(broke.length,1);assert.ok(['ammo','points','health'].includes(broke[0].drop.kind));assert.ok(broke[0].drop.amount>0);
 stats.bullets=[{x:s.stones[1].x,y:600,life:1,damage:1,enemy:true}];run(s,ctx,.05);assert.equal(s.stones[1].hp,2,'enemy fire does not farm loot');
 stats.bullets=[];stats.explosions=[{x:s.stones[2].x+30,y:600,radius:85,life:.5}];assert.equal(run(s,ctx,.05).filter(e=>e.type==='stone').length,1);
 const hitter=player({x:s.stones[3].x-30,facing:1,wolfAttack:{age:.2,duration:.32}});assert.equal(run(s,world(s,{player:hitter,stats:{bullets:[],explosions:[]}}),.05).filter(e=>e.type==='stone').length,1);
 const kinds=new Set(C.STONES.map((_,id)=>C.drop(id).kind));assert.ok(kinds.size>=2,'drops vary');
 assert.equal(C.create(C.snapshot(s)).stones.filter(x=>x.hp<=0).length,3);
});
test('lightning warns before it lands, hurts whoever stays and spares whoever moves',()=>{
 for(const stay of [true,false]){
  const s=C.create(),p=player({x:12400}),zombie=Object.assign(Z.create()[0],{phase:'active',hp:3,y:620}),ctx=world(s,{player:p,enemies:[zombie]});
  let warned=null,struck=null;
  for(let i=0;i<60*20&&!struck;i++){for(const e of C.update(s,ctx)){if(e.type==='warn'){warned=e;assert.equal(ctx.hurts.length,0,'no damage at the warning');p.x=stay?e.x:e.x+120;zombie.x=e.x+10;}if(e.type==='strike')struck=e;}}
  assert.ok(warned&&struck);assert.equal(struck.x,warned.x,'it lands where it warned');
  assert.equal(ctx.hurts.length,stay?1:0);assert.equal(zombie.hp,1,'the dead are not spared');
 }
 const s=C.create(),ctx=world(s,{player:player({x:5000})});assert.equal(run(s,ctx,30).length,0,'no storm outside the cemetery');
 const indoor=C.create();assert.equal(run(indoor,world(indoor,{player:player({x:12400}),inside:true}),30).filter(e=>e.type==='warn').length,0);
});
test('grasping hands slow only feet on the ground',()=>{
 const s=C.create(),h=C.HANDS[0];
 assert.equal(C.slow(s,player({x:h.x+40}),false),.55);assert.equal(C.slow(s,player({x:h.x-40}),false),1);
 assert.equal(C.slow(s,player({x:h.x+40,grounded:false,y:560}),false),1);assert.equal(C.slow(s,player({x:h.x+40,jetpack:true}),false),1);
 assert.equal(C.slow(s,player({x:h.x+40}),true),1);
 assert.ok(C.HANDS.every(a=>C.TOMBS.every(([x,w])=>a.x>x+w||a.x+a.w<x)),'hands never hide under a tomb');
});
test('the pit locks in, sends two waves, pays out once and stays finished',()=>{
 const s=C.create(),p=player({x:11700}),platforms=[{id:0,kind:'ground',x:0,y:620,w:18000}],enemies=[],ctx=world(s,{player:p,enemies,platforms});
 let events=run(s,ctx,.1);assert.ok(events.some(e=>e.type==='pitStart'));assert.equal(platforms.filter(g=>g.gate).length,2);assert.equal(enemies.length,4);
 assert.ok(enemies.every(n=>n.kind==='zombie'&&n.phase==='waking'&&n.x>C.PIT.left+20&&n.x<C.PIT.right-20&&n.id>=C.PIT.ids));
 assert.ok(Z.pose(enemies[0]).frame>=0,'spawned zombies always have a valid pose');
 for(const g of platforms.filter(g=>g.gate))assert.ok(g.solid&&620-g.y>220,'gates are too tall to jump');
 for(const n of enemies)n.hp=0;events=run(s,ctx,1.2);assert.ok(events.some(e=>e.type==='pitWave'&&e.wave===2));assert.equal(enemies.length,6);
 for(const n of enemies)n.hp=0;events=run(s,ctx,.2);assert.equal(events.filter(e=>e.type==='pitEnd').length,1);assert.equal(platforms.filter(g=>g.gate).length,0);assert.equal(s.pit.state,'done');
 assert.equal(run(s,ctx,2).filter(e=>e.type==='pitStart').length,0);assert.equal(C.create(C.snapshot(s)).pit.state,'done');
});
test('leaving the pit by air opens it without a reward',()=>{
 const s=C.create(),p=player({x:11700}),platforms=[],enemies=[],ctx=world(s,{player:p,enemies,platforms});run(s,ctx,.1);
 p.x=C.PIT.right+C.PIT.leave+10;const events=run(s,ctx,.1);assert.ok(events.some(e=>e.type==='pitAbort'));assert.ok(!events.some(e=>e.type==='pitEnd'));
 assert.equal(platforms.length,0);assert.ok(enemies.every(n=>n.hp===0));assert.equal(s.pit.state,'idle');assert.equal(C.snapshot(s).pit,'idle');
});
test('lanterns, souls and the bolt light the scene; everything draws on whole pixels',()=>{
 const s=C.create(),view={left:10200,right:11200,top:200,bottom:700};
 const lights=C.lights(s,view);assert.ok(lights.length>=3);for(const l of lights)assert.ok([l.x,l.y,l.r,l.a].every(Number.isFinite));
 const rects=[],c={fillRect(...r){rects.push(r);},fillStyle:''};s.strike={x:10700,age:.5,hit:false,seed:1};s.time=3;
 C.drawBack(c,s,view);C.drawFront(c,s,view);s.strike={x:10700,age:C.STRIKE.warn+.1,hit:true,seed:1};C.drawFront(c,s,view);C.fog(c,s,{x:10200,y:200},890,424,1);
 assert.ok(rects.length>300);assert.ok(rects.every(r=>r.every(Number.isInteger)),'hard pixels only');
});
