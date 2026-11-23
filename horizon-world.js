(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const Rig=node?require('./oil-rig'):root.ArcadeOilRig,Patrol=node?require('./delta-patrol'):root.ArcadeDeltaPatrol;
  const Cenit=node?require('./cenit-combat'):root.ArcadeCenit;
  const TAU=2*Math.PI,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const approach=(a,b,rate,dt)=>mix(a,b,1-Math.exp(-rate*dt));
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const riverLength=9600,turnAt=3650,orbitLength=360;
  const center=z=>34*Math.sin(z/155)+49*Math.sin(z/365+.6);
  const canal=z=>ease((z-2920)/450)*ease((6700-z)/450);
  const breadth=z=>mix(51+6*Math.sin(z/275),36+5*Math.sin(z/210),canal(z));
  const swell=(x,z,t)=>.50*Math.sin(z*.079-t*2.1)+.26*Math.sin(x*.21+z*.033-t*2.7);
  const items=[];
  for(let k=0;k<36;k++){
    const z=235+k*255,side=[-1,1,1,-1,-1,1][k%6],lane=side*(12+5*Math.sin(k*1.7));

    if(k%3===1)items.push({id:'ramp'+k,kind:'ramp',z:z+108,x:center(z+108)+lane});
    if(k>1&&k%3!==0)items.push({id:'mine'+k,kind:'mine',z:z+70,x:center(z+70)-lane*.7});
  }
  function create(level,difficulty=1){
    return {level,difficulty,phase:'play',t:0,route:0,checkpoint:0,score:0,awards:new Set(),events:[],fx:[],hp:100,grace:0,
      player:{x:level===9?center(0):0,y:level===9?0:34,z:0,yaw:0,pitch:0,roll:0},
      speed:level===9?53:70,lane:0,slide:0,air:0,vy:0,boost:1,boosting:false,usingBoost:false,
      rivals:[],wave:0,rig:null,
      blend:0,lead:0,nextWave:0,enemies:[],shots:[],nextId:1,gun:0,missile:0,locked:null,lockTime:0,
      flightTime:0,carrier:false,kills:0,bonusMessage:0,shieldFlash:0};
  }
  function award(s,id,points){
    if(s.awards.has(id))return;s.awards.add(id);s.score+=points;s.events.push({type:'points',points,id});
  }
  function cue(s,text){s.events.push({type:'radio',text});}
  function checkpoint(s,value,text){if(s.checkpoint>=value)return;s.checkpoint=value;cue(s,text);s.events.push({type:'checkpoint'});}
  function burst(s,obj,color,count=12){
    for(let i=0;i<count;i++){const a=i*2.399+s.t,n=(i%5+2)*1.6;
      s.fx.push({x:obj.x,y:obj.y||1,z:obj.z,vx:Math.cos(a)*n,vy:2+i%7,vz:Math.sin(a)*n,life:.48+i%6*.12,max:1.15,color});}
  }
  function hurt(s,dmg){
    if(s.grace>0||s.god||s.phase!=='play')return;
    s.hp=Math.max(0,s.hp-dmg*s.difficulty);s.grace=1.35;s.shieldFlash=.35;s.events.push({type:'hurt'});
    if(!s.hp){s.reason=s.rig?'Cap ha caído en la plataforma.':s.level===9?'El casco no resistió el impacto.':'El interceptor perdió el blindaje.';s.phase='lost';s.events.push({type:'lost'});}
  }
  function win(s){
    if(s.phase!=='play')return;s.phase='won';award(s,'finish',s.level===9?3200:6500);s.events.push({type:'won'});
  }
  function waterTrail(boat,time,yaw,air=0){
    const trail=boat.wakeTrail||(boat.wakeTrail=[]);
    if(trail.length&&time-trail[0].t<.055)return;
    trail.unshift({x:boat.x-Math.sin(yaw)*2.4,z:boat.z-Math.cos(yaw)*2.4,yaw,t:time,wet:air<.45});
    if(trail.length>19)trail.pop();
  }
  function position(s){return 1+s.rivals.filter(r=>r.z>s.route).length;}
  function boat(s,i,dt){
    const p=s.player,old=s.route,steer=i.x||0;
    if(!i.boost)s.usingBoost=false;
    s.boosting=!!i.boost&&!s.usingBoost&&s.boost>0;
    s.boost=clamp(s.boost+(s.boosting?-.31:.055)*dt,0,1);if(!s.boost)s.usingBoost=true;
    const target=s.boosting?142:i.y<-.25?106:i.y>.25?63:92;
    s.speed=approach(s.speed,target,s.boosting?2.8:1.25,dt);
    s.slide=approach(s.slide,steer*(s.air>0?32:54),s.air>0?1.2:4.1,dt);
    s.route+=s.speed*dt;s.lane+=s.slide*dt-.78*(center(s.route)-center(old));
    const width=breadth(s.route)-3;
    if(Math.abs(s.lane)>width){s.lane=clamp(s.lane,-width,width);s.slide*=-.28;s.speed=Math.min(s.speed,74);hurt(s,10);}
    p.x=center(s.route)+s.lane;p.z=s.route;
    if(s.air>0||s.vy>0){s.vy-=24*dt;s.air=Math.max(0,s.air+s.vy*dt);if(!s.air){s.vy=0;s.events.push({type:'splash'});burst(s,p,'#d3f7e8');}}
    const ramp=items.find(o=>o.kind==='ramp'&&o.z>=s.route&&o.z-s.route<14&&Math.abs(p.x-o.x)<7);
    const lift=ramp?2.1*(1-(ramp.z-s.route)/14):0;
    p.yaw=Math.atan2(center(s.route+4)-center(s.route-4),8)+s.slide*.008;
    p.roll=approach(p.roll,-steer*.26+Math.sin(s.route*.09)*.035,5,dt);
    for(const obj of items){
      if(obj.z<old||obj.z>=s.route)continue;
      const dx=Math.abs(p.x-obj.x);
      if(obj.kind==='ramp'&&dx<7&&s.air<1){s.vy=6+s.speed*.016;s.air=2.1;award(s,obj.id,260);s.events.push({type:'jump'});}
      if(obj.kind==='mine'&&dx<5&&s.air<2.5){hurt(s,19);s.speed*=.76;burst(s,p,'#ffad64');}
    }
    const elevation=Math.max(lift,s.air);
    p.y=swell(p.x,p.z,s.t)+elevation;
    const pitch=s.air>0?clamp(s.vy*.018,-.15,.17):lift>0?.15:.045*Math.cos(s.route*.079-s.t*2.1);
    p.pitch=approach(p.pitch,pitch,5,dt);
    waterTrail(p,s.t,p.yaw,elevation);
    Patrol.update(s,i,dt,{center,breadth,swell,clamp,award,hurt,burst,riverLength});
    for(const n of s.rivals)if(n.hp>0)waterTrail(n,s.t,Math.atan2(center(n.z+4)-center(n.z-4),8)+(n.heading<0?Math.PI:0));
    if(s.route>=3200)checkpoint(s,1,'Vega · Entran patrulleras por popa. El torpedo sigue al contacto más cercano.');
    if(s.route>=6400)checkpoint(s,2,'Vega · Torre petrolera a la vista. Atraca bajo la grúa amarilla.');
    if(s.route>=riverLength&&s.phase==='play'){
      s.route=riverLength;s.speed=0;s.boosting=false;s.rivals=[];s.shots=[];s.fx=[];
      s.rig=Rig.create(3,s.difficulty);s.hp=100;s.grace=2;
      checkpoint(s,3,'Cap · Estoy a bordo. Subo al control de la torre.');
      s.events.push({type:'board'});
    }
  }
  function direction(yaw,pitch){const c=Math.cos(pitch);return{x:Math.sin(yaw)*c,y:Math.sin(pitch),z:Math.cos(yaw)*c};}
  function targetInfo(p,n){
    const x=n.x-p.x,y=n.y-p.y,z=n.z-p.z,d=Math.hypot(x,y,z)||1,f=direction(p.yaw,p.pitch);
    return {d,dot:(x*f.x+y*f.y+z*f.z)/d};
  }
  // Rear silhouette in flight units, measured about the illuminated core.
  // Each station gives the lateral coordinate and the bottom and top of the armor.
  const carrierHull=[[-48,0,1],[-38,-1,6],[-31,-8,7],[-27,-5,8],[-21,-11,9],[-11,-5,12],
    [-4,-7,17],[0,-8,22],[8,-5,28],[17,-11,20],[21,-12,17],[27,-6,11],[33,-9,10],[42,-1,7],[52,1,3]];
  function carrierImpact(b,n,dt){
    const f=direction(n.yaw,0),dx=b.x-n.x,dz=b.z-n.z;
    const depth=dx*f.x+dz*f.z,advance=(b.vx*f.x+b.vz*f.z)*dt,previous=depth-advance;
    if(Math.min(previous,depth)>2||Math.max(previous,depth)<-2)return 0;
    const back=advance?clamp(depth/advance,0,1)*dt:0;
    const x=(dx-b.vx*back)*f.z-(dz-b.vz*back)*f.x,y=b.y-n.y-b.vy*back;
    if(Math.hypot(x,y)<=4.4)return b.damage*2;
    const i=carrierHull.findIndex(v=>v[0]>=x);if(i<1)return 0;
    const [a,lo,hi]=carrierHull[i-1],[z,low,high]=carrierHull[i],t=(x-a)/(z-a);
    return y>=mix(lo,low,t)&&y<=mix(hi,high,t)?b.damage:0;
  }
  // Screen-space stations are expressed in scroll coordinates. Moving the
  // interceptor forward or sideways never drags these aircraft along with it.
  const stations=[[-56,47],[0,57],[56,47]];
  function spawnWave(s){
    const wave=s.nextWave++,p=s.player,top=s.route<turnAt,dir=direction(p.yaw,0);
    let ordinal=0;
    function wing(mission,slot,side,dist){
      const j=ordinal++,model=Cenit.fleet[(mission==='pass'?wave+2:wave*2+j)%Cenit.fleet.length];
      const x=top?side:p.x+dir.x*dist+dir.z*side,z=top?s.route+dist:p.z+dir.z*dist-dir.x*side;
      s.enemies.push({id:'wing'+wave+'-'+j,kind:model.hp>=6?'hunter':'escort',model:model.id,mission,slot,fromRear:true,side,entryDepth:dist,
        x,y:top?34:p.y+Math.sin(wave+j)*6,z,yaw:p.yaw,
        phase:j+wave,age:0,fire:1.6+j*.53,hp:Math.ceil(model.hp*s.difficulty),flash:0,settled:false});
    }
    if(top){
      for(let slot=0;slot<stations.length;slot++){
        if(s.enemies.some(n=>n.mission==='station'&&n.slot===slot&&n.hp>0))continue;
        const lane=slot===1?(wave%2?-32:32):stations[slot][0]*1.36;
        wing('station',slot,lane,-85-slot*12);
      }
      if(wave>0)wing('pass',null,wave%2?-78:78,-119);
    }else{
      const side=wave%2?-1:1;
      wing('overtake',null,side*24,-94);
      wing('overtake',null,-side*39,-147);
    }
    if(ordinal)s.events.push({type:'rearWing'});
  }
  function escort(s,n,dt){
    const p=s.player;
    if(!s.carrier&&s.route<turnAt&&(n.mission==='station'||n.mission==='pass')){
      if(n.mission==='pass'){
        n.z+=(s.speed+38)*dt;
        const ahead=n.z-s.route;n.yaw=Math.PI*ease((ahead-12)/30);
        return ahead>35&&ahead<58;
      }
      const [x,depth]=stations[n.slot],offset=n.z-(s.route-s.speed*dt);
      const travel=Math.sign(depth-offset)*Math.min(Math.abs(depth-offset),49*dt);
      n.x=mix(n.side,x,ease((offset+travel-8)/(depth-8)));n.z=s.route+offset+travel;
      if(n.fromRear)n.yaw=Math.PI*ease((offset-depth+37)/37);
      if(!n.settled&&Math.abs(offset+travel-depth)<.01){n.settled=true;n.fire=.95+n.slot*.63;}
      return n.settled;
    }
    if(n.mission==='station'||n.mission==='pass'){
      n.mission='intercept';n.age=0;n.fire=2.7;
    }
    if(n.mission==='overtake'){
      const start=n.entryDepth??-94;
      const f=direction(p.yaw,0),t=clamp(n.age/(3.4+(-94-start)/56),0,1),ahead=mix(start,106,ease(t));
      const side=n.side*(1+.22*Math.sin(Math.PI*t));
      n.x=p.x+f.x*ahead+f.z*side;n.z=p.z+f.z*ahead-f.x*side;
      n.y=approach(n.y,p.y+5,2,dt);n.yaw=p.yaw;
      if(t===1){n.mission='intercept';n.fire=1.15;}
      return false;
    }
    if(s.blend<.05&&s.route<turnAt){n.z-=16*dt;return true;} // Older saves with a passing wave.
    const dx=p.x-n.x,dz=p.z-n.z;
    const m=Cenit.model(n),weave=m.id==='espectro'||m.id==='avispa'?.33*Math.sin(n.age*1.7+n.phase):0;
    const desired=s.carrier?n.yaw:Math.atan2(dx,dz)+weave;
    n.yaw=angle(n.yaw+clamp(angle(desired-n.yaw),-m.turn,m.turn)*dt);
    const speed=s.carrier?102:m.speed;
    n.x+=Math.sin(n.yaw)*speed*dt;n.z+=Math.cos(n.yaw)*speed*dt;
    n.y+=clamp(p.y-n.y,-12,12)*dt*.4;
    const inSights=dx*Math.sin(n.yaw)+dz*Math.cos(n.yaw)>.65*Math.hypot(dx,dz);
    return !s.carrier&&inSights&&targetInfo(p,n).dot>.47&&n.age>1.5;
  }
  function spawnCarrier(s){
    s.carrier=true;const p=s.player,f=direction(p.yaw,0);
    s.enemies.push({id:'cenit',kind:'carrier',anchored:true,x:p.x+f.x*240,y:clamp(p.y+9,43,100),z:p.z+f.z*240,yaw:p.yaw,
      age:0,fire:2.1,phase:0,combatRevision:2,hp:Cenit.armor(s.difficulty),maxHp:Cenit.armor(s.difficulty),salvo:0,attack:null,flash:0});
    cue(s,'Vega · El Cénit mantiene posición. Esquiva la descarga. El núcleo pierde blindaje al enfriarse.');s.events.push({type:'boss'});
  }
  function fire(s,from,dir,speed,kind,enemy=false,target=null){
    s.shots.push({x:from.x,y:from.y,z:from.z,vx:dir.x*speed,vy:dir.y*speed,vz:dir.z*speed,
      kind,enemy,target,life:kind==='missile'?4:enemy?4:2,damage:kind==='missile'?8:1});
  }
  function moveJet(s,i,dt){
    const p=s.player,b=s.blend;
    s.lead=clamp(s.lead-(i.y||0)*45*(1-b)*dt,-32,34);
    const yawRate=(i.x||0)*1.12*b;p.yaw=angle(p.yaw+yawRate*dt);
    const requestedPitch=-(i.y||0)*.53*b;
    p.pitch=approach(p.pitch,requestedPitch,3.5,dt);p.roll=approach(p.roll,-(i.x||0)*mix(.48,.98,b),4.6,dt);
    s.speed=approach(s.speed,i.boost?108:72,2,dt);const f=direction(p.yaw,p.pitch);
    p.x+=((i.x||0)*62*(1-b)+f.x*s.speed*b)*dt;
    if(b<.01)p.x=clamp(p.x,-91,91);
    p.y=clamp(p.y+f.y*s.speed*b*dt,14,120);
    s.route+=s.speed*dt;p.z+=f.z*s.speed*dt-(i.y||0)*45*(1-b)*dt;
    if(b===0)p.z=s.route+s.lead;
  }
  function approachCarrier(s,b,i,dt){
    const p=s.player,f=direction(b.yaw,0),dx=p.x-b.x,dz=p.z-b.z;
    const range=-(dx*f.x+dz*f.z),lateral=dx*f.z-dz*f.x;
    const side=clamp(lateral+(i.x||0)*59*dt,-67,67);
    const distance=approach(range,i.boost?105:154,1.05,dt);
    p.x=b.x-f.x*distance+f.z*side;p.z=b.z-f.z*distance-f.x*side;
    const bearing=Math.atan2(b.x-p.x,b.z-p.z);
    p.yaw=angle(p.yaw+angle(bearing+(i.x||0)*.065-p.yaw)*(1-Math.exp(-4*dt)));
    p.pitch=approach(p.pitch,-(i.y||0)*.43,3.5,dt);
    p.y=clamp(p.y+Math.sin(p.pitch)*63*dt,Math.max(14,b.y-41),Math.min(120,b.y+38));
    p.roll=approach(p.roll,-(i.x||0)*.62,4.6,dt);
    s.speed=approach(s.speed,i.boost?108:72,2,dt);s.route+=s.speed*dt;
  }
  function weapons(s,i,dt){
    const p=s.player,f=direction(p.yaw,p.pitch);
    let best=null,rank=-Infinity;
    for(const n of s.enemies){if(n.hp<=0)continue;const {d,dot}=targetInfo(p,n);
      if(d<510&&dot>(n.kind==='carrier'?.981:s.blend>.5?.935:.96)&&dot-d/15000>rank){rank=dot-d/15000;best=n;}}
    if(s.locked!==best?.id)s.lockTime=0;s.locked=best?.id||null;s.lockTime=best?Math.min(1,s.lockTime+dt*1.6):0;
    s.gun-=dt;s.missile-=dt;
    if(i.fire&&s.gun<=0){
      for(const side of [-1,1]){
        const from={x:p.x+f.x*6+Math.cos(p.yaw)*side*3,y:p.y+f.y*6,z:p.z+f.z*6-Math.sin(p.yaw)*side*3};
        fire(s,from,f,240+s.speed,'tracer');
      }s.gun=.14;s.events.push({type:'gun'});
    }
    if(i.special&&s.missile<=0&&s.lockTime>=1&&best){fire(s,p,f,195,'missile',false,best.id);s.missile=2.2;s.events.push({type:'missile'});}
  }
  function flight(s,i,dt){
    const p=s.player;s.blend=ease((s.route-turnAt)/orbitLength);
    const carrier=s.carrier&&s.enemies.find(n=>n.kind==='carrier');
    if(carrier&&carrier.defeat!=null){
      const before=carrier.defeat;carrier.defeat+=dt;
      if(before<1.53&&carrier.defeat>=1.53)s.events.push({type:'hullBreak'});
      if(carrier.defeat>=Cenit.collapseLength)win(s);
      return;
    }
    if(carrier)approachCarrier(s,carrier,i,dt);else moveJet(s,i,dt);
    if(s.route>=turnAt&&s.checkpoint===0)checkpoint(s,1,'Vega · Rompe formación. ← → para virar, ↑ ↓ para cambiar de altura.');
    if(s.blend>=1)s.flightTime+=dt;
    if(s.flightTime>32&&!s.carrier){checkpoint(s,2,'Cap · Contacto sobre la caldera. Ahí está la antena.');spawnCarrier(s);}
    if(!s.carrier&&s.nextWave<Math.min(13,1+Math.floor(s.route/555)))spawnWave(s);
    weapons(s,i,dt);
    for(const n of s.enemies){
      n.age+=dt;n.flash=Math.max(0,n.flash-dt);n.fire-=dt;
      if(n.kind==='carrier'){Cenit.updateBoss(s,n,dt,fire);continue;}
      if(escort(s,n,dt)&&n.fire<=0){
        const distance=targetInfo(p,n).d;
        if(distance>15&&distance<410)Cenit.wingFire(s,n,fire);
      }
    }
    for(const b of s.shots){
      const aim=b.target&&s.enemies.find(n=>n.id===b.target&&n.hp>0);
      if(aim){const dx=aim.x-b.x,dy=aim.y-b.y,dz=aim.z-b.z,d=Math.hypot(dx,dy,dz)||1;
        b.vx=approach(b.vx,dx/d*225,6,dt);b.vy=approach(b.vy,dy/d*225,6,dt);b.vz=approach(b.vz,dz/d*225,6,dt);}
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.life-=dt;
      if(b.enemy){
        if(Math.hypot(b.x-p.x,b.y-p.y,b.z-p.z)<(b.kind==='plasma'?5.1:4.1)){hurt(s,b.kind==='plasma'?17:12);b.life=0;}continue;
      }
      for(const n of s.enemies){
        if(n.hp<=0)continue;
        const damage=n.kind==='carrier'?carrierImpact(b,n,dt):Math.hypot(b.x-n.x,b.y-n.y,b.z-n.z)<5.5?b.damage:0;
        if(!damage)continue;
        n.hp-=n.kind==='carrier'&&n.attack?damage*.32:damage;n.flash=.16;b.life=0;
        if(n.hp<=0){
          n.hp=0;s.kills++;s.events.push({type:'blast'});award(s,n.id,n.kind==='carrier'?2400:250);
          if(n.kind==='carrier'){n.defeat=0;n.attack=null;s.events.push({type:'cenitDown'});}
          else s.fx.push({x:n.x,y:n.y,z:n.z,vx:0,vy:0,vz:s.speed*(1-s.blend),max:.76,life:.76,explosion:true});
        }
        break;
      }
    }
    s.shots=carrier?.defeat!=null?[]:s.shots.filter(b=>b.life>0);
    s.enemies=s.enemies.filter(n=>n.defeat!=null||n.hp>0&&(n.kind==='carrier'||n.mission==='station'||
      (n.mission==='pass'?n.z-s.route<130:n.age<23)));
    if(s.carrier){
      const boss=s.enemies.find(n=>n.kind==='carrier');
      if(boss&&boss.hp>0&&Math.hypot(boss.x-p.x,boss.y-p.y,boss.z-p.z)<17)hurt(s,16);
    }
  }
  function update(s,input,dt){
    s.events=[];if(s.phase!=='play')return s.events;dt=clamp(dt,0,.05);s.t+=dt;s.grace=Math.max(0,s.grace-dt);s.shieldFlash=Math.max(0,s.shieldFlash-dt);
    if(s.rig)Rig.update(s,input,dt,{hurt,award,win,checkpoint});else if(s.level===9)boat(s,input,dt);else flight(s,input,dt);
    for(const f of s.fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;f.vy-=9*dt;f.life-=dt;}s.fx=s.fx.filter(f=>f.life>0);
    return s.events;
  }
  function snapshot(s){
    const {events,fx,god,...save}=s;
    return {...save,rig:s.rig?JSON.parse(JSON.stringify({...s.rig,loadout:Rig.saveLoadout(s.rig)},(k,v)=>k==='ram'?null:v)):null,version:1,awards:[...s.awards],player:{...s.player},rivals:s.rivals.map(r=>({...r})),enemies:s.enemies.map(n=>({...n})),shots:s.shots.map(b=>({...b}))};
  }
  function restore(level,save,difficulty=1){
    const fresh=create(level,difficulty);if(save?.level!==level||save.version!==1||!Number.isFinite(save.route))return fresh;
    const restored=Object.assign(fresh,save,{difficulty,events:[],fx:[],awards:new Set(save.awards||[]),player:{...fresh.player,...save.player},
      rivals:(save.rivals||fresh.rivals).map(r=>({...r})),enemies:(save.enemies||[]).map(n=>({...n})),shots:(save.shots||[]).map(b=>({...b}))});
    if(level===9){
      restored.rivals=restored.rivals.filter(n=>n.id);
      restored.wave=save.wave??Math.max(0,Math.ceil((save.route-50)/485));
      if(save.rig){
        restored.rig=JSON.parse(JSON.stringify(save.rig));
        Rig.restoreGuards(restored.rig,difficulty);
        const p=restored.rig.p;
        if(p.ground)p.ground=Rig.platforms[p.ground.id];
        if(p.ladder)p.ladder=Rig.ladders[p.ladder.id];
      }
    }
    if(level===10){
      const carrier=restored.enemies.find(n=>n.kind==='carrier');
      if(carrier&&!carrier.combatRevision){
        const fraction=carrier.hp/carrier.maxHp;
        carrier.maxHp=Cenit.armor(difficulty);carrier.hp=Math.ceil(carrier.maxHp*fraction);
        carrier.attack=null;carrier.fire=1.1;carrier.salvo=0;carrier.combatRevision=2;
      }
      if(carrier&&!carrier.anchored){
        const p=restored.player;
        carrier.yaw=Math.atan2(carrier.x-p.x,carrier.z-p.z);carrier.anchored=true;
      }
    }
    return restored;
  }
  function retry(s){
    const next=create(s.level,s.difficulty),cp=s.checkpoint;
    next.checkpoint=cp;next.score=s.score;next.awards=new Set(s.awards);next.grace=5;
    if(s.level===9){next.route=Math.min(cp*3200,riverLength);next.wave=Math.max(0,Math.ceil((next.route-50)/485));if(cp>=3){
        next.rig=Rig.create(cp,s.difficulty);next.rig.arrival=0;next.speed=0;
        if(s.rig){const kit=Rig.saveLoadout(s.rig);if(kit)next.rig.respawnKit={form:s.rig.p.form,inventory:kit.inventory,cooldowns:kit.cooldowns};}
      }next.player.z=next.route;next.player.x=center(next.route);next.rivals.forEach(r=>r.z+=next.route);}
    else if(cp){next.route=cp===1?turnAt:turnAt+orbitLength+2400;next.nextWave=Math.floor(next.route/555);
      next.player.z=next.route;if(cp===2){next.blend=1;next.flightTime=32;spawnCarrier(next);}}
    return next;
  }
  const api={create,update,snapshot,restore,retry,position,center,breadth,canal,swell,items,riverLength,turnAt,orbitLength,direction,targetInfo,angle,ease,clamp,mix};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeHorizon=api;
})(typeof window!=='undefined'?window:globalThis);
