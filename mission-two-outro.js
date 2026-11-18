(function(root){
  'use strict';
  // Salida de la misión 02: el cazador deja el mausoleo, la tormenta amaina y
  // Vega lo recoge con el helicóptero. Guion puro (edad → posiciones) y dibujo
  // aparte, para que el juego solo tenga que seguirlo.
  // HELI es la escala del helicóptero frente a un soldado de 46 px: la misma en
  // la llegada y en la recogida, para que no parezca de juguete.
  const DURATION=7.8,GROUND=620,PICKUP=500,WALK=3.1,HELI=.62,BOARD=3.6,DOOR=56;
  const ease=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
  function script(age,doorX){
    // El punto de recogida queda en cielo abierto, lejos de la fachada: el morro no la toca.
    // DOOR: la puerta de la cabina queda a esa distancia por detrás del punto de anclaje del sprite.
    const start=doorX-18,pick=doorX-PICKUP,hover={x:pick+DOOR,y:GROUND-27};
    // Helicóptero: baja desde la izquierda hasta dejar la puerta a ras de suelo y se va hacia el este.
    const down=ease((age-.4)/2.6),away=ease((age-4.3)/3.1);
    const heli={x:hover.x-560*(1-down)+away*760,y:hover.y-360*(1-down)-away*330+Math.sin(age*2.1)*2*(1-down*.5),tilt:(1-down)*.07-away*.12};
    // Cazador: sale por la puerta, corre hasta la cabina y sube de un salto.
    const u=Math.max(0,Math.min(1,(age-.15)/WALK)),x=start+(pick-start)*u,moving=u>0&&u<1;
    const hop=Math.max(0,Math.min(1,(age-.15-WALK)/(BOARD-.15-WALK))),hidden=age>=BOARD;
    const player={x:x-hop*10,y:GROUND-Math.sin(hop*Math.PI*.75)*26,vx:moving?(pick-start)/WALK:0,facing:-1,grounded:hop===0,hidden};
    return{heli,player,rope:0,pick,dawn:ease((age-1.5)/5),light:down*(1-away),done:age>=DURATION,loud:.12+.3*down*(1-away*.7)};
  }
  function draw(c,age,doorX,image,time){
    const s=script(age,doorX),frames=root.HELICOPTER_FRAMES;if(!image||!frames)return;
    const k=HELI,f=frames[Math.floor(time*16)%frames.length],h=s.heli;
    c.save();c.imageSmoothingEnabled=false;
    // Polvo que levanta el rotor al acercarse al suelo.
    if(s.light>.02)for(let i=0;i<16;i++){const u=(time*1.3+i/16)%1,side=i%2?1:-1;c.fillStyle='rgba(196,200,190,'+((1-u)*.5*s.light).toFixed(3)+')';c.fillRect(Math.round(h.x-40+side*(30+u*150)),Math.round(GROUND-3-u*14),u>.5?6:4,2);}
    // Sombra de contacto bajo el aparato mientras está cerca del suelo.
    if(s.light>.3){c.fillStyle='rgba(8,12,16,'+(.4*s.light).toFixed(3)+')';c.fillRect(Math.round(h.x-150),GROUND-2,230,3);}
    c.translate(Math.round(h.x),Math.round(h.y));c.rotate(h.tilt);
    c.drawImage(image,f[0],f[1],f[2],f[3],Math.round(-(f[4]??f[2]/2)*k),Math.round(-(f[5]??f[3]/2)*k),Math.round(f[2]*k),Math.round(f[3]*k));
    c.restore();
  }
  // Sobre la escena ya iluminada: el cielo se abre y entran las bandas de cine.
  function overlay(c,age,w,h){
    const s=script(age,0),bars=Math.round(h*.085*ease(age/.6));
    if(s.dawn>0){const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'rgba(255,196,132,'+(.2*s.dawn).toFixed(3)+')');sky.addColorStop(.6,'rgba(255,214,170,'+(.1*s.dawn).toFixed(3)+')');sky.addColorStop(1,'rgba(255,214,170,0)');c.save();c.globalCompositeOperation='screen';c.fillStyle=sky;c.fillRect(0,0,w,h);c.restore();}
    c.fillStyle='#05080d';c.fillRect(0,0,w,bars);c.fillRect(0,h-bars,w,bars);
    if(age<DURATION-1&&bars>10){c.fillStyle='#9fb4c4';c.font='10px monospace';c.textAlign='center';c.fillText('Espacio · Saltar la escena',w/2,h-Math.round(bars/2)+3);c.textAlign='start';}
  }
  const api={DURATION,GROUND,PICKUP,WALK,BOARD,HELI,DOOR,script,draw,overlay};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionTwoOutro=api;
})(typeof window!=='undefined'?window:globalThis);
