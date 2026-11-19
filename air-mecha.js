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
  else if(n.phase==='volley'){if(n.age>.9&&n.age<2.3&&n.shot<=0){const x=n.x+n.facing*62,y=n.y-86,dx=p.x-x,dy=p.y-24-y,d=Math.hypot(dx,dy)||1;bullets.push({x,y,vx:dx/d*300,vy:dy/d*300,life:Math.max(3,d/300+.2),enemy:true,fromTurret:true,damage:1});n.shot=.25;}if(n.age>3)n.phase='recover',n.age=0;}
  else if(n.phase==='missiles'){if(!n.fired){n.fired=true;n.markers=[-100,0,100].map(dx=>({x:Math.max(6170,Math.min(7610,p.x+dx)),y:Math.min(240,p.y-(p.h||46)-100),aimY:p.y,age:0}));}if(n.age>1.4&&n.markers.length){for(const m of n.markers)bullets.push({x:m.x,y:m.y,vx:0,vy:340,life:(n.y-m.y)/340+.2,enemy:true,tankShell:true,damage:2});n.markers=[];}if(n.age>3)n.phase='recover',n.age=0;}
  else if(n.phase==='stomp'){if(n.age>1&&!n.fired){n.fired=true;n.waves=[-1,1].map(dir=>({x:n.x,dir,life:2.5}));}if(n.age>2.2)n.phase='recover',n.age=0;}
  else if(n.phase==='recover'&&n.age>1.1)n.phase='approach',n.age=0;
  for(const w of n.waves){w.x+=w.dir*250*dt;w.life-=dt;}n.waves=n.waves.filter(w=>w.life>0);
 }
 // Fire that actually burns: the wreck artwork has painted flames, so living
 // ones are layered over its hot spots, with smoke and embers that keep moving.
 // Positions measured on the wreck frame: each one sits on a fire the artwork already shows.
 const HOT=[[2,-89,1.1],[-24,-71,1],[40,-81,.8],[64,-26,.9],[-4,-38,.8]],STACKS=[[3,-100],[42,-90]];
 const rnd=v=>{const q=Math.sin(v*127.1+311.7)*43758.5453;return q-Math.floor(q);};
 function flame(c,x,y,size,time,seed){
  const tick=Math.floor(time*14);
  for(let k=-2;k<=2;k++){const h=Math.round((7+rnd(tick+k*3.1+seed)*13)*size*(1-Math.abs(k)*.22)),px=Math.round(x+k*3*size);
   c.fillStyle='#b3261e';c.fillRect(px,Math.round(y-h),3,h);
   c.fillStyle='#ff7a2a';c.fillRect(px,Math.round(y-h*.72),3,Math.round(h*.72));
   if(Math.abs(k)<2){c.fillStyle='#ffb23f';c.fillRect(px,Math.round(y-h*.45),3,Math.round(h*.45));}
   if(k===0){c.fillStyle='#fff1c2';c.fillRect(px,Math.round(y-h*.22),2,Math.round(h*.22));}}
  // Embers break away and climb.
  for(let i=0;i<3;i++){const u=(time*(.9+i*.2)+rnd(seed+i))%1;c.fillStyle=u<.5?'#ffd27a':'#ff7a2a';c.fillRect(Math.round(x+(rnd(seed*3+i+Math.floor(time*(.9+i*.2)))-.5)*18*size+Math.sin(u*9+i)*3),Math.round(y-10*size-u*46),2,2);}
 }
 function smoke(c,x,y,time,seed,strength=1){
  for(let i=0;i<7;i++){const u=(time*.3+i/7+rnd(seed))%1,size=Math.round((5+u*15)*strength),px=Math.round(x+Math.sin(u*5+i+seed)*9+u*22),py=Math.round(y-u*130);
   c.globalAlpha=(1-u)*.62;c.fillStyle=i%2?'#3a3d44':'#4d5058';c.fillRect(px-size,py-Math.round(size*.6),size*2,Math.round(size*1.2));c.fillRect(px-Math.round(size*.6),py-size,Math.round(size*1.2),size*2);
   c.fillStyle='#62666e';c.fillRect(px-Math.round(size*.5),py-Math.round(size*.7),Math.round(size*.7),Math.round(size*.5));}
  c.globalAlpha=1;
 }
 function blast(c,x,y,phase,seed){
  if(phase>=1)return;const grow=6+phase*30;
  if(phase<.12){c.fillStyle='#fffbe8';c.fillRect(Math.round(x-grow),Math.round(y-grow*.7),Math.round(grow*2),Math.round(grow*1.4));}
  for(let i=0;i<16;i++){const a=rnd(seed*3+i)*Math.PI*2,d=grow*(.3+rnd(seed+i*7)*.8);c.fillStyle=phase<.2?'#fff1c2':phase<.45?(i%2?'#ffb23f':'#ff7a2a'):(i%2?'#5b5f66':'#3a3d44');const size=phase<.4?4:rnd(seed+i)>.5?7:5;c.fillRect(Math.round(x+Math.cos(a)*d),Math.round(y+Math.sin(a)*d*.8),size,size);}
 }
 // Effects over the body while it comes apart and after it has fallen.
 function wreckage(c,n){
  if(n.hp>0)return;const dir=-n.facing,at=([dx,dy])=>[n.x+dir*dx,620+dy],falling=n.deathAge<4;
  if(falling){
   // Chained detonations walk across the hull, faster toward the end.
   const rate=2.2+n.deathAge*1.1,clock=n.deathAge*rate,cycle=Math.floor(clock);
   for(let k=0;k<3;k++){const id=cycle-k;if(id<0)continue;const phase=(clock-id)/1.6;blast(c,n.x+(rnd(id*5.3)-.5)*120,620-18-rnd(id*9.1)*120,phase,id);}
   for(let i=0;i<Math.min(HOT.length,1+Math.floor(n.deathAge*1.4));i++){const [x,y]=at(HOT[i]);flame(c,x,y,HOT[i][2]*Math.min(1,n.deathAge/2+.3),n.anim,i*17);}
   smoke(c,...at(STACKS[0]),n.anim,3,.5+n.deathAge*.12);
  }else{
   for(const [i,stack] of STACKS.entries())smoke(c,...at(stack),n.anim,i*5+1);
   for(const [i,spot] of HOT.entries()){const [x,y]=at(spot);flame(c,x,y,spot[2],n.anim,i*17);}
   // Now and then something still cooks off inside.
   const clock=n.anim*.28,cycle=Math.floor(clock);blast(c,n.x+(rnd(cycle*3.7)-.5)*70,620-24-rnd(cycle*6.1)*60,(clock-cycle)*3.2,cycle);
  }
 }
 // Light sources of the burning hull for the scene's light map.
 function lights(n){if(n.hp>0)return[];const dir=-n.facing,flick=.75+rnd(Math.floor(n.anim*14))*.25;return HOT.slice(0,3).map(([dx,dy])=>({x:n.x+dir*dx,y:620+dy,r:110,a:.7*flick,glow:'255,150,70',ga:.2*flick}));}
 function draw(c,n,sheet){const row=n.hp<=0?2:n.phase==='volley'||n.phase==='missiles'||n.phase==='stomp'?1:0,col=n.hp<=0?Math.min(3,Math.floor(n.deathAge)):row===0?Math.floor(n.anim*5)%4:n.phase==='volley'?0:n.phase==='missiles'?1:n.age<1?2:3,w=sheet.width/4,h=sheet.height/3;const scale=.52,quake=n.hp<=0&&n.deathAge<4?Math.round((rnd(Math.floor(n.anim*30))-.5)*4*(1-n.deathAge/4)):0;c.save();c.imageSmoothingEnabled=false;c.fillStyle='#0b111680';c.fillRect(Math.round(n.x-78),619,156,4);c.fillStyle='#0b111650';c.fillRect(Math.round(n.x-92),621,184,3);c.translate(Math.round(n.x)+quake,620);c.scale(-n.facing,1);const impact=(typeof module!=='undefined'&&module.exports?require('./impact-effects'):root.ArcadeImpact);const f=frames?.[row]?.[col]||[col*w,row*h,w,h];impact.hitSprite(c,n.hit,sheet,...f,(f[0]-col*w-w/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);c.restore();wreckage(c,n);for(const m of n.markers){c.fillStyle='#ff533944';c.fillRect(m.x-35,614,70,6);c.strokeStyle='#ffcf85';c.strokeRect(m.x-28,610,56,9);c.fillStyle='#ffc1a0';c.font='bold 11px monospace';c.fillText('▼',m.x-4,Math.min(593,m.aimY-60));}for(const w of n.waves)root.ArcadeBossAttackSprites?.draw(c,'electric',2.5-w.life,w.x,620,65,40,{ground:true});if(n.phase==='volley'&&n.age>.9&&n.age<2.3&&n.shot>.14)root.ArcadeBossAttackSprites?.draw(c,'blast',.25-n.shot,n.x+n.facing*62,n.y-86,33,24,{duration:.25,loop:false});}
 // Llama, humo y detonación se comparten con otros restos en llamas del juego.
 const api={create,update,draw,setSheet,wreckage,lights,flame,smoke,blast};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeAirMecha=api;
})(typeof window!=='undefined'?window:globalThis);
