// Isolated diagnostic page: no reads or writes to the player's real save.
Object.defineProperty(window,'localStorage',{value:(()=>{
 const saved={x:1700,landed:true,hp:8,shield:99,defeated:Array.from({length:201},(_,i)=>i),tank:{hp:0},inventory:{selected:3,owned:[1,3],ammo:{3:36}}};
 const data=new Map([['cap-dollar.mission-two.v1',JSON.stringify(saved)]]);
 return{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
})()});
addEventListener('DOMContentLoaded',()=>{
 const panel=document.createElement('aside');panel.style='position:fixed;bottom:0;left:0;right:0;padding:10px 20px;background:#14242e;color:#fff;z-index:20000;font:16px system-ui';
 panel.innerHTML='<strong>Prueba de teclado · sin modificar tu partida</strong><div>Mantén ↑ + → o ← y pulsa J, X, Num 0 o clic sobre el juego. Q/C disparan diagonal hacia donde miras; O/M, hacia la derecha.</div><output id="key-diagnostic">Esperando teclas</output><div id="shot-diagnostic">Disparos registrados: 0</div>';
 document.body.append(panel);
 const keys=new Set(),log=[];let shots=0;
 for(const type of ['keydown','keyup'])addEventListener(type,e=>{if(type==='keydown')keys.add(e.code||e.key);else keys.delete(e.code||e.key);if(!e.repeat){log.unshift((type==='keydown'?'↓ ':'↑ ')+(e.code||'(sin code)')+' / '+e.key);log.length=Math.min(log.length,4)}document.getElementById('key-diagnostic').textContent='Pulsadas: '+[...keys].join(' + ')+' | Últimos eventos: '+log.join(' · ')});
 const fire=ArcadeArsenal.fire;ArcadeArsenal.fire=(inv,p)=>{const result=fire(inv,p);document.getElementById('shot-diagnostic').textContent=result?'Disparos registrados: '+(++shots)+' · Balas: '+inv.ammo[inv.selected]+' · Dirección: '+p.aim.x.toFixed(2)+', '+p.aim.y.toFixed(2):'Sin munición';return result};
});
