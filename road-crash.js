(function(root){
 'use strict';
 const W=192,H=112,foot=104,rows={soldier:0,wolf:1,zombie:2,robot:3,fighter:4,hero:5};
 const clamp=t=>Math.max(0,Math.min(1,t));
 const ramp=(t,a,b)=>clamp((t-a)/(b-a));
 function ease(t,a,b){const u=ramp(t,a,b);return u*u*(3-2*u);}
 function arc(t,a,b){const u=ramp(t,a,b);return 4*u*(1-u);}
 function cell(c,img,row,frame,x,y,angle=0,pivotX=0,pivotY=0){
  c.save();c.translate(x+pivotX,y+pivotY);c.rotate(angle);
  c.drawImage(img,Math.round(frame)*W,row*H,W,H,-W/2-pivotX,-foot-pivotY,W,H);c.restore();
 }
 function mountedHero(c,img,pose,index){
  cell(c,img,7,index,pose.x,pose.y,pose.angle);
 }
 function debris(c,x,y,t,start,span,sparks){
  const u=ramp(t,start,start+span);if(u<=0||u>=1)return;
  c.save();c.globalAlpha*=1-u;
  for(let i=0;i<(sparks?6:10);i++){
   const dx=(i%3===0?1:-1)*(6+(i*17)%41)*u,dy=(8+(i*11)%19)*4*u*(1-u);
   c.fillStyle=sparks?(i%2?'#ffe2a3':'#e59246'):(i%2?'#96816b':'#73675f');
   c.fillRect(Math.round(x+dx),Math.round(y-dy),sparks?4:4+Math.round(4*u),sparks?2:3);
  }
  c.restore();
 }
 function shadow(c,x,lane,halfWidth,alpha){
  c.save();c.globalAlpha*=alpha;c.fillStyle='#19191f';c.beginPath();c.ellipse(x,lane,halfWidth,3,0,0,Math.PI*2);c.fill();c.restore();
 }
 function motion(t,lift=0,separation=74){
  // The bike keeps sliding after the rider meets the road. They meet again at the saddle.
  const bikeX=7*arc(t,0,.29)-12*ease(t,.26,.54)*(1-ease(t,.56,.81));
  const riderX=7*ease(t,.06,.15)-(7+separation)*ease(t,.15,.55)+separation*ease(t,1.43,1.94);
  const bikeLift=lift*(1-ease(t,0,.18))+8*arc(t,.08,.45)+3*arc(t,.45,.64);
  const riderLift=lift*(1-ease(t,0,.18))+21*ease(t,.05,.19)*(1-ease(t,.34,.57))+64*arc(t,.12,.57)+4*arc(t,.57,.73)+32*arc(t,1.43,1.94)+18*ease(t,1.60,1.94);
  const bikeAngle=.26*arc(t,0,.44)-.065*arc(t,.44,.64);
  const riderAngle=-.18*arc(t,.10,.31)+.57*arc(t,.30,.575)-.10*arc(t,.575,.76);
  const bikeFrame=8*ease(t,.14,.62)+8*ease(t,1.22,1.87);
  let riderFrame;
  if(t<.27)riderFrame=16+4*ease(t,.11,.27);
  else riderFrame=4*ease(t,.31,.55)+4*ease(t,.57,.86)+4*ease(t,.93,1.33)+4*ease(t,1.43,1.91);
  return {bikeX,riderX,bikeLift,riderLift,bikeAngle,riderAngle,bikeFrame,riderFrame};
 }
 function draw(c,img,form,x,lane,t,lift,paintMounted){
  const m=motion(t,lift,Math.min(74,Math.max(0,x-46))),bike=x+m.bikeX,rider=x+m.riderX;
  const start=1-ease(t,.095,.165),finish=ease(t,1.91,2.10),attached=start+finish;
  shadow(c,bike,lane,43,.42);
  if(form==='tank'){
   const rebound=.13*arc(t,.52,.78)-.065*arc(t,.79,1.04);
   const frame=8*ease(t,.12,.60)+8*ease(t,1.02,1.87);
   const rotation=.28*arc(t,0,.48)-rebound;
   const at=-m.bikeLift-5*arc(t,.10,.44);
   c.save();c.translate(bike,lane+at);c.translate(31,0);c.rotate(rotation);c.translate(-31,0);
   const original=1-ease(t,.10,.16)+ease(t,1.88,1.96);
   if(original<1){c.save();c.globalAlpha*=1-original;cell(c,img,8,frame,0,0);c.restore();}
   if(original>0){c.globalAlpha*=original;paintMounted(0,0);}
   c.restore();debris(c,bike+33,lane,t,.47,.36,true);debris(c,bike-21,lane,t,.54,.55,false);return;
  }
  if(attached<1){
   shadow(c,rider,lane,Math.max(9,24-m.riderLift*.23),.30*(1-attached));
   c.save();c.globalAlpha*=1-attached;
   cell(c,img,6,m.bikeFrame,bike,lane-m.bikeLift,m.bikeAngle,32,0);
   cell(c,img,rows[form],m.riderFrame,rider,lane-m.riderLift,m.riderAngle,0,-22);
   c.restore();
  }
  if(attached>0){
   c.save();c.globalAlpha*=attached;c.translate(bike+32,lane-m.bikeLift);c.rotate(m.bikeAngle);c.translate(-32,0);paintMounted(0,0);c.restore();
  }
  debris(c,bike+24,lane,t,.44,.34,true);debris(c,rider,lane,t,.57,.50,false);
 }
 function convoy(c,img,type,x,y,t,paintMounted,width){
  const row=type==='sidecar'?10:9;
  const lean=.17*arc(t,0,.32),bounce=7*arc(t,.19,.51);
  if(t<.08){c.save();c.translate(x+28,y);c.rotate(lean);c.translate(-28,0);paintMounted();c.restore();return;}
  const frame=4*ease(t,.08,.38)+4*ease(t,.38,.67)+4*ease(t,.67,.96)+4*ease(t,.96,1.36);
  const nativeWidth=type==='sidecar'?124:104,k=(width||nativeWidth)/nativeWidth;
  c.save();c.translate(x,y);c.scale(k,k);c.globalAlpha*=1-ease(t,1.95,2.8);
  cell(c,img,row,frame,0,-bounce,lean,28,0);
  debris(c,24,0,t,.49,.37,true);debris(c,-30,0,t,.64,.48,false);c.restore();
 }
 const api={draw,motion,mountedHero,convoy};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeRoadCrash=api;
})(typeof window!=='undefined'?window:globalThis);
