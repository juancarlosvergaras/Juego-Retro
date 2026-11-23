(() => {
  'use strict';
  if(window.ArcadeCampaign?.guardEntry && !ArcadeCampaign.guardEntry('m3'))return;
  const L=ArcadeLevelThree,P=ArcadePhysics,canvas=document.getElementById('level-two'),ctx=canvas.getContext('2d');
  const menu=document.getElementById('level-two-menu'),play=document.getElementById('play-two'),message=document.getElementById('level-two-message'),context=document.getElementById('context-two');
  const audio=ArcadeAudio.create(),keys=new Set(),queue=new Set(),firePointers=new Set(),camera={x:0,y:0},images={};
  let paused=true,loaded=false,started=false,last=0,accumulator=0,renderer,saveAge=0,shotWait=0,mode={},doorLatch=false,mainMenu=null,queuedAim=null;
  const fireBuffer=ArcadeArsenal.createFireBuffer();
  const story=window.ArcadeMissionThreeStory?.mount(canvas.parentElement);let briefed=false;
  const presentation=window.ArcadeBossPresentation?.create(canvas.parentElement,canvas),staged={};
  let leavingMission=false;
  const storageKey='cap-dollar.mission-three.v1';
  function load(){try{const value=JSON.parse((window.ArcadeDeveloperMode?.storage(localStorage)||localStorage).getItem(storageKey)||'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return{};}}
  const entry=new URLSearchParams(location.search).get('entry'),fresh=entry==='select'||entry==='campaign';
  const saved=fresh?{}:load();
  let store;try{store=window.ArcadeDeveloperMode?.storage(localStorage)||localStorage;}catch{store={getItem:()=>null,setItem:()=>{}};}
  const campaign=ArcadeCampaign.loadout(store,entry==='select'?'campaign':entry,saved);
  const stats=ArcadeMissionCombat.create(ArcadeCampaign.inventory(campaign.inventory)),powers=ArcadePowers.create(),soundEvents=ArcadeSoundEvents.create(audio);
  for(const [id,time] of Object.entries(campaign.cooldowns||{}))if(Number.isFinite(time)&&time>0)powers.cooldowns[id]=time;
  const geometry=L.geometry();
  const checkpoints=ArcadeCheckpoints.create(3,[],saved.checkpoints);
  const defeated=Array.isArray(saved.defeated)?saved.defeated:[];


  const mecha=ArcadeAirMecha.create(saved.dead?{defeated:saved.mecha?.defeated}:saved.mecha||{},ArcadeDifficulty.get(ArcadeDifficulty.load(store)).health);
  const loot=L.loot(saved.loot||{},geometry.platforms),cityEnemies=[...L.soldiers(defeated),mecha];stats.enemies=cityEnemies;
  const score=ArcadeScore.create();score.total=campaign.score||0;for(const n of cityEnemies)if(n.hp<=0)score.awarded.add('soldiers:'+n.id);
  for(const w of loot.weapons)if(w.taken)score.awarded.add('weapons:'+w.id);
  for(const kit of loot.medkits)if(kit.taken)score.awarded.add('health:'+kit.id);
  for(const tank of loot.fuelTanks)if(tank.taken)score.awarded.add('fuel:'+tank.id);
  for(const star of loot.stars)if(star.taken)score.awarded.add('challenge:city-star:'+star.id);
  if(loot.stars.every(s=>s.taken))score.awarded.add('challenge:city-stars-all');
  if(mecha.defeated)score.awarded.add('challenge:air-mecha');
  const player=P.createPlayer(),state={player,time:Number.isFinite(saved.elapsed)?Math.max(0,saved.elapsed):0,inside:false,geometry:null,bullets:[],fade:0,waters:[],mecha,introAge:0};
  Object.assign(P.WORLD,L.WORLD);
  function configure(inside,x){
    state.inside=false;state.geometry=geometry;stats.cars=[];stats.enemies=cityEnemies;stats.king=null;stats.tank=null;stats.pickups=loot.weapons;stats.medkits=loot.medkits;stats.bullets=[];stats.playerPlasma=[];stats.playerPools=[];stats.plasmaDrips=[];stats.zombieEffects=[];stats.explosions=[];stats.debris=[];stats.weaponAction=null;P.WORLD.width=L.WORLD.width;
    ArcadeZombieForm.setBody(player,player.form);
    Object.assign(player,{x:Math.max(30,Math.min(P.WORLD.width-30,x)),y:620,vx:0,vy:0,grounded:true,ground:state.geometry.platforms[0],rope:null,ladder:null,jumps:0,jetpack:false,heroFlight:false,crouching:false,transform:0,transformFrom:null,cloak:0,fighterImpact:null,fighterPose:0,fighterFreeze:0,burrow:null,burrowLatch:false,claw:0,kick:0,kickAir:false,ramCooldown:0,ramBuffer:0,wolfSprintJump:false,zombiePose:0,slide:0,landing:0,hurt:0,fallPeak:620,fallDamage:0,ram:null,ramLatch:false,ramKickLatch:false,idleTime:0,wolfAttack:null,wolfChain:null,wolfQueued:null,wolfFireHeld:false,wolfKickHeld:false});

    player.y=P.surfaceY(state.geometry.platforms[0],player.x);player.fallPeak=player.y;
    P.step(player,{},0,state.geometry.platforms);
    camera.x=Math.max(0,Math.min(P.WORLD.width-canvas.width,player.x-canvas.width*.35));camera.y=620-canvas.height*.84;
    state.bullets=[];state.fade=1;
  }
  const respawnPoint=()=>ArcadeCheckpoints.spawn(checkpoints,{inside:false,x:240,y:620});
  configure(saved.dead?respawnPoint().inside:state.inside,saved.dead?respawnPoint().x:Number.isFinite(saved.x)?saved.x:L.INSERTION.x);ArcadeProgression.protect(player,saved.dead?ArcadeProgression.RESPAWN_SECONDS:(saved.respawnProtection||0));
  state.weather=window.ArcadeWorldLighting?.create();state.fade=0;state.checkpoints=checkpoints;state.combat=stats;state.loot=loot;state.mecha=mecha;
  ArcadeDifficulty.apply({...stats,enemies:cityEnemies.filter(n=>n!==mecha)},ArcadeDifficulty.load(store));
  ArcadeDifficulty.applyPlayerDamage(stats,ArcadeDifficulty.load(store));
  const profile=ArcadeProgression.load(store);if(fresh)ArcadeProgression.beginWorld(profile);ArcadeProgression.apply(profile,player,stats,true);
  if(fresh||!Number.isFinite(saved.x)||saved.dead)stats.hp=stats.maxHp;
  else if(Number.isFinite(campaign.hp))stats.hp=Math.max(1,Math.min(stats.maxHp,campaign.hp));
  if(Number.isFinite(campaign.fuel))player.fuel=Math.min(player.fuelMax,campaign.fuel);
  player.shield=fresh?0:campaign.shield??profile.shield;
  let arrivalAge=0,arrival=fresh||!Number.isFinite(saved.x)||saved.landed===false?{active:true,x:L.INSERTION.x,y:L.WORLD.ground}:null;state.introAge=arrival?0:9;
  state.civilians=[];state.endingAge=saved.ending?0:-1;
  if(saved.zombieUnlocked||campaign.zombieUnlocked){profile.zombieUnlocked=true;player.zombieUnlocked=true;}
  if(saved.robotUnlocked||campaign.robotUnlocked){profile.robotUnlocked=true;player.robotUnlocked=true;}
  if(!arrival)ArcadeZombieForm.restoreBody(player,saved.form,true);
  player.formCooldown=Math.max(0,Math.min(5,Number(saved.formCooldown??campaign.formCooldown)||0));
  if(arrival){player.x=arrival.x;player.y=arrival.y;player.grounded=false;}
  window.ArcadeDeveloperMode?.prepare(profile,player,stats,powers);
  const wheel=ArcadeCharacterWheel.create(document.getElementById('characters-two'),switchForm);
  function switchForm(target){if(paused||arrival?.active||state.endingAge>=0)return;if(!ArcadeZombieForm.change(stats,player,target)){if(player.formCooldown>0)notify('Transformación disponible en '+Math.ceil(player.formCooldown)+' s');return;}audio.play('whiteRoar',{gain:.3});notify('Forma de '+ArcadeZombieForm.label(player.form)+' · T en 5 s');save();wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked,player.heroUnlocked);}
  function save(){if(leavingMission)return;if(stats.dead)ArcadeProgression.loseLife(profile,stats);try{profile.shield=player.shield;ArcadeProgression.save(profile,store);const carry={formCooldown:player.formCooldown||0,zombieUnlocked:!!player.zombieUnlocked,robotUnlocked:!!player.robotUnlocked,tankUnlocked:!!player.tankUnlocked,fighterUnlocked:!!player.fighterUnlocked,score:score.total,hp:stats.hp,fuel:player.fuel,shield:player.shield,inventory:stats.inventory,cooldowns:powers.cooldowns};store.setItem(storageKey,JSON.stringify({...carry,respawnProtection:player.respawnProtection,elapsed:state.time,checkpoints:ArcadeCheckpoints.snapshot(checkpoints),x:arrival?.active?L.INSERTION.x:player.x,form:player.form,landed:!arrival?.active,dead:stats.dead,defeated:cityEnemies.filter(n=>n.hp<=0&&n!==mecha).map(n=>n.id),ending:state.endingAge>=0,mecha:ArcadeAirMecha.snapshot(mecha),loot:ArcadeMissionTwoLoot.snapshot(loot)}));ArcadeCampaign.write(store,{...carry,level:3,arrival:!!arrival?.active});}catch{}}
  let noticeAge=0,notice='';
  function notify(text){notice=text;noticeAge=3;context.textContent=text;}
  function chooseWeapon(slot){if(player.form==='robot'&&slot<3){notify('Robot · Elige un arma de disparo (3–9)');return;}if(paused||arrival?.active||player.transform>0)return;if(player.form==='wolf'||player.form==='zombie'){notify('Vuelve al soldado con T para usar armas.');return;}if(ArcadeArsenal.selectWeapon(stats.inventory,slot,player.form)){save();hud.update(false);}else notify('Todavía no has recogido esa arma.');}
  function cyclePower(){if(paused||arrival?.active)return;const list=[...profile.owned,...(player.shield>0?['shield']:[])];profile.equipped=list[(list.indexOf(profile.equipped)+1)%list.length]||null;save();}
  function usePower(){if(paused||arrival?.active)return;if(profile.equipped==='shield')notify('Escudo antibalas · '+player.shield+' impactos restantes');else queue.add('power');}
  const hud=ArcadeMissionHud.create({player,encounter:stats,profile,powers,canvas,audio,score:()=>score.total,onSelect:chooseWeapon,onPower:usePower,onCycle:cyclePower,onPersist:save});
  function controls(){return{left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),up:keys.has('KeyW')||keys.has('ArrowUp')||queue.has('up'),down:keys.has('KeyS')||keys.has('ArrowDown'),run:keys.has('ShiftLeft')||keys.has('ShiftRight'),jumpPressed:queue.has('jump'),jumpHeld:queue.has('jump')||keys.has('Space'),hookPressed:queue.has('hook'),jetpackPressed:queue.has('jet'),...ArcadeArsenal.triggerInput(keys,firePointers.size>0,queue.has('fire')),kick:player.form!=='robot'&&(queue.has('kick')||keys.has('KeyL')),power:queue.has('power')||keys.has('KeyG')};}
  function pause(){if(!loaded)return;paused=true;player.wolfQueued=null;keys.clear();firePointers.clear();queue.clear();queuedAim=null;fireBuffer.clear();save();menu.hidden=false;canvas.inert=true;audio.setRunning(false);wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked,player.heroUnlocked);play.textContent='Continuar';document.getElementById('level-two-title').textContent='Partida en pausa';message.textContent='Tu partida queda detenida mientras consultas el menú.';document.getElementById('pause-options').hidden=false;document.getElementById('shop').hidden=true;document.getElementById('shortcuts').hidden=true;const shortcuts=document.getElementById('show-shortcuts');shortcuts.textContent='Ver atajos de teclado';shortcuts.setAttribute('aria-expanded','false');play.focus();}
  play.onclick=()=>{if(!loaded)return;if(ArcadeProgression.restartLives(profile,store,storageKey)){leavingMission=true;location.assign('level-three.html?entry=select');return;}
    // A fresh assault opens with the animated briefing; resuming goes straight to play.
    if(story&&!briefed&&!stats.dead&&arrival?.active&&arrivalAge===0){briefed=true;menu.hidden=true;story.briefing(()=>play.click(),{inventory:stats.inventory,actors:images});return;}
    if(stats.dead){stats.dead=false;stats.hp=stats.maxHp;stats.lifeLost=false;ArcadeProgression.protect(player);player.hurt=0;stats.bullets=[];stats.explosions=[];const cp=respawnPoint();configure(cp.inside,cp.x);Object.assign(mecha,ArcadeAirMecha.create({defeated:mecha.defeated},ArcadeDifficulty.get(stats.difficulty).health));save();}started=true;paused=false;menu.hidden=true;canvas.inert=false;keys.clear();firePointers.clear();queue.clear();queuedAim=null;fireBuffer.clear();audio.unlock();audio.setRunning(true);wheel.update(player.form,true,arrival?.active||player.transform>0,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked,player.heroUnlocked);canvas.focus();};
  document.getElementById('pause-two').onclick=()=>paused?play.click():pause();
  document.getElementById('show-shortcuts').onclick=()=>{const panel=document.getElementById('shortcuts'),button=document.getElementById('show-shortcuts');panel.hidden=!panel.hidden;button.textContent=panel.hidden?'Ver atajos de teclado':'Ocultar atajos de teclado';button.setAttribute('aria-expanded',String(!panel.hidden));};
  document.getElementById('restart').onclick=()=>{if(loaded)location.assign('level-three.html?entry=select');};
  mainMenu=window.ArcadeMainMenu?.create({mission:3,resumeAvailable:Number.isFinite(saved.x),soundControls:document.querySelector('.sound-controls'),tutorial:window.ArcadeTutorial?.create(store),difficulty:ArcadeDifficulty.load(store),
    onPlay(){play.click();},onPause(){pause();menu.hidden=true;},onSound(){audio.setRunning(false);},onSelectMission(){save();started=false;},
    onDifficulty(id){ArcadeDifficulty.apply({...stats,enemies:cityEnemies.filter(n=>n!==mecha)},id);const level=ArcadeDifficulty.get(id),fraction=mecha.hp/mecha.maxHp;ArcadeDifficulty.applyPlayerDamage(stats,level.id);mecha.maxHp=Math.round(100*level.health);mecha.hp=mecha.maxHp*fraction;return ArcadeDifficulty.save(id,store);}});

  document.getElementById('open-main-menu').onclick=()=>mainMenu?.show();
  function queueFire(){queue.add('fire');fireBuffer.press(stats.inventory.selected);const input=window.ArcadeControls?.decorate(controls())||controls();queuedAim=ArcadeArsenal.aimDirection(ArcadeArsenal.aimInput(input,player),player.facing);}
  function press(code){
    if(paused||state.endingAge>=0)return;if(arrival?.active){if(code==='KeyS'||code==='ArrowDown')keys.add(code);if(code==='Space'||code==='Enter')arrivalAge=L.INSERTION.duration;return;}keys.add(code);
    if(code==='BracketRight'||code==='BracketLeft'){const inv=stats.inventory,list=inv.owned.slice().sort((a,b)=>a-b);chooseWeapon(list[(list.indexOf(inv.selected)+(code==='BracketRight'?1:-1)+list.length)%list.length]);}if(/^Digit[1-9]$/.test(code))chooseWeapon(Number(code.slice(-1)));if(/^Numpad[1-9]$/.test(code))chooseWeapon(Number(code.slice(-1)));if(code==='KeyH')cyclePower();if(code==='KeyG')usePower();if(code==='KeyL'){if(player.form==='robot'){ArcadeRobotForm.cycle(stats.inventory);save();}else queue.add('kick');}if(code==='KeyT')switchForm();if(code==='KeyF')queue.add('jet');
    if(code==='Space')queue.add('jump');if(code==='KeyE')queue.add('hook');if(ArcadeArsenal.fireKeys.includes(code))queueFire();if(code==='KeyW'||code==='ArrowUp')queue.add('up');
  }
  window.addEventListener('keydown',e=>{
    if(story?.briefingOpen())return;
    if(mainMenu?.isOpen())return;
    const code=ArcadeArsenal.controlCode(e);
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space',...ArcadeArsenal.fireKeys].includes(code))e.preventDefault();
    if(code==='Escape'||code==='KeyP'){if(e.repeat)return;if(paused&&started)play.click();else pause();return;}
    if(!paused&&!arrival?.active)keys.add(code);
    if(!e.repeat)press(code);
  });
  window.addEventListener('keyup',e=>{keys.delete(ArcadeArsenal.controlCode(e));keys.delete(e.code);},true);
  // A pointer trigger avoids keyboard rollover limits without changing arrow aim.
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||!loaded||paused||stats.dead||arrival?.active||mainMenu?.isOpen())return;
    e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
    firePointers.add(e.pointerId);queueFire();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>firePointers.delete(e.pointerId));

  window.addEventListener('blur',()=>{if(!paused&&!window.__keepRunning)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&!window.__keepRunning)pause();});
  window.addEventListener('pagehide',()=>{if(started)save();});
  menu.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=Array.from(menu.querySelectorAll('button,a,input')).filter(el=>!el.disabled&&!el.closest('[hidden]'));const i=items.indexOf(document.activeElement);e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();});
  for(const button of document.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);press(button.dataset.key);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
  }
  // The Sentinel gets one entrance and one fall; the radio follows the assault.
  function narrate(dt){
    if(presentation){const once=(id,kind,title,subtitle)=>{if(staged[id])return;staged[id]=true;presentation[kind](title,subtitle);};
      if(staged.init===undefined){staged.init=true;if(mecha.hp<=0)staged.mechaIn=staged.mechaOut=true;}
      if(mecha.active&&mecha.hp>0)once('mechaIn','intro','EL CENTINELA','Jefe · Guardián de proa');
      if(mecha.hp<=0&&staged.mechaIn)once('mechaOut','defeat','CENTINELA DESTRUIDO','El chasis robot es tuyo');}
    story?.update({landed:!arrival?.active,x:player.x,hp:stats.hp,enemyAlert:stats.enemies.some(n=>n.hp>0&&n.alert&&n.kind!=='jetSoldier'&&n.kind!=='mecha'),jetSeen:stats.enemies.some(n=>n.hp>0&&n.kind==='jetSoldier'&&Math.abs(n.x-player.x)<520),mechaActive:mecha.active&&mecha.hp>0,mechaHalf:mecha.hp>0&&mecha.hp<=mecha.maxHp/2,mechaDown:!!mecha.defeated},dt);
  }
  function playDischarge(source,sound){audio.play(sound,ArcadeSoundEvents.spatial(source,player));}
  function update(dt){ArcadeProgression.tickProtection(player,dt);
    if(state.debriefed)return;
    audio.music?.follow?.(dt,player,stats,{quiet:arrival?.active,boss:mecha.active&&mecha.hp>0,victory:mecha.defeated||state.endingAge>=0});
    narrate(dt);
    window.ArcadeDeveloperMode?.tick(player,stats);
    state.time+=dt;state.fade=Math.max(0,state.fade-dt*2);shotWait=Math.max(0,shotWait-dt);const input=window.ArcadeControls?.decorate(controls())||controls();
    ArcadeZombieForm.tick(player,dt);
    player.transform=Math.max(0,(player.transform||0)-dt);player.claw=Math.max(0,(player.claw||0)-dt);player.kick=Math.max(0,(player.kick||0)-dt);noticeAge=Math.max(0,noticeAge-dt);
    wheel.update(player.form,true,paused||arrival?.active||player.transform>0||!!player.rope||!!player.ladder||!!player.burrow,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked,player.heroUnlocked);

    if(state.endingAge>=0){state.endingAge+=dt;if(!state.debriefed)audio.loop('helicopter',.25);queue.clear();if(state.endingAge>=13&&!leavingMission){const leave=level=>{save();leavingMission=true;location.assign(ArcadeCampaign.enterRoute(level,store,player,stats,score,powers));},go=()=>leave(5);
      // The finale ends on the shared debrief card where it is available.
      if(!window.ArcadeMissionResults?.show)go();else if(!state.debriefed){state.debriefed=true;audio.loop('helicopter',0);const debrief=()=>ArcadeMissionResults.show({kicker:'MISIÓN 03 COMPLETADA',title:'GUERRA EN EL AIRE',epilogue:'El Centinela ha caído y su chasis es tuyo. En la cubierta encontraste las coordenadas del submarino del Consorcio. Vega te espera en el puerto.',stats:ArcadeMissionResults.rows(score,{enemies:stats.enemies.filter(n=>n.kind!=='mecha'),seconds:state.time,extra:[['Estrellas',loot.stars.filter(x=>x.taken).length+' / '+loot.stars.length],['Chasis robot','Conseguido']]}),next:{label:'Bajo el abismo · Misión 05',run:go},retry:{label:'Repetir misión',run:()=>document.getElementById('restart').click()}});
        // Tras la cinemática de cierre, el epílogo a pantalla completa y después el parte.
        if(story?.outro)story.outro(debrief);else debrief();}}return;}
    if(mecha.defeated&&player.x>=L.EXTRACTION){ArcadeCampaign.markCompleted(store,3);state.endingAge=0;stats.bullets=[];save();return;}
    if(arrival?.active){
      audio.loop('helicopter',.3);arrivalAge+=dt;state.introAge=arrivalAge;
      const ground=state.geometry.platforms[0],floor=P.surfaceY(ground,L.INSERTION.x);
      const drop=L.insertion(arrivalAge,canvas.width,canvas.height,floor);
      Object.assign(player,{x:drop.x,y:drop.y,grounded:drop.grounded,ground:drop.grounded?ground:null,landing:drop.landing,anim:arrivalAge});
      queue.clear();queuedAim=null;fireBuffer.clear();
      if(arrivalAge>=L.INSERTION.duration){arrival=null;audio.loop('helicopter',0);player.fallPeak=floor;save();}
      return;
    }
    if(player.transform>0){queue.clear();queuedAim=null;fireBuffer.clear();return;}
    ArcadeArsenal.playerAim(player,input,{queuedAim,turn:false});
    if(input.hookPressed&&(player.form==='wolf'||player.form==='zombie'))notify('El gancho solo está disponible para el soldado');
    mode=P.step(player,ArcadeArsenal.movementInput(player,input),dt,state.geometry.platforms,{ladders:state.geometry.ladders,anchors:[]});
    if(mecha.active&&mecha.hp>0)player.x=Math.max(6170,Math.min(7610,player.x));
    player.crouching=!!mode.crouching;player.aimHeight=mode.crouching?20:28;
    if(player.aim.x&&player.form!=='wolf'&&!player.rope)player.facing=Math.sign(player.aim.x);ArcadeSoldierAnimation.advanceWalk(player,dt);
    const previousAction=stats.weaponAction;
    const powerMessage=ArcadeMissionCombat.update(stats,player,input,dt,state.geometry.platforms,powers,profile,{left:camera.x,right:camera.x+canvas.width,top:camera.y,bottom:camera.y+canvas.height},playDischarge);if(powerMessage)notify(powerMessage);
    if(mecha.hp<=0&&!mecha.defeated){mecha.blastWait=(mecha.blastWait||0)-dt;if(mecha.blastWait<=0){mecha.blastWait=.42;stats.explosions.push(ArcadeImpact.create(mecha.x+Math.sin(mecha.deathAge*19)*45,mecha.y-35-Math.abs(Math.sin(mecha.deathAge*13))*100,60,'rocket'));if(presentation)presentation.timeline.state.shake=Math.max(presentation.timeline.state.shake,.2);}}
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
    if(mecha.defeated&&!score.awarded.has('challenge:air-mecha')){if(!profile.robotUnlocked){stats.inventory.secondary=3;stats.inventory.selected=5;}profile.robotUnlocked=true;player.robotUnlocked=true;for(const slot of [3,5])if(!stats.inventory.owned.includes(slot))stats.inventory.owned.push(slot);stats.inventory.ammo[3]=Math.max(stats.inventory.ammo[3]||0,72);stats.inventory.ammo[5]=Math.max(stats.inventory.ammo[5]||0,120);ArcadeScore.bonus(score,{id:'air-mecha',points:4500,label:'Robot de combate desbloqueado',x:mecha.x,y:mecha.y-100});notify('¡MISIÓN 03 COMPLETADA! Robot desbloqueado · T · Dos armas con J');save();}
    P.updateIdle(player,input,dt);
    soundEvents.update({player,encounter:stats,powers,dischargesHandled:true,fuelTanks:loot.fuelTanks,weather:{wind:.85,distant:true}},dt);state.bullets=stats.bullets;
    ArcadeScore.tick(score,dt);ArcadeScore.sync(score,{enemies:stats.enemies,pickups:stats.pickups,medkits:stats.medkits},state.inside?[]:loot.fuelTanks);const reward=score.total-beforeScore;if(reward){campaign.score=score.total;ArcadeProgression.credit(profile,reward);save();}
    if(stats.dead){player.jetpack=false;pause();document.getElementById('level-two-title').textContent='Has caído';play.textContent=checkpoints.active?'Volver al CHECK POINT':'Reintentar misión';message.textContent=checkpoints.active?'Volverás a la última PC activada con tu progreso conservado.':'Regresa al punto de entrada para continuar la misión.';ArcadeProgression.showGameOver(document,profile);return;}
    const activated=ArcadeCheckpoints.update(checkpoints,player,dt,{inside:state.inside,blocked:stats.dead});if(activated){notify('CHECK POINT · Progreso guardado');audio.play('pickup',{gain:.45});save();}
    queue.clear();if(fireBuffer.tick(dt,player,stats,previousAction))queue.add('fire');else queuedAim=null;
    const focus=player.x-canvas.width*.38;const targetX=Math.max(0,Math.min(P.WORLD.width-canvas.width,focus));camera.x+=(targetX-camera.x)*(1-Math.exp(-6*dt));
    // Horizontal exploration keeps the walking plane steady; height follows only substantial climbs.
    const targetY=Math.min(620-canvas.height*.84,player.y-canvas.height*.66);camera.y+=(targetY-camera.y)*(1-Math.exp(-5*dt));
    saveAge+=dt;if(saveAge>2&&player.grounded){saveAge=0;save();}
  }
  const robotDock=window.ArcadeRobotForm?.installDock(player,stats,save);
  function updateRoute(){document.getElementById('region-two').textContent=player.x<2200?'Cubierta de despegue':player.x<4300?'Torre de control':player.x<6170?'Pasarelas de popa':'Arena del Centinela';document.getElementById('route-two').max=L.EXTRACTION;document.getElementById('route-two').value=Math.min(player.x,L.EXTRACTION);document.getElementById('distance-two').textContent=Math.round(Math.min(player.x/L.EXTRACTION,1)*100)+'% DEL RECORRIDO';context.textContent=noticeAge>0?notice:mecha.defeated?'ROBOT DESBLOQUEADO · Avanza a la derecha para la extracción →':mecha.active?'CENTINELA · Evita las marcas rojas y salta las ondas':arrival?.active?'MISIÓN 03 · GUERRA EN EL AIRE':'Avanza por la cubierta · J disparar · T transformar';}
  function updateObjectives(){document.querySelector('.viewport')?.classList?.toggle('air-cinematic',!!arrival?.active||state.endingAge>=0);robotDock?.();document.getElementById('stars-two').textContent='★ '+loot.stars.filter(s=>s.taken).length+' / 3';document.getElementById('boss-hud').hidden=!mecha.active&&!mecha.defeated;document.getElementById('boss-title').textContent=mecha.defeated?'CENTINELA DESTRUIDO · ROBOT DESBLOQUEADO':'JEFE · CENTINELA AÉREO';const fill=document.getElementById('boss-fill');fill.style.width=100*mecha.hp/mecha.maxHp+'%';fill.parentElement.setAttribute('aria-label','Vida del Centinela Aéreo');fill.parentElement.setAttribute('aria-valuemax',mecha.maxHp);fill.parentElement.setAttribute('aria-valuenow',Math.ceil(mecha.hp));document.getElementById('boss-value').textContent=Math.ceil(mecha.hp)+' / '+mecha.maxHp;document.getElementById('state').textContent=ArcadeZombieForm.label(player.form);document.getElementById('hook-status').textContent=player.form==='hero'?'F · VUELO DE CENTELLA':player.form==='soldier'?'F · JETPACK':'T · CAMBIAR PERSONAJE';}
  updateObjectives();
  function drawEnemies(){
    for(const n of stats.enemies){
      if(n.x<camera.x-70||n.x>camera.x+canvas.width+70||n.hp<=0&&n.death<=0&&n.kind!=='mecha')continue;
      if(ArcadeEnemySpecialists.drawRam(ctx,n,images.ramHit))continue;
      if(n.kind==='mecha'){ArcadeAirMecha.draw(ctx,n,images.mecha,images.mechaWalk);continue;}
      if(n.kind==='bat'){ArcadeCemeteryBat.draw(ctx,n,images.bat);continue;}
      if(n.kind==='zombie')ArcadeCemeteryZombies.draw(ctx,n,images.zombie);else if(!ArcadeEnemySpecialists.draw(ctx,n,images))ArcadeMissionKit.drawEnemy(ctx,n,images.enemy);
      if(n.kind!=='zombie'||n.phase==='active')ArcadeMissionKit.enemyBar(ctx,n);
    }
  }
  function drawLoadout(entering=false){
    ArcadeCheckpoints.draw(ctx,checkpoints,false,state.time,{left:camera.x,right:camera.x+canvas.width,top:camera.y,bottom:camera.y+canvas.height});ArcadeMissionTwoLoot.draw(ctx,loot,state.time,{left:camera.x,right:camera.x+canvas.width},player);ArcadeMedkits.draw(ctx,loot.medkits,player,camera,canvas.height);drawEnemies();
    if(!entering)ArcadeMissionKit.drawShooter(ctx,player,mode,stats,images,powers,state.geometry.platforms);
    if(!entering)ArcadeMissionCombat.draw(ctx,stats,powers,player,{top:camera.y,bottom:camera.y+canvas.height});window.ArcadePowerFx?.draw(ctx,powers,player,stats);

    ArcadeScore.draw(ctx,score);
  }
  // Open sky: a light vignette, with muzzle flashes, blasts and powers still lighting the deck.
  function drawLight(){const Fx=window.ArcadeMissionOneFx;if(!Fx)return;const lamps=[1330,2640,3690,4900].filter(x=>x>camera.x-300&&x<camera.x+canvas.width+300).map(x=>({x:x+38,y:360,r:60,a:.4,glow:'255,128,102',ga:.1}));
    if(player.form==='robot'&&window.ArcadeRobotForm?.lights)lamps.push(...ArcadeRobotForm.lights(player,stats));
    if(window.ArcadeAirMecha?.lights)lamps.push(...ArcadeAirMecha.lights(mecha));
    Fx.lightmap(ctx,camera,canvas.width,canvas.height,Fx.collect({player,encounter:stats,powers,time:state.time,arrival,lamps,checkpoint:null}),.07);}
  function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.min(880,Math.max(window.ArcadeMobile?.active?430:640,Math.round(r.width/(window.ArcadeMobile?.active?1.1:1.75))));canvas.height=Math.round(r.height/r.width*canvas.width);camera.y=arrival?.active?620-canvas.height*.84:Math.min(620-canvas.height*.84,player.y-canvas.height*.66);}
  new ResizeObserver(resize).observe(canvas);
  const frameBudget=window.ArcadeFrameBudget?.create();
  function frame(t){window.ArcadeDeveloperMode?.poll();window.ArcadeControls?.poll(t);const budget=frameBudget?.plan(t,{paused,hidden:document.hidden,width:canvas.width,height:canvas.height})||{render:true,hud:true};const dt=Math.min(.08,(t-last)/1000||0);last=t;if(loaded){if(!paused){accumulator+=dt*(presentation?presentation.tick(dt):1);while(accumulator>=1/120){update(1/120);accumulator-=1/120;if(paused||stats.dead){accumulator=0;break;}}}else accumulator=0;if(budget.render){renderer.draw(ctx,state,camera,canvas.width,canvas.height,drawLoadout);if(state.endingAge<0)drawLight();presentation?.draw(ctx,canvas.width,canvas.height);}story?.render(paused||!!arrival?.active);if(budget.hud){updateObjectives();updateRoute();hud.update(paused||arrival?.active||state.endingAge>=0||player.transform>0,!!arrival?.active&&!paused&&!(player.transform>0));}}requestAnimationFrame(frame);}
  const paths={mechaWalk:'assets/sprites/centinela-marcha-16.webp',expansion:'assets/sprites/enemigos-expansion-v1.png',rescueHeli:"assets/sprites/helicoptero-rescate-v3.png",patrolHeli:"assets/sprites/suceso-helicoptero-8.webp","zombieCast":"assets/sprites/zombi-disparo-direcciones-v1.png","jetMk2":"assets/sprites/jetpack-mk2-v1.png","zombieRun":"assets/sprites/zombi-carrera-v2.png","shock":"assets/sprites/electrocucion-v1.png","checkpointPc":"assets/sprites/checkpoint-pc-v1.png","wolfJump":"assets/sprites/lobo-salto-carrera-v1.png","formTransition":"assets/sprites/transformaciones-jugador-v3.png","zombieIdle":"assets/sprites/zombi-soldado-reposo-v1.png","zombieSoldier":"assets/sprites/zombi-soldado-v1.png","zombieSoldierExtra":"assets/sprites/zombi-soldado-extra-v1.png","zombiePlayer":"assets/sprites/zombi-electrico-v1.png","zombieExtra":"assets/sprites/zombi-electrico-extra-v1.png","wolfActions":"assets/sprites/lobo-reposo-patadas-v2.png","wolfCombos":"assets/sprites/lobo-combos-v1.png","wolfRam":"assets/sprites/lobo-cabezazo-v1.png","ramHit":"assets/sprites/enemigos-embestida-v1.png","wolfWalk":"assets/sprites/lobo-caminata-v2.png","crouch":"assets/sprites/soldado-agachado-pasos-v1.png","turret":"assets/sprites/enemigo-torreta-v1.png","knife":"assets/sprites/enemigo-cuchillo-v1.png","impact":"assets/sprites/explosion-impacto-v1.png","wolfSprint":"assets/sprites/lobo-carrera-cuatro-patas-v1.png","enemy":"assets/sprites/soldado-enemigo-v1.png","melee":"assets/sprites/soldado-cuchillo-hacha-v1.png","kicks":"assets/sprites/lobo-patadas-v1.png","powerSheet":"assets/sprites/poderes-v1.png","orbitalSheet":"assets/sprites/orbital-superrayo-v1.png","soldier":"assets/sprites/soldado-v2.png","climb":"assets/sprites/soldado-escalada-v2.png","walk":"assets/sprites/soldado-pasos-v3.png","slide":"assets/sprites/soldado-deslizamiento-v1.png","wolf":"assets/sprites/soldado-lobo-v1.png","wolfClimb":"assets/sprites/lobo-escalada-v1.png","transformation":"assets/sprites/soldado-transformacion-v2.png","carrier":"assets/worlds/mission-03/portaaviones-v1.png","airAtlas":"assets/worlds/mission-03/cubierta-atlas-v1.png","mecha":"assets/sprites/mecha-aereo-v1.png"};
  let loadPromise;
  function loadLevel(){if(loaded)return Promise.resolve(true);if(loadPromise)return loadPromise;
  const useZombie=player.zombieUnlocked||player.form==='zombie';
    const levelArt=Object.entries(paths).filter(([key])=>useZombie||!/^zombie[A-Z]/.test(key));
    window.ArcadeLoading?.begin(levelArt.length,loadLevel);
  loadPromise=Promise.all([window.ArcadeAdvancedForms?.load(player),window.ArcadeRobotForm?.load(),...levelArt.map(([key,path])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[key]=img;window.ArcadeLoading?.step();resolve();};img.onerror=()=>reject(Error(path));img.src=path;}))]).then(()=>{
    for(const key of Object.keys(images))if(!['patrolHeli','rescueHeli','carrier','mecha','mechaWalk'].includes(key))images[key]=prepareWhiteDeath(images[key]);
    ArcadeJetpackRenderer.setSheet(images.jetMk2);
    ArcadeZombieForm.setShockSheet(images.shock);
    ArcadeCheckpoints.setSheet(images.checkpointPc);
    ArcadeFormTransition.setSheet(images.formTransition);
    ArcadeImpact.setSheet(images.impact);
    ArcadePowerSprites.setSpriteSheet(images.powerSheet);
    ArcadePowerSprites.setOrbitalSheet(images.orbitalSheet);
    ArcadeAirMecha.setSheet?.(images.mecha);
    renderer=ArcadeLevelThreeRenderer.create(images);
    loaded=true;
    window.ArcadeLoading?.finish();
    resize();
    if(useZombie){
      ArcadeZombieForm.setRunSheet(images.zombieRun);
      ArcadeZombieForm.setCastSheet(images.zombieCast);
      ArcadeZombieForm.setSheet(images.zombiePlayer);
      ArcadeZombieForm.setExtra(images.zombieExtra);
      ArcadeZombieForm.setPlayerSheets(images.zombieSoldier,images.zombieSoldierExtra);
      ArcadeZombieForm.setIdleSheet(images.zombieIdle);
    }
    wheel.setSprites(images.soldier,SOLDIER_V2_FRAMES[0][0],images.wolf,ACTION_FRAMES.wolf[0][7]);
    window.ArcadeFormTransition?.setEndpoint('wolf',images.wolfActions,ArcadeSoldierAnimation.wolfActionFrames[0][0],ArcadeSoldierAnimation.wolfActionFrames[0][0][3]*ArcadeSoldierAnimation.wolfActionScale);
    wheel.update(player.form,true,true,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked,player.heroUnlocked);
    play.disabled=false;
    play.textContent=Number.isFinite(saved.x)?'Continuar misión 03':'Comenzar misión 03';
    canvas.inert=true;
    play.focus();
    if(mainMenu)mainMenu.ready({autoPlay:!!entry});
    else if(entry)play.click();
    if(entry){save();
    window.history?.replaceState(null,'','level-three.html');}
  }).catch(error=>{window.ArcadeLoading?.fail();mainMenu?.fail();message.textContent='No se pudo cargar el escenario. Recarga la página para volver a intentarlo.';console.error(error);loadPromise=null;return false;});return loadPromise;}
  if(mainMenu?.defer)mainMenu.defer(loadLevel);
  if(entry||!mainMenu?.defer)loadLevel();
  if(new URLSearchParams(location.search).has('debug'))window.__game=ArcadeMissionKit.debug({ctx,images,player,stats,state,camera,canvas,mecha,powers,profile,get paused(){return paused;},get arrival(){return arrival;}},{step(dt){presentation?.tick(dt);update(dt);},dead:()=>stats.dead,redraw(){renderer.draw(ctx,state,camera,canvas.width,canvas.height,drawLoadout);if(state.endingAge<0)drawLight();presentation?.draw(ctx,canvas.width,canvas.height);story?.render(false);}});
  requestAnimationFrame(frame);
})();


