(function(root){
  'use strict';
  // Piezas que las tres misiones compartían copiadas: el dibujo del soldado
  // enemigo con su barra de vida, el aviso único de cada jefe y el arnés de
  // depuración. Un solo sitio, un solo comportamiento.
  const SCALE=.19;
  // Cuadro del soldado enemigo según lo que está haciendo. Los pasos siguen la
  // distancia recorrida y la caída empieza con un tambaleo antes de quedar en el suelo.
  function enemyPose(n){
    if(n.hp<=0)return{row:3,frame:n.death>.62?2:3};
    if(n.hit>0)return{row:3,frame:2};
    if(n.flash>0)return{row:3,frame:n.flash>.08?0:1};
    if(!n.grounded)return{row:2,frame:n.vy< -150?1:n.vy<50?2:3};
    if(Math.abs(n.vx)>10)return{row:1,frame:Math.floor((n.runCycle||0)*4)%4};
    return{row:0,frame:Math.floor((n.anim||0)*4)%4};
  }
  function drawEnemy(ctx,n,image,frames=root.ENEMY_FRAMES){
    if(!image||!frames)return;const q=enemyPose(n),f=frames[q.row][q.frame];
    ctx.save();if(n.hp<=0)ctx.globalAlpha=Math.min(1,n.death*2);ctx.translate(Math.round(n.x),Math.round(n.y));ctx.scale(n.facing||1,1);
    ctx.drawImage(image,f[0],f[1],f[2],f[3],-(f[5]??f[2]/2)*SCALE,-f[3]*SCALE,f[2]*SCALE,f[3]*SCALE);ctx.restore();
  }
  // Barra de vida segmentada y marca de alerta, iguales en todas las misiones.
  function enemyBar(ctx,n,lift=59){
    if(n.hp<=0)return;const x=Math.round(n.x),y=Math.round(n.y-lift);
    ctx.fillStyle='#17232d';ctx.fillRect(x-19,y,38,6);ctx.fillStyle=n.hit>0?'#fff0ad':'#e77b60';ctx.fillRect(x-18,y+1,Math.round(36*n.hp/n.maxHp),4);
    ctx.fillStyle='#17232d';for(let i=1;i<n.maxHp&&n.maxHp<=6;i++)ctx.fillRect(x-18+Math.round(i*36/n.maxHp),y+1,1,4);
    if(n.alert){ctx.fillStyle=n.awareness==='sight'?'#ff9b70':'#ffe5a0';ctx.font='bold 10px monospace';ctx.fillText(n.awareness==='sight'?'!':'?',x-3,y-5);}
  }
  // Cada aviso de jefe ocurre una vez por partida.
  function once(staged,presentation){return(id,kind,...text)=>{if(!presentation||staged[id])return false;staged[id]=true;presentation[kind](...text);return true;};}
  function clock(seconds){const s=Math.max(0,Math.floor(seconds||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  // Arnés de depuración (?debug): avanza la simulación a mano y redibuja una
  // vez, para poder verificar aunque la pestaña esté en segundo plano.
  function debug(fields,{step,redraw,dead}){
    fields.advance=(seconds=1)=>{const steps=Math.round(seconds*120);for(let i=0;i<steps&&!dead();i++)step(1/120);redraw();return steps;};
    return fields;
  }
  const api={SCALE,enemyPose,drawEnemy,enemyBar,once,clock,debug};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionKit=api;
})(typeof window!=='undefined'?window:globalThis);
