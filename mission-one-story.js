(function(root){
  'use strict';
  // Historia de la misión 01. La intro y el epílogo se ven a pantalla completa
  // (story-cinema.js, planos en mission-one-scenes.js); la radio acompaña el
  // ascenso sin detener la partida. Cada página es un subtítulo de su plano, en
  // orden; una página sin texto deja el plano en silencio.
  const briefing=[
    {text:'La guerra terminó. La ciudad se quedó sin ley y con demasiadas recompensas por cobrar.'},
    {text:'Lo llaman Cap Dollar. Caza a quien nadie más se atreve a buscar. Vega pilota; él cobra.'},
    {text:'El contrato de esta noche se llama el Capataz. Tomó una torre a medio construir, y los obreros dejaron de volver a casa.'},
    {text:'Los que escaparon no hablan de un hombre. Hablan de un lobo blanco.'}
  ];
  // Tras el vuelo de victoria: la mordida y el rastro que deja.
  const outro=[
    {text:'El Capataz cayó. Pero antes de caer alcanzó a morder, y esa mordida no sangra: arde.'},
    {text:'Sus últimas palabras hablaban de un rey enterrado al otro lado de la ciudad. Vega ya puso rumbo.'}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'Cap, aquí Vega. Te recojo en la azotea cuando caiga el Capataz. Son veinte pisos: no te entretengas.',when:c=>c.arrived},
    {id:'workers',who:CAP,text:'Los obreros huyen. Todavía queda gente viva en este sitio.',when:c=>c.workersAlerted},
    {id:'militia',who:VEGA,text:'Milicia del Capataz. Disparan a todo lo que se mueve: cúbrete tras las losas.',when:c=>c.enemyAlert},
    {id:'hurt',who:VEGA,text:'Estás sangrando, Cap. Busca un botiquín rojo antes de seguir subiendo.',when:c=>c.hp<=2&&c.hp>0&&!c.won},
    {id:'floor5',who:VEGA,text:'Piso cinco. Hay un depósito de gasolina un piso más arriba; tu jetpack lo agradecerá.',when:c=>c.floor>=5},
    {id:'floor10',who:VEGA,text:'Mitad del camino. Los sensores captan algo grande ahí arriba… y no tiene pulso humano.',when:c=>c.floor>=10},
    {id:'floor15',who:CAP,text:'Marcas de garra en el hormigón. Esto no figuraba en el contrato.',when:c=>c.floor>=15},
    {id:'boss',who:VEGA,text:'¡Ahí está! El Capataz… o lo que queda de él. ¡Es el Lobo Blanco!',when:c=>c.bossActive},
    {id:'bite',who:CAP,text:'Me ha mordido antes de caer. Algo cambia dentro de mí… fuerza. Hambre.',when:c=>c.won&&!c.transforming},
    {id:'roof',who:VEGA,text:'Tus constantes se han disparado, Cap. Sea lo que sea, úsalo: la escalera a la azotea está abierta.',when:c=>c.won&&!c.transforming,after:'bite'},
    {id:'black',who:VEGA,text:'¡Otro más! Negro, enorme y armado. Ese es el que manda en la manada.',when:c=>c.finalActive},
    {id:'mutate',who:VEGA,text:'¡No se muere! ¡Está mutando! ¡Acaba con él, Cap!',when:c=>c.finalStage===2},
    {id:'rescue',who:VEGA,text:'¡Azotea despejada! Te tengo a la vista. Sujétate: nos vamos de aquí.',when:c=>c.extraction}
  ];
  const epilogue='El Capataz solo era un perro guardián. La manada obedece a un rey, y Vega ya ha puesto rumbo a su puerta.';
  // `list` son los avisos de la mision; `ambient` marca los que caducan cuando
  // llega un aviso de historia y `series` los que se sustituyen entre si.
  function createRadio(list=beats,ambient=/^(workers|militia|hurt|floor)/,series=/^floor/){
    const beats=list,state={seen:new Set(),queue:[],current:null,age:0,gap:0,primed:false};
    return{state,
      reset(){state.seen.clear();state.queue.length=0;state.current=null;state.age=0;state.gap=0;state.primed=true;},
      // Al reanudar una partida, lo ya vivido no se repite.
      prime(c){state.primed=true;for(const b of beats)if(b.id!=='start'&&b.when(c))state.seen.add(b.id);},
      update(c,dt){
        if(!state.primed)this.prime(c);
        for(const b of beats)if(!state.seen.has(b.id)&&(!b.after||state.seen.has(b.after))&&b.when(c)){state.seen.add(b.id);const story=!ambient.test(b.id);
          // Un aviso atrasado no debe sonar despues de lo que anuncia.
          state.queue=state.queue.filter(q=>story?!ambient.test(q.id):!(series.test(q.id)&&series.test(b.id)));state.queue.push(b);}
        if(state.current){state.age+=dt;if(state.age>=state.current.duration){state.current=null;state.gap=.6;}}
        else if(state.gap>0)state.gap=Math.max(0,state.gap-dt);
        else if(state.queue.length){const next=state.queue.shift();state.current={...next,duration:Math.max(4,2.2+next.text.length*.055)};state.age=0;}
        return state.current;
      }
    };
  }
  // Otras misiones reutilizan la historia y la radio pasando su propio guion:
  // config = {briefing, outro, beats, eyebrow, scenes, epilogue, ambient, series}.
  // La API que usan los motores no cambia: briefing(cb), briefingOpen(), reset(),
  // update(), render() y epilogue; outro(cb) y finale(datos, cb) son nuevas y, sin
  // reproductor o sin planos, llaman al callback en el acto.
  function mount(host,config=api.config){
    const doc=root.document,pages=config.briefing||api.briefing,radio=createRadio(config.beats,config.ambient,config.series),set=config.scenes||'one';
    const panel=doc.createElement('aside');panel.id='radio';panel.hidden=true;panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
    panel.innerHTML='<span class="radio-icon" aria-hidden="true">◉</span><div><span class="radio-speaker"></span><span class="radio-text"></span></div>';
    host.append(panel);
    const speaker=panel.querySelector('.radio-speaker'),text=panel.querySelector('.radio-text');let shown=null;
    const Cinema=root.ArcadeStoryCinema,Scenes=root.ArcadeStoryScenes,player=Cinema?.create(doc)||null;
    // Las imágenes de los planos se piden ya, sin esperar: un plano dibuja lo que haya llegado.
    try{Scenes?.load(set);}catch{}
    const eyebrow=config.eyebrow||'MISIÓN 01 · LA OBRA';
    // Una sola llamada al callback, aunque se salte, se cierre o falle el reproductor.
    function run(kind,list,options,label,callback,extra={}){
      let called=false;const done=()=>{if(called)return;called=true;callback?.();};
      // Las imágenes que solo usa esta secuencia (p. ej. 'eight:finale') se piden ahora.
      try{Scenes?.load(set+':'+kind);}catch{}
      const shots=Scenes?.sequence?.(set,kind)||[];
      if(!player||!Cinema||!shots.length||!list?.length){done();return false;}
      const cues=Cinema.buildCues(list,shots,options);
      if(!cues.length||!player.play({cues,label,theme:extra.theme,data:extra.data,onDone:done})){done();return false;}
      return true;
    }
    return{radio,epilogue:config.epilogue||epilogue,player,
      briefingOpen:()=>!!player?.isOpen(),
      briefing(callback){return run('intro',pages,{title:Cinema?.titleFrom(eyebrow)},'Historia · '+eyebrow,callback);},
      outro(callback){return run('outro',config.outro,{},'Epílogo · '+eyebrow,callback);},
      finale(data,callback){const script=typeof config.finale?.script==='function'?config.finale.script(data||{}):config.finale?.script;return run('finale',script,{},'Final de la campaña',callback,{theme:config.finale?.theme,data});},
      reset(){radio.reset();panel.hidden=true;shown=null;},
      update(c,dt){radio.update(c,dt);},
      render(blocked){const current=blocked?null:radio.state.current;if(current?.id!==shown?.id){shown=current;if(current){speaker.textContent=current.who;text.textContent=current.text;}}panel.hidden=!current;if(current)panel.classList.toggle('leaving',radio.state.age>current.duration-.35);}
    };
  }
  const config={briefing,outro,beats,epilogue,eyebrow:'MISIÓN 01 · LA OBRA',scenes:'one'};
  const api={briefing,outro,beats,epilogue,config,createRadio,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionOneStory=api;
})(typeof window!=='undefined'?window:globalThis);
