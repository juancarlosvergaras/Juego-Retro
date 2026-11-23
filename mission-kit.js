(function(root){
  'use strict';
  // Piezas que las tres misiones compartían copiadas: el dibujo del soldado
  // enemigo con su barra de vida, el aviso único de cada jefe y el arnés de
  // depuración. Un solo sitio, un solo comportamiento.
  const SCALE=.19;
  // Cuadro del soldado enemigo según lo que está haciendo. Los pasos siguen la
  // distancia recorrida y la caída empieza con un tambaleo antes de quedar en el suelo.
  function enemyPose(n){
    if(n.hp<=0)return{row:3,frame:n.death>.62?2:3};
    if(n.hit>0)return{row:3,frame:2};
    if(n.flash>0)return{row:3,frame:n.flash>.08?0:1};
    if(!n.grounded)return{row:2,frame:n.vy< -150?1:n.vy<50?2:3};
    if(Math.abs(n.vx)>10)return{row:1,frame:Math.floor((n.runCycle||0)*4)%4};
    return{row:0,frame:Math.floor((n.anim||0)*4)%4};
  }
  function drawEnemy(ctx,n,image,frames=root.ENEMY_FRAMES){
    if(!image||!frames)return;const q=enemyPose(n),f=frames[q.row][q.frame];
    ctx.save();if(n.hp<=0)ctx.globalAlpha=Math.min(1,n.death*2);ctx.translate(Math.round(n.x),Math.round(n.y));ctx.scale(n.facing||1,1);
    ctx.drawImage(image,f[0],f[1],f[2],f[3],-(f[5]??f[2]/2)*SCALE,-f[3]*SCALE,f[2]*SCALE,f[3]*SCALE);ctx.restore();
  }
  // Barra de vida segmentada y marca de alerta, iguales en todas las misiones.
  function enemyBar(ctx,n,lift=59){
    if(n.throwAge!=null)root.ArcadeGrenades.drawHand(ctx,n);
    if(n.hp<=0)return;const x=Math.round(n.x),y=Math.round(n.y-lift);
    ctx.fillStyle='#17232d';ctx.fillRect(x-19,y,38,6);ctx.fillStyle=n.hit>0?'#fff0ad':'#e77b60';ctx.fillRect(x-18,y+1,Math.round(36*n.hp/n.maxHp),4);
    ctx.fillStyle='#17232d';for(let i=1;i<n.maxHp&&n.maxHp<=6;i++)ctx.fillRect(x-18+Math.round(i*36/n.maxHp),y+1,1,4);
    if(n.alert){ctx.fillStyle=n.awareness==='sight'?'#ff9b70':'#ffe5a0';ctx.font='bold 10px monospace';ctx.fillText(n.awareness==='sight'?'!':'?',x-3,y-5);}
    // Aviso de disparo sobre el soldado ya dibujado; la torreta pinta el suyo en enemy-specialists.js.
    if(n.kind!=='turret')(typeof module!=='undefined'&&module.exports?require('./enemy-specialists.js'):root.ArcadeEnemySpecialists)?.aimFlash?.(ctx,n);
  }
  // Cada aviso de jefe ocurre una vez por partida.
  function once(staged,presentation){return(id,kind,...text)=>{if(!presentation||staged[id])return false;staged[id]=true;presentation[kind](...text);return true;};}
  function clock(seconds){const s=Math.max(0,Math.floor(seconds||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  // Arnés de depuración (?debug): avanza la simulación a mano y redibuja una
  // vez, para poder verificar aunque la pestaña esté en segundo plano.
  function debug(fields,{step,redraw,dead}){
    fields.advance=(seconds=1)=>{const steps=Math.round(seconds*120);for(let i=0;i<steps&&!dead();i++)step(1/120);redraw();return steps;};
    return fields;
  }
  function drawShooter(ctx,player,mode,stats,images,powers,platforms){
    ctx.save();
    ArcadePhysics.jumpTurn.apply(ctx,player);
    if(player.jetpack)ArcadeJetpackRenderer.pose(ctx,player);
    if(player.hurt>0)ctx.globalAlpha*=.65;
    ctx.globalAlpha*=ArcadeProgression.respawnAlpha(player);
    if(player.cloak>0)ctx.globalAlpha*=.18;
    drawPlayer();
    if(player.jetpack)drawJetpack('front');
    if((player.form==='soldier'||player.form==='robot')&&!player.transform&&!player.rope&&!player.ladder&&!powers.flame){
      const pose=ArcadeSoldierAnimation.pose(player,mode,stats);
      if(pose.armed||player.form==='robot'){
        const gait=player.form==='robot'?null:ArcadeSoldierAnimation.gait(player,mode,stats);
        if(gait)ctx.translate(0,gait.bob);
        ArcadeWeaponRenderer.draw(ctx,player,stats);
      }
    }
    ctx.restore();
    function sprite(img,frames,row,frame,scale,lift=0){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y-lift));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
    function drawJetpack(layer='back'){ArcadeJetpackRenderer.draw(ctx,player,platforms,layer,player.fuelMax);}
    function drawPlayer(){
      if(ArcadeZombieForm.drawPlayer(ctx,player))return;if(root.ArcadeRobotForm?.draw(ctx,player,stats))return;
      // A contact shadow belongs to the supporting floor, never to airborne feet.
      if(player.grounded&&!player.jetpack&&!player.rope&&!player.ladder){ctx.fillStyle='#16202255';ctx.beginPath();ctx.ellipse(player.x,player.y+1,16,3,0,0,Math.PI*2);ctx.fill();}
      if(player.transform>0){const t=Math.min(7,Math.floor((1-player.transform/1.2)*8)),pose=ArcadeSoldierAnimation.transformation(player.form==='wolf'?t:7-t),frames={soldier:SOLDIER_V2_FRAMES,wolf:ACTION_FRAMES.wolf,transformation:ArcadeSoldierAnimation.transformationFrames};sprite(images[pose.sheet],frames[pose.sheet],pose.row,pose.frame,pose.scale);return;}
      if(ArcadeSoldierAnimation.basePose(ctx,player,mode,stats))return;
      if(player.form==='wolf'){
        ctx.save();ArcadeSoldierAnimation.applyWolfMotion(ctx,player,mode);drawWolf();ctx.restore();return;
      }
      drawSoldier();
    }
    function drawWolf(){
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
    }
    function drawSoldier(){
      const pose=ArcadeSoldierAnimation.pose(player,mode,stats);if(player.jetpack)drawJetpack();
      if(player.rope&&player.rope.length>4){ctx.strokeStyle='#a6c5c2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(player.x,player.y-44);ctx.lineTo(player.rope.x,player.rope.y);ctx.stroke();}
      if(pose.sheet==='mobility')sprite(images.climb,CLIMB_FRAMES,pose.row,pose.frame,CLIMB_SCALE);
      else{
        const gait=ArcadeSoldierAnimation.gait(player,mode,stats);
        const img=pose.sheet==='crouch'?images.crouch:pose.sheet==='melee'?images.melee:pose.sheet==='slide'?images.slide:images.soldier;
        const frames=pose.sheet==='crouch'?CROUCH_FRAMES:pose.sheet==='melee'?MELEE_FRAMES:pose.sheet==='slide'?SLIDE_FRAMES:SOLDIER_V2_FRAMES;
        const scale=pose.sheet==='crouch'?CROUCH_SCALE:pose.sheet==='melee'?MELEE_SCALE:pose.sheet==='slide'?SLIDE_SCALE:SOLDIER_V2_SCALE;
        ArcadeSoldierAnimation.drawGait(ctx,player,gait,
          stepFrame=>gait?.flight?sprite(images.soldier,SOLDIER_V2_FRAMES,4,0,SOLDIER_V2_SCALE):sprite(images.walk,WALK_FRAMES,0,stepFrame,WALK_SCALE),
          bob=>{ctx.save();ctx.translate(0,bob);sprite(img,frames,pose.row,pose.frame,scale);ctx.restore();},pose.sheet==='melee'?pose:null);
      }
    }
  }
  const api={drawShooter,SCALE,enemyPose,drawEnemy,enemyBar,once,clock,debug};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionKit=api;
})(typeof window!=='undefined'?window:globalThis);
