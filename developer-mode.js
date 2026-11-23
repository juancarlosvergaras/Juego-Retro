(function(root){
 'use strict';
 const KEY='cap-dollar.dev-session.v1',PREFIX='cap-dollar.dev-data.v1:';
 const SAVE_KEYS=['obra10.progress.v1','cap-dollar.campaign.v1','cap-dollar.mission-one-loadout.v1','cap-dollar.mission-two.v1','cap-dollar.mission-three.v1','cap-dollar.mission-four.v1','cap-dollar.mission-five.v1','cap-dollar.mission-six.v1','cap-dollar.mission-seven.v1','cap-dollar.mission-eight.v1','cap-dollar.mission-nine.v1','cap-dollar.mission-ten.v1','cap-dollar.mall-arcade.v1','cap-dollar.difficulty.v1','cap-dollar.tutorial.v1','cap-dollar.mission-one.v1','cap-dollar.quimera.v1',...Array.from({length:10},(_,i)=>'cap-dollar.completed.v1:'+(i+1))];
 function create(persistent,session,now=()=>Date.now()){
  function read(){try{const value=JSON.parse(session.getItem(KEY));return value?.version===1&&typeof value.token==='string'&&Number.isFinite(value.expires)?value:null;}catch{return null;}}
  // Every page retains its original store. A pagehide save after disabling or
  // expiring must NEVER fall back to the player's normal save.
  const initial=read(),isolated=!!initial;
  const active=()=>{const s=read();return !!(s&&s.expires>now()&&(!initial||s.token===initial.token));};
  function clear(){session.removeItem(KEY);for(const key of SAVE_KEYS)session.removeItem(PREFIX+key);}
  function start(){try{clear();for(const key of SAVE_KEYS){const value=persistent?.getItem(key);if(value!==null&&value!==undefined)session.setItem(PREFIX+key,value);}const config={version:1,token:String(now())+'-'+Math.random().toString(36).slice(2),expires:now()+30*60*1000,god:false,resources:true};session.setItem(KEY,JSON.stringify(config));return !!read();}catch{try{clear();}catch{}return false;}}
  function stop(){try{clear();return true;}catch{return false;}}
  function storage(base=persistent){if(!isolated)return persistent||base;return{getItem(key){try{return session.getItem(PREFIX+key);}catch{return null;}},setItem(key,value){const s=read();if(s?.token!==initial.token||s.expires<=now())return;session.setItem(PREFIX+key,String(value));},removeItem(key){if(read()?.token===initial.token)session.removeItem(PREFIX+key);}};}
  function option(name,value){if(!['god','resources'].includes(name)||!active())return;const s=read();s[name]=!!value;session.setItem(KEY,JSON.stringify(s));}
  return{start,stop,storage,active,option,get isolated(){return isolated;},get settings(){return read();},get remaining(){return Math.max(0,(read()?.expires||0)-now());}};
 }
 function inventory(inv,refill=true){inv.owned=Array.from({length:9},(_,i)=>i+1);inv.ammo=inv.ammo||{};if(!inv.owned.includes(inv.selected))inv.selected=3;if(refill)for(let i=3;i<=9;i++)inv.ammo[i]=9999;}
 function grant(profile,p,e,powers,progression){
  profile.heroUnlocked=true;profile.tankUnlocked=true;profile.fighterUnlocked=true;profile.robotUnlocked=true;profile.zombieUnlocked=true;profile.jetpackMk2=true;profile.wallet=Math.max(profile.wallet||0,99999);profile.levels=profile.levels||{};
  for(const c of progression.catalog)if(c.kind==='upgrade')profile.levels[c.id]=c.max;
  profile.owned=progression.catalog.filter(c=>c.kind==='power').map(c=>c.id);if(!profile.owned.includes(profile.equipped))profile.equipped=profile.owned[0];profile.shield=10;
  progression.apply(profile,p,e,true);inventory(e.inventory);p.formCooldown=0;p.fallDamage=0;if(powers)for(const id of Object.keys(powers.cooldowns))powers.cooldowns[id]=0;
 }
 function sustain(p,e,config){e.developerInvulnerable=!!config?.god;if(!config)return;if(e.inventory.owned.length<9)inventory(e.inventory,false);if(config.resources){p.fuel=p.fuelMax;for(let i=3;i<=9;i++)e.inventory.ammo[i]=9999;}if(p.transform<=0)p.formCooldown=0;}
 function install(){let persistent,session;try{persistent=root.ArcadeProfiles?.storage()||root.localStorage;session=root.ArcadeProfiles?.temporary()||root.sessionStorage;}catch{}
  const mode=create(persistent,session),doc=root.document;let refill=null,navigating=false,status,lastSecond=-1,cached=mode.settings;
  const reload=()=>{navigating=true;root.location.reload();};
  function mount(){const host=doc.querySelector('[data-menu-page="settings"]');if(!host)return;
   const panel=doc.createElement('fieldset');panel.className='developer-settings';panel.innerHTML='<legend>Modo desarrollador temporal</legend><p>Todas las armas, formas, poderes y mejoras al máximo. Partida de prueba separada de tu progreso normal.</p><p id="developer-details" role="status"></p><div id="developer-options"><label><input id="developer-god" type="checkbox"> Invulnerabilidad</label><label><input id="developer-resources" type="checkbox"> Munición y gasolina infinitas</label><button id="developer-refill" type="button" class="secondary">Reponer vida, recursos y recargas</button></div><button id="developer-toggle" type="button" class="secondary"></button><p class="menu-tip">Dura 30 minutos como máximo, solo en esta sesión de pestaña. Puedes salir antes. Activar o salir recarga el juego; el progreso de prueba se descarta al salir.</p>';
   host.append(panel);status=doc.getElementById('developer-details');const button=doc.getElementById('developer-toggle'),options=doc.getElementById('developer-options');options.hidden=!mode.active();button.textContent=mode.active()?'Desactivar y volver al modo normal':'Activar durante 30 minutos';
   button.onclick=()=>{if(mode.active()||mode.isolated){if(mode.stop())reload();else status.textContent='No se pudo cerrar la sesión temporal. Recarga la página.';}else if(mode.start())reload();else status.textContent='Este navegador bloquea el almacenamiento de sesión. El modo no se ha activado y tu partida no ha cambiado.';};
   for(const name of ['god','resources']){const input=doc.getElementById('developer-'+name);input.checked=!!mode.settings?.[name];input.onchange=()=>{try{mode.option(name,input.checked);cached=mode.settings;}catch{input.checked=!!mode.settings?.[name];status.textContent='No se pudo guardar esta opción temporal.';}};}
   doc.getElementById('developer-refill').onclick=()=>{if(mode.active()){refill?.();status.textContent='Vida, munición, gasolina y poderes repuestos en la partida temporal.';}};
   if(mode.active()){const badge=doc.createElement('span');badge.id='developer-badge';badge.className='developer-badge';badge.textContent='DEV · PROGRESO TEMPORAL';doc.querySelector('.game-toolbar')?.append(badge);}
   const pause=doc.getElementById('pause-options');if(pause){const shortcut=doc.createElement('button');shortcut.className='secondary';shortcut.type='button';shortcut.textContent='Modo desarrollador temporal';shortcut.onclick=()=>{doc.getElementById('open-main-menu')?.click();doc.querySelector('[data-open-menu="settings"]')?.click();panel.scrollIntoView({block:'center'});button.focus();};pause.append(shortcut);}
   poll();
  }
  function poll(){if(navigating)return;const second=Math.max(0,Math.ceil(((cached?.expires||0)-Date.now())/1000));if(second===lastSecond)return;lastSecond=second;if(mode.isolated){cached=mode.settings;if(!cached||cached.expires<=Date.now()){mode.stop();reload();return;}}if(status)status.textContent=mode.isolated?'ACTIVO · '+Math.floor(second/60)+':'+String(second%60).padStart(2,'0')+' restantes · No guarda en tu partida normal.':'Desactivado. Tu partida conserva sus reglas y desbloqueos normales.';}
  mount();return{...mode,poll,prepare(profile,p,e,powers){if(!mode.active())return;grant(profile,p,e,powers,root.ArcadeProgression);sustain(p,e,cached);refill=()=>{grant(profile,p,e,powers,root.ArcadeProgression);sustain(p,e,cached);};},tick(p,e){if(mode.isolated&&cached&&cached.expires>Date.now())sustain(p,e,cached);else e.developerInvulnerable=false;}};
 }
 const api={create,grant,sustain,inventory,KEY,PREFIX,SAVE_KEYS};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeDeveloperMode={...api,...install()};
})(typeof window!=='undefined'?window:globalThis);
