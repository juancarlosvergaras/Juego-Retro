(function(root){
'use strict';const paths={"expansion": "assets/sprites/enemigos-expansion-v1.png", "zombieCast": "assets/sprites/zombi-disparo-direcciones-v1.png", "jetMk2": "assets/sprites/jetpack-mk2-v1.png", "zombieRun": "assets/sprites/zombi-carrera-v2.png", "shock": "assets/sprites/electrocucion-v1.png", "checkpointPc": "assets/sprites/checkpoint-pc-v1.png", "wolfJump": "assets/sprites/lobo-salto-carrera-v1.png", "formTransition": "assets/sprites/transformaciones-jugador-v3.png", "zombieIdle": "assets/sprites/zombi-soldado-reposo-v1.png", "zombieSoldier": "assets/sprites/zombi-soldado-v1.png", "zombieSoldierExtra": "assets/sprites/zombi-soldado-extra-v1.png", "zombiePlayer": "assets/sprites/zombi-electrico-v1.png", "zombieExtra": "assets/sprites/zombi-electrico-extra-v1.png", "wolfActions": "assets/sprites/lobo-reposo-patadas-v2.png", "wolfCombos": "assets/sprites/lobo-combos-v1.png", "wolfRam": "assets/sprites/lobo-cabezazo-v1.png", "ramHit": "assets/sprites/enemigos-embestida-v1.png", "wolfWalk": "assets/sprites/lobo-caminata-v2.png", "crouch": "assets/sprites/soldado-agachado-pasos-v1.png", "turret": "assets/sprites/enemigo-torreta-v1.png", "knife": "assets/sprites/enemigo-cuchillo-v1.png", "impact": "assets/sprites/explosion-impacto-v1.png", "wolfSprint": "assets/sprites/lobo-carrera-cuatro-patas-v1.png", "enemy": "assets/sprites/soldado-enemigo-v1.png", "melee": "assets/sprites/soldado-cuchillo-hacha-v1.png", "kicks": "assets/sprites/lobo-patadas-v1.png", "powerSheet": "assets/sprites/poderes-v1.png", "orbitalSheet": "assets/sprites/orbital-superrayo-v1.png", "soldier": "assets/sprites/soldado-v2.png", "climb": "assets/sprites/soldado-escalada-v2.png", "walk": "assets/sprites/soldado-pasos-v3.png", "slide": "assets/sprites/soldado-deslizamiento-v1.png", "wolf": "assets/sprites/soldado-lobo-v1.png", "wolfClimb": "assets/sprites/lobo-escalada-v1.png", "transformation": "assets/sprites/soldado-transformacion-v2.png", "space": "assets/worlds/mission-07/nave-alienigena-v1.png", "aliens": "assets/sprites/aliens-tripulacion-v1.png", "crewWalk":"assets/sprites/tripulacion-marcha-v2.webp", "airlock":"assets/sprites/esclusa-nave-v1.webp", "sovereign": "assets/sprites/soberano-horror-v2.png", "sovereignAttack":"assets/sprites/soberano-ataques-v2.png", "sovereignFx":"assets/sprites/soberano-efectos-v2.png"};function create(images){let ctx,player,stats,mode,state;const aliens=ArcadeAdvancedForms.atlas(images.aliens,4,4,{y:[0,310/1122,580/1122,825/1122,1],x:{1:[0,.25,.52,.75,1],2:[0,.25,.5,.765,1],3:[0,.25,.5,.778,1]}}),bossFrames=ArcadeSovereignAnimation.prepare(images.sovereign,4,[0,318/1182,587/1182,882/1182,1]),attackFrames=ArcadeSovereignAnimation.prepare(images.sovereignAttack,6,[0,.264,.509,.737,1]),fxFrames=ArcadeAdvancedForms.atlas(images.sovereignFx,4,4,{y:[0,302/1024,518/1024,738/1024,1]});
  function sprite(img,frames,row,frame,scale,lift=0){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y-lift));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
  function drawJetpack(layer='back'){ArcadeJetpackRenderer.draw(ctx,player,state.geometry.platforms,layer,player.fuelMax);}
  function drawPlayer(){if(player.cloak>0&&Math.floor(player.cloak*9)%4!==0)return;
    if(ArcadeZombieForm.drawPlayer(ctx,player))return;if(window.ArcadeRobotForm?.draw(ctx,player,stats))return;
    // A contact shadow belongs to the supporting floor, never to airborne feet.
    if(player.grounded&&!player.jetpack&&!player.rope&&!player.ladder){ctx.fillStyle='#16202255';ctx.beginPath();ctx.ellipse(player.x,player.y+1,16,3,0,0,Math.PI*2);ctx.fill();}
    if(player.transform>0){const t=Math.min(7,Math.floor((1-player.transform/1.2)*8)),pose=ArcadeSoldierAnimation.transformation(player.form==='wolf'?t:7-t),frames={soldier:SOLDIER_V2_FRAMES,wolf:ACTION_FRAMES.wolf,transformation:ArcadeSoldierAnimation.transformationFrames};sprite(images[pose.sheet],frames[pose.sheet],pose.row,pose.frame,pose.scale);return;}
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
    const pose=ArcadeSoldierAnimation.pose(player,mode,stats);if(player.jetpack)drawJetpack();
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

  function art(c,image,f,x,y,k,flip=false){c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip?-1:1,1);c.drawImage(image,...f,-Math.round(f[2]*k/2),-Math.round(f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();}
  function title(c,small,big,detail){c.fillStyle='#091321e8';c.fillRect(0,0,960,64);c.fillRect(0,454,960,86);c.textAlign='center';c.fillStyle='#94ebe9';c.font='bold 14px monospace';c.fillText(small,480,32);c.fillStyle='#eee6ff';c.font='bold 27px monospace';c.fillText(big,480,491);c.font='12px monospace';c.fillStyle='#c3c4e4';c.fillText(detail,480,520);}
  function enemy(c,n){
   const pilot=n.kind==='alienPilot',elite=n.kind==='alienElite',down=n.hp<=0;
   const fallen=down&&(pilot||n.death<.5),moving=!pilot&&!down&&!n.flash&&!n.hit&&Math.abs(n.vx)>5;
   c.save();c.translate(Math.round(n.x),Math.round(n.y));c.scale(n.facing,1);
   if(down)c.globalAlpha=Math.min(1,n.death*3);
   if(n.hit>0)c.filter='brightness(1.35)';
   if(moving){
    const step=Math.floor(n.walkCycle||0)%8;
    c.drawImage(images.crewWalk,step*144,elite?144:0,144,144,-36,-68,72,72);
   }else{
    const index=pilot?(down?11:n.flash>0?10:8):elite?(fallen?15:n.flash>0?14:n.shot<.45?13:12):
     fallen?7:down?6:n.flash>0?5:n.hit>0?6:4;
    const f=aliens[index],k=pilot?112/285:elite?58/259:58/255;
    // Register feet/hips (or cockpit), not the changing width of the shot and its flash.
    const pivots=[0,0,0,0,156,505,878,1204,172,522,860,1219,155,497,840,1190];
    if(down&&!pilot&&!fallen)c.rotate(-(.8-n.death)*1.45);
    if(pilot&&!fallen&&n.flash<=0)c.rotate(Math.sin(n.age*2)*.07);
    c.drawImage(images.aliens,...f,Math.round((f[0]-pivots[index])*k),-Math.round(f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));
   }
   c.restore();
   if(!down){root.ArcadeMissionKit.enemyBar(c,n,n.h+9);
    if(n.shot<=.42&&!n.flash&&n.frozen<=0){const m=ArcadeSpaceWorld.crewMuzzle(n),size=2+Math.round((.42-n.shot)*6);c.fillStyle='#a5ffff';c.fillRect(Math.round(m.x)-size/2,Math.round(m.y)-size/2,size,size);}
   }
  }
  function boss(c,s){const b=s.boss;if(!b.active)return;const pose=root.ArcadeSovereignAnimation.pose(b,s.ending),attack=pose.sheet==='attack',fs=attack?attackFrames:bossFrames,img=attack?images.sovereignAttack:images.sovereign,f=fs[pose.index],cols=attack?6:4,k=270/(attack?attackFrames[0][3]:bossFrames[4][3]);c.save();if(b.hit>0)c.filter='brightness(1.6)';c.translate(Math.round(b.x),Math.round(b.y));if(b.facing===1)c.scale(-1,1);c.drawImage(f.image,0,0,f[2],f[3],Math.round((f[0]-(pose.index%cols+.5)*img.width/cols)*k),-Math.round(f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();}
  function alienFx(c,row,index,x,y,w,h,ground=false){const f=fxFrames[row*4+index];c.save();c.imageSmoothingEnabled=false;c.drawImage(images.sovereignFx,...f,Math.round(x-w/2),Math.round(y-h*(ground?1:.5)),Math.round(w),Math.round(h));c.restore();}
  function airlock(c,x,y,openness){
   c.save();c.translate(x,y);c.fillStyle='#0e101f';c.fillRect(-34,-99,68,99);
   c.save();c.globalAlpha=.34;c.drawImage(images.space,804,615,219,270,-34,-94,68,94);c.restore();
   const leaf=Math.round(35*(1-Math.max(0,Math.min(1,openness))));
   if(leaf>0)for(const dir of [-1,1]){
    c.save();c.scale(dir,1);c.beginPath();c.rect(35-leaf,-96,leaf,96);c.clip();
    c.drawImage(images.space,950,625,91,247,35-leaf,-96,35,96);
    c.fillStyle='#71788d';c.fillRect(35-leaf,-96,2,96);c.restore();
   }
   c.drawImage(images.airlock,-49,-120,98,120);c.restore();
  }
  function draw(c,s,p,e,powers,profile){ctx=c;player=p;stats=e;mode=s.mode||{};state=s;c.save();c.imageSmoothingEnabled=false;const img=images.space,half=img.height/2;
   const deckLine=s.floor===0?391:378,scale=472/deckLine,tile=Math.round(img.width*scale);
   const first=Math.floor(s.camera.x/tile);
   for(let i=first;i*tile-s.camera.x<960;i++){
    const x=Math.round(i*tile-s.camera.x);c.save();c.translate(i%2?x+tile:x,0);if(i%2)c.scale(-1,1);
    c.drawImage(img,0,s.floor===0?0:half+2,img.width,half-3,0,0,tile,Math.round((half-3)*scale));c.restore();
   }
   if(s.floor===0){for(let i=0;i<6;i++){const x=((i*317-s.time*24-s.camera.x*.08)%1900+1900)%1900-45;if(x>750&&x<980)art(c,images.aliens,aliens[8],x,26+i%3*17,.075);}}
   c.save();c.translate(-Math.round(s.camera.x),0);
   for(const pl of s.geometry.platforms.slice(1)){if(pl.x+pl.w<s.camera.x||pl.x>s.camera.x+960)continue;
    for(const x of [pl.x+12,pl.x+pl.w-20]){
     c.strokeStyle='#23263d';c.lineWidth=6;c.beginPath();c.moveTo(x,pl.y+14);c.lineTo(x+9,pl.y+34);c.lineTo(x+24,pl.y+14);c.stroke();
    }c.fillStyle='#304858';c.fillRect(pl.x,pl.y,pl.w,16);c.fillStyle='#92f0e8';c.fillRect(pl.x,pl.y,pl.w,3);for(let i=0;i<pl.w;i+=26){c.fillStyle='#152335';c.fillRect(pl.x+i+5,pl.y+6,15,5);}}
   const beacons=[140,...[2500,4800,7300].filter(x=>x<ArcadeSpaceWorld.widths[s.floor]-500)];for(const x of beacons){if(x<s.camera.x-100||x>s.camera.x+1060)continue;ArcadeCheckpoints.draw(c,{stations:[{id:x,x,y:472,inside:false}],active:x<=s.checkpointX?x:null,visited:new Set(x<=s.checkpointX?[x]:[]),flash:0},false,s.time,{left:s.camera.x,right:s.camera.x+960,top:0,bottom:540});}
   if(s.floor<2){for(let i=0;i<Math.floor(ArcadeSpaceWorld.widths[s.floor]/1000);i++){const x=850+i*950;if(s.taken.has(s.floor+'-'+i))continue;if(i%4===3||i%4===1)root.ArcadePickupRenderer.draw(c,{id:i,type:i%4===3?'star':'health',x,y:472,amount:3},s.time,p);else{for(const [j,slot]of [3,5,6].entries())root.ArcadePickupRenderer.draw(c,{type:'ammo',slot,x:x+(j-1)*50,y:472},s.time,p);root.ArcadePickupRenderer.fuel(c,{x:x+88,y:472});}}const end=ArcadeSpaceWorld.widths[s.floor];
    if(end-225<s.camera.x+960)airlock(c,end-155,472,s.travel>=0?Math.max(0,1-s.travel):.88);
   }
   if(s.floor>0&&s.camera.x<220)airlock(c,140,472,s.travel>=0?Math.min(1,s.travel-1):Math.max(0,1-Math.abs(p.x-140)/110));
   for(const n of s.enemies)if(n.x>s.camera.x-150&&n.x<s.camera.x+1110&&(n.hp>0||n.death>0))enemy(c,n);if(s.floor===2)boss(c,s);
   {drawPlayer();if(!['wolf','zombie'].includes(p.form)&&!p.transform&&!p.rope&&!p.ladder)ArcadeWeaponRenderer.draw(c,p,e);if(p.jetpack)drawJetpack('front');}
   ArcadeMissionCombat.draw(c,e,powers,p,{left:s.camera.x,right:s.camera.x+960,top:0,bottom:540});
   for(const h of s.hazards){if(h.type==='tentacle'){alienFx(c,0,h.age<.18?0:h.age<.4?1:h.age<.56?2:3,h.x,472,130,120,true);}else if(h.type==='laser'){const frame=fxFrames[4+Math.floor(h.age*18)%4],sx=frame[0]+frame[2]*.34,sw=frame[2]*.66;const mouth=ArcadeSpaceWorld.laserSegment(s.boss,h.y,h.aimX);c.save();c.translate(mouth.x,mouth.y);const dx=mouth.tx-mouth.x,dy=mouth.ty-mouth.y;c.rotate(Math.atan2(dy,dx));c.drawImage(images.sovereignFx,sx,frame[1],sw,frame[3],0,-16,Math.hypot(dx,dy),32);c.restore();}else if(h.type==='wave'){alienFx(c,2,Math.floor(h.age*12)%4,h.x,h.y,66,50,true);}else alienFx(c,3,Math.floor(h.age*10)%2,h.x,h.y,56,65);}
   for(const f of s.debris)alienFx(c,3,2+Math.min(1,Math.floor(f.age*3)),f.x,f.y,95,80,true);
   c.restore();
   if(s.floor===2&&s.boss.active&&s.ending<0){const b=s.boss;for(const target of b.targets){c.fillStyle='#ac86ff44';if(b.phase==='laserWarn'){const a=ArcadeSpaceWorld.laserSegment(b,target,b.laserX);c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(a.ty-a.y,a.tx-a.x));c.fillRect(0,-20,Math.hypot(a.tx-a.x,a.ty-a.y),40);c.restore();}else c.fillRect(target-40,b.phase==='podsWarn'?0:362,80,b.phase==='podsWarn'?472:110);}const text={arrival:'EL SOBERANO DEL VACÍO',lashWarn:'TENTÁCULOS · SAL DE LA MARCA',waveWarn:'ONDA · SALTA',laserWarn:'LÁSER · CAMBIA DE ALTURA',podsWarn:'CÁPSULAS · EVITA LAS MARCAS',recover:'NÚCLEO EXPUESTO · ¡ATACA!'}[b.phase];if(text){c.font='bold 14px monospace';c.fillStyle='#11192ee6';c.fillRect(480-c.measureText(text).width/2-16,76,c.measureText(text).width+32,22);c.fillStyle='#c7edff';c.font='bold 14px monospace';c.textAlign='center';c.fillText(text,480,92);}}
   if(s.intro<4)title(c,'MISIÓN 7','EL SOBERANO DEL VACÍO','Desde la azotea has seguido la señal. Cruza el casco y corta la transmisión.');
   if(s.travel>=0){c.save();c.fillStyle='#091421';c.globalAlpha=Math.min(1,(1-Math.abs(s.travel-1))*1.25);c.fillRect(0,0,960,540);c.restore();}
   if(s.ending>=0){if(s.ending>3){
     const t=Math.min(1,(s.ending-3)/5),ease=t*t*(3-2*t);
     const x=s.boss.x+(p.x-s.boss.x)*ease,y=s.boss.y-122+(p.y-34-(s.boss.y-122))*ease-85*Math.sin(t*Math.PI);
     const size=36+22*Math.sin(t*Math.PI);if(s.ending<9)ArcadePowerSprites.draw(c,'alien',Math.floor(s.time*7)%4,x,y,size,size);
    }title(c,'MISIÓN 7 COMPLETADA',s.ending<9?'EL SOBERANO HA CAÍDO':'PULSO DEL VACÍO DESBLOQUEADO',s.ending<9?'La nave pierde su control. El núcleo alienígena queda libre.':'Poder permanente recuperado · Próximo destino: Nueva York');}c.restore();
  }
  return{draw};
 }
 root.ArcadeSpaceRenderer={create,paths};
})(window);
