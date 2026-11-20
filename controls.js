(function(root){
 'use strict';
 const STORE='cap-dollar.controls.v1';
 const actions=[
  ['left','Izquierda','KeyA',['KeyA','ArrowLeft'],14],['right','Derecha','KeyD',['KeyD','ArrowRight'],15],
  ['up','Subir / entrar / apuntar arriba','KeyW',['KeyW','ArrowUp'],12],['down','Agacharse / enterrarse','KeyS',['KeyS','ArrowDown'],13],
  ['jump','Saltar','Space',['Space'],0],['fire','Disparar / zarpazo / rayos','KeyJ',['KeyJ','KeyX','Numpad0'],7],
  ['kick','Patada / plasma','KeyL',['KeyL'],1],['run','Correr / turbo','ShiftLeft',['ShiftLeft','ShiftRight'],5],
  ['hook','Gancho','KeyE',['KeyE'],2],['jet','Activar jetpack','KeyF',['KeyF'],10],
  ['form','Cambiar forma','KeyT',['KeyT'],3],['power','Usar poder','KeyG',['KeyG'],6],
  ['cyclePower','Cambiar poder','KeyH',['KeyH','KeyB'],4],['nextWeapon','Arma siguiente','BracketRight',['BracketRight'],11],
  ['prevWeapon','Arma anterior','BracketLeft',['BracketLeft'],8],['pause','Pausa / continuar','Escape',['Escape','KeyP'],9],
  ['aimUp','Apuntar arriba','KeyI',['KeyI'],null],['aimDown','Apuntar abajo','KeyK',['KeyK'],null],
  ['diagonalUp','Disparar diagonal arriba','KeyQ',['KeyQ'],null],['diagonalDown','Disparar diagonal abajo','KeyC',['KeyC'],null],
  ['diagonalRightUp','Diagonal arriba (mano derecha)','KeyO',['KeyO'],null],['diagonalRightDown','Diagonal abajo (mano derecha)','KeyM',['KeyM'],null],
  ['restart','Checkpoint (misión 1)','KeyR',['KeyR'],null],
  ...Array.from({length:9},(_,i)=>['weapon'+(i+1),'Arma '+(i+1),'Digit'+(i+1),['Digit'+(i+1),'Numpad'+(i+1)],null])
 ].map(([id,label,code,keys,button])=>({id,label,code,keys,button}));
 const buttonNames=['A','B','X','Y','LB','RB','LT','RT','Vista','Menú','Stick izquierdo','Stick derecho','Cruceta ↑','Cruceta ↓','Cruceta ←','Cruceta →'];
 const fresh=()=>({mode:'auto',deadzone:.24,keyboard:{},gamepad:{}});
 function clean(value){const result=fresh();if(!value||typeof value!=='object')return result;
  if(['auto','keyboard','gamepad'].includes(value.mode))result.mode=value.mode;
  if(Number.isFinite(value.deadzone))result.deadzone=Math.max(.1,Math.min(.6,value.deadzone));
  for(const a of actions){const k=value.keyboard?.[a.id],b=value.gamepad?.[a.id];if(typeof k==='string'&&/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Bracket(Left|Right)|Comma|Period|Semicolon|Quote|Slash|Backslash|Minus|Equal|Enter|Backspace)$/.test(k))result.keyboard[a.id]=k;if(b===null||Number.isInteger(b)&&b>=0&&b<16)result.gamepad[a.id]=b;}
  return result;
 }
 function load(store){try{return clean(JSON.parse(store.getItem(STORE)));}catch{return fresh();}}
 function keyboardAction(settings,code,key=''){if(/^Arrow(Left|Right|Up|Down)$/.test(key))code=key;if(code==='Escape')return actions.find(a=>a.id==='pause');return actions.find(a=>settings.keyboard[a.id]===code)||actions.find(a=>!settings.keyboard[a.id]&&a.keys.includes(code));}
 function sample(pad,settings){const held=new Set(),aim={x:0,y:0};if(!pad||pad.connected===false)return{held,aim};
  for(const a of actions){const b=Object.hasOwn(settings.gamepad,a.id)?settings.gamepad[a.id]:a.button;if(b!==null&&(pad.buttons[b]?.pressed||pad.buttons[b]?.value>.5))held.add(a.id);}
  const axis=i=>Number.isFinite(pad.axes[i])?pad.axes[i]:0,d=settings.deadzone;
  if(axis(0)<-d)held.add('left');if(axis(0)>d)held.add('right');if(axis(1)<-d)held.add('up');if(axis(1)>d)held.add('down');
  const x=axis(2),y=axis(3),m=Math.hypot(x,y);if(m>d){const angle=Math.round(Math.atan2(y,x)/(Math.PI/4))*Math.PI/4;aim.x=Math.abs(Math.cos(angle))<.01?0:Math.cos(angle);aim.y=Math.abs(Math.sin(angle))<.01?0:Math.sin(angle);}
  return{held,aim};
 }
 // The same canonical actions feed the existing combat code in both missions.
 // Sources are tracked separately so releasing a pad never releases a held key.
 function createRouter(emit){const sources=new Map();let active=new Set();
  function sync(){const next=new Set([...sources.values()].flatMap(s=>[...s])),previous=active;active=next;for(const id of previous)if(!next.has(id))emit(id,false);for(const id of next)if(!previous.has(id))emit(id,true);}
  return{get held(){return active;},set(source,ids){if(ids.length===0)sources.delete(source);else sources.set(source,new Set(ids));sync();},clear(){sources.clear();sync();}};
 }
 function decorateInput(input,held,aim){const result={...input};for(const [id,key]of Object.entries({left:'left',right:'right',up:'up',down:'down',run:'run',hook:'hookHeld',kick:'kick',power:'power',aimUp:'aimUp',aimDown:'aimDown'}))if(held.has(id))result[key]=true;
  if(held.has('up'))result.aimUp=true;if(held.has('down'))result.aimDown=true;
  if(['fire','diagonalUp','diagonalDown','diagonalRightUp','diagonalRightDown'].some(id=>held.has(id)))result.fire=result.fireHeld=true;
  if(held.has('diagonalUp')||held.has('diagonalRightUp'))result.diagonalUp=true;if(held.has('diagonalDown')||held.has('diagonalRightDown'))result.diagonalDown=true;
  if(aim)result.aimVector=aim;return result;
 }
 function keyName(code){return({Space:'Espacio',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',ShiftLeft:'Shift izq.',ShiftRight:'Shift der.',Escape:'Esc',BracketLeft:'[',BracketRight:']'})[code]||code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'Num ');}
 function bind(settings,kind,id,value){const map=settings[kind==='key'?'keyboard':'gamepad'],action=actions.find(a=>a.id===id);
  if(!action)return{ok:false,message:'Acción desconocida.'};
  const conflict=actions.find(a=>a.id!==id&&(kind==='key'?(map[a.id]?map[a.id]===value:a.keys.includes(value)):(Object.hasOwn(map,a.id)?map[a.id]:a.button)===value));
  if(conflict&&value!==null){if(kind==='key')return{ok:false,message:'Ya está asignado a «'+conflict.label+'». Cambia esa asignación primero.'};map[conflict.id]=Object.hasOwn(map,id)?map[id]:action.button;}
  map[id]=value;return{ok:true,message:conflict&&value!==null?'Botones intercambiados: '+action.label+' y '+conflict.label+'.':''};
 }
 // A controller has no native browser focus navigation. Keep an explicit selection,
 // including after a purchase replaces its button or a mouse click blurs the menu.
 function createMenuFocus(doc,visible){
  let surface=null,index=0,marked=null;
  function clear(){marked?.classList.remove('gamepad-focus');marked=null;}
  function list(host){return [...host.querySelectorAll('button,a[href],input,select')].filter(el=>!el.disabled&&visible(el));}
  function select(host,el){if(!el)return null;clear();el.focus({preventScroll:true});el.classList.add('gamepad-focus');marked=el;surface=host;index=Math.max(0,list(host).indexOf(el));el.scrollIntoView?.({block:'nearest',inline:'nearest'});return el;}
  function ensure(host){const choices=list(host);if(host!==surface){clear();surface=host;index=0;}if(!choices.length){clear();return null;}const active=doc.activeElement,current=choices.includes(active)?active:choices[Math.min(index,choices.length-1)];if(current!==marked||active!==current)select(host,current);return current;}
  function move(host,delta){const current=ensure(host),choices=list(host);return choices.length?select(host,choices[(choices.indexOf(current)+delta+choices.length)%choices.length]):null;}
  return{ensure,move,list,clear};
 }
 function install(){
  const doc=root.document;let store;try{store=root.localStorage;}catch{}let settings=load(store),capture=null,aim=null,padIndex=null,wasPad=false,previous=new Set(),neutral=true,lastMenu=null,lastStatus='',statusNode,rows=[],notice,dialog,returnFocus,menuRepeat=0,lastDirection='',focused=true;
  const emit=(id,down)=>{const a=actions.find(a=>a.id===id);if(!a)return;const e=new KeyboardEvent(down?'keydown':'keyup',{code:a.code,key:a.code==='Escape'?'Escape':a.code,bubbles:true,cancelable:true});Object.defineProperty(e,'arcadeControl',{value:true});doc.dispatchEvent(e);};
  const router=createRouter(emit);
  const visible=el=>el&&!el.hidden&&!el.closest('[hidden]')&&!el.closest('[inert]');
  const menuFocus=createMenuFocus(doc,visible);
  function menu(){const loading=doc.getElementById('level-loading');if(visible(loading))return loading;if(dialog&&!dialog.hidden)return dialog;for(const id of ['briefing','mission-results','main-menu','overlay','level-two-menu','victory-screen']){const el=doc.getElementById(id);if(visible(el))return el;}return doc.querySelector('.overlay:not([hidden])');}
  function reset(){root.ArcadeMobile?.release();router.clear();aim=null;neutral=true;previous.clear();}
  function save(){try{store.setItem(STORE,JSON.stringify(settings));notice.textContent='Configuración guardada para todas las misiones.';}catch{notice.textContent='Configuración aplicada durante esta sesión; el navegador no permite guardarla.';}reset();refresh();}
  function refresh(){for(const {a,key,pad}of rows){key.textContent=settings.keyboard[a.id]?keyName(settings.keyboard[a.id]):a.keys.map(keyName).join(' / ');const b=Object.hasOwn(settings.gamepad,a.id)?settings.gamepad[a.id]:a.button;pad.textContent=b===null?'Sin asignar':buttonNames[b];}}
  function close(){capture=null;dialog.hidden=true;reset();returnFocus?.focus();}
  function mount(){
   dialog=doc.createElement('section');dialog.className='controls-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','controls-title');
   dialog.innerHTML='<div class="controls-panel"><h2 id="controls-title">Teclado y mando Xbox</h2><p>Configuración compartida por todas las misiones.</p><label>Dispositivo <select id="control-device"><option value="auto">Teclado + mando (automático)</option><option value="keyboard">Solo teclado</option><option value="gamepad">Mando + teclado de respaldo</option></select></label><p id="controller-status" role="status"></p><label>Zona muerta de los sticks <input id="control-deadzone" type="range" min="10" max="60" step="2"><output id="deadzone-value"></output></label><p class="menu-tip">Stick izquierdo: moverse. Stick derecho: apuntar en 8 direcciones. Cruceta: moverse y navegar. En menús: A aceptar, B volver, Menú continuar. En ajustes: ↑/↓ elegir y ←/→ cambiar valores. Conecta el mando por USB o Bluetooth y pulsa un botón para detectarlo.</p><p id="controls-notice" role="status">Selecciona una acción y pulsa la tecla o el botón del mando. Esc cancela. Supr elimina una asignación de mando.</p><div class="control-table"><div class="control-row control-head"><strong>Acción</strong><strong>Teclado</strong><strong>Xbox</strong></div><div id="control-rows"></div></div><div class="controls-footer"><button id="controls-reset" class="secondary">Restaurar controles</button><button id="controls-close" class="primary">Listo · Volver</button></div></div>';
   doc.body.append(dialog);notice=doc.getElementById('controls-notice');statusNode=doc.getElementById('controller-status');const mode=doc.getElementById('control-device'),dead=doc.getElementById('control-deadzone'),out=doc.getElementById('deadzone-value');
   const options=()=>{mode.value=settings.mode;dead.value=Math.round(settings.deadzone*100);out.textContent=dead.value+'%';};options();mode.onchange=()=>{settings.mode=mode.value;save();};dead.oninput=()=>{settings.deadzone=Number(dead.value)/100;out.textContent=dead.value+'%';save();};
   for(const a of actions){const row=doc.createElement('div'),name=doc.createElement('span'),key=doc.createElement('button'),pad=doc.createElement('button');row.className='control-row';name.textContent=a.label;key.type=pad.type='button';key.setAttribute('aria-label','Teclado: '+a.label);pad.setAttribute('aria-label','Mando: '+a.label);key.onclick=()=>{capture={kind:'key',id:a.id};notice.textContent=a.label+': pulsa una tecla. Esc cancela.';};pad.onclick=()=>{capture={kind:'pad',id:a.id};notice.textContent=a.label+': suelta los botones y pulsa uno del mando. Esc cancela; Supr deja sin asignar.';};row.append(name,key,pad);doc.getElementById('control-rows').append(row);rows.push({a,key,pad});}
   doc.getElementById('controls-reset').onclick=()=>{settings=fresh();capture=null;options();save();};doc.getElementById('controls-close').onclick=close;refresh();
   function open(){returnFocus=doc.activeElement;reset();dialog.hidden=false;doc.getElementById('controls-close').focus();}
   for(const host of [doc.querySelector('[data-menu-page="settings"]'),doc.getElementById('pause-options')])if(host){const button=doc.createElement('button');button.type='button';button.className='secondary';button.textContent='Configurar teclado / mando Xbox';button.onclick=open;host.append(button);}
  }
  function assign(kind,id,value){const result=bind(settings,kind,id,value);capture=null;if(!result.ok){notice.textContent=result.message;return;}save();if(result.message)notice.textContent+=' '+result.message;
  }
  root.addEventListener('keydown',e=>{
   if(e.arcadeControl)return;
   if(capture){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape'){capture=null;notice.textContent='Asignación cancelada.';return;}if(capture.kind==='pad'){if(e.code==='Delete')assign('pad',capture.id,null);return;}if(e.repeat)return;const candidate=clean({keyboard:{[capture.id]:e.code}});if(candidate.keyboard[capture.id])assign('key',capture.id,e.code);else notice.textContent='Esta tecla está reservada. Elige otra.';return;}
   if(dialog&&!dialog.hidden){if(e.code==='Escape'){e.preventDefault();close();}else if(e.key==='Tab'){const list=focusable(dialog),i=list.indexOf(doc.activeElement);e.preventDefault();list[(i+(e.shiftKey?-1:1)+list.length)%list.length]?.focus();}e.stopImmediatePropagation();return;}
   const surface=menu();if(surface||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName))return;
   // A key may arrive after Continue but before the next animation frame.
   // Acknowledge that transition before recording it, so poll cannot erase it.
   if(surface!==lastMenu){reset();lastMenu=surface;}
   const a=keyboardAction(settings,e.code,e.key);if(a){e.preventDefault();e.stopImmediatePropagation();const continuous=['left','right','up','down','aimUp','aimDown','run','fire','diagonalUp','diagonalDown','diagonalRightUp','diagonalRightDown'].includes(a.id);if(!e.repeat||continuous)router.set('key:'+e.code,[a.id]);}else if(actions.some(a=>a.keys.includes(e.code))){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  root.addEventListener('keyup',e=>{if(e.arcadeControl)return;const a=keyboardAction(settings,e.code,e.key);if(a||actions.some(a=>a.keys.includes(e.code))){e.preventDefault();e.stopImmediatePropagation();router.set('key:'+e.code,[]);}},true);
  root.addEventListener('blur',()=>{focused=false;reset();});root.addEventListener('focus',()=>{focused=true;reset();});doc.addEventListener('visibilitychange',()=>{if(doc.hidden)reset();});
  function focusable(surface){return menuFocus.list(surface);}
  function menuInput(surface,pad,t){const buttons=pad.buttons,pressed=i=>buttons[i]?.pressed||buttons[i]?.value>.5;
   const edges=new Set(buttons.flatMap((b,i)=>(b.pressed||b.value>.5)&&!previous.has(i)?[i]:[]));
   if(capture){if(capture.kind==='pad'){const b=[...edges].find(i=>i<16);if(b!==undefined)assign('pad',capture.id,b);}return;}
   menuFocus.ensure(surface);
   const direction=pressed(12)||pad.axes[1]<-.5?'up':pressed(13)||pad.axes[1]>.5?'down':pressed(14)||pad.axes[0]<-.5?'left':pressed(15)||pad.axes[0]>.5?'right':'';
   if(direction&&(direction!==lastDirection||t>=menuRepeat)){const current=doc.activeElement;if(current?.tagName==='SELECT'&&(direction==='left'||direction==='right')){const d=direction==='left'?-1:1;current.selectedIndex=Math.max(0,Math.min(current.options.length-1,current.selectedIndex+d));current.dispatchEvent(new Event('change',{bubbles:true}));}else if(current?.type==='range'&&(direction==='left'||direction==='right')){current.value=Number(current.value)+(direction==='left'?-1:1)*Number(current.step||1);current.dispatchEvent(new Event('input',{bubbles:true}));}else menuFocus.move(surface,direction==='up'||direction==='left'?-1:1);menuRepeat=t+(direction===lastDirection?180:350);}lastDirection=direction;
   if(edges.has(0)){const current=menuFocus.ensure(surface);if(current){if(current.tagName==='SELECT'||current.type==='range')menuFocus.move(surface,1);else current.click();}}
   if(edges.has(1)){if(surface===dialog)close();else{const unified=surface.id==='main-menu',shop=unified?null:surface.querySelector('#shop:not([hidden])'),shortcuts=unified?null:surface.querySelector('#shortcuts:not([hidden])');if(shop){shop.hidden=true;surface.querySelector('#show-shop')?.focus();}else if(shortcuts){surface.querySelector('#show-shortcuts')?.click();}else{const back=surface.querySelector('#arcade-close:not([hidden]),#menu-back:not([hidden]),#resume:not([hidden]),#play-two:not([hidden])');if(back&&!back.disabled&&visible(back))back.click();}}}
   if(edges.has(9)){if(surface===dialog)close();else surface.querySelector('#resume:not([hidden]),#play-two:not([hidden]),#menu-play:not([disabled])')?.click();}
  }
  function poll(t){let pads=[],padError='';try{if(typeof root.navigator.getGamepads!=='function')padError='Este navegador no ofrece acceso a mandos. El teclado sigue disponible.';else pads=Array.from(root.navigator.getGamepads()||[]);}catch{padError='El navegador bloquea el mando. Abre el juego en HTTPS o localhost; el teclado sigue disponible.';}const pad=pads.find(p=>p?.connected&&p.index===padIndex)||pads.find(p=>p?.connected);padIndex=pad?.index??null;
   const surface=menu();if(surface!==lastMenu){reset();lastMenu=surface;if(pad)previous=new Set(pad.buttons.flatMap((b,i)=>b.pressed||b.value>.5?[i]:[]));}
   if(statusNode&&dialog&&!dialog.hidden){const status=padError||(pad?(pad.mapping==='standard'?'Mando conectado: ':'Mando detectado; comprueba las asignaciones: ')+pad.id:'Sin mando detectado. Conéctalo y pulsa A.');if(status!==lastStatus){statusNode.textContent=status;lastStatus=status;}}
   if(!pad){menuFocus.clear();if(wasPad){reset();if(!surface&&settings.mode!=='keyboard')(doc.getElementById('pause-two')||doc.getElementById('pause'))?.click();}wasPad=false;return;}wasPad=true;
   if(doc.hidden||!focused||settings.mode==='keyboard'){menuFocus.clear();router.set('pad',[]);aim=null;return;}
   const heldButtons=new Set(pad.buttons.flatMap((b,i)=>b.pressed||b.value>.5?[i]:[]));
   if(surface){router.set('pad',[]);aim=null;menuInput(surface,pad,t);previous=heldButtons;neutral=true;return;}
   menuFocus.clear();const input=sample(pad,settings);if(neutral){if(!input.held.size&&Math.hypot(input.aim.x,input.aim.y)===0)neutral=false;previous=heldButtons;return;}
   aim=Math.hypot(input.aim.x,input.aim.y)>0?input.aim:null;router.set('pad',input.held);previous=heldButtons;
  }
  mount();return{poll,reset,setTouch:(source,ids)=>router.set('touch:'+source,menu()?[]:ids),decorate:input=>decorateInput(input,router.held,aim)};
 }
 const api={actions,buttonNames,fresh,clean,load,sample,keyboardAction,createRouter,createMenuFocus,decorateInput,bind};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.ArcadeControls={...api,...install()};}
})(typeof window!=='undefined'?window:globalThis);
