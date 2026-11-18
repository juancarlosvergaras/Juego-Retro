(() => {
  'use strict';
  const L=ArcadeLevelThree,P=ArcadePhysics,canvas=document.getElementById('level-two'),ctx=canvas.getContext('2d');
  const menu=document.getElementById('level-two-menu'),play=document.getElementById('play-two'),message=document.getElementById('level-two-message'),context=document.getElementById('context-two');
  const audio=ArcadeAudio.create(),keys=new Set(),queue=new Set(),firePointers=new Set(),camera={x:0,y:0},images={};
  let paused=true,loaded=false,started=false,last=0,accumulator=0,renderer,saveAge=0,shotWait=0,mode={},doorLatch=false,mainMenu=null,queuedAim=null;
  const fireBuffer=ArcadeArsenal.createFireBuffer();
  let leavingMission=false;
  const storageKey='cap-dollar.mission-three.v1';
  function load(){try{const value=JSON.parse((window.ArcadeDeveloperMode?.storage(localStorage)||localStorage).getItem(storageKey)||'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return{};}}
  const entry=new URLSearchParams(location.search).get('entry'),fresh=entry==='select'||entry==='campaign';
  const saved=fresh?{}:load();
  let store;try{store=window.ArcadeDeveloperMode?.storage(localStorage)||localStorage;}catch{store={getItem:()=>null,setItem:()=>{}};}
  const campaign=ArcadeCampaign.loadout(store,entry==='select'?'campaign':entry,saved);
  const stats=ArcadeMissionCombat.create(ArcadeCampaign.inventory(campaign.inventory)),powers=ArcadePowers.create(),soundEvents=ArcadeSoundEvents.create(audio);
  for(const [id,time] of Object.entries(campaign.cooldowns||{}))if(Number.isFinite(time)&&time>0)powers.cooldowns[id]=time;
  const checkpoints=ArcadeCheckpoints.create(3,[],saved.checkpoints);
  const defeated=Array.isArray(saved.defeated)?saved.defeated:[];


  const mecha=ArcadeAirMecha.create(saved.mecha||{},ArcadeDifficulty.get(ArcadeDifficulty.load(store)).health);
  const loot=L.loot(saved.loot||{}),cityEnemies=[...L.soldiers(defeated),mecha];stats.enemies=cityEnemies;
  const score=ArcadeScore.create();score.total=campaign.score||0;for(const n of cityEnemies)if(n.hp<=0)score.awarded.add('soldiers:'+n.id);
  for(const w of loot.weapons)if(w.taken)score.awarded.add('weapons:'+w.id);
  for(const kit of loot.medkits)if(kit.taken)score.awarded.add('health:'+kit.id);
  for(const tank of loot.fuelTanks)if(tank.taken)score.awarded.add('fuel:'+tank.id);
  for(const star of loot.stars)if(star.taken)score.awarded.add('challenge:city-star:'+star.id);
  if(loot.stars.every(s=>s.taken))score.awarded.add('challenge:city-stars-all');
  if(mecha.defeated)score.awarded.add('challenge:air-mecha');
  const player=P.createPlayer(),state={player,time:0,inside:false,geometry:null,bullets:[],fade:0,waters:[],mecha,introAge:0};
  Object.assign(P.WORLD,L.WORLD);
  function configure(inside,x){
    state.inside=false;state.geometry=L.geometry();stats.cars=[];stats.enemies=cityEnemies;stats.king=null;stats.tank=null;stats.pickups=loot.weapons;stats.medkits=loot.medkits;stats.bullets=[];stats.playerPlasma=[];stats.playerPools=[];stats.plasmaDrips=[];stats.zombieEffects=[];stats.explosions=[];stats.debris=[];stats.weaponAction=null;P.WORLD.width=L.WORLD.width;
    const form=['wolf','zombie','robot'].includes(player.form)?player.form:'soldier';
    Object.assign(player,{x:Math.max(30,Math.min(P.WORLD.width-30,x)),y:620,vx:0,vy:0,grounded:true,ground:state.geometry.platforms[0],rope:null,ladder:null,jumps:0,form,jetpack:false,h:form==='wolf'?64:form==='zombie'?68:form==='robot'?54:46,burrow:null,burrowLatch:false,claw:0,kick:0,kickAir:false,ramCooldown:0,ramBuffer:0,wolfSprintJump:false,zombiePose:0,slide:0,landing:0,hurt:0,fallPeak:620,fallDamage:0,ram:null,ramLatch:false,ramKickLatch:false,idleTime:0,wolfAttack:null,wolfChain:null,wolfQueued:null,wolfFireHeld:false,wolfKickHeld:false});

    player.y=P.surfaceY(state.geometry.platforms[0],player.x);player.fallPeak=player.y;
    P.step(player,{},0,state.geometry.platforms);
    camera.x=Math.max(0,Math.min(P.WORLD.width-canvas.width,player.x-canvas.width*.35));camera.y=620-canvas.height*.84;
    state.bullets=[];state.fade=1;
  }
  const respawnPoint=()=>ArcadeCheckpoints.spawn(checkpoints,{inside:false,x:240,y:620});
  configure(saved.dead?respawnPoint().inside:state.inside,saved.dead?respawnPoint().x:Number.isFinite(saved.x)?saved.x:160);if(saved.dead)stats.invincible=3;
  state.weather=window.ArcadeWorldLighting?.create();state.fade=0;state.checkpoints=checkpoints;state.combat=stats;state.loot=loot;state.mecha=mecha;
  ArcadeDifficulty.apply({...stats,enemies:cityEnemies.filter(n=>n!==mecha)},ArcadeDifficulty.load(store));
  const difficulty=ArcadeDifficulty.get(ArcadeDifficulty.load(store));stats.combatDamage=difficulty.damage;stats.hitProtection=difficulty.grace;
  const profile=ArcadeProgression.load(store);ArcadeProgression.apply(profile,player,stats,true);
  if(fresh||!Number.isFinite(saved.x)||saved.dead)stats.hp=stats.maxHp;
  else if(Number.isFinite(campaign.hp))stats.hp=Math.max(1,Math.min(stats.maxHp,campaign.hp));
  if(Number.isFinite(campaign.fuel))player.fuel=Math.min(player.fuelMax,campaign.fuel);
  player.shield=campaign.shield??profile.shield;
  let arrivalAge=0,arrival=fresh||!Number.isFinite(saved.x)||saved.landed===false?{active:true,x:160,y:620}:null;state.introAge=arrival?0:9;
  state.civilians=[];state.endingAge=saved.ending?0:-1;
  if(saved.zombieUnlocked||campaign.zombieUnlocked){profile.zombieUnlocked=true;player.zombieUnlocked=true;}
  if(saved.robotUnlocked||campaign.robotUnlocked){profile.robotUnlocked=true;player.robotUnlocked=true;}
  if(!arrival&&(saved.form==='tank'&&player.tankUnlocked||saved.form==='fighter'&&player.fighterUnlocked||saved.form==='robot'&&player.robotUnlocked||saved.form==='wolf'||saved.form==='zombie'&&player.zombieUnlocked)){player.form=saved.form;player.h=player.form==='tank'?53:player.form==='fighter'?57:player.form==='zombie'?68:player.form==='robot'?54:64;}
  player.formCooldown=Math.max(0,Math.min(5,Number(saved.formCooldown??campaign.formCooldown)||0));
  if(arrival){player.x=arrival.x;player.y=arrival.y;player.grounded=false;}
  window.ArcadeDeveloperMode?.prepare(profile,player,stats,powers);
  const wheel=ArcadeCharacterWheel.create(document.getElementById('characters-two'),switchForm);
  function switchForm(target){if(paused||arrival?.active||state.endingAge>=0)return;if(!ArcadeZombieForm.change(stats,player,target)){if(player.formCooldown>0)notify('Transformación disponible en '+Math.ceil(player.formCooldown)+' s');return;}audio.play('whiteRoar',{gain:.3});notify('Forma de '+ArcadeZombieForm.label(player.form)+' · T en 5 s');save();wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked);}
  function save(){if(leavingMission)return;try{profile.shield=player.shield;ArcadeProgression.save(profile,store);const carry={formCooldown:player.formCooldown||0,zombieUnlocked:!!player.zombieUnlocked,robotUnlocked:!!player.robotUnlocked,tankUnlocked:!!player.tankUnlocked,fighterUnlocked:!!player.fighterUnlocked,score:score.total,hp:stats.hp,fuel:player.fuel,shield:player.shield,inventory:stats.inventory,cooldowns:powers.cooldowns};store.setItem(storageKey,JSON.stringify({...carry,checkpoints:ArcadeCheckpoints.snapshot(checkpoints),x:player.x,form:player.form,landed:!arrival?.active,dead:stats.dead,defeated:cityEnemies.filter(n=>n.hp<=0&&n!==mecha).map(n=>n.id),ending:state.endingAge>=0,mecha:{defeated:mecha.defeated},loot:ArcadeMissionTwoLoot.snapshot(loot)}));ArcadeCampaign.write(store,{...carry,level:3,arrival:!!arrival?.active});}catch{}}
  let noticeAge=0,notice='';
  function notify(text){notice=text;noticeAge=3;context.textContent=text;}
  function chooseWeapon(slot){if(player.form==='robot'&&slot<3){notify('Robot · Elige un arma de disparo (3–9)');return;}if(paused||arrival?.active||player.transform>0)return;if(player.form==='wolf'||player.form==='zombie'){notify('Vuelve al soldado con T para usar armas.');return;}if(ArcadeArsenal.selectWeapon(stats.inventory,slot)){save();hud.update(false);}else notify('Todavía no has recogido esa arma.');}
  function cyclePower(){if(paused||arrival?.active)return;const list=[...profile.owned,...(player.shield>0?['shield']:[])];profile.equipped=list[(list.indexOf(profile.equipped)+1)%list.length]||null;save();}
  function usePower(){if(paused||arrival?.active)return;if(profile.equipped==='shield')notify('Escudo antibalas · '+player.shield+' impactos restantes');else queue.add('power');}
  const hud=ArcadeMissionHud.create({player,encounter:stats,profile,powers,canvas,audio,score:()=>score.total,onSelect:chooseWeapon,onPower:usePower,onCycle:cyclePower,onPersist:save});
  function controls(){return{left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),up:keys.has('KeyW')||keys.has('ArrowUp')||queue.has('up'),down:keys.has('KeyS')||keys.has('ArrowDown'),run:keys.has('ShiftLeft')||keys.has('ShiftRight'),jumpPressed:queue.has('jump'),hookPressed:queue.has('hook'),jetpackPressed:queue.has('jet'),...ArcadeArsenal.triggerInput(keys,firePointers.size>0,queue.has('fire')),kick:player.form!=='robot'&&(queue.has('kick')||keys.has('KeyL')),power:queue.has('power')||keys.has('KeyG')};}
  function pause(){if(!loaded)return;paused=true;player.wolfQueued=null;keys.clear();firePointers.clear();queue.clear();queuedAim=null;fireBuffer.clear();save();menu.hidden=false;canvas.inert=true;audio.setRunning(false);wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked);play.textContent='Continuar';document.getElementById('level-two-title').textContent='Partida en pausa';message.textContent='Tu partida queda detenida mientras consultas el menú.';document.getElementById('pause-options').hidden=false;document.getElementById('shop').hidden=true;document.getElementById('shortcuts').hidden=true;const shortcuts=document.getElementById('show-shortcuts');shortcuts.textContent='Ver atajos de teclado';shortcuts.setAttribute('aria-expanded','false');play.focus();}
  play.onclick=()=>{if(!loaded)return;if(stats.dead){stats.dead=false;stats.hp=stats.maxHp;stats.invincible=3;player.hurt=0;stats.bullets=[];stats.explosions=[];const cp=respawnPoint();configure(cp.inside,cp.x);Object.assign(mecha,ArcadeAirMecha.create({defeated:mecha.defeated},difficulty.health));save();}started=true;paused=false;menu.hidden=true;canvas.inert=false;keys.clear();firePointers.clear();queue.clear();queuedAim=null;fireBuffer.clear();audio.unlock();audio.setRunning(true);wheel.update(player.form,true,arrival?.active||player.transform>0,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked);canvas.focus();};
  document.getElementById('pause-two').onclick=()=>paused?play.click():pause();
  document.getElementById('show-shortcuts').onclick=()=>{const panel=document.getElementById('shortcuts'),button=document.getElementById('show-shortcuts');panel.hidden=!panel.hidden;button.textContent=panel.hidden?'Ver atajos de teclado':'Ocultar atajos de teclado';button.setAttribute('aria-expanded',String(!panel.hidden));};
  document.getElementById('restart').onclick=()=>{if(loaded)location.assign('level-three.html?entry=select');};
  mainMenu=window.ArcadeMainMenu?.create({mission:3,resumeAvailable:Number.isFinite(saved.x),soundControls:document.querySelector('.sound-controls'),tutorial:window.ArcadeTutorial?.create(store),difficulty:ArcadeDifficulty.load(store),
    onPlay(){play.click();},onPause(){pause();menu.hidden=true;},onSound(){audio.setRunning(false);},onSelectMission(){save();started=false;},
    onDifficulty(id){ArcadeDifficulty.apply({...stats,enemies:cityEnemies.filter(n=>n!==mecha)},id);const level=ArcadeDifficulty.get(id),fraction=mecha.hp/mecha.maxHp;stats.combatDamage=level.damage;stats.hitProtection=level.grace;mecha.maxHp=Math.round(100*level.health);mecha.hp=mecha.maxHp*fraction;return ArcadeDifficulty.save(id,store);}});

  document.getElementById('open-main-menu').onclick=()=>mainMenu?.show();
  function queueFire(){queue.add('fire');fireBuffer.press(stats.inventory.selected);const input=window.ArcadeControls?.decorate(controls())||controls();queuedAim=ArcadeArsenal.aimDirection({...input,aimUp:input.aimUp||input.up,aimDown:input.aimDown||input.down},player.facing);}
  function press(code){
    if(paused||state.endingAge>=0)return;if(arrival?.active){if(code==='KeyS'||code==='ArrowDown')keys.add(code);return;}keys.add(code);
    if(code==='BracketRight'||code==='BracketLeft'){const inv=stats.inventory,list=inv.owned.slice().sort((a,b)=>a-b);chooseWeapon(list[(list.indexOf(inv.selected)+(code==='BracketRight'?1:-1)+list.length)%list.length]);}if(/^Digit[1-9]$/.test(code))chooseWeapon(Number(code.slice(-1)));if(/^Numpad[1-9]$/.test(code))chooseWeapon(Number(code.slice(-1)));if(code==='KeyH')cyclePower();if(code==='KeyG')usePower();if(code==='KeyL'){if(player.form==='robot'){ArcadeRobotForm.cycle(stats.inventory);save();}else queue.add('kick');}if(code==='KeyT')switchForm();if(code==='KeyF')queue.add('jet');
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
    window.ArcadeDeveloperMode?.tick(player,stats);
    state.time+=dt;state.fade=Math.max(0,state.fade-dt*2);shotWait=Math.max(0,shotWait-dt);const input=window.ArcadeControls?.decorate(controls())||controls();
    ArcadeZombieForm.tick(player,dt);
    player.transform=Math.max(0,(player.transform||0)-dt);player.claw=Math.max(0,(player.claw||0)-dt);player.kick=Math.max(0,(player.kick||0)-dt);noticeAge=Math.max(0,noticeAge-dt);
    wheel.update(player.form,true,paused||arrival?.active||player.transform>0||!!player.rope||!!player.ladder||!!player.burrow,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked);

    if(state.endingAge>=0){state.endingAge+=dt;audio.loop('helicopter',.25);queue.clear();if(state.endingAge>=13&&!leavingMission){save();leavingMission=true;ArcadeCampaign.transferFour(store,player,stats,score,powers);location.assign('level-four.html?entry=campaign');}return;}
    if(mecha.defeated&&player.x>7460){state.endingAge=0;stats.bullets=[];save();return;}
    if(arrival?.active){audio.loop('helicopter',.3);arrivalAge+=dt;state.introAge=arrivalAge;player.x=160;player.y=620;player.grounded=true;queue.clear();queuedAim=null;fireBuffer.clear();if(arrivalAge>=9){arrival=null;audio.loop('helicopter',0);player.ground=state.geometry.platforms[0];player.fallPeak=620;save();}return;}
    if(player.transform>0){queue.clear();queuedAim=null;fireBuffer.clear();return;}
    const oldX=player.x,oldJumps=player.jumps,wasGrounded=player.grounded,oldLadder=player.ladder;
    player.aim=ArcadeArsenal.firingAim({...input,aimUp:input.aimUp||input.up,aimDown:input.aimDown||input.down},player.facing,queuedAim);
    if(input.hookPressed&&(player.form==='wolf'||player.form==='zombie'))notify('El gancho solo está disponible para el soldado');
    mode=P.step(player,ArcadeArsenal.movementInput(player,input),dt,state.geometry.platforms,{ladders:state.geometry.ladders,anchors:[]});
    if(mecha.active&&mecha.hp>0)player.x=Math.max(6170,Math.min(7610,player.x));
    player.crouching=!!mode.crouching;player.aimHeight=mode.crouching?20:28;
    if(player.aim.x&&player.form!=='wolf'&&!player.rope)player.facing=Math.sign(player.aim.x);ArcadeSoldierAnimation.advanceWalk(player,dt);
    const previousAction=stats.weaponAction;
    const powerMessage=ArcadeMissionCombat.update(stats,player,input,dt,state.geometry.platforms,powers,profile,{left:camera.x,right:camera.x+canvas.width,top:camera.y,bottom:camera.y+canvas.height});if(powerMessage)notify(powerMessage);
    if(mecha.hp<=0&&!mecha.defeated){mecha.blastWait=(mecha.blastWait||0)-dt;if(mecha.blastWait<=0){mecha.blastWait=.42;stats.explosions.push(ArcadeImpact.create(mecha.x+Math.sin(mecha.deathAge*19)*45,mecha.y-35-Math.abs(Math.sin(mecha.deathAge*13))*100,60,'rocket'));audio.play('explosion',{gain:.35});}}
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
      if(loot.stars.every(s=>s.taken))ArcadeScore.bonus(score,{id:'city-stars-all',points:1000,label:'Tres estrellas',x:player.x,y:player.y});

    }
    if(mecha.defeated&&!score.awarded.has('challenge:air-mecha')){profile.robotUnlocked=true;player.robotUnlocked=true;stats.inventory.secondary=3;for(const slot of [3,5])if(!stats.inventory.owned.includes(slot))stats.inventory.owned.push(slot);stats.inventory.ammo[3]=Math.max(stats.inventory.ammo[3]||0,72);stats.inventory.ammo[5]=Math.max(stats.inventory.ammo[5]||0,120);stats.inventory.selected=5;ArcadeScore.bonus(score,{id:'air-mecha',points:4500,label:'Robot de combate desbloqueado',x:mecha.x,y:mecha.y-100});notify('¡MISIÓN 3 COMPLETADA! Robot desbloqueado · T · Dos armas con J');save();}
    P.updateIdle(player,input,dt);
    soundEvents.update({player,encounter:stats,powers,fuelTanks:state.inside?[]:loot.fuelTanks},dt);state.bullets=stats.bullets;
    ArcadeScore.tick(score,dt);ArcadeScore.sync(score,{enemies:stats.enemies,pickups:stats.pickups,medkits:stats.medkits},state.inside?[]:loot.fuelTanks);const reward=score.total-beforeScore;if(reward){campaign.score=score.total;ArcadeProgression.credit(profile,reward);save();}
    if(stats.dead){player.jetpack=false;pause();play.textContent=checkpoints.active?'Volver al CHECK POINT':'Reintentar misión';message.textContent=checkpoints.active?'Has caído. Volverás a la última PC activada con tu progreso conservado.':'Has caído. Regresa al punto de entrada para continuar la misión.';return;}
    const activated=ArcadeCheckpoints.update(checkpoints,player,dt,{inside:state.inside,blocked:stats.dead});if(activated){notify('CHECK POINT · Progreso guardado');audio.play('pickup',{gain:.45});save();}
    queue.clear();if(fireBuffer.tick(dt,player,stats,previousAction))queue.add('fire');else queuedAim=null;
    const focus=player.x-canvas.width*.38;const targetX=Math.max(0,Math.min(P.WORLD.width-canvas.width,focus));camera.x+=(targetX-camera.x)*(1-Math.exp(-6*dt));
    // Horizontal exploration keeps the walking plane steady; height follows only substantial climbs.
    const targetY=Math.min(620-canvas.height*.84,player.y-canvas.height*.66);camera.y+=(targetY-camera.y)*(1-Math.exp(-5*dt));
    saveAge+=dt;if(saveAge>2&&player.grounded){saveAge=0;save();}
  }
  const robotDock=window.ArcadeRobotForm?.installDock(player,stats,save);
  function updateRoute(){document.getElementById('region-two').textContent=player.x<2200?'Cubierta de despegue':player.x<4300?'Torre de control':player.x<6170?'Pasarelas de popa':'Arena del Centinela';document.getElementById('route-two').max=L.WIDTH;document.getElementById('route-two').value=player.x;document.getElementById('distance-two').textContent=Math.round(player.x/L.WIDTH*100)+'% DEL RECORRIDO';context.textContent=noticeAge>0?notice:mecha.defeated?'ROBOT DESBLOQUEADO · Avanza a la derecha para la extracción →':mecha.active?'CENTINELA · Evita las marcas rojas y salta las ondas':arrival?.active?'MISIÓN 3 · GUERRA EN EL AIRE':'Avanza por la cubierta · J disparar · T transformar';}
  function updateObjectives(){document.querySelector('.viewport')?.classList?.toggle('air-cinematic',!!arrival?.active||state.endingAge>=0);robotDock?.();document.getElementById('stars-two').textContent='★ '+loot.stars.filter(s=>s.taken).length+' / 3';document.getElementById('boss-hud').hidden=!mecha.active&&!mecha.defeated;document.getElementById('boss-title').textContent=mecha.defeated?'CENTINELA DESTRUIDO · ROBOT DESBLOQUEADO':'JEFE · CENTINELA AÉREO';const fill=document.getElementById('boss-fill');fill.style.width=100*mecha.hp/mecha.maxHp+'%';fill.parentElement.setAttribute('aria-label','Vida del Centinela Aéreo');fill.parentElement.setAttribute('aria-valuemax',mecha.maxHp);fill.parentElement.setAttribute('aria-valuenow',Math.ceil(mecha.hp));document.getElementById('boss-value').textContent=Math.ceil(mecha.hp)+' / '+mecha.maxHp;document.getElementById('state').textContent=ArcadeZombieForm.label(player.form);document.getElementById('hook-status').textContent=player.form==='soldier'?'E · GANCHO / F · JETPACK':'T · CAMBIAR PERSONAJE';}
  updateObjectives();
  function sprite(img,frames,row,frame,scale,lift=0){const f=frames[row][frame];ctx.save();ctx.translate(Math.round(player.x),Math.round(player.y-lift));ctx.scale(player.facing,1);ctx.drawImage(img,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
  function drawJetpack(layer='back'){ArcadeJetpackRenderer.draw(ctx,player,state.geometry.platforms,layer,player.fuelMax);}
  function drawPlayer(){
    if(ArcadeZombieForm.drawPlayer(ctx,player))return;if(window.ArcadeRobotForm?.draw(ctx,player))return;
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
      else if(airPose)sprite(airPose.sheet==='jump'?images.wolfJump:images.wolf,airPose.sheet==='jump'?ArcadeSoldierAnimation.wolfJumpFrames:ACTION_FRAMES.wolf,airPose.row,airPose.frame,airPose.sheet==='jump'?.24:.48);
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
      if(n.x<camera.x-70||n.x>camera.x+canvas.width+70||n.hp<=0&&n.death<=0&&n.kind!=='mecha')continue;
      let row=0,frame=Math.floor(n.anim*4)%4;
      if(n.hp<=0){row=3;frame=3;}else if(n.hit>0){row=3;frame=2;}else if(n.flash>0){row=3;frame=n.flash>.08?0:1;}else if(!n.grounded){row=2;frame=n.vy< -150?1:n.vy<50?2:3;}else if(Math.abs(n.vx)>10){row=1;frame=Math.floor(n.anim*9)%4;}
      if(ArcadeEnemySpecialists.drawRam(ctx,n,images.ramHit))continue;
      if(n.kind==='mecha'){ArcadeAirMecha.draw(ctx,n,images.mecha);continue;}
      if(n.kind==='bat'){ArcadeCemeteryBat.draw(ctx,n,images.bat);continue;}
      if(n.kind==='zombie')ArcadeCemeteryZombies.draw(ctx,n,images.zombie);else if(!ArcadeEnemySpecialists.draw(ctx,n,images)){const f=ENEMY_FRAMES[row][frame],scale=.19;ctx.save();if(n.hp<=0)ctx.globalAlpha=Math.min(1,n.death*2);ctx.translate(Math.round(n.x),Math.round(n.y));ctx.scale(n.facing,1);ctx.drawImage(images.enemy,...f.slice(0,4),-f[2]*scale/2,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();}
      if(n.hp>0&&(n.kind!=='zombie'||n.phase==='active')){ctx.fillStyle='#17232d';ctx.fillRect(n.x-19,n.y-59,38,6);ctx.fillStyle=n.hit>0?'#fff0ad':'#e77b60';ctx.fillRect(n.x-18,n.y-58,36*n.hp/n.maxHp,4);if(n.alert){ctx.fillStyle='#ffdb85';ctx.font='bold 10px monospace';ctx.fillText(n.awareness==='sight'?'!':'?',n.x-3,n.y-64);}}
    }
  }
  function drawLoadout(){
    ArcadeCheckpoints.draw(ctx,checkpoints,false,state.time,{left:camera.x,right:camera.x+canvas.width,top:camera.y,bottom:camera.y+canvas.height});ArcadeMissionTwoLoot.draw(ctx,loot,state.time,{left:camera.x,right:camera.x+canvas.width},player);ArcadeMedkits.draw(ctx,loot.medkits,player,camera,canvas.height);ctx.save();
    drawEnemies();
    ctx.save();
    if(player.jetpack&&!arrival?.active)ArcadeJetpackRenderer.pose(ctx,player);
    if(player.hurt>0)ctx.globalAlpha=.65;
    drawPlayer();
    if(player.jetpack&&!arrival?.active)drawJetpack('front');
    if(!arrival?.active){const pose=ArcadeSoldierAnimation.pose(player,mode,stats);if(player.form!=='wolf'&&player.form!=='zombie'&&!player.transform&&!player.rope&&!player.ladder&&(pose.armed||player.form==='robot')&&!powers.flame){const gait=player.form==='robot'?null:ArcadeSoldierAnimation.gait(player,mode);ctx.save();if(gait)ctx.translate(0,gait.bob);ArcadeWeaponRenderer.draw(ctx,player,stats);ctx.restore();}}
    ctx.restore();
    ctx.restore();
    if(!arrival?.active)ArcadeMissionCombat.draw(ctx,stats,powers,player,{top:camera.y,bottom:camera.y+canvas.height});

    ArcadeScore.draw(ctx,score);
  }
  function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.min(960,Math.max(window.ArcadeMobile?.active?430:640,Math.round(r.width/(window.ArcadeMobile?.active?1.1:1.35))));canvas.height=Math.round(r.height/r.width*canvas.width);camera.y=Math.min(620-canvas.height*.84,player.y-canvas.height*.66);}
  new ResizeObserver(resize).observe(canvas);
  const frameBudget=window.ArcadeFrameBudget?.create();
  function frame(t){window.ArcadeDeveloperMode?.poll();window.ArcadeControls?.poll(t);const budget=frameBudget?.plan(t,{paused,hidden:document.hidden,width:canvas.width,height:canvas.height})||{render:true,hud:true};const dt=Math.min(.08,(t-last)/1000||0);last=t;if(loaded){if(!paused){accumulator+=dt;while(accumulator>=1/120){update(1/120);accumulator-=1/120;if(paused||stats.dead){accumulator=0;break;}}}else accumulator=0;if(budget.render)renderer.draw(ctx,state,camera,canvas.width,canvas.height,drawLoadout);if(budget.hud){updateObjectives();updateRoute();hud.update(paused||arrival?.active||state.endingAge>=0||player.transform>0,!!arrival?.active&&!paused&&!(player.transform>0));}}requestAnimationFrame(frame);}
  const paths={expansion:'assets/sprites/enemigos-expansion-v1.png',"endingRoad":"assets/worlds/mission-04/carretera-atardecer-v1.png","endingRiders":"assets/sprites/motos-carretera-v1.png","zombieCast":"assets/sprites/zombi-disparo-direcciones-v1.png","jetMk2":"assets/sprites/jetpack-mk2-v1.png","zombieRun":"assets/sprites/zombi-carrera-v2.png","shock":"assets/sprites/electrocucion-v1.png","checkpointPc":"assets/sprites/checkpoint-pc-v1.png","wolfJump":"assets/sprites/lobo-salto-carrera-v1.png","formTransition":"assets/sprites/transformaciones-jugador-v3.png","zombieIdle":"assets/sprites/zombi-soldado-reposo-v1.png","zombieSoldier":"assets/sprites/zombi-soldado-v1.png","zombieSoldierExtra":"assets/sprites/zombi-soldado-extra-v1.png","zombiePlayer":"assets/sprites/zombi-electrico-v1.png","zombieExtra":"assets/sprites/zombi-electrico-extra-v1.png","wolfActions":"assets/sprites/lobo-reposo-patadas-v2.png","wolfCombos":"assets/sprites/lobo-combos-v1.png","wolfRam":"assets/sprites/lobo-cabezazo-v1.png","ramHit":"assets/sprites/enemigos-embestida-v1.png","wolfWalk":"assets/sprites/lobo-caminata-v2.png","crouch":"assets/sprites/soldado-agachado-pasos-v1.png","turret":"assets/sprites/enemigo-torreta-v1.png","knife":"assets/sprites/enemigo-cuchillo-v1.png","impact":"assets/sprites/explosion-impacto-v1.png","wolfSprint":"assets/sprites/lobo-carrera-cuatro-patas-v1.png","enemy":"assets/sprites/soldado-enemigo-v1.png","melee":"assets/sprites/soldado-cuchillo-hacha-v1.png","kicks":"assets/sprites/lobo-patadas-v1.png","powerSheet":"assets/sprites/poderes-v1.png","orbitalSheet":"assets/sprites/orbital-superrayo-v1.png","soldier":"assets/sprites/soldado-v2.png","climb":"assets/sprites/soldado-escalada-v2.png","walk":"assets/sprites/soldado-pasos-v3.png","slide":"assets/sprites/soldado-deslizamiento-v1.png","wolf":"assets/sprites/soldado-lobo-v1.png","wolfClimb":"assets/sprites/lobo-escalada-v1.png","transformation":"assets/sprites/soldado-transformacion-v2.png","carrier":"assets/worlds/mission-03/portaaviones-v1.png","airAtlas":"assets/worlds/mission-03/cubierta-atlas-v1.png","mecha":"assets/sprites/mecha-aereo-v1.png"};
  let loadPromise;
  function loadLevel(){if(loaded)return Promise.resolve(true);if(loadPromise)return loadPromise;
  window.ArcadeLoading?.begin(Object.keys(paths).length,loadLevel);
  loadPromise=Promise.all([window.ArcadeAdvancedForms?.load(),window.ArcadeRobotForm?.load(),...Object.entries(paths).map(([key,path])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[key]=img;window.ArcadeLoading?.step();resolve();};img.onerror=()=>reject(Error(path));img.src=path;}))]).then(()=>{for(const key of Object.keys(images))images[key]=prepareWhiteDeath(images[key]);ArcadeJetpackRenderer.setSheet(images.jetMk2);ArcadeZombieForm.setRunSheet(images.zombieRun);ArcadeZombieForm.setShockSheet(images.shock);ArcadeCheckpoints.setSheet(images.checkpointPc);ArcadeFormTransition.setSheet(images.formTransition);ArcadeImpact.setSheet(images.impact);ArcadePowerSprites.setSpriteSheet(images.powerSheet);ArcadePowerSprites.setOrbitalSheet(images.orbitalSheet);ArcadeAirMecha.setSheet?.(images.mecha);renderer=ArcadeLevelThreeRenderer.create(images);loaded=true;window.ArcadeLoading?.finish();resize();ArcadeZombieForm.setSheet(prepareWhiteDeath(images.zombiePlayer));ArcadeZombieForm.setExtra(prepareWhiteDeath(images.zombieExtra));ArcadeZombieForm.setCastSheet(prepareWhiteDeath(images.zombieCast));ArcadeZombieForm.setPlayerSheets(prepareWhiteDeath(images.zombieSoldier),prepareWhiteDeath(images.zombieSoldierExtra));ArcadeZombieForm.setIdleSheet(prepareWhiteDeath(images.zombieIdle));wheel.setSprites(images.soldier,SOLDIER_V2_FRAMES[0][0],images.wolf,ACTION_FRAMES.wolf[0][7]);window.ArcadeFormTransition?.setEndpoint('wolf',images.wolfActions,ArcadeSoldierAnimation.wolfActionFrames[0][0],ArcadeSoldierAnimation.wolfActionFrames[0][0][3]*ArcadeSoldierAnimation.wolfActionScale);wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked);play.disabled=false;play.textContent=Number.isFinite(saved.x)?'Continuar misión 03':'Comenzar misión 03';canvas.inert=true;play.focus();if(mainMenu)mainMenu.ready({autoPlay:!!entry});else if(entry)play.click();if(entry){save();window.history?.replaceState(null,'','level-three.html');}}).catch(error=>{window.ArcadeLoading?.fail();mainMenu?.fail();message.textContent='No se pudo cargar el escenario. Recarga la página para volver a intentarlo.';console.error(error);loadPromise=null;return false;});return loadPromise;}
  if(mainMenu?.defer)mainMenu.defer(loadLevel);
  if(entry||!mainMenu?.defer)loadLevel();
  requestAnimationFrame(frame);
})();


