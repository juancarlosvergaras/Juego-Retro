(function(root){
  'use strict';
  const zones=['Calle del muelle','Lonja del puerto','Varadero del Lobo','Canal de servicio','Patio de bombas','Dique de contención','Zona de carga','Pabellón de aislamiento','Laboratorio Quimera'];
  const right=kind=>({kind,route:'right'}),left=kind=>({kind,route:'left'}),hatch=kind=>({kind,route:'hatch'}),
    shutter=kind=>({kind,route:'shutter'}),air=()=>({kind:'jet',route:'air'});
  const waves=[
    {x:400,cast:[shutter('knife'),right('rifle')]},
    {x:815,cast:[right('warden'),left('knife')]},
    {x:1250,cast:[hatch('infected'),right('knife'),hatch('infected')]},
    {x:1640,cast:[air(),shutter('rifle')]},
    {x:2090,cast:[left('knife'),right('warden'),air()]},
    {x:2490,cast:[shutter('blackWolf')]},
    {x:2915,cast:[right('rifle'),hatch('infected')]},
    {x:3330,cast:[air(),left('knife'),right('rifle')]},
    {x:3790,cast:[shutter('robot'),right('knife')]},
    {x:4195,cast:[hatch('infected'),hatch('infected'),left('warden')]},
    {x:4610,cast:[right('robot'),air(),left('rifle')]},
    {x:5070,cast:[shutter('gunner')]},
    {x:5490,cast:[shutter('warden'),right('robot'),left('knife')]},
    {x:5915,cast:[air(),hatch('infected'),air()]},
    {x:6350,cast:[shutter('robot'),left('rifle'),right('knife')]},
    {x:6770,cast:[hatch('infected'),air(),right('warden')]},
    {x:7200,cast:[left('knife'),shutter('robot'),right('rifle')]},
    {x:7620,cast:[shutter('scientist')]}
  ];
  // Keep the same space behind the final arena as in the original district.
  const worldEnd=waves[waves.length-1].x+310, maxCam=worldEnd-960;
  const moves={
    jab:{duration:.24,impact:.08,damage:9,reach:65,depth:22,push:10},
    cross:{duration:.33,impact:.11,damage:15,reach:73,depth:21,push:26},
    kick:{duration:.37,impact:.14,damage:19,reach:99,depth:23,push:38},
    uppercut:{duration:.43,impact:.15,damage:23,reach:58,depth:26,push:40},
    sweep:{duration:.46,impact:.17,damage:14,reach:86,depth:31,push:30},
    airkick:{duration:.35,impact:.10,damage:21,reach:92,depth:25,push:42}
  };
  const foes={
    rifle:{hp:34,speed:130,wind:.43,reach:59,damage:9},
    knife:{hp:26,speed:204,wind:.30,reach:52,damage:7},
    warden:{hp:62,speed:100,wind:.55,reach:77,damage:16},
    jet:{hp:28,speed:155,wind:.42,reach:184,damage:8},
    infected:{hp:42,speed:126,wind:.39,reach:62,damage:11},
    robot:{hp:52,speed:102,wind:.58,reach:170,damage:12},
    blackWolf:{hp:138,speed:178,wind:.49,reach:70,damage:14,boss:true},
    gunner:{hp:152,speed:0,wind:.66,reach:900,damage:11,boss:true},
    scientist:{hp:84,speed:105,wind:.59,reach:185,damage:9,boss:true},
    lizard:{hp:135,speed:158,wind:.48,reach:100,damage:16,boss:true}
  };
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const zoneOf=wave=>Math.min(zones.length-1,Math.floor(wave/2));
  // Pixel span of a planted sole in the authored gait, before projection.
  const stepSpan={fighter:36,knife:33,rifle:30,warden:32,infected:25,robot:28};
  const bodyScale={fighter:1.28,knife:1.34,rifle:1.22,warden:1.29,jet:1.63,infected:1.28,robot:1.28,
    scientist:1.29,lizard:1.59,blackWolf:1.53,gunner:1.34};
  function floorScale(y){return (y-80)/(366-80);}
  function scaleAt(a){
    const base=a.morph>0?bodyScale.scientist+(bodyScale.lizard-bodyScale.scientist)*(1-a.morph/1.8):bodyScale[a.kind];
    return base*floorScale(a.y);
  }
  function groundStep(a,fromX,fromY,dt){
    const dx=a.x-fromX,dy=(a.y-fromY)/.72;
    const distance=Math.hypot(dx,dy);
    a.stepping=distance>.001;
    if(a.stepping){
      const scale=bodyScale[a.kind]*floorScale((fromY+a.y)/2);
      const reverse=dx*a.face<0&&Math.abs(dx)>Math.abs(dy);
      a.stride=(1+a.stride+(reverse?-distance:distance)/(2*(stepSpan[a.kind]||32)*scale))%1;
    }
    a.gaitWeight=clamp(a.gaitWeight+(a.stepping?8:-8)*dt,0,1);
  }
  const supplies={
    cargo:{hp:18,width:58,height:49,reward:'points',amount:250},
    medical:{hp:22,width:62,height:43,reward:'heal',amount:28}
  };
  function createSupplies(saved){
    return waves.map((gate,id)=>{
      const kind=id%2?'medical':'cargo',spec=supplies[kind];
      const prior=Array.isArray(saved)?saved.find(item=>item?.id===id):null;
      const hp=Number.isInteger(prior?.hp)?clamp(prior.hp,0,spec.hp):spec.hp;
      return {id,kind,x:gate.x-[162,150,110,186][id%4],y:[366,398,325,377,411,349][id%6],
        hp,taken:hp===0&&prior?.taken===true,hitAt:-10,brokenAt:-10,takenAt:-10,gained:0};
    });
  }
  function supplySnapshot(items){
    return items.filter(item=>item.hp<supplies[item.kind].hp).map(({id,hp,taken})=>({id,hp,taken}));
  }
  function create(saved={}){
    const cp=saved.version===2?saved.checkpoint:[0,2,4].includes(saved.checkpoint)?saved.checkpoint*3:0;
    const wave=Number.isInteger(cp)&&cp>=0&&cp<waves.length&&cp%2===0?cp:0;
    const objects=createSupplies(saved.supplies);
    return {wave,checkpoint:wave,locked:false,arenaLeft:0,mode:'play',age:0,clears:wave,pending:[],waveTime:0,cam:wave?Math.min(maxCam,Math.max(0,waves[wave].x-650)):0,
      supplies:objects,checkpointSupplies:supplySnapshot(objects),
      player:{kind:'fighter',x:wave?waves[wave].x-290:145,y:366,z:0,vz:0,face:1,hp:100,maxHp:100,act:'idle',stride:0,stepping:false,gaitWeight:0,age:0,stun:0,immune:0,attack:null,chain:0,chainTime:0},
      enemies:[],shots:[],sparks:[],food:[],score:Number.isFinite(saved.score)?Math.max(0,saved.score):0,
      checkpointScore:Number.isFinite(saved.score)?Math.max(0,saved.score):0,combo:0,comboTime:0,hitstop:0,shake:0,serial:0,events:[]};
  }
  function portal(gate,route){return route==='shutter'?{x:gate.x+116,y:307}:{x:gate.x+42,y:406};}
  function spawn(s,{kind,route},i){
    const cfg=foes[kind],gate=waves[s.wave],door=portal(gate,route),lane=330+(i%3)*36;
    const landing=gate.x+(i===2?-230:145+i*85);
    const fromX=route==='left'?s.cam-92:route==='right'?s.cam+1052:route==='air'?landing:door.x;
    const fromY=route==='hatch'||route==='shutter'?door.y:lane;
    const toX=route==='left'?s.arenaLeft+90:route==='right'?s.arenaLeft+698:fromX;
    const toY=route==='shutter'?fromY+48:fromY;
    const duration=route==='air'?1.05:route==='hatch'?.73:route==='shutter'?.84:Math.max(.5,Math.abs(toX-fromX)/360);
    return {kind,x:fromX,y:fromY,z:route==='air'?550:0,face:s.player.x<fromX?-1:1,
      entry:{route,fromX,fromY,toX,toY,t:0,duration},hp:cfg.hp,maxHp:cfg.hp,act:'walk',age:0,stride:0,stepping:false,gaitWeight:0,hoverAge:0,stun:0,cool:.32,wind:0,move:'jab',turn:0,id:++s.serial};
  }
  function arrive(n,dt){
    const e=n.entry;e.t+=dt;const t=Math.min(1,e.t/e.duration);
    n.x=e.fromX+(e.toX-e.fromX)*t;n.y=e.fromY+(e.toY-e.fromY)*t;
    if(e.route==='shutter')n.y=e.fromY+(e.toY-e.fromY)*Math.max(0,(t-.48)/.52);
    if(e.route==='air'){const hover=13+Math.sin(n.hoverAge*6)*5;n.z=hover+(550-hover)*(1-t)*(1-t);}
    if(t===1){n.entry=null;n.age=0;}
  }
  function activity(a,act){if(a.act!==act){a.age=0;a.act=act;}}
  function spark(s,x,y,type){s.sparks.push({x,y,type,t:.25});s.shake=type==='block'?2:5;}
  function startAttack(p,name){p.attack={name,t:0,hit:false};p.face=p.face||1;p.age=0;activity(p,name);}
  function hitSupplies(s,move){
    const p=s.player;
    for(const box of s.supplies){
      if(box.hp<=0)continue;
      const spec=supplies[box.kind],ahead=(box.x-p.x)*p.face;
      if(ahead< -spec.width/2||ahead>move.reach+spec.width/2||Math.abs(box.y-p.y)>move.depth||p.z>spec.height+10)continue;
      box.hp=Math.max(0,box.hp-move.damage);box.hitAt=s.age;
      if(box.hp===0)box.brokenAt=s.age;
      spark(s,box.x,box.y-spec.height/2,'hit');s.events.push(box.hp?'boxHit':'boxBreak');
    }
  }
  function collectSupplies(s){
    const p=s.player;
    if(p.z>15)return;
    for(const box of s.supplies){
      if(box.hp>0||box.taken||s.age-box.brokenAt<.35||Math.abs(box.x-p.x)>32||Math.abs(box.y-p.y)>21)continue;
      const {reward,amount}=supplies[box.kind];
      if(reward==='heal'){
        box.gained=Math.min(amount,p.maxHp-p.hp);
        if(box.gained<=0)continue;
        p.hp+=box.gained;
      }else{box.gained=amount;s.score+=amount;}
      box.taken=true;box.takenAt=s.age;s.events.push(reward);
    }
  }
  function damageEnemy(s,n,m){
    const p=s.player,boss=foes[n.kind].boss;
    const armored=(n.kind==='gunner'&&!(n.overheat>0))||(n.kind==='blackWolf'&&!(n.exposed>0))||
      (n.wind>0&&(n.kind==='lizard'||n.kind==='robot'));
    if(n.kind==='warden'&&!n.stun&&n.act==='guard'&&(p.x-n.x)*n.face>0&&(m===moves.jab||m===moves.cross)){
      spark(s,n.x,n.y-45,'block');s.events.push('block');return;
    }
    n.hp=Math.max(0,n.hp-m.damage*(n.kind==='gunner'&&n.overheat>0?1.5:1));
    if(n.kind!=='gunner')n.x=clamp(n.x+p.face*m.push*(boss?.24:1),s.arenaLeft+32,s.arenaLeft+740);
    if(!armored){n.wind=0;n.stun=n.kind==='lizard'?.19:m===moves.uppercut||m===moves.sweep?.65:.32;n.cool=Math.max(n.cool,.18);}
    spark(s,n.x,n.y-49,'hit');s.hitstop=.024;s.events.push('hit');
    s.combo=s.comboTime>0?s.combo+1:1;s.comboTime=1.45;s.score+=m.damage*7;
    if(n.hp<=0&&n.kind==='scientist'){n.hp=1;n.morph=1.8;n.stun=0;activity(n,'morph');s.shots=[];s.events.push('morph');}
    else if(n.hp<=0){n.fall=.65;activity(n,'fall');s.score+=150;s.events.push('knockout');}
    else if(!armored){activity(n,'hurt');n.age=0;}
  }
  function hurt(s,source,damage){
    const p=s.player;if(p.immune>0||p.hp<=0)return;
    if(p.act==='guard'&&(source.x-p.x)*p.face>=-5){p.immune=.16;spark(s,p.x+p.face*20,p.y-56,'block');s.events.push('block');return;}
    p.hp=Math.max(0,p.hp-damage);p.stun=.33;p.immune=.72;p.attack=null;s.combo=0;activity(p,p.hp?'hurt':'fall');p.age=0;
    spark(s,p.x,p.y-45,'hurt');s.events.push('hurt');if(!p.hp)s.mode='down';
  }
  function fighter(s,i,dt){
    const p=s.player,dx=(i.right?1:0)-(i.left?1:0),dy=(i.down?1:0)-(i.up?1:0);
    const startX=p.x,startY=p.y;p.stepping=false;
    p.age+=dt;p.stun=Math.max(0,p.stun-dt);p.immune=Math.max(0,p.immune-dt);p.chainTime-=dt;
    if(p.z>0||p.vz>0){p.z=Math.max(0,p.z+p.vz*dt);p.vz-=935*dt;if(!p.z)p.vz=0;}
    if(p.stun>0)return;
    if(!p.attack){
      if(dx)p.face=dx;
      if(i.jump&&!p.z&&!p.vz){p.vz=350;p.z=.1;s.events.push('jump');}
      let move=i.attack;
      if(move==='jab'){p.chain=p.chainTime>0?(p.chain+1)%3:0;move=['jab','cross','uppercut'][p.chain];p.chainTime=.83;}
      if(p.z>0&&move)move='airkick';
      if(move&&moves[move])startAttack(p,move);
    }
    if(p.attack){
      const a=p.attack,m=moves[a.name];a.t+=dt;p.age=a.t;
      if(a.name==='airkick')p.x+=p.face*105*dt;
      if(!a.hit&&a.t>=m.impact){a.hit=true;s.events.push('swing');
        hitSupplies(s,m);
        for(const n of s.enemies){const ahead=(n.x-p.x)*p.face;
          if(n.hp>0&&!n.entry&&!n.morph&&ahead>=-19&&ahead<=m.reach+(n.kind==='lizard'?18:0)&&Math.abs(n.y-p.y)<=m.depth)damageEnemy(s,n,m);}
      }
      if(a.t>=m.duration){p.attack=null;activity(p,'idle');}
    }else{
      const guarding=i.guard&&!p.z;activity(p,p.z?'jump':guarding?'guard':dx||dy?'walk':'idle');
      const norm=Math.hypot(dx,dy)||1,speed=guarding?90:286;
      p.x+=dx*speed/norm*dt;p.y=clamp(p.y+dy*speed*.72/norm*dt,306,429);
    }
    p.x=clamp(p.x,s.locked?s.arenaLeft+24:Math.max(28,s.cam+22),s.locked?s.arenaLeft+768:worldEnd-60);
    if(p.act==='walk'||p.act==='guard'){
      groundStep(p,startX,startY,dt);
      if(!p.stepping&&p.act==='walk')activity(p,'idle');
    }else if(p.act==='idle')groundStep(p,p.x,p.y,dt);
    else p.gaitWeight=0;
    collectSupplies(s);
    for(const f of s.food)if(!f.used&&Math.abs(p.x-f.x)<32&&Math.abs(p.y-f.y)<22){f.used=true;p.hp=Math.min(100,p.hp+28);s.events.push('heal');}
  }
  function gunner(s,n,dt){
    const p=s.player;
    if(n.overheat>0){activity(n,'hurt');return;}
    if(n.volley>0){
      n.volley-=dt;n.shotTimer-=dt;
      if(n.shotTimer<=0){
        const y=n.aimY+(n.round-3)*11;
        s.shots.push({kind:'shoot',x:n.x+36*n.face,y:n.y,dir:n.face,vy:(y-n.y)*500/n.aimDistance,age:0,speed:500,damage:11});
        n.shotTimer+=.13;n.round++;s.events.push('shot');
      }
      if(n.volley<=0){n.overheat=1.7;n.cool=.35;s.events.push('overheat');}return;
    }
    if(n.wind>0){n.wind-=dt;if(n.wind<=0){n.volley=.90;n.shotTimer=0;n.round=0;activity(n,'throw');}return;}
    n.face=p.x<n.x?-1:1;n.cool-=dt;activity(n,'idle');
    if(n.cool<=0){n.wind=foes.gunner.wind;n.aimY=p.y;n.aimDistance=Math.max(90,Math.abs(p.x-n.x));activity(n,'guard');s.events.push('wind');}
  }
  function enemy(s,n,dt){
    n.age+=dt;if(n.kind==='jet')n.hoverAge+=dt;
    if(n.entry){arrive(n,dt);return;}
    if(n.morph>0){n.morph-=dt;if(n.morph<=0){Object.assign(n,{kind:'lizard',hp:foes.lizard.hp,maxHp:foes.lizard.hp,cool:1,wind:0,age:0,act:'idle',morph:0});s.events.push('roar');}return;}
    if(n.hp<=0){n.fall-=dt;return;}
    if(n.kind==='jet')n.z=13+Math.sin(n.hoverAge*6)*5;
    if(n.overheat>0)n.overheat-=dt;if(n.exposed>0)n.exposed-=dt;
    if(n.stun>0){n.stun-=dt;return;}
    if(n.kind==='gunner'){gunner(s,n,dt);return;}
    const p=s.player,cfg=foes[n.kind],dx=p.x-n.x,dy=p.y-n.y;n.cool-=dt;
    if(n.dash>0){n.dash-=dt;n.x=clamp(n.x+n.face*470*dt,s.arenaLeft+24,s.arenaLeft+748);
      if(Math.abs(dx)<53&&Math.abs(dy)<22&&p.z<31&&!n.connected){hurt(s,n,cfg.damage);n.connected=true;}
      if(n.dash<=0){n.stun=.52;n.exposed=.82;activity(n,'hurt');}return;}
    if(n.wind>0){
      n.wind-=dt;
      if(n.wind<=0){n.strike=.25;activity(n,n.move);n.age=0;
        if(n.move==='charge'){n.dash=.45;n.connected=false;}
        else if(n.move==='throw'||n.move==='shoot'||n.move==='pulse'){
          const count=n.kind==='warden'?3:1;
          for(let j=0;j<count;j++)s.shots.push({kind:n.move,x:n.x+28*n.face,y:n.y,dir:n.face,age:-j*.095,damage:cfg.damage});
          s.events.push(n.move==='throw'?'vial':'shot');
        }
        else{const reach=n.move==='pounce'?146:cfg.reach;if(n.move==='pounce')n.x=clamp(n.x+n.face*40,s.arenaLeft+24,s.arenaLeft+745);
          if((n.move==='sweep'||dx*n.face>-25)&&Math.abs(dx)<reach+14&&Math.abs(dy)<(n.move==='sweep'?33:23)&&!(p.z>33&&n.move!=='uppercut'))hurt(s,n,cfg.damage);}
        n.cool=n.kind==='knife'?.68:n.kind==='lizard'?.72:1.05;
      }return;
    }
    if(n.strike>0){n.strike-=dt;return;}
    n.face=dx<0?-1:1;
    const ranged=n.kind==='jet'||(n.kind==='rifle'||n.kind==='warden')&&n.turn%2===0;
    const range=n.kind==='blackWolf'&&n.turn%2===0?210:ranged?168:n.kind==='lizard'&&n.turn%2===1?146:cfg.reach;
    if(Math.abs(dx)<range&&Math.abs(dy)<19&&n.cool<=0){
      switch(n.kind){
        case 'blackWolf':n.move=n.turn%2?'jab':'charge';break;
        case 'robot':n.move='pulse';break;
        case 'scientist':n.move='throw';break;
        case 'lizard':n.move=n.turn%2?'pounce':'sweep';break;
        default:n.move=ranged?'shoot':n.kind==='warden'?'bash':n.kind==='knife'?'slash':'jab';
      }
      n.turn++;
      n.wind=cfg.wind;activity(n,'guard');n.age=0;s.events.push('wind');return;
    }
    const startX=n.x,startY=n.y;
    const tooClose=n.kind==='jet'?122:(n.kind==='scientist'||n.kind==='rifle')&&n.cool>.18?85:32;
    if(Math.abs(dx)<tooClose&&Math.abs(dy)<32)n.x-=n.face*cfg.speed*dt;
    else if(Math.abs(dx)>range*.74)n.x+=n.face*cfg.speed*dt;
    if(Math.abs(dy)>5)n.y+=Math.sign(dy)*cfg.speed*.72*dt;
    for(const other of s.enemies){
      if(other===n||other.entry||other.hp<=0)continue;
      const gapX=n.x-other.x,gapY=n.y-other.y;
      const overlap=(1-Math.abs(gapX)/46)*(1-Math.abs(gapY)/19);
      if(Math.abs(gapX)<46&&Math.abs(gapY)<19){
        n.x+=(Math.sign(gapX)||Math.sign(n.id-other.id))*90*overlap*dt;
        n.y+=(Math.sign(gapY)||Math.sign(n.id-other.id))*26*overlap*dt;
      }
    }
    n.x=clamp(n.x,s.arenaLeft+20,s.arenaLeft+748);n.y=clamp(n.y,306,429);
    activity(n,Math.hypot(n.x-startX,n.y-startY)>.001?'walk':'idle');
  }
  function update(s,input={},dt){
    s.events=[];if(s.mode!=='play')return s.events;dt=Math.min(.05,dt);s.age+=dt;
    s.shake=Math.max(0,s.shake-28*dt);s.sparks=s.sparks.filter(f=>(f.t-=dt)>0);
    if(s.hitstop>0){s.hitstop-=dt;return s.events;}
    s.comboTime-=dt;if(s.comboTime<=0)s.combo=0;
    fighter(s,input,dt);
    const gate=waves[s.wave];if(!gate)return s.events;
    if(!s.locked&&s.player.x>=gate.x-80){
      s.locked=true;s.arenaLeft=clamp(gate.x-375,0,worldEnd-810);s.waveTime=0;
      s.pending=gate.cast.map((_,i)=>({i,at:.12+i*(.72+(s.wave%3)*.18)}));s.events.push('wave');
    }
    const target=clamp(s.locked?s.arenaLeft-96+(s.player.x-s.arenaLeft-320)*.30:Math.max(s.cam,s.player.x-374),0,maxCam);
    const follow=(target-s.cam)*(1-Math.exp(-7*dt));
    s.cam+=clamp(follow,-340*dt,340*dt);
    if(s.locked){
      s.waveTime+=dt;
      while(s.pending.length&&s.pending[0].at<=s.waveTime){
        const {i}=s.pending.shift();s.enemies.push(spawn(s,gate.cast[i],i));s.events.push('arrival');
      }
    }
    for(const n of s.enemies){
      const x=n.x,y=n.y;enemy(s,n,dt);
      if(n.act==='idle'||n.act==='walk')groundStep(n,x,y,dt);
      else{n.stepping=false;n.gaitWeight=0;}
    }
    for(const b of s.shots){b.age+=dt;if(b.age<0)continue;b.x+=b.dir*(b.speed||(b.kind==='shoot'?460:270))*dt;b.y+=(b.vy||0)*dt;if(Math.abs(b.x-s.player.x)<19&&Math.abs(b.y-s.player.y)<22&&s.player.z<44){hurt(s,b,b.damage||9);b.age=9;}}
    s.shots=s.shots.filter(b=>b.age<2.8);
    s.enemies=s.enemies.filter(n=>n.hp>0||n.fall>0);
    if(s.locked&&!s.enemies.length&&!s.pending.length&&s.mode==='play'){
      s.locked=false;s.wave++;s.clears++;s.shots=[];s.score+=400;s.events.push('clear');
      if(s.wave===waves.length){s.mode='won';activity(s.player,'win');}
      else{if(s.wave%2===0){s.checkpoint=s.wave;s.checkpointScore=s.score;s.checkpointSupplies=supplySnapshot(s.supplies);s.events.push('checkpoint');}
        s.food=[{x:clamp(s.player.x+62,s.cam+32,worldEnd-50),y:s.player.y,used:false}];}
    }
    return s.events;
  }
  function checkpoint(s){return {version:2,checkpoint:s.checkpoint,score:s.checkpointScore,supplies:s.checkpointSupplies};}
  const api={zones,waves,moves,foes,supplies,stepSpan,floorScale,scaleAt,maxCam,portal,zoneOf,create,update,checkpoint};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeQuimera=api;
})(typeof window!=='undefined'?window:globalThis);
