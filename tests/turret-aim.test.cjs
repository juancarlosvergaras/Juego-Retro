const {test}=require('node:test'),assert=require('node:assert/strict'),N=require('../enemies'),P=require('../physics'),E=require('../encounter'),C=require('../mission-combat'),A=require('../arsenal'),V=require('../powers'),U=require('../progression');
const floors=[{x:0,y:250,w:1200,kind:'deck',thickness:12},{x:0,y:390,w:1200,kind:'deck',thickness:12},{x:0,y:620,w:1200,kind:'ground',thickness:36}];
test('turrets aim downward and diagonally through building floors with a one-second warning',()=>{
 for(const dx of [-300,0,300]){const n=N.createSoldier({kind:'turret',x:600,y:250,facing:dx<0?-1:1},0),p={x:600+dx,y:620,vx:0},shots=[];
 for(let i=0;i<110;i++)N.update([n],p,1/120,floors,shots,E.segmentHit);assert.equal(shots.length,0);assert.equal(n.awareness,'sight');
 for(let i=0;i<25;i++)N.update([n],p,1/120,floors,shots,E.segmentHit);assert.ok(shots.length);const b=shots[0];assert.ok(b.vy>0);if(dx)assert.equal(Math.sign(b.vx),Math.sign(dx));
 const aim=N.turretAim(n,p);assert.ok(Math.abs(b.x-aim.x)<.001&&Math.abs(b.y-aim.y)<.001);assert.ok(Math.abs((p.x-b.x)*b.vy-(p.y-25-b.y)*b.vx)<.001,'muzzle trajectory reaches player torso');
 }
});
test('turrets see farther than riflemen but still have a finite range',()=>{
 for(const [kind,distance,expected]of [['turret',620,true],['rifle',620,false],['turret',700,false]]){const n=N.createSoldier({kind,x:100,y:620,facing:1},0),shots=[];N.update([n],{x:100+distance,y:620,vx:0},.01,[floors[2]],shots,E.segmentHit);assert.equal(n.awareness==='sight',expected);}
});
test('red turret bullets cross multiple platforms and respect player shields in both missions',()=>{
 for(const mission of [1,2])for(const shield of [0,1])for(const turret of [true,false]){
 const e=mission===1?E.createEncounter():C.create(A.createInventory()),p=Object.assign(P.createPlayer(),{x:400,y:620,form:'soldier',shield}),powers=V.create(),profile=U.fresh();e.enemies=[];e.won=true;e.boss.hp=0;e.tank=null;
 e.bullets=[{x:400,y:220,vx:0,vy:245,life:3.2,enemy:true,fromSoldier:true,fromTurret:turret}];const initial=e.hp;
 for(let i=0;i<220;i++){if(mission===1)E.updateEncounter(e,p,{},1/120,floors);else C.update(e,p,{},1/120,floors,powers,profile);}
 assert.equal(e.hp,initial-(turret&&!shield?1:0));assert.equal(p.shield,turret?0:shield);assert.equal(e.bullets.length,0);
 }
});
test('ground and solid cover still stop turret fire while ordinary platforms do not',()=>{
 const b={fromTurret:true};for(const kind of ['deck','ledge','scaffold'])assert.ok(!N.blocksShot(b,{kind,thickness:20}));for(const p of [{kind:'ground'},{kind:'wreck',solid:true},{kind:'barricade',solid:true},{thickness:100}])assert.ok(N.blocksShot(b,p));
});
