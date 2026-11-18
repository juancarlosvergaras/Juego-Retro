(function(root){
  'use strict';
  // Parte de misión: la misma tarjeta de resultados cierra las tres misiones.
  // Recibe cifras ya calculadas; solo las presenta y ofrece continuar o repetir.
  function rows(score,{enemies=[],seconds=0,extra=[]}={}){
    const Kit=typeof module!=='undefined'&&module.exports?require('./mission-kit.js'):root.ArcadeMissionKit;
    const fallen=enemies.filter(n=>n.hp<=0).length;
    return[['Puntos',(score?.total||0).toLocaleString('es-CO')],['Enemigos abatidos',fallen+' / '+enemies.length],['Tiempo',Kit.clock(seconds)],...extra];
  }
  function mount(){
    const doc=root.document;if(!doc)return{};
    const layer=doc.createElement('section');layer.id='mission-results';layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','mission-results-title');
    layer.innerHTML='<div class="results-card"><span class="results-kicker"></span><h2 id="mission-results-title"></h2><dl class="results-rows"></dl><p class="results-epilogue"></p><div class="results-actions"><button type="button" class="results-retry"></button><button type="button" class="results-next"></button></div></div>';
    doc.body.append(layer);
    const kicker=layer.querySelector('.results-kicker'),title=layer.querySelector('h2'),list=layer.querySelector('.results-rows'),epilogue=layer.querySelector('.results-epilogue'),next=layer.querySelector('.results-next'),retry=layer.querySelector('.results-retry');
    let busy=false;
    function hide(){layer.hidden=true;busy=false;}
    function show({kicker:k='MISIÓN COMPLETADA',title:t='',stats=[],epilogue:e='',next:n,retry:r}){
      kicker.textContent=k;title.textContent=t;epilogue.textContent=e;epilogue.hidden=!e;busy=false;
      list.replaceChildren(...stats.map(([label,value],i)=>{const row=doc.createElement('div'),dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=label;dd.textContent=value;row.style.animationDelay=(.25+i*.14).toFixed(2)+'s';row.append(dt,dd);return row;}));
      // Un solo clic cuenta: continuar navega y no debe dispararse dos veces.
      const bind=(button,action)=>{button.hidden=!action;if(!action)return;button.textContent=action.label;button.onclick=()=>{if(busy)return;busy=true;if(action.keepOpen!==true)layer.hidden=true;action.run();};};
      bind(next,n);bind(retry,r);layer.hidden=false;(n?next:retry).focus({preventScroll:true});
    }
    layer.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Tab'){const items=[retry,next].filter(b=>!b.hidden);if(items.length<2){e.preventDefault();return;}e.preventDefault();items[(items.indexOf(doc.activeElement)+1)%items.length].focus();}});
    return{show,hide,isOpen:()=>!layer.hidden};
  }
  const api={rows};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionResults={...api,...mount()};
})(typeof window!=='undefined'?window:globalThis);
