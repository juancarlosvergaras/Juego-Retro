(function(root){
  'use strict';
  const Grenades=typeof module!=='undefined'&&module.exports?require('./grenades'):root.ArcadeGrenades;
  const finish=8050,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const lanes=[-3.4,0,3.4],kinds=['sedan','traffic','truck','turret','traffic','sedan','truck','sedan','turret'];
  function center(z){return 43*Math.sin(z/237)+21*Math.sin(z/121+.7)+65*Math.sin(z/537);}
  function slope(z){return 43/237*Math.cos(z/237)+21/121*Math.cos(z/121+.7)+65/537*Math.cos(z/537);}
  function curvature(z){return -43/237**2*Math.sin(z/237)-21/121**2*Math.sin(z/121+.7)-65/537**2*Math.sin(z/537);}
  const roadblocks=[[680,1],[1910,-1],[3230,1],[4590,-1],[6030,-1],[7390,1]];
  function create(){return {mode:'launch',age:0,time:0,z:0,x:0,vx:0,speed:0,hp:100,nitro:1,boost:false,
    driftSide:0,driftHeld:false,driftBuffer:0,slideTime:0,assistedDrift:false,lastSteer:0,slip:0,skids:[],marking:false,
    posts:roadblocks.map(([z,side])=>({z,side,x:side*3.4,officerX:side*4.65,phase:'watch',reaction:0,steps:0,hitAt:null})),
    boss:{kind:'boss',z:13,x:-2.6,speed:0},cars:[],shots:[],grenades:[],wrecks:0,next:0,immune:0,shake:0,events:[]};}
  function spawn(s){
    const i=s.next++,kind=kinds[i%kinds.length],lane=lanes[(i*7+Math.floor(i/3))%3];
    s.cars.push({id:i,kind,z:105+i*136,x:lane,lane,vx:0,speed:kind==='truck'?34:kind==='traffic'?41:47+i%6,
      width:kind==='truck'?1.35:1,shot:1.4+i%3,flash:0,bump:0,spin:0,crash:0});
  }
  function wreck(s,n){if(n.crash)return;n.crash=.01;n.speed*=.70;s.wrecks++;if(Math.abs(n.z-s.z)<110){s.shake=.16;s.events.push('wreck');}}
  function hurt(s,amount){if(s.respawnProtection>0||s.immune>0)return;s.hp=Math.max(0,s.hp-amount);s.immune=1;s.shake=.25;s.events.push('hurt');}
  function passingLane(posts,z,lane){
    const post=posts.find(p=>p.hitAt===null&&p.z-z<100&&p.z-z> -10&&Math.abs(lane-p.x)<2.6);
    return post?post.x-post.side*3.65:lane;
  }
  function hitsBarrier(p,oldX,oldZ,x,z,width){
    if(p.hitAt!==null||oldZ>p.z||z<p.z)return false;
    const impactX=oldX+(x-oldX)*(p.z-oldZ)/Math.max(.001,z-oldZ);
    return Math.abs(impactX-p.x)<1.30+width;
  }
  function patrols(s,oldX,oldZ,dt){
    for(const p of s.posts){
      const distance=p.z-s.z;
      if(p.phase==='watch'&&distance<clamp(s.speed*1.25,42,115)&&distance>=-2){
        p.phase='alert';p.reaction=.2;
      }else if(p.phase==='alert'){
        p.reaction-=dt;if(p.reaction<=0)p.phase='run';
      }else if(p.phase==='run'){
        const step=Math.min(9.6-Math.abs(p.officerX),5.6*dt);
        p.officerX+=p.side*step;p.steps+=step;
        if(Math.abs(p.officerX)>=9.59)p.phase='safe';
      }
      if(hitsBarrier(p,oldX,oldZ,s.x,s.z,.94)){
        p.hitAt=s.time;p.impactSpeed=s.speed;s.speed*=.80;s.vx-=p.side*2.8;hurt(s,7);s.events.push('barrier');
      }
    }
  }
  function drive(s,i,dt){
    const steer=Number(!!i.right)-Number(!!i.left),off=Math.abs(s.x)>5.55;
    const handbrake=!!(i.drift||(i.brake&&steer));
    if(steer)s.lastSteer=steer;
    if(i.driftTap||(handbrake&&!s.driftHeld))s.driftBuffer=1.05;
    s.driftHeld=handbrake;s.slideTime=Math.max(0,s.slideTime-dt);
    if(s.driftSide&&s.assistedDrift&&steer&&s.slideTime>.20){s.driftSide=steer;s.assistedDrift=false;}
    if(s.driftSide&&(off||s.speed<5||steer*s.driftSide<0||(!handbrake&&!s.slideTime)))s.driftSide=0;
    if(s.driftBuffer>0&&!off&&s.speed>=9&&!s.driftSide){
      s.driftSide=steer||s.lastSteer||Math.sign(curvature(s.z+24))||1;
      s.assistedDrift=!steer;s.slideTime=.48;s.driftBuffer=0;s.events.push('drift');
    }
    s.driftBuffer=Math.max(0,s.driftBuffer-dt);
    const recovering=steer*s.slip<0||off;
    const targetSlip=s.driftSide*(steer?.66:.56);
    s.slip+=(targetSlip-s.slip)*(1-Math.exp(-(s.driftSide?5:recovering?7:3.8)*dt));
    if(!s.driftSide&&Math.abs(s.slip)<.002)s.slip=0;
    s.boost=!!(i.boost&&!i.brake&&!s.driftSide&&Math.abs(s.slip)<.18&&s.nitro>.005);
    s.nitro=clamp(s.nitro+(s.boost?-.22:i.boost?0:.068)*dt,0,1);
    let target=s.boost?99:i.gas?83:62;
    if(s.driftSide)target=i.brake?54:i.gas?74:61;
    else if(i.brake)target=27;
    if(off)target=Math.min(target,47);
    s.speed+=clamp(target-s.speed,-(s.driftSide?14:i.brake?47:24)*dt,(s.boost?28:16)*dt);
    const slip=Math.min(1,Math.abs(s.slip)/.60);
    // With the rear unloaded, steering changes the heading before the tyres regain lateral grip.
    const grip=recovering?6.4:8-6.25*slip;
    const wheel=steer||(s.driftSide*.52);
    s.vx+=(wheel*(4+s.speed*.067)-s.vx)*(1-Math.exp(-grip*dt));
    const slide=s.vx-curvature(s.z)*s.speed*s.speed*(.46+.11*slip);
    s.x=clamp(s.x+slide*dt,-7.35,7.35);s.z+=s.speed*dt;
    if(Math.abs(s.x)>=7.35&&s.x*s.vx>0)s.vx=0;
    if(Math.abs(s.slip)>.11&&!off){
      const last=s.skids.at(-1);
      if(!s.marking||!last||s.z-last.z>=.54){
        s.skids.push({x:s.x,z:s.z,yaw:s.slip,join:s.marking});s.marking=true;
      }
    }else s.marking=false;
    while(s.skids.length&&s.skids[0].z<s.z-12)s.skids.shift();
  }
  function traffic(s,dt){
    while(105+s.next*136<s.z+760)spawn(s);
    for(const n of s.cars){
      const oldZ=n.z,oldX=n.x;
      n.z+=n.speed*dt;n.flash=Math.max(0,n.flash-dt);n.bump=Math.max(0,n.bump-dt);
      if(n.crash){n.crash+=dt;n.spin+=dt*3;n.speed=Math.max(0,n.speed-32*dt);n.x+=n.vx*dt;continue;}
      n.x+=n.vx*dt;n.vx*=Math.exp(-1.8*dt);
      const delta=n.z-s.z,armed=n.kind==='sedan'||n.kind==='turret';
      if(Math.abs(n.x)>6.15){wreck(s,n);continue;}
      if(!n.bump){
        const lane=passingLane(s.posts,n.z,n.lane);
        n.x+=(lane+(armed?.55*Math.sin(s.time*1.1+n.id):0)-n.x)*dt*(lane===n.lane?.8:2.25);
      }
      const post=s.posts.find(p=>hitsBarrier(p,oldX,oldZ,n.x,n.z,n.width));
      if(post){
        post.hitAt=s.time;post.impactSpeed=n.speed;n.speed*=.82;n.bump=.75;n.vx-=post.side*2;
        if(Math.abs(delta)<100)s.events.push('barrier');
      }
      n.shot-=dt;
      if(armed&&delta>10&&delta<105&&n.shot<=0){
        n.flash=.3;n.shot=n.kind==='turret'?1.45:2.4;
        if(n.kind==='sedan'&&!n.justLobbed&&!s.grenades.length&&s.speed>22){
          const flight=.58,fuse=.83,targetZ=s.z+s.speed*(flight+fuse);
          s.grenades.push(Grenades.lob(n.x+1,n.z,1.17,s.x,targetZ,2.65,{flight,fuse,rise:2.3}));
          n.flash=0;n.justLobbed=true;s.events.push('grenade');
        }else{n.justLobbed=false;s.shots.push({z:n.z,x:n.x,vx:(s.x-n.x)*118/(delta+4),speed:s.speed-118});s.events.push('shot');}
      }
      if(Math.abs(delta)<5.1&&Math.abs(n.x-s.x)<n.width+1&&!n.bump){
        const dir=Math.abs(s.vx)>1?Math.sign(s.vx):(n.x>=s.x?1:-1);
        n.bump=1.2;n.vx=dir*(n.kind==='truck'?5:12);n.lane=clamp(n.x+dir*2.6,-5.7,5.7);
        s.vx=-dir*4;s.speed*=n.kind==='truck'?.73:.87;s.x-=dir*.35;hurt(s,n.kind==='truck'?15:8);
        s.events.push('bump');
      }
    }
    for(let i=0;i<s.cars.length;i++)for(let j=i+1;j<s.cars.length;j++){
      const a=s.cars[i],b=s.cars[j];if(a.crash||b.crash||(a.bump&&b.bump)||Math.abs(a.z-b.z)>5||Math.abs(a.x-b.x)>a.width+b.width)continue;
      const dir=a.x>=b.x?1:-1;a.vx=dir*8;b.vx=-dir*8;a.bump=b.bump=1.1;
      if(a.speed>b.speed)a.speed=b.speed-3;else b.speed=a.speed-3;
      if(Math.abs(a.z-s.z)<110)s.events.push('bump');
    }
    s.cars=s.cars.filter(n=>n.z>s.z-26&&n.crash<2.2);
    for(const g of s.grenades){
      if(Grenades.advance(g,dt))s.events.push('blast');
      if(!g.hit&&g.age>=g.flight+g.fuse&&!Grenades.spent(g)&&Grenades.inside(g,s.x,s.z)){
        g.hit=true;hurt(s,13);
      }
    }
    s.grenades=s.grenades.filter(g=>!Grenades.spent(g));
    for(const b of s.shots){const before=b.z-s.z;b.z+=b.speed*dt;b.x+=b.vx*dt;if(before>=-4&&b.z-s.z<=3&&Math.abs(b.x-s.x)<1.1){hurt(s,5);b.hit=true;}}
    s.shots=s.shots.filter(b=>!b.hit&&b.z>s.z-6&&b.z<s.z+200);
  }
  function update(s,i={},dt){
    s.events=[];if(!['launch','race'].includes(s.mode))return;s.age+=dt;
    if(s.mode==='launch'){if(i.driftTap||i.drift)s.driftBuffer=1.05;s.boss.speed=Math.min(90,s.age*46);s.boss.z+=s.boss.speed*dt;
      if(s.age>=2.6){s.mode='race';s.events.push('go');}return;}
    s.time+=dt;s.immune=Math.max(0,s.immune-dt);s.shake=Math.max(0,s.shake-dt);
    const oldX=s.x,oldZ=s.z;
    drive(s,i,dt);patrols(s,oldX,oldZ,dt);
    s.boss.speed=s.boss.z<2420?91:s.boss.z<4290?74:62;
    s.boss.z+=s.boss.speed*dt;
    const lane=2.8*Math.sin(s.boss.z/175);
    s.boss.x+=(passingLane(s.posts,s.boss.z,lane)-s.boss.x)*(1-Math.exp(-2.4*dt));
    traffic(s,dt);
    if(s.hp<=0)s.mode='wrecked';else if(s.boss.z-s.z<=4)s.mode='caught';else if(s.boss.z>=finish)s.mode='escaped';
    if(s.mode!=='race')s.grenades=[];
  }
  const api={create,update,finish,center,slope};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FugaRoad=api;
})(typeof window==='undefined'?globalThis:window);
