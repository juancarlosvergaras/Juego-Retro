(function(root){
  'use strict';
  const radius=85, windup=.46;
  // Side-view soldiers use the same bouncing projectile and platform collisions as the player.
  function hand(n){
    const t=Math.min(1,(n.throwAge||0)/windup),angle=-2.05+2.2*t*t;
    const shoulder=n.kind==='jetSoldier'?22:Math.min(n.h||46,58)*.72,face=n.facing||1;
    return {x:n.x+face*(4+Math.cos(angle)*17),y:n.y-shoulder+Math.sin(angle)*17};
  }
  function soldier(n,p,dt,bullets,view){
    if(!n.grenadier)return false;
    const dx=p.x-n.x,dy=p.y-n.y;
    if(n.hp<=0||n.hit>0||n.frozen>0||n.ramHit||n.dropRoute||n.dropRecovery>0||p.burrow||p.cloak>0){
      n.throwAge=null;return false;
    }
    if(n.throwAge==null){
      n.grenadeWait=Math.max(0,(n.grenadeWait??1)-dt);
      if(n.grenadeWait||Math.abs(dx)<85||Math.abs(dx)>470||dy< -155||dy>260||
        (view&&(n.x<view.left+15||n.x>view.right-15))||bullets.some(b=>b.enemy&&b.slot===9&&b.life>0))return false;
      n.throwAge=0;n.throwX=p.x;n.throwY=p.y;n.facing=dx<0?-1:1;n.vx=0;n.flash=0;
    }
    n.throwAge+=dt;
    if(n.throwAge>=windup){
      const from=hand(n),t=.72+Math.abs(n.throwX-from.x)/900,gravity=500;
      bullets.push({...from,vx:(n.throwX-from.x)/t,vy:(n.throwY-4-from.y)/t-gravity*t/2,
        gravity,life:3,age:0,enemy:true,slot:9,blastRadius:radius,damage:2});
      n.throwAge=null;n.grenadeWait=5.4;n.shot=Math.max(.85,n.shot||0);
    }
    return true;
  }
  function drawHand(c,n){
    if(n.throwAge==null||n.hp<=0)return;
    const tip=hand(n),sy=n.y-(n.kind==='jetSoldier'?22:Math.min(n.h||46,58)*.72);
    c.save();c.lineWidth=6;c.strokeStyle='#424b35';c.beginPath();c.moveTo(n.x+4*n.facing,sy);c.lineTo(tip.x,tip.y);c.stroke();
    c.fillStyle='#c89864';c.fillRect(tip.x-3,tip.y-2,6,5);body(c,tip.x,tip.y-3,0);c.restore();
  }
  function body(c,x,y,angle,size=1){
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
    c.fillStyle='#20251b';c.fillRect(-4,-4,8,9);c.fillStyle='#a2aa62';c.fillRect(-3,-3,6,6);
    c.fillStyle='#e8d6a0';c.fillRect(-2,-6,4,3);c.fillStyle='#515934';c.fillRect(-2,0,5,2);c.restore();
  }
  function ring(c,x,y,rx,ry,time,slope=0){
    c.save();c.beginPath();c.ellipse(x,y,rx,ry,Math.atan(slope),0,Math.PI*2);
    c.fillStyle='rgba(240,46,44,.15)';c.fill();
    c.lineWidth=2;c.strokeStyle=Math.sin(time*18)>0?'#ff8a73':'#f04242';c.stroke();c.restore();
  }
  // In the driving and belt-scrolling stages x/y lie on the floor. Height is independent.
  function lob(x,y,height,tx,ty,r,{flight=.72,fuse=.85,rise=64,depth=1}={}){
    return {x,y,height,fromX:x,fromY:y,fromHeight:height,tx,ty,radius:r,flight,fuse,rise,depth,age:0};
  }
  function landed(x,y,r,depth,damage){
    return {...lob(x,y,0,x,y,r,{flight:0,fuse:.8,rise:0,depth}),friendlyDamage:damage||3};
  }
  function advance(g,dt){
    const before=g.age;g.age+=dt;
    const u=g.flight?Math.min(1,g.age/g.flight):1;
    g.x=g.fromX+(g.tx-g.fromX)*u;g.y=g.fromY+(g.ty-g.fromY)*u;
    g.height=g.fromHeight*(1-u)+4*g.rise*u*(1-u);
    return before<g.flight+g.fuse&&g.age>=g.flight+g.fuse;
  }
  function inside(g,x,y,height=0){
    return Math.hypot(x-g.tx,(y-g.ty)/g.depth,height)<=g.radius;
  }
  function draw(c,g,offsetX=0,sideView=false,slope=0){
    ring(c,g.tx-offsetX,g.ty,g.radius,sideView?10:g.radius*g.depth,g.age,slope);
    if(g.age<g.flight+g.fuse)body(c,g.x-offsetX,g.y-g.height-4,g.age<g.flight?g.age*9:0);
    else {c.save();c.globalAlpha=Math.max(0,1-(g.age-g.flight-g.fuse)/.28);c.fillStyle='#ffba59';
      c.beginPath();c.ellipse(g.tx-offsetX,g.ty,g.radius,g.radius*g.depth,0,0,Math.PI*2);c.fill();c.restore();}
  }
  const spent=g=>g.age>=g.flight+g.fuse+.28;
  const api={radius,soldier,drawHand,body,ring,lob,landed,advance,inside,draw,spent};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeGrenades=api;
})(typeof window!=='undefined'?window:globalThis);
