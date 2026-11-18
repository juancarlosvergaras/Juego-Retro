const {test}=require('node:test'),assert=require('node:assert/strict'),L=require('../mission-two-loot'),W=require('../level-two'),A=require('../arsenal');
const platforms=W.geometry().platforms;
test('twelve random pickups and five fixed stars stay supported and separated',()=>{
 const starPositions=L.create(platforms,0).stars;
 for(let seed=0;seed<150;seed++){const loot=L.create(platforms,seed);assert.equal(loot.weapons.length,12);assert.equal(loot.stars.length,5);assert.deepEqual(loot.stars,starPositions);assert.ok(loot.weapons.slice(0,3).some(w=>w.slot===6));assert.equal(new Set(loot.weapons.map(w=>w.slot)).size,9);
  for(const w of loot.weapons){assert.ok(w.x>0&&w.x<18000);assert.ok(platforms.some(p=>w.x>=p.x&&w.x<=p.x+p.w&&Math.abs(w.y+12-p.y)<.01),'supported pickup');assert.ok(loot.stars.every(s=>Math.hypot(w.x-s.x,w.y-s.y)>=100),'no weapon covers a star');}
 }
 assert.notDeepEqual(L.create(platforms,1).weapons,L.create(platforms,2).weapons);
});
test('collected weapons replenish ammo and star progress survives without rerolling',()=>{
 const loot=L.create(platforms,123),inv=A.createInventory(),w=loot.weapons.find(w=>w.slot===6);const found=L.collect(loot,{x:w.x,y:w.y+12,h:46},inv);assert.equal(found.names.length,1);assert.ok(inv.owned.includes(6));assert.equal(inv.ammo[6],6);
 for(const star of loot.stars)L.collect(loot,{x:star.x,y:star.y+23,h:46},inv);
 assert.ok(loot.stars.every(s=>s.taken));const restored=L.create(platforms,123,L.snapshot(loot));assert.deepEqual(restored,loot);assert.equal(L.collect(restored,{x:w.x,y:w.y+12,h:46},inv).names.length,0);assert.equal(inv.ammo[6],6);
});
test('five medkits and three fuel cans stay grounded, clear of cover and other loot',()=>{
 const P=require('../physics');
 for(let seed=0;seed<150;seed++){
  const loot=L.create(platforms,seed),supplies=[...loot.medkits,...loot.fuelTanks];
  assert.equal(loot.medkits.length,5);assert.equal(loot.fuelTanks.length,3);
  for(const item of supplies){
   assert.equal(item.y,P.surfaceY(platforms.find(p=>p.kind==='ground'),item.x));
   assert.ok(!platforms.some(p=>p.solid&&item.x>p.x-26&&item.x<p.x+p.w+26));
   assert.ok([...loot.weapons,...loot.stars,...supplies].every(other=>other===item||Math.abs(item.x-other.x)>=70));
  }
 }
});
test('supplies restore health or fuel once, respect capacity and survive old and new saves',()=>{
 const loot=L.create(platforms,77),e={hp:7,maxHp:8,dead:false},p={form:'soldier',fuel:10,fuelMax:900};
 Object.assign(p,loot.medkits[0]);assert.equal(L.collectSupplies(loot,p,e).healed.amount,1);assert.equal(e.hp,8);
 Object.assign(p,{x:loot.medkits[1].x,y:loot.medkits[1].y});assert.equal(L.collectSupplies(loot,p,e).healed,null);assert.equal(loot.medkits[1].taken,false);
 Object.assign(p,{x:loot.fuelTanks[0].x,y:loot.fuelTanks[0].y});assert.equal(L.collectSupplies(loot,p,e).fuel,true);assert.equal(p.fuel,900);
 Object.assign(p,{x:loot.fuelTanks[1].x,y:loot.fuelTanks[1].y});assert.equal(L.collectSupplies(loot,p,e).fuel,false);assert.equal(loot.fuelTanks[1].taken,false);
 p.fuel=0;p.form='wolf';assert.equal(L.collectSupplies(loot,p,e).fuel,false);
 p.form='soldier';e.dead=true;assert.equal(L.collectSupplies(loot,p,e).fuel,false);
 const restored=L.create(platforms,77,L.snapshot(loot));assert.deepEqual(restored,loot);
 const old=L.create(platforms,77,{weapons:[0],stars:[1]});assert.ok(old.weapons[0].taken&&old.stars[1].taken);assert.ok([...old.medkits,...old.fuelTanks].every(i=>!i.taken));
});
