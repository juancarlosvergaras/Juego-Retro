(function(root){
  'use strict';
  const S=729/692;
  const EXTENSION={cut:Math.round(670*S),tileHeight:Math.round(831*S)-Math.round(670*S),count:10};
  EXTENSION.height=EXTENSION.tileHeight*EXTENSION.count;
  const mapY=y=>y>=EXTENSION.cut?y+EXTENSION.height:y;
  const WORLD={top:-400,width:729,height:2158+EXTENSION.height,ground:mapY(Math.round(1905*S)),roof:Math.round(223*S),floors:20};
  const decks=[...[1905,1808,1668,1519,1348,1168,1000,831,670,503,360,223].map(y=>mapY(Math.round(y*S))),...Array.from({length:10},(_,i)=>EXTENSION.cut+i*EXTENSION.tileHeight)].sort((a,b)=>b-a);
  function createPlatforms(){
    // Hand-traced top surfaces in the 692px-wide reference preview, scaled to source.
    const slabs=[[72,223,295,10],[442,223,181,10],[72,360,255,9],[424,360,199,9],[72,503,551,8],[72,670,260,7],[392,670,231,7],[72,831,214,6],[455,831,168,6],[72,1000,240,5],[367,1000,256,5],[72,1168,253,4],[398,1168,225,4],[72,1348,551,3],[72,1519,214,2],[369,1519,254,2],[72,1668,551,1],[298,1808,325,0]];
    const ledges=[[475,1850,111],[127,1775,169],[129,1628,80],[130,1464,59],[267,1464,73],[327,1247,69],[326,1117,69],[508,1105,75],[298,908,72],[130,940,77],[305,808,112],[113,605,110],[325,619,72],[489,619,90],[123,454,88],[345,332,72],[465,320,114]];
    // Top edge of the concrete bundle hanging from the rooftop crane.
    const added=[{x:Math.round(346*S),y:Math.round(155*S),w:Math.round(83*S),kind:'ledge',floor:0,thickness:25,crane:true}];
    for(let i=0;i<EXTENSION.count;i++){
      const y=EXTENSION.cut+i*EXTENSION.tileHeight;
      const layouts=[[[76,210],[475,181]],[[76,180],[320,95],[500,156]],[[76,245],[460,196]],[[76,190],[390,266]],[[76,205],[350,90],[525,131]]];
      for(const [x,w] of layouts[i%5])added.push({x,y,w,kind:'deck',floor:17-i,thickness:19,custom:true});
      for(const [x,offset,w] of (i%2?[[290,58,110],[420,115,100]]:[[335,58,110],[205,115,100]]))added.push({x,y:y+offset,w,kind:'ledge',floor:0,thickness:9,custom:true});
      // Side scaffolds make an alternate jumping route through the upper bays.
      if(i<4)added.push({x:i%2?90:530,y:y+84,w:110,kind:'scaffold',floor:0,thickness:10,custom:true,supportBottom:y+EXTENSION.tileHeight});
    }
    return [{x:0,y:WORLD.ground,w:729,kind:'ground',floor:0,thickness:12},...slabs.map(([x,y,w,floor])=>({x:Math.round(x*S),y:mapY(Math.round(y*S)),w:Math.round(w*S),floor:floor+(y<670?10:0),kind:'deck',thickness:19})),...ledges.map(([x,y,w])=>({x:Math.round(x*S),y:mapY(Math.round(y*S)),w:Math.round(w*S),floor:0,kind:'ledge',thickness:9})),...added,{x:24,y:-140,w:681,kind:'deck',floor:20,thickness:16,custom:true,arena:true}].map((p,id)=>({...p,id}));
  }
  function createLadders(){return [...[[236,1775,1905],[433,1348,1519],[551,1168,1348],[550,1000,1105],[145,831,940],[125,670,831],[533,503,619],[162,360,454],[533,223,320]].map(([x,top,bottom])=>({x:Math.round(x*S),top:mapY(Math.round(top*S)),bottom:mapY(Math.round(bottom*S))})),...[0,3,6,9].map(i=>({x:i%2?570:150,top:EXTENSION.cut+i*EXTENSION.tileHeight,bottom:EXTENSION.cut+(i+1)*EXTENSION.tileHeight,custom:true})),{x:160,top:-140,bottom:235,custom:true,finalAccess:true}].map((l,id)=>({...l,id}));}
  function availableLadders(ladders,encounter){return ladders.filter(l=>!l.finalAccess||encounter.won);}
  function createAnchors(){return createPlatforms().filter(p=>p.kind==='deck').flatMap(p=>[.22,.68].map((t,i)=>({x:Math.round(p.x+p.w*t),y:p.y+p.thickness,ceiling:p.id,id:p.id*2+i})));}
  function createPlayer(){return{fuel:EXTENSION.tileHeight*4,x:145,y:WORLD.ground,w:23,h:46,vx:0,vy:0,facing:1,grounded:true,jumps:0,coyote:.1,buffer:0,slide:0,slideLatch:false,anim:0,ground:null,ladder:null,ladderCooldown:0,rope:null};}
  function findAnchor(p,anchors,platforms=[]){
    if((p.form||'soldier')!=='soldier')return null;
    const direct=!anchors.length,handY=p.y-(direct?hangReach(p):30);
    const blockedByBarricade=a=>platforms.some(s=>{
      if(!s.solid)return false;let lo=0,hi=1;
      const endX=a.x+(p.form==='wolf'?0:p.facing*3.5),endY=a.y+hangReach(p)+3;
      for(const [start,delta,min,max]of [[p.x,endX-p.x,s.x-p.w/2,s.x+s.w+p.w/2],[p.y,endY-p.y,s.y+.01,s.y+s.thickness+p.h-.01]]){
        if(Math.abs(delta)<1e-8){if(start<min||start>max)return false;continue;}
        const a=(min-start)/delta,b=(max-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;
      }return true;
    });
    const targets=direct?platforms.filter(pl=>pl.kind!=='ground'&&!pl.solid).map(pl=>({x:Math.max(pl.x+6,Math.min(pl.x+pl.w-6,p.x)),y:pl.y+(pl.thickness||0),id:pl.id,surface:pl})):anchors;
    return targets.filter(a=>(a.x-p.x)*(p.facing||1)>=0&&a.y<handY-(direct?2:22)&&Math.hypot(a.x-p.x,a.y-handY)<290&&!blockedByBarricade(a)&&!platforms.some(pl=>{const y=pl.y+(pl.thickness||0);if(y<=a.y+.5||y>=handY)return false;const x=p.x+(a.x-p.x)*(y-handY)/(a.y-handY);return x>pl.x&&x<pl.x+pl.w;}))
      .sort((a,b)=>Math.hypot(a.x-p.x,a.y-handY)-Math.hypot(b.x-p.x,b.y-handY))[0]||null;
  }
  function hangReach(p){return p.form==='wolf'?60:[45.58,45.02,45.16,44.04][Math.floor(p.hangCycle||0)%4];}
  function mantle(p,r,dt){
    const s=r.surface,m=r.mantle;
    m.age=Math.min(.65,m.age+dt);
    const ease=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*ease(Math.max(0,Math.min(1,t)));
    const x=mix(m.x,m.topX,m.age/.65),y=mix(m.y,0,m.age/.65);
    p.x=s.x+x;p.y=s.y+y;p.vx=0;p.vy=0;p.grounded=false;p.ground=null;p.fallPeak=p.y;
    if(m.age>=.65){p.x=s.x+m.topX;p.y=s.y;p.rope=null;p.grounded=true;p.ground=s;p.jumps=0;p.coyote=.1;p.landing=.12;}
    return{grappling:!!p.rope,mantling:!!p.rope,crouching:false,sliding:false};
  }
  function attachHook(p,anchor){
    if(!anchor||(p.form||'soldier')!=='soldier'||(anchor.x-p.x)*(p.facing||1)<0)return false;
    p.rope={x:anchor.x,y:anchor.y,id:anchor.id,length:Math.max(anchor.surface?3:45,Math.hypot(p.x-anchor.x,p.y-(anchor.surface?hangReach(p):30)-anchor.y))};
    if(anchor.surface){p.rope.surface=anchor.surface;p.rope.offset=anchor.x-anchor.surface.x;p.vx=0;p.vy=0;}
    else{p.vy=Math.min(p.vy,-130);p.y-=2;}
    p.ladder=null;p.grounded=false;p.ground=null;p.coyote=0;p.buffer=0;p.slide=0;p.landing=0;p.dropping=false;p.jumps=Math.max(1,p.jumps);
    return true;
  }
  function surfaceY(pl,x){
    const points=pl.terrain;if(!points||x<=points[0][0]||x>=points[points.length-1][0])return pl.y;
    for(let i=1;i<points.length;i++)if(x<=points[i][0]){const [ax,ay]=points[i-1],[bx,by]=points[i];return ay+(by-ay)*(x-ax)/(bx-ax);}
    return pl.y;
  }
  function terrainHit(x,y,dx,dy,box,test){
    const points=[[box.x,box.y],...box.terrain,[box.x+box.w,box.y]];let first=null;
    for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i];if(bx<=ax)continue;const slope=(by-ay)/(bx-ax),t=test(x,y-ay-(x-ax)*slope,dx,dy-dx*slope,{x:ax,y:0,w:bx-ax,h:box.h,thickness:box.thickness});if(t!==null&&(first===null||t<first))first=t;}
    return first;
  }
  function land(p,oldY,platforms){
    const previous=p.grounded?p.ground:null;
    p.grounded=false;p.ground=null;
    if(p.vy<0)return;
    let hit=null,hitY=Infinity;
    for(const pl of platforms){const y=surfaceY(pl,p.x),follow=previous===pl&&pl.terrain&&Math.abs(p.y-y)<12;if(p.x+p.w/2>pl.x&&p.x-p.w/2<pl.x+pl.w&&(follow||oldY<=y+.5&&p.y>=y)&&y<hitY){hit=pl;hitY=y;}}
    if(hit){if(p.vy>210){p.landing=.24;p.impact=Math.min(1,p.vy/720);}p.y=hitY;p.vy=0;p.grounded=true;p.jumps=0;p.ground=hit;p.dropping=false;if(!p.hookHeld)p.rope=null;}
  }
  function step(p,input,dt,platforms,environment={}){
    if(!p.kind)p.w=p.form==='tank'?64:24;
    // Also discard grips restored from saves made before hooks became soldier-only.
    if((p.form||'soldier')!=='soldier'){p.rope=null;p.hookHeld=false;input={...input,hookPressed:false,hookHeld:false};}
    const Z=typeof module!=='undefined'&&module.exports?require('./zombie-form'):root.ArcadeZombieForm;const underground=Z?.step(p,input,dt,platforms,WORLD,surfaceY);if(underground)return underground;
    if(p.ram&&p.form==='wolf')input={...input,left:p.ram.dir<0,right:p.ram.dir>0,run:true,up:false,down:false,jumpPressed:false,hookPressed:false};
    const oldX=p.x,solids=platforms.filter(s=>s.solid);
    // A barricade is solid to its base, unlike the open floors of a building.
    const support=p.ground||solids.find(s=>Math.abs(p.y-s.y)<.5&&p.x>s.x&&p.x<s.x+s.w);
    if(support?.solid&&input.down&&input.jumpPressed)input={...input,down:false};
    const result=stepFree(p,input,dt,platforms,environment);
    for(const s of solids){if(p.y<=s.y+.01||p.y-p.h>=s.y+s.thickness||p.x+p.w/2<=s.x||p.x-p.w/2>=s.x+s.w)continue;
      if(oldX+p.w/2<=s.x+.5){p.x=s.x-p.w/2;p.vx=0;}
      else if(oldX-p.w/2>=s.x+s.w-.5){p.x=s.x+s.w+p.w/2;p.vx=0;}
      else{p.y=s.y;p.vy=0;p.grounded=true;p.ground=s;p.jumps=0;p.fallPeak=p.y;}
      p.rope=null;p.ladder=null;
      if(p.ram)p.ram.blocked=true;
    }
    if(p.form==='zombie'&&p.grounded)p.zombieStride=(p.zombieStride||0)+Math.abs(p.x-oldX)/88;
    return result;
  }
  function stepFree(p,input,dt,platforms,environment={}){
    p.jetBoost=false;
    p.sprinting=false;
    if(p.grounded||p.jetpack||p.ladder||p.rope)p.fallPeak=p.y;
    p.anim+=dt;const wasHookHeld=p.hookHeld;p.hookHeld=!!input.hookHeld;
    p.landing=Math.max(0,(p.landing||0)-dt);
    p.ladderCooldown=Math.max(0,p.ladderCooldown-dt);
    const dir=(input.right?1:0)-(input.left?1:0);
    if(dir)p.facing=dir;
    if(p.fuel===undefined)p.fuel=EXTENSION.tileHeight*4;
    if((p.form||'soldier')!=='soldier'||p.fuel<=0)p.jetpack=false;
    if(input.jetpackPressed&&!p.rope&&p.form!=='wolf'&&p.form!=='zombie'&&p.form!=='robot'&&p.form!=='tank'&&p.form!=='fighter'&&p.fuel>0){
      p.jetpack=!p.jetpack;p.rope=null;p.ladder=null;p.slide=0;p.buffer=0;p.coyote=0;p.vx=0;p.vy=0;p.landing=0;
      if(p.jetpack){const lift=p.grounded?Math.min(3,p.fuel):0;p.y-=lift;p.fuel-=lift;p.grounded=false;p.ground=null;}
    }
    if(p.jetpack){
      const vertical=(input.down?1:0)-(input.up?1:0),length=Math.hypot(dir,vertical)||1,oldY=p.y;
      p.jetBoost=!!input.run&&!!(dir||vertical);
      const speed=(p.jetBoost?280:160)*(p.jetpackMk2?2:1),burn=dir||vertical?(p.jetBoost?320:160):40;
      p.rope=null;p.ladder=null;p.slide=0;p.buffer=0;p.coyote=0;p.jumps=0;p.dropping=false;
      const used=Math.min(p.fuel,burn*dt),flightDt=used/burn;p.fuel=Math.max(0,p.fuel-used);
      p.vx=dir/length*speed;p.vy=vertical/length*speed;dt=flightDt;
      p.x=Math.max(p.w/2+8,Math.min(WORLD.width-p.w/2-8,p.x+p.vx*dt));
      const floor=platforms.find(s=>s.kind==='ground'&&p.x>=s.x&&p.x<=s.x+s.w);
      p.y=Math.max(WORLD.top+p.h,Math.min(floor?surfaceY(floor,p.x):WORLD.ground,p.y+p.vy*dt));
      land(p,oldY,platforms);
      if(!vertical)p.vy=0;
      if(p.fuel<=0){p.jetpack=false;p.jetBoost=false;}
      p.fallPeak=p.y;
      return{flying:!!p.jetpack,boosting:p.jetBoost,hovering:!dir&&!vertical,crouching:false,sliding:false};
    }
    if(input.down&&input.jumpPressed&&p.grounded){
      const support=p.ground||platforms.find(s=>Math.abs(s.y-p.y)<1&&p.x+p.w/2>s.x&&p.x-p.w/2<s.x+s.w);
      if(support&&support.kind!=='ground'&&support.y<WORLD.ground){
        // Move feet below this surface only; the next platform still catches them.
        p.y=support.y+2;p.vy=60;p.grounded=false;p.ground=null;p.dropping=true;
        p.coyote=0;p.buffer=0;p.jumps=1;p.slide=0;p.landing=0;p.ladder=null;p.rope=null;
        input={...input,jumpPressed:false};
      }
    }
    if(input.hookPressed&&!(wasHookHeld&&input.hookHeld)){if(p.rope)p.rope=null;else attachHook(p,findAnchor(p,environment.anchors||[],platforms));}
    if(!p.dropping&&!p.rope&&!p.ladder&&!p.ladderCooldown&&(input.up||input.down))p.ladder=(environment.ladders||[]).find(l=>Math.abs(p.x-l.x)<24&&p.y>=l.top-3&&p.y<=l.bottom+8&&(input.up?p.y>l.top+1:p.y<l.bottom-1))||null;
    if(p.ladder){
      if(input.jumpPressed||dir){p.ladder=null;p.ladderCooldown=.25;p.grounded=false;p.jumps=0;}
      else{const l=p.ladder;p.x=l.x;p.vx=0;p.vy=((input.down?1:0)-(input.up?1:0))*95;p.y+=p.vy*dt;p.grounded=false;p.ground=null;p.slide=0;
        if(p.y<=l.top||p.y>=l.bottom){p.y=Math.max(l.top,Math.min(l.bottom,p.y));p.ladder=null;p.ladderCooldown=.2;p.vy=0;land(p,p.y,platforms);}
        p.fallPeak=p.y;
        return{climbing:!!p.ladder,crouching:false,sliding:false};
      }
    }
    if(p.rope&&input.jumpPressed){p.rope=null;p.vy=Math.min(p.vy,-340);p.jumps=1;input={...input,jumpPressed:false};}
    if(p.rope?.surface){
      const r=p.rope;let s=r.surface;
      if(!platforms.includes(s)){p.rope=null;p.vy=40;}
      else{
        if(r.mantle)return mantle(p,r,dt);
        if(r.length<=3){
          if(input.up){
            const inset=Math.min(s.w/2,p.w/2+3),topX=Math.max(inset,Math.min(s.w-inset,p.x-s.x));
            const blocked=platforms.some(pl=>pl!==s&&s.x+topX+p.w/2>pl.x&&s.x+topX-p.w/2<pl.x+pl.w&&pl.y<s.y&&pl.y+(pl.thickness||0)>s.y-p.h-3);
            if(!blocked){r.mantle={age:0,topX,x:p.x-s.x,y:p.y-s.y};return mantle(p,r,dt);}
          }
          const move=dir,oldOffset=r.offset;
          r.offset=Math.max(6,Math.min(s.w-6,r.offset+move*78*dt));
          p.hangCycle=(p.hangCycle||0)+Math.abs(r.offset-oldOffset)/9;
          const side=r.offset<=6?-1:r.offset>=s.w-6?1:0;
          if(side&&move===side){
            const edge=side<0?s.x:s.x+s.w;
            const next=platforms.find(pl=>pl!==s&&pl.kind!=='ground'&&Math.abs(pl.y+(pl.thickness||0)-s.y-(s.thickness||0))<4&&Math.abs((side<0?pl.x+pl.w:pl.x)-edge)<=12);
            if(next){r.surface=s=next;r.offset=side<0?s.w-7:7;r.id=s.id;}
          }
        }
        r.x=s.x+r.offset;r.y=s.y+(s.thickness||0);
        if(r.length>3&&Math.abs(r.x-p.x)>8)p.facing=Math.sign(r.x-p.x);
        const targetX=r.x+(p.form==='wolf'?0:p.facing*3.5),targetY=r.y+hangReach(p)+3;
        // Reel along the actual direction to the grip. A diagonal rope's length
        // must never become a vertical offset that teleports feet through a floor.
        const dx=targetX-p.x,dy=targetY-p.y,distance=Math.hypot(dx,dy),travel=Math.min(distance,380*dt);
        const oldX=p.x,oldY=p.y;
        if(distance>0){p.x+=dx*travel/distance;p.y+=dy*travel/distance;}
        r.length=3+Math.max(0,distance-travel);
        p.vx=dt?(p.x-oldX)/dt:0;p.vy=dt?(p.y-oldY)/dt:0;p.grounded=false;p.ground=null;p.landing=0;p.fallPeak=p.y;
        return{grappling:true,crouching:false,sliding:false};
      }
    }
    if(p.rope){
      const r=p.rope,oldY=p.y;
      r.length=Math.max(44,Math.min(290,r.length+((input.down?1:0)-(input.up?1:0))*100*dt));
      p.vx+=dir*500*dt;p.vx*=Math.pow(.995,dt*60);p.vy+=800*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      const dx=p.x-r.x,dy=p.y-30-r.y,d=Math.hypot(dx,dy);
      if(d>r.length){const nx=dx/d,ny=dy/d;p.x=r.x+nx*r.length;p.y=r.y+ny*r.length+30;const outward=p.vx*nx+p.vy*ny;if(outward>0){p.vx-=outward*nx;p.vy-=outward*ny;}}
      p.x=Math.max(p.w/2+8,Math.min(WORLD.width-p.w/2-8,p.x));
      land(p,oldY,platforms);
      p.fallPeak=p.y;
      return{grappling:!!p.rope,crouching:false,sliding:false};
    }
    p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);
    if(input.jumpPressed)p.buffer=.13;else p.buffer=Math.max(0,p.buffer-dt);
    if(input.down&&input.run&&p.grounded&&!p.slideLatch){p.slide=.44;p.slideLatch=true;p.vx=p.facing*330;}
    if(!input.down||!input.run)p.slideLatch=false;
    p.slide=Math.max(0,p.slide-dt);
    const crouching=input.down&&p.grounded&&p.slide<=0;
    const formSpeed=p.form==='wolf'?1.22:p.form==='tank'?.88:p.form==='fighter'?1.1:1;
    const runSpeed=p.kind?235*formSpeed:p.form==='wolf'?310:220;
    const target=dir*(crouching?65*formSpeed:input.run?runSpeed:145*formSpeed)*(p.speedBonus||1);
    if(p.hurt>.16){p.vx=p.hitDirection*210;}
    else if(p.ram&&p.form==='wolf'){p.vx=p.ram.dir*520;p.facing=p.ram.dir;}
    else if(p.form==='wolf'&&p.kick>0&&p.kickAir&&!p.grounded){p.vx=p.kickFacing*330;}
    else if(p.slide<=0){const accel=p.grounded?1700:950;p.vx+=Math.max(-accel*dt,Math.min(accel*dt,target-p.vx));}
    if(p.buffer>0&&(p.grounded||p.coyote>0||p.jumps<(p.maxJumps||2))){
      if(!p.grounded&&p.coyote<=0&&p.jumps===0)p.jumps=1;
      const second=p.jumps>=1;
      p.wolfSprintJump=p.form==='wolf'&&!!input.run&&!!dir&&Math.abs(p.vx)>170;
      p.vy=p.form==='wolf'?(second?-420:-510):(second?-350:-430);p.jumps++;p.grounded=false;p.coyote=0;p.buffer=0;p.slide=0;p.jumpRising=true;
    }
    // Variable jump height: releasing the button early trims the ascent. Callers
    // that do not report `jumpHeld` (enemies, tests) always get the full jump.
    if(p.jumpRising){if(p.vy>=0||p.grounded)p.jumpRising=false;else if(input.jumpHeld===false){p.jumpRising=false;p.vy=Math.max(p.vy,-190);}}
    const oldX=p.x,oldY=p.y;
    p.fallPeak=Math.min(p.fallPeak??oldY,oldY);
    p.vy=Math.min(p.vy+1050*dt,720);
    p.x=Math.max(p.w/2+8,Math.min(WORLD.width-p.w/2-8,p.x+p.vx*dt));
    p.y+=p.vy*dt;
    land(p,oldY,platforms);
    if(p.grounded){p.fallDamage=Math.floor(Math.max(0,p.y-p.fallPeak+1e-7)/(EXTENSION.tileHeight*2));p.fallPeak=p.y;}else p.fallPeak=Math.min(p.fallPeak,p.y);
    if(p.grounded&&!(p.landing>0))p.wolfSprintJump=false;
    p.sprinting=!!input.run&&!!dir&&p.grounded&&!crouching&&p.slide<=0;
    if(p.sprinting)p.sprintCycle=(p.sprintCycle||0)+Math.abs(p.x-oldX)/120;
    else p.sprintCycle=0;
    return{crouching,sliding:p.slide>0};
  }
  function updateIdle(p,input,dt){
    const active=Object.values(input).some(Boolean)||!p.grounded||Math.abs(p.vx)>8||p.ladder||p.rope||p.transform>0||p.hurt>0||p.landing>0||p.claw>0||p.kick>0||p.slide>0||p.ram||p.wolfAttack||p.burrow||p.emerging>0||p.zombiePose>0;
    const before=p.idleTime||0;
    p.idleTime=active?0:(p.idleTime||0)+dt;
    // One quiet howl per idle cycle; cosmetic hops never alter collision or fall state.
    if(p.form==='wolf'&&!active&&Math.floor((p.idleTime-6.8)/14)>Math.floor((before-6.8)/14))p.idleHowl=(p.idleHowl||0)+1;
    p.idleGesture=p.idleTime>=3.5;
    const phase=Math.max(0,p.idleTime-3.5)%6;
    p.idleFrame=phase<2.4?Math.min(7,Math.floor(phase/ .3)):-1;
  }
  function updateCamera(c,p,view,dt){
    const tx=p.x+p.facing*view.width*.13,ty=p.y-25;
    let x=c.x,y=c.y;
    if(tx-c.x<view.width*.34)x=tx-view.width*.34;
    if(tx-c.x>view.width*.66)x=tx-view.width*.66;
    if(ty-c.y<view.height*.32)y=ty-view.height*.32;
    if(ty-c.y>view.height*.73)y=ty-view.height*.73;
    const blend=1-Math.exp(-7*dt);
    c.x=Math.max(0,Math.min(WORLD.width-view.width,c.x+(x-c.x)*blend));
    c.y=Math.max(WORLD.top,Math.min(WORLD.height-view.height,c.y+(y-c.y)*blend));
    return c;
  }
  const api={WORLD,EXTENSION,mapY,decks,createPlatforms,createLadders,availableLadders,createAnchors,createPlayer,findAnchor,attachHook,updateCamera,updateIdle,step,surfaceY,terrainHit};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.ArcadePhysics=api;
})(typeof window!=='undefined'?window:globalThis);

