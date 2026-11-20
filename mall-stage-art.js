(function(root){
 'use strict';
 const W=960,H=540,ground=472,edge=440;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function polygon(c,color,points){
  c.fillStyle=color;c.beginPath();c.moveTo(...points[0]);
  for(const p of points.slice(1))c.lineTo(...p);
  c.closePath();c.fill();
 }
 function line(c,color,width,points){
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...points[0]);
  for(const p of points.slice(1))c.lineTo(...p);
  c.stroke();
 }
 // Build small, filtered strips once; scrolling only translates already sampled pixels.
 const interiors=new WeakMap();
 function strip(width,height){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';return ctx;
 }
 function band(ctx,img,top,bottom,y,height,width=ctx.canvas.width){
  const k=img.width/root.ArcadeMallInterior.referenceWidth;
  ctx.drawImage(img,0,top*k,img.width,(bottom-top)*k,0,y,width,height);
 }
 function interiorArt(images,floor){
  let built=interiors.get(images);
  if(!built){built=[];interiors.set(images,built);}
  if(built[floor])return built[floor];
  const layout=root.ArcadeMallInterior.storefront(floor),{tile,scale,sill,threshold,top}=layout;
  const image=[images.atrium,images.gallery,images.food][floor];
  const front=strip(tile,H-top);
  band(front,image,layout.cornice,sill,0,threshold-top);
  // Keep the first terrazzo tiles in scale with the doorway. Deeper rows
  // occupy more vertical space as they approach the front of the screen.
  const depth=H-threshold,sourceDepth=384-sill,natural=sourceDepth*scale;
  const extra=depth-natural;
  function floorRow(y){return 2*y/(natural+Math.sqrt(natural*natural+4*extra*y));}
  for(let y=0;y<depth;y++){
   const start=floorRow(y),end=floorRow(y+1);
   band(front,image,sill+start*sourceDepth,sill+end*sourceDepth,threshold-top+y,1);
  }
  const distant=[images.atriumUpper,images.galleryUpper,images.foodUpper][floor];
  const back=strip(Math.round(distant.width*top/distant.height),top);
  back.drawImage(distant,0,0,back.canvas.width,top);
  return built[floor]={image,layout,front:front.canvas,back:back.canvas};
 }
 function repeat(c,img,scroll,y,mirror=false){
  const offset=Math.round(scroll),first=Math.floor(offset/img.width);
  for(let i=first,x=i*img.width-offset;x<W;i++,x+=img.width){
   if(mirror&&i%2){
    c.save();c.translate(x+img.width,y);c.scale(-1,1);c.drawImage(img,0,0);c.restore();
   }else c.drawImage(img,x,y);
  }
 }
 function background(c,s,images,dy=0){
  if(s.floor===3){
   const img=images.roof,k=W/img.width;
   c.drawImage(img,-Math.round(s.camera.x),Math.round(edge-img.height*k*.82)+dy,W,img.height*k);
   return;
  }
  const art=interiorArt(images,s.floor),x=s.camera.x;
  c.save();
  const scale=1+Math.max(0,dy)/art.layout.top;
  c.translate(W/2,0);c.scale(scale,scale);c.translate(-W/2,0);
  repeat(c,art.back,x*.72,Math.min(0,dy),true);c.restore();
  repeat(c,art.front,x*root.ArcadeMallInterior.parallax,art.layout.top+dy);
  return art;
 }
 function balcony(c,pl){
  const x=pl.x,y=pl.y,w=pl.w;
  c.fillStyle='#233237';c.fillRect(x,y,w,12);
  c.fillStyle='#a18a66';c.fillRect(x,y,w,3);
  for(const post of [x+12,x+w-16]){
   c.fillStyle='#4b5553';c.fillRect(post,y+12,5,ground-y-12);
   line(c,'#61645a',3,[[post,y+38],[post+(post===x+12?24:-24),y+12]]);
  }
  c.fillStyle='#626c66';c.fillRect(x+10,y-18,w-20,2);
  for(let dx=12;dx<w-12;dx+=45)c.fillRect(x+dx,y-18,2,18);
 }
 function stairs(c,s,front,st=root.ArcadeMallWorld.escalator(s.floor)){
  const world=root.ArcadeMallWorld;
  const {entry,lower,upper,exit,rise}=st,top=ground-rise;
  const comb=exit-14,rail=[[entry,ground],[lower,ground],[upper,top],[comb,top]];
  const offset=(dx,dy)=>rail.map(([x,y])=>[x+dx,y+dy]);
  if(front){
   // The near stringer hides the underside. Feet and treads remain visible.
   polygon(c,'#313d40',[...offset(0,5),...offset(0,15).reverse()]);
   line(c,'#a3aaa1',2,offset(0,5));
   for(let x=lower+20;x<upper;x+=45){const y=world.treadY(st,x);c.fillStyle='#7e8983';c.fillRect(x,y+9,2,2);}
   return;
  }
  polygon(c,'#34454a',[...offset(-5,-15),...offset(0,4).reverse()]);
  polygon(c,'#658b91bb',[...offset(-5,-25),...offset(-5,-12).reverse()]);
  line(c,'#b2c7bb',1,offset(-5,-25));line(c,'#879a8a',2,offset(-5,-12));
  for(let x=lower+10;x<upper;x+=38){const y=world.treadY(st,x);line(c,'#b4d4ca70',2,[[x-5,y-24],[x-9,y-12]]);}
  line(c,'#212c32',4,offset(-5,-27));line(c,'#a6b5ac',1,offset(-5,-29));
  for(let x=entry+14;x<exit;x+=48){
   const y=world.treadY(st,x);line(c,'#98a8a0',2,[[x-5,y-26],[x-5,y-12]]);
  }
  // The treads follow the belt of the world, which reverses for a ride down.
  const pitch=st.pitch,phase=(((s.belt??s.time*st.speed)%pitch)+pitch)%pitch;
  for(let x=lower+phase-120;x<comb;x+=pitch){
   if(x<entry)continue;
   const y=Math.round(world.treadY(st,x)),ix=Math.round(x);
   c.fillStyle='#253035';c.fillRect(ix-pitch/2,y,pitch,7);
   c.fillStyle='#919a91';c.fillRect(ix-pitch/2,y-1,pitch,2);
   c.fillStyle='#d8ae53';c.fillRect(ix-pitch/2,y-1,2,2);
   for(let j=2-pitch/2;j<pitch/2;j+=3){c.fillStyle='#617174';c.fillRect(ix+j,y+2,1,4);}
  }
  c.fillStyle='#233336';c.fillRect(entry-12,ground-3,35,5);c.fillRect(comb-6,top-2,22,4);
  c.fillStyle='#daaf53';c.fillRect(entry-12,ground-3,35,2);c.fillRect(comb-6,top-2,22,1);
 }
 // The corner of the slab turns toward the viewer. It leaves the escalator
 // well open on the left and widens into the actual walkable floor on the right.
 const lip=[[17,ground+8],[164,ground+8],[184,ground+11],[199,ground+18],[256,H-9],[273,H-3],[289,H]];
 function lipY(x){
  for(let i=1;i<lip.length;i++){
   const [end,y]=lip[i],[start,previous]=lip[i-1];
   if(x<=end)return previous+(y-previous)*clamp((x-start)/(end-start),0,1);
  }
  return H;
 }
 const titles=['GALERÍAS','RESTAURANTES','AZOTEA'];
 function plaque(c,title,x,y){
  c.font='bold 8px monospace';c.textAlign='left';
  const width=Math.ceil(c.measureText(title).width)+19;
  c.fillStyle='#937959';c.fillRect(x-1,y-1,width+2,12);
  c.fillStyle='#253336';c.fillRect(x,y,width,10);
  c.fillStyle='#e4d2a5';c.fillText(title+' ›',x+4,y+8);
 }
 // Each floor is a room of its own. Upstairs the row of shops ends in a wall at
 // the left, beside the open well that the escalator climbs through. Drawn in
 // screen space, over the panorama and behind everybody.
 function stairwell(c,s,images){
  const floor=s.floor,cam=Math.round(s.camera.x),right=cam+W;
  if(floor<1||cam>300)return;
  const st=root.ArcadeMallWorld.escalator(floor-1);
  c.save();c.translate(-cam,0);
  if(floor===3){
   // On the roof the escalator surfaces through a hatch in the deck.
   const hatch=[[cam-10,ground-8],[30,ground-8],[44,ground+7],[44,H]];
   polygon(c,'#101a21',[...hatch,[cam-10,H]]);line(c,'#a09081',2,hatch);
   c.restore();return;
  }
  const upstairs=interiorArt(images,floor),back=lip[0][0]+36,ceiling=upstairs.layout.top;
  const shade=c.createLinearGradient(0,ceiling,0,H);
  shade.addColorStop(0,'#2b363d');shade.addColorStop(.65,'#18222a');shade.addColorStop(1,'#0c141a');
  polygon(c,shade,[[cam-10,ceiling],[back,ceiling],[back,ground-27],...lip,[cam-10,H]]);
  // Stone piers, soffit and trim are sampled from the gallery painting at shop scale.
  const stone=images.gallery,k=stone.width/root.ArcadeMallInterior.referenceWidth;
  function stoneRect(sx,sy,sw,sh,x,y,w,h){
   c.drawImage(stone,sx*k,sy*k,sw*k,sh*k,x,y,w,h);
  }
  for(let x=back-124;x>cam-130;x-=120)stoneRect(231,160,125,17,x,ceiling-4,120,9);
  c.save();c.globalAlpha=.55;
  for(const x of [52,216]){
   const head=Math.round(lipY(x)+10);
   stoneRect(389,182,23,147,x,head,20,st.rise+ground-head-1);
   stoneRect(387,164,26,21,x-4,head,28,12);
  }
  c.restore();
  const outer=[...lip,[Math.max(290,right+1),H]];
  polygon(c,'#392d32',[...outer,...outer.map(([x,y])=>[x,y+16]).reverse()]);
  for(const [color,w,dy] of [['#796254',4,12],['#b09a77',2,7],['#504344',3,4],['#e1c9a0',2,1]]){
   line(c,color,w,outer.map(([x,y])=>[x,y+dy]));
  }
  stoneRect(233,161,123,18,17,ground+11,146,11);
  plaque(c,titles[floor-1],82,ground+11);
  // A corner pilaster and its cornice close the row of shops.
  stoneRect(389,182,23,147,back-5,ceiling+4,13,upstairs.layout.threshold-ceiling-4);
  stoneRect(386,159,30,29,back-8,ceiling-1,19,11);
  stoneRect(388,310,25,18,back-7,upstairs.layout.threshold-8,17,8);
  c.restore();
 }
 // The top of an escalator, seen from its own floor: a landing over a closed
 // base and the doorway that leads on. Nothing of the next room is shown.
 function landing(c,st,floor){
  const top=ground-st.rise,left=st.exit-8,right=st.exit+164,door=st.exit+34,height=80;
  c.fillStyle='#27333a';c.fillRect(left+6,top+14,right-left-6,ground-top-14);
  for(let x=left+52;x<right;x+=46){c.fillStyle='#1e2930';c.fillRect(x,top+17,2,ground-top-22);}
  c.fillStyle='#3f4c50';c.fillRect(left+6,top+14,2,ground-top-14);
  c.fillStyle='#16222a';c.fillRect(left+8,top+14,right-left-8,3);
  c.fillStyle='#55605a';c.fillRect(left+6,ground-5,right-left-6,5);
  plaque(c,titles[floor],left+18,top+30);
  c.fillStyle='#3c4342';c.fillRect(door-6,top-height-7,right-door+6,height+7);
  c.fillStyle='#726b51';c.fillRect(door-6,top-height-7,right-door+6,3);
  c.fillStyle='#99866d';c.fillRect(door-5,top-height-4,1,height+4);
  c.fillStyle='#0e171d';c.fillRect(door,top-height,right-door,height);
  c.fillStyle='#19262d';c.fillRect(door,top-height,6,height);
  c.fillStyle='#233237';c.fillRect(left,top,right-left,14);
  c.fillStyle='#a18a66';c.fillRect(left,top,right-left,3);
  c.fillStyle='#5e4d41';c.fillRect(left,top+12,right-left,2);
 }
 // World space. This floor's escalator with its landing, and the head of the
 // one that arrives from the floor below.
 function escalators(c,s,front){
  const world=root.ArcadeMallWorld,cam=s.camera.x;
  if(s.floor<3){
   const st=world.escalator(s.floor);
   if(cam+W>st.entry-40){
    if(!front)landing(c,st,s.floor);
    stairs(c,s,front,st);
   }
  }
  if(s.floor>0&&cam<160){
   const st=world.escalator(s.floor-1);
   c.save();c.translate(world.landingX-st.exit,st.rise);stairs(c,s,front,st);c.restore();
  }
 }
 // The veil of a crossing. It covers far more than the frame, so that it also
 // hides everything under any zoom applied around the renderer.
 function veil(c,s){
  const fade=Math.min(1,s.stairs?.fade||0);
  if(fade<=0)return;
  c.save();c.globalAlpha=fade;c.fillStyle='#060c12';c.fillRect(-2000,-2000,6000,6000);c.restore();
 }
 function gait(c,sheet,actor,k,time,cycle){
  const weight=Math.min(1,Math.abs(actor.vx||0)/68);
  const phase=weight>.06?cycle:time*.65;
  const frame=((Math.round(phase*32)%32)+32)%32,row=Math.round(weight*8);
  c.save();c.translate(Math.round(actor.x),Math.round(actor.y));c.scale((actor.facing||1)*k,k);
  c.drawImage(sheet,frame*96,row*90,96,90,-47,-86,96,90);c.restore();
 }
 function guard(c,n,images,time){
  const steps=images[n.kind+'Steps'];
  if(!steps)return false;
  const k=n.kind==='warden'?.77:n.kind==='knife'?.71:.64;
  let row,progress;
  if(n.hp<=0){row=11;progress=1-n.death/.8;}
  else if(n.hit>0){row=10;progress=1-n.hit/.18;}
  else if(n.attackAge!=null){row=4;progress=n.attackAge/.65;}
  else if(n.flash>0){row=13;progress=1-n.flash/.17;}
  else if(n.bracing){row=2;progress=(time*.7)%1;}
  else if(n.grounded===false){row=3;progress=clamp(.5+(n.vy||0)/900,0,1);}
  else{gait(c,steps,n,k,time,n.kind==='warden'?(n.anim||0)*1.1:n.runCycle||0);return true;}
  const frame=clamp(Math.floor(progress*12),0,11);
  c.save();c.translate(Math.round(n.x),Math.round(n.y));c.scale((n.facing||1)*k,k);
  if(n.hp<=0)c.globalAlpha=Math.min(1,n.death*3);
  c.drawImage(images[n.kind+'Actions'],frame*120,row*98,120,98,-53,-91,120,98);c.restore();
  return true;
 }
 function phaseFrame(t,span,count){return clamp(Math.floor(t/span*count),0,count-1);}
 function giantPose(s){
  const b=s.boss,t=b.age;
  if(s.ending>=0)return {row:4,frame:phaseFrame(s.ending,3.1,8),sink:Math.pow(clamp((s.ending-1.8)/3.2,0,1),1.6)*360};
  switch(b.phase){
   case 'fistWarn':return {row:1,frame:phaseFrame(t,1.15,4)};
   case 'fist':return {row:1,frame:4+phaseFrame(t,.78,4)};
   case 'sweepWarn':return {row:2,frame:phaseFrame(t,1.3,4)};
   case 'sweep':return t<.95?{row:2,frame:4+phaseFrame(t,.95,4)}:{row:0,frame:Math.floor((t-.95)*6)%8};
   case 'throwWarn':return {row:3,frame:phaseFrame(t,.96,5)};
   case 'throw':return {row:3,frame:5+phaseFrame(t,.65,3)};
   case 'rocksWarn':return {row:3,frame:phaseFrame(t,1.48,5)};
   case 'rocks':return t<.8?{row:3,frame:5+phaseFrame(t,.8,3)}:{row:0,frame:Math.floor((t-.8)*6)%8};
   default:return {row:0,frame:Math.floor(s.time*6)%8,sink:b.phase==='arrival'?(1-clamp(t/2.4,0,1))**2*315:0};
  }
 }
 function giant(c,s,img){
  if(!s.boss.active&&s.ending<0)return;
  const pose=giantPose(s),cw=img.width/8,ch=img.height/5;
  const width=420,height=width*ch/cw,baseline=edge+48+(pose.sink||0);
  c.save();c.beginPath();c.rect(0,0,W,edge+2);c.clip();
  if(s.boss.throwDir===1&&['throwWarn','throw'].includes(s.boss.phase)){c.translate(2*s.boss.x,0);c.scale(-1,1);}
  root.ArcadeImpact.hitSprite(c,s.boss.hit,img,cw*pose.frame,ch*pose.row,cw,ch,Math.round(s.boss.x-width/2),Math.round(baseline-height),width,height);
  c.restore();
 }
 function rooftop(c,texture,time){
  c.fillStyle='#283b46';c.fillRect(0,edge,W,23);
  c.fillStyle='#a09081';c.fillRect(0,edge,W,4);
  c.fillStyle='#56616a';c.fillRect(0,edge+5,W,2);
  for(let x=0;x<W;x+=74){c.fillStyle='#1c303a';c.fillRect(x,edge+7,2,15);}
  c.drawImage(texture,0,edge+23,W,H-edge-23);
  for(const x of [105,922]){c.fillStyle='#1f2b34';c.fillRect(x,edge-16,6,16);c.fillStyle=Math.sin(time*3)>0?'#f0956e':'#9a5d51';c.fillRect(x+1,edge-17,4,4);}
  for(let x=0;x<W+40;x+=118)line(c,'#343f4950',2,[[x,edge+24],[x-33,H]]);
  for(const y of [ground+1,ground+23,H-10]){c.fillStyle='#56606a40';c.fillRect(0,y,W,1);}
 }
 function hazards(c,s,images,rock){
  const b=s.boss;
  if(b.phase==='throwWarn'&&b.aim){
   const {x,y}=b.aim,r=13+8*(1-clamp(b.age/.96,0,1));
   c.save();c.strokeStyle='#ffca75';c.lineWidth=2;
   for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]])
    line(c,'#ffca75',2,[[x+dx*r,y+dy*(r-6)],[x+dx*r,y+dy*r],[x+dx*(r-6),y+dy*r]]);
   c.restore();
  }
  const marks=b.targets.concat(s.hazards.filter(h=>h.type==='rock'||h.type==='fist').map(h=>h.targetX??h.x));
  for(const x of marks){
   const w=b.phase==='fistWarn'?63:35;
   c.fillStyle='#f8ae4850';c.fillRect(x-w,ground-5,w*2,4);
   for(const sign of [-1,1])polygon(c,'#ffbf62',[[x+sign*w,ground-5],[x+sign*(w+7),ground-12],[x+sign*(w+7),ground-5]]);
  }
  for(const h of s.hazards){
   if(h.type==='rock'||h.type==='aimedRock'){
    const f=rock[4+Math.floor(h.age*9)%4],k=(h.type==='aimedRock'?34+25*Math.max(0,1-h.age/.22):54)/f[2];
    c.drawImage(images.giantEffects,...f,h.x-f[2]*k/2,h.y-f[3]*k/2,f[2]*k,f[3]*k);
   }else if(h.type==='wave'){
    root.ArcadeBossAttackSprites?.draw(c,'shock',h.age,h.x,ground,65,45,{ground:true});
   }else{
    const source=b.x-83,progress=clamp(h.age/.25,0,1),x=source+(h.x-source)*progress;
    line(c,'#ffba59',3,[[source,ground],[source+(x-source)*.32,ground-3],[source+(x-source)*.62,ground+3],[x,ground-2]]);
    root.ArcadeBossAttackSprites?.draw(c,'shock',h.age,x,ground,h.age<.25?40:116,h.age<.25?24:71,{ground:true});
   }
  }
 }
 root.ArcadeMallStageArt={background,balcony,stairwell,escalators,veil,giant,giantPose,rooftop,hazards,gait,guard};
})(window);
