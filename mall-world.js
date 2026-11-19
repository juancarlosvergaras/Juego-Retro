(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,P=common?require('./physics'):root.ArcadePhysics,N=common?require('./enemies'):root.ArcadeEnemies,E=common?require('./encounter'):root.ArcadeEncounter;
 const Arsenal=common?require('./arsenal'):root.ArcadeArsenal;
 const Shoppers=common?require('./mall-shoppers'):root.ArcadeMallShoppers;
 const FLOOR=472,widths=[5400,4800,4600,960],names=['Atrio · Planta 1','Galerías · Planta 2','Restaurantes · Planta 3','Azotea · El Coloso'],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d)=>Number.isFinite(v)?v:d;
 // All coordinates are in world space. The tread and both feet use the same profile.
 function escalator(floor) {
  const lower=widths[floor]-410;
  return {lower,upper:lower+300,rise:146,entry:lower-68,exit:lower+356,pitch:12,speed:93};
 }
 function treadY(stair,x) {
  return FLOOR-stair.rise*clamp((x-stair.lower)/(stair.upper-stair.lower),0,1);
 }
 // On the upper floor the end of the same escalator is visible at the left edge.
 const landingX=84,returnX=landingX-18;
 // Both sides of a landing share a camera origin until the stairwell leaves the frame.
 function cameraX(floor,x){
  if(floor===3){
   const approach=clamp((270-x)/(270-landingX),0,1);
   return approach?(x-320)*approach:0;
  }
  return floor===0?Math.max(0,x-320):x-320;
 }
 function landingView(floor,x){
  const camera=cameraX(floor,x);
  const incoming=floor>0&&camera<300;
  if(floor===3&&x>=270)return null;
  const from=incoming?floor-1:floor,st=escalator(from),origin=st.exit-landingX;
  if(!incoming&&camera+960<st.entry-15)return null;
  const local=incoming?x:x-origin,upperCamera=incoming?camera:camera-origin;
  const travel=clamp((local+115)/345,0,1);
  const progress=travel*travel*(3-2*travel),lift=Math.round(st.rise*progress);
  return {from,st,origin,upperCamera,lowerCamera:upperCamera+origin,lift,progress,
   actorOffset:incoming?lift-st.rise:lift,incoming,
   roofBlend:floor===3?clamp((x-landingX)/(270-landingX),0,1):0};
 }
 function updateCamera(s,x,y=s.y){
  const view=landingView(s.floor,x);
  let camera=cameraX(s.floor,x);
  if(s.floor===3){
   const clear=clamp((FLOOR-escalator(2).rise-y)/100,0,1);
   if(s.ending>=0||clear===1){Object.assign(s.camera,{x:0,y:0,landing:null});return;}
   if(view&&clear>0){
    camera*=1-clear;view.upperCamera=camera;view.lowerCamera=camera+view.origin;
    view.actorOffset=Math.round(view.actorOffset*(1-clear));view.lift=view.st.rise+view.actorOffset;
    view.roofBlend+=clear*(1-view.roofBlend);
   }
  }
  s.camera.x=camera;s.camera.y=view?-view.actorOffset:0;s.camera.landing=view;
 }
 function geometry(floor){
  const w=widths[floor],st=floor<3?escalator(floor):null;
  const start=floor>0?landingX:0;
  const platforms=[{id:0,x:start,y:FLOOR,w:(st?st.entry:w)-start,kind:'ground',thickness:68}];
  if(floor>0){
   const below=escalator(floor-1),offset=below.exit-landingX,crest=below.upper-offset;
   platforms.push({id:5,x:0,w:landingX,y:FLOOR,kind:'ground',thickness:14,noBurrow:true,
    terrain:[[-1,treadY(below,offset-1)+below.rise],[crest,FLOOR],[landingX+1,FLOOR]]});
  }
  if(st){
   const top=FLOOR-st.rise;
   platforms.push({id:4,x:st.entry,y:FLOOR,w:w-st.entry,kind:'ground',thickness:14,noBurrow:true,
    terrain:[[st.entry,FLOOR],[st.lower,FLOOR],[st.upper,top],[w+1,top]]});
   for(const [i,x] of [1850,2900,3850].entries())platforms.push({id:i+1,x,y:FLOOR-110-i%2*45,w:210,kind:'balcony',solid:false,thickness:14});
  }
  return {platforms,anchors:[],ladders:[]};
 }
 function stepPlayer(s,p,input,dt){
  const st=s.floor<3?escalator(s.floor):null;
  const onBelt=st&&p.x>=st.entry&&p.x<st.exit;
  const onReturn=s.floor>0&&p.x<landingX;
  const riding=(onBelt||onReturn)&&p.grounded&&!p.burrow&&!p.jetpack&&!p.heroFlight;
  if(riding){
   const speed=onBelt?st.speed:escalator(s.floor-1).speed;
   p.x=Math.min(onBelt?st.exit:landingX,p.x+speed*dt);
   p.y=onBelt?treadY(st,p.x):P.surfaceY(groundAt(s,p.x),p.x);
   s.airCarry=input.jumpPressed?speed:0;
  }else if(!p.grounded&&s.airCarry>0&&!p.jetpack&&!p.heroFlight&&!p.rope){
   p.x+=s.airCarry*dt;s.airCarry=Math.max(0,s.airCarry-(input.left?260:80)*dt);
  }else s.airCarry=0;
  const mode=P.step(p,input,dt,s.geometry.platforms,s.geometry);
  updateCamera(s,p.x,p.y);return mode;
 }
 function soldiers(floor,defeated,difficulty){if(floor===3)return[];return Array.from({length:11},(_,i)=>{const id='mall-'+floor+'-'+i,x=(floor===0?1480:520)+i*(floor===0?310:330),n=N.createSoldier({x,y:FLOOR,facing:-1,kind:i%4===2?'warden':i%4===3?'knife':i%4===1?'turret':'rifle'},id);n.shot=1.4+i*.2;if(n.kind==='warden'){n.hp=n.maxHp=6;}n.maxHp*=difficulty;n.hp=defeated.has(id)?0:n.maxHp;return n;});}
 const patrolGates=[1620,3240];
 function guardFromRear(s,i,x){
  const kind=i===0?'knife':'rifle',id='mall-rear-'+s.floor+'-'+i;
  const n=N.createSoldier({x,y:P.surfaceY(groundAt(s,x),x),facing:1,kind},id);
  n.maxHp*=s.difficulty;n.hp=n.maxHp;n.shot=1.4;n.rear=true;return n;
 }
 function rearPatrol(s,p,dt){
  if(s.floor>=3||p.cloak>0||p.burrow)return;
  s.patrolWait=Math.max(0,s.patrolWait-dt);
  if(s.patrolWait>0)return;
  for(const [i,gate] of patrolGates.entries()){
   const id='mall-rear-'+s.floor+'-'+i;
   if(p.x<gate||s.awarded.has(id)||s.enemies.some(n=>n.id===id))continue;
   const x=cameraX(s.floor,p.x)-48,guard=guardFromRear(s,i,x);
   guard.memory=5;guard.lastKnown={x:p.x,y:p.y};guard.shot=1.4;
   s.enemies.push(guard);s.patrolWait=4;emit(s,'rear');break;
  }
 }
 function create(saved={},difficulty=1){const complete=!!saved.complete,ending=complete?11:saved.ending?0:-1,floor=ending>=0?3:clamp(Math.floor(num(saved.floor,0)),0,3),awarded=new Set(saved.awarded||[]);const s={floor,supplySlots:Arsenal.supplyRolls([3,5,6],3,saved.supplySlots),x:clamp(num(saved.x,140),40,widths[floor]-40),y:clamp(num(saved.y,FLOOR),65,FLOOR),time:0,airCarry:0,rooms:new Map(),intro:saved.started?4:0,ending,complete,difficulty,checkpoint:clamp(Math.floor(num(saved.checkpoint,floor)),0,3),camera:{x:0,y:0},events:[],awarded,taken:new Set(saved.taken||[]),stars:new Set(saved.stars||[]),hazards:[],debris:[],supplyAge:0,geometry:geometry(floor),enemies:soldiers(floor,awarded,difficulty),boss:{id:'mall-giant',kind:'mallGiant',x:725,y:FLOOR,w:310,h:322,hp:ending>=0?0:210*difficulty,maxHp:210*difficulty,active:false,phase:'arrival',age:0,hit:0,frozen:0,cycle:0,targets:[],sticky:0},arcadeX:980};
  s.departedShoppers=new Set(saved.departedShoppers||[]);s.shoppers=Shoppers.create(floor,s.departedShoppers);s.shoppingBags=[];s.patrolWait=0;
  for(const record of Array.isArray(saved.rearGuards)?saved.rearGuards:[]){
   if(floor===3||!Number.isInteger(record?.i)||!patrolGates[record.i]||!Number.isFinite(record.x)||!Number.isFinite(record.hp)||record.hp<=0)continue;
   const guard=guardFromRear(s,record.i,clamp(record.x,20,widths[floor]-20));
   if(awarded.has(guard.id)||s.enemies.some(n=>n.id===guard.id))continue;
   guard.hp=Math.min(guard.maxHp,record.hp);s.enemies.push(guard);
  }
  return s;}
 function groundAt(s,x){
  const platforms=s.geometry.platforms;
  return platforms.find(pl=>pl.kind==='ground'&&x>=pl.x&&x<=pl.x+pl.w)||platforms[0];
 }
 function configure(s,p,e){
  Object.assign(P.WORLD,{top:0,width:widths[s.floor],height:540,ground:FLOOR});
  updateCamera(s,s.x);
  const ground=groundAt(s,s.x),surface=P.surfaceY(ground,s.x),y=Math.min(s.y,surface);
  Object.assign(p,{x:s.x,y,vx:0,vy:0,grounded:y===surface,ground:y===surface?ground:null,
   fallPeak:y,jumps:0,rope:null,ladder:null,jetpack:false,burrow:null,submersible:false,swimming:false,onMotorcycle:false,inSeaMission:false});
  e.enemies=s.enemies;e.bullets=[];e.explosions=[];e.debris=[];e.playerPools=[];e.playerPlasma=[];e.plasmaDrips=[];e.zombieEffects=[];e.invincible=2;
 }
 const emit=(s,type,data={})=>s.events.push({type,...data});
 function interact(s,p){return s.floor===0&&Math.abs(p.x-s.arcadeX)<200&&p.grounded&&!p.burrow?'arcade':null;}
 function changeFloor(s,p,e,direction,st){
  // Both rooms overlap on the horizontal landing. Change coordinates without
  // cutting a jump short, turning the character or clearing held controls.
  const dy=direction*st.rise;
  const motion={vx:p.vx,vy:p.vy,jumps:p.jumps,fallPeak:(p.fallPeak??p.y)+dy,jetpack:p.jetpack};
  const invincible=e.invincible;
  const from=Math.min(s.floor,s.floor+direction);
  const mix=s.skyTransition?.from===from?s.skyTransition.mix:(direction>0?0:1);
  s.skyTransition={from,mix,to:direction>0?1:0};
  s.rooms.set(s.floor,{geometry:s.geometry,enemies:s.enemies,shoppers:s.shoppers,shoppingBags:s.shoppingBags,debris:s.debris});
  s.floor+=direction;s.checkpoint=s.floor;
  s.x=p.x+direction*(landingX-st.exit);s.y=p.y+dy;
  Object.assign(s,s.rooms.get(s.floor)||{geometry:geometry(s.floor),enemies:soldiers(s.floor,s.awarded,s.difficulty),
   shoppers:Shoppers.create(s.floor,s.departedShoppers),shoppingBags:[],debris:[]});
  configure(s,p,e);Object.assign(p,motion);e.invincible=invincible;
  if(p.vy<0){p.grounded=false;p.ground=null;}
  emit(s,'checkpoint',{text:'CHECK POINT · '+names[s.floor]});
 }
 function bossUpdate(s,p,e,dt){const b=s.boss;b.hit=Math.max(0,b.hit-dt);if(p.cloak>0&&b.hp>0)return;if(s.floor!==3||s.ending>=0)return;if(!b.active){if(p.x<270)return;b.active=true;b.age=0;b.phase='arrival';emit(s,'checkpoint',{text:'CHECK POINT · Azotea'});}
  if(b.hp<=0){s.ending=0;updateCamera(s,p.x);e.dead=false;e.hp=Math.max(1,e.hp);e.bullets=[];s.hazards=[];if(!s.awarded.has(b.id)){s.awarded.add(b.id);emit(s,'points',{amount:8500,text:'Coloso derrotado'});}emit(s,'ending');return;}
  b.frozen=Math.max(0,b.frozen-dt);if(b.frozen>0)return;b.age+=dt*(b.sticky>0?.65:1);const next=phase=>{b.phase=phase;b.age=0;};
  // Commit to a point on the roof or in the air before the throwing arm moves.
  const throwAtPlayer=()=>{
   const high=p.y<FLOOR-100,far=Math.abs(p.x-b.x)>480;
   if(!high&&!far)return false;
   b.throwDir=p.x<b.x?-1:1;
   b.aim={x:p.x,y:p.y-(p.h||46)*.52};b.targets=[];next('throwWarn');return true;
  };
  if(b.phase==='arrival'&&b.age>2.5){if(!throwAtPlayer())next('fistWarn');}
  else if(b.phase==='throwWarn'&&b.age>=.96){
   const x=b.x+146*b.throwDir,y=323,dx=b.aim.x-x,dy=b.aim.y-y;
   const flight=clamp(Math.hypot(dx,dy)/465,.48,1.65),gravity=135;
   s.hazards.push({type:'aimedRock',x,y,vx:dx/flight,vy:dy/flight-gravity*flight/2,
    gravity,age:0,life:flight+1.4});
   b.aim=null;next('throw');
  }
  else if(b.phase==='throw'&&b.age>1.05)next('recover');
  else if(b.phase==='fistWarn'){if(!b.targets.length)b.targets=[p.x];if(b.age>1.2){s.hazards.push({type:'fist',x:b.targets[0],age:0,life:.6,radius:65});b.targets=[];next('fist');}}
  else if(b.phase==='fist'&&b.age>.8){if(!throwAtPlayer())next('sweepWarn');}
  else if(b.phase==='sweepWarn'&&b.age>1.35){s.hazards.push({type:'wave',x:b.x,dir:p.x>=b.x?1:-1,age:0,life:3.2,radius:30});next('sweep');}
  else if(b.phase==='sweep'&&b.age>2.4){if(!throwAtPlayer()){b.targets=[p.x,clamp(p.x+(p.x<480?190:-190),18,942)];next('rocksWarn');}}
  else if(b.phase==='rocksWarn'&&b.age>1.5){
   const flight=1.44,y=171;
   for(const [i,targetX] of b.targets.entries()){
    const x=b.x+(i===0?-42:29);
    s.hazards.push({type:'rock',targetX,x,y,vx:(targetX-x)/flight,vy:(FLOOR-y)/flight-310*flight,age:0,life:3,radius:33});
   }
   b.targets=[];next('rocks');
  }
  else if(b.phase==='rocks'&&b.age>2.4)next('recover');
  else if(b.phase==='recover'&&b.age>1.7){b.cycle++;if(!throwAtPlayer())next('fistWarn');}
  for(const h of s.hazards){h.age+=dt;h.life-=dt;if(h.type==='aimedRock'){
    h.x+=h.vx*dt;h.y+=h.vy*dt+.5*h.gravity*dt*dt;h.vy+=h.gravity*dt;
    if(Math.abs(h.x-p.x)<(p.w||28)/2+13&&h.y>=p.y-(p.h||46)-13&&h.y<=p.y+13){E.hurtPlayer(e,p,h.x,false,2);h.life=0;}
    if(h.y>=FLOOR){h.life=0;s.debris.push({x:h.x,y:FLOOR,age:0});}
   }else if(h.type==='wave'){h.x+=(h.dir||-1)*290*dt;if(Math.abs(p.x-h.x)<h.radius&&p.y>FLOOR-43)E.hurtPlayer(e,p,h.x,false,2);}else if(h.type==='fist'){if(h.age>.25&&h.age<.49&&Math.abs(p.x-h.x)<h.radius&&p.y>FLOOR-100)E.hurtPlayer(e,p,h.x,false,2);}else{h.x+=(h.vx||0)*dt;h.vy+=620*dt;h.y+=h.vy*dt;if(Math.abs(p.x-h.x)<35&&Math.abs(p.y-28-h.y)<40)E.hurtPlayer(e,p,h.x,false,2);if(h.y>=FLOOR){h.life=0;s.debris.push({x:h.x,y:FLOOR,age:0});}}}s.hazards=s.hazards.filter(h=>h.life>0);
 }
 function pickups(s){
  if(s.floor===3)return [];
  return [['kit',400,'health'],['ammo',1410,'ammo'],['star',1980,'star'],['fuel',widths[s.floor]-650,'fuel']].map(([id,x,type])=>
   ({id:s.floor+'-'+id,type,x,y:FLOOR,amount:3,slot:type==='ammo'?s.supplySlots[s.floor]:undefined}));
 }
 function collect(s,p,e){for(const item of pickups(s)){const id=item.id;if(s.taken.has(id)||Math.abs(p.x-item.x)>38||Math.abs(p.y-FLOOR)>60)continue;s.taken.add(id);if(item.type==='star'){s.stars.add(id);emit(s,'points',{amount:400,text:'Estrella del centro comercial'});}else if(item.type==='health'){e.hp=Math.min(e.maxHp,e.hp+3);emit(s,'pickup',{text:'Botiquín · +3 salud'});}else if(item.type==='fuel'){p.fuel=p.fuelMax;emit(s,'pickup',{text:'Gasolina al máximo'});}else{Arsenal.grantAmmo(e.inventory,item.slot,item.slot===6?5:45);emit(s,'pickup',{text:'Munición · '+Arsenal.weapons[item.slot].name});}}}
 function update(s,p,e,input,dt){s.events=[];dt=clamp(dt,0,.05);s.time+=dt;
  if(s.skyTransition){const t=s.skyTransition;t.mix+=clamp(t.to-t.mix,-dt/.28,dt/.28);if(t.mix===t.to)s.skyTransition=null;}
  for(const f of s.debris)f.age+=dt;s.debris=s.debris.filter(f=>f.age<1.2);
  if(s.ending>=0){s.boss.hit=Math.max(0,s.boss.hit-dt);s.ending+=dt;if(s.ending>=11&&!s.complete){s.complete=true;emit(s,'complete');}return s.events;}
  if(s.intro<4){s.intro=Math.min(4,s.intro+dt);return s.events;}
  Shoppers.update(s,dt);if(!e.dead)rearPatrol(s,p,dt);
  for(const n of s.enemies)if(n.hp<=0&&!s.awarded.has(n.id)){s.awarded.add(n.id);emit(s,'points',{amount:150,text:'Guardia neutralizado'});}
  if(!e.dead&&!p.burrow){
   if(s.floor<3){
    const st=escalator(s.floor);
    const landingY=FLOOR-st.rise;
    if(p.x>=st.exit&&p.y<=landingY+.5&&p.y>=landingY-st.rise){changeFloor(s,p,e,1,st);return s.events;}
   }
   if(s.floor>0&&p.x<=returnX&&input.left&&!input.right&&p.vx<0){
    const st=escalator(s.floor-1);
    if(p.y>=FLOOR-st.rise){changeFloor(s,p,e,-1,st);return s.events;}
   }
  }
  collect(s,p,e);bossUpdate(s,p,e,dt);e.enemies=s.floor===3&&s.boss.active&&s.boss.phase!=='arrival'?[s.boss]:s.enemies;
  if(s.floor===3&&s.boss.active){s.supplyAge+=dt;if(s.supplyAge>12){s.supplyAge=0;const slot=Math.random()<.5?3:5;Arsenal.grantAmmo(e.inventory,slot,30);emit(s,'pickup',{text:'Reserva de emergencia · '+Arsenal.weapons[slot].name});}}
  return s.events;
 }
 function hearShot(s,p,source){Shoppers.hear(s,source,cameraX(s.floor,p.x));}
 function snapshot(s,p){return{floor:s.floor,supplySlots:s.supplySlots.slice(),rearGuards:s.enemies.filter(n=>n.rear&&n.hp>0).map(n=>({i:Number(n.id.split('-').pop()),x:n.x,hp:n.hp})),departedShoppers:[...s.departedShoppers],x:p.x,y:p.y,checkpoint:s.checkpoint,started:s.intro>=4,ending:s.ending>=0,complete:s.complete,awarded:[...s.awarded],taken:[...s.taken],stars:[...s.stars]};}
 function retry(s){return create({...snapshot(s,{x:140,y:FLOOR}),floor:s.checkpoint,x:140,y:FLOOR,rearGuards:[],ending:false,complete:false,started:true},s.difficulty);}
 const api={pickups,create,configure,update,interact,snapshot,retry,geometry,escalator,treadY,stepPlayer,landingX,landingView,cameraX,hearShot,widths,names,FLOOR};if(common)module.exports=api;else root.ArcadeMallWorld=api;
})(typeof window!=='undefined'?window:globalThis);
