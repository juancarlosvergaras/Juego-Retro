(function(root){'use strict';const paths={
   shoppers:'assets/sprites/compradores-centro.webp',
   atriumUpper:'assets/worlds/mission-06/atrio-alto.webp',galleryUpper:'assets/worlds/mission-06/galeria-alta.webp',foodUpper:'assets/worlds/mission-06/restaurantes-altos.webp',
   rifleSteps:'assets/sprites/quimera-pasos-rifle.webp',knifeSteps:'assets/sprites/quimera-pasos-knife.webp',
   wardenSteps:'assets/sprites/quimera-pasos-warden.webp',fighterSteps:'assets/sprites/quimera-pasos-fighter.webp',
   rifleActions:'assets/sprites/quimera-rifle.png',knifeActions:'assets/sprites/quimera-knife.png',wardenActions:'assets/sprites/quimera-warden.png',"expansion":"assets/sprites/enemigos-expansion-v1.png","giantEffects":"assets/sprites/coloso-impactos-v1.png","zombieCast":"assets/sprites/zombi-disparo-direcciones-v1.png","jetMk2":"assets/sprites/jetpack-mk2-v1.png","zombieRun":"assets/sprites/zombi-carrera-v2.png","shock":"assets/sprites/electrocucion-v1.png","checkpointPc":"assets/sprites/checkpoint-pc-v1.png","wolfJump":"assets/sprites/lobo-salto-carrera-v1.png","formTransition":"assets/sprites/transformaciones-jugador-v3.png","zombieIdle":"assets/sprites/zombi-soldado-reposo-v1.png","zombieSoldier":"assets/sprites/zombi-soldado-v1.png","zombieSoldierExtra":"assets/sprites/zombi-soldado-extra-v1.png","zombiePlayer":"assets/sprites/zombi-electrico-v1.png","zombieExtra":"assets/sprites/zombi-electrico-extra-v1.png","wolfActions":"assets/sprites/lobo-reposo-patadas-v2.png","wolfCombos":"assets/sprites/lobo-combos-v1.png","wolfRam":"assets/sprites/lobo-cabezazo-v1.png","ramHit":"assets/sprites/enemigos-embestida-v1.png","wolfWalk":"assets/sprites/lobo-caminata-v2.png","crouch":"assets/sprites/soldado-agachado-pasos-v1.png","turret":"assets/sprites/enemigo-torreta-v1.png","knife":"assets/sprites/enemigo-cuchillo-v1.png","impact":"assets/sprites/explosion-impacto-v1.png","wolfSprint":"assets/sprites/lobo-carrera-cuatro-patas-v1.png","enemy":"assets/sprites/soldado-enemigo-v1.png","melee":"assets/sprites/soldado-cuchillo-hacha-v1.png","kicks":"assets/sprites/lobo-patadas-v1.png","powerSheet":"assets/sprites/poderes-v1.png","orbitalSheet":"assets/sprites/orbital-superrayo-v1.png","soldier":"assets/sprites/soldado-v2.png","climb":"assets/sprites/soldado-escalada-v2.png","walk":"assets/sprites/soldado-pasos-v3.png","slide":"assets/sprites/soldado-deslizamiento-v1.png","wolf":"assets/sprites/soldado-lobo-v1.png","wolfClimb":"assets/sprites/lobo-escalada-v1.png","transformation":"assets/sprites/soldado-transformacion-v2.png","atrium":"assets/worlds/mission-06/atrio.webp","gallery":"assets/worlds/mission-06/galeria.webp","food":"assets/worlds/mission-06/restaurantes.webp","roof":"assets/worlds/mission-06/ciudad.webp","roofDeck":"assets/worlds/mission-06/piso-azotea.webp","giant":"assets/sprites/coloso-exterior.webp","mallProps":"assets/sprites/centro-comercial-objetos-v1.png"};function create(images){let ctx,player,stats,mode,state;const props=ArcadeAdvancedForms.atlas(images.mallProps,4,3,{y:[0,.378,.661,1],x:{0:[0,.25,.5,.708,1]}}),art=root.ArcadeMallStageArt,giantEffects=ArcadeAdvancedForms.atlas(images.giantEffects,4,2,{y:[0,.62,1]});
  function sprite(img,frames,row,frame,scale,lift=0){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y-lift));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
  function drawJetpack(layer='back'){ArcadeJetpackRenderer.draw(ctx,player,state.geometry.platforms,layer,player.fuelMax);}
  function drawPlayer(){if(player.cloak>0&&Math.floor(player.cloak*9)%4!==0)return;
    if(player.form==='fighter'&&player.grounded&&!player.transform&&!player.fighterPose&&!player.hurt&&!player.crouching&&player.victoryAge===undefined){
     art.gait(ctx,images.fighterSteps,player,.77,state.time,player.walkCycle||0);return;
    }
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

  function prop(c,index,x,base,height){
   const f=props[index],width=Math.round(height*f[2]/f[3]);
   c.drawImage(images.mallProps,...f,Math.round(x-width/2),base-height,width,height);
  }
  function supplies(c,s,p,floor,camera){
   if(camera<210&&camera+960>130)prop(c,9,170,472,38);
   if(floor===3)return;
   for(const item of ArcadeMallWorld.pickups(s))
    if(item.x>=camera-32&&item.x<=camera+992&&!s.taken.has(item.id))root.ArcadePickupRenderer.draw(c,item,s.time,p);
  }
  function title(c,small,big,detail){c.fillStyle='#081b29eb';c.fillRect(0,0,960,66);c.fillRect(0,458,960,82);c.textAlign='center';c.fillStyle='#ffc96c';c.font='bold 15px monospace';c.fillText(small,480,39);c.fillStyle='#ebf7ed';c.font='bold 25px monospace';c.fillText(big,480,491);c.fillStyle='#b8d5d6';c.font='12px monospace';c.fillText(detail,480,520);}
  function draw(c,s,p,e,powers,profile){ctx=c;player=p;stats=e;mode=s.mode||{};state=s;c.save();c.imageSmoothingEnabled=false;
   // One floor at a time: the crossing between floors happens behind a veil.
   const panorama=art.background(c,s,images);
   root.ArcadeMallShoppers.draw(c,s,images.shoppers,panorama);
   if(s.floor===3){art.giant(c,s,images.giant);art.rooftop(c,images.roofDeck,s.time);}
   art.stairwell(c,s,images);
   c.save();c.translate(-Math.round(s.camera.x),-s.camera.y);
   art.escalators(c,s,false);
   if(s.floor<3){
    for(const pl of s.geometry.platforms)if(pl.kind==='balcony')art.balcony(c,pl);
   }
   supplies(c,s,p,s.floor,s.camera.x);
   if(s.floor===0){
    const x=s.arcadeX,base=ArcadeMallWorld.FLOOR,left=x-85,top=base-88;
    c.fillStyle='#182629';c.fillRect(left,top,170,88);
    for(let y=top+4;y<base-6;y+=5){c.fillStyle=y%2?'#25373a':'#2a373a';c.fillRect(left+4,y,162,1);}
    for(const post of [left,left+165]){c.fillStyle='#3c4342';c.fillRect(post,top,5,88);c.fillStyle='#99866d';c.fillRect(post+1,top,1,88);}
    c.fillStyle='#726b51';c.fillRect(left,top,170,3);
    c.fillStyle='#55605a';c.fillRect(left+2,base-5,166,5);
    prop(c,3,x,base-62,41);
    for(let i=0;i<3;i++)prop(c,i,x+(i-1)*47,base,44);
   }
   for(const n of s.enemies){if(n.x<s.camera.x-100||n.x>s.camera.x+1060||n.hp<=0&&n.death<=0)continue;let row=n.hp<=0?3:n.hit>0?3:n.flash>0?3:Math.abs(n.vx)>10?1:0,frame=n.hp<=0?3:n.hit>0?2:n.flash>0?0:Math.floor((n.anim||0)*8)%4;if(ArcadeEnemySpecialists.drawRam(c,n,images.ramHit))continue;if(!art.guard(c,n,images,s.time)&&!ArcadeEnemySpecialists.draw(c,n,images)){const f=ENEMY_FRAMES[row][frame],k=.21;c.save();c.translate(n.x,n.y);c.scale(n.facing||-1,1);if(n.hp<=0)c.globalAlpha=Math.min(1,n.death*2);c.drawImage(images.enemy,...f.slice(0,4),-f[2]*k/2,-f[3]*k,f[2]*k,f[3]*k);c.restore();}if(n.hp>0){const barY=n.y-Math.max(n.h||46,n.kind==='warden'?57:46)-7;c.fillStyle='#111e27';c.fillRect(n.x-17,barY,34,4);c.fillStyle='#e09a72';c.fillRect(n.x-16,barY+1,32*n.hp/n.maxHp,2);}window.ArcadeEnemySpecialists?.aimFlash?.(c,n);}
   c.save();if(s.ending<0)ArcadePhysics.jumpTurn.apply(c,p);
   if(s.ending>=7&&p.form==='fighter')ArcadeAdvancedForms.draw(c,{...p,victoryAge:s.ending-7});
   else if(p.form==='tank'&&p.grounded&&p.ground?.terrain&&s.floor<3){
    // The tread spans several steps; its front and rear follow the incline through both landings.
    const stair=ArcadeMallWorld.escalator(s.floor),span=80;
    const rise=ArcadeMallWorld.treadY(stair,p.x+span/2)-ArcadeMallWorld.treadY(stair,p.x-span/2);
    c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(rise,span));c.translate(-p.x,-p.y);drawPlayer();c.restore();
   }else drawPlayer();
   if(s.ending<0&&!p.rope&&!p.ladder&&!p.transform&&!['wolf','zombie'].includes(p.form))ArcadeWeaponRenderer.draw(c,p,e);
   if(p.jetpack)drawJetpack('front');
   c.restore();
   art.escalators(c,s,true);
   ArcadeMissionCombat.draw(c,e,powers,p,{left:s.camera.x,right:s.camera.x+960,top:s.camera.y,bottom:s.camera.y+540});
   for(const f of s.debris)for(let i=0;i<14;i++){const t=f.age,x=f.x+Math.sin(i*7)*100*t,y=f.y-Math.abs(Math.cos(i*4))*130*t+110*t*t;c.fillStyle=i%2?'#b8b49b':'#5f7076';c.fillRect(Math.round(x),Math.round(y),7-i%3,5+i%4);}
   if(s.floor===3&&s.boss.active&&s.ending<0)art.hazards(c,s,images,giantEffects);
   c.restore();
   art.veil(c,s);
   if(s.intro<4)title(c,'MISIÓN 06','EL ÚLTIMO CENTRO','La fachada del Consorcio · Sube hasta la antena de la azotea.');
   if(s.ending>=6)title(c,'MISIÓN 06 COMPLETADA','EL COLOSO HA CAÍDO','Antena desconectada · Próximo destino: Nueva York');
   c.restore();
  }
  return{draw,props};

 }
 root.ArcadeMallRenderer={create,paths};
})(window);
