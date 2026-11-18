(function(root){
'use strict';
let jeep=null,frames=[],soldier=null,soldierFrames=[],soldierScale=1;
let dismount=null,dismountFrames=[],dismountScale=1;
const clamp=t=>Math.max(0,Math.min(1,t));
function setSprites(j,f,s,sf,scale){jeep=j;frames=f;soldier=s;soldierFrames=sf;soldierScale=scale;
 if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=j.width;canvas.height=j.height;const c=canvas.getContext('2d');c.drawImage(j,0,0);const data=c.getImageData(0,0,j.width,j.height);for(let i=3;i<data.data.length;i+=4)data.data[i]=data.data[i]>=200?255:0;c.putImageData(data,0,0);jeep=canvas;}
}
function create(p){return{t:0,ground:p.y,targetX:p.x,stopX:p.x-98,x:-150,active:true,visible:true,phase:'reverse'};}
function update(s,p,dt){
 const wasActive=s.active;s.t+=dt;const t=s.t;
 if(t<2.3){const u=clamp(t/2.3);s.x=-150+(s.stopX+150)*(1-(1-u)**2);s.phase='reverse';}
 else if(t<2.85){s.x=s.stopX;s.phase='brake';}
 else if(t<3.85){s.phase='jump';s.x=s.stopX;}
 else if(t<4.3){s.phase='land';s.x=s.stopX;}
 else{s.phase='depart';const u=t-4.3;s.x=s.stopX-65*u-70*u*u;s.active=false;if(s.x< -160)s.visible=false;}
 if(!s.active){if(wasActive){Object.assign(p,{x:s.targetX,y:s.ground,vx:0,vy:0,grounded:true,jumps:0,fallPeak:s.ground,fallDamage:0});}return;}
 p.anim+=dt;p.vx=0;p.vy=0;p.rope=null;p.ladder=null;p.jetpack=false;p.facing=1;p.grounded=false;
 if(t<2.85){const brace=clamp((t-2.55)/.3);p.x=s.x+18;p.y=s.ground-29+Math.sin(brace*Math.PI)*3;}
 else if(t<3.85){const u=clamp(t-2.85);p.x=s.stopX+18+(s.targetX-s.stopX-18)*u;p.y=s.ground-29*(1-u)-Math.sin(u*Math.PI)*48;p.vy=29-Math.cos(u*Math.PI)*48*Math.PI;}
 else{p.x=s.targetX;p.y=s.ground;p.grounded=true;p.vy=0;p.jumps=0;p.fallPeak=s.ground;p.fallDamage=0;}
}
function soldierPose(s){
 if(s.phase==='jump')return [3,Math.min(4,1+Math.floor(clamp((s.t-2.85)/1)*4))];
 if(s.phase==='land')return [4,s.t<4?3:s.t<4.16?4:5];
 return [3,0];
}
function setDismountSprites(sheet,atlas,scale){
 dismount=sheet;dismountFrames=atlas;dismountScale=scale;
 if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=sheet.width;canvas.height=sheet.height;const c=canvas.getContext('2d');c.drawImage(sheet,0,0);const data=c.getImageData(0,0,sheet.width,sheet.height);for(let i=3;i<data.data.length;i+=4)data.data[i]=data.data[i]>=200?255:0;c.putImageData(data,0,0);dismount=canvas;}
}
function dismountPose(s){
 if(s.t<2.3)return 0;
 if(s.t<2.55)return 1;
 if(s.t<2.72)return 2;
 if(s.t<2.95)return 3;
 if(s.t<3.4)return 4;
 if(s.t<3.85)return 5;
 if(s.t<4.1)return 6;
 return 7;
}
function draw(c,s,p){if(!s.visible||!jeep)return;
 const rolling=s.phase==='reverse'||s.phase==='depart';
 const wheelIndex=Math.floor(Math.abs(s.x)*.17)%3,f=frames[0],scale=145/f[2];
 const bob=rolling?Math.sin(s.t*23)*.45:s.phase==='brake'?Math.sin((s.t-2.3)*12)*Math.exp(-(s.t-2.3)*7):0;
 const drawJeep=()=>{
  const left=s.x-f[2]*scale/2,top=s.ground-f[3]*scale+bob;
  c.drawImage(jeep,...f,left,top,f[2]*scale,f[3]*scale);
  // Animate only the wheels. Chassis, seats and driver never morph between frames.
  if(wheelIndex){
   const centers=[[[129,361],[400,361]],[[635,361],[908,361]],[[1139,361],[1416,361]]];
   for(let i=0;i<2;i++){
    const [sx,sy]=centers[wheelIndex][i],[bx,by]=centers[0][i],r=55;
    const x=left+(bx-f[0])*scale,y=top+(by-f[1])*scale;
    c.save();c.beginPath();c.arc(x,y,r*scale,0,Math.PI*2);c.clip();
    c.drawImage(jeep,sx-r,sy-r,r*2,r*2,x-r*scale,y-r*scale,r*2*scale,r*2*scale);c.restore();
   }
  }
 };
 const drawNearSide=()=>{
  // Follow the open body's actual upper edge in the source art. The sill is
  // higher than the boots; a horizontal clip below it leaves feet painted on metal.
  const left=s.x-f[2]*scale/2,top=s.ground-f[3]*scale+bob;
  const edge=[[190,270],[214,300],[305,300],[324,269],[345,256],[498,256],[498,418],[21,418],[21,270]];
  c.save();c.beginPath();edge.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](left+(x-f[0])*scale,top+(y-f[1])*scale));c.closePath();c.clip();drawJeep();c.restore();
 };
 c.save();c.imageSmoothingEnabled=false;
 c.fillStyle='#0c151c33';c.beginPath();c.ellipse(s.x,s.ground-1,77,5,0,0,Math.PI*2);c.fill();
 if(rolling||s.phase==='brake'){for(let i=0;i<7;i++){const u=(s.t*1.7+i/7)%1;c.globalAlpha=(1-u)*.25;c.fillStyle='#b9a482';c.fillRect(s.x-55+u*45,s.ground-3-u*8,4+u*9,2+u*3);}c.globalAlpha=1;}
 drawJeep();
 if(s.active&&dismount){
  const index=dismountPose(s),f=dismountFrames[index];
  const seatBob=s.t<2.55?bob:0;
  c.drawImage(dismount,...f.slice(0,4),p.x-(f[4]??f[2]/2)*dismountScale,p.y-f[3]*dismountScale+seatBob,f[2]*dismountScale,f[3]*dismountScale);
  if(s.t<2.55)drawNearSide();
 }else if(s.active&&soldier){
  const [row,frame]=soldierPose(s);
  const f=soldierFrames[row][frame];
  c.drawImage(soldier,...f,p.x-f[2]*soldierScale/2,p.y-f[3]*soldierScale,f[2]*soldierScale,f[3]*soldierScale);
  if(s.t<2.55)drawNearSide();
 }
 c.restore();
}
const api={create,update,draw,setSprites,setDismountSprites,soldierPose,dismountPose};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeArrival=api;
})(typeof window!=='undefined'?window:globalThis);
