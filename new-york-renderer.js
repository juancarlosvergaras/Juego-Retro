(function(root){'use strict';const paths={"expansion": "assets/sprites/enemigos-expansion-v1.png", "zombieCast": "assets/sprites/zombi-disparo-direcciones-v1.png", "jetMk2": "assets/sprites/jetpack-mk2-v1.png", "zombieRun": "assets/sprites/zombi-carrera-v2.png", "shock": "assets/sprites/electrocucion-v1.png", "checkpointPc": "assets/sprites/checkpoint-pc-v1.png", "wolfJump": "assets/sprites/lobo-salto-carrera-v1.png", "formTransition": "assets/sprites/transformaciones-jugador-v3.png", "zombieIdle": "assets/sprites/zombi-soldado-reposo-v1.png", "zombieSoldier": "assets/sprites/zombi-soldado-v1.png", "zombieSoldierExtra": "assets/sprites/zombi-soldado-extra-v1.png", "zombiePlayer": "assets/sprites/zombi-electrico-v1.png", "zombieExtra": "assets/sprites/zombi-electrico-extra-v1.png", "wolfActions": "assets/sprites/lobo-reposo-patadas-v2.png", "wolfCombos": "assets/sprites/lobo-combos-v1.png", "wolfRam": "assets/sprites/lobo-cabezazo-v1.png", "ramHit": "assets/sprites/enemigos-embestida-v1.png", "wolfWalk": "assets/sprites/lobo-caminata-v2.png", "crouch": "assets/sprites/soldado-agachado-pasos-v1.png", "turret": "assets/sprites/enemigo-torreta-v1.png", "knife": "assets/sprites/enemigo-cuchillo-v1.png", "impact": "assets/sprites/explosion-impacto-v1.png", "wolfSprint": "assets/sprites/lobo-carrera-cuatro-patas-v1.png", "enemy": "assets/sprites/soldado-enemigo-v1.png", "melee": "assets/sprites/soldado-cuchillo-hacha-v1.png", "kicks": "assets/sprites/lobo-patadas-v1.png", "powerSheet": "assets/sprites/poderes-v1.png", "orbitalSheet": "assets/sprites/orbital-superrayo-v1.png", "soldier": "assets/sprites/soldado-v2.png", "climb": "assets/sprites/soldado-escalada-v2.png", "walk": "assets/sprites/soldado-pasos-v3.png", "slide": "assets/sprites/soldado-deslizamiento-v1.png", "wolf": "assets/sprites/soldado-lobo-v1.png", "wolfClimb": "assets/sprites/lobo-escalada-v1.png", "transformation": "assets/sprites/soldado-transformacion-v2.png", "city": "assets/worlds/mission-08/manhattan-v1.png", "midtown": "assets/worlds/mission-08/midtown-v1.png", "plaza": "assets/worlds/mission-08/plaza-final-v1.png", "nyProps": "assets/sprites/nueva-york-trafico-v1.png", "carDamage":"assets/sprites/ny-cruce-impactos.webp","patrolDamage":"assets/sprites/ny-patrulla-impactos.webp","streetCars": "assets/sprites/nueva-york-cruce-v2.webp", "nyTroops": "assets/sprites/nueva-york-policias-soldados-v1.png", "commander": "assets/sprites/comandante-nueva-york-v1.png", "robotBoss": "assets/sprites/titan-nueva-york-v1.png"};function create(images){let ctx,player,stats,mode,state;const props={3:[1089,140,341,154],5:[395,536,330,119]},troops=ArcadeAdvancedForms.atlas(images.nyTroops,4,4),commander=ArcadeAdvancedForms.atlas(images.commander,4,4),robot=ArcadeAdvancedForms.atlas(images.robotBoss,4,4,{y:[0,.25,.5,756/1024,1],x:{1:[0,.25,.48,.75,1]}});
  function art(c,img,frames,index,x,y,k,flip=false,anchor=false,hit=0){const f=frames[index];c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip?-1:1,1);root.ArcadeImpact.hitSprite(c,hit,img,...f,Math.round(anchor?(f[0]-(index%4+.5)*img.width/4)*k:-f[2]*k/2),-Math.round(f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();}
  const trafficFrames=[[209,125,416,397],[813,125,422,397],[199,635,434,361],[807,635,436,361]];
  function vehicle(c,car){
   if(!car.visible||car.x+car.w/2<state.camera.x||car.x-car.w/2>state.camera.x+960)return;
   const width=Math.max(1,Math.round(car.w)),height=Math.max(1,Math.round(car.h));
   c.save();c.translate(Math.round(car.x),Math.round(car.y));
   c.fillStyle='rgba(24,21,24,.48)';c.beginPath();c.ellipse(0,-1,width*.47,Math.max(1,width*.075),0,0,Math.PI*2);c.fill();
   const f=trafficFrames[(car.sedan?2:0)+(car.outbound?1:0)];
   if(car.stage){
    const img=images.carDamage,sw=img.width/3,sh=img.height/4;
    const row=(car.sedan?2:0)+(car.outbound?1:0);
    c.drawImage(img,(car.stage-1)*sw,row*sh,sw,sh,-Math.round(width/2),-height,width,height);
   }else c.drawImage(images.streetCars,...f,-Math.round(width/2),-height,width,height);
   c.restore();
  }
  function patrolBody(c,img,frame,car){
   const [sx,sy,sw,sh]=frame,{x,y,w,h}=car;
   // Lengthen the cabin between the axles. The wheels and bumpers retain the atlas scale.
   const src=[0,Math.round(sw*.32),Math.round(sw*.67),sw];
   const dst=[0,Math.round(src[1]*h/sh),w-Math.round((sw-src[2])*h/sh),w];
   for(let i=0;i<3;i++)c.drawImage(img,sx+src[i],sy,src[i+1]-src[i],sh,x-w/2+dst[i],y-h,dst[i+1]-dst[i],h);
  }
  function parkedPatrol(c,car,time){
   const {x,y,w,h}=car;c.fillStyle='#17182070';c.beginPath();c.ellipse(x,y,w*.45,3,0,0,Math.PI*2);c.fill();
   if(car.stage){
    const img=images.patrolDamage,sw=img.width/3;
    patrolBody(c,img,[(car.stage-1)*sw,0,sw,img.height],car);
    return;
   }
   patrolBody(c,images.nyProps,props[3],car);
   const blue=Math.floor(time*4)%2===0;c.fillStyle=blue?'#96dfff':'#ffa7a3';
   c.fillRect(Math.round(x)+(blue?-11:3),Math.round(y-h*.94),5,2);
  }
  function crossing(c,car,floor){
   const map=ArcadeNewYorkWorld.panorama(floor),district=ArcadeNewYorkWorld.districts[floor];
   const [sx,sy]=district.signal;
   const x=Math.round(car.center-Math.round(map.width*district.vanishing)+sx*map.width/900);
   const y=Math.round(map.top+sy*map.height/600),stop=car.warn||car.active;
   // Re-light the glass inside the pedestrian head painted on this corner.
   c.fillStyle='#241e19';c.fillRect(x-4,y-6,8,12);
   c.fillStyle=stop?'#ff682f':'#83ec98';
   const glyph=stop?['01110','11111','11111','01110','00100']:['00100','00110','01100','00110','01001'];
   for(let row=0;row<glyph.length;row++)for(let col=0;col<5;col++)if(glyph[row][col]==='1')c.fillRect(x+col-2,y+row*2-5,1,2);
  }
  function barricade(c,b){
   const floor=b.y+b.thickness,split=b.w*.51,drop=b.hp?(5-b.hp)*.014:Math.min(1,b.fall/.48);
   const lean=b.hp?drop:.56*(drop*drop),settle=b.hp?1:1-.72*drop;
   c.save();c.translate(Math.round(b.x),floor);
   c.fillStyle='#25222c55';c.beginPath();c.ellipse(b.w/2,0,b.w*.52,2.5,0,0,Math.PI*2);c.fill();
   for(const side of [-1,1]){
    const foot=side===-1?6:b.w-6;
    c.save();c.translate(foot,0);c.scale(1,settle);c.rotate(-side*lean);c.translate(-foot,0);
    c.beginPath();c.moveTo(side<0?-2:b.w+2,-b.thickness);c.lineTo(split,-b.thickness);
    c.lineTo(split-3,-b.thickness*.8);c.lineTo(split+1,-b.thickness*.7);c.lineTo(split-2,-b.thickness*.5);
    c.lineTo(split,2);c.lineTo(side<0?-2:b.w+2,2);c.closePath();c.clip();
    c.drawImage(images.nyProps,...props[5],0,-b.thickness,b.w,b.thickness);c.restore();
   }
   c.restore();
  }
  function title(c,small,big,detail){c.fillStyle='#081b29ec';c.fillRect(0,0,960,66);c.fillRect(0,458,960,82);c.textAlign='center';c.fillStyle='#ffc96c';c.font='bold 15px monospace';c.fillText(small,480,39);c.fillStyle='#ebf7ed';c.font='bold 25px monospace';c.fillText(big,480,491);c.fillStyle='#b8d5d6';c.font='12px monospace';c.fillText(detail,480,520);}
  function background(c,s){
   const img=[images.city,images.midtown,images.plaza][s.floor];
   if(s.floor===2){const height=Math.round(img.height*960/img.width);c.drawImage(img,0,472-Math.round(893*height/1024),960,height);return;}
   const {width,height,top,origin}=ArcadeNewYorkWorld.panorama(s.floor);
   const camera=Math.round(s.camera.x),first=Math.floor((camera-origin)/width),last=Math.floor((camera+960-origin)/width);
   for(let i=first;i<=last;i++)c.drawImage(img,origin+i*width-camera,top,width,height);
  }
  function troop(c,n,ally=false){if(n.hp<=0&&n.death<=0)return;let index=0,base=0;if(ally){base=n.variant?4:0;index=state.ending>7&&n.variant?7:base+(n.flash>0?2+(n.variant?0:1):Math.abs(n.vx)>10?(n.variant?1:1+Math.floor(n.anim*7)%2):0);}else if(n.kind==='cityAssault'){base=8;index=n.flash>0?11:Math.abs(n.vx)>10?8+Math.floor(n.anim*8)%2:10;}else if(n.kind==='cityGrenadier'){base=12;index=n.throwAge!=null?(n.throwAge<.28?13:14):n.grenadeWait>5.12?15:12;}else{if(ArcadeEnemySpecialists.drawRam(c,n,images.ramHit)||ArcadeEnemySpecialists.draw(c,n,images))return;const row=n.hp<=0||n.hit>0||n.flash>0?3:Math.abs(n.vx)>10?1:0,frame=n.hp<=0?3:n.hit>0?2:n.flash>0?0:Math.floor(n.anim*8)%4,f=ENEMY_FRAMES[row][frame],k=.21;c.save();c.translate(n.x,n.y);c.scale(n.facing||1,1);if(n.hp<=0)c.globalAlpha=Math.min(1,n.death*2);c.drawImage(images.enemy,...f.slice(0,4),-f[2]*k/2,-f[3]*k,f[2]*k,f[3]*k);c.restore();return;}
   c.save();if(n.hp<=0){c.globalAlpha=Math.min(1,n.death*2);c.translate(n.x,n.y);const fall=ally?Math.min(1,(1.35-n.death)/.42):.62;c.rotate((n.facing||1)*1.45*fall*fall);c.translate(-n.x,-n.y);}if(n.hit>0)c.filter='brightness(1.6)';art(c,images.nyTroops,troops,index,n.x,n.y,(ally?46:48)/troops[base][3],n.facing<0,true);c.restore();if(ally&&n.hp>0){c.fillStyle=n.joined?'#81dbf5':'#d9e9ba';c.font='bold 8px monospace';c.textAlign='center';c.fillText(n.joined?'ALIADO':'ACÉRCATE',n.x,n.y-56);if(n.hp<n.maxHp){c.fillStyle='#15292c';c.fillRect(n.x-10,n.y-54,20,3);c.fillStyle='#9adcbb';c.fillRect(n.x-10,n.y-54,5*n.hp,2);}}else if(n.hp>0){c.fillStyle='#111e27';c.fillRect(n.x-18,n.y-60,36,4);c.fillStyle='#e49b74';c.fillRect(n.x-17,n.y-59,34*n.hp/n.maxHp,2);}window.ArcadeEnemySpecialists?.aimFlash?.(c,n);}
  function boss(c,s){const b=s.boss,k=238/robot[3][3];let r=0;if(b.stage===1){r=b.phase==='cockpit'?(b.age<.8?1:2):0;art(c,images.robotBoss,robot,r,b.robotX,472,k,false,true);let f=b.phase==='retreat'?8+Math.floor(b.anim*10)%2:b.phase==='climb'?b.age<.5?10:b.age<1.1?11:12:b.phase==='cockpit'?13:b.phase==='grenadeWarn'?4:b.phase==='grenade'?5:b.phase==='slide'?6:b.phase==='rifle'?3:b.hit>0?7:0;if(b.phase!=='cockpit'||b.age<.65){art(c,images.commander,commander,f,b.x,b.y,59/commander[0][3],b.facing<0,true,b.hit);}}
   else{r=s.ending>=0?s.ending<1?12:s.ending<2.5?13:s.ending<4?14:15:b.phase==='gatling'?6+Math.floor(b.age*10)%2:b.phase==='missile'?8:b.phase==='stompWarn'?9:b.phase==='stomp'?10:b.phase==='sweep'||b.phase==='sweepWarn'?11:b.phase==='recover'?4+Math.floor(b.anim*4)%2:b.hit>0?12:3;art(c,images.robotBoss,robot,r,b.x,472,k,b.facing>0,true,b.hit);if(s.ending>=0&&s.ending<5){for(let i=0;i<3;i++)ArcadeBossAttackSprites.draw(c,'blast',(s.ending+i*.17)%1,b.x+Math.sin(i*4+s.ending)*60,370-i*40,80,80,{duration:1});}}
   for(const x of b.targets){c.strokeStyle='#ffc77c';c.lineWidth=2;c.strokeRect(x-40,463,80,8);c.fillStyle='#ff77552a';c.fillRect(x-12,0,24,472);}for(const h of s.hazards){if(h.type==='wave')ArcadeBossAttackSprites.draw(c,'shock',h.age,h.x,472,68,42,{ground:true});else if(h.type==='missile')ArcadeBossAttackSprites.draw(c,'missile',h.age,h.x,h.y,40,20,{angle:Math.PI/2});else ArcadeBossAttackSprites.draw(c,'slash',h.age,h.x,447,190,75,{flip:h.dir<0});}}
  function draw(c,s,p,e,powers,profile){ctx=c;player=p;stats=e;mode=s.mode||{};state=s;c.save();c.imageSmoothingEnabled=false;ArcadeNewYorkWorld.updateCamera(s,p);background(c,s);c.save();c.translate(-Math.round(s.camera.x),0);const visible=x=>x>s.camera.x-200&&x<s.camera.x+1160;
   if(s.floor<2){
     const decor=root.ArcadeSceneryAnimation;
     if(decor?.next&&s.intro>=4){
       const rat=decor.next(s,'avenida',s.time);
       if(rat){
         const pan=ArcadeNewYorkWorld.panorama(s.floor);
         if(rat.floor!==s.floor){rat.floor=s.floor;rat.anchor=null;}
         if(rat.anchor===null){
           const near=p.x+80+rat.seed*90,block=(near-pan.origin)/pan.width;
           const sidewalks=[.16,.72].map(side=>pan.origin+(Math.round(block-side)+side)*pan.width);
           rat.anchor=sidewalks.reduce((a,b)=>Math.abs(a-near)<Math.abs(b-near)?a:b);
         }
         const x=rat.anchor+rat.u*92;
         if(visible(x))decor.paint(c,rat.id,rat.frame,x,s.geometry.curb-6,39,rat.alpha*.93);
       }
     }
     for(let x=358;x<ArcadeNewYorkWorld.widths[s.floor];x+=1680){
       if(visible(x))root.ArcadeSceneryAnimation?.draw(c,'steam',s.time,x,445,48,.92,x%8);
     }
   }
   if(s.floor<2){for(const car of s.traffic)if(visible(car.center))crossing(c,car,s.floor);for(const car of s.parked)if(visible(car.x))parkedPatrol(c,car,s.time);
    for(const barrier of s.barriers)if(visible(barrier.x))barricade(c,barrier);
    for(const car of s.traffic)if(!car.front)vehicle(c,car);
    if(s.activePickup)ArcadePickupRenderer.draw(c,s.activePickup,s.time,p);
    const stations=ArcadeNewYorkWorld.checkpoints.map(x=>({id:x,x,y:472,inside:false}));ArcadeCheckpoints.draw(c,{stations,active:s.checkpointX,visited:new Set(stations.filter(v=>v.x<=s.checkpointX).map(v=>v.id)),flash:0},false,s.time,{left:s.camera.x,right:s.camera.x+960,top:0,bottom:540});const end=ArcadeNewYorkWorld.widths[s.floor];if(visible(end-200)){c.fillStyle='#11252be8';c.fillRect(end-380,370,350,36);c.fillStyle='#c8e8de';c.font='bold 14px monospace';c.textAlign='center';c.fillText(s.floor===0?'↑ HACIA MIDTOWN':'↑ ENTRAR A LA PLAZA FINAL',end-205,393);}}
   else boss(c,s);for(const n of s.enemies)if(visible(n.x))troop(c,n);for(const a of s.allies)if(visible(a.x))troop(c,a,true);c.save();if(p.respawnProtection>0)c.globalAlpha*=ArcadeProgression.respawnAlpha(p);if(s.ending<0)ArcadePhysics.jumpTurn.apply(c,p);drawCharacter(c,images,p,e,mode,s.geometry.platforms);if(p.form!=='wolf'&&p.form!=='zombie'&&!p.rope&&!p.ladder&&!p.transform)ArcadeWeaponRenderer.draw(c,p,e);if(p.jetpack)ArcadeJetpackRenderer.draw(c,p,s.geometry.platforms,'front',p.fuelMax);c.restore();for(const car of s.traffic)if(car.front)vehicle(c,car);ArcadeMissionCombat.draw(c,e,powers,p,{left:s.camera.x,right:s.camera.x+960,top:0,bottom:540});for(const d of s.debris)ArcadeBossAttackSprites.draw(c,'blast',d.age,d.x,d.y,140,110,{ground:true,duration:1,loop:false});c.restore();
   const label={arrival:'EL COMANDANTE',rifleWarn:'RÁFAGA · SALTA O ESQUIVA',grenadeWarn:'GRANADA · MUÉVETE',slideWarn:'EMBESTIDA · SALTA',retreat:'EL COMANDANTE SE RETIRA',climb:'ESTÁ SUBIENDO AL ROBOT',cockpit:'CABINA CERRÁNDOSE',robotArrival:'FASE 2 · TITÁN DE ACERO',gatlingWarn:'AMETRALLADORA · CAMBIA DE ALTURA',missileWarn:'MISILES · SAL DE LAS MARCAS',stompWarn:'PISOTÓN · SALTA LAS ONDAS',sweepWarn:'BARRIDO · ALÉJATE',recover:'¡AHORA! CONTRAATACA'}[s.boss.phase];if(s.floor===2&&s.boss.active&&s.ending<0&&label){c.fillStyle='#12232bdd';c.fillRect(300,40,360,23);c.fillStyle='#ffe1a9';c.font='bold 13px monospace';c.textAlign='center';c.fillText(label,480,56);}if(s.intro<4)title(c,'MISIÓN 08','NUEVA YORK','Sede del Consorcio · Policía aliada');if(s.travel>=0){
    const t=s.travel,shade=Math.min(1,t/1.15,(3-t)/1.15);
    c.save();c.globalAlpha=Math.max(0,shade);c.fillStyle='#0e1924';c.fillRect(0,0,960,540);
    const destination=s.floor+(t<1.5?1:0);c.textAlign='center';c.fillStyle='#ffd493';c.font='bold 18px monospace';
    c.fillText(destination===1?'MIDTOWN':'LA ÚLTIMA PLAZA',480,270);c.restore();
   }if(s.ending>=0)title(c,'MISIÓN 08 COMPLETADA','NUEVA YORK LIBERADA',s.ending<7?'El Titán de Acero colapsa. La policía asegura la plaza.':'Contrato cerrado · Progreso guardado');c.restore();}
  return{draw,props,troops,commander,robot};
 }function drawCharacter(ctx,images,player,stats,mode,platforms){
  function sprite(img,frames,row,frame,scale,lift=0){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y-lift));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}

if(player.cloak>0&&Math.floor(player.cloak*9)%4!==0)return;
    if(ArcadeZombieForm.drawPlayer(ctx,player))return;if(window.ArcadeRobotForm?.draw(ctx,player,stats))return;
    // A contact shadow belongs to the supporting floor, never to airborne feet.
    if(player.grounded&&!player.jetpack&&!player.rope&&!player.ladder){ctx.fillStyle='#16202255';ctx.beginPath();ctx.ellipse(player.x,player.y+1,16,3,0,0,Math.PI*2);ctx.fill();}
    if(player.transform>0){const t=Math.min(7,Math.floor((1-player.transform/1.2)*8)),pose=ArcadeSoldierAnimation.transformation(player.form==='wolf'?t:7-t),frames={soldier:SOLDIER_V2_FRAMES,wolf:ACTION_FRAMES.wolf,transformation:ArcadeSoldierAnimation.transformationFrames};sprite(images[pose.sheet],frames[pose.sheet],pose.row,pose.frame,pose.scale);return;}
    if(ArcadeSoldierAnimation.basePose(ctx,player,mode,stats))return;
    if(player.form==='wolf'){
      const idlePose=ArcadeSoldierAnimation.wolfIdlePose(player,mode),comboPose=ArcadeSoldierAnimation.wolfComboPose(player),ramPose=ArcadeSoldierAnimation.wolfRamPose(player),airPose=ArcadeSoldierAnimation.wolfAirPose(player),sprintPose=ArcadeSoldierAnimation.wolfSprintPose(player),walkPose=ArcadeSoldierAnimation.wolfWalkPose(player,mode);
      if(player.ladder||player.rope?.mantle)sprite(images.wolfClimb,WOLF_CLIMB_FRAMES,0,((Math.floor(player.y/6.5)%4)+4)%4,WOLF_CLIMB_SCALE);
      else if(player.rope)sprite(images.wolf,ACTION_FRAMES.wolf,4,Math.floor(player.hangCycle||0)%4,.48);
      else if(ramPose)sprite(images.wolfRam,ArcadeSoldierAnimation.wolfRamFrames,ramPose.row,ramPose.frame,ArcadeSoldierAnimation.wolfRamScale);
      else if(comboPose)sprite(comboPose.sheet==='actions'?images.wolfActions:images.wolfCombos,comboPose.sheet==='actions'?ArcadeSoldierAnimation.wolfActionFrames:ArcadeSoldierAnimation.wolfComboFrames,comboPose.row,comboPose.frame,comboPose.scale);
      else if(player.claw>0)sprite(images.wolf,ACTION_FRAMES.wolf,1,Math.min(7,Math.floor((.3-player.claw)/.3*8)),.48);
      else if(airPose)sprite(airPose.sheet==='jump'?images.wolfJump:images.wolf,airPose.sheet==='jump'?ArcadeSoldierAnimation.wolfJumpFrames:ACTION_FRAMES.wolf,airPose.row,airPose.frame,airPose.sheet==='jump'?.24:.48);
      else if(sprintPose)sprite(images.wolfSprint,WOLF_SPRINT_FRAMES,sprintPose.row,sprintPose.frame,WOLF_SPRINT_SCALE);
      else if(mode.crouching)sprite(images.wolf,ACTION_FRAMES.wolf,2,1,.48);
      else if(walkPose)sprite(images.wolfWalk,WOLF_WALK_FRAMES,walkPose.row,walkPose.frame,WOLF_WALK_SCALE);
      else if(idlePose)sprite(images.wolfActions,ArcadeSoldierAnimation.wolfActionFrames,idlePose.row,idlePose.frame,idlePose.scale,idlePose.lift);
      else sprite(images.wolfActions,ArcadeSoldierAnimation.wolfActionFrames,0,0,ArcadeSoldierAnimation.wolfActionScale);
      return;
    }
    const pose=ArcadeSoldierAnimation.pose(player,mode,stats);if(player.jetpack)ArcadeJetpackRenderer.draw(ctx,player,platforms,'back',player.fuelMax);
    if(player.rope&&player.rope.length>4){ctx.strokeStyle='#a6c5c2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(player.x,player.y-44);ctx.lineTo(player.rope.x,player.rope.y);ctx.stroke();}
    if(pose.sheet==='mobility')sprite(images.climb,CLIMB_FRAMES,pose.row,pose.frame,CLIMB_SCALE);
    else{
      const gait=ArcadeSoldierAnimation.gait(player,mode);
      const img=pose.sheet==='crouch'?images.crouch:pose.sheet==='melee'?images.melee:pose.sheet==='slide'?images.slide:images.soldier;
      const frames=pose.sheet==='crouch'?CROUCH_FRAMES:pose.sheet==='melee'?MELEE_FRAMES:pose.sheet==='slide'?SLIDE_FRAMES:SOLDIER_V2_FRAMES;
      const scale=pose.sheet==='crouch'?CROUCH_SCALE:pose.sheet==='melee'?MELEE_SCALE:pose.sheet==='slide'?SLIDE_SCALE:SOLDIER_V2_SCALE;
      ArcadeSoldierAnimation.drawGait(ctx,player,gait,
        stepFrame=>gait?.flight?sprite(images.soldier,SOLDIER_V2_FRAMES,4,0,SOLDIER_V2_SCALE):sprite(images.walk,WALK_FRAMES,0,stepFrame,WALK_SCALE),
        bob=>{ctx.save();ctx.translate(0,bob);sprite(img,frames,pose.row,pose.frame,scale);ctx.restore();},pose.sheet==='melee'?pose:null);
    }
  }

root.ArcadeNewYorkRenderer={create,paths,drawCharacter};
})(window);
