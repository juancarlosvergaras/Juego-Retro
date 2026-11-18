// Local QA only: independent save storage, controllable gamepad and timings.
(() => {
 const nativeRaf=window.requestAnimationFrame.bind(window),nativeDraw=CanvasRenderingContext2D.prototype.drawImage;
 let running=false,costs=[],intervals=[],last=0,draws=0,mutations=0,end=0,pad=null;
 Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
 const panel=document.createElement('aside');panel.id='qa-tools';panel.style='position:fixed;bottom:0;left:0;z-index:2000;background:#102431;color:white;padding:8px;max-width:100%;font:12px monospace';
 panel.innerHTML='<button id="qa-connect">Conectar mando simulado</button> <button id="qa-release">Soltar todo</button> <button id="qa-right">RT + diagonal derecha</button> <button id="qa-left">RT + diagonal izquierda</button> <button id="qa-jump">A + RB + avanzar</button> <button id="qa-start">Menú (Start)</button> <button id="qa-a">A confirmar</button> <button id="qa-down">Cruceta abajo</button> <button id="qa-b">B volver</button> <button id="qa-disconnect">Desconectar</button> <button id="qa-benchmark">Medir 10 segundos</button><output id="qa-results">Prueba aislada</output>';
 document.body.append(panel);
 panel.addEventListener('pointerdown',e=>e.preventDefault());
 const button=(name,fn)=>document.getElementById(name).onclick=fn;
 const neutral=()=>({connected:true,index:0,id:'Xbox simulado · QA',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))});
 const press=(buttons,axes=[0,0,0,0])=>{pad=neutral();pad.axes=axes;for(const b of buttons)pad.buttons[b]={pressed:true,value:1};document.getElementById('game')?.focus();};
 button('qa-connect',()=>{pad=neutral();});button('qa-release',()=>{pad=neutral();});button('qa-right',()=>press([7],[0,0,1,-1]));button('qa-left',()=>press([7],[0,0,-1,-1]));button('qa-jump',()=>press([0,5],[1,0,0,0]));button('qa-start',()=>press([9]));button('qa-a',()=>{pad=neutral();pad.buttons[0]={pressed:true,value:1};});button('qa-down',()=>{pad=neutral();pad.buttons[13]={pressed:true,value:1};});button('qa-b',()=>{pad=neutral();pad.buttons[1]={pressed:true,value:1};});button('qa-disconnect',()=>{pad=null;});
 const results=document.getElementById('qa-results');
 new MutationObserver(records=>{if(running)mutations+=records.filter(r=>!panel.contains(r.target)).length;}).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
 CanvasRenderingContext2D.prototype.drawImage=function(...args){if(running)draws++;return nativeDraw.apply(this,args);};
 window.requestAnimationFrame=callback=>nativeRaf(t=>{const start=performance.now();callback(t);if(running){costs.push(performance.now()-start);if(last)intervals.push(t-last);last=t;if(t>=end){running=false;costs.sort((a,b)=>a-b);const mean=costs.reduce((a,b)=>a+b,0)/costs.length;results.textContent=JSON.stringify({frames:costs.length,callbackMeanMs:+mean.toFixed(2),callbackP95Ms:+costs[Math.floor(costs.length*.95)].toFixed(2),gapsOver25ms:intervals.filter(n=>n>25).length,drawCalls:draws,domMutations:mutations});}}});
 button('qa-benchmark',()=>{costs=[];intervals=[];last=draws=mutations=0;end=performance.now()+10000;running=true;results.textContent='Midiendo…';document.getElementById('game')?.focus();});
})();
