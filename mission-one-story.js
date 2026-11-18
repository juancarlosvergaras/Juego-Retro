(function(root){
  'use strict';
  // Historia de la misión 01. El informe previo plantea el contrato y las
  // transmisiones de radio acompañan el ascenso sin detener la partida.
  const briefing=[
    {title:'El contrato',text:'La guerra dejó la ciudad sin ley y con demasiadas recompensas por cobrar.\n\nTe llaman Cap Dollar. Cazas a quien nadie más se atreve a buscar, y esta noche el nombre del contrato es EL CAPATAZ.'},
    {title:'La Obra',text:'Una torre de veinte pisos que nunca se terminó. El Capataz la tomó con su milicia y desde entonces los obreros desaparecen en el turno de noche.\n\nLos que escaparon no hablan de un hombre. Hablan de un lobo blanco.'},
    {title:'La extracción',text:'Vega, tu piloto, no puede aterrizar mientras él siga vivo. Sube, encuéntralo y acaba el trabajo.\n\nEl helicóptero te espera en la azotea. Si llegas.',objectives:['Asciende los 20 pisos de la obra','Da caza al Capataz','Alcanza la azotea y el helicóptero de Vega']}
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
  // Otras misiones reutilizan el informe y la radio pasando su propio guion.
  function mount(host,config={}){
    const doc=root.document,briefing=config.briefing||api.briefing,radio=createRadio(config.beats,config.ambient,config.series),sceneSet=config.scenes||'one';
    const panel=doc.createElement('aside');panel.id='radio';panel.hidden=true;panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
    panel.innerHTML='<span class="radio-icon" aria-hidden="true">◉</span><div><span class="radio-speaker"></span><span class="radio-text"></span></div>';
    host.append(panel);
    const speaker=panel.querySelector('.radio-speaker'),text=panel.querySelector('.radio-text');let shown=null;
    const layer=doc.createElement('section');layer.id='briefing';layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Informe de misión');
    layer.innerHTML='<div class="briefing-card"><canvas class="briefing-scene" width="640" height="250" aria-hidden="true"></canvas><span class="eyebrow"></span><h2></h2><div class="briefing-text" aria-live="polite"></div><ul class="briefing-objectives" hidden></ul><div class="briefing-actions"><button type="button" class="briefing-skip">Saltar informe</button><span class="briefing-step"></span><button type="button" class="briefing-next">Continuar</button></div></div>';
    doc.body.append(layer);
    layer.querySelector('.eyebrow').textContent=config.eyebrow||'MISIÓN 01 · LA OBRA';const scene=layer.querySelector('.briefing-scene'),title=layer.querySelector('h2'),body=layer.querySelector('.briefing-text'),goals=layer.querySelector('.briefing-objectives'),step=layer.querySelector('.briefing-step'),next=layer.querySelector('.briefing-next'),skip=layer.querySelector('.briefing-skip');
    let page=0,typed=0,timer=null,done=null;
    function finish(){if(layer.hidden)return;clearInterval(timer);timer=null;root.ArcadeStoryScenes?.stop();layer.hidden=true;const callback=done;done=null;callback?.();}
    function reveal(){const p=briefing[page];clearInterval(timer);timer=null;typed=p.text.length;body.textContent=p.text;goals.hidden=!p.objectives;}
    function show(){const p=briefing[page];root.ArcadeStoryScenes?.show(scene,page,sceneSet);title.textContent=p.title;step.textContent=(page+1)+' / '+briefing.length;next.textContent=page===briefing.length-1?(config.startLabel||'Comenzar la cacería'):'Continuar';goals.hidden=true;goals.replaceChildren(...(p.objectives||[]).map(o=>{const li=doc.createElement('li');li.textContent='▸ '+o;return li;}));typed=0;body.textContent='';clearInterval(timer);
      if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){reveal();return;}
      timer=setInterval(()=>{typed=Math.min(p.text.length,typed+2);body.textContent=p.text.slice(0,typed);if(typed>=p.text.length)reveal();},22);}
    function advance(){if(typed<briefing[page].text.length){reveal();return;}if(page<briefing.length-1){page++;show();}else finish();}
    next.onclick=advance;skip.onclick=finish;
    layer.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finish();}else if(e.key==='Tab'){e.preventDefault();(doc.activeElement===next?skip:next).focus();}});
    return{radio,epilogue:config.epilogue||epilogue,
      briefingOpen:()=>!layer.hidden,
      briefing(callback){done=callback;page=0;layer.hidden=false;show();next.focus({preventScroll:true});},
      reset(){radio.reset();panel.hidden=true;shown=null;},
      update(c,dt){radio.update(c,dt);},
      render(blocked){const current=blocked?null:radio.state.current;if(current?.id!==shown?.id){shown=current;if(current){speaker.textContent=current.who;text.textContent=current.text;}}panel.hidden=!current;if(current)panel.classList.toggle('leaving',radio.state.age>current.duration-.35);}
    };
  }
  const api={briefing,beats,epilogue,createRadio,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionOneStory=api;
})(typeof window!=='undefined'?window:globalThis);
