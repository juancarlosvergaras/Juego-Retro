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
 function background(c,s,images){
  if(s.floor===3){
   const img=images.roof,k=W/img.width;
   c.drawImage(img,0,Math.round(edge-img.height*k*.82),W,img.height*k);
   return;
  }
  const img=[images.atrium,images.gallery,images.food][s.floor];
  const tile=850,scale=tile/img.width,base=[.816,.85,.84][s.floor];
  const y=Math.round(ground-img.height*base*scale-10);
  for(let x=-Math.round(s.camera.x*root.ArcadeMallShoppers.parallax)%tile-tile;x<W;x+=tile){
   c.drawImage(img,x,y,tile,Math.ceil(img.height*scale));
  }
  // Carry the terrazzo down to the near edge when a panorama ends above it.
  const bottom=Math.floor(y+img.height*scale);
  if(bottom<H)for(let x=-Math.round(s.camera.x*root.ArcadeMallShoppers.parallax)%tile-tile;x<W;x+=tile){
   c.drawImage(img,0,img.height-10,img.width,10,x,bottom,tile,H-bottom);
  }
  return {image:img,y};
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
 function stairs(c,s,front){
  const world=root.ArcadeMallWorld,st=world.escalator(s.floor);
  const {entry,lower,upper,exit,rise}=st,top=ground-rise;
  const rail=[[entry,ground],[lower,ground],[upper,top],[exit,top]];
  const offset=(dx,dy)=>rail.map(([x,y])=>[x+dx,y+dy]);
  if(front){
   // The near stringer hides the underside. Feet and treads remain visible.
   polygon(c,'#313d40',[...offset(0,5),...offset(0,15).reverse()]);
   line(c,'#a3aaa1',2,offset(0,5));
   for(let x=lower+20;x<upper;x+=45){const y=world.treadY(st,x);c.fillStyle='#7e8983';c.fillRect(x,y+9,2,2);}
   return;
  }
  c.fillStyle='#3b4546';c.fillRect(upper-6,top+9,exit-upper+13,ground-top-9);
  c.fillStyle='#243038';c.fillRect(upper+8,top+24,exit-upper-12,ground-top-24);
  for(let y=top+28;y<ground-7;y+=9){c.fillStyle='#4a5654';c.fillRect(upper+14,y,exit-upper-26,2);c.fillStyle='#18252b';c.fillRect(upper+14,y+2,exit-upper-26,1);}
  polygon(c,'#34454a',[...offset(-7,-19),...offset(0,4).reverse()]);
  polygon(c,'#658b91bb',[...offset(-7,-33),...offset(-7,-16).reverse()]);
  line(c,'#b2c7bb',1,offset(-7,-32));line(c,'#879a8a',2,offset(-7,-15));
  for(let x=lower+10;x<upper;x+=38){const y=world.treadY(st,x);line(c,'#b4d4ca70',2,[[x-7,y-29],[x-12,y-15]]);}
  line(c,'#212c32',6,offset(-7,-35));line(c,'#a6b5ac',2,offset(-7,-37));
  for(let x=entry+14;x<exit;x+=48){
   const y=world.treadY(st,x);line(c,'#98a8a0',2,[[x-7,y-34],[x-7,y-15]]);
  }
  const pitch=st.pitch,phase=(s.time*st.speed)%pitch;
  for(let x=lower+phase-120;x<exit;x+=pitch){
   if(x<entry)continue;
   const y=Math.round(world.treadY(st,x)),ix=Math.round(x);
   c.fillStyle='#253035';c.fillRect(ix-pitch/2,y,pitch,14);
   c.fillStyle='#919a91';c.fillRect(ix-pitch/2,y-1,pitch,2);
   c.fillStyle='#d8ae53';c.fillRect(ix-pitch/2,y-1,2,2);
   for(let j=2-pitch/2;j<pitch/2;j+=3){c.fillStyle='#617174';c.fillRect(ix+j,y+2,1,7);}
  }
  c.fillStyle='#233336';c.fillRect(entry-12,ground-3,35,5);c.fillRect(exit-6,top-3,30,5);
  c.fillStyle='#daaf53';c.fillRect(entry-12,ground-3,35,2);c.fillRect(exit-6,top-3,30,2);
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
 root.ArcadeMallStageArt={background,balcony,stairs,giant,giantPose,rooftop,hazards,gait,guard};
})(window);
