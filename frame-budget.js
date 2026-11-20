(function(root){
 'use strict';
 // Keep native display refresh and 120 Hz physics. Only the DOM is throttled;
 // a frozen paused world does not need to be redrawn at every display frame.
 function create(){let lastHud=-Infinity,previous='';
  return{plan(t,{paused=false,hidden=false,width=0,height=0}={}){
   const key=[paused,hidden,width,height].join('|'),changed=key!==previous;previous=key;
   if(hidden){lastHud=-Infinity;return{render:false,hud:false};}
   const render=changed||!paused,hud=changed||!paused&&t-lastHud>=50-.25;
   if(hud)lastHud=changed||!Number.isFinite(lastHud)?t:lastHud+Math.max(1,Math.floor((t-lastHud+.25)/50))*50;
   return{render,hud};
  }};
 }
 // Cámara cercana de las misiones panorámicas. El mundo se dibuja igual que
 // siempre; aquí solo se amplía la zona que rodea al jugador, anclada al suelo,
 // para que los personajes se vean grandes. El acercamiento se relaja con
 // suavidad en cinemáticas y jefes, que necesitan el plano completo.
 function createView(limit=1.4){
  const v={zoom:1,x:0,y:0,lead:0};
  return{state:v,limit,
   update(target,dt){const goal=Math.max(1,Math.min(limit,target)),step=Math.min(1,Math.max(0,dt)*2.6);v.zoom+=(goal-v.zoom)*step;if(Math.abs(goal-v.zoom)<.003)v.zoom=goal;return v.zoom;},
   // Rectángulo visible (en píxeles del lienzo sin ampliar) para un foco dado.
   frame(width,height,focusX,focusY,facing=0,dt=0){const z=v.zoom,w=width/z,h=height/z;v.lead+=((facing||0)*w*.14-v.lead)*Math.min(1,dt*2.2);v.x=Math.max(0,Math.min(width-w,focusX+v.lead-w/2));v.y=Math.max(0,Math.min(height-h,focusY-h*.66));return{x:v.x,y:v.y,w,h,zoom:z};},
   draw(c,width,height,focusX,focusY,facing,dt,paint){if(v.zoom<=1.003){v.lead=0;paint();return;}const f=this.frame(width,height,focusX,focusY,facing,dt),z=f.zoom;c.save();c.beginPath();c.rect(0,0,width,height);c.clip();c.translate(-Math.round(f.x*z),-Math.round(f.y*z));c.scale(z,z);paint();c.restore();}
  };
 }
 const api={create,createView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeFrameBudget=api;
})(typeof window!=='undefined'?window:globalThis);
