(function(root){
  'use strict';
  let sheet=null;
  function create(x,y,radius=85,kind='grenade'){return{x,y,radius,kind,life:1.05,duration:1.05};}
  function setSheet(image){sheet=image;}
  function draw(c,b){
    if(b.kind==='plasma'){
      const t=Math.max(0,Math.min(1,1-b.life/(b.duration||1.05)));c.save();c.translate(Math.round(b.x),Math.round(b.y));c.globalAlpha=1-t;
      c.fillStyle='#73ff6555';c.beginPath();c.arc(0,0,5+t*20,0,Math.PI*2);c.fill();
      for(let i=0;i<14;i++){const a=i*2.399,reach=(8+i%4*5)*Math.sin(t*Math.PI/2),x=Math.round(Math.cos(a)*reach),y=Math.round(Math.sin(a)*reach+t*t*24),s=i%3===0?4:2;c.fillStyle=i%3?'#65ec39':'#d5ff82';c.fillRect(x,y,s,s);}
      if(t<.2){c.fillStyle='#ecffd1';c.fillRect(-3,-8,6,16);c.fillRect(-8,-3,16,6);}c.restore();return;
    }
    const duration=b.duration||.55,t=Math.max(0,Math.min(1,1-b.life/duration)),size=(b.radius||85)*1.8;
    const frame=t<.05?0:t<.13?1:t<.24?2:t<.37?3:t<.52?4:t<.69?5:t<.86?6:7;
    c.save();c.translate(Math.round(b.x),Math.round(b.y));c.globalAlpha=t>.7?(1-t)/.3:1;
    const lift=Number.isFinite(b.floorY)?Math.min(0,b.floorY-b.y-size*.25):0;
    if(Number.isFinite(b.floorY)){c.beginPath();c.rect(-size*2,-size*3,size*4,b.floorY-b.y+size*3);c.clip();}
    if(sheet)c.drawImage(sheet,(frame%4)*384,Math.floor(frame/4)*512,384,512,-size/2,-size*280/384+lift,size,size*512/384);
    else{c.fillStyle=t<.2?'#fff0bc':'#dc6731';c.fillRect(-size*.16,-size*.16,size*.32,size*.32);}
    // Fast metal sparks travel away from the contact while the smoke lingers.
    if(t<.48){c.globalAlpha=1-t/.48;for(let i=0;i<11;i++){const a=i*2.399,reach=size*t*(.55+(i%3)*.18);c.fillStyle=i%3?'#edb15f':'#fff0b8';c.fillRect(Math.round(Math.cos(a)*reach),Math.round(Math.sin(a)*reach+t*t*55),i%2?3:2,2);}}
    c.restore();
  }
  function projectile(c,b){
    if(b.zombiePlasma){c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(Math.atan2(b.vy,b.vx));for(let i=4;i>0;i--){c.globalAlpha=(1-i/5)*.6;c.fillStyle='#61e82e';c.fillRect(-i*4,-2+(i%2)*2,5,4);}c.globalAlpha=1;c.shadowColor='#65ff31';c.shadowBlur=8;c.fillStyle='#226d28';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.fillStyle='#84f941';c.beginPath();c.arc(0,0,4.5,0,Math.PI*2);c.fill();c.fillStyle='#e4ff9c';c.beginPath();c.arc(1,-1,2.5,0,Math.PI*2);c.fill();c.shadowBlur=0;c.restore();return true;}
    if(b.fromTurret){c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(Math.atan2(b.vy,b.vx));c.fillStyle='#ff263a55';c.fillRect(-8,-3,15,6);c.fillStyle='#ff3344';c.fillRect(-6,-1.5,11,3);c.fillStyle='#ffd3d7';c.fillRect(3,-1,3,2);c.restore();return true;}
    if(b.slot!==6&&b.slot!==9&&!b.tankMissile)return false;
    const grenade=b.slot===9;c.save();c.translate(Math.round(b.x),Math.round(b.y));
    c.rotate(grenade?(b.age||0)*6:Math.atan2(b.vy,b.vx));
    const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    if(grenade){r(-4,-4,8,8,'#14221e');r(-3,-3,6,6,'#74844d');r(-2,-3,2,5,'#adb377');r(-4,0,8,1,'#344631');r(0,-4,1,8,'#344631');r(-2,-6,4,2,'#acafa1');r(1,-7,2,3,'#34403a');r(2,-7,2,2,Math.floor(b.life*(b.life<.8?18:6))%2?'#ff643e':'#ffe9a3');}
    else{const flicker=Math.floor((b.age||b.life)*43)%3;r(-20-flicker,-1,11+flicker,2,'#eb8144');r(-15-flicker,-1,7,2,'#fff1b8');r(-9,-3,15,6,'#152429');r(-7,-2,11,4,'#a1aaa0');r(-6,-2,8,1,'#e0dcc2');r(4,-2,4,4,'#9c674b');r(8,-1,2,2,'#edd19a');r(-9,-4,4,2,'#69786b');r(-9,2,4,2,'#69786b');}
    c.restore();return true;
  }
  function smoke(c,x,y,age,strength=1){if(!sheet)return;for(let i=0;i<3;i++){const t=(age*.45+i/3)%1,size=30+t*45;c.save();c.globalAlpha=(1-t)*.48*strength;c.drawImage(sheet,(1+Math.min(2,Math.floor(t*3)))*384,512,384,512,x-size/2+t*12,y-size*.8-t*28,size,size*4/3);c.restore();}}
  const api={create,setSheet,draw,projectile,smoke};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeImpact=api;
})(typeof window!=='undefined'?window:globalThis);
