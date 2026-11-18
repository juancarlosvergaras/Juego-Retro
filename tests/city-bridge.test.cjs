const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../level-two'),P=require('../physics'),C=require('../mission-combat'),N=require('../enemies'),E=require('../encounter');
test('city bridge connects the facing penultimate floors with no open gap',()=>{
 const g=L.geometry();assert.equal(g.bridges.length,2);assert.equal(L.geometry(true).bridges.length,0);
 for(const [i,b] of g.bridges.entries()){const a=g.buildings[b.leftBuilding].decks[2],z=g.buildings[b.rightBuilding].decks[2];assert.equal(b.id,3000+i);assert.ok(b.w>400);assert.ok(b.x<a.x+a.w&&b.x+b.w>z.x);assert.equal(b.terrain[0][1],a.y);assert.equal(b.terrain[1][1],z.y);assert.ok(g.platforms.includes(b));}
 assert.equal(g.bridges[1].leftBuilding,1);assert.equal(g.bridges[1].rightBuilding,2);
});
test('soldier and wolf land and walk continuously across bridge and both connections',()=>{
 const g=L.geometry(),oldWidth=P.WORLD.width;P.WORLD.width=L.WORLD.width;
 try{for(const b of g.bridges)for(const form of ['soldier','wolf'])for(const facing of [-1,1]){
  const p=Object.assign(P.createPlayer(),{form,x:facing>0?b.x-45:b.x+b.w+45,y:340,facing});for(let i=0;i<120;i++)P.step(p,{},1/120,g.platforms);assert.ok(p.grounded);
  const end=facing>0?b.x+b.w+40:b.x-40;let ticks=0;
  while((end-p.x)*facing>0&&ticks++<1800){const y=p.y;P.step(p,{left:facing<0,right:facing>0},1/120,g.platforms);assert.ok(Math.abs(p.y-y)<1,'continuous floor transition');assert.ok(p.y<380,'does not fall through bridge');}
  assert.ok(ticks<1800);assert.ok(p.grounded);
 }
 }finally{P.WORLD.width=oldWidth;}
});
test('bridge turret has a stable new ID and shoots diagonally downward through bridge',()=>{
 const g=L.geometry(),guards=C.cityEnemies().filter(n=>n.guardPost==='city-bridge'),oldWidth=P.WORLD.width;P.WORLD.width=L.WORLD.width;
 try{assert.equal(guards.length,2);for(const [i,n] of guards.entries()){const b=g.bridges[i];assert.equal(n.id,24+i);assert.equal(n.kind,'turret');assert.equal(C.cityEnemies([n.id]).find(q=>q.id===n.id).hp,0);assert.equal(n.y,P.surfaceY(b,n.x));const shots=[],x=n.x,y=n.y;
 for(let i=0;i<220;i++)N.update([n],{x:n.x-40,y:620,h:46,vx:0},1/120,g.platforms,shots,E.segmentHit);
 assert.equal(n.x,x);assert.ok(Math.abs(n.y-y)<.01);assert.ok(shots.length>0);assert.ok(shots.every(s=>s.fromTurret&&s.vx<0&&s.vy>0&&!N.blocksShot(s,b)));
 }}finally{P.WORLD.width=oldWidth;}
});
