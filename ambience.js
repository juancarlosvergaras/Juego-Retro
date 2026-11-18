(function(root){
'use strict';
let workerRunSheet=null,workerRunFrames=[],workerRunScale=1;
function setWorkerRunSheet(image,frames,scale){workerRunSheet=image;workerRunFrames=frames;workerRunScale=scale;}
let sheet=null,workerSheet=null,workerFrames=[],trolley=null,trolleySource=null;
function setWorkerSheet(image,frames){workerSheet=image;workerFrames=frames;}
function setSpriteSheet(image){sheet=image;}
function sprite(c,row,frame,x,y,w,h,dir=1,alpha=1){if(!sheet)return;c.save();c.imageSmoothingEnabled=false;c.globalAlpha*=alpha;c.translate(Math.round(x),Math.round(y));c.scale(dir,1);const cw=sheet.width/4,ch=sheet.height/8;c.drawImage(sheet,(frame%4)*cw,row*ch,cw,ch,-w/2,-h/2,w,h);c.restore();}

function create(platforms,ground){const crane=platforms.find(p=>p.crane);return{t:0,ground,platforms,crane,origin:crane?.x,workers:Array.from({length:3},(_,i)=>({x:415+i*45,escapeDir:i===0?-1:1,speed:0,dir:i===2?-1:1,role:i===2?'talk':'coffee',phase:'idle',age:0,runDistance:i*13,delay:i*.14,done:false}))};}
function gunshotNoises(e,p){
 const noises=[];
 if(p.form!=='wolf'&&e.flash>0&&[3,4,5,6].includes(e.weaponAction?.slot))noises.push({x:p.x,y:p.y-30,radius:550});
 for(const n of e.enemies||[])if(n.flash>0)noises.push({x:n.x,y:n.y-30,radius:550});
 if(e.boss?.flash>0)noises.push({x:e.boss.x,y:e.boss.y-32,radius:550});
 return noises;
}
function update(s,dt,actors=[],noises=[]){s.t+=dt;
 const player=actors[0];
 const heard=noises.find(n=>s.workers.some(w=>!w.done&&Math.hypot(w.x-n.x,s.ground-25-n.y)<=n.radius));
 const nearby=player&&Math.abs(player.y-s.ground)<75&&s.workers.some(w=>Math.abs(w.x-player.x)<145);
 if(!s.workersAlerted&&(heard||nearby)){
  s.workersAlerted=true;for(const w of s.workers){w.phase='startled';w.age=0;w.dir=w.escapeDir;}

 }
 for(const w of s.workers){
  if(w.done)continue;w.age+=dt;
  if(w.phase==='startled'&&w.age>.65+w.delay){w.phase='run';w.age=0;}
  if(w.phase==='run'){const targetSpeed=96+w.delay*24,oldSpeed=w.speed||0;w.speed=Math.min(targetSpeed,oldSpeed+360*dt);const distance=(oldSpeed+w.speed)*.5*dt;w.x+=w.dir*distance;w.runDistance=(w.runDistance||0)+distance;}
  if(w.x< -35||w.x>764)w.done=true;
 }

 if(s.crane){const p=s.crane,old=p.x;p.x=s.origin+Math.sin(s.t*.48)*50;const dx=p.x-old;
 for(const a of actors)if(a&&!a.ladder&&!a.rope&&!a.jetpack&&!a.traverse&&Math.abs(a.y-p.y)<.6&&a.x>=old-8&&a.x<=old+p.w+8&&(a.grounded||a.vy===0)){a.x+=dx;if(a.ground===p)a.y=p.y;}}
}
function plane(c,x,y,dir,enemy,t){sprite(c,enemy?1:0,Math.floor(t*12),x,y,48,48,dir,.82);if(Math.floor(t*12)%4>0)for(let i=0;i<3;i++)sprite(c,3,Math.floor(t*12),x+dir*(30+i*18+(t*98)%15),y+1,7,2,dir,.65);}
// With a tall view the skyline must still reach the street: never leave a bare band above the ground.
function cityPlacement(camera,ground,viewHeight){const base=340+(ground-camera.y)*.12-640;return{x:-20-camera.x*.12,y:viewHeight?Math.max(base,Math.min(viewHeight,ground-camera.y)-640):base,w:960,h:640};}
function flightPositions(s,camera){
 // Flight lanes have fixed world altitudes. Camera motion only changes their projection.
 const flights=[];
 for(const [i,altitude] of [s.ground-260,s.ground-950,s.ground-1650,s.ground-2400,s.ground-3100,-220].entries()){
  const t=s.t+i*4.7,x=(t*70)%1169-220-camera.x*.12,y=altitude-camera.y;
  flights.push({x,y:y+Math.sin(t*.5)*10,dir:1,enemy:false,t},
   {x:x+150,y:y+15+Math.sin(t*.5+1)*13,dir:1,enemy:true,t:t+.3},
   {x:889-(t*52)%1079-camera.x*.12,y:y+75+Math.sin(t*.4)*12,dir:-1,enemy:true,t:t+.6});
 }
 return flights;
}
function background(c,s,camera,width,height){c.save();
 const city=cityPlacement(camera,s.ground,height),bx=35-camera.x*.12,by=city.y+500;
 for(let i=0;i<6;i++){const x=bx-14+(i%2)*35,y=by-156+Math.floor(i/2)*47;sprite(c,3,Math.floor(s.t*10+i),x,y,22,31);}
 for(let i=0;i<7;i++){const u=(s.t*.09+i/7)%1;sprite(c,4,Math.floor(s.t*6+i),bx+u*28,by-180-u*120,38+u*50,38+u*50,1,(1-u)*.55);}
 // Small flames on distant central windows remain behind every foreground pillar.
 for(let i=0;i<3;i++)sprite(c,3,Math.floor(s.t*9+i),city.x+(638+i*26)*city.w/1536,city.y+625*city.h/1024,11,17,1,.75);
 for(let i=0;i<3;i++){const u=(s.t*.06+i/3)%1;sprite(c,4,Math.floor(s.t*5+i),city.x+665*city.w/1536+u*13,city.y+604*city.h/1024-u*55,18+u*23,22+u*27,1,(1-u)*.25);}
 for(const f of flightPositions(s,camera))if(f.y>-50&&f.y<height+50)plane(c,f.x,f.y,f.dir,f.enemy,f.t);
 c.restore();}
function workers(c,s){if(!workerSheet)return;for(const w of s.workers){
 if(w.done)continue;
 const row=w.phase==='run'?3:w.phase==='startled'?2:w.role==='coffee'?0:1;
 const runFrame=Math.floor((w.runDistance||0)/6.5)%8;
 const frame=w.phase==='startled'?Math.min(3,Math.floor(w.age*6)):Math.floor(w.age*(w.phase==='run'?11:2.5)+w.delay*7)%4;
 const running=w.phase==='run'&&workerRunSheet;
 const f=running?workerRunFrames[runFrame]:workerFrames[row*4+frame];if(!f)continue;
 if(running){
  // Keep head and torso facing the escape route; only legs use the alternating step frames.
  const split=21,bob=-Math.sin((w.runDistance||0)/52*Math.PI*4)*.6,upper=workerRunFrames[0];
  c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(w.x),s.ground);c.scale(w.dir,1);
  c.save();c.beginPath();c.rect(-45,-split,90,split+1);c.clip();c.scale(f[5]||1,1);
  c.drawImage(workerRunSheet,...f.slice(0,4),-f[4]*workerRunScale,-f[3]*workerRunScale,f[2]*workerRunScale,f[3]*workerRunScale);c.restore();
  c.save();c.beginPath();c.rect(-45,-60,90,60-split+1);c.clip();
  c.drawImage(workerRunSheet,...upper.slice(0,4),-upper[4]*workerRunScale,-upper[3]*workerRunScale+bob,upper[2]*workerRunScale,upper[3]*workerRunScale);c.restore();c.restore();
 }else{
  const scale=46/f[3];c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(w.x),s.ground);c.scale(w.dir,1);c.drawImage(workerSheet,...f.slice(0,4),-f[2]*scale/2,-46,f[2]*scale,46);c.restore();
 }
 if(w.phase==='startled'||w.phase==='run'&&w.age<1.8){
  c.save();c.font='bold 8px monospace';c.textAlign='center';c.fillStyle='#17212bee';c.fillRect(w.x-18,s.ground-64,36,12);c.fillStyle='#fff1c5';c.fillText(w.phase==='startled'?'¡AH!':'¡CORRE!',w.x,s.ground-55);c.restore();
 }
}}

function craneRig(s){const p=s.crane,scale=p.w/238,x=p.x+p.w/2;return{x,railY:106.5*729/692-.132*x,hookY:p.y-118*scale+5,scale};}
function crane(c,s,img){const p=s.crane;if(!p||!sheet)return;const rig=craneRig(s),{x,railY,hookY,scale}=rig,top=p.y-118*scale;
 // Both cable ends share the trolley/load pivot. A continuous steel cable cannot develop tile gaps.
 c.save();c.strokeStyle='#171e20';c.lineWidth=3;c.beginPath();c.moveTo(x,railY+5);c.lineTo(x,hookY);c.stroke();c.strokeStyle='#a8a18a';c.lineWidth=1;c.stroke();c.restore();
 // The trolley is sampled from the original crane artwork and sits directly on its sloping rail.
 if(img){
  if(trolleySource!==img){trolleySource=img;trolley=document.createElement('canvas');trolley.width=26;trolley.height=22;const tc=trolley.getContext('2d');tc.imageSmoothingEnabled=false;tc.drawImage(img,Math.round(376*729/692),Math.round(55*729/692),Math.round(24*729/692),Math.round(20*729/692),0,0,26,22);const data=tc.getImageData(0,0,26,22);for(let i=0;i<data.data.length;i+=4){const r=data.data[i],g=data.data[i+1],b=data.data[i+2];if(b>45&&b>r+6&&b>g+3)data.data[i+3]=0;}tc.putImageData(data,0,0);}
  c.drawImage(trolley,x-12,railY-6,24,20);
 }
 sprite(c,7,Math.floor(s.t*4),x,top+128*scale,256*scale,256*scale);
}
// Rain stops at the first real surface in each vertical strip, including offscreen roofs.
function rainSurfaces(platforms,camera,width,height){
 const edges=[0,width];
 for(const p of platforms)for(const x of [p.x-camera.x,p.x+p.w-camera.x])if(x>0&&x<width)edges.push(x);
 const sorted=[...new Set(edges)].sort((a,b)=>a-b),strips=[];
 for(let i=0;i<sorted.length-1;i++){
  const left=sorted[i],right=sorted[i+1],worldX=(left+right)/2+camera.x;
  const roof=platforms.filter(p=>worldX>=p.x&&worldX<p.x+p.w).reduce((y,p)=>Math.min(y,p.y),Infinity);
  const bottom=roof-camera.y;if(bottom<=0)continue;
  strips.push({x:left,w:right-left,h:Math.min(height,bottom),surface:bottom});
 }
 return strips;
}
function rain(c,s,camera,width,height){
 const strips=rainSurfaces(s.platforms||[],camera,width,height);if(!strips.length)return;
 c.save();c.beginPath();for(const r of strips)c.rect(r.x,0,r.w,r.h);c.clip();
 const offset=(s.t*75)%128;
 for(let x=-128;x<width+128;x+=128)for(let y=-128;y<height+128;y+=128)sprite(c,5,Math.floor(s.t*10),x+64-(s.t*12)%128,y+64+offset,128,128,1,.42);
 c.restore();
 for(const r of strips)if(r.surface<=height)for(let x=r.x+9;x<r.x+r.w-8;x+=33)sprite(c,6,Math.floor(s.t*9+x/33),x,r.surface-3,18,12,1,.55);
}

const api={drawPlane:plane,gunshotNoises,setWorkerRunSheet,rainSurfaces,craneRig,flightPositions,cityPlacement,setWorkerSheet,setSpriteSheet,create,update,background,workers,crane,rain};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeAmbience=api;
})(typeof window!=='undefined'?window:globalThis);
