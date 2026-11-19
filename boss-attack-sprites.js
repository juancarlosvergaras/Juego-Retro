(function(root){
 'use strict';
 const paths={shared:'assets/sprites/ataques-jefes-v1.png',ordnance:'assets/sprites/armamento-jefes-v1.png'};
 const rows={slash:['shared',0],shock:['shared',1],rock:['shared',2],missile:['shared',3],blast:['shared',4],lightning:['shared',5],plasma:['shared',6],pool:['shared',7],mine:['ordnance',0],tracer:['ordnance',1],grenade:['ordnance',2],electric:['ordnance',3]};
 const sheets={},frames={};let loading;
 function load(){if(loading)return loading;loading=Promise.all(Object.entries(paths).map(([id,path])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{sheets[id]=root.prepareWhiteDeath(image);frames[id]=root.ArcadeAdvancedForms.atlas(sheets[id],4,id==='shared'?8:4,id==='ordnance'?{y:[0,.27,.44,.68,1]}:{});resolve();};image.onerror=()=>{loading=null;reject(Error(path));};image.src=path;})));return loading;}
 function frameAt(age,duration=.5,loop=false){const t=Math.max(0,age)/duration;return Math.min(3,Math.floor((loop?t%1:Math.min(.999,t))*4));}
 function draw(c,kind,age,x,y,w,h,options={}){const entry=rows[kind];if(!entry||!sheets[entry[0]])return false;const [id,row]=entry,f=frames[id][row*4+frameAt(age,options.duration||.5,options.loop!==false)];c.save();c.imageSmoothingEnabled=false;c.globalAlpha*=options.alpha??1;c.translate(Math.round(x),Math.round(y));c.rotate(options.angle||0);c.scale(options.flip?-1:1,1);c.drawImage(sheets[id],...f,-Math.round(w/2),-Math.round(h*(options.ground?1:.5)),Math.round(w),Math.round(h));c.restore();return true;}
 function beam(c,kind,age,x,y,tx,ty,width=16){const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy);if(!length)return false;return draw(c,kind,age,(x+tx)/2,(y+ty)/2,length,width,{angle:Math.atan2(dy,dx)});}
 function projectile(c,b,time=0){
  if(b.eyeRay||b.reflected){c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));const len=Math.min(b.eyeRay?34:13,b.waterDistance??Infinity);
   c.fillStyle='#2575e7';c.fillRect(-len,-3,len,6);c.fillStyle='#80edff';c.fillRect(-len,-2,len,1);c.fillRect(-len,1,len,1);c.restore();return true;}
  let kind=b.stormRay?'lightning':b.tankGrenade?'grenade':b.tankMissile||b.tankShell||b.type==='missile'||b.type==='torpedo'?'missile':b.enemy&&b.zombiePlasma?'plasma':b.enemy?'tracer':null;if(!kind)return false;const angle=Math.atan2(b.vy||0,b.vx||0)+(kind==='plasma'?Math.PI:0);return draw(c,kind,b.age??time,b.x,b.y,kind==='lightning'?35:kind==='plasma'?28:kind==='grenade'?17:kind==='tracer'?18:32,kind==='lightning'?14:kind==='plasma'?18:kind==='grenade'?17:kind==='tracer'?6:13,{angle});}
 const api={load,draw,beam,projectile,frameAt,paths,rows};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeBossAttackSprites=api;
})(typeof window!=='undefined'?window:globalThis);
