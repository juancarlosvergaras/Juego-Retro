(() => {
  'use strict';
  const L=ArcadeLevelTwo,P=ArcadePhysics,canvas=document.getElementById('level-two'),ctx=canvas.getContext('2d');
  const menu=document.getElementById('level-two-menu'),play=document.getElementById('play-two'),message=document.getElementById('level-two-message'),context=document.getElementById('context-two');
  const audio=ArcadeAudio.create(),keys=new Set(),queue=new Set(),firePointers=new Set(),camera={x:0,y:0},images={};
  let paused=true,loaded=false,started=false,last=0,accumulator=0,renderer,saveAge=0,shotWait=0,mode={},doorLatch=false,mainMenu=null,queuedAim=null;
  const fireBuffer=ArcadeArsenal.createFireBuffer();
  const storageKey='cap-dollar.mission-two.v1';
  function load(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return{};}}
  const entry=new URLSearchParams(location.search).get('entry'),fresh=entry==='select'||entry==='campaign';
  const saved=fresh?{}:load();
  let store;try{store=localStorage;}catch{store={getItem:()=>null,setItem:()=>{}};}
  const campaign=ArcadeCampaign.loadout(store,entry,saved);
  const stats=ArcadeMissionCombat.create(ArcadeCampaign.inventory(campaign.inventory)),powers=ArcadePowers.create(),soundEvents=ArcadeSoundEvents.create(audio);
  for(const [id,time] of Object.entries(campaign.cooldowns||{}))if(Number.isFinite(time)&&time>0)powers.cooldowns[id]=time;
  const defeated=Array.isArray(saved.defeated)?saved.defeated:[];


  const king=ArcadeMausoleumKing.create(saved.king||{},ArcadeDifficulty.get(ArcadeDifficulty.load(store)).health),interiorEnemies=ArcadeMausoleumKing.interiorEnemies(Array.isArray(saved.interiorDefeated)?saved.interiorDefeated:[]),kingAtlases={};
  const storm=ArcadeStormZombie.create(saved.storm||{});
  const cityTank=ArcadeCityTank.create(saved.tank||{},ArcadeDifficulty.get(ArcadeDifficulty.load(store)).health);
  const loot=ArcadeMissionTwoLoot.create(L.geometry(false).platforms,Number.isFinite(saved.lootSeed)?saved.lootSeed:Math.floor(Math.random()*4294967296),saved.loot||{});
  const cityEnemies=[...ArcadeMissionCombat.cityEnemies(defeated),...ArcadeCemeteryZombies.create(defeated,L.geometry(false).platforms,[...loot.weapons,...loot.stars,...loot.medkits,...loot.fuelTanks]),...ArcadeCemeteryBat.createAll(defeated),storm];
  stats.enemies=cityEnemies;
  const score=ArcadeScore.create();score.total=campaign.score||0;for(const n of [...cityEnemies,...interiorEnemies])if(n.hp<=0)score.awarded.add('soldiers:'+n.id);
  for(const w of loot.weapons)if(w.taken)score.awarded.add('weapons:'+w.id);
  for(const kit of loot.medkits)if(kit.taken)score.awarded.add('health:'+kit.id);
  for(const tank of loot.fuelTanks)if(tank.taken)score.awarded.add('fuel:'+tank.id);
  for(const star of loot.stars)if(star.taken)score.awarded.add('challenge:city-star:'+star.id);
  if(loot.stars.every(s=>s.taken))score.awarded.add('challenge:city-stars-all');
  if(cityTank.hp<=0)score.awarded.add('challenge:city-tank');if(king.defeated)score.awarded.add('challenge:mausoleum-king');
  const player=P.createPlayer(),state={player,time:0,inside:!!saved.inside,geometry:null,bullets:[],fade:0,waters:L.CRATERS.map(ArcadeWaterCrater.create)};
  Object.assign(P.WORLD,L.WORLD);
  function configure(inside,x){
    state.inside=inside;state.geometry=L.geometry(inside);stats.enemies=inside?interiorEnemies:cityEnemies;stats.king=inside?king:null;stats.tank=inside?null:cityTank;stats.pickups=inside?[]:loot.weapons;stats.medkits=inside?[]:loot.medkits;stats.bullets=[];stats.playerPlasma=[];stats.zombieEffects=[];stats.explosions=[];stats.debris=[];stats.weaponAction=null;Object.assign(powers,ArcadePowers.create(),{cooldowns:powers.cooldowns});P.WORLD.width=inside?L.INTERIOR_WIDTH:L.WORLD.width;
    const form=['wolf','zombie'].includes(player.form)?player.form:'soldier';
    Object.assign(player,{x:Math.max(30,Math.min(P.WORLD.width-30,x)),y:620,vx:0,vy:0,grounded:true,ground:state.geometry.platforms[0],rope:null,ladder:null,jumps:0,form,jetpack:false,h:form==='wolf'?64:form==='zombie'?68:46,burrow:null,burrowLatch:false,fallPeak:620,fallDamage:0,ram:null,ramLatch:false,ramKickLatch:false,idleTime:0,wolfAttack:null,wolfChain:null,wolfQueued:null,wolfFireHeld:false,wolfKickHeld:false});
    player.y=P.surfaceY(state.geometry.platforms[0],player.x);player.fallPeak=player.y;
    P.step(player,{},0,state.geometry.platforms);
    camera.x=Math.max(0,Math.min(P.WORLD.width-canvas.width,player.x-canvas.width*.35));camera.y=620-canvas.height*.84;
    state.bullets=[];state.fade=1;
  }
  configure(saved.dead?false:state.inside,saved.dead?240:Number.isFinite(saved.x)?saved.x:160);
  state.fade=0;state.combat=stats;state.loot=loot;state.king=king;state.storm=storm;
  ArcadeDifficulty.apply({...stats,enemies:[...cityEnemies,...interiorEnemies]},ArcadeDifficulty.load(store));
  const difficulty=ArcadeDifficulty.get(ArcadeDifficulty.load(store));stats.combatDamage=difficulty.damage;stats.hitProtection=difficulty.grace;
  const profile=ArcadeProgression.load(store);ArcadeProgression.apply(profile,player,stats,true);
  if(fresh||!Number.isFinite(saved.x)||saved.dead)stats.hp=stats.maxHp;
  else if(Number.isFinite(campaign.hp))stats.hp=Math.max(1,Math.min(stats.maxHp,campaign.hp));
  if(Number.isFinite(campaign.fuel))player.fuel=Math.min(player.fuelMax,campaign.fuel);
  player.shield=campaign.shield??profile.shield;
  let arrivalAge=0,arrival=fresh||!Number.isFinite(saved.x)||saved.landed===false?ArcadeParachute.sample(0):null;
  state.civilians=arrival?L.createCivilians():[];
  if(saved.zombieUnlocked||campaign.zombieUnlocked){profile.zombieUnlocked=true;player.zombieUnlocked=true;}
  if(!arrival&&(saved.form==='wolf'||saved.form==='zombie'&&player.zombieUnlocked)){player.form=saved.form;player.h=player.form==='zombie'?68:64;}
  player.formCooldown=Math.max(0,Math.min(10,Number(saved.formCooldown??campaign.formCooldown)||0));
  if(arrival){player.x=arrival.x;player.y=arrival.y;player.grounded=false;}
  const wheel=ArcadeCharacterWheel.create(document.getElementById('characters-two'),switchForm);
  function switchForm(target){if(paused||arrival?.active)return;if(!ArcadeZombieForm.change(stats,player,target)){if(player.formCooldown>0)notify('Transformación disponible en '+Math.ceil(player.formCooldown)+' s');return;}audio.play('whiteRoar',{gain:.3});notify('Forma de '+ArcadeZombieForm.label(player.form)+' · T en 10 s');save();wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown);}
  function save(){try{profile.shield=player.shield;ArcadeProgression.save(profile,store);const carry={formCooldown:player.formCooldown||0,zombieUnlocked:!!player.zombieUnlocked,score:score.total,hp:stats.hp,fuel:player.fuel,shield:player.shield,inventory:stats.inventory,cooldowns:powers.cooldowns};store.setItem(storageKey,JSON.stringify({...carry,x:player.x,inside:state.inside,form:player.form,landed:!arrival?.active,dead:stats.dead,defeated:cityEnemies.filter(n=>n.hp<=0).map(n=>n.id),interiorDefeated:interiorEnemies.filter(n=>n.hp<=0).map(n=>n.id),king:ArcadeMausoleumKing.snapshot(king),storm:{x:storm.x,hp:storm.hp/storm.maxHp*42},tank:{x:cityTank.x,hp:cityTank.hp},lootSeed:loot.seed,loot:ArcadeMissionTwoLoot.snapshot(loot)}));ArcadeCampaign.write(store,{...carry,level:2,arrival:!!arrival?.active});}catch{}}
  let noticeAge=0,notice='';
  function notify(text){notice=text;noticeAge=3;context.textContent=text;}
  function chooseWeapon(slot){if(paused||arrival?.active||player.transform>0)return;if(player.form==='wolf'||player.form==='zombie'){notify('Vuelve al soldado con T para usar armas.');return;}if(ArcadeArsenal.selectWeapon(stats.inventory,slot)){save();hud.update(false);}else notify('Todavía no has recogido esa arma.');}
  function cyclePower(){if(paused||arrival?.active)return;const list=[...profile.owned,...(player.shield>0?['shield']:[])];profile.equipped=list[(list.indexOf(profile.equipped)+1)%list.length]||null;save();}
  function usePower(){if(paused||arrival?.active)return;if(profile.equipped==='shield')notify('Escudo antibalas · '+player.shield+' impactos restantes');else queue.add('power');}
  const hud=ArcadeMissionHud.create({player,encounter:stats,profile,powers,canvas,audio,score:()=>score.total,onSelect:chooseWeapon,onPower:usePower,onCycle:cyclePower,onPersist:save});
  function controls(){return{left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),up:keys.has('KeyW')||keys.has('ArrowUp')||queue.has('up'),down:keys.has('KeyS')||keys.has('ArrowDown'),run:keys.has('ShiftLeft')||keys.has('ShiftRight'),jumpPressed:queue.has('jump'),hookPressed:queue.has('hook'),jetpackPressed:queue.has('jet'),...ArcadeArsenal.triggerInput(keys,firePointers.size>0,queue.has('fire')),kick:queue.has('kick')||keys.has('KeyL'),power:queue.has('power')||keys.has('KeyG')};}
  function pause(){if(!loaded)return;paused=true;player.wolfQueued=null;keys.clear();firePointers.clear();queue.clear();queuedAim=null;fireBuffer.clear();save();menu.hidden=false;canvas.inert=true;audio.setRunning(false);wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown);play.textContent='Continuar';document.getElementById('level-two-title').textContent='Partida en pausa';message.textContent='Tu partida queda detenida mientras consultas el menú.';document.getElementById('pause-options').hidden=false;document.getElementById('shop').hidden=true;document.getElementById('shortcuts').hidden=true;const shortcuts=document.getElementById('show-shortcuts');shortcuts.textContent='Ver atajos de teclado';shortcuts.setAttribute('aria-expanded','false');play.focus();}
  play.onclick=()=>{if(!loaded)return;if(stats.dead){stats.dead=false;stats.hp=stats.maxHp;stats.invincible=2;player.hurt=0;stats.bullets=[];stats.explosions=[];configure(false,240);save();}started=true;paused=false;menu.hidden=true;canvas.inert=false;keys.clear();firePointers.clear();queue.clear();queuedAim=null;fireBuffer.clear();audio.unlock();audio.setRunning(true);wheel.update(player.form,true,arrival?.active||player.transform>0,player.zombieUnlocked,player.formCooldown);canvas.focus();};
  document.getElementById('pause-two').onclick=()=>paused?play.click():pause();
  document.getElementById('show-shortcuts').onclick=()=>{const panel=document.getElementById('shortcuts'),button=document.getElementById('show-shortcuts');panel.hidden=!panel.hidden;button.textContent=panel.hidden?'Ver atajos de teclado':'Ocultar atajos de teclado';button.setAttribute('aria-expanded',String(!panel.hidden));};
  document.getElementById('restart').onclick=()=>{if(loaded)location.assign('level-two.html?entry=select');};
  mainMenu=window.ArcadeMainMenu?.create({mission:2,resumeAvailable:Number.isFinite(saved.x),soundControls:document.querySelector('.sound-controls'),tutorial:window.ArcadeTutorial?.create(store),difficulty:ArcadeDifficulty.load(store),
    onPlay(){play.click();},onPause(){pause();menu.hidden=true;},onSound(){audio.setRunning(false);},onSelectMission(){save();started=false;},
    onDifficulty(id){ArcadeDifficulty.apply({...stats,enemies:[...cityEnemies,...interiorEnemies]},id);const level=ArcadeDifficulty.get(id),fraction=cityTank.hp/cityTank.maxHp;stats.combatDamage=level.damage;stats.hitProtection=level.grace;cityTank.maxHp=Math.max(1,Math.round(48*level.health));cityTank.hp=cityTank.maxHp*fraction;ArcadeMausoleumKing.rescale(king,level.health);updateObjectives();return ArcadeDifficulty.save(id,store);}});
  document.getElementById('open-main-menu').onclick=()=>mainMenu?.show();
  function queueFire(){queue.add('fire');fireBuffer.press(stats.inventory.selected);const input=controls();queuedAim=ArcadeArsenal.aimDirection({...input,aimUp:input.up,aimDown:input.down},player.facing);}
  function press(code){
    if(paused||arrival?.active)return;keys.add(code);
    if(/^Digit[1-9]$/.test(code))chooseWeapon(Number(code.slice(-1)));if(/^Numpad[1-9]$/.test(code))chooseWeapon(Number(code.slice(-1)));if(code==='KeyH')cyclePower();if(code==='KeyG')usePower();if(code==='KeyL')queue.add('kick');if(code==='KeyT')switchForm();if(code==='KeyF')queue.add('jet');
    if(code==='Space')queue.add('jump');if(code==='KeyE')queue.add('hook');if(ArcadeArsenal.fireKeys.includes(code))queueFire();if(code==='KeyW'||code==='ArrowUp')queue.add('up');
  }
  window.addEventListener('keydown',e=>{
    if(mainMenu?.isOpen())return;
    const code=ArcadeArsenal.controlCode(e);
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space',...ArcadeArsenal.fireKeys].includes(code))e.preventDefault();
    if(code==='Escape'||code==='KeyP'){if(paused&&started)play.click();else pause();return;}
    if(!paused&&!arrival?.active)keys.add(code);
    if(!e.repeat)press(code);
  });
  window.addEventListener('keyup',e=>{keys.delete(ArcadeArsenal.controlCode(e));keys.delete(e.code);});
  // A pointer trigger avoids keyboard rollover limits without changing arrow aim.
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||!loaded||paused||stats.dead||arrival?.active||mainMenu?.isOpen())return;
    e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
    firePointers.add(e.pointerId);queueFire();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>firePointers.delete(e.pointerId));

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
    ArcadeZombieForm.tick(player,dt);
    player.transform=Math.max(0,(player.transform||0)-dt);player.claw=Math.max(0,(player.claw||0)-dt);player.kick=Math.max(0,(player.kick||0)-dt);noticeAge=Math.max(0,noticeAge-dt);
    wheel.update(player.form,true,paused||arrival?.active||player.transform>0||!!player.rope||!!player.ladder||!!player.burrow,player.zombieUnlocked,player.formCooldown);

    if(arrival?.active){const wasFlying=arrival.flight;arrivalAge+=dt;arrival=ArcadeParachute.sample(arrivalAge);player.x=arrival.x;player.y=arrival.y;player.grounded=arrival.landed;if(wasFlying&&arrival.landed)audio.play('land',{gain:.35});context.textContent=arrival.flight?'MISIÓN 02 · EL UMBRAL DEL REY':arrival.active?'Aterrizando…':'A/D o flechas · Avanzar  |  T · Soldado / Lobo';queue.clear();queuedAim=null;fireBuffer.clear();if(!arrival.active){player.ground=state.geometry.platforms[0];player.fallPeak=620;player.coyote=.1;save();}return;}
    if(player.transform>0){queue.clear();queuedAim=null;fireBuffer.clear();return;}
    if(!input.up)doorLatch=false;
    if(input.up&&!input.fire&&!player.burrow&&!doorLatch&&(L.canEnter(player,state.inside)||L.canExit(player,state.inside))){if(!state.inside&&(storm.hp>0||storm.death>0||!profile.zombieUnlocked)){doorLatch=true;notify(storm.hp>0?'Derrota al Heraldo Eléctrico para abrir el mausoleo.':'El Heraldo está cayendo… Recoge su poder antes de entrar.');}else{doorLatch=true;configure(!state.inside,state.inside?L.ENTRANCE:100);queue.clear();queuedAim=null;fireBuffer.clear();save();return;}}
    const oldX=player.x,oldJumps=player.jumps,wasGrounded=player.grounded,oldLadder=player.ladder;
    player.aim=ArcadeArsenal.firingAim({...input,aimUp:input.up,aimDown:input.down},player.facing,queuedAim);
    mode=P.step(player,ArcadeArsenal.movementInput(player,input),dt,state.geometry.platforms,{ladders:state.geometry.ladders,anchors:[]});
    L.finishClimb(player,oldLadder,state.geometry);
    L.solidWalls(player,oldX,state.geometry.buildings);
    for(const water of state.waters)ArcadeWaterCrater.update(water,player,dt,state.inside,()=>audio.play('splash',{gain:.3}));

    if(player.aim.x&&player.form!=='wolf')player.facing=Math.sign(player.aim.x);ArcadeSoldierAnimation.advanceWalk(player,dt);
    const previousAction=stats.weaponAction;
    const powerMessage=ArcadeMissionCombat.update(stats,player,input,dt,state.geometry.platforms,powers,profile,{left:camera.x,right:camera.x+canvas.width,top:camera.y,bottom:camera.y+canvas.height});if(powerMessage)notify(powerMessage);
    const beforeScore=score.total;
    player.healGlow=Math.max(0,(player.healGlow||0)-dt);
    if(!state.inside&&!stats.dead){
      const supplies=ArcadeMissionTwoLoot.collectSupplies(loot,player,stats);
      if(supplies.healed)notify('Botiquín rojo · +'+supplies.healed.amount+' de vida');
      if(supplies.fuel)notify('Gasolina repuesta · Depósito lleno');
      if(supplies.healed||supplies.fuel)save();
      const found=ArcadeMissionTwoLoot.collect(loot,player,stats.inventory);
      if(found.names.length)notify(found.names.join(' · ')+' recogida');
      for(const star of found.stars){ArcadeScore.bonus(score,{id:'city-star:'+star.id,points:200,label:'Estrella',x:star.x,y:star.y});audio.play('pickup',{gain:.6});}
      if(loot.stars.every(s=>s.taken))ArcadeScore.bonus(score,{id:'city-stars-all',points:1000,label:'Cinco estrellas',x:player.x,y:player.y});
      if(cityTank.hp<=0)ArcadeScore.bonus(score,{id:'city-tank',points:1000,label:'Tanque destruido',x:cityTank.x,y:cityTank.y-65});
    }
    if(!state.inside&&storm.hp<=0&&storm.death<=0&&!profile.zombieUnlocked){profile.zombieUnlocked=true;player.zombieUnlocked=true;ArcadeScore.bonus(score,{id:'storm-zombie',points:1500,label:'Traje de zombi',x:storm.x,y:storm.y-85});notify('¡Traje de zombi desbloqueado! T · J rayos · L plasma · ↓ bajo tierra');save();}
    if(state.inside){for(const effect of king.events)audio.play(effect,{gain:.55});if(king.defeated){const reward=ArcadeScore.bonus(score,{id:'mausoleum-king',points:5000,label:'Rey del mausoleo derrotado',x:king.x,y:king.y-90});if(reward){notify('¡Rey del mausoleo derrotado! Misión 02 completada · +5000 puntos');save();}}}
    P.updateIdle(player,input,dt);
    soundEvents.update({player,encounter:stats,powers,fuelTanks:state.inside?[]:loot.fuelTanks},dt);state.bullets=stats.bullets;
    ArcadeScore.tick(score,dt);ArcadeScore.sync(score,{enemies:stats.enemies,pickups:stats.pickups,medkits:stats.medkits},state.inside?[]:loot.fuelTanks);const reward=score.total-beforeScore;if(reward){campaign.score=score.total;profile.wallet+=reward;save();}
    updateObjectives();
    if(stats.dead){player.jetpack=false;pause();play.textContent='Reintentar misión';message.textContent='Has caído. Regresa al punto de entrada para continuar la misión.';return;}
    queue.clear();if(fireBuffer.tick(dt,player,stats,previousAction))queue.add('fire');else queuedAim=null;
    const focus=state.inside&&king.active?player.x+Math.max(-canvas.width*.7,Math.min(canvas.width*.7,king.x-player.x))*.5-canvas.width*.5:player.x-canvas.width*.38;const targetX=Math.max(0,Math.min(P.WORLD.width-canvas.width,focus));camera.x+=(targetX-camera.x)*(1-Math.exp(-6*dt));
    // Horizontal exploration keeps the walking plane steady; height follows only substantial climbs.
    const targetY=Math.min(620-canvas.height*.84,player.y-canvas.height*.66);camera.y+=(targetY-camera.y)*(1-Math.exp(-5*dt));
    saveAge+=dt;if(saveAge>2&&player.grounded){saveAge=0;save();}
    document.getElementById('region-two').textContent=L.zone(player.x,state.inside);
    document.getElementById('route-two').value=state.inside?18000:player.x;
    document.getElementById('distance-two').textContent=state.inside?'INTERIOR · EL MAUSOLEO':Math.round(player.x/180)+'% DEL RECORRIDO';
    const nearWall=state.geometry.ladders.some(l=>Math.abs(player.x-l.x)<32&&player.y>l.top+2);
    context.textContent=noticeAge>0?notice:player.jetpack?(player.jetBoost?'TURBO · Gasolina ×2 · Suelta Shift para vuelo normal':'Shift · Acelerar  |  F · Apagar jetpack'):L.canEnter(player,state.inside)?'W / ↑ · Entrar al mausoleo':L.canExit(player,state.inside)?'W / ↑ · Volver al cementerio':state.inside&&king.defeated?'MISIÓN 02 COMPLETADA · El rey ha caído':state.inside&&king.phase==='crack'?'¡La coraza se rompe!':state.inside&&king.phase==='roar'?'EL REY PUTREFACTO · Segunda fase':player.rope?'A/D · Recorrer  |  W · Trepar  |  E / Espacio · Soltar':nearWall?'W / ↑ · Subir al siguiente piso':state.time<8&&player.x<800?'Avanza por la ciudad. Puedes atravesar los edificios y subir por sus plataformas.':'';
  }
  function updateObjectives(){
    document.getElementById('stars-two').textContent='★ '+loot.stars.filter(s=>s.taken).length+' / 5';
    if(state.inside){const visible=king.active||king.defeated;document.getElementById('boss-hud').hidden=!visible;document.getElementById('boss-title').textContent=king.defeated?'REY DERROTADO · MISIÓN COMPLETADA':king.phase==='crack'?'LA CORAZA SE ROMPE…':king.stage===1?'JEFE · EL REY DE PIEDRA · I / II':'JEFE · EL REY PUTREFACTO · II / II';const meter=document.getElementById('boss-fill');meter.style.width=(100*king.hp/king.maxHp)+'%';meter.parentElement.setAttribute('aria-label','Vida del rey del mausoleo');meter.parentElement.setAttribute('aria-valuemax',king.maxHp);meter.parentElement.setAttribute('aria-valuenow',Math.ceil(king.hp));document.getElementById('boss-value').textContent=Math.ceil(king.hp)+' / '+king.maxHp;}
    const destroyed=cityTank.hp<=0;
    const active=!state.inside&&Math.abs(player.x-cityTank.x)<850&&(!destroyed||cityTank.deathAge<2.5);
    if(!state.inside){document.getElementById('boss-hud').hidden=!active;
    document.getElementById('boss-title').textContent=destroyed?'SUBJEFE · TANQUE DESTRUIDO':'SUBJEFE · TANQUE DE ASEDIO';
    const meter=document.getElementById('boss-fill');meter.style.width=(100*cityTank.hp/cityTank.maxHp)+'%';meter.parentElement.setAttribute('aria-label','Vida del subjefe: tanque de asedio');meter.parentElement.setAttribute('aria-valuemax',cityTank.maxHp);meter.parentElement.setAttribute('aria-valuenow',Math.ceil(cityTank.hp));
    document.getElementById('boss-value').textContent=Math.ceil(cityTank.hp)+' / '+cityTank.maxHp;}
    if(!state.inside&&Math.abs(player.x-storm.x)<800&&storm.hp>0){document.getElementById('boss-hud').hidden=false;document.getElementById('boss-title').textContent='SUBJEFE · HERALDO ELÉCTRICO';const meter=document.getElementById('boss-fill');meter.style.width=(100*storm.hp/storm.maxHp)+'%';meter.parentElement.setAttribute('aria-label','Vida del Heraldo Eléctrico');meter.parentElement.setAttribute('aria-valuemax',storm.maxHp);meter.parentElement.setAttribute('aria-valuenow',Math.ceil(storm.hp));document.getElementById('boss-value').textContent=Math.ceil(storm.hp)+' / '+storm.maxHp;}
    document.getElementById('state').textContent=player.form==='wolf'?'Lobo':player.form==='zombie'?(player.burrow?'Bajo tierra · '+(3-player.burrow.age).toFixed(1)+' s':'Zombi · Resistencia ×2'):player.jetpack?'Jetpack':player.rope?'Agarrado':player.grounded?'En tierra':'En el aire';
    document.getElementById('hook-status').textContent=player.rope?'E · SOLTAR / W · TREPAR':'E · AGARRARSE AL TECHO';
  }
  updateObjectives();
  function sprite(img,frames,row,frame,scale,lift=0){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y-lift));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
  function drawJetpack(layer='back'){ArcadeJetpackRenderer.draw(ctx,player,state.geometry.platforms,layer,player.fuelMax);}
  function drawPlayer(){
    if(arrival?.active){
      const a=arrival,scale=.34,frame=a.frame,dx=a.flight?player.x:player.x-65*a.collapse,anchorY=a.flight?player.y-34:player.y-34+34*a.collapse;
      ctx.save();ctx.globalAlpha=a.alpha;ctx.drawImage(images.parachute,(frame%4)*384,Math.floor(frame/4)*512,384,512,Math.round(dx-192*scale),Math.round(anchorY-470*scale),384*scale,512*scale);ctx.restore();
      if(a.flight)sprite(images.climb,CLIMB_FRAMES,1,0,CLIMB_SCALE);
      else sprite(images.soldier,SOLDIER_V2_FRAMES,a.crouch?4:0,a.crouch?3:0,SOLDIER_V2_SCALE);
      return;
    }
    if(ArcadeZombieForm.drawPlayer(ctx,player))return;
    // A contact shadow belongs to the supporting floor, never to airborne feet.
    if(player.grounded&&!player.jetpack&&!player.rope&&!player.ladder){ctx.fillStyle='#16202255';ctx.beginPath();ctx.ellipse(player.x,player.y+1,16,3,0,0,Math.PI*2);ctx.fill();}
    if(player.transform>0){const t=Math.min(7,Math.floor((1-player.transform/1.2)*8)),pose=ArcadeSoldierAnimation.transformation(player.form==='wolf'?t:7-t),frames={soldier:SOLDIER_V2_FRAMES,wolf:ACTION_FRAMES.wolf,transformation:ArcadeSoldierAnimation.transformationFrames};sprite(images[pose.sheet],frames[pose.sheet],pose.row,pose.frame,pose.scale);return;}
    if(player.form==='wolf'){
      const idlePose=ArcadeSoldierAnimation.wolfIdlePose(player,mode),comboPose=ArcadeSoldierAnimation.wolfComboPose(player),ramPose=ArcadeSoldierAnimation.wolfRamPose(player),airPose=ArcadeSoldierAnimation.wolfAirPose(player),sprintPose=ArcadeSoldierAnimation.wolfSprintPose(player),walkPose=ArcadeSoldierAnimation.wolfWalkPose(player,mode);
      if(player.ladder||player.rope?.mantle)sprite(images.wolfClimb,WOLF_CLIMB_FRAMES,0,((Math.floor(player.y/6.5)%4)+4)%4,WOLF_CLIMB_SCALE);
      else if(player.rope)sprite(images.wolf,ACTION_FRAMES.wolf,4,Math.floor(player.hangCycle||0)%4,.48);
      else if(ramPose)sprite(images.wolfRam,ArcadeSoldierAnimation.wolfRamFrames,ramPose.row,ramPose.frame,ArcadeSoldierAnimation.wolfRamScale);
      else if(comboPose)sprite(comboPose.sheet==='actions'?images.wolfActions:images.wolfCombos,comboPose.sheet==='actions'?ArcadeSoldierAnimation.wolfActionFrames:ArcadeSoldierAnimation.wolfComboFrames,comboPose.row,comboPose.frame,comboPose.scale);
      else if(player.claw>0)sprite(images.wolf,ACTION_FRAMES.wolf,1,Math.min(7,Math.floor((.3-player.claw)/.3*8)),.48);
      else if(airPose)sprite(images.wolf,ACTION_FRAMES.wolf,airPose.row,airPose.frame,.48);
      else if(sprintPose)sprite(images.wolfSprint,WOLF_SPRINT_FRAMES,sprintPose.row,sprintPose.frame,WOLF_SPRINT_SCALE);
      else if(mode.crouching)sprite(images.wolf,ACTION_FRAMES.wolf,2,1,.48);
      else if(walkPose)sprite(images.wolfWalk,WOLF_WALK_FRAMES,walkPose.row,walkPose.frame,WOLF_WALK_SCALE);
      else if(idlePose)sprite(images.wolfActions,ArcadeSoldierAnimation.wolfActionFrames,idlePose.row,idlePose.frame,idlePose.scale,idlePose.lift);
      else sprite(images.wolfActions,ArcadeSoldierAnimation.wolfActionFrames,0,0,ArcadeSoldierAnimation.wolfActionScale);
      return;
    }
    const pose=ArcadeSoldierAnimation.pose(player,mode,stats);if(player.jetpack)drawJetpack();
    if(player.rope&&player.rope.length>4){ctx.strokeStyle='#a6c5c2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(player.x,player.y-44);ctx.lineTo(player.rope.x,player.rope.y);ctx.stroke();}
    if(pose.sheet==='mobility')sprite(images.climb,CLIMB_FRAMES,pose.row,pose.frame,CLIMB_SCALE);
    else{
      const gait=ArcadeSoldierAnimation.gait(player,mode);
      const img=pose.sheet==='crouch'?images.crouch:pose.sheet==='melee'?images.melee:pose.sheet==='slide'?images.slide:images.soldier;
      const frames=pose.sheet==='crouch'?CROUCH_FRAMES:pose.sheet==='melee'?MELEE_FRAMES:pose.sheet==='slide'?SLIDE_FRAMES:SOLDIER_V2_FRAMES;
      const scale=pose.sheet==='crouch'?CROUCH_SCALE:pose.sheet==='melee'?MELEE_SCALE:pose.sheet==='slide'?SLIDE_SCALE:SOLDIER_V2_SCALE;
      ArcadeSoldierAnimation.drawGait(ctx,player,gait,
        stepFrame=>gait?.flight?sprite(images.soldier,SOLDIER_V2_FRAMES,4,0,SOLDIER_V2_SCALE):sprite(images.walk,WALK_FRAMES,0,stepFrame,WALK_SCALE),
        bob=>{ctx.save();ctx.translate(0,bob);sprite(img,frames,pose.row,pose.frame,scale);ctx.restore();},pose.sheet==='melee'?pose:null);
    }
  }
  function drawEnemies(){
    for(const n of stats.enemies){
      if(n.x<camera.x-70||n.x>camera.x+canvas.width+70||n.hp<=0&&n.death<=0)continue;
      let row=0,frame=Math.floor(n.anim*4)%4;
      if(n.hp<=0){row=3;frame=3;}else if(n.hit>0){row=3;frame=2;}else if(n.flash>0){row=3;frame=n.flash>.08?0:1;}else if(!n.grounded){row=2;frame=n.vy< -150?1:n.vy<50?2:3;}else if(Math.abs(n.vx)>10){row=1;frame=Math.floor(n.anim*9)%4;}
      if(ArcadeEnemySpecialists.drawRam(ctx,n,images.ramHit))continue;
      if(n.kind==='stormZombie'){ArcadeStormZombie.draw(ctx,n);continue;}
      if(n.kind==='bat'){ArcadeCemeteryBat.draw(ctx,n,images.bat);continue;}
      if(n.kind==='zombie')ArcadeCemeteryZombies.draw(ctx,n,images.zombie);else if(!ArcadeEnemySpecialists.draw(ctx,n,images)){const f=ENEMY_FRAMES[row][frame],scale=.19;ctx.save();if(n.hp<=0)ctx.globalAlpha=Math.min(1,n.death*2);ctx.translate(Math.round(n.x),Math.round(n.y));ctx.scale(n.facing,1);ctx.drawImage(images.enemy,...f.slice(0,4),-f[2]*scale/2,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
      if(n.hp>0&&(n.kind!=='zombie'||n.phase==='active')){ctx.fillStyle='#17232d';ctx.fillRect(n.x-19,n.y-59,38,6);ctx.fillStyle=n.hit>0?'#fff0ad':'#e77b60';ctx.fillRect(n.x-18,n.y-58,36*n.hp/n.maxHp,4);if(n.alert){ctx.fillStyle='#ffdb85';ctx.font='bold 10px monospace';ctx.fillText(n.awareness==='sight'?'!':'?',n.x-3,n.y-64);}}
    }
  }
  function drawLoadout(){
    if(!state.inside){ArcadeMissionTwoLoot.draw(ctx,loot,state.time,{left:camera.x,right:camera.x+canvas.width});ArcadeMedkits.draw(ctx,loot.medkits,player,camera,canvas.height);ArcadeCityTank.draw(ctx,cityTank,images.tankBattle,images.tankCrew,images.tankFragments);}
    if(!state.inside)ArcadeCemeteryZombies.drawGraves(ctx,cityEnemies,images.zombie,{left:camera.x,right:camera.x+canvas.width});
    if(state.inside)ArcadeMausoleumKing.draw(ctx,king,kingAtlases);
    drawEnemies();
    ctx.save();
    if(player.jetpack&&!arrival?.active)ArcadeJetpackRenderer.pose(ctx,player);
    if(player.hurt>0)ctx.globalAlpha=.65;
    drawPlayer();
    if(player.jetpack&&!arrival?.active)drawJetpack('front');
    if(!arrival?.active){const pose=ArcadeSoldierAnimation.pose(player,mode,stats);if(player.form!=='wolf'&&player.form!=='zombie'&&!player.transform&&!player.rope&&!player.ladder&&pose.armed&&!powers.flame){const gait=ArcadeSoldierAnimation.gait(player,mode);ctx.save();if(gait)ctx.translate(0,gait.bob);ArcadeWeaponRenderer.draw(ctx,player,stats);ctx.restore();}}
    ctx.restore();
    if(!arrival?.active)ArcadeMissionCombat.draw(ctx,stats,powers,player,{top:camera.y,bottom:camera.y+canvas.height});
    if(state.inside)ArcadeMausoleumKing.drawEffects(ctx,king);
    ArcadeScore.draw(ctx,score);
  }
  function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.min(960,Math.max(640,Math.round(r.width/1.35)));canvas.height=Math.round(r.height/r.width*canvas.width);camera.y=620-canvas.height*.84;}
  new ResizeObserver(resize).observe(canvas);
  function frame(t){const dt=Math.min(.08,(t-last)/1000||0);last=t;if(loaded){if(!paused){accumulator+=dt;while(accumulator>=1/120){update(1/120);accumulator-=1/120;if(paused||stats.dead){accumulator=0;break;}}}else accumulator=0;renderer.draw(ctx,state,camera,canvas.width,canvas.height,drawLoadout);hud.update(paused||arrival?.active||player.transform>0);}requestAnimationFrame(frame);}
  const paths={zombiePlayer:'assets/sprites/zombi-electrico-v1.png',zombieExtra:'assets/sprites/zombi-electrico-extra-v1.png',kingStone:'assets/sprites/rey-piedra-v2.png',kingZombie:'assets/sprites/rey-zombi-v2.png',kingTransform:'assets/sprites/rey-transformacion-v1.png',wolfActions:'assets/sprites/lobo-reposo-patadas-v2.png',wolfCombos:'assets/sprites/lobo-combos-v1.png',wolfRam:'assets/sprites/lobo-cabezazo-v1.png',ramHit:'assets/sprites/enemigos-embestida-v1.png',cityBridge:'assets/worlds/mission-02/city-bridge-v1.png',cemeteryTrees:'assets/sprites/cemetery-trees-v2.png',bat:'assets/sprites/cemetery-bat-v1.png',zombie:'assets/sprites/zombi-cementerio-v1.png',wreckedCars:'assets/sprites/carros-destruidos-v1.png',tankFragments:'assets/sprites/tanque-fragmentos-v1.png',crater:'assets/worlds/mission-02/crater-ciudad-v1.png',wolfWalk:'assets/sprites/lobo-caminata-v2.png',crouch:'assets/sprites/soldado-agachado-pasos-v1.png',barricadeCity:'assets/worlds/mission-02/barricada-ciudad-v1.png',barricadeCemetery:'assets/worlds/mission-02/barricada-cementerio-v1.png',turret:'assets/sprites/enemigo-torreta-v1.png',knife:'assets/sprites/enemigo-cuchillo-v1.png',tankCrew:'assets/sprites/tanque-tripulante-granada-v1.png',impact:'assets/sprites/explosion-impacto-v1.png',wolfSprint:'assets/sprites/lobo-carrera-cuatro-patas-v1.png',enemy:'assets/sprites/soldado-enemigo-v1.png',tankBattle:'assets/sprites/tanques-batalla-v1.png',melee:'assets/sprites/soldado-cuchillo-hacha-v1.png',kicks:'assets/sprites/lobo-patadas-v1.png',powerSheet:'assets/sprites/poderes-v1.png',orbitalSheet:'assets/sprites/orbital-superrayo-v1.png',cityObjects:'assets/worlds/mission-02/city-objects-v2.png',civilians:'assets/sprites/civiles-huyendo-v2.png',cityStart:'assets/worlds/mission-02/city-start-v1.png',city:'assets/worlds/mission-02/city-day-v1.png',cemetery:'assets/worlds/mission-02/cemetery-dusk-v1.png',interior:'assets/worlds/mission-02/mausoleum-interior-v1.png',atlas:'assets/worlds/mission-02/environment-atlas-v1.png',effects:'assets/sprites/ambiente-animado-v1.png',soldier:'assets/sprites/soldado-v2.png',climb:'assets/sprites/soldado-escalada-v2.png',walk:'assets/sprites/soldado-pasos-v3.png',slide:'assets/sprites/soldado-deslizamiento-v1.png',wolf:'assets/sprites/soldado-lobo-v1.png',wolfClimb:'assets/sprites/lobo-escalada-v1.png',transformation:'assets/sprites/soldado-transformacion-v2.png',parachute:'assets/sprites/paracaidas-v1.png'};
  Promise.all(Object.entries(paths).map(([key,path])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[key]=img;resolve();};img.onerror=()=>reject(Error(path));img.src=path;}))).then(()=>{for(const key of ['kingStone','kingZombie','kingTransform']){images[key]=prepareWhiteDeath(images[key]);kingAtlases[key]=ArcadeMausoleumKing.prepareAtlas(images[key],key==='kingTransform'?2:5,key);}images.zombie=prepareWhiteDeath(images.zombie);images.crater=ArcadeWaterCrater.prepareSprite(prepareWhiteDeath(images.crater));images.barricadeCity=prepareWhiteDeath(images.barricadeCity);images.barricadeCemetery=prepareWhiteDeath(images.barricadeCemetery);images.turret=prepareWhiteDeath(images.turret);images.knife=prepareWhiteDeath(images.knife);images.tankCrew=prepareWhiteDeath(images.tankCrew);images.tankFragments=prepareWhiteDeath(images.tankFragments);images.wreckedCars=prepareWhiteDeath(images.wreckedCars);ArcadeImpact.setSheet(images.impact);images.wolfWalk=prepareWhiteDeath(images.wolfWalk);images.wolfActions=prepareWhiteDeath(images.wolfActions);images.crouch=prepareWhiteDeath(images.crouch);images.melee=prepareWhiteDeath(images.melee);ArcadePowerSprites.setSpriteSheet(images.powerSheet);ArcadePowerSprites.setOrbitalSheet(images.orbitalSheet);renderer=ArcadeLevelTwoRenderer.create(images);loaded=true;resize();ArcadeZombieForm.setSheet(prepareWhiteDeath(images.zombiePlayer));ArcadeZombieForm.setExtra(prepareWhiteDeath(images.zombieExtra));wheel.setSprites(images.soldier,SOLDIER_V2_FRAMES[0][0],images.wolf,ACTION_FRAMES.wolf[0][7]);wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown);play.disabled=false;play.textContent=Number.isFinite(saved.x)?'Continuar misión 02':'Comenzar misión 02';canvas.inert=true;play.focus();if(mainMenu)mainMenu.ready({autoPlay:!!entry});else if(entry)play.click();if(entry){save();window.history?.replaceState(null,'','level-two.html');}}).catch(error=>{mainMenu?.fail();message.textContent='No se pudo cargar el escenario. Recarga la página para volver a intentarlo.';console.error(error);});
  requestAnimationFrame(frame);
})();



