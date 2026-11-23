(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,P=common?require('./physics'):root.ArcadePhysics,N=common?require('./enemies'):root.ArcadeEnemies,E=common?require('./encounter'):root.ArcadeEncounter;
 const Cars=common?require('./wrecked-cars'):root.ArcadeWreckedCars;
 const patrolPositions=[505,1960,3850],damagedSpeed=[.42,.28,.18,0];
 const FLOOR=472,widths=[6000,5400,960],names=['Manhattan · Cruces bajo fuego','Midtown · Línea policial','La última plaza · El Comandante'];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d)=>Number.isFinite(v)?v:d;
 const blockWidth=1200,crossings=[1250,1250+blockWidth,1250+3*blockWidth],posts=[720,2115,3990],checkpoints=[1900,3700];
 // Landmarks measured on 900 × 600 reference views of the two painted panoramas.
 const districts=[
  {vanishing:.502,base:912,curb:517,signal:[253,423.5],awnings:[[822,434,48],[7,414,40],[705,428,51]]},
  {vanishing:.487,base:919,curb:523,signal:[627,424.5],awnings:[[849,419,40],[5,409,87],[735,426,64]]}
 ];
 function panorama(floor){
  const d=districts[floor],height=Math.round(blockWidth*1024/(floor===0?1535:1536));
  return {width:blockWidth,height,top:FLOOR-Math.round(d.base*height/1024),origin:crossings[0]-Math.round(blockWidth*d.vanishing)};
 }
 function geometry(floor){
  const platforms=[{id:'ny-ground',x:0,y:FLOOR,w:widths[floor],kind:'ground',thickness:68}];
  let curb=FLOOR;
  if(floor<2){
   const map=panorama(floor);
   curb=Math.round(map.top+districts[floor].curb*map.height/600);
   for(const [i,x] of posts.entries())platforms.push({id:'police-cover-'+i,x:x-51,y:curb-37,w:102,kind:'barricade',solid:true,thickness:37});
   for(const [i,[left,top,width]] of districts[floor].awnings.entries()){
    platforms.push({id:'ny-awning-'+i,x:map.origin+[0,2,3][i]*blockWidth+left*blockWidth/900,
     y:map.top+top*map.height/600,w:width*blockWidth/900,kind:'deck',thickness:6});
   }
  }
  return {platforms,curb,anchors:[],ladders:[]};
 }
 function soldiers(floor,defeated,difficulty){if(floor===2)return[];return Array.from({length:15},(_,i)=>{const kind=i%5===3?'cityGrenadier':i%3===1?'cityAssault':i%5===4?'turret':'rifle',n=N.createSoldier({x:920+i*295,y:FLOOR,kind,facing:-1,grenadier:kind==='cityGrenadier'},'ny-'+floor+'-'+i);n.hp=n.maxHp=(kind==='cityAssault'?5:kind==='cityGrenadier'?6:3)*difficulty;if(defeated.has(n.id))n.hp=0;n.shot=1.4;n.age=0;return n;});}
 function streetHp(health,id,max){return Number.isFinite(health[id])?clamp(Math.ceil(health[id]),0,max):max;}
 function makeAllies(floor,recruited,health){
  const ids=floor===2?[...recruited].filter(id=>streetHp(health,id,4)>0).slice(-2):posts.map((_,i)=>'police-'+floor+'-'+i);
  return ids.map((id,i)=>Object.assign(P.createPlayer(),{id,x:floor===2?75-i*35:posts[i]-85,y:FLOOR,
   joined:recruited.has(id),hp:streetHp(health,id,4),maxHp:4,hits:new Set(),hit:0,death:0,flash:0,shot:1,variant:Number(id.slice(-1))%2}));
 }
 function create(saved={},difficulty=1){const complete=!!saved.complete,ending=complete?5.2:saved.ending?clamp(num(saved.endingTime,0),0,5.2):-1,floor=ending>=0?2:clamp(Math.floor(num(saved.floor,0)),0,2),awarded=new Set(saved.awarded||[]),recruited=new Set(saved.recruited||[]),taken=new Set(saved.taken||[]);
  const streetHealth={...saved.streetHealth};
  const districtLoot=[0,1].map(zone=>makeDistrictLoot(zone,taken,saved.pickupTypes?.[zone]));
  const activePickup=districtLoot[floor]?.find(item=>item.id===saved.activePickupId)||null;
  return{floor,x:clamp(num(saved.x,140),40,widths[floor]-40),y:clamp(num(saved.y,FLOOR),60,FLOOR),time:Math.max(0,num(saved.trafficTime,0)),intro:saved.started?4:0,travel:-1,ending,complete,difficulty,checkpoint:floor,checkpointX:clamp(num(saved.checkpointX,140),40,widths[floor]-40),camera:{x:0,y:0},events:[],awarded,recruited,taken,districtLoot,activePickup,stars:new Set(saved.stars||[]),hazards:[],debris:[],traffic:[],parked:[],vehicleDamage:restoreDamage(saved.vehicleDamage),trafficWait:2,geometry:geometry(floor),enemies:soldiers(floor,awarded,difficulty),barriers:[],streetHealth,streetSounds:[],allies:makeAllies(floor,recruited,streetHealth),supplyAge:0,boss:{id:'ny-commander',kind:'cityBoss',x:720,y:FLOOR,w:32,h:59,hp:ending>=0?0:90*difficulty,maxHp:90*difficulty,active:false,invulnerable:false,stage:ending>=0?2:1,phase:'arrival',age:0,anim:0,hit:0,frozen:0,sticky:0,targets:[],facing:-1,shot:0,shots:0,robotX:800}};}
 function configure(s,p,e){Object.assign(P.WORLD,{top:0,width:widths[s.floor],height:540,ground:FLOOR});s.geometry=geometry(s.floor);Object.assign(p,{x:s.x,y:s.y,vx:0,vy:0,grounded:s.y===FLOOR,ground:s.y===FLOOR?s.geometry.platforms[0]:null,fallPeak:s.y,jumps:0,rope:null,ladder:null,jetpack:false,heroFlight:false,burrow:null,submersible:false,swimming:false,onMotorcycle:false,inSeaMission:false});e.enemies=s.enemies;e.bullets=[];e.explosions=[];e.debris=[];e.playerPools=[];e.playerPlasma=[];e.plasmaDrips=[];e.zombieEffects=[];
  prepareBarriers(s);updateVehicles(s,e);s.trafficWarning=s.playerCarHit=null;
  updateCamera(s,p);selectPickup(s,p);e.invincible=2;}
 function cameraLeft(floor,x){return clamp(x-320,0,widths[floor]-960);}
 function updateCamera(s,p){s.camera.x=cameraLeft(s.floor,p.x);s.camera.y=0;}
 const emit=(s,type,data={})=>s.events.push({type,...data});
 function interact(s,p){if(s.floor<2&&s.travel<0&&p.x>widths[s.floor]-260&&p.grounded&&!p.burrow){s.travel=0;return'street';}return null;}
 function enemyUpdate(n,p,dt,bullets,platforms=[]){if(!['cityAssault','cityGrenadier'].includes(n.kind))return false;n.age=(n.age||0)+dt;n.anim+=dt;n.hit=Math.max(0,n.hit-dt);n.flash=Math.max(0,n.flash-dt);if(n.hp<=0){n.death=Math.max(0,n.death-dt);return true;}if(n.frozen>0){n.frozen=Math.max(0,n.frozen-dt);return true;}const dx=p.x-n.x,dy=p.y-n.y;if(Math.abs(dx)>570||Math.abs(dy)>210){n.shot=Math.max(1,n.shot);n.vx=0;return true;}n.facing=dx<0?-1:1;n.vx=Math.abs(dx)>280?n.facing*(n.kind==='cityAssault'?85:35):0;const dir=Math.sign(n.vx),blocked=platforms.some(pl=>pl.solid&&Math.abs(pl.x+pl.w/2-n.x)<pl.w/2+35&&pl.y<n.y);n.speedBonus=n.kind==='cityAssault'?85/145:35/145;P.step(n,{left:dir<0,right:dir>0,jumpPressed:blocked&&n.grounded},dt,platforms);n.shot-=dt;
  if(n.kind==='cityAssault'&&n.shot<=0){const x=n.x+n.facing*22,y=n.y-35;const a=Math.atan2(dy+7,dx);bullets.push({x,y,vx:Math.cos(a)*340,vy:Math.sin(a)*340,life:2,enemy:true,fromSoldier:true});n.burst=(n.burst||0)+1;n.shot=n.burst%3?.16:2.1;n.flash=.22;}return true;
 }
 function trafficAt(time,index,floor=0){
  const clock=time+index*2.3,pass=Math.floor(clock/9),phase=clock-pass*9;
  const outbound=(index+pass+floor)%2===1,sedan=(index+Math.floor(pass/2)+floor)%2===1;
  // Camera-space distance. At depth 1 the wheels pass the player's ground line.
  const depth=1+(outbound?1:-1)*(phase-3)*.88;
  // Continue through the foreground at the tangent speed, without a projection singularity.
  const near=.38,perspective=depth>=near?1/depth:1/near+(near-depth)/(near*near);
  const scale=perspective*clamp(outbound?(9-phase)/1.5:phase/1.1,0,1);
  const horizon=floor===1?415:417,center=crossings[index],y=horizon+(FLOOR-horizon)*scale;
  const w=(sedan?55:57)*scale,h=(sedan?36:39)*scale;
  const x=center+(outbound?25:-25)*scale;
  const visible=w>=1.5&&y-h<540;
  return {id:index+'/'+pass,index,center,phase,x,y,w,h,outbound,sedan,visible,
   active:visible&&Math.abs(depth-1)<=.23,warn:phase>=.7&&phase<2.74,front:depth<1};
 }
 function restoreDamage(saved){
  const damage=new Map();
  for(const [key,record] of Object.entries(saved||{})){
   if(!/^[01]:(patrol|lane):[012]$/.test(key)||!Number.isFinite(record?.hp))continue;
   if(key.includes(':lane:')&&!(Number.isFinite(record.clock)&&record.clock>=0&&Number.isFinite(record.stamp)&&record.stamp>=0))continue;
   damage.set(key,{hp:clamp(record.hp,0,10),clock:record.clock,stamp:record.stamp,hits:new Set()});
  }
  return damage;
 }
 function prepareBarriers(s){
  s.barriers=s.geometry.platforms.filter(pl=>pl.kind==='barricade');
  for(const pl of s.barriers){
   const key=s.floor+':'+pl.id;
   Object.assign(pl,{hp:streetHp(s.streetHealth,key,5),hits:new Set(),fall:1});
   pl.impact=shot=>{
    if(!Cars.hit(pl,shot))return;
    s.streetHealth[key]=pl.hp;
    s.streetSounds.push({type:'streetSound',name:pl.hp?'coverHit':'coverBreak',x:pl.x+pl.w/2});
    if(!pl.hp){pl.fall=0;s.geometry.platforms.splice(s.geometry.platforms.indexOf(pl),1);}
   };
  }
  s.geometry.platforms=s.geometry.platforms.filter(pl=>pl.hp!==0);
 }
 function policeTargets(s){
  return s.allies.filter(a=>a.hp>0).map(a=>({
   get x(){return a.x-a.w/2;},get y(){return a.y-a.h;},w:a.w,thickness:a.h,police:a,
   impact(shot){
    if(!Cars.hit(a,shot))return;
    s.streetHealth[a.id]=a.hp;a.hit=.15;
    s.streetSounds.push({type:'streetSound',name:'hurt',x:a.x});
    if(!a.hp){a.death=1.35;a.flash=0;a.vx=0;s.recruited.delete(a.id);}
   }
  }));
 }
 function updateVehicles(s,e){
  if(s.floor===2){s.traffic=[];s.parked=[];e.streetTargets=policeTargets(s);return;}
  const targets=[];
  function target(key,car,parked){
   const damage=s.vehicleDamage.get(key);
   if(damage&&damage.hp<10){car.hp=damage.hp;car.stage=Cars.stage(damage);}
   if(damage?.hp===0||!parked&&(!car.visible||car.y<445||car.y>501))return;
   // Match the opaque roof of the damaged sprite. The bent hood drops first,
   // while the cabin can still receive a level shot from the soldier's gun.
   let height=car.h;
   if(parked&&car.stage===2)height*=75/78;
   if(!parked&&car.sedan&&car.stage)height*=.91;
   targets.push({x:car.x-car.w*.46,y:car.y-height,w:car.w*.92,thickness:height,
    impact(shot){
     const d=s.vehicleDamage.get(key)||{hp:10,hits:new Set(),clock:parked?undefined:s.time,stamp:parked?undefined:s.time};
     if(!Cars.hit(d,shot))return;
     s.vehicleDamage.set(key,d);car.hp=d.hp;car.stage=Cars.stage(d);
     if(!d.hp){s.streetSounds.push({type:'streetSound',name:'explosion',x:car.x});car.active=car.warn=false;s.debris.push({x:car.x,y:car.y,age:0});}
    }});
  }
  s.traffic=crossings.map((_,i)=>{
   const key=s.floor+':lane:'+i,damage=s.vehicleDamage.get(key);
   // A damaged driver brakes through the crossing. Only a wreck closes the lane.
   if(damage){
     const previousPass=Math.floor((damage.clock+i*2.3)/9);
     const speed=damage.hp===10?1:damagedSpeed[Cars.stage(damage)];
     damage.clock+=Math.max(0,s.time-damage.stamp)*speed;
     damage.stamp=s.time;
     if(Math.floor((damage.clock+i*2.3)/9)!==previousPass){damage.hp=10;damage.hits.clear();}
   }
   const car=trafficAt(damage?damage.clock:s.time,i,s.floor);
   if(damage?.hp===0)car.active=car.warn=false;
   target(key,car,false);return car;
  });
  s.parked=patrolPositions.map((x,i)=>{
   const car={x,y:s.geometry.curb+12,w:116,h:43};
   target(s.floor+':patrol:'+i,car,true);return car;
  });
  e.streetTargets=targets.concat(s.barriers.filter(pl=>pl.hp>0),policeTargets(s));
 }
 function meetsCar(car,actor){
  // The street runs into the screen. A distant car can overlap a silhouette
  // on screen while its wheels are still well behind the pedestrian crossing.
  return car.active&&Math.abs(actor.x-car.x)<car.w*.44+(actor.w||24)/2&&
   actor.y>car.y-car.h*.89&&actor.y-(actor.h||46)<car.y;
 }
 function traffic(s,p,e,dt){
  s.trafficWait=Math.max(0,s.trafficWait-dt);
  for(const car of s.traffic){
   if(car.warn&&Math.abs(p.x-car.center)<245&&s.trafficWarning!==car.id){
    s.trafficWarning=car.id;emit(s,'trafficHorn',{x:car.center});
   }
   if(s.trafficWait>0||!car.active)continue;
   if(!p.burrow&&s.playerCarHit!==car.id&&meetsCar(car,p)&&E.hurtPlayer(e,p,car.x,false,2))s.playerCarHit=car.id;
   for(const n of s.enemies)if(n.hp>0&&n.carHit!==car.id&&meetsCar(car,n)){N.damage(n,2);n.carHit=car.id;}
  }
 }
 function allies(s,p,e,dt){for(const [i,a]of s.allies.entries()){
  a.hit=Math.max(0,a.hit-dt);
  if(!a.hp){a.death=Math.max(0,a.death-dt);if(a.death&&!a.grounded)P.step(a,{},dt,s.geometry.platforms);continue;}
  if(!a.joined)a.anim+=dt;a.flash=Math.max(0,a.flash-dt);if(!a.joined&&Math.abs(p.x-a.x)<190){a.joined=true;s.recruited.add(a.id);emit(s,'checkpoint',{text:'¡La policía se une a ti!'});}if(!a.joined)continue;const target=e.enemies.filter(n=>n.hp>0&&!n.invulnerable&&Math.abs(n.x-a.x)<530).sort((u,v)=>Math.abs(u.x-a.x)-Math.abs(v.x-a.x))[0],goal=p.x-65-i*40,dx=goal-a.x;a.facing=target?(target.x<a.x?-1:1):dx<0?-1:1;const blocked=s.geometry.platforms.some(pl=>pl.solid&&Math.abs(pl.x+pl.w/2-a.x)<pl.w/2+45&&pl.y<a.y);P.step(a,{left:dx< -30,right:dx>30,jumpPressed:blocked&&a.grounded},dt,s.geometry.platforms);a.shot=Math.max(0,a.shot-dt);if(target&&a.shot<=0){const x=a.x+a.facing*20,y=a.y-30,d=Math.atan2(target.y-target.h*.55-y,target.x-x);e.bullets.push({x,y,vx:Math.cos(d)*430,vy:Math.sin(d)*430,life:1.3,damage:.7,enemy:false,fromPolice:true});a.flash=.18;a.shot=1.1;emit(s,'streetSound',{name:'pistol',x:a.x,gain:.55});}}}
 function shoot(b,p,e,speed=330,damage=1){const x=b.x+b.facing*(b.stage===1?25:76),y=b.y-(b.stage===1?37:145),a=Math.atan2(p.y-28-y,p.x-x);e.bullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:3,damage,enemy:true,fromSoldier:true});}
 function bossUpdate(s,p,e,dt){const b=s.boss;b.hit=Math.max(0,b.hit-dt);if(p.cloak>0&&b.hp>0)return;if(s.floor!==2||s.ending>=0)return;if(!b.active){if(p.x<260)return;b.active=true;b.age=0;emit(s,'checkpoint',{text:'CHECK POINT · La última plaza'});}b.anim+=dt;
  if(b.hp<=0&&!b.invulnerable){if(b.stage===1){b.invulnerable=true;b.phase='retreat';b.age=0;b.retreatX=b.x;b.targets=[];s.hazards=[];e.bullets=[];e.playerPools=[];e.enemies=[];e.dead=false;e.hp=Math.max(1,e.hp);emit(s,'phase',{text:'¡El Comandante huye hacia el robot!'});}else{s.ending=0;e.dead=false;e.hp=Math.max(1,e.hp);e.bullets=[];e.explosions=[];e.debris=[];e.playerPools=[];b.targets=[];s.hazards=[];if(!s.awarded.has(b.id)){s.awarded.add(b.id);emit(s,'points',{amount:15000,text:'Nueva York liberada'});}emit(s,'ending');return;}}
  if(b.invulnerable){b.age+=dt;e.invincible=Math.max(e.invincible,.1);if(b.phase==='retreat'){b.facing=1;b.x=Math.min(b.robotX-28,b.x+180*dt);if(b.x>=b.robotX-28){b.phase='climb';b.age=0;}}else if(b.phase==='climb'){b.y=FLOOR-175*clamp(b.age/1.6,0,1);if(b.age>=1.6){b.phase='cockpit';b.age=0;}}else if(b.phase==='cockpit'&&b.age>=1.8){Object.assign(b,{stage:2,phase:'robotArrival',age:0,x:b.robotX,y:FLOOR,w:168,h:238,hp:280*s.difficulty,maxHp:280*s.difficulty,facing:-1,invulnerable:false});emit(s,'phase',{text:'FASE 2 · TITÁN DE ACERO'});}return;}
  b.frozen=Math.max(0,b.frozen-dt);if(b.frozen>0)return;b.age+=dt*(b.sticky>0?.7:1);b.facing=p.x<b.x?-1:1;const next=phase=>{b.phase=phase;b.age=0;b.shots=0;b.shot=0;b.targets=[];};
  if(b.stage===1){if(b.phase==='arrival'&&b.age>2)next('rifleWarn');else if(b.phase==='rifleWarn'&&b.age>.8)next('rifle');else if(b.phase==='rifle'){b.shot-=dt;if(b.shot<=0&&b.shots<4){shoot(b,p,e);emit(s,'streetSound',{name:'rifle',x:b.x});b.shot=.2;b.shots++;}if(b.age>1.3)next('grenadeWarn');}else if(b.phase==='grenadeWarn'&&b.age>.9){e.bullets.push({x:b.x+b.facing*20,y:b.y-38,vx:(p.x-b.x)*.65,vy:-250,gravity:450,life:3,enemy:true,slot:9,tankGrenade:true,damage:2,age:0});next('grenade');}else if(b.phase==='grenade'&&b.age>1.2)next('slideWarn');else if(b.phase==='slideWarn'&&b.age>.8){b.slideDir=b.facing;next('slide');}else if(b.phase==='slide'){b.x=clamp(b.x+b.slideDir*230*dt,160,820);if(Math.abs(p.x-b.x)<38&&p.y>FLOOR-32)E.hurtPlayer(e,p,b.x,false,1);if(b.age>.9)next('recover');}else if(b.phase==='recover'&&b.age>1.4)next('rifleWarn');}
  else{if(b.phase==='robotArrival'&&b.age>2)next('gatlingWarn');else if(b.phase==='gatlingWarn'&&b.age>1)next('gatling');else if(b.phase==='gatling'){b.shot-=dt;if(b.shot<=0&&b.shots<7){shoot(b,p,e,360);emit(s,'streetSound',{name:'rifle',x:b.x});b.shot=.17;b.shots++;}if(b.age>1.8)next('missileWarn');}else if(b.phase==='missileWarn'){if(!b.targets.length)b.targets=[p.x,clamp(p.x-140,18,942),clamp(p.x+140,18,942)];if(b.age>1.3){for(const x of b.targets)s.hazards.push({type:'missile',x,y:-40,vy:130,life:4,age:0});emit(s,'streetSound',{name:'rocket',x:b.x});next('missile');}}else if(b.phase==='missile'&&b.age>1.6)next('stompWarn');else if(b.phase==='stompWarn'&&b.age>1){for(const dir of [-1,1])s.hazards.push({type:'wave',x:b.x,dir,life:3,age:0});emit(s,'streetSound',{name:'land',x:b.x});next('stomp');}else if(b.phase==='stomp'&&b.age>1.1)next('sweepWarn');else if(b.phase==='sweepWarn'&&b.age>1){s.hazards.push({type:'fist',x:b.x+b.facing*115,dir:b.facing,life:.5,age:0});next('sweep');}else if(b.phase==='sweep'&&b.age>.8)next('recover');else if(b.phase==='recover'){b.x=clamp(b.x+b.facing*28*dt,450,800);if(b.age>1.8)next('gatlingWarn');}}
  for(const h of s.hazards){h.age+=dt;h.life-=dt;if(h.type==='wave'){h.x+=h.dir*290*dt;if(Math.abs(p.x-h.x)<30&&p.y>FLOOR-38)E.hurtPlayer(e,p,h.x,false,2);}else if(h.type==='fist'){if(Math.abs(p.x-h.x)<100&&p.y>FLOOR-85)E.hurtPlayer(e,p,h.x,false,2);}else{const previousY=h.y;h.vy+=510*dt;h.y+=h.vy*dt;
    if(Math.abs(p.x-h.x)<(p.w||28)/2+8&&h.y>=p.y-(p.h||46)&&previousY<=p.y){E.hurtPlayer(e,p,h.x,true,2);e.explosions.push({x:h.x,y:h.y,life:.4,max:.4,radius:40,kind:'rocket'});h.life=0;}
    else if(h.y>=FLOOR){h.life=0;e.explosions.push({x:h.x,y:FLOOR,life:.55,max:.55,radius:75,kind:'rocket'});s.debris.push({x:h.x,y:FLOOR,age:0});if(Math.abs(p.x-h.x)<75&&p.y>FLOOR-80)E.hurtPlayer(e,p,h.x,false,2);}}}s.hazards=s.hazards.filter(h=>h.life>0);
 }
 function makeDistrictLoot(floor,taken,savedTypes){
  const original=['health','ammo','fuel','star','health','ammo','fuel','star','health'];
  const valid=Array.isArray(savedTypes)&&savedTypes.length===original.length&&
   ['health','ammo','fuel','star'].every(type=>
    savedTypes.filter(t=>t===type).length===original.filter(t=>t===type).length);
  const types=valid?savedTypes:original.slice();
  if(!valid){
   // Collected positions in older saves keep their original rewards.
   const free=types.map((_,i)=>i).filter(i=>!taken.has(floor+'-'+i));
   for(let i=free.length-1;i>0;i--){
    const a=free[i],b=free[Math.floor(Math.random()*(i+1))];
    [types[a],types[b]]=[types[b],types[a]];
   }
  }
  return types.map((type,i)=>({id:floor+'-'+i,x:420+i*540,y:FLOOR,type,amount:3,slot:[3,5,6][i%3]}));
 }
 function selectPickup(s,p){
  const items=s.districtLoot[s.floor]||[],left=cameraLeft(s.floor,p.x);
  // A skipped item at the edge of the screen must not block the next block when backtracking.
  const available=item=>!s.taken.has(item.id)&&Math.abs(p.x-item.x)<=420&&item.x>=left-32&&item.x<=left+960+32;
  if(items.includes(s.activePickup)&&available(s.activePickup))return;
  s.activePickup=null;
  for(const item of items){
   if(available(item)&&(!s.activePickup||Math.abs(p.x-item.x)<Math.abs(p.x-s.activePickup.x)))s.activePickup=item;
  }
 }
 function collectPickup(s,p,e){
  selectPickup(s,p);
  const item=s.activePickup;
  if(!item||Math.abs(p.x-item.x)>38||p.y<FLOOR-60)return;
  s.taken.add(item.id);
  s.activePickup=null;
  if(item.type==='star'){
   s.stars.add(item.id);emit(s,'points',{amount:400,text:'Estrella de la ciudad'});
  }else if(item.type==='health')e.hp=Math.min(e.maxHp,e.hp+3);
  else if(item.type==='fuel')p.fuel=p.fuelMax;
  else{
   if(!e.inventory.owned.includes(item.slot))e.inventory.owned.push(item.slot);
   e.inventory.ammo[item.slot]=(e.inventory.ammo[item.slot]||0)+(item.slot===6?5:40);
  }
  const message={health:'Botiquín · +3 salud',fuel:'Gasolina recuperada',ammo:'Arma y munición recogidas',star:'Estrella recogida'};
  emit(s,'pickup',{text:message[item.type]});
 }
 const collapseSounds=[[.12,'steelTear',.85],[1,'explosion',.75],[1.8,'debris',.66],[2.5,'explosion',.85],[3.15,'steelTear',.8],[4,'titanBlast',1],[4.9,'debris',.72]];
 function update(s,p,e,input,dt){s.events=s.streetSounds.splice(0);dt=clamp(dt,0,.05);s.time+=dt;for(const bar of s.barriers)if(!bar.hp)bar.fall=Math.min(1,bar.fall+dt);updateVehicles(s,e);s.debris=s.debris.filter(f=>(f.age+=dt)<1);
  if(s.ending>=0){s.boss.hit=Math.max(0,s.boss.hit-dt);const previous=s.ending;s.ending+=dt;
   for(const [at,name,gain] of collapseSounds)if(previous<at&&s.ending>=at)emit(s,'collapseSound',{name,gain});
   if(s.ending>=5.2&&!s.complete){s.complete=true;emit(s,'complete');}return s.events;}if(s.intro<4){s.intro=Math.min(4,s.intro+dt);return s.events;}
  if(s.travel>=0){const old=s.travel;s.travel+=dt;p.vx=p.vy=0;if(old<1.5&&s.travel>=1.5){s.floor++;s.checkpoint=s.floor;s.checkpointX=140;s.x=140;s.y=FLOOR;s.trafficWait=2;s.enemies=soldiers(s.floor,s.awarded,s.difficulty);s.allies=makeAllies(s.floor,s.recruited,s.streetHealth);configure(s,p,e);emit(s,'checkpoint',{text:'CHECK POINT · '+names[s.floor]});}if(s.travel>=3)s.travel=-1;return s.events;}
  for(const n of s.enemies)if(n.hp<=0&&!s.awarded.has(n.id)){s.awarded.add(n.id);emit(s,'points',{amount:180,text:'Soldado neutralizado'});}
  if(s.floor<2){for(const x of checkpoints)if(p.x>x&&s.checkpointX<x){s.checkpointX=x;emit(s,'checkpoint',{text:'CHECK POINT · Puesto policial'});}collectPickup(s,p,e);}
  bossUpdate(s,p,e,dt);e.enemies=s.floor===2&&s.boss.active&&!s.boss.invulnerable&&s.boss.phase!=='arrival'&&s.boss.phase!=='robotArrival'?[s.boss]:s.enemies;
  if(s.ending<0){traffic(s,p,e,dt);allies(s,p,e,dt);}if(s.floor===2&&s.boss.active&&!s.boss.invulnerable){s.supplyAge+=dt;if(s.supplyAge>10){s.supplyAge=0;const slot=Math.random()<.5?3:5;if(!e.inventory.owned.includes(slot))e.inventory.owned.push(slot);e.inventory.ammo[slot]=(e.inventory.ammo[slot]||0)+35;emit(s,'pickup',{text:'La policía te entrega munición'});}}return s.events;
 }
 function snapshot(s,p){const departing=s.travel>=0&&s.travel<1.5;return{floor:s.floor,streetHealth:{...s.streetHealth},trafficTime:s.time,vehicleDamage:Object.fromEntries([...s.vehicleDamage].map(([key,d])=>[key,{hp:d.hp,clock:d.clock,stamp:d.stamp}])),x:departing?widths[s.floor]-200:p.x,y:departing?FLOOR:p.y,checkpointX:s.checkpointX,started:s.intro>=4,ending:s.ending>=0,endingTime:s.ending,complete:s.complete,awarded:[...s.awarded],taken:[...s.taken],pickupTypes:s.districtLoot.map(items=>items.map(item=>item.type)),activePickupId:s.activePickup?.id||null,stars:[...s.stars],recruited:[...s.recruited]};}
 function retry(s){return create({...snapshot(s,{x:s.checkpointX,y:FLOOR}),x:s.checkpointX,y:FLOOR,ending:false,complete:false,started:true},s.difficulty);}
 const api={panorama,districts,create,configure,update,interact,snapshot,retry,geometry,updateCamera,blockWidth,widths,names,FLOOR,enemyUpdate,trafficAt,crossings,posts,checkpoints};if(common)module.exports=api;else root.ArcadeNewYorkWorld=api;
})(typeof window!=='undefined'?window:globalThis);
