(() => {
  'use strict';
  const {WORLD,EXTENSION,decks,createPlatforms,createLadders,createAnchors,createPlayer,findAnchor,updateCamera,updateIdle,step}=ArcadePhysics;
  const {createEncounter,updateEncounter,transformWolf,toggleForm,transformationFrame}=ArcadeEncounter;
  const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
  const tutorial=window.ArcadeTutorial?.create(window.ArcadeDeveloperMode?.storage());
  const tutorialView=tutorial&&ArcadeTutorial.mount(canvas.parentElement,tutorial,()=>canvas.focus({preventScroll:true}));
  const story=window.ArcadeMissionOneStory?.mount(canvas.parentElement);let briefed=false;
  const presentation=window.ArcadeBossPresentation?.create(canvas.parentElement,canvas);
  const ids=['jumps','message','state','overlay','overlay-title','overlay-text','resume','pause','health','hook-status','health-fill','boss-hud','boss-fill','boss-value','weapon-name','ammo-count','ammo-unit','weapon-slots','pause-options','show-shortcuts','shortcuts'];
  const ui=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
  document.querySelector('.game-toolbar').after(ui['boss-hud']);
  const sound=ArcadeAudio.create(),soundEvents=ArcadeSoundEvents.create(sound);
  const soundToggle=document.createElement('button');soundToggle.id='sound-toggle';soundToggle.type='button';
  ui.pause.before(soundToggle);
  const soundControls=document.createElement('div');soundControls.className='sound-controls';
  soundControls.innerHTML='<label for="sound-volume">Volumen de efectos <output id="sound-level"></output></label><input id="sound-volume" type="range" min="0" max="100" step="5" aria-label="Volumen de efectos de sonido">';
  document.querySelector('.overlay-panel').append(soundControls);
  const soundVolume=soundControls.querySelector('input'),soundLevel=soundControls.querySelector('output');
  function soundUI(){const s=sound.status();soundToggle.textContent=!s.supported?'Sonido no disponible':s.muted||!s.volume?'♫ Silencio':s.unlocked?'♫ Sonido':'♫ Activar sonido';soundToggle.setAttribute('aria-label',!s.unlocked||s.muted||!s.volume?'Activar efectos de sonido':'Silenciar efectos de sonido');soundToggle.setAttribute('aria-pressed',String(s.unlocked&&!s.muted&&s.volume>0));soundToggle.title='Volumen en el menú de pausa';soundToggle.disabled=!s.supported;soundVolume.value=String(Math.round(s.volume*100));soundLevel.value=soundVolume.value+'%';}
  soundToggle.onclick=async()=>{const s=sound.status();await sound.unlock();if(s.unlocked)sound.setMuted(!(s.muted||!s.volume));else sound.setMuted(false);if(!sound.status().muted&&!s.volume)sound.setVolume(.55);soundUI();canvas.focus({preventScroll:true});};
  soundVolume.oninput=()=>{sound.unlock();sound.setVolume(Number(soundVolume.value)/100);if(Number(soundVolume.value)>0)sound.setMuted(false);soundUI();};
  for(const type of ['pointerdown','keydown'])document.addEventListener(type,e=>{if(e.target!==soundToggle)sound.unlock().then(soundUI);},{capture:true});
  soundUI();
  const combatHud=document.createElement('div');combatHud.className='combat-hud';
  const ammoHud=document.querySelector('.ammo-hud');ammoHud.before(combatHud);
  combatHud.append(ammoHud,ui.jumps.closest('.jump-hud'));
  const platforms=createPlatforms(),ladders=createLadders(),anchors=[],keys=new Set(),touch=new Set();
  let ambience=ArcadeAmbience.create(platforms,WORLD.ground);
  let difficulty=window.ArcadeDifficulty?.load(window.ArcadeDeveloperMode?.storage())||'normal';
  let player=createPlayer(),encounter=createEncounter(),camera={x:0,y:WORLD.height-canvas.height};
  window.ArcadeDifficulty?.apply(encounter,difficulty);
  let loaded=false,paused=true,last=0,accumulator=0,jumpQueued=false,hookQueued=false,climbQueued=false,fireQueued=false,kickQueued=false,jetpackQueued=false;
  let checkpoint={x:145,y:WORLD.ground,floor:0},maxFloor=0,toastTimer=7,mode={},firingPose=0;
  let fuelMax=EXTENSION.tileHeight*4;
  const fuelTanks=[6,14].map((floor,id)=>{const deck=platforms.filter(p=>p.kind==='deck'&&p.floor===floor).sort((a,b)=>b.w-a.w)[0];return{id,x:deck.x+deck.w*.5,y:deck.y,taken:false};});
  let cleanBuilding,queuedAim=null,arrival=null,opening=null;
  const fireBuffer=ArcadeArsenal.createFireBuffer();
  let score=ArcadeScore.create(),challenges=ArcadeChallenges.create(platforms);
  const victory=window.ArcadeVictory?.create({drawHelicopter:ArcadeExtraction.drawFlyby,onFinish(){sound.setRunning(false);
    // All three missions close on the same debrief card.
    if(window.ArcadeMissionResults?.show){ui.overlay.hidden=true;ArcadeMissionResults.show({kicker:'MISIÓN 01 COMPLETADA',title:'LA OBRA',epilogue:story?.epilogue||'',
      stats:ArcadeMissionResults.rows(score,{enemies:encounter.enemies,seconds:challenges.elapsed,extra:[['Estrellas',challenges.stars.filter(s=>s.taken).length+' / '+challenges.stars.length],['Sin recibir daño',challenges.damaged?'No':'Sí']]}),
      next:{label:'Continuar · Misión 02',run:()=>document.getElementById('next-mission').click()},retry:{label:'Repetir misión',run:()=>{respawn(true);sound.setRunning(true);}}});return;}
    overlay('¡Misión cumplida!','El helicóptero te ha sacado de la obra.\n\n'+(story?story.epilogue+'\n\n':'')+ArcadeScore.summary(score),'Reiniciar aventura');document.getElementById('next-mission').hidden=false;ui.resume.focus({preventScroll:true});}});
  window.ArcadeRobotForm&&(window.ArcadeRobotForm.refreshDock=()=>{if(!window.ArcadeRobotForm.dock)window.ArcadeRobotForm.dock=window.ArcadeRobotForm.installDock(player,encounter,persist);window.ArcadeRobotForm.dock?.();});
  const nextMission=document.createElement('button');nextMission.id='next-mission';nextMission.className='primary';nextMission.hidden=true;nextMission.textContent='Continuar · Misión 02';nextMission.onclick=()=>{window.ArcadeCampaign?.transfer(saveStore,player,encounter,score,powers);location.assign('level-two.html?entry=campaign');};ui.resume.after(nextMission);
  let saveStore;try{saveStore=window.ArcadeDeveloperMode?.storage(window.localStorage)||window.localStorage;}catch{saveStore={getItem:()=>null,setItem:()=>{throw Error('Sin almacenamiento');}};}
  const freshMission=new URLSearchParams(location.search).get('entry')==='select';
  if(freshMission&&window.ArcadeMissionOneSave)try{saveStore.removeItem(window.ArcadeMissionOneSave.KEY);}catch{}
  const savedMission=freshMission?null:window.ArcadeMissionOneSave?.read(saveStore);
  let checkpoints=ArcadeCheckpoints.create(1,platforms,savedMission?.checkpoints);
  const mainMenu=window.ArcadeMainMenu?.create({soundControls,difficulty,tutorial,resumeAvailable:!!savedMission,onNewGame(){const begin=()=>{briefed=true;respawn(true);sound.setRunning(true);};if(story)story.briefing(begin);else begin();},onDifficulty(id){difficulty=id;ArcadeDifficulty.apply(encounter,id);return ArcadeDifficulty.save(id,window.ArcadeDeveloperMode?.storage());},onPlay(){if(story&&!briefed&&arrival?.active&&!arrival.t){briefed=true;story.briefing(()=>{if(paused)togglePause();});}else togglePause();},onPause(){rememberLoadout();paused=true;clearInput();accumulator=0;canvas.inert=true;ui['weapon-slots'].inert=true;ui.overlay.hidden=true;sound.setRunning(false);},onSound(){sound.setRunning(false);}});
  document.getElementById('open-main-menu')?.addEventListener('click',()=>mainMenu?.show());

  const profile=ArcadeProgression.load(saveStore);if(!savedMission&&window.ArcadeCampaign?.read(saveStore)?.level!==2){ArcadeProgression.beginWorld(profile);ArcadeProgression.save(profile,saveStore);}let powers=ArcadePowers.create(),powerQueued=false;
  ArcadeProgression.apply(profile,player,encounter,true);fuelMax=player.fuelMax;player.formCooldown=Math.min(5,ArcadeCampaign.first(saveStore)?.formCooldown||0);
  if(savedMission){const resumed=window.ArcadeMissionOneSave.restore(savedMission,{player,encounter,score,profile,platforms,challenges,fuelTanks,progression:ArcadeProgression,campaign:ArcadeCampaign});if(resumed){checkpoint=resumed.checkpoint;maxFloor=resumed.maxFloor;}for(const [id,time] of Object.entries(ArcadeCampaign.first(saveStore)?.cooldowns||{})){const power=ArcadeProgression.catalog.find(c=>c.id===id&&c.kind==='power');if(power&&Number.isFinite(time))powers.cooldowns[id]=Math.max(0,Math.min(power.cooldown,time));}}
  window.ArcadeDeveloperMode?.prepare(profile,player,encounter,powers);fuelMax=player.fuelMax;
  let loadoutAge=0;
  function rememberLoadout(){if(loaded&&(mainMenu?.started||!paused)){window.ArcadeCampaign?.remember(saveStore,player,encounter,score,powers);if(!arrival?.active)window.ArcadeMissionOneSave?.write(saveStore,{player,encounter,score,checkpoint,maxFloor,challenges,fuelTanks,checkpoints:ArcadeCheckpoints.snapshot(checkpoints)});}}
  window.addEventListener('pagehide',rememberLoadout);
  function persist(){if(!ArcadeProgression.save(profile,saveStore))document.getElementById('shop-message').textContent='El navegador no permite guardar: las compras durarán solo esta sesión.';}
  const characterWheel=ArcadeCharacterWheel.create(document.getElementById('character-selector'),target=>{if(!loaded||paused||encounter.dead||encounter.extraction||arrival?.active)return;changeForm(target);canvas.focus({preventScroll:true});});
  let wheelKey='';
  const wheel=document.createElement('section');wheel.id='power-wheel';wheel.setAttribute('aria-label','Rueda de poderes comprados');document.getElementById('viewport').append(wheel);
  function powerList(){return [...profile.owned,...(player.shield>0?['shield']:[])];}
  function cyclePower(){if(arrival?.active)return;const list=powerList();profile.equipped=list[(list.indexOf(profile.equipped)+1)%list.length]||null;persist();}
  function useFront(){if(arrival?.active)return;player.idleTime=0;player.idleGesture=false;if(profile.equipped==='shield'){notify('Escudo activo · '+player.shield+' impactos restantes');return;}powerQueued=true;}
  function drawPowerWheel(){window.ArcadeRobotForm?.refreshDock?.();
    const list=powerList();if(!list.includes(profile.equipped))profile.equipped=list[0]||null;
    const key=list.join(',')||'empty';
    if(key!==wheelKey){wheelKey=key;wheel.replaceChildren();const cards=document.createElement('div');cards.className='power-cards';
      for(const [i,id] of list.entries()){const c=ArcadeProgression.catalog.find(c=>c.id===id),button=document.createElement('button'),art=document.createElement('canvas'),name=document.createElement('strong'),status=document.createElement('span'),meter=document.createElement('i');let offset=(i-list.indexOf(profile.equipped)+list.length)%list.length;if(offset>list.length/2)offset-=list.length;
        button.className='power-card'+(offset===0?' front':'');button.dataset.power=id;button.style.setProperty('--offset',offset);button.style.zIndex=String(10-Math.abs(offset));button.hidden=Math.abs(offset)>2;button.setAttribute('aria-label',c.name);button.setAttribute('aria-pressed',offset===0?'true':'false');button.tabIndex=offset===0?0:-1;art.width=72;art.height=46;ArcadePowerSprites.draw(art.getContext('2d'),id,id==='flame'?2:1,36,23,65,44);name.textContent=c.name;status.className='power-wait';meter.className='power-ready';button.append(art,name,status,meter);button.onclick=()=>{if(paused||encounter.dead||encounter.extraction)return;if(profile.equipped===id)useFront();else{profile.equipped=id;persist();}canvas.focus({preventScroll:true});};cards.append(button);
      }
      if(!list.length){cards.className+=' empty';cards.textContent='Compra poderes en ESC';}
      const controls=document.createElement('button');controls.className='power-cycle';controls.textContent='H · Girar   /   G · Usar';controls.onclick=()=>{if(!paused&&!encounter.dead&&!encounter.extraction)cyclePower();canvas.focus({preventScroll:true});};wheel.append(cards,controls);
    }
    for(const card of wheel.querySelectorAll('.power-card')){const id=card.dataset.power;let offset=(list.indexOf(id)-list.indexOf(profile.equipped)+list.length)%list.length;if(offset>list.length/2)offset-=list.length;card.style.setProperty('--offset',offset);card.style.zIndex=String(10-Math.abs(offset));card.hidden=Math.abs(offset)>2;card.classList.toggle('front',offset===0);card.tabIndex=offset===0?0:-1;card.setAttribute('aria-pressed',offset===0?'true':'false');const c=ArcadeProgression.catalog.find(c=>c.id===id),wait=powers.cooldowns[id]||0;card.querySelector('.power-wait').textContent=id==='shield'?player.shield+'/10 · ACTIVO':id==='flame'&&(player.form==='wolf'||player.form==='zombie')?'SOLO SOLDADO':wait?wait.toFixed(1)+' s':'LISTO';card.querySelector('.power-ready').style.width=(id==='shield'?player.shield*10:100*(1-wait/(c.cooldown||1)))+'%';card.classList.toggle('cooling',wait>0);}
  }
  let shopFlash=null;
  function drawShop(){
    document.getElementById('shop-balance').textContent=profile.wallet.toLocaleString('es-CO')+' puntos disponibles';
    document.getElementById('score-value').textContent=profile.wallet.toLocaleString('es-CO');
    const say=text=>{document.getElementById('shop-message').textContent=text;};
    ArcadeShopUI.render(document.getElementById('shop-list'),{profile,inventory:encounter.inventory,catalog:ArcadeProgression.catalog,flash:shopFlash,
      onEquip(id){profile.equipped=id;persist();shopFlash=null;drawShop();},
      onBuy(id){const result=ArcadeProgression.buy(profile,id);say(result.message);if(result.ok){ArcadeProgression.apply(profile,player,encounter);fuelMax=player.fuelMax;persist();sound.play('pickup',{gain:.5});shopFlash=id;}drawShop();},
      onBuyWeapon(slot){const result=ArcadeArmory.buy(profile,encounter.inventory,slot);say(result.message);if(result.ok){persist();rememberLoadout();sound.play('pickup',{gain:.5});shopFlash='w'+slot;}drawShop();}});
    shopFlash=null;
  }
  document.getElementById('show-shop').onclick=()=>{const shop=document.getElementById('shop');shop.hidden=!shop.hidden;if(!shop.hidden)drawShop();};
  const specialistImages={ramHit:new Image(),turret:new Image(),knife:new Image()};
  const zombieCast=new Image(),formTransition=new Image(),zombieIdle=new Image(),zombieSoldier=new Image(),zombieSoldierExtra=new Image(),zombiePlayer=new Image(),zombieExtra=new Image(),soldierCrouch=new Image(),transformationSheet=new Image(),meleeSoldier=new Image(),soldierDismount=new Image(),jeepArrival=new Image(),workerRun=new Image(),whiteDeath=new Image(),cityBackdrop=new Image(),workerSheet=new Image(),ambienceSheet=new Image(),orbitalSheet=new Image(),helicopterDoor=new Image(),zombieWolf=new Image(),powerSheet=new Image(),wolfClimb=new Image(),soldierWalk=new Image(),helicopter=new Image(),soldierClimb=new Image(),enemySoldier=new Image(),soldierV2=new Image(),soldierSlide=new Image(),blackWolf=new Image();
  const zombieRun=new Image(),shockSheet=new Image(),jetMk2=new Image(),checkpointPc=new Image(),impactSheet=new Image(),wolfWalk=new Image(),wolfSprint=new Image(),wolfJump=new Image(),wolfRam=new Image(),wolfCombos=new Image(),wolfActions=new Image(),kicks=new Image(),bows=new Image(),soldier=new Image(),building=new Image(),mobility=new Image(),weapons=new Image(),wolf=new Image();
  function resize(snap=false){const bounds=canvas.getBoundingClientRect(),zoom=Math.max(1,Math.min(1.5,bounds.height/450)),width=Math.min(729,Math.max(430,Math.round(bounds.width/zoom))),height=Math.round(bounds.height/bounds.width*width),oldWidth=canvas.width,oldHeight=canvas.height;
    if(width!==oldWidth||height!==oldHeight){canvas.width=width;canvas.height=height;if(snap!==true){camera.x+=(oldWidth-width)/2;camera.y+=(oldHeight-height)/2;}}
    if(snap===true){camera.x=Math.max(0,Math.min(WORLD.width-width,player.x-width*.4));camera.y=Math.max(WORLD.top,Math.min(WORLD.height-height,player.y-height*.7));}
  }
  new ResizeObserver(resize).observe(canvas);
  function imageLoad(img,src){return new Promise((resolve,reject)=>{img.onload=()=>{window.ArcadeLoading?.step();resolve();};img.onerror=()=>reject(new Error(src));img.src=src;});}
  function notify(text){ui.message.textContent=text;toastTimer=4;ui.message.style.opacity='1';}
  function chooseWeapon(slot){if(player.form==='robot'&&slot<3){notify('Robot · Elige un arma de disparo (3–9)');return;}if(arrival?.active)return;player.idleTime=0;player.idleGesture=false;if(player.form==='wolf'||player.form==='zombie'){notify('Vuelve al soldado para usar armas.');return;}if(ArcadeArsenal.selectWeapon(encounter.inventory,slot))notify(slot+' · '+ArcadeArsenal.weapons[slot].name);else notify('Primero encuentra '+ArcadeArsenal.weapons[slot].name.toLowerCase()+'.');}
  for(let slot=1;slot<=9;slot++){
    const button=document.createElement('button');button.type='button';button.dataset.slot=slot;
    button.innerHTML='<b class="slot-number">'+slot+'</b><canvas class="weapon-icon" width="44" height="34" aria-hidden="true"></canvas><span class="slot-name">'+ArcadeArsenal.weapons[slot].name+'</span><small class="slot-ammo"></small>';
    ArcadeWeaponRenderer.pickup(button.querySelector('canvas').getContext('2d'),slot,22,17);
    button.onclick=()=>{if(!loaded||paused||encounter.dead)return;chooseWeapon(slot);canvas.focus({preventScroll:true});};ui['weapon-slots'].append(button);
  }
  function changeForm(target){if(arrival?.active)return;if(toggleForm(encounter,player,target))notify('Forma de '+ArcadeZombieForm.label(player.form)+' · T en 5 s');else if(player.formCooldown>0)notify('Transformación disponible en '+Math.ceil(player.formCooldown)+' s');else if(!encounter.won)notify('Derrota al Capataz para desbloquear ambas formas.');}
  function clearInput(){player.wolfQueued=null;fireBuffer.clear();powerQueued=false;queuedAim=null;keys.clear();touch.clear();jumpQueued=false;hookQueued=false;climbQueued=false;fireQueued=false;kickQueued=false;jetpackQueued=false;}
  function overlay(title,text,button){document.getElementById('next-mission').hidden=true;document.getElementById('shop').hidden=true;ui['pause-options'].hidden=true;ui['overlay-title'].textContent=title;ui['overlay-text'].textContent=text;ui.resume.textContent=button||'Continuar';ui.resume.hidden=!button;ui.overlay.hidden=false;}
  function togglePause(){
    if(mainMenu?.isOpen()||story?.briefingOpen())return;if(!loaded||encounter.dead)return;paused=!paused;clearInput();
    ui.pause.innerHTML=paused?'Continuar <kbd>ESC</kbd>':'Menú <kbd>ESC</kbd>';
    ui['weapon-slots'].inert=paused;canvas.inert=paused;
    if(paused){rememberLoadout();overlay('Partida en pausa','Tu partida queda detenida mientras consultas el menú.','Continuar');ui['pause-options'].hidden=false;ui.shortcuts.hidden=true;ui['show-shortcuts'].textContent='Ver atajos de teclado';ui['show-shortcuts'].setAttribute('aria-expanded','false');ui.resume.focus({preventScroll:true});}
    else{ui.overlay.hidden=true;canvas.focus({preventScroll:true});}
  }
  function respawn(full=false){window.ArcadeRobotForm&&(window.ArcadeRobotForm.dock=null);document.getElementById('robot-second-weapon')?.remove();const savedFuel=player.fuel,savedFormCooldown=player.formCooldown||0;presentation?.reset();score.floating=[];nextMission.hidden=true;if(full){story?.reset();checkpoints=ArcadeCheckpoints.create(1,platforms);try{saveStore.removeItem(window.ArcadeMissionOneSave?.KEY);}catch{}if(ambience.crane)ambience.crane.x=ambience.origin;ambience=ArcadeAmbience.create(platforms,WORLD.ground);ArcadeProgression.beginWorld(profile);persist();score=ArcadeScore.create();challenges=ArcadeChallenges.create(platforms);fuelTanks.forEach(t=>t.taken=false);checkpoint={x:145,y:WORLD.ground,floor:0};maxFloor=0;}const defeated=encounter.enemies.filter(n=>n.hp<=0).map(n=>n.id);const savedInventory=encounter.inventory,savedPickups=encounter.pickups,savedMedkits=encounter.medkits;const keepWolf=!full&&encounter.won,savedForm=player.form,savedFinalWon=encounter.finalWon;player=createPlayer();if(!full)player.fuel=savedFuel;player.x=checkpoint.x;player.y=checkpoint.y;encounter=createEncounter(full?{}:{pickups:savedPickups});window.ArcadeDifficulty?.apply(encounter,difficulty);if(!full){encounter.inventory=savedInventory;encounter.pickups=savedPickups;encounter.medkits=savedMedkits;for(const n of encounter.enemies)if(defeated.includes(n.id)){n.hp=0;n.death=0;}encounter.invincible=3;}if(keepWolf){encounter.boss.hp=0;transformWolf(encounter,player);player.form=savedForm;player.h=savedForm==='wolf'?64:savedForm==='zombie'?68:savedForm==='robot'?54:46;player.transform=0;if(savedFinalWon){encounter.finalWon=true;encounter.finalBoss.hp=0;encounter.finalBoss.stage=2;}}if(!full&&!keepWolf&&profile.zombieUnlocked){player.form=savedForm;player.h=savedForm==='wolf'?64:savedForm==='zombie'?68:savedForm==='robot'?54:46;}ArcadeProgression.apply(profile,player,encounter,true);fuelMax=player.fuelMax;if(!full){player.fuel=Math.min(fuelMax,savedFuel);player.formCooldown=savedFormCooldown;}powers=ArcadePowers.create();arrival=full?ArcadeArrival.create(player):null;opening=arrival?{age:0}:null;paused=false;canvas.inert=false;ui['weapon-slots'].inert=false;accumulator=0;clearInput();resize(true);ui.overlay.hidden=true;ui.pause.innerHTML='Menú <kbd>ESC</kbd>';window.ArcadeDeveloperMode?.prepare(profile,player,encounter,powers);fuelMax=player.fuelMax;notify(full?'La misión ha comenzado. Da caza al Capataz.':'De vuelta al checkpoint. Salud y combate reiniciados.');canvas.focus({preventScroll:true});}
  const movementKeys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS','ShiftLeft','ShiftRight','KeyE','KeyJ','KeyX','Numpad0','KeyL','KeyT','KeyI','KeyK','KeyQ','KeyC','KeyO','KeyM','KeyF','KeyG','KeyB','KeyH'];
  window.addEventListener('keydown',e=>{
    const code=ArcadeArsenal.controlCode(e);
    if(mainMenu?.isOpen()||victory?.isActive()||story?.briefingOpen())return;
    if(paused&&code==='Tab'){const focusable=Array.from(ui.overlay.querySelectorAll('button,input')).filter(b=>!b.disabled&&!b.hidden&&!b.closest('[hidden]'));const index=focusable.indexOf(document.activeElement);e.preventDefault();focusable[(index+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();return;}
    const button=e.target.tagName==='BUTTON';if(movementKeys.includes(code)&&!paused)e.preventDefault();
    // Held controls must be refreshed even on repeat or after a HUD button had focus.
    if(!paused&&!encounter.dead&&!encounter.extraction&&movementKeys.includes(code))keys.add(code);
    if(e.repeat)return;
    if(code==='KeyP'||code==='Escape'){e.preventDefault();togglePause();return;}if(code==='KeyR'&&loaded&&!encounter.extraction){respawn();return;}
    if(opening&&!paused&&(code==='Space'||code==='Enter')){opening.age=99;return;}
    if(paused||encounter.dead||encounter.extraction||arrival?.active)return;if(code==='BracketRight'||code==='BracketLeft'){const inv=encounter.inventory,list=inv.owned.slice().sort((a,b)=>a-b);chooseWeapon(list[(list.indexOf(inv.selected)+(code==='BracketRight'?1:-1)+list.length)%list.length]);return;}if(code==='KeyT'){changeForm();return;}if(/^(Digit|Numpad)[1-9]$/.test(code)){chooseWeapon(Number(code.slice(-1)));return;}if(code==='KeyH'||code==='KeyB'){cyclePower();return;}keys.add(code);if(code==='KeyG')useFront();if(code==='KeyF')jetpackQueued=true;if(code==='Space')jumpQueued=true;if(code==='KeyE')hookQueued=true;if((code==='KeyW'||code==='ArrowUp')&&player.rope)climbQueued=true;if(ArcadeArsenal.fireKeys.includes(code)){fireQueued=true;fireBuffer.press(encounter.inventory.selected);queuedAim=ArcadeArsenal.aimDirection(window.ArcadeControls?.decorate(input())||input(),player.facing);}if(code==='KeyL'){if(player.form==='robot'){ArcadeRobotForm.cycle(encounter.inventory);persist();}else kickQueued=true;}
  });
  window.addEventListener('keyup',e=>{keys.delete(ArcadeArsenal.controlCode(e));keys.delete(e.code);});
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||!loaded||paused||encounter.dead||encounter.extraction||arrival?.active)return;
    e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
    touch.add('fire');fireQueued=true;fireBuffer.press(encounter.inventory.selected);queuedAim=ArcadeArsenal.aimDirection(window.ArcadeControls?.decorate(input())||input(),player.facing);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>touch.delete('fire'));

  window.addEventListener('blur',()=>{clearInput();if(loaded&&!paused&&!encounter.dead)togglePause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(loaded&&!paused&&!encounter.dead)togglePause();}});
  document.querySelectorAll('[data-control]').forEach(button=>{const control=button.dataset.control;
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(!loaded||paused||encounter.dead||arrival?.active)return;button.setPointerCapture(e.pointerId);touch.add(control);if(control==='power')useFront();if(control==='jetpack')jetpackQueued=true;if(control==='transform')changeForm();if(control==='jump')jumpQueued=true;if(control==='hook')hookQueued=true;if(control==='up'&&player.rope)climbQueued=true;if(control==='kick'){if(player.form==='robot'){ArcadeRobotForm.cycle(encounter.inventory);persist();}else kickQueued=true;}});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>touch.delete(control));
  });
  ui['show-shortcuts'].onclick=()=>{ui.shortcuts.hidden=!ui.shortcuts.hidden;ui['show-shortcuts'].setAttribute('aria-expanded',String(!ui.shortcuts.hidden));ui['show-shortcuts'].textContent=ui.shortcuts.hidden?'Ver atajos de teclado':'Ocultar atajos de teclado';};
  ui.pause.onclick=togglePause;ui.resume.onclick=()=>encounter.extraction?.done?respawn(true):encounter.dead?respawn():togglePause();document.querySelector('#restart').onclick=()=>loaded&&respawn(true);
  function input(){return{jetpackPressed:jetpackQueued,...ArcadeArsenal.triggerInput(keys,touch.has('fire'),fireQueued),left:keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'),right:keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'),up:(climbQueued&&!!player.rope)||keys.has('KeyW')||keys.has('ArrowUp')||touch.has('up'),down:keys.has('KeyS')||keys.has('ArrowDown')||touch.has('down'),run:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.has('run'),jumpPressed:jumpQueued,jumpHeld:jumpQueued||keys.has('Space')||touch.has('jump'),hookPressed:hookQueued,hookHeld:keys.has('KeyE')||touch.has('hook'),kick:player.form!=='robot'&&(kickQueued||keys.has("KeyL")||touch.has("kick")),aimUp:keys.has("KeyI")||keys.has("KeyW")||keys.has("ArrowUp")||touch.has("up"),aimDown:keys.has("KeyK")||keys.has("KeyS")||keys.has("ArrowDown")||touch.has("down")};}
  // Radio and toast timers also run during the rescue, where update() returns early.
  function tickNarration(dt){story?.update({arrived:!!arrival&&!arrival.active,workersAlerted:!!ambience.workersAlerted,enemyAlert:encounter.enemies.some(n=>n.hp>0&&n.alert),hp:encounter.hp,floor:maxFloor,bossActive:encounter.boss.active&&encounter.boss.hp>0,won:encounter.won,transforming:player.transform>0,finalActive:encounter.finalBoss.active&&encounter.finalBoss.hp>0,finalStage:encounter.finalBoss.stage,extraction:!!encounter.extraction},dt);
    toastTimer=Math.max(0,toastTimer-dt);ui.message.style.opacity=toastTimer>0?'1':'0';}
  function update(dt){window.ArcadeDeveloperMode?.tick(player,encounter);loadoutAge+=dt;if(loadoutAge>=2){loadoutAge=0;rememberLoadout();}
    // Establishing shot: the rooftop and what waits there, then down the whole
    // tower to the street where the jeep is about to pull in. Space skips it.
    if(opening){
      if(!opening.age)presentation?.title('MISIÓN 01','LA OBRA','Veinte pisos · Un contrato');
      opening.age+=dt;ArcadeAmbience.update(ambience,dt,[]);clearInput();encounter.boss.t+=dt;
      const u=Math.max(0,Math.min(1,(opening.age-1)/2.5)),glide=u*u*(3-2*u),top=Math.max(WORLD.top,encounter.boss.y-canvas.height*.62),bottom=Math.max(WORLD.top,Math.min(WORLD.height-canvas.height,WORLD.ground-canvas.height*.7));
      camera.x=Math.max(0,Math.min(WORLD.width-canvas.width,player.x-canvas.width*.4));camera.y=top+(bottom-top)*glide;
      if(opening.age>=3.7){opening=null;camera.y=bottom;}
      return;
    }
    if(arrival?.visible){
      const wasActive=arrival.active;ArcadeArrival.update(arrival,player,dt);
      if(wasActive){ArcadeAmbience.update(ambience,dt,[]);clearInput();
        camera.x=Math.max(0,Math.min(WORLD.width-canvas.width,arrival.targetX-canvas.width*.4));
        camera.y=Math.max(WORLD.top,Math.min(WORLD.height-canvas.height,arrival.ground-canvas.height*.7));
        if(!arrival.active){player.x=arrival.targetX;player.y=arrival.ground;player.grounded=true;player.vy=0;player.vx=0;player.fallPeak=player.y;notify('¡Adelante! La misión ha comenzado.');}
        return;
      }
    }
    ArcadeAmbience.update(ambience,dt,[player,encounter.boss,...encounter.enemies],ArcadeAmbience.gunshotNoises(encounter,player));
    if(encounter.extraction){tickNarration(dt);ArcadeEncounter.updateDebris(encounter,dt,platforms);encounter.finalBoss.age+=dt;encounter.finalBoss.hit=Math.max(0,encounter.finalBoss.hit-dt);encounter.finalBoss.death=Math.max(0,encounter.finalBoss.death-dt);encounter.explosions=encounter.explosions.filter(b=>(b.life-=dt)>0);const s=encounter.extraction;ArcadeExtraction.update(s,player,dt);const rewards=ArcadeChallenges.update(challenges,player,encounter,dt);let earned=0;for(const reward of rewards)earned+=ArcadeScore.bonus(score,reward);if(earned){ArcadeProgression.credit(profile,earned);persist();}ArcadeExtraction.updateCamera(camera,s,player,{width:canvas.width,height:canvas.height},dt);if(s.done&&!s.shown){s.shown=true;if(victory){paused=true;clearInput();ui.overlay.hidden=true;victory.start();}else overlay('¡Misión cumplida!','El helicóptero te ha sacado de la obra.\n\n'+(story?story.epilogue+'\n\n':'')+ArcadeScore.summary(score),'Reiniciar aventura');}return;}
    const controls=window.ArcadeControls?.decorate(input())||input();if(controls.left!==controls.right)player.facing=controls.left?-1:1;player.aim=ArcadeArsenal.firingAim(controls,player.facing,queuedAim);if(player.aim.x&&!player.rope)player.facing=Math.sign(player.aim.x);
    if(controls.hookPressed&&!player.rope){if(player.form==='wolf'||player.form==='zombie')notify('El gancho solo está disponible para el soldado');else if(!findAnchor(player,anchors,platforms))notify('No hay techo al alcance hacia donde miras.');}
    mode=step(player,ArcadeArsenal.movementInput(player,controls),dt,platforms,{ladders:ArcadePhysics.availableLadders(ladders,encounter),anchors});jumpQueued=false;hookQueued=false;climbQueued=false;if(jetpackQueued)notify(player.form==='wolf'||player.form==='zombie'?'El jetpack solo está disponible para el soldado':player.fuel<=0?'Sin gasolina · Busca un depósito':player.jetpack?'Jetpack activo':'Jetpack apagado');jetpackQueued=false;if(player.aim.x&&player.form!=='wolf'&&!player.rope)player.facing=Math.sign(player.aim.x);player.crouching=!!mode.crouching;player.aimHeight=mode.crouching||mode.sliding?20:28;ArcadeSoldierAnimation.advanceWalk(player,dt);
    if(player.grounded&&player.ground?.kind==='deck')maxFloor=Math.max(maxFloor,player.ground.floor||0);
    if(player.y>WORLD.height+50){respawn();return;}
    for(const tank of fuelTanks)if(!tank.taken&&player.form!=='wolf'&&player.fuel<fuelMax&&Math.abs(player.x-tank.x)<25&&Math.abs(player.y-tank.y)<28){tank.taken=true;player.fuel=fuelMax;notify('Gasolina repuesta · Depósito lleno');}
    const collected=ArcadeArsenal.collect(encounter.inventory,encounter.pickups,player);if(collected.length)notify(collected.join(', ')+' recogida');
    player.healGlow=Math.max(0,(player.healGlow||0)-dt);const healed=ArcadeMedkits.collect(encounter,player);if(healed)notify(healed.full?'Botiquín fluorescente · Vida al 100%':'Botiquín rojo · +1 de vida');
    const wasFinalActive=encounter.finalBoss.active,wasFinalStage=encounter.finalBoss.stage,wasFinalWon=encounter.finalWon,wasActive=encounter.boss.active,wasDefeated=encounter.won;
    updateCamera(camera,player,{width:canvas.width,height:canvas.height},dt);
    const powerMessage=ArcadePowers.update(powers,encounter,player,profile,powerQueued||controls.power||keys.has('KeyG')||touch.has('power'),dt,platforms,{left:camera.x,right:camera.x+canvas.width,top:camera.y,bottom:camera.y+canvas.height});powerQueued=false;if(powerMessage)notify(powerMessage);if(encounter.boss.hp<=0&&!encounter.won)transformWolf(encounter,player);
    const previousAction=encounter.weaponAction;updateEncounter(encounter,player,controls,dt,platforms);const rewards=ArcadeChallenges.update(challenges,player,encounter,dt);let earned=ArcadeScore.sync(score,encounter,fuelTanks);for(const reward of rewards)earned+=ArcadeScore.bonus(score,reward);if(rewards.length)notify(rewards.map(r=>r.label+' +'+r.points+' pts').join(' · '));if(earned){ArcadeProgression.credit(profile,earned);persist();}if(profile.shield!==player.shield){profile.shield=player.shield;persist();}updateIdle(player,controls,dt);fireQueued=fireBuffer.tick(dt,player,encounter,previousAction);if(!fireQueued)queuedAim=null;kickQueued=false;
    if(!wasActive&&encounter.boss.active){notify('EL CAPATAZ · Combate iniciado');presentation?.intro('EL CAPATAZ','Lobo Blanco · Señor de la obra');}
    if(wasFinalStage!==2&&encounter.finalBoss.stage===2)presentation?.phase('LOBO ZOMBI','Fase 2 · La manada no muere');
    if(!wasFinalActive&&encounter.finalBoss.active&&encounter.finalBoss.stage!==2){notify('LOBO NEGRO · Jefe de la manada');presentation?.intro('LOBO NEGRO','Jefe de la manada');}
    if(ArcadeExtraction.ready(encounter,powers)){encounter.extraction=ArcadeExtraction.create(player,platforms,true);encounter.bullets=[];encounter.finalBoss.missiles=[];clearInput();notify('¡Jefe derrotado! Helicóptero de extracción en camino.');presentation?.defeat('LA MANADA HA CAÍDO','Helicóptero de extracción en camino');}
    firingPose=controls.fire?.15:Math.max(0,firingPose-dt);

    if(!wasDefeated&&encounter.won){notify('¡Forma de lobo desbloqueada! Acceso a la azotea abierto.');presentation?.defeat('EL CAPATAZ HA CAÍDO','Su mordida te ha cambiado');}
    else if(encounter.dead){clearInput();rememberLoadout();overlay('Te han alcanzado.','Vuelve a la última PC activada. Conservas tus armas y tu progreso.',checkpoints.active?'Volver al CHECK POINT':'Reintentar');}
    const activated=ArcadeCheckpoints.update(checkpoints,player,dt,{blocked:encounter.dead||!!encounter.extraction});if(activated){checkpoint={x:activated.x,y:activated.y,floor:activated.floor};notify('CHECK POINT · Progreso guardado');sound.play('pickup',{gain:.45});rememberLoadout();}
    tutorial?.update({p:player,e:encounter,input:controls,ladders:ArcadePhysics.availableLadders(ladders,encounter),hookAvailable:!!findAnchor(player,anchors,platforms),floor:maxFloor,mission:1,blocked:encounter.dead||!!encounter.extraction},dt);
    tickNarration(dt);
  }
  function skyline(){
    const gradient=ctx.createLinearGradient(0,0,0,canvas.height);gradient.addColorStop(0,'#24364f');gradient.addColorStop(1,'#536079');ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
    const city=ArcadeAmbience.cityPlacement(camera,WORLD.ground,canvas.height);
    ctx.drawImage(cityBackdrop,city.x,city.y,city.w,city.h);
    // Feather the sky image boundary into the same background gradient.
    ctx.save();ctx.fillStyle=gradient;
    for(let y=0;y<90;y++){ctx.globalAlpha=1-y/90;ctx.fillRect(0,city.y+y,canvas.width,1.1);}
    ctx.restore();
  }

  function drawBuilding(){
    ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));
    // Only the exterior and open shafts reveal the independently scrolling skyline.
    ctx.beginPath();ctx.rect(75,20,581,WORLD.height-20);ctx.rect(0,WORLD.ground,WORLD.width,WORLD.height-WORLD.ground);
    // Preserve all interior artwork so suspended platforms retain their exact art.
    ctx.clip();
    const {cut,tileHeight,count,height}=EXTENSION;
    ctx.drawImage(cleanBuilding,0,0,729,cut,0,0,729,cut);
    for(let i=0;i<count;i++)ArcadeBuildingRenderer.bay(ctx,building,cut+i*tileHeight,tileHeight,i);
    ctx.drawImage(cleanBuilding,0,cut,729,building.height-cut,0,cut+height,729,building.height-cut);ctx.restore();
  }
  function drawPlatforms(){for(const pl of platforms){if((pl.supportBottom||pl.y)<camera.y-40||pl.y>camera.y+canvas.height+20)continue;if(pl.crane)continue;if(pl.custom)ArcadeBuildingRenderer.platform(ctx,building,pl);else{ctx.fillStyle=pl.kind==='ledge'?'#ffd79499':'#edc78b45';ctx.fillRect(pl.x,pl.y,pl.w,1);}}}
  function drawTraversal(){
    for(const l of ArcadePhysics.availableLadders(ladders,encounter)){if(l.bottom<camera.y||l.top>camera.y+canvas.height)continue;ArcadeBuildingRenderer.ladder(ctx,building,l);}
    if(player.rope&&(!player.rope.surface||player.rope.length>4)){ctx.strokeStyle='#142331';ctx.lineWidth=4;ctx.beginPath();const pose=ArcadeSoldierAnimation.pose(player),cell=CLIMB_FRAMES[1][pose.frame],handX=player.form==='wolf'?player.x:player.x-player.facing*cell[2]*CLIMB_SCALE*.12,handY=player.form==='wolf'?player.y-30:player.y-cell[3]*CLIMB_SCALE+3;ctx.moveTo(handX,handY);ctx.lineTo(player.rope.x,player.rope.y);ctx.stroke();ctx.strokeStyle='#a6eef7';ctx.lineWidth=1.5;ctx.stroke();}
  }
  function sprite(image,frames,row,frame,x,y,scale,facing,hit=0){const [sx,sy,sw,sh,outline,anchor]=frames[row][frame];ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing,1);if(outline){ctx.beginPath();outline.forEach(([px,py],i)=>ctx[i?'lineTo':'moveTo']((px-sx-(anchor??sw/2))*scale,(py-sy-sh)*scale));ctx.closePath();ctx.clip();}ArcadeImpact.hitSprite(ctx,hit,image,sx,sy,sw,sh,-(anchor??sw/2)*scale,-sh*scale,sw*scale,sh*scale);ctx.restore();return sh*scale;}
  function drawFuelTanks(){for(const item of fuelTanks)if(!item.taken)ArcadePickupRenderer.fuel(ctx,item);}
  function drawPickups(){for(const item of encounter.pickups){if(item.taken||item.y<camera.y-40||item.y>camera.y+canvas.height+35)continue;ArcadePickupRenderer.weapon(ctx,item,player.anim,player);}}
  function drawPlayer(){if(player.cloak>0&&Math.floor(player.cloak*9)%4!==0)return;
    if(ArcadeZombieForm.drawPlayer(ctx,player))return;if(window.ArcadeRobotForm?.draw(ctx,player,encounter)){ArcadeWeaponRenderer.draw(ctx,player,encounter);return;}
    if(encounter.invincible>0&&!player.transform&&!(player.hurt>0)&&Math.floor(player.anim*16)%2===0)return;
    const falling=!player.grounded&&player.vy>0&&!player.ladder&&!player.rope;
    let row=0,frame=Math.floor(player.anim*4)%8,img=soldier,frames=SOLDIER_FRAMES,scale=.39,lift=0;
    if(player.rescueGrip){if(player.form==='wolf'){img=wolf;frames=ACTION_FRAMES.wolf;row=4;frame=3;scale=.48;}else{img=soldierClimb;frames=CLIMB_FRAMES;row=1;frame=0;scale=CLIMB_SCALE;}}
    else if(player.transform>0){const pose=ArcadeSoldierAnimation.transformation(transformationFrame(player));img=pose.sheet==='soldier'?soldierV2:pose.sheet==='wolf'?wolf:transformationSheet;frames=pose.sheet==='soldier'?SOLDIER_V2_FRAMES:pose.sheet==='wolf'?ACTION_FRAMES.wolf:ArcadeSoldierAnimation.transformationFrames;row=pose.row;frame=pose.frame;scale=pose.scale;}
    else if(player.form==='wolf'){
      const idlePose=ArcadeSoldierAnimation.wolfIdlePose(player,mode),comboPose=ArcadeSoldierAnimation.wolfComboPose(player),ramPose=ArcadeSoldierAnimation.wolfRamPose(player),airPose=ArcadeSoldierAnimation.wolfAirPose(player),sprintPose=ArcadeSoldierAnimation.wolfSprintPose(player),walkPose=ArcadeSoldierAnimation.wolfWalkPose(player,mode);
      img=wolf;frames=ACTION_FRAMES.wolf;scale=.48;row=0;frame=7;
      if(player.ladder||player.rope?.mantle){img=wolfClimb;frames=WOLF_CLIMB_FRAMES;row=0;frame=((Math.floor(player.y/6.5)%4)+4)%4;scale=WOLF_CLIMB_SCALE;}
      else if(ramPose){img=wolfRam;frames=ArcadeSoldierAnimation.wolfRamFrames;scale=ArcadeSoldierAnimation.wolfRamScale;row=ramPose.row;frame=ramPose.frame;}
      else if(comboPose){img=comboPose.sheet==='actions'?wolfActions.texture:wolfCombos;frames=comboPose.sheet==='actions'?ArcadeSoldierAnimation.wolfActionFrames:ArcadeSoldierAnimation.wolfComboFrames;scale=comboPose.scale;row=comboPose.row;frame=comboPose.frame;}
      else if(player.claw>0){row=1;frame=Math.min(7,Math.floor((.3-player.claw)/.3*8));}
      else if(player.rope){row=4;frame=player.rope.surface?3:Math.floor(player.anim*9)%8;}
      else if(airPose){row=airPose.row;frame=airPose.frame;if(airPose.sheet==='jump'){img=wolfJump.texture;frames=ArcadeSoldierAnimation.wolfJumpFrames;scale=.24;}}
      else if(sprintPose){img=wolfSprint;frames=WOLF_SPRINT_FRAMES;row=sprintPose.row;frame=sprintPose.frame;scale=WOLF_SPRINT_SCALE;}
      else if(mode.crouching){row=2;frame=1;}
      else if(walkPose){img=wolfWalk.texture;frames=WOLF_WALK_FRAMES;row=walkPose.row;frame=walkPose.frame;scale=WOLF_WALK_SCALE;}
      else if(idlePose){img=wolfActions.texture;frames=ArcadeSoldierAnimation.wolfActionFrames;row=idlePose.row;frame=idlePose.frame;scale=idlePose.scale;lift=idlePose.lift;}
    }
    else if(player.ladder||player.rope){const pose=ArcadeSoldierAnimation.pose(player);img=soldierClimb;frames=CLIMB_FRAMES;row=pose.row;frame=player.ladder?pose.frame%2:pose.frame;scale=CLIMB_SCALE;}
    else{const pose=ArcadeSoldierAnimation.pose(player,mode,encounter);img=pose.sheet==='crouch'?soldierCrouch.texture:pose.sheet==='melee'?meleeSoldier.texture:pose.sheet==='slide'?soldierSlide:soldierV2;frames=pose.sheet==='crouch'?CROUCH_FRAMES:pose.sheet==='melee'?MELEE_FRAMES:pose.sheet==='slide'?SLIDE_FRAMES:SOLDIER_V2_FRAMES;row=pose.row;frame=pose.frame;scale=pose.sheet==='crouch'?CROUCH_SCALE:pose.sheet==='melee'?MELEE_SCALE:pose.sheet==='slide'?SLIDE_SCALE:SOLDIER_V2_SCALE;}
    ctx.save();
    if(player.jetpack&&player.form!=='wolf'&&!encounter.extraction){
      // Tilt the body, pack and held weapon together around the chest.
      ArcadeJetpackRenderer.pose(ctx,player);
      drawJetpack();
    }
    if(player.hurt>0){ctx.translate(Math.round(Math.sin(player.hurt*75)*3),0);ctx.globalAlpha=.8;}
    if(player.form==='wolf'&&!player.rescueGrip)ArcadeSoldierAnimation.applyWolfMotion(ctx,player,mode);
    const gait=encounter.extraction&&!['walk','return'].includes(encounter.extraction.phase)?null:ArcadeSoldierAnimation.gait(player,encounter.extraction?{}:mode,encounter.extraction?null:encounter);
    const facing=player.ladder&&player.form==='wolf'?1:player.ladder&&player.form!=='wolf'?(ArcadeSoldierAnimation.pose(player).frame<2?1:-1):player.kick>0?player.kickFacing:player.facing;
    const height=ArcadeSoldierAnimation.drawGait(ctx,player,gait,
      stepFrame=>gait?.flight?sprite(soldierV2,SOLDIER_V2_FRAMES,4,0,player.x,player.y,SOLDIER_V2_SCALE,player.facing):sprite(soldierWalk,WALK_FRAMES,0,stepFrame,player.x,player.y,WALK_SCALE,player.facing),
      bob=>sprite(img,frames,row,frame,player.x,player.y+bob-lift,scale,facing),img===meleeSoldier.texture?{row,frame}:null);
    if(player.jetpack&&player.form!=='wolf'&&!encounter.extraction)drawJetpack('front');
    const armed=!powers.flame&&!encounter.extraction&&player.form!=='wolf'&&!player.ladder&&!player.rope&&!player.transform&&ArcadeSoldierAnimation.pose(player,mode,encounter).armed;
    if(armed){ctx.save();if(gait)ctx.translate(0,gait.bob);ArcadeWeaponRenderer.draw(ctx,player,encounter);ctx.restore();}
    if(mode.sliding&&player.grounded){ctx.fillStyle='#b9a08080';for(let i=0;i<4;i++){const phase=(player.anim*9+i*.23)%1;ctx.fillRect(player.x-player.facing*(15+phase*25),player.y-2-phase*5,4-phase*2,2);}}
    if(player.landing>0){const spread=(.24-player.landing)*80;ctx.fillStyle='#d9c5a088';for(const side of [-1,1])ctx.fillRect(player.x+side*(12+spread)-3,player.y-3,6,3);}
    if(player.transform>0){ctx.strokeStyle='#bad9df';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(player.x,player.y-30,27+Math.sin(player.anim*22)*3,42,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
    return height;
  }
  function drawPlayerWithMarker(){
    ctx.save();
    ArcadePhysics.jumpTurn.apply(ctx,player);
    const height=drawPlayer();
    ctx.restore();
    if(height===undefined)return;
    ctx.fillStyle='#ffd176';ctx.beginPath();ctx.moveTo(player.x-4,player.y-height-10);ctx.lineTo(player.x+4,player.y-height-10);ctx.lineTo(player.x,player.y-height-5);ctx.fill();
  }
  function drawJetpack(layer='back'){ArcadeJetpackRenderer.draw(ctx,player,platforms,layer,fuelMax);}
  function drawEncounter(){
    for(const n of encounter.enemies){
      if(n.y<camera.y-80||n.y>camera.y+canvas.height+80||n.hp<=0&&n.death<=0)continue;
      if(ArcadeEnemySpecialists.drawRam(ctx,n,specialistImages.ramHit))continue;
      if(!ArcadeEnemySpecialists.draw(ctx,n,specialistImages))ArcadeMissionKit.drawEnemy(ctx,n,enemySoldier);
      ArcadeMissionKit.enemyBar(ctx,n);
    }
    const b=encounter.boss;
    if(b.hp<=0&&b.death>0){
      const frame=Math.min(5,Math.floor(b.deathAge/.22)),f=WHITE_DEATH_FRAMES[frame];
      ctx.save();ctx.globalAlpha=Math.min(1,b.death/.65);
      sprite(whiteDeath.texture,[WHITE_DEATH_FRAMES],0,frame,b.x,b.y,WHITE_DEATH_SCALE,b.facing||-1,b.hit);ctx.restore();
    }
    if(b.hp>0){const g=ArcadeFinalBoss.whiteGun(b,player);
      if(b.phase==='climb'){sprite(wolfClimb,WOLF_CLIMB_FRAMES,0,((Math.floor(b.y/6.5)%4)+4)%4,b.x,b.y,WOLF_CLIMB_SCALE*1.3,1,b.hit);}
      else if(b.phase==='jump'||b.phase==='fall'||b.descending){const falling=b.descending||b.phase==='fall'||(b.traverse&&b.traverse.age>b.traverse.duration*.7);sprite(wolf,ACTION_FRAMES.wolf,falling?3:2,falling?1:4,b.x,b.y,.57,b.facing,b.hit);}
      else if(b.phase==='kick'){sprite(kicks,KICK_FRAMES,0,Math.min(7,Math.floor(b.kickAge/.9*8)),b.x,b.y,.34,b.facing,b.hit);if(b.kickAge<.35){ctx.fillStyle='#ffd17b';ctx.font='10px monospace';ctx.fillText('¡PATADA!',b.x-24,b.y-90);}}
      else{
        // Steps follow the distance actually covered, on the same walk sheet as the player's wolf.
        const moved=Math.abs(b.x-(b.drawX??b.x));b.drawX=b.x;b.stride=moved>.05?(b.stride||0)+moved:b.stride||0;b.stepHold=moved>.05?.12:Math.max(0,(b.stepHold||0)-1/60);
        if(b.stepHold>0)sprite(wolfWalk.texture,WOLF_WALK_FRAMES,0,Math.floor(b.stride/9)%8,b.x,b.y,WOLF_WALK_SCALE*.57/.48,g.facing,b.hit);else sprite(wolf,ACTION_FRAMES.wolf,0,7,b.x,b.y,.57,g.facing,b.hit);
        ArcadeBossRenderer.whiteGun(ctx,b,player);}}

    const final=encounter.finalBoss;
    ArcadeBossRenderer.missiles(ctx,final);ArcadeBossRenderer.zombieEffects(ctx,final);
    if(encounter.won&&(final.hp>0||final.death>0)){
      const pose=ArcadeFinalBoss.pose(final);ctx.save();if(final.hp<=0)ctx.globalAlpha=Math.min(1,final.death*2);
      const hop=final.phase==='attack'&&final.kind==='kick'?Math.sin(final.age/.28*Math.PI)*16:0;
      if(final.stage===2){let row=1,frame=final.phase==='chase'?Math.floor(final.t*7)%4:0,scale=.55,groundInset=0;
        if(final.phase==='mutate'){row=0;frame=Math.min(3,Math.floor(final.age/2.4*4));scale=.4+.15*Math.min(1,final.age/2.4);ctx.translate(Math.sin(final.age*55)*3,0);}
        else if(final.hp<=0){const dying=ArcadeFinalBoss.deathPose(final);row=dying.row;frame=dying.frame;groundInset=dying.groundInset;}
        else if(['zWindup','zClaw','zRecover'].includes(final.phase)){row=2;frame=final.phase==='zWindup'?0:final.phase==='zRecover'?3:final.age<.25?1:2;}
        else if(final.phase==='crouch'){row=3;frame=0;}
        else if(ArcadeFinalBoss.airborne(final)){row=3;frame=1;}
        else if(final.phase==='impact'){row=3;frame=2;}
        sprite(zombieWolf,ZOMBIE_WOLF_FRAMES,row,frame,final.x,final.y+groundInset*scale,scale,final.facing,final.hit);
      }else{if(final.hp>0)ArcadeBossRenderer.blackCannon(ctx,final);sprite(blackWolf,BLACK_WOLF_FRAMES,pose.row,pose.frame,final.x,final.y-hop,BLACK_WOLF_SCALE,final.facing,final.hit);}ctx.restore();
      if(final.phase==='windup'||final.phase==='charge'){ctx.fillStyle='#ffd17b';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(final.phase==='charge'?'¡MISILES!':final.kind==='kick'?'¡PATADA!':'¡ZARPAZO!',final.x,final.y-100);ctx.textAlign='start';}
    }
    for(const shot of encounter.bullets){if(window.ArcadeBossAttackSprites?.projectile(ctx,shot,player.anim)||ArcadeImpact.projectile(ctx,shot))continue;ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(Math.atan2(shot.vy,shot.vx));ctx.fillStyle=shot.enemy?'#f37c5d':shot.slot===9?'#acc46b':shot.slot===6?'#ffc15b':'#fff1ad';const arrow=shot.slot===7||shot.slot===8;ctx.fillRect(-(arrow?7:4),shot.slot===9?-4:-2,arrow?14:shot.slot===6?12:shot.slot===4?3:8,shot.slot===9?8:arrow?1:3);if(shot.slot===9){ctx.fillStyle=Math.floor(shot.life*(shot.life<.7?18:6))%2?'#ff6845':'#ffe49a';ctx.fillRect(-1,-6,3,3);}ctx.restore();}
    for(const blast of encounter.explosions)ArcadeImpact.draw(ctx,blast);
    if(b.hp>0){ctx.fillStyle='#15212eee';ctx.fillRect(b.x-40,b.y-103,80,7);ctx.fillStyle='#ed7657';ctx.fillRect(b.x-39,b.y-102,78*b.hp/b.maxHp,5);}
  }
  const frameBudget=window.ArcadeFrameBudget?.create();
  function render(updateHud=true){
    tutorialView?.render(paused||encounter.dead||!!encounter.extraction||!!arrival?.active,player.x-camera.x<canvas.width/2);
    story?.render(paused||encounter.dead||!!arrival?.active);
    ui['hook-status'].hidden=tutorial?.state.enabled===false;
    ctx.imageSmoothingEnabled=false;ctx.save();if(powers.shake>0)ctx.translate(Math.sin(powers.age*83)*powers.shake,Math.cos(powers.age*67)*powers.shake*.7);skyline();window.ArcadeMissionOneFx?.sky(ctx,camera,canvas.width,canvas.height,ambience.t,WORLD,ArcadeAmbience.cityPlacement(camera,WORLD.ground,canvas.height));ArcadeAmbience.background(ctx,ambience,camera,canvas.width,canvas.height);drawBuilding();window.ArcadeWorldLighting?.sky(ctx,camera,canvas.width,canvas.height,ambience.t);ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));drawPlatforms();window.ArcadeWorldLighting?.fixtures(ctx,1,{platforms},camera,canvas.width,canvas.height,ambience.t);ArcadeAmbience.crane(ctx,ambience,building);ArcadeAmbience.workers(ctx,ambience);ArcadeEncounter.drawEnvironment(ctx,encounter,player,platforms);ArcadeChallenges.draw(ctx,challenges);drawPickups();drawFuelTanks();ArcadeCheckpoints.draw(ctx,checkpoints,false,player.anim,{left:camera.x,right:camera.x+canvas.width,top:camera.y,bottom:camera.y+canvas.height});ArcadeMedkits.draw(ctx,encounter.medkits,player,camera,canvas.height);drawTraversal();drawEncounter();if(encounter.extraction)ArcadeExtraction.draw(ctx,encounter.extraction);if(arrival?.visible)ArcadeArrival.draw(ctx,arrival,player);if(!encounter.extraction?.boarded&&!arrival?.active)drawPlayerWithMarker();ArcadeZombieForm.drawEffects(ctx,encounter);if(!encounter.extraction){ArcadePowers.draw(ctx,powers,player,encounter,{top:camera.y,bottom:camera.y+canvas.height});window.ArcadePowerFx?.draw(ctx,powers,player,encounter);}if(player.jetpack){const ratio=Math.max(0,Math.min(1,player.fuel/fuelMax)),x=player.x+20,y=player.y-48;ctx.fillStyle='#10232e';ctx.fillRect(x-2,y-12,40,21);ctx.fillStyle='#e5f5ee';ctx.font='7px monospace';ctx.fillText('GAS '+Math.ceil(ratio*100)+'%',x,y-3);ctx.fillStyle='#364953';ctx.fillRect(x,y,35,5);ctx.fillStyle=ratio<.2?'#ff7257':'#f1c553';ctx.fillRect(x,y,35*ratio,5);}
    if(player.healGlow>0){ctx.save();ctx.globalAlpha=player.healGlow/.7;ctx.fillStyle='#c4ff84';const hy=player.y-58-(.7-player.healGlow)*24;ctx.fillRect(player.x-2,hy-5,4,12);ctx.fillRect(player.x-6,hy-1,12,4);ctx.restore();}
    if(player.hurt>0){const t=1-player.hurt/.32;ctx.save();ctx.globalAlpha=1-t;for(let i=0;i<10;i++){const a=i*Math.PI/5,d=8+t*30;ctx.fillStyle=i%2?'#ff805c':'#ffe5ab';ctx.fillRect(Math.round(player.hitX+Math.cos(a)*d),Math.round(player.hitY+Math.sin(a)*d),i%2?4:2,3);}ctx.restore();}ArcadeScore.draw(ctx,score);ctx.restore();
    window.ArcadeMissionOneFx?.draw(ctx,camera,canvas.width,canvas.height,{player,encounter,platforms,powers,time:ambience.t,arrival,checkpoint:checkpoints.active?checkpoint:null},WORLD);
    ArcadeAmbience.rain(ctx,ambience,camera,canvas.width,canvas.height);ctx.restore();
    if(player.hurt>0){ctx.strokeStyle='rgba(244,93,62,'+(player.hurt/.32*.65)+')';ctx.lineWidth=6;ctx.strokeRect(3,3,canvas.width-6,canvas.height-6);}
    presentation?.draw(ctx,canvas.width,canvas.height);
    if(!updateHud)return;window.ArcadeMobile?.update(player,encounter,profile,powers,paused||encounter.dead||player.transform>0||!!encounter.extraction||!!arrival?.active);
    document.getElementById('score-value').textContent=profile.wallet.toLocaleString('es-CO');
    characterWheel.update(player.form,encounter.won,paused||encounter.dead||!!encounter.extraction||!!arrival?.active||player.transform>0||!!player.burrow,player.zombieUnlocked,player.formCooldown,player.robotUnlocked,player.tankUnlocked,player.fighterUnlocked,player.heroUnlocked);
    const inv=encounter.inventory,w=ArcadeArsenal.weapons[inv.selected],isWolf=player.form==='wolf',isZombie=player.form==='zombie',unarmed=player.form==='hero'||isWolf||isZombie||player.form==='tank'||player.form==='fighter';
    ui['weapon-name'].textContent=isZombie?'ZOMBI · J Rayos / L Plasma':isWolf?(player.ram?'LOBO · Embestida':player.wolfAttack?'LOBO · '+(player.wolfAttack.stage===3?'REMATE':player.wolfAttack.kind==='kick'?'Patada':'Zarpazo')+' '+player.wolfAttack.stage+'/3':'LOBO · Zarpazos'):inv.selected+' · '+w.name;if(player.form==='robot')ui['weapon-name'].textContent='ROBOT · '+w.name+' + '+ArcadeArsenal.weapons[window.ArcadeRobotForm.secondary(inv)].name;ui['ammo-count'].textContent=unarmed||w.ammo===null?'∞':inv.ammo[inv.selected]||0;ui['ammo-unit'].textContent=isZombie?'RAYOS SIN MUNICIÓN':isWolf||w.ammo===null?'CUERPO A CUERPO':inv.selected===6?'MISILES':inv.selected===7?'FLECHAS':inv.selected===8?'VIROTES':inv.selected===9?'GRANADAS':'BALAS';
    if(player.form==='hero'){ui['weapon-name'].textContent='CENTELLA · RAYOS OCULARES';ui['ammo-unit'].textContent='F · VUELO LIBRE';}
    if(player.form==='tank'){ui['weapon-name'].textContent='MINI TANQUE · SÚPER CAÑÓN';ui['ammo-unit'].textContent='RECARGA AUTOMÁTICA';}if(player.form==='fighter'){ui['weapon-name'].textContent='LUCHADOR · COMBO J / PATADA L';ui['ammo-unit'].textContent='CUERPO A CUERPO';}
    for(const button of ui['weapon-slots'].children){const slot=Number(button.dataset.slot),owned=inv.owned.includes(slot);button.disabled=paused||encounter.dead||!!arrival?.active||player.transform>0||unarmed||!owned;button.classList.toggle('locked',!owned);button.classList.toggle('selected',!unarmed&&slot===inv.selected);button.setAttribute('aria-pressed',String(!unarmed&&slot===inv.selected));const ammo=owned?(ArcadeArsenal.weapons[slot].ammo===null?'∞':String(inv.ammo[slot]||0)):'—';button.querySelector('.slot-ammo').textContent=ammo;button.setAttribute('aria-label',slot+' · '+ArcadeArsenal.weapons[slot].name+(owned?' · '+ammo+' disponibles':' · Sin recoger')+(unarmed?' · Vuelve a soldado con T':''));button.title=owned?(ArcadeArsenal.weapons[slot].ammo===null?'No necesita munición':(inv.ammo[slot]||0)+' restantes'):'Sin recoger';}
    ui.jumps.textContent=Array.from({length:player.maxJumps||2},(_,i)=>i<player.jumps?'○':'●').join(' ');ui.health.textContent=encounter.hp+' / '+encounter.maxHp;ui['health-fill'].style.width=(100*encounter.hp/encounter.maxHp)+'%';
    ui['health-fill'].parentElement.setAttribute('aria-valuenow',encounter.hp);ui['health-fill'].parentElement.setAttribute('aria-valuemax',encounter.maxHp);
    canvas.parentElement.classList.toggle('final-arena',encounter.won&&player.y<=ArcadeFinalBoss.ARENA.y+25);
    const hudBoss=encounter.won?encounter.finalBoss:encounter.boss;document.querySelector('.game-card').classList.toggle('boss-battle',!!hudBoss.active&&hudBoss.hp>0);ui['boss-hud'].hidden=!hudBoss.active||hudBoss.hp<=0;ui['boss-fill'].style.width=(100*hudBoss.hp/hudBoss.maxHp)+'%';document.getElementById('boss-title').textContent=encounter.won?(hudBoss.stage===2?'LOBO ZOMBI · FASE 2':'LOBO NEGRO · FASE 1'):'EL CAPATAZ · LOBO BLANCO';ui['boss-value'].textContent=Math.ceil(hudBoss.hp)+' / '+hudBoss.maxHp;ui['boss-fill'].parentElement.setAttribute('aria-valuenow',hudBoss.hp);ui['boss-fill'].parentElement.setAttribute('aria-valuemax',hudBoss.maxHp);
    document.getElementById('challenge-status').textContent=ArcadeChallenges.status(challenges);document.getElementById('fuel-value').textContent=(player.form||'soldier')!=='soldier'?'JETPACK · SOLO SOLDADO':(player.jetpackMk2?'MK II ×2 · ':'GASOLINA · ')+Math.round(player.fuel/fuelMax*100)+'%';document.getElementById('fuel-meter').value=player.fuel/fuelMax*100;
    drawPowerWheel();
    const equipped=ArcadeProgression.catalog.find(c=>c.id===profile.equipped),wait=powers.cooldowns[profile.equipped]||0;document.getElementById('power-status').textContent=(equipped?'G · '+equipped.name+(wait?' · '+Math.ceil(wait)+' s':' · LISTO'):'G · Sin poder equipado')+' | ESC: tienda · Escudo '+(player.shield||0)+'/10';
    ui['hook-status'].textContent=(player.form||'soldier')!=='soldier'?'GANCHO · SOLO SOLDADO':player.jetpack?'SHIFT · TURBO / F · APAGAR':player.rope?'A/D: RECORRER · W: TREPAR · E/ESPACIO: SOLTAR':player.ladder?'ESCALANDO':findAnchor(player,anchors,platforms)?'E · AGARRARSE AL TECHO':'BUSCA UN TECHO';

    ui.state.textContent=player.transform>0?'Transformándose en '+ArcadeZombieForm.label(player.form).toLowerCase():player.burrow?'Bajo tierra · ↑ / Espacio para salir':player.form==='zombie'?'Zombi · Resistencia ×2':player.jetpack?(player.jetBoost?'Jetpack · Turbo':mode.hovering?'Jetpack · Suspendido':'Jetpack · Volando'):player.transform>0?(player.form==='wolf'?'Transformándose en lobo':'Transformándose en soldado'):encounter.dead?'Sin salud':paused?'En pausa':player.ladder?'Escalando':player.rope?'Agarrado al techo':!player.grounded?(player.vy<0?'En el aire':'Descendiendo'):mode.sliding?'Deslizándose':mode.crouching?'Agachado':Math.abs(player.vx)>170?'Corriendo':Math.abs(player.vx)>15?'Caminando':'En reposo';
    if(arrival?.active)ui.state.textContent=arrival.phase==='reverse'?'Llegando en jeep':arrival.phase==='jump'?'Desembarco':'Preparando la misión';

  }
  function loop(t){window.ArcadeDeveloperMode?.poll();window.ArcadeControls?.poll(t);const budget=frameBudget?.plan(t,{paused:paused||encounter.dead,hidden:document.hidden,width:canvas.width,height:canvas.height})||{render:true,hud:true};const elapsed=Math.min((t-last)/1000||0,.1);last=t;if(victory?.isActive()){sound.setRunning(!document.hidden);if(!document.hidden){victory.update(elapsed);sound.loop('helicopter',.22,0,.9);}accumulator=0;requestAnimationFrame(loop);return;}sound.setRunning(loaded&&!paused&&!encounter.dead&&!document.hidden&&!encounter.extraction?.done);if(loaded){if(!paused)ArcadeScore.tick(score,elapsed);if(!paused&&!encounter.dead){accumulator+=elapsed*(presentation?presentation.tick(elapsed):1);while(accumulator>=1/120){update(1/120);soundEvents.update({player,encounter,powers,ambience,arrival,fuelTanks,weather:{wind:.25+.75*(window.ArcadeMissionOneFx?.altitude(camera,canvas.height,WORLD)||0),rain:.55,distant:true}},1/120);accumulator-=1/120;if(paused||encounter.dead||victory?.isActive()){accumulator=0;break;}}}else accumulator=0;if(budget.render)render(budget.hud);}requestAnimationFrame(loop);}
  let loadPromise;
  function loadLevel(){if(loaded)return Promise.resolve(true);if(loadPromise)return loadPromise;
  window.ArcadeLoading?.begin(50,loadLevel);
  loadPromise=Promise.all([window.ArcadeAdvancedForms?.load(),window.ArcadeRobotForm?.load(),imageLoad(zombieCast,'assets/sprites/zombi-disparo-direcciones-v1.png'),imageLoad(jetMk2,'assets/sprites/jetpack-mk2-v1.png'),imageLoad(zombieRun,'assets/sprites/zombi-carrera-v2.png'),imageLoad(shockSheet,'assets/sprites/electrocucion-v1.png'),imageLoad(checkpointPc,'assets/sprites/checkpoint-pc-v1.png'),imageLoad(wolfJump,'assets/sprites/lobo-salto-carrera-v1.png'),imageLoad(formTransition,'assets/sprites/transformaciones-jugador-v3.png'),imageLoad(zombieIdle,'assets/sprites/zombi-soldado-reposo-v1.png'),imageLoad(zombieSoldier,'assets/sprites/zombi-soldado-v1.png'),imageLoad(zombieSoldierExtra,'assets/sprites/zombi-soldado-extra-v1.png'),imageLoad(zombiePlayer,'assets/sprites/zombi-electrico-v1.png'),imageLoad(zombieExtra,'assets/sprites/zombi-electrico-extra-v1.png'),imageLoad(wolfActions,'assets/sprites/lobo-reposo-patadas-v2.png'),imageLoad(wolfCombos,'assets/sprites/lobo-combos-v1.png'),imageLoad(wolfRam,'assets/sprites/lobo-cabezazo-v1.png'),imageLoad(specialistImages.ramHit,'assets/sprites/enemigos-embestida-v1.png'),imageLoad(wolfWalk,'assets/sprites/lobo-caminata-v2.png'),imageLoad(soldierCrouch,'assets/sprites/soldado-agachado-pasos-v1.png'),imageLoad(specialistImages.turret,'assets/sprites/enemigo-torreta-v1.png'),imageLoad(specialistImages.knife,'assets/sprites/enemigo-cuchillo-v1.png'),imageLoad(impactSheet,'assets/sprites/explosion-impacto-v1.png'),imageLoad(wolfSprint,'assets/sprites/lobo-carrera-cuatro-patas-v1.png'),imageLoad(transformationSheet,'assets/sprites/soldado-transformacion-v2.png'),imageLoad(meleeSoldier,'assets/sprites/soldado-cuchillo-hacha-v1.png'),imageLoad(soldierDismount,'assets/sprites/soldado-desembarco-v1.png'),imageLoad(jeepArrival,'assets/sprites/jeep-llegada-v1.png'),imageLoad(workerRun,'assets/sprites/trabajadores-carrera-v4.png'),imageLoad(whiteDeath,'assets/sprites/lobo-blanco-muerte-v1.png'),imageLoad(cityBackdrop,'assets/worlds/ciudad-fondo-v2.png'),imageLoad(workerSheet,'assets/sprites/trabajadores-descanso-huida-v3.png'),imageLoad(ambienceSheet,'assets/sprites/ambiente-animado-v1.png'),imageLoad(orbitalSheet,'assets/sprites/orbital-superrayo-v1.png'),imageLoad(helicopterDoor,'assets/sprites/helicoptero-puerta-cerrada-v1.png'),imageLoad(zombieWolf,'assets/sprites/lobo-zombie-jefe-v1.png'),imageLoad(powerSheet,'assets/sprites/poderes-v1.png'),imageLoad(wolfClimb,'assets/sprites/lobo-escalada-v1.png'),imageLoad(soldierWalk,'assets/sprites/soldado-pasos-v3.png'),imageLoad(helicopter,'assets/sprites/helicoptero-rescate-v3.png'),imageLoad(soldierClimb,'assets/sprites/soldado-escalada-v2.png'),imageLoad(blackWolf,'assets/sprites/lobo-negro-jefe-v1.png'),imageLoad(soldierSlide,'assets/sprites/soldado-deslizamiento-v1.png'),imageLoad(soldierV2,'assets/sprites/soldado-v2.png'),imageLoad(enemySoldier,'assets/sprites/soldado-enemigo-v1.png'),imageLoad(kicks,'assets/sprites/lobo-patadas-v1.png'),imageLoad(bows,'assets/sprites/soldado-escudo-arco-ballesta-v1.png'),imageLoad(soldier,'assets/sprites/soldado-v1.png'),imageLoad(building,'assets/worlds/mundo-01-edificio-v1.png'),imageLoad(mobility,'assets/sprites/soldado-movilidad-v1.png'),imageLoad(weapons,'assets/sprites/soldado-armas-v1.png'),imageLoad(wolf,'assets/sprites/soldado-lobo-v1.png')]).then(()=>{ArcadeJetpackRenderer.setSheet(prepareWhiteDeath(jetMk2));ArcadeZombieForm.setRunSheet(prepareWhiteDeath(zombieRun));ArcadeZombieForm.setShockSheet(prepareWhiteDeath(shockSheet));ArcadeZombieForm.setCastSheet(prepareWhiteDeath(zombieCast));ArcadeCheckpoints.setSheet(prepareWhiteDeath(checkpointPc));window.ArcadeFormTransition?.setSheet(prepareWhiteDeath(formTransition));specialistImages.turret=prepareWhiteDeath(specialistImages.turret);specialistImages.knife=prepareWhiteDeath(specialistImages.knife);ArcadeImpact.setSheet(impactSheet);ArcadeArrival.setSprites(jeepArrival,JEEP_ARRIVAL_FRAMES,soldierV2,SOLDIER_V2_FRAMES,SOLDIER_V2_SCALE);ArcadeArrival.setDismountSprites(soldierDismount,SOLDIER_DISMOUNT_FRAMES,SOLDIER_DISMOUNT_SCALE);if(!savedMission&&player.y===WORLD.ground){arrival=ArcadeArrival.create(player);opening={age:0};}wolfJump.texture=prepareWhiteDeath(wolfJump);wolfWalk.texture=prepareWhiteDeath(wolfWalk);wolfActions.texture=prepareWhiteDeath(wolfActions);soldierCrouch.texture=prepareWhiteDeath(soldierCrouch);meleeSoldier.texture=prepareWhiteDeath(meleeSoldier);whiteDeath.texture=prepareWhiteDeath(whiteDeath);ArcadeAmbience.setSpriteSheet(ambienceSheet);ArcadeAmbience.setWorkerSheet(workerSheet,WORKER_FRAMES);ArcadeAmbience.setWorkerRunSheet(workerRun,WORKER_RUN_FRAMES,WORKER_RUN_SCALE);ArcadePowerSprites.setSpriteSheet(powerSheet);ArcadePowerSprites.setOrbitalSheet(orbitalSheet);ArcadeExtraction.setSpriteSheet(helicopter,HELICOPTER_FRAMES);ArcadeExtraction.setDoorSprite(helicopterDoor);ArcadeExtraction.setPassengerSprites(soldierV2,SOLDIER_V2_FRAMES[0][0],wolf,ACTION_FRAMES.wolf[0][7]);ArcadeZombieForm.setSheet(prepareWhiteDeath(zombiePlayer));ArcadeZombieForm.setExtra(prepareWhiteDeath(zombieExtra));ArcadeZombieForm.setPlayerSheets(prepareWhiteDeath(zombieSoldier),prepareWhiteDeath(zombieSoldierExtra));ArcadeZombieForm.setIdleSheet(prepareWhiteDeath(zombieIdle));ArcadeExtraction.setPassengerSprite('zombie',ArcadeZombieForm.icon(),68);characterWheel.setSprites(soldierV2,SOLDIER_V2_FRAMES[0][0],wolf,ACTION_FRAMES.wolf[0][7]);window.ArcadeFormTransition?.setEndpoint('wolf',wolfActions.texture,ArcadeSoldierAnimation.wolfActionFrames[0][0],ArcadeSoldierAnimation.wolfActionFrames[0][0][3]*ArcadeSoldierAnimation.wolfActionScale);cleanBuilding=ArcadeBuildingRenderer.cleanArtwork(building);loaded=true;window.ArcadeLoading?.finish();ui.overlay.hidden=true;resize(true);if(mainMenu)mainMenu.ready({autoPlay:new URLSearchParams(location.search).get('entry')==='select'});else{paused=false;canvas.focus({preventScroll:true});}}).catch(error=>{window.ArcadeLoading?.fail();if(mainMenu)mainMenu.fail();else overlay('No pudimos cargar la misión.','Recarga la página para volver a intentarlo.');console.error(error);loadPromise=null;return false;});return loadPromise;}
  if(mainMenu?.defer)mainMenu.defer(loadLevel);
  if(new URLSearchParams(location.search).has('entry')||!mainMenu?.defer)loadLevel();
  if(new URLSearchParams(location.search).has('debug'))window.__game=ArcadeMissionKit.debug({ctx,images:{soldierV2,soldierWalk,soldierCrouch,soldierSlide,soldierClimb,meleeSoldier,wolf,wolfWalk,wolfSprint,wolfJump,wolfActions,wolfCombos,wolfRam,wolfClimb,enemySoldier,kicks,blackWolf,zombieWolf,whiteDeath,workerSheet,workerRun,helicopter,jeepArrival,soldierDismount,specialistImages},get player(){return player;},get encounter(){return encounter;},get mode(){return mode;},get arrival(){return arrival;},get paused(){return paused;},get powers(){return powers;},profile,camera,platforms,ladders,keys,canvas},{step(dt){presentation?.tick(dt);update(dt);},dead:()=>encounter.dead,redraw(){render(true);}});
  requestAnimationFrame(loop);
})();








