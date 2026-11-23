const test=require('node:test'),assert=require('node:assert/strict'),M=require('../air-mecha'),A=require('../arsenal'),N=require('../enemies'),Z=require('../zombie-form'),C=require('../campaign'),L=require('../level-three');
test('each robot arm keeps its own cadence when pairing a rifle and a rocket launcher',()=>{const e={inventory:{owned:[5,6],selected:5,secondary:6,ammo:{5:100,6:100}}},p={form:'robot',x:100,y:620,facing:1},shots=[];for(let i=0;i<120;i++){A.tickRobot(e,1/120);const shot=A.fireRobot(e,p);if(shot)shots.push(...shot.bullets);}assert.equal(shots.filter(b=>b.slot===6).length,1);assert.ok(shots.filter(b=>b.slot===5).length>=9);assert.equal(e.inventory.ammo[6],99);});
test('solid cargo blocks passage, and the metal flight deck prevents burrowing',()=>{const P=require('../physics'),g=L.geometry(),box=g.platforms.find(p=>p.solid),p=Object.assign(P.createPlayer(),{x:box.x-20,y:620,form:'soldier'});const old={...P.WORLD};try{Object.assign(P.WORLD,L.WORLD);for(let i=0;i<100;i++)P.step(p,{right:true},1/120,g.platforms);assert.ok(p.x+p.w/2<=box.x+.1);Object.assign(p,{x:300,y:620,ground:g.platforms[0],grounded:true,form:'zombie'});P.step(p,{down:true},.01,g.platforms);assert.ok(!p.burrow);}finally{Object.assign(P.WORLD,old);}});
test('the first mission also fires both robot arms through its real combat loop',()=>{const P=require('../physics'),E=require('../encounter'),e=E.createEncounter(),p=Object.assign(P.createPlayer(),{form:'robot',x:100,y:620,facing:1});e.enemies=[];e.won=true;e.boss.hp=0;e.finalBoss.hp=0;e.inventory={owned:[3,5],selected:5,secondary:3,ammo:{3:30,5:60}};E.updateEncounter(e,p,{fire:true},1/120,[]);assert.equal(e.inventory.ammo[3],29);assert.equal(e.inventory.ammo[5],59);assert.equal(e.bullets.filter(b=>!b.enemy).length,2);});
test('short air mission has fourteen ground soldiers and five jetpack soldiers, ten weapons, three stars and platforms under every sentry',()=>{const g=L.geometry(),enemies=L.soldiers();assert.equal(enemies.length,19);assert.equal(L.loot().weapons.length,10);assert.equal(L.loot().stars.length,3);assert.ok(L.WIDTH<18000*.5);for(const n of enemies.filter(n=>n.kind!=='jetSoldier'))assert.ok(g.platforms.some(p=>n.x>=p.x&&n.x<=p.x+p.w&&n.y===p.y));});
test('mecha has a warning period then cycles through bullets, marked missiles and dodgeable ground waves',()=>{const m=M.create(),p={x:6500,y:620},bullets=[];const phases=new Set();let waves=false,marks=false;M.update(m,p,.01,bullets);for(let i=0;i<90;i++)M.update(m,p,.01,bullets);assert.equal(bullets.length,0);for(let i=0;i<2500;i++){M.update(m,p,.01,bullets);phases.add(m.phase);waves||=m.waves.length>0;marks||=m.markers.length>0;}for(const phase of ['volley','missiles','stomp'])assert.ok(phases.has(phase));assert.ok(waves&&marks);assert.ok(bullets.some(b=>b.tankShell));assert.ok(bullets.some(b=>b.fromTurret));});
test('dual identical guns consume two bullets; an almost empty magazine fires only the available bullet',()=>{const p={form:'robot',x:100,y:620,facing:1,aim:{x:1,y:0}},inv={owned:[3],selected:3,secondary:3,ammo:{3:3}};assert.equal(A.fire(inv,p).bullets.length,2);assert.equal(inv.ammo[3],1);assert.equal(A.fire(inv,p).bullets.length,1);assert.equal(inv.ammo[3],0);assert.equal(A.fire(inv,p),null);});
test('dual weapons preserve separate slots, gravity, diagonal aim and the slower weapon cooldown',()=>{const inv={owned:[3,9],selected:3,secondary:9,ammo:{3:9,9:4}},p={form:'robot',x:0,y:100,facing:-1,aim:{x:-Math.SQRT1_2,y:-Math.SQRT1_2}};const shot=A.fire(inv,p);assert.equal(shot.bullets.length,2);assert.equal(shot.weapon.rate,A.weapons[9].rate);assert.deepEqual(shot.bullets.map(b=>b.slot),[3,9]);assert.ok(shot.bullets.every(b=>b.vx<0&&b.vy<0));assert.equal(shot.bullets[1].gravity,420);assert.equal(inv.ammo[9],3);});
test('third campaign transfer retains progress and robot unlock without overwriting mission one loadout',()=>{const map=new Map(),store={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};map.set('cap-dollar.mission-one-loadout.v1','original');C.transferThree(store,{robotUnlocked:true,zombieUnlocked:true,fuel:100},{hp:5,inventory:{owned:[3,5],selected:5,secondary:3,ammo:{3:20,5:50}}},{total:12500});assert.equal(C.read(store).level,3);assert.equal(C.read(store).robotUnlocked,true);assert.equal(map.get('cap-dollar.mission-one-loadout.v1'),'original');assert.equal(C.inventory(C.read(store).inventory).secondary,3);assert.deepEqual(Z.forms({robotUnlocked:true,zombieUnlocked:true},true),['soldier','wolf','zombie','robot']);});

test('el Centinela localiza jugadores altos y alterna ataques que llegan a su altura',()=>{
 const mech=require('../air-mecha'),n=mech.create(),p={x:7480,y:120,h:46},shots=[];
 const patterns=new Set();
 for(let i=0;i<1800;i++){mech.update(n,p,1/120,shots,{right:8000});patterns.add(n.phase);}
 assert.equal(n.active,true);assert.ok(patterns.has('volley')&&patterns.has('missiles'));assert.ok(!patterns.has('stomp'));
 assert.ok(shots.some(b=>b.vy<0&&b.y+b.vy*b.life<p.y));
 assert.ok(shots.some(b=>b.tankShell&&b.x===p.x&&b.y<p.y-p.h&&b.y+b.vy*b.life>p.y));
});

test('la carga sólida deja accesibles las armas y los soldados de cubierta',()=>{
 const boxes=L.geometry().platforms.filter(p=>p.solid),loot=L.loot();
 for(const actor of [...loot.weapons,...loot.medkits,...loot.fuelTanks,...L.soldiers()]){
  assert.ok(!boxes.some(box=>actor.x>box.x&&actor.x<box.x+box.w&&actor.y>box.y),'objeto dentro de un contenedor '+actor.id);
 }
});
test('el paso del Centinela sigue la distancia y se detiene al llegar a ambos límites',()=>{
 for(const [x,px] of [[6390,6175],[7400,7600],[7000,7020]]){
  const n=M.create({x,active:true});M.update(n,{x:px,y:620},.2,[]);
  assert.equal(n.x,x);assert.equal(n.walkDistance,0);
 }
 const n=M.create({x:7000,active:true});
 for(let i=0;i<60;i++)M.update(n,{x:6500,y:620},1/60,[]);
 assert.ok(Math.abs(n.walkDistance-28)<1e-8);
 assert.ok(Math.abs(7000-n.x-n.walkDistance)<1e-8);
});
