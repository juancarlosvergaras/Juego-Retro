(() => {
  'use strict';
  const Q=ArcadeQuimera,$=id=>document.getElementById(id),canvas=$('arena'),c=canvas.getContext('2d');
  const store=ArcadeDeveloperMode.storage(localStorage),saveKey='cap-dollar.quimera.v1',audio=ArcadeAudio.create();
  let saved={};try{saved=JSON.parse(store.getItem(saveKey)||'{}')||{};}catch{}
  let state=Q.create(saved),screen='ready',ready=false,last=0,acc=0,buffer='',jump=false,pickup=false,buttonAge=0,padKeys=new Set(),lastZone='',lastScore=-1;
  let touchPad;
  const held=new Set(),touches=new Map(),art={},attacks={KeyJ:'jab',KeyK:'uppercut',KeyL:'kick',KeyI:'sweep'};
  const cinema=ArcadeQuimeraStory,story=cinema.mount(canvas.parentElement,art);
  let sceneTime=0,pausedFrom='play',prizeSaved=false,lastHealth=-1,lastBoss='',lastBossHp=-1,inputSource='keys';
  const cinematic=()=>screen==='arrival'||screen==='ending';
  const rows=['idle','walk','guard','jump','jab','cross','kick','uppercut','sweep','airkick','hurt','fall','win','throw','pounce','morph','fly','beam'];
  const labels={batter:'MATÓN DEL MUELLE',foreman:'CAPATAZ',rifle:'FUSILERO',knife:'CUCHILLERO',warden:'GUARDIÁN',jet:'AEROSOLDADO',infected:'INFECTADO',robot:'AUTÓMATA',blackWolf:'LOBO NEGRO',gunner:'ARTILLERO DEL DIQUE',scientist:'DR. VARELA',lizard:'QUIMERA'};
  const landmarks=Q.waves.flatMap((wave,index)=>[...new Set(wave.cast.map(e=>e.route))].filter(route=>route==='shutter'||route==='hatch').map(route=>({...Q.portal(wave,route),route,index})));
  function saveCheckpoint(){try{store.setItem(saveKey,JSON.stringify(Q.checkpoint(state)));}catch{$('notice').textContent='El navegador no ha podido guardar este puesto.';}}
  function savePrize(){
    const profile=ArcadeProgression.load(store);profile.heroUnlocked=true;
    return ArcadeProgression.save(profile,store);
  }
  function leave(url){try{store.removeItem(saveKey);}catch{}location.assign(url);}
  function nextMission(){
    const carry=ArcadeCampaign.read(store)||ArcadeCampaign.first(store)||{};
    ArcadeCampaign.write(store,{...carry,level:8,form:'hero',arrival:true});leave('level-eight.html?entry=campaign');
  }
  function results(){
    if(!prizeSaved&&!savePrize()){show('saveError','Premio pendiente','El navegador bloqueó el guardado del traje. Puedes volver a intentarlo.','Guardar premio');return;}
    screen='won';clear();audio.setRunning(false);$('panel').hidden=true;$('skip-scene').hidden=true;$('pause').disabled=true;
    ArcadeMissionResults.show({kicker:'ESPECIAL 01 · MISIÓN COMPLETADA',title:'El puerto vuelve a respirar',
      stats:[['Puntos',state.score.toLocaleString('es-CO')],['Encuentros superados',state.clears+' / '+Q.waves.length],['Traje recuperado','Centella Azul']],
      epilogue:'Inés pasa lista a bordo de Vega. Están todos. Con Centella, F activa el vuelo y J dispara rayos azules. Las balas rebotan en el traje.',
      next:{label:'Volar a Nueva York',run:nextMission},retry:{label:'Repetir el especial',run:()=>leave('quimera.html')},
      routes:[{label:'Menú principal',run:()=>leave('index.html')}]});
  }
  function clear(){held.clear();padKeys.clear();touchPad?.clear();touches.clear();buffer='';jump=false;pickup=false;buttonAge=0;}
  function show(id,title,copy,action){screen=id;clear();audio.setRunning(false);$('skip-scene').hidden=true;$('panel').hidden=false;$('heading').textContent=title;$('description').textContent=copy;$('go').textContent=action;$('tag').textContent=id==='down'?'FUERA DE COMBATE':'ESPECIAL 01 · DISTRITO QUIMERA';$('go').focus();$('pause').disabled=true;}
  function play(){screen='play';clear();$('panel').hidden=true;$('pause').disabled=false;audio.unlock();audio.setRunning(true);canvas.focus({preventScroll:true});}
  function scene(id,resume=false){
    play();screen=id;if(!resume)sceneTime=0;
    $('skip-scene').hidden=false;$('notice').textContent=id==='arrival'?'Vega sobrevuela el muelle.':'Varela ha caído. Cap va a abrir la compuerta.';
  }
  function endScene(){
    if(!cinematic())return;
    $('skip-scene').hidden=true;
    if(screen==='ending')results();else{play();$('notice').textContent='Cruza el mercado hasta el varadero.';}
  }
  function resume(){if(pausedFrom==='play')play();else scene(pausedFrom,true);}
  function pause(){
    if(screen==='play'||cinematic()){pausedFrom=screen;show('paused','En pausa','Distrito Quimera · '+Q.zones[Q.zoneOf(state.wave)],'Continuar');}
    else if(screen==='paused')resume();
  }
  $('skip-scene').onclick=endScene;$('pause').onclick=pause;
  function syncSound(){const muted=audio.status().muted;$('sound').textContent=muted?'♫ Silenciado':'♫ Sonido';$('sound').setAttribute('aria-pressed',String(muted));}
  $('sound').onclick=()=>{audio.setMuted(!audio.status().muted);syncSound();};syncSound();
  $('go').onclick=()=>{
    if(!ready)return;
    if(screen==='saveError'){results();return;}
    if(screen==='paused'){resume();return;}
    if(saved.ending&&screen==='ready'){
      state.mode='won';state.wave=state.clears=Q.waves.length;state.score=Number.isFinite(saved.finalScore)?saved.finalScore:state.score;
      prizeSaved=savePrize();scene('ending');return;
    }
    if(screen==='down')state=Q.create(Q.checkpoint(state));
    story.reset();
    if(screen==='ready'&&!state.checkpoint){
      screen='briefing';audio.unlock();$('panel').hidden=true;
      story.briefing(()=>scene('arrival'));return;
    }
    story.radio.prime(state);play();$('notice').textContent='Puesto de control · '+Q.zones[Q.zoneOf(state.wave)];
  };
  const touchHeld=code=>[...touches.values()].includes(code);
  const trigger=code=>{if(attacks[code]){buffer=attacks[code];buttonAge=.24;}if(code==='Space')jump=true;if(code==='KeyE')pickup=true;};
  const keyDown=code=>{if(!held.has(code)&&!touchHeld(code))trigger(code);held.add(code);};
  window.addEventListener('keydown',ev=>{if(story.briefingOpen()||screen==='won')return;
    if(cinematic()&&ev.code==='Space'){ev.preventDefault();if(!ev.repeat)endScene();return;}
    if(ev.code==='Escape'||ev.code==='KeyP'){if(!ev.repeat)pause();return;}
    if(screen!=='play')return;inputSource='keys';if(ev.code.startsWith('Arrow')||ev.code==='Space')ev.preventDefault();keyDown(ev.code);});
  window.addEventListener('keyup',ev=>held.delete(ev.code));
  window.addEventListener('blur',()=>{if(screen==='play'||cinematic())pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(screen==='play'||cinematic()))pause();});
  touchPad=ArcadeTouchScreen.bindPads(document.querySelectorAll('.touch [data-key]'),{
    allow:()=>screen==='play',
    down(id,b){const code=b.dataset.key;inputSource='touch';if(!held.has(code)&&!touchHeld(code))trigger(code);touches.set(id,code);},
    up:id=>touches.delete(id)
  });
  const padMap={0:'Space',1:'KeyL',2:'KeyJ',3:'KeyK',4:'ShiftLeft',5:'KeyI',7:'KeyE',9:'Pause',12:'ArrowUp',13:'ArrowDown',14:'ArrowLeft',15:'ArrowRight'};
  function pollPad(){const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean),next=new Set();if(pad){for(const [i,k] of Object.entries(padMap))if(pad.buttons[i]?.pressed)next.add(k);
    if(Math.abs(pad.axes[0])>.28)next.add(pad.axes[0]<0?'ArrowLeft':'ArrowRight');if(Math.abs(pad.axes[1])>.28)next.add(pad.axes[1]<0?'ArrowUp':'ArrowDown');}
    for(const k of next)if(!padKeys.has(k)){
      inputSource='pad';
      if(story.briefingOpen()){if(k==='Space')document.querySelector('.briefing-next').click();if(k==='Pause')document.querySelector('.briefing-skip').click();}
      else if(k==='Pause')pause();else if(screen==='play'){if(attacks[k]){buffer=attacks[k];buttonAge=.24;}if(k==='Space')jump=true;if(k==='KeyE')pickup=true;}
      else if(k==='Space'&&ready){if(cinematic())endScene();else if(screen==='won')document.querySelector('.results-next').click();else $('go').click();}
    }
    padKeys=next;
  }
  const pressed=(...keys)=>keys.some(k=>held.has(k)||padKeys.has(k)||touchHeld(k));
  function tick(dt){
    if(cinematic()){
      const before=sceneTime;sceneTime+=dt;
      if(screen==='ending'){
        for(const [at,sound] of [[2.75,'pickup'],[4.75,'plasma'],[5.8,'debris'],[10,'jump']])if(before<at&&sceneTime>=at)audio.play(sound,{gain:.36});
      }
      if(sceneTime>=(screen==='ending'?cinema.endingTime:cinema.arrivalTime))endScene();
      return;
    }
    if(screen!=='play')return;const p=state.player,canAct=!p.attack&&!p.pickup&&p.stun<=0&&state.hitstop<=0;
    const input={left:pressed('KeyA','ArrowLeft'),right:pressed('KeyD','ArrowRight'),up:pressed('KeyW','ArrowUp'),down:pressed('KeyS','ArrowDown'),guard:pressed('ShiftLeft','ShiftRight'),jump:canAct&&jump,pickup:canAct&&pickup,primaryPressed:canAct&&buffer==='jab',attack:canAct&&(buffer||(pressed('KeyJ')&&!p.weapon?'jab':''))};
    if(canAct){buffer='';jump=false;pickup=false;}else if((buttonAge-=dt)<=0)buffer='';
    const events=Q.update(state,input,dt);
    story.update(state,dt);
    for(const e of events){if(e==='checkpoint')saveCheckpoint();if(e==='wave'){
      const lead=Q.waves[state.wave].cast[0].kind;
      $('notice').textContent={blackWolf:'El Lobo Negro baja la cabeza antes de cargar. Sal de su trayectoria.',gunner:'El Artillero del Dique prepara la cinta. Ataca cuando se recaliente el cañón.',scientist:'Varela tiene un frasco de suero.'}[lead]||'¡Emboscada! Vigila los accesos y los flancos.';
    }
      if(e==='equip')$('notice').textContent='Arma recogida · '+Q.weapons[p.weapon.kind].label+' · '+p.weapon.uses+' usos. Pulsa el ataque principal.';
      if(e==='spent')$('notice').textContent='Arma agotada. Vuelves a combatir con los puños.';
      if(e==='clear')$('notice').textContent='Zona despejada. Recoge el botiquín y avanza a la derecha.';
      if(e==='morph')$('notice').textContent='¡El suero está transformando a Varela!';
      if(e==='rise')$('notice').textContent='¡El infectado se levanta!';
      if(e==='overheat')$('notice').textContent='¡Cañón recalentado! Acércate al artillero.';
      const sound={gas:'grenade',flask:'grenade',shatter:'debris',acid:'plasma',tail:'claw',leap:'jump',land:'kick',equip:'pickup',playerShot:'rifle',batHit:'axe',shot:'rifle',vial:'grenade',hit:'kick',swing:'claw',jump:'jump',hurt:'hurt',block:'debris',boxHit:'kick',boxBreak:'debris',points:'pickup',knockout:'brake',heal:'pickup',checkpoint:'pickup',morph:'thunder',roar:'whiteRoar'}[e];if(sound)audio.play(sound,{gain:.34});}
    if(state.mode==='down')show('down','Has caído','Vuelve al inicio de la zona con la salud completa.','Reintentar zona');
    if(state.mode==='won'){
      prizeSaved=savePrize();
      try{store.setItem(saveKey,JSON.stringify({...Q.checkpoint(state),ending:true,finalScore:state.score}));}catch{}
      scene('ending');
    }
  }
  function text(str,x,y,size,color,align='left'){c.font='bold '+size+'px Consolas, monospace';c.textAlign=align;c.fillStyle='#0a1215';c.fillText(str,x+2,y+2);c.fillStyle=color;c.fillText(str,x,y);c.textAlign='left';}
  function bar(x,y,w,h,f,fill){c.fillStyle='#111c1b';c.fillRect(x-2,y-2,w+4,h+4);c.fillStyle='#533637';c.fillRect(x,y,w,h);c.fillStyle=fill;c.fillRect(x,y,w*Math.max(0,Math.min(1,f)),h);}
  function drawSupply(box){
    const spec=Q.supplies[box.kind],sx=box.kind==='medical'?96:0;
    const x=Math.round(box.x-state.cam),y=box.y,scale=Q.floorScale(y),w=spec.width*scale,h=spec.height*scale;
    const age=state.age-box.brokenAt;
    if(box.taken){
      const t=state.age-box.takenAt;
      if(t<.85)text('+'+box.gained+(sx?' VIDA':' PTS'),x,y-28-t*23,15,sx?'#a9f5b3':'#ffe08b','center');
      return;
    }
    c.fillStyle='#0a0f178a';c.beginPath();c.ellipse(x,y+1,box.hp?w*.49:14,box.hp?6:3,0,0,Math.PI*2);c.fill();
    if(box.hp>0){
      const dt=state.age-box.hitAt,shake=dt<.18?Math.round(Math.sin(dt*95)*3*(1-dt/.18)):0;
      c.drawImage(art.supplies,sx,0,96,80,x-w/2+shake,y-h,w,h);
      if(box.hp<spec.hp){
        c.strokeStyle='#2c211c';c.lineWidth=2;c.beginPath();c.moveTo(x+shake+5,y-h*.76);c.lineTo(x+shake,y-h*.57);
        c.lineTo(x+shake+4,y-h*.51);c.lineTo(x+shake-5,y-h*.29);c.stroke();
      }
      return;
    }
    if(age<.42){
      c.save();c.globalAlpha=Math.min(1,(.42-age)*7);
      for(let i=0;i<6;i++){
        const col=i%3,row=Math.floor(i/3),dx=(col-1)*age*94,dy=age*(210*age-95+row*19);
        c.save();c.translate(x+(col-1)*w/3+dx,y-h+(row+.5)*h/2+dy);
        c.rotate((i%2?1:-1)*age*(3+col));c.drawImage(art.supplies,sx+col*32,row*40,32,40,-w/6,-h/4,w/3,h/2);c.restore();
      }
      c.restore();
    }
    const hop=age<.35?Math.sin(Math.PI*age/.35)*22:2+Math.sin(state.age*4+box.id)*2;
    c.drawImage(art.supplies,sx,80,96,80,x-16,y-24-hop,32,25);
  }
  function drawPortal(p){
    const x=Math.round(p.x-state.cam),y=p.y;
    c.save();c.translate(x,y);
    const scale=Q.floorScale(y);c.scale(scale,scale);c.translate(-x,-y);
    if(p.route==='hatch'){
      c.drawImage(art.drain,x-49,y-19,140,36);c.restore();return;
    }
    c.drawImage(art.booth,x-121,y-174,232,184);
    const arrival=state.wave===p.index&&state.enemies.find(n=>n.entry?.route==='shutter');
    let open=0;
    if(arrival)open=Math.min(1,arrival.entry.t/(arrival.entry.duration*.48));
    else if(state.wave>p.index||state.wave===p.index&&state.locked&&!state.pending.some(q=>Q.waves[p.index].cast[q.i].route==='shutter'))open=1;
    const h=Math.round(110*(1-open));
    if(h){
      c.save();c.beginPath();c.rect(x-91,y-110,182,h);c.clip();
      const gradient=c.createLinearGradient(x-91,0,x+91,0);
      gradient.addColorStop(0,'#393a33');gradient.addColorStop(.23,'#636153');gradient.addColorStop(.78,'#565448');gradient.addColorStop(1,'#2e312e');
      c.fillStyle=gradient;c.fillRect(x-91,y-110,182,h);
      for(let line=y+h;line>y-110;line-=7){c.fillStyle='#2c2d28';c.fillRect(x-91,line-2,182,2);c.fillStyle='#81806a';c.fillRect(x-91,line,182,1);}
      c.restore();
    }
    c.restore();
  }
  const armedRows=Q.armedRows;
  const stanceHeight={batter:73,foreman:76,fighter:74,knife:65,rifle:73,warden:74,jet:55,infected:73,robot:73,
    gunner:69,blackWolf:74,scientist:73,lizard:74};
  const fallenRows={infected:1,lizard:2,batter:8,foreman:9,jet:10,robot:11};
  function actionSprite(row,progress){
    const cell=Math.round(12*Math.max(0,Math.min(1,progress)));
    c.drawImage(art.actions,164*cell,112*row,164,112,-82,-102,164,112);
  }
  function drawPickup(a){
    const action=a.pickup;
    const phase=action.t<=.26?action.t/.26*2/3:2/3+(action.t-.26)/.22/3;
    actionSprite(0,phase);
    if(action.gripped){
      const t=Math.min(1,(action.t-.26)/.22),icon=Q.weapons[action.item.kind].icon;
      c.save();c.translate(19-3*t,-7-34*t);c.rotate(-.45*t);
      c.drawImage(art.loot,icon*72,0,72,32,-22,-12,51,23);c.restore();
    }
  }
  function drawTechnique(n){
    const a=n.tech,m=Q.techniques[a.kind],phase=Q.techPhase(n);
    const t=phase==='windup'?a.t/m.wind:phase==='active'?(a.t-m.wind)/m.active:(a.t-m.wind-m.active)/m.recover;
    const pose=phase==='windup'?t/3:phase==='active'?1/3+Math.min(1,t*1.75)/3:2/3+t/3;
    actionSprite(m.row,pose);
  }
  function actor(a){
    const x=Math.round(a.x-state.cam),floor=Math.round(a.y),scale=Q.scaleAt(a);
    const e=a.entry,t=e?Math.min(1,e.t/e.duration):1;
    c.save();
    let rise=0;
    if(e?.route==='hatch'){
      c.beginPath();c.rect(x-80,floor-180,160,181);c.clip();rise=(1-t)*118;
    }else if(e?.route==='shutter'&&t<.48){
      const doorScale=Q.floorScale(e.fromY),gap=110*doorScale*t/.48;
      c.beginPath();c.rect(x-91*doorScale,e.fromY-gap,182*doorScale,gap+floor-e.fromY+2);c.clip();
    }
    const altitude=Math.min(1,(a.z||0)/155);
    const contact=a.down?Math.min(1,(Q.downTime-a.fall)/Q.fallTime):a.rise>0?a.rise/Q.riseTime:0;
    const fade=a.down&&!a.down.returns&&a.kind!=='lizard'?Math.min(1,a.fall/.22):1;
    const shadow=(1-altitude)*(e?Math.min(1,t*3):1)*fade;
    if(shadow>0){c.fillStyle='rgba(7,12,13,'+(.62*shadow)+')';c.beginPath();
      c.ellipse(x,floor+1,(22+12*contact-6*altitude)*scale,(4.5+1.5*contact)*scale,0,0,Math.PI*2);c.fill();}
    let frame=a.act==='walk'&&a.kind!=='jet'?Math.floor(a.stride*12):Math.floor(a.age*13)%12;
    if(a.attack)frame=Math.min(11,Math.floor(12*a.attack.t/Q.moves[a.attack.name].duration));
    else if(a.morph)frame=Math.min(11,Math.floor(12*(1-a.morph/1.8)));
    else if(a.act==='fall')frame=Math.min(11,Math.floor(a.age/(a.down?Q.fallTime:.65)*12));
    else if(a.strike>0)frame=Math.min(11,Math.floor((.25-a.strike)/.25*12));
    else if(a.stun>0)frame=Math.min(11,Math.floor(a.age/.32*12));
    const carried=a.attack?.weapon||a.weapon?.kind;
    const model=a.kind==='fighter'&&carried?Q.weapons[carried].sprite:a.kind;
    const gait=art['steps_'+model];
    const onFoot=gait&&(a.act==='walk'||a.act==='idle'||(a.kind==='fighter'&&a.act==='guard'));
    const pose=({bash:'cross',slash:'jab',shoot:'throw',pulse:'throw',charge:'pounce'})[a.act]||a.act;
    const pic=art[a.kind];c.save();c.translate(x,Math.round(floor-(a.z||0)+rise));c.scale(a.face*scale,scale);
    if(a.immune>0&&Math.floor(a.immune*17)%2)c.globalAlpha=.55;
    c.globalAlpha*=fade;
    if(a.kind==='fighter'&&carried&&!a.attack?.weapon&&a.attack){
      const icon=Q.weapons[carried].icon;
      c.save();c.translate(-10,-44);c.rotate(-1.02);
      c.drawImage(art.loot,icon*72,0,72,32,-21,-10,49,22);c.restore();
    }
    if(a.pickup)drawPickup(a);
    else if(a.tech)drawTechnique(a);
    else if(a.act==='rise')actionSprite(1,1-a.rise/Q.riseTime);
    else if(a.down&&a.kind in fallenRows){
      const progress=Math.min(1,(Q.downTime-a.fall)/Q.fallTime);
      actionSprite(fallenRows[a.kind],a.kind==='infected'?1-progress:progress);
    }else if(onFoot){
      const phase=a.gaitWeight>.06?a.stride:state.age*.7;
      cinema.drawGait(c,gait,phase,a.gaitWeight);
    }else if(model in armedRows&&(a.kind!=='fighter'||a.attack?.weapon||['hurt','fall','jump'].includes(a.act))){
      drawArmed(a,model,frame);
    }else c.drawImage(pic,frame*120,Math.max(0,rows.indexOf(pose))*98,120,98,-53,-91,120,98);
    c.restore();c.restore();
    if(a.kind==='gunner'&&a.hp>0&&a.overheat>0){
      const muzzle=x+52*a.face;
      c.fillStyle='#ffa954';c.fillRect(muzzle-4,floor-58,8,3);
      for(let i=0;i<4;i++){const phase=(state.age*1.5+i/4)%1;c.fillStyle='rgba(196,194,170,'+(.65*(1-phase))+')';c.fillRect(muzzle+Math.sin(phase*8+i)*4,floor-61-phase*32,4+phase*4,4);}
    }
  }
  function drawEnemyMeters(){
    const used=[];
    for(const n of [...state.enemies].sort((a,b)=>b.y-a.y||a.id-b.id)){
      const x=Math.round(n.x-state.cam),scale=Q.scaleAt(n);
      if(x<0||x>=960||n.entry?.route==='shutter'&&n.entry.t<n.entry.duration*.28)continue;
      let height=stanceHeight[n.kind];
      if(n.down)height*=1-.69*Math.min(1,(Q.downTime-n.fall)/Q.fallTime);
      if(n.rise>0)height*=1-.69*n.rise/Q.riseTime;
      const head=n.y-(n.z||0)-height*scale;
      if(head< -70||n.entry?.route==='hatch'&&n.entry.t/n.entry.duration<.4)continue;
      const center=Math.max(22,Math.min(938,x)),top=Math.round(head)-11;
      let y=top;
      while(used.some(last=>Math.abs(center-last.x)<49&&Math.abs(y-last.y)<12))y-=12;
      used.push({x:center,y});
      c.save();if(n.down&&!n.down.returns)c.globalAlpha=Math.min(1,n.fall/.22);
      if(y<top-5){c.fillStyle='#2a2023c0';c.fillRect(center,y+5,1,top-y);}
      const life=n.hp/n.maxHp,color=life>.50?'#9bdb85':life>.24?'#f1bf6a':'#ff7868';
      c.fillStyle='#ad9d85';c.fillRect(center-18,y-1,36,7);
      bar(center-15,y+1,30,3,life,color);
      if(n.wind>0||n.tech&&Q.techPhase(n)==='windup')text('!',center+22,y+5,14,'#ffcc63','center');
      if(n.down?.returns){c.fillStyle='#9cb76e';c.globalAlpha=.6+.35*Math.sin(n.age*14);c.fillRect(center-14,y+1,4,3);}
      c.restore();
    }
  }
  function ring(x,y,rx,ry,color,alpha){
    c.save();c.translate(x-state.cam,y);c.globalAlpha=alpha;
    c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.globalAlpha*=.15;c.fill();
    c.globalAlpha=alpha;c.lineWidth=2;c.strokeStyle=color;c.setLineDash([8,5]);c.stroke();c.restore();
  }
  function drawDangerZones(){
    for(const n of state.enemies){
      if(!n.tech)continue;
      const a=n.tech,phase=Q.techPhase(n),m=Q.techniques[a.kind];
      if(phase==='recovery')continue;
      const pulse=.65+.23*Math.sin(a.t*15);
      if(a.kind==='leap'||a.kind==='flask'){
        ring(a.toX,a.toY,a.kind==='leap'?73:46,a.kind==='leap'?26:21,a.kind==='leap'?'#ffc076':'#b1ef76',pulse);
      }else if(a.kind==='acid'&&phase==='windup'){
        const from=n.x+n.face*36,run=Math.abs(a.toX-n.x),slope=Math.max(-.32,Math.min(.32,(a.toY-n.y)/Math.max(75,run)));
        c.save();c.globalAlpha=pulse*.75;c.strokeStyle='#d1e68b';c.lineWidth=2;c.setLineDash([5,10]);
        c.beginPath();c.moveTo(from-state.cam,n.y);c.lineTo(from-state.cam+n.face*155,n.y+slope*155);c.stroke();c.restore();
      }else if(a.kind==='gas')ring(n.x+20*n.face,n.y,98,26,'#ffba5a',pulse);
      else if(a.kind==='tail'){
        ring(n.x+64*n.face,n.y,85,26,'#ffd08a',pulse);
        if(phase==='active'){
          const progress=Math.min(1,(a.t-m.wind)/m.active);
          c.save();c.translate(n.x-state.cam,n.y-31);c.scale(n.face,1);
          c.globalAlpha=Math.sin(progress*Math.PI)*.8;c.strokeStyle='#efcb81';c.lineWidth=3;
          c.beginPath();c.ellipse(17,0,131,21,-.10,-1.05,Math.min(1.16,-1.04+3*progress));c.stroke();c.restore();
        }
      }
    }
    for(const b of state.chemicals)if(b.kind==='flask')ring(b.toX,b.toY,46,21,'#b1ef76',.8);
  }
  function drawChemicals(){
    for(const b of state.chemicals){
      const t=Math.min(1,b.t/b.duration),x=b.x-state.cam;
      c.save();c.translate(x,b.y);c.scale(Q.floorScale(b.y),Q.floorScale(b.y));
      if(b.kind==='gas'){
        c.globalAlpha=Math.min(1,(1-t)*5);const w=30+68*Math.min(1,t*2.8);
        for(let i=0;i<15;i++){
          const offset=(i/14-.5)*2,cycle=(t*1.7+i*.381)%1;
          c.globalAlpha=(1-cycle)*Math.min(.85,(1-t)*4);
          c.fillStyle=['#a75a36','#f3bc54','#db8c43'][i%3];
          c.beginPath();c.ellipse(offset*w,-7-cycle*(1-Math.abs(offset)*.58)*44,7+cycle*9,5+cycle*7,0,0,Math.PI*2);c.fill();
        }
      }else{
        c.fillStyle='#20162265';c.fillRect(-6,0,12,3);
        c.translate(0,-b.z/Q.floorScale(b.y));
        if(b.kind==='flask'){
          c.rotate(t*9);c.fillStyle='#24302a';c.fillRect(-5,-5,11,13);c.fillRect(-3,-10,7,6);
          c.fillStyle='#c6e3c4';c.fillRect(-2,-8,4,6);c.fillStyle='#8ee34f';c.fillRect(-3,0,7,5);c.fillStyle='#efffd1';c.fillRect(-3,-3,2,3);
        }else{
          c.scale(Math.sign(b.toX-b.startX),1);
          for(let i=4;i>=0;i--){c.fillStyle=i?'#779f40':'#bce953';c.beginPath();c.ellipse(-i*6,Math.sin(i+t*13)*2,9-i,6-i,0,0,Math.PI*2);c.fill();}
          c.fillStyle='#ebffc0';c.fillRect(-2,-4,5,2);
        }
      }
      c.restore();
    }
  }
  function drawArmed(a,model,frame){
    const ranged=a.attack?.weapon&&Q.weapons[a.attack.weapon].ranged;
    let key=0,lean=0;
    if(a.attack?.weapon){
      const m=Q.moves[a.attack.name],t=a.attack.t;
      if(t<m.impact){key=t<m.impact*.24?0:1;lean=-.10*t/m.impact;}
      else{const recover=(t-m.impact)/(m.duration-m.impact);key=recover<(ranged?.30:.46)?2:recover<.86?3:0;lean=.11*(1-recover);}
    }else if(a.act==='guard'&&a.wind>0){
      const t=1-a.wind/Q.foes[a.kind].wind;key=1;lean=-.11*t;
    }else if(a.act==='batStrike'){
      key=frame<6?2:3;lean=.13*(1-frame/12);
    }else if(a.act==='fall'){
      const t=a.kind==='fighter'?Math.min(1,a.age/.65):1-Math.max(0,a.fall)/.65;lean=-1.48*Math.min(1,t*1.5);c.globalAlpha*=Math.min(1,(1-t)*3);
    }else if(a.act==='hurt')lean=-.16*(1-frame/12);
    c.rotate(lean);c.drawImage(art.armed,key*120,armedRows[model]*98,120,98,-53,-91,120,98);
  }
  function drawDrop(d){
    const spec=Q.weapons[d.kind],p=state.player,action=p.pickup;
    const grip=action?.item===d?Math.min(1,Math.max(0,(action.t-.16)/.10)):0;
    const scale=Q.floorScale(d.y),x=Math.round(d.x-state.cam+(p.x+p.face*19*Q.scaleAt(p)-d.x)*grip);
    const lift=Math.max(0,d.readyAt-state.age)*80;
    c.save();c.translate(x,d.y+(p.y-d.y)*grip);c.scale(scale,scale);
    c.fillStyle='#0c14218c';c.beginPath();c.ellipse(0,0,23,4,0,0,Math.PI*2);c.fill();
    c.drawImage(art.loot,spec.icon*72,0,72,32,-32,-23-lift+Math.sin(state.age*4)*1.4,64,28);
    c.restore();
  }
  const goLetters=['01110 01110 1','11000 11011 1','11000 11011 1','11011 11011 1','11001 11011 1','11001 11011 0','01110 01110 1'];
  function goSignal(){
    const t=state.age-state.goSince,unit=5,ox=814,oy=112;
    c.save();c.translate(ox+Math.round((1-Math.min(1,t*6))*18),oy);
    for(const [offset,color] of [[3,'#171727'],[0,'#743623'],[-1,'#ffce65']]){
      c.fillStyle=color;
      goLetters.forEach((line,y)=>{for(let x=0;x<line.length;x++)if(line[x]==='1')c.fillRect(x*unit+offset+Math.floor((6-y)/3),y*unit+offset,unit+1,unit+1);});
      const arrow=78+Math.round(Math.sin(t*7)*4)+offset;
      c.beginPath();c.moveTo(arrow,9+offset);c.lineTo(arrow+13,9+offset);c.lineTo(arrow+13,3+offset);c.lineTo(arrow+30,18+offset);c.lineTo(arrow+13,33+offset);c.lineTo(arrow+13,27+offset);c.lineTo(arrow,27+offset);c.fill();
    }
    c.restore();
  }
  function backdrop(){
    art.scenery=[];
    const overlap=46,curb=305,portHeight=art.port.height/2;
    let left=0;
    function join(pic,top,height,width,curbFraction){
      const section=document.createElement('canvas');section.width=width;section.height=540;
      const brush=section.getContext('2d'),scale=width/pic.width;
      const foot=Math.round(height*curbFraction),visibleHeight=curb/scale;
      brush.drawImage(pic,0,top+foot-visibleHeight,pic.width,visibleHeight,0,0,width,curb);
      brush.drawImage(pic,0,top+foot,pic.width,height-foot,0,curb,width,(height-foot)*scale);
      if(pic!==art.waterfront){
        // The narrow scenic strips end behind the fighting lane. Continue the
        // quay with native-aspect paving, at a fixed position in world space.
        const lab=pic===art.city,paving=lab?art.city:art.waterfront;
        const sy=lab?559:677,start=335,pavingScale=(540-start)/(paving.height-sy);
        const tileWidth=paving.width*pavingScale;
        const floor=document.createElement('canvas');floor.width=width;floor.height=540-start;
        const road=floor.getContext('2d');
        for(let tile=Math.floor(left/tileWidth);tile*tileWidth<left+width;tile++){
          const offset=Math.round(tile*tileWidth-left),end=Math.round((tile+1)*tileWidth-left);
          road.save();road.translate(tile%2?end:offset,0);road.scale(tile%2?-1:1,1);
          road.drawImage(paving,0,sy,paving.width,paving.height-sy,0,0,end-offset,floor.height);road.restore();
        }
        const blend=road.createLinearGradient(0,0,0,58);
        blend.addColorStop(0,'black');blend.addColorStop(1,'transparent');
        road.globalCompositeOperation='destination-out';road.fillStyle=blend;road.fillRect(0,0,width,58);
        brush.drawImage(floor,0,start);
      }
      if(left){const fade=brush.createLinearGradient(0,0,overlap,0);fade.addColorStop(0,'black');fade.addColorStop(1,'transparent');
        brush.globalCompositeOperation='destination-out';brush.fillStyle=fade;brush.fillRect(0,0,overlap,540);}
      art.scenery.push({image:section,left});left+=width-overlap;
    }
    join(art.port,0,portHeight,2520,.74);
    join(art.waterfront,0,art.waterfront.height,1640,.745);
    join(art.port,portHeight,portHeight,2520,.74);
    join(art.city,0,art.city.height,Q.maxCam+960-left,.75);
  }
  function render(){
    if(!ready)return;
    const playing=screen==='play';story.render(!playing);$('combat-hud').hidden=!playing;
    const weapon=state.player.weapon,heldLabel=weapon?Q.weapons[weapon.kind].label+' · '+weapon.uses+'/3':'Luchador';
    if($('held-weapon').textContent!==heldLabel)$('held-weapon').textContent=heldLabel;
    const drop=!state.player.pickup&&Q.nearestDrop(state);
    const primary=drop?(weapon?'Cambiar':'Recoger'):weapon?(Q.weapons[weapon.kind].ranged?'Disparar':'Bate'):'Puño';
    if($('primary-attack').textContent!==primary)$('primary-attack').textContent=primary;
    const boss=playing&&state.enemies.find(n=>Q.foes[n.kind].boss&&!n.entry);
    $('boss-strip').hidden=!boss;
    if(boss&&(lastBoss!==boss.kind||lastBossHp!==boss.hp)){lastBoss=boss.kind;lastBossHp=boss.hp;$('boss-name').textContent=labels[boss.kind];$('boss-fill').style.width=(100*boss.hp/boss.maxHp)+'%';}
    if(boss){
      const phase=boss.tech&&Q.techPhase(boss);
      const signal=boss.morph>0?'Mutación':phase==='recovery'?'Guardia abierta':phase?Q.techniques[boss.tech.kind].label:'';
      if($('boss-action').textContent!==signal)$('boss-action').textContent=signal;
    }
    if(lastHealth!==state.player.hp){lastHealth=state.player.hp;$('health').textContent=lastHealth+' / 100';$('health-fill').style.width=lastHealth+'%';$('health-fill').parentElement.setAttribute('aria-valuenow',lastHealth);}
    c.imageSmoothingEnabled=false;c.clearRect(0,0,960,540);
    const view=screen==='paused'?pausedFrom:screen;
    if(view==='arrival'||view==='ending'||view==='won'||view==='saveError'){
      if(view==='arrival')cinema.arrival(c,art,sceneTime);else cinema.ending(c,art,sceneTime);
      return;
    }
    c.save();c.translate(0,90);
    if(state.shake>0)c.translate(Math.sin(state.age*110)*state.shake,Math.cos(state.age*97)*state.shake*.5);
    for(const section of art.scenery){const x=section.left-Math.round(state.cam);
      if(x<960&&x+section.image.width>0)c.drawImage(section.image,x,-90);
    }
    for(const f of state.food)if(!f.used){const x=f.x-state.cam;c.fillStyle='#163928';c.fillRect(x-12,f.y-13,25,14);c.fillStyle='#aac491';c.fillRect(x-10,f.y-12,21,10);c.fillStyle='#b64b40';c.fillRect(x-1,f.y-12,4,10);c.fillRect(x-5,f.y-9,12,4);}
    const visible=landmarks.filter(p=>p.x>state.cam-150&&p.x<state.cam+1110);
    const supplies=state.supplies.filter(box=>Math.abs(box.x-state.cam-480)<535&&(!box.taken||state.age-box.takenAt<.85));
    drawDangerZones();
    [...visible,...supplies,...state.drops,...state.enemies,state.player].sort((a,b)=>a.y-b.y).forEach(a=>{
      if(a.route)drawPortal(a);else if(a.uses)drawDrop(a);else if(Q.supplies[a.kind])drawSupply(a);else actor(a);
    });
    for(const ray of state.tracers){c.save();c.globalAlpha=Math.min(1,(ray.until-state.age)*11);
      c.strokeStyle='#ffdb86';c.lineWidth=2;c.beginPath();c.moveTo(ray.x-state.cam,ray.y-ray.height);c.lineTo(ray.end-state.cam,ray.y-ray.height);c.stroke();c.restore();}
    for(const b of state.shots){if(b.age<0)continue;const x=b.x-state.cam,y=b.y-45;if(b.kind==='shoot'){c.fillStyle='#ffcc76';c.fillRect(x-10,y-1,20,3);continue;}if(b.kind==='pulse'){c.fillStyle='#418cf5';c.fillRect(x-11,y-4,22,8);c.fillStyle='#cbfbff';c.fillRect(x-8,y-2,16,4);continue;}c.fillStyle='#9bff98';c.fillRect(x-5,y-3,10,7);c.fillStyle='#345c54';c.fillRect(x+4*b.dir,y-2,5,4);}
    drawChemicals();
    for(const f of state.sparks){
      if(f.type==='land'){
        const t=1-f.t/.25;c.save();c.globalAlpha=1-t;c.fillStyle='#c0aa8c';
        for(let j=0;j<8;j++)c.fillRect(f.x-state.cam+(j-3.5)*(4+7*t),f.y-2-Math.sin(t*Math.PI)*(j%3+1)*3,5,2+j%2);
        c.restore();continue;
      }
      const x=f.x-state.cam,r=(1-f.t/.25)*27+4;c.strokeStyle=f.type==='acid'?'#c7fd85':f.type==='block'?'#89d9ff':f.type==='hurt'?'#fa786b':'#ffd884';c.lineWidth=3;for(let k=0;k<8;k++){const a=k*Math.PI/4;c.beginPath();c.moveTo(x+Math.cos(a)*r*.5,f.y+Math.sin(a)*r*.5);c.lineTo(x+Math.cos(a)*r,f.y+Math.sin(a)*r);c.stroke();}}
    drawEnemyMeters();
    if(drop&&!state.player.attack){
      const key=inputSource==='pad'?'X · ':inputSource==='touch'?'':'J · ';
      text(key+primary.toUpperCase()+' '+Q.weapons[drop.kind].label.toUpperCase(),Math.max(103,Math.min(856,drop.x-state.cam)),drop.y+16,13,'#ffdf8c','center');
    }
    c.restore();
    const zone=Q.zones[Q.zoneOf(state.wave)];if(lastZone!==zone){lastZone=zone;$('district').textContent=(Q.zoneOf(state.wave)+1)+'/'+Q.zones.length+' · '+zone.toUpperCase();}if(lastScore!==state.score){lastScore=state.score;$('score').textContent=state.score.toLocaleString('es-CO');}
    if(!playing)return;
    const target=state.enemies.find(n=>n.stun>0&&n.hp>0);if(target&&!Q.foes[target.kind].boss){text(labels[target.kind],935,34,15,'#ffe5ae','right');bar(793,42,141,6,target.hp/target.maxHp,'#e78a6f');}
    if(state.combo>1&&state.comboTime>0)text(state.combo+' GOLPES',24,96,22,'#ffcd72');
    if(!state.locked&&state.clears>0)goSignal();
    else if(!state.locked&&Math.floor(state.age*2)%3!==0)text('AVANZA  ▶',937,82,19,'#ffe39b','right');
  }
  function frame(now){const dt=Math.min(.08,(now-last)/1000||0);last=now;pollPad();if(screen==='play'||cinematic()){acc+=dt;while(acc>=1/120){tick(1/120);acc-=1/120;}}else{acc=0;if(screen==='down')state.player.age+=dt;}render();requestAnimationFrame(frame);}
  const paths=Q.characterSprites();paths.city='assets/worlds/distrito-quimera.png';
  paths.port='assets/worlds/quimera-puerto-dique.webp';paths.booth='assets/sprites/quimera-garita.png';paths.drain='assets/sprites/quimera-desague.png';
  paths.supplies='assets/sprites/quimera-suministros.png';
  paths.workers='assets/sprites/trabajadores-carrera-v4.png';paths.heli='assets/sprites/helicoptero-rescate-v3.png';
  paths.waterfront='assets/worlds/quimera-vista-del-muelle.webp';
  paths.actions='assets/sprites/quimera-acciones.webp';paths.armed='assets/sprites/quimera-armados-claves.webp';paths.loot='assets/sprites/quimera-armas-suelo.webp';
  ArcadeLoading.begin(Object.keys(paths).length);
  Promise.all(Object.entries(paths).map(([key,url])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{art[key]=img;ArcadeLoading.step();resolve();};img.onerror=()=>reject(Error(url));img.src=url;}))).then(()=>{
    backdrop();
    const portrait=$('portrait').getContext('2d');portrait.imageSmoothingEnabled=false;portrait.drawImage(art.fighter,31,14,43,43,0,0,36,36);
    ready=true;ArcadeLoading.finish();$('go').disabled=false;$('go').textContent=saved.ending?'Ver desenlace':state.checkpoint?'Continuar zona':'Ver informe de misión';$('go').focus({preventScroll:true});requestAnimationFrame(frame);
  }).catch(()=>{ArcadeLoading.fail();});
  if(new URLSearchParams(location.search).has('debug'))window.__quimera={get state(){return state;},get screen(){return screen;},tick,render};
})();
