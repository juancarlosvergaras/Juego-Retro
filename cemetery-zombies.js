(function(root){
  'use strict';
  const P=typeof module!=='undefined'&&module.exports?require('./physics'):root.ArcadePhysics;
  const TYPES=['earth','sleep','grave'],DURATION=1.8,SCALE=.27;
  const FRAMES=[
    [[17,120,162,79],[212,125,176,74],[415,106,184,93],[625,61,181,140],[834,41,177,158],[1071,11,117,185]],
    [[47,228,99,177],[256,227,103,179],[464,224,100,181],[672,224,93,182],[868,224,141,182],[1074,223,139,183]],
    [[17,471,168,143],[215,472,177,146],[420,471,178,146],[624,472,177,150],[827,450,182,169],[1039,437,173,182]],
    [[45,645,102,180],[233,647,123,178],[445,647,122,178],[658,648,124,177],[871,649,106,176],[1079,646,112,179]],
    [[41,858,114,181],[247,857,120,182],[419,849,159,190],[625,860,151,179],[865,860,179,179],[1071,866,139,173]],
    [[51,1068,112,170],[254,1070,134,171],[428,1122,169,119],[629,1147,174,91],[820,1184,197,55],[1030,1188,186,52]]
  ],BASE=[200,406,620,825,1039,1241];
  // Tres temperamentos con el mismo arte: el escupidor guarda la distancia, el
  // corredor se lanza al cuerpo a cuerpo y el acechador se queda a medio camino.
  const ROLES=[{name:'spitter',stop:205,pace:1,spitFrom:0},{name:'runner',stop:34,pace:1.9,spitFrom:140},{name:'lurker',stop:110,pace:1.25,spitFrom:0}];
  const LUNGE={reach:78,windup:.3,dash:.25,recover:.35,wait:1.6};
  function role(n){return ROLES[n.variant%ROLES.length]||ROLES[0];}
  function create(defeated=[],platforms=[],loot=[]){
    const ground=platforms.find(s=>s.kind==='ground');
    const positions=Array.from({length:20},(_,i)=>i<9?9820+i*365:13500+(i-9)*350);
    return Array.from({length:20},(_,i)=>{
      // Two groups span the route while keeping the large barricade clear.
      const at=positions[i];
      const candidates=Array.from({length:41},(_,j)=>at+(j%2?1:-1)*Math.ceil(j/2)*16);
      const x=i%3===2?(candidates.find(x=>x>=9700&&x<=17200&&positions.every((other,j)=>j===i||Math.abs(other-x)>=110)&&loot.every(item=>Math.abs(item.x-x)>75)&&!platforms.some(s=>s.solid&&x>s.x-35&&x<s.x+s.w+35))??at):at;
      const y=ground?P.surfaceY(ground,x):620,id=100+i,hp=defeated.includes(id)?0:3,speed=.34+(i%3)*.025;
      return Object.assign(P.createPlayer(),{id,kind:'zombie',spawnType:TYPES[i%3],variant:i%3,x,y,homeX:x,homeY:y,facing:-1,h:49,w:24,hp,maxHp:3,phase:'dormant',wakeAge:0,attackAge:null,lunge:null,biteWait:0,recoil:0,shot:1.1,flash:0,hit:0,death:0,alert:false,runCycle:0,speedBonus:speed,baseSpeed:speed});
    });
  }
  function targetable(n){return n.kind!=='zombie'||n.phase==='active'||n.spawnType==='sleep'||n.phase==='waking'&&n.wakeAge>DURATION*.4;}
  function update(n,p,dt,platforms,bullets){
    const dx=p.x-n.x,dy=p.y-n.y,kind=role(n),base=n.baseSpeed??(n.baseSpeed=n.speedBonus||.34);
    if(n.phase==='dormant'){
      if(Math.abs(dx)<370&&Math.abs(dy)<260||n.hit>0){n.phase='waking';n.wakeAge=0;n.facing=Math.sign(dx)||-1;n.graveFacing=n.facing;n.alert=true;}
      n.vx=0;return;
    }
    if(n.phase==='waking'){
      n.wakeAge=Math.min(DURATION,n.wakeAge+dt);n.vx=0;
      if(n.wakeAge>=DURATION){n.phase='active';n.shot=1.1;if(n.spawnType==='grave')n.x+=8*n.facing;}
      return;
    }
    n.alert=Math.abs(dx)<650&&Math.abs(dy)<400;n.awareness=n.alert?'sight':'idle';
    n.shot=Math.max(0,n.shot-dt);n.biteWait=Math.max(0,(n.biteWait||0)-dt);
    // A fresh hit interrupts whatever the zombie was doing and shoves it back a step.
    if(n.hit>0&&!n.wasHit){n.recoil=.22;n.lunge=null;n.vx=-n.facing*90;if(n.attackAge!==null){n.attackAge=null;n.shot=Math.max(.8,n.shot);}}
    n.wasHit=n.hit>0;
    if(n.recoil>0){n.recoil=Math.max(0,n.recoil-dt);n.speedBonus=.5;P.step(n,{left:n.facing>0,right:n.facing<0},dt,platforms);n.speedBonus=base;return;}
    if(n.attackAge!==null){
      const before=n.attackAge;n.attackAge+=dt;n.vx=0;P.step(n,{},dt,platforms);
      if(before<.6&&n.attackAge>=.6){const x=n.x+n.facing*16,y=n.y-34,tx=n.aim.x-x,ty=n.aim.y-y,d=Math.hypot(tx,ty)||1;bullets.push({x,y,vx:tx/d*190,vy:ty/d*190,life:4.3,age:0,enemy:true,zombiePlasma:true,damage:1});n.flash=.15;}
      if(n.attackAge>=1.05)n.attackAge=null;
      return;
    }
    // Lunge: rear back, throw the body forward and stumble to a stop. The bite
    // lands through the ordinary contact check, so a dodge really avoids it.
    if(n.lunge!==null&&n.lunge!==undefined){
      n.lunge+=dt;const dashing=n.lunge>=LUNGE.windup&&n.lunge<LUNGE.windup+LUNGE.dash;
      n.speedBonus=dashing?1.3:base;P.step(n,dashing?{left:n.facing<0,right:n.facing>0,run:true}:{},dt,platforms);n.speedBonus=base;
      if(!dashing)n.vx=0;
      if(n.lunge>=LUNGE.windup+LUNGE.dash+LUNGE.recover){n.lunge=null;n.shot=Math.max(n.shot,.9);}
      return;
    }
    if(n.alert&&Math.abs(dx)>3)n.facing=Math.sign(dx);
    if(n.alert&&n.grounded&&n.biteWait<=0&&Math.abs(dx)<LUNGE.reach&&Math.abs(dy)<40){n.lunge=0;n.biteWait=LUNGE.wait;n.vx=0;return;}
    const move=n.alert&&Math.abs(dx)>kind.stop,oldX=n.x;
    // Shamble: each step surges and drags instead of gliding at constant speed.
    const stride=Math.sin(n.runCycle*Math.PI*2);n.speedBonus=base*kind.pace*(.55+.75*Math.max(0,stride)+.2*Math.abs(stride));
    P.step(n,{left:move&&dx<0,right:move&&dx>0},dt,platforms);n.speedBonus=base;
    n.runCycle+=Math.abs(n.x-oldX)/55;
    const distance=Math.hypot(dx,dy);
    if(n.alert&&distance<560&&distance>=kind.spitFrom&&Math.abs(dy)<340&&n.shot<=0){n.attackAge=0;n.aim={x:p.x,y:p.y-(p.h||46)/2};n.shot=2.8+n.variant*.25;n.vx=0;}
  }
  function pose(n){
    if(n.hp<=0)return{row:5,frame:Math.min(5,Math.floor((1.3-n.death)/.17))};
    if(n.phase!=='active')return{row:TYPES.indexOf(n.spawnType),frame:n.phase==='dormant'?0:Math.min(5,Math.floor(n.wakeAge/DURATION*6))};
    if(n.attackAge!==null)return{row:4,frame:Math.min(5,Math.floor(n.attackAge/1.05*6))};
    if(n.lunge!==null&&n.lunge!==undefined){const t=n.lunge;return{row:4,frame:t<LUNGE.windup?Math.min(1,Math.floor(t/LUNGE.windup*2)):t<LUNGE.windup+LUNGE.dash?3:t<LUNGE.windup+LUNGE.dash+LUNGE.recover*.5?4:5};}
    if(n.recoil>0)return{row:1,frame:4};
    return Math.abs(n.vx)>5?{row:3,frame:Math.floor(n.runCycle*6)%6}:{row:1,frame:5};
  }
  // Procedural body language layered on the sheet: lean, bob and breathing.
  function motion(n){
    const t=(n.anim||0)+(n.id||0)*.73;
    if(n.hp<=0||n.phase==='dormant')return{lean:0,bob:0,stretch:1,shake:0};
    if(n.phase==='waking')return{lean:0,bob:0,stretch:1,shake:n.spawnType==='sleep'?0:Math.sin(n.wakeAge*52)*(1-n.wakeAge/DURATION)*1.4};
    if(n.recoil>0)return{lean:-.2*(n.recoil/.22),bob:0,stretch:1,shake:0};
    if(n.lunge!==null&&n.lunge!==undefined){const u=n.lunge;return{lean:u<LUNGE.windup?-.13*(u/LUNGE.windup):u<LUNGE.windup+LUNGE.dash?.24:.24*Math.max(0,1-(u-LUNGE.windup-LUNGE.dash)/LUNGE.recover),bob:0,stretch:1,shake:0};}
    if(n.attackAge!==null)return{lean:n.attackAge<.6?-.06*(n.attackAge/.6):.1*Math.max(0,1-(n.attackAge-.6)/.3),bob:0,stretch:1,shake:0};
    if(Math.abs(n.vx)>5){const step=n.runCycle*Math.PI*2;return{lean:.07+Math.sin(step)*.05,bob:-Math.abs(Math.sin(step))*1.6,stretch:1,shake:0};}
    return{lean:Math.sin(t*1.3)*.03,bob:0,stretch:1+Math.sin(t*2.1)*.014,shake:0};
  }
  function sprite(c,image,row,frame,x,y,facing,m){const f=FRAMES[row][frame],pivot=96+frame*207;c.save();c.translate(Math.round(x+(m?m.shake:0)),Math.round(y+(m?m.bob:0)));c.scale(facing,1);if(m){if(m.lean)c.rotate(m.lean);if(m.stretch!==1)c.scale(1,m.stretch);}c.drawImage(image,...f,(f[0]-pivot)*SCALE,(f[1]-BASE[row])*SCALE,f[2]*SCALE,f[3]*SCALE);c.restore();}
  function dust(c,n){
    if(n.phase!=='waking'||n.spawnType==='sleep')return;
    const fade=1-n.wakeAge/DURATION;
    for(let k=0;k<7;k++){const seed=Math.sin((n.id*13+k)*91.7)*43758.5,r=seed-Math.floor(seed),phase=(n.wakeAge*1.7+k*.31)%1;c.globalAlpha=(1-phase)*.7*fade;c.fillStyle=k%2?'#8c7a5c':'#5f5546';c.fillRect(Math.round(n.x+(r-.5)*46+(r-.5)*phase*22),Math.round(n.y-2-phase*(10+r*14)),k%3?2:3,2);}
    c.globalAlpha=1;
  }
  function drawGraves(c,list,image,view){if(!image)return;for(const n of list)if(n.spawnType==='grave'&&(n.phase==='active'||n.hp<=0)&&n.homeX>view.left-60&&n.homeX<view.right+60)sprite(c,image,2,0,n.homeX,n.homeY,n.graveFacing||-1);}
  function draw(c,n,image){if(!image)return;const p=pose(n);c.save();dust(c,n);if(n.variant===1)c.filter='hue-rotate(22deg) saturate(.8)';if(n.variant===2)c.filter='hue-rotate(-18deg) brightness(.92)';if(n.hit>0)c.filter='brightness(1.45)';if(n.hp<=0)c.globalAlpha=Math.min(1,n.death/.35);sprite(c,image,p.row,p.frame,n.x,n.y,n.facing,motion(n));c.restore();}
  const api={create,update,targetable,pose,motion,role,draw,drawGraves,FRAMES,ROLES,LUNGE};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeCemeteryZombies=api;
})(typeof window!=='undefined'?window:globalThis);
