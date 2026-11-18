(function(root){
  'use strict';
  // Atmósfera de la misión 01: cielo vivo detrás del edificio y un mapa de luz
  // sobre la escena. Todo es procedural y acotado: sin lecturas de píxeles ni
  // lienzos nuevos por fotograma.
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  // 0 en la calle, 1 en la azotea.
  function altitude(camera,height,world){return clamp((world.ground-(camera.y+height*.6))/(world.ground-world.roof));}

  // Reflectores antiaéreos y fuego de artillería lejano; se dibuja antes del edificio.
  function sky(c,camera,width,height,time,world,city){
    const a=altitude(camera,height,world),horizon=Math.min(height,city.y+city.h*.78);
    c.save();
    // El atardecer se apaga a medida que se sube: cálido abajo, noche fría arriba.
    const warm=c.createLinearGradient(0,horizon-260,0,horizon+40);
    warm.addColorStop(0,'rgba(255,150,80,0)');warm.addColorStop(1,'rgba(255,138,72,'+(.2*(1-a)).toFixed(3)+')');
    c.fillStyle=warm;c.fillRect(0,horizon-260,width,300);
    c.fillStyle='rgba(8,14,34,'+(.34*a).toFixed(3)+')';c.fillRect(0,0,width,height);
    c.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){
      const x=city.x+city.w*(.2+i*.27),angle=Math.sin(time*(.21+i*.05)+i*2.1)*.55+(i-1)*.18,length=height+260;
      const tx=x+Math.sin(angle)*length,ty=horizon-Math.cos(angle)*length,spread=46;
      const beam=c.createLinearGradient(x,horizon,tx,ty);beam.addColorStop(0,'rgba(190,214,255,.17)');beam.addColorStop(1,'rgba(190,214,255,0)');
      c.fillStyle=beam;c.beginPath();c.moveTo(x-2,horizon);c.lineTo(x+2,horizon);c.lineTo(tx+spread,ty);c.lineTo(tx-spread,ty);c.closePath();c.fill();
    }
    for(let k=0;k<4;k++){
      const clock=time*.43+k*.37,cycle=Math.floor(clock),phase=clock-cycle;if(phase>.16)continue;
      const x=width*(.08+hash(cycle*7+k)*.84),y=height*(.08+hash(cycle*13+k*3)*.5),life=1-phase/.16,r=10+22*(1-life);
      const burst=c.createRadialGradient(x,y,0,x,y,r);burst.addColorStop(0,'rgba(255,236,190,'+(.75*life).toFixed(3)+')');burst.addColorStop(.4,'rgba(255,160,90,'+(.3*life).toFixed(3)+')');burst.addColorStop(1,'rgba(255,120,60,0)');
      c.fillStyle=burst;c.fillRect(x-r,y-r,r*2,r*2);
    }
    c.restore();
  }

  // Fuentes de luz del mundo en coordenadas de mundo. `glow` añade color visible.
  function collect(state){
    const {player:p,encounter:e,platforms,time,arrival,checkpoint}=state,lights=[];
    for(const s of platforms)if(s.kind==='deck'&&s.floor%4===0&&!s.arena)lights.push({x:s.x+s.w*.7,y:s.y+(s.thickness||12)+40,r:150,a:.8+Math.sin(time*9+s.x)*.04});
    if(!arrival?.active)lights.push({x:p.x,y:p.y-26,r:p.form==='zombie'?150:120,a:.78,glow:p.form==='zombie'?'120,220,255':null,ga:.1});
    if(arrival?.visible)lights.push({x:arrival.x+62,y:arrival.ground-22,r:120,a:.85,glow:'255,232,170',ga:.2});
    if(checkpoint)lights.push({x:checkpoint.x,y:checkpoint.y-22,r:70,a:.6,glow:'110,255,170',ga:.08});
    if(e.flash>0&&p.form!=='wolf'){const aim=e.lastAim||{x:p.facing,y:0},k=clamp(e.flash/.14);lights.push({x:p.x+aim.x*26,y:p.y-28+aim.y*24,r:170,a:k,glow:'255,214,140',ga:.3*k});}
    for(const n of e.enemies)if(n.hp>0&&n.flash>0)lights.push({x:n.x+n.facing*20,y:n.y-28,r:120,a:.9,glow:'255,180,120',ga:.26});
    const b=e.boss;if(b.hp>0&&b.flash>0)lights.push({x:b.x+(b.facing||1)*34,y:b.y-40,r:150,a:1,glow:'255,190,120',ga:.3});
    const f=e.finalBoss;if(f?.active&&f.hp>0)lights.push({x:f.x,y:f.y-45,r:130,a:.55,glow:f.stage===2?'150,255,120':'255,120,90',ga:.07});
    for(const m of f?.missiles||[])lights.push({x:m.x,y:m.y,r:60,a:.8,glow:'255,170,90',ga:.25});
    for(const blast of e.explosions){const k=clamp(blast.life*2.2),r=(blast.radius||80)*2.4;lights.push({x:blast.x,y:blast.y,r,a:k,glow:'255,170,90',ga:.34*k});}
    let shots=0;for(const s of e.bullets){if(shots++>=28)break;lights.push({x:s.x,y:s.y,r:s.slot===6?46:26,a:.55,glow:s.enemy?'255,120,90':'255,236,170',ga:.16});}
    if(e.extraction){const x=e.extraction.x??p.x,y=e.extraction.y??p.y-120;lights.push({x,y:y+70,r:230,a:.9,glow:'220,236,255',ga:.1});}
    return lights;
  }

  let shade=null,shadeCtx=null,vignette=null;
  function lightmap(c,camera,width,height,lights,ambient){
    if(!shade){shade=root.document.createElement('canvas');shadeCtx=shade.getContext('2d');}
    if(shade.width!==width||shade.height!==height){shade.width=width;shade.height=height;vignette=null;}
    const s=shadeCtx;s.globalCompositeOperation='source-over';s.clearRect(0,0,width,height);s.fillStyle='rgba(6,10,24,'+ambient.toFixed(3)+')';s.fillRect(0,0,width,height);
    s.globalCompositeOperation='destination-out';
    for(const l of lights){const x=l.x-camera.x,y=l.y-camera.y;if(x+l.r<0||x-l.r>width||y+l.r<0||y-l.r>height)continue;
      const g=s.createRadialGradient(x,y,l.r*.12,x,y,l.r);g.addColorStop(0,'rgba(0,0,0,'+clamp(l.a).toFixed(3)+')');g.addColorStop(1,'rgba(0,0,0,0)');s.fillStyle=g;s.fillRect(x-l.r,y-l.r,l.r*2,l.r*2);}
    c.save();c.drawImage(shade,0,0);
    c.globalCompositeOperation='screen';
    for(const l of lights){if(!l.glow||!(l.ga>0))continue;const x=l.x-camera.x,y=l.y-camera.y,r=l.r*.8;if(x+r<0||x-r>width||y+r<0||y-r>height)continue;
      const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+l.glow+','+clamp(l.ga).toFixed(3)+')');g.addColorStop(1,'rgba('+l.glow+',0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
    c.restore();
    if(!vignette){vignette=root.document.createElement('canvas');vignette.width=width;vignette.height=height;const v=vignette.getContext('2d'),g=v.createRadialGradient(width/2,height/2,Math.min(width,height)*.42,width/2,height/2,Math.hypot(width,height)*.56);g.addColorStop(0,'rgba(3,6,12,0)');g.addColorStop(1,'rgba(3,6,12,.5)');v.fillStyle=g;v.fillRect(0,0,width,height);}
    c.drawImage(vignette,0,0);
  }
  function draw(c,camera,width,height,state,world){
    const a=altitude(camera,height,world);
    lightmap(c,camera,width,height,collect(state),.2+.16*a);
  }
  const api={altitude,sky,collect,lightmap,draw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionOneFx=api;
})(typeof window!=='undefined'?window:globalThis);
