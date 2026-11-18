(function(root){

 'use strict';

 const A=typeof module!=='undefined'&&module.exports?require('./arsenal'):root.ArcadeArsenal;

 const LENGTH=9600,LANES=[366,414,462],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

 const finite=(v,f)=>Number.isFinite(v)?v:f;

 function create(saved={},difficulty=1){

  const distance=clamp(finite(saved.distance,0),0,LENGTH),checkpoint=clamp(finite(saved.checkpoint,0),0,7800);

  return{time:0,distance,checkpoint,scroll:distance*5,intro:distance?5:0,ending:saved.complete?14:saved.ending?0:-1,complete:!!saved.complete,

   wave:Math.floor(distance/260),difficulty,bullets:[],effects:[],parts:[],mines:[],pools:[],pickups:[],events:[],enemies:[],

   awarded:new Set(saved.awarded||[]),collected:new Set(saved.collected||[]),taken:new Set(saved.taken||[]),supplyAge:0,shootWait:0,plasmaWait:0,

   boss:{id:'road-rig',kind:'road',type:'rig',x:saved.ending?740:1180,y:425,w:410,h:190,hp:saved.complete||saved.ending?0:180*difficulty,maxHp:180*difficulty,active:!!saved.ending||!!saved.complete,stage:0,phase:'entry',age:0,shot:.6,cycle:0,hit:0,frozen:0,slow:0,flash:0,death:0},

   obstacles:Array.from({length:16},(_,i)=>({id:i,distance:440+i*510,lane:LANES[i%3],type:i%3===1?'pothole':'ramp',used:false})),crash:0,crashAge:0,jump:0,jumpV:0,boost:0,ramWait:0,ram:0,hitWait:2,shotFlash:0};

 }

 function spawn(s,i){const type=i%6===3?'jetSoldier':i%5===4?'jeep':i%3===1?'sidecar':'bike',hp=(type==='jeep'?10:type==='sidecar'?6:3)*s.difficulty;return{id:'road-'+i,kind:'road',type,x:1020+(i%2)*100,y:type==='jetSoldier'?235:LANES[i%3],w:type==='jetSoldier'?34:type==='jeep'?175:type==='sidecar'?124:104,h:type==='jetSoldier'?58:type==='jeep'?94:76,hp,maxHp:hp,age:0,shot:1.8+(i%3)*.3,hit:0,frozen:0,slow:0,flash:0,death:0,targetX:540+(i%3)*135};}

 function event(s,type,data={}){s.events.push({type,...data});}

 function damage(n,amount){if(n.hp<=0)return;n.hp=Math.max(0,n.hp-amount);n.hit=.14;}

 function hurt(s,p,e,amount=1){if(s.hitWait>0||e.developerInvulnerable||e.invincible>0||e.dead||s.ram>0||p.transform>0)return false;if(p.shield>0)p.shield--;else e.hp=Math.max(0,e.hp-amount*(e.combatDamage||1)/(p.form==='zombie'||p.form==='tank'?2:1));e.hp=Math.round(e.hp*2)/2;s.hitWait=1.15;p.hurt=.3;event(s,'hurt');if(e.hp<=0)e.dead=true;return true;}

 function burst(s,x,y,size=50,color='fire'){s.effects.push({x,y,life:.65,max:.65,size,color});}

 function parts(s,n,count=6){for(let i=0;i<count;i++)s.parts.push({x:n.x+(i/count-.5)*n.w,y:n.y-n.h*.45,vx:-70-i*22,vy:-110-(i%3)*45,life:2.8,age:0,rotation:i*.7,part:i%4,rig:n.type==='rig'});}

 function swept(b,n,oldX,oldY){const pad=b.slot===6?6:3,x=n.x-n.w/2-pad,y=n.y-n.h-pad,w=n.w+pad*2,h=n.h+pad*2;let lo=0,hi=1;for(const [start,end,min,max]of [[oldX,b.x,x,x+w],[oldY,b.y,y,y+h]]){const d=end-start;if(Math.abs(d)<.000001){if(start<min||start>max)return false;continue;}let a=(min-start)/d,z=(max-start)/d;if(a>z)[a,z]=[z,a];lo=Math.max(lo,a);hi=Math.min(hi,z);if(lo>hi)return false;}return true;}

 function fireEnemy(s,n,p){const origin={x:n.x-n.w*.25,y:n.y-n.h*.7},dx=p.x-origin.x,dy=p.y-45-origin.y,len=Math.hypot(dx,dy)||1;const speed=n.type==='jeep'?290:240;s.bullets.push({...origin,vx:dx/len*speed,vy:dy/len*speed,enemy:true,life:4,damage:1});n.flash=.12;}

 function blast(s,b){burst(s,b.x,b.y,b.slot===6?76:60,b.plasma?'plasma':'fire');if(b.plasma)s.pools.push({x:b.x,y:clamp(b.y+35,366,480),life:3.6});for(const n of [...s.enemies,...(s.boss.active?[s.boss]:[])])if(n.hp>0&&Math.abs(n.x-b.x)<n.w/2+60&&Math.abs(n.y-35-b.y)<n.h/2+65){damage(n,b.damage||3);if(b.plasma){n.slow=4;n.poison=4;}}}

 function attack(s,p,e,input){

  if(p.transform>0||s.crash>0)return;const down=input.fire||input.fireHeld||p.form==='tank'&&input.kick;

  const aim=A.aimDirection({...input,up:false,down:false,aimUp:input.aimUp,aimDown:input.aimDown},1);p.aim=aim;

  if(p.form==='wolf'||p.form==='fighter'){

   if((down||input.kick)&&s.ramWait<=0){s.ram=.42;s.ramWait=.85;if(p.form==='fighter'){p.fighterPose=.8;p.fighterAge=0;p.fighterCombo=((p.fighterCombo||0)+1)%3;p.fighterKick=!!input.kick;}burst(s,p.x+45,p.y-44,50,'claw');for(const n of [...s.enemies,...(s.boss.active?[s.boss]:[])])if(n.hp>0&&Math.abs(n.y-p.y)<75&&n.x+n.w/2>p.x-50&&n.x-n.w/2<p.x+220)damage(n,4*(p.damageBonus||1));event(s,'attack');}return;

  }

  if(p.form==='zombie'){

   if(down&&s.shootWait<=0){s.shootWait=.72;s.shotFlash=.18;const x=p.x+33,y=p.y-44;const targets=[...s.enemies,...(s.boss.active?[s.boss]:[])].filter(n=>n.hp>0&&n.x>x&&n.x-n.w/2<x+470&&Math.abs(n.y-p.y)<65).sort((a,b)=>a.x-b.x);const n=targets[0];s.effects.push({x,y,toX:n?n.x-n.w/2+12:x+400,toY:n?n.y-n.h*.65:y,life:.22,max:.22,color:'ray'});if(n){damage(n,2*(p.damageBonus||1));n.shock=.4;}event(s,'attack');}

   if(input.kick&&s.plasmaWait<=0){s.plasmaWait=.8;s.shotFlash=.2;s.bullets.push({x:p.x+35,y:p.y-44,vx:340,vy:-80,gravity:210,life:2,damage:1.5*(p.damageBonus||1),plasma:true,slot:9,enemy:false});}return;

  }

  if(input.kick&&p.form==='soldier'&&s.ramWait<=0){s.ramWait=.6;burst(s,p.x+50,p.y-36,28,'claw');for(const n of [...s.enemies,...(s.boss.active?[s.boss]:[])])if(n.hp>0&&Math.abs(n.y-p.y)<65&&n.x-n.w/2<p.x+120&&n.x+n.w/2>p.x-30)damage(n,2*(p.damageBonus||1));event(s,'attack');}

  if(!down||s.shootWait>0)return;

  const q={...p,y:p.form==='robot'?p.y:p.y-10,facing:1};const shot=p.form==='robot'?A.fireRobot(e,q):A.fire(e.inventory,q);if(!shot)return;

  s.shootWait=shot.weapon.rate/(p.rateBonus||1);s.shotFlash=p.form==='tank'?.65:.12;event(s,'attack');

  if(shot.weapon.range){for(const n of [...s.enemies,...(s.boss.active?[s.boss]:[])])if(n.hp>0&&Math.abs(n.y-p.y)<65&&n.x-n.w/2<p.x+115&&n.x+n.w/2>p.x)damage(n,shot.weapon.damage*(p.damageBonus||1));burst(s,p.x+65,p.y-40,35,'claw');}

  for(const b of shot.bullets){if(p.form!=='robot'){b.x=p.x+40;b.y=p.y-44;}s.bullets.push(b);}

 }

 function updateBoss(s,p,e,dt){const b=s.boss;if(!b.active||b.hp<=0)return;b.age+=dt;if(b.poison>0){b.poison-=dt;damage(b,dt*.6);}b.slow=Math.max(0,b.slow-dt);b.flash=Math.max(0,b.flash-dt);b.hit=Math.max(0,b.hit-dt);b.frozen=Math.max(0,b.frozen-dt);const stage=b.hp<=b.maxHp/3?2:b.hp<=b.maxHp*2/3?1:0;if(stage>b.stage){parts(s,b,8);burst(s,b.x-100+stage*60,b.y-125,95);b.stage=stage;event(s,'armor',{stage});}

  b.x+=(740-b.x)*dt*(b.slow>0?.5:1.2);

  if(b.phase==='entry'){if(b.x<800){b.phase='volley';b.age=0;}return;}

  if(b.frozen>0)return;

  if(b.phase==='volley'){b.shot-=dt;if(b.age>.85&&b.shot<=0){b.shot=.7;for(let gun=b.stage;gun<3;gun++){const x=b.x-145+gun*100,y=b.y-150-(gun===1?20:0),dx=p.x-x,dy=p.y-45-y,len=Math.hypot(dx,dy)||1;s.bullets.push({x,y,vx:dx/len*265,vy:dy/len*265,enemy:true,damage:1,life:4});}b.flash=.16;}if(b.age>3.6){b.phase='mines';b.age=0;b.shot=0;}}

  else if(b.phase==='mines'){b.shot-=dt;if(b.shot<=0&&b.age<2.5){b.shot=.7;s.mines.push({x:b.x-b.w/2,y:LANES[Math.floor(b.age/.7)%3],age:0,life:6});}if(b.age>3.5){b.phase='ramWarn';b.age=0;b.targetY=p.lane;event(s,'warning',{text:'¡EMBESTIDA! Cambia de carril o salta'});}}

  else if(b.phase==='ramWarn'){b.y+=(b.targetY-b.y)*Math.min(1,dt*3);if(b.age>1.25){b.phase='ram';b.age=0;}}

  else if(b.phase==='ram'){b.x-=(b.slow>0?350:560)*dt;if(b.age>.85){b.phase='recover';b.age=0;}}

  else if(b.phase==='recover'&&b.age>2.4){b.phase='volley';b.age=0;}

  if(Math.abs(p.x-b.x)<b.w/2+40&&Math.abs(p.lane-b.y)<36&&s.jump<95)hurt(s,p,e,2);

 }

 function collect(s,p,e){for(const item of s.pickups){if(item.taken||Math.abs(item.x-p.x)>65||Math.abs(item.y-p.lane)>36||s.jump>80)continue;item.taken=true;s.taken.add(item.id);if(item.type==='health'){e.hp=Math.min(e.maxHp,e.hp+3);event(s,'pickup',{text:'Botiquín · +3 salud'});}else if(item.type==='star'){s.collected.add(item.id);event(s,'points',{id:item.id,amount:250,text:'Estrella'});}else{const slot=item.slot||3;if(!e.inventory.owned.includes(slot))e.inventory.owned.push(slot);e.inventory.ammo[slot]=(e.inventory.ammo[slot]||0)+(A.weapons[slot].ammo||36);event(s,'pickup',{text:A.weapons[slot].name+' · Munición recogida'});}}}

 function supply(s,type,slot,id,x=1060,y=414){if(s.taken.has(id))return;s.pickups.push({id,type,slot,x,y,taken:false});}

 function update(s,p,e,input,dt){

  dt=clamp(dt,0,.05);s.events=[];if(e.dead)return s.events;s.time+=dt;s.intro=Math.min(5,s.intro+dt);

  if(s.ending>=0){s.scroll+=dt*360;s.ending+=dt;updateEffects(s,dt);if(s.ending>=14&&!s.complete){s.complete=true;event(s,'complete');}return s.events;}

  if(s.intro<5){s.scroll+=dt*360;return s.events;}

  s.hitWait=Math.max(0,s.hitWait-dt);s.shootWait=Math.max(0,s.shootWait-dt);s.plasmaWait=Math.max(0,s.plasmaWait-dt);s.ramWait=Math.max(0,s.ramWait-dt);s.ram=Math.max(0,s.ram-dt);s.shotFlash=Math.max(0,s.shotFlash-dt);p.hurt=Math.max(0,(p.hurt||0)-dt);e.invincible=Math.max(0,(e.invincible||0)-dt);A.tickRobot(e,dt);

  if(s.crash>0){s.crash=Math.max(0,s.crash-dt);s.crashAge+=dt;input={};s.hitWait=Math.max(s.hitWait,.25);}

  const speed=210*(p.speedBonus||1);p.x=clamp(p.x+((input.right?1:0)-(input.left?1:0))*speed*dt,85,s.boss.active?650:790);p.lane=clamp((p.lane||414)+((input.down?1:0)-(input.up?1:0))*125*dt,LANES[0],LANES[2]);

  s.landing=Math.max(0,(s.landing||0)-dt);s.jumpAge=s.jump>0?(s.jumpAge||0)+dt:0;if(input.jumpPressed&&p.jumps<(p.maxJumps||2)){s.jumpV=310;p.jumps++;event(s,'jump');}if(s.jump>0||s.jumpV>0){s.jumpV-=760*dt;s.jump=Math.max(0,s.jump+s.jumpV*dt);if(!s.jump){s.landing=.24;s.jumpV=0;p.jumps=0;burst(s,p.x,p.lane,24,'dust');}}

  p.y=p.lane-s.jump;p.grounded=s.jump===0;p.facing=1;p.vx=(input.right?speed:0)-(input.left?speed:0);

  const old=s.distance,travel=dt*(s.crash>0?15:input.run?100:72);s.distance=Math.min(LENGTH,s.distance+travel);
  // Asphalt and world obstacles share the same displacement, including turbo and recovery.
  const roadTravel=(s.distance-old)*5;s.scroll+=old<LENGTH?roadTravel:travel*5;

  for(let next=s.wave+1;next<=Math.floor(s.distance/260)&&next<=35;next++){s.wave=next;const n=spawn(s,next);if(!s.awarded.has(n.id))s.enemies.push(n);supply(s,next%6===0?'health':next%7===0?'star':'ammo',[3,5,4,6,9][next%5],'road-supply-'+next,1160,LANES[(next+1)%3]);}

  for(const cp of [1800,3600,7800])if(old<cp&&s.distance>=cp&&s.checkpoint<cp){s.checkpoint=cp;event(s,'checkpoint');}

  for(const o of s.obstacles){const x=220+(o.distance-s.distance)*5;o.x=x;

   if(o.used||Math.abs(x-p.x)>(o.type==='ramp'?96:60)||Math.abs(o.lane-p.lane)>(o.type==='ramp'?26:20)||s.jump>35)continue;o.used=true;

   if(o.type==='ramp'){s.jumpV=input.run?540:460;s.jump=7;p.y=p.lane-s.jump;p.grounded=false;p.jumps=1;event(s,'jump');event(s,'warning',{text:'¡RAMPA! Mantén el impulso en el aire'});}

   else if(hurt(s,p,e,1)){s.crash=2.2;s.crashAge=0;s.jump=0;s.jumpV=0;event(s,'warning',{text:'¡BACHE! Recuperando la moto…'});}

  }

  if(s.distance>=LENGTH&&!s.boss.active){s.boss.active=true;event(s,'warning',{text:'JEFE · EL DEVORADOR DE ASFALTO'});}

  if(s.boss.active){s.supplyAge+=dt;if(s.supplyAge>11){s.supplyAge=0;supply(s,'ammo',s.time%22<11?3:5,'boss-ammo-'+Math.floor(s.time),1000,p.lane);}}

  attack(s,p,e,input);updateBoss(s,p,e,dt);

  for(const n of s.enemies){n.age+=dt;n.hit=Math.max(0,n.hit-dt);n.flash=Math.max(0,n.flash-dt);n.shock=Math.max(0,(n.shock||0)-dt);n.frozen=Math.max(0,n.frozen-dt);n.slow=Math.max(0,n.slow-dt);if(n.poison>0){n.poison-=dt;damage(n,dt*.6);}if(n.hp<=0){if(!s.awarded.has(n.id)){s.awarded.add(n.id);event(s,'points',{id:n.id,amount:n.type==='jeep'?250:100,text:n.type==='jetSoldier'?'Soldado aéreo neutralizado':'Vehículo destruido'});if(n.type!=='jetSoldier')parts(s,n);burst(s,n.x,n.y-35,65);}n.x-=230*dt;n.death+=dt;if(n.type==='jetSoldier')n.y=Math.min(500,n.y+(100+n.death*320)*dt);continue;}

   if(n.kind==='road'&&n.type==='jetSoldier')n.y=240+Math.sin(n.age*2.2)*35;if(n.frozen>0)continue;const factor=n.slow>0?.35:1;n.x+=(n.targetX-n.x)*dt*.65*factor;n.x+=Math.sin(n.age*1.7)*dt*15;n.shot-=dt*factor;if(n.x<940&&n.x>80&&n.shot<=0){fireEnemy(s,n,p);n.shot=n.type==='jeep'?.7:n.type==='sidecar'?1:1.8;}if(Math.abs(p.x-n.x)<n.w/2+35&&Math.abs(p.y-n.y)<28&&s.jump<55)hurt(s,p,e);if(n.age>16)n.x-=190*dt;

  }

  s.enemies=s.enemies.filter(n=>n.x>-180&&n.death<2.8&&n.age<22);

  for(const m of s.mines){m.age+=dt;m.life-=dt;m.x-=travel*5;if(m.age>.65&&Math.abs(m.x-p.x)<32&&Math.abs(m.y-p.lane)<25&&s.jump<38){hurt(s,p,e,2);m.life=0;burst(s,m.x,m.y-5,55);}}s.mines=s.mines.filter(m=>m.life>0&&m.x>-80);

  for(const b of s.bullets){const ox=b.x,oy=b.y;b.life-=dt;b.vy+=(b.gravity||0)*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.enemy){if(swept(b,{x:p.x,y:p.y,w:70,h:80},ox,oy)){hurt(s,p,e,b.damage||1);b.life=0;burst(s,b.x,b.y,18);}}else{const victims=[...s.enemies,...(s.boss.active&&s.boss.phase!=='entry'?[s.boss]:[])];for(const n of victims)if(n.hp>0&&swept(b,n,ox,oy)){if(b.slot===6||b.slot===9)blast(s,b);else{damage(n,b.damage||1);burst(s,b.x,b.y,17);}b.life=0;break;}if(b.life>0&&(b.slot===9||b.plasma)&&b.y>490){blast(s,b);b.life=0;}}

  }

  s.bullets=s.bullets.filter(b=>b.life>0&&b.x>-100&&b.x<1100&&b.y>-150&&b.y<600);

  for(const pool of s.pools){pool.life-=dt;pool.x-=travel*5;for(const n of s.enemies)if(n.hp>0&&Math.abs(n.x-pool.x)<n.w/2+45&&Math.abs(n.y-pool.y)<32){n.slow=Math.max(n.slow,.4);damage(n,dt*.75);}}s.pools=s.pools.filter(f=>f.life>0&&f.x>-100).slice(-12);

  for(const item of s.pickups)item.x-=travel*5;collect(s,p,e);s.pickups=s.pickups.filter(i=>!i.taken&&i.x>-60);

  if(s.boss.active&&s.boss.hp<=0){e.dead=false;e.hp=Math.max(1,e.hp);e.invincible=15;s.ending=0;s.bullets=[];s.mines=[];s.enemies=[];parts(s,s.boss,18);burst(s,s.boss.x,s.boss.y-90,180);if(!s.awarded.has('road-rig')){s.awarded.add('road-rig');event(s,'points',{id:'road-rig',amount:6000,text:'El convoy ha caído'});}p.tankUnlocked=true;event(s,'unlock',{form:'tank'});event(s,'ending');}

  updateEffects(s,dt);return s.events;

 }

 function updateEffects(s,dt){for(const f of s.effects)f.life-=dt;s.effects=s.effects.filter(f=>f.life>0).slice(-90);for(const part of s.parts){part.age+=dt;part.life-=dt;part.x+=part.vx*dt;part.vy+=380*dt;part.y+=part.vy*dt;part.rotation+=dt*3;if(part.y>480){part.y=480;part.vy=-Math.abs(part.vy)*.35;}}s.parts=s.parts.filter(p=>p.life>0).slice(-60);}

 function snapshot(s){return{distance:s.distance,checkpoint:s.checkpoint,awarded:[...s.awarded],collected:[...s.collected],taken:[...s.taken],complete:s.complete,ending:s.ending>=0};}

 function retry(s){const result=create({...snapshot(s),distance:s.checkpoint,complete:false,ending:false},s.difficulty);result.intro=5;return result;}

 const api={create,update,snapshot,retry,spawn,hurt,damage,swept,LENGTH,LANES};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeRoadWar=api;

})(typeof window!=='undefined'?window:globalThis);

