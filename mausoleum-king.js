(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const Z=common?require('./cemetery-zombies'):root.ArcadeCemeteryZombies,B=common?require('./cemetery-bat'):root.ArcadeCemeteryBat;
 const FLOOR=620,PLINTH=96,HOME=2180,LEFT=180,RIGHT=2350,ZOMBIE_HEIGHT=250*321/370;
 const durations={descend:3.6,sword:1.65,stomp:2.05,rock:2.7,crack:4.8,roar:2.6,vomit:3.2,leap:2.35,claw:1.65,death:3.8};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function enter(k,phase){k.phase=phase;k.age=0;k.fired=false;k.active=phase!=='dormant'&&phase!=='defeated';}
 function create(saved={},healthScale=1){
  const stage=saved.stage===2?2:1,maxHp=Math.round((stage===1?90:120)*healthScale),defeated=!!saved.defeated;
  const phase=defeated?'defeated':['crack','roar','descend','death'].includes(saved.phase)?saved.phase:saved.active?'walk':'dormant';
  const k={kind:'king',id:'mausoleum',stage,healthScale,maxHp,hp:Number.isFinite(saved.hp)?clamp(saved.hp,0,maxHp):maxHp,x:Number.isFinite(saved.x)?clamp(saved.x,LEFT,RIGHT):HOME,y:FLOOR,w:105,h:stage===2?ZOMBIE_HEIGHT:250,facing:-1,phase,age:0,anim:0,cycle:0,cooldown:1.6,active:phase!=='dormant'&&!defeated,defeated,hit:0,frozen:0,rocks:[],waves:[],fluid:[],pools:[],chips:[],shake:0,events:[],sequence:0};
  if(phase==='dormant'||phase==='descend'){k.x=HOME;k.y=FLOOR-PLINTH;}
  if(defeated)k.hp=0;
  if(k.hp<=0&&!defeated&&phase!=='crack'&&phase!=='death')enter(k,stage===1?'crack':'death');
  return k;
 }
 function snapshot(k){return{stage:k.stage,hp:k.hp,x:k.x,phase:k.phase,active:k.active,defeated:k.defeated};}
 function rescale(k,scale){const ratio=k.maxHp?k.hp/k.maxHp:0;k.healthScale=scale;k.maxHp=Math.round((k.stage===1?90:120)*scale);k.hp=k.maxHp*ratio;}
 function targetable(k){return !!k&&k.active&&k.hp>0&&!['descend','crack','roar','death','defeated'].includes(k.phase);}
 function box(k){return{x:k.x-k.w/2,y:k.y-k.h,w:k.w,h:k.h,thickness:k.h};}
 function clearHazards(k){k.rocks=[];k.waves=[];k.fluid=[];k.pools=[];}
 function damage(k,amount){if(!targetable(k)||!(amount>0))return false;k.hp=Math.max(0,k.hp-amount);k.hit=.18;if(k.hp<=0){enter(k,k.stage===1?'crack':'death');k.frozen=0;clearHazards(k);k.events.push('wolfHurt');}return true;}
 function supportY(k,x,platforms){let y=FLOOR;for(const s of platforms)if(s.solid&&x+k.w/2>s.x&&x-k.w/2<s.x+s.w)y=Math.min(y,s.y);return y;}
 function interiorEnemies(defeated=[]){
  const zombies=Z.create().slice(0,6).map((n,i)=>Object.assign(n,{id:300+i,x:[320,680,1200,1620,1810,1930][i],homeX:[320,680,1200,1620,1810,1930][i],y:FLOOR,homeY:FLOOR,spawnType:'sleep',variant:i%3,hp:defeated.includes(300+i)?0:3,phase:'dormant'}));
  const L=common?require('./level-two'):root.ArcadeLevelTwo;const bats=L.scaffolds().flatMap(s=>s.roosts.map((roost,side)=>{const n=B.create([],0),id=320+s.id*2+side,x=roost.x,y=roost.y+10;return Object.assign(n,{id,x,y,home:{x,y},treeIndex:null,wallRoost:true,roostSide:roost.side,scaffold:s.id,wakeRadius:300,wakeWidth:230,hp:defeated.includes(id)?0:1});}));
  return [...zombies,...bats];
 }
 function chips(k,count=8){for(let i=0;i<count;i++)k.chips.push({x:k.x+(i%5-2)*24,y:k.y-35-(i%4)*50,vx:(i%2?1:-1)*(35+i*9),vy:-85-i*7,angle:i*.9,spin:(i%2?1:-1)*2,life:3,size:7+i%4*3});}
 function wave(k,r=210){k.waves.push({x:k.x,age:0,r,max:r,hit:false});k.shake=1;k.events.push('explosion');chips(k,6);}
 function horizontalHit(k,p,range,height,hurt,damage=2){if((p.x-k.x)*k.facing>=-30&&Math.abs(p.x-k.x)<range&&p.y>k.y-height&&p.y-(p.h||46)<k.y+10)hurt(k.x,damage);}
 function beginAttack(k,phase,p){enter(k,phase);k.facing=Math.sign(p.x-k.x)||k.facing;k.targetX=clamp(p.x,LEFT,RIGHT);k.startX=k.x;k.streamClock=0;k.spitAim=phase==='vomit'&&(p.y<FLOOR-130||Math.abs(p.x-k.x)>370)?{x:p.x,y:p.y-(p.h||46)/2}:null;if(phase==='rock')k.rocks.push({target:p.x,targetY:p.y<FLOOR-110?p.y-(p.h||46)/2:FLOOR,age:0,warning:true,hit:false});}
 function addPool(k,x){x=clamp(x,LEFT-100,RIGHT+100);const pool=k.pools.find(a=>Math.abs(a.x-x)<65);if(pool){pool.life=5;pool.r=Math.min(68,pool.r+2);}else k.pools.push({x,r:32,life:5,age:0});if(k.pools.length>12)k.pools.shift();}
 function mouth(k){const scale=ZOMBIE_HEIGHT/250;return{x:k.x+k.facing*(k.age<1.25?55:60)*scale,y:k.y-(k.age<1.25?158:153)*scale};}
 function updateHazards(k,p,dt,hurt){
  for(const r of k.rocks){r.age+=dt;if(r.warning||r.landed)continue;const t=(r.age-r.launchAge)/r.flight,ty=r.targetY??FLOOR;r.x=r.sx+(r.target-r.sx)*t;r.y=r.sy+(ty-r.sy)*t-600*t*(1-t);
   if(!r.hit&&Math.abs(p.x-r.x)<32&&p.y>r.y-22&&p.y-(p.h||46)<r.y+22){r.hit=true;hurt(r.x,2);}
   if((r.hit||r.y>=FLOOR)&&!r.landed){r.landed=true;r.impactAge=r.age;k.events.push('explosion');k.shake=.65;if(!r.hit&&Math.abs(p.x-r.x)<72&&p.y>FLOOR-35){r.hit=true;hurt(r.target,2);}for(let i=0;i<7;i++)k.chips.push({x:r.x,y:r.y-12,vx:(i-3)*35,vy:-100-i%3*35,angle:i,spin:3,life:1.5,size:8+i%3*3});}
  }k.rocks=k.rocks.filter(r=>!r.landed||r.age-r.impactAge<.35);
  for(const w of k.waves){w.age+=dt;const radius=w.max*Math.min(1,w.age/.7);if(!w.hit&&Math.abs(Math.abs(p.x-w.x)-radius)<27&&p.y>FLOOR-20&&p.y-(p.h||46)<FLOOR+5){w.hit=true;hurt(w.x,2);}}k.waves=k.waves.filter(w=>w.age<.9);
  for(const d of k.fluid){const oldX=d.x,oldY=d.y;d.life-=dt;d.vy+=650*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.px=oldX;d.py=oldY;if(d.y>=FLOOR-2){addPool(k,d.x);d.life=0;}else if(Math.abs(d.x-p.x)<16&&d.y>p.y-(p.h||46)&&d.y<p.y){hurt(d.x,1);d.life=0;}}
  k.fluid=k.fluid.filter(d=>d.life>0);
  for(const a of k.pools){a.life-=dt;a.age+=dt;if(a.life>.35&&Math.abs(p.x-a.x)<a.r+10&&p.y>FLOOR-8&&p.y-(p.h||46)<FLOOR+6)hurt(a.x,1);}k.pools=k.pools.filter(a=>a.life>0);
  for(const d of k.chips){d.life-=dt;d.vy+=650*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.angle+=d.spin*dt;if(d.y>FLOOR-d.size/2){d.y=FLOOR-d.size/2;d.vy=0;d.vx*=.9;d.spin=0;}}k.chips=k.chips.filter(d=>d.life>0);
 }
 function update(k,p,dt,hurt=()=>{},enemies=[],platforms=[]){
  if(!k)return;k.events.length=0;k.hit=Math.max(0,k.hit-dt);if(p.cloak>0&&k.hp>0)return;
  k.anim+=dt;k.shake=Math.max(0,k.shake-dt*2);
  if(k.defeated)return;
  // Recover interrupted/old zero-health states before freeze or attack logic can stall them.
  if(k.hp<=0&&!['crack','death','defeated'].includes(k.phase)){enter(k,k.stage===1?'crack':'death');k.frozen=0;clearHazards(k);}
  k.floorY=supportY(k,k.x,platforms);
  if(!['dormant','descend','leap'].includes(k.phase))k.y=k.floorY;
  updateHazards(k,p,dt,hurt);
  if(k.phase==='dormant'){
   // Nearby sleepers also count: they can wake on the same step as the player arrives.
   const zombiesNearby=enemies.some(n=>n.kind==='zombie'&&n.hp>0&&Math.abs(n.y-FLOOR)<400&&(Math.abs(n.x-p.x)<650||Math.abs(n.x-HOME)<650));
   if(Math.abs(p.x-HOME)<=300&&Math.abs(p.y-FLOOR)<180&&!zombiesNearby){enter(k,'descend');k.events.push('debris');}return;
  }
  if(k.frozen>0&&targetable(k)){k.frozen=Math.max(0,k.frozen-dt);return;}
  const before=k.age;k.age+=dt;
  if(k.phase==='descend'){const t=clamp((k.age-.9)/1.7,0,1),smooth=t*t*(3-2*t);k.x=HOME-180*smooth;k.y=FLOOR-PLINTH+PLINTH*smooth-Math.sin(Math.PI*t)*22;if(before<2.6&&k.age>=2.6){chips(k,12);k.shake=1;k.events.push('explosion');}if(k.age>=durations.descend){k.y=FLOOR;enter(k,'walk');k.cooldown=1.5;}return;}
  if(k.phase==='crack'){if(Math.floor(k.age*5)>Math.floor(before*5)&&k.age>.8){chips(k,3);k.events.push('debris');}k.shake=.15+Math.sin(k.age*13)**2*.2;if(k.age>=durations.crack){k.stage=2;k.h=ZOMBIE_HEIGHT;k.maxHp=Math.round(120*k.healthScale);k.hp=k.maxHp;enter(k,'roar');k.events.push('zombieRoar');}return;}
  if(k.phase==='roar'){if(k.age>=durations.roar){enter(k,'walk');k.cycle=5/6;k.cooldown=1.2;}return;}
  if(k.phase==='death'){if(before<.2&&k.age>=.2)k.events.push('wolfDeath');if(k.age>=durations.death){enter(k,'defeated');k.defeated=true;k.active=false;clearHazards(k);}return;}
  if(k.phase==='walk'){
   k.cooldown=Math.max(0,k.cooldown-dt);const dx=p.x-k.x;k.facing=Math.sign(dx)||k.facing;const speed=k.stage===1?27:41;
   if(Math.abs(dx)>135){const step=k.facing*speed*dt,nextX=clamp(k.x+step,LEFT,RIGHT),nextY=supportY(k,nextX,platforms);if(nextY<k.y-2){beginAttack(k,'leap',p);k.targetX=clamp(nextX+k.facing*360,LEFT,RIGHT);k.startY=k.y;k.targetY=supportY(k,k.targetX,platforms);return;}k.x=nextX;k.y=nextY;k.cycle+=Math.abs(step)/110;}
   if(k.cooldown<=0){const phase=k.stage===1?(Math.abs(dx)>340||p.y<FLOOR-140?'rock':k.sequence%2?'stomp':'sword'):(p.y<FLOOR-130||Math.abs(dx)>370?(k.sequence%2?'leap':'vomit'):['vomit','leap','claw'][k.sequence%3]);k.sequence++;beginAttack(k,phase,p);if(phase==='leap'){k.startY=k.y;k.targetY=supportY(k,k.targetX,platforms);}}return;
  }
  if(k.phase==='sword'&&before<.83&&k.age>=.83){horizontalHit(k,p,190,175,hurt,2);k.events.push('axe');}
  if(k.phase==='claw'&&before<.78&&k.age>=.78){horizontalHit(k,p,185,165,hurt,2);k.events.push('claw');}
  if(k.phase==='stomp'&&before<1.03&&k.age>=1.03)wave(k);
  if(k.phase==='rock'&&before<1.2&&k.age>=1.2){for(const r of k.rocks)if(r.warning){r.warning=false;r.launchAge=r.age;r.flight=1.1;r.sx=k.x+k.facing*65;r.sy=k.y-195;r.x=r.sx;r.y=r.sy;}k.events.push('debris');}
  if(k.phase==='vomit'&&k.age>=.9&&k.age<2.3){k.streamClock+=dt;while(k.streamClock>=.025){k.streamClock-=.025;const spread=Math.sin(k.anim*19),{x,y}=mouth(k);const aim=k.spitAim,flight=aim?clamp(Math.hypot(aim.x-x,aim.y-y)/510,.5,2.6):0;
    k.fluid.push({x,y,px:x,py:y,vx:aim?(aim.x-x)/flight+spread*9:k.facing*(210+spread*65),vy:aim?(aim.y-y)/flight-325*flight+spread*8:65+spread*35,life:flight+1.5,r:4+(Math.floor(k.anim*40)%3)});}if(before<.9)k.events.push('plasma');}
  if(k.phase==='leap'){const t=clamp((k.age-.65)/1.05,0,1);k.x=k.startX+(k.targetX-k.startX)*t;k.y=(k.startY??FLOOR)+((k.targetY??FLOOR)-(k.startY??FLOOR))*t-Math.sin(t*Math.PI)*190;if(before<1.7&&k.age>=1.7){k.y=k.targetY??FLOOR;wave(k,180);}}
  if(k.age>=durations[k.phase]){k.y=supportY(k,k.x,platforms);enter(k,'walk');k.cooldown=k.stage===1?1.1:.85;}
 }
 function pose(k){
  const t=clamp(k.age/(durations[k.phase]||1),0,.999),six=Math.floor(t*6);
  if(k.phase==='dormant')return{sheet:'kingStone',row:0,frame:0};
  if(k.phase==='descend')return{sheet:'kingStone',row:0,frame:k.age<.55?0:k.age<.9?1:k.age<1.35?2:k.age<1.75?3:k.age<2.6?4:5};
  if(k.phase==='crack')return{sheet:'kingTransform',row:0,frame:six};
  if(k.phase==='roar')return{sheet:'kingTransform',row:1,frame:k.age<.4?0:k.age<.75?1:k.age<1.1?2:k.age<1.45?3:k.age<2.15?4:5};
  if(k.phase==='defeated'||k.phase==='death')return{sheet:'kingZombie',row:4,frame:k.defeated?5:six};
  if(k.stage===1&&k.phase==='leap')return{sheet:'kingStone',row:3,frame:six};
  const sheet=k.stage===1?'kingStone':'kingZombie';
  if(k.phase==='walk')return{sheet,row:k.stage===1?1:0,frame:Math.floor(k.cycle*6)%6};
  const row={sword:2,stomp:3,rock:4,vomit:1,leap:2,claw:3}[k.phase];
  let frame=six;
  if(k.phase==='vomit')frame=k.age<.3?0:k.age<.6?1:k.age<.9?2:k.age<1.25?3:k.age<2.3?4:5;
  if(k.phase==='rock')frame=k.age<.2?0:k.age<.45?1:k.age<.75?2:k.age<1.2?3:k.age<1.5?4:5;
  if(k.phase==='leap')frame=k.age<.3?0:k.age<.65?1:k.age<1.2?2:k.age<1.7?3:k.age<2.05?4:5;
  return{sheet,row,frame};
 }
 // Transparent atlas cells are trimmed once, then share a row floor and body scale.
 function prepareAtlas(image,rows=5,key='kingStone'){const legacy=key==='kingZombieLegacy';if(legacy)key='kingZombie';const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data,cw=c.width/6,frames=[];
  const bands=key==='kingZombie'?(legacy?[0,280,530,780,1020,1254]:[0,300,540,785,1024,1254]):key==='kingTransform'?[0,464,887]:[0,300,540,786,1018,1254],sourceHeight=bands.at(-1);
  for(let row=0;row<rows;row++){const line=[];let baseline=0;for(let col=0;col<6;col++){const cuts=key==='kingStone'&&row===2?[0,218,426,625,854,1082,1254]:key==='kingZombie'&&row===2?[0,224,446,635,836,1050,1254]:key==='kingZombie'&&row===3?(legacy?[0,220,425,636,866,1055,1254]:[0,213,418,641,852,1062,1254]):key==='kingZombie'&&!legacy&&row===1?[0,209,418,627,836,1054,1254]:null,x0=cuts?Math.round(cuts[col]*c.width/1254):Math.round(col*cw),x1=cuts?Math.round(cuts[col+1]*c.width/1254):Math.round((col+1)*cw),y0=Math.round(bands[row]*c.height/sourceHeight),y1=Math.round(bands[row+1]*c.height/sourceHeight);let left=x1,right=x0,top=y1,bottom=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*c.width+x)*4+3]>=200){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}line.push({x:left,y:top,w:right-left+1,h:bottom-top+1,pivot:col*cw+cw*.52});baseline=Math.max(baseline,bottom+1);}for(const f of line)f.base=key==='kingTransform'||key==='kingZombie'&&row===4?f.y+f.h:baseline;frames.push(line);}return{image,frames,scale:250/frames[0][0].h};}
 // Extract connected silhouettes once during loading. Wide claws can extend across
 // nominal cells; rectangular grid cuts would amputate them or include a neighbour.
 function prepareZombieStrips(images){
  const bodyHeights=[450,461,450,433,471],pivots=[
   [250,606,958,1310,1662,2035],[228,580,954,1314,1670,2026],
   [238,598,946,1298,1662,2040],[224,558,913,1280,1680,2050],
   [208,548,875,1220,1510,1870]
  ];
  const frames=images.map((image,row)=>{
   const packed=root.ArcadeKingStrips?.[(image.src||'').split('/').pop()];
   if(packed){
     const baseline=Math.max(...packed.frames.map(([, ,top, ,height])=>top+height));
     const ratio=packed.width/2172;
     return packed.frames.map(([x,left,top,w,h],i)=>({image,x,y:0,left,top,w,h,
       pivot:pivots[row][i]*ratio-left,base:row===4?h:baseline-top,bodyHeight:bodyHeights[row]*ratio}));
   }
   const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
   const sc=source.getContext('2d');sc.drawImage(image,0,0);
   const w=source.width,h=source.height,data=sc.getImageData(0,0,w,h).data;
   const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),parts=[];
   for(let start=0;start<w*h;start++){
    if(seen[start]||data[start*4+3]<200)continue;
    let head=0,tail=1,l=start%w,r=l,t=Math.floor(start/w),b=t;queue[0]=start;seen[start]=1;
    while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
     for(const q of [x?p-1:-1,x<w-1?p+1:-1,p-w,p+w])if(q>=0&&q<w*h&&!seen[q]&&data[q*4+3]>=200){seen[q]=1;queue[tail++]=q;}
    }
    if(tail<2000)continue;
    const canvas=document.createElement('canvas');canvas.width=r-l+1;canvas.height=b-t+1;
    const cc=canvas.getContext('2d'),pixels=cc.createImageData(canvas.width,canvas.height);
    for(let i=0;i<tail;i++){const p=queue[i],to=((Math.floor(p/w)-t)*canvas.width+p%w-l)*4;pixels.data.set(data.subarray(p*4,p*4+4),to);}
    cc.putImageData(pixels,0,0);parts.push({image:canvas,left:l,top:t,x:0,y:0,w:canvas.width,h:canvas.height});
   }
   parts.sort((a,b)=>a.left-b.left);if(parts.length!==6)throw Error('Rey zombi: se esperaban seis poses en la tira '+row);
   const baseline=Math.max(...parts.map(f=>f.top+f.h)),ratio=w/2172;
   return parts.map((f,i)=>({...f,pivot:pivots[row][i]*ratio-f.left,base:row===4?f.h:baseline-f.top,bodyHeight:bodyHeights[row]*ratio}));
  });
  return{frames,scale:ZOMBIE_HEIGHT/frames[0][0].bodyHeight,detailStrips:true};
 }
 function renderScale(atlas,key,atlases,frame){
  if(key!=='kingZombie')return atlas.scale;
  const transition=atlases.kingTransform,last=transition?.frames?.[1]?.[5],height=last?last.h*transition.scale:ZOMBIE_HEIGHT;
  return height/(frame?.bodyHeight||atlas.frames[0][0].h);
 }
 function draw(c,k,atlases){
  if(!k)return;const q=pose(k),atlas=atlases[q.sheet];if(!atlas)return;const f=atlas.frames[q.row][q.frame],scale=renderScale(atlas,q.sheet,atlases,f);
  c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(k.x),Math.round(k.y));c.scale(k.facing,1);const impact=common?require('./impact-effects'):root.ArcadeImpact;
  const tremble=k.phase==='crack'?Math.sin(k.age*32)*2:0;
  const settled=k.phase==='roar'&&k.age>=2.15&&atlases.kingZombie?.detailStrips;
  const blend=settled?Math.min(1,(k.age-2.15)/.3):0;
  c.globalAlpha=1-blend;impact.hitSprite(c,k.hit,f.image||atlas.image,f.x,f.y,f.w,f.h,Math.round((f.x-f.pivot)*scale+tremble),Math.round((f.y-f.base)*scale),Math.round(f.w*scale),Math.round(f.h*scale));
  if(blend){const a=atlases.kingZombie,g=a.frames[0][5],s=renderScale(a,'kingZombie',atlases,g);c.globalAlpha=blend;impact.hitSprite(c,k.hit,g.image,g.x,g.y,g.w,g.h,Math.round((g.x-g.pivot)*s),Math.round((g.y-g.base)*s),Math.round(g.w*s),Math.round(g.h*s));}c.restore();
 }
 let rockAtlas=null;
 function setRockSheet(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data,frames=[];
  for(let i=0;i<6;i++){const x0=Math.round(i%3*c.width/3),x1=Math.round((i%3+1)*c.width/3),y0=Math.floor(i/3)*c.height/2,y1=y0+c.height/2;let l=x1,r=x0,t=y1,b=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*c.width+x)*4+3]>=200){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}frames.push({x:l,y:t,w:r-l+1,h:b-t+1});}rockAtlas={image,frames};return rockAtlas;
 }
 function drawRock(c,x,y,age){if(!rockAtlas)return;const f=rockAtlas.frames[Math.floor(age*9)%6],scale=48/Math.max(f.w,f.h),w=Math.round(f.w*scale),h=Math.round(f.h*scale);c.save();c.imageSmoothingEnabled=false;c.drawImage(rockAtlas.image,f.x,f.y,f.w,f.h,Math.round(x-w/2),Math.round(y-h/2),w,h);c.restore();}
 function drawEffects(c,k){if(!k)return;c.save();
  if(['sword','claw'].includes(k.phase)&&k.age>.65&&k.age<1.08)root.ArcadeBossAttackSprites?.draw(c,'slash',k.age-.65,k.x+k.facing*65,k.y-95,210,160,{flip:k.facing<0,duration:.43,loop:false});
  if(k.phase==='vomit'&&k.spitAim&&k.age<.9){
   c.strokeStyle='#b8e88c';c.lineWidth=2;c.beginPath();c.arc(k.spitAim.x,k.spitAim.y,14,0,Math.PI*2);c.stroke();
  }
  for(const r of k.rocks){c.strokeStyle='#ffad58';c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.ellipse(r.target,(r.targetY??FLOOR)-2,r.targetY<FLOOR?25:70,r.targetY<FLOOR?25:9,0,0,Math.PI*2);c.stroke();c.setLineDash([]);if(!r.warning&&!r.landed)drawRock(c,r.x,r.y,r.age);}
  for(const w of k.waves){const r=w.max*Math.min(1,w.age/.7);root.ArcadeBossAttackSprites?.draw(c,'shock',w.age,w.x,FLOOR,Math.max(20,r*2),42,{ground:true,alpha:Math.max(0,1-w.age/.9)});}
  if(['stomp','leap'].includes(k.phase)&&k.age<(k.phase==='stomp'?1.03:1.7)){c.globalAlpha=.3+Math.sin(k.anim*15)**2*.3;c.fillStyle='#dba857';c.beginPath();c.ellipse(k.phase==='leap'?k.targetX:k.x,FLOOR-1,k.phase==='leap'?180:210,7,0,0,Math.PI*2);c.fill();c.globalAlpha=1;}
  for(const a of k.pools)root.ArcadeBossAttackSprites?.draw(c,'pool',a.age,a.x,FLOOR,a.r*2,21,{ground:true,alpha:Math.min(1,a.life/1.2)});
  if(k.phase==='vomit'&&k.age>=.9&&k.age<2.3&&k.fluid.length){const origin=mouth(k),d=k.fluid[k.fluid.length-1];root.ArcadeBossAttackSprites?.beam(c,'plasma',k.anim,origin.x,origin.y,d.x,d.y,15);}
  for(const d of k.fluid)root.ArcadeBossAttackSprites?.draw(c,'plasma',k.anim,d.x,d.y,Math.max(18,Math.hypot(d.x-d.px,d.y-d.py)+10),d.r*2+4,{angle:Math.atan2(d.y-d.py,d.x-d.px)+Math.PI});
  for(const d of k.chips){c.save();c.translate(d.x,d.y);c.rotate(d.angle);c.globalAlpha=Math.min(1,d.life);c.fillStyle='#626750';c.fillRect(-d.size/2,-d.size/2,d.size,d.size);c.fillStyle='#9a9c7c';c.fillRect(-d.size/2,-d.size/2,d.size,2);c.restore();}c.restore();
 }
 const api={create,snapshot,rescale,targetable,box,damage,interiorEnemies,update,pose,prepareAtlas,prepareZombieStrips,renderScale,setRockSheet,draw,drawEffects,durations,HOME,PLINTH,ZOMBIE_HEIGHT};if(common)module.exports=api;else root.ArcadeMausoleumKing=api;
})(typeof window!=='undefined'?window:globalThis);

