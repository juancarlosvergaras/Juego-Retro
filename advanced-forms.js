(function(root){
 'use strict';
 const paths={hero:'assets/sprites/quimera-hero.png',transitionFx:'assets/sprites/transformacion-energia-v1.png',enemyStyle:'assets/sprites/enemigos-estilo-soldado-v2.png',tankJump:'assets/sprites/mini-tanque-salto-v1.png',alienPower:'assets/sprites/poder-alien-v1.png',tank:'assets/sprites/mini-tanque-submarino-v1.png',fighter:'assets/sprites/luchador-soldado-v3.png'};
 paths.fighterCombat='assets/sprites/luchador-golpes-quimera.webp';
 const sheets={},frames={};
 function atlas(image,cols=4,rows=4,cuts={}){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);const data=g.getImageData(0,0,c.width,c.height).data,out=[];
  for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){const x0=Math.round((cuts.x?.[r]?.[col]??col/cols)*c.width),x1=Math.round((cuts.x?.[r]?.[col+1]??(col+1)/cols)*c.width),y0=Math.round((cuts.y?.[r]??r/rows)*c.height),y1=Math.round((cuts.y?.[r+1]??(r+1)/rows)*c.height);let l=x1,t=y1,b=y0,right=x0;for(let y=y0+2;y<y1-2;y++)for(let x=x0+2;x<x1-2;x++)if(data[(y*c.width+x)*4+3]>200){l=Math.min(l,x);right=Math.max(right,x);t=Math.min(t,y);b=Math.max(b,y);}out.push(right>l?[l,t,right-l+1,b-t+1]:[x0,y0,x1-x0,y1-y0]);}return out;
 }
 // La recompensa del nivel también debe estar lista para su escena final.
 const gear={tank:'tank',tankJump:'tank',hero:'hero',fighter:'fighter',fighterCombat:'fighter'};
 const pending=new Map();
 function loadSheet(id){
   if(pending.has(id))return pending.get(id);
   const request=new Promise((resolve,reject)=>{
     const image=new Image();
     image.onload=()=>resolve(image);
     image.onerror=()=>reject(Error(paths[id]));
     image.src=paths[id];
   }).then(image=>{
     const sheet=id==='hero'||id==='fighterCombat'?image:(root.prepareWhiteDeath?.(image)||image);
     sheets[id]=sheet;
     if(id==='hero')frames.hero=[[24,8,62,84]];
     if(id==='tank')frames.tank=atlas(sheet);
     if(id==='tankJump')frames.tankJump=atlas(sheet,4,3,{y:[0,400/1086,770/1086,1]});
     if(id==='fighter')frames.fighter=atlas(sheet,4,6,{y:[0,275/1536,535/1536,800/1536,1050/1536,1240/1536,1],x:{2:[0,.25,.5,.786,1]}});
     if(id==='transitionFx')root.ArcadeFormTransition?.setEffects(sheet);
     if(id==='enemyStyle')root.ArcadeExpansionEnemies?.setStyleSheet(sheet);
     if(id==='alienPower')root.ArcadePowerSprites?.setAlienSheet(sheet);
     if(['hero','tank','fighter'].includes(id)){
       const f=frames[id][0],height=id==='hero'?54:id==='tank'?f[3]*105/f[2]:57;
       root.ArcadeFormTransition?.setEndpoint(id,sheet,f,height);
     }
   }).catch(error=>{pending.delete(id);throw error;});
   pending.set(id,request);
   return request;
 }
 function load(player,reward){
   const required=Object.keys(paths).filter(id=>!player||!gear[id]||gear[id]===reward||
     player.form===gear[id]||player[gear[id]+'Unlocked']);
   const baseForms=['soldier','wolf','robot','zombie','tank','fighter'].filter(form=>!player||form==='soldier'||form==='wolf'||player.form===form||form===reward||player[form+'Unlocked']);
   return Promise.all([root.ArcadeBossAttackSprites?.load(),...required.map(loadSheet),...baseForms.map(form=>root.ArcadeSoldierAnimation?.loadBase?.(form))]);
 }
 function icon(form){return frames[form]?{image:sheets[form],frame:frames[form][0]}:null;}
 function special(p){return p.form==='tank'||p.form==='fighter'||p.form==='hero';}
 function heroAirRow(p){
    if(p.swimming)return 16;
    if(!(p.heroFlight||p.onMotorcycle))return null;
    return p.onMotorcycle||Math.hypot(p.vx||0,p.vy||0)>8?16:18;
  }
  function heroEyes(p){
    if(p.swimming){
      const cel=Math.floor((p.anim||0)*12)%12;
      const swim=typeof module!=='undefined'&&module.exports?require('./sea-sprites'):root.ArcadeSeaSprites;
      return swim.point(p,8.6,cel>=3&&cel<=8?1.2:1.9);
    }
    const forward=heroAirRow(p)===16;
    return {x:p.x+(p.facing||1)*(forward?12:6),y:p.y-(forward?20:42)};
  }
 // Rows are the jab, cross, uppercut and side kick from Distrito Quimera.
 const fighterMoves=[
  {row:0,duration:.30,contact:.153,damage:.85,bossDamage:4,deck:[36,-36],water:[49,8]},
  {row:1,duration:.33,contact:.157,damage:1.05,bossDamage:5,deck:[37,-36],water:[48,8]},
  {row:2,duration:.38,contact:.218,damage:1.45,bossDamage:6,deck:[24,-59],water:[45,-9]},
  {row:3,duration:.38,contact:.194,damage:1.35,bossDamage:5,deck:[37,-40],water:[46,12]}
 ];
 function fighterMove(p){return fighterMoves[p.fighterKick?3:p.fighterCombo||0];}
 function startFighterStrike(p,kick,rate=1){
  p.fighterCombo=p.fighterPose>0?((p.fighterCombo||0)+1)%3:0;
  p.fighterFreeze=0;p.fighterKick=!!kick;p.fighterPose=.8;p.fighterAge=0;p.fighterRate=rate;
  return fighterMove(p);
 }
 function fighterFrame(p,count){
  const move=fighterMove(p),age=p.fighterAge||0;
  return p.fighterPose>0&&age<move.duration?Math.floor(age*count/move.duration):-1;
 }
 // The same shoulder-to-limb sweep drives contact on foot, swimming and mounted.
 function deckLimb(p,x,y){
  const turn=(typeof module!=='undefined'&&module.exports?require('./physics'):root.ArcadePhysics).jumpTurn;
  return turn.point(p,{x:p.x+(p.facing||1)*x,y:p.y+y});
 }
 function connectFighter(p,targets,applyDamage,{point=(x,y)=>deckLimb(p,x,y),start=fighterMove(p).row===2?[22,-29]:[5,-31],tip=fighterMove(p).deck,platforms=[],boxOf,boss=()=>false}={}){
  const segment=(typeof module!=='undefined'&&module.exports?require('./encounter'):root.ArcadeEncounter).segmentHit;
  const a=point(...start),b=point(...tip),dx=b.x-a.x,dy=b.y-a.y;
  let nearest=null,limit=1;
  for(const pl of platforms){
   const wall=segment(a.x,a.y,dx,dy,{...pl,h:pl.thickness||12});
   if(wall!==null)limit=Math.min(limit,wall);
  }
  for(const n of targets){
   if(!n||!(n.hp>0))continue;
   const w=n.w||28,h=n.h||46,box=boxOf?.(n)||{x:n.x-w/2,y:n.y-h,w,h};
   const t=segment(a.x,a.y,dx,dy,box);
   if(t===null||t>limit||nearest&&t>=nearest.t)continue;
   nearest={n,t,box};
  }
  if(!nearest)return false;
  const {n,box}=nearest,move=fighterMove(p),row=move.row,heavy=boss(n);
  const strength=heavy?move.bossDamage:move.damage;
  const raw=strength*(p.damageBonus||1),before=n.hp;
  applyDamage(n,heavy||!(n.maxHp>0)?raw:Math.min(raw,n.maxHp*.46));
  if(n.hp===before)return false;
  const x=Math.max(box.x,Math.min(box.x+box.w,b.x)),y=Math.max(box.y,Math.min(box.y+box.h,b.y));
  p.fighterImpact={x,y,age:0,heavy:row>=2,dir:Math.sign(dx)||1};
  const pause=row>=2?.065:.045;
  p.fighterFreeze=pause;p.fighterAge=fighterMove(p).contact;
  if(!heavy&&n.hp>0){
   n.fighterStagger=row>=2?.16:.11;n.fighterPush=(Math.sign(dx)||1)*(row>=2?54:25);
   n.strikePending=false;n.attackAge=null;n.throwAge=null;n.flash=0;
   n.shot=Math.max(n.shot||0,n.fighterStagger+.13);
  }
  return true;
 }
 function drawFighterImpact(c,p){
  const hit=p.fighterImpact;if(!hit||p.form!=='fighter')return;
  const frame=Math.min(7,Math.floor(hit.age*50)),spread=(hit.heavy?2:0)+frame;
  c.save();c.translate(Math.round(hit.x),Math.round(hit.y));c.scale(hit.dir,1);
  c.globalAlpha*=Math.min(1,(8-frame)/4);
  if(frame<3){c.fillStyle='#fff3c7';c.fillRect(-3,-1,7,3);c.fillRect(-1,-4,3,8);}
  for(const [vx,vy] of [[1,-1],[-1,-1],[1,1],[-1,1],[2,0]]){
   const x=vx*(2+spread),y=vy*(3+spread);c.fillStyle='#d97d48';c.fillRect(x,y,3,2);
   c.fillStyle='#ffe2a0';c.fillRect(x+vx,y+vy,2,2);
  }
  c.restore();
 }
 // Match the mounted sprite's head size and register its waist at the saddle.
 const seat={x:-4,y:-36,scale:.55};
 function drawSeatedStrike(c,p,frame){
  const move=fighterMove(p),k=seat.scale;
  c.save();c.translate(seat.x,seat.y);c.scale(k,k);
  // The far boot stays on the footrest. Only the striking leg crosses the tank.
  const height=move.row===3?67:61;
  c.drawImage(sheets.fighterCombat,frame*120,move.row*98,120,height,-53,-91,120,height);
  c.restore();
 }
 function shot(p){if(!special(p))return null;const turn=(typeof module!=='undefined'&&module.exports?require('./physics'):root.ArcadePhysics).jumpTurn,a=p.aim||{x:p.facing||1,y:0},bonus=p.damageBonus||1;
  if(p.form==='hero'){
    p.eyeFlash=.2;const {x,y}=turn.point(p,heroEyes(p));
    return {weapon:{rate:.24,damage:4,ammo:null},bullets:[{x,y,vx:a.x*880,vy:a.y*880,life:1.15,damage:4*bonus,eyeRay:true,enemy:false,slot:3}]};
  }
  if(p.form==='fighter'){const move=startFighterStrike(p,p.fighterKickInput,p.rateBonus||1);return{weapon:{rate:move.duration,contact:move.contact/move.duration,range:move.deck[0]+17,damage:move.damage,ammo:null},bullets:[]};}
  p.cannonPose=.65;return{weapon:{rate:.95,damage:8,ammo:null,speed:620},bullets:[{...turn.point(p,{x:p.x+a.x*48,y:p.y-33+a.y*32}),vx:a.x*620,vy:a.y*620,life:2.4,damage:8*bonus,slot:6,superCannon:true,enemy:false}]};
 }
 function tankJumpFrame(p){if(p.grounded!==false)return 8+Math.min(3,Math.floor((.24-Math.max(0,p.landing||0))/.24*4));const age=p.tankAirAge||0;if(age<.1)return Math.min(3,Math.floor(age/.025));return p.vy<-90?4:p.vy<60?5:p.vy<300?6:7;}
 function tick(p,dt){
  if(p.fighterImpact&&(p.fighterImpact.age+=dt)>=.16)p.fighterImpact=null;
  const hold=Math.min(p.fighterFreeze||0,dt);p.fighterFreeze=Math.max(0,(p.fighterFreeze||0)-dt);
  p.eyeFlash=Math.max(0,(p.eyeFlash||0)-dt);p.tankAirAge=p.grounded===false?(p.tankAirAge||0)+dt:0;p.cannonPose=Math.max(0,(p.cannonPose||0)-dt);p.fighterPose=Math.max(0,(p.fighterPose||0)-dt);p.fighterAge=(p.fighterAge||0)+(dt-hold)*(p.fighterRate||1);}
 function draw(c,p){if(!special(p)||!sheets[p.form])return false;
  if(p.form==='hero'){
    const row=heroAirRow(p)??(p.eyeFlash>0?17:!p.grounded?3:Math.abs(p.vx)>8?1:0);
    const frame=Math.floor((p.anim||0)*12)%12,scale=.66;
    c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y));c.scale((p.facing||1)*scale,scale);
    c.drawImage(sheets.hero,frame*120,row*98,120,98,-53,-91,120,98);c.restore();
    if(p.eyeFlash>0){const aim=p.aim||{x:p.facing||1,y:0};c.save();const eyes=heroEyes(p);c.translate(eyes.x,eyes.y);c.rotate(Math.atan2(aim.y,aim.x));c.globalAlpha=Math.min(1,p.eyeFlash*9);c.fillStyle='#3384ff';c.fillRect(0,-3,34,6);c.fillStyle='#bafaff';c.fillRect(0,-2,35,1);c.fillRect(0,1,35,1);c.restore();}return true;
  }
  if(p.form==='fighter'&&(p.swimming||p.onMotorcycle||p.victoryAge!==undefined)){const fs=frames.fighter,index=p.victoryAge!==undefined?15:p.onMotorcycle?20+(p.grounded===false?3:p.fighterPose>0?2:p.roadBoost?1:0):16+Math.floor((p.anim||0)*8)%4,f=fs[index],scale=p.victoryAge!==undefined?57/fs[0][3]:p.onMotorcycle?104/fs[20][2]:90/fs[16][2];c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y));c.scale(p.facing||1,1);c.drawImage(sheets.fighter,...f,-Math.round(f[2]*scale/2),-Math.round(f[3]*scale),Math.round(f[2]*scale),Math.round(f[3]*scale));c.restore();return true;}
  if(p.form==='fighter'&&sheets.fighterCombat){
   const active=fighterFrame(p,12);
   const guard=active<0&&p.fighterPose>0&&p.grounded&&!p.crouching&&!p.hurt&&Math.abs(p.vx||0)<8;
   if(active>=0||guard){
    const cell=guard?0:active;
    const scale=.76;
    c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y));c.scale((p.facing||1)*scale,scale);
    c.drawImage(sheets.fighterCombat,cell*120,guard?0:fighterMove(p).row*98,120,98,-53,-91,120,98);
    c.restore();return true;
   }
  }
  if(!p.swimming&&!p.submersible&&!p.onMotorcycle&&!p.transform&&!p.hurt&&!p.ladder&&!p.rope&&p.grounded&&!p.landing){
   if(p.form==='fighter'&&!p.crouching&&Math.abs(p.vx)>8&&root.ArcadeSoldierAnimation?.baseSprite?.(c,p,0,p.walkCycle||0))return true;
   if(p.form==='tank'&&!p.cannonPose&&root.ArcadeSoldierAnimation?.baseSprite?.(c,p,0,Math.abs(p.vx)>8?p.walkCycle||0:(p.anim||0)*.55))return true;
  }
  const tank=p.form==='tank';let fs=frames[p.form],img=sheets[p.form],frame;
  if(tank){frame=p.submersible?(p.cannonPose>0?(p.cannonPose>.3?14:15):p.vy>30?13:12):p.cannonPose>0?4+Math.min(3,Math.floor((.65-p.cannonPose)/.65*4)):Math.floor((p.anim||0)*10)%4;}
  else frame=p.crouching?12:!p.grounded?13:Math.abs(p.vx)>8?Math.floor((p.anim||0)*10)%4:(p.idleTime||0)>6?14:4;
  let jumpScale=null;if(tank&&!p.submersible&&frames.tankJump&&(p.grounded===false||p.landing>0)){frame=tankJumpFrame(p);fs=frames.tankJump;img=sheets.tankJump;jumpScale=105/fs[11][2];}const f=fs[frame],scale=jumpScale??(tank?105/fs[0][2]:57/fs[0][3]);c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y));c.scale(p.facing||1,1);if(p.hurt>0)c.filter='brightness(1.35)';c.drawImage(img,...f,tank?-Math.round(f[2]*scale/2):Math.round((f[0]%Math.round(img.width/4)-img.width/8)*scale),-Math.round(f[3]*scale),Math.round(f[2]*scale),Math.round(f[3]*scale));
  if(p.transform>0){c.globalAlpha=.35*Math.sin(Math.PI*Math.min(1,p.transform/1.2));c.fillStyle='#95f5ed';for(let i=0;i<8;i++)c.fillRect(-50+i*13,-70+i%3*7,6,75-i*5);}c.restore();return true;
 }
 function morph(c,x,y,t,width=115){
  if(!sheets.tank)return;
  const f=frames.tank[8+Math.min(3,Math.floor(Math.max(0,t)*4))],h=width*f[3]/f[2];
  c.drawImage(sheets.tank,...f,x-width/2,y-h/2,width,h);
 }
 const api={load,atlas,icon,special,shot,tick,draw,morph,tankJumpFrame,fighterMove,fighterFrame,startFighterStrike,connectFighter,drawFighterImpact,drawSeatedStrike,seat};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeAdvancedForms=api;
})(typeof window!=='undefined'?window:globalThis);

