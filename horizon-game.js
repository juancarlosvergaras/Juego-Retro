(() => {
  'use strict';
  const $=id=>document.getElementById(id), level=Number(document.body.dataset.world),river=level===9;
  if(!ArcadeCampaign.guardEntry('m'+level))return;
  const world=ArcadeHorizon,graphics=ArcadeHorizonRenderer,canvas=$('horizon'),images={};
  const page=river?'level-nine.html':'level-ten.html',key=river?'cap-dollar.mission-nine.v1':'cap-dollar.mission-ten.v1';
  const store=ArcadeDeveloperMode.storage(localStorage),entry=new URLSearchParams(location.search).get('entry');
  const fresh=entry==='campaign'||entry==='select';
  let saved={};try{if(!fresh)saved=JSON.parse(store.getItem(key))||{};}catch{}
  const profile=ArcadeProgression.load(store),carry=ArcadeCampaign.loadout(store,fresh?'campaign':entry,saved);
  const baseScore=saved.baseScore??Number(carry.score||0);
  if(fresh)ArcadeProgression.beginWorld(profile);
  const audio=ArcadeAudio.create(),tutorial=ArcadeTutorial.create(store),cinema=ArcadeStoryCinema.create(document);
  let state=world.restore(level,saved.horizon,ArcadeDifficulty.get(ArcadeDifficulty.load(store)).health);
  let started=false,briefed=!!saved.briefed,endingSeen=!!saved.endingSeen,leaving=false,mode='menu',renderer,loading,menu,radioUntil=0;
  let last=0,accumulator=0,hudAt=0,savedAt=0;
  const keys=new Set(),touches=new Map(),actions=new Set();
  const deckUI=river?ArcadeRigInterface.create({images,profile,carry,canvas,audio,save,difficulty:()=>ArcadeDifficulty.load(store),active:()=>mode==='play',usePower:()=>actions.add('power')}):null;
  let preparingDeck=false;
  function prepareDeck(){
    if(preparingDeck)return;preparingDeck=true;
    ArcadeLoading.begin(1,prepareDeck);
    deckUI.load().then(()=>{ArcadeLoading.step();ArcadeLoading.finish();preparingDeck=false;last=performance.now();accumulator=0;})
      .catch(error=>{console.error(error);ArcadeLoading.fail();});
    const retry=document.querySelector('#level-loading button');
    if(retry)retry.onclick=()=>{preparingDeck=false;prepareDeck();};
  }
  function press(code){
    if(!state.rig||!deckUI.ready||!state.rig.gear)return;
    if(code==='KeyT')deckUI.switchForm();else if(code==='KeyH')deckUI.cycle();
    else if(code==='KeyG')actions.add('power');else if(code==='KeyF')actions.add('jet');
    else if(/^Digit[1-9]$/.test(code))deckUI.select(Number(code.slice(-1)));
  }
  function clear(){keys.clear();touches.clear();actions.clear();ArcadeTouchScreen.reset();accumulator=0;}
  function save(){
    if(!started||leaving)return;
    const gear=state.rig?.gear;
    if(gear){profile.shield=state.rig.p.shield;state.hp=100*gear.e.hp/gear.e.maxHp;}
    const shared={...carry,...(gear?ArcadeCampaign.snapshot(state.rig.p,gear.e,{total:baseScore+state.score},gear.powers):{}),score:baseScore+state.score,level,arrival:false};
    delete shared.horizon;delete shared.briefed;delete shared.baseScore;delete shared.endingSeen;
    try{store.setItem(key,JSON.stringify({...shared,baseScore,briefed,endingSeen,horizon:world.snapshot(state)}));
      ArcadeProgression.save(profile,store);ArcadeCampaign.write(store,shared);}catch{}
  }
  function radio(message,seconds=4){$('pilot-radio').textContent=message;$('pilot-radio').hidden=false;radioUntil=state.t+seconds;}
  function hud(){
    const boss=state.enemies.find(n=>n.kind==='carrier');
    const rig=state.rig,foreman=rig?.boss;
    if(river){
      const visible=!!rig&&deckUI.ready&&!!rig.gear&&mode==='play';
      $('rig-panel').hidden=!visible;document.body.classList.toggle('on-rig',visible);
      for(const button of document.querySelectorAll('[data-rig]'))button.hidden=!visible;
      if(visible)deckUI.update(rig.arrival>0||state.phase!=='play');
      const sectors=['DELTA · AGUAS ABIERTAS','ASTILLERO · CANAL ESTRECHO','TORRE · APROXIMACIÓN'];
      $('sector').textContent=foreman?.active?'EL CONTRAMAESTRE · '+Math.ceil(foreman.hp*100/foreman.max)+' %':rig?'TORRE · '+['MUELLE','TALLER','BOMBAS','GRÚAS','CONTROL'][rig.deck]:sectors[state.checkpoint]||'DELTA';
      $('route').value=rig?60+rig.deck*7+12*(1-foreman.hp/foreman.max):60*state.route/world.riverLength;
      $('instrument').textContent=rig?(foreman.move?ArcadeOilRig.steps[foreman.move].label.toUpperCase():rig.grenade>0?'GRANADA '+rig.grenade.toFixed(1)+' s':'GRANADA LISTA'):
        (state.missile>0?'TORPEDO '+state.missile.toFixed(1)+' s':'TORPEDO LISTO')+' · TURBO '+Math.round(state.boost*100)+' %';
      for(const [code,label] of [['Space',rig?'Saltar':'Turbo'],['KeyK',rig?'Granada':'Torpedo']]){
        const button=document.querySelector('[data-drive="'+code+'"]');if(button.textContent!==label)button.textContent=label;
      }
      document.querySelector('[data-drive="ArrowUp"]').setAttribute('aria-label',rig?'Subir o apuntar arriba':'Acelerar');
      document.querySelector('[data-drive="ArrowDown"]').setAttribute('aria-label',rig?'Bajar o agacharse':'Frenar');
    }else{
      $('sector').textContent=boss?'CÉNIT · '+(boss.defeat!=null?'SIN CONTROL':boss.lockPulse>0?'FIJACIÓN · ESQUIVA':boss.attack?ArcadeCenit.patterns[boss.attack].label.toUpperCase():'NÚCLEO EXPUESTO')+' '+Math.ceil(100*boss.hp/boss.maxHp)+' %':state.blend>=1?'CALDERA · VUELO LIBRE':state.blend>0?'CRESTA · CAMBIO DE VISTA':'ARCHIPIÉLAGO · FORMACIÓN';
      $('route').value=boss?75+25*(1-boss.hp/boss.maxHp):Math.min(75,50*state.route/world.turnAt);
      $('instrument').textContent=state.lockTime>=1?'BLANCO FIJADO':state.blend===1?'ALT '+Math.round(state.player.y*10)+' m':'CAÑÓN DOBLE';
    }
    $('integrity').textContent=(rig?'SALUD ':river?'CASCO ':'BLINDAJE ')+Math.ceil(state.hp)+' %'+(rig?.p.shield>0?' · ESCUDO '+rig.p.shield:'')+(state.god?' · INVULNERABLE':'');
    $('score-value').textContent=profile.wallet.toLocaleString('es-CO');ArcadeProgression.showLives(document,profile);
    if(state.t>=radioUntil)$('pilot-radio').hidden=true;
  }
  function navigate(url){save();leaving=true;location.assign(url);}
  function result(){
    mode='result';audio.setRunning(false);clear();const won=state.phase==='won';
    $('level-two-menu').hidden=false;
    $('level-two-title').textContent=won?(river?'Plataforma asegurada':'Último contrato cumplido'):(river?'Misión interrumpida':'Interceptor caído');
    $('level-two-message').textContent=won?(river?'El convoy está a salvo. Vega te espera en el hangar.':'El Cénit ha caído. El canal de evacuación vuelve a estar en manos de la ciudad.'):(state.reason||'El vehículo ha quedado inutilizado.')+' Punto de control '+(state.checkpoint+1)+' de '+(river?6:3)+'.';
    $('play-two').textContent=won?(river?'Despegar · Misión 10':'Volver al mapa'):'Volver al punto de control';
    if(won){
      const report=river?[...state.awards].filter(id=>id.startsWith('patrol-')).length+' patrulleras hundidas · '+[...state.awards].filter(id=>id.startsWith('rig-guard-')).length+' guardias vencidos':state.kills+' aeronaves derribadas';
      $('level-two-message').textContent+=' '+report+' · '+state.score.toLocaleString('es-CO')+' puntos.';
    }else ArcadeProgression.showGameOver(document,profile);
    $('play-two').focus({preventScroll:true});hud();
  }
  function run(){
    mode='play';clear();last=performance.now();$('level-two-menu').hidden=true;canvas.focus({preventScroll:true});audio.setRunning(true);
    if(river&&!state.rig&&!deckUI.ready)deckUI.load().catch(()=>{});
    if(state.t<1&&tutorial.state.enabled)radio(river?'J dispara · K torpedo · Espacio turbo':'← → maniobra · Cañón J · Misil K al fijar',5);
    hud();save();
  }
  function endStory(){endingSeen=true;save();result();}
  function showStory(part,done){
    clear();mode='story';audio.setRunning(true);
    ArcadeHorizonStory.play(cinema,level,part,images,audio,done);
  }
  function play(){
    if(!renderer||cinema.isOpen())return;
    started=true;audio.unlock();
    if(state.phase==='won'&&!endingSeen){showStory('ending',endStory);return;}
    if(state.phase!=='play'){result();return;}
    if(briefed){run();return;}
    showStory('intro',()=>{briefed=true;run();});
  }
  function pause(){if(mode==='play'){if(river)$('shop').hidden=true;mode='paused';clear();save();audio.setRunning(false);}}
  const events={cenitCharge:['orbital',.31],cenitVolley:['rocket',.40],cenitDown:['titanBlast',.82],hullBreak:['steelTear',.7],ram:['coverHit',.8],patrolGun:['rifle',.42],deckGun:['rifle',.42],torpedo:['rocket',.48],throw:['grenade',.42],board:['splash',.62],stern:['distant',.24],foremanTell:['coverHit',.40],foremanStrike:['steelTear',.50],slam:['explosion',.72],foremanDown:['coverHit',.36],foremanImpact:['debris',.62],gun:['rifle',.22],missile:['rocket',.60],hurt:['coverHit',.64],jump:['jump',.42],splash:['splash',.66],gate:['pickup',.34],blast:['explosion',.65],boss:['orbital',.62]};
  function update(input,dt){
    const options=ArcadeDeveloperMode.isolated?ArcadeDeveloperMode.settings:null;
    state.god=!!options?.god;
    if(options?.resources){state.boost=1;state.usingBoost=false;}
    if(state.rig){
      deckUI.bind(state);ArcadeDeveloperMode.tick(state.rig.p,state.rig.gear.e);
      input={...input,power:actions.delete('power')||input.power,jet:actions.delete('jet')};
    }
    const notes=world.update(state,input,dt);
    let changed=false;
    for(const note of notes){
      if(!river&&note.type==='boss')for(const id of ['cenit-picado','cenit-mar'])window.ArcadeStoryIllustrations?.load(id);
      if(note.type==='foremanDown')window.ArcadeStoryIllustrations?.load('nine-outro');
      if(note.type==='weaponSound')audio.play(note.sound,{gain:.4});
      if(events[note.type]){const [effect,gain]=events[note.type];audio.play(effect,{gain});}
      if(note.type==='radio'&&(river||tutorial.state.enabled||note.text.includes('Cénit')))radio(note.text,4.5);
      if(note.type==='board'){clear();audio.loop('jeep',0);radio('↑ Escalera · Espacio salto · J fusil · K granada',5);}
      if(note.type==='rearWing')radio('Vega · Cazas a tus seis.',2);
      if(note.type==='stern')radio('Vega · Contacto por popa.',2);
      if(note.type==='points'){ArcadeProgression.credit(profile,note.points);changed=true;}
      if(note.type==='checkpoint')changed=true;
      if(note.type==='lost'){ArcadeProgression.loseLife(profile,state);save();result();return;}
      if(note.type==='won'){
        ArcadeCampaign.markCompleted(store,level);save();renderer.draw(state);hud();
        audio.loop(river?'jeep':'jetpack',0);
        showStory('ending',endStory);return;
      }
    }
    if(changed)save();
  }
  function input(){
    const has=(...codes)=>codes.some(code=>keys.has(code)||[...touches.values()].includes(code));
    return {x:Number(has('ArrowRight','KeyD'))-Number(has('ArrowLeft','KeyA')),y:Number(has('ArrowDown','KeyS'))-Number(has('ArrowUp','KeyW')),
      power:!!state.rig&&has('KeyG'),jump:has('Space'),run:has('ShiftLeft','ShiftRight'),boost:has('Space','ShiftLeft','ShiftRight'),fire:has('KeyJ','KeyX','Numpad0'),kick:!!state.rig&&has('KeyL'),special:state.rig?has('KeyK'):has('KeyK','KeyL')};
  }
  addEventListener('keydown',event=>{
    if(mode!=='play'||menu.isOpen()||cinema.isOpen())return;
    if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();menu.show();return;}
    if(/^(Arrow|Space|Key[WASDJKLX]|Shift|Numpad0)/.test(event.code)||state.rig&&/^(Key[TFGH]|Digit[1-9])$/.test(event.code)){event.preventDefault();if(!event.repeat)press(event.code);keys.add(event.code);}
  });
  addEventListener('keyup',event=>keys.delete(event.code));
  ArcadeTouchScreen.bindPads(document.querySelectorAll('[data-drive]'),{allow:()=>mode==='play',down:(id,el)=>{touches.set(id,el.dataset.drive);press(el.dataset.drive);},up:id=>touches.delete(id)});
  document.addEventListener('pointerdown',()=>audio.unlock(),{capture:true,once:true});
  document.addEventListener('keydown',()=>audio.unlock(),{capture:true,once:true});
  $('play-two').onclick=()=>{
    if(state.phase==='won'){
      if(!river){navigate('index.html?menu=levels');return;}
      save();leaving=true;ArcadeCampaign.write(store,{...ArcadeCampaign.read(store),level:10,arrival:true});location.assign('level-ten.html?entry=campaign');return;
    }
    if(ArcadeProgression.restartLives(profile,store,key)){leaving=true;location.assign(page+'?entry=select');return;}
    state=world.retry(state);radio('Punto de control · Protección de salida',3);audio.unlock();run();
  };
  $('pause-two').onclick=()=>{if(mode==='play')menu.show();};
  $('restart').onclick=()=>navigate(page+'?entry=select');
  const volume=$('sound-volume'),mute=$('sound-toggle');
  volume.value=Math.round(audio.status().volume*100);volume.oninput=()=>audio.setVolume(volume.value/100);
  function soundLabel(){mute.textContent=audio.status().muted?'♫ ×':'♫';mute.setAttribute('aria-label',audio.status().muted?'Activar sonido':'Silenciar sonido');}
  mute.onclick=()=>{audio.unlock();audio.setMuted(!audio.status().muted);soundLabel();};soundLabel();
  menu=ArcadeMainMenu.create({mission:level,hasShop:()=>!!state.rig?.gear,soundControls:document.querySelector('.sound-controls'),tutorial,
    difficulty:ArcadeDifficulty.load(store),resumeAvailable:!!saved.horizon,onPlay:play,onPause:pause,onSound:()=>audio.setRunning(false),
    onSelectMission(){save();leaving=true;},onDifficulty(id){const next=ArcadeDifficulty.get(id).health,boss=state.enemies.find(n=>n.kind==='carrier');
      if(boss){const ratio=boss.hp/boss.maxHp;boss.maxHp=ArcadeCenit.armor(next);boss.hp=Math.ceil(boss.maxHp*ratio);}
      if(state.rig){const b=state.rig.boss,ratio=b.hp/b.max;b.max=Math.ceil(140*next);b.hp=Math.ceil(b.max*ratio);}
      if(state.rig?.gear)ArcadeDifficulty.applyPlayerDamage(state.rig.gear.e,id);
      state.difficulty=next;return ArcadeDifficulty.save(id,store);}});
  function load(){
    if(loading)return loading;
    const ids=river?['delta','portraits','sky','hull','exhaust',...Object.keys(ArcadeOilArt.paths)]:['sky','terrain','delta','portraits','jet','fleet','airFire','wreck'];
    ArcadeLoading.begin(ids.length,load);
    loading=Promise.all(ids.map(id=>new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>{images[id]=image;ArcadeLoading.step();resolve();};
      const path=graphics.paths[id]||(river&&ArcadeOilArt.paths[id]);image.onerror=()=>reject(new Error(path));image.src=path;
    }))).then(()=>{
      renderer=graphics.create(canvas.getContext('2d',{alpha:false}),images);renderer.draw(state);ArcadeLoading.finish();
      if(entry){history.replaceState(null,'',page);menu.ready({autoPlay:true});}
      return true;
    }).catch(error=>{console.error(error);loading=null;ArcadeLoading.fail();menu.fail();return false;});
    return loading;
  }
  menu.defer(load);if(entry)load();
  addEventListener('pagehide',save);
  addEventListener('blur',()=>{if(mode==='play')menu.show();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')menu.show();});
  function frame(now){
    ArcadeDeveloperMode.poll();ArcadeControls.poll(now);
    const elapsed=Math.min(.075,Math.max(0,(now-last)/1000));last=now;
    if(mode==='play'){
      if(state.rig&&!deckUI.ready){if(!preparingDeck)prepareDeck();requestAnimationFrame(frame);return;}
      if(state.rig)deckUI.bind(state);
      const held=input();accumulator+=elapsed;
      while(accumulator>=1/120&&mode==='play'&&(!state.rig||deckUI.ready)){accumulator-=1/120;update(held,1/120);}
      if(mode==='play'){
        renderer.draw(state);
        if(now>=hudAt){
          audio.loop(river?'jeep':'jetpack',state.rig?0:river?.26:.19,0,state.speed/(river?83:76));
          audio.music?.follow(.12,null,null,{boss:state.carrier||state.rig?.boss.active,
            pressure:state.rig?state.rig.guards.some(n=>n.hp>0&&Math.abs(n.y-state.rig.p.y)<50):river?state.boosting||state.rivals.some(r=>Math.abs(r.z-state.route)<42):state.enemies.some(e=>world.targetInfo(state.player,e).d<180)});
          hud();hudAt=now+120;
        }
        if(now>=savedAt){save();savedAt=now+3000;}
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
