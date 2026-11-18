const test=require('node:test'),assert=require('node:assert/strict'),P=require('../physics'),L=require('../level-two'),S=require('../sky-expedition'),U=require('../progression'),Z=require('../zombie-form'),E=require('../mission-combat'),N=require('../enemies');
const original={...P.WORLD};test.beforeEach(()=>Object.assign(P.WORLD,L.WORLD));test.afterEach(()=>Object.assign(P.WORLD,original));
test('sky route adds a taller climbable tower and a distant high platform without changing old building IDs',()=>{
 const g=L.geometry(),tower=g.buildings.at(-1),ship=L.airshipPlatform();assert.ok(tower.tall);assert.ok(tower.h>Math.max(...g.buildings.slice(0,-1).map(b=>b.h))*1.5);assert.equal(tower.decks.length,8);assert.ok(ship.y<tower.y-280);assert.equal(L.AIRSHIP.rewardX,L.WORLD.width/2);assert.equal(g.platforms.filter(p=>p.airship).length,1);assert.equal(L.geometry(true).platforms.filter(p=>p.airship).length,0);assert.equal(new Set(g.platforms.map(p=>p.id)).size,g.platforms.length);
});
test('multiple upgraded jumps or the basic jetpack reach the dirigible from the tall roof',()=>{
 const g=L.geometry(),tower=g.buildings.at(-1),roof=g.platforms.filter(p=>p.building===g.buildings.length-1).at(-1),ship=L.airshipPlatform();
 for(const maxJumps of [2,7]){const p=Object.assign(P.createPlayer(),{x:roof.x+20,y:roof.y,ground:roof,grounded:true,maxJumps});let landed=false;for(let i=0;i<1200;i++){P.step(p,{left:p.x>9000,run:true,jumpPressed:p.grounded&&p.ground===roof||!p.grounded&&p.vy>=0&&p.jumps<maxJumps},1/120,g.platforms);if(p.ground?.airship){landed=true;break;}if(p.y>620)break;}assert.equal(landed,maxJumps===7,'reachability with '+maxJumps+' jumps');}
 const p=Object.assign(P.createPlayer(),{x:roof.x+20,y:roof.y,ground:roof,grounded:true,fuel:676});P.step(p,{jetpackPressed:true},1/120,g.platforms);for(let i=0;i<900&&!(p.x<9010&&p.y<ship.y-8);i++)P.step(p,{left:p.x>9000,up:p.y>ship.y-12},1/120,g.platforms);assert.ok(p.fuel>0);assert.ok(p.x<9010&&p.y<ship.y-8);P.step(p,{jetpackPressed:true},1/120,g.platforms);for(let i=0;i<240&&!p.grounded;i++)P.step(p,{},1/120,g.platforms);assert.ok(p.ground?.airship);
});
test('reward requires landing on the dirigible and persists as a passive double-speed jetpack in both missions',()=>{
 const profile=U.fresh(),p=Object.assign(P.createPlayer(),{x:9000,y:L.AIRSHIP.y,ground:L.airshipPlatform(),grounded:false,fuel:120});assert.equal(S.collect(profile,p),false);p.grounded=true;assert.equal(S.collect(profile,p,true),false);assert.equal(S.collect(profile,p),true);assert.equal(S.collect(profile,p),false);assert.equal(p.fuel,120);
 const data=new Map(),store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};U.save(profile,store);const restored=U.load(store);assert.equal(restored.jetpackMk2,true);for(const won of [false,true]){const next=P.createPlayer(),e={won,hp:5,maxHp:5};U.apply(restored,next,e);assert.equal(next.jetpackMk2,true);}
 assert.equal(U.load({getItem:()=>'{"version":1}'}).jetpackMk2,false);
});
test('MK II doubles normal and boost velocity in eight directions without doubling idle fuel consumption',()=>{
 for(const run of [false,true])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const results=[];for(const mk2 of [false,true]){const p=Object.assign(P.createPlayer(),{x:9000,y:-100,jetpack:true,jetpackMk2:mk2,grounded:false,fuel:500});P.step(p,{left:dx<0,right:dx>0,up:dy<0,down:dy>0,run},.1,[]);results.push(p);}assert.ok(Math.abs(Math.hypot(results[1].vx,results[1].vy)/Math.hypot(results[0].vx,results[0].vy)-2)<1e-9);assert.equal(results[0].fuel,results[1].fuel);}
});
test('zombie can emerge early with up or jump and cannot emerge inside solid rubble',()=>{
 const ground={x:0,y:620,w:18000,kind:'ground'},wall={x:160,y:565,w:130,thickness:55,solid:true,kind:'wreck'};
 for(const exit of [{up:true},{jumpPressed:true}]){const p=Object.assign(P.createPlayer(),{form:'zombie',h:68,x:130,y:620,grounded:true,ground});P.step(p,{down:true},.1,[ground,wall]);P.step(p,{right:true},.5,[ground,wall]);assert.ok(p.burrow);P.step(p,exit,1/120,[ground,wall]);assert.equal(p.burrow,null);assert.equal(p.emerging,.35);assert.ok(p.x+p.w/2<=wall.x||p.x-p.w/2>=wall.x+wall.w);assert.equal(p.y,620);}
});
test('lightning produces a bounded six-frame electrocution effect on the hit target only',()=>{
 const p=Object.assign(P.createPlayer(),{form:'zombie',x:100,y:620,aim:{x:1,y:0},facing:1}),e=E.create({selected:3,owned:[3],ammo:{3:10}}),a=N.createSoldier({x:190,y:620},0),b=N.createSoldier({x:300,y:620},1);e.enemies=[a,b];Z.combat(e,p,{fire:true},.01,[]);const fx=e.zombieEffects.find(f=>f.kind==='electrocute');assert.equal(fx.target,a);assert.equal(b.hp,b.maxHp);assert.equal(e.inventory.ammo[3],10);Z.combat(e,p,{},.5,[]);assert.ok(!e.zombieEffects.some(f=>f.kind==='electrocute'));
});
test('zombie run frames advance with actual travel and stop against walls',()=>{
 const ground={x:0,y:620,w:18000,kind:'ground'},p=Object.assign(P.createPlayer(),{form:'zombie',x:100,y:620,grounded:true,ground});for(let i=0;i<100;i++)P.step(p,{right:true,run:true},1/120,[ground]);assert.ok(p.zombieStride>1);const wall={x:p.x+p.w/2,y:540,w:100,thickness:80,solid:true};for(let i=0;i<60;i++)P.step(p,{right:true,run:true},1/120,[ground,wall]);const stride=p.zombieStride;for(let i=0;i<60;i++)P.step(p,{right:true,run:true},1/120,[ground,wall]);assert.equal(p.zombieStride,stride);
});
test('the dirigible heaves gently and carries a passenger without changing who can reach it',()=>{
 const g=L.geometry(),deck=g.platforms.find(p=>p.airship),p=Object.assign(P.createPlayer(),{x:9000,y:deck.y,ground:deck,grounded:true});
 let low=Infinity,high=-Infinity;for(let t=0;t<40;t+=.05){S.update(g.platforms,p,t);low=Math.min(low,deck.y);high=Math.max(high,deck.y);assert.equal(p.y,deck.y);assert.equal(deck.y,S.deckY(t));}
 assert.ok(high-low>6&&high-low<12,'visible but small travel: '+(high-low));assert.ok(Math.abs((high+low)/2-L.AIRSHIP.y)<1);
 const walker=Object.assign(P.createPlayer(),{x:9000,y:620,grounded:true,ground:g.platforms[0]});S.update(g.platforms,walker,3);assert.equal(walker.y,620,'only passengers are moved');
 const profile=U.fresh();S.update(g.platforms,p,7.3);assert.equal(S.collect(profile,p),true,'the reward is collected at any point of the heave');
 assert.equal(S.update(L.geometry(true).platforms,p,1),null);
});
