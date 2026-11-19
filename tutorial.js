(function(root){
  'use strict';
  const key='cap-dollar.tutorial.v1';
  // Only essentials belong to mission one. Advanced combat and power combinations
  // are deliberately left out; later missions can supply their own lesson set.
  const lessons=[
    {id:'move',title:'Muévete por la obra',text:'Usa A / D o las flechas ← / → para caminar. Avanza hacia la derecha.',when:()=>true,done:c=>(c.input.left||c.input.right)&&Math.abs(c.p.vx)>5},
    {id:'fire',title:'Tu primer disparo',text:'Pulsa J para disparar hacia donde miras. También puedes hacer clic sobre el juego.',when:(c,s)=>s.moved,done:c=>c.input.fire},
    {id:'jump',title:'Supera los obstáculos',text:'Pulsa Espacio para saltar. Púlsalo otra vez en el aire para dar una voltereta.',when:(c,s)=>s.seen.has('fire'),done:c=>c.input.jumpPressed},
    {id:'ladder',title:'Sube al siguiente piso',text:'Acércate a la escalera y mantén W o ↑ para subir. S o ↓ te permite bajar.',when:c=>c.ladders.some(l=>Math.abs(l.x-c.p.x)<55&&c.p.y>=l.top-10&&c.p.y<=l.bottom+12),done:c=>!!c.p.ladder},
    {id:'weapons',title:'Prueba el arma que recogiste',text:'Elige un arma disponible con las teclas 1–9 o con los botones de la barra inferior. Vigila su munición.',when:c=>c.e.inventory.owned.length>2,done:c=>![1,3].includes(c.e.inventory.selected)},
    {id:'jet',title:'Controla el jetpack',text:'Usa WASD o las flechas para volar. Mantén Shift para acelerar: consume el doble de gasolina. Suelta las direcciones para flotar y pulsa F para apagarlo. Los soldados cercanos lo oyen.',when:c=>!!c.p.jetpack,done:c=>!c.p.jetpack},
    {id:'grip',title:'Agárrate bajo la plataforma',text:'Pulsa E para agarrarte al techo cercano. A / D te desplazan; W permite trepar por un borde. Suelta con E o Espacio.',when:c=>c.floor>=3&&c.hookAvailable,done:c=>!!c.p.rope},
    {id:'form',title:'Has desbloqueado al lobo',text:'Pulsa T para alternar entre soldado y lobo. En forma de lobo, J da un zarpazo. Ya puedes subir a la azotea.',when:c=>c.e.won&&!c.p.transform,done:c=>c.p.form==='soldier'}
  ];
  function create(storage){
    let saved={};try{storage=storage||root.localStorage;saved=JSON.parse(storage.getItem(key)||'{}')||{};}catch{}
    const state={enabled:saved.enabled!==false,seen:new Set(Array.isArray(saved.seen)?saved.seen.filter(id=>lessons.some(l=>l.id===id)):[]),active:null,age:0,gap:0,moved:false,startX:null,progress:false};
    function persist(){try{storage.setItem(key,JSON.stringify({enabled:state.enabled,seen:[...state.seen]}));return true;}catch{return false;}}
    function dismiss(){if(!state.active)return;state.seen.add(state.active.id);state.active=null;state.age=0;state.gap=3;persist();}
    return {state,
      setEnabled(enabled){state.enabled=!!enabled;state.active=null;state.age=0;state.gap=0;return persist();},
      reset(){state.seen.clear();state.active=null;state.age=0;state.gap=0;state.moved=false;state.startX=null;return persist();},
      dismiss,
      update(c,dt){
        if(!state.enabled||c.blocked||c.mission!==1)return;
        state.startX??=c.p.x;if(Math.abs(c.p.x-state.startX)>40)state.moved=true;
        if(state.active){state.age+=dt;state.progress ||= state.active.done(c);if(state.age>=3&&state.progress||state.age>=14)dismiss();return;}
        state.gap=Math.max(0,state.gap-dt);if(state.gap>0)return;
        const next=lessons.find(l=>!state.seen.has(l.id)&&l.when(c,state));
        if(next){state.active=next;state.age=0;state.progress=false;}
      }
    };
  }
  const touchLessons={"move": "Arrastra la palanca para moverte. Al borde corres; en diagonal también puedes apuntar.", "fire": "Mantén Atacar y dirige la palanca para apuntar, incluso en diagonal.", "jump": "Toca Saltar. Tócalo otra vez en el aire para dar un segundo salto.", "ladder": "Junto a una escalera, mueve la palanca arriba o abajo para subir o bajar.", "weapons": "Toca Arma ↻ para recorrer las armas recogidas. Arriba verás la elegida y su munición.", "jet": "Toca Jetpack para encenderlo o apagarlo. La palanca dirige el vuelo; al borde usas turbo y gastas más gasolina.", "grip": "Mantén Gancho cerca del techo. La palanca te desplaza y permite trepar; Saltar te suelta.", "form": "Toca el botón con el nombre de tu personaje para cambiar de forma. Atacar da zarpazos cuando eres lobo."};
  function mount(host,controller,onDismiss){
    const panel=document.createElement('aside');panel.id='tutorial-hint';panel.hidden=true;panel.setAttribute('aria-label','Tutorial');
    panel.innerHTML='<div role="status" aria-live="polite" aria-atomic="true"><span class="tutorial-label">TUTORIAL · MISIÓN 01</span><strong></strong><p></p></div><button type="button">Entendido</button>';
    host.append(panel);let previous=null,previousTouch=null;
    const title=panel.querySelector('strong'),text=panel.querySelector('p');
    panel.querySelector('button').onclick=()=>{controller.dismiss();panel.hidden=true;onDismiss?.();};
    return {render(blocked,playerOnLeft=false){const current=controller.state.enabled&&!blocked?controller.state.active:null;panel.hidden=!current;panel.classList.toggle('tutorial-right',playerOnLeft);const touch=!!root.ArcadeMobile?.active;if(current&&(current!==previous||touch!==previousTouch)){title.textContent=current.title;text.textContent=touch?(touchLessons[current.id]||current.text):current.text;}previous=current;previousTouch=touch;}};
  }
  const api={create,mount,lessons};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeTutorial=api;
})(typeof window!=='undefined'?window:globalThis);
