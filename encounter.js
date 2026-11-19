(function(root){
  'use strict';
  const Arsenal=typeof module!=='undefined'&&module.exports?require('./arsenal.js'):root.ArcadeArsenal;
  const Enemies=typeof module!=='undefined'&&module.exports?require('./enemies.js'):root.ArcadeEnemies;
  const Final=typeof module!=='undefined'&&module.exports?require('./final-boss.js'):root.ArcadeFinalBoss;
  const Physics=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.ArcadePhysics;
  const Medkits=typeof module!=='undefined'&&module.exports?require('./medkits.js'):root.ArcadeMedkits;
  const Impact=typeof module!=='undefined'&&module.exports?require('./impact-effects.js'):root.ArcadeImpact;
  function createEncounter({pickups}={}){return{medkits:Medkits.create(),finalBoss:Final.create(),finalWon:false,enemies:Enemies.create(),inventory:Arsenal.createInventory(),pickups:pickups??Arsenal.createPickups(),boss:{x:550,y:235,hp:18,maxHp:18,t:0,shot:1.4,active:false},hp:5,maxHp:5,invincible:0,cooldown:0,flash:0,bullets:[],explosions:[],won:false,dead:false};}
  function chip(e,x,y,surface,power=1){
    e.debris??=[];const metal=surface.kind==='scaffold'||surface.kind==='ledge';
    for(let i=0;i<Math.min(14,4+power*2);i++){const angle=Math.random()*Math.PI*2,speed=25+Math.random()*65*power;e.debris.push({x,y,vx:Math.cos(angle)*speed,vy:-25-Math.abs(Math.sin(angle)*speed),size:metal?2+Math.random()*2:2+Math.random()*4,life:1.3+Math.random()*.7,bounces:0,color:metal?(i%2?'#ba9560':'#747c7c'):(i%2?'#aaa598':'#676963')});}
    if(e.debris.length>180)e.debris.splice(0,e.debris.length-180);
  }
  function updateDebris(e,dt,platforms){
    for(const blast of e.explosions)if(!blast.chipped){const floors=platforms.filter(pl=>blast.x>=pl.x&&blast.x<=pl.x+pl.w&&Physics.surfaceY(pl,blast.x)>=blast.y-6&&Physics.surfaceY(pl,blast.x)-blast.y<(blast.radius||80)*.8);if(floors.length)blast.floorY=Math.min(...floors.map(pl=>Physics.surfaceY(pl,blast.x)));}
    for(const blast of e.explosions)if(!blast.chipped){blast.chipped=true;for(const pl of platforms){const x=Math.max(pl.x,Math.min(pl.x+pl.w,blast.x)),floor=Physics.surfaceY(pl,x),y=Math.max(floor,Math.min(floor+(pl.thickness||12),blast.y));if(Math.hypot(x-blast.x,y-blast.y)<(blast.radius||80))chip(e,x,y,pl,2);}}
    e.debris=(e.debris||[]).filter(d=>{d.life-=dt;const oldY=d.y;d.vy+=430*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;for(const pl of platforms){const y=Physics.surfaceY(pl,d.x);if(d.vy>0&&oldY<=y&&d.y>=y&&d.x>=pl.x&&d.x<=pl.x+pl.w){d.y=y;d.vy=d.bounces++<2?-d.vy*.28:0;d.vx*=.5;break;}}return d.life>0;});
  }
  function drawEnvironment(ctx,e,p,platforms){
    ctx.save();
    if(p.grounded&&!p.jetpack&&!p.rescueGrip){const pl=p.ground||platforms.find(s=>Math.abs(Physics.surfaceY(s,p.x)-p.y)<2&&p.x>=s.x&&p.x<=s.x+s.w);if(pl){const y=Physics.surfaceY(pl,p.x);ctx.save();ctx.beginPath();ctx.rect(pl.x,y-4,pl.w,8);ctx.clip();ctx.fillStyle='#07101833';ctx.beginPath();ctx.ellipse(p.x,y+1,p.form==='wolf'?22:14,3.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#07101820';ctx.beginPath();ctx.ellipse(p.x,y,p.form==='wolf'?13:8,2,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
    for(const d of e.debris||[]){ctx.globalAlpha=Math.min(1,d.life*2);ctx.fillStyle=d.color;ctx.fillRect(Math.round(d.x),Math.round(d.y),Math.ceil(d.size),Math.max(2,Math.ceil(d.size*.6)));}
    ctx.restore();
  }
  function stepGrenade(g,dt,platforms){
    g.age=(g.age||0)+dt;
    // Small collision steps keep fast throws from crossing thin platform slabs.
    const count=Math.max(1,Math.ceil(dt/ (1/120))),h=dt/count,r=4;
    for(let i=0;i<count;i++){
      g.vy+=g.gravity*h;
      const oldX=g.x;g.x+=g.vx*h;
      for(const raw of platforms){const s=raw.terrain?{...raw,y:Physics.surfaceY(raw,g.x)}:raw;const bottom=s.y+(s.thickness||12);if(g.y+r<=s.y||g.y-r>=bottom)continue;
        if(g.vx>0&&oldX+r<=s.x&&g.x+r>=s.x){g.x=s.x-r;g.vx*=-.4;}
        else if(g.vx<0&&oldX-r>=s.x+s.w&&g.x-r<=s.x+s.w){g.x=s.x+s.w+r;g.vx*=-.4;}
      }
      const oldY=g.y;g.y+=g.vy*h;
      for(const raw of platforms){const s=raw.terrain?{...raw,y:Physics.surfaceY(raw,g.x)}:raw;if(g.x+r<=s.x||g.x-r>=s.x+s.w)continue;const bottom=s.y+(s.thickness||12);
        if(g.vy>=0&&oldY<=s.y&&g.y+r>=s.y){g.y=s.y-r;g.vy=g.vy>45?-g.vy*.35:0;g.vx*=.72;if(Math.abs(g.vx)<8)g.vx=0;}
        else if(g.vy<0&&oldY-r>=bottom&&g.y-r<=bottom){g.y=bottom+r;g.vy*=-.35;}
      }
    }
    g.life=Math.max(0,g.life-dt);if(g.life<1e-9)g.life=0;
  }
  function hurtPlayer(e,p,sourceX,projectile=false,amount=1){
    if(e.developerInvulnerable||e.invincible||e.dead||p.burrow||(projectile&&p.cloak>0))return false;
    if(projectile&&p.shield>0){p.shield--;p.shieldFlash=.2;return false;}
    amount*=(e.combatDamage||1)*(p.form==='zombie'?.5:1);
    e.damageTaken=(e.damageTaken||0)+amount;e.hp=Math.max(0,e.hp-amount);if(e.hp===0)e.dead=true;e.invincible=e.hitProtection||1.2;p.hurt=.32;p.hitDirection=p.x<sourceX?-1:1;p.vx=p.hitDirection*210;
    p.hitX=p.x;p.hitY=p.y-(p.form==='wolf'?35:25);p.claw=0;p.kick=0;
    return true;
  }
  function applyFallDamage(e,p){
    const damage=p.fallDamage||0;p.fallDamage=0;
    if(e.developerInvulnerable||damage<=0||p.form==='wolf'||p.form==='zombie'||e.dead||p.burrow)return false;
    e.hp=Math.max(0,e.hp-damage);e.damageTaken=(e.damageTaken||0)+damage;e.invincible=1.2;
    p.hurt=.32;p.hitDirection=0;p.vx=0;p.hitX=p.x;p.hitY=p.y-25;p.claw=0;p.kick=0;
    if(e.hp===0)e.dead=true;
    return true;
  }
  function segmentHit(x,y,dx,dy,box){
    if(box.terrain)return Physics.terrainHit(x,y,dx,dy,box,segmentHit);
    let enter=0,exit=1;
    for(const [start,delta,min,max] of [[x,dx,box.x-3,box.x+box.w+3],[y,dy,box.y-3,box.y+box.h+3]]){
      if(Math.abs(delta)<1e-9){if(start<min||start>max)return null;continue;}
      let a=(min-start)/delta,b=(max-start)/delta;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit)return null;
    }
    return enter;
  }
  function stepMissile(m,dt,platforms,boss,enemies=[],finalBoss=null){
    const dx=m.vx*dt,dy=m.vy*dt;let hit=null;
    const boxes=platforms.map(s=>({x:s.x,y:s.y,w:s.w,h:s.thickness||12}));
    boxes.push({x:-20,y:-10000,w:20,h:30000},{x:729,y:-10000,w:20,h:30000});
    if(boss.hp>0)boxes.push({x:boss.x-30,y:boss.y-75,w:60,h:75});
    if(finalBoss&&finalBoss.active&&finalBoss.hp>0)boxes.push(Final.box(finalBoss));
    for(const n of enemies)if(n.hp>0)boxes.push({x:n.x-14,y:n.y-46,w:28,h:46});
    for(const box of boxes){const t=segmentHit(m.x,m.y,dx,dy,box);if(t!==null&&(hit===null||t<hit))hit=t;}
    m.x+=dx*(hit===null?1:hit);m.y+=dy*(hit===null?1:hit);m.life=hit===null?m.life-dt:0;
    return hit!==null;
  }
  function transformWolf(e,p){if(e.dead)return;
    if(e.boss.hp<=0&&e.boss.deathAge===undefined){Object.assign(e.boss,{deathAge:0,death:3.2,phase:'dead',flash:0,ladder:null,traverse:null,descending:false,vy:0});}
p.transformFrom=p.form||'soldier';p.form='wolf';p.jetpack=false;p.transform=1.2;p.h=64;p.claw=0;e.maxHp=8+(p.healthBonus||0);e.hp=e.maxHp;e.invincible=1.5;e.bullets=[];e.boss.active=false;e.won=true;}
  function transformationFrame(p){const progress=Math.max(0,Math.min(7,Math.floor((1.2-p.transform)/1.2*8)));return p.form==='soldier'?7-progress:progress;}
  function hitForeman(b,damage){
    if(b.hp<=0||!(damage>0))return;
    b.hp=Math.max(0,b.hp-damage);
    b.hit=.18;
  }
  function resolveSoldierMelee(e,p){
    const action=e.weaponAction;
    if(!action?.melee||action.hitApplied||action.age<action.duration*.28)return false;
    action.hitApplied=true;
    if(p.form==='wolf'||p.form==='zombie'||p.transform>0||p.ladder||p.rope||e.inventory.selected!==action.slot)return false;
    const {range,damage}=action.melee;
    Enemies.melee(e.enemies,p,range,damage);Final.melee(e.finalBoss,p,range,damage);
    const b=e.boss;
    if(b.hp>0&&Math.abs(p.y-b.y)<55&&(b.x-p.x)*p.facing>0&&Math.abs(b.x-p.x)<range){
      hitForeman(b,damage);
      if(!b.hp){transformWolf(e,p);return true;}
    }
    return false;
  }
  function toggleForm(e,p,target){const Z=typeof module!=='undefined'&&module.exports?require('./zombie-form'):root.ArcadeZombieForm;return Z.change(e,p,target);}
  function whiteSupport(b,platforms){return platforms.find(s=>Math.abs(s.y-b.y)<.5&&b.x>=s.x&&b.x<=s.x+s.w);}
  function fallWhiteWolf(b,dt,platforms){
    b.phase='fall';b.grounded=false;b.flash=0;b.ladder=null;
    const oldY=b.y;b.vy=Math.min(600,(b.vy||0)+900*dt);b.y+=b.vy*dt;
    const landing=platforms.filter(s=>s.y>oldY+1e-7&&s.y<=b.y&&b.x>=s.x&&b.x<=s.x+s.w).sort((a,c)=>a.y-c.y)[0];
    if(landing){b.y=landing.y;b.vy=0;b.descending=false;b.grounded=true;b.phase='move';}
  }
  // Plan on actual support surfaces so returning upstairs works after a pursuit downstairs.
  function climbWhiteWolf(b,p,dt,platforms,encounter){
    if(b.traverse){
      const t=b.traverse;b.grounded=false;b.phase=t.ladder?'climb':'jump';b.flash=0;
      if(t.ladder){b.ladder=t.ladder;b.x=t.ladder.x;b.y=Math.max(t.to.y,b.y-115*dt);}
      else{t.age=Math.min(t.duration,t.age+dt);const u=t.age/t.duration;const endX=t.to.crane?t.to.x+t.endOffset:t.endX;b.x=t.x+(endX-t.x)*u;b.y=t.y+(t.to.y-t.y)*u-4*t.arc*u*(1-u);}
      if(t.ladder?b.y<=t.to.y:t.age>=t.duration){b.y=t.to.y;b.vy=0;b.grounded=true;b.ladder=null;b.traverse=null;b.phase='move';b.shot=Math.max(b.shot,.5);}
      return true;
    }
    if((p.y>=b.y-65&&!p.jetpack)||p.y>b.y+30||b.descending)return false;
    const from=whiteSupport(b,platforms);
    if(!from)return false;
    // A flying player may have no platform directly beneath them. Search the
    // reachable supports first, then approach the closest one to their position.
    const distanceTo=s=>{const dx=Math.max(s.x-p.x,0,p.x-(s.x+s.w)),dy=s.y-p.y;return Math.hypot(dx,dy)+(dy< -8?-dy*.5:0);};
    const ladders=Physics.availableLadders(Physics.createLadders(),encounter),queue=[{surface:from,route:[]}],seen=new Set([from]);let best=queue[0],bestDistance=distanceTo(from);
    while(queue.length){const current=queue.shift(),distance=distanceTo(current.surface);if(distance<bestDistance-.01){best=current;bestDistance=distance;}
      const a=current.surface;
      const edges=platforms.filter(c=>!seen.has(c)&&c!==a&&c.y<=a.y+3).map(c=>{
        const ladder=ladders.find(l=>Math.abs(l.top-c.y)<5&&Math.abs(l.bottom-a.y)<8&&l.x>=a.x&&l.x<=a.x+a.w&&l.x>=c.x&&l.x<=c.x+c.w);
        const gap=Math.max(0,c.x-(a.x+a.w),a.x-(c.x+c.w));
        return {to:c,ladder,gap};
      }).filter(edge=>edge.ladder||(a.y-edge.to.y<=190&&edge.gap<=155)).sort((a,c)=>Number(!!c.ladder)-Number(!!a.ladder));
      for(const edge of edges){seen.add(edge.to);queue.push({surface:edge.to,route:[...current.route,edge]});}
    }
    const route=best.route;
    if(!route.length)return false;
    const edge=route[0],clamp=(x,s)=>Math.max(s.x+12,Math.min(s.x+s.w-12,x));
    const endX=edge.ladder?edge.ladder.x:clamp(p.x,edge.to),startX=edge.ladder?edge.ladder.x:clamp(endX,from);
    const dx=startX-b.x;b.phase='move';b.flash=0;b.facing=dx<0?-1:1;
    if(Math.abs(dx)>2){b.x+=Math.sign(dx)*Math.min(Math.abs(dx),100*dt);return true;}
    b.traverse={...edge,x:b.x,y:b.y,endX,endOffset:endX-edge.to.x,age:0,duration:.95,arc:Math.max(85,(b.y-edge.to.y)*.65)};
    b.grounded=false;b.phase=edge.ladder?'climb':'jump';b.ladder=edge.ladder||null;return true;
  }
  function updateEncounter(e,p,input,dt,platforms=[]){
    if(e.dead)return;
    updateDebris(e,dt,platforms);
    if(e.boss.hp<=0&&e.boss.death>0){
      const b=e.boss;b.deathAge+=dt;b.death=Math.max(0,3.2-b.deathAge);
      const support=platforms.find(q=>Math.abs(q.y-b.y)<1&&b.x>=q.x&&b.x<=q.x+q.w);
      if(!support){const oldY=b.y;b.vy=(b.vy||0)+900*dt;b.y+=b.vy*dt;const ground=platforms.filter(q=>q.y>=oldY&&q.y<=b.y&&b.x>=q.x&&b.x<=q.x+q.w).sort((a,b)=>a.y-b.y)[0];if(ground){b.y=ground.y;b.vy=0;}}
    }

    applyFallDamage(e,p);if(e.dead)return;
    p.hurt=Math.max(0,(p.hurt||0)-dt);
    if(e.weaponAction)e.weaponAction.age+=dt;
    for(const effect of e.explosions)effect.life-=dt;
    e.explosions=e.explosions.filter(effect=>effect.life>0);
    p.transform=Math.max(0,(p.transform||0)-dt);p.claw=Math.max(0,(p.claw||0)-dt);p.kick=Math.max(0,(p.kick||0)-dt);
    const b=e.boss;b.hit=Math.max(0,(b.hit||0)-dt);Arsenal.tickRobot(e,dt);e.cooldown=Math.max(0,e.cooldown-dt);e.invincible=Math.max(0,e.invincible-dt);e.flash=Math.max(0,e.flash-dt);
    if(resolveSoldierMelee(e,p))return;
    Enemies.ram(e,p,input,dt,platforms,segmentHit);
    const bossHpBeforeCombo=b.hp;
    const Z=typeof module!=='undefined'&&module.exports?require('./zombie-form'):root.ArcadeZombieForm;Z.tick(p,dt);Z.combat(e,p,input,dt,platforms);
    Enemies.wolfCombat(e,p,input,dt,(range,damage)=>{
      Enemies.melee(e.enemies,p,range,damage);Final.melee(e.finalBoss,p,range,damage);
      if(b.hp>0&&Math.abs(b.x-p.x)<range&&Math.abs(b.y-p.y)<65&&(b.x-p.x)*p.facing>=0)hitForeman(b,damage);
    });
    if(!e.won&&bossHpBeforeCombo>0&&b.hp<=0){transformWolf(e,p);return;}
    if(p.form==='fighter'||p.form==='tank'){p.fighterKickInput=!!input.kick;if(input.kick)input={...input,fire:true};}
    if(input.fire&&p.form!=='wolf'&&p.form!=='zombie'&&e.cooldown===0&&!p.transform){
      const shot=p.form==='robot'?Arsenal.fireRobot(e,p):Arsenal.fire(e.inventory,p);if(shot){
        e.cooldown=shot.weapon.rate/(p.rateBonus||1);
        e.weaponAction={slot:e.inventory.selected,age:0,duration:e.cooldown};
        if(shot.weapon.range)e.weaponAction.melee={range:shot.weapon.range,damage:shot.weapon.damage*(p.damageBonus||1)};
        e.lastAim={...(p.aim||{x:p.facing,y:0})};e.flash=.14;e.bullets.push(...shot.bullets);
      }
    }
    const noises=e.explosions.filter(b=>b.life>.35).map(b=>({x:b.x,y:b.y,radius:600}));if(e.flash>0)noises.push({x:p.x,y:p.y,radius:e.inventory.selected<=2?100:430});
    Enemies.update(e.enemies,p,dt,platforms,e.bullets,segmentHit,noises);
    Final.update(e,p,dt*(e.finalBoss.hp>0&&e.finalBoss.sticky>0?.45:1),hurtPlayer,platforms);
    b.flash=Math.max(0,(b.flash||0)-dt);
    // Wake after a checkpoint too: nearby gunfire and damage do not require reaching the roof.
    if(!(p.cloak>0)&&!e.won&&b.hp>0&&(p.y<=320||b.hp<b.maxHp||noises.some(n=>Math.hypot(n.x-b.x,n.y-(b.y-35))<n.radius)))b.active=true;
    b.frozen=Math.max(0,(b.frozen||0)-dt);
    if(b.active&&!b.frozen&&!(p.cloak>0)){
      const bossDt=dt*(b.sticky>0?.45:1);
      b.t+=bossDt;b.shot-=bossDt;b.kickWait=Math.max(0,(b.kickWait||0)-bossDt);
      const dx=p.x-b.x,near=Math.abs(dx)<100&&Math.abs(p.y-b.y)<60;
      b.facing=dx<0?-1:1;
      b.grounded=!b.traverse&&!b.descending&&(!platforms.length||!!whiteSupport(b,platforms));
      if(!b.traverse&&!b.grounded)b.descending=true;
      if(b.descending){
        if(Math.abs(dx)>30)b.x=Math.max(20,Math.min(709,b.x+b.facing*70*bossDt));
        fallWhiteWolf(b,bossDt,platforms);
      }else if(climbWhiteWolf(b,p,bossDt,platforms,e)){
        // Hands and attention stay on the climb until the next support is reached.
      }else if(b.phase==='kick'){
        b.kickAge+=bossDt;
        if(!b.kickHit&&b.kickAge>.35&&b.kickAge<.58&&near){hurtPlayer(e,p,b.x);b.kickHit=true;}
        if(b.kickAge>.9){b.phase='move';b.kickWait=1.5;b.shot=Math.max(b.shot,.6);}
      }else if(near&&b.kickWait===0){b.phase='kick';b.kickAge=0;b.kickHit=false;b.flash=0;}
      else{
        b.phase='move';
        if(Math.abs(dx)>75){
          const support=whiteSupport(b,platforms),stayOnSupport=support&&(p.jetpack||p.y<b.y-65);
          const left=stayOnSupport?support.x+12:105,right=stayOnSupport?support.x+support.w-12:625;
          b.x=Math.max(left,Math.min(right,b.x+b.facing*85*bossDt));
        }
        if(p.y>b.y+85||(platforms.length&&!whiteSupport(b,platforms))){b.descending=true;fallWhiteWolf(b,bossDt,platforms);}
        if(b.grounded&&b.shot<=0&&!near){b.shot=2.1;const g=Final.whiteGun(b,p);b.flash=.16;b.gunAim=g;e.bullets.push({x:g.x,y:g.y,vx:g.facing*Math.cos(g.angle)*205,vy:Math.sin(g.angle)*205,life:Math.max(3,Math.hypot(p.x-g.x,p.y-25-g.y)/205+.15),enemy:true});}
      }
    }
    for(const bullet of e.bullets){
      if(bullet.life<=0)continue;
      if(bullet.slot===6&&!bullet.enemy){
        if(stepMissile(bullet,dt,platforms,b,e.enemies,e.finalBoss)){
          const radius=95;Enemies.area(e.enemies,bullet.x,bullet.y,radius,bullet.damage);Final.area(e.finalBoss,bullet.x,bullet.y,radius,bullet.damage);e.explosions.push(Impact.create(bullet.x,bullet.y,radius,bullet.slot===6?'rocket':'grenade'));
          const nx=Math.max(b.x-30,Math.min(b.x+30,bullet.x)),ny=Math.max(b.y-75,Math.min(b.y,bullet.y));
          if(b.hp>0&&Math.hypot(bullet.x-nx,bullet.y-ny)<=radius){hitForeman(b,bullet.damage);if(!b.hp){transformWolf(e,p);return;}}
        }
        continue;
      }
      if(bullet.slot===9&&!bullet.enemy){
        stepGrenade(bullet,dt,platforms);
        if(bullet.life===0){
          const selfDistance=Math.hypot(bullet.x-p.x,bullet.y-Math.max(p.y-(p.h||46),Math.min(p.y,bullet.y)));if(selfDistance<85)hurtPlayer(e,p,bullet.x,false,selfDistance<45?2:1);
          const radius=85;Enemies.area(e.enemies,bullet.x,bullet.y,radius,bullet.damage);Final.area(e.finalBoss,bullet.x,bullet.y,radius,bullet.damage);e.explosions.push(Impact.create(bullet.x,bullet.y,radius,bullet.slot===6?'rocket':'grenade'));
          const nearX=Math.max(b.x-30,Math.min(b.x+30,bullet.x)),nearY=Math.max(b.y-75,Math.min(b.y,bullet.y));
          if(b.hp>0&&Math.hypot(bullet.x-nearX,bullet.y-nearY)<=radius){hitForeman(b,bullet.damage);if(!b.hp){transformWolf(e,p);return;}}
        }
        continue;
      }
      const oldX=bullet.x,oldY=bullet.y;
      bullet.vy+=(bullet.gravity||0)*dt;bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;bullet.life-=dt;
      if(!bullet.enemy){let target=null,t=Infinity;for(const n of e.enemies){if(n.hp<=0)continue;const hit=segmentHit(oldX,oldY,bullet.x-oldX,bullet.y-oldY,{x:n.x-14,y:n.y-46,w:28,h:46});if(hit!==null&&hit<t){t=hit;target=n;}}if(target){Enemies.damage(target,bullet.damage||1);bullet.life=0;continue;}}
      if(!bullet.enemy&&e.finalBoss?.active&&segmentHit(oldX,oldY,bullet.x-oldX,bullet.y-oldY,Final.box(e.finalBoss))!==null){Final.damage(e.finalBoss,bullet.damage||1);bullet.life=0;continue;}
      let surface=null,surfaceT=Infinity;
      for(const pl of platforms){if(!Enemies.blocksShot(bullet,pl))continue;const t=segmentHit(oldX,oldY,bullet.x-oldX,bullet.y-oldY,{x:pl.x,y:pl.y,w:pl.w,h:pl.thickness||12,terrain:pl.terrain});if(t!==null&&t<surfaceT){surface=pl;surfaceT=t;}}
      if(surface){chip(e,oldX+(bullet.x-oldX)*surfaceT,oldY+(bullet.y-oldY)*surfaceT,surface);bullet.life=0;continue;}
      if(bullet.life>0&&b.hp>0&&!bullet.enemy&&segmentHit(oldX,oldY,bullet.x-oldX,bullet.y-oldY,{x:b.x-30,y:b.y-75,w:60,h:75})!==null){hitForeman(b,bullet.damage||1);b.active=b.hp>0;bullet.life=0;if(!b.hp){transformWolf(e,p);return;}}
      if(bullet.enemy&&!(p.cloak>0)&&Math.abs(bullet.x-p.x)<15&&bullet.y>p.y-(p.h||46)&&bullet.y<p.y){if(Arsenal.reflect(p,bullet))continue;if(e.invincible)continue;hurtPlayer(e,p,bullet.x-bullet.vx*.05,true);bullet.life=0;}
    }
    for(const n of e.enemies)if(Enemies.contact(n,p,platforms,segmentHit))hurtPlayer(e,p,n.x,n.kind==='knife');
    if(b.active&&!e.invincible&&Math.abs(p.x-b.x)<36&&Math.abs(p.y-b.y)<55){hurtPlayer(e,p,b.x);}
    e.bullets=e.bullets.filter(b=>b.life>0);if(e.hp<=0)e.dead=true;
  }
  const api={drawEnvironment,chip,updateDebris,createEncounter,updateEncounter,transformWolf,toggleForm,stepGrenade,transformationFrame,hurtPlayer,applyFallDamage,segmentHit,stepMissile};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeEncounter=api;
})(typeof window!=='undefined'?window:globalThis);
