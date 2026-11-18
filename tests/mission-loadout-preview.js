(() => {
  'use strict';
  const L=ArcadeLevelTwo,P=ArcadePhysics,canvas=document.getElementById('level-two'),ctx=canvas.getContext('2d');
  const menu=document.getElementById('level-two-menu'),play=document.getElementById('play-two'),message=document.getElementById('level-two-message'),context=document.getElementById('context-two');
  const audio=ArcadeAudio.create(),keys=new Set(),queue=new Set(),camera={x:0,y:0},images={};
  let paused=true,loaded=false,started=false,last=0,accumulator=0,renderer,saveAge=0,shotWait=0,mode={},doorLatch=false;
  const storageKey='cap-dollar.mission-two.v1';
  function load(){try{return JSON.parse(localStorage.getItem(storageKey)||'null')||{};}catch{return{};}}
  const entry=new URLSearchParams(location.search).get('entry'),fresh=entry==='select'||entry==='campaign';
  const saved={x:240,landed:true};
  const memory=new Map([["obra10.progress.v1","{\"version\":1,\"wallet\":5200,\"earned\":0,\"levels\":{\"jump\":3,\"jet\":2,\"life\":3,\"speed\":2,\"damage\":2,\"rate\":1,\"regen\":0},\"owned\":[\"wave\",\"orbital\",\"turret\",\"flame\",\"cryo\"],\"equipped\":\"wave\",\"shield\":4}"],["cap-dollar.campaign.v1","{\"version\":1,\"level\":2,\"score\":7600,\"hp\":7,\"fuel\":1680,\"shield\":4,\"inventory\":{\"selected\":5,\"owned\":[1,2,3,4,5,6,7,8,9],\"ammo\":{\"3\":24,\"4\":9,\"5\":47,\"6\":3,\"7\":13,\"8\":7,\"9\":5}},\"cooldowns\":{\"orbital\":12}}"]]);const store={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
  const campaign=ArcadeCampaign.loadout(store,entry,saved);
  const stats=ArcadeMissionCombat.create(ArcadeCampaign.inventory(campaign.inventory)),powers=ArcadePowers.create(),soundEvents=ArcadeSoundEvents.create(audio);
  for(const [id,time] of Object.entries(campaign.cooldowns||{}))if(Number.isFinite(time)&&time>0)powers.cooldowns[id]=time;
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
  state.fade=0;state.combat=stats;
  const profile=ArcadeProgression.load(store);ArcadeProgression.apply(profile,player,stats,true);
  if(Number.isFinite(campaign.hp))stats.hp=Math.max(1,Math.min(stats.maxHp,campaign.hp));
  if(Number.isFinite(campaign.fuel))player.fuel=Math.min(player.fuelMax,campaign.fuel);
  player.shield=campaign.shield??profile.shield;
  let arrivalAge=0,arrival=fresh||!Number.isFinite(saved.x)||saved.landed===false?ArcadeParachute.sample(0):null;
  state.civilians=arrival?L.createCivilians():[];
  if(!arrival&&saved.form==='wolf'){player.form='wolf';player.h=64;}
  if(arrival){player.x=arrival.x;player.y=arrival.y;player.grounded=false;}
  const wheel=ArcadeCharacterWheel.create(document.getElementById('characters-two'),switchForm);
  function switchForm(){if(paused||arrival?.active||player.transform>0||player.rope||player.ladder)return;player.form=player.form==='wolf'?'soldier':'wolf';player.h=player.form==='wolf'?64:46;player.transform=1.2;player.jetpack=false;player.vx=0;audio.play('whiteRoar',{gain:.3});wheel.update(player.form,true,true);}
  function save(){try{profile.shield=player.shield;ArcadeProgression.save(profile,store);const carry={score:campaign.score||0,hp:stats.hp,fuel:player.fuel,shield:player.shield,inventory:stats.inventory,cooldowns:powers.cooldowns};store.setItem(storageKey,JSON.stringify({...carry,x:player.x,inside:state.inside,form:player.form,landed:!arrival?.active}));ArcadeCampaign.write(store,{...carry,level:2,arrival:!!arrival?.active});}catch{}}
  let noticeAge=0,notice='';
  function notify(text){notice=text;noticeAge=3;context.textContent=text;}
  function chooseWeapon(slot){if(paused||arrival?.active||player.transform>0)return;if(player.form==='wolf'){notify('Vuelve al soldado con T para usar armas.');return;}if(ArcadeArsenal.selectWeapon(stats.inventory,slot)){save();hud.update(false);}else notify('Todavía no has recogido esa arma.');}
  function cyclePower(){if(paused||arrival?.active)return;const list=[...profile.owned,...(player.shield>0?['shield']:[])];profile.equipped=list[(list.indexOf(profile.equipped)+1)%list.length]||null;save();}
  function usePower(){if(paused||arrival?.active)return;if(profile.equipped==='shield')notify('Escudo antibalas · '+player.shield+' impactos restantes');else queue.add('power');}
  const hud=ArcadeMissionHud.create({player,encounter:stats,profile,powers,canvas,audio,score:campaign.score||0,onSelect:chooseWeapon,onPower:usePower,onCycle:cyclePower,onPersist:save});
  function controls(){return{left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),up:keys.has('KeyW')||keys.has('ArrowUp')||queue.has('up'),down:keys.has('KeyS')||keys.has('ArrowDown'),run:keys.has('ShiftLeft')||keys.has('ShiftRight'),jumpPressed:queue.has('jump'),hookPressed:queue.has('hook'),jetpackPressed:queue.has('jet'),fire:keys.has('KeyJ')||keys.has('Numpad0')||queue.has('fire'),power:queue.has('power')||keys.has('KeyG')};}
  function pause(){if(!loaded)return;paused=true;keys.clear();queue.clear();save();menu.hidden=false;canvas.inert=true;audio.setRunning(false);wheel.update(player.form,true,true);play.textContent='Continuar';message.textContent='El recorrido está en pausa.';play.focus();}
  play.onclick=()=>{if(!loaded)return;started=true;paused=false;menu.hidden=true;canvas.inert=false;keys.clear();queue.clear();audio.unlock();audio.setRunning(true);wheel.update(player.form,true,arrival?.active||player.transform>0);canvas.focus();};
  document.getElementById('pause-two').onclick=()=>paused?play.click():pause();
  function press(code){
    if(paused||arrival?.active)return;keys.add(code);
    if(/^Digit[1-9]$/.test(code))chooseWeapon(Number(code.slice(-1)));if(/^Numpad[1-9]$/.test(code))chooseWeapon(Number(code.slice(-1)));if(code==='KeyH')cyclePower();if(code==='KeyG')usePower();if(code==='KeyL'&&player.form==='wolf'&&!player.kick){player.kickDuration=.45;player.kick=.45;player.kickAir=!player.grounded;}if(code==='KeyT')switchForm();if(code==='KeyF')queue.add('jet');
    if(code==='Space')queue.add('jump');if(code==='KeyE')queue.add('hook');if(code==='KeyJ')queue.add('fire');if(code==='KeyW'||code==='ArrowUp')queue.add('up');
  }
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'||e.code==='KeyP'){if(paused&&started)play.click();else pause();return;}
    if(!e.repeat)press(e.code);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{if(!paused)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)pause();});
  window.addEventListener('pagehide',()=>{if(started)save();});
  menu.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=Array.from(menu.querySelectorAll('button,a,input')).filter(el=>!el.disabled&&!el.closest('[hidden]'));const i=items.indexOf(document.activeElement);e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();});
  for(const button of document.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);press(button.dataset.key);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
  }
  function update(dt){
    state.civilians=L.updateCivilians(state.civilians,dt,p=>{if(Math.abs(p.x-player.x)<700)audio.play('scream',{gain:.22,pan:Math.max(-1,Math.min(1,(p.x-player.x)/500)),variant:p.sex?2:0});});
    state.time+=dt;state.fade=Math.max(0,state.fade-dt*2);shotWait=Math.max(0,shotWait-dt);const input=controls();
    player.transform=Math.max(0,(player.transform||0)-dt);player.claw=Math.max(0,(player.claw||0)-dt);player.kick=Math.max(0,(player.kick||0)-dt);noticeAge=Math.max(0,noticeAge-dt);
    wheel.update(player.form,true,paused||arrival?.active||player.transform>0||!!player.rope||!!player.ladder);

    if(arrival?.active){const wasFlying=arrival.flight;arrivalAge+=dt;arrival=ArcadeParachute.sample(arrivalAge);player.x=arrival.x;player.y=arrival.y;player.grounded=arrival.landed;if(wasFlying&&arrival.landed)audio.play('land',{gain:.35});context.textContent=arrival.flight?'MISIÓN 02 · EL UMBRAL DEL REY':arrival.active?'Aterrizando…':'A/D o flechas · Avanzar  |  T · Soldado / Lobo';queue.clear();if(!arrival.active){player.ground=state.geometry.platforms[0];player.fallPeak=620;player.coyote=.1;save();}return;}
    if(player.transform>0){queue.clear();return;}
    if(!input.up)doorLatch=false;
    if(input.up&&!doorLatch&&(L.canEnter(player,state.inside)||L.canExit(player,state.inside))){doorLatch=true;configure(!state.inside,state.inside?L.ENTRANCE:100);queue.clear();save();return;}
    const oldX=player.x,oldJumps=player.jumps,wasGrounded=player.grounded,oldLadder=player.ladder;
    mode=P.step(player,input,dt,state.geometry.platforms,{ladders:state.geometry.ladders,anchors:[]});
    L.finishClimb(player,oldLadder,state.geometry);
    L.solidWalls(player,oldX,state.geometry.buildings);

    const ay=input.up?-1:input.down?1:0,ax=ay?(input.left?-1:input.right?1:0):player.facing,norm=Math.hypot(ax,ay)||1;
    player.aim={x:ax/norm,y:ay/norm};if(player.grounded)player.walkCycle=(player.walkCycle||0)+Math.abs(player.vx)*dt/52;
    const powerMessage=ArcadeMissionCombat.update(stats,player,input,dt,state.geometry.platforms,powers,profile,{left:camera.x,right:camera.x+canvas.width,top:camera.y,bottom:camera.y+canvas.height});if(powerMessage)notify(powerMessage);
    soundEvents.update({player,encounter:stats,powers},dt);state.bullets=stats.bullets;
    queue.clear();
    const targetX=Math.max(0,Math.min(P.WORLD.width-canvas.width,player.x-canvas.width*.38));camera.x+=(targetX-camera.x)*(1-Math.exp(-6*dt));
    // Horizontal exploration keeps the walking plane steady; height follows only substantial climbs.
    const targetY=Math.min(620-canvas.height*.84,player.y-canvas.height*.66);camera.y+=(targetY-camera.y)*(1-Math.exp(-5*dt));
    saveAge+=dt;if(saveAge>2&&player.grounded){saveAge=0;save();}
    document.getElementById('region-two').textContent=L.zone(player.x,state.inside);
    document.getElementById('route-two').value=state.inside?18000:player.x;
    document.getElementById('distance-two').textContent=state.inside?'INTERIOR · EL MAUSOLEO':Math.round(player.x/180)+'% DEL RECORRIDO';
    const nearWall=state.geometry.ladders.some(l=>Math.abs(player.x-l.x)<32&&player.y>l.top+2);
    context.textContent=noticeAge>0?notice:L.canEnter(player,state.inside)?'W / ↑ · Entrar al mausoleo':L.canExit(player,state.inside)?'W / ↑ · Volver al cementerio':state.inside&&player.x>1920?'Has llegado ante el rey.':player.rope?'A/D · Recorrer  |  W · Trepar  |  E / Espacio · Soltar':nearWall?'W / ↑ · Subir al siguiente piso':state.time<8&&player.x<800?'Avanza por la ciudad. Puedes atravesar los edificios y subir por sus plataformas.':'';
  }
  function sprite(img,frames,row,frame,scale){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
  function drawJetpack(){
    ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y));ctx.scale(player.facing,1);
    const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
    const thrust=player.vy< -10?1:player.vy>10?.25:Math.abs(player.vx)>15?.75:.5;
    // Exhaust bends opposite travel; two nozzles flicker out of phase.
    for(const [i,x] of [-19,-12].entries()){
      const pulse=Math.sin(player.anim*37+i*2)*1.6+Math.sin(player.anim*61+i)*.7;
      const length=8+thrust*15+pulse,drift=-player.vx*player.facing/65;
      ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#ffae45';ctx.beginPath();ctx.ellipse(x+2,-9+length*.4,7,8+length*.55,0,0,Math.PI*2);ctx.fill();ctx.restore();
      for(let j=0;j<length;j+=2){const t=j/length,width=Math.max(1,Math.round(5*(1-t))),bend=drift*t+Math.sin(player.anim*43+i+j*.6)*t;
        r(x+2+bend-width/2,-9+j,width,2,t<.22?'#e8ffff':t<.48?'#80dfff':t<.75?'#ffc868':'#ef823d');
        if(t<.55)r(x+1+bend,-9+j,2,2,'#fff6cf');
      }
      for(let n=0;n<3;n++){const t=(player.anim*2.2+n/3+i*.16)%1;ctx.globalAlpha=(1-t)*.32;r(x+drift*t*3+Math.sin(n*6+i)*t*6,-5+length+t*19,2,2,'#c8c4b2');}ctx.globalAlpha=1;
    }
    // Dark mounting plate, shaded cylinders, metal bands and heat-darkened bells.
    r(-21,-38,16,28,'#122027');r(-19,-39,11,3,'#26373d');
    for(const x of [-20,-13]){r(x,-36,6,22,'#344c50');r(x+1,-35,3,20,'#718d89');r(x+1,-34,1,17,'#b4c6ac');r(x,-31,6,2,'#b19c63');r(x,-19,6,2,'#a4aea3');r(x,-14,6,4,'#17272f');r(x+1,-11,4,2,'#b6d5d2');}
    r(-14,-34,2,17,'#26353a');r(-10,-32,7,3,'#655537');r(-10,-23,7,2,'#655537');
    r(-19,-37,3,2,player.fuel/player.fuelMax<.2?'#ff7257':'#8becda');
    ctx.restore();
    // Downwash reaches nearby solid surfaces and lifts a short trail of dust.
    const support=state.geometry.platforms.filter(q=>q.y>=player.y&&q.y-player.y<65&&player.x>=q.x&&player.x<=q.x+q.w).sort((a,b)=>a.y-b.y)[0];
    if(support){ctx.save();const strength=1-(support.y-player.y)/65;for(let i=0;i<8;i++){const t=(player.anim*1.8+i/8)%1,side=i%2?1:-1;ctx.globalAlpha=(1-t)*strength*.38;ctx.fillStyle='#c3b395';ctx.fillRect(player.x+side*(8+t*32),support.y-2-Math.sin(t*Math.PI)*5,3+t*4,2);}ctx.restore();}
  }
  function drawPlayer(){
    if(arrival?.active){
      const a=arrival,scale=.34,frame=a.frame,dx=a.flight?player.x:player.x-65*a.collapse,anchorY=a.flight?player.y-34:player.y-34+34*a.collapse;
      ctx.save();ctx.globalAlpha=a.alpha;ctx.drawImage(images.parachute,(frame%4)*384,Math.floor(frame/4)*512,384,512,Math.round(dx-192*scale),Math.round(anchorY-470*scale),384*scale,512*scale);ctx.restore();
      if(a.flight)sprite(images.climb,CLIMB_FRAMES,1,0,CLIMB_SCALE);
      else sprite(images.soldier,SOLDIER_V2_FRAMES,a.crouch?4:0,a.crouch?3:0,SOLDIER_V2_SCALE);
      return;
    }
    // A contact shadow belongs to the supporting floor, never to airborne feet.
    if(player.grounded&&!player.jetpack&&!player.rope&&!player.ladder){ctx.fillStyle='#16202255';ctx.beginPath();ctx.ellipse(player.x,player.y+1,16,3,0,0,Math.PI*2);ctx.fill();}
    if(player.transform>0){const t=Math.min(7,Math.floor((1-player.transform/1.2)*8)),pose=ArcadeSoldierAnimation.transformation(player.form==='wolf'?t:7-t),frames={soldier:SOLDIER_V2_FRAMES,wolf:ACTION_FRAMES.wolf,transformation:ArcadeSoldierAnimation.transformationFrames};sprite(images[pose.sheet],frames[pose.sheet],pose.row,pose.frame,pose.scale);return;}
    if(player.form==='wolf'){
      if(player.ladder||player.rope?.mantle)sprite(images.wolfClimb,WOLF_CLIMB_FRAMES,0,((Math.floor(player.y/6.5)%4)+4)%4,WOLF_CLIMB_SCALE);
      else if(player.rope)sprite(images.wolf,ACTION_FRAMES.wolf,4,Math.floor(player.hangCycle||0)%4,.48);
      else if(player.kick>0)sprite(images.kicks,KICK_FRAMES,player.kickAir?1:0,Math.min(7,Math.floor((1-player.kick/.45)*8)),.28);
      else if(player.claw>0)sprite(images.wolf,ACTION_FRAMES.wolf,1,Math.min(7,Math.floor((.3-player.claw)/.3*8)),.48);
      else if(!player.grounded)sprite(images.wolf,ACTION_FRAMES.wolf,player.vy>0?3:2,4,.48);
      else if(mode.crouching)sprite(images.wolf,ACTION_FRAMES.wolf,2,1,.48);
      else if(Math.abs(player.vx)>15)sprite(images.wolf,ACTION_FRAMES.wolf,5,[0,1,2,6][Math.floor(player.anim*9)%4],.48);
      else sprite(images.wolf,ACTION_FRAMES.wolf,0,7,.48);
      return;
    }
    const pose=ArcadeSoldierAnimation.pose(player,mode,stats);if(player.jetpack)drawJetpack();
    if(player.rope&&player.rope.length>4){ctx.strokeStyle='#a6c5c2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(player.x,player.y-44);ctx.lineTo(player.rope.x,player.rope.y);ctx.stroke();}
    if(pose.sheet==='mobility')sprite(images.climb,CLIMB_FRAMES,pose.row,pose.frame,CLIMB_SCALE);
    else if(pose.sheet==='melee')sprite(images.melee,MELEE_FRAMES,pose.row,pose.frame,MELEE_SCALE);
    else if(pose.sheet==='slide')sprite(images.slide,SLIDE_FRAMES,pose.row,pose.frame,SLIDE_SCALE);
    else{
      const gait=ArcadeSoldierAnimation.gait(player,mode);
      if(gait){
        ctx.save();ctx.beginPath();ctx.rect(player.x-70,player.y-21,140,24);ctx.clip();sprite(images.walk,WALK_FRAMES,0,gait.frame,WALK_SCALE);ctx.restore();
        ctx.save();ctx.beginPath();ctx.rect(player.x-70,player.y-100,140,80);ctx.clip();sprite(images.soldier,SOLDIER_V2_FRAMES,pose.row,pose.frame,SOLDIER_V2_SCALE);ctx.restore();
      }else sprite(images.soldier,SOLDIER_V2_FRAMES,pose.row,pose.frame,SOLDIER_V2_SCALE);
    }
  }
  function drawLoadout(){drawPlayer();if(!arrival?.active){const pose=ArcadeSoldierAnimation.pose(player,mode,stats);if(player.form!=='wolf'&&!player.transform&&!player.rope&&!player.ladder&&pose.armed&&!powers.flame)ArcadeWeaponRenderer.draw(ctx,player,stats);ArcadeMissionCombat.draw(ctx,stats,powers,player,{top:camera.y,bottom:camera.y+canvas.height});}}
  function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.min(960,Math.max(640,Math.round(r.width/1.35)));canvas.height=Math.round(r.height/r.width*canvas.width);camera.y=620-canvas.height*.84;}
  new ResizeObserver(resize).observe(canvas);
  function frame(t){const dt=Math.min(.08,(t-last)/1000||0);last=t;if(loaded){if(!paused){accumulator+=dt;while(accumulator>=1/120){update(1/120);accumulator-=1/120;}}else accumulator=0;renderer.draw(ctx,state,camera,canvas.width,canvas.height,drawLoadout);hud.update(paused||arrival?.active||player.transform>0);}requestAnimationFrame(frame);}
  const paths={tankBattle:'assets/sprites/tanques-batalla-v1.png',melee:'assets/sprites/soldado-cuchillo-hacha-v1.png',kicks:'assets/sprites/lobo-patadas-v1.png',powerSheet:'assets/sprites/poderes-v1.png',orbitalSheet:'assets/sprites/orbital-superrayo-v1.png',cityObjects:'assets/worlds/mission-02/city-objects-v2.png',civilians:'assets/sprites/civiles-huyendo-v2.png',cityStart:'assets/worlds/mission-02/city-start-v1.png',city:'assets/worlds/mission-02/city-day-v1.png',cemetery:'assets/worlds/mission-02/cemetery-dusk-v1.png',interior:'assets/worlds/mission-02/mausoleum-interior-v1.png',atlas:'assets/worlds/mission-02/environment-atlas-v1.png',effects:'assets/sprites/ambiente-animado-v1.png',soldier:'assets/sprites/soldado-v2.png',climb:'assets/sprites/soldado-escalada-v2.png',walk:'assets/sprites/soldado-pasos-v3.png',slide:'assets/sprites/soldado-deslizamiento-v1.png',wolf:'assets/sprites/soldado-lobo-v1.png',wolfClimb:'assets/sprites/lobo-escalada-v1.png',transformation:'assets/sprites/soldado-transformacion-v2.png',parachute:'assets/sprites/paracaidas-v1.png'};
  Promise.all(Object.entries(paths).map(([key,path])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[key]=img;resolve();};img.onerror=()=>reject(Error(path));img.src=path;}))).then(()=>{images.melee=prepareWhiteDeath(images.melee);ArcadePowerSprites.setSpriteSheet(images.powerSheet);ArcadePowerSprites.setOrbitalSheet(images.orbitalSheet);renderer=ArcadeLevelTwoRenderer.create(images);loaded=true;resize();wheel.setSprites(images.soldier,SOLDIER_V2_FRAMES[0][0],images.wolf,ACTION_FRAMES.wolf[0][7]);wheel.update(player.form,true,true);play.disabled=false;play.textContent=Number.isFinite(saved.x)?'Continuar misión 02':'Comenzar misión 02';canvas.inert=true;play.focus();if(entry){play.click();save();window.history?.replaceState(null,'','level-two.html');}}).catch(error=>{message.textContent='No se pudo cargar el escenario. Recarga la página para volver a intentarlo.';console.error(error);});
  requestAnimationFrame(frame);
})();

