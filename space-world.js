(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,P=common?require('./physics'):root.ArcadePhysics,N=common?require('./enemies'):root.ArcadeEnemies,E=common?require('./encounter'):root.ArcadeEncounter;
 const Arsenal=common?require('./arsenal'):root.ArcadeArsenal;
 const FLOOR=472,widths=[10000,6200,960],names=['Casco exterior · La nave nodriza','Interior · Galería del vacío','Núcleo · El Soberano'],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function geometry(floor){const platforms=[{id:'space-ground',x:0,y:FLOOR,w:widths[floor],kind:'ground',thickness:68,noBurrow:true}];if(floor<2)for(let x=1000,i=0;x<widths[floor]-700;x+=1050,i++)platforms.push({id:'space-deck-'+i,x,y:FLOOR-100-i%2*55,w:230,kind:'deck',thickness:16,noBurrow:true});else platforms.push({id:'boss-deck',x:220,y:345,w:160,kind:'deck',thickness:14,noBurrow:true});return{platforms,anchors:[],ladders:[]};}
 function soldiers(floor,defeated,difficulty){if(floor===2)return[];return Array.from({length:floor===0?24:18},(_,i)=>{const kind=i%4===2?'alienPilot':i%5===4?'alienElite':'alien',x=650+i*(floor===0?365:290),y=kind==='alienPilot'?260+i%2*40:FLOOR;const n=N.createSoldier({x,y,kind,facing:-1,grenadier:kind==='alienElite'||kind==='alien'&&i%6===0},'space-'+floor+'-'+i);n.w=kind==='alienPilot'?100:34;n.h=kind==='alienPilot'?63:58;n.homeY=y;n.homeX=x;n.maxHp=(kind==='alienElite'?8:kind==='alienPilot'?6:4)*difficulty;n.hp=defeated.has(n.id)?0:n.maxHp;n.shot=1.2;n.age=0;return n;});}
 function create(saved={},difficulty=1){const complete=!!saved.complete,ending=complete?14:saved.ending?0:-1,floor=ending>=0?2:clamp(Math.floor(Number(saved.floor)||0),0,2),awarded=new Set(saved.awarded||[]);const supplySlots=widths.slice(0,2).map((w,i)=>Arsenal.supplyRolls([3,5,6,'fuel'],Math.ceil(Math.floor(w/1000)/2),saved.supplySlots?.[i]));return{floor,supplySlots,x:clamp(Number(saved.x)||140,40,widths[floor]-40),y:clamp(Number(saved.y)||FLOOR,60,FLOOR),time:0,intro:saved.started?4:0,travel:-1,ending,complete,difficulty,checkpoint:clamp(Number(saved.checkpoint)||0,0,2),checkpointX:Number(saved.checkpointX)||140,camera:{x:0,y:0},events:[],awarded,taken:new Set(saved.taken||[]),stars:new Set(saved.stars||[]),hazards:[],debris:[],supplyAge:0,geometry:geometry(floor),enemies:soldiers(floor,awarded,difficulty),boss:{id:'alien-sovereign',kind:'alienBoss',x:740,y:FLOOR,w:255,h:275,hp:ending>=0?0:240*difficulty,maxHp:240*difficulty,active:ending>=0,phase:'arrival',age:0,hit:0,frozen:0,cycle:0,targets:[],sticky:0},arcadeX:-9999};}
 function configure(s,p,e){Object.assign(P.WORLD,{top:0,width:widths[s.floor],height:540,ground:FLOOR});s.geometry=geometry(s.floor);Object.assign(p,{x:s.x,y:s.y,vx:0,vy:0,grounded:s.y===FLOOR,ground:s.y===FLOOR?s.geometry.platforms[0]:null,fallPeak:s.y,jumps:0,rope:null,ladder:null,jetpack:false,heroFlight:false,burrow:null,submersible:false,swimming:false,onMotorcycle:false,inSeaMission:false});e.enemies=s.enemies;e.bullets=[];e.explosions=[];e.debris=[];e.playerPools=[];e.playerPlasma=[];e.plasmaDrips=[];e.zombieEffects=[];updateCamera(s,p);e.invincible=2;}
 const emit=(s,type,data={})=>s.events.push({type,...data});
 function laserSegment(b,targetY,targetX){
  // Laser release cell: jaw at (852,615), body centred at x=896 and planted at y=747.
  const x=b.x+(b.facing||-1)*58,y=b.y-175;
  if(targetX===undefined)return {x,y,tx:80,ty:targetY};
  const dx=targetX-x,dy=targetY-y;
  if(!dx&&!dy)return {x,y,tx:x,ty:0};
  const endX=dx>0?960:0,endY=dy>0?FLOOR:0;
  const t=Math.min(dx?(endX-x)/dx:Infinity,dy?(endY-y)/dy:Infinity);
  return {x,y,tx:x+t*dx,ty:y+t*dy};
 }
 function lockLaser(b,p){
  b.facing=p.x>b.x?1:-1;b.laserX=p.x;b.targets=[p.y-(p.h||46)*.52];
 }
 function inBeam(b,h,p){
  const a=laserSegment(b,h.y,h.aimX),half=(p.w||28)/2+9,height=p.h||46;
  return E.segmentHit(a.x,a.y,a.tx-a.x,a.ty-a.y,{x:p.x-half,y:p.y-height-9,w:2*half,h:height+18})!==null;
 }
 function laserHeight(b,targetY,x){const a=laserSegment(b,targetY);return a.ty+(a.y-a.ty)*clamp((x-a.tx)/(a.x-a.tx),0,1);}
 function updateCamera(s,p){s.camera.x=clamp(p.x-320,0,widths[s.floor]-960);s.camera.y=0;}
 function atAirlock(s,p){return s.floor<2&&Math.abs(p.x-(widths[s.floor]-155))<=82&&p.grounded&&!p.burrow;}
 function interact(s,p){if(s.travel<0&&s.ending<0&&atAirlock(s,p)){s.travel=0;s.travelFrom=s.floor;s.travelX=p.x;return'airlock';}return null;}
 function crewMuzzle(n){
  // Source pixels from the firing cells, relative to the hips or saucer centre.
  const [dx,dy,k]=n.kind==='alienPilot'?[118,-52,112/285]:
   n.kind==='alienElite'?[142,-142,58/259]:[128,-134,58/255];
  return {x:n.x+n.facing*dx*k,y:n.y+dy*k};
 }
 function enemyUpdate(n,p,dt,bullets,view){if(!['alien','alienElite','alienPilot'].includes(n.kind))return false;n.age+=dt;n.anim+=dt;n.hit=Math.max(0,n.hit-dt);n.flash=Math.max(0,n.flash-dt);if(n.hp<=0){n.death=Math.max(0,n.death-dt);if(n.kind==='alienPilot'&&n.death>0){n.vy=(n.vy||0)+740*dt;n.y=Math.min(FLOOR,n.y+n.vy*dt);}return true;}if(n.frozen>0){n.frozen=Math.max(0,n.frozen-dt);return true;}const dx=p.x-n.x,dy=p.y-n.y,near=Math.abs(dx)<650&&Math.abs(dy)<500&&(!view||n.x>=view.left-32&&n.x<=view.right+32);if(!near){n.vx=0;n.shot=Math.max(1,n.shot);return true;}if(n.flash<=0)n.facing=dx<0?-1:1;
  if(n.kind==='alienPilot'){n.y=n.homeY+Math.sin((n.flightAge=(n.flightAge||0)+dt)*2)*30;n.x+=Math.max(-80,Math.min(80,dx-n.facing*260))*dt;}else if(Math.abs(dx)>240&&n.shot>.42&&n.flash<=0){n.vx=n.facing*57;n.x+=n.vx*dt;n.walkCycle=(n.walkCycle||0)+Math.abs(n.vx)*dt/5;}else n.vx=0;
  n.shot-=dt;if(n.shot<=0){const {x,y}=crewMuzzle(n),a=Math.atan2(p.y-27-y,p.x-x);for(const o of n.kind==='alienElite'?[-.13,0,.13]:[0])bullets.push({x,y,vx:Math.cos(a+o)*350,vy:Math.sin(a+o)*350,life:2.7,enemy:true,alienLaser:true,fromSoldier:true});n.flash=.18;n.shot=n.kind==='alienPilot'?1.65:2;}
  return true;
 }
 function bossUpdate(s,p,e,dt){const b=s.boss;if(s.floor!==2||s.ending>=0)return;if(!b.active){if(p.x<270||p.cloak>0)return;b.active=true;b.age=0;b.facing=p.x>b.x?1:-1;emit(s,'checkpoint',{text:'CHECK POINT · Núcleo alienígena'});}if(b.hp<=0){s.ending=0;p.jetpack=false;p.heroFlight=false;p.rope=null;p.vx=0;p.vy=0;e.dead=false;e.hp=Math.max(1,e.hp);e.bullets=[];s.hazards=[];if(!s.awarded.has(b.id)){s.awarded.add(b.id);emit(s,'points',{amount:12000,text:'Soberano derrotado'});emit(s,'unlock');}emit(s,'ending');return;}
  b.anim=(b.anim||0)+dt;b.hit=Math.max(0,b.hit-dt);b.frozen=Math.max(0,b.frozen-dt);const acting=b.frozen<=0&&!(p.cloak>0);if(acting)b.age+=dt*(b.sticky>0?.7:1);const next=phase=>{b.phase=phase;b.age=0;};
  if(acting){if(b.phase==='arrival'&&b.age>3){if(p.y<FLOOR-110){lockLaser(b,p);next('laserWarn');}else next('lashWarn');}
  else if(b.phase==='lashWarn'){if(!b.targets.length)b.targets=[clamp(p.x,60,880)];if(b.age>1.1){s.hazards.push({type:'tentacle',x:b.targets[0],y:FLOOR,age:0,life:.75,radius:65});b.targets=[];next('lash');}}
  else if(b.phase==='lash'&&b.age>1){b.waveDir=p.x>b.x?1:-1;b.facing=b.waveDir;next('waveWarn');}
  else if(b.phase==='waveWarn'&&b.age>1.1){s.hazards.push({type:'wave',x:b.x+(b.waveDir||-1)*85,vx:(b.waveDir||-1)*310,y:FLOOR,age:0,life:3,radius:28});next('wave');}
  else if(b.phase==='wave'&&b.age>2.4){lockLaser(b,p);next('laserWarn');}
  else if(b.phase==='laserWarn'&&b.age>1.3){s.hazards.push({type:'laser',aimX:b.laserX,y:b.targets[0],age:0,life:1.2,radius:16});b.targets=[];next('laser');}
  else if(b.phase==='laser'&&b.age>1.5){b.targets=[p.x,clamp(p.x+160,18,942),clamp(p.x-160,18,942)];next('podsWarn');}
  else if(b.phase==='podsWarn'&&b.age>1.3){for(const x of b.targets)s.hazards.push({type:'pod',x,y:-45,vy:50,age:0,life:4,radius:38});b.targets=[];next('pods');}
  else if(b.phase==='pods'&&b.age>2.5)next('recover');
  else if(b.phase==='recover'&&b.age>2){b.cycle++;b.facing=p.x>b.x?1:-1;if(p.y<FLOOR-110){lockLaser(b,p);next('laserWarn');}else next('lashWarn');}}
  const exposed=!(p.cloak>0);for(const h of s.hazards){h.age+=dt;h.life-=dt;if(h.type==='wave'){h.x+=(h.vx??-310)*dt;if(exposed&&Math.abs(p.x-h.x)<30&&p.y>FLOOR-45)E.hurtPlayer(e,p,h.x,false,2);}else if(h.type==='tentacle'){if(exposed&&h.age>.18&&h.age<.56&&Math.abs(p.x-h.x)<h.radius&&p.y>FLOOR-110)E.hurtPlayer(e,p,h.x,false,2);}else if(h.type==='laser'){if(exposed&&h.age>.14&&inBeam(b,h,p))E.hurtPlayer(e,p,740,false,2);}else{h.vy+=550*dt;h.y+=h.vy*dt;if(exposed&&Math.abs(p.x-h.x)<40&&Math.abs(p.y-25-h.y)<42)E.hurtPlayer(e,p,h.x,false,2);if(h.y>FLOOR){h.life=0;s.debris.push({x:h.x,y:FLOOR,age:0});}}}s.hazards=s.hazards.filter(h=>h.life>0);
 }
 function update(s,p,e,input,dt){s.events=[];dt=clamp(dt,0,.05);s.time+=dt;for(const f of s.debris)f.age+=dt;s.debris=s.debris.filter(f=>f.age<1);
  if(s.ending>=0){s.boss.hit=Math.max(0,s.boss.hit-dt);if(!p.grounded){P.step(p,{},dt,s.geometry.platforms,s.geometry);p.fallDamage=0;}s.ending+=dt;if(s.ending>=14&&!s.complete){s.complete=true;emit(s,'complete');}return s.events;}if(s.intro<4){s.intro=Math.min(4,s.intro+dt);return s.events;}
  if(s.travel>=0){
   s.travel+=dt;p.vx=0;p.vy=0;
   if(s.floor===s.travelFrom&&s.travel>=1){s.floor++;s.checkpoint=s.floor;s.checkpointX=140;s.x=140;s.y=FLOOR;s.enemies=soldiers(s.floor,s.awarded,s.difficulty);configure(s,p,e);emit(s,'checkpoint',{text:'CHECK POINT · '+names[s.floor]});}
   if(s.travel>=2)s.travel=-1;
   return s.events;}
  for(const n of s.enemies)if(n.hp<=0&&!s.awarded.has(n.id)){s.awarded.add(n.id);emit(s,'points',{amount:n.kind==='alienPilot'?250:180,text:'Alien neutralizado'});}
  if(s.floor<2){for(const x of [2500,4800,7300])if(x<widths[s.floor]-500&&p.x>x&&s.checkpointX<x){s.checkpointX=x;emit(s,'checkpoint',{text:'CHECK POINT · Baliza '+x});}
   for(const item of pickups(s)){const {id,type,slot}=item;if(s.taken.has(id)||Math.abs(p.x-item.x)>40||Math.abs(p.y-item.y)>60)continue;s.taken.add(id);if(type==='star'){s.stars.add(id);emit(s,'points',{amount:400,text:'Núcleo estelar'});}else if(type==='health'){e.hp=Math.min(e.maxHp,e.hp+3);emit(s,'pickup',{text:'Botiquín · +3 salud'});}else if(type==='fuel'){p.fuel=p.fuelMax;emit(s,'pickup',{text:'Combustible recuperado'});}else{Arsenal.grantAmmo(e.inventory,slot,slot===6?4:35);emit(s,'pickup',{text:'Reserva · '+Arsenal.weapons[slot].name});}}
  }
  updateCamera(s,p);bossUpdate(s,p,e,dt);e.enemies=s.floor===2&&s.boss.active&&s.boss.phase!=='arrival'?[s.boss]:s.enemies;
  if(s.boss.active){s.supplyAge+=dt;if(s.supplyAge>10){s.supplyAge=0;const slot=Math.random()<.5?3:5;Arsenal.grantAmmo(e.inventory,slot,30);emit(s,'pickup',{text:'Reserva del núcleo · '+Arsenal.weapons[slot].name});}}return s.events;
 }
 function pickups(s){
  if(s.floor===2)return [];
  return Array.from({length:Math.floor(widths[s.floor]/1000)},(_,i)=>{
   const roll=s.supplySlots[s.floor][Math.floor(i/2)];
   const type=i%4===3?'star':i%4===1?'health':roll==='fuel'?'fuel':'ammo';
   return {id:s.floor+'-'+i,x:850+i*950,y:FLOOR,type,slot:type==='ammo'?roll:undefined,amount:3};
  });
 }
 function snapshot(s,p){return{floor:s.floor,supplySlots:s.supplySlots.map(row=>row.slice()),x:p.x,y:s.travel>=0?FLOOR:p.y,checkpoint:s.checkpoint,checkpointX:s.checkpointX,started:s.intro>=4,ending:s.ending>=0,complete:s.complete,awarded:[...s.awarded],taken:[...s.taken],stars:[...s.stars]};}
 function retry(s){return create({...snapshot(s,{x:s.checkpointX,y:FLOOR}),floor:s.checkpoint,x:s.checkpointX,y:FLOOR,ending:false,complete:false,started:true},s.difficulty);}
 const api={pickups,create,configure,update,atAirlock,interact,snapshot,retry,geometry,widths,names,FLOOR,enemyUpdate,crewMuzzle,updateCamera,laserSegment,laserHeight};if(common)module.exports=api;else root.ArcadeSpaceWorld=api;
})(typeof window!=='undefined'?window:globalThis);
