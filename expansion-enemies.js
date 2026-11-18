(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 function update(n,p,dt,platforms,bullets){
  if(!['jetSoldier','warden'].includes(n.kind))return false;
  n.anim=(n.anim||0)+dt;n.hit=Math.max(0,(n.hit||0)-dt);n.flash=Math.max(0,(n.flash||0)-dt);
  if(n.hp<=0){n.death=Math.max(0,(n.death||0)-dt);if(n.kind==='jetSoldier'){n.vy=(n.vy||0)+420*dt;n.y=Math.min(620,n.y+n.vy*dt);}return true;}
  if(n.frozen>0){n.frozen=Math.max(0,n.frozen-dt);return true;}
  const dx=p.x-n.x,dy=p.y-n.y,near=Math.abs(dx)<640&&Math.abs(dy)<370;
  if(!near){n.shot=Math.max(n.shot||0,1.1);return true;}
  n.facing=dx<0?-1:1;n.aimDown=dy>80;n.shot=(n.shot||0)-dt;n.alert=true;
  if(n.kind==='jetSoldier'){
   n.homeY??=n.y;n.homeX??=n.x;
   n.y=n.homeY+Math.sin(n.anim*2.3)*22;
   n.x+=Math.max(-65,Math.min(65,dx-n.facing*285))*dt;
  }else{
   const P=common?require('./physics'):root.ArcadePhysics;
   n.guardAge=((n.guardAge||0)+dt)%4.5;n.bracing=n.guardAge>2.6;
   P.step(n,{left:!n.bracing&&dx< -220,right:!n.bracing&&dx>220},dt,platforms);
  }
  if(n.shot<=0&&!(n.hit>0)){
   const jet=n.kind==='jetSoldier',x=n.x+n.facing*(jet?19:28),y=n.y-(jet?21:34),a=Math.atan2(p.y-25-y,p.x-x);
   for(const spread of n.kind==='warden'?[-.16,0,.16]:[0])bullets.push({x,y,vx:Math.cos(a+spread)*265,vy:Math.sin(a+spread)*265,life:3,enemy:true,fromSoldier:true});
   n.flash=.17;n.shot=n.kind==='warden'?2.2:1.6;
  }return true;
 }
 // Tucked in flight, a trooper this tall has the same helmet as the standing 46 px soldiers.
 const JET_HEIGHT=38;
 const cache=new WeakMap();let styleSheet=null,styleFrames=null;
 function setStyleSheet(image){styleSheet=image;styleFrames=root.ArcadeAdvancedForms.atlas(image,4,4,{y:[0,.32,.565,.80,1],x:{0:[0,.25,.5,953/1246,1],3:[0,337/1246,632/1246,925/1246,1]}});}
 function styledSprite(c,index,x,y,height=50,flip=false,angle=0){
  if(!styleSheet)return false;const f=styleFrames[index],base=styleFrames[index<4?0:index<12?4:12],k=index>=12?83/base[2]:height/base[3];
  c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));c.scale(flip?-1:1,1);c.rotate(angle);c.drawImage(styleSheet,...f,-Math.round(f[2]*k/2),-Math.round(f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();return true;
 }
 function drawDiver(c,n,time){return styledSprite(c,12+Math.floor(time*7)%4,n.x,n.y,50,n.facing<0);}
 function frames(image){let f=cache.get(image);if(!f){f=root.ArcadeAdvancedForms.atlas(image,4,5);cache.set(image,f);}return f;}
 function sprite(c,image,index,x,y,height=58,flip=false,angle=0){if(!image)return;const fs=frames(image),f=fs[index],base=index<4?fs[0]:index<12?fs[4]:index<16?fs[12]:f,k=index>=12&&index<16?130/base[2]:height/base[3];c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));c.scale(flip?-1:1,1);c.rotate(angle);c.drawImage(image,...f,-Math.round(f[2]*k/2),-Math.round(f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();}
 function draw(c,n,image){if(!['jetSoldier','warden'].includes(n.kind)||!image&&!styleSheet)return false;const i=n.kind==='jetSoldier'?(n.hp<=0?3:n.flash>0?2:n.aimDown?1:0):n.hp<=0?(n.death>.4?10:11):n.hit>0?9:n.flash>0?7:n.bracing?8:Math.abs(n.vx)>5?4+Math.floor(n.anim*8)%2:6;c.save();if(n.hp<=0)c.globalAlpha=Math.min(1,n.death*2);if(!styledSprite(c,i,n.x,n.y,n.kind==='jetSoldier'?JET_HEIGHT:50,n.facing<0))sprite(c,image,i,n.x,n.y,58,n.facing<0);c.restore();return true;}
 const api={JET_HEIGHT,update,draw,sprite,frames,setStyleSheet,drawDiver,styledSprite};if(common)module.exports=api;else root.ArcadeExpansionEnemies=api;
})(typeof window!=='undefined'?window:globalThis);
