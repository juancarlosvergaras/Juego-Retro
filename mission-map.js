(function(root){
  'use strict';
  // Mapa de misiones con bifurcaciones. Tres rutas corren en paralelo (alta,
  // central y baja); en cada bifurcación basta un mundo para seguir adelante,
  // así que el jugador puede saltarse los otros. Reutiliza las tarjetas del
  // menú: iniciar una misión funciona igual que antes.
  const lanes=[{id:'sky',name:'RUTA ALTA · CIELO Y ESPACIO',y:18},{id:'land',name:'RUTA CENTRAL · TIERRA',y:50},{id:'sea',name:'RUTA BAJA · MAR Y BASES',y:82}];
  const COLUMNS=6;
  const upcoming={};
  const plan=[
    {id:'m1',mission:1,col:0,lane:'land'},{id:'m2',mission:2,col:1,lane:'land'},
    {id:'m3',mission:3,col:2,lane:'sky'},{id:'m4',mission:4,col:2,lane:'land'},{id:'m5',mission:5,col:2,lane:'sea'},
    {id:'m6',mission:6,col:3,lane:'land'},
    {id:'m7',mission:7,col:4,lane:'sky'},{id:'chase',special:true,col:4,lane:'land'},{id:'assault',special:true,col:4,lane:'sea'},
    {id:'m8',mission:8,col:5,lane:'land'}
  ];
  const links=[['m1','m2'],['m2','m3'],['m2','m4'],['m2','m5'],['m3','m6'],['m4','m6'],['m5','m6'],['m6','m7'],['m6','chase'],['m6','assault'],['m7','m8'],['chase','m8'],['assault','m8']];
  function graph(){
    const nodes=plan.map(n=>({...n,x:8+n.col*(84/(COLUMNS-1)),y:lanes.find(l=>l.id===n.lane).y}));
    const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const edges=links.map(([a,b])=>({from:byId[a],to:byId[b],soon:!!(byId[a].soon||byId[b].soon)}));
    // Una bifurcación es una columna con más de un mundo: se elige uno.
    const forks=[...new Set(nodes.map(n=>n.col))].filter(col=>nodes.filter(n=>n.col===col).length>1).map(col=>({col,x:8+(col-.5)*(84/(COLUMNS-1)),choices:nodes.filter(n=>n.col===col).map(n=>n.id)}));
    return{nodes,edges,forks};
  }
  // Curva suave entre dos paradas, en el sistema 0–100 del mapa.
  function route(a,b){const mid=(a.x+b.x)/2;return'M'+a.x+' '+a.y+' C'+mid+' '+a.y+' '+mid+' '+b.y+' '+b.x+' '+b.y;}
  // done: ya superada · current: la misión de la campaña · choice: alternativa
  // de la misma bifurcación · open: disponible · soon: mundo aún por construir.
  function states(level,nodes,specialCleared=false,chaseCleared=false,completed=[]){
    const last=Math.max(...nodes.filter(n=>n.mission).map(n=>n.mission)),current=Math.max(1,Math.min(last,Math.floor(Number(level)||1))),here=nodes.find(n=>n.mission===current);
    return nodes.map(n=>n.soon?'soon':n.special?((n.id==='assault'?chaseCleared:specialCleared)?'done':n.col===here.col?'choice':'open'):completed.includes(n.mission)?'done':n.mission===current?'current':n.col===here.col?'choice':'open');
  }
  // Un tramo está recorrido cuando lleva a la misión actual o queda detrás de ella.
  function travelled(edge,list,nodes){const state=n=>list[nodes.indexOf(n)];return !edge.soon&&state(edge.from)==='done'&&['done','current','choice'].includes(state(edge.to));}
  function mount(){
    const doc=root.document,page=doc.querySelector('[data-menu-page="levels"]'),list=page?.querySelector('.level-choices');if(!list)return null;
    const source=[...list.children],{nodes,edges,forks}=graph();
    const map=doc.createElement('div');map.className='mission-map';map.setAttribute('role','group');map.setAttribute('aria-label','Mapa de misiones con bifurcaciones');
    for(const lane of lanes){const band=doc.createElement('div');band.className='map-lane lane-'+lane.id;band.style.top=lane.y+'%';band.innerHTML='<span></span>';band.firstChild.textContent=lane.name;map.append(band);}
    const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    const roads=edges.map(edge=>{const base=doc.createElementNS(ns,'path'),lit=doc.createElementNS(ns,'path'),d=route(edge.from,edge.to);base.setAttribute('class','map-road'+(edge.soon?' soon':''));lit.setAttribute('class','map-road-done');base.setAttribute('d',d);lit.setAttribute('d',d);svg.append(base);return lit;});
    roads.forEach(lit=>svg.append(lit));map.append(svg);
    for(const fork of forks){const sign=doc.createElement('div');sign.className='map-fork';sign.style.left=fork.x+'%';sign.innerHTML='<i aria-hidden="true">◆</i><span>BIFURCACIÓN</span><small>elige una ruta</small>';map.append(sign);}
    const cards=nodes.map(node=>{
      if(node.id==='assault'){
        const card=doc.createElement('a');card.className='secondary mission-card';card.href='fuga.html';card.innerHTML='<img src="assets/worlds/fuga-costa.webp" alt=""><div><small>ESPECIAL 02 · PERSECUCIÓN</small><strong>Fuga del Sol</strong><span>Persigue al coupé negro por la costa y cruza su escolta antes del peaje.</span><em>Premio · Invisibilidad</em></div>';return card;
      }
      if(node.special){
        const card=doc.createElement('a');card.className='secondary mission-card';card.href='quimera.html';
        card.innerHTML='<img src="assets/worlds/distrito-quimera.png" alt=""><div><small>ESPECIAL 01 · COMBATE CALLEJERO</small><strong>Distrito Quimera</strong><span>Cruza el muelle con el luchador y enfréntate al doctor Varela en su laboratorio.</span><em>Premio: Centella Azul · Vuelo, rayos oculares y rebote de balas</em></div>';
        return card;
      }
      if(!node.soon){const card=source[node.mission-1];return card;}
      const u=upcoming[node.id],card=doc.createElement('div');card.className='secondary mission-card map-soon-card';card.innerHTML='<div class="map-soon-art" aria-hidden="true">?</div><div><small></small><strong></strong><span></span><em></em></div>';
      card.querySelector('small').textContent=u.label;card.querySelector('strong').textContent=u.name;card.querySelector('span').textContent=u.text;card.querySelector('em').textContent=u.tags;return card;});
    const detail=doc.createElement('div');detail.className='map-detail';
    const hint=doc.createElement('p');hint.className='menu-tip map-hint';hint.textContent='En cada bifurcación basta completar un mundo para seguir: puedes saltarte los demás. ← → avanzan por el camino; ↑ ↓ cambian de ruta.';
    const buttons=nodes.map((node,i)=>{
      const button=doc.createElement('button'),card=cards[i],img=card?.querySelector('img'),title=card?.querySelector('strong')?.textContent||'Misión '+node.mission;
      button.type='button';button.className='map-node lane-'+node.lane;button.style.left=node.x+'%';button.style.top=node.y+'%';
      button.innerHTML='<span class="map-thumb"></span><b></b><span class="map-name"></span>';
      if(img)button.querySelector('.map-thumb').style.backgroundImage='url("'+img.getAttribute('src')+'")';
      button.querySelector('b').textContent=node.soon?'?':node.special?'★':String(node.mission);button.querySelector('.map-name').textContent=title;
      button.onclick=()=>select(i,true);
      button.addEventListener('keydown',e=>{
        let next=-1;
        if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const col=node.col+(e.key==='ArrowRight'?1:-1),options=nodes.filter(n=>n.col===col);if(options.length)next=nodes.indexOf(options.find(n=>n.lane===node.lane)||options.find(n=>n.lane==='land')||options[0]);}
        else if(e.key==='ArrowUp'||e.key==='ArrowDown'){const column=nodes.filter(n=>n.col===node.col).sort((a,b)=>a.y-b.y),at=column.indexOf(node)+(e.key==='ArrowDown'?1:-1);if(column[at])next=nodes.indexOf(column[at]);}
        else return;
        e.preventDefault();e.stopPropagation();if(next>=0){select(next,true);buttons[next].focus({preventScroll:true});}});
      map.append(button);return button;});
    // Every card stays in the document so the menu's own click handlers keep working.
    detail.append(...cards.filter(Boolean));list.before(map,hint,detail);list.hidden=true;
    let selected=0,current=[];
    function select(index,user){selected=index;buttons.forEach((n,i)=>{n.classList.toggle('selected',i===index);n.setAttribute('aria-pressed',String(i===index));});cards.forEach((card,i)=>{if(card)card.hidden=i!==index;});if(user)cards[index]?.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
    const words={done:' · completada',current:' · misión actual',choice:' · ruta alternativa',soon:' · próximamente',open:''};
    function refresh(){
      let level=1,specialCleared=false,chaseCleared=false,completed=[];try{const store=root.ArcadeDeveloperMode?.storage(root.localStorage)||root.localStorage;level=root.ArcadeCampaign?.read(store)?.level||1;completed=root.ArcadeCampaign?.completedMissions(store)||[];const profile=root.ArcadeProgression?.load(store);specialCleared=!!profile?.heroUnlocked;chaseCleared=!!profile?.owned.includes('cloak');}catch{}
      current=states(level,nodes,specialCleared,chaseCleared,completed);
      buttons.forEach((n,i)=>{n.classList.remove('done','current','choice','open','soon');n.classList.add(current[i]);n.setAttribute('aria-label',(nodes[i].soon||nodes[i].special?'Mundo extra · ':'Misión '+nodes[i].mission+' · ')+n.querySelector('.map-name').textContent+words[current[i]]);});
      roads.forEach((lit,i)=>lit.style.display=travelled(edges[i],current,nodes)?'':'none');
      select(Math.max(0,nodes.findIndex(n=>n.mission===level)),false);
    }
    new MutationObserver(()=>{if(!page.hidden)refresh();}).observe(page,{attributes:true,attributeFilter:['hidden']});
    refresh();
    return{refresh,select,get selected(){return selected;},get states(){return current;}};
  }
  const api={lanes,upcoming,graph,route,states,travelled};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionMap={...api,...(mount()||{})};
})(typeof window!=='undefined'?window:globalThis);
