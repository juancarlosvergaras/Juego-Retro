(function(root){
  'use strict';
  // Viñetas animadas del informe de la misión 04, compuestas con el arte de la
  // carretera: el convoy que huye, la moto del cazador y el camión blindado.
  const Scenes=root.ArcadeStoryScenes;if(!Scenes)return;
  const {clamp,hash,fx,vignette}=Scenes.tools,images=Scenes.images;
  // Los sprites se limpian y recortan una sola vez, la primera vez que se dibujan.
  const ready={};
  function sheet(id,cols,rows){
    if(ready[id])return ready[id];const image=images[id];if(!image||!root.ArcadeRoadRenderer)return null;
    const clean=root.prepareWhiteDeath?root.prepareWhiteDeath(image):image;
    return ready[id]={image:clean,frames:root.ArcadeRoadRenderer.atlas(clean,cols,rows),cell:Math.floor(clean.width/cols)};
  }
  // Dibuja un cuadro apoyado en el suelo y centrado en su celda, para que no salte.
  function sprite(c,s,index,x,y,k,alpha=1){if(!s)return;const f=s.frames[index],off=(f[0]%s.cell+f[2]/2-s.cell/2)*k;c.save();c.globalAlpha*=alpha;c.drawImage(s.image,f[0],f[1],f[2],f[3],Math.round(x+off-f[2]*k/2),Math.round(y-f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();}
  // Autopista al atardecer: cielo lento, calzada rápida.
  function highway(c,w,h,t,horizon,speed){
    const img=images.road;c.fillStyle='#d98548';c.fillRect(0,0,w,h);if(!img)return;
    const cut=Math.round(img.height*.48),skyW=Math.round(w*1.5),roadW=Math.round(w*1.3);
    for(let x=-((t*speed*.04)%skyW);x<w;x+=skyW)c.drawImage(img,0,0,img.width,cut,Math.round(x),0,skyW,horizon);
    for(let x=-((t*speed)%roadW);x<w;x+=roadW)c.drawImage(img,0,cut,img.width,img.height-cut,Math.round(x),horizon,roadW+1,h-horizon);
  }
  function dust(c,x,y,t,seed,strength=1){for(let i=0;i<6;i++){const u=(t*1.6+i/6+hash(seed))%1,size=Math.round((4+u*10)*strength);c.globalAlpha=(1-u)*.4;c.fillStyle=i%2?'#c9a777':'#a88a62';c.fillRect(Math.round(x-u*70*strength),Math.round(y-size-u*8),size*2,size);}c.globalAlpha=1;}
  function shadow(c,x,y,w){c.fillStyle='rgba(8,12,16,.5)';c.fillRect(Math.round(x-w*.42),Math.round(y-2),Math.round(w*.84),3);c.fillStyle='rgba(8,12,16,.28)';c.fillRect(Math.round(x-w*.5),Math.round(y),Math.round(w),3);}
  function dusk(c,w,h,top,bottom){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,w,h);}
  Scenes.register('four',{road:'assets/worlds/mission-04/carretera-atardecer-v1.png',riders:'assets/sprites/motos-carretera-v1.png',rig:'assets/sprites/jefe-convoy-v3.png'},[
    // 1 · La huida: el convoy se aleja por la autopista con su escolta.
    function(c,w,h,t){
      const riders=sheet('riders',4,3),rig=sheet('rig',2,3),ground=h-46;
      highway(c,w,h,t,150,300);
      // Columna de humo lejana: lo que queda del portaaviones.
      for(let i=0;i<7;i++){const u=(t*.07+i/7)%1;c.globalAlpha=(1-u)*.35;c.fillStyle=i%2?'#3a3136':'#4b3f41';const size=6+u*22;c.fillRect(Math.round(w*.14+u*46-size/2),Math.round(118-u*96),Math.round(size),Math.round(size*.8));}c.globalAlpha=1;
      const drift=Math.sin(t*.5)*10,rx=w*.6+drift;
      shadow(c,rx,ground,236);dust(c,rx-112,ground,t,3,1.5);sprite(c,rig,Math.floor(t*3)%7===0?1:0,rx,ground+Math.sin(t*15)*.8,.33);
      shadow(c,w*.24-drift*.6,ground+22,74);dust(c,w*.24-drift*.6-34,ground+22,t,9);sprite(c,riders,9,w*.24-drift*.6,ground+22+Math.sin(t*19)*.6,.21);
      shadow(c,w*.93+drift*.4,ground-20,60);sprite(c,riders,8,w*.93+drift*.4,ground-20+Math.sin(t*21)*.6,.19);
      dusk(c,w,h,'rgba(20,14,34,.28)','rgba(255,120,60,.1)');vignette(c,w,h);
    },
    // 2 · La persecución: Vega suelta al cazador y la moto se lanza tras ellos.
    function(c,w,h,t){
      const riders=sheet('riders',4,3),ground=h-40,cycle=t%12,enter=clamp(cycle/2.2),e=1-(1-enter)**3;
      highway(c,w,h,t,146,520);
      const frames=root.HELICOPTER_FRAMES,f=frames?.[Math.floor(t*14)%Math.min(3,frames?.length||1)],hx=w*.3+cycle*34,hy=58-clamp((cycle-2)/5)*60+Math.sin(t*1.6)*3;
      if(images.heli&&f){const k=.3;c.save();c.translate(Math.round(hx),Math.round(hy));c.rotate(-.06-clamp((cycle-2)/5)*.12);c.drawImage(images.heli,f[0],f[1],f[2],f[3],Math.round(-(f[4]??f[2]/2)*k),Math.round(-(f[5]??f[3]/2)*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();}
      // Líneas de velocidad y el faro abriendo camino.
      c.fillStyle='#ffe9c2';for(let i=0;i<10;i++){const u=(t*1.4+hash(i)*3)%1;c.globalAlpha=.2*(1-u);c.fillRect(Math.round(w-u*(w+120)),160+((i*37)%80),70,1);}c.globalAlpha=1;
      const x=-80+(w*.36+80)*e+Math.sin(t*.9)*6;
      c.save();c.globalCompositeOperation='screen';const beam=c.createLinearGradient(x+50,0,x+250,0);beam.addColorStop(0,'rgba(255,236,180,.34)');beam.addColorStop(1,'rgba(255,236,180,0)');c.fillStyle=beam;c.beginPath();c.moveTo(x+50,ground-44);c.lineTo(x+250,ground-70);c.lineTo(x+250,ground+4);c.closePath();c.fill();c.restore();
      shadow(c,x,ground,124);dust(c,x-58,ground,t,5,1.3);sprite(c,riders,enter<1?1:Math.floor(t*.5)%4===3?2:0,x,ground+Math.sin(t*23)*.8,.34);
      // Las luces traseras del convoy, ya lejos.
      for(let i=0;i<3;i++){c.fillStyle=Math.floor(t*6+i)%5?'#ff5a44':'#ffb08a';c.fillRect(Math.round(w*.84+i*26+Math.sin(t+i)*4),ground-18-i*9,3,2);}
      dusk(c,w,h,'rgba(20,14,34,.22)','rgba(255,120,60,.08)');vignette(c,w,h);
    },
    // 3 · El Devorador de Asfalto: tres torretas, un horno y minas en la calzada.
    function(c,w,h,t){
      const rig=sheet('rig',2,3),ground=h-30,fire=Math.floor(t*2.2)%3===0;
      highway(c,w,h,t,132,380);dusk(c,w,h,'rgba(12,8,24,.55)','rgba(60,10,6,.32)');
      const rx=w*.56+Math.sin(t*.7)*8,k=.56;
      shadow(c,rx,ground,400);dust(c,rx-190,ground,t,2,2);sprite(c,rig,fire?1:0,rx,ground+Math.sin(t*14)*1.2,k);
      // El horno late y las torretas iluminan la noche.
      c.save();c.globalCompositeOperation='screen';const heat=.55+Math.sin(t*5)*.2,g=c.createRadialGradient(rx-14,ground-118,4,rx-14,ground-118,90);g.addColorStop(0,'rgba(255,170,70,'+heat.toFixed(3)+')');g.addColorStop(1,'rgba(255,120,40,0)');c.fillStyle=g;c.fillRect(rx-110,ground-210,200,190);
      if(fire)for(const dx of [-196,36]){const m=c.createRadialGradient(rx+dx,ground-168,0,rx+dx,ground-168,60);m.addColorStop(0,'rgba(255,220,150,.7)');m.addColorStop(1,'rgba(255,160,80,0)');c.fillStyle=m;c.fillRect(rx+dx-60,ground-228,120,120);}c.restore();
      // Minas que deja caer y parpadean en la calzada.
      for(let i=0;i<3;i++){const u=(t*.22+i/3)%1,mx=rx-210-u*(w*.5),my=ground+6-(i%2)*8;c.fillStyle='#1c1f22';c.fillRect(Math.round(mx)-6,Math.round(my)-5,12,5);c.fillStyle=Math.floor(t*6+i)%2?'#ff4a3a':'#5a1c16';c.fillRect(Math.round(mx)-1,Math.round(my)-8,3,3);}
      for(let i=0;i<4;i++)fx(c,3,t*10+i,rx-150+i*96,ground-150-(i%2)*30,14,20,.5);
      vignette(c,w,h);
    }
  ]);
})(typeof window!=='undefined'?window:globalThis);
