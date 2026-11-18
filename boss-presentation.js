(function(root){
  'use strict';
  // Puesta en escena de los jefes: presentación con nombre, cambio de fase y
  // derrota. No decide nada del combate; solo marca el ritmo (pausa breve,
  // cámara lenta, destello, temblor) y muestra el rótulo.
  const CUES={
    // A mission's own name: no pause, just the card.
    title:{freeze:0,slow:0,scale:1,flash:0,shake:0,banner:3.2,tone:'title'},
    intro:{freeze:.55,slow:0,scale:1,flash:0,shake:.5,banner:2.6,tone:'intro'},
    phase:{freeze:.25,slow:.9,scale:.35,flash:.45,shake:.8,banner:2.4,tone:'phase'},
    defeat:{freeze:.12,slow:1.4,scale:.3,flash:.6,shake:.6,banner:2.6,tone:'defeat'}
  };
  // Estado puro y comprobable; `create` lo conecta al documento.
  function timeline(){
    const s={freeze:0,slow:0,scale:1,flash:0,flashTotal:0,shake:0,banner:0,bars:0,cue:null,queue:[]};
    function start(kind,title,subtitle,kicker){const cue=CUES[kind];if(!cue)return null;s.cue={kind,title,subtitle:subtitle||'',kicker:kicker||'',tone:cue.tone};s.freeze=cue.freeze;s.slow=cue.slow;s.scale=cue.scale;s.flash=s.flashTotal=cue.flash;s.shake=cue.shake;s.banner=cue.banner;return s.cue;}
    return{state:s,
      // Un segundo aviso espera a que termine el primero en lugar de pisarlo.
      cue(kind,title,subtitle,kicker){if(s.banner>0){s.queue.push([kind,title,subtitle,kicker]);return null;}return start(kind,title,subtitle,kicker);},
      // Devuelve el factor de tiempo para la simulación de este fotograma.
      tick(dt){
        let factor=1;
        if(s.freeze>0){s.freeze=Math.max(0,s.freeze-dt);factor=0;}
        else if(s.slow>0){s.slow=Math.max(0,s.slow-dt);factor=s.scale+(1-s.scale)*Math.max(0,1-s.slow/.35)*(s.slow<.35?1:0);}
        s.flash=Math.max(0,s.flash-dt);s.shake=Math.max(0,s.shake-dt);
        if(s.banner>0){s.banner=Math.max(0,s.banner-dt);if(s.banner===0){s.cue=null;if(s.queue.length)start(...s.queue.shift());}}
        s.bars+=((s.banner>.35?1:0)-s.bars)*Math.min(1,dt*7);
        return factor;
      },
      flashAlpha(){return s.flashTotal>0?Math.pow(s.flash/s.flashTotal,1.6)*.85:0;},
      reset(){Object.assign(s,{freeze:0,slow:0,scale:1,flash:0,flashTotal:0,shake:0,banner:0,bars:0,cue:null});s.queue.length=0;}
    };
  }
  function create(host,canvas){
    const doc=root.document,line=timeline(),s=line.state;
    const banner=doc.createElement('div');banner.id='boss-banner';banner.hidden=true;banner.setAttribute('role','status');banner.setAttribute('aria-live','assertive');
    banner.innerHTML='<span class="boss-banner-kicker"></span><strong></strong><span class="boss-banner-sub"></span>';host.append(banner);
    const kicker=banner.querySelector('.boss-banner-kicker'),title=banner.querySelector('strong'),sub=banner.querySelector('.boss-banner-sub');let shown=null;
    // La barra del jefe deja una estela clara que alcanza al daño con retraso.
    const fill=doc.getElementById('boss-fill');let ghost=null;
    if(fill&&fill.parentElement){ghost=doc.createElement('b');ghost.className='boss-ghost';fill.parentElement.insertBefore(ghost,fill);ghost.style.width=fill.style.width||'100%';
      if(root.MutationObserver)new root.MutationObserver(()=>{const next=parseFloat(fill.style.width)||0,now=parseFloat(ghost.style.width)||0;ghost.style.transitionDelay=next<now?'.28s':'0s';ghost.style.width=next+'%';fill.parentElement.classList.toggle('boss-hit',next<now);}).observe(fill,{attributes:true,attributeFilter:['style']});}
    const labels={intro:'AMENAZA DETECTADA',phase:'EL COMBATE CAMBIA',defeat:'OBJETIVO ABATIDO'};
    return{timeline:line,
      title:(kicker,name,subtitle)=>line.cue('title',name,subtitle,kicker),
      intro:(name,subtitle)=>line.cue('intro',name,subtitle),
      phase:(name,subtitle)=>line.cue('phase',name,subtitle),
      defeat:(name,subtitle)=>line.cue('defeat',name,subtitle),
      tick:dt=>line.tick(dt),reset(){line.reset();banner.hidden=true;shown=null;canvas?.classList.remove('boss-shake');},
      // Destello y bandas de cine, dibujados sobre la escena ya terminada.
      draw(c,w,h){
        if(s.bars>.01){const bar=Math.round(h*.085*s.bars);c.fillStyle='#05080d';c.fillRect(0,0,w,bar);c.fillRect(0,h-bar,w,bar);}
        const a=line.flashAlpha();if(a>.01){c.fillStyle='rgba(255,246,228,'+a.toFixed(3)+')';c.fillRect(0,0,w,h);}
        const cue=s.cue;if(cue!==shown){shown=cue;banner.hidden=!cue;if(cue){banner.className='tone-'+cue.tone;kicker.textContent=cue.kicker||labels[cue.kind]||'';title.textContent=cue.title;sub.textContent=cue.subtitle;}}
        if(cue)banner.classList.toggle('leaving',s.banner<.4);
        canvas?.classList.toggle('boss-shake',s.shake>0);
      }
    };
  }
  const api={CUES,timeline,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeBossPresentation=api;
})(typeof window!=='undefined'?window:globalThis);
