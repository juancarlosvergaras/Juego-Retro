(function(root){
  'use strict';
  const P=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.ArcadePhysics;
  const Z=typeof module!=='undefined'&&module.exports?require('./cemetery-zombies.js'):root.ArcadeCemeteryZombies;
  const Bat=typeof module!=='undefined'&&module.exports?require('./cemetery-bat.js'):root.ArcadeCemeteryBat;
  const TURRET={range:660,verticalRange:520,pivotX:15.64,pivotY:-28.22,barrel:27.88,speed:245,life:3.2};
  function blocksShot(b,s){if(b.zombiePlasma)return s.kind==='ground';return !b.fromTurret||s.solid||s.kind==='ground'||(!s.kind&&(s.thickness||12)>24);}
  function turretAim(n,p){const x=n.x+n.facing*TURRET.pivotX,y=n.y+TURRET.pivotY,dx=p.x-x,dy=p.y-25-y,d=Math.hypot(dx,dy)||1;return{x:x+dx/d*TURRET.barrel,y:y+dy/d*TURRET.barrel,dx:dx/d,dy:dy/d,angle:Math.atan2(dy,dx*n.facing)};}
  function create(){
    const platforms=P.createPlatforms(),spawns=[];
    for(const floor of [2,5,8,11,14,17]){
      const deck=platforms.filter(s=>s.kind==='deck'&&s.floor===floor).sort((a,b)=>b.x-a.x)[0];
      spawns.push({x:Math.round(deck.x+deck.w*.55),y:deck.y,floor});
    }
    for(const floor of [4,10,16]){
      const deck=platforms.filter(s=>s.kind==='deck'&&s.floor===floor).sort((a,b)=>a.x-b.x)[0];
      spawns.push({x:Math.round(deck.x+deck.w*.4),y:deck.y,floor,facing:1});
    }
    return spawns.map(createSoldier);
  }
  function createSoldier(spawn,id){return Object.assign(P.createPlayer(),{facing:-1,kind:'rifle'},spawn,{id,memory:0,lastKnown:null,hp:3,maxHp:3,shot:1.4+id*.2,jumpWait:0,flash:0,hit:0,death:0,alert:false,attackAge:null,strikePending:false,burst:0,runCycle:0});}
  function contact(n,p,platforms,segmentHit){
    if(n.hp<=0||n.ramHit)return false;
    if(n.kind==='mallGiant'||n.kind==='alienBoss'||n.kind==='cityBoss')return false;
    if(n.kind==='mecha')return n.active&&(Math.abs(n.x-p.x)<64&&Math.abs(n.y-p.y)<145||n.waves.some(w=>Math.abs(w.x-p.x)<23&&p.y>n.y-24&&p.y<=n.y+8));
    if(n.kind==='bat')return Bat.contact(n,p);
    if(n.kind==='zombie')return n.phase==='active'&&Math.abs(n.x-p.x)<24&&Math.abs(n.y-p.y)<38&&!platforms.some(s=>segmentHit(n.x,n.y-25,p.x-n.x,p.y-n.y,{x:s.x,y:s.y,w:s.w,h:s.thickness||12,terrain:s.terrain})!==null);
    if(n.kind!=='knife')return Math.abs(n.x-p.x)<25&&Math.abs(n.y-p.y)<42;
    if(!n.strikePending)return false;n.strikePending=false;
    return Math.abs(p.x-n.x)<60&&Math.abs(p.y-n.y)<38&&(p.x-n.x)*n.facing>=-8&&!platforms.some(s=>segmentHit(n.x,n.y-25,p.x-n.x,p.y-n.y,{x:s.x,y:s.y,w:s.w,h:s.thickness||12,terrain:s.terrain})!==null);
  }
  function damage(n,amount){if(n.kind==='cityBoss'&&n.invulnerable)return;if((n.kind==='mallGiant'||n.kind==='alienBoss'||n.kind==='cityBoss')&&!n.active)return;if(n.kind==='mecha'&&!n.active)return;if(n.kind==='king'){const K=typeof module!=='undefined'&&module.exports?require('./mausoleum-king'):root.ArcadeMausoleumKing;return K.damage(n,amount);}if(n.hp<=0||n.kind==='zombie'&&!Z.targetable(n))return;n.hp=n.kind==='bat'&&amount>0?0:Math.max(0,n.hp-amount);n.hit=.18;if(!n.hp){n.death=n.kind==='stormZombie'?1.5:n.kind==='bat'?1.6:n.kind==='zombie'?1.3:.8;n.vx=0;}}
  function area(list,x,y,r,amount){for(const n of list){const half=(n.w||28)/2,nx=Math.max(n.x-half,Math.min(n.x+half,x)),ny=Math.max(n.y-(n.h||46),Math.min(n.y,y));if(Math.hypot(x-nx,y-ny)<=r)damage(n,amount);}}
  function melee(list,p,range,amount){for(const n of list)if(n.hp>0&&Math.abs(n.y-p.y)<55&&Math.abs(n.x-p.x)<range&&(n.x-p.x)*p.facing>=-10)damage(n,amount);}
  function wolfCombat(e,p,input,dt,strike){
    const fire=!!input.fire,kick=!!input.kick;
    const pressed=kick&&!p.wolfKickHeld?'kick':fire&&!p.wolfFireHeld?'claw':null;
    p.wolfFireHeld=fire;p.wolfKickHeld=kick;
    if(p.form==='wolf'&&pressed==='kick'&&!p.grounded&&!p.hookHeld&&!p.rope?.surface&&!(p.hurt>0)&&!(p.transform>0)&&e.cooldown<=0){p.rope=null;p.ladder=null;}
    if(p.form!=='wolf'){p.wolfFireHeld=false;p.wolfKickHeld=false;}
    if(p.form!=='wolf'||p.ram||(p.sprinting&&(p.ramCooldown>0||p.ramBuffer>0))||p.rope||p.ladder||p.transform>0||p.hurt>0||e.dead){p.wolfAttack=null;p.wolfQueued=null;p.wolfChain=null;p.claw=0;p.kick=0;return;}
    let a=p.wolfAttack;
    if(a){
      a.age+=dt;p.facing=a.facing;
      // Damage occurs at extension, once per strike, not at the key press.
      if(!a.hit&&a.age>=a.duration*.38){a.hit=true;strike(a.range,a.damage*(p.damageBonus||1),a);}
      if(pressed&&a.stage<3)p.wolfQueued=pressed;
      if(a.age>=a.duration||p.wolfQueued&&a.age>=a.duration*.76){
        p.wolfChain=a.stage<3?{stage:a.stage,remaining:.28}:null;
        p.wolfAttack=null;p.claw=0;p.kick=0;e.cooldown=a.stage===3?.2:0;a=null;
      }
    }else if(p.wolfChain){p.wolfChain.remaining-=dt;if(p.wolfChain.remaining<=0)p.wolfChain=null;}
    if(!a&&e.cooldown<=0){
      const next=p.wolfQueued||pressed||(fire?'claw':null);
      if(next){
        const deliberate=!!(p.wolfQueued||pressed),stage=deliberate&&p.wolfChain?p.wolfChain.stage+1:1;
        const duration=next==='kick'?[.44,.48,.54][stage-1]:[.32,.36,.46][stage-1];
        a=p.wolfAttack={kind:next,stage,age:0,duration,hit:false,facing:p.facing,range:next==='kick'?85+(stage-1)*5:65+(stage-1)*8,damage:(next==='kick'?3:2)+stage-1};
        p.wolfQueued=null;p.wolfChain=null;p.slide=0;e.cooldown=duration;
        p.kickAir=next==='kick'&&!p.grounded;p.kickFacing=p.facing;p.kickDuration=duration;
        if(p.kickAir){p.vx=p.facing*330;p.vy=Math.min(p.vy,40);}
      }
    }
    if(a){p[a.kind==='kick'?'kick':'claw']=Math.max(.001,a.duration-a.age);p[a.kind==='kick'?'claw':'kick']=0;}
  }
  function ram(e,p,input,dt,platforms,segmentHit){
    p.ramCooldown=Math.max(0,(p.ramCooldown||0)-dt);p.ramBuffer=Math.max(0,(p.ramBuffer||0)-dt);
    const pressed=(input.fire&&!p.ramLatch)||(input.kick&&!p.ramKickLatch);p.ramLatch=!!input.fire;p.ramKickLatch=!!input.kick;
    if(p.form!=='wolf'||p.rope||p.ladder||p.transform>0||p.hurt>0||e.dead){p.ram=null;p.ramBuffer=0;return;}
    if(pressed&&p.sprinting&&p.grounded)p.ramBuffer=.18;
    if(!p.sprinting||!p.grounded)p.ramBuffer=0;
    if(!p.ram&&p.ramBuffer>0&&p.sprinting&&p.grounded&&Math.abs(p.vx)>170&&p.ramCooldown<=0){
      p.ramBuffer=0;p.ram={remaining:.36,dir:p.facing,lastX:p.x,hits:new Set()};p.wolfAttack=null;p.wolfQueued=null;p.wolfChain=null;p.ramCooldown=.75;p.claw=0;p.kick=0;p.slide=0;p.vx=p.facing*520;e.cooldown=.36;p.ramSound=(p.ramSound||0)+1;
    }
    const r=p.ram;if(!r)return;
    const left=Math.min(r.lastX,p.x)-22,right=Math.max(r.lastX,p.x)+22;
    for(const n of e.enemies){
      if(n.hp<=0||!['rifle','turret','knife','alien','alienElite','warden','jetSoldier','zombie','stormZombie'].includes(n.kind)||r.hits.has(n)||Math.abs(n.y-p.y)>44||(n.x-r.lastX)*r.dir< -18||n.x<left-14||n.x>right+14)continue;
      if(platforms.some(s=>segmentHit(p.x,p.y-24,n.x-p.x,n.y-p.y,{x:s.x,y:s.y,w:s.w,h:s.thickness||12,terrain:s.terrain})!==null))continue;
      const hp=n.hp;damage(n,3*(p.damageBonus||1));if(n.hp===hp)continue;
      r.hits.add(n);if(n.kind==='stormZombie'||n.kind==='mecha'||n.kind==='mallGiant'||n.kind==='cityBoss')continue;n.ramHit={age:0,dir:r.dir};n.vy=-150;n.grounded=false;n.ground=null;n.attackAge=null;n.strikePending=false;n.burst=0;n.shot=Math.max(1,n.shot||0);n.death=n.hp<=0?1.1:n.death;
    }
    for(const n of e.enemies)if((n.kind==='mallGiant'||n.kind==='alienBoss'||n.kind==='cityBoss')&&n.active&&n.hp>0&&!r.hits.has(n)&&p.y>n.y-n.h&&p.y-(p.h||46)<n.y&&n.x+n.w/2>=left&&n.x-n.w/2<=right){damage(n,3*(p.damageBonus||1));r.hits.add(n);}
    const king=e.king;if(king&&!r.hits.has(king)&&king.hp>0&&p.y>king.y-king.h&&p.y-(p.h||46)<king.y&&king.x+king.w/2>=left&&king.x-king.w/2<=right){if(damage(king,3*(p.damageBonus||1)))r.hits.add(king);}
    r.lastX=p.x;r.remaining-=dt;if(r.remaining<=0||r.blocked||!p.grounded)p.ram=null;
  }
  function jumpRoute(n,goal,platforms,dir,edge){
    const candidates=platforms.filter(s=>s.w>=32&&s.y>=n.y-75&&s.y<=n.y+12&&(goal.y<n.y-40?s.y<n.y-20:edge&&Math.abs(s.y-n.y)<13&&(s.x+s.w/2-n.x)*dir>0));
    for(const s of candidates.sort((a,b)=>Math.abs(a.x+a.w/2-goal.x)-Math.abs(b.x+b.w/2-goal.x))){
      const x=Math.max(s.x+16,Math.min(s.x+s.w-16,n.x+dir*55));
      if(Math.abs(x-n.x)>100)continue;
      const probe={...n,ground:null,rope:null,ladder:null,jumps:0,buffer:0};
      for(let i=0;i<120;i++){
        P.step(probe,{left:probe.x>x+4,right:probe.x<x-4,jumpPressed:i===0},1/120,platforms);
        if(i>2&&probe.grounded){if(probe.ground===s)return{x,platform:s};break;}
      }
    }
    return null;
  }
  function update(list,p,elapsed,platforms,bullets,segmentHit,noises=[],view){
    for(const n of list){
      const dt=elapsed*(n.sticky>0?.45:1);
      if(n.kind==='mallGiant'||n.kind==='alienBoss'||n.kind==='cityBoss')continue;
      if(['alien','alienElite','alienPilot'].includes(n.kind)&&(typeof module!=='undefined'&&module.exports?require('./space-world'):root.ArcadeSpaceWorld).enemyUpdate(n,p,dt,bullets))continue;
      if((typeof module!=='undefined'&&module.exports?require('./expansion-enemies'):root.ArcadeExpansionEnemies)?.update(n,p,dt,platforms,bullets))continue;
        if(n.kind==='mecha'){if(n.frozen>0&&n.hp>0){n.frozen=Math.max(0,n.frozen-dt);continue;}(typeof module!=='undefined'&&module.exports?require('./air-mecha'):root.ArcadeAirMecha).update(n,p,dt,bullets,view);continue;}
      n.strikePending=false;
      n.hit=Math.max(0,n.hit-dt);n.flash=Math.max(0,n.flash-dt);
      if(n.ramHit){
        const hit=n.ramHit;hit.age+=dt;n.hurt=hit.age<.3?.2:0;n.hitDirection=hit.dir;
        P.step(n,{},dt,platforms);n.hurt=0;
        if(n.hp<=0){n.death=n.grounded?Math.max(0,n.death-dt):Math.max(.65,n.death-dt);if(n.death<=0)n.ramHit=null;}
        else if(hit.age>.55&&n.grounded){n.ramHit=null;n.shot=Math.max(n.shot,1);}
        continue;
      }
      if(['cityAssault','cityGrenadier'].includes(n.kind)&&(typeof module!=='undefined'&&module.exports?require('./new-york-world'):root.ArcadeNewYorkWorld).enemyUpdate(n,p,dt,bullets,platforms))continue;
      if(n.kind==='stormZombie'&&!(n.frozen>0)){(typeof module!=='undefined'&&module.exports?require('./storm-zombie'):root.ArcadeStormZombie).update(n,p,dt,bullets,view);continue;}
      if(n.kind==='bat'&&n.hp<=0){Bat.update(n,p,dt);continue;}
      if(n.hp<=0){n.death=Math.max(0,n.death-dt);continue;}
      if(n.frozen>0){n.frozen=Math.max(0,n.frozen-dt);if(n.kind!=='bat')n.vx=0;continue;}
      if(n.kind==='bat'){Bat.update(n,p,dt);continue;}
      if(n.kind==='zombie'){Z.update(n,p,dt,platforms,bullets);continue;}
      const dx=p.x-n.x,dy=p.y-n.y,distance=Math.hypot(dx,dy);
      const turret=n.kind==='turret',obstructed=platforms.some(s=>(!turret||blocksShot({fromTurret:true},s))&&segmentHit(n.x,n.y-34,dx,p.y-25-(n.y-34),{x:s.x,y:s.y,w:s.w,h:s.thickness||12,terrain:s.terrain})!==null);
      const seen=distance<(turret?TURRET.range:480)&&Math.abs(dy)<(turret?TURRET.verticalRange:160)&&dx*n.facing>=-18&&!obstructed;
      const footRadius=p.grounded&&Math.abs(p.vx)>170?220:p.grounded&&Math.abs(p.vx)>80?90:p.landing>0?160:0;
      // The running engine is audible even while hovering. This local sense is
      // for soldiers only; it must not wake bosses through the encounter noises.
      const jetRadius=p.jetpack&&p.fuel>0&&p.form!=='wolf'?280:0;
      const hearingRadius=Math.max(footRadius,jetRadius);
      let heard=hearingRadius>0&&distance<hearingRadius;
      let heardAt=heard?{x:p.x,y:p.y}:null;
      for(const sound of noises)if(Math.hypot(n.x-sound.x,n.y-sound.y)<sound.radius){heard=true;heardAt=sound;break;}
      const wasAlert=!!n.alert||(n.memory||0)>0;
      n.memory=Math.max(0,(n.memory||0)-dt);
      if(seen||heard||n.hit>0){n.memory=5;n.lastKnown=seen||n.hit>0?{x:p.x,y:p.y}:{x:heardAt.x,y:heardAt.y};}
      n.alert=n.memory>0;n.awareness=seen?'sight':heard?'sound':n.alert?'search':'idle';
      // A fresh alert always grants one full second to react, including after
      // a long idle period. Sustained sound must not restart this countdown.
      n.shot=n.alert&&!wasAlert?1:Math.max(0,n.shot-dt);n.jumpWait=Math.max(0,n.jumpWait-dt);
      if(n.kind==='turret'){
        P.step(n,{},dt,platforms);n.vx=0;
        if(n.alert&&Math.abs(dx)>2)n.facing=Math.sign(dx);
        n.turretAim=turretAim(n,n.alert?p:{x:n.x+n.facing*400,y:n.y-3.22});
        if(!seen||n.hit>0){n.burst=0;n.shot=Math.max(n.shot,.35);continue;}
        if(n.shot<=0){const aim=n.turretAim;
          if(!platforms.some(s=>blocksShot({fromTurret:true},s)&&segmentHit(n.x,n.y-29,aim.x-n.x,aim.y-(n.y-29),{x:s.x,y:s.y,w:s.w,h:s.thickness||12,terrain:s.terrain})!==null)){
            n.flash=.09;n.burst++;n.shot=n.burst<5?.14:2.1;
            bullets.push({x:aim.x,y:aim.y,vx:aim.dx*TURRET.speed,vy:aim.dy*TURRET.speed,life:TURRET.life,enemy:true,fromSoldier:true,fromTurret:true});
            if(n.burst>=5)n.burst=0;
          }
        }continue;
      }
      if(n.kind==='knife'&&n.attackAge!==null){
        if(n.hit>0){n.attackAge=null;n.shot=Math.max(n.shot,.6);}
        else{const before=n.attackAge;n.attackAge+=dt;n.strikePending=before<.24&&n.attackAge>=.24;n.vx=0;P.step(n,{},dt,platforms);if(n.attackAge>=.65)n.attackAge=null;continue;}
      }
      if(n.kind==='knife'&&seen&&Math.abs(dx)<54&&Math.abs(dy)<36&&n.grounded&&n.shot<=0){n.attackAge=0;n.shot=1.3;n.facing=Math.sign(dx)||n.facing;n.vx=0;continue;}
      const goal=n.lastKnown||{x:n.x,y:n.y},goalDy=goal.y-n.y;
      if(n.grounded){n.jumpRoute=null;n.standing=(n.standing||0)+dt;}else n.standing=0;
      let target=n.jumpRoute?n.jumpRoute.x:goal.x,drop=false;
      if(!n.guardPost&&n.alert&&goalDy>45&&n.grounded){
        const below=platforms.filter(s=>s.y>n.y+10&&s.y<=n.y+360&&s.x<n.x+180&&s.x+s.w>n.x-180).sort((a,b)=>(a.y-n.y+Math.abs(Math.max(a.x+15,Math.min(a.x+a.w-15,goal.x))-n.x))-(b.y-n.y+Math.abs(Math.max(b.x+15,Math.min(b.x+b.w-15,goal.x))-n.x)))[0];
        if(below){target=Math.max(below.x+15,Math.min(below.x+below.w-15,goal.x));drop=n.jumpWait===0&&n.x>below.x+12&&n.x<below.x+below.w-12;}
      }
      let move=!n.guardPost&&n.alert&&Math.abs(target-n.x)>(n.jumpRoute?4:Math.abs(goalDy)>45?12:seen?(n.kind==='knife'?30:130):12),dir=Math.sign(target-n.x);
      const edge=move&&!platforms.some(s=>Math.abs(P.surfaceY(s,n.x)-n.y)<3&&n.x+dir*24>s.x&&n.x+dir*24<s.x+s.w);
      let jump=false;
      if(!n.guardPost&&!drop&&n.alert&&n.grounded&&n.jumpWait===0&&n.standing>.4&&(goalDy< -40||edge)){
        n.jumpRoute=jumpRoute(n,goal,platforms,dir,edge);jump=!!n.jumpRoute;
        n.jumpWait=jump?1.8:.7;
        if(jump){target=n.jumpRoute.x;dir=Math.sign(target-n.x);move=Math.abs(target-n.x)>4;}
      }
      if(n.grounded&&edge&&!jump&&!drop)move=false;
      if(drop)n.jumpWait=1.2;
      P.step(n,{left:move&&dir<0,right:move&&dir>0,run:n.kind==='knife'&&!drop,down:drop,jumpPressed:drop||jump},dt,platforms);
      n.runCycle+=Math.abs(n.vx)*dt/72;
      if(n.alert&&Math.abs(goal.x-n.x)>2)n.facing=Math.sign(goal.x-n.x);
      const sx=n.x+n.facing*20,sy=n.y-28,tx=p.x-sx,ty=p.y-25-sy,d=Math.hypot(tx,ty)||1;
      const blocked=platforms.some(s=>segmentHit(sx,sy,tx,ty,{x:s.x,y:s.y,w:s.w,h:s.thickness||12,terrain:s.terrain})!==null);
      if(n.kind!=='knife'&&seen&&d<430&&!blocked&&n.shot<=0){n.shot=1.65;n.flash=.16;bullets.push({x:sx,y:sy,vx:tx/d*190,vy:ty/d*190,life:2.5,enemy:true,fromSoldier:true});}
    }
  }
  const api={TURRET,blocksShot,turretAim,create,createSoldier,damage,area,melee,ram,wolfCombat,update,contact};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeEnemies=api;
})(typeof window!=='undefined'?window:globalThis);
