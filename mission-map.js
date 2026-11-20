(function(root){
  'use strict';
  // El eje principal avanza por etapas. Los especiales son desvíos opcionales.
  const lanes=[{id:'sky',name:'RUTA ALTERNATIVA',short:'ALTERNATIVA',y:18},{id:'land',name:'CAMPAÑA',short:'CAMPAÑA',y:50},{id:'sea',name:'MISIONES ESPECIALES',short:'ESPECIALES',y:82}];
  const campaign=typeof module!=='undefined'&&module.exports?require('./campaign'):root.ArcadeCampaign;
  const COLUMNS=6;
  const upcoming={};
  const plan=[
    {id:'m1',mission:1,col:0,lane:'land'},{id:'m2',mission:2,col:1,lane:'land'},
    {id:'m3',mission:3,col:2,lane:'sky'},{id:'m4',mission:4,col:2,lane:'land'},
    {id:'m5',mission:5,col:3,lane:'land'},{id:'fuga',special:true,col:3,lane:'sea'},
    {id:'m6',mission:6,col:4,lane:'land'},{id:'m7',mission:7,col:4,lane:'sky'},
    {id:'quimera',special:true,col:4,lane:'sea'},{id:'m8',mission:8,col:5,lane:'land'}
  ];
  const shortNames={m1:'La obra',m2:'El umbral',m3:'Aire',m4:'Carretera',m5:'Abismo',m6:'Centro',m7:'Espacio',m8:'Nueva York',quimera:'Quimera',fuga:'Fuga'};
  const links=plan.flatMap(n=>campaign.previous[n.id].map(level=>['m'+level,n.id]));
  function graph(){
    const nodes=plan.map(n=>({...n,x:8+n.col*(84/(COLUMNS-1)),y:lanes.find(l=>l.id===n.lane).y}));
    const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const edges=links.map(([a,b])=>({from:byId[a],to:byId[b],soon:!!(byId[a].soon||byId[b].soon)}));
    // Una bifurcación es una columna con más de un mundo: se elige uno.
    const forks=[...new Set(nodes.map(n=>n.col))].filter(col=>nodes.filter(n=>n.col===col&&n.mission).length>1).map(col=>({col,x:8+(col-.5)*(84/(COLUMNS-1)),choices:nodes.filter(n=>n.col===col&&n.mission).map(n=>n.id)}));
    return{nodes,edges,forks};
  }
  // Curva suave entre dos paradas, en el sistema 0–100 del mapa.
  function route(a,b){const mid=(a.x+b.x)/2;return'M'+a.x+' '+a.y+' C'+mid+' '+a.y+' '+mid+' '+b.y+' '+b.x+' '+b.y;}
  // done: ya superada · current: la misión de la campaña · choice: alternativa
  // de la misma bifurcación · open: disponible · soon: mundo aún por construir.
  function states(level,nodes,specialCleared=false,chaseCleared=false,completed=[]){
    const last=Math.max(...nodes.filter(n=>n.mission).map(n=>n.mission)),current=Math.max(1,Math.min(last,Math.floor(Number(level)||1))),here=nodes.find(n=>n.mission===current);
    const next=completed.includes(current)?nodes.filter(n=>n.mission&&campaign.previous[n.id].includes(current)):[];
    return nodes.map(n=>{
      if(n.special)return (n.id==='fuga'?chaseCleared:specialCleared)?'done':'open';
      if(completed.includes(n.mission))return 'done';
      if(n.mission===current)return 'current';
      if(next.includes(n))return next.length>1?'choice':'open';
      return !completed.includes(current)&&n.col===here.col?'choice':'open';
    });
  }
  function locks(level,nodes,completed=[],fighterUnlocked=false,developer=false){
    return nodes.map(n=>!campaign.available(n.id,level,completed,fighterUnlocked,developer));
  }
  // Qué hay que completar para abrir un mundo, en una frase para su tarjeta.
  function requirement(id){
    if(id==='quimera')return 'Consigue el traje de luchador al vencer al Capitán del Abismo.';
    if(id==='fuga')return 'Completa Furia en la Carretera (misión 4).';
    const required=campaign.previous[id]||[];
    if(!required.length)return '';
    return 'Completa '+(required.length===1?'la misión '+required[0]:'una de las misiones '+required.join(' o '))+' para abrir este mundo.';
  }
  // Un tramo está recorrido cuando lleva a la misión actual o queda detrás de ella.
  function travelled(edge,list,nodes){const state=n=>list[nodes.indexOf(n)];return !edge.soon&&state(edge.from)==='done'&&['done','current','choice'].includes(state(edge.to));}
  function mount(){
    const doc=root.document,page=doc.querySelector('[data-menu-page="levels"]'),list=page?.querySelector('.level-choices');if(!list)return null;
    const source=[...list.children],{nodes,edges,forks}=graph();
    const map=doc.createElement('div');map.className='mission-map';map.setAttribute('role','group');map.setAttribute('aria-label','Mapa de misiones con bifurcaciones');
    for(const lane of lanes){const band=doc.createElement('div');band.className='map-lane lane-'+lane.id;band.style.top=lane.y+'%';band.style.setProperty('--y',lane.y+'%');band.dataset.short=lane.short;band.innerHTML='<span></span>';band.firstChild.textContent=lane.name;map.append(band);}
    const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    const roads=edges.map(edge=>{const base=doc.createElementNS(ns,'path'),lit=doc.createElementNS(ns,'path'),d=route(edge.from,edge.to);base.setAttribute('class','map-road'+(edge.soon?' soon':''));lit.setAttribute('class','map-road-done');base.setAttribute('d',d);lit.setAttribute('d',d);svg.append(base);return lit;});
    roads.forEach(lit=>svg.append(lit));map.append(svg);
    for(const fork of forks){const sign=doc.createElement('div');sign.className='map-fork';sign.style.left=fork.x+'%';sign.style.setProperty('--x',fork.x+'%');sign.innerHTML='<i aria-hidden="true">◆</i><span>BIFURCACIÓN</span><small>elige una ruta</small>';map.append(sign);}
    const cards=nodes.map(node=>{
      if(node.id==='fuga'){
        const card=doc.createElement('a');card.className='secondary mission-card';card.href='fuga.html';card.innerHTML='<img src="assets/thumbs/especial-fuga.webp" alt="Carretera costera al atardecer"><div><small>ESPECIAL 02 · PERSECUCIÓN</small><strong>Fuga del Sol</strong><span>Persigue al coupé negro por la costa y cruza su escolta antes del peaje.</span><em>Premio · Invisibilidad</em></div>';return card;
      }
      if(node.special){
        const card=doc.createElement('a');card.className='secondary mission-card';card.href='quimera.html';
        card.innerHTML='<img src="assets/thumbs/especial-quimera.webp" alt="Muelle del distrito Quimera de noche"><div><small>ESPECIAL 01 · COMBATE CALLEJERO</small><strong>Distrito Quimera</strong><span>Cruza el muelle con el luchador y enfréntate al doctor Varela en su laboratorio.</span><em>Premio: Centella Azul · Vuelo, rayos oculares y rebote de balas</em></div>';
        return card;
      }
      if(!node.soon){const card=source[node.mission-1];return card;}
      const u=upcoming[node.id],card=doc.createElement('div');card.className='secondary mission-card map-soon-card';card.innerHTML='<div class="map-soon-art" aria-hidden="true">?</div><div><small></small><strong></strong><span></span><em></em></div>';
      card.querySelector('small').textContent=u.label;card.querySelector('strong').textContent=u.name;card.querySelector('span').textContent=u.text;card.querySelector('em').textContent=u.tags;return card;});
    const detail=doc.createElement('div');detail.className='map-detail';
    const hint=doc.createElement('p');hint.className='menu-tip map-hint';hint.innerHTML='<span>Elige 3 o 4 antes de la misión 5. Después, elige 6 o 7 para llegar a Nueva York.</span> <span class="map-keys">Las flechas recorren el mapa.</span>';
    // Resumen de progreso junto al título y leyenda de estados bajo el mapa.
    const summary=doc.createElement('p');summary.className='map-summary';summary.setAttribute('role','status');
    const legend=doc.createElement('ul');legend.className='map-legend';legend.setAttribute('aria-label','Leyenda del mapa');legend.innerHTML='<li class="done">Completada</li><li class="current">Misión actual</li><li class="choice">Ruta alternativa</li><li class="locked">Bloqueada</li>';
    const foot=doc.createElement('div');foot.className='map-foot';foot.append(legend,hint);
    // En teléfonos en vertical el mapa se dibuja de arriba abajo: las flechas siguen lo que se ve.
    const upright=root.matchMedia?.('(max-width:720px) and (orientation:portrait)');
    const buttons=nodes.map((node,i)=>{
      const button=doc.createElement('button'),card=cards[i],img=card?.querySelector('img'),title=card?.querySelector('strong')?.textContent||'Misión '+node.mission;
      button.type='button';button.className='map-node lane-'+node.lane;button.style.left=node.x+'%';button.style.top=node.y+'%';button.style.setProperty('--x',node.x+'%');button.style.setProperty('--y',node.y+'%');
      button.innerHTML='<span class="map-thumb"></span><b></b><span class="map-name"></span>';
      if(img)button.querySelector('.map-thumb').style.backgroundImage='url("'+img.getAttribute('src')+'")';
      button.querySelector('b').textContent=node.soon?'?':node.special?'★':String(node.mission);button.querySelector('.map-name').textContent=title;button.querySelector('.map-name').dataset.short=shortNames[node.id];
      button.onclick=()=>select(i,true);
      button.addEventListener('keydown',e=>{
        let next=-1;const turned=!!upright?.matches,along=turned?['ArrowDown','ArrowUp']:['ArrowRight','ArrowLeft'],across=turned?['ArrowRight','ArrowLeft']:['ArrowDown','ArrowUp'];
        if(along.includes(e.key)){const col=node.col+(e.key===along[0]?1:-1),options=nodes.filter(n=>n.col===col);if(options.length)next=nodes.indexOf(options.find(n=>n.lane===node.lane)||options.find(n=>n.lane==='land')||options[0]);}
        else if(across.includes(e.key)){const column=nodes.filter(n=>n.col===node.col).sort((a,b)=>a.y-b.y),at=column.indexOf(node)+(e.key===across[0]?1:-1);if(column[at])next=nodes.indexOf(column[at]);}
        else return;
        e.preventDefault();e.stopPropagation();if(next>=0){select(next,true);buttons[next].focus({preventScroll:true});}});
      map.append(button);return button;});
    // Cada tarjeta lleva su aviso de bloqueo; mientras está bloqueada, ni el enlace navega ni el botón inicia la misión.
    const notes=cards.map((card,i)=>{
      if(!card||nodes[i].soon)return null;
      const note=doc.createElement('span');note.className='map-lock-note';note.hidden=true;note.textContent='🔒 Bloqueada · '+requirement(nodes[i].id);(card.querySelector('div')||card).append(note);
      card.addEventListener('click',e=>{if(card.getAttribute('aria-disabled')==='true'){e.preventDefault();e.stopImmediatePropagation();}},true);
      return note;});
    // Every card stays in the document so the menu's own click handlers keep working.
    detail.append(...cards.filter(Boolean));list.before(summary,map,foot,detail);list.hidden=true;
    let selected=0,current=[];
    function select(index,user){selected=index;buttons.forEach((n,i)=>{n.classList.toggle('selected',i===index);n.setAttribute('aria-pressed',String(i===index));});cards.forEach((card,i)=>{if(card)card.hidden=i!==index;});}
    const words={done:' · completada',current:' · misión actual',choice:' · ruta alternativa',soon:' · próximamente',open:''};
    function refresh(){
      const store=root.ArcadeDeveloperMode?.storage(root.localStorage)||root.localStorage;
      const {current:level,completed,fighter,developer}=campaign.profileAccess(store);
      const profile=root.ArcadeProgression?.load(store),specialCleared=!!profile?.heroUnlocked,chaseCleared=!!profile?.owned.includes('cloak');
      current=states(level,nodes,specialCleared,chaseCleared,completed);
      const locked=locks(level,nodes,completed,fighter,developer);
      buttons.forEach((n,i)=>{n.classList.remove('done','current','choice','open','soon');n.classList.add(current[i]);n.classList.toggle('locked',locked[i]);n.setAttribute('aria-label',(nodes[i].soon||nodes[i].special?'Mundo extra · ':'Misión '+nodes[i].mission+' · ')+n.querySelector('.map-name').textContent+(locked[i]?' · bloqueada. '+requirement(nodes[i].id):words[current[i]]));});
      cards.forEach((card,i)=>{
        if(!card||!notes[i])return;card.classList.toggle('map-locked',locked[i]);notes[i].hidden=!locked[i];
        // Sin href un enlace ni navega ni entra en el recorrido de teclado o mando del menú; se devuelve al desbloquear.
        if(locked[i]){card.setAttribute('aria-disabled','true');if(card.hasAttribute('href')){card.dataset.lockedHref=card.getAttribute('href');card.removeAttribute('href');}}
        else{card.removeAttribute('aria-disabled');if(card.dataset.lockedHref){card.setAttribute('href',card.dataset.lockedHref);delete card.dataset.lockedHref;}}
      });
      roads.forEach((lit,i)=>lit.style.display=travelled(edges[i],current,nodes)?'':'none');
      const cleared=nodes.filter((n,i)=>n.mission&&current[i]==='done').length,extras=nodes.filter((n,i)=>n.special&&current[i]==='done').length;
      summary.innerHTML='<b>'+cleared+' / '+nodes.filter(n=>n.mission).length+'</b> misiones · <b>'+extras+' / '+nodes.filter(n=>n.special).length+'</b> especiales';
      const requested=root.location.hash.slice(1),from=nodes.find(n=>n.mission===level);
      const next=completed.includes(level)&&nodes.find(n=>n.mission&&!completed.includes(n.mission)&&campaign.previous[n.id].includes(level));
      const focus=nodes.find(n=>n.id===requested)||next||from||nodes[0];
      select(nodes.indexOf(focus),false);
    }
    new MutationObserver(()=>{if(!page.hidden)refresh();}).observe(page,{attributes:true,attributeFilter:['hidden']});
    refresh();
    return{refresh,select,get selected(){return selected;},get states(){return current;}};
  }
  const api={lanes,upcoming,graph,route,states,locks,requirement,travelled};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionMap={...api,...(mount()||{})};
})(typeof window!=='undefined'?window:globalThis);
