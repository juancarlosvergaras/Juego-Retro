const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('../quimera'),A=require('../arsenal'),P=require('../physics'),Z=require('../zombie-form'),Progress=require('../progression');
function advance(s,frames,input={}){
 for(let i=0;i<frames;i++)Q.update(s,input,1/120);
}
test('the fighter advances the walk cycle by ground distance even when moving in guard',()=>{
 const walk=Q.create(),guard=Q.create(),depth=Q.create();
 for(const [s,input] of [[walk,{right:true}],[guard,{right:true,guard:true}],[depth,{down:true}]])advance(s,20,input);
 const p=walk.player,g=guard.player;
 assert.ok(p.stepping&&g.stepping&&depth.player.stepping);
 const travelled=p.x-Q.create().player.x;
 assert.ok(Math.abs(p.stride*2*Q.stepSpan.fighter*Q.scaleAt(p)-travelled)<1e-7);
 // The same input towards the camera covers a larger projected stride.
 const nearDistance=depth.player.stride*2*Q.stepSpan.fighter;
 assert.ok(nearDistance*Q.scaleAt(p)<travelled&&nearDistance*Q.scaleAt(depth.player)>travelled);
 assert.ok(Math.abs(p.stride/g.stride-286/90)<1e-8);
 assert.equal(g.act,'guard');
 const stride=p.stride;advance(walk,20);assert.equal(p.stepping,false);assert.equal(p.stride,stride);
 p.x=28;advance(walk,12,{left:true});assert.equal(p.stride,stride);assert.equal(p.act,'idle');
});
test('releasing the arena at its right edge eases the camera and leaves the fighter planted',()=>{
 const s=Q.create({version:2,checkpoint:4});
 s.player.x=Q.waves[4].x-75;advance(s,1);
 s.enemies=[];s.pending=[];s.player.x=s.arenaLeft+760;
 const planted=s.player.x,dt=1/120;
 let previous=s.cam;
 for(let i=0;i<40;i++){
  Q.update(s,{},dt);
  assert.ok(Math.abs(s.cam-previous)<=340*dt+1e-8);
  assert.equal(s.player.x,planted);
  previous=s.cam;
 }
});
test('a jet settles into its hover continuously across arrival and action changes',()=>{
 const s=Q.create({version:2,checkpoint:4});s.player.x=Q.waves[4].x-75;
 let last=null,landed=false,retargeted=false,lastAct='';
 for(let i=0;i<850;i++){
  Q.update(s,{guard:true},1/120);
  const jet=s.enemies.find(n=>n.kind==='jet');if(!jet)continue;
  if(!jet.entry){
   landed=true;
   if(last!==null)assert.ok(Math.abs(jet.z-last)<.32);
   if(lastAct&&jet.act!==lastAct)retargeted=true;
   lastAct=jet.act;
  }
  last=jet.z;
 }
 assert.ok(landed&&retargeted);
});
test('cargo crates take one hit per swing on their lane and drop points that must be collected',()=>{
 const s=Q.create(),p=s.player,box=s.supplies[0];p.x=box.x-48;p.y=box.y-50;
 advance(s,52,{attack:'uppercut'});assert.equal(box.hp,18);
 p.y=box.y;p.face=-1;advance(s,52,{attack:'uppercut'});assert.equal(box.hp,18);
 p.face=1;Q.update(s,{attack:'jab'},1/120);advance(s,45);assert.equal(box.hp,9);
 Q.update(s,{attack:'kick'},1/120);advance(s,65);assert.equal(box.hp,0);assert.equal(s.score,0);
 advance(s,30,{right:true});assert.equal(s.score,250);assert.equal(box.taken,true);
 advance(s,120,{attack:'jab'});assert.equal(s.score,250);
});
test('the medical drop stays available at full health and heals only once up to the maximum',()=>{
 const s=Q.create(),p=s.player,box=s.supplies[1];p.x=box.x-23;p.y=box.y;
 advance(s,55,{attack:'uppercut'});advance(s,20);
 assert.equal(box.hp,0);assert.equal(box.taken,false);
 p.hp=93;advance(s,1);assert.equal(p.hp,100);assert.equal(box.gained,7);assert.equal(box.taken,true);
 p.hp=50;advance(s,1);assert.equal(p.hp,50);
});
test('checkpoint restores broken, collected and intact supplies together with their score',()=>{
 const s=Q.create(),box=s.supplies[0];s.player.x=box.x-12;s.player.y=box.y;
 advance(s,72,{attack:'kick'});assert.equal(s.score,250);
 assert.equal(Q.create(Q.checkpoint(s)).supplies[0].taken,false);
 const kit=s.supplies[1];s.player.x=kit.x-12;s.player.y=kit.y;
 advance(s,100,{attack:'uppercut'});assert.equal(kit.hp,0);assert.equal(kit.taken,false);
 s.wave=1;s.locked=true;s.enemies=[];s.pending=[];Q.update(s,{},1/120);
 const saved=Q.checkpoint(s);assert.equal(saved.checkpoint,2);
 const restored=Q.create(JSON.parse(JSON.stringify(saved)));
 assert.equal(restored.score,s.score);assert.equal(restored.supplies[0].taken,true);
 assert.equal(restored.supplies[1].hp,0);assert.equal(restored.supplies[1].taken,false);
 assert.equal(restored.supplies[2].hp,Q.supplies.cargo.hp);
});
test('district triples the playable walk to Varela and restores both versions of each checkpoint',()=>{
 const start=Q.create().player.x;
 assert.equal(Q.waves.at(-1).x-80-start,3*(2690-80-start));
 assert.equal(Q.zones.length,9);assert.equal(Q.waves.length,18);
 assert.deepEqual(Q.waves.map(w=>w.cast[0].kind).filter(k=>Q.foes[k].boss),['blackWolf','gunner','scientist']);
 for(const checkpoint of [0,2,4]){const restored=Q.create({checkpoint,score:857});assert.equal(restored.wave,checkpoint*3);assert.equal(restored.checkpointScore,857);}
 assert.equal(Q.create({version:2,checkpoint:15}).wave,0);
});
test('all entrances move continuously from their source and waves wait for staggered arrivals',()=>{
 const seen=new Set();
 for(const [index,wave] of Q.waves.entries()){
  const s=Q.create();s.wave=index;s.cam=Math.min(Q.maxCam,Math.max(0,wave.x-460));s.player.x=wave.x-79;
  Q.update(s,{},1/120);assert.ok(s.locked);assert.equal(s.enemies.length,0);assert.equal(s.pending.length,wave.cast.length);
  const arrivals=new Map();
  for(let frame=0;frame<500;frame++){
   Q.update(s,{},1/120);
   for(const n of s.enemies)if(n.entry&&!arrivals.has(n.id)){
    const e=n.entry;arrivals.set(n.id,frame);seen.add(e.route);assert.ok(e.t<.02);
    if(e.route==='right')assert.ok(e.fromX>s.cam+960);
    if(e.route==='left')assert.ok(e.fromX<s.cam);
    if(e.route==='air')assert.ok(n.z>500);
    if(e.route==='hatch'||e.route==='shutter')assert.deepEqual({x:e.fromX,y:e.fromY},Q.portal(wave,e.route));
   }
   if(arrivals.size===wave.cast.length&&s.enemies.every(n=>!n.entry))break;
  }
  assert.equal(arrivals.size,wave.cast.length);assert.equal(new Set(arrivals.values()).size,wave.cast.length);
  assert.ok(s.enemies.every(n=>!n.entry));assert.ok(s.locked);
 }
 assert.equal(seen.size,5);
});
test('both lieutenants telegraph different attacks and leave a punish window',()=>{
 for(const [wave,kind] of [[5,'blackWolf'],[11,'gunner']]){
  const s=Q.create();s.wave=wave;s.player.x=Q.waves[wave].x-75;s.player.y=355;
  const phases=new Set();
  for(let t=0;t<600;t++){
   Q.update(s,{guard:true},1/120);
   const n=s.enemies[0];if(!n)continue;
   assert.equal(n.kind,kind);
   if(n.wind>0)phases.add('wind');
   if(n.dash>0)phases.add('dash');if(n.stun>0)phases.add('recover');
   if(n.volley>0)phases.add('volley');if(n.overheat>0)phases.add('recover');
  }
  assert.deepEqual([...phases],['wind',kind==='blackWolf'?'dash':'volley','recover']);
 }
});
test('fighter can clear every wave using normal movement and attacks, including both boss phases',()=>{
 const s=Q.create(),events=new Set(),checkpoints=[];
 for(let i=0;i<120*360&&s.mode==='play';i++){
  const p=s.player,d=n=>Math.abs(n.x-p.x)+2*Math.abs(n.y-p.y);
  const n=s.enemies.filter(n=>n.hp>0&&!n.entry&&!n.morph).sort((a,b)=>d(a)-d(b))[0],dx=n?n.x-p.x:999,dy=n?n.y-p.y:0;
  const input={right:dx>23,left:dx< -23,up:dy< -5,down:dy>5,attack:n&&Math.abs(dx)<88&&Math.abs(dy)<22?(Math.abs(dx)<56?'uppercut':'kick'):null};
  if(n&&Math.abs(dx)<23&&Math.sign(dx)!==p.face){input.right=dx>0;input.left=dx<0;}
  for(const ev of Q.update(s,input,1/120)){events.add(ev);if(ev==='checkpoint')checkpoints.push(Q.checkpoint(s));}
 }
 assert.equal(s.player.kind,'fighter');assert.equal(s.mode,'won',JSON.stringify({wave:s.wave,hp:s.player.hp}));assert.equal(s.clears,18);
 for(const event of ['hurt','hit','morph','roar','checkpoint','clear'])assert.ok(events.has(event),event);
 assert.deepEqual(checkpoints.map(cp=>Q.create(cp).wave),[2,4,6,8,10,12,14,16]);
});
test('street attacks have different windups, ranges and effects and cannot hit from another lane',()=>{
 const moves=['jab','cross','uppercut','kick','sweep','airkick'];
 for(const name of moves){const m=Q.moves[name];assert.ok(m.impact>0&&m.impact<m.duration);assert.ok(m.reach&&m.damage);}
 assert.equal(new Set(moves.map(name=>Q.moves[name].duration)).size,6);
 const s=Q.create();s.player.x=399;for(let i=0;i<120;i++)Q.update(s,{},1/120);const foe=s.enemies[0];foe.x=s.player.x+24;foe.y=423;foe.stun=4;
 for(let i=0;i<60;i++)Q.update(s,{attack:'kick'},1/120);assert.equal(foe.hp,foe.maxHp);
});
test('Centella is a persistent profile unlock with fuel-free flight, eye rays and reflected hostile rounds',()=>{
 const data=new Map(),store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},profile=Progress.load(store);
 const p=P.createPlayer(),e=require('../mission-combat').create(A.createInventory());
 assert.ok(!Z.forms(p,true).includes('hero'));profile.heroUnlocked=true;Progress.save(profile,store);
 Progress.apply(Progress.load(store),p,e,true);assert.ok(Z.change(e,p,'hero'));
 p.fuel=0;const floor=[{x:0,y:p.y,w:2000,kind:'ground',thickness:30}],y=p.y;
 P.step(p,{jetpackPressed:true,up:true},1/60,floor);for(let i=0;i<30;i++)P.step(p,{up:true},1/60,floor);
 assert.equal(A.movementInput(p,{fire:true,up:true}).up,true);assert.ok(p.heroFlight&&p.y<y-50);assert.equal(p.fuel,0);P.step(p,{jetpackPressed:true},1/60,floor);assert.equal(p.heroFlight,false);
 const ammo=JSON.stringify(e.inventory.ammo),ray=A.fire(e.inventory,p).bullets[0];assert.ok(ray.eyeRay&&ray.y<p.y-35);assert.equal(JSON.stringify(e.inventory.ammo),ammo);
 const shot={enemy:true,vx:-230,vy:4,life:0};assert.ok(A.reflect(p,shot));assert.equal(shot.enemy,false);assert.equal(shot.vx,230);assert.ok(shot.life>0);
 assert.equal(A.reflect(p,shot),false);assert.equal(A.reflect(p,{enemy:true,tankMissile:true}),false);
});
