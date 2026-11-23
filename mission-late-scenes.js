(function(root){
  'use strict';
  // Planos de las historias de las misiones 05 a 08 (intro y epílogo a pantalla
  // completa). Cada plano encuadra un fondo que la misión ya usa y le añade luz,
  // movimiento y los sprites del juego. Reglas del escenario en mission-one-scenes.js.
  const Scenes=root.ArcadeStoryScenes;if(!Scenes)return;
  const {TOP,FLOOR,TAU,clamp,lerp,ease,ramp,drift,hash,atlas,fill,shade,plate,cut,put,glow,beam,smoke,stars,shadow,boom,flash,vignette,hunter,heli,seal}=Scenes.tools,images=Scenes.images;

  function bubbles(c,v,t,count=40){
    c.fillStyle='#bfefff';
    for(let i=0;i<count;i++){const u=(t*(.07+hash(i)*.08)+hash(i+40))%1,x=hash(i+11)*v.w+Math.sin(t*1.3+i)*8,s=2+Math.floor(hash(i+7)*3);c.globalAlpha=.55*(1-u);c.fillRect(Math.round(x),Math.round(v.h-u*(v.h+30)),s,s);}
    c.globalAlpha=1;
  }
  function sunRays(c,v,t,strength=1){
    if(strength<=0)return;c.save();c.globalCompositeOperation='screen';
    for(let i=0;i<6;i++){const x=v.w*(.08+i*.17)+Math.sin(t*.3+i)*24,g=c.createLinearGradient(0,0,0,v.h*.9);g.addColorStop(0,'rgba(150,240,255,'+(.2*strength).toFixed(3)+')');g.addColorStop(1,'rgba(150,240,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-12,0);c.lineTo(x+12,0);c.lineTo(x+120,v.h*.9);c.lineTo(x+30,v.h*.9);c.fill();}
    c.restore();
  }
  function ping(c,x,y,t,rgb,reach=120){c.save();c.lineWidth=2;for(let i=0;i<3;i++){const u=(t*.45+i/3)%1;c.strokeStyle='rgba('+rgb+','+(.7*(1-u)).toFixed(3)+')';c.beginPath();c.arc(x,y,6+u*reach,0,TAU);c.stroke();}c.restore();}
  // Marco de cámara de seguridad: el centro comercial vigila a quien entra.
  function camera(c,v,t,label){
    shade(c,v,'rgba(8,14,22,.28)');c.fillStyle='rgba(180,220,255,.06)';for(let y=Math.floor(t*30)%5;y<v.h;y+=5)c.fillRect(0,y,v.w,2);
    const m=v.cx-Math.min(v.w/2,640)+26,r=v.cx+Math.min(v.w/2,640)-26,top=TOP+16,bottom=FLOOR-6,l=34;c.strokeStyle='#d7e6ee';c.lineWidth=3;
    for(const [x,y,dx,dy] of [[m,top,1,1],[r,top,-1,1],[m,bottom,1,-1],[r,bottom,-1,-1]]){c.beginPath();c.moveTo(x+dx*l,y);c.lineTo(x,y);c.lineTo(x,y+dy*l);c.stroke();}
    if(Math.floor(t*2)%2){c.fillStyle='#ff5148';c.fillRect(m+14,top+12,10,10);}
    c.fillStyle='#e8f1f4';c.font='bold 15px Consolas, monospace';c.fillText('REC',m+32,top+22);c.textAlign='right';c.fillText(label,r-12,bottom-12);c.fillText('CONSORCIO · SEGURIDAD',r-12,top+22);c.textAlign='left';
  }
  // Torre de celosía con baliza: la antena repetidora de la azotea.
  function mast(c,x,base,top,t){
    c.strokeStyle='#0a0e16';c.lineWidth=3;c.beginPath();c.moveTo(x-24,base);c.lineTo(x-5,top);c.moveTo(x+24,base);c.lineTo(x+5,top);
    for(let i=0;i<8;i++){const a=i/8,b=(i+1)/8,ya=base+(top-base)*a,yb=base+(top-base)*b,ha=24-19*a,hb=24-19*b;c.moveTo(x-ha,ya);c.lineTo(x+hb,yb);c.moveTo(x+ha,ya);c.lineTo(x-hb,yb);}
    c.stroke();c.fillStyle='#0a0e16';c.fillRect(x-2,top-34,5,34);c.fillRect(x-20,top-12,41,4);
    if(Math.floor(t*1.6)%2){c.fillStyle='#ff4a3a';c.fillRect(x-2,top-40,5,5);glow(c,x,top-38,26,'255,90,70',.8);}
  }
  // Columna de luz con pulsos que suben (el haz de la antena).
  function shaft(c,x,top,bottom,width,t,rgb,alpha=.5){
    c.save();c.globalCompositeOperation='screen';const g=c.createLinearGradient(x-width,0,x+width,0);g.addColorStop(0,'rgba('+rgb+',0)');g.addColorStop(.5,'rgba('+rgb+','+alpha+')');g.addColorStop(1,'rgba('+rgb+',0)');c.fillStyle=g;c.fillRect(x-width,top,width*2,bottom-top);
    c.fillStyle='rgba('+rgb+',.9)';for(let i=0;i<8;i++){const u=(t*.55+i/8)%1;c.fillRect(Math.round(x-2),Math.round(bottom-u*(bottom-top)),5,14);}c.restore();
  }
  // Curva del planeta vista desde la órbita.
  function planet(c,v,t,y,glowAlpha=.5){
    const r=v.w*1.6,cx=v.cx,cy=y+r;const g=c.createRadialGradient(cx,cy,r*.96,cx,cy,r*1.04);g.addColorStop(0,'#1d4f8a');g.addColorStop(.5,'#5fa8e8');g.addColorStop(1,'rgba(120,200,255,0)');
    c.fillStyle=g;c.beginPath();c.arc(cx,cy,r*1.04,0,TAU);c.fill();c.fillStyle='#0d2a4c';c.beginPath();c.arc(cx,cy,r*.985,0,TAU);c.fill();
    c.fillStyle='rgba(255,210,140,.5)';for(let i=0;i<40;i++){const a=-Math.PI/2+(hash(i)-.5)*.5,d=r*(.985-hash(i+3)*.004);c.fillRect(Math.round(cx+Math.cos(a)*d),Math.round(cy+Math.sin(a)*d),2,2);}
    glow(c,cx,y,v.w*.6,'120,200,255',glowAlpha*.4);
  }
  // Libro de cuentas abierto, con el dibujo de una antena en la última página.
  function ledger(c,v,t){
    const x=v.cx,y=258,w=660,h=330;
    c.save();c.translate(x,y);c.rotate(.02);
    c.fillStyle='#3a1f18';c.fillRect(-w/2-14,-h/2-12,w+28,h+24);
    for(const side of [-1,1]){c.fillStyle='#e6dcc0';c.fillRect(side<0?-w/2:4,-h/2,w/2-4,h);c.fillStyle='#b9ad8e';for(let i=0;i<12;i++)c.fillRect(side<0?-w/2+20:24,-h/2+30+i*24,w/2-48,1);}
    c.fillStyle='#4a3a2a';c.font='bold 13px Consolas, monospace';
    const rows=['SUERO 7 · 40 u.','CHASIS · 2 u.','CÁPSULAS · 12 u.','LOBOS · 3 u.','ARMAS · 600 u.'];
    rows.forEach((row,i)=>{if(t>.3+i*.35){c.fillText(row,-w/2+24,-h/2+48+i*48);c.fillText('▸ ANTENA',-w/2+190,-h/2+48+i*48);}});
    // La antena, dibujada a lápiz en la página derecha, se marca con un círculo rojo.
    c.strokeStyle='#4a3a2a';c.lineWidth=3;c.beginPath();c.moveTo(130,120);c.lineTo(160,-60);c.lineTo(190,120);c.moveTo(142,40);c.lineTo(178,40);c.moveTo(150,-10);c.lineTo(170,-10);c.stroke();
    c.fillStyle='#4a3a2a';c.fillRect(70,120,180,8);c.fillRect(90,128,140,26);
    const mark=ease(ramp(t,2.4,3.6));if(mark>0){c.strokeStyle='rgba(176,32,24,.9)';c.lineWidth=5;c.beginPath();c.arc(160,40,110,0,TAU*mark);c.stroke();}
    seal(c,-50,h/2-50,26,'#8a5a20',.8);
    c.restore();
    const lx=x+Math.sin(t*.5)*140,ly=y+Math.cos(t*.4)*40,dark=c.createRadialGradient(lx,ly,100,lx,ly,440);
    dark.addColorStop(0,'rgba(10,4,6,0)');dark.addColorStop(1,'rgba(10,4,6,.9)');c.fillStyle=dark;c.fillRect(0,0,v.w,v.h);
    glow(c,v.cx,v.h*.15,300,'255,60,50',.12+.08*Math.sin(t*3));
  }
  // Azotea del centro comercial al anochecer (mitad baja de centro-comercial-v1).
  const ROOF=[0,830,1254,424];
  function roof(c,v,t,id,o={}){
    fill(c,v,'#241a52','#e0603a');
    const bg=plate(c,images[id],v,{band:ROOF,ground:[1090,FLOOR],u:o.u??.5,zoom:o.zoom||1});
    return bg;
  }

  // ═════════════════════ MISIÓN 05 · BAJO EL ABISMO ═════════════════════
  Scenes.register('five',{m5trench:'assets/worlds/mission-05/fosa-panoramica.webp',m5sub:'assets/worlds/mission-05/abismo-submarino-v1.png',m5captain:'assets/sprites/capitan-abismo-combate.webp',m5boats:'assets/sprites/submarinos-abismo-8.webp',m5divers:'assets/sprites/personajes-buceo-v1.png',m5roof:'assets/worlds/mission-06/centro-comercial-v1.png'},{
    intro:[
      // 1 · El mercado: de la luz de la superficie al fondo de la fosa.
      {id:'fosa',dur:8,draw(c,t,v){
        const depth=drift(t,v.dur);fill(c,v,'#0b5a78','#04101e');
        plate(c,images.m5trench,v,{u:.5+.06*Math.sin(t*.1),vy:depth*.9,zoom:1.05});
        sunRays(c,v,t,1-depth);shade(c,v,'rgba(3,10,24,'+(.1+.4*depth).toFixed(3)+')');
        bubbles(c,v,t,46);vignette(c,v,.75);
      }},
      // 2 · El submarino: la bodega del Consorcio cruza entre los restos de la flota.
      {id:'submarino',dur:8,draw(c,t,v){
        fill(c,v,'#0a4d7a','#05142a');plate(c,images.m5sub,v,{band:[0,0,1536,504],u:lerp(.2,.7,drift(t,v.dur)),vy:.5});
        sunRays(c,v,t,.5);shade(c,v,'rgba(3,10,24,.38)');
        const boats=atlas('m5boats',8,3),x=v.cx+lerp(380,-80,ease(t/v.dur)),y=300+Math.sin(t*.8)*6;
        put(c,boats,16+Math.floor(t*6)%8,x,y,180,{flip:true});
        glow(c,x-150,y-90,70,'255,220,140',.5);ping(c,x,y-90,t,'120,255,214',200);
        for(let i=0;i<3;i++)put(c,boats,Math.floor(t*8+i)%8,x+180+i*90,y-170+i*40,34,{flip:true});
        bubbles(c,v,t,30);vignette(c,v,.75);
      }},
      // 3 · El Capitán del Abismo, en su cámara, con la alarma encendida.
      {id:'capitan',dur:7.5,draw(c,t,v){
        fill(c,v,'#1a2026','#0a0d12');const bg=plate(c,images.m5sub,v,{band:[0,516,1536,508],ground:[905,FLOOR],u:.5,zoom:1.25});
        const alarm=.5+.5*Math.sin(t*4);shade(c,v,'rgba(120,10,10,'+(.1+.16*alarm).toFixed(3)+')');
        const x=v.cx+90,k=lerp(250,290,drift(t,v.dur));
        shadow(c,x,FLOOR,k*.9,.6);put(c,atlas('m5captain',8,6),Math.floor(t*8)%8,x,FLOOR+2,k,{flip:true});
        glow(c,v.cx-v.w*.36,TOP+20,150,'255,70,60',.25+.3*alarm);glow(c,v.cx+v.w*.36,TOP+20,150,'255,70,60',.25+.3*(1-alarm));
        vignette(c,v,.75);
      }},
      // 4 · La inmersión: el cazador baja hacia lo oscuro con la linterna encendida.
      {id:'inmersion',dur:7,draw(c,t,v){
        fill(c,v,'#06304a','#020812');plate(c,images.m5trench,v,{vy:.95,zoom:1.3,u:.4});shade(c,v,'rgba(2,8,20,.55)');
        const x=v.cx-60+Math.sin(t*.6)*30,y=lerp(200,300,drift(t,v.dur))+Math.sin(t*1.4)*6;
        beam(c,x+85,y-56,Math.PI/2+.09,535,78,'180,235,250',.28);
        if(!root.ArcadeStorySprites?.draw(c,'buzo',t,x,y,112))put(c,atlas('m5divers',4,4),Math.floor(t*6)%4,x,y,96);
        for(let i=0;i<6;i++){const u=(t*.5+i/6)%1;c.fillStyle='rgba(200,240,255,'+(.6*(1-u)).toFixed(3)+')';c.fillRect(Math.round(x+30+Math.sin(u*9+i)*6),Math.round(y-90-u*170),3,3);}
        bubbles(c,v,t,22);vignette(c,v,.85);
      }}
    ],
    outro:[
      // 1 · Los libros de cuentas, a la luz de una linterna.
      {id:'libros',dur:8,draw(c,t,v){fill(c,v,'#12080a','#050304');ledger(c,v,t);}},
      // 2 · La antena: la azotea del último centro comercial, con su baliza.
      {id:'antena',dur:8,draw(c,t,v){
        roof(c,v,t,'m5roof',{u:lerp(.3,.6,drift(t,v.dur))});shade(c,v,'rgba(26,16,46,.3)');
        const x=v.cx+120;mast(c,x,FLOOR-20,TOP+60,t);shaft(c,x,0,TOP+30,18,t,'120,230,255');
        vignette(c,v,.7);
      }}
    ]
  });

  // ═════════════════════ MISIÓN 06 · EL ÚLTIMO CENTRO ═════════════════════
  function shoppers(c,v,t,count,size,panorama){
    const span=v.w+200,pan=panorama?.px(0)||0;
    // Back to front. People on the same path move in the same direction.
    for(let lane=0;lane<3;lane++)for(let i=lane;i<count;i+=3){
      const slot=Math.floor(i/3),look=(lane+slot)%2,dir=lane===1?-1:1;
      const browsing=i===0,scale=size*(.85+.085*lane)/64;
      const walk=t*(35+hash(i+4)*9); // Distance in native sprite pixels.
      const start=(slot+[.68,.15,.92][lane])*span/Math.ceil((count-lane)/3);
      const pos=start+pan+(browsing?0:dir*walk*scale);
      const x=((pos%span+span)%span)-100,y=FLOOR-14+lane*9;
      const image=browsing?images.m6shoppers:images.m6walk;
      if(!image||x< -65||x>v.w+65)continue;
      // Each half-stride carries the body 20 pixels over the supporting shoe.
      const cell=browsing?Math.floor(t*5)%8:Math.floor((walk/40+hash(i+18))*24)%24;
      const row=browsing?look*3:look;
      c.save();c.translate(Math.round(x),y);c.scale(dir*scale,scale);
      c.drawImage(image,cell*80,row*80,80,80,-40,-74,80,80);c.restore();
    }
  }
  Scenes.register('six',{m6atrium:'assets/worlds/mission-06/atrio.webp',m6gallery:'assets/worlds/mission-06/galeria.webp',m6city:'assets/worlds/mission-06/ciudad.webp',m6giant:'assets/sprites/coloso-exterior.webp',m6shoppers:'assets/sprites/compradores-centro.webp',m6walk:'assets/sprites/pasos-compradores-centro.webp',m6roof:'assets/worlds/mission-06/centro-comercial-v1.png'},{
    intro:[
      // 1 · El atrio: compradores bajo la cúpula, como si nada hubiera pasado.
      {id:'atrio',dur:8,draw(c,t,v){
        fill(c,v,'#2a3350','#141a26');const bg=plate(c,images.m6atrium,v,{ground:[700,FLOOR+20],u:lerp(.3,.7,drift(t,v.dur))});
        shoppers(c,v,t,9,92,bg);
        // A foreground support carries the camera; the next shot cuts to its security feed.
        const post=v.cx-v.w*.32;
        c.fillStyle='#41454e';c.fillRect(post-5,0,9,135);
        root.ArcadeStorySprites?.draw(c,'camara',t,post+35,141,65);vignette(c,v,.6);
      }},
      // 2 · Las cámaras: las galerías, vistas por la seguridad del Consorcio.
      {id:'camaras',dur:8,draw(c,t,v){
        fill(c,v,'#3a2f52','#15131f');const cam=Math.floor(t/2.7)%3;
        const bg=cam===1?plate(c,images.m6atrium,v,{ground:[700,FLOOR+20],u:.15,zoom:1.3}):plate(c,images.m6gallery,v,{ground:[708,FLOOR],u:cam?.85:.3,zoom:1.35});
        shoppers(c,v,t+cam*5,6,104,bg);
        camera(c,v,t,['CAM 07 · GALERÍAS','CAM 01 · ATRIO','CAM 12 · RESTAURANTES'][cam]);vignette(c,v,.6);
      }},
      // 3 · La azotea: la antena al anochecer, y algo enorme que trepa por la fachada.
      {id:'azotea',dur:8,draw(c,t,v){
        fill(c,v,'#241a52','#e0603a');plate(c,images.m6city,v,{band:[0,40,1152,600],u:.5,vy:.3});
        const edge=FLOOR-10,rise=ease(ramp(t,1.5,5.5)),gx=v.cx+170;
        put(c,atlas('m6giant',8,5),Math.floor(t*6)%8,gx,edge+90+(1-rise)*260,300,{flip:true});
        shade(c,v,'rgba(26,16,46,.36)');
        c.fillStyle='#0c1018';c.fillRect(0,edge,v.w,v.h-edge);c.fillStyle='#232b3a';c.fillRect(0,edge,v.w,4);
        for(let x=30;x<v.w;x+=120){c.fillStyle='#0c1018';c.fillRect(x,edge-14,7,14);}
        const mx=v.cx-220;mast(c,mx,edge,TOP+50,t);shaft(c,mx,0,TOP+20,16,t,'120,230,255');
        vignette(c,v,.7);
      }}
    ],
    outro:[
      // 1 · La señal: el haz de la antena sube y la cámara lo sigue hasta las estrellas.
      {id:'senal',dur:8,draw(c,t,v){
        const up=ease(ramp(t,1,7.2));
        fill(c,v,'#03040d','#141a3e');stars(c,v,t,70,v.h);
        c.save();c.translate(0,up*v.h*1.1);
        fill(c,v,'#241a52','#e0603a');const bg=plate(c,images.m6roof,v,{band:ROOF,ground:[1090,FLOOR],u:.45});
        shade(c,v,'rgba(26,16,46,.3)');const x=v.cx-40;mast(c,x,FLOOR-20,TOP+60,t);
        c.restore();
        shaft(c,v.cx-40,0,FLOOR-80+up*v.h*1.1,22,t,'120,230,255',.55);
        vignette(c,v,.7);
      }},
      // 2 · La órbita: más allá de las nubes, la señal encuentra quien la escuche.
      {id:'orbita',dur:8,draw(c,t,v){
        fill(c,v,'#02030a','#07091a');stars(c,v,t,90);
        planet(c,v,t,FLOOR-30);
        const push=drift(t,v.dur),x=v.cx+160,y=lerp(180,200,push);
        shaft(c,v.cx-120,y,FLOOR-30,10,t,'120,230,255',.4);
        root.ArcadeStorySprites?.draw(c,'orbita',t,v.cx-120,y+8,67);
        // La nave: una silueta oscura con sus luces, recortada del casco de la misión 07.
        c.save();c.globalAlpha=ease(ramp(t,1,3));
        const w=lerp(360,460,push),h=w*.36;c.fillStyle='#0b0a16';c.beginPath();c.ellipse(x,y,w/2,h/2,-.08,0,TAU);c.fill();
        c.fillStyle='#151327';c.beginPath();c.ellipse(x+w*.1,y-h*.18,w*.3,h*.22,-.08,0,TAU);c.fill();
        for(let i=0;i<9;i++){const a=i/9;c.fillStyle=Math.floor(t*3+i)%4?'#6ef0ff':'#2a6f80';c.fillRect(Math.round(x-w*.42+a*w*.84),Math.round(y+h*.12-Math.sin(a*Math.PI)*h*.18),6,3);}
        glow(c,x,y,w*.6,'150,90,255',.25+.1*Math.sin(t*2));c.restore();
        vignette(c,v,.7);
      }}
    ]
  });

  // ═════════════════════ MISIÓN 07 · EL SOBERANO DEL VACÍO ═════════════════════
  Scenes.register('seven',{m7city:'assets/worlds/mission-06/ciudad.webp',m7ship:'assets/worlds/mission-07/nave-alienigena-v1.png',m7boss:'assets/sprites/soberano-horror-v2.png',m7crew:'assets/sprites/aliens-tripulacion-v1.png',m7ny:'assets/worlds/mission-08/manhattan-v1.png'},{
    intro:[
      // 1 · La respuesta: la señal vuelve del cielo y la nave aparece sobre la ciudad.
      {id:'respuesta',dur:8,draw(c,t,v){
        const climb=drift(t,v.dur);fill(c,v,'#05071a','#3a2a6a');
        plate(c,images.m7city,v,{band:[0,0,1152,560],u:.5,vy:1-climb*.9});
        shade(c,v,'rgba(4,6,22,'+(.25+.45*climb).toFixed(3)+')');c.save();c.globalAlpha=climb;stars(c,v,t,60,v.h*.6);c.restore();
        const receiverY=147+Math.sin(t*.8)*5;
        shaft(c,v.cx,receiverY-42,v.h,24,t,'120,230,255');
        root.ArcadeStorySprites?.draw(c,'orbita',t,v.cx,receiverY,96);
        const pulse=(t*.6)%1;c.strokeStyle='rgba(150,240,255,'+(.8*(1-pulse)).toFixed(3)+')';c.lineWidth=3;c.beginPath();c.ellipse(v.cx,receiverY-42,40+pulse*280,10+pulse*60,0,0,TAU);c.stroke();
        vignette(c,v,.7);
      }},
      // 2 · Lo que bajó de ahí arriba: tanques con cosas dentro, en el vientre de la nave.
      {id:'vientre',dur:9,draw(c,t,v){
        fill(c,v,'#140f26','#07060f');plate(c,images.m7ship,v,{band:[0,516,1536,508],ground:[860,FLOOR],u:lerp(.15,.75,drift(t,v.dur))});
        const pulse=.5+.5*Math.sin(t*2.2);shade(c,v,'rgba(10,6,24,.28)');
        for(const fx of [.18,.5,.82])glow(c,v.w*fx,260,130,'90,240,255',.18+.14*pulse);
        const crew=atlas('m7crew',4,4);for(let i=0;i<2;i++){const x=((t*50+i*v.w*.55)%(v.w+200))-100;put(c,crew,Math.floor(t*6+i)%3,x,FLOOR,128,{flip:false});}
        vignette(c,v,.75);
      }},
      // 3 · El haz: Vega engancha el helicóptero y sube hasta donde se acaba el aire.
      {id:'haz',dur:8,draw(c,t,v){
        fill(c,v,'#02030a','#0a1030');stars(c,v,t,80);planet(c,v,t,FLOOR+lerp(-10,120,drift(t,v.dur)),.7);
        shaft(c,v.cx,0,v.h,30,t,'120,230,255',.5);
        const y=lerp(380,200,drift(t,v.dur))+Math.sin(t*2)*4;heli(c,v.cx+40,y,300,t,{tilt:-.25});
        glow(c,v.cx,y-30,120,'150,240,255',.3);vignette(c,v,.7);
      }},
      // 4 · El Soberano del Vacío, en su núcleo.
      {id:'soberano',dur:7.5,draw(c,t,v){
        fill(c,v,'#140f26','#07060f');plate(c,images.m7ship,v,{band:[0,516,1536,508],ground:[860,FLOOR],u:.5,zoom:1.2});
        const pulse=.5+.5*Math.sin(t*2.4),x=v.cx+80;glow(c,x,FLOOR-180,260,'150,90,255',.22+.2*pulse);
        put(c,atlas('m7boss',4,4),4+Math.floor(t*4)%4,x,FLOOR+6,lerp(300,330,drift(t,v.dur)));
        glow(c,x-20,FLOOR-230,60,'90,240,255',.25+.3*pulse);shade(c,v,'rgba(10,6,24,.2)');vignette(c,v,.8);
      }}
    ],
    outro:[
      // 1 · El apagón: las luces del casco se apagan por sectores y la nave se parte.
      {id:'apagon',dur:8,draw(c,t,v){
        fill(c,v,'#090b1c','#17122c');plate(c,images.m7ship,v,{band:[0,0,1536,504],u:.5,vy:.4,zoom:1.1});
        const dark=ease(ramp(t,1,6));shade(c,v,'rgba(2,2,8,'+(.15+.6*dark).toFixed(3)+')');
        for(let k=0;k<5;k++){const at=1.4+k*1.1;if(t>at)boom(c,v.cx+(hash(k*7)-.5)*v.w*.8,170+hash(k*3)*180,180+hash(k)*80,(t-at)/1.2,.95);}
        flash(c,v,t>5.6&&t<6.2?(1-(t-5.6)/.6)*.6:0,'200,160,255');
        vignette(c,v,.75);
      }},
      // 2 · El rumbo: Nueva York de noche y una torre que no apaga sus luces.
      {id:'rumbo',dur:8,draw(c,t,v){
        fill(c,v,'#0a1028','#1a1a2a');plate(c,images.m7ny,v,{u:.5,vy:lerp(.1,.45,drift(t,v.dur)),zoom:1.15});
        shade(c,v,'rgba(6,10,34,.62)');
        for(let i=0;i<40;i++){if(hash(i+1)>.55)continue;c.fillStyle=Math.floor(t*.5+i)%7?'#ffd98a':'#6a5a3a';c.fillRect(Math.round(v.w*hash(i)),Math.round(140+hash(i+9)*200),4,5);}
        const tower=v.cx+40;glow(c,tower,190,90,'255,70,60',.3+.2*Math.sin(t*3));seal(c,tower,190,24,'#ff6a5a',.8);
        heli(c,v.cx-300+drift(t,v.dur)*220,320+Math.sin(t*1.6)*5,240,t,{tilt:-.05});
        vignette(c,v,.75);
      }}
    ]
  });

  // ═════════════════════ MISIÓN 08 · NUEVA YORK ═════════════════════
  // Las avenidas de Nueva York: el asfalto de la imagen (y≈920) se apoya en FLOOR.
  const STREET=[920,FLOOR+12];
  Scenes.register('eight',{m8city:'assets/worlds/mission-08/manhattan-v1.png',m8midtown:'assets/worlds/mission-08/midtown-v1.png',m8plaza:'assets/worlds/mission-08/plaza-final-v1.png',m8titan:'assets/sprites/titan-nueva-york-v1.png',m8boss:'assets/sprites/comandante-nueva-york-v1.png',m8troops:'assets/sprites/nueva-york-policias-soldados-v1.png'},{
    intro:[
      // 1 · La sede: Manhattan tomada, de las torres a la calle.
      {id:'sede',dur:8,draw(c,t,v){
        fill(c,v,'#3e6fb8','#1d2430');const bg=plate(c,images.m8city,v,{u:.5,vy:lerp(.15,.7,drift(t,v.dur)),zoom:1.15});
        if(bg)for(const [i,x] of [280,800,1300].entries())smoke(c,bg.px(x),bg.py(780),t,i*5+1,1.4);
        shade(c,v,'rgba(40,14,10,.24)');vignette(c,v,.6);
      }},
      // 2 · El Comandante: el hombre que firma las órdenes, entre sus soldados.
      {id:'comandante',dur:8,draw(c,t,v){
        fill(c,v,'#35507c','#141a24');plate(c,images.m8midtown,v,{ground:STREET,u:lerp(.4,.6,drift(t,v.dur)),zoom:1.1});
        shade(c,v,'rgba(8,12,30,.42)');
        const troops=atlas('m8troops',4,4);
        for(const [dx,f] of [[-250,8],[-150,9],[170,8],[260,9]]){shadow(c,v.cx+dx,FLOOR,70);put(c,troops,f,v.cx+dx,FLOOR,112,{flip:dx>0});}
        const x=v.cx+10;shadow(c,x,FLOOR,110,.6);if(!root.ArcadeStorySprites?.draw(c,'commander',t,x,FLOOR,143,true))put(c,atlas('m8boss',4,4),Math.floor(t*1.2)%4===3?3:0,x,FLOOR,lerp(132,142,drift(t,v.dur)),{flip:true});
        glow(c,x-6,FLOOR-140,30,'255,60,50',.4+.2*Math.sin(t*3));
        vignette(c,v,.7);
      }},
      // 3 · La avenida: el helicóptero de Vega entra en Midtown con el sol bajo.
      {id:'avenida',dur:7.5,draw(c,t,v){
        fill(c,v,'#35507c','#141a24');plate(c,images.m8midtown,v,{ground:STREET,u:.5,zoom:1.25});
        shade(c,v,'rgba(30,14,30,.22)');
        const go=drift(t,v.dur),x=v.cx+lerp(-200,40,go),y=lerp(180,240,go)+Math.sin(t*1.5)*5;
        heli(c,x,y,lerp(240,420,go),t,{tilt:-.04});
        const red=Math.floor(t*4)%2;glow(c,v.cx-v.w*.4,FLOOR,160,'255,60,60',red?.5:.1);glow(c,v.cx+v.w*.4,FLOOR,160,'70,110,255',red?.1:.5);
        vignette(c,v,.65);
      }},
      // 4 · El Titán de Acero: el último prototipo, apagado en la plaza, esperando a su piloto.
      {id:'titan',dur:7.5,draw(c,t,v){
        fill(c,v,'#5a3a78','#e0703a');plate(c,images.m8plaza,v,{ground:STREET,u:.5,zoom:1.15});
        for(const [x,phase] of [[v.cx-v.w*.42,0],[v.cx+v.w*.44,2.1]])beam(c,x,v.h,Math.sin(t*.5+phase)*.45,v.h*1.4,60,'210,225,255',.28);
        const x=v.cx+60;shadow(c,x,FLOOR,360,.6);put(c,atlas('m8titan',4,4),0,x,FLOOR+4,lerp(330,360,drift(t,v.dur)));
        shade(c,v,'rgba(24,10,30,.32)');glow(c,x+60,FLOOR-250,24,'255,60,50',.25*(1+Math.sin(t*2)));vignette(c,v,.7);
      }}
    ]
  });
})(typeof window!=='undefined'?window:globalThis);
