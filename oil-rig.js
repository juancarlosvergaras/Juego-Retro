(function(root){
  'use strict';
  const physics=typeof module!=='undefined'&&module.exports?require('./physics'):root.ArcadePhysics;
  const anim=typeof module!=='undefined'&&module.exports?require('./soldier-animation'):root.ArcadeSoldierAnimation;
  const node=typeof module!=='undefined'&&module.exports;
  const combat=node?require('./mission-combat'):root.ArcadeMissionCombat;
  const arsenal=node?require('./arsenal'):root.ArcadeArsenal;
  const progression=node?require('./progression'):root.ArcadeProgression;
  const campaign=node?require('./campaign'):root.ArcadeCampaign;
  const forms=node?require('./zombie-form'):root.ArcadeZombieForm;
  const powerSystem=node?require('./powers'):root.ArcadePowers;
  const soldiers=node?require('./enemies'):root.ArcadeEnemies;
  const encounter=node?require('./encounter'):root.ArcadeEncounter;
  function equip(s,profile=progression.fresh(),carry={},difficultyId='normal'){
    const r=s.rig,p=r.p;if(r.gear)return r.gear;
    const retry=r.respawnKit;
    if(retry)carry={...carry,...retry};
    const saved=r.loadout,inv=campaign.inventory(saved?.inventory||carry.inventory);
    if(!saved){if(!inv.owned.includes(5))inv.owned.push(5);inv.ammo[5]=retry?Math.max(60,inv.ammo[5]||0):(inv.ammo[5]||0)+300;if(!carry.inventory)inv.selected=5;}
    const e=combat.create(inv),powers=powerSystem.create();
    const resting={fuel:p.fuel,shield:p.shield,form:p.form,formCooldown:p.formCooldown};
    progression.apply(profile,p,e,true);
    if(saved){
      const maxHp=e.maxHp,prior=saved.encounter||{hp:saved.hp,invincible:saved.invincible||0};
      Object.assign(p,resting);forms.restoreBody(p,resting.form,true);p.fuel=Math.min(p.fuel??p.fuelMax,p.fuelMax);
      Object.assign(e,prior,{maxHp,hp:Math.max(0,Math.min(maxHp,(prior.hp??maxHp)+Math.max(0,maxHp-(prior.maxHp??maxHp))))});
      Object.assign(powers,saved.powers||{});
      const byId=new Map([...r.guards,r.boss].map(n=>[n.id??'contramaestre',n]));
      for(const beam of powers.beams)beam.hits=new Set((Array.isArray(beam.hits)?beam.hits:[]).map(id=>byId.get(id)).filter(Boolean));
      for(const d of powers.drones){
        const id=typeof d.target==='string'?d.target:d.target?.id??(d.target?.active?'contramaestre':null);
        d.target=byId.get(id)||r.guards.find(n=>n.hp>0)||(r.boss.active&&r.boss.hp>0?r.boss:null);
      }
      powers.drones=powers.drones.filter(d=>d.target);
    }
    else{
      e.hp=Math.max(1,Math.round(e.maxHp*s.hp/100));
      const selected=carry.form||p.form;
      if(selected!=='soldier'&&forms.change(e,p,selected)){p.transform=0;p.formCooldown=0;e.cooldown=0;}
    }
    Object.assign(powers.cooldowns,saved?.cooldowns||carry.cooldowns);
    (node?require('./difficulty'):root.ArcadeDifficulty).applyPlayerDamage(e,difficultyId);
    const gear={e,powers,profile};Object.defineProperty(r,'gear',{value:gear});return gear;
  }
  function saveLoadout(r){
    if(!r.gear)return r.loadout;
    const {e,powers}=r.gear;const {enemies,streetTargets,inventory,developerInvulnerable,...encounter}=e;
    return {inventory,encounter,powers:{...powers,
      beams:powers.beams.map(b=>({...b,hits:Array.from(b.hits,n=>n.id??'contramaestre')})),
      drones:powers.drones.map(d=>({...d,target:d.target?.id??'contramaestre'}))},cooldowns:powers.cooldowns};
  }
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const floors=[805,670,541,412,296];
  const platforms=floors.map((y,i)=>({id:i,x:[0,48,34,61,14][i],y,w:[729,635,660,612,701][i],kind:i?'deck':'ground',thickness:12}));
  const ladders=[165,559,207,464].map((x,i)=>({id:i,x,top:floors[i+1],bottom:floors[i]}));
  const steps={barrel:{label:'Barril rodante',wind:.79,act:.63},wrench:{label:'Llave búmeran',wind:.63,act:.68},
    rush:{label:'Embestida',wind:.8,act:.92},stomp:{label:'Pisotón sísmico',wind:.56,act:.92},crane:{label:'Gancho de grúa',wind:.98,act:.78}};
  const names=Object.keys(steps);
  const posts=[[0,396,'rifle'],[1,400,'knife'],[1,620,'rifle'],[2,356,'rifle'],[2,135,'knife'],[3,542,'rifle'],[3,292,'rifle']];
  function guard(post,index,difficulty){
    const [deck,x,kind]=post,hp=Math.ceil(3*difficulty);
    const n=soldiers.createSoldier({x,y:floors[deck],floor:deck,ground:platforms[deck],kind,grenadier:index===3},index);
    return Object.assign(n,{id:'rig-guard-'+deck+'-'+x,deck,hp,maxHp:hp,fallPeak:n.y});
  }
  function restoreGuards(r,difficulty){
    r.guards=r.guards.map(n=>{
      if(!n.kind){
        const index=posts.findIndex(([deck,x])=>'rig-guard-'+deck+'-'+x===n.id);
        if(index<0)return null;
        const soldier=guard(posts[index],index,difficulty);
        return Object.assign(soldier,{x:n.x,y:n.y,facing:n.face||-1,hp:Math.ceil(soldier.maxHp*n.hp/Math.ceil(5*difficulty)),death:n.dead||0});
      }
      if(n.ground)n.ground=platforms[n.ground.id]||null;
      return n;
    }).filter(Boolean);
  }
  function create(checkpoint,difficulty){
    const deck=checkpoint>=5?4:checkpoint===4?2:0;
    const p=Object.assign(physics.createPlayer(),{form:'soldier',x:deck?ladders[deck-1].x:70,y:floors[deck],ground:platforms[deck],facing:1,fallPeak:floors[deck]});
    const guards=posts.map((post,i)=>guard(post,i,difficulty)).filter(n=>n.deck>=deck);
    const max=Math.ceil(140*difficulty);
    return {p,deck,guards,shots:[],hazards:[],effects:[],gun:0,grenade:0,trigger:false,throwHeld:false,crouch:false,
      cam:clamp(p.y-220,16,535),arrival:checkpoint===3?1.35:0,
      boss:{id:'contramaestre',x:615,y:floors[4],face:-1,hp:max,max,active:deck===4,move:null,age:0,rest:1.15,available:[],count:0,flash:0,defeat:0}};
  }
  function effects(r,x,y,color,count){
    for(let j=0;j<count;j++){
      const a=j*2.4,d=18+(j%5)*15;r.effects.push({x,y,vx:Math.cos(a)*d,vy:Math.sin(a)*d-35,life:.36+j%4*.09,color});
    }
  }
  function start(r,s){
    const b=r.boss,p=r.p,dx=p.x-b.x,dist=Math.abs(dx);
    if(!b.available.length)b.available=names.slice();
    const priority=b.count===0?'barrel':p.y<floors[4]-44?'crane':dist<95?'stomp':dist>350?'wrench':'rush';
    const attack=b.available.includes(priority)?priority:b.available[0];
    b.available.splice(b.available.indexOf(attack),1);
    Object.assign(b,{move:attack,age:0,fired:false,face:dx<0?-1:1,targetX:p.x,count:b.count+1});
    s.events.push({type:'foremanTell',attack});
  }
  function hazard(r,kind,x,y,vx,vy,life,extra={}){
    r.hazards.push({kind,x,y,vx,vy,age:0,life,angle:0,hp:kind==='barrel'?8:0,...extra});
  }
  const collapseTiming=[0,.11,.23,.35,.48,.59,.71,.86];
  function collapseFrame(age){
    return collapseTiming.filter(start=>age>=start).length-1;
  }
  function beginDefeat(s,r,helpers){
    const b=r.boss;
    b.move=null;b.defeat=.001;b.dropSpeed=0;b.groundedAge=0;b.hit=0;b.flash=0;
    r.hazards.length=0;
    helpers.award(s,'contramaestre',2400);
    s.events.push({type:'foremanDown'});
  }
  function foreman(s,r,dt,helpers){
    const b=r.boss,p=r.p,roof=floors[4];b.hit=Math.max(0,(b.hit||0)-dt);b.flash=Math.max(0,b.flash-dt);
    if(!b.active)return;
    if(b.hp<=0){
      b.defeat+=dt;
      if(b.y<roof){
        b.dropSpeed=(b.dropSpeed||0)+520*dt;
        b.y=Math.min(roof,b.y+b.dropSpeed*dt);
      }
      if(b.y>=roof){
        const prev=b.groundedAge??Math.max(0,b.defeat-dt);
        b.groundedAge=prev+dt;
        if(prev<collapseTiming[6]&&b.groundedAge>=collapseTiming[6]){
          effects(r,b.x,roof-2,'#b29a79',7);
          s.events.push({type:'foremanImpact'});
        }
        if(b.groundedAge>=1.8)helpers.win(s);
      }
      return;
    }
    if(b.frozen>0){b.frozen=Math.max(0,b.frozen-dt);return;}
    if(!b.move&&p.cloak>0)return;
    if(!b.move){b.rest-=dt;if(b.rest<=0)start(r,s);return;}
    const cfg=steps[b.move],prev=b.age;b.age+=dt;
    if(b.age<cfg.wind){if(b.move==='crane'&&b.age<cfg.wind*.47)b.targetX=p.x;return;}
    const t=clamp((b.age-cfg.wind)/cfg.act,0,1);
    if(!b.fired){b.fired=true;s.events.push({type:'foremanStrike',attack:b.move});
      switch(b.move){
        case 'barrel':hazard(r,'barrel',b.x+b.face*32,roof-45,b.face*145,-42,6.4,{bounces:1});break;
        case 'wrench':hazard(r,'wrench',b.x+b.face*32,roof-49,b.face*220,0,3.35,{startX:b.x+b.face*32,sign:b.face});break;
        case 'crane':hazard(r,'hook',b.targetX,roof-210,0,370,1.7);break;
      }
    }
    if(b.move==='rush'){
      b.x=clamp(b.x+b.face*282*dt,54,675);
      if(Math.abs(p.x-b.x)<41&&p.y>roof-65&&p.y<=roof+4)helpers.hurt(s,17);
    }
    if(b.move==='stomp'){
      b.y=roof-Math.sin(t*Math.PI)*70;
      if(prev<cfg.wind+cfg.act*.94&&b.age>=cfg.wind+cfg.act*.94){
        for(const dir of [-1,1])hazard(r,'wave',b.x,roof-4,dir*190,0,3.6);
        effects(r,b.x,roof,'#efb169',14);s.events.push({type:'slam'});
      }
    }
    if(t>=1){b.y=roof;b.move=null;b.rest=b.hp<b.max/2?.63:.91;}
  }
  function strikeBoss(s,r,amount,helpers){
    const b=r.boss;if(!b.active||b.hp<=0)return;
    b.hp=Math.max(0,b.hp-amount);b.flash=.14;
    if(!b.hp)beginDefeat(s,r,helpers);
  }
  function hitGuard(s,r,n,amount,helpers){
    soldiers.damage(n,amount);
    if(n.hp<=0)helpers.award(s,n.id,165);
  }
  function explode(s,r,q,helpers){
    q.life=0;effects(r,q.x,q.y,'#ffc878',16);s.events.push({type:'blast'});
    for(const n of r.guards)if(n.hp>0&&Math.hypot(n.x-q.x,n.y-24-q.y)<65)hitGuard(s,r,n,10,helpers);
    if(Math.hypot(r.boss.x-q.x,r.boss.y-40-q.y)<83)strikeBoss(s,r,13,helpers);
    for(const h of r.hazards)if(h.kind==='barrel'&&Math.hypot(h.x-q.x,h.y-q.y)<65)h.life=0;
  }
  function projectiles(s,r,dt,helpers){
    const p=r.p,b=r.boss;
    for(const q of r.shots){
      q.life-=dt;const old=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;
      if(q.kind==='grenade'){
        q.vy+=370*dt;
        if(q.life<=0||platforms.some(f=>q.x>f.x&&q.x<f.x+f.w&&old<=f.y&&q.y>=f.y)||b.active&&b.hp>0&&Math.abs(q.x-b.x)<28&&Math.abs(q.y-(b.y-35))<35)explode(s,r,q,helpers);
        continue;
      }
      if(q.enemy){
        if(Math.abs(q.x-p.x)<12&&q.y<p.y-2&&q.y>p.y-(r.crouch?24:43)){helpers.hurt(s,8,q.x,true);q.life=0;}
        continue;
      }
      const barrel=r.hazards.find(h=>h.kind==='barrel'&&h.life>0&&Math.abs(q.x-h.x)<16&&Math.abs(q.y-h.y)<17);
      if(barrel){barrel.hp-=q.damage;q.life=0;if(barrel.hp<=0){barrel.life=0;effects(r,barrel.x,barrel.y,'#ec9d5d',8);}continue;}
      const n=r.guards.find(n=>n.hp>0&&Math.abs(q.x-n.x)<15&&q.y>n.y-46&&q.y<n.y);
      if(n){hitGuard(s,r,n,q.damage,helpers);q.life=0;}
      else if(b.active&&b.hp>0&&Math.abs(q.x-b.x)<30&&q.y>b.y-84&&q.y<b.y){strikeBoss(s,r,q.damage,helpers);q.life=0;}
    }
    r.shots=r.shots.filter(q=>q.life>0&&q.x>-30&&q.x<760);
    for(const h of r.hazards){
      if(h.life<=0)continue;
      h.age+=dt;h.life-=dt;h.x+=h.vx*dt;h.y+=h.vy*dt;
      if(h.kind==='barrel'){
        h.vy+=370*dt;if(h.y>=floors[4]-13){h.y=floors[4]-13;h.vy=Math.abs(h.vy)>85?-h.vy*.35:0;}
        h.angle+=h.vx*dt/13;
        if((h.x<24||h.x>705)&&h.bounces){h.bounces--;h.vx*=-.85;}
      }else if(h.kind==='wrench'){
        h.x=h.startX+h.sign*255*Math.sin(Math.min(1,h.age/3.25)*Math.PI);h.y=floors[4]-38-32*Math.sin(h.age*2);h.angle+=dt*10;
      }else if(h.kind==='hook'){
        if(h.age<.9)h.y=Math.min(floors[4]-12,h.y);else h.vy=-225;
      }
      if(Math.abs(h.x-p.x)<(h.kind==='wave'?21:24)&&h.y>=p.y-(r.crouch?24:42)&&h.y<=p.y+2){
        helpers.hurt(s,h.kind==='wave'?11:16);if(h.kind!=='hook')h.life=0;
      }
    }
    r.hazards=r.hazards.filter(h=>h.life>0&&h.x>-35&&h.x<760);
  }
  function update(s,i,dt,helpers){
    const r=s.rig,p=r.p;
    if(r.arrival>0){r.arrival=Math.max(0,r.arrival-dt);r.trigger=!!i.jump;return;}
    const {e,powers,profile}=equip(s);
    forms.tick(p,dt);
    for(const key of ['transform','claw','kick','healGlow'])p[key]=Math.max(0,(p[key]||0)-dt);
    const move={left:i.x<-.2,right:i.x>.2,up:i.y<-.3,down:i.y>.3,run:!!i.run,jumpPressed:!!i.jump&&!r.trigger,jumpHeld:!!i.jump,
      fire:!!i.fire,kick:!!i.kick,power:!!i.power,jetpackPressed:!!i.jet};
    arsenal.playerAim(p,move,{turn:false});
    const pose=physics.step(p,move,dt,platforms,{ladders});
    p.crouching=!!pose.crouching;
    helpers={...helpers,hurt:(state,amount,x=r.boss.x,projectile=false)=>{
      if(!state.grace&&!state.god)encounter.hurtPlayer(e,p,x,projectile,Math.max(1,Math.round(amount/9)));
    }};
    p.x=clamp(p.x,23,704);anim.advanceWalk(p,dt);
    r.trigger=!!i.jump;r.crouch=!!pose.crouching;
    // Once the fight starts the upper maintenance hatch closes behind Cap.
    if(r.boss.active&&p.y>floors[4]){p.x=clamp(p.x,30,696);p.y=floors[4];p.vy=0;p.grounded=true;p.ladder=null;p.ground=platforms[4];}
    if(p.grounded&&p.ground)r.deck=Math.max(r.deck,p.ground.id);
    if(r.deck>=2&&s.checkpoint<4)helpers.checkpoint(s,4,'Vega · Bombas aseguradas. La escalera amarilla lleva a control.');
    if(r.deck===4&&!r.boss.active){
      r.boss.active=true;helpers.checkpoint(s,5,'Cap · Contacto en la cima. ¡El contramaestre!');s.events.push({type:'boss'});}
    r.gun-=dt;r.grenade-=dt;
    const before=e.hp;
    e.developerInvulnerable=!!s.god;
    if(s.grace>0)e.invincible=Math.max(e.invincible,Math.min(s.grace,.08));
    r.boss.scriptedAI=true;
    e.enemies=r.boss.active&&r.boss.hp>0?[...r.guards,r.boss]:r.guards;
    r.boss.w=59;r.boss.h=81;
    e.streetTargets=r.hazards.filter(h=>h.kind==='barrel'&&h.life>0).map(h=>({x:h.x-13,y:h.y-13,w:26,thickness:26,
      impact(){h.hp-=3;if(h.hp<=0)h.life=0;}}));
    const message=combat.update(e,p,move,dt,platforms,powers,profile,{left:0,right:729,top:r.cam,bottom:r.cam+360},
      (_,sound)=>s.events.push({type:'weaponSound',sound}));
    if(message)s.events.push({type:'radio',text:message});
    for(const n of r.guards)if(n.hp<=0)helpers.award(s,n.id,165);
    if(r.boss.active&&r.boss.hp<=0&&!r.boss.defeat)beginDefeat(s,r,helpers);
    if(i.special&&!r.throwHeld&&r.grenade<=0){
      r.shots.push({x:p.x+p.facing*13,y:p.y-31,vx:p.facing*190,vy:-198,kind:'grenade',life:1.6});
      r.grenade=2.8;s.events.push({type:'throw'});
    }
    r.throwHeld=!!i.special;r.flash=Math.max(0,(r.flash||0)-dt);
    r.guards=r.guards.filter(n=>n.hp>0||n.death>0);
    foreman(s,r,dt,helpers);projectiles(s,r,dt,helpers);
    if(e.hp<before){s.events.push({type:'hurt'});s.shieldFlash=.32;}
    s.hp=100*e.hp/e.maxHp;
    if(e.dead&&s.phase==='play'){s.phase='lost';s.reason='Cap ha caído en la plataforma.';s.events.push({type:'lost'});}
    for(const f of r.effects){f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=130*dt;}r.effects=r.effects.filter(f=>f.life>0);
    r.cam+=(clamp(p.y-220,16,535)-r.cam)*(1-Math.exp(-dt*7));
  }
  function hand(r){
    const p=r.p;
    if(r.crouch||p.slide>0)return {x:11,y:-18};
    if(p.ladder)return {x:8,y:-31};
    return anim.grip(p,{}, {inventory:{selected:5}});
  }
  function muzzle(r){
    const p=r.p,h=hand(r),a=p.aim||{x:p.facing,y:0};
    return {x:p.x+h.x*p.facing+a.x*15+a.y*p.facing*5,y:p.y+h.y+a.y*15-a.x*p.facing*5};
  }
  const api={equip,saveLoadout,hand,muzzle,create,restoreGuards,update,floors,platforms,ladders,steps,collapseFrame};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeOilRig=api;
})(typeof window!=='undefined'?window:globalThis);
