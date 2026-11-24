(function(root){
  'use strict';
  const ARENA={x:24,y:-140,w:681,ladderX:160,bottom:235};
  function create(){return{x:545,y:ARENA.y,hp:32,maxHp:32,stage:1,active:false,phase:'guard',age:0,cycle:0,facing:-1,hit:0,death:0,landed:false,t:0,missileWait:3.2,missiles:[],recoil:0};}
  function airborne(b){return ['leap','track','lock','slam'].includes(b.phase);}
  function box(b){return b.stage===2?{x:b.x-46,y:b.y-146,w:92,h:146}:{x:b.x-34,y:b.y-104,w:68,h:104};}
  function mutate(b){const port=cannon(b);b.discarded={x:port.x,y:port.y,vx:-b.facing*150,vy:-180,angle:0,life:3};b.stage=2;b.hp=Math.round(64*(b.healthScale||1));b.maxHp=b.hp;b.phase='mutate';b.age=0;b.active=true;b.engaged=true;b.missiles=[];b.frozen=0;b.leapWait=2;}
  function damage(b,amount){if(!b||!b.active||b.hp<=0||!(amount>0)||b.phase==='mutate'||airborne(b))return;b.hp=Math.max(0,b.hp-amount);b.hit=.16;if(!b.hp){if(b.stage!==2)mutate(b);else{b.phase='dead';b.age=0;b.death=2.4;b.active=false;b.marker=null;b.missiles=[];}}}
  function groundTarget(p,platforms){const x=Math.max(25,Math.min(704,p.x)),support=platforms.filter(s=>s.y>=p.y-2&&x>=s.x&&x<=s.x+s.w).sort((a,b)=>a.y-b.y)[0];return{x,y:support?.y??Math.max(ARENA.y,p.y)};}
  function zombie(e,p,dt,hurt,platforms){const b=e.finalBoss;
    if(b.phase==='mutate'){if(b.age>=2.4){b.phase='chase';b.age=0;}return;}
    if(b.frozen>0){b.frozen=Math.max(0,b.frozen-dt);b.age-=dt;return;}
    if(b.phase==='crouch'){if(b.age>=.55){b.phase='leap';b.age=0;b.launchY=b.y;}return;}
    if(b.phase==='leap'){b.y=b.launchY-1200*b.age;if(b.age>=.6){b.phase='track';b.age=0;b.y=Math.min(ARENA.y-900,p.y-900);b.marker=groundTarget(p,platforms);}return;}
    if(b.phase==='track'){b.marker=groundTarget(p,platforms);if(b.age>=1.1){b.phase='lock';b.age=0;}return;}
    if(b.phase==='lock'){if(b.age>=.75){b.phase='slam';b.age=0;b.x=b.marker.x;b.slamStart=Math.min(b.marker.y-650,b.y);b.slamHit=false;}return;}
    if(b.phase==='slam'){const t=Math.min(1,b.age/.45);const previousY=b.y;b.y=b.slamStart+(b.marker.y-b.slamStart)*t*t;
      if(!b.slamHit&&Math.abs(p.x-b.x)<52&&b.y>=p.y-(p.h||46)&&previousY<=p.y){hurt(e,p,b.x,false,2);b.slamHit=true;}
      if(t===1){b.y=b.marker.y;b.marker=null;b.phase='impact';b.age=0;e.explosions.push({x:b.x,y:b.y-3,radius:100,life:.65});if(!b.slamHit&&Math.abs(p.x-b.x)<100&&p.y>b.y-105&&p.y<b.y+25)hurt(e,p,b.x,false,2);}return;}
    if(b.phase==='impact'){if(b.age>=1.1){b.phase='chase';b.age=0;b.leapWait=4.5;}return;}
    b.leapWait-=dt;
    if(b.phase==='chase'&&b.leapWait<=0){b.phase='crouch';b.age=0;return;}
    const dx=p.x-b.x;b.facing=dx<0?-1:1;
    if(b.phase==='chase'){if(Math.abs(dx)>95){const support=platforms.find(s=>Math.abs(s.y-b.y)<2&&b.x>=s.x&&b.x<=s.x+s.w);b.x=Math.max(support?support.x+35:110,Math.min(support?support.x+support.w-35:620,b.x+b.facing*110*dt));}else if(Math.abs(p.y-b.y)<100){b.phase='zWindup';b.age=0;b.landed=false;}}
    else if(b.phase==='zWindup'&&b.age>=.5){b.phase='zClaw';b.age=0;}
    else if(b.phase==='zClaw'){if(!b.landed&&b.age>=.12&&b.age<.4&&dx*b.facing>=-15&&Math.abs(dx)<145&&Math.abs(p.y-b.y)<105){hurt(e,p,b.x);b.landed=true;}if(b.age>=.5){b.phase='zRecover';b.age=0;}}
    else if(b.phase==='zRecover'&&b.age>=.6){b.phase='chase';b.age=0;}
  }
  function melee(b,p,range,amount){if(b&&Math.abs(b.y-p.y)<70&&Math.abs(b.x-p.x)<range+20&&(b.x-p.x)*p.facing>=-10)damage(b,amount);}
  function area(b,x,y,r,amount){if(!b)return;const q=box(b);if(Math.hypot(x-Math.max(q.x,Math.min(q.x+q.w,x)),y-Math.max(q.y,Math.min(q.y+q.h,y)))<=r)damage(b,amount);}
  function update(e,p,dt,hurt,platforms=[]){
    const b=e.finalBoss;if(!b)return;
    b.hit=Math.max(0,b.hit-dt);if(p.cloak>0&&b.hp>0)return;
    b.t+=dt;b.age+=dt;
    if(b.discarded){const d=b.discarded;d.life-=dt;d.vy+=500*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.angle+=dt*5;if(d.life<=0)b.discarded=null;}
    if(b.hp<=0){if(b.stage!==2){mutate(b);return;}b.missiles=[];
      // A defeated boss must still land if its supporting platform moved away.
      const support=platforms.find(s=>Math.abs(s.y-b.y)<1&&b.x>=s.x&&b.x<=s.x+s.w);
      if(support){b.y=support.y;b.deathVy=0;}
      else if(platforms.length){const oldY=b.y;b.deathVy=Math.min(600,(b.deathVy||0)+900*dt);b.y+=b.deathVy*dt;
        const landing=platforms.filter(s=>s.y>=oldY&&s.y<=b.y&&b.x>=s.x&&b.x<=s.x+s.w).sort((a,c)=>a.y-c.y)[0];
        if(landing){b.y=landing.y;b.deathVy=0;}
      }
      b.death=Math.max(0,b.death-dt);e.finalWon=true;return;}
    if(b.stage===2){zombie(e,p,dt,hurt,platforms);return;}
    if(!e.won||!b.engaged&&!b.active&&p.y>ARENA.y+20){b.active=false;b.phase='guard';b.age=0;b.missiles=[];return;}
    b.engaged=true;
    if(!b.active){b.active=true;b.phase='chase';b.age=0;}
    b.recoil=Math.max(0,b.recoil-dt);b.missileWait-=dt;
    for(const m of b.missiles){
      m.t+=dt;
      const pos=missilePosition(m);if(m.t>.7&&!m.hit&&Math.abs(pos.x-p.x)<22&&pos.y>p.y-(p.h||46)&&pos.y<p.y+8){m.hit=true;hurt(e,p,pos.x);e.explosions.push({x:pos.x,y:pos.y,radius:48,life:.55});}
      if(m.t>=2.1&&!m.hit){m.hit=true;e.explosions.push({x:m.targetX,y:(m.targetY??ARENA.y)-4,radius:48,life:.55});if(Math.abs(p.x-m.targetX)<48&&p.y>(m.targetY??ARENA.y)-65&&p.y<(m.targetY??ARENA.y)+25)hurt(e,p,m.targetX);}
    }
    b.missiles=b.missiles.filter(m=>!m.hit);
    if(b.frozen>0){b.frozen=Math.max(0,b.frozen-dt);b.age=Math.max(0,b.age-dt);return;}
    if(b.phase==='chase'&&b.missileWait<=0){b.phase='charge';b.age=0;}
    if(b.phase==='charge'){
      if(b.age>=.8){const port=cannon(b),first=Math.max(20,Math.min(709,p.x)),second=first>364?first-140:first+140;
        for(const [i,targetX] of [first,second,first>364?Math.max(20,first-280):Math.min(709,first+280)].entries()){const support=platforms.filter(s=>s.y>=p.y-2&&targetX>=s.x&&targetX<=s.x+s.w).sort((a,b)=>a.y-b.y)[0];b.missiles.push({x:port.x+(i-1)*10,y:port.y,targetX,targetY:i===0&&p.y<(support?.y??ARENA.y)-80?p.y-(p.h||46)/2:support?.y??Math.max(ARENA.y,p.y),t:0,hit:false});}
        b.recoil=.22;b.phase='launch';b.age=0;b.missileWait=5.2;}

      return;
    }
    if(b.phase==='launch'){if(b.age>.5){b.phase='recover';b.age=0;}return;}
    const dx=p.x-b.x;
    if(b.phase==='chase'){
      b.facing=dx<0?-1:1;
      if(Math.abs(dx)>82)b.x=Math.max(ARENA.x+35,Math.min(ARENA.x+ARENA.w-35,b.x+b.facing*95*dt));
      else if(Math.abs(p.y-b.y)<65){b.phase='windup';b.age=0;b.kind=b.cycle++%2?'kick':'claw';b.landed=false;}
    }else if(b.phase==='windup'&&b.age>=.48){b.phase='attack';b.age=0;}
    else if(b.phase==='attack'){
      const reach=b.kind==='kick'?112:95;
      if(!b.landed&&b.age>=.07&&b.age<.23&&dx*b.facing>=-12&&Math.abs(dx)<reach&&p.y>b.y-55&&p.y<b.y+25){hurt(e,p,b.x);b.landed=true;}
      if(b.age>=.28){b.phase='recover';b.age=0;}
    }else if(b.phase==='recover'&&b.age>=.72){b.phase='chase';b.age=0;}
  }
  function deathPose(b){
    // Ground contact excludes the transparent/glow padding below the artwork.
    if(b.age<.45)return{row:0,frame:3,groundInset:0};
    if(b.age<.95)return{row:3,frame:0,groundInset:8};
    if(b.age<1.35)return{row:3,frame:2,groundInset:9};
    return{row:3,frame:3,groundInset:8};
  }
  function pose(b){if(b.hp<=0)return{row:3,frame:Math.min(3,Math.floor(b.age/.23))};if(b.phase==='charge')return{row:3,frame:1};if(b.phase==='launch')return{row:3,frame:0};if(['windup','attack','recover'].includes(b.phase))return{row:b.kind==='kick'?2:1,frame:b.phase==='windup'?0:b.phase==='recover'?3:b.age<.14?1:2};if(b.hit>0)return{row:3,frame:0};return{row:0,frame:b.phase==='chase'?1+Math.floor(b.t*8)%3:0};}
  function cannon(b){const kick=['windup','attack','recover'].includes(b.phase)&&b.kind==='kick',crouch=b.phase==='charge';return{x:b.x-b.facing*(kick?27:23),y:b.y-(crouch?83:kick?112:116)+(b.recoil>0?4:0)};}
  function missilePosition(m){if(m.t<.7)return{x:m.x,y:m.y-m.t/.7*160};const t=Math.min(1,(m.t-.7)/1.4);return{x:m.x+(m.targetX-m.x)*t,y:m.y-160+((m.targetY??ARENA.y)-(m.y-160))*t*t};}
  function whiteGun(b,p){
    const facing=p.x<b.x?-1:1;
    // Grip stays at the forward fist, below the muzzle and clear of the face.
    const hand={x:b.x+facing*25,y:b.y-32};
    const airAim=p.y<b.y-65;
    const dx=(p.x-hand.x)*facing;
    const requested=Math.atan2(p.y-25-hand.y,airAim?dx:Math.max(1,dx));
    const angle=Math.max(airAim?-Math.PI*.62:-.55,Math.min(.55,requested));
    return{facing,hand,angle,x:hand.x+facing*Math.cos(angle)*31,y:hand.y+Math.sin(angle)*31};
  }
  const api={deathPose,airborne,ARENA,create,box,damage,melee,area,update,pose,whiteGun,cannon,missilePosition};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeFinalBoss=api;
})(typeof window!=='undefined'?window:globalThis);
