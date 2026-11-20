(function(root){
  'use strict';
  // Viñetas de los informes de las misiones 05 a 08. Cada una encuadra un fondo
  // que la misión ya usa y le añade luz y movimiento dibujados; los jefes
  // aparecen con un cuadro de su propia hoja, sin ciclos nuevos de animación.
  const Scenes=root.ArcadeStoryScenes;if(!Scenes)return;
  const {clamp,hash,vignette}=Scenes.tools,images=Scenes.images,TAU=Math.PI*2;
  // Encuadre de una franja del fondo que llena la viñeta. `u` y `v` (0 a 1)
  // mueven la cámara dentro de la franja; devuelve cómo pasar de imagen a lienzo.
  function plate(c,img,w,h,band,u=.5,v=.5,zoom=1){
    if(!img)return null;
    const [bx,by,bw,bh]=band||[0,0,img.width,img.height],k=Math.max(w/bw,h/bh)*zoom,sw=w/k,sh=h/k,sx=bx+(bw-sw)*clamp(u),sy=by+(bh-sh)*clamp(v);
    c.drawImage(img,sx,sy,sw,sh,0,0,w,h);
    return{k,x:sx,y:sy};
  }
  function fill(c,w,h,top,bottom){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,w,h);}
  // Las hojas que el juego limpia antes de dibujar se limpian aquí igual, una sola vez.
  const clean={};
  function sheet(id){const img=images[id];if(!img)return null;return clean[id]||(clean[id]=root.prepareWhiteDeath?root.prepareWhiteDeath(img):img);}
  // Un cuadro apoyado en el suelo: (x, y) es el punto entre los pies.
  function cell(c,img,f,x,y,k,flip=false){
    if(!img)return;c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);
    c.drawImage(img,f[0],f[1],f[2],f[3],-Math.round(f[2]*k/2),-Math.round(f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();
  }
  function glow(c,x,y,r,color,alpha){
    if(alpha<=0)return;c.save();c.globalCompositeOperation='screen';const g=c.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,'rgba('+color+','+alpha.toFixed(3)+')');g.addColorStop(1,'rgba('+color+',0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
  }
  function bubbles(c,w,h,t,count){
    c.fillStyle='#bfefff';
    for(let i=0;i<count;i++){const u=(t*(.08+hash(i)*.08)+hash(i+40))%1,x=hash(i+11)*w+Math.sin(t*1.3+i)*5,size=1+Math.floor(hash(i+7)*2.4);c.globalAlpha=.5*(1-u);c.fillRect(Math.round(x),Math.round(h-u*(h+20)),size,size);}
    c.globalAlpha=1;
  }
  function sunRays(c,w,h,t,strength){
    if(strength<=0)return;c.save();c.globalCompositeOperation='screen';
    for(let i=0;i<5;i++){const x=w*(.12+i*.19)+Math.sin(t*.3+i)*14,g=c.createLinearGradient(0,0,0,h*.9);g.addColorStop(0,'rgba(150,240,255,'+(.2*strength).toFixed(3)+')');g.addColorStop(1,'rgba(150,240,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-8,0);c.lineTo(x+8,0);c.lineTo(x+70,h*.9);c.lineTo(x+18,h*.9);c.fill();}
    c.restore();
  }
  // Eco de sonar: anillos que se abren desde un contacto.
  function ping(c,x,y,t,color,reach=70){
    c.save();c.lineWidth=1.5;
    for(let i=0;i<3;i++){const u=(t*.45+i/3)%1;c.strokeStyle='rgba('+color+','+(.7*(1-u)).toFixed(3)+')';c.beginPath();c.arc(x,y,4+u*reach,0,TAU);c.stroke();}
    c.restore();
  }
  // Marco de cámara de seguridad: el centro comercial vigila a quien entra.
  function camera(c,w,h,t,label){
    c.fillStyle='rgba(8,14,22,.34)';c.fillRect(0,0,w,h);
    c.fillStyle='rgba(180,220,255,.06)';for(let y=(Math.floor(t*30)%4);y<h;y+=4)c.fillRect(0,y,w,1);
    c.strokeStyle='#d7e6ee';c.lineWidth=2;const m=14,l=22;
    for(const [x,y,dx,dy] of [[m,m,1,1],[w-m,m,-1,1],[m,h-m,1,-1],[w-m,h-m,-1,-1]]){c.beginPath();c.moveTo(x+dx*l,y);c.lineTo(x,y);c.lineTo(x,y+dy*l);c.stroke();}
    if(Math.floor(t*2)%2){c.fillStyle='#ff5148';c.fillRect(m+10,m+9,7,7);}
    c.fillStyle='#e8f1f4';c.font='bold 10px monospace';c.textAlign='left';c.fillText('REC',m+22,m+16);c.textAlign='right';c.fillText(label,w-m-10,h-m-8);c.textAlign='left';
  }
  // Haz de una antena: columna de luz con pulsos que suben.
  function beam(c,x,top,bottom,width,t,color){
    c.save();c.globalCompositeOperation='screen';
    const g=c.createLinearGradient(x-width,0,x+width,0);g.addColorStop(0,'rgba('+color+',0)');g.addColorStop(.5,'rgba('+color+',.5)');g.addColorStop(1,'rgba('+color+',0)');c.fillStyle=g;c.fillRect(x-width,top,width*2,bottom-top);
    c.fillStyle='rgba('+color+',.85)';for(let i=0;i<6;i++){const u=(t*.5+i/6)%1;c.fillRect(Math.round(x-1),Math.round(bottom-u*(bottom-top)),3,9);}
    c.restore();
  }
  function stars(c,w,h,t,count){
    c.fillStyle='#e6ecff';for(let i=0;i<count;i++){c.globalAlpha=.25+.6*Math.abs(Math.sin(t*(.6+hash(i)*1.4)+i));c.fillRect(Math.round(hash(i+3)*w),Math.round(hash(i+70)*h),1+(i%7===0?1:0),1+(i%7===0?1:0));}c.globalAlpha=1;
  }
  // Torre de celosía con baliza: la antena repetidora de la azotea.
  function mast(c,x,base,top,t){
    c.strokeStyle='#0a0e16';c.lineWidth=2;c.beginPath();c.moveTo(x-14,base);c.lineTo(x-3,top);c.moveTo(x+14,base);c.lineTo(x+3,top);
    for(let i=0;i<7;i++){const a=i/7,b=(i+1)/7,ya=base+(top-base)*a,yb=base+(top-base)*b,ha=14-11*a,hb=14-11*b;c.moveTo(x-ha,ya);c.lineTo(x+hb,yb);c.moveTo(x+ha,ya);c.lineTo(x-hb,yb);}
    c.stroke();c.fillStyle='#0a0e16';c.fillRect(x-1,top-22,3,22);c.fillRect(x-12,top-8,25,3);
    if(Math.floor(t*1.6)%2){c.fillStyle='#ff4a3a';c.fillRect(x-1,top-25,3,3);glow(c,x,top-24,16,'255,90,70',.7);}
  }
  function smoke(c,x,base,t,seed){
    for(let i=0;i<7;i++){const u=(t*.09+i/7+hash(seed))%1,size=6+u*26;c.globalAlpha=(1-u)*.38;c.fillStyle=i%2?'#2b2a31':'#3b3940';c.fillRect(Math.round(x+u*38-size/2),Math.round(base-u*150),Math.round(size),Math.round(size*.8));}
    c.globalAlpha=1;
  }
  const ease=u=>u*u*(3-2*u);

  Scenes.register('five',{m5trench:'assets/worlds/mission-05/fosa-panoramica.webp',m5sub:'assets/worlds/mission-05/abismo-submarino-v1.png',m5captain:'assets/sprites/capitan-abismo-combate.webp'},[
    // 1 · El contrabandista: la fosa, de la luz de la superficie al fondo donde espera la nave.
    function(c,w,h,t){
      const depth=.5-.5*Math.cos(t*.14);fill(c,w,h,'#0b5a78','#04101e');
      plate(c,images.m5trench,w,h,null,.5+.06*Math.sin(t*.1),depth*.94);
      sunRays(c,w,h,t,1-depth);c.fillStyle='rgba(3,10,24,'+(.1+.42*depth).toFixed(3)+')';c.fillRect(0,0,w,h);
      // El contacto del sonar solo aparece cuando la cámara llega al fondo.
      if(depth>.55){c.globalAlpha=clamp((depth-.55)/.2);ping(c,w*.7,h*.62,t,'120,255,214');c.fillStyle=Math.floor(t*3)%2?'#ff5148':'#7a1f1c';c.fillRect(Math.round(w*.7)-1,Math.round(h*.62)-1,3,3);c.globalAlpha=1;}
      bubbles(c,w,h,t,26);vignette(c,w,h);
    },
    // 2 · La fosa: restos de la flota y un campo de minas entre el cazador y la esclusa.
    function(c,w,h,t){
      fill(c,w,h,'#0a4d7a','#05142a');const view=plate(c,images.m5sub,w,h,[0,0,1536,504],.5-.5*Math.cos(t*.11),.5);
      sunRays(c,w,h,t,.7);
      for(let i=0;i<5;i++){
        const x=view?(240+i*265-view.x)*view.k:w*(.15+i*.18),y=h*(.34+(i%2)*.2)+Math.sin(t*1.1+i*2)*4;
        if(x<-20||x>w+20)continue;
        c.strokeStyle='rgba(12,22,34,.8)';c.lineWidth=1;c.beginPath();c.moveTo(x,y+7);c.lineTo(x+3,h);c.stroke();
        c.fillStyle='#16222e';c.beginPath();c.arc(x,y,8,0,TAU);c.fill();c.fillRect(x-11,y-1,22,2);c.fillRect(x-1,y-11,2,22);c.fillStyle='#31465a';c.fillRect(x-4,y-5,3,3);
        if(Math.floor(t*2.5+i)%2){c.fillStyle='#ff5148';c.fillRect(Math.round(x)-1,Math.round(y)-1,3,3);glow(c,x,y,14,'255,80,70',.5);}
      }
      c.fillStyle='rgba(3,10,24,.28)';c.fillRect(0,0,w,h);bubbles(c,w,h,t,34);vignette(c,w,h);
    },
    // 3 · El Capitán del Abismo: su cámara, con la alarma encendida.
    function(c,w,h,t){
      fill(c,w,h,'#1a2026','#0a0d12');plate(c,images.m5sub,w,h,[0,516,1536,508],.5,.6,1.7);
      const alarm=.5+.5*Math.sin(t*4);c.fillStyle='rgba(120,10,10,'+(.1+.16*alarm).toFixed(3)+')';c.fillRect(0,0,w,h);
      // Mismo ciclo de reposo y misma cadencia que en el combate.
      cell(c,images.m5captain,[(Math.floor(t*8)%8)*200,0,200,144],w*.62,212,.95);
      glow(c,w*.14,22,90,'255,70,60',.25+.3*alarm);glow(c,w*.86,22,90,'255,70,60',.25+.3*(1-alarm));
      vignette(c,w,h);
    }
  ]);

  Scenes.register('six',{m6atrium:'assets/worlds/mission-06/atrio.webp',m6gallery:'assets/worlds/mission-06/galeria.webp',m6city:'assets/worlds/mission-06/ciudad.webp',m6giant:'assets/sprites/coloso-exterior.webp'},[
    // 1 · El último centro: el atrio, visto por las cámaras del Consorcio.
    function(c,w,h,t){
      fill(c,w,h,'#2a3350','#141a26');plate(c,images.m6atrium,w,h,null,.5,.5-.5*Math.cos(t*.16));
      camera(c,w,h,t,'CAM 01 · ATRIO');vignette(c,w,h);
    },
    // 2 · Tres plantas: las galerías, con las vitrinas rotas tras la fachada limpia.
    function(c,w,h,t){
      fill(c,w,h,'#3a2f52','#15131f');plate(c,images.m6gallery,w,h,null,.5-.5*Math.cos(t*.12),.86,1.5);
      camera(c,w,h,t,'CAM 07 · GALERÍAS');vignette(c,w,h);
    },
    // 3 · La antena: la azotea al anochecer y el Coloso que trepa por la fachada.
    function(c,w,h,t){
      fill(c,w,h,'#241a52','#e0603a');plate(c,images.m6city,w,h,[0,40,1152,600],.5,.3);
      const edge=h-34,rise=ease(clamp((t%16)/4));
      cell(c,images.m6giant,[0,0,256,224],w*.62,edge+26+(1-rise)*170,.86);
      c.fillStyle='rgba(26,16,46,.42)';c.fillRect(0,0,w,h);
      // Pretil de la azotea, por delante del gigante.
      c.fillStyle='#0c1018';c.fillRect(0,edge,w,h-edge);c.fillStyle='#232b3a';c.fillRect(0,edge,w,3);
      for(let x=24;x<w;x+=88){c.fillStyle='#0c1018';c.fillRect(x,edge-9,5,9);}
      mast(c,w*.2,edge,46,t);beam(c,w*.2,0,22,10,t,'120,230,255');
      vignette(c,w,h);
    }
  ]);

  Scenes.register('seven',{m7city:'assets/worlds/mission-06/ciudad.webp',m7ship:'assets/worlds/mission-07/nave-alienigena-v1.png',m7boss:'assets/sprites/soberano-horror-v2.png'},[
    // 1 · La señal: el haz de la antena sube de la ciudad al espacio, y el helicóptero con él.
    function(c,w,h,t){
      const climb=.5-.5*Math.cos(t*.2);fill(c,w,h,'#05071a','#3a2a6a');
      plate(c,images.m7city,w,h,[0,0,1152,560],.5,1-climb);
      c.fillStyle='rgba(4,6,22,'+(.25+.55*climb).toFixed(3)+')';c.fillRect(0,0,w,h);
      c.globalAlpha=climb;stars(c,w,h*.8,t,46);c.globalAlpha=1;
      beam(c,w*.5,0,h,16,t,'120,230,255');
      // El helicóptero de Vega, pequeño, enganchado al haz.
      const y=h*(.72-.36*climb)+Math.sin(t*2.2)*2,x=Math.round(w*.5);
      c.fillStyle='#0b1019';c.fillRect(x-9,Math.round(y),18,6);c.fillRect(x+8,Math.round(y)+1,10,2);c.fillStyle='#cfd8e2';const rotor=Math.round(Math.abs(Math.sin(t*40))*14)+3;c.fillRect(x-rotor,Math.round(y)-3,rotor*2,1);
      vignette(c,w,h);
    },
    // 2 · El casco: la nave nodriza y su flota, con el planeta al fondo.
    function(c,w,h,t){
      fill(c,w,h,'#090b1c','#17122c');plate(c,images.m7ship,w,h,[0,0,1536,504],.5-.5*Math.cos(t*.12),.4);
      stars(c,w,h*.5,t,18);
      const sweep=(t*.16)%1;c.save();c.globalCompositeOperation='screen';const g=c.createLinearGradient(w*sweep-60,0,w*sweep+60,0);g.addColorStop(0,'rgba(110,230,255,0)');g.addColorStop(.5,'rgba(110,230,255,.16)');g.addColorStop(1,'rgba(110,230,255,0)');c.fillStyle=g;c.fillRect(w*sweep-60,0,120,h);c.restore();
      vignette(c,w,h);
    },
    // 3 · El Soberano del Vacío: el proveedor, en su núcleo.
    function(c,w,h,t){
      fill(c,w,h,'#140f26','#07060f');plate(c,images.m7ship,w,h,[0,516,1536,508],.5,.544,1.5);
      const pulse=.5+.5*Math.sin(t*2.4);glow(c,w*.64,120,150,'150,90,255',.22+.2*pulse);
      cell(c,sheet('m7boss'),[332,318,333,269],w*.64,207,.7);
      glow(c,w*.6,96,34,'90,240,255',.25+.3*pulse);
      c.fillStyle='rgba(10,6,24,.22)';c.fillRect(0,0,w,h);vignette(c,w,h);
    }
  ]);

  Scenes.register('eight',{m8city:'assets/worlds/mission-08/manhattan-v1.png',m8midtown:'assets/worlds/mission-08/midtown-v1.png',m8plaza:'assets/worlds/mission-08/plaza-final-v1.png',m8titan:'assets/sprites/titan-nueva-york-v1.png'},[
    // 1 · La sede: Manhattan tomada, de las torres a la calle.
    function(c,w,h,t){
      fill(c,w,h,'#3e6fb8','#1d2430');const view=plate(c,images.m8city,w,h,null,.5,.5-.5*Math.cos(t*.15));
      if(view)for(const [i,x] of [260,820,1290].entries())smoke(c,(x-view.x)*view.k,(700-view.y)*view.k,t,i*5+1);
      c.fillStyle='rgba(40,14,10,.26)';c.fillRect(0,0,w,h);vignette(c,w,h);
    },
    // 2 · La policía: las luces de las patrullas en una avenida cortada.
    function(c,w,h,t){
      fill(c,w,h,'#35507c','#141a24');plate(c,images.m8midtown,w,h,[0,380,1536,644],.5-.5*Math.cos(t*.1),1,1.3);
      c.fillStyle='rgba(8,12,30,.4)';c.fillRect(0,0,w,h);
      const red=Math.floor(t*4)%2;
      glow(c,w*.1,h-30,130,'255,60,60',red?.55:.12);glow(c,w*.2,h-30,130,'70,110,255',red?.12:.55);
      glow(c,w*.9,h-30,130,'70,110,255',red?.55:.12);glow(c,w*.8,h-30,130,'255,60,60',red?.12:.55);
      vignette(c,w,h);
    },
    // 3 · El Titán de Acero: el último prototipo, apagado, esperando a su piloto.
    function(c,w,h,t){
      fill(c,w,h,'#5a3a78','#e0703a');plate(c,images.m8plaza,w,h,[0,380,1536,644],.5,.835,1.25);
      // Reflectores que barren el cielo desde la calle.
      c.save();c.globalCompositeOperation='screen';
      for(const [x,phase] of [[w*.08,0],[w*.94,2.1]]){const a=Math.sin(t*.5+phase)*.45,tx=x+Math.sin(a)*h*1.3,g=c.createLinearGradient(x,h,tx,0);g.addColorStop(0,'rgba(210,225,255,.3)');g.addColorStop(1,'rgba(210,225,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-2,h);c.lineTo(x+2,h);c.lineTo(tx+34,0);c.lineTo(tx-34,0);c.fill();}
      c.restore();
      cell(c,sheet('m8titan'),[0,0,384,256],w*.62,218,.68);
      c.fillStyle='rgba(24,10,30,.3)';c.fillRect(0,0,w,h);vignette(c,w,h);
    }
  ]);
})(typeof window!=='undefined'?window:globalThis);
