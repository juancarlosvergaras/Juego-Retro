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
  let arcadeTile=null;
  if(floor===0){
   const opening=root.ArcadeMallInterior.arcadeFront;
   const variant=strip(tile,front.canvas.height),vertical=(threshold-top)/(sill-layout.cornice);
   variant.drawImage(front.canvas,0,0);
   variant.drawImage(images.arcadeFront,opening.x*scale,(opening.y-layout.cornice)*vertical,
    opening.width*scale,opening.height*vertical);
   arcadeTile=variant.canvas;
  }
  return built[floor]={image,layout,front:front.canvas,back:back.canvas,arcadeTile,rideNiche:images.rideNiche};
 }
 function repeat(c,img,scroll,y,mirror=false,arcadeTile=null){
  const offset=Math.round(scroll),first=Math.floor(offset/img.width);
  for(let i=first,x=i*img.width-offset;x<W;i++,x+=img.width){
   if(mirror&&i%2){
    c.save();c.translate(x+img.width,y);c.scale(-1,1);c.drawImage(img,0,0);c.restore();
   }else c.drawImage(arcadeTile&&i===root.ArcadeMallInterior.arcadeFront.bay?arcadeTile:img,x,y);
  }
 }
 function interiorBackdrop(c,art,x,dy,scene){
  c.save();const scale=1+Math.max(0,dy)/art.layout.top;
  c.translate(W/2,0);c.scale(scale,scale);c.translate(-W/2,0);
  c.translate(0,Math.min(0,dy));
  const scroll=x*root.ArcadeMallInterior.distantParallax;
  repeat(c,art.back,scroll,0,true);
  if(scene){
   const center=Math.round(scene.x)-Math.round(scroll),deck=Math.round(art.layout.top*art.layout.deck);
   if(center>=-32&&center<=W+32){
    root.ArcadeSceneryAnimation?.paint(c,'bolso',root.ArcadeMallInterior.purseFrame(scene.age),center,deck,60,.96);
    // The thin brass handrail passes in front of both characters, including the fallen guard.
    c.save();c.beginPath();c.rect(center-31,Math.round(art.layout.top*art.layout.rail),62,2);c.clip();
    repeat(c,art.back,scroll,0,true);c.restore();
   }
  }
  c.restore();
 }
 // Paint each pose into a small patch of the actual window and terrazzo. The
 // plinth shares one registration across poses; only the sprung horse rocks.
 function rideFrames(art,img){
  const l=art.layout,ride=l.ride,sw=img.naturalWidth/8,sh=img.naturalHeight;
  const w=ride.width,h=Math.round(w*sh/sw),width=Math.round(ride.span*l.scale);
  const left=Math.round(ride.left*l.scale),top=Math.round((ride.top-l.cornice)*l.scale);
  const sill=l.threshold-l.top-top,foot=sill-2,height=sill+9,horseX=Math.round((width-w)/2);
  const g=strip(width*8,height);
  for(let i=0;i<8;i++){
   g.save();g.translate(i*width,0);
   g.drawImage(art.front,left,top,width,height,0,0,width,height);
   g.drawImage(art.rideNiche,0,0,width,sill);
   // The lacquered stone reflects the lower colours briefly below the base.
   for(let y=0;y<8;y++){
    g.globalAlpha=.2*(1-y/8);
    g.drawImage(img,i*sw,sh-2-y*5,sw,4,horseX,foot+y,w,1);
   }
   g.globalAlpha=1;g.save();g.translate(width/2,foot-1);g.scale(w*.43,2.1);
   const shade=g.createRadialGradient(0,0,0,0,0,1);shade.addColorStop(0,'#282020c4');shade.addColorStop(1,'#28202000');
   g.fillStyle=shade;g.fillRect(-1,-1,2,2);g.restore();
   const body=Math.round(h*.78),split=Math.round(sh*.78);
   g.drawImage(img,i*sw,0,sw,split,horseX,foot-h,w,body);
   g.drawImage(img,0,split,sw,sh-split,horseX,foot-h+body,w,h-body);g.restore();
  }
  return {image:g.canvas,left,top,width,height};
 }
 function shops(c,art,x,dy,time){
  const l=art.layout,scroll=Math.round(x*root.ArcadeMallInterior.parallax);
  repeat(c,art.front,scroll,l.top+dy,false,art.arcadeTile);
  if(!l.ride)return;
  const bayX=l.ride.bay*l.tile-scroll;
  if(bayX+l.tile<0||bayX>W)return;
  if(!art.ride){
   const img=root.ArcadeSceneryAnimation?.sheet('horse');if(!img)return;
   art.ride=rideFrames(art,img);
  }
  const r=art.ride,frame=Math.floor(time*7)%8;
  c.drawImage(r.image,frame*r.width,0,r.width,r.height,bayX+r.left,l.top+dy+r.top,r.width,r.height);
 }
 // Describe the same physical landing from either of the two local coordinate systems.
 function junction(s){
  const w=root.ArcadeMallWorld;
  let lower;
  if(s.floor<2&&s.camera.x+W>w.escalator(s.floor).entry-45)lower=s.floor;
  else if((s.floor===1||s.floor===2)&&s.camera.x<360)lower=s.floor-1;
  else return null;
  const st=w.escalator(lower),offset=st.exit-w.landingX,above=s.floor!==lower;
  const x=s.camera.x+(above?offset:0),lift=(above?st.rise:0)-s.camera.y;
  return {lower,st,x,lift,upperX:x-offset,upperY:lift-st.rise};
 }
 function background(c,s,images,j,focusX){
  if(s.floor===3){
   const img=images.roof,k=W/img.width;
   c.drawImage(img,-Math.round(s.camera.x),Math.round(edge-img.height*k*.82),W,img.height*k);return;
  }
  if(s.intro>=4&&!s.stairs?.active&&root.ArcadeSceneryAnimation?.sheet('bolso')){
   root.ArcadeMallInterior.visitPurse(s,focusX,interiorArt(images,s.floor).back.width);
  }
  const lower=j?j.lower:s.floor,art=interiorArt(images,lower),x=j?j.x:s.camera.x,dy=j?Math.round(j.lift):0;
  interiorBackdrop(c,art,x,dy,s.purseScenes?.[lower]);shops(c,art,x,dy,s.time);
  if(!j)return art;
  const upper=interiorArt(images,j.lower+1),upperY=Math.round(j.upperY);
  // Each vault belongs to its own bay. The painted iron pier hides their joint.
  c.save();c.beginPath();c.rect(23-Math.round(j.upperX),0,W+Math.max(0,j.upperX),H);c.clip();
  interiorBackdrop(c,upper,j.upperX,upperY,s.purseScenes?.[lower+1]);c.restore();
  gallery(c,images,upper,j.upperX,upperY,s.time);
  return s.floor===j.lower?art:upper;
 }
 function balcony(c,pl,atlas,floor){
  // Each cell has its walking surface at row 59. Only the fluted shafts
  // between the capitals and plinths change length on the higher balconies.
  const cell=420,sx=cell*floor,k=pl.w/cell;
  const top=pl.y-Math.round(59*k),shaft=top+Math.round(140*k),base=ground-Math.round(44*k);
  c.drawImage(atlas,sx,0,cell,140,pl.x,top,pl.w,shaft-top);
  c.drawImage(atlas,sx,140,cell,84,pl.x,shaft,pl.w,base-shaft);
  c.drawImage(atlas,sx,224,cell,44,pl.x,base,pl.w,ground-base);
 }
 // Registration in the cropped 768 × 368 painting: comb plates, tread run and nosing.
 // A translated strip of the painted treads moves between the fixed end plates.
 const pitchSource=25.4;
 function stairs(c,s,image,st){
  const k=st.rise/256,top=ground-st.rise-82*k,h=image.height*k;
  // Register each flat plate and the slope to the same surfaces used by physics.
  for(const [a,b,left,right] of [[0,91,st.entry,st.lower],[91,626,st.lower,st.upper],[626,768,st.upper,st.exit]]){
   c.drawImage(image,a,0,b-a,image.height,left,top,right-left,h);
  }
  const scaleX=(st.upper-st.lower)/535,pitch=pitchSource*scaleX;
  const phase=(((s.belt||0)%pitch)+pitch)%pitch/pitch;
  const dx=pitchSource*Math.floor(phase*12)/12;
  c.save();c.translate(st.lower,ground);c.scale(scaleX,k);c.translate(-91,-338);
  c.beginPath();c.moveTo(124,316);c.lineTo(619,78);c.lineTo(619,122);
  c.lineTo(145,352);c.lineTo(124,352);c.closePath();c.clip();
  c.drawImage(image,dx,-dx*256/535);c.restore();
 }
 const slab=[[23,ground-18],[61,ground+6],[158,ground+6],[190,ground+10],[218,ground+20],
  [289,H-4],[310,H+8],[334,H+15]];
 function gallery(c,images,upper,cam,dy,time){
  const x=Math.round(cam),right=x+W+2,top=upper.layout.top;
  c.save();c.translate(-x,dy);
  const stone=images.gallery,k=stone.width/root.ArcadeMallInterior.referenceWidth;
  function detail(sx,sy,sw,sh,px,py,w,h){c.drawImage(stone,sx*k,sy*k,sw*k,sh*k,px,py,w,h);}
  // Arcade piers continue below the slab into the shopping hall seen through the well.
  for(const px of [84,242]){
   const y=px<200?ground+15:ground+48,foot=ground+146;
   detail(386,158,30,24,px-3,y,20,12);
   detail(388,180,22,132,px,y+11,14,foot-y-14);
   detail(386,309,26,18,px-2,foot-7,18,7);
  }
  // Behind the balustrade the real upper-floor shops and their terrazzo continue right.
  const rim=[...slab,[Math.max(right,335),H+15]];
  polygon(c,'#55423b',[...rim,...rim.map(([px,py])=>[px,py+11]).reverse()]);
  c.save();c.beginPath();c.moveTo(23,top);c.lineTo(Math.max(right,335),top);
  for(let i=rim.length-1;i>=0;i--)c.lineTo(...rim[i]);c.closePath();c.clip();
  c.translate(x,0);shops(c,upper,cam,0,time);c.restore();
  for(const [color,w,d] of [['#413435',2,10],['#9b7a60',2,7],['#7f6452',2,4],['#c1a382',1,1]]){
   line(c,color,w,rim.map(([px,py])=>[px,py+d]));
  }
  // One continuous structural column separates the two clerestories in perspective.
  const iron=images.atrium,ik=iron.width/root.ArcadeMallInterior.referenceWidth;
  c.drawImage(iron,4*ik,5*ik,15*ik,126*ik,18,-Math.abs(dy)-4,13,top+Math.abs(dy)+5);
  detail(387,160,27,24,16,top-3,21,13);
  detail(388,182,22,130,19,top+10,14,upper.layout.threshold-top-10);
  detail(386,308,27,20,17,upper.layout.threshold-8,18,8);
  c.restore();
 }
 // The near balustrade borders the open well and leaves the exit plate clear.
 function landingRail(c,j){
  if(!j)return;
  c.save();c.translate(-Math.round(j.upperX),Math.round(j.upperY));
  const posts=slab.slice(2),rail=posts.map(([x,y])=>[x,y-22]);
  for(const [x,y] of posts){
   c.fillStyle='#302c29';c.fillRect(x-2,y-23,4,24);
   c.fillStyle='#977955';c.fillRect(x-1,y-22,1,21);
   c.fillStyle='#59483a';c.fillRect(x-4,y-2,7,3);
  }
  line(c,'#504338',2,posts.map(([x,y])=>[x,y-8]));
  line(c,'#382e28',4,rail);line(c,'#b99a65',1,rail.map(([x,y])=>[x,y-1]));
  c.restore();
 }
 function escalators(c,s,images,j){
  const world=root.ArcadeMallWorld;
  if(j){
   const above=s.floor>j.lower;c.save();
   if(above)c.translate(world.landingX-j.st.exit,j.st.rise);
   stairs(c,s,images.escalator,j.st);c.restore();
  }
  if(s.floor===2&&s.camera.x+W>world.escalator(2).entry-45){
   const st=world.escalator(2),top=ground-st.rise;
   c.drawImage(images.roofDeck,st.upper+10,top-4,960,76);
   stairs(c,s,images.escalator,st);
  }else if(s.floor===3){
   const st=world.escalator(2);
   c.save();c.translate(world.landingX-st.exit,st.rise);stairs(c,s,images.escalator,st);c.restore();
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
 root.ArcadeMallStageArt={background,interiorArt,balcony,junction,escalators,landingRail,veil,giant,giantPose,rooftop,hazards,gait,guard};
})(window);
