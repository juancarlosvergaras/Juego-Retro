const {test}=require('node:test'),assert=require('node:assert/strict'),L=require('../level-two'),P=require('../physics'),C=require('../mission-combat'),N=require('../enemies'),E=require('../encounter'),Loot=require('../mission-two-loot');
function world(run){const old={...P.WORLD};Object.assign(P.WORLD,L.WORLD);try{run();}finally{Object.assign(P.WORLD,old);}}
test('two distinct grounded barricades have four additional guards and stable saved IDs',()=>{
 const g=L.geometry(),ns=C.cityEnemies([0,19,20,23]);assert.equal(g.barricades.length,2);assert.equal(L.geometry(true).barricades.length,0);assert.equal(new Set(g.platforms.map(p=>p.id)).size,g.platforms.length);
 assert.ok(g.barricades[0].x<8100&&g.barricades[1].x>9700);assert.notEqual(g.barricades[0].image,g.barricades[1].image);assert.equal(ns.length,26);assert.deepEqual(ns.filter(n=>n.hp===0).map(n=>n.id),[0,19,20,23]);
 for(const b of g.barricades){assert.ok(b.w>=400);assert.ok(b.platforms.every(p=>Math.abs(p.y+p.thickness-620)<1e-7));const guards=ns.filter(n=>n.guardPost===b.id);assert.equal(guards.length,2);assert.ok(guards.every(n=>b.platforms.some(s=>Math.abs(s.y-n.y)<.01&&n.x-12>s.x&&n.x+12<s.x+s.w)));}
});
test('soldier and wolf cannot walk through barricades but can jump over both from either side',()=>world(()=>{
 const g=L.geometry();for(const b of g.barricades)for(const form of ['soldier','wolf'])for(const dir of [-1,1]){
  const p=Object.assign(P.createPlayer(),{x:dir>0?b.x-40:b.x+b.w+40,y:620,form,h:form==='wolf'?64:46}),input=dir>0?{right:true}:{left:true};
  for(let i=0;i<120;i++)P.step(p,input,1/120,g.platforms);assert.ok(dir>0?p.x<b.x+40:p.x>b.x+b.w-40);
  let stood=false;for(let i=0;i<900;i++){P.step(p,{...input,jumpPressed:i%80===0},1/120,g.platforms);stood ||= !!p.ground?.solid;assert.ok(!g.platforms.some(s=>s.solid&&p.x+p.w/2>s.x+.01&&p.x-p.w/2<s.x+s.w-.01&&p.y>s.y+.01&&p.y-p.h<s.y+s.thickness-.01));}
  assert.ok(dir>0?p.x>b.x+b.w:p.x<b.x);assert.ok(stood);
 }
}));
test('guards keep their post, wait before firing and can be defeated normally',()=>world(()=>{
 const g=L.geometry();for(const n of C.cityEnemies().filter(n=>n.guardPost)){
  const original={x:n.x,y:n.y},p={x:n.x+n.facing*180,y:n.y,vx:0},bullets=[];
  for(let i=0;i<110;i++)N.update([n],p,1/120,g.platforms,bullets,E.segmentHit);assert.equal(bullets.length,0);
  for(let i=0;i<400;i++)N.update([n],p,1/120,g.platforms,bullets,E.segmentHit);assert.ok(bullets.length>0);assert.equal(n.x,original.x);assert.equal(n.y,original.y);
  N.damage(n,10);const count=bullets.length;N.update([n],p,2,g.platforms,bullets,E.segmentHit);assert.equal(n.hp,0);assert.equal(bullets.length,count);
 }
}));
test('solid tops prevent dropping inside, jetpack passes above, and loot is never buried',()=>world(()=>{
 const g=L.geometry(),s=g.barricades[0].platforms[4],p=Object.assign(P.createPlayer(),{x:s.x+s.w/2,y:s.y,ground:s,form:'soldier'});
 P.step(p,{down:true,jumpPressed:true},1/120,g.platforms);assert.ok(p.y<s.y);assert.ok(!p.dropping);
 Object.assign(p,{x:2300,y:450,jetpack:true,fuel:1000,vy:0,vx:0,grounded:false,ground:null});for(let i=0;i<400;i++)P.step(p,{right:true},1/120,g.platforms);assert.ok(p.x>2760);assert.equal(p.y,450);
 for(let seed=0;seed<100;seed++)for(const w of Loot.create(g.platforms,seed).weapons)assert.ok(!g.platforms.some(s=>s.solid&&w.x>s.x&&w.x<s.x+s.w&&w.y>s.y));
}));
