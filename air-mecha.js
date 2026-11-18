(function(root){
 'use strict';
 let frames=null;
 function setSheet(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);const d=g.getImageData(0,0,c.width,c.height).data;frames=[];for(let row=0;row<3;row++){frames[row]=[];for(let col=0;col<4;col++){const x0=Math.round(col*c.width/4),x1=Math.round((col+1)*c.width/4),y0=Math.round(row*c.height/3),y1=Math.round((row+1)*c.height/3);let l=x1,r=x0,t=y1,b=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(d[(y*c.width+x)*4+3]>=200){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}frames[row][col]=[l,t,r-l+1,b-t+1];}}return frames;}
 function create(saved={},scale=1){const maxHp=Math.round(100*scale);return{kind:'mecha',baseHp:100,id:'air-mecha',x:6980,y:620,w:112,h:158,hp:saved.defeated?0:maxHp,maxHp,active:false,phase:saved.defeated?'wreck':'idle',age:0,cycle:0,shot:0,anim:0,hit:0,death:saved.defeated?0:4,deathAge:saved.defeated?4:0,defeated:!!saved.defeated,facing:-1,markers:[],waves:[]};}
 function update(n,p,dt,bullets,view){
  n.anim+=dt;n.hit=Math.max(0,n.hit-dt);
  if(n.hp<=0){n.active=false;n.markers=[];n.waves=[];n.deathAge+=dt;n.death=Math.max(0,4-n.deathAge);n.phase=n.deathAge<4?'destroy':'wreck';if(n.deathAge>=4)n.defeated=true;return;}
  if(!n.active){if(p.x<6170||Math.abs(p.y-n.y)>420||view&&(n.x-n.w/2>view.right-40||n.x+n.w/2<view.left))return;n.active=true;n.phase='approach';n.age=0;}
  n.age+=dt;n.shot-=dt;n.facing=p.x<n.x?-1:1;
  if(n.phase==='approach'){const dx=p.x-n.x;n.x=Math.max(6390,Math.min(7400,n.x+Math.sign(dx)*28*dt));if(n.age>2){n.phase=['volley','missiles','stomp'][n.cycle++%3];n.age=0;n.shot=.8;n.fired=false;}}
  else if(n.phase==='volley'){if(n.age>.9&&n.age<2.3&&n.shot<=0){const x=n.x+n.facing*62,y=n.y-86,dx=p.x-x,dy=p.y-24-y,d=Math.hypot(dx,dy)||1;bullets.push({x,y,vx:dx/d*300,vy:dy/d*300,life:3,enemy:true,fromTurret:true,damage:1});n.shot=.25;}if(n.age>3)n.phase='recover',n.age=0;}
  else if(n.phase==='missiles'){if(!n.fired){n.fired=true;n.markers=[-100,0,100].map(dx=>({x:Math.max(6230,Math.min(7600,p.x+dx)),age:0}));}if(n.age>1.4&&n.markers.length){for(const m of n.markers)bullets.push({x:m.x,y:240,vx:0,vy:340,life:2,enemy:true,tankShell:true,damage:2});n.markers=[];}if(n.age>3)n.phase='recover',n.age=0;}
  else if(n.phase==='stomp'){if(n.age>1&&!n.fired){n.fired=true;n.waves=[-1,1].map(dir=>({x:n.x,dir,life:2.5}));}if(n.age>2.2)n.phase='recover',n.age=0;}
  else if(n.phase==='recover'&&n.age>1.1)n.phase='approach',n.age=0;
  for(const w of n.waves){w.x+=w.dir*250*dt;w.life-=dt;}n.waves=n.waves.filter(w=>w.life>0);
 }
 function draw(c,n,sheet){const row=n.hp<=0?2:n.phase==='volley'||n.phase==='missiles'||n.phase==='stomp'?1:0,col=n.hp<=0?Math.min(3,Math.floor(n.deathAge)):row===0?Math.floor(n.anim*5)%4:n.phase==='volley'?0:n.phase==='missiles'?1:n.age<1?2:3,w=sheet.width/4,h=sheet.height/3;const scale=.52;c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(n.x),620);c.scale(-n.facing,1);if(n.hit>0)c.globalAlpha=.7;const f=frames?.[row]?.[col]||[col*w,row*h,w,h];c.drawImage(sheet,...f,(f[0]-col*w-w/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);c.restore();for(const m of n.markers){c.fillStyle='#ff533944';c.fillRect(m.x-35,614,70,6);c.strokeStyle='#ffcf85';c.strokeRect(m.x-28,610,56,9);c.fillStyle='#ffc1a0';c.font='bold 11px monospace';c.fillText('▼',m.x-4,593);}for(const w of n.waves)root.ArcadeBossAttackSprites?.draw(c,'electric',2.5-w.life,w.x,620,65,40,{ground:true});if(n.phase==='volley'&&n.age>.9&&n.age<2.3&&n.shot>.14)root.ArcadeBossAttackSprites?.draw(c,'blast',.25-n.shot,n.x+n.facing*62,n.y-86,33,24,{duration:.25,loop:false});}
 const api={create,update,draw,setSheet};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeAirMecha=api;
})(typeof window!=='undefined'?window:globalThis);
