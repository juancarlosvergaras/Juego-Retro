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
  function create(defeated=[],platforms=[],loot=[]){
    const ground=platforms.find(s=>s.kind==='ground');
    const positions=Array.from({length:20},(_,i)=>i<9?9820+i*365:13500+(i-9)*350);
    return Array.from({length:20},(_,i)=>{
      // Two groups span the route while keeping the large barricade clear.
      const at=positions[i];
      const candidates=Array.from({length:41},(_,j)=>at+(j%2?1:-1)*Math.ceil(j/2)*16);
      const x=i%3===2?(candidates.find(x=>x>=9700&&x<=17200&&positions.every((other,j)=>j===i||Math.abs(other-x)>=110)&&loot.every(item=>Math.abs(item.x-x)>75)&&!platforms.some(s=>s.solid&&x>s.x-35&&x<s.x+s.w+35))??at):at;
      const y=ground?P.surfaceY(ground,x):620,id=100+i,hp=defeated.includes(id)?0:3;
      return Object.assign(P.createPlayer(),{id,kind:'zombie',spawnType:TYPES[i%3],variant:i%3,x,y,homeX:x,homeY:y,facing:-1,h:49,w:24,hp,maxHp:3,phase:'dormant',wakeAge:0,attackAge:null,shot:1.1,flash:0,hit:0,death:0,alert:false,runCycle:0,speedBonus:.34+(i%3)*.025});
    });
  }
  function targetable(n){return n.kind!=='zombie'||n.phase==='active'||n.spawnType==='sleep'||n.phase==='waking'&&n.wakeAge>DURATION*.4;}
  function update(n,p,dt,platforms,bullets){
    const dx=p.x-n.x,dy=p.y-n.y;
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
    n.shot=Math.max(0,n.shot-dt);
    if(n.hit>0&&n.attackAge!==null){n.attackAge=null;n.shot=Math.max(.8,n.shot);}
    if(n.attackAge!==null){
      const before=n.attackAge;n.attackAge+=dt;n.vx=0;P.step(n,{},dt,platforms);
      if(before<.6&&n.attackAge>=.6){const x=n.x+n.facing*16,y=n.y-34,tx=n.aim.x-x,ty=n.aim.y-y,d=Math.hypot(tx,ty)||1;bullets.push({x,y,vx:tx/d*190,vy:ty/d*190,life:4.3,age:0,enemy:true,zombiePlasma:true,damage:1});n.flash=.15;}
      if(n.attackAge>=1.05)n.attackAge=null;
      return;
    }
    if(n.alert&&Math.abs(dx)>3)n.facing=Math.sign(dx);
    const move=n.alert&&Math.abs(dx)>205,oldX=n.x;
    P.step(n,{left:move&&dx<0,right:move&&dx>0},dt,platforms);
    n.runCycle+=Math.abs(n.x-oldX)/55;
    if(n.alert&&Math.hypot(dx,dy)<560&&Math.abs(dy)<340&&n.shot<=0){n.attackAge=0;n.aim={x:p.x,y:p.y-(p.h||46)/2};n.shot=2.8+n.variant*.25;n.vx=0;}
  }
  function pose(n){
    if(n.hp<=0)return{row:5,frame:Math.min(5,Math.floor((1.3-n.death)/.17))};
    if(n.phase!=='active')return{row:TYPES.indexOf(n.spawnType),frame:n.phase==='dormant'?0:Math.min(5,Math.floor(n.wakeAge/DURATION*6))};
    if(n.attackAge!==null)return{row:4,frame:Math.min(5,Math.floor(n.attackAge/1.05*6))};
    return Math.abs(n.vx)>5?{row:3,frame:Math.floor(n.runCycle*6)%6}:{row:1,frame:5};
  }
  function sprite(c,image,row,frame,x,y,facing){const f=FRAMES[row][frame],pivot=96+frame*207;c.save();c.translate(Math.round(x),Math.round(y));c.scale(facing,1);c.drawImage(image,...f,(f[0]-pivot)*SCALE,(f[1]-BASE[row])*SCALE,f[2]*SCALE,f[3]*SCALE);c.restore();}
  function drawGraves(c,list,image,view){if(!image)return;for(const n of list)if(n.spawnType==='grave'&&(n.phase==='active'||n.hp<=0)&&n.homeX>view.left-60&&n.homeX<view.right+60)sprite(c,image,2,0,n.homeX,n.homeY,n.graveFacing||-1);}
  function draw(c,n,image){if(!image)return;const p=pose(n);c.save();if(n.variant===1)c.filter='hue-rotate(22deg) saturate(.8)';if(n.variant===2)c.filter='hue-rotate(-18deg) brightness(.92)';if(n.hit>0)c.filter='brightness(1.45)';if(n.hp<=0)c.globalAlpha=Math.min(1,n.death/.35);sprite(c,image,p.row,p.frame,n.x,n.y,n.facing);c.restore();}
  const api={create,update,targetable,pose,draw,drawGraves,FRAMES};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeCemeteryZombies=api;
})(typeof window!=='undefined'?window:globalThis);
