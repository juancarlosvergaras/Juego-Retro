const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../physics'),C=require('../mission-combat'),N=require('../enemies'),A=require('../arsenal'),V=require('../powers'),U=require('../progression');
const floor=[{x:0,y:620,w:18000,kind:'ground',thickness:36}];
function fixture(){const p=Object.assign(P.createPlayer(),{x:300,y:620,form:'soldier',aim:{x:1,y:0}}),e=C.create(A.createInventory()),powers=V.create(),profile=U.fresh();return{p,e,powers,profile,tick(input={},dt=1/120,platforms=floor){return C.update(e,p,input,dt,platforms,powers,profile);}};}
test('city adds fifteen soldiers on streets and building platforms while preserving saved IDs',()=>{
 const list=C.cityEnemies([1,3,12,19]),L=require('../level-two.js'),platforms=L.geometry().platforms;
 assert.equal(list.length,26);assert.equal(new Set(list.map(n=>n.id)).size,26);
 assert.deepEqual(list.slice(0,5).map(n=>[n.x,n.y]),[1150,2300,3850,5600,7400].map(x=>[x,P.surfaceY(platforms[0],x)]));
 assert.equal(list.filter(n=>n.y>=620).length,12);assert.equal(list.filter(n=>n.y<620).length,14);
 assert.ok(list.every(n=>n.x>700&&n.x<14000&&platforms.some(s=>P.surfaceY(s,n.x)===n.y&&n.x-n.w/2>s.x&&n.x+n.w/2<s.x+s.w)));
 assert.deepEqual(list.filter(n=>n.hp===0).map(n=>n.id),[1,3,12,19]);
 const alive=C.cityEnemies(),positions=alive.map(n=>[n.x,n.y]),bullets=[];
 const originalWidth=P.WORLD.width;P.WORLD.width=L.WORLD.width;
 try{for(let i=0;i<240;i++)N.update(alive,{x:-2000,y:620,vx:0},1/120,platforms,bullets,require('../encounter.js').segmentHit);}finally{P.WORLD.width=originalWidth;}
 alive.forEach((n,i)=>{assert.ok(Math.abs(n.x-positions[i][0])<.01);assert.ok(Math.abs(n.y-positions[i][1])<.01);assert.ok(n.grounded);});
});
test('mission two applies landing damage once, ignores armor, and preserves wolf immunity',()=>{
 for(const form of ['soldier','wolf']){const f=fixture();Object.assign(f.p,{form,fallDamage:2,shield:10});f.e.invincible=1;f.tick();assert.equal(f.e.hp,form==='wolf'?8:6);assert.equal(f.p.shield,10);assert.equal(f.p.fallDamage,0);f.tick();assert.equal(f.e.hp,form==='wolf'?8:6);}
 const f=fixture();f.e.hp=1;f.p.fallDamage=2;f.profile.owned=['heal'];f.profile.equipped='heal';f.tick({power:true,fire:true});assert.equal(f.e.hp,0);assert.equal(f.e.dead,true);assert.equal(f.e.bullets.length,0);
});
test('guns, missiles and arrows damage enemies and platforms stop shots first',()=>{
 for(const slot of [3,4,5,6,7,8]){const f=fixture(),n=N.createSoldier({x:380,y:620},0);n.frozen=10;f.e.enemies=[n];f.e.inventory={selected:slot,owned:[slot],ammo:{[slot]:10}};f.tick({fire:true});for(let i=0;i<100;i++)f.tick();assert.ok(n.hp<3,'weapon '+slot);}
 const f=fixture(),n=N.createSoldier({x:400,y:620},0);n.frozen=10;f.e.enemies=[n];const wall={x:350,y:550,w:10,thickness:70};f.tick({fire:true},1/120,[...floor,wall]);for(let i=0;i<80;i++)f.tick({},1/120,[...floor,wall]);assert.equal(n.hp,3);
});
test('knife, axe, wolf claw, kick and purchased powers damage real city targets',()=>{
 for(const kind of [1,2,'claw','kick','power']){const f=fixture(),n=N.createSoldier({x:340,y:620},0);n.frozen=10;f.e.enemies=[n];
  if(typeof kind==='number')f.e.inventory={selected:kind,owned:[kind],ammo:{}};
  if(kind==='claw'||kind==='kick')f.p.form='wolf';
  if(kind==='power'){f.profile.owned=['wave'];f.profile.equipped='wave';}
  f.tick(kind==='power'?{power:true}:kind==='kick'?{kick:true}:{fire:true});for(let i=0;i<40;i++)f.tick();assert.ok(n.hp<3,String(kind));
 }
});
test('enemy waits one second before firing, and its bullets respect shields',()=>{
 const f=fixture();f.e.enemies=[N.createSoldier({x:500,y:620,facing:-1},0)];for(let i=0;i<110;i++)f.tick();assert.equal(f.e.bullets.filter(b=>b.enemy).length,0);for(let i=0;i<20;i++)f.tick();assert.ok(f.e.bullets.some(b=>b.enemy));
 f.e.enemies=[];f.e.bullets=[{x:320,y:595,vx:-190,vy:0,life:1,enemy:true}];f.p.shield=1;f.tick({},.1);assert.equal(f.p.shield,0);assert.equal(f.e.hp,8);
 f.e.bullets=[{x:320,y:595,vx:-190,vy:0,life:1,enemy:true}];f.tick({},.1);assert.equal(f.e.hp,7);
});
