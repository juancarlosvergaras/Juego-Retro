const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../physics'),N=require('../enemies'),C=require('../mission-combat'),E=require('../encounter'),A=require('../arsenal'),V=require('../powers'),U=require('../progression'),Z=require('../cemetery-zombies');
function fixture(mission=2){const p=Object.assign(P.createPlayer(),{x:300,y:620,form:'wolf',h:64,grounded:true,facing:1,vx:280,sprinting:true}),e=mission===2?C.create(A.createInventory()):E.createEncounter();e.enemies=[];e.boss.hp=0;e.finalBoss.hp=0;const floor=[{x:0,y:620,w:729,kind:'ground',thickness:36}],powers=V.create(),profile=U.fresh();return{p,e,floor,tick(input,dt=1/120){P.step(p,input,dt,floor);if(mission===2)C.update(e,p,input,dt,floor,powers,profile);else E.updateEncounter(e,p,input,dt,floor);}};}
test('running wolf charges through overlapping soldiers and zombies once per target in both missions',()=>{
 for(const mission of [1,2])for(const key of ['fire','kick']){const f=fixture(mission);f.e.enemies=['rifle','turret','knife','zombie'].map((kind,i)=>Object.assign(kind==='zombie'?Z.create()[0]:N.createSoldier({kind},i),{x:350+i*4,y:620,hp:8,maxHp:8,phase:'active',frozen:5}));
 for(let i=0;i<46;i++)f.tick({right:true,run:true,[key]:true});assert.ok(f.p.x>450);assert.ok(f.e.enemies.every(n=>n.hp===5));assert.ok(f.e.enemies.every(n=>n.ramHit));assert.equal(f.e.hp,mission===2?8:6);
 assert.ok(!f.p.ram);assert.equal(f.p.claw,0);
 }
});
test('ram respects solid barricades, other floors, buried zombies and enemies behind',()=>{
 const f=fixture();f.floor.push({x:335,y:510,w:50,thickness:110,solid:true,kind:'barricade'});f.e.enemies=[N.createSoldier({x:360,y:620},1),N.createSoldier({x:310,y:520},2),N.createSoldier({x:240,y:620},3),Object.assign(Z.create()[0],{x:325,y:620})];
 for(let i=0;i<30;i++)f.tick({right:true,run:true,fire:true});assert.ok(f.p.x<335);assert.ok(!f.p.ram);assert.ok(f.e.enemies.every(n=>n.hp===3));
});
test('standing attacks stay claws; charge requires another J press after cooldown',()=>{
 const f=fixture();f.p.vx=0;f.tick({fire:true});assert.ok(!f.p.ram);assert.ok(f.p.claw>0);
 const run=fixture();for(let i=0;i<150;i++)run.tick({right:true,run:true,fire:true});assert.equal(run.p.ramSound,1);run.tick({left:true,run:true,fire:false});for(let i=0;i<60;i++)run.tick({left:true,run:true});run.tick({left:true,run:true,fire:true});assert.equal(run.p.ramSound,2);assert.equal(run.p.ram.dir,-1);
});
test('defeated ram targets land and fade; survivors recover instead of floating',()=>{
 const f=fixture();f.e.enemies=[N.createSoldier({x:345,y:620},1),Object.assign(N.createSoldier({x:347,y:620},2),{hp:8,maxHp:8})];for(let i=0;i<300;i++)f.tick({right:true,run:true,fire:i===0});
 const [dead,alive]=f.e.enemies;assert.equal(dead.hp,0);assert.equal(dead.y,620);assert.equal(dead.death,0);assert.equal(alive.hp,5);assert.ok(!alive.ramHit);assert.equal(alive.y,620);
});
test('leftward ram hits a close group but never damages the same enemy twice',()=>{
 const f=fixture();Object.assign(f.p,{x:550,facing:-1,vx:-280});f.e.enemies=[475,480,480].map((x,id)=>Object.assign(N.createSoldier({x,y:620},id),{hp:9,maxHp:9,frozen:3}));
 for(let i=0;i<46;i++)f.tick({left:true,run:true,fire:true});assert.ok(f.e.enemies.every(n=>n.hp===6));assert.ok(f.e.enemies.every(n=>n.x<475));
});
test('all four impact sprite sequences stay within the atlas and use consistent scale',()=>{
 const R=require('../enemy-specialists'),calls=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){calls.push(args);}};
 for(const kind of ['rifle','turret','knife','zombie'])for(const dir of [-1,1])for(const age of [.01,.15,.3,.6]){assert.equal(R.drawRam(ctx,{kind,x:0,y:620,hp:0,death:1,grounded:age>.5,ramHit:{age,dir}},{}),true);}
 assert.equal(calls.length,32);for(const [,x,y,w,h,,,dw,dh] of calls){assert.ok(x>=0&&y>=0&&x+w<=1254&&y+h<=1254);assert.ok(dw>0&&dh>0&&dh<=51);}
});

test('L charges once per press, including leftward; standing L remains a kick',()=>{for(const mission of [1,2]){const f=fixture(mission);for(let i=0;i<150;i++)f.tick({right:true,run:true,kick:true});assert.equal(f.p.ramSound,1);f.tick({left:true,run:true});for(let i=0;i<60;i++)f.tick({left:true,run:true});f.tick({left:true,run:true,kick:true});assert.equal(f.p.ramSound,2);assert.equal(f.p.ram.dir,-1);const standing=fixture(mission);standing.p.vx=0;standing.tick({kick:true});assert.ok(!standing.p.ram);assert.ok(standing.p.kick>0);}});
