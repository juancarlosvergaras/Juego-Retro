(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports,A=common?require('./arsenal.js'):root.ArcadeArsenal,E=common?require('./encounter.js'):root.ArcadeEncounter,V=common?require('./powers.js'):root.ArcadePowers,N=common?require('./enemies.js'):root.ArcadeEnemies,T=common?require('./city-tank.js'):root.ArcadeCityTank;
  function create(inventory){return{inventory,won:true,hp:8,maxHp:8,invincible:0,dead:false,cooldown:0,flash:0,bullets:[],explosions:[],debris:[],enemies:[],boss:{active:false,hp:0},finalBoss:{active:false,hp:0}};}
  const Cars=common?require('./wrecked-cars'):root.ArcadeWreckedCars;
  const K=common?require('./mausoleum-king'):root.ArcadeMausoleumKing;
  const Impact=common?require('./impact-effects.js'):root.ArcadeImpact;
  function cityEnemies(defeated=[]){
    const level=common?require('./level-two.js'):root.ArcadeLevelTwo;
    const {buildings,barricades,platforms,bridges}=level.geometry(),physics=common?require('./physics.js'):root.ArcadePhysics;
    // Keep the original five IDs stable so existing saves retain their defeated soldiers.
    const spawns=[1150,2300,3850,5600,7400,1510,2810,3450,4620,5250,6580,7950].map(x=>({x,y:physics.surfaceY(platforms[0],x),facing:-1}));
    for(const [building,floor] of [[0,0],[2,1],[4,2],[6,0],[7,1],[9,2],[11,0],[12,3]]){
      const deck=buildings[building].decks[floor];
      spawns.push({x:deck.x+deck.w*.55,y:deck.y,facing:-1});
    }
    for(const b of barricades)for(const [i,index]of b.guardLedges.entries()){const deck=b.platforms[index];spawns.push({x:deck.x+deck.w*.5,y:deck.y,facing:i?1:-1,guardPost:b.id});}
    for(const bridge of bridges){const x=bridge.x+bridge.w*.57;spawns.push({x,y:physics.surfaceY(bridge,x),facing:-1,kind:'turret',guardPost:'city-bridge'});}
    return spawns.map((spawn,id)=>{const kind=spawn.kind||([7,14,18].includes(id)?'turret':[5,8,10,16].includes(id)?'knife':'rifle');const n=N.createSoldier({...spawn,kind},id);if(defeated.includes(id))n.hp=0;return n;});
  }
  function hit(x,y,dx,dy,b){if(b.terrain)return E.segmentHit(x,y,dx,dy,{...b,h:b.thickness||7});let lo=0,hi=1;for(const [a,d,min,max] of [[x,dx,b.x,b.x+b.w],[y,dy,b.y,b.y+(b.thickness||7)]]){if(Math.abs(d)<1e-8){if(a<min||a>max)return null;continue;}const t1=(min-a)/d,t2=(max-a)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return null;}return lo;}
  function area(e,x,y,r,damage){N.area([...e.enemies,...(K.targetable(e.king)?[e.king]:[])],x,y,r,damage);const t=e.tank;if(t&&Math.hypot(x-Math.max(t.x-t.w/2,Math.min(t.x+t.w/2,x)),y-Math.max(t.y-t.h,Math.min(t.y,y)))<=r)T.damage(t,damage);}
  function melee(e,p,range,damage){N.melee(e.enemies,p,range,damage);if(K.targetable(e.king)){const b=K.box(e.king);if(Math.abs(e.king.x-p.x)<range+b.w/2&&(e.king.x-p.x)*p.facing>=-b.w/2&&p.y>b.y&&p.y-(p.h||46)<b.y+b.h)K.damage(e.king,damage);}const t=e.tank;if(t&&Math.abs(t.x-p.x)<range+t.w/2&&p.y>t.y-t.h&&p.y-(p.h||46)<t.y&&(t.x-p.x)*p.facing>=-t.w/2)T.damage(t,damage);}
  function update(e,p,input,dt,platforms,powers,profile,view){
    if(e.dead)return;
    E.applyFallDamage(e,p);if(e.dead)return;
    T.update(e.tank,p,dt*(e.tank?.hp>0&&e.tank.sticky>0?.45:1),e.bullets,e.explosions,view);
    e.invincible=Math.max(0,e.invincible-dt);p.hurt=Math.max(0,(p.hurt||0)-dt);
    K.update(e.king,p,dt*(K.targetable(e.king)&&e.king.sticky>0?.45:1),(x,amount)=>E.hurtPlayer(e,p,x,false,amount),e.enemies,platforms);
    A.tickRobot(e,dt);e.cooldown=Math.max(0,e.cooldown-dt);e.flash=Math.max(0,e.flash-dt);if(e.weaponAction)e.weaponAction.age+=dt;
    const action=e.weaponAction;
    const Z=common?require('./zombie-form'):root.ArcadeZombieForm;Z.combat(e,p,input,dt,platforms);
    N.ram(e,p,input,dt,platforms,E.segmentHit);
    if(action?.melee&&!action.hitApplied&&action.age>=action.duration*.28){action.hitApplied=true;if(p.form!=='wolf'&&p.form!=='zombie'&&!p.rope&&!p.ladder&&e.inventory.selected===action.slot)melee(e,p,action.melee.range,action.melee.damage);}
    N.wolfCombat(e,p,input,dt,(range,damage)=>melee(e,p,range,damage));
    if(p.form==='fighter'||p.form==='tank'){p.fighterKickInput=!!input.kick;if(input.kick)input={...input,fire:true};}
    if(input.fire&&p.form!=='wolf'&&p.form!=='zombie'&&!p.rope&&!p.ladder&&!p.transform&&e.cooldown<=0){
      const shot=p.form==='robot'?A.fireRobot(e,p):A.fire(e.inventory,p);if(shot){e.cooldown=shot.weapon.rate/(p.rateBonus||1);e.weaponAction={slot:e.inventory.selected,age:0,duration:e.cooldown};if(shot.weapon.range)e.weaponAction.melee={range:shot.weapon.range,damage:shot.weapon.damage*(p.damageBonus||1)};e.flash=.14;const shotId=e.shotSerial=(e.shotSerial||0)+1;for(const b of shot.bullets)b.carShot=shotId;e.bullets.push(...shot.bullets);}
    }
    const message=V.update(powers,e,p,profile,input.power,dt,platforms,view);
    const noises=e.explosions.filter(b=>b.life>.35).map(b=>({x:b.x,y:b.y,radius:600}));if(e.flash>0)noises.push({x:p.x,y:p.y,radius:e.inventory.selected<=2?100:430});
    N.update(e.enemies,p,dt,platforms,e.bullets,E.segmentHit,noises,view);
    for(const b of e.bullets){
      if(b.life<=0)continue;
      T.steer(b,dt);
      if(b.slot===9)E.stepGrenade(b,dt,b.enemy?platforms:[...platforms,...(e.tank?.hp>0?[T.box(e.tank)]:[]),...(K.targetable(e.king)?[K.box(e.king)]:[])]);
      else{
        b.vy+=(b.gravity||0)*dt;const dx=b.vx*dt,dy=b.vy*dt;let contact=null,target=null,contactPlatform=null;
        for(const pl of platforms){if(!N.blocksShot(b,pl))continue;const t=hit(b.x,b.y,dx,dy,pl);if(t!==null&&(contact===null||t<contact)){contact=t;target=null;contactPlatform=pl;}}
        for(const n of b.enemy?(p.cloak>0?[]:[p]):[...e.enemies,...(e.tank?[e.tank]:[]),...(K.targetable(e.king)?[e.king]:[])]){if(n!==p&&n.hp<=0||n.kind==='zombie'&&(n.phase==='dormant'&&n.spawnType!=='sleep'||n.phase==='waking'&&n.spawnType!=='sleep'&&n.wakeAge<=.72))continue;const boxes=n===e.tank?[T.box(n),T.crewBox(n)].filter(Boolean):[{x:n.x-(n.w||28)/2,y:n.y-(n.h||46),w:n.w||28,thickness:n.h||46}];for(const box of boxes){const t=hit(b.x,b.y,dx,dy,box);if(t!==null&&(contact===null||t<contact)){contact=t;target=n;contactPlatform=null;}}}
        b.x+=dx*(contact??1);b.y+=dy*(contact??1);b.life=contact===null?b.life-dt:0;
        if(contactPlatform?.kind==='wreck'&&!b.enemy)e.damageCar?.(contactPlatform.car,b.carShot);
        if(target===p){if(A.reflect(p,b))continue;if(!b.tankShell&&!b.tankMissile)E.hurtPlayer(e,p,b.x-b.vx*.05,true,b.damage||1);}
        else if(target&&b.slot!==6){if(target===e.tank)T.damage(target,b.damage||1);else if(target===e.king)K.damage(target,b.damage||1);else N.damage(target,b.damage||1);}
        else if(contact!==null&&b.slot!==6&&!b.zombiePlasma)E.chip(e,b.x,b.y,{kind:'deck'});
      }
      if(b.zombiePlasma){b.age+=dt;if(b.life<=0)e.explosions.push(Impact.create(b.x,b.y,24,'plasma'));}
      if(b.life<=0&&!b.enemy&&(b.slot===6||b.slot===9)){
        const radius=b.slot===6?95:85;Cars.blast(e.cars,b.x,b.y,radius,b.carShot);area(e,b.x,b.y,radius,b.damage||4);e.explosions.push(Impact.create(b.x,b.y,radius,b.slot===6?'rocket':'grenade'));
        if(b.slot===9){const d=Math.hypot(b.x-p.x,b.y-Math.max(p.y-(p.h||46),Math.min(p.y,b.y)));if(d<85)E.hurtPlayer(e,p,b.x,false,d<45?2:1);}
      }
      if(b.life<=0&&(b.tankShell||b.tankMissile||b.tankGrenade)){const radius=b.tankGrenade?85:b.tankShell?65:55;e.explosions.push(Impact.create(b.x,b.y,radius,b.tankGrenade?'grenade':'rocket'));const distance=Math.hypot(b.x-Math.max(p.x-12,Math.min(p.x+12,b.x)),b.y-Math.max(p.y-(p.h||46),Math.min(p.y,b.y)));if(distance<radius)E.hurtPlayer(e,p,b.x-b.vx*.05,true,b.damage);}
    }
    for(const n of e.enemies)if(N.contact(n,p,platforms,E.segmentHit))E.hurtPlayer(e,p,n.x,n.kind==='knife'||n.kind==='bat');
    if(e.tank?.hp>0&&Math.abs(e.tank.x-p.x)<e.tank.w/2+10&&p.y>e.tank.y-45&&p.y-(p.h||46)<e.tank.y)E.hurtPlayer(e,p,e.tank.x,false,2);
    Cars.sync(e.cars||[],platforms,e.pickups||[]);e.bullets=e.bullets.filter(b=>b.life>0);e.explosions=e.explosions.filter(b=>(b.life-=dt)>0);E.updateDebris(e,dt,platforms);return message;
  }
  function draw(c,e,powers,p,view){
    E.drawEnvironment(c,e,p,[]);
    for(const b of e.bullets){if(!b.alienLaser&&root.ArcadeBossAttackSprites?.projectile(c,b,e.time||0))continue;if(b.alienLaser){c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(Math.atan2(b.vy,b.vx));c.fillStyle='#298cac';c.fillRect(-17,-3,24,6);c.fillStyle='#78ffff';c.fillRect(-14,-2,23,4);c.fillStyle='#efffff';c.fillRect(-8,-1,17,2);c.restore();continue;}if(b.stormRay){c.strokeStyle='#81eaff';c.lineWidth=3;c.beginPath();c.moveTo(b.x-b.vx*.045,b.y-b.vy*.045);c.lineTo(b.x+3,b.y-4);c.lineTo(b.x,b.y);c.stroke();continue;}if(Impact.projectile(c,b))continue;c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.fillStyle=b.slot===9?'#acc46b':'#ffdf88';const arrow=b.slot===7||b.slot===8;if(b.tankMissile){c.fillStyle='#17262c';c.fillRect(-9,-3,17,6);c.fillStyle='#b7c6bd';c.fillRect(-7,-2,12,4);c.fillStyle='#9f5941';c.fillRect(5,-1,4,2);c.fillStyle='#fff0ad';c.fillRect(-14-Math.floor((b.age*24)%3),-1,6,2);c.fillStyle='#f4a456';c.fillRect(-18,-1,4,2);}else c.fillRect(arrow?-7:-4,b.tankShell?-3:b.slot===9?-4:-1,arrow?14:b.tankShell?13:b.slot===6?12:7,b.tankShell?6:b.slot===9?8:2);c.restore();}
    for(const b of e.explosions)Impact.draw(c,b);
    V.draw(c,powers,p,e,view);(common?require('./zombie-form'):root.ArcadeZombieForm).drawEffects(c,e);
  }
  const api={create,cityEnemies,update,draw};if(common)module.exports=api;else root.ArcadeMissionCombat=api;
})(typeof window!=='undefined'?window:globalThis);
