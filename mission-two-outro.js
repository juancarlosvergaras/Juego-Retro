(function(root){
  'use strict';
  // Salida de la misión 02: el cazador deja el mausoleo, la tormenta amaina y
  // Vega lo recoge con el helicóptero. Guion puro (edad → posiciones) y dibujo
  // aparte, para que el juego solo tenga que seguirlo.
  const DURATION=8.6,GROUND=620,PICKUP=330,WALK=3.4;
  const ease=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
  function script(age,doorX){
    // El punto de recogida queda en cielo abierto, a la izquierda de la fachada.
    const start=doorX-18,pick=doorX-PICKUP,hover={x:pick+6,y:GROUND-150};
    // Helicóptero: baja desde la izquierda, se queda sobre el punto y se va hacia el este.
    const down=ease((age-.4)/2.9),away=ease((age-5.4)/2.9);
    const heli={x:hover.x-520*(1-down)+away*620,y:hover.y-330*(1-down)-away*260+Math.sin(age*2.1)*3,tilt:(1-down)*.06-away*.1};
    // Cazador: sale por la puerta y camina sin detenerse hasta la cuerda; luego sube.
    const u=Math.max(0,Math.min(1,(age-.15)/WALK)),x=start+(pick-start)*u,moving=u>0&&u<1;
    const climb=ease((age-4.15)/1.05),hidden=age>=5.2;
    const player={x,y:GROUND-climb*104,vx:moving?(pick-start)/WALK:0,facing:-1,grounded:climb===0,hidden};
    // La cuerda cae antes de que llegue y se recoge con él.
    const rope=age>2.5&&age<5.5?Math.max(0,(ease((age-2.5)/.7)-climb*.72))*118:0;
    return{heli,player,rope,pick,dawn:ease((age-1.5)/5),light:down*(1-away),done:age>=DURATION,loud:.12+.3*down*(1-away*.7)};
  }
  function draw(c,age,doorX,image,time){
    const s=script(age,doorX),frames=root.HELICOPTER_FRAMES;if(!image||!frames)return;
    const k=.4,f=frames[Math.floor(time*16)%frames.length],h=s.heli;
    c.save();c.imageSmoothingEnabled=false;
    // Foco de búsqueda y polvo que levanta el rotor.
    if(s.light>.02){c.save();c.globalCompositeOperation='screen';const beam=c.createLinearGradient(0,h.y+20,0,GROUND);beam.addColorStop(0,'rgba(226,238,255,'+(.3*s.light).toFixed(3)+')');beam.addColorStop(1,'rgba(226,238,255,'+(.06*s.light).toFixed(3)+')');c.fillStyle=beam;c.beginPath();c.moveTo(h.x-4,h.y+22);c.lineTo(h.x+4,h.y+22);c.lineTo(s.pick+56,GROUND);c.lineTo(s.pick-56,GROUND);c.closePath();c.fill();c.restore();
      for(let i=0;i<12;i++){const u=(time*1.3+i/12)%1,side=i%2?1:-1;c.fillStyle='rgba(196,200,190,'+((1-u)*.5*s.light).toFixed(3)+')';c.fillRect(Math.round(s.pick+side*(14+u*70)),Math.round(GROUND-3-u*10),u>.5?5:3,2);}}
    if(s.rope>0){c.fillStyle='#22271f';c.fillRect(Math.round(h.x)-1,Math.round(h.y+24),2,Math.round(s.rope));c.fillStyle='#8a7a55';c.fillRect(Math.round(h.x)-2,Math.round(h.y+24+s.rope)-3,4,3);}
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
  const api={DURATION,GROUND,PICKUP,script,draw,overlay};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionTwoOutro=api;
})(typeof window!=='undefined'?window:globalThis);
