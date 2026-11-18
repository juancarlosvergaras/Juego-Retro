(function(root){
 'use strict';
 function create(area){return{area,wet:false,lastX:null,travel:0,age:0,ripples:[],drops:[]};}
 function prepareSprite(image){
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d');c.drawImage(image,0,0);c.globalCompositeOperation='destination-in';
  // Blend the cutaway into the street without softening the pixel-art rubble.
  const side=c.createLinearGradient(0,0,canvas.width,0);side.addColorStop(0,'transparent');side.addColorStop(.035,'#000');side.addColorStop(.965,'#000');side.addColorStop(1,'transparent');c.fillStyle=side;c.fillRect(0,0,canvas.width,canvas.height);
  const base=c.createLinearGradient(0,0,0,canvas.height);base.addColorStop(0,'#000');base.addColorStop(.88,'#000');base.addColorStop(1,'transparent');c.fillStyle=base;c.fillRect(0,0,canvas.width,canvas.height);return canvas;
 }
 function depth(p,a){return p.x>a.x&&p.x<a.x+a.w&&p.y>a.surface?Math.min(p.h||46,p.y-a.surface):0;}
 function splash(s,x,strength=1){
  const a=s.area;s.ripples.push({x,age:0,size:7*strength});
  for(let i=0;i<8;i++)s.drops.push({x,y:a.surface,vx:(i-3.5)*15*strength,vy:-(25+(i%3)*18)*strength,life:.55});
 }
 function update(s,p,dt,inside=false,sound=()=>{}){
  s.age+=dt;for(const r of s.ripples)r.age+=dt;s.ripples=s.ripples.filter(r=>r.age<1);
  for(const d of s.drops){d.life-=dt;d.vy+=230*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;}s.drops=s.drops.filter(d=>d.life>0&&d.y<s.area.surface+1);
  const wet=!inside&&depth(p,s.area)>0;
  if(wet!==s.wet){if(wet||s.lastX!==null){splash(s,wet?p.x:s.lastX,1+(p.impact||0)*.7);sound();}s.travel=0;}
  if(wet&&s.wet&&s.lastX!==null){s.travel+=Math.abs(p.x-s.lastX);if(s.travel>=18){s.travel%=18;splash(s,p.x,.42);sound();}}
  s.wet=wet;s.lastX=wet?p.x:null;
 }
 function cavity(c,a){c.beginPath();c.moveTo(a.profile[0][0],a.road);c.lineTo(a.profile.at(-1)[0],a.road);for(let i=a.profile.length-1;i>=0;i--)c.lineTo(...a.profile[i]);c.closePath();}
 function drawBanks(c,a,image){
  const scale=.16,y=a.road-264*scale,height=724*scale;
  if(a.w<=2172*scale){c.drawImage(image,a.x,y,a.w,height);return;}
  const left=800*scale,right=(2172-1360)*scale,tile=560*scale;
  c.drawImage(image,0,0,800,724,a.x,y,left,height);
  for(let offset=left;offset<a.w-right;offset+=tile){const width=Math.min(tile,a.w-right-offset);c.drawImage(image,800,0,width/scale,724,a.x+offset,y,width,height);}
  c.drawImage(image,1360,0,812,724,a.x+a.w-right,y,right,height);
 }
 function drawBack(c,s,image){const a=s.area;c.save();cavity(c,a);c.fillStyle='#26383b';c.fill();c.restore();if(image)drawBanks(c,a,image);c.save();cavity(c,a);c.clip();const g=c.createLinearGradient(0,a.surface,0,a.surface+32);g.addColorStop(0,'#528c99');g.addColorStop(1,'#193b48');c.fillStyle=g;c.fillRect(a.x,a.surface,a.w,40);c.restore();}
 function drawFront(c,s){const a=s.area;c.save();cavity(c,a);c.clip();
  c.fillStyle='rgba(39,105,124,.62)';c.fillRect(a.x,a.surface,a.w,40);
  for(let i=0;i<Math.ceil((a.w-100)/14);i++){const x=a.x+50+i*14+Math.sin(s.age*.8+i)*3,y=a.surface+2+(i%4)*5;c.fillStyle=i%3?'#a5d4d04d':'#e4eadc80';c.fillRect(x,y,6+(i%3)*4,1);}
  c.strokeStyle='#a4d9da';c.lineWidth=1;c.beginPath();for(let x=a.x;x<a.x+a.w;x+=3){const y=a.surface+Math.sin(x*.14+s.age*2)*.6;c[x===a.x?'moveTo':'lineTo'](x,y);}c.stroke();
  for(const r of s.ripples){c.globalAlpha=1-r.age;c.strokeStyle='#c1e5df';c.beginPath();c.ellipse(r.x,a.surface+1,r.size+r.age*27,1.5+r.age*2,0,0,Math.PI*2);c.stroke();}c.restore();
  c.fillStyle='#c3e8ec';for(const d of s.drops)c.fillRect(Math.round(d.x),Math.round(d.y),2,2);
 }
 const api={create,depth,update,splash,drawBack,drawFront,prepareSprite};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeWaterCrater=api;
})(typeof window!=='undefined'?window:globalThis);
