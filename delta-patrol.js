(function(root){
  'use strict';
  function mount(p,side,forward=2.9){
    const sin=Math.sin(p.yaw),cos=Math.cos(p.yaw);
    return {x:p.x+sin*forward+cos*side*1.65,y:p.y+1.15,z:p.z+cos*forward-sin*side*1.65};
  }
  function update(s,input,dt,water){
    const {center,swell,clamp,award,hurt,burst}=water,p=s.player;
    if(s.route<water.riverLength-170&&s.route>=50+s.wave*485){
      const wave=s.wave++,rear=wave%3===1,side=wave%2?1:-1;
      function launch(fromRear,j){
        const lane=j?-side*18:side*(9+wave%4*3),z=s.route+(fromRear?-76:300+j*57);
        s.rivals.push({id:'patrol-'+wave+'-'+j,lane,z,x:center(z)+lane,y:0,
          origin:fromRear?'aft':'bow',heading:fromRear?1:-1,age:0,hp:Math.ceil((fromRear?6:4)*s.difficulty),
          reload:fromRear?2.8:1.0,flash:0,baseLane:lane,phase:wave*.7+j});
      }
      launch(rear,0);if(wave%4===2)launch(true,1);
      if(rear||wave%4===2)s.events.push({type:'stern'});
    }
    for(const n of s.rivals){
      n.age+=dt;n.flash=Math.max(0,n.flash-dt);
      if(n.hp<=0){n.sink+=dt;continue;}
      const rel=n.z-s.route;
      n.vz=n.origin==='aft'?s.speed+clamp((70-rel)*.56,-14,54):-25;
      n.z+=n.vz*dt;
      const desired=n.baseLane+Math.sin(n.age*1.1+n.phase)*(n.origin==='aft'?5:3);
      n.lane+=(desired-n.lane)*Math.min(1,dt*1.3);
      n.x=center(n.z)+n.lane;n.y=swell(n.x,n.z,s.t);
      const limit=water.breadth(n.z)-5;
      n.lane=clamp(n.lane,-limit,limit);n.x=center(n.z)+n.lane;
      const dx=n.x-p.x,along=n.z-p.z;
      if(Math.abs(along)<7.8&&Math.abs(dx)<6.5&&s.air<2.6){
        const side=dx===0?(n.baseLane>=s.lane?1:-1):Math.sign(dx);
        const shove=(6.7-Math.abs(dx))*.65;
        n.lane=clamp(n.lane+side*shove,-limit,limit);n.x=center(n.z)+n.lane;
        s.lane=clamp(s.lane-side*shove,-water.breadth(p.z)+4,water.breadth(p.z)-4);p.x=center(p.z)+s.lane;
        if(!n.contact){
          n.contact=true;n.baseLane=clamp(n.lane+side*5,-limit,limit);
          s.slide=-side*19;s.speed*=.70;hurt(s,12);n.hp-=2;n.flash=.22;
          burst(s,{x:(p.x+n.x)/2,y:.2,z:p.z},'#e1ead5',9);s.events.push({type:'ram'});
          if(n.hp<=0){n.sink=0;award(s,n.id,240);s.events.push({type:'blast'});}
        }
      }else if(Math.abs(along)>11||Math.abs(dx)>8)n.contact=false;
      n.reload-=dt;
      // Pursuers must draw alongside and enter the forward view before opening fire.
      if(rel>12&&rel<205&&n.reload<=0){
        const travel=.42+rel/260,destZ=p.z+s.speed*travel;
        const destX=p.x+.22*(center(destZ)-center(p.z))+s.slide*travel*.35;
        s.shots.push({x:n.x,y:n.y+1.25,z:n.z,vx:(destX-n.x)/travel,vz:(destZ-n.z)/travel,enemy:true,kind:'seaBolt',life:travel+.45});
        n.reload=1.35+.4*Math.abs(Math.sin(n.phase));n.muzzle=.22;s.events.push({type:'patrolGun'});
      }
      n.muzzle=Math.max(0,(n.muzzle||0)-dt);
    }
    s.gun-=dt;s.missile-=dt;
    const active=s.rivals.filter(n=>n.hp>0);
    if(input.fire&&s.gun<=0){
      const target=active.filter(n=>n.z>p.z+4&&n.z-p.z<175&&Math.abs(n.lane-s.lane)<13)
        .sort((a,b)=>a.z-b.z)[0];
      let yaw=p.yaw;
      if(target){const t=(target.z-p.z)/Math.max(80,s.speed+210-target.vz),z=target.z+target.vz*t;
        yaw=Math.atan2(center(z)+target.lane-p.x,z-p.z);}
      for(const side of [-1,1])s.shots.push({kind:'seaRound',...mount(p,side),
        vx:Math.sin(yaw)*245,vz:s.speed+Math.cos(yaw)*215,life:1.15,damage:1});
      s.gun=.16;s.events.push({type:'gun'});
    }
    if(input.special&&s.missile<=0){
      const target=active.filter(n=>Math.abs(n.z-p.z)<270).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      const aft=target&&target.z<p.z,dir=aft?-1:1;
      s.shots.push({kind:'torpedo',x:p.x+Math.cos(p.yaw)*2.25,y:.2,z:p.z+dir*3,
        vx:Math.sin(p.yaw)*dir*100,vz:dir>0?s.speed+143:-88,target:target?.id,dir,life:2.8,damage:8});
      s.missile=1.95;s.events.push({type:'torpedo'});
    }
    for(const b of s.shots){
      if(b.kind==='torpedo'){
        const target=active.find(n=>n.id===b.target&&n.hp>0);
        if(target){const dx=target.x-b.x,dz=target.z-b.z,d=Math.hypot(dx,dz)||1,v=185+(dz>0?s.speed*.55:0);
          b.vx+=(dx/d*v-b.vx)*Math.min(1,dt*11);b.vz+=(dz/d*v-b.vz)*Math.min(1,dt*11);}
      }
      b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;
      if(b.kind==='torpedo')b.y=swell(b.x,b.z,s.t)*.65+.24;
      if(b.enemy){if(Math.abs(b.z-p.z)<3.8&&Math.abs(b.x-p.x)<3&&s.air<2.8){hurt(s,7);b.life=0;}continue;}
      const hit=active.find(n=>n.hp>0&&Math.abs(b.z-n.z)<5.9&&Math.abs(b.x-n.x)<4.5&&Math.abs(b.y-n.y)<3.7);
      if(hit){b.life=0;hit.hp-=b.damage;hit.flash=.18;
        if(hit.hp<=0){hit.sink=0;burst(s,hit,'#ffaf69',15);s.events.push({type:'blast'});award(s,hit.id,240);}}
    }
    s.shots=s.shots.filter(b=>b.life>0);
    s.rivals=s.rivals.filter(n=>!(n.sink>.85)&&n.z>s.route-115&&n.age<(n.origin==='aft'?13:18));
  }
  const api={update,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeDeltaPatrol=api;
})(typeof window!=='undefined'?window:globalThis);
