const test=require('node:test'),assert=require('node:assert/strict'),M=require('../mall-world'),P=require('../physics'),C=require('../mission-combat'),V=require('../powers'),N=require('../enemies'),A=require('../mall-arcade'),Campaign=require('../campaign');
const setup=(floor=0)=>{const s=M.create({floor,started:true}),p=P.createPlayer(),e=C.create({owned:[1,3],selected:3,ammo:{3:200}});p.form='soldier';M.configure(s,p,e);return{s,p,e};};
test('three broad floors and roof leave ground clear below optional decks, with finite soldier timers',()=>{const {s,p,e}=setup();assert.deepEqual(M.widths,[5400,4800,4600,960]);assert.equal(p.y,472);assert.equal(e.enemies.length,11);assert.ok(e.enemies.every(n=>Number.isFinite(n.shot)));assert.ok(s.geometry.platforms.filter(n=>n.kind!=='ground').every(n=>!n.solid&&n.y<400));});
function advance({s,p,e},count,input={},dt=1/120){
 const events=[];
 for(let i=0;i<count;i++){
  M.stepPlayer(s,p,input,dt);events.push(...M.update(s,p,e,input,dt));
 }
 return events;
}
function atStair(floor,distance,form='soldier'){
 const game=setup(floor),{s,p,e}=game,st=M.escalator(floor);
 s.x=st.lower+distance;s.y=M.treadY(st,s.x);M.configure(s,p,e);p.form=form;
 return {...game,st};
}
test('stepping on a belt boards immediately and each open landing changes floors once',()=>{
 for(let floor=0;floor<3;floor++){
  const game=atStair(floor,-70),{s,p,e,st}=game;
  advance(game,15);assert.equal(p.x,st.entry-2);
  advance(game,10,{right:true});assert.ok(p.x>st.entry);assert.equal(M.interact(s,p),null);
  e.bullets.push({x:0});const events=advance(game,570);
  assert.equal(s.floor,floor+1);assert.equal(s.checkpoint,s.floor);
  assert.equal(events.filter(v=>v.type==='checkpoint').length,1);assert.equal(e.bullets.length,0);
  assert.ok(Math.abs(p.x-M.landingX)<2);assert.equal(p.y,M.FLOOR);
 }
});
test('Arcade entry still requires proximity, ground and no burrow; saves restore the current tread',()=>{
 const game=atStair(0,96),{s,p,e,st}=game;
 advance(game,12);const saved=M.snapshot(s,p),loaded=M.create(saved);M.configure(loaded,p,e);
 assert.equal(p.x,saved.x);assert.equal(p.y,M.treadY(st,p.x));assert.ok(p.grounded);
 assert.equal(M.interact(loaded,p),null);p.x=980;assert.equal(M.interact(loaded,p),'arcade');
 p.grounded=false;assert.equal(M.interact(loaded,p),null);p.grounded=true;p.burrow={};assert.equal(M.interact(loaded,p),null);
 const legacy=M.create({...saved,y:M.FLOOR});M.configure(legacy,p,e);assert.equal(p.y,M.treadY(st,p.x));
});
test('giant waits for rooftop arrival, remains stationary and ignores generic contact AI',()=>{const {s,p,e}=setup(3);for(let i=0;i<120;i++)M.update(s,p,e,{},1/60);assert.equal(s.boss.active,false);p.x=300;M.update(s,p,e,{},.01);assert.equal(s.boss.active,true);assert.equal(e.enemies.length,0);for(let i=0;i<170;i++)M.update(s,p,e,{},1/60);assert.equal(e.enemies[0],s.boss);const x=s.boss.x,y=s.boss.y;N.update(e.enemies,p,.03,s.geometry.platforms,e.bullets,()=>null);assert.equal(s.boss.x,x);assert.equal(s.boss.y,y);assert.equal(N.contact(s.boss,p,[],()=>null),false);});
test('giant cycles telegraphed attacks; jumping avoids a ground wave',()=>{const {s,p,e}=setup(3);p.x=300;e.invincible=999;const phases=new Set();for(let i=0;i<1800;i++){M.update(s,p,e,{},1/60);phases.add(s.boss.phase);}for(const id of ['arrival','fistWarn','fist','sweepWarn','sweep','rocksWarn','rocks','recover'])assert.ok(phases.has(id),id);e.invincible=0;p.y=350;s.hazards=[{type:'wave',x:p.x,age:0,life:1,radius:30}];const hp=e.hp;M.update(s,p,e,{},.01);assert.equal(e.hp,hp);p.y=472;e.invincible=0;M.update(s,p,e,{},.01);assert.ok(e.hp<hp);});
test('shared bullets, fighter melee and wolf ram can damage stationary torso',()=>{const {s,p,e}=setup(3);s.boss.active=true;s.boss.phase='recover';e.enemies=[s.boss];p.x=540;p.aim={x:1,y:0};const power=V.create(),profile={owned:[],levels:{}};let before=s.boss.hp;for(let i=0;i<60;i++)C.update(e,p,{fire:true},1/120,s.geometry.platforms,power,profile,{left:0,right:960,top:0,bottom:540});assert.ok(s.boss.hp<before);p.form='fighter';e.cooldown=0;p.x=560;before=s.boss.hp;for(let i=0;i<50;i++)C.update(e,p,{kick:true},1/120,s.geometry.platforms,power,profile,{left:0,right:960,top:0,bottom:540});assert.ok(s.boss.hp<before);assert.ok(p.fighterKick);p.form='wolf';p.x=570;p.vx=220;p.sprinting=true;p.grounded=true;p.hurt=0;before=s.boss.hp;N.ram(e,p,{fire:true},.016,s.geometry.platforms,()=>null);assert.ok(s.boss.hp<before);assert.equal(s.boss.ramHit,undefined);});
test('defeat is rewarded once and final resumes without resurrecting boss',()=>{const {s,p,e}=setup(3);s.boss.active=true;s.boss.hp=0;e.dead=true;e.hp=0;const events=M.update(s,p,e,{},.01);assert.equal(e.dead,false);assert.ok(events.some(v=>v.amount===8500));const copy=M.create(M.snapshot(s,p));assert.equal(copy.floor,3);assert.equal(copy.boss.hp,0);assert.equal(copy.ending,0);let awards=0;for(let i=0;i<700;i++)awards+=M.update(copy,p,e,{},1/60).filter(v=>v.type==='points').length;assert.equal(awards,0);assert.equal(copy.complete,true);});
test('checkpoint retry keeps defeated enemies, loot and stars but resets giant encounter',()=>{const {s,p}=setup(2);s.awarded.add('mall-2-1');s.taken.add('2-kit');s.stars.add('2-star');const next=M.retry(s);assert.equal(next.floor,2);assert.equal(next.x,140);assert.equal(next.enemies[1].hp,0);assert.ok(next.taken.has('2-kit'));assert.ok(next.stars.has('2-star'));});
test('mission six transfer retains loadout and forms',()=>{const data=new Map(),store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};Campaign.transferSix(store,{form:'fighter',fighterUnlocked:true},{hp:2,inventory:{owned:[3],ammo:{3:5}}},{total:200},{cooldowns:{}});assert.equal(Campaign.read(store).level,6);assert.equal(Campaign.read(store).fighterUnlocked,true);});
test('original maze has reachable circuits, winning and collision defeat',()=>{const s=A.create('maze'),seen=new Set(['1,1']),queue=[[1,1]];while(queue.length){const [x,y]=queue.shift();for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(A.maze[ny]?.[nx]==='.'&&!seen.has(key)){seen.add(key);queue.push([nx,ny]);}}}assert.ok([...s.dots].every(x=>seen.has(x)));s.dots=new Set(['2,1']);A.update(s,{right:true},.016);assert.ok(s.won);const t=A.create('maze');t.lives=1;t.safe=0;t.enemyWait=10;t.moveWait=10;t.sentries=[{x:1,y:1}];A.update(t,{},.016);assert.equal(t.over,true);assert.equal(t.won,false);});
test('pinball launching, bumper scoring, independent flippers and draining three balls',()=>{const s=A.create('pinball');A.update(s,{jumpPressed:true},.01);assert.ok(s.ball.vy<0);s.ball={x:150,y:180,vx:0,vy:-100};A.update(s,{},.01);assert.ok(s.score>=100);s.ball={x:175,y:449,vx:0,vy:100};A.update(s,{left:true},.01);assert.ok(s.ball.vy<0);assert.equal(s.right,false);s.lives=1;s.ball={x:240,y:536,vx:0,vy:150};A.update(s,{},.01);assert.ok(s.over);});
test('racer steering, collision invulnerability and finish line',()=>{const s=A.create('race');A.update(s,{left:true,up:true},.02);assert.ok(s.x<240);s.cars=[{x:s.x,y:430}];A.update(s,{},.01);assert.equal(s.lives,2);s.cars=[{x:s.x,y:430}];A.update(s,{},.01);assert.equal(s.lives,2);s.distance=8999;A.update(s,{up:true},.03);assert.ok(s.won);});

test('every skin can ride, jump onto the moving incline and walk back off at the foot',()=>{
 for(const form of ['soldier','wolf','zombie','robot','tank','fighter','hero']){
  for(const floor of [0,1,2]){
   const game=atStair(floor,82,form),{s,p,st}=game,initial=p.x;
   advance(game,36);
   assert.ok(Math.abs(p.x-initial-st.speed*.3)<1e-6);assert.ok(p.grounded&&p.form===form);
   assert.ok(Math.abs(p.y-M.treadY(st,p.x))<1e-6);
   advance(game,1,{jumpPressed:true,left:true});advance(game,18,{left:true});
   assert.ok(!p.grounded&&p.y<M.treadY(st,p.x)-20);
   for(let i=0;i<150&&!p.grounded;i++)advance(game,1,{left:true});
   assert.ok(p.grounded&&Math.abs(p.y-M.treadY(st,p.x))<1e-6);
   advance(game,480,{left:true,run:true});
   assert.ok(p.x<st.entry&&p.y===M.FLOOR&&s.floor===floor&&p.facing===-1);
  }
 }
});
test('landings work in both directions, including an airborne crossing and return from the roof',()=>{
 for(const floor of [0,1,2]){
  const game=atStair(floor,350),{s,p,st}=game,guards=s.enemies;
  guards[0].hp=1;advance(game,1,{jumpPressed:true,right:true});
  for(let i=0;i<90&&s.floor===floor;i++)advance(game,1,{right:true});
  assert.equal(s.floor,floor+1);assert.ok(!p.grounded&&p.y<M.FLOOR&&p.vy<0);
  const checkpoint=M.snapshot(s,p);assert.equal(checkpoint.floor,floor+1);
  for(let i=0;i<240&&s.floor!==floor;i++)advance(game,1,{left:true});
  assert.equal(s.floor,floor);assert.equal(s.checkpoint,floor);assert.equal(s.enemies,guards);assert.equal(guards[0].hp,1);
  assert.ok(p.x<=st.exit-17&&p.facing===-1);advance(game,60,{left:true});assert.equal(s.floor,floor);
 }
});
test('flying high against a screen edge does not change floors, and recoil alone cannot send the player downstairs',()=>{
 const {s,p,e,st}=atStair(1,350,'hero');
 Object.assign(p,{x:st.exit+1,y:65,grounded:false,heroFlight:true});
 M.update(s,p,e,{right:true},1/120);assert.equal(s.floor,1);
 Object.assign(p,{x:M.landingX-24,vx:-100});
 M.update(s,p,e,{left:true},1/120);assert.equal(s.floor,1);
 p.y=M.FLOOR;M.update(s,p,e,{},1/120);assert.equal(s.floor,1);
 M.update(s,p,e,{left:true},1/120);assert.equal(s.floor,0);
});
test('the rocks leave the rooftop giant and land at the warning marks',()=>{
 const {s,p,e}=setup(3);p.x=240;e.invincible=999;
 Object.assign(s.boss,{active:true,phase:'rocksWarn',age:1.5,targets:[240,430]});
 M.update(s,p,e,{},1/120);
 assert.equal(s.hazards.length,2);
 assert.ok(s.hazards.every(h=>h.y<185&&Math.abs(h.x-s.boss.x)<60));
 for(let i=0;i<200&&!s.debris.length;i++)M.update(s,p,e,{},1/120);
 assert.equal(s.debris.length,2);assert.ok(s.debris.every((d,i)=>Math.abs(d.x-[240,430][i])<5));
});
