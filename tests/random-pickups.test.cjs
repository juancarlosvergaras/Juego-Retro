const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../arsenal'),P=require('../physics'),C=require('../challenges'),E=require('../encounter'),M=require('../medkits'),Score=require('../score');
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('500 layouts contain exactly four unique weapons, on static supports and clear of fixed stars',()=>{
 const ps=P.createPlatforms(),stars=C.create(ps).stars,original=JSON.stringify(stars);
 for(let seed=0;seed<500;seed++){
  const items=A.createPickups({platforms:ps,random:rng(seed)});assert.equal(items.length,4);assert.equal(new Set(items.map(i=>i.slot)).size,4);assert.deepEqual(items.map(i=>i.id),[0,1,2,3]);
  const zones=new Set();for(const item of items){
   assert.ok(!item.taken);assert.ok(A.weapons[item.slot]);
   assert.ok(ps.some(p=>!p.crane&&!p.arena&&p.y===item.y&&item.x>=p.x+28&&item.x<=p.x+p.w-28));
   zones.add(Math.min(3,Math.floor((P.WORLD.ground-item.y)/(P.WORLD.ground-P.WORLD.roof)*4)));
   for(const star of stars)assert.ok(Math.abs(item.x-star.x)>=62||Math.abs(item.y-18-star.y)>=68,'No invade la estrella, su halo ni su animación');
   for(const kit of M.create())assert.ok(Math.abs(item.x-kit.x)>=62||Math.abs(item.y-18-kit.y)>=68);
  }
  assert.equal(zones.size,4);assert.equal(JSON.stringify(C.create(ps).stars),original);
 }
});
test('both weapon selection and placement vary while a seeded layout is reproducible',()=>{
 const types=new Set(),positions=new Set();for(let seed=1;seed<=100;seed++){const items=A.createPickups({random:rng(seed)});types.add(items.map(i=>i.slot).join(','));positions.add(items.map(i=>i.x+':'+i.y).join(','));}
 assert.ok(types.size>50);assert.ok(positions.size>90);assert.deepEqual(A.createPickups({random:rng(123)}),A.createPickups({random:rng(123)}));
 for(const random of [()=>0,()=>.999999])assert.equal(A.createPickups({random}).length,4);
});
test('checkpoint keeps the layout and taken items without awarding points again',()=>{
 const e=E.createEncounter(),score=Score.create();e.pickups[0].taken=true;Score.sync(score,e);
 const retry=E.createEncounter({pickups:e.pickups});assert.equal(retry.pickups,e.pickups);assert.equal(retry.pickups[0].taken,true);assert.equal(Score.sync(score,retry),0);assert.equal(score.counts.weapons,1);
 const fresh=E.createEncounter();assert.notEqual(fresh.pickups,e.pickups);assert.equal(fresh.pickups.length,4);assert.ok(fresh.pickups.every(i=>!i.taken));
});
