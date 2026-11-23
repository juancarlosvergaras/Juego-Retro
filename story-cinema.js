(function(root){
  'use strict';
  // Reproductor de historia a pantalla completa: intros, epílogos y el final.
  //  · Parte pura (guion → cues, reloj por tiempo real, encuadre): se prueba en Node.
  //  · Parte de página: una capa modal con un lienzo que ocupa toda la ventana,
  //    franjas de cine, subtítulos mecanografiados y entrada por teclado, ratón y mando.
  // Un «plano» es {id, dur, draw(c, t, v)}: dibuja en un escenario de 540 de alto y
  // ancho variable (v.w, de 720 a 1320 según la ventana), con t en segundos reales.
  const STAGE_H=540,MIN_W=720,MAX_W=1320,MAX_PIXELS=1600;
  // Ritmo de lectura: letras por segundo, pausa antes de escribir, y espera tras la última letra.
  const TYPE_RATE=48,TYPE_DELAY=.4,HOLD=1.5,READ=.03,TITLE_HOLD=3.6,FADE=.5,DEBOUNCE=.2,MAX_DT=2,CAPTION=150;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const ease=u=>{u=clamp(u);return u*u*(3-2*u);};

  // ───────────────────────────── Parte pura ─────────────────────────────
  // Un texto largo se reparte en subtítulos breves: por párrafos y, si hace falta, por frases.
  function captions(text,max=CAPTION){
    const out=[];
    for(const block of String(text||'').split(/\n\s*\n/)){
      const clean=block.replace(/\s+/g,' ').trim();if(!clean)continue;
      if(clean.length<=max){out.push(clean);continue;}
      let line='';
      for(const sentence of clean.match(/[^.!?…]+[.!?…]+[»"”)]*\s*|[^.!?…]+$/g)||[clean]){
        if(line&&(line+sentence).trim().length>max){out.push(line.trim());line='';}
        line+=sentence;
      }
      if(line.trim())out.push(line.trim());
    }
    return out;
  }
  const readTime=text=>{const n=text?text.length:0;return n?TYPE_DELAY+n/TYPE_RATE+HOLD+n*READ:0;};
  // 'MISIÓN 06 · EL ÚLTIMO CENTRO' → rótulo con antetítulo y nombre.
  function titleFrom(eyebrow){
    const parts=String(eyebrow||'').split(' · ');
    return parts.length>1?{kicker:parts[0],title:parts.slice(1).join(' · ')}:{kicker:'',title:parts[0]};
  }
  // Las viñetas antiguas (c, w, h, t), compuestas para 960×540, se encajan cubriendo el escenario.
  function normalize(shot,index=0){
    if(typeof shot!=='function')return shot;
    return{id:'plano-'+(index+1),dur:8,legacy:true,draw(c,t,v){const k=Math.min(v.w/960,1);c.translate((v.w-960*k)/2,(STAGE_H-540*k)/2);c.scale(k,k);shot(c,960,540,t);}};
  }
  const blank={id:'negro',dur:4,draw(){}};
  // Une el guion (páginas con `text`) con los planos, por orden. Cada subtítulo es un «cue»;
  // varios cues pueden compartir plano. `options.title` añade el rótulo sobre el último plano.
  function buildCues(pages=[],shots=[],options={}){
    const list=[],count=Math.max(pages.length,shots.length);
    for(let i=0;i<count;i++){
      const page=pages[i]||{},shot=shots.length?normalize(shots[Math.min(i,shots.length-1)],i):blank;
      // Una página sin texto deja el plano en silencio; si lleva rótulo, el rótulo ocupa el plano.
      const texts=captions(page.text);if(!texts.length&&!page.title)texts.push('');
      const share=(shot.dur||6)/Math.max(1,texts.length);
      texts.forEach((text,j)=>list.push({shot,text,min:share,title:null,credits:j===texts.length-1&&page.credits?page.credits:null}));
      if(page.title)list.push({shot,text:'',min:page.hold||(texts.length?TITLE_HOLD:shot.dur||TITLE_HOLD),title:page.title,credits:null});
    }
    if(options.title&&list.length)list.push({shot:list[list.length-1].shot,text:'',min:TITLE_HOLD,title:options.title,credits:null});
    return list;
  }
  const cueTime=cue=>Math.max(cue.min||0,readTime(cue.text));
  const duration=list=>list.reduce((sum,cue)=>sum+cueTime(cue),0);

  // Reloj de la secuencia. Avanza con update(dt) en segundos reales: no cuenta cuadros.
  // `still` (movimiento reducido): texto completo de entrada y avance solo manual.
  function createTimeline(list,{still=false,onCue,onDone}={}){
    const state={index:-1,t:0,shotT:0,revealedAt:-1,done:false};
    const cue=()=>list[state.index]||null;
    function enter(index){
      const previous=cue();state.index=index;state.t=0;
      if(!previous||previous.shot!==list[index].shot)state.shotT=0;
      state.revealedAt=still||!list[index].text?0:-1;
      onCue?.(list[index],index);
    }
    function finish(){if(state.done)return;state.done=true;onDone?.();}
    function next(){if(state.done)return;if(state.index+1<list.length)enter(state.index+1);else finish();}
    function typed(){const now=cue();if(!now||!now.text)return 0;if(state.revealedAt>=0)return now.text.length;return clamp(Math.floor((state.t-TYPE_DELAY)*TYPE_RATE),0,now.text.length);}
    // Momento en que el cue cede el paso: su duración mínima o el tiempo de lectura, lo que tarde más.
    function due(){const now=cue();if(!now)return 0;const n=now.text.length,shown=state.revealedAt>=0?state.revealedAt:TYPE_DELAY+n/TYPE_RATE;return Math.max(now.min||0,n?shown+HOLD+n*READ:0);}
    return{state,cue,typed,due,
      start(){if(state.index>=0||state.done)return;if(!list.length){finish();return;}enter(0);},
      update(dt){
        if(state.done||state.index<0||!(dt>0))return;
        state.t+=dt;state.shotT+=dt;
        // Con cuadros muy espaciados, el tiempo que sobra pasa al cue siguiente: la secuencia
        // dura lo mismo a 60 cuadros por segundo que a uno.
        for(let guard=0;guard<list.length&&!state.done;guard++){
          const now=cue();if(state.revealedAt<0&&typed()>=now.text.length)state.revealedAt=TYPE_DELAY+now.text.length/TYPE_RATE;
          if(still||state.t<due())break;
          const over=state.t-due(),shot=now.shot;next();
          if(!state.done){state.t=over;if(cue().shot!==shot)state.shotT=over;}
        }
      },
      // Un toque: primero completa el subtítulo; el siguiente pasa de plano.
      advance(){if(state.done||state.index<0)return'';const now=cue();if(now.text&&typed()<now.text.length){state.revealedAt=state.t;return'reveal';}next();return'next';},
      skip(){finish();},
      shotTime:()=>state.shotT,cueTime:()=>state.t,progress:()=>{const now=cue();return now?clamp(state.t/Math.max(.01,now.min||1)):1;}
    };
  }

  // Encuadre: alto fijo de 540 y ancho según la ventana. Si es más estrecha que 4:3 se
  // recortan los lados; si es más ancha que 22:9, arriba y abajo. Nunca se deforma.
  function stage(pixelWidth,pixelHeight){
    let scale=pixelHeight/STAGE_H,w=pixelWidth/scale;
    if(w<MIN_W)w=MIN_W;else if(w>MAX_W){w=MAX_W;scale=pixelWidth/MAX_W;}
    return{scale,w,h:STAGE_H,ox:(pixelWidth-w*scale)/2,oy:(pixelHeight-STAGE_H*scale)/2};
  }
  // Tamaño del lienzo en píxeles reales, con tope de ancho.
  function pixels(clientWidth,clientHeight,ratio=1){
    const cw=Math.max(1,clientWidth),ch=Math.max(1,clientHeight),width=Math.max(1,Math.min(MAX_PIXELS,Math.round(cw*clamp(ratio||1,1,2))));
    return{width,height:Math.max(1,Math.round(width*ch/cw))};
  }

  // ─────────────────────────── Parte de página ───────────────────────────
  function create(doc=root.document){
    if(!doc?.createElement||!doc.body)return null;
    const make=(tag,name,parent,attrs={})=>{const node=doc.createElement(tag);node.className=name;for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);parent?.append(node);return node;};
    const layer=make('section','story-cinema',null,{role:'dialog','aria-modal':'true','aria-label':'Historia'});layer.id='briefing';layer.hidden=true;
    const canvas=make('canvas','story-canvas',layer,{'aria-hidden':'true'});
    // El botón «siguiente» cubre el escenario: un clic o un toque en cualquier punto pasa de plano.
    const next=make('button','story-next briefing-next',layer,{type:'button','aria-label':'Siguiente plano'});
    make('div','story-bar story-bar-top',layer,{'aria-hidden':'true'});
    const title=make('div','story-title',layer),kicker=make('span','story-kicker',title),name=make('strong','story-name',title),sub=make('span','story-sub',title);title.hidden=true;
    const credits=make('div','story-credits',layer),roll=make('div','story-credits-roll',credits);credits.hidden=true;
    const bottom=make('div','story-bar story-bar-bottom',layer);
    const subtitle=make('p','story-subtitle',bottom,{'aria-hidden':'true'}),live=make('p','story-live',bottom,{'aria-live':'polite'}),hint=make('span','story-hint',bottom,{'aria-hidden':'true'});hint.textContent='▸';
    const skipButton=make('button','story-skip briefing-skip',layer,{type:'button'});skipButton.textContent='Saltar';
    doc.body.append(layer);

    let session=null,timeline=null,raf=0,last=0,view=stage(960,540),still=false,lastAdvance=-1e9,padHeld=new Set(),shownText=null,lastPaint=-1e9,dirty=true;
    const clock=()=>root.performance?.now?.()??Date.now();

    function resize(){
      const size=pixels(layer.clientWidth||root.innerWidth||960,layer.clientHeight||root.innerHeight||540,root.devicePixelRatio);
      if(canvas.width!==size.width||canvas.height!==size.height){canvas.width=size.width;canvas.height=size.height;dirty=true;}
      view=stage(canvas.width,canvas.height);
      // In portrait keep the whole action between the two actors visible.
      if(canvas.width/canvas.height<1){
        const scale=canvas.width/MIN_W;
        view={w:MIN_W,h:STAGE_H,scale,ox:0,oy:(canvas.height-STAGE_H*scale)/2};
      }else if(canvas.width/canvas.height>MAX_W/STAGE_H){
        const scale=canvas.height/STAGE_H;
        view={w:MAX_W,h:STAGE_H,scale,ox:(canvas.width-MAX_W*scale)/2,oy:0};
      }
    }
    function showCue(cue){
      dirty=true;shownText=null;live.textContent=cue.text||(cue.title?[cue.title.kicker,cue.title.title,cue.title.sub].filter(Boolean).join('. '):'');
      title.hidden=!cue.title;
      if(cue.title){kicker.textContent=cue.title.kicker||'';name.textContent=cue.title.title||'';sub.textContent=cue.title.sub||'';title.classList?.toggle('story-title-big',!!cue.title.big);}
      credits.hidden=!cue.credits;
      if(cue.credits){roll.replaceChildren(...cue.credits.map(line=>{const row=doc.createElement(line.kind==='stat'?'div':'p');row.className='story-credit story-credit-'+(line.kind||'line');
        if(line.kind==='stat'){const a=doc.createElement('span'),b=doc.createElement('strong');a.textContent=line.label;b.textContent=line.value;row.append(a,b);}else row.textContent=line.text||'';return row;}));}
    }
    function shotAudio(){
      const shot=timeline.cue()?.shot;
      if(!shot?.sounds||!session.data?.audio)return;
      if(session.audioShot!==shot){session.audioShot=shot;session.soundIndex=0;}
      const time=timeline.shotTime();
      while(session.soundIndex<shot.sounds.length&&shot.sounds[session.soundIndex][0]<=time){
        const [,name,gain]=shot.sounds[session.soundIndex++];
        if(!doc.hidden)session.data.audio.play(name,{gain});
      }
    }
    function paint(now){
      resize();lastPaint=now;dirty=false;
      const cue=timeline.cue();if(!cue)return;
      const c=canvas.getContext?.('2d');
      if(c){
        const shot=cue.shot,length=shot.dur||6,t=still?(shot.still??length*.6):timeline.shotTime();
        c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.fillStyle='#05080d';c.fillRect(0,0,canvas.width,canvas.height);
        c.setTransform(view.scale,0,0,view.scale,view.ox,view.oy);c.imageSmoothingEnabled=false;
        c.save();c.beginPath();c.rect(0,0,view.w,STAGE_H);c.clip();try{shot.draw(c,t,{w:view.w,h:STAGE_H,cx:view.w/2,dur:length,u:clamp(t/length),still,data:session.data||{}});}catch(error){if(!session.warned){session.warned=true;root.console?.warn?.('Plano «'+shot.id+'»:',error);}}c.restore();
        // Cada plano entra desde negro.
        const fade=still?0:1-clamp(timeline.shotTime()/FADE);
        if(fade>0){c.setTransform(1,0,0,1,0,0);c.globalAlpha=fade;c.fillStyle='#05080d';c.fillRect(0,0,canvas.width,canvas.height);c.globalAlpha=1;}
      }
      const text=cue.text.slice(0,timeline.typed());
      if(text!==shownText){shownText=text;subtitle.textContent=text;}
      layer.classList?.toggle('story-ready',!cue.text||text.length>=cue.text.length);
      if(cue.credits){
        // Los créditos suben por tiempo y se detienen con el último bloque a la vista.
        const height=credits.clientHeight||layer.clientHeight||540,content=roll.offsetHeight||height;
        const start=height,end=Math.min(height*.15,height*.92-content);
        const u=still?1:ease(timeline.cueTime()/Math.max(1,(cue.min||8)-1.5));
        roll.style.transform='translateY('+Math.round(start+(end-start)*u)+'px)';
      }
    }
    function pollPad(act=true){
      let pads=null;try{pads=root.navigator?.getGamepads?.();}catch{}
      const held=new Set();if(pads)for(const pad of pads){if(!pad)continue;for(const i of [0,9])if(pad.buttons?.[i]?.pressed)held.add(i);}
      const a=held.has(0)&&!padHeld.has(0),start=held.has(9)&&!padHeld.has(9);padHeld=held;
      if(!act)return;if(start)skip();else if(a)advance();
    }
    function frame(now){
      raf=0;if(!session)return;
      const dt=clamp((now-last)/1000,0,MAX_DT);last=now;
      pollPad();if(!session)return;
      timeline.update(dt);if(!session)return;
      shotAudio();
      // Con planos fijos basta repintar al cambiar algo (o cada medio segundo, por si llega una imagen).
      if(!still||dirty||now-lastPaint>500)paint(now);
      raf=root.requestAnimationFrame(frame);
    }
    function advance(){
      if(!session)return;const now=clock();if(now-lastAdvance<DEBOUNCE*1000)return;lastAdvance=now;
      timeline.advance();if(session)dirty=true;
    }
    function skip(){if(session)timeline.skip();}
    const isGo=e=>e.key===' '||e.key==='Enter'||e.code==='Space'||e.code==='Enter'||e.code==='NumpadEnter';
    function onKey(e){
      if(!session)return;
      // El mando se lee directamente: sus teclas sintéticas (controls.js) no cuentan dos veces.
      if(e.arcadeControl){e.stopImmediatePropagation?.();return;}
      if(e.type==='keydown'){
        if(e.key==='Tab'){e.preventDefault();(doc.activeElement===skipButton?next:skipButton).focus?.({preventScroll:true});}
        else if(e.key==='Escape'){e.preventDefault();skip();}
        else if(isGo(e)){e.preventDefault();if(!e.repeat){if(doc.activeElement===skipButton)skip();else advance();}}
      }else if(isGo(e))e.preventDefault();
      e.stopPropagation();
    }
    function listen(on){
      const method=on?'addEventListener':'removeEventListener';
      doc[method]?.('keydown',onKey,true);doc[method]?.('keyup',onKey,true);
    }
    next.onclick=()=>advance();
    skipButton.onclick=()=>skip();

    // La música de la misión acompaña la historia y vuelve al estado en que estaba.
    function musicOn(theme,mode){
      const music=root.ArcadeMusic?.current;if(!music?.status)return null;
      try{const status=music.status(),was={running:!!status.running,theme:status.theme,mode:status.mode};if(mode)music.setMode?.(mode);if(theme&&theme!==status.theme)music.setTheme(theme);music.setRunning(true);return was;}catch{return null;}
    }
    function musicOff(was,theme){
      const music=root.ArcadeMusic?.current;if(!music||!was)return;
      try{music.setRunning(was.running);if(was.mode)music.setMode?.(was.mode);if(theme&&was.theme!==theme)music.setTheme(was.theme);}catch{}
    }
    function finish(){
      const ended=session;if(!ended)return;session=null;
      if(raf)root.cancelAnimationFrame?.(raf);raf=0;listen(false);
      layer.hidden=true;title.hidden=true;credits.hidden=true;subtitle.textContent='';live.textContent='';shownText=null;
      musicOff(ended.music,ended.theme);
      try{ended.focus?.focus?.({preventScroll:true});}catch{}
      ended.onDone?.();
    }
    // cues: lista de buildCues · theme: tema musical opcional · data: datos para los planos.
    function play({cues=[],label,theme,musicMode,data,onDone}={}){
      if(session){session.onDone=onDone;session.data=data;}
      else{session={onDone,data,theme,music:musicOn(theme,musicMode),focus:doc.activeElement,warned:false};listen(true);}
      still=!!root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      layer.setAttribute('aria-label',label||'Historia');layer.classList?.toggle('story-still',still);layer.hidden=false;
      timeline=createTimeline(cues,{still,onCue:showCue,onDone:finish});
      pollPad(false);last=clock();lastAdvance=last;timeline.start();
      if(!session)return false;
      next.focus?.({preventScroll:true});paint(last);
      if(!raf)raf=root.requestAnimationFrame(frame);
      return true;
    }
    return{layer,canvas,play,advance,skip,isOpen:()=>!!session,timeline:()=>timeline,view:()=>view};
  }

  const api={create,captions,readTime,titleFrom,normalize,buildCues,cueTime,duration,createTimeline,stage,pixels,
    STAGE_H,MIN_W,MAX_W,MAX_PIXELS,TYPE_RATE,TYPE_DELAY,HOLD,READ,TITLE_HOLD};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeStoryCinema=api;
})(typeof window!=='undefined'?window:globalThis);
