(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,L=common?require('./level-two'):root.ArcadeLevelTwo;
 function collect(profile,p,inside=false){
  const a=L.AIRSHIP;if(inside||profile.jetpackMk2||p.burrow||p.transform>0||!p.grounded||!p.ground?.airship||Math.abs(p.x-a.rewardX)>38||Math.abs(p.y-a.y)>3)return false;
  profile.jetpackMk2=true;p.jetpackMk2=true;return true;
 }
 function draw(c,images,profile,time,view){
  const a=L.AIRSHIP,s=a.w/a.sourceWidth,top=a.y-a.sourceDeck*s;
  if(a.x+a.w<view.left||a.x>view.right||a.y+45<view.top||top>view.bottom)return;
  c.save();c.imageSmoothingEnabled=false;
  if(images.airship)c.drawImage(images.airship,Math.round(a.x),Math.round(top),a.w,images.airship.height*s);
  // Propeller shimmer and navigation lamps animate without moving the landing plane.
  for(const x of [a.x+510*s,a.x+1540*s]){c.fillStyle=Math.floor(time*8)%2?'#b0ba9b':'#667965';c.fillRect(Math.round(x),Math.round(a.y-19),2,19);}
  c.fillStyle=Math.floor(time*2)%2?'#baffb6':'#517f69';c.fillRect(Math.round(a.x+a.w-70),Math.round(top+120),3,3);
  if(!profile.jetpackMk2){
   const J=common?require('./jetpack-renderer'):root.ArcadeJetpackRenderer;J.drawPickup(c,a.rewardX,a.y-17-Math.sin(time*3)*3);
   c.textAlign='center';c.fillStyle='#c9f9e5';c.font='bold 9px monospace';c.fillText('JETPACK MK II · ×2',a.rewardX,a.y-62);
  }
  c.restore();
 }
 const api={collect,draw};if(common)module.exports=api;else root.ArcadeSkyExpedition=api;
})(typeof window!=='undefined'?window:globalThis);
