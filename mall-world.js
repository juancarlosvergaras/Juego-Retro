(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,P=common?require('./physics'):root.ArcadePhysics,N=common?require('./enemies'):root.ArcadeEnemies,E=common?require('./encounter'):root.ArcadeEncounter;
 const Arsenal=common?require('./arsenal'):root.ArcadeArsenal;
 const Shoppers=common?require('./mall-shoppers'):root.ArcadeMallShoppers;
 const Interior=common?require('./mall-interior'):root.ArcadeMallInterior;
 const FLOOR=472,widths=[5400,4800,4600,960],names=['Atrio · Planta 1','Galerías · Planta 2','Restaurantes · Planta 3','Azotea · El Coloso'],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d)=>Number.isFinite(v)?v:d;
 // All coordinates are in world space. The tread and both feet use the same profile.
 const beltSpeed=93;
 function escalator(floor) {
  const lower=widths[floor]-410;
  return {lower,upper:lower+300,rise:146,entry:lower-68,exit:lower+356,pitch:12,speed:beltSpeed};
 }
 function treadY(stair,x) {
  return FLOOR-stair.rise*clamp((x-stair.lower)/(stair.upper-stair.lower),0,1);
 }
 // On the upper floor the head of the same escalator stands at the left edge.
 // A crossing ends at arrivalX; walking back left past returnX starts the way down.
 const landingX=84,returnX=landingX+20,arrivalX=landingX+40,comb=14,reach=90;
 // The roof has its own fixed shot. Inside, both rooms share one camera path.
 const crossing={out:.3,hold:.1,in:.3};
 const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 function settle(distance,margin=60){
  return distance>=margin?distance:distance<=-margin?0:(distance+margin)*(distance+margin)/(4*margin);
 }
 function cameraX(floor,x){
  const follow=x-320;
  if(floor===0)return settle(follow);
  if(floor===2){const end=widths[2]-960+reach;return end-settle(end-follow);}
  return floor===3?0:follow;
 }
 function updateCamera(s,x){
  const floor=s.floor;s.camera.x=cameraX(floor,x);
  // Use the tread profile even while jumping: the view follows the architecture.
  if(floor<2&&x>escalator(floor).lower){
   const st=escalator(floor);s.camera.y=-st.rise*ease((x-st.lower)/(st.upper-st.lower));
  }else if(floor===1||floor===2){
   const st=escalator(floor-1),belowX=x+st.exit-landingX;
   s.camera.y=st.rise*(1-ease((belowX-st.lower)/(st.upper-st.lower)));
  }else s.camera.y=0;
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
 // The moving treads of this floor's escalator, or the head of the one below.
 function onTreads(s,x){
  if(s.floor>0&&x<landingX-comb)return true;
  if(s.floor===3)return false;
  const st=escalator(s.floor);
  return x>=st.entry&&x<st.exit-comb;
 }
 function stepPlayer(s,p,input,dt){
  const trip=s.stairs;
  if(trip.active){
   // The crossing walks the actor with its own gait; the treads add their speed.
   // While the veil closes it stays on the landing that both rooms share.
   const leaving=trip.phase==='walk'||trip.phase==='out';
   const walk=!leaving||(trip.dir>0?p.x<escalator(s.floor).exit-4:p.x>landingX-52);
   input=walk?{left:trip.dir<0,right:trip.dir>0}:{};
   if(walk&&p.grounded&&onTreads(s,p.x)){
    p.x+=trip.dir*beltSpeed*dt;p.y=P.surfaceY(groundAt(s,p.x),p.x);
   }
  }
  const mode=P.step(p,input,dt,s.geometry.platforms,s.geometry);
  updateCamera(s,p.x);return mode;
 }
 function soldiers(floor,defeated,difficulty){if(floor===3)return[];return Array.from({length:11},(_,i)=>{const id='mall-'+floor+'-'+i,x=(floor===0?1480:520)+i*(floor===0?310:330),n=N.createSoldier({x,y:FLOOR,facing:-1,grenadier:i%4===0,kind:i%4===2?'warden':i%4===3?'knife':i%4===1?'turret':'rifle'},id);n.shot=1.4+i*.2;if(n.kind==='warden'){n.hp=n.maxHp=6;}n.maxHp*=difficulty;n.hp=defeated.has(id)?0:n.maxHp;return n;});}
 // Indices 0 and 1 are also the identifiers stored by earlier saves.
 const patrolGates=[1620,3240,2120,2600,3700,4120];
 const rearKinds=['knife','rifle','jetSoldier','rifle','jetSoldier','warden'];
 function guardFromRear(s,i,x){
  const kind=rearKinds[i],id='mall-rear-'+s.floor+'-'+i;
  const floorY=P.surfaceY(groundAt(s,x),x),y=kind==='jetSoldier'?floorY-126:floorY;
  const n=N.createSoldier({x,y,facing:1,kind,grenadier:kind==='jetSoldier'||i===3},id);
  if(kind==='jetSoldier'){n.h=38;n.homeY=y;n.landingY=floorY;}
  if(kind==='warden')n.maxHp=6;
  n.maxHp*=s.difficulty;n.hp=n.maxHp;n.shot=1.4;n.rear=true;n.enteringFromRear=true;return n;
 }
 function rearPatrol(s,p,dt){
  if(s.floor>=3||p.cloak>0||p.burrow)return;
  s.patrolWait=Math.max(0,s.patrolWait-dt);
  if(s.patrolWait>0||s.enemies.filter(n=>n.rear&&n.hp>0&&Math.abs(p.x-n.x)<700).length>=3)return;
  for(const [i,gate] of patrolGates.entries()){
   const id='mall-rear-'+s.floor+'-'+i;
   if(p.x<gate||s.awarded.has(id)||s.enemies.some(n=>n.id===id))continue;
   const x=s.camera.x-48,guard=guardFromRear(s,i,x);
   guard.memory=5;guard.lastKnown={x:p.x,y:p.y};guard.shot=1.4;
   s.enemies.push(guard);s.patrolWait=4;emit(s,'rear');break;
  }
 }
 function create(saved={},difficulty=1){const complete=!!saved.complete,ending=complete?11:saved.ending?0:-1,floor=ending>=0?3:clamp(Math.floor(num(saved.floor,0)),0,3),awarded=new Set(saved.awarded||[]);const s={floor,supplySlots:Arsenal.supplyRolls([3,5,6],3,saved.supplySlots),x:clamp(num(saved.x,140),40,widths[floor]-40),y:clamp(num(saved.y,FLOOR),65,FLOOR),time:0,rooms:new Map(),intro:saved.started?4:0,ending,complete,difficulty,checkpoint:clamp(Math.floor(num(saved.checkpoint,floor)),0,3),camera:{x:0,y:0},events:[],awarded,taken:new Set(saved.taken||[]),stars:new Set(saved.stars||[]),hazards:[],debris:[],supplyAge:0,geometry:geometry(floor),enemies:soldiers(floor,awarded,difficulty),boss:{id:'mall-giant',kind:'mallGiant',x:725,y:FLOOR,w:310,h:322,hp:ending>=0?0:210*difficulty,maxHp:210*difficulty,active:false,phase:'arrival',age:0,hit:0,frozen:0,cycle:0,targets:[],sticky:0}};
  s.departedShoppers=new Set(saved.departedShoppers||[]);s.shoppers=Shoppers.create(floor,s.departedShoppers);s.shoppingBags=[];s.patrolWait=0;
  // stairs.active marks a crossing in progress; fade is the opacity of the veil.
  s.purseScenes=Interior.restorePurseScenes(saved.purseScenes);
  s.stairs={active:false,roof:false,dir:0,phase:'',t:0,fade:0};s.belt=0;s.beltSpeed=beltSpeed;
  s.resume=ending<0&&(saved.stairs===1||saved.stairs===-1)?saved.stairs:0;
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
 function nearArcade(s,p){
  return s.floor===0&&Interior.atArcadeFront(p.x,cameraX(0,p.x));
 }
 function interact(s,p){return nearArcade(s,p)&&p.grounded&&!p.burrow?'arcade':null;}
 function room(s,floor){
  if(floor===s.floor)return s;
  if(!s.rooms.has(floor))s.rooms.set(floor,{geometry:geometry(floor),enemies:soldiers(floor,s.awarded,s.difficulty),
   shoppers:Shoppers.create(floor,s.departedShoppers),shoppingBags:[],debris:[]});
  return s.rooms.get(floor);
 }
 function changeFloor(s,p,e,direction,st){
  // Rebase the actor on the shared comb plate without interrupting the stride.
  const vx=p.vx,invincible=e.invincible;
  s.rooms.set(s.floor,{geometry:s.geometry,enemies:s.enemies,shoppers:s.shoppers,shoppingBags:s.shoppingBags,debris:s.debris});
  const next=room(s,s.floor+direction);s.floor+=direction;s.checkpoint=s.floor;
  s.x=p.x+direction*(landingX-st.exit);s.y=p.y+direction*st.rise;
  Object.assign(s,next);
  configure(s,p,e);p.vx=vx;e.invincible=invincible;e.enemies=[];
  const ground=groundAt(s,p.x),surface=P.surfaceY(ground,p.x);
  if(Math.abs(p.y-surface)<2)Object.assign(p,{y:surface,grounded:true,ground,fallPeak:surface});
  emit(s,'checkpoint',{text:'CHECK POINT · '+names[s.floor]});
 }
 function begin(s,p,e,dir,phase){
  const roof=s.floor===3||(s.floor===2&&p.x>=escalator(2).entry-4);
  Object.assign(s.stairs,{active:true,roof,dir,phase,t:0,fade:0});
  Object.assign(p,{facing:dir,buffer:0,ram:null});
  // Nobody fights across a crossing: the guards hold their ground until it ends.
  for(const n of s.enemies)n.vx=0;
  truce(e);
  emit(s,'stairs',{phase,dir});
 }
 // No guard acts and no enemy shot stays in the air; the player cannot be hurt.
 function truce(e){
  e.invincible=Math.max(e.invincible||0,.3);e.enemies=[];
  if(e.bullets.some(b=>b.enemy))e.bullets=e.bullets.filter(b=>!b.enemy);
 }
 // Starts a crossing when the player walks onto an escalator, or resumes a saved one.
 function board(s,p,e,input){
  const resume=s.resume;s.resume=0;
  if(e.dead||p.burrow||!p.grounded||p.jetpack||p.heroFlight||p.rope||p.hurt>0||p.transform>0)return false;
  const st=s.floor<3?escalator(s.floor):null,head=s.floor>0;
  if(resume>0){
   if(st&&p.x>=st.entry)begin(s,p,e,1,'walk');
   else if(head&&p.x<arrivalX)begin(s,p,e,1,'exit');
  }else if(resume<0){
   if(head&&p.x<=returnX)begin(s,p,e,-1,'out');
   else if(st&&p.x>=st.entry-4)begin(s,p,e,-1,'exit');
  }else if(st&&p.x>=st.entry&&input.right&&!input.left)begin(s,p,e,1,'walk');
  else if(head&&p.x<=returnX&&input.left&&!input.right)begin(s,p,e,-1,'out');
  return s.stairs.active;
 }
 function ride(s,p,e,dt){
  const trip=s.stairs,up=trip.dir>0;
  truce(e);
  if(!trip.roof&&(trip.phase==='walk'||trip.phase==='out')){
   // Switch room ownership on the shared flat plate, while the same artwork is visible.
   const st=escalator(up?s.floor:s.floor-1);
   if(up?p.x>=st.exit-8:p.x<=landingX-12){
    changeFloor(s,p,e,trip.dir,st);trip.phase='exit';
   }
  }else if(trip.phase==='walk'){
   // Close the veil so that it is shut as the actor reaches the middle of the landing.
   const st=escalator(s.floor);
   if(st.upper+28-p.x<=(Math.abs(p.vx)+st.speed)*crossing.out){trip.phase='out';trip.t=0;emit(s,'stairs',{phase:'out',dir:trip.dir});}
  }else if(trip.phase==='out'){
   trip.t+=dt;trip.fade=ease(trip.t/crossing.out);
   const st=escalator(up?s.floor:s.floor-1);
   if(trip.t>=crossing.out&&(!up||p.x>=st.upper-1)){changeFloor(s,p,e,trip.dir,st);trip.phase='hold';trip.t=0;trip.fade=1;}
  }else if(trip.phase==='hold'){
   trip.t+=dt;if(trip.t>=crossing.hold){trip.phase='in';trip.t=0;}
  }else if(trip.phase==='in'){
   trip.t+=dt;trip.fade=1-ease(trip.t/crossing.in);
   if(trip.t>=crossing.in){trip.phase='exit';trip.fade=0;}
  }
  // Control returns as soon as the actor stands on the new floor, still facing its way.
  if(trip.phase==='exit'&&(up?p.x>=arrivalX:p.x<=escalator(s.floor).entry-4)){
   Object.assign(trip,{active:false,roof:false,dir:0,phase:'',t:0,fade:0});
   e.invincible=Math.max(e.invincible,1);
  }
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
  // The treads run upward, and downward while somebody rides them down.
  s.beltSpeed+=clamp((s.stairs.dir||1)*beltSpeed-s.beltSpeed,-700*dt,700*dt);s.belt+=s.beltSpeed*dt;
  for(const f of s.debris)f.age+=dt;s.debris=s.debris.filter(f=>f.age<1.2);
  if(s.ending>=0){s.boss.hit=Math.max(0,s.boss.hit-dt);s.ending+=dt;if(s.ending>=11&&!s.complete){s.complete=true;emit(s,'complete');}return s.events;}
  if(s.intro<4){s.intro=Math.min(4,s.intro+dt);return s.events;}
  Shoppers.update(s,dt);
  for(const n of s.enemies)if(n.hp<=0&&!s.awarded.has(n.id)){s.awarded.add(n.id);emit(s,'points',{amount:150,text:'Guardia neutralizado'});}
  if(s.stairs.active){ride(s,p,e,dt);return s.events;}
  if(!e.dead)rearPatrol(s,p,dt);
  if(board(s,p,e,input||{}))return s.events;
  collect(s,p,e);bossUpdate(s,p,e,dt);e.enemies=s.floor===3&&s.boss.active&&s.boss.phase!=='arrival'?[s.boss]:s.enemies;
  if(s.floor===3&&s.boss.active){s.supplyAge+=dt;if(s.supplyAge>12){s.supplyAge=0;const slot=Math.random()<.5?3:5;Arsenal.grantAmmo(e.inventory,slot,30);emit(s,'pickup',{text:'Reserva de emergencia · '+Arsenal.weapons[slot].name});}}
  return s.events;
 }
 function hearShot(s,p,source){Shoppers.hear(s,source,cameraX(s.floor,p.x));}
 function snapshot(s,p){return{floor:s.floor,purseScenes:Interior.restorePurseScenes(s.purseScenes),supplySlots:s.supplySlots.slice(),rearGuards:s.enemies.filter(n=>n.rear&&n.hp>0).map(n=>({i:Number(n.id.split('-').pop()),x:n.x,hp:n.hp})),departedShoppers:[...s.departedShoppers],x:p.x,y:p.y,stairs:s.stairs.active?s.stairs.dir:0,checkpoint:s.checkpoint,started:s.intro>=4,ending:s.ending>=0,complete:s.complete,awarded:[...s.awarded],taken:[...s.taken],stars:[...s.stars]};}
 function retry(s){return create({...snapshot(s,{x:140,y:FLOOR}),floor:s.checkpoint,x:140,y:FLOOR,stairs:0,rearGuards:[],ending:false,complete:false,started:true},s.difficulty);}
 const api={pickups,room,create,configure,update,interact,nearArcade,snapshot,retry,geometry,escalator,treadY,stepPlayer,landingX,returnX,arrivalX,crossing,cameraX,hearShot,widths,names,FLOOR};if(common)module.exports=api;else root.ArcadeMallWorld=api;
})(typeof window!=='undefined'?window:globalThis);
