(function(root){
  'use strict';
  // Viñetas animadas del informe de la misión 01. Cada página del informe tiene
  // su escena, compuesta con el arte del juego: travelling sobre la ciudad,
  // ascenso por la obra y la llegada del helicóptero.
  const doc=root.document,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const shared={soldier:'assets/sprites/soldado-v2.png',heli:'assets/sprites/helicoptero-rescate-v3.png',fx:'assets/sprites/ambiente-animado-v1.png'};
  // Cada misión carga solo el arte de sus propias viñetas.
  const sources={one:{...shared,city:'assets/worlds/ciudad-fondo-v2.png',tower:'assets/worlds/mundo-01-edificio-v1.png',wolf:'assets/sprites/soldado-lobo-v1.png'},three:{...shared,carrier:'assets/worlds/mission-03/portaaviones-v1.png',air:'assets/worlds/mission-03/cubierta-atlas-v1.png',mecha:'assets/sprites/mecha-aereo-v1.png'},two:{...shared,ruins:'assets/worlds/mission-02/city-day-v1.png',graves:'assets/worlds/mission-02/cemetery-dusk-v1.png',chute:'assets/sprites/paracaidas-v1.png',zombie:'assets/sprites/zombi-cementerio-v1.png',atlas:'assets/worlds/mission-02/environment-atlas-v1.png'}};
  const images={},loading={};
  function load(set='one'){return loading[set]||(loading[set]=Promise.all(Object.entries(sources[set]||sources.one).map(([id,src])=>images[id]?null:new Promise(resolve=>{const image=new Image();image.onload=()=>{images[id]=image;resolve();};image.onerror=resolve;image.src=src;}))));}
  const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  function fx(c,row,frame,x,y,w,h,alpha=1){const sheet=images.fx;if(!sheet)return;const cw=sheet.width/4,ch=sheet.height/8;c.save();c.globalAlpha*=alpha;c.drawImage(sheet,(Math.floor(frame)%4)*cw,row*ch,cw,ch,x-w/2,y-h/2,w,h);c.restore();}
  function frame(c,image,f,x,y,scale,flip=1){if(!image||!f)return;c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip,1);c.drawImage(image,f[0],f[1],f[2],f[3],-f[2]*scale/2,-f[3]*scale,f[2]*scale,f[3]*scale);c.restore();}
  // Silueta: el sprite recortado y teñido, para insinuar sin mostrar.
  let stencil=null;
  function silhouette(c,image,f,x,y,scale,color,alpha){if(!image||!f)return;stencil=stencil||doc.createElement('canvas');const w=Math.ceil(f[2]*scale),h=Math.ceil(f[3]*scale);stencil.width=w;stencil.height=h;const s=stencil.getContext('2d');s.imageSmoothingEnabled=false;s.drawImage(image,f[0],f[1],f[2],f[3],0,0,w,h);s.globalCompositeOperation='source-in';s.fillStyle=color;s.fillRect(0,0,w,h);c.save();c.globalAlpha*=alpha;c.drawImage(stencil,Math.round(x-w/2),Math.round(y-h));c.restore();}
  function beams(c,w,h,t,horizon){c.save();c.globalCompositeOperation='screen';for(let i=0;i<3;i++){const x=w*(.18+i*.3),angle=Math.sin(t*(.3+i*.07)+i*2)*.5,len=h*1.4,tx=x+Math.sin(angle)*len,ty=horizon-Math.cos(angle)*len,g=c.createLinearGradient(x,horizon,tx,ty);g.addColorStop(0,'rgba(190,214,255,.22)');g.addColorStop(1,'rgba(190,214,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-2,horizon);c.lineTo(x+2,horizon);c.lineTo(tx+34,ty);c.lineTo(tx-34,ty);c.fill();}c.restore();}
  function rain(c,w,h,t,alpha){c.save();c.strokeStyle='rgba(190,210,235,'+alpha+')';c.lineWidth=1;c.beginPath();for(let i=0;i<70;i++){const x=(hash(i)*w+t*40)%w,y=(hash(i+90)*h+t*(420+hash(i+7)*220))%h;c.moveTo(x,y);c.lineTo(x-3,y+11);}c.stroke();c.restore();}
  function vignette(c,w,h){const g=c.createRadialGradient(w/2,h/2,h*.35,w/2,h/2,w*.62);g.addColorStop(0,'rgba(4,8,14,0)');g.addColorStop(1,'rgba(4,8,14,.72)');c.fillStyle=g;c.fillRect(0,0,w,h);}
  function bolt(c,x,y,length,seed){c.beginPath();c.moveTo(x,y);for(let i=1;i<=7;i++)c.lineTo(x+(hash(seed+i)-.5)*46,y+length*i/7);c.stroke();}
  function cover(c,image,w,h,pan,lift=0){if(!image)return;const scale=Math.max(h/image.height,w/image.width)*1.12,dw=image.width*scale,dh=image.height*scale;c.drawImage(image,-pan*(dw-w),h-dh+lift,dw,dh);}
  // Piezas del cielo de la misión 03: recortes del atlas de cubierta.
  function airCut(c,cut,x,y,w,h){if(images.air)c.drawImage(images.air,cut[0],cut[1],cut[2],cut[3],Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function airSky(c,w,h,t,speed){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#254566');g.addColorStop(.55,'#69a8c5');g.addColorStop(1,'#d1decc');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#ffedba';c.fillRect(Math.round(w*.8),22,16,16);for(let i=0;i<5;i++){const span=w+520,x=((i*311-t*(speed*(.5+i*.14)))%span+span)%span-400;airCut(c,[16,576,570,164],x,18+(i*53)%(h-70),360,104);}}
  function airClouds(c,w,h,t,speed,alpha){c.save();c.globalAlpha=alpha*.4;for(let i=0;i<3;i++){const span=w+900,x=((i*470-t*(speed+i*60))%span+span)%span-560;airCut(c,[16,576,570,164],x,i===1?h-60:8+i*24,520,110);}c.restore();}
  function flakBurst(c,x,y,phase,seed){if(phase>.75)return;const grow=6+phase*26;for(let i=0;i<14;i++){const a=hash(seed*3+i)*Math.PI*2,d=grow*(.3+hash(seed+i*7)*.7);c.fillStyle=phase<.15?'#fff1c2':phase<.32?(i%2?'#ffb23f':'#ff7a2a'):(i%2?'#5b5f66':'#3a3d44');const size=phase<.3?4:hash(seed+i)>.5?6:4;c.fillRect(Math.round(x+Math.cos(a)*d),Math.round(y+Math.sin(a)*d*.8),size,size);}}
  const scenes={one:[
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
      if(images.heli&&f){c.save();c.translate(Math.round(hx),0);c.scale(-1,1);c.drawImage(images.heli,f[0],f[1],f[2],f[3],Math.round(-(f[4]??f[2]/2)*scale),Math.round(hy-(f[5]??f[3]/2)*scale),f[2]*scale,f[3]*scale);c.restore();}
      // Azotea y el cazador esperando.
      c.fillStyle='#0b1119';c.fillRect(0,h-30,w,30);c.fillStyle='#1b2733';c.fillRect(0,h-30,w,3);
      for(let x=30;x<w;x+=94){c.fillStyle='#0b1119';c.fillRect(x,h-44,5,14);c.fillRect(x-8,h-46,21,3);}
      frame(c,images.soldier,root.SOLDIER_V2_FRAMES?.[6]?.[0],w*.22,h-30,.5);
      rain(c,w,h,t,.3);vignette(c,w,h);
    }
  ],two:[
    // 1 · El salto: Vega no puede aterrizar; el cazador baja en paracaídas.
    function(c,w,h,t){
      c.fillStyle='#98b4c8';c.fillRect(0,0,w,h);cover(c,images.ruins,w,h,Math.sin(t*.1)*.5+.5,14);
      for(let i=0;i<4;i++)fx(c,3,t*9+i,w*(.12+i*.22),h-52-(i%2)*14,18,27,.85);
      for(let i=0;i<5;i++){const u=(t*.08+i/5)%1;fx(c,4,t*5+i,w*(.3+i*.13)+u*20,h*.55-u*h*.5,40+u*60,40+u*60,(1-u)*.3);}
      const frames=root.HELICOPTER_FRAMES,f=frames?.[Math.floor(t*14)%Math.min(3,frames?.length||1)],hx=w*.5+((t*26)%(w*.9)),hy=h*.16+Math.sin(t*1.4)*3;
      if(images.heli&&f)c.drawImage(images.heli,f[0],f[1],f[2],f[3],Math.round(hx-f[2]*.11),Math.round(hy-f[3]*.11),f[2]*.22,f[3]*.22);
      // El paracaídas se balancea mientras desciende, en bucle.
      const drop=(t%9)/9,px=w*.3+Math.sin(t*1.2)*14,py=h*.08+drop*h*.62,chute=images.chute;
      if(chute){const s=.3;c.save();c.translate(px,py);c.rotate(Math.sin(t*1.2)*.07);c.drawImage(chute,0,0,384,512,-192*s,-40,384*s,512*s);c.restore();}
      const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(20,30,50,.05)');shade.addColorStop(1,'rgba(40,24,16,.3)');c.fillStyle=shade;c.fillRect(0,0,w,h);vignette(c,w,h);
    },
    // 2 · Los caídos: el cementerio despierta bajo la tormenta.
    function(c,w,h,t){
      c.fillStyle='#677282';c.fillRect(0,0,w,h);cover(c,images.graves,w,h,Math.sin(t*.09)*.5+.5,18);
      c.fillStyle='rgba(24,26,52,.38)';c.fillRect(0,0,w,h);
      const Z=root.ArcadeCemeteryZombies,sheet=images.zombie,bases=[200,406,620,825,1039,1241];
      if(Z&&sheet)for(let i=0;i<3;i++){const cycle=(t+i*1.7)%6.5,walking=cycle>2.2,row=walking?3:[0,2,0][i],index=walking?Math.floor((cycle-2.2)*5)%6:Math.min(5,Math.floor(cycle/2.2*6)),f=Z.FRAMES[row][index],s=.62,x=w*(.2+i*.3)-(walking?(cycle-2.2)*14:0),pivot=96+index*207;
        c.save();c.translate(Math.round(x),h-14);c.scale(-1,1);c.drawImage(sheet,f[0],f[1],f[2],f[3],(f[0]-pivot)*s,(f[1]-bases[row])*s,f[2]*s,f[3]*s);c.restore();}
      // Relámpago: destello breve y rayo dibujado.
      const storm=t%5.2,flash=storm<.5?(storm<.08?storm/.08:1-(storm-.08)/.42):0;
      if(flash>0){c.save();c.globalCompositeOperation='screen';c.fillStyle='rgba(170,196,255,'+(flash*.45)+')';c.fillRect(0,0,w,h);c.strokeStyle='rgba(235,242,255,'+flash+')';c.lineWidth=2;bolt(c,w*(.25+hash(Math.floor(t/5.2))*.5),0,h*.62,Math.floor(t/5.2)*13);c.restore();}
      rain(c,w,h,t,.34);vignette(c,w,h);
    },
    // 3 · El umbral: la puerta del mausoleo y el heraldo que la guarda.
    function(c,w,h,t){
      const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#0c1024');sky.addColorStop(1,'#232a44');c.fillStyle=sky;c.fillRect(0,0,w,h);
      cover(c,images.graves,w,h,.8,30);c.fillStyle='rgba(10,12,30,.62)';c.fillRect(0,0,w,h);
      const atlas=images.atlas;
      if(atlas){const cw=atlas.width/4,ch=atlas.height/2,zoom=1+Math.min(1,(t%14)/14)*.12,dh=h*1.02*zoom,dw=dh*cw/ch;c.drawImage(atlas,2*cw,ch,cw,ch,Math.round(w/2-dw/2),Math.round(h-dh+10),dw,dh);}
      // Energía del heraldo latiendo en el umbral.
      const pulse=.55+Math.sin(t*6)*.2+hash(Math.floor(t*14))*.25,gx=w/2,gy=h*.74;
      c.save();c.globalCompositeOperation='screen';const glow=c.createRadialGradient(gx,gy,4,gx,gy,90);glow.addColorStop(0,'rgba(150,220,255,'+(.75*pulse)+')');glow.addColorStop(.4,'rgba(90,150,255,'+(.3*pulse)+')');glow.addColorStop(1,'rgba(60,90,255,0)');c.fillStyle=glow;c.fillRect(gx-95,gy-95,190,190);
      c.strokeStyle='rgba(205,236,255,'+(.7*pulse)+')';c.lineWidth=1.5;for(let i=0;i<3;i++)bolt(c,gx+(i-1)*16,gy-58,54,Math.floor(t*12)*7+i*31);c.restore();
      c.fillStyle='#0a0d16';c.fillRect(0,h-12,w,12);
      frame(c,images.soldier,root.SOLDIER_V2_FRAMES?.[5]?.[0],w*.2,h-12,.5);
      rain(c,w,h,t,.26);vignette(c,w,h);
    }
  ],three:[
    // 1 · El dueño de la manada: el portaaviones volador y su escolta.
    function(c,w,h,t){
      airSky(c,w,h,t,60);
      const ship=images.carrier;if(ship){const k=w*.92/ship.width,bob=Math.sin(t*.8)*4;c.drawImage(ship,0,140,ship.width,690,Math.round(w*.04-Math.sin(t*.15)*10),Math.round(h*.16+bob),Math.round(ship.width*k),Math.round(690*k));}
      // La escolta cruza por delante, de derecha a izquierda.
      for(let i=0;i<2;i++){const x=w+200-((t*190+i*420)%(w+520));airCut(c,[1027,313,509,208],x,h*(.18+i*.5),150,61);}
      airClouds(c,w,h,t,300,.5);vignette(c,w,h);
    },
    // 2 · El asalto: la pasada bajo el fuego antiaéreo.
    function(c,w,h,t){
      airSky(c,w,h,t,220);
      const ship=images.carrier;if(ship){const k=w*.6/ship.width;c.globalAlpha=.9;c.drawImage(ship,0,140,ship.width,690,Math.round(w*.42),Math.round(h*.3+Math.sin(t)*3),Math.round(ship.width*k),Math.round(690*k));c.globalAlpha=1;}
      const hx=w*.26+Math.sin(t*.7)*18,hy=h*.42+Math.sin(t*5)*7;
      // Trazadoras desde cubierta y estallidos alrededor del helicóptero.
      for(let i=0;i<5;i++){const u=(t*1.8+i*.2)%1;c.fillStyle='#ffe08a';const sx=w*.58,sy=h*.5,ex=hx+(hash(i+Math.floor(t*1.8))-.5)*120,ey=hy+(hash(i+9)-.5)*70;c.fillRect(Math.round(sx+(ex-sx)*u),Math.round(sy+(ey-sy)*u),5,2);}
      for(let k=0;k<4;k++){const clock=t*2.2+k*.31,cycle=Math.floor(clock),phase=clock-cycle,bx=hx+(hash(cycle*5+k)-.5)*170,by=hy+(hash(cycle*11+k)-.5)*100;flakBurst(c,bx,by,phase,cycle+k);}
      c.save();c.translate(Math.round(hx),0);c.scale(-1,1);airCut(c,[936,640,600,240],-90,hy-36,180,72);c.restore();c.fillStyle='#c9d4d4';const rotor=Math.sin(t*92)*84;c.fillRect(Math.round(hx-rotor),Math.round(hy-30),Math.round(rotor*2),2);
      airClouds(c,w,h,t,520,.6);vignette(c,w,h);
    },
    // 3 · El Centinela: la máquina que guarda la proa.
    function(c,w,h,t){
      airSky(c,w,h,t,40);c.fillStyle='rgba(18,26,44,.5)';c.fillRect(0,0,w,h);
      for(let x=-((t*30)%200);x<w;x+=200)airCut(c,[12,344,642,172],x,h-52,202,70);
      const m=images.mecha;
      if(m){const cw=m.width/4,ch=m.height/3,col=Math.floor(t*4)%4,k=h*.86/ch,zoom=1+Math.min(1,(t%14)/14)*.1,dw=cw*k*zoom,dh=ch*k*zoom;c.drawImage(m,col*cw,0,cw,ch,Math.round(w*.62-dw/2),Math.round(h-44-dh*.93),Math.round(dw),Math.round(dh));}
      // Balizas de la zona de combate y el cazador, pequeño, frente a ella.
      for(const x of [w*.36,w*.9]){c.fillStyle='rgba(255,186,105,.3)';c.fillRect(Math.round(x)-2,Math.round(h*.2),4,Math.round(h*.6));c.fillStyle='#fff2a6';for(let y=h*.24;y<h*.78;y+=22)c.fillRect(Math.round(x)-1,Math.round(y+(Math.floor(t*20)%16)),3,7);}
      frame(c,images.soldier,root.SOLDIER_V2_FRAMES?.[5]?.[0],w*.16,h-44,.3);
      airClouds(c,w,h,t,420,.35);vignette(c,w,h);
    }
  ]};
  let raf=0,active=-1,target=null,start=0,list=scenes.one;
  function draw(now){if(active<0||!target)return;const c=target.getContext('2d'),t=(now-start)/1000;c.imageSmoothingEnabled=false;c.save();try{list[active](c,target.width,target.height,t);}catch{}c.restore();
    // Fundido de entrada entre viñetas.
    const fade=1-clamp(t/.5);if(fade>0){c.fillStyle='rgba(7,12,19,'+fade+')';c.fillRect(0,0,target.width,target.height);}
    raf=root.requestAnimationFrame(draw);}
  function show(canvas,index,set='one'){stop();list=scenes[set]||scenes.one;target=canvas;active=Math.max(0,Math.min(list.length-1,index));start=root.performance.now();
    const still=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    load(scenes[set]?set:'one').then(()=>{if(target!==canvas)return;if(still){const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;list[active](c,canvas.width,canvas.height,set==='one'&&active===1?11.2:6);}else{root.cancelAnimationFrame(raf);start=root.performance.now();raf=root.requestAnimationFrame(draw);}});}
  function stop(){root.cancelAnimationFrame(raf);raf=0;active=-1;target=null;}
  // Otras misiones aportan sus propias viñetas sin engordar este archivo.
  function register(set,files,list){sources[set]={...shared,...files};scenes[set]=list;api.sets=Object.keys(scenes);}
  const api={show,stop,load,register,images,tools:{clamp,hash,frame,fx,vignette,cover,silhouette},count:scenes.one.length,sets:Object.keys(scenes)};
  root.ArcadeStoryScenes=api;
})(typeof window!=='undefined'?window:globalThis);
