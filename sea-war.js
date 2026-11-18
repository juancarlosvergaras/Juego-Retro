(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,A=common?require('./arsenal'):root.ArcadeArsenal,R=common?require('./road-war'):root.ArcadeRoadWar;
 const WIDTH=11600,HEIGHT=3200,FLOOR=436,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f)=>Number.isFinite(v)?v:f;
 const seabed=x=>Math.min(3060,650+x*.22);
 const stations=[{x:2500,y:1100},{x:5400,y:1710},{x:8600,y:2330},{x:180,y:FLOOR,inside:true}];
 function create(saved={},difficulty=1){const complete=!!saved.complete,ending=complete?14:saved.ending?0:-1,inside=!!saved.inside||ending>=0;
  const sharks=[1900,4100,7100,9900].map((x,i)=>({id:'shark-'+i,kind:'sea',type:'shark',x,y:seabed(x)-190,homeX:x,homeY:seabed(x)-190,w:138,h:58,hp:(8+i)*difficulty,maxHp:(8+i)*difficulty,age:0,shot:2,hit:0,deadAge:0,frozen:0,sticky:0,phase:'swim',phaseAge:0})).filter(n=>!(saved.awarded||[]).includes(n.id));
  return{time:0,intro:saved.started||inside?5:0,inside,airlock:-1,ending,complete,difficulty,checkpoint:clamp(Math.floor(finite(saved.checkpoint,-1)),-1,3),x:clamp(finite(saved.x,180),60,WIDTH-70),y:clamp(finite(saved.y,300),80,HEIGHT-70),camera:{x:0,y:0},
   bullets:[],effects:[],hazards:[],events:[],pools:[],shotWait:0,meleeWait:0,flash:0,combo:0,hitWait:2,supplyAge:0,awarded:new Set(saved.awarded||[]),taken:new Set(saved.taken||[]),stars:new Set(saved.stars||[]),
   enemies:Array.from({length:42},(_,i)=>{const x=650+i*247,y=260+i*58+(i%3)*115,type=i%4===3?'sub':'diver';return{id:'sea-'+i,kind:'sea',type,x,y,homeX:x,homeY:y,w:type==='sub'?120:64,h:type==='sub'?55:48,hp:(type==='sub'?10:4)*difficulty,maxHp:(type==='sub'?10:4)*difficulty,shot:1.8,hit:0,age:i*.4,deadAge:0,frozen:0,sticky:0};}).filter(n=>!(saved.awarded||[]).includes(n.id)).concat(sharks),
   mines:Array.from({length:30},(_,i)=>({id:'mine-'+i,x:950+i*335,y:370+i*74,active:true})),
   pickups:Array.from({length:24},(_,i)=>({id:'sea-item-'+i,x:850+i*430,y:450+i*98,type:i%5===4?'star':i%3===0?'health':'ammo',slot:[3,5,6,4,9][i%5]})),
   boss:{id:'captain',kind:'sea',x:760,y:FLOOR,w:74,h:116,hp:ending>=0?0:160*difficulty,maxHp:160*difficulty,active:inside,phase:'arrival',age:0,cycle:0,shot:.1,facing:-1,hit:0,frozen:0,sticky:0,targets:[]}};
 }
 function emit(s,type,data={}){s.events.push({type,...data});}
 function fx(s,x,y,color='blast',size=40){s.effects.push({x,y,color,size,life:.5,max:.5});}
 function hurt(s,p,e,amount=1){if(s.hitWait>0||e.invincible>0||e.developerInvulnerable||e.dead||p.transform>0||s.ending>=0||s.airlock>=0)return false;if(p.shield>0)p.shield--;else e.hp=Math.max(0,e.hp-amount*(e.combatDamage||1)/(p.form==='zombie'||p.form==='tank'?2:1));s.hitWait=1;p.hurt=.3;emit(s,'hurt');if(e.hp<=0)e.dead=true;return true;}
 function damage(n,amount){if(n.hp<=0)return;n.hp=Math.max(0,n.hp-amount);n.hit=.18;}
 function aim(p,input){return A.aimDirection({...input,up:false,down:false,aimUp:input.aimUp&&!input.up,aimDown:input.aimDown&&!input.down},p.facing||1);}
 function targets(s){return s.inside?(s.boss.active&&s.boss.phase!=='arrival'?[s.boss]:[]):s.enemies;}
 function blast(s,b){fx(s,b.x,b.y,b.plasma?'plasma':'blast',b.superCannon?100:65);for(const n of targets(s))if(n.hp>0&&Math.hypot(n.x-b.x,n.y-n.h*.5-b.y)<(b.superCannon?120:85)+n.w*.5){damage(n,b.damage||3);if(b.plasma)n.sticky=4;}if(b.plasma)s.pools.push({x:b.x,y:s.inside?FLOOR:Math.min(seabed(b.x),b.y+55),life:4.5});}
 function attack(s,p,e,input){if(p.transform>0||p.hurt>.15)return;const fire=input.fire||input.fireHeld||p.form==='tank'&&input.kick;p.aim=aim(p,input);const origin={x:p.x+p.aim.x*(p.form==='tank'?49:35),y:p.y-(s.inside?32:22)+p.aim.y*20};
  if(p.form==='wolf'||p.form==='fighter'){
   if((fire||input.kick)&&s.meleeWait<=0){s.combo=(s.combo+1)%3;s.meleeWait=p.form==='fighter'?.32:.45;p.fighterPose=.8;p.fighterAge=0;p.fighterCombo=s.combo;p.fighterKick=!!input.kick;s.flash=.25;fx(s,p.x+p.facing*48,p.y-30,'claw',65);for(const n of targets(s))if(n.hp>0&&(n.x-p.x)*p.facing>-n.w/2&&Math.abs(n.x-p.x)<120+n.w/2&&Math.abs(n.y-p.y)<85)damage(n,(p.form==='fighter'?4+s.combo:4)*(p.damageBonus||1));emit(s,'attack');}return;
  }
  if(p.form==='zombie'){
   if(input.kick&&s.meleeWait<=0){s.meleeWait=.85;s.bullets.push({...origin,vx:p.aim.x*380,vy:p.aim.y*380,damage:1.5*(p.damageBonus||1),plasma:true,life:2.5,enemy:false});s.flash=.35;emit(s,'attack');}
   if(fire&&s.shotWait<=0){s.shotWait=.72;let end={x:origin.x+p.aim.x*460,y:origin.y+p.aim.y*460},best=null,bestDistance=Infinity;for(const n of targets(s))if(n.hp>0&&R.swept(end,n,origin.x,origin.y)){const d=Math.hypot(n.x-origin.x,n.y-n.h/2-origin.y);if(d<bestDistance){best=n;bestDistance=d;}}if(best){damage(best,2*(p.damageBonus||1));end={x:best.x,y:best.y-best.h/2};}s.effects.push({...origin,tx:end.x,ty:end.y,color:'ray',life:.2,max:.2});s.flash=.2;emit(s,'attack');}return;
  }
  if(!fire||s.shotWait>0)return;const shot=p.form==='robot'?A.fireRobot(e,p):A.fire(e.inventory,p);if(!shot)return;s.shotWait=shot.weapon.rate/(p.rateBonus||1);s.flash=.2;emit(s,'attack');
  if(shot.weapon.range){for(const n of targets(s))if(n.hp>0&&Math.abs(n.x-p.x)<shot.weapon.range+n.w/2&&Math.abs(n.y-p.y)<75&&(n.x-p.x)*p.facing>-n.w/2)damage(n,shot.weapon.damage*(p.damageBonus||1));fx(s,p.x+p.facing*40,p.y-25,'claw',40);}
  for(const b of shot.bullets){if(!s.inside){b.gravity=0;b.vx*=.82;b.vy*=.82;b.life=2.7;}if(p.form!=='robot'){b.x=origin.x;b.y=origin.y;}s.bullets.push(b);}
 }
 function shotAt(s,n,p,speed=235,angle=0){const x=n.x+(n.facing||-1)*35,y=n.y-n.h*.62,a=Math.atan2(p.y-28-y,p.x-x)+angle;s.bullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,enemy:true,damage:1,life:4,type:n.type==='sub'?'torpedo':'red'});}
 function updateBoss(s,p,e,dt){const b=s.boss;if(!b.active||b.hp<=0)return;b.hit=Math.max(0,b.hit-dt);b.frozen=Math.max(0,b.frozen-dt);if(b.sticky>0){b.sticky-=dt;damage(b,dt*.7);dt*=.6;}if(b.frozen>0)return;b.age+=dt;b.facing=p.x<b.x?-1:1;
  const next=(phase)=>{b.phase=phase;b.age=0;b.shot=0;};
  if(b.phase==='arrival'){if(b.age>2.6)next('gunWarn');return;}
  if(b.phase==='gunWarn'){if(b.age>.9)next('gun');}
  else if(b.phase==='gun'){b.shot-=dt;if(b.shot<=0){b.shot=.27;shotAt(s,b,p,320,(b.cycle%3-1)*.1);b.cycle++;}if(b.age>2.3){b.targets=[clamp(p.x,90,870),clamp(p.x+170*(p.x<480?1:-1),90,870)];next('missileWarn');}}
  else if(b.phase==='missileWarn'){if(b.age>1.4){for(const x of b.targets)s.bullets.push({x,y:80,vx:0,vy:340,life:2,enemy:true,damage:2,type:'missile'});next('grenadeWarn');}}
  else if(b.phase==='grenadeWarn'){if(b.age>1.3){const x=p.x;s.hazards.push({x,y:FLOOR,age:0,life:2.5,radius:95});next('grenade');}}
  else if(b.phase==='grenade'){if(b.age>2.6)next('dashWarn');}
  else if(b.phase==='dashWarn'){if(b.age>1){b.dashDir=b.facing;next('dash');}}
  else if(b.phase==='dash'){b.x=clamp(b.x+b.dashDir*310*dt,100,860);if(b.age>.8)next('recover');}
  else if(b.phase==='recover'){b.x+=((p.x<480?770:190)-b.x)*Math.min(1,dt*.8);if(b.age>1.6)next('gunWarn');}
  if(Math.abs(p.x-b.x)<58&&Math.abs(p.y-b.y)<80)hurt(s,p,e,b.phase==='dash'?2:1);
 }
 function enter(s,p){s.inside=true;s.airlock=-1;s.checkpoint=3;s.bullets=[];s.hazards=[];s.pools=[];p.x=180;p.y=FLOOR;p.vy=0;p.vx=0;p.jumps=0;p.grounded=true;p.submersible=false;p.swimming=false;s.boss.active=true;s.boss.phase='arrival';s.boss.age=0;s.camera={x:0,y:0};s.hitWait=3;emit(s,'checkpoint',{text:'CHECK POINT · Cámara del capitán'});}
 function collect(s,p,e){for(const item of s.pickups){if(s.inside||s.taken.has(item.id)||Math.hypot(item.x-p.x,item.y-p.y)>65)continue;s.taken.add(item.id);if(item.type==='star'){s.stars.add(item.id);emit(s,'points',{amount:350,text:'Estrella submarina'});}else if(item.type==='health'){e.hp=Math.min(e.maxHp,e.hp+3);emit(s,'pickup',{text:'Botiquín · +3 salud'});}else{if(!e.inventory.owned.includes(item.slot))e.inventory.owned.push(item.slot);e.inventory.ammo[item.slot]=(e.inventory.ammo[item.slot]||0)+(A.weapons[item.slot].ammo||36);emit(s,'pickup',{text:'Suministros · '+A.weapons[item.slot].name});}}}
 function update(s,p,e,input,dt){dt=clamp(dt,0,.05);s.events=[];if(e.dead)return s.events;s.time+=dt;p.anim=(p.anim||0)+dt;
  for(const f of s.effects)f.life-=dt;s.effects=s.effects.filter(f=>f.life>0).slice(-90);
  if(s.ending>=0){s.ending+=dt;if(s.ending>=14&&!s.complete){s.complete=true;emit(s,'complete');}return s.events;}
  if(s.intro<5){s.intro=Math.min(5,s.intro+dt);return s.events;}
  if(s.airlock>=0){s.airlock+=dt;if(s.airlock>=4)enter(s,p);return s.events;}
  for(const k of ['shotWait','meleeWait','flash','hitWait'])s[k]=Math.max(0,s[k]-dt);e.invincible=Math.max(0,e.invincible-dt);p.hurt=Math.max(0,(p.hurt||0)-dt);A.tickRobot(e,dt);
  const dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0),speed=(input.run?250:165)*(p.speedBonus||1)*(p.form==='tank'?1.1:1);if(dx)p.facing=dx;p.vx=dx*speed;p.submersible=!s.inside&&p.form==='tank';p.swimming=!s.inside;p.crouching=s.inside&&input.down&&p.grounded;
  if(s.inside){p.x=clamp(p.x+dx*speed*dt,60,900);if(input.jumpPressed&&p.jumps<(p.maxJumps||2)){p.vy=-390;p.jumps++;p.grounded=false;}p.vy=(p.vy||0)+850*dt;p.y=Math.min(FLOOR,p.y+p.vy*dt);if(p.y===FLOOR){p.grounded=true;p.vy=0;p.jumps=0;}}
  else{const norm=Math.hypot(dx,dy)||1;p.x=clamp(p.x+dx/norm*speed*dt,60,WIDTH-80);p.y=clamp(p.y+dy/norm*speed*dt-(input.jumpPressed?16:0),90,seabed(p.x)-35);p.vy=dy/norm*speed;p.grounded=false;s.x=p.x;s.y=p.y;
   for(let i=0;i<3;i++)if(i>s.checkpoint&&Math.hypot(p.x-stations[i].x,p.y-stations[i].y)<110){s.checkpoint=i;emit(s,'checkpoint',{text:'CHECK POINT · Sonar '+(i+1)});}
   if(p.x>11200&&p.y>2780){s.airlock=0;s.bullets=[];emit(s,'warning',{text:'Esclusa abierta · Entrando al submarino'});return s.events;}
  }
  attack(s,p,e,input);if(s.inside)updateBoss(s,p,e,dt);
  else for(const n of s.enemies){n.hit=Math.max(0,n.hit-dt);n.age+=dt;if(n.hp<=0){n.deadAge+=dt;if(!s.awarded.has(n.id)){s.awarded.add(n.id);emit(s,'points',{amount:n.type==='sub'?250:100,text:n.type==='shark'?'Tiburón neutralizado':n.type==='sub'?'Submarino neutralizado':'Buzo neutralizado'});fx(s,n.x,n.y-20,'blast',65);}continue;}if(n.sticky>0){n.sticky-=dt;damage(n,dt*.7);}n.frozen=Math.max(0,n.frozen-dt);if(n.frozen>0)continue;if(n.type==='shark'){updateShark(s,n,p,e,dt);continue;}const near=Math.abs(p.x-n.x)<650&&Math.abs(p.y-n.y)<350;if(!near)continue;const f=n.sticky>0?.35:1;n.y=n.homeY+Math.sin(n.age*1.2)*35;n.x=n.homeX+Math.sin(n.age*.5)*65;n.facing=p.x<n.x?-1:1;n.shot-=dt*f;if(n.shot<=0&&Math.abs(n.x-p.x)<480&&Math.abs(n.y-p.y)<270){shotAt(s,n,p,n.type==='sub'?190:240);n.shot=n.type==='sub'?2.6:2;}if(Math.abs(n.x-p.x)<n.w/2+25&&Math.abs(n.y-p.y)<45)hurt(s,p,e);}
  for(const b of s.bullets){if(b.life<=0)continue;const ox=b.x,oy=b.y;b.life-=dt;b.vy+=(b.gravity||0)*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.enemy){if(R.swept(b,{x:p.x,y:p.y,w:p.form==='tank'?80:38,h:s.inside?57:40},ox,oy)){hurt(s,p,e,b.damage||1);b.life=0;fx(s,b.x,b.y);}}else{for(const n of targets(s))if(n.hp>0&&R.swept(b,n,ox,oy)){if(b.slot===6||b.slot===9||b.plasma)blast(s,b);else{damage(n,b.damage||1);fx(s,b.x,b.y,'spark',20);}b.life=0;break;}}
   const floor=s.inside?FLOOR:seabed(b.x);if(b.life>0&&b.y>=floor){b.life=0;if(!b.enemy&&(b.slot===6||b.slot===9||b.plasma))blast(s,b);else fx(s,b.x,floor);}
  }s.bullets=s.bullets.filter(b=>b.life>0&&b.x>-100&&b.x<WIDTH+100&&b.y>-100&&b.y<HEIGHT+100).slice(-180);
  if(!s.inside)for(const m of s.mines){if(!m.active)continue;if(Math.hypot(p.x-m.x,p.y-20-m.y)<48){m.active=false;hurt(s,p,e,2);fx(s,m.x,m.y,'blast',90);}for(const b of s.bullets)if(!b.enemy&&Math.hypot(b.x-m.x,b.y-m.y)<27){m.active=false;b.life=0;fx(s,m.x,m.y,'blast',70);}}
  for(const h of s.hazards){h.age+=dt;h.life-=dt;if(h.age>.75&&Math.abs(p.x-h.x)<h.radius&&p.y>FLOOR-48)hurt(s,p,e,2);}s.hazards=s.hazards.filter(h=>h.life>0);
  for(const pool of s.pools){pool.life-=dt;for(const n of targets(s))if(n.hp>0&&Math.hypot(n.x-pool.x,n.y-pool.y)<85){n.sticky=Math.max(n.sticky,.5);damage(n,dt*.5);}}s.pools=s.pools.filter(f=>f.life>0).slice(-12);
  collect(s,p,e);s.supplyAge+=dt;if(s.inside&&s.supplyAge>12){s.supplyAge=0;for(const slot of [3,5]){if(!e.inventory.owned.includes(slot))e.inventory.owned.push(slot);e.inventory.ammo[slot]=(e.inventory.ammo[slot]||0)+(slot===3?18:30);}emit(s,'pickup',{text:'Reserva de la armería · Munición repuesta'});}
  if(s.inside&&s.boss.hp<=0){e.dead=false;e.hp=Math.max(1,e.hp);s.ending=0;s.bullets=[];s.hazards=[];s.pools=[];p.fighterUnlocked=true;emit(s,'unlock',{form:'fighter'});if(!s.awarded.has('captain')){s.awarded.add('captain');emit(s,'points',{amount:7000,text:'Capitán derrotado · Luchador desbloqueado'});}emit(s,'ending');}
  return s.events;
 }

 function updateShark(s,n,p,e,dt){
  const near=Math.hypot(p.x-n.x,p.y-n.y)<720;n.phaseAge+=dt;n.facing=p.x<n.x?-1:1;
  if(n.phase==='swim'){n.x=n.homeX+Math.sin(n.age*.65)*170;n.y=n.homeY+Math.sin(n.age*1.1)*55;if(near&&n.phaseAge>2){n.phase='warn';n.phaseAge=0;}}
  else if(n.phase==='warn'){if(n.phaseAge>.85){const a=Math.atan2(p.y-20-n.y,p.x-n.x);n.dx=Math.cos(a);n.dy=Math.sin(a);n.phase=n.age%7<3?'breach':'rush';n.phaseAge=0;}}
  else if(n.phase==='rush'||n.phase==='breach'){n.x+=n.dx*(n.sticky>0?220:470)*dt;n.y+=n.dy*350*dt+(n.phase==='breach'?(n.phaseAge-.5)*420*dt:0);if(Math.abs(n.x-p.x)<87&&Math.abs(n.y-p.y)<50)hurt(s,p,e,2);if(n.phaseAge>1.1){n.phase='recover';n.phaseAge=0;}}
  else{n.x+=(n.homeX-n.x)*dt*.9;n.y+=(n.homeY-n.y)*dt*.9;if(n.phaseAge>1.8){n.phase='swim';n.phaseAge=0;}}
  n.x=clamp(n.x,90,WIDTH-90);n.y=clamp(n.y,60,seabed(n.x)-30);
 }
 function snapshot(s,p){return{started:s.intro>=5,inside:s.inside,x:p?.x??s.x,y:p?.y??s.y,checkpoint:s.checkpoint,awarded:[...s.awarded],taken:[...s.taken],stars:[...s.stars],complete:s.complete,ending:s.ending>=0};}
 function retry(s){const cp=stations[s.checkpoint]||{x:180,y:300};return create({...snapshot(s),x:cp.x,y:cp.y,inside:!!cp.inside,complete:false,ending:false,started:true},s.difficulty);}
 const api={create,update,snapshot,retry,damage,hurt,enter,stations,seabed,WIDTH,HEIGHT,FLOOR};if(common)module.exports=api;else root.ArcadeSeaWar=api;
})(typeof window!=='undefined'?window:globalThis);
