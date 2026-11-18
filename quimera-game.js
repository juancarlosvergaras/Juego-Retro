(() => {
  'use strict';
  const Q=ArcadeQuimera,$=id=>document.getElementById(id),canvas=$('arena'),c=canvas.getContext('2d');
  const store=ArcadeDeveloperMode.storage(localStorage),saveKey='cap-dollar.quimera.v1',audio=ArcadeAudio.create();
  let saved={};try{saved=JSON.parse(store.getItem(saveKey)||'{}')||{};}catch{}
  let state=Q.create(saved),screen='ready',ready=false,last=0,acc=0,buffer='',jump=false,buttonAge=0,padKeys=new Set(),lastZone='',lastScore=-1;
  const held=new Set(),touches=new Map(),art={},attacks={KeyJ:'jab',KeyK:'uppercut',KeyL:'kick',KeyI:'sweep'};
  const cinema=ArcadeQuimeraStory,story=cinema.mount(canvas.parentElement,art);
  let sceneTime=0,pausedFrom='play',prizeSaved=false,lastHealth=-1,lastBoss='',lastBossHp=-1;
  const cinematic=()=>screen==='arrival'||screen==='ending';
  const rows=['idle','walk','guard','jump','jab','cross','kick','uppercut','sweep','airkick','hurt','fall','win','throw','pounce','morph','fly','beam'];
  const labels={rifle:'FUSILERO',knife:'CUCHILLERO',warden:'GUARDIÁN',jet:'AEROSOLDADO',infected:'INFECTADO',robot:'AUTÓMATA',blackWolf:'LOBO NEGRO',gunner:'ARTILLERO DEL DIQUE',scientist:'DR. VARELA',lizard:'QUIMERA'};
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
  function clear(){held.clear();padKeys.clear();touches.clear();buffer='';jump=false;buttonAge=0;}
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
  const keyDown=code=>{if(!held.has(code)){if(attacks[code]){buffer=attacks[code];buttonAge=.24;}if(code==='Space')jump=true;}held.add(code);};
  window.addEventListener('keydown',ev=>{if(story.briefingOpen()||screen==='won')return;
    if(cinematic()&&ev.code==='Space'){ev.preventDefault();if(!ev.repeat)endScene();return;}
    if(ev.code==='Escape'||ev.code==='KeyP'){if(!ev.repeat)pause();return;}
    if(screen!=='play')return;if(ev.code.startsWith('Arrow')||ev.code==='Space')ev.preventDefault();keyDown(ev.code);});
  window.addEventListener('keyup',ev=>held.delete(ev.code));
  window.addEventListener('blur',()=>{if(screen==='play'||cinematic())pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(screen==='play'||cinematic()))pause();});
  for(const b of document.querySelectorAll('[data-key]')){
    b.onpointerdown=ev=>{if(screen!=='play')return;ev.preventDefault();b.setPointerCapture(ev.pointerId);touches.set(ev.pointerId,b.dataset.key);keyDown(b.dataset.key);};
    b.onlostpointercapture=ev=>{const code=touches.get(ev.pointerId);touches.delete(ev.pointerId);if(![...touches.values()].includes(code))held.delete(code);};
  }
  const padMap={0:'Space',1:'KeyL',2:'KeyJ',3:'KeyK',4:'ShiftLeft',5:'KeyI',9:'Pause',12:'ArrowUp',13:'ArrowDown',14:'ArrowLeft',15:'ArrowRight'};
  function pollPad(){const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean),next=new Set();if(pad){for(const [i,k] of Object.entries(padMap))if(pad.buttons[i]?.pressed)next.add(k);
    if(Math.abs(pad.axes[0])>.28)next.add(pad.axes[0]<0?'ArrowLeft':'ArrowRight');if(Math.abs(pad.axes[1])>.28)next.add(pad.axes[1]<0?'ArrowUp':'ArrowDown');}
    for(const k of next)if(!padKeys.has(k)){
      if(story.briefingOpen()){if(k==='Space')document.querySelector('.briefing-next').click();if(k==='Pause')document.querySelector('.briefing-skip').click();}
      else if(k==='Pause')pause();else if(screen==='play'){if(attacks[k]){buffer=attacks[k];buttonAge=.24;}if(k==='Space')jump=true;}
      else if(k==='Space'&&ready){if(cinematic())endScene();else if(screen==='won')document.querySelector('.results-next').click();else $('go').click();}
    }
    padKeys=next;
  }
  const pressed=(...keys)=>keys.some(k=>held.has(k)||padKeys.has(k));
  function tick(dt){
    if(cinematic()){
      const before=sceneTime;sceneTime+=dt;
      if(screen==='ending'){
        for(const [at,sound] of [[2.75,'pickup'],[4.75,'plasma'],[5.8,'debris'],[10,'jump']])if(before<at&&sceneTime>=at)audio.play(sound,{gain:.36});
      }
      if(sceneTime>=(screen==='ending'?cinema.endingTime:cinema.arrivalTime))endScene();
      return;
    }
    if(screen!=='play')return;const p=state.player,canAct=!p.attack&&p.stun<=0&&state.hitstop<=0;
    const input={left:pressed('KeyA','ArrowLeft'),right:pressed('KeyD','ArrowRight'),up:pressed('KeyW','ArrowUp'),down:pressed('KeyS','ArrowDown'),guard:pressed('ShiftLeft','ShiftRight'),jump:canAct&&jump,attack:canAct&&(buffer||(pressed('KeyJ')?'jab':''))};
    if(canAct){buffer='';jump=false;}else if((buttonAge-=dt)<=0)buffer='';
    const events=Q.update(state,input,dt);
    story.update(state,dt);
    for(const e of events){if(e==='checkpoint')saveCheckpoint();if(e==='wave'){
      const lead=Q.waves[state.wave].cast[0].kind;
      $('notice').textContent={blackWolf:'El Lobo Negro baja la cabeza antes de cargar. Sal de su trayectoria.',gunner:'El Artillero del Dique prepara la cinta. Ataca cuando se recaliente el cañón.',scientist:'Varela tiene un frasco de suero.'}[lead]||'¡Emboscada! Vigila los accesos y los flancos.';
    }
      if(e==='clear')$('notice').textContent='Zona despejada. Recoge el botiquín y avanza a la derecha.';
      if(e==='morph')$('notice').textContent='¡El suero está transformando a Varela!';
      if(e==='overheat')$('notice').textContent='¡Cañón recalentado! Acércate al artillero.';
      const sound={shot:'rifle',vial:'grenade',hit:'kick',swing:'claw',jump:'jump',hurt:'hurt',block:'debris',boxHit:'kick',boxBreak:'debris',points:'pickup',knockout:'brake',heal:'pickup',checkpoint:'pickup',morph:'thunder',roar:'whiteRoar'}[e];if(sound)audio.play(sound,{gain:.34});}
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
  const stanceHeight={fighter:74,knife:65,rifle:73,warden:74,jet:55,infected:73,robot:73,
    gunner:69,blackWolf:74,scientist:73,lizard:74};
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
    const shadow=(1-altitude)*(e?Math.min(1,t*3):1);
    if(shadow>0){c.fillStyle='rgba(7,12,13,'+(.62*shadow)+')';c.beginPath();
      c.ellipse(x,floor+1,(22-6*altitude)*scale,4.5*scale,0,0,Math.PI*2);c.fill();}
    let frame=a.act==='walk'&&a.kind!=='jet'?Math.floor(a.stride*12):Math.floor(a.age*13)%12;
    if(a.attack)frame=Math.min(11,Math.floor(12*a.attack.t/Q.moves[a.attack.name].duration));
    else if(a.morph)frame=Math.min(11,Math.floor(12*(1-a.morph/1.8)));
    else if(a.act==='fall')frame=Math.min(11,Math.floor(a.age/.65*12));
    else if(a.strike>0)frame=Math.min(11,Math.floor((.25-a.strike)/.25*12));
    else if(a.stun>0)frame=Math.min(11,Math.floor(a.age/.32*12));
    const gait=art['steps_'+a.kind];
    const onFoot=gait&&(a.act==='walk'||a.act==='idle'||(a.kind==='fighter'&&a.act==='guard'));
    const pose=({bash:'cross',slash:'jab',shoot:'throw',pulse:'throw',charge:'pounce'})[a.act]||a.act;
    const pic=art[a.kind];c.save();c.translate(x,Math.round(floor-(a.z||0)+rise));c.scale(a.face*scale,scale);
    if(a.immune>0&&Math.floor(a.immune*17)%2)c.globalAlpha=.55;
    if(onFoot){
      const phase=a.gaitWeight>.06?a.stride:state.age*.7;
      cinema.drawGait(c,gait,phase,a.gaitWeight);
    }else c.drawImage(pic,frame*120,Math.max(0,rows.indexOf(pose))*98,120,98,-53,-91,120,98);
    c.restore();c.restore();
    if(a.kind!=='fighter'&&a.hp>0&&!e){const top=floor-(a.z||0)-stanceHeight[a.kind]*scale;bar(x-18,top-10,36,3,a.hp/a.maxHp,'#eaa96a');if(a.wind>0)text('!',x,top-16,20,'#ffd160','center');}
    if(a.kind==='gunner'&&a.hp>0&&a.overheat>0){
      const muzzle=x+52*a.face;
      c.fillStyle='#ffa954';c.fillRect(muzzle-4,floor-58,8,3);
      for(let i=0;i<4;i++){const phase=(state.age*1.5+i/4)%1;c.fillStyle='rgba(196,194,170,'+(.65*(1-phase))+')';c.fillRect(muzzle+Math.sin(phase*8+i)*4,floor-61-phase*32,4+phase*4,4);}
    }
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
    const boss=playing&&state.enemies.find(n=>Q.foes[n.kind].boss&&!n.entry);
    $('boss-strip').hidden=!boss;
    if(boss&&(lastBoss!==boss.kind||lastBossHp!==boss.hp)){lastBoss=boss.kind;lastBossHp=boss.hp;$('boss-name').textContent=labels[boss.kind];$('boss-fill').style.width=(100*boss.hp/boss.maxHp)+'%';}
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
    [...visible,...supplies,...state.enemies,state.player].sort((a,b)=>a.y-b.y).forEach(a=>{
      if(a.route)drawPortal(a);else if(Q.supplies[a.kind])drawSupply(a);else actor(a);
    });
    for(const b of state.shots){if(b.age<0)continue;const x=b.x-state.cam,y=b.y-45;if(b.kind==='shoot'){c.fillStyle='#ffcc76';c.fillRect(x-10,y-1,20,3);continue;}if(b.kind==='pulse'){c.fillStyle='#418cf5';c.fillRect(x-11,y-4,22,8);c.fillStyle='#cbfbff';c.fillRect(x-8,y-2,16,4);continue;}c.fillStyle='#9bff98';c.fillRect(x-5,y-3,10,7);c.fillStyle='#345c54';c.fillRect(x+4*b.dir,y-2,5,4);}
    for(const f of state.sparks){const x=f.x-state.cam,r=(1-f.t/.25)*27+4;c.strokeStyle=f.type==='block'?'#89d9ff':f.type==='hurt'?'#fa786b':'#ffd884';c.lineWidth=3;for(let k=0;k<8;k++){const a=k*Math.PI/4;c.beginPath();c.moveTo(x+Math.cos(a)*r*.5,f.y+Math.sin(a)*r*.5);c.lineTo(x+Math.cos(a)*r,f.y+Math.sin(a)*r);c.stroke();}}
    c.restore();
    const zone=Q.zones[Q.zoneOf(state.wave)];if(lastZone!==zone){lastZone=zone;$('district').textContent=(Q.zoneOf(state.wave)+1)+'/'+Q.zones.length+' · '+zone.toUpperCase();}if(lastScore!==state.score){lastScore=state.score;$('score').textContent=state.score.toLocaleString('es-CO');}
    if(!playing)return;
    const target=state.enemies.find(n=>n.stun>0&&n.hp>0);if(target&&!Q.foes[target.kind].boss){text(labels[target.kind],935,34,15,'#ffe5ae','right');bar(793,42,141,6,target.hp/target.maxHp,'#e78a6f');}
    if(state.combo>1&&state.comboTime>0)text(state.combo+' GOLPES',24,96,22,'#ffcd72');
    if(!state.locked&&screen==='play'&&Math.floor(state.age*2)%3!==0)text('AVANZA  ▶',937,82,19,'#ffe39b','right');
  }
  function frame(now){const dt=Math.min(.08,(now-last)/1000||0);last=now;pollPad();if(screen==='play'||cinematic()){acc+=dt;while(acc>=1/120){tick(1/120);acc-=1/120;}}else{acc=0;if(screen==='down')state.player.age+=dt;}render();requestAnimationFrame(frame);}
  const paths=Object.fromEntries(['fighter',...Object.keys(Q.foes),'hero'].map(k=>[k,'assets/sprites/quimera-'+k+'.png']));paths.city='assets/worlds/distrito-quimera.png';
  paths.port='assets/worlds/quimera-puerto-dique.webp';paths.booth='assets/sprites/quimera-garita.png';paths.drain='assets/sprites/quimera-desague.png';
  paths.supplies='assets/sprites/quimera-suministros.png';
  paths.workers='assets/sprites/trabajadores-carrera-v4.png';paths.heli='assets/sprites/helicoptero-rescate-v3.png';
  paths.waterfront='assets/worlds/quimera-vista-del-muelle.webp';
  for(const kind of Object.keys(Q.stepSpan))paths['steps_'+kind]='assets/sprites/quimera-pasos-'+kind+'.webp';
  ArcadeLoading.begin(Object.keys(paths).length);
  Promise.all(Object.entries(paths).map(([key,url])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{art[key]=img;ArcadeLoading.step();resolve();};img.onerror=()=>reject(Error(url));img.src=url;}))).then(()=>{
    backdrop();
    const portrait=$('portrait').getContext('2d');portrait.imageSmoothingEnabled=false;portrait.drawImage(art.fighter,31,14,43,43,0,0,36,36);
    ready=true;ArcadeLoading.finish();$('go').disabled=false;$('go').textContent=saved.ending?'Ver desenlace':state.checkpoint?'Continuar zona':'Ver informe de misión';$('go').focus({preventScroll:true});requestAnimationFrame(frame);
  }).catch(()=>{ArcadeLoading.fail();});
  if(new URLSearchParams(location.search).has('debug'))window.__quimera={get state(){return state;},get screen(){return screen;},tick,render};
})();
