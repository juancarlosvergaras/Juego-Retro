(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,A=common?require('./arsenal'):root.ArcadeArsenal,R=common?require('./road-war'):root.ArcadeRoadWar;
 const turn=(common?require('./physics'):root.ArcadePhysics).jumpTurn;
 const WIDTH=11600,HEIGHT=3200,FLOOR=436,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f)=>Number.isFinite(v)?v:f;
 const reef=common?require('./sea-reef'):root.ArcadeSeaReef,seabed=reef.seabed;
 const swim=common?require('./sea-sprites'):root.ArcadeSeaSprites;
 function camera(x,y,inside){
  return {x:inside?0:Math.round(clamp(x-340,0,WIDTH-960)),y:inside?0:Math.round(clamp(y-280,0,HEIGHT-540))};
 }
 const stations=[{x:2500,y:1100},{x:5400,y:1710},{x:8600,y:2330},{x:180,y:FLOOR,inside:true}];
 function create(saved={},difficulty=1){const complete=!!saved.complete,ending=complete?14:saved.ending?0:-1,inside=!!saved.inside||ending>=0;
  const sharks=[1900,4100,7100,9900].map((x,i)=>({id:'shark-'+i,kind:'sea',type:'shark',x,y:seabed(x)-190,homeX:x,homeY:seabed(x)-190,w:138,h:58,hp:(8+i)*difficulty,maxHp:(8+i)*difficulty,age:0,shot:2,hit:0,deadAge:0,frozen:0,sticky:0,phase:'swim',phaseAge:0})).filter(n=>!(saved.awarded||[]).includes(n.id));
  const x=clamp(finite(saved.x,180),60,WIDTH-70),requestedY=clamp(finite(saved.y,300),80,HEIGHT-70);
  const y=inside?requestedY:reef.freeY(x,Math.min(requestedY,seabed(x)-35),44,46);
  const squid=[[3100,-310],[5000,-285],[5910,-310],[6220,-515],[6980,-240],[8750,-370]].map(([x,depth],i)=>{
   const y=seabed(x)+depth,hp=5*difficulty;
   return {id:'squid-'+i,kind:'sea',type:'squid',x,y,homeX:x,homeY:y,w:88,h:40,hp,maxHp:hp,age:i*.57,stroke:i,hit:0,deadAge:0,frozen:0,sticky:0,facing:-1};
  }).filter(n=>!(saved.awarded||[]).includes(n.id));
  const state={time:0,intro:saved.started||inside?5:0,inside,airlock:-1,ending,complete,difficulty,checkpoint:clamp(Math.floor(finite(saved.checkpoint,-1)),-1,3),x,y,camera:camera(x,y,inside),
   bullets:[],effects:[],hazards:[],events:[],pools:[],robotFlashUntil:[0,0],shotWait:0,meleeWait:0,flash:0,combo:0,hitWait:2,supplyAge:0,awarded:new Set(saved.awarded||[]),taken:new Set(saved.taken||[]),stars:new Set(saved.stars||[]),
   enemies:Array.from({length:42},(_,i)=>{const x=650+i*247,y=260+i*58+(i%3)*115,type=i%4===3?'sub':'diver';return{id:'sea-'+i,kind:'sea',type,x,y,homeX:x,homeY:y,w:type==='sub'?120:64,h:type==='sub'?55:48,hp:(type==='sub'?10:4)*difficulty,maxHp:(type==='sub'?10:4)*difficulty,shot:1.8,hit:0,age:i*.4,deadAge:0,frozen:0,sticky:0};}).filter(n=>!(saved.awarded||[]).includes(n.id)).concat(sharks,squid),
   mines:Array.from({length:30},(_,i)=>({id:'mine-'+i,x:950+i*335,y:370+i*74,active:true})),
   pickups:Array.from({length:24},(_,i)=>({id:'sea-item-'+i,x:850+i*430,y:450+i*98,type:i%5===4?'star':i%3===0?'health':'ammo',slot:[3,5,6,4,9][i%5]})),
   boss:{id:'captain',kind:'sea',x:760,y:FLOOR,w:74,h:116,hp:ending>=0?0:160*difficulty,maxHp:160*difficulty,active:inside,phase:'arrival',age:0,volleys:0,shot:0,facing:-1,hit:0,frozen:0,sticky:0,targets:[]}};
  for(const n of state.enemies){
   const patrol=n.type==='diver'||n.type==='sub';
   const dx=patrol?65:0,dy=patrol?35:0;
   n.y=reef.freeY(n.x,n.y+dy,n.w*.5+dx,n.h+2*dy)-dy;n.homeY=n.y;
  }
  for(const m of state.mines)m.y=reef.freeY(m.x,m.y+24,24,48)-24;
  for(const item of state.pickups)item.y=reef.freeY(item.x,item.y+18,18,36)-18;
  return state;
 }
 function emit(s,type,data={}){s.events.push({type,...data});}
 function fx(s,x,y,color='blast',size=40){s.effects.push({x,y,color,size,life:.5,max:.5});}
 function hurt(s,p,e,amount=1){if(s.hitWait>0||e.invincible>0||e.developerInvulnerable||e.dead||p.transform>0||s.ending>=0||s.airlock>=0)return false;if(p.shield>0)p.shield--;else e.hp=Math.max(0,e.hp-amount*(e.combatDamage||1)/(p.form==='zombie'||p.form==='tank'?2:1));s.hitWait=e.hitProtection??1.2;p.hurt=.3;emit(s,'hurt');if(e.hp<=0)e.dead=true;return true;}
 function damage(n,amount){if(n.hp<=0||!(amount>0))return;n.hp=Math.max(0,n.hp-amount);n.hit=.18;}
 function aim(p,input){return A.aimDirection({...input,up:false,down:false,aimUp:input.aimUp&&!input.up,aimDown:input.aimDown&&!input.down},p.facing||1);}
 function targets(s){return s.inside?(s.boss.active&&s.boss.phase!=='arrival'?[s.boss]:[]):s.enemies;}
 function blast(s,b){fx(s,b.x,b.y,b.plasma?'plasma':'blast',b.superCannon?100:65);for(const n of targets(s))if(n.hp>0&&Math.hypot(n.x-b.x,n.y-n.h*.5-b.y)<(b.superCannon?120:85)+n.w*.5){damage(n,b.damage||3);if(b.plasma)n.sticky=4;}if(b.plasma)s.pools.push({x:b.x,y:s.inside?FLOOR:Math.min(seabed(b.x),b.y+55),life:4.5});}
 function weaponOrigin(s,p){
  if(!s.inside)return swim.muzzle(p);
  return turn.point(p,{x:p.x+p.aim.x*(p.form==='tank'?49:35),y:p.y-32+p.aim.y*20});
 }
 function attack(s,p,e,input){if(p.transform>0||p.hurt>.15)return;const fire=input.fire||input.fireHeld||p.form==='tank'&&input.kick;const rawAim=aim(p,input);
  const followPitch=!s.inside&&!input.aimVector&&!input.aimLeft&&!input.aimRight&&rawAim.y===0;
  p.aim=followPitch?swim.forwardAim(p):rawAim;
  const origin=weaponOrigin(s,p);
  if(p.form==='wolf'||p.form==='fighter'){
   if((fire||input.kick)&&s.meleeWait<=0){s.combo=(s.combo+1)%3;s.meleeWait=p.form==='fighter'?.32:.45;p.fighterPose=.8;p.fighterAge=0;p.fighterCombo=s.combo;p.fighterKick=!!input.kick;s.flash=.25;fx(s,s.inside?p.x+p.facing*48:origin.x,s.inside?p.y-30:origin.y,'claw',65);for(const n of targets(s))if(n.hp>0&&(n.x-p.x)*p.facing>-n.w/2&&Math.abs(n.x-p.x)<120+n.w/2&&Math.abs(n.y-p.y)<85)damage(n,(p.form==='fighter'?4+s.combo:4)*(p.damageBonus||1));emit(s,'attack');}return;
  }
  if(p.form==='zombie'){
   if(input.kick&&s.meleeWait<=0){s.meleeWait=.85;s.bullets.push({...origin,vx:p.aim.x*380,vy:p.aim.y*380,damage:1.5*(p.damageBonus||1),plasma:true,life:2.5,enemy:false});s.flash=.35;emit(s,'attack');}
   if(fire&&s.shotWait<=0){s.shotWait=.72;let end={x:origin.x+p.aim.x*460,y:origin.y+p.aim.y*460},best=null,bestDistance=Infinity;for(const n of targets(s))if(n.hp>0&&R.swept(end,n,origin.x,origin.y)){const d=Math.hypot(n.x-origin.x,n.y-n.h/2-origin.y);if(d<bestDistance){best=n;bestDistance=d;}}if(best){damage(best,2*(p.damageBonus||1));end={x:best.x,y:best.y-best.h/2};}s.effects.push({...origin,tx:end.x,ty:end.y,swimFacing:s.inside?0:p.facing,turning:s.inside&&!!p.jumpTurn,fixedTarget:!!best,color:'ray',life:.2,max:.2});s.flash=.2;emit(s,'attack');}return;
  }
  if(!fire||s.shotWait>0)return;const shot=p.form==='robot'?A.fireRobot(e,p):A.fire(e.inventory,p);if(!shot)return;s.shotWait=shot.weapon.rate/(p.rateBonus||1);s.flash=.2;emit(s,'attack');
  if(shot.weapon.range){for(const n of targets(s))if(n.hp>0&&Math.abs(n.x-p.x)<shot.weapon.range+n.w/2&&Math.abs(n.y-p.y)<75&&(n.x-p.x)*p.facing>-n.w/2)damage(n,shot.weapon.damage*(p.damageBonus||1));fx(s,p.x+p.facing*40,p.y-25,'claw',40);}
  for(const b of shot.bullets){
   if(!s.inside){
    if(p.form==='robot')s.robotFlashUntil[b.robotArm]=s.time+.065;
    // Horizontal grenade throws retain their upward impulse through level pitch.
    if(b.slot===9&&followPitch&&p.aim.y!==0)b.vy-=150;
    b.gravity=0;b.vx*=.82;b.vy*=.82;b.life=2.7;
   }
   if(p.form!=='robot'&&p.form!=='hero'){
    const start=p.form==='tank'&&!s.inside?swim.muzzle(p):origin;
    b.x=start.x;b.y=start.y;
   }
   s.bullets.push(b);
  }
 }
 function shotAt(s,n,p,speed=235,angle=0){const x=n.x+(n.facing||-1)*35,y=n.y-n.h*.62,a=Math.atan2(p.y-28-y,p.x-x)+angle;s.bullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,enemy:true,damage:1,life:4,type:n.type==='sub'?'torpedo':'red'});}
 // Each strip has eight cels, registered at the captain's boots. Combat and drawing
 // use the same cel and sockets when a round or grenade leaves his hands.
 const captainTiming={grenadeWind:.80,grenadeFollow:.54,chargeWind:.56,charge:.49,missileWind:1.05};
 const captainMuzzles=[[59,33],[58,55],[58,64],[66,60],[65,61],[64,68],[69,59],[65,59]];
 const stripFrame=(age,duration,count)=>clamp(Math.floor(age/duration*count),0,count-1);
 function captainPose(b,ending=-1){
  const t=captainTiming,a=b.age;
  if(ending>=0)return {row:5,frame:stripFrame(ending,1.18,8)};
  switch(b.phase){
   case 'gunWarn':return {row:1,frame:stripFrame(a,.55,4)};
   case 'gun':return {row:1,frame:4+stripFrame(.24-b.shot,.24,4)};
   case 'grenadeWarn':return {row:2,frame:stripFrame(a,t.grenadeWind,5)};
   case 'grenade':return {row:2,frame:5+stripFrame(a,t.grenadeFollow,3)};
   case 'dashWarn':return {row:3,frame:stripFrame(a,t.chargeWind,4)};
   case 'dash':return {row:3,frame:4+stripFrame(a,t.charge,4)};
   case 'missileWarn':return {row:4,frame:stripFrame(a,t.missileWind,5)};
   case 'missile':return {row:4,frame:5+stripFrame(a,.46,3)};
   default:return {row:0,frame:Math.floor(a*8)%8};
  }
 }
 function captainSocket(b,kind){
  // Local offsets in screen pixels, forward from the boots and up from the floor.
  const offsets=kind==='release'?[68,84]:kind==='launcher'?[48,115]:captainMuzzles[captainPose(b).frame];
  return {x:b.x+b.facing*offsets[0],y:b.y-offsets[1]};
 }
 function beginCaptainPhase(b,phase){b.phase=phase;b.age=0;b.shot=0;}
 function chooseCaptainAttack(b,p){
  b.facing=Math.sign(p.x-b.x)||b.facing;
  const gap=Math.abs(p.x-b.x);
  if(p.y<b.y-100&&gap<355){b.targets=[p.x];beginCaptainPhase(b,'missileWarn');return;}
  if(gap<=155){beginCaptainPhase(b,'dashWarn');return;}
  if(gap<=355){b.targetX=clamp(p.x,60,900);beginCaptainPhase(b,'grenadeWarn');return;}
  // Distant opponents draw gunfire first. Repeated sustained volleys call in a salvo.
  if(b.volleys>=2){b.volleys=0;b.targets=[clamp(p.x,60,900),clamp(p.x+(p.x<480?124:-124),60,900)];beginCaptainPhase(b,'missileWarn');}
  else beginCaptainPhase(b,'gunWarn');
 }
 function lobGrenade(s,b){
  const hand=captainSocket(b,'release'),dx=b.targetX-hand.x;
  s.hazards.push({stage:'flight',age:0,x:hand.x,y:hand.y,fromX:hand.x,fromY:hand.y,targetX:b.targetX,
   flight:.64+Math.abs(dx)/850,rise:44+Math.abs(dx)*.13,radius:76});
  emit(s,'captainSound',{sound:'grenade'});
 }
 function updateElectricGrenades(s,p,e,dt){
  for(const h of s.hazards){
   h.age+=dt;
   if(h.stage==='flight'){
    const u=Math.min(1,h.age/h.flight);
    h.x=h.fromX+(h.targetX-h.fromX)*u;
    h.y=h.fromY+(FLOOR-8-h.fromY)*u-4*h.rise*u*(1-u);
    if(u===1){h.age-=h.flight;h.stage='fuse';}
   }else if(h.stage==='fuse'){
    if(h.age>=.38){h.age-=.38;h.stage='electric';emit(s,'captainSound',{sound:'plasma'});}
   }
   if(h.stage==='electric'&&h.age<1.15&&Math.abs(p.x-h.x)<h.radius&&p.y>FLOOR-43)hurt(s,p,e,2);
  }
  s.hazards=s.hazards.filter(h=>h.stage!=='electric'||h.age<1.15);
 }
 function updateBoss(s,p,e,dt){
  const b=s.boss,t=captainTiming;
  if(!b.active||b.hp<=0)return;
  b.hit=Math.max(0,b.hit-dt);b.frozen=Math.max(0,b.frozen-dt);
  if(b.sticky>0){b.sticky-=dt;damage(b,dt*.7);dt*=.6;}
  if(b.hp<=0||b.frozen>0)return;
  b.age+=dt;
  switch(b.phase){
   case 'arrival':case 'recover':
    if(!(p.cloak>0)&&b.age>=(b.phase==='arrival'?1.45:.70))chooseCaptainAttack(b,p);
    break;
   case 'gunWarn':
    if(p.cloak>0){beginCaptainPhase(b,'recover');break;}
    if(b.age>=.55){b.volleys++;beginCaptainPhase(b,'gun');}
    break;
   case 'gun':{
    const dx=(p.x-b.x)*b.facing;
    if(p.cloak>0||b.age>=1.50||dx<120){beginCaptainPhase(b,'recover');break;}
    b.shot-=dt;
    if(b.shot<=0){
     b.shot=.24;
     const muzzle=captainSocket(b,'muzzle'),slope=clamp((p.y-26-muzzle.y)/Math.max(1,(p.x-muzzle.x)*b.facing),-.42,.42);
     const speed=365/Math.hypot(1,slope);
     s.bullets.push({...muzzle,vx:b.facing*speed,vy:speed*slope,enemy:true,damage:1,life:3,type:'red'});
     emit(s,'captainSound',{sound:'rifle'});
    }break;
   }
   case 'grenadeWarn':
    if(b.age>=t.grenadeWind){beginCaptainPhase(b,'grenade');lobGrenade(s,b);}
    break;
   case 'grenade':
    if(b.age>=t.grenadeFollow)beginCaptainPhase(b,'recover');
    break;
   case 'dashWarn':
    if(b.age>=t.chargeWind){beginCaptainPhase(b,'dash');emit(s,'captainSound',{sound:'land'});}
    break;
   case 'dash':{
    const oldX=b.x;
    // Accelerate into contact and brake on the leading foot.
    const ease=x=>.5-.5*Math.cos(Math.PI*clamp(x,0,1));
    b.x=clamp(b.x+b.facing*184*(ease(b.age/t.charge)-ease((b.age-dt)/t.charge)),52,908);
    if(p.x>=Math.min(oldX,b.x)-43&&p.x<=Math.max(oldX,b.x)+43&&Math.abs(p.y-b.y)<55)hurt(s,p,e,2);
    if(b.age>=t.charge)beginCaptainPhase(b,'recover');
    break;
   }
   case 'missileWarn':
    if(b.age>=t.missileWind){
     beginCaptainPhase(b,'missile');
     const tube=captainSocket(b,'launcher');
     // The exhaust leaves the room overhead before the marked salvo descends.
     s.bullets.push({...tube,vx:b.facing*300,vy:-465,life:.7,enemy:true,visualOnly:true,type:'missile'});
     emit(s,'captainSound',{sound:'rocket'});
    }break;
   case 'missile':
    if(b.age>=.46){
     for(const x of b.targets)s.bullets.push({x,y:62,vx:0,vy:410,life:1.1,enemy:true,damage:2,type:'missile'});
     beginCaptainPhase(b,'recover');
    }break;
  }
 }
 function enter(s,p){s.inside=true;s.airlock=-1;s.checkpoint=3;s.bullets=[];s.hazards=[];s.pools=[];p.x=180;p.y=FLOOR;p.vy=0;p.vx=0;p.jumps=0;p.grounded=true;p.submersible=false;p.swimming=false;p.swimPitch=0;s.boss.active=true;s.boss.phase='arrival';s.boss.age=0;s.camera={x:0,y:0};s.hitWait=3;emit(s,'checkpoint',{text:'CHECK POINT · Cámara del capitán'});}
 function collect(s,p,e){for(const item of s.pickups){if(s.inside||s.taken.has(item.id)||Math.hypot(item.x-p.x,item.y-p.y)>65)continue;s.taken.add(item.id);if(item.type==='star'){s.stars.add(item.id);emit(s,'points',{amount:350,text:'Estrella submarina'});}else if(item.type==='health'){e.hp=Math.min(e.maxHp,e.hp+3);emit(s,'pickup',{text:'Botiquín · +3 salud'});}else{if(!e.inventory.owned.includes(item.slot))e.inventory.owned.push(item.slot);e.inventory.ammo[item.slot]=(e.inventory.ammo[item.slot]||0)+(A.weapons[item.slot].ammo||36);emit(s,'pickup',{text:'Suministros · '+A.weapons[item.slot].name});}}}
 function update(s,p,e,input,dt){dt=clamp(dt,0,.05);s.events=[];if(e.dead)return s.events;s.time+=dt;p.anim=(p.anim||0)+dt;
  if(!s.inside){const moving=input.up||input.down||input.left||input.right;
   p.swimCycle=((p.swimCycle||0)+dt*(moving?(input.run?1.85:1.4):.9))%1;
  }
  for(const f of s.effects)f.life-=dt;s.effects=s.effects.filter(f=>f.life>0).slice(-90);
  if(s.ending>=0){s.boss.hit=Math.max(0,s.boss.hit-dt);s.ending+=dt;if(s.ending>=14&&!s.complete){s.complete=true;emit(s,'complete');}return s.events;}
  if(s.intro<5){s.intro=Math.min(5,s.intro+dt);return s.events;}
  if(s.airlock>=0){s.airlock+=dt;if(s.airlock>=4)enter(s,p);return s.events;}
  for(const k of ['shotWait','meleeWait','flash','hitWait'])s[k]=Math.max(0,s[k]-dt);e.invincible=Math.max(0,e.invincible-dt);p.hurt=Math.max(0,(p.hurt||0)-dt);A.tickRobot(e,dt);
  const dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0),speed=(input.run?250:165)*(p.speedBonus||1)*(p.form==='tank'?1.1:1);if(dx)p.facing=dx;p.vx=dx*speed;p.submersible=!s.inside&&p.form==='tank';p.swimming=!s.inside;p.crouching=s.inside&&input.down&&p.grounded;
  if(s.inside){if(!p.jumps||p.grounded)turn.reset(p);p.x=clamp(p.x+dx*speed*dt,60,900);if(input.jumpPressed&&p.jumps<(p.maxJumps||2)){turn.press(p);p.vy=-390;p.jumps++;p.grounded=false;}p.vy=(p.vy||0)+850*dt;p.y=Math.min(FLOOR,p.y+p.vy*dt);if(p.y===FLOOR){p.grounded=true;p.vy=0;p.jumps=0;}turn.advance(p,dt);}
  else{const norm=Math.hypot(dx,dy)||1,step=speed*dt/norm;
   const radius=p.form==='tank'?44:28,height=p.form==='tank'?46:38;
   const nx=clamp(p.x+dx*step,60,WIDTH-80),edge=reef.freeY(nx,p.y,radius,height);
   if(Math.abs(edge-p.y)<=Math.abs(nx-p.x)+.01){p.x=nx;p.y=edge;}
   const oldY=p.y,ny=clamp(p.y+dy*step-(input.jumpPressed?16:0),90,seabed(p.x)-35);
   p.y=reef.freeY(p.x,ny,radius,height);p.vy=dt?(p.y-oldY)/dt:0;
   swim.updatePitch(p,p.vy,dt);
   p.grounded=false;s.x=p.x;s.y=p.y;s.camera=camera(p.x,p.y,false);
   for(let i=0;i<3;i++)if(i>s.checkpoint&&Math.hypot(p.x-stations[i].x,p.y-stations[i].y)<110){s.checkpoint=i;emit(s,'checkpoint',{text:'CHECK POINT · Sonar '+(i+1)});}
   if(p.x>11200&&p.y>2780){s.airlock=0;s.bullets=[];emit(s,'warning',{text:'Esclusa abierta · Entrando al submarino'});return s.events;}
  }
  if(s.hazards.length)updateElectricGrenades(s,p,e,dt);
  attack(s,p,e,input);if(s.inside)updateBoss(s,p,e,dt);
  else for(const n of s.enemies){n.hit=Math.max(0,n.hit-dt);n.age+=dt;if(n.hp<=0){n.deadAge+=dt;if(!s.awarded.has(n.id)){s.awarded.add(n.id);emit(s,'points',{amount:n.type==='sub'?250:100,text:n.type==='squid'?'Calamar neutralizado':n.type==='shark'?'Tiburón neutralizado':n.type==='sub'?'Submarino neutralizado':'Buzo neutralizado'});fx(s,n.x,n.y-20,'blast',65);}continue;}if(n.sticky>0){n.sticky-=dt;damage(n,dt*.7);}n.frozen=Math.max(0,n.frozen-dt);if(n.frozen>0||p.cloak>0)continue;if(n.type==='squid'){updateSquid(s,n,p,e,dt);continue;}if(n.type==='shark'){updateShark(s,n,p,e,dt);continue;}const near=Math.abs(p.x-n.x)<650&&Math.abs(p.y-n.y)<350;if(!near)continue;const f=n.sticky>0?.35:1;n.swimCycle=((n.swimCycle??(n.age%1))+dt*f*(n.type==='sub'?1.65:1.15))%1;n.x=n.homeX+Math.sin(n.age*.5)*65;n.y=reef.freeY(n.x,n.homeY+Math.sin(n.age*1.2)*35,n.w/2,n.h);n.facing=p.x<n.x?-1:1;n.shot-=dt*f;if(n.shot<=0&&Math.abs(n.x-p.x)<480&&Math.abs(n.y-p.y)<270){shotAt(s,n,p,n.type==='sub'?190:240);n.shot=n.type==='sub'?2.6:2;}if(Math.abs(n.x-p.x)<n.w/2+25&&Math.abs(n.y-p.y)<45)hurt(s,p,e);}
  for(const b of s.bullets){if(b.life<=0)continue;const ox=b.x,oy=b.y;b.life-=dt;b.vy+=(b.gravity||0)*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(!s.inside&&!b.enemy&&(b.waterDistance||0)<50)b.waterDistance=(b.waterDistance||0)+Math.hypot(b.x-ox,b.y-oy);
   if(b.visualOnly)continue;if(!s.inside&&reef.freeY(b.x,b.y)!==b.y){b.life=0;if(!b.enemy&&(b.slot===6||b.slot===9||b.plasma))blast(s,b);else fx(s,b.x,b.y,'spark',16);continue;}if(b.enemy){if(R.swept(b,{x:p.x,y:p.y,w:p.form==='tank'?80:38,h:s.inside?57:40},ox,oy)){if(p.cloak>0||A.reflect(p,b))continue;hurt(s,p,e,b.damage||1);b.life=0;fx(s,b.x,b.y);}}else{for(const n of targets(s))if(n.hp>0&&R.swept(b,n,ox,oy)){if(b.slot===6||b.slot===9||b.plasma)blast(s,b);else{damage(n,b.damage||1);fx(s,b.x,b.y,'spark',20);}b.life=0;break;}}
   const floor=s.inside?FLOOR:seabed(b.x);if(b.life>0&&b.y>=floor){b.life=0;if(!b.enemy&&(b.slot===6||b.slot===9||b.plasma))blast(s,b);else fx(s,b.x,floor);}
  }s.bullets=s.bullets.filter(b=>b.life>0&&b.x>-100&&b.x<WIDTH+100&&b.y>-100&&b.y<HEIGHT+100).slice(-180);
  if(!s.inside)for(const m of s.mines){if(!m.active)continue;if(Math.hypot(p.x-m.x,p.y-20-m.y)<48){m.active=false;hurt(s,p,e,2);fx(s,m.x,m.y,'blast',90);}for(const b of s.bullets)if(!b.enemy&&Math.hypot(b.x-m.x,b.y-m.y)<27){m.active=false;b.life=0;fx(s,m.x,m.y,'blast',70);}}
  for(const pool of s.pools){pool.life-=dt;for(const n of targets(s))if(n.hp>0&&Math.hypot(n.x-pool.x,n.y-pool.y)<85){n.sticky=Math.max(n.sticky,.5);damage(n,dt*.5);}}s.pools=s.pools.filter(f=>f.life>0).slice(-12);
  collect(s,p,e);s.supplyAge+=dt;if(s.inside&&s.supplyAge>12){s.supplyAge=0;const slot=Math.random()<.5?3:5;A.grantAmmo(e.inventory,slot,slot===3?18:30);emit(s,'pickup',{text:'Reserva de la armería · '+A.weapons[slot].name});}
  if(s.inside&&s.boss.hp<=0){turn.reset(p);e.dead=false;e.hp=Math.max(1,e.hp);s.ending=0;s.bullets=[];s.hazards=[];s.pools=[];p.fighterUnlocked=true;emit(s,'unlock',{form:'fighter'});if(!s.awarded.has('captain')){s.awarded.add('captain');emit(s,'points',{amount:7000,text:'Capitán derrotado · Luchador desbloqueado'});}emit(s,'ending');}
  return s.events;
 }

 function updateSquid(s,n,p,e,dt){
  if(Math.abs(p.x-n.x)>860||Math.abs(p.y-n.y)>500)return;
  const pace=n.sticky>0?.45:1;
  n.stroke+=dt*6.4*pace;
  const jet=Math.pow(Math.max(0,Math.sin(n.stroke)),3);
  if(n.x<n.homeX-110)n.facing=1;
  if(n.x>n.homeX+110)n.facing=-1;
  n.x+=n.facing*(16+jet*112)*dt*pace;
  n.y=reef.freeY(n.x,n.homeY+Math.sin(n.stroke*.55)*21+Math.sin(n.stroke)*6,n.w/2,n.h);
  if(Math.abs(p.x-n.x)<49&&Math.abs(p.y-n.y)<32)hurt(s,p,e);
 }
 function updateShark(s,n,p,e,dt){
  const near=Math.hypot(p.x-n.x,p.y-n.y)<720,oldX=n.x,oldY=n.y;n.phaseAge+=dt;
  if(n.phase==='swim'){n.x+=(n.homeX+Math.sin(n.age*.65)*170-n.x)*Math.min(1,dt*2.5);n.y+=(n.homeY+Math.sin(n.age*1.1)*55-n.y)*Math.min(1,dt*2.5);if(near&&n.phaseAge>2){n.phase='warn';n.phaseAge=0;}}
  else if(n.phase==='warn'){n.facing=p.x<n.x?-1:1;n.x-=n.facing*20*dt*(1-n.phaseAge/.85);if(n.phaseAge>.85){const a=Math.atan2(p.y-20-n.y,p.x-n.x);n.dx=Math.cos(a);n.dy=Math.sin(a);n.phase=n.age%7<3?'breach':'rush';n.phaseAge=0;}}
  else if(n.phase==='rush'||n.phase==='breach'){n.x+=n.dx*(n.sticky>0?220:470)*dt;n.y+=n.dy*350*dt+(n.phase==='breach'?(n.phaseAge-.5)*420*dt:0);if(Math.abs(n.x-p.x)<87&&Math.abs(n.y-p.y)<50)hurt(s,p,e,2);if(n.phaseAge>1.1){n.phase='recover';n.phaseAge=0;}}
  else{n.x+=(n.homeX-n.x)*dt*.9;n.y+=(n.homeY-n.y)*dt*.9;if(n.phaseAge>1.8){n.phase='swim';n.phaseAge=0;}}
  n.x=clamp(n.x,90,WIDTH-90);n.y=reef.freeY(n.x,clamp(n.y,60,seabed(n.x)-30),n.w*.45,n.h);
  const vx=(n.x-oldX)/(dt||1),vy=(n.y-oldY)/(dt||1);
  if(n.phase!=='warn'&&Math.abs(vx)>6)n.facing=Math.sign(vx);
  const desiredPitch=n.phase==='warn'?-.10:clamp(Math.atan2(vy,Math.max(90,Math.abs(vx))),-.58,.58);
  n.pitch=(n.pitch||0)+(desiredPitch-(n.pitch||0))*Math.min(1,dt*8);
  n.stroke=(n.stroke||0)+dt*(n.phase==='warn'?8:n.phase==='rush'||n.phase==='breach'?13:6.8);
 }
 function snapshot(s,p){return{started:s.intro>=5,inside:s.inside,x:p?.x??s.x,y:p?.y??s.y,checkpoint:s.checkpoint,awarded:[...s.awarded],taken:[...s.taken],stars:[...s.stars],complete:s.complete,ending:s.ending>=0};}
 function retry(s){const cp=stations[s.checkpoint]||{x:180,y:300};return create({...snapshot(s),x:cp.x,y:cp.y,inside:!!cp.inside,complete:false,ending:false,started:true},s.difficulty);}
 const api={create,update,snapshot,retry,damage,hurt,enter,weaponOrigin,captainPose,captainSocket,stations,seabed,reef,WIDTH,HEIGHT,FLOOR};if(common)module.exports=api;else root.ArcadeSeaWar=api;
})(typeof window!=='undefined'?window:globalThis);
