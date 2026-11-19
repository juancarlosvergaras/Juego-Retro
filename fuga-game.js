(()=>{
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('road'),audio=ArcadeAudio.create();
  let touchPad;
  const store=ArcadeDeveloperMode.storage(localStorage),keyboard=new Set(),touch=new Map();
  let s=FugaRoad.create(),screen='loading',last=0,carry=0,endTime=0,renderer,padStart=false,padDrift=false,driftTap=false,stored=false;
  const active=()=>screen==='race'||screen==='ending';
  function sound(){const muted=audio.status().muted;$('audio').textContent=muted?'♫ Silenciado':'♫ Sonido';$('audio').setAttribute('aria-pressed',String(muted));}
  $('audio').onclick=()=>{audio.setMuted(!audio.status().muted);sound();};sound();
  function panel(id,tag,title,copy,button){screen=id;keyboard.clear();touchPad?.clear();touch.clear();driftTap=false;audio.setRunning(false);$('pause').disabled=true;$('panel').hidden=false;$('tag').textContent=tag;$('title').textContent=title;$('copy').textContent=copy;$('go').disabled=false;$('go').textContent=button;$('go').focus({preventScroll:true});}
  function drive(id){screen=id;carry=0;keyboard.clear();touchPad?.clear();touch.clear();$('panel').hidden=true;$('pause').disabled=false;audio.unlock();audio.setRunning(true);canvas.focus({preventScroll:true});}
  function start(){s=FugaRoad.create();endTime=0;stored=false;$('notice').textContent='Vega · Sigue al coupé de la franja dorada.';drive('race');}
  let pausedFrom='race';
  function pause(){if(active()){pausedFrom=screen;panel('paused','RUTA COSTERA','En pausa','La persecución continuará desde este punto.','Continuar');}else if(screen==='paused')drive(pausedFrom);}
  function grant(){const profile=ArcadeProgression.load(store);if(!profile.owned.includes('cloak')){profile.owned.push('cloak');profile.equipped='cloak';}return ArcadeProgression.save(profile,store);}
  function results(){
    if(!stored&&!grant()){panel('save','PREMIO PENDIENTE','Fugitivo alcanzado','El navegador no pudo guardar la invisibilidad en este perfil.','Reintentar guardado');return;}
    screen='won';$('panel').hidden=true;$('pause').disabled=true;audio.setRunning(false);
    ArcadeMissionResults.show({kicker:'ESPECIAL 02 · INTERCEPCIÓN CONFIRMADA',title:'Fuga del Sol',
      stats:[['Distancia recorrida',(s.z/1000).toFixed(2)+' km'],['Tiempo de persecución',Math.ceil(s.time)+' s'],['Poder recuperado','Invisibilidad']],
      epilogue:'Vega recupera el módulo de camuflaje. En campaña, equipa Invisibilidad y pulsa G para desaparecer durante seis segundos. Las balas te atravesarán.',
      next:{label:'Continuar a Nueva York',run:()=>{const c=ArcadeCampaign.read(store)||ArcadeCampaign.first(store)||{};ArcadeCampaign.write(store,{...c,level:8,arrival:true});location.assign('level-eight.html?entry=campaign');}},
      retry:{label:'Volver a conducir',run:start},routes:[{label:'Menú principal',run:()=>location.assign('index.html')}]});
  }
  $('go').onclick=()=>{if(screen==='paused')drive(pausedFrom);else if(screen==='save')results();else if(screen==='error')location.reload();else start();};
  $('pause').onclick=pause;
  const codes=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyA','KeyD','KeyW','KeyS','KeyX','ShiftLeft','ShiftRight'];
  onkeydown=e=>{if(['Escape','KeyP'].includes(e.code)&&!e.repeat){pause();return;}if(active()&&codes.includes(e.code)){e.preventDefault();if(e.code==='KeyX'&&!e.repeat)driftTap=true;keyboard.add(e.code);}};
  onkeyup=e=>keyboard.delete(e.code);onblur=()=>{if(active())pause();};document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())pause();});
  touchPad=ArcadeTouchScreen.bindPads(document.querySelectorAll('[data-key]'),{
    allow:active,down(id,b){touch.set(id,b.dataset.key);if(b.dataset.key==='KeyX')driftTap=true;},up:id=>touch.delete(id)
  });
  $('steer-drift').onclick=e=>{if(e.detail===0&&screen==='race')driftTap=true;};
  function tick(i,dt){
    if(screen==='ending'){endTime+=dt;const step=Math.max(0,46-endTime*12)*dt;s.z+=step;s.boss.z=s.z+3;s.speed=step/dt;s.slip*=Math.exp(-6*dt);s.vx*=Math.exp(-6*dt);s.boost=false;s.x+=(0-s.x)*dt*1.8;s.age+=dt;if(endTime>=3.8)results();return;}
    if(screen!=='race')return;FugaRoad.update(s,i,dt);
    for(const event of s.events){const effect={go:'jump',hurt:'debris',bump:'brake',wreck:'explosion',shot:'rifle',drift:'brake',barrier:'debris'}[event];if(effect)audio.play(effect,{gain:.38});
      if(event==='wreck')$('notice').textContent='Un vehículo de la escolta ha salido de la carretera.';if(event==='go')$('notice').textContent='Cierra la distancia antes del peaje.';}
    if(s.mode==='caught'){stored=grant();endTime=0;screen='ending';$('notice').textContent='Vega · Lo tengo. Módulo de camuflaje recuperado.';audio.play('pickup');}
    if(s.mode==='escaped'||s.mode==='wrecked')panel('lost','COSTA SUR',s.mode==='escaped'?'Cruzó el peaje':'Fuera de carrera',s.mode==='escaped'?'El coupé salió del distrito. Acelera y reserva nitro para recuperar distancia.':'Tu coche quedó inmovilizado. Evita la parte trasera del camión y embiste de lado.','Reintentar');
  }
  function frame(now){
    const dt=Math.min(.08,(now-last)/1000||0);last=now;
    const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean),btn=n=>!!pad?.buttons[n]?.pressed;
    if(btn(9)&&!padStart){if(active()||screen==='paused')pause();else if(screen==='ready'||screen==='lost')start();}padStart=btn(9);
    if(active()&&btn(5)&&!padDrift)driftTap=true;padDrift=btn(5);
    $('steer-drift').disabled=screen!=='race';
    if(active()){
      const keys=new Set([...keyboard,...touch.values()]),has=(a,b)=>keys.has(a)||keys.has(b);
      const i={drift:keys.has('KeyX')||btn(5),gas:has('ArrowUp','KeyW')||btn(7)||btn(12),brake:has('ArrowDown','KeyS')||btn(6)||btn(13),boost:has('Space','ShiftLeft')||keys.has('ShiftRight')||btn(0),
        left:has('ArrowLeft','KeyA')||btn(14)||pad?.axes[0]<-.22,right:has('ArrowRight','KeyD')||btn(15)||pad?.axes[0]>.22};
      carry+=dt;while(carry>=1/120){i.driftTap=driftTap;driftTap=false;tick(i,1/120);carry-=1/120;}
      audio.loop('jeep',.26,0,.75+s.speed*.019);
    }
    renderer.draw(s,screen==='paused'?pausedFrom:screen,endTime);requestAnimationFrame(frame);
  }
  function image(path){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=path;});}
  Promise.all([image('assets/sprites/fuga-coches.png'),image('assets/worlds/fuga-costa.webp'),image('assets/sprites/fuga-arcenes.png'),
    image('assets/sprites/fuga-derrape.webp'),image('assets/sprites/fuga-agente.webp'),image('assets/sprites/fuga-valla.webp')]).then(([cars,sky,verge,drift,officer,barrier])=>{
    renderer=FugaRenderer.create(canvas.getContext('2d'),{cars,sky,verge,drift,officer,barrier});$('route-length').textContent='RUTA COSTERA / '+(FugaRoad.finish/1000).toLocaleString('es-CO')+' KM';screen='ready';$('go').textContent='Arrancar';$('go').disabled=false;requestAnimationFrame(frame);
  }).catch(()=>panel('error','COSTA SUR','Carga interrumpida','No se pudo cargar la carretera.','Recargar'));
  if(new URLSearchParams(location.search).has('debug'))window.__fuga={get state(){return s;},get screen(){return screen;},tick,render:()=>renderer.draw(s,screen,endTime)};
})();
