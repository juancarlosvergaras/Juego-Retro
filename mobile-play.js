(function(root){
 'use strict';
 const {contacts,QUERY}=typeof module!=='undefined'&&module.exports?require('./touch-screen'):root.ArcadeTouchScreen;
 function stickActions(x,y){
  const distance=Math.hypot(x,y);if(distance<.22)return[];
  const angle=Math.round(Math.atan2(y,x)/(Math.PI/4))*Math.PI/4,dx=Math.cos(angle),dy=Math.sin(angle),ids=[];
  if(dx<-.4)ids.push('left');if(dx>.4)ids.push('right');if(dy<-.4)ids.push('up');if(dy>.4)ids.push('down');
  if(distance>.86)ids.push('run');return ids;
 }
 function mount(){
  const doc=root.document,card=doc.querySelector('.game-card'),viewport=doc.querySelector('.viewport');if(!card||!viewport)return{};
  const media=root.ArcadeTouchScreen.media;let active=false,locked=true,descending=false;
  const hud=doc.createElement('div');hud.className='mobile-hud';hud.setAttribute('aria-label','Estado del jugador');
  hud.innerHTML='<div class="mobile-life"><small>VIDA</small><strong></strong><progress max="100" value="100" aria-label="Salud"></progress></div><div class="mobile-loadout"><strong></strong><small></small></div><div class="mobile-resources"><strong></strong><small></small></div>';
  card.insertBefore(hud,viewport);
  const controls=doc.createElement('section');controls.className='mobile-controls';controls.setAttribute('aria-label','Controles táctiles');
  controls.innerHTML='<div class="mobile-stick-area"><div class="mobile-stick" role="group" aria-label="Palanca de movimiento y puntería: arrastra en ocho direcciones; al borde corres"><span class="stick-arrows" aria-hidden="true">✥</span><i aria-hidden="true"></i></div><small>AL BORDE: CORRER</small></div><div class="mobile-actions"><button type="button" data-mobile-action="fire" class="mobile-fire">Atacar</button><button type="button" data-mobile-action="jump" class="mobile-jump">Saltar</button><button type="button" data-mobile-action="kick" class="mobile-kick">Patada</button></div><div class="mobile-tools"><button type="button" data-mobile-action="form" aria-label="Cambiar personaje">Forma</button><button type="button" data-mobile-action="nextWeapon" aria-label="Seleccionar arma siguiente">Arma ↻</button><button type="button" data-mobile-action="hook" aria-label="Mantener gancho">Gancho</button><button type="button" data-mobile-action="jet" aria-label="Activar o apagar jetpack">Jetpack</button><button type="button" data-mobile-action="power" aria-label="Usar poder equipado">Poder</button><button type="button" data-mobile-action="cyclePower" aria-label="Cambiar poder equipado">Poder ↻</button></div>';
  viewport.after(controls);
  const stick=controls.querySelector('.mobile-stick'),knob=stick.querySelector('i'),buttons=[...controls.querySelectorAll('button')];
  const send=(id,ids)=>root.ArcadeControls?.setTouch(id,ids);
  function moveStick(id,el,e){
   if(el!==stick)return;
   const r=stick.getBoundingClientRect(),radius=r.width/2,x=(e.clientX-r.left-radius)/radius,y=(e.clientY-r.top-radius)/radius,len=Math.max(1,Math.hypot(x,y));
   send(id,descending?stickActions(x,y).filter(a=>a==='down'):stickActions(x,y));
   knob.style.transform='translate('+Math.round(x/len*radius*.55)+'px,'+Math.round(y/len*radius*.55)+'px)';
  }
  const pad=root.ArcadeTouchScreen.bindPads([stick,...buttons],{
   stick,allow:()=>active&&!locked,
   down(id,el,e){if(el===stick)moveStick(id,el,e);else send(id,[descending?'down':el.dataset.mobileAction]);},
   move:moveStick,
   up(id,el){send(id,[]);if(el===stick)knob.style.transform='translate(0,0)';}
  });
  const release=pad.clear;
  for(const button of buttons)button.addEventListener('click',e=>{
   if(e.detail===0&&active&&!locked&&!button.disabled){send('accessible',[descending?'down':button.dataset.mobileAction]);send('accessible',[]);}
  });
  const stars=doc.createElement('span');stars.className='mobile-stars';card.querySelector('.game-toolbar').append(stars);
  function layout(){release();active=media.matches;doc.documentElement.classList.toggle('mobile-play',active);}
  if(media.addEventListener)media.addEventListener('change',layout);else media.addListener(layout);layout();
  const nodes={health:hud.querySelector('.mobile-life strong'),life:hud.querySelector('progress'),weapon:hud.querySelector('.mobile-loadout strong'),power:hud.querySelector('.mobile-loadout small'),jumps:hud.querySelector('.mobile-resources strong'),fuel:hud.querySelector('.mobile-resources small'),form:controls.querySelector('[data-mobile-action="form"]'),kick:controls.querySelector('[data-mobile-action="kick"]')};
  const text=(node,value)=>{value=String(value);if(node.textContent!==value)node.textContent=value;};
  function update(p,e,profile,powers,blocked,arrival=false){
   if(!active)return;if(blocked&&!locked||descending!==!!arrival)release();locked=!!blocked;descending=!!arrival;for(const b of buttons){const disabled=locked||descending&&b.dataset.mobileAction!=='jump';if(b.disabled!==disabled)b.disabled=disabled;}text(controls.querySelector('[data-mobile-action="jump"]'),descending?'Descender':p.burrow?'Emerger':'Saltar');
   const zombie=p.form==='zombie',wolf=p.form==='wolf',w=root.ArcadeArsenal.weapons[e.inventory.selected],name=root.ArcadeZombieForm.label(p.form),power=root.ArcadeProgression.catalog.find(c=>c.id===profile.equipped),wait=Math.ceil(powers.cooldowns[profile.equipped]||0);
   text(nodes.health,String(Math.round(e.hp*10)/10).replace('.',',')+'/'+e.maxHp);const life=Math.round(e.hp/e.maxHp*100);if(nodes.life.value!==life)nodes.life.value=life;
   const objectives=doc.getElementById('stars-two')||doc.getElementById('challenge-status');text(stars,objectives?.textContent.match(/★\s*\d+\s*\/\s*\d+/)?.[0]||'');
   text(nodes.weapon,p.form==='hero'?'Centella · Rayos ∞':zombie?'Zombi · Rayos ∞':wolf?'Lobo · Zarpazo':w.name+' · '+(w.ammo===null?'∞':e.inventory.ammo[e.inventory.selected]||0));
   text(nodes.power,(power?.name||'Sin poder')+(wait?' · '+wait+'s':''));text(nodes.jumps,'Saltos '+Math.max(0,(p.maxJumps||2)-(p.jumps||0))+'/'+(p.maxJumps||2));text(nodes.fuel,(p.jetpackMk2?'MK II ×2 · ':'Gas ')+Math.round(100*p.fuel/(p.fuelMax||1))+'%');
   text(nodes.form,name+(p.formCooldown>0?' '+Math.ceil(p.formCooldown)+'s':' ↻'));text(nodes.kick,zombie?'Plasma':p.form==='robot'?'2ª arma':p.onMotorcycle?(wolf?'Embestir':'Golpear'):'Patada');
   for(const action of ['hook','jet'])controls.querySelector('[data-mobile-action="'+action+'"]').hidden=!!p.onMotorcycle||!!p.inSeaMission||((p.form||'soldier')!=='soldier'&&!(action==='jet'&&p.form==='hero'));
   const flightButton=controls.querySelector('[data-mobile-action="jet"]');text(flightButton,p.form==='hero'?'Volar':'Jetpack');flightButton.setAttribute('aria-label',p.form==='hero'?'Activar o apagar vuelo libre':'Activar o apagar jetpack');if(p.form==='hero')text(nodes.fuel,p.heroFlight?'Volando':'Vuelo disponible');
   if(p.inSeaMission){text(nodes.fuel,p.swimming?'Buceo · activo':'Interior');text(nodes.form,(p.submersible?'Submarino':p.form==='tank'?'Mini tanque':p.form==='fighter'?'Luchador':name)+(p.formCooldown>0?' '+Math.ceil(p.formCooldown)+'s':''));text(controls.querySelector('.mobile-stick-area>small'),p.swimming?'NADAR · BORDE: IMPULSO':'MOVER · BORDE: CORRER');}if(p.form==='tank'){text(nodes.weapon,'Súper cañón · ∞');text(nodes.kick,'Cañón');}if(p.form==='fighter')text(nodes.weapon,'Luchador · combos');if(p.onMotorcycle){text(nodes.fuel,p.roadBoost?'Turbo activo':'Moto · motor');if(wolf)text(nodes.weapon,'Lobo · Embestida');text(controls.querySelector('.mobile-stick-area>small'),'AL BORDE: TURBO');}
  }
  return{update,release,get active(){return active;}};
 }
 const api={stickActions,contacts,QUERY};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMobile={...api,...mount()};
})(typeof window!=='undefined'?window:globalThis);
