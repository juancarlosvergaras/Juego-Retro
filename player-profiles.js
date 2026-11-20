(function(root){
 'use strict';
 const SELECTED='cap-dollar.selected-profile.v1',PREFIX='cap-dollar.profile.v1:';
 const valid=id=>['1','2','3'].includes(String(id));
 function create(persistent,session){
  let id='1';try{const chosen=session?.getItem(SELECTED)||persistent?.getItem(SELECTED);if(valid(chosen))id=String(chosen);}catch{}
  try{session.setItem(SELECTED,id);}catch{}
  // Profile 1 retains the original keys: existing saves need no destructive migration.
  // Bind the store to this page, so late saves and other tabs cannot change profiles.
  const key=(slot,name)=>slot==='1'?name:PREFIX+slot+':'+name;
  function storage(slot=id){if(!valid(slot))throw Error('Perfil inválido');const fixed=String(slot);return{getItem:name=>persistent.getItem(key(fixed,name)),setItem:(name,value)=>persistent.setItem(key(fixed,name),String(value)),removeItem:name=>persistent.removeItem(key(fixed,name))};}
  function temporary(){const prefix=id==='1'?'':PREFIX+id+':';return{getItem:name=>session.getItem(prefix+name),setItem:(name,value)=>session.setItem(prefix+name,String(value)),removeItem:name=>session.removeItem(prefix+name)};}
  function select(next){if(!valid(next))return false;try{session.setItem(SELECTED,String(next));if(session.getItem(SELECTED)!==String(next))return false;}catch{return false;}try{persistent.setItem(SELECTED,String(next));}catch{}return true;}
  function summary(slot){try{const store=storage(slot),p=JSON.parse(store.getItem('obra10.progress.v1')||'null'),c=JSON.parse(store.getItem('cap-dollar.campaign.v1')||'null'),one=JSON.parse(store.getItem('cap-dollar.mission-one-loadout.v1')||'null'),two=JSON.parse(store.getItem('cap-dollar.mission-two.v1')||'null');if(!one&&!two&&!c&&!p?.earned&&!p?.zombieUnlocked)return 'Nueva partida';return 'Misión '+(c?.level===8?'08':c?.level===7?'07':c?.level===6?'06':c?.level===5?'05':c?.level===4?'04':c?.level===3?'03':c?.level===2?'02':'01')+' · '+Math.max(0,Math.floor(Number(p?.earned)||0)).toLocaleString('es-CO')+' puntos ganados';}catch{return 'Guardado no disponible';}}
  return{id,storage,temporary,select,summary};
 }
 function install(){let persistent,session;try{persistent=root.localStorage;session=root.sessionStorage;}catch{}const profiles=create(persistent,session),doc=root.document,host=doc.querySelector('[data-menu-page="home"]');
  if(host){const panel=doc.createElement('fieldset');panel.className='profile-selector';panel.innerHTML='<legend>Perfiles de jugador</legend><div class="profile-choices"></div><p class="menu-tip">Tu partida anterior está en Perfil 1. Cada perfil guarda su equipo. Cambiar de perfil cierra el modo desarrollador.</p><p class="profile-message" role="status"></p>';host.prepend(panel);
   for(const id of ['1','2','3']){const button=doc.createElement('button');button.type='button';button.className='secondary';button.dataset.profile=id;button.setAttribute('aria-pressed',String(id===profiles.id));button.innerHTML='<strong>Perfil '+id+'</strong><span></span>';button.querySelector('span').textContent=profiles.summary(id);button.onclick=()=>{if(id===profiles.id)return;const notice=panel.querySelector('.profile-message');if(!profiles.select(id)){notice.textContent='No se pudo cambiar de perfil. El navegador bloquea el almacenamiento de sesión.';return;}root.ArcadeDeveloperMode?.stop();root.location.assign('index.html');};panel.querySelector('.profile-choices').append(button);}
   const badge=doc.createElement('span');badge.className='profile-badge';badge.textContent='Perfil '+profiles.id;doc.querySelector('.game-toolbar')?.append(badge);
  }
  return{...profiles,refresh(){doc.querySelectorAll('[data-profile]').forEach(button=>{button.querySelector('span').textContent=profiles.summary(button.dataset.profile);});}};
 }
 const api={create,SELECTED,PREFIX};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeProfiles={...api,...install()};
})(typeof window!=='undefined'?window:globalThis);
