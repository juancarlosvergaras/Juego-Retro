(function(root){
  'use strict';
  const CENTER=4050,LEFT=3770,RIGHT=4310,SIZE=1.35;
  const HATCH={x:-33,y:-89},RACK={x:-82,y:-104,w:34,h:20};
  // The exposed upper body keeps human proportions on the enlarged tank.
  const CREW_SCALE=.07,CREW_RATIO=CREW_SCALE/.115;
  const DESTRUCTION=[{at:0,x:-62,y:-42,r:68},{at:.18,x:42,y:-48,r:82},{at:.42,x:0,y:-61,r:148,launch:true},{at:.82,x:68,y:-30,r:96},{at:1.2,x:-48,y:-28,r:87},{at:1.7,x:24,y:-18,r:62},{at:2.25,x:-25,y:-14,r:45}];
  function stage(t){return t.hp<=0?4:t.hp/t.maxHp<=.25?3:t.hp/t.maxHp<=.5?2:t.hp/t.maxHp<=.75?1:0;}
  const PARTS=[[244,165,86,43],[35,170,60,38],[106,164,74,42],[40,76,192,82],[232,102,152,49]];
  const FRAGMENTS=[
    {sprite:[27,186,491,213],outline:[[0,.08],[.8,.15],[1,.36],[.97,.82],[.49,1],[.23,.65],[.05,.51]],rest:.13,vx:100,vy:-155,spin:2.8},
    {sprite:[619,148,304,236],outline:[[0,.22],[.34,.22],[.43,0],[.55,0],[.57,.26],[.81,.39],[1,.85],[.98,1],[.72,.76],[.5,.97],[.04,.88]],rest:-.23,vx:-90,vy:-175,spin:-3.2},
    {sprite:[1022,186,490,192],outline:[[0,.11],[.18,0],[.85,.07],[.95,.37],[1,.62],[.96,.95],[.14,1],[.02,.82]],rest:.09,vx:120,vy:-165,spin:2.5},
    {sprite:[24,618,477,251],outline:[[0,.43],[.24,.25],[.43,0],[.62,0],[.92,.32],[1,.65],[.86,.81],[.83,.96],[.28,1],[.03,.74]],rest:-.08,vx:-58,vy:-260,spin:-.85},
    {sprite:[537,694,470,169],outline:[[0,0],[.12,.14],[.8,.17],[.87,.09],[.99,.11],[1,.44],[.86,.45],[.2,.53],[.06,.61]],rest:.12,vx:125,vy:-310,spin:2.2}
  ];
  function fragmentSize(id){const f=FRAGMENTS[id],w=PARTS[id][2]*.6*SIZE;return{w,h:w*f.sprite[3]/f.sprite[2]};}
  function fragmentSupport(f,angle=f.angle){const {w,h}=fragmentSize(f.id);return Math.max(...FRAGMENTS[f.id].outline.map(([x,y])=>Math.sin(angle)*(x-.5)*w*f.facing+Math.cos(angle)*(y-.5)*h));}
  function armorContour(c,x,y,w,h){const points=[[0,.16],[.22,0],[.48,.15],[.74,.03],[1,.25],[.88,.5],[1,.85],[.67,1],[.38,.86],[.12,1],[0,.68],[.13,.4]];points.forEach(([px,py],i)=>c[i?'lineTo':'moveTo'](x+px*w,y+py*h));c.closePath();}
  const CREW=[[28,159,288,317,168],[418,159,293,311,552],[793,159,315,311,936],[1171,159,345,311,1320],[32,603,396,301,168],[448,603,323,301,552],[791,603,296,301,936],[1194,603,287,301,1320]];
  function create(saved={},healthScale=1){const maxHp=Math.round(48*healthScale),t={x:Number.isFinite(saved.x)?Math.max(LEFT,Math.min(RIGHT,saved.x)):CENTER,y:620,w:184*SIZE,h:102*SIZE,hp:Number.isFinite(saved.hp)?Math.max(0,Math.min(maxHp,saved.hp)):maxHp,maxHp,active:false,drive:1,speed:0,facing:-1,age:0,travel:0,treadTravel:0,cannon:1.5,missile:4.5,flash:0,launchFlash:0,hit:0,deathAge:saved.hp===0?30:0,deathEvent:saved.hp===0?DESTRUCTION.length:0,deadHandled:saved.hp===0,crewCooldown:5.6,crewAge:null,crewThrown:false,crewFacing:-1,fragments:[]};t.damageStage=stage(t);return t;}
  const box=t=>({x:t.x-t.w/2,y:t.y-t.h,w:t.w,thickness:t.h});
  function damage(t,amount){if(!t||t.hp<=0||!(amount>0))return;t.hp=Math.max(0,t.hp-amount);t.hit=.18;if(amount>0)t.returnFire=5;}
  function crewPose(t){if(t.hp<=0||t.crewAge===null)return null;const a=t.crewAge;return{frame:a<.3?0:a<.6?1:a<.9?2:a<1.25?3:a<1.43?4:a<1.65?5:a<1.9?6:7,rise:a<.3?a/.3:a>1.9?Math.max(0,1-(a-1.9)/.4):1};}
  function mount(t,x,y){const m=motion(t);return{x:t.x+t.facing*(x-m.recoil)*SIZE,y:t.y+(y+m.bob)*SIZE};}
  function crewBox(t){const pose=crewPose(t),h=mount(t,HATCH.x,HATCH.y),s=SIZE*CREW_RATIO;return pose&&pose.rise>.2?{x:h.x-13*s,y:h.y-pose.rise*36*s,w:26*s,thickness:pose.rise*36*s}:null;}
  function grenadeOrigin(t){return mount(t,HATCH.x+29*CREW_RATIO,HATCH.y-19*CREW_RATIO);}
  function releasePart(t,id){const f=PARTS[id],part=FRAGMENTS[id],scale=.6*SIZE;t.fragments.push({id,x:t.x+t.facing*(f[0]+f[2]/2-192)*scale,y:t.y+(f[1]+f[3]/2-250)*scale,vx:t.facing*part.vx,vy:part.vy,angle:0,spin:part.spin*t.facing,facing:t.facing,life:20,settled:false,bounces:0});}
  function breakParts(t,dt){
    const next=stage(t);for(let s=t.damageStage+1;s<=next;s++){
      if(s<4)releasePart(t,s-1);
    }t.damageStage=next;
    for(const f of t.fragments){f.life-=dt;if(f.settled)continue;f.vy+=430*dt;f.vx*=Math.exp(-.18*dt);f.x+=f.vx*dt;f.y+=f.vy*dt;f.angle+=f.spin*dt;const floor=t.y-fragmentSupport(f);
      if(f.y>=floor&&f.vy>0){if(!f.bounces){f.y=floor;f.vy=-Math.min(f.id===3?35:65,f.vy*(f.id===3?.12:.22));f.vx*=.34;f.spin*=.4;f.bounces++;}else{f.settled=true;f.restFrom=f.angle;f.restAge=0;f.vx=0;f.vy=0;f.y=floor;}}}
    // Heavy pieces rock into place while their lowest edge stays on the street.
    for(const f of t.fragments)if(f.settled){f.restAge=Math.min(.3,(f.restAge||0)+dt);const target=FRAGMENTS[f.id].rest*f.facing,delta=Math.atan2(Math.sin(target-f.restFrom),Math.cos(target-f.restFrom)),k=f.restAge/.3;f.angle=f.restFrom+delta*k*k*(3-2*k);f.y=t.y-fragmentSupport(f);}
    t.fragments=t.fragments.filter(f=>f.life>0);
  }
  function update(t,p,dt,bullets,explosions,view){
    if(!t)return;t.hit=Math.max(0,t.hit-dt);if(p.cloak>0&&t.hp>0)return;
    t.age+=dt;t.flash=Math.max(0,t.flash-dt);t.launchFlash=Math.max(0,t.launchFlash-dt);
    breakParts(t,dt);
    if(t.hp<=0){t.active=false;t.crewAge=null;t.speed=0;t.deathAge+=dt;t.deadHandled=true;
      while(t.deathEvent<DESTRUCTION.length&&t.deathAge>=DESTRUCTION[t.deathEvent].at){const event=DESTRUCTION[t.deathEvent++],duration=event.launch?1.65:1.15;
        explosions.push({x:t.x+event.x*SIZE,y:t.y+event.y*SIZE,radius:event.r*SIZE,life:duration,duration,kind:'tank',floorY:t.y});
        if(event.launch){releasePart(t,3);releasePart(t,4);}
      }return;}
    const visible=!view||(t.x>view.left+40&&t.x<view.right-40&&t.y>view.top+25&&t.y-t.h<view.bottom-20);
    t.returnFire=Math.max(0,(t.returnFire||0)-dt);
    const provoked=t.returnFire>0,near=provoked||Math.abs(p.x-t.x)<780&&visible;
    if(!visible&&!provoked){t.active=false;t.speed=0;t.cannonAim=null;t.crewAge=null;t.crewCooldown=Math.max(2,t.crewCooldown);return;}
    if(!t.active&&near){t.active=true;t.cannon=1.5;t.missile=4.5;}
    if(!t.active||!near){t.speed=0;return;}
    if(t.frozen>0){t.frozen=Math.max(0,t.frozen-dt);t.speed=0;return;}
    t.crewCooldown-=dt;
    if(t.crewAge===null&&t.crewCooldown<=0){t.crewAge=0;t.crewThrown=false;t.crewFacing=p.x<t.x?-1:1;}
    if(t.crewAge!==null){
      t.crewAge+=dt;t.facing=t.crewFacing;t.speed=0;
      if(!t.crewThrown&&t.crewAge>=1.25){t.crewThrown=true;const {x,y}=grenadeOrigin(t),gravity=420,vy=-250,targetY=Math.max(y-60,Math.min(t.y-4,p.y-4)),flight=(250+Math.sqrt(62500+2*gravity*(targetY-y)))/gravity;bullets.push({x,y,vx:Math.max(-300,Math.min(300,(p.x-x)/Math.max(.7,flight))),vy,gravity,life:2.3,age:0,enemy:true,tankGrenade:true,slot:9,damage:2});}
      if(t.crewAge>=2.3){t.crewAge=null;t.crewCooldown=6.5;t.cannon=Math.max(t.cannon,.8);}
      return;
    }
    if(Math.abs(p.x-t.x)>60)t.facing=p.x<t.x?-1:1;
    const oldX=t.x;t.speed+=(t.drive*62-t.speed)*(1-Math.exp(-3.5*dt));t.x=Math.max(LEFT,Math.min(RIGHT,t.x+t.speed*dt));if(t.x===LEFT&&t.drive<0||t.x===RIGHT&&t.drive>0)t.drive*=-1;t.travel+=Math.abs(t.x-oldX);t.treadTravel+=t.x-oldX;
    t.cannon-=dt;t.missile-=dt;
    if(t.cannon<=.75&&!t.cannonAim)t.cannonAim={x:p.x,y:p.y-24};
    if(t.cannon<=0){const {x,y}=mount(t,107,-79),aim=t.cannonAim||p,angle=Math.atan2(aim.y-y,aim.x-x);bullets.push({x,y,vx:Math.cos(angle)*310,vy:Math.sin(angle)*310,life:Math.max(3.5,Math.hypot(aim.x-x,aim.y-y)/310+.15),age:0,enemy:true,tankShell:true,damage:2});t.flash=.3;t.cannon=3.6;t.cannonAim=null;}
    if(t.missile<=0){for(const offset of [RACK.x+8,RACK.x+25])bullets.push({...mount(t,offset,RACK.y),vx:t.facing*75,vy:-175,life:4.5,age:0,enemy:true,tankMissile:true,damage:2,target:{x:p.x,y:p.y-22}});t.launchFlash=.35;t.missile=6.2;}
  }
  function steer(b,dt){if(b.slot!==9)b.age=(b.age||0)+dt;if(!b.tankMissile||b.age<.3||b.age>1.15)return;const dx=b.target.x-b.x,dy=b.target.y-b.y,d=Math.hypot(dx,dy)||1,k=1-Math.exp(-5*dt);b.vx+=(dx/d*235-b.vx)*k;b.vy+=(dy/d*235-b.vy)*k;}
  function motion(t){const elapsed=.3-t.flash;return{bob:t.hp>0?Math.sin(t.travel/11)*.65*Math.min(1,Math.abs(t.speed)/40):0,recoil:t.hp>0&&t.flash>0?Math.sin(Math.min(1,elapsed/.055)*Math.PI/2)*Math.exp(-elapsed*7)*7:0,sink:t.hp<=0?Math.min(1,Math.max(0,(t.deathAge-.45)/.9)):0,trackFrame:Math.floor(t.travel/7)%4};}
  function draw(c,t,sheet,crewSheet,fragmentSheet){
    if(!t||!sheet)return;if(t.flash>0){const muzzle=mount(t,107,-79);root.ArcadeBossAttackSprites?.draw(c,'blast',.3-t.flash,muzzle.x,muzzle.y,44,38,{duration:.3,loop:false});}const scale=.6,m=motion(t),frame=t.flash>0?Math.min(3,Math.floor((.3-t.flash)*4/.3)):m.trackFrame,row=t.flash>0?1:0;
    c.save();c.translate(Math.round(t.x),t.y);c.scale(t.facing*SIZE,SIZE*(1-m.sink*.16));
    const impact=(typeof module!=='undefined'&&module.exports?require('./impact-effects'):root.ArcadeImpact);
    if(t.hp<=0)c.filter='grayscale(.85) brightness(.48)';
    const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    const damage=stage(t),missing=damage===4?(t.deathAge>=.42?[0,1,2,3,4]:[0,1,2]):Array.from({length:damage},(_,i)=>i);
    if(damage){c.save();c.filter=damage===4?'grayscale(1) brightness(.35)':'brightness(.4)';c.drawImage(sheet,45,162,270,43,-90,-50,177,28);r(-77,-44,142,4,'#303b36');r(-64,-40,5,16,'#222b26');r(25,-40,5,16,'#222b26');c.restore();}
    c.save();c.beginPath();c.rect(-116,-156,232,163);for(const id of missing){const f=PARTS[id],x=(f[0]-192)*scale,y=(f[1]-250)*scale,w=f[2]*scale,h=f[3]*scale;if(id>=3){c.rect(x,y,w,h);continue;}armorContour(c,x,y,w,h);}c.clip('evenodd');
    // The original roof machine gun is replaced by the crew hatch.
    c.beginPath();c.rect(-150,-170,300,190);c.rect(-44-m.recoil,-107+m.bob,48,16);c.clip('evenodd');
    // Tracks keep their ground anchor; suspension and recoil move only the upper assembly.
    impact.hitSprite(c,t.hit,sheet,m.trackFrame*384,164,384,92,-192*scale,(164-250)*scale,384*scale,92*scale);
    impact.hitSprite(c,t.hit,sheet,frame*384,row*256,384,164,-192*scale-m.recoil,-250*scale+m.bob,384*scale,164*scale);c.restore();
    if(t.hp>0){c.save();c.globalAlpha=.42;
      for(let i=0;i<24;i++){const x=-95+((i*8+t.treadTravel/SIZE)%192+192)%192;r(x,-4,3,1,'#b3ad82');}
      for(const x of [-62,-40,-18,4,26,47]){const a=t.treadTravel/9;for(let k=0;k<2;k++){const angle=a+k*Math.PI/2,dx=Math.cos(angle)*4,dy=Math.sin(angle)*4;c.strokeStyle='#b3ad82';c.lineWidth=1;c.beginPath();c.moveTo(x-dx,-14-dy);c.lineTo(x+dx,-14+dy);c.stroke();}}
      c.restore();}
    if(damage<4){
    c.save();c.translate(-m.recoil,m.bob);
    // Compact launcher on the rear roof; riveted feet meet the armor below it.
    r(RACK.x,RACK.y,RACK.w,RACK.h,'#182221');c.drawImage(sheet,78,122,50,28,RACK.x+1,RACK.y+1,32,18);r(RACK.x+2,RACK.y+1,30,1,'#a39e73');r(RACK.x+2,RACK.y+18,30,2,'#303c31');
    for(let i=0;i<4;i++){const x=RACK.x+3+i*7;r(x,RACK.y+5,6,10,'#a49b70');r(x+1,RACK.y+6,4,8,'#172323');r(x+1,RACK.y+6,1,2,t.missile<1?'#ffbf68':'#687870');}
    r(RACK.x+4,-84,4,6,'#333f34');r(RACK.x+26,-84,4,6,'#333f34');
    const crew=crewPose(t),hx=HATCH.x,hy=HATCH.y;
    // Back rim and hinged lid sit behind the torso; the front rim occludes its waist.
    c.fillStyle='#151e18';c.beginPath();c.ellipse(hx,hy,14,4,0,0,Math.PI*2);c.fill();
    if(crew){const opening=Math.min(1,crew.rise*3);c.save();c.translate(hx-13,hy-1);c.rotate(-opening*1.25);r(0,-3,26,4,'#27372b');r(1,-4,24,2,'#8d936b');r(3,-2,19,1,'#566044');c.restore();}
    if(crew&&crewSheet){const f=CREW[crew.frame],s=CREW_SCALE,baseline=crew.frame<4?474:903;c.save();c.beginPath();c.rect(hx-65,hy-64,130,62);c.rect(hx-11,hy-2,22,4);c.clip();impact.hitSprite(c,t.hit,crewSheet,f[0],f[1],f[2],f[3],hx+(f[0]-f[4])*s,hy-(baseline-f[1])*s+(1-crew.rise)*38*CREW_RATIO,f[2]*s,f[3]*s);c.restore();}
    r(hx-13,hy-1,26,2,'#a5a281');r(hx-12,hy+1,24,3,'#334237');r(hx-9,hy+1,2,1,'#c3bc8b');r(hx+7,hy+1,2,1,'#c3bc8b');
    if(!crew){r(hx-11,hy-3,22,3,'#63704c');r(hx-3,hy-5,7,2,'#a5a281');}
    if(t.hp>0&&t.missile<1){c.globalAlpha=.45+.35*Math.sin(t.age*20);r(RACK.x+2,RACK.y-3,30,2,'#ff7653');}
    if(t.hp>0&&t.cannon<.75){c.globalAlpha=.7;r(103,-81,5,3,'#ffe37b');}
    c.restore();
    }
    c.restore();
    for(const f of t.fragments){const part=FRAGMENTS[f.id],{w,h}=fragmentSize(f.id);c.save();c.globalAlpha=Math.min(1,f.life);if(f.settled){c.fillStyle='#10171955';c.beginPath();c.ellipse(f.x,t.y-1,w*.4,2.5,0,0,Math.PI*2);c.fill();}c.beginPath();c.rect(f.x-w-h,t.y-2000,(w+h)*2,2000);c.clip();c.translate(f.x,f.y);c.rotate(f.angle);c.scale(f.facing,1);c.filter='brightness(.78) saturate(.75)';if(fragmentSheet)c.drawImage(fragmentSheet,...part.sprite,-w/2,-h/2,w,h);c.restore();}
    if(damage>=2)root.ArcadeImpact?.smoke(c,t.x-t.facing*57*SIZE,t.y-50*SIZE,t.age,damage===4?Math.max(.25,1-t.deathAge/18):.6);
    if(damage===4){
      if(t.deathAge>.42&&t.deathAge<2.4){const age=(t.deathAge-.42)/1.98;c.save();c.globalAlpha=(1-age)*.35;c.strokeStyle='#dac49b';c.lineWidth=4*(1-age)+1;c.beginPath();c.ellipse(t.x,t.y-3,35+age*185,4+age*14,0,Math.PI,Math.PI*2);c.stroke();c.restore();}
      for(const [i,dx]of [-42,28,63].entries()){const life=Math.max(0,1-t.deathAge/7);if(life>0&&t.deathAge>.6)root.ArcadeImpact?.draw(c,{x:t.x+dx*SIZE,y:t.y-20*SIZE,radius:(22+i*4)*life,life:.74+.07*Math.sin(t.age*9+i*2),duration:1.05,floorY:t.y});}
    }
  }
  const api={CENTER,LEFT,RIGHT,SIZE,HATCH,RACK,FRAGMENTS,fragmentSize,fragmentSupport,create,box,damage,stage,crewPose,crewBox,grenadeOrigin,mount,update,steer,motion,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeCityTank=api;
})(typeof window!=='undefined'?window:globalThis);
