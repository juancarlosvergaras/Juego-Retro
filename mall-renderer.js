(function(root){'use strict';const paths={"expansion":"assets/sprites/enemigos-expansion-v1.png","giantEffects":"assets/sprites/coloso-impactos-v1.png","zombieCast":"assets/sprites/zombi-disparo-direcciones-v1.png","jetMk2":"assets/sprites/jetpack-mk2-v1.png","zombieRun":"assets/sprites/zombi-carrera-v2.png","shock":"assets/sprites/electrocucion-v1.png","checkpointPc":"assets/sprites/checkpoint-pc-v1.png","wolfJump":"assets/sprites/lobo-salto-carrera-v1.png","formTransition":"assets/sprites/transformaciones-jugador-v3.png","zombieIdle":"assets/sprites/zombi-soldado-reposo-v1.png","zombieSoldier":"assets/sprites/zombi-soldado-v1.png","zombieSoldierExtra":"assets/sprites/zombi-soldado-extra-v1.png","zombiePlayer":"assets/sprites/zombi-electrico-v1.png","zombieExtra":"assets/sprites/zombi-electrico-extra-v1.png","wolfActions":"assets/sprites/lobo-reposo-patadas-v2.png","wolfCombos":"assets/sprites/lobo-combos-v1.png","wolfRam":"assets/sprites/lobo-cabezazo-v1.png","ramHit":"assets/sprites/enemigos-embestida-v1.png","wolfWalk":"assets/sprites/lobo-caminata-v2.png","crouch":"assets/sprites/soldado-agachado-pasos-v1.png","turret":"assets/sprites/enemigo-torreta-v1.png","knife":"assets/sprites/enemigo-cuchillo-v1.png","impact":"assets/sprites/explosion-impacto-v1.png","wolfSprint":"assets/sprites/lobo-carrera-cuatro-patas-v1.png","enemy":"assets/sprites/soldado-enemigo-v1.png","melee":"assets/sprites/soldado-cuchillo-hacha-v1.png","kicks":"assets/sprites/lobo-patadas-v1.png","powerSheet":"assets/sprites/poderes-v1.png","orbitalSheet":"assets/sprites/orbital-superrayo-v1.png","soldier":"assets/sprites/soldado-v2.png","climb":"assets/sprites/soldado-escalada-v2.png","walk":"assets/sprites/soldado-pasos-v3.png","slide":"assets/sprites/soldado-deslizamiento-v1.png","wolf":"assets/sprites/soldado-lobo-v1.png","wolfClimb":"assets/sprites/lobo-escalada-v1.png","transformation":"assets/sprites/soldado-transformacion-v2.png","mall":"assets/worlds/mission-06/centro-comercial-v1.png","giant":"assets/sprites/gigante-azotea-v1.png","mallProps":"assets/sprites/centro-comercial-objetos-v1.png"};function create(images){let ctx,player,stats,mode,state;const props=ArcadeAdvancedForms.atlas(images.mallProps,4,3,{y:[0,.378,.661,1],x:{0:[0,.25,.5,.708,1]}}),giant=ArcadeAdvancedForms.atlas(images.giant,4,3),giantEffects=ArcadeAdvancedForms.atlas(images.giantEffects,4,2,{y:[0,.62,1]});
  function sprite(img,frames,row,frame,scale,lift=0){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y-lift));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
  function drawJetpack(layer='back'){ArcadeJetpackRenderer.draw(ctx,player,state.geometry.platforms,layer,player.fuelMax);}
  function drawPlayer(){
    if(ArcadeZombieForm.drawPlayer(ctx,player))return;if(window.ArcadeRobotForm?.draw(ctx,player))return;
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

  function prop(c,index,x,y,width){const f=props[index],k=width/f[2];c.drawImage(images.mallProps,...f,Math.round(x-width/2),Math.round(y-f[3]*k),Math.round(width),Math.round(f[3]*k));}
  function title(c,small,big,detail){c.fillStyle='#081b29eb';c.fillRect(0,0,960,66);c.fillRect(0,458,960,82);c.textAlign='center';c.fillStyle='#ffc96c';c.font='bold 15px monospace';c.fillText(small,480,39);c.fillStyle='#ebf7ed';c.font='bold 25px monospace';c.fillText(big,480,491);c.fillStyle='#b8d5d6';c.font='12px monospace';c.fillText(detail,480,520);}
  function background(c,s){
   const img=images.mall,w=img.width,h=img.height;
   if(s.floor===3){for(let x=-s.camera.x%960-960;x<960;x+=960)c.drawImage(img,0,h*2/3,w,h/3,Math.floor(x),0,960,540);return;}
   // A doorway is about twice the 46px soldier's height. Scale both axes equally;
   // the upper galleries fill the tall viewport instead of stretching the shops.
   const tile=Math.round(w*.62),scale=tile/w,unit=h/1254;
   const sy=s.floor===0?0:424*unit,base=(s.floor===0?380:625)*unit;
   const top=472-(base-sy)*scale,galleryY=424*unit,galleryH=280*unit,step=galleryH*scale;
   c.save();c.beginPath();c.rect(0,0,960,472);c.clip();
   for(let x=-s.camera.x%tile-tile;x<960;x+=tile){const dx=Math.floor(x);
    for(let bottom=top;bottom>0;bottom-=step){const y=Math.floor(bottom-step);c.drawImage(img,0,galleryY,w,galleryH,dx,y,tile,Math.ceil(bottom)-y);}
    c.drawImage(img,0,sy,w,base-sy,dx,Math.floor(top),tile,472-Math.floor(top));
   }c.restore();
  }
  function drawGiant(c,s){const b=s.boss;if(!b.active&&s.ending<0)return;let index=b.phase==='arrival'?Math.min(3,Math.floor(b.age*1.5)):b.phase==='fistWarn'?4:b.phase==='fist'?5:b.phase==='rocksWarn'?6:b.phase==='rocks'?7:b.phase==='sweep'||b.phase==='sweepWarn'?8:b.hit>0?9:Math.floor(s.time*3)%3;
   if(s.ending>=0)index=s.ending<2?9:s.ending<4?10:11;const f=giant[index],scale=345/giant[0][3],sink=s.ending>=4?Math.min(340,(s.ending-4)*110):b.phase==='arrival'?Math.max(0,1-b.age/2.5)*310:0;c.save();c.beginPath();c.rect(0,0,960,455);c.clip();if(b.hit>0)c.filter='brightness(1.3)';c.drawImage(images.giant,...f,b.x-f[2]*scale/2,455-f[3]*scale+sink,f[2]*scale,f[3]*scale);c.restore();
   // The parapet always occludes the waist: the boss never has visible legs.
   c.fillStyle='#2c3d44';c.fillRect(515,447,435,25);c.fillStyle='#7c8986';c.fillRect(509,445,447,5);c.fillStyle='#192832';for(let i=0;i<9;i++)c.fillRect(521+i*48,456,40,2);
  }
  function draw(c,s,p,e,powers,profile){ctx=c;player=p;stats=e;mode=s.mode||{};state=s;c.save();c.imageSmoothingEnabled=false;s.camera.x=Math.max(0,Math.min(ArcadeMallWorld.widths[s.floor]-960,p.x-320));s.camera.y=0;
   background(c,s);
   c.fillStyle=s.floor===3?'#293842':'#364b4d';c.fillRect(0,472,960,68);c.fillStyle='#9a9a80';c.fillRect(0,472,960,4);for(let i=0;i<25;i++){const x=i*60-s.camera.x%60;c.fillStyle='#526165';c.fillRect(x,480,58,1);c.fillStyle='#24363d';c.fillRect(x,485,1,55);}if(s.floor===2){c.fillStyle='#d99b5b12';c.fillRect(0,0,960,472);}if(s.floor===3)drawGiant(c,s);
   c.save();c.translate(-Math.round(s.camera.x),0);
   if(s.floor<3){for(let i=0;i<Math.floor(ArcadeMallWorld.widths[s.floor]/450);i++){const x=380+i*450;if(x>s.camera.x-100&&x<s.camera.x+1100)prop(c,6,x,472,94);}for(const pl of s.geometry.platforms.filter(n=>n.kind==='balcony')){c.fillStyle='#233b45';c.fillRect(pl.x,pl.y,pl.w,14);c.fillStyle='#9bab9c';c.fillRect(pl.x,pl.y,pl.w,3);c.fillStyle='#577d83';c.fillRect(pl.x+10,pl.y-27,4,27);c.fillRect(pl.x+pl.w-14,pl.y-27,4,27);c.fillRect(pl.x+10,pl.y-27,pl.w-20,3);}
    const end=ArcadeMallWorld.widths[s.floor];const escalator=props[4+Math.floor(s.time*5)%2];c.drawImage(images.mallProps,...escalator,end-550,162,500,310);c.fillStyle='#374e54';c.fillRect(end-135,200,135,19);c.fillStyle='#b2aa84';c.fillRect(end-141,196,141,5);c.fillStyle='#10242be0';c.fillRect(end-560,125,480,37);c.fillStyle='#ffe2a5';c.font='bold 16px monospace';c.textAlign='center';c.fillText(s.floor===2?'↑ ACCESO A LA AZOTEA':'↑ ESCALERA · PLANTA '+(s.floor+2),end-320,149);
    // Subtle moving amber step markers sit on the same slope as the ride.
    c.fillStyle='#efcd745c';for(let i=0;i<12;i++){const t=(i/12+s.time*.13)%1;c.fillRect(Math.round(end-410+t*300),Math.round(472-t*272),22,2);}
   }
   prop(c,9,170,472,52);c.font='bold 10px monospace';c.fillStyle='#adf2bc';c.textAlign='center';c.fillText('CHECK POINT',170,383);
   if(s.floor===0){c.fillStyle='#061722d9';c.fillRect(826,286,318,186);c.strokeStyle='#659c9a';c.lineWidth=2;c.strokeRect(826,286,318,186);prop(c,3,985,339,162);for(let i=0;i<3;i++)prop(c,i,895+i*90,472,45);c.fillStyle='#d4fce2';c.font='12px monospace';c.fillText('↑ ENTRAR · TRES JUEGOS',985,367);}
   if(s.floor<3)for(const [id,x,type]of [['kit',400,'health'],['ammo',1410,'ammo'],['star',1980,'star'],['fuel',ArcadeMallWorld.widths[s.floor]-650,'fuel']])if(!s.taken.has(s.floor+'-'+id)){if(type==='ammo'){for(const [i,slot]of [3,5,6].entries())root.ArcadePickupRenderer.draw(c,{type,slot,x:x+(i-1)*50,y:472},s.time,p);}else root.ArcadePickupRenderer.draw(c,{id,type,x,y:472,amount:3},s.time,p);}
   for(const n of s.enemies){if(n.x<s.camera.x-100||n.x>s.camera.x+1060||n.hp<=0&&n.death<=0)continue;let row=n.hp<=0?3:n.hit>0?3:n.flash>0?3:Math.abs(n.vx)>10?1:0,frame=n.hp<=0?3:n.hit>0?2:n.flash>0?0:Math.floor((n.anim||0)*8)%4;if(ArcadeEnemySpecialists.drawRam(c,n,images.ramHit))continue;if(!ArcadeEnemySpecialists.draw(c,n,images)){const f=ENEMY_FRAMES[row][frame],k=.21;c.save();c.translate(n.x,n.y);c.scale(n.facing||-1,1);if(n.hp<=0)c.globalAlpha=Math.min(1,n.death*2);c.drawImage(images.enemy,...f.slice(0,4),-f[2]*k/2,-f[3]*k,f[2]*k,f[3]*k);c.restore();}if(n.hp>0){c.fillStyle='#111e27';c.fillRect(n.x-20,n.y-67,40,5);c.fillStyle='#e09a72';c.fillRect(n.x-19,n.y-66,38*n.hp/n.maxHp,3);}}
   if(!(s.ending>=7)){drawPlayer();if(p.form!=='wolf'&&p.form!=='zombie'&&!p.rope&&!p.ladder&&!p.transform)ArcadeWeaponRenderer.draw(c,p,e);if(p.jetpack)drawJetpack('front');}
   ArcadeMissionCombat.draw(c,e,powers,p,{left:s.camera.x,right:s.camera.x+960,top:0,bottom:540});
   for(const f of s.debris)for(let i=0;i<14;i++){const t=f.age,x=f.x+Math.sin(i*7)*100*t,y=f.y-Math.abs(Math.cos(i*4))*130*t+110*t*t;c.fillStyle=i%2?'#b8b49b':'#5f7076';c.fillRect(Math.round(x),Math.round(y),7-i%3,5+i%4);}
   c.restore();
   const b=s.boss;if(s.floor===3&&b.active&&s.ending<0){for(const x of b.targets){c.fillStyle='#ff7d4c3b';c.fillRect(x-55,160,110,312);c.strokeStyle='#ffc48c';c.strokeRect(x-55,450,110,19);}for(const h of s.hazards){if(h.type==='rock'){const f=giantEffects[4+Math.floor(h.age*9)%4],k=72/giantEffects[4][2];c.drawImage(images.giantEffects,...f,h.x-f[2]*k/2,h.y-f[3]*k/2,f[2]*k,f[3]*k);}else if(h.type==='wave'){root.ArcadeBossAttackSprites?.draw(c,'shock',h.age,h.x,472,65,45,{ground:true});}else{const f=giantEffects[h.age<.07?0:h.age<.13?1:h.age<.43?2:3],k=150/giantEffects[0][2],bottom=472-(h.age<.13?180*(1-h.age/.13):h.age>.43?(h.age-.43)*500:0),top=bottom-f[3]*k;c.drawImage(images.giantEffects,f[0]+f[2]*.38,f[1]+10,f[2]*.24,65,h.x-20,0,40,Math.max(0,top+20));c.drawImage(images.giantEffects,...f,h.x-f[2]*k/2,top,f[2]*k,f[3]*k);}}const label={arrival:'EL COLOSO DEL CENTRO',fistWarn:'PUÑO · ALÉJATE DE LA MARCA',sweepWarn:'BARRIDO · SALTA',rocksWarn:'ESCOMBROS · SAL DE LAS MARCAS',recover:'¡AHORA! ATACA AL TORSO'}[b.phase];if(label){c.fillStyle='#0e202ce8';c.fillRect(180,373,430,28);c.fillStyle='#ffe0a4';c.font='bold 14px monospace';c.textAlign='center';c.fillText(label,395,392);}}
   if(s.intro<4)title(c,'MISIÓN 6','EL ÚLTIMO CENTRO','Tres plantas · Escaleras mecánicas · Arcade · Azotea');if(s.travel>=0)title(c,'ESCALERAS MECÁNICAS',s.floor===2?'HACIA LA AZOTEA':'HACIA LA PLANTA '+(s.floor+2),'La siguiente planta activa un nuevo CHECK POINT');
   if(s.ending>=0){if(s.ending>=7){const original=player;player={...p,x:480,y:450,grounded:true,vx:0,transform:0,hurt:0};if(p.form==='fighter')ArcadeAdvancedForms.draw(c,{...player,victoryAge:s.ending-7,swimming:false,onMotorcycle:false});else drawPlayer();player=original;}title(c,'MISIÓN 6 COMPLETADA','EL CENTRO VUELVE A RESPIRAR',s.ending<7?'El Coloso pierde el equilibrio y cae detrás del edificio.':'Azotea despejada · Progreso y récords guardados');}c.restore();
  }
  return{draw,props,giant};
 }
 root.ArcadeMallRenderer={create,paths};
})(window);
