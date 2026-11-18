(function(root){
  'use strict';
  // Viñetas animadas del informe de la misión 01. Cada página del informe tiene
  // su escena, compuesta con el arte del juego: travelling sobre la ciudad,
  // ascenso por la obra y la llegada del helicóptero.
  const doc=root.document,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const sources={city:'assets/worlds/ciudad-fondo-v2.png',tower:'assets/worlds/mundo-01-edificio-v1.png',soldier:'assets/sprites/soldado-v2.png',wolf:'assets/sprites/soldado-lobo-v1.png',heli:'assets/sprites/helicoptero-rescate-v3.png',fx:'assets/sprites/ambiente-animado-v1.png'};
  const images={};let loading=null;
  function load(){return loading||(loading=Promise.all(Object.entries(sources).map(([id,src])=>new Promise(resolve=>{const image=new Image();image.onload=()=>{images[id]=image;resolve();};image.onerror=resolve;image.src=src;}))));}
  const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  function fx(c,row,frame,x,y,w,h,alpha=1){const sheet=images.fx;if(!sheet)return;const cw=sheet.width/4,ch=sheet.height/8;c.save();c.globalAlpha*=alpha;c.drawImage(sheet,(Math.floor(frame)%4)*cw,row*ch,cw,ch,x-w/2,y-h/2,w,h);c.restore();}
  function frame(c,image,f,x,y,scale,flip=1){if(!image||!f)return;c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip,1);c.drawImage(image,f[0],f[1],f[2],f[3],-f[2]*scale/2,-f[3]*scale,f[2]*scale,f[3]*scale);c.restore();}
  // Silueta: el sprite recortado y teñido, para insinuar sin mostrar.
  let stencil=null;
  function silhouette(c,image,f,x,y,scale,color,alpha){if(!image||!f)return;stencil=stencil||doc.createElement('canvas');const w=Math.ceil(f[2]*scale),h=Math.ceil(f[3]*scale);stencil.width=w;stencil.height=h;const s=stencil.getContext('2d');s.imageSmoothingEnabled=false;s.drawImage(image,f[0],f[1],f[2],f[3],0,0,w,h);s.globalCompositeOperation='source-in';s.fillStyle=color;s.fillRect(0,0,w,h);c.save();c.globalAlpha*=alpha;c.drawImage(stencil,Math.round(x-w/2),Math.round(y-h));c.restore();}
  function beams(c,w,h,t,horizon){c.save();c.globalCompositeOperation='screen';for(let i=0;i<3;i++){const x=w*(.18+i*.3),angle=Math.sin(t*(.3+i*.07)+i*2)*.5,len=h*1.4,tx=x+Math.sin(angle)*len,ty=horizon-Math.cos(angle)*len,g=c.createLinearGradient(x,horizon,tx,ty);g.addColorStop(0,'rgba(190,214,255,.22)');g.addColorStop(1,'rgba(190,214,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-2,horizon);c.lineTo(x+2,horizon);c.lineTo(tx+34,ty);c.lineTo(tx-34,ty);c.fill();}c.restore();}
  function rain(c,w,h,t,alpha){c.save();c.strokeStyle='rgba(190,210,235,'+alpha+')';c.lineWidth=1;c.beginPath();for(let i=0;i<70;i++){const x=(hash(i)*w+t*40)%w,y=(hash(i+90)*h+t*(420+hash(i+7)*220))%h;c.moveTo(x,y);c.lineTo(x-3,y+11);}c.stroke();c.restore();}
  function vignette(c,w,h){const g=c.createRadialGradient(w/2,h/2,h*.35,w/2,h/2,w*.62);g.addColorStop(0,'rgba(4,8,14,0)');g.addColorStop(1,'rgba(4,8,14,.72)');c.fillStyle=g;c.fillRect(0,0,w,h);}
  const scenes=[
    // 1 · El contrato: la ciudad en guerra y el cazador que la observa.
    function(c,w,h,t){
      const city=images.city;c.fillStyle='#1a2740';c.fillRect(0,0,w,h);
      if(city){const scale=h*1.35/city.height,dw=city.width*scale,pan=(Math.sin(t*.12)*.5+.5)*(dw-w);c.drawImage(city,-pan,h-city.height*scale+18,dw,city.height*scale);}
      const dusk=c.createLinearGradient(0,0,0,h);dusk.addColorStop(0,'rgba(10,16,40,.5)');dusk.addColorStop(1,'rgba(255,128,64,.2)');c.fillStyle=dusk;c.fillRect(0,0,w,h);
      beams(c,w,h,t,h*.72);
      c.save();c.globalCompositeOperation='screen';for(let k=0;k<4;k++){const clock=t*.5+k*.37,cycle=Math.floor(clock),phase=clock-cycle;if(phase>.2)continue;const x=w*(.1+hash(cycle*7+k)*.8),y=h*(.1+hash(cycle*13+k)*.4),life=1-phase/.2,r=6+18*(1-life),g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,236,190,'+(.8*life)+')');g.addColorStop(1,'rgba(255,120,60,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}c.restore();
      // Cornisa en primer plano y el cazador, de espaldas a la luz.
      c.fillStyle='#0a1018';c.beginPath();c.moveTo(0,h);c.lineTo(0,h-34);c.lineTo(w*.34,h-34);c.lineTo(w*.4,h-18);c.lineTo(w*.46,h);c.fill();
      const idle=root.SOLDIER_V2_FRAMES?.[5]?.[0];frame(c,images.soldier,idle,w*.2,h-33+Math.sin(t*1.6)*.6,.62);
      for(let i=0;i<3;i++)fx(c,3,t*9+i,w*(.62+i*.07),h-64-i*9,16,24,.8);
      vignette(c,w,h);
    },
    // 2 · La Obra: subida por la torre hasta lo que acecha arriba.
    function(c,w,h,t){
      const tower=images.tower;c.fillStyle='#0d1522';c.fillRect(0,0,w,h);
      const cycle=14,u=(t%cycle)/cycle,rise=u<.75?u/.75:1,eased=rise*rise*(3-2*rise);
      if(tower){const scale=w/tower.width,total=tower.height*scale,y=-(total-h)*(1-eased);c.drawImage(tower,0,y,w,total);
        for(let i=0;i<5;i++){const fy=y+total*(.35+i*.13);if(fy>-30&&fy<h+30)fx(c,3,t*10+i,w*(i%2?.2:.83),fy,20,30,.85);}}
      const night=c.createLinearGradient(0,0,0,h);night.addColorStop(0,'rgba(8,12,30,'+(.2+.5*eased)+')');night.addColorStop(1,'rgba(8,12,30,.25)');c.fillStyle=night;c.fillRect(0,0,w,h);
      // Al llegar a la azotea aparece la silueta del lobo, recortada contra la luna.
      const reveal=clamp((u-.7)/.12)*clamp((1-u)/.06);
      if(reveal>0){const mx=w*.68,my=h*.34;c.save();c.globalAlpha=reveal;const moon=c.createRadialGradient(mx,my,6,mx,my,74);moon.addColorStop(0,'rgba(236,240,255,.95)');moon.addColorStop(.42,'rgba(210,222,255,.55)');moon.addColorStop(1,'rgba(160,180,255,0)');c.fillStyle=moon;c.fillRect(mx-80,my-80,160,160);c.restore();
        silhouette(c,images.wolf,root.ACTION_FRAMES?.wolf?.[0]?.[7],mx,my+62,.78,'#05080e',reveal);
        c.save();c.globalAlpha=reveal*(Math.sin(t*5)>-.85?1:0);c.fillStyle='#ffd45a';c.fillRect(Math.round(mx+13),Math.round(my-17),3,2);c.fillRect(Math.round(mx+21),Math.round(my-17),3,2);c.restore();}
      rain(c,w,h,t,.18);vignette(c,w,h);
    },
    // 3 · La extracción: el helicóptero de Vega sobre la azotea.
    function(c,w,h,t){
      const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#0a1228');sky.addColorStop(1,'#1c2c46');c.fillStyle=sky;c.fillRect(0,0,w,h);
      const city=images.city;if(city){const scale=h*.9/city.height;c.globalAlpha=.55;c.drawImage(city,-60-Math.sin(t*.1)*30,h-city.height*scale+40,city.width*scale,city.height*scale);c.globalAlpha=1;}
      beams(c,w,h,t,h*.8);
      const frames=root.HELICOPTER_FRAMES,f=frames?.[Math.floor(t*14)%Math.min(3,frames.length)],approach=clamp(((t%16))/5),ease=1-(1-approach)**3;
      const hx=w*1.25-(w*.72)*ease+Math.sin(t*.9)*6,hy=h*.38+Math.sin(t*1.7)*4,scale=.36;
      // Foco del helicóptero barriendo la azotea.
      c.save();c.globalCompositeOperation='screen';const sweep=Math.sin(t*.8)*26,cone=c.createLinearGradient(hx-40,hy,hx-70+sweep,h);cone.addColorStop(0,'rgba(220,236,255,.4)');cone.addColorStop(1,'rgba(220,236,255,0)');c.fillStyle=cone;c.beginPath();c.moveTo(hx-44,hy-4);c.lineTo(hx-36,hy-4);c.lineTo(hx-20+sweep,h);c.lineTo(hx-130+sweep,h);c.fill();c.restore();
      if(images.heli&&f)c.drawImage(images.heli,f[0],f[1],f[2],f[3],Math.round(hx-(f[4]??f[2]/2)*scale),Math.round(hy-(f[5]??f[3]/2)*scale),f[2]*scale,f[3]*scale);
      // Azotea y el cazador esperando.
      c.fillStyle='#0b1119';c.fillRect(0,h-30,w,30);c.fillStyle='#1b2733';c.fillRect(0,h-30,w,3);
      for(let x=30;x<w;x+=94){c.fillStyle='#0b1119';c.fillRect(x,h-44,5,14);c.fillRect(x-8,h-46,21,3);}
      frame(c,images.soldier,root.SOLDIER_V2_FRAMES?.[6]?.[0],w*.22,h-30,.5);
      rain(c,w,h,t,.3);vignette(c,w,h);
    }
  ];
  let raf=0,active=-1,target=null,start=0;
  function draw(now){if(active<0||!target)return;const c=target.getContext('2d'),t=(now-start)/1000;c.imageSmoothingEnabled=false;c.save();try{scenes[active](c,target.width,target.height,t);}catch{}c.restore();
    // Fundido de entrada entre viñetas.
    const fade=1-clamp(t/.5);if(fade>0){c.fillStyle='rgba(7,12,19,'+fade+')';c.fillRect(0,0,target.width,target.height);}
    raf=root.requestAnimationFrame(draw);}
  function show(canvas,index){stop();target=canvas;active=Math.max(0,Math.min(scenes.length-1,index));start=root.performance.now();
    const still=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    load().then(()=>{if(target!==canvas)return;if(still){const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;scenes[active](c,canvas.width,canvas.height,active===1?11.2:6);}else{root.cancelAnimationFrame(raf);start=root.performance.now();raf=root.requestAnimationFrame(draw);}});}
  function stop(){root.cancelAnimationFrame(raf);raf=0;active=-1;target=null;}
  root.ArcadeStoryScenes={show,stop,load,count:scenes.length};
})(typeof window!=='undefined'?window:globalThis);
