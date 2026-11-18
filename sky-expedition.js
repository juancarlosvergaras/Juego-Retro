(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports,L=common?require('./level-two'):root.ArcadeLevelTwo;
 // The dirigible rides the wind: a slow heave shared by the hull, its deck and
 // whoever stands on it. `deckY` is the single source for drawing and collision.
 function heave(time){return Math.sin(time*.55)*4+Math.sin(time*1.37)*1.2;}
 function deckY(time){return L.AIRSHIP.y+heave(time);}
 // Moves the landing platform and carries a grounded passenger with it.
 function update(platforms,p,time){
  const deck=platforms.find(s=>s.airship);if(!deck)return null;
  const y=deckY(time),riding=p&&p.grounded&&p.ground===deck;
  deck.y=y;if(riding){p.y=y;p.fallPeak=y;}
  return deck;
 }
 function collect(profile,p,inside=false){
  const a=L.AIRSHIP;if(inside||profile.jetpackMk2||p.burrow||p.transform>0||!p.grounded||!p.ground?.airship||Math.abs(p.x-a.rewardX)>38)return false;
  profile.jetpackMk2=true;p.jetpackMk2=true;return true;
 }
 function glow(c,x,y,r,color,alpha){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+color+','+alpha+')');g.addColorStop(1,'rgba('+color+',0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 function draw(c,images,profile,time,view){
  const a=L.AIRSHIP,s=a.w/a.sourceWidth,lift=heave(time),deck=a.y+lift,top=deck-a.sourceDeck*s;
  // The searchlight reaches the street, so the ship announces itself from below.
  const lampX=a.x+a.w*.56,sweep=Math.sin(time*.42)*150,groundY=L.WORLD.ground;
  if(lampX+260>view.left&&lampX-260<view.right&&view.bottom>deck){
   c.save();c.globalCompositeOperation='screen';const beam=c.createLinearGradient(lampX,deck+18,lampX+sweep,groundY);beam.addColorStop(0,'rgba(226,238,255,.34)');beam.addColorStop(.5,'rgba(226,238,255,.12)');beam.addColorStop(1,'rgba(226,238,255,.05)');c.fillStyle=beam;
   c.beginPath();c.moveTo(lampX-3,deck+18);c.lineTo(lampX+3,deck+18);c.lineTo(lampX+sweep+58,groundY);c.lineTo(lampX+sweep-58,groundY);c.closePath();c.fill();
   glow(c,lampX+sweep,groundY-2,70,'226,238,255',.2);c.restore();
  }
  if(a.x+a.w<view.left||a.x>view.right||deck+70<view.top||top>view.bottom)return;
  c.save();c.imageSmoothingEnabled=false;
  // Exhaust drifts back from both engines before the hull is drawn over it.
  for(const ex of [a.x+470*s,a.x+1500*s])for(let i=0;i<5;i++){const u=(time*.45+i/5)%1;c.globalAlpha=(1-u)*.3;c.fillStyle=i%2?'#c9cdc4':'#9aa39c';const r=3+u*9;c.beginPath();c.arc(ex-u*46,deck-12-u*16+Math.sin(time*2+i)*2,r,0,Math.PI*2);c.fill();}
  c.globalAlpha=1;
  // Mooring lines hang below the deck and sway with the heave.
  c.strokeStyle='#2a2f2c';c.lineWidth=1;
  for(const [rx,len] of [[a.x+760*s,46],[a.x+1040*s,62],[a.x+1340*s,40]]){const drift=Math.sin(time*.9+rx)*6+lift;c.beginPath();c.moveTo(rx,deck+10);c.quadraticCurveTo(rx+drift*.5,deck+10+len*.5,rx+drift,deck+10+len);c.stroke();c.fillStyle='#8a7a55';c.fillRect(Math.round(rx+drift)-1,Math.round(deck+10+len),3,4);}
  if(images.airship)c.drawImage(images.airship,Math.round(a.x),Math.round(top),a.w,images.airship.height*s);
  // Spinning propellers: a blurred disc with a blade that flickers through it.
  for(const x of [a.x+510*s,a.x+1540*s]){const cx=Math.round(x)+1,cy=Math.round(deck-10),phase=Math.floor(time*24)%3;
   c.fillStyle='rgba(190,198,180,.22)';c.beginPath();c.ellipse(cx,cy,3.5,12,0,0,Math.PI*2);c.fill();
   c.fillStyle=phase?'#c9d1b8':'#6d7c69';c.fillRect(cx-1,cy-(phase===1?11:phase===2?6:2),2,phase===1?22:phase===2?12:4);
   c.fillStyle='#3a4038';c.fillRect(cx-2,cy-2,4,4);}
  // Cabin windows and running lights.
  c.save();c.globalCompositeOperation='screen';
  glow(c,a.x+a.w*.56,deck-22,26,'255,214,140',.3+Math.sin(time*3.1)*.05);
  const blink=Math.floor(time*1.6)%2;glow(c,a.x+a.w-68,top+121,blink?13:6,'150,255,170',blink?.75:.3);glow(c,a.x+70,top+150,blink?6:13,'255,110,90',blink?.3:.75);
  glow(c,lampX,deck+16,14,'226,238,255',.8);
  c.restore();
  c.fillStyle=blink?'#baffb6':'#517f69';c.fillRect(Math.round(a.x+a.w-70),Math.round(top+120),3,3);
  c.fillStyle=blink?'#7a3a32':'#ff8f78';c.fillRect(Math.round(a.x+69),Math.round(top+149),3,3);
  if(!profile.jetpackMk2){
   const J=common?require('./jetpack-renderer'):root.ArcadeJetpackRenderer;J.drawPickup(c,a.rewardX,deck-17-Math.sin(time*3)*3);
   c.textAlign='center';c.fillStyle='#c9f9e5';c.font='bold 9px monospace';c.fillText('JETPACK MK II · ×2',a.rewardX,deck-62);
  }
  c.restore();
 }
 const api={collect,draw,update,heave,deckY};if(common)module.exports=api;else root.ArcadeSkyExpedition=api;
})(typeof window!=='undefined'?window:globalThis);
