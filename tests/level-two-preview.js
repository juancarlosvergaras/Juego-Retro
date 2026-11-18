(() => {
  'use strict';
  const L=ArcadeLevelTwo,P=ArcadePhysics,canvas=document.getElementById('level-two'),ctx=canvas.getContext('2d');
  const menu=document.getElementById('level-two-menu'),play=document.getElementById('play-two'),message=document.getElementById('level-two-message'),context=document.getElementById('context-two');
  const audio=ArcadeAudio.create(),keys=new Set(),queue=new Set(),camera={x:0,y:0},images={};
  let paused=true,loaded=false,started=false,last=0,accumulator=0,renderer,saveAge=0,shotWait=0,mode={},doorLatch=false;
  const storageKey='cap-dollar.mission-two.v1';
  function load(){try{return JSON.parse(localStorage.getItem(storageKey)||'null')||{};}catch{return{};}}
  const entry=new URLSearchParams(location.search).get('entry'),fresh=entry==='select'||entry==='campaign';
  const presets={city:{x:830},office:{x:1810},roof:{x:1810},mecha:{x:3580},cemetery:{x:11200},entrance:{x:17440},king:{x:2100,inside:true},arrival:{}};const scene=new URLSearchParams(location.search).get('scene')||'city';const saved=presets[scene];
  let store;try{store=localStorage;}catch{store={getItem:()=>null,setItem:()=>{}};}
  const previous=ArcadeCampaign.read(store),campaign=entry==='select'?{level:2,score:0}:previous?.level===2?previous:{level:2,score:0};
  const stats={won:true,hp:8,maxHp:8};
  const player=P.createPlayer(),state={player,time:0,inside:!!saved.inside,geometry:null,bullets:[],fade:0};
  Object.assign(P.WORLD,L.WORLD);
  function configure(inside,x){
    state.inside=inside;state.geometry=L.geometry(inside);P.WORLD.width=inside?L.INTERIOR_WIDTH:L.WORLD.width;
    const form=player.form==='wolf'?'wolf':'soldier';
    Object.assign(player,{x:Math.max(30,Math.min(P.WORLD.width-30,x)),y:620,vx:0,vy:0,grounded:true,ground:state.geometry.platforms[0],rope:null,ladder:null,jumps:0,form,jetpack:false,h:form==='wolf'?64:46,fallPeak:620});
    camera.x=Math.max(0,Math.min(P.WORLD.width-canvas.width,player.x-canvas.width*.35));camera.y=620-canvas.height*.84;
    state.bullets=[];state.fade=1;
  }
  configure(state.inside,Number.isFinite(saved.x)?saved.x:160);
  state.fade=0;
  const profile=ArcadeProgression.load(store);ArcadeProgression.apply(profile,player,stats,true);
  if(Number.isFinite(campaign.hp))stats.hp=Math.max(1,Math.min(stats.maxHp,campaign.hp));
  if(Number.isFinite(saved.fuel??campaign.fuel))player.fuel=Math.min(player.fuelMax,saved.fuel??campaign.fuel);
  player.shield=campaign.shield??profile.shield;
  let arrivalAge=0,arrival=fresh||!Number.isFinite(saved.x)||saved.landed===false?ArcadeParachute.sample(0):null;
  state.civilians=arrival?L.createCivilians():[];
  if(!arrival&&saved.form==='wolf'){player.form='wolf';player.h=64;}
  if(scene==='roof'){player.y=state.geometry.buildings.find(b=>b.art===2).y;player.grounded=true;}
  if(arrival){player.x=arrival.x;player.y=arrival.y;player.grounded=false;}
  const wheel=ArcadeCharacterWheel.create(document.getElementById('characters-two'),switchForm);
  function switchForm(){if(paused||arrival?.active||player.transform>0||player.rope||player.ladder)return;player.form=player.form==='wolf'?'soldier':'wolf';player.h=player.form==='wolf'?64:46;player.transform=1.2;player.jetpack=false;player.vx=0;audio.play('whiteRoar',{gain:.3});wheel.update(player.form,true,true);}
  function save(){return;try{store.setItem(storageKey,JSON.stringify({x:player.x,inside:state.inside,form:player.form,fuel:player.fuel,landed:!arrival?.active}));ArcadeCampaign.write(store,{...campaign,level:2,arrival:!!arrival?.active,hp:stats.hp,fuel:player.fuel,shield:player.shield});}catch{}}
  function controls(){return{left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),up:keys.has('KeyW')||keys.has('ArrowUp')||queue.has('up'),down:keys.has('KeyS')||keys.has('ArrowDown'),run:keys.has('ShiftLeft')||keys.has('ShiftRight'),jumpPressed:queue.has('jump'),hookPressed:queue.has('hook'),jetpackPressed:queue.has('jet'),fire:keys.has('KeyJ')||keys.has('Numpad0')||queue.has('fire')};}
  function pause(){if(!loaded)return;paused=true;keys.clear();queue.clear();save();menu.hidden=false;canvas.inert=true;audio.setRunning(false);wheel.update(player.form,true,true);play.textContent='Continuar';message.textContent='El recorrido está en pausa.';play.focus();}
  play.onclick=()=>{if(!loaded)return;started=true;paused=false;menu.hidden=true;canvas.inert=false;keys.clear();queue.clear();audio.unlock();audio.setRunning(true);wheel.update(player.form,true,arrival?.active||player.transform>0);canvas.focus();};
  document.getElementById('pause-two').onclick=()=>paused?play.click():pause();
  function press(code){
    if(paused||arrival?.active)return;keys.add(code);
    if(code==='KeyT')switchForm();if(code==='KeyF')queue.add('jet');
    if(code==='Space')queue.add('jump');if(code==='KeyE')queue.add('hook');if(code==='KeyJ')queue.add('fire');if(code==='KeyW'||code==='ArrowUp')queue.add('up');
  }
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'){if(paused&&started)play.click();else pause();return;}
    if(!e.repeat)press(e.code);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{if(!paused)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)pause();});
  window.addEventListener('pagehide',()=>{if(started)save();});
  menu.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[play,menu.querySelector('a')];e.preventDefault();items[document.activeElement===items[0]?1:0].focus();});
  for(const button of document.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);press(button.dataset.key);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
  }
  function update(dt){if(new URLSearchParams(location.search).has('still')&&state.time>=Number(new URLSearchParams(location.search).get('still')))return;
    state.civilians=L.updateCivilians(state.civilians,dt,p=>{if(Math.abs(p.x-player.x)<700)audio.play('scream',{gain:.22,pan:Math.max(-1,Math.min(1,(p.x-player.x)/500)),variant:p.sex?2:0});});
    state.time+=dt;state.fade=Math.max(0,state.fade-dt*2);shotWait=Math.max(0,shotWait-dt);const input=controls();
    player.transform=Math.max(0,(player.transform||0)-dt);player.claw=Math.max(0,(player.claw||0)-dt);
    wheel.update(player.form,true,paused||arrival?.active||player.transform>0||!!player.rope||!!player.ladder);
    document.getElementById('stats-two').textContent=(campaign.score||0).toLocaleString('es-CO')+' PTS · GAS '+Math.round(player.fuel/player.fuelMax*100)+'%';
    if(arrival?.active){const wasFlying=arrival.flight;arrivalAge+=dt;arrival=ArcadeParachute.sample(arrivalAge);player.x=arrival.x;player.y=arrival.y;player.grounded=arrival.landed;if(wasFlying&&arrival.landed)audio.play('land',{gain:.35});context.textContent=arrival.flight?'MISIÓN 02 · EL UMBRAL DEL REY':arrival.active?'Aterrizando…':'A/D o flechas · Avanzar  |  T · Soldado / Lobo';queue.clear();if(!arrival.active){player.ground=state.geometry.platforms[0];player.fallPeak=620;player.coyote=.1;save();}return;}
    if(player.transform>0){queue.clear();return;}
    if(!input.up)doorLatch=false;
    if(input.up&&!doorLatch&&(L.canEnter(player,state.inside)||L.canExit(player,state.inside))){doorLatch=true;configure(!state.inside,state.inside?L.ENTRANCE:100);queue.clear();save();return;}
    const oldX=player.x,oldJumps=player.jumps,wasGrounded=player.grounded,oldLadder=player.ladder;
    mode=P.step(player,input,dt,state.geometry.platforms,{ladders:state.geometry.ladders,anchors:[]});
    L.finishClimb(player,oldLadder,state.geometry);
    L.solidWalls(player,oldX,state.geometry.buildings);
    if(player.jumps>oldJumps)audio.play('jump',{gain:.25});if(player.grounded&&!wasGrounded)audio.play('land',{gain:.2});
    const ay=input.up?-1:input.down?1:0,ax=ay?(input.left?-1:input.right?1:0):player.facing,norm=Math.hypot(ax,ay)||1;
    player.aim={x:ax/norm,y:ay/norm};if(player.grounded)player.walkCycle=(player.walkCycle||0)+Math.abs(player.vx)*dt/52;
    if(input.fire&&!player.rope&&!player.ladder&&shotWait<=0){shotWait=.24;if(player.form==='wolf'){player.claw=.3;audio.play('claw',{gain:.35});}else{audio.play('pistol',{gain:.35});state.bullets.push({x:player.x+player.aim.x*20,y:player.y-29,dx:player.aim.x*600,dy:player.aim.y*600,life:1});}}
    state.bullets=state.bullets.filter(b=>{b.x+=b.dx*dt;b.y+=b.dy*dt;b.life-=dt;return b.life>0;});
    queue.clear();
    const targetX=Math.max(0,Math.min(P.WORLD.width-canvas.width,player.x-canvas.width*.38));camera.x+=(targetX-camera.x)*(1-Math.exp(-6*dt));
    // Horizontal exploration keeps the walking plane steady; height follows only substantial climbs.
    const targetY=Math.min(620-canvas.height*.84,player.y-canvas.height*.66);camera.y+=(targetY-camera.y)*(1-Math.exp(-5*dt));
    saveAge+=dt;if(saveAge>2&&player.grounded){saveAge=0;save();}
    document.getElementById('region-two').textContent=L.zone(player.x,state.inside);
    document.getElementById('route-two').value=state.inside?18000:player.x;
    document.getElementById('distance-two').textContent=state.inside?'INTERIOR · EL MAUSOLEO':Math.round(player.x/180)+'% DEL RECORRIDO';
    const nearWall=state.geometry.ladders.some(l=>Math.abs(player.x-l.x)<32&&player.y>l.top+2);
    context.textContent=L.canEnter(player,state.inside)?'W / ↑ · Entrar al mausoleo':L.canExit(player,state.inside)?'W / ↑ · Volver al cementerio':state.inside&&player.x>1920?'Has llegado ante el rey.':player.rope?'A/D · Recorrer  |  W · Trepar  |  E / Espacio · Soltar':nearWall?'W / ↑ · Subir al siguiente piso':state.time<8&&player.x<800?'Avanza por la ciudad. Puedes atravesar los edificios y subir por sus plataformas.':'';
  }
  function sprite(img,frames,row,frame,scale){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-f[2]*scale/2,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
  function drawPlayer(){
    if(arrival?.active){
      const a=arrival,scale=.34,frame=a.frame,dx=a.flight?player.x:player.x-65*a.collapse,anchorY=a.flight?player.y-34:player.y-34+34*a.collapse;
      ctx.save();ctx.globalAlpha=a.alpha;ctx.drawImage(images.parachute,(frame%4)*384,Math.floor(frame/4)*512,384,512,Math.round(dx-192*scale),Math.round(anchorY-470*scale),384*scale,512*scale);ctx.restore();
      if(a.flight)sprite(images.climb,CLIMB_FRAMES,1,0,CLIMB_SCALE);
      else sprite(images.soldier,SOLDIER_V2_FRAMES,a.crouch?4:0,a.crouch?3:0,SOLDIER_V2_SCALE);
      return;
    }
    ctx.fillStyle='#16202255';ctx.beginPath();ctx.ellipse(player.x,player.y+1,16,3,0,0,Math.PI*2);ctx.fill();
    if(player.transform>0){const t=Math.min(7,Math.floor((1-player.transform/1.2)*8)),pose=ArcadeSoldierAnimation.transformation(player.form==='wolf'?t:7-t),frames={soldier:SOLDIER_V2_FRAMES,wolf:ACTION_FRAMES.wolf,transformation:ArcadeSoldierAnimation.transformationFrames};sprite(images[pose.sheet],frames[pose.sheet],pose.row,pose.frame,pose.scale);return;}
    if(player.form==='wolf'){
      if(player.ladder||player.rope?.mantle)sprite(images.wolfClimb,WOLF_CLIMB_FRAMES,0,((Math.floor(player.y/6.5)%4)+4)%4,WOLF_CLIMB_SCALE);
      else if(player.rope)sprite(images.wolf,ACTION_FRAMES.wolf,4,Math.floor(player.hangCycle||0)%4,.48);
      else if(player.claw>0)sprite(images.wolf,ACTION_FRAMES.wolf,1,Math.min(7,Math.floor((.3-player.claw)/.3*8)),.48);
      else if(!player.grounded)sprite(images.wolf,ACTION_FRAMES.wolf,player.vy>0?3:2,4,.48);
      else if(mode.crouching)sprite(images.wolf,ACTION_FRAMES.wolf,2,1,.48);
      else if(Math.abs(player.vx)>15)sprite(images.wolf,ACTION_FRAMES.wolf,5,[0,1,2,6][Math.floor(player.anim*9)%4],.48);
      else sprite(images.wolf,ACTION_FRAMES.wolf,0,7,.48);
      return;
    }
    const pose=ArcadeSoldierAnimation.pose(player,mode,{});
    if(player.rope&&player.rope.length>4){ctx.strokeStyle='#a6c5c2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(player.x,player.y-44);ctx.lineTo(player.rope.x,player.rope.y);ctx.stroke();}
    if(pose.sheet==='mobility')sprite(images.climb,CLIMB_FRAMES,pose.row,pose.frame,CLIMB_SCALE);
    else if(pose.sheet==='slide')sprite(images.slide,SLIDE_FRAMES,pose.row,pose.frame,SLIDE_SCALE);
    else{
      const gait=ArcadeSoldierAnimation.gait(player,mode);
      if(gait){
        ctx.save();ctx.beginPath();ctx.rect(player.x-70,player.y-21,140,24);ctx.clip();sprite(images.walk,WALK_FRAMES,0,gait.frame,WALK_SCALE);ctx.restore();
        ctx.save();ctx.beginPath();ctx.rect(player.x-70,player.y-100,140,80);ctx.clip();sprite(images.soldier,SOLDIER_V2_FRAMES,pose.row,pose.frame,SOLDIER_V2_SCALE);ctx.restore();
      }else sprite(images.soldier,SOLDIER_V2_FRAMES,pose.row,pose.frame,SOLDIER_V2_SCALE);
    }
  }
  function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.min(960,Math.max(640,Math.round(r.width/1.35)));canvas.height=Math.round(r.height/r.width*canvas.width);camera.y=620-canvas.height*.84;}
  new ResizeObserver(resize).observe(canvas);
  function frame(t){const dt=Math.min(.08,(t-last)/1000||0);last=t;if(loaded){if(!paused){accumulator+=dt;while(accumulator>=1/120){update(1/120);accumulator-=1/120;}}else accumulator=0;renderer.draw(ctx,state,camera,canvas.width,canvas.height,drawPlayer);}requestAnimationFrame(frame);}
  const paths={cityObjects:'assets/worlds/mission-02/city-objects-v2.png',civilians:'assets/sprites/civiles-huyendo-v2.png',cityStart:'assets/worlds/mission-02/city-start-v1.png',city:'assets/worlds/mission-02/city-day-v1.png',cemetery:'assets/worlds/mission-02/cemetery-dusk-v1.png',interior:'assets/worlds/mission-02/mausoleum-interior-v1.png',atlas:'assets/worlds/mission-02/environment-atlas-v1.png',effects:'assets/sprites/ambiente-animado-v1.png',soldier:'assets/sprites/soldado-v2.png',climb:'assets/sprites/soldado-escalada-v2.png',walk:'assets/sprites/soldado-pasos-v3.png',slide:'assets/sprites/soldado-deslizamiento-v1.png',wolf:'assets/sprites/soldado-lobo-v1.png',wolfClimb:'assets/sprites/lobo-escalada-v1.png',transformation:'assets/sprites/soldado-transformacion-v2.png',parachute:'assets/sprites/paracaidas-v1.png'};
  Promise.all(Object.entries(paths).map(([key,path])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[key]=img;resolve();};img.onerror=()=>reject(Error(path));img.src=path;}))).then(()=>{renderer=ArcadeLevelTwoRenderer.create(images);loaded=true;resize();wheel.setSprites(images.soldier,SOLDIER_V2_FRAMES[0][0],images.wolf,ACTION_FRAMES.wolf[0][7]);wheel.update(player.form,true,true);play.disabled=false;play.textContent=Number.isFinite(saved.x)?'Continuar misión 02':'Comenzar misión 02';canvas.inert=true;play.focus();if(entry){play.click();save();}}).catch(error=>{message.textContent='No se pudo cargar el escenario. Recarga la página para volver a intentarlo.';console.error(error);});
  requestAnimationFrame(frame);
})();

