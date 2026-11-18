const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../city-tank'),C=require('../mission-combat'),P=require('../physics'),A=require('../arsenal'),V=require('../powers'),U=require('../progression');
test('tank waits for approach, patrols continuously in both directions and telegraphs two weapons',()=>{
 const t=T.create(),bullets=[],explosions=[],p={x:200,y:620};T.update(t,p,10,bullets,explosions);assert.equal(t.active,false);assert.equal(t.x,4050);assert.equal(bullets.length,0);p.x=3700;
 let left=false,right=false;for(let i=0;i<2400;i++){const x=t.x;T.update(t,p,1/120,bullets,explosions);assert.ok(Math.abs(t.x-x)<=62/120+1e-8);assert.ok(t.x>=T.LEFT&&t.x<=T.RIGHT);assert.equal(t.y,620);left ||= t.x<x;right ||= t.x>x;if(i<120)assert.equal(bullets.length,0);}
 assert.ok(left&&right);assert.ok(bullets.some(b=>b.tankShell));assert.ok(bullets.filter(b=>b.tankMissile).length>=2);
});
test('missiles rise then steer toward a launch-time target and stop homing',()=>{const b={x:4050,y:518,vx:-75,vy:-175,tankMissile:true,age:0,target:{x:3600,y:600}};T.steer(b,.2);assert.equal(b.vy,-175);for(let i=0;i<80;i++)T.steer(b,.01);assert.ok(b.vy>0);T.steer(b,.3);const vx=b.vx;T.steer(b,.1);assert.equal(b.vx,vx);});
test('destroyed tank chains seven timed blasts, launches turret at the main blast and never repeats on reload',()=>{
 const t=T.create(),bullets=[],effects=[],p={x:4000,y:620};T.damage(t,100);T.update(t,p,.01,bullets,effects);assert.equal(effects.length,1);assert.equal(t.fragments.length,3);
 T.update(t,p,.2,bullets,effects);assert.equal(effects.length,2);assert.equal(t.fragments.length,3);
 T.update(t,p,.22,bullets,effects);assert.equal(effects.length,3);assert.equal(t.fragments.length,5);assert.ok(effects[2].radius>effects[1].radius*1.5);assert.ok(t.fragments.filter(f=>f.id>=3).every(f=>f.vy<= -260));
 for(let i=0;i<400;i++)T.update(t,p,.01,bullets,effects);assert.equal(effects.length,7);assert.equal(bullets.length,0);assert.equal(t.speed,0);assert.equal(t.x,4050);assert.equal(t.y,620);
 assert.ok(effects.every(b=>b.floorY===620&&b.duration>=1.15));
 const restored=T.create({x:t.x,hp:0});T.update(restored,p,3,[],effects);assert.equal(restored.hp,0);assert.equal(effects.length,7);assert.equal(restored.fragments.length,0);
});
function fixture(){const e=C.create(A.createInventory()),p=Object.assign(P.createPlayer(),{x:3800,y:620,aim:{x:1,y:0},form:'soldier'}),powers=V.create(),profile=U.fresh();e.tank=T.create();e.tank.frozen=100;return{e,p,powers,profile,tick(input={},dt=.01){return C.update(e,p,input,dt,[{x:0,y:620,w:18000,kind:'ground',thickness:36}],powers,profile);}};}
test('player projectiles hit the full tank hull and powers damage the same boss',()=>{const f=fixture();f.tick({fire:true});for(let i=0;i<80;i++)f.tick();assert.equal(f.e.tank.hp,47);f.p.x=3950;f.profile.owned=['wave'];f.profile.equipped='wave';f.tick({power:true});assert.equal(f.e.tank.hp,43);});
test('tank ordnance damages the player once and a shield absorbs one impact',()=>{for(const shield of [0,1]){const f=fixture();f.e.tank=null;f.p.shield=shield;f.e.bullets=[{x:3820,y:595,vx:-310,vy:0,age:0,life:2,enemy:true,tankShell:true,damage:2}];f.tick({},.1);assert.equal(f.e.hp,shield?8:6);assert.equal(f.p.shield,0);assert.equal(f.e.explosions.length,1);}});
test('tank loses armor in stages, throws each component once and restores damage from saved health',()=>{
 const t=T.create(),p={x:0,y:620};for(const [hp,stage,count]of [[35,1,1],[23,2,2],[11,3,3],[0,4,3]]){t.hp=hp;T.update(t,p,.01,[],[]);assert.equal(T.stage(t),stage);assert.equal(t.fragments.length,count);T.update(t,p,.01,[],[]);assert.equal(t.fragments.length,count);const restored=T.create({hp});T.update(restored,p,.01,[],[]);assert.equal(restored.damageStage,stage);assert.equal(restored.fragments.length,0);}
 for(let i=0;i<400;i++)T.update(t,p,.01,[],[]);assert.equal(t.fragments.length,5);assert.ok(t.fragments.every(f=>f.settled&&f.y<t.y&&f.bounces===1));
});
test('crew telegraphs a single ballistic grenade, retracts and cancels on tank death',()=>{
 const t=T.create(),b=[],p={x:3800,y:620};t.crewCooldown=0;T.update(t,p,.01,b,[]);assert.equal(T.crewPose(t).frame,0);assert.equal(b.length,0);const x=t.x;
 for(let i=0;i<120;i++)T.update(t,p,.01,b,[]);assert.equal(b.length,0);assert.equal(t.x,x);
 for(let i=0;i<10;i++)T.update(t,p,.01,b,[]);assert.equal(b.filter(s=>s.tankGrenade).length,1);assert.ok(b[0].vx<0&&b[0].vy<0&&Number.isFinite(b[0].vx));
 for(let i=0;i<100;i++)T.update(t,p,.01,b,[]);assert.equal(t.crewAge,null);assert.equal(b.filter(s=>s.tankGrenade).length,1);
 t.crewCooldown=0;T.update(t,p,.1,b,[]);t.hp=0;T.update(t,p,2,b,[]);assert.equal(T.crewPose(t),null);assert.equal(b.filter(s=>s.tankGrenade).length,1);
});
test('crew grenades detonate after bouncing, hurt only the player once and respect shields',()=>{
 for(const shield of [0,1]){const f=fixture();f.p.shield=shield;f.e.bullets=[{x:f.p.x,y:615,vx:0,vy:40,gravity:420,life:.04,age:2.26,enemy:true,tankGrenade:true,slot:9,damage:2}];const hp=f.e.tank.hp;
  f.tick({},.05);assert.equal(f.e.hp,shield?8:6);assert.equal(f.p.shield,0);assert.equal(f.e.tank.hp,hp);assert.equal(f.e.explosions.length,1);assert.equal(f.e.explosions[0].kind,'grenade');f.tick({},.1);assert.equal(f.e.hp,shield?8:6);
 }
 const t=T.create(),bullets=[];t.crewCooldown=0;T.update(t,{x:3800,y:200},1.3,bullets,[]);assert.ok(bullets.filter(b=>b.tankGrenade).every(b=>Number.isFinite(b.vx)));
});
test('exposed crew can be hit above the hull, but not while under cover',()=>{
 for(const exposed of [true,false])for(const height of [108,119]){const f=fixture();f.e.tank.crewAge=exposed?.8:null;f.e.tank.facing=-1;f.e.bullets=[{x:4070,y:620-height*T.SIZE,vx:500,vy:0,slot:3,damage:1,life:1}];f.tick({},.1);assert.equal(f.e.tank.hp,exposed&&height===108?47:48);}
});
test('enlarged hull, muzzle and crew share the same scale, with smooth motion and grounded wreck',()=>{
 const t=T.create(),p={x:3700,y:620},bullets=[],effects=[];assert.equal(t.w,184*1.35);assert.equal(T.box(t).thickness,102*1.35);
 let previousSpeed=0;for(let i=0;i<181;i++){T.update(t,p,1/120,bullets,effects);assert.ok(Math.abs(t.speed-previousSpeed)<2);previousSpeed=t.speed;assert.ok(Math.abs(T.motion(t).bob)<=.65);}
 const shell=bullets.find(b=>b.tankShell);assert.ok(shell);assert.ok(Math.abs(shell.y-(620-79*T.SIZE))<=.65*T.SIZE);assert.ok(Math.abs(shell.x-t.x)>=100*T.SIZE-1);
 t.flash=.25;assert.ok(T.motion(t).recoil>3);t.flash=.001;assert.ok(T.motion(t).recoil<1);
 t.hp=0;t.deathAge=2;const m=T.motion(t);assert.equal(m.bob,0);assert.equal(m.recoil,0);assert.equal(m.sink,1);assert.equal(t.y,620);
});

test('crew hitbox and grenade follow the roof hatch in both directions and through recoil',()=>{
 for(const facing of [-1,1]){
  const t=T.create();Object.assign(t,{facing,crewFacing:facing,crewAge:1.24,active:true,crewThrown:false,flash:.25});
  const center=T.mount(t,T.HATCH.x,T.HATCH.y),box=T.crewBox(t);
  assert.equal(box.x+box.w/2,center.x);assert.equal(box.y+box.thickness,center.y);
  const bullets=[];T.update(t,{x:t.x+facing*350,y:620},.02,bullets,[]);
  const grenade=bullets.find(b=>b.tankGrenade),hand=T.grenadeOrigin(t);assert.ok(grenade);
  assert.equal(grenade.x,hand.x);assert.equal(grenade.y,hand.y);assert.equal(Math.sign(grenade.vx),facing);
  t.crewAge=null;assert.equal(T.crewBox(t),null);
 }
});

test('detached steel components settle on their own silhouette in either facing direction',()=>{
 for(const facing of [-1,1]){const t=T.create();t.facing=facing;T.damage(t,100);for(let i=0;i<840;i++)T.update(t,{x:0,y:620},1/120,[],[]);
 assert.equal(t.fragments.length,5);assert.equal(new Set(t.fragments.map(f=>f.id)).size,5);
 for(const f of t.fragments){assert.ok(f.settled);assert.ok(Math.abs(f.y+T.fragmentSupport(f)-620)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(f.angle-T.FRAGMENTS[f.id].rest*facing),Math.cos(f.angle-T.FRAGMENTS[f.id].rest*facing)))<1e-8);}
 const turret=t.fragments.find(f=>f.id===3),barrel=t.fragments.find(f=>f.id===4);assert.ok(Math.abs(turret.x-t.x)<Math.abs(barrel.x-t.x));
 }
});
