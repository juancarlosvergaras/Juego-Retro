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
  if(dy>0){
   // The next span of glazing continues above the painting as the camera rises.
   c.save();c.translate(0,dy);c.scale(1,-1);c.beginPath();c.rect(0,0,W,dy);c.clip();
   repeat(c,art.back,x*.72,0,true);c.restore();
  }
  repeat(c,art.back,x*.72,dy,true);
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
  const pitch=st.pitch,phase=(s.time*st.speed)%pitch;
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
 function landingBackdrop(c,s,images,v){
  const {from,st,upperCamera,lowerCamera,lift,progress}=v,next=from+1;
  const upperY=lift-st.rise,cam=Math.round(upperCamera),right=cam+W;
  const below=background(c,{floor:from,camera:{x:lowerCamera}},images,lift);
  if(!v.incoming){
   c.save();c.translate(0,lift);
   root.ArcadeMallShoppers.draw(c,s,images.shoppers,below);c.restore();
  }
  const upstairs=next===3?null:interiorArt(images,next);
  const left=lip[0][0],back=left+36,ceiling=upstairs?upstairs.layout.top:ground-134;
  if(right<left)return;
  // The expansion joint separates two opaque bays of glass. Each has its own
  // view and vanishing lines, even when the camera is halfway between floors.
  c.save();c.beginPath();c.rect(back-cam,0,W,upstairs?ceiling+upperY:edge+upperY+1);c.clip();
  if(upstairs){
   repeat(c,upstairs.back,upperCamera*.72,upperY,true);
  }else{
   background(c,{floor:3,camera:{x:cam}},images,upperY);
   if(v.incoming){c.translate(-cam,upperY);giant(c,s,images.giant);}
  }
  c.restore();
  c.save();c.translate(-cam,upperY);
  // Stone piers and soffit beneath the occupied wing are sampled at shop scale.
  const stone=images.gallery,k=stone.width/root.ArcadeMallInterior.referenceWidth;
  function stoneRect(sx,sy,sw,sh,x,y,w,h){
   c.drawImage(stone,sx*k,sy*k,sw*k,sh*k,x,y,w,h);
  }
  for(let x=52;x<right+45;x+=164){
   if(x<cam-50)continue;
   const head=lipY(x)+10;
   c.fillStyle='#25202d63';c.fillRect(x+8,Math.round(head),27,st.rise+ground-head);
   stoneRect(389,182,23,147,x,Math.round(head),20,st.rise+ground-head-1);
   stoneRect(387,164,26,21,x-4,Math.round(head),28,12);
   stoneRect(389,310,23,20,x-3,ground+st.rise-8,26,8);
  }
  const outer=[...lip,[Math.max(290,right+1),H]];
  polygon(c,'#392d32',[...outer,...outer.map(([x,y])=>[x,y+16]).reverse()]);
  for(const [color,w,dy] of [['#796254',4,12],['#b09a77',2,7],['#504344',3,4],['#e1c9a0',2,1]]){
   line(c,color,w,outer.map(([x,y])=>[x,y+dy]));
  }
  stoneRect(233,161,123,18,17,ground+11,146,11);
  const title=['GALERÍAS','RESTAURANTES','AZOTEA'][from];
  c.font='bold 8px monospace';c.textAlign='left';
  const plaqueX=82,plaqueY=ground+11,plaqueW=Math.ceil(c.measureText(title).width)+19;
  c.fillStyle='#937959';c.fillRect(plaqueX-1,plaqueY-1,plaqueW+2,12);
  c.fillStyle='#253336';c.fillRect(plaqueX,plaqueY,plaqueW,10);
  c.fillStyle='#e4d2a5';c.fillText(title+' ›',plaqueX+4,plaqueY+8);
  c.save();c.beginPath();
  c.moveTo(back,ceiling);c.lineTo(right+1,ceiling);c.lineTo(right+1,H);
  for(const [x,y] of lip.slice().reverse())c.lineTo(x,y);
  c.lineTo(back,ground-27);c.closePath();c.clip();
  c.translate(cam,0);
  if(upstairs){
   repeat(c,upstairs.front,upperCamera*root.ArcadeMallInterior.parallax,ceiling);
  }else{
   c.save();c.translate(-cam,0);
   rooftop(c,images.roofDeck,s.time);c.restore();
  }
  c.restore();
  // A rear corner pilaster and cornice frame the shops; the route in front is open.
  if(right>=back){
   const beamTop=-upperY,beamBase=upstairs?ceiling:edge;
   c.fillStyle='#332f33';c.fillRect(back-7,beamTop,15,beamBase-beamTop);
   for(let y=beamBase;y>beamTop;y-=57)stoneRect(157,72,14,57,back-6,y-57,13,57);
   for(let y=beamBase-27;y>beamTop;y-=57)stoneRect(154,63,18,7,back-8,y,17,5);
   if(upstairs){
    stoneRect(389,182,23,147,back-5,ceiling+4,13,upstairs.layout.threshold-ceiling-4);
    stoneRect(386,159,30,29,back-8,ceiling-1,19,11);
    stoneRect(388,310,25,18,back-7,upstairs.layout.threshold-8,17,8);
    if(progress<1){
     c.save();c.globalAlpha=1-progress;
     for(let x=Math.max(0,Math.floor((cam-back)/120))*120+back-4;x<right;x+=120)stoneRect(231,160,125,17,x,ceiling-4,120,9);
     c.restore();
    }
   }else{
    c.fillStyle='#394b4f';c.fillRect(back-4,edge+1,9,24);
    c.fillStyle='#a99980';c.fillRect(back-6,edge,13,3);
   }
  }
  // A low rail follows the outer balcony edge, well in front of the walking lane.
  if(upperY<0){
   c.globalAlpha=clamp(-upperY/18,0,1);
   const start=294,railY=H-16;
   for(let x=start;x<right;x+=56){
    c.fillStyle='#443635';c.fillRect(x,railY,3,16);
    c.fillStyle='#a28a66';c.fillRect(x,railY+1,1,14);
    c.fillStyle='#5e4d41';c.fillRect(x+12,railY+5,1,10);c.fillRect(x+42,railY+5,1,10);
    line(c,'#78634e',1,[[x+18,railY+9],[x+28,railY+4],[x+37,railY+9],[x+28,railY+14],[x+18,railY+9]]);
   }
   if(right>start){
    c.fillStyle='#504039';c.fillRect(start-1,railY,right-start+1,3);
    c.fillStyle='#c3a579';c.fillRect(start-1,railY,right-start+1,1);
   }
  }
  c.restore();
  if(v.incoming&&upstairs){
   c.save();c.translate(0,upperY);root.ArcadeMallShoppers.draw(c,s,images.shoppers,upstairs);c.restore();
  }
 }
 function landingStairs(c,s,v,front){
  c.save();
  if(v.incoming)c.translate(-v.origin,v.st.rise);
  stairs(c,s,front,v.st);c.restore();
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
  if(s.boss.hit>0)c.filter='brightness(1.22)';
  c.drawImage(img,cw*pose.frame,ch*pose.row,cw,ch,Math.round(s.boss.x-width/2),Math.round(baseline-height),width,height);
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
  const marks=b.targets.concat(s.hazards.filter(h=>h.type==='rock'||h.type==='fist').map(h=>h.targetX??h.x));
  for(const x of marks){
   const w=b.phase==='fistWarn'?63:35;
   c.fillStyle='#f8ae4850';c.fillRect(x-w,ground-5,w*2,4);
   for(const sign of [-1,1])polygon(c,'#ffbf62',[[x+sign*w,ground-5],[x+sign*(w+7),ground-12],[x+sign*(w+7),ground-5]]);
  }
  for(const h of s.hazards){
   if(h.type==='rock'){
    const f=rock[4+Math.floor(h.age*9)%4],k=54/f[2];
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
 root.ArcadeMallStageArt={background,balcony,landingBackdrop,landingStairs,giant,giantPose,rooftop,hazards,gait,guard};
})(window);
