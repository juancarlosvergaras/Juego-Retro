(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,P=common?require('./physics'):root.ArcadePhysics,N=common?require('./enemies'):root.ArcadeEnemies,E=common?require('./encounter'):root.ArcadeEncounter;
 const FLOOR=472,widths=[5400,4800,4600,960],names=['Atrio · Planta 1','Galerías · Planta 2','Restaurantes · Planta 3','Azotea · El Coloso'],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d)=>Number.isFinite(v)?v:d;
 function geometry(floor){const w=widths[floor],platforms=[{id:0,x:0,y:FLOOR,w,kind:'ground',thickness:68}];if(floor<3)for(const [i,x]of [1850,2900,3850].entries())platforms.push({id:i+1,x,y:FLOOR-110-i%2*45,w:210,kind:'balcony',solid:false,thickness:14});return{platforms,anchors:[],ladders:[]};}
 function soldiers(floor,defeated,difficulty){if(floor===3)return[];return Array.from({length:11},(_,i)=>{const id='mall-'+floor+'-'+i,x=(floor===0?1480:520)+i*(floor===0?310:330),n=N.createSoldier({x,y:FLOOR,facing:-1,kind:i%4===2?'warden':i%4===3?'knife':i%4===1?'turret':'rifle'},id);n.shot=1.4+i*.2;if(n.kind==='warden'){n.hp=n.maxHp=6;}n.maxHp*=difficulty;n.hp=defeated.has(id)?0:n.maxHp;return n;});}
 function create(saved={},difficulty=1){const complete=!!saved.complete,ending=complete?11:saved.ending?0:-1,floor=ending>=0?3:clamp(Math.floor(num(saved.floor,0)),0,3),awarded=new Set(saved.awarded||[]);const s={floor,x:clamp(num(saved.x,140),40,widths[floor]-40),y:clamp(num(saved.y,FLOOR),65,FLOOR),time:0,intro:saved.started?4:0,travel:-1,ending,complete,difficulty,checkpoint:clamp(Math.floor(num(saved.checkpoint,floor)),0,3),camera:{x:0,y:0},events:[],awarded,taken:new Set(saved.taken||[]),stars:new Set(saved.stars||[]),hazards:[],debris:[],supplyAge:0,geometry:geometry(floor),enemies:soldiers(floor,awarded,difficulty),boss:{id:'mall-giant',kind:'mallGiant',x:725,y:FLOOR,w:310,h:322,hp:ending>=0?0:210*difficulty,maxHp:210*difficulty,active:false,phase:'arrival',age:0,hit:0,frozen:0,cycle:0,targets:[],sticky:0},arcadeX:980};return s;}
 function configure(s,p,e){Object.assign(P.WORLD,{top:0,width:widths[s.floor],height:540,ground:FLOOR});s.geometry=geometry(s.floor);Object.assign(p,{x:s.x,y:s.y,vx:0,vy:0,grounded:s.y===FLOOR,ground:s.y===FLOOR?s.geometry.platforms[0]:null,fallPeak:s.y,jumps:0,rope:null,ladder:null,jetpack:false,burrow:null,submersible:false,swimming:false,onMotorcycle:false,inSeaMission:false});e.enemies=s.enemies;e.bullets=[];e.explosions=[];e.debris=[];e.playerPools=[];e.invincible=2;}
 const emit=(s,type,data={})=>s.events.push({type,...data});
 function interact(s,p){if(s.floor===0&&Math.abs(p.x-s.arcadeX)<200&&p.grounded&&!p.burrow)return'arcade';if(s.floor<3&&p.x>widths[s.floor]-570&&p.grounded&&!p.burrow){s.travel=0;s.travelX=p.x;return'escalator';}return null;}
 function floorUp(s,p,e){s.floor++;s.checkpoint=s.floor;s.x=140;s.y=FLOOR;s.travel=-1;s.enemies=soldiers(s.floor,s.awarded,s.difficulty);configure(s,p,e);emit(s,'checkpoint',{text:'CHECK POINT · '+names[s.floor]});}
 function bossUpdate(s,p,e,dt){const b=s.boss;if(s.floor!==3||s.ending>=0)return;if(!b.active){if(p.x<270)return;b.active=true;b.age=0;b.phase='arrival';emit(s,'checkpoint',{text:'CHECK POINT · Azotea'});}
  if(b.hp<=0){s.ending=0;e.dead=false;e.hp=Math.max(1,e.hp);e.bullets=[];s.hazards=[];if(!s.awarded.has(b.id)){s.awarded.add(b.id);emit(s,'points',{amount:8500,text:'Coloso derrotado'});}emit(s,'ending');return;}
  b.hit=Math.max(0,b.hit-dt);b.frozen=Math.max(0,b.frozen-dt);if(b.frozen>0)return;b.age+=dt*(b.sticky>0?.65:1);const next=phase=>{b.phase=phase;b.age=0;};
  if(b.phase==='arrival'&&b.age>2.5)next('fistWarn');
  else if(b.phase==='fistWarn'){if(!b.targets.length)b.targets=[clamp(p.x,90,850)];if(b.age>1.2){s.hazards.push({type:'fist',x:b.targets[0],age:0,life:.6,radius:65});b.targets=[];next('fist');}}
  else if(b.phase==='fist'&&b.age>.8)next('sweepWarn');
  else if(b.phase==='sweepWarn'&&b.age>1.35){s.hazards.push({type:'wave',x:890,age:0,life:3.2,radius:30});next('sweep');}
  else if(b.phase==='sweep'&&b.age>2.4){b.targets=[clamp(p.x,85,875),clamp(p.x+(p.x<480?190:-190),85,875)];next('rocksWarn');}
  else if(b.phase==='rocksWarn'&&b.age>1.5){for(const x of b.targets)s.hazards.push({type:'rock',x,y:25,vy:40,age:0,life:3,radius:33});b.targets=[];next('rocks');}
  else if(b.phase==='rocks'&&b.age>2.4)next('recover');
  else if(b.phase==='recover'&&b.age>1.7){b.cycle++;next('fistWarn');}
  for(const h of s.hazards){h.age+=dt;h.life-=dt;if(h.type==='wave'){h.x-=290*dt;if(Math.abs(p.x-h.x)<h.radius&&p.y>FLOOR-43)E.hurtPlayer(e,p,h.x,false,2);}else if(h.type==='fist'){if(h.age>.12&&h.age<.43&&Math.abs(p.x-h.x)<h.radius&&p.y>FLOOR-100)E.hurtPlayer(e,p,h.x,false,2);}else{h.vy+=620*dt;h.y+=h.vy*dt;if(Math.abs(p.x-h.x)<35&&Math.abs(p.y-28-h.y)<40)E.hurtPlayer(e,p,h.x,false,2);if(h.y>=FLOOR){h.life=0;s.debris.push({x:h.x,y:FLOOR,age:0});}}}s.hazards=s.hazards.filter(h=>h.life>0);
 }
 function collect(s,p,e){if(s.floor===3)return;const items=[{id:'kit',x:400,type:'health'},{id:'ammo',x:1410,type:'ammo'},{id:'star',x:1980,type:'star'},{id:'fuel',x:widths[s.floor]-650,type:'fuel'}];for(const item of items){const id=s.floor+'-'+item.id;if(s.taken.has(id)||Math.abs(p.x-item.x)>38||Math.abs(p.y-FLOOR)>60)continue;s.taken.add(id);if(item.type==='star'){s.stars.add(id);emit(s,'points',{amount:400,text:'Estrella del centro comercial'});}else if(item.type==='health'){e.hp=Math.min(e.maxHp,e.hp+3);emit(s,'pickup',{text:'Botiquín · +3 salud'});}else if(item.type==='fuel'){p.fuel=p.fuelMax;emit(s,'pickup',{text:'Gasolina al máximo'});}else{for(const slot of [3,5,6]){if(!e.inventory.owned.includes(slot))e.inventory.owned.push(slot);e.inventory.ammo[slot]=(e.inventory.ammo[slot]||0)+(slot===6?5:45);}emit(s,'pickup',{text:'Munición recogida'});}}}
 function update(s,p,e,input,dt){s.events=[];dt=clamp(dt,0,.05);s.time+=dt;for(const f of s.debris)f.age+=dt;s.debris=s.debris.filter(f=>f.age<1.2);
  if(s.ending>=0){s.ending+=dt;if(s.ending>=11&&!s.complete){s.complete=true;emit(s,'complete');}return s.events;}
  if(s.intro<4){s.intro=Math.min(4,s.intro+dt);return s.events;}
  if(s.travel>=0){s.travel+=dt;const t=clamp(s.travel/5,0,1);const ride=clamp((t-.12)/.88,0,1),base=widths[s.floor]-410;p.x=t<.12?s.travelX+(base-s.travelX)*t/.12:base+ride*300;p.y=FLOOR-ride*272;p.vx=0;p.vy=0;p.grounded=true;p.rope=null;p.jetpack=false;if(t>=1)floorUp(s,p,e);return s.events;}
  for(const n of s.enemies)if(n.hp<=0&&!s.awarded.has(n.id)){s.awarded.add(n.id);emit(s,'points',{amount:150,text:'Guardia neutralizado'});}
  collect(s,p,e);bossUpdate(s,p,e,dt);e.enemies=s.floor===3&&s.boss.active&&s.boss.phase!=='arrival'?[s.boss]:s.enemies;
  if(s.floor===3&&s.boss.active){s.supplyAge+=dt;if(s.supplyAge>12){s.supplyAge=0;for(const slot of [3,5]){if(!e.inventory.owned.includes(slot))e.inventory.owned.push(slot);e.inventory.ammo[slot]=(e.inventory.ammo[slot]||0)+30;}emit(s,'pickup',{text:'Reserva de emergencia · Munición'});}}
  return s.events;
 }
 function snapshot(s,p){return{floor:s.floor,x:s.travel>=0?widths[s.floor]-540:p.x,y:s.travel>=0?FLOOR:p.y,checkpoint:s.checkpoint,started:s.intro>=4,ending:s.ending>=0,complete:s.complete,awarded:[...s.awarded],taken:[...s.taken],stars:[...s.stars]};}
 function retry(s){return create({...snapshot(s,{x:140,y:FLOOR}),floor:s.checkpoint,x:140,y:FLOOR,ending:false,complete:false,started:true},s.difficulty);}
 const api={create,configure,update,interact,snapshot,retry,geometry,widths,names,FLOOR};if(common)module.exports=api;else root.ArcadeMallWorld=api;
})(typeof window!=='undefined'?window:globalThis);
