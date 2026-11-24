(function(root){
  'use strict';
  // Lanzamiento y remate de los poderes, en el mismo lenguaje que el resto del
  // juego: píxeles duros, paleta corta y sin degradados. Cada poder sale del
  // soldado (cápsula, bote, bengala, golpe al suelo) antes de hacer efecto.
  // powers.js no cambia: esta capa observa sus recargas y dibuja encima.
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  const COLORS={wave:'255,211,107',cryo:'144,234,255',heal:'168,255,160',orbital:'255,170,110',alien:'190,150,255',shield:'150,205,255',flame:'255,160,80',drone:'255,181,75',turret:'255,226,160'};
  // Tres tonos por poder: sombra, cuerpo y brillo.
  const INK={wave:['#8a5a1c','#f2c35a','#fff1c2'],cryo:['#3d7fa6','#9fdcf0','#eefcff'],heal:['#2f7a3a','#8fdc82','#e6ffd9'],orbital:['#8f2f1c','#ff8a4a','#ffe2b0'],alien:['#4b2f8a','#b08cf0','#efe2ff'],shield:['#2f5d8a','#8fc4f0','#e6f4ff'],drone:['#6b4a1c','#e0a23f','#ffe9b8'],turret:['#5a5238','#d8c79a','#fff6d8'],flame:['#8a3a12','#ff9a3f','#ffe7a0']};
  const LAUNCH=.45;
  const B=2; // tamaño del píxel de efecto
  const snap=v=>Math.round(v/B)*B;
  function dot(c,x,y,color,size=B){c.fillStyle=color;c.fillRect(snap(x),snap(y),size,size);}
  // Anillo de píxeles: bloques sobre una elipse, con huecos regulares.
  function ring(c,x,y,rx,ry,ink,solid=.7,seed=0){
    if(rx<2)return;const steps=Math.max(10,Math.round((rx+ry)*.9));
    for(let i=0;i<steps;i++){if(hash(i+seed)>solid)continue;const a=i/steps*Math.PI*2;dot(c,x+Math.cos(a)*rx,y+Math.sin(a)*ry,i%5===0?ink[2]:ink[1]);if(i%3===0)dot(c,x+Math.cos(a)*(rx-B),y+Math.sin(a)*(ry-B),ink[0]);}
  }
  // Polvo: racimos cuadrados que suben y se dispersan.
  function dust(c,x,y,spread,u,count,color,seed=0){for(let i=0;i<count;i++){const r=hash(i+seed),dx=(r-.5)*2*spread*(.4+u),dy=-u*(6+hash(i+seed+9)*16);if(u>.6+r*.4)continue;dot(c,x+dx,y+dy,color,r>.6?B*2:B);}}
  function spark(c,x,y,ink,size=1){c.fillStyle=ink[2];c.fillRect(snap(x)-B*size,snap(y),B*(size*2+1),B);c.fillRect(snap(x),snap(y)-B*size,B,B*(size*2+1));dot(c,x,y,'#ffffff');}
  // Luces que los poderes aportan al mapa de luz de la escena.
  function lights(s,p){
    const list=[];if(!s)return list;
    for(const f of s.effects||[]){const k=clamp(f.life/(f.duration||.5)),color=COLORS[f.kind]||COLORS.wave;list.push({x:f.tx??f.x,y:f.ty??f.y,r:(f.r||60)*1.6,a:k,glow:color,ga:.3*k});}
    for(const b of s.beams||[])if(b.age>=.45)list.push({x:b.x,y:b.y-120,r:420,a:1,glow:COLORS.orbital,ga:.35*clamp((2-b.age)*2)});
    for(const d of s.drones||[])list.push({x:d.x,y:d.y,r:70,a:.7,glow:COLORS.drone,ga:.2});
    for(const t of s.turrets||[])list.push({x:t.x,y:t.y,r:t.flash>0?120:60,a:t.flash>0?.9:.5,glow:COLORS.turret,ga:t.flash>0?.28:.08});
    if(s.flame>0&&p){const a=p.aim||{x:p.facing||1,y:0};list.push({x:p.x+a.x*80,y:p.y-30+a.y*80,r:170,a:1,glow:COLORS.flame,ga:.34});}
    if(p&&p.shield>0)list.push({x:p.x,y:p.y-28,r:70,a:.5,glow:COLORS.shield,ga:.06});
    return list;
  }
  // Cada recarga que arranca es un lanzamiento: se recuerda dónde y hacia dónde.
  const memory=new WeakMap();
  function launches(s,p){
    let m=memory.get(s);if(!m){m={cooldowns:{},list:[]};memory.set(s,m);}
    for(const [id,wait] of Object.entries(s.cooldowns||{})){if(wait>(m.cooldowns[id]||0)+.05&&id!=='flame'&&p)m.list.push({id,at:s.age,x:p.x,y:p.y,facing:p.facing||1,tall:p.form==='wolf'?38:26});m.cooldowns[id]=wait;}
    m.list=m.list.filter(l=>s.age-l.at<LAUNCH+.4);return m.list;
  }
  function drawLaunch(c,l,u,s){
    const ink=INK[l.id]||INK.wave,hand={x:l.x+l.facing*10,y:l.y-l.tall};
    // Destello del emisor de muñeca: todo poder empieza en la mano.
    if(u<.35)spark(c,hand.x,hand.y,ink,u<.15?2:1);
    if(l.id==='drone'){
      // La cápsula sale despedida de la mochila y deja humo.
      const k=clamp(u/.8),x=l.x-l.facing*8,y=l.y-l.tall-10-k*22;if(k<1){c.fillStyle='#3d4436';c.fillRect(snap(x)-B,snap(y)-B*2,B*3,B*4);dot(c,x,y-B*2,ink[1]);}
      dust(c,l.x-l.facing*8,l.y-l.tall-8,7,k,7,'#b9b6a6',3);
    }else if(l.id==='turret'){
      // El trípode cae plegado y se clava: tornillos y polvo a los lados.
      dust(c,l.x,l.y,22,clamp(u),10,'#9d937a',5);if(u<.5)for(const side of [-1,1])dot(c,l.x+side*(10+u*30),l.y-4-Math.sin(u*Math.PI*2)*8,ink[2]);
      ring(c,l.x,l.y-1,8+u*26,2+u*4,ink,.5,7);
    }else if(l.id==='wave'){
      // Puñetazo al suelo: grietas que se abren desde los pies.
      for(let i=0;i<6;i++){const a=(i/6)*Math.PI+hash(i)*.3,len=(10+hash(i+4)*26)*clamp(u*2.2);for(let d=4;d<len;d+=B)dot(c,l.x+Math.cos(a)*d*(i%2?1:-1),l.y-1+Math.sin(d*.5+i)*1.5,'#2a2118');}
      dust(c,l.x,l.y,30,clamp(u),12,'#b8a47c',11);
    }else if(l.id==='cryo'){
      // Bote de frío lanzado en arco corto; revienta en esquirlas.
      const k=clamp(u/.55),x=hand.x+l.facing*k*34,y=hand.y-Math.sin(k*Math.PI)*18+k*14;
      if(k<1){c.fillStyle=ink[0];c.fillRect(snap(x)-B,snap(y)-B,B*3,B*3);dot(c,x,y-B,ink[2]);}
      else for(let i=0;i<10;i++){const a=hash(i)*Math.PI*2,d=(u-.55)*70*hash(i+5);dot(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.7,i%2?ink[1]:ink[2]);}
    }else if(l.id==='heal'){
      // Inyector: cruces que suben pegadas al cuerpo.
      for(let i=0;i<5;i++){const k=(u*1.3+i*.2)%1;spark(c,l.x+(hash(i)-.5)*22,l.y-6-k*(l.tall+26),ink,i%2?1:0);}
    }else if(l.id==='orbital'){
      // Bengala de marcación: sube recta dejando humo rojizo hasta salir de cuadro.
      const k=clamp(u/.9),top=l.y-l.tall-k*k*520;c.fillStyle=ink[1];c.fillRect(snap(hand.x),snap(top),B,B*4);dot(c,hand.x,top-B,'#ffffff');
      for(let i=0;i<14;i++){const y=l.y-l.tall-(i/14)*(l.y-l.tall-top);if(hash(i+Math.floor(s.age*10))>.55)dot(c,hand.x+(hash(i)-.5)*6,y,i%3?'#8a7a72':ink[0]);}
    }else if(l.id==='alien'){
      // La energía se recoge en la mano antes de saltar al objetivo.
      for(let i=0;i<10;i++){const a=i/10*Math.PI*2+u*6,d=(1-clamp(u/.5))*24;dot(c,hand.x+Math.cos(a)*d,hand.y+Math.sin(a)*d,i%2?ink[1]:ink[2]);}
    }
  }
  function draw(c,s,p,e){
    if(!s||!c.fillRect)return;
    c.save();if('imageSmoothingEnabled' in c)c.imageSmoothingEnabled=false;
    for(const l of launches(s,p)){const u=(s.age-l.at)/LAUNCH;if(u>=0&&u<1.6)drawLaunch(c,l,u,s);}
    for(const f of s.effects||[]){
      const u=clamp(1-f.life/(f.duration||.5)),ink=INK[f.kind]||INK.wave;
      if(f.kind==='wave'||f.kind==='orbital'){ring(c,f.x,f.y,f.r*u,f.r*u*.42,ink,.8,1);ring(c,f.x,f.y,f.r*u*.72,f.r*u*.3,ink,.45,2);dust(c,f.x,f.y+f.r*.2,f.r*.8,u,14,'#b8a47c',21);}
      else if(f.kind==='cryo'){ring(c,f.x,f.y,f.r*u,f.r*u*.5,ink,.7,3);for(let i=0;i<14;i++){const a=hash(i)*Math.PI*2,d=f.r*u*hash(i+9);if(u<.9)spark(c,f.x+Math.cos(a)*d,f.y+Math.sin(a)*d*.6-u*12,ink,i%4===0?1:0);}}
      else if(f.kind==='heal'&&p){ring(c,p.x,p.y-1,8+u*26,2+u*6,ink,.6,4);}
      else if(f.kind==='alien'&&u>.5){ring(c,f.tx,f.ty,(u-.5)*80,(u-.5)*52,ink,.7,5);}
    }
    for(const b of s.beams||[]){
      const ink=INK.orbital;
      if(b.age<.45){
        // Retícula de puntería: cuatro escuadras que se cierran sobre el punto.
        const k=b.age/.45,r=60*(1.5-k*.5);for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=b.x+sx*r,y=b.y-4+sy*r*.2;for(let d=0;d<10;d+=B){dot(c,x-sx*d,y,ink[2]);dot(c,x,y-sy*d*.5,ink[2]);}}
        ring(c,b.x,b.y-2,145*(1.2-k*.2),12,ink,.35+.4*k,6);if(Math.floor(b.age*20)%2)spark(c,b.x,b.y-4,ink,1);
      }else{const k=clamp((2-b.age)*2);if(k>0){ring(c,b.x,b.y-2,150+Math.sin(b.age*40)*6,16,ink,.75,Math.floor(b.age*20));for(let i=0;i<12;i++){const u=(b.age*1.8+hash(i))%1;dot(c,b.x+(hash(i+20)-.5)*270,b.y-u*110,u<.5?ink[2]:ink[1],hash(i+2)>.5?B*2:B);}}}
    }
    for(const d of s.drones||[]){
      // Estela del motor y rombo de blanco sobre el objetivo.
      for(let i=0;i<4;i++)dot(c,d.x+(hash(i+Math.floor((s.age||0)*14))-.5)*8,d.y+16+i*4,i%2?INK.drone[1]:'#8a8676');
      const t=d.target;if(t&&t.hp>0&&Math.floor((s.age||0)*8)%2){const tx=t.x,ty=t.y-34;for(let k=0;k<12;k+=B){dot(c,tx-12+k,ty-k,'#ff6a4a');dot(c,tx+k,ty-12+k,'#ff6a4a');dot(c,tx+12-k,ty+k,'#ff6a4a');dot(c,tx-k,ty+12-k,'#ff6a4a');}}
    }
    for(const t of s.turrets||[]){
      const ink=INK.turret;
      // Mira punteada hacia donde apunta y cuenta atrás al agotarse.
      for(let d=24;d<150;d+=8)if((d/8+Math.floor((s.age||0)*10))%2)dot(c,t.x+Math.cos(t.angle)*d,t.y+Math.sin(t.angle)*d,'#d8523a',B);
      if(t.flash>0)spark(c,t.x+Math.cos(t.angle)*24,t.y+Math.sin(t.angle)*24,ink,2);
      if(t.life<4){const w=snap(28*clamp(t.life/4));c.fillStyle='#1c1e1a';c.fillRect(snap(t.x-15),snap(t.y-26),30,B*2);c.fillStyle=t.life<1.5?'#d8523a':ink[1];c.fillRect(snap(t.x-14),snap(t.y-26),w,B);}
    }
    if(s.flame>0&&p){const a=p.aim||{x:p.facing||1,y:0};for(let i=0;i<8;i++){const d=40+hash(i+Math.floor((s.age||0)*30))*90;dot(c,p.x+a.x*d+(hash(i)-.5)*14,p.y-30+a.y*d-hash(i+3)*10,i%3?INK.flame[1]:INK.flame[2]);}}
    if(p&&!p.burrow&&s.shieldFlash>0){const wolf=p.form==='wolf',ride=!!p.onMotorcycle,cy=p.y-(ride?36:wolf?38:26),hit=clamp(s.shieldFlash/.3);ring(c,p.x,cy,(ride?64:wolf?36:27)+(1-hit)*12,(ride?46:wolf?46:35)+(1-hit)*12,INK.shield,.8,9);for(let i=0;i<6;i++)spark(c,p.x+Math.cos(i*1.05)*(30+(1-hit)*14),cy+Math.sin(i*1.05)*(38+(1-hit)*14),INK.shield,0);}
    // Escarcha sobre los enemigos congelados.
    if(e)for(const n of e.enemies||[])if(n.hp>0&&n.frozen>0)for(let i=0;i<5;i++){const k=((s.age||0)*.8+hash(i+n.x))%1;dot(c,n.x+(hash(i+n.x*.1)-.5)*30,n.y-44+k*40,i%2?INK.cryo[1]:INK.cryo[2]);}
    c.restore();
  }
  // Recargas que ya venían en curso (partida reanudada): no son un lanzamiento nuevo.
  function prime(s){if(s)memory.set(s,{cooldowns:{...(s.cooldowns||{})},list:[]});}
  const api={COLORS,INK,LAUNCH,lights,launches,draw,prime};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadePowerFx=api;
})(typeof window!=='undefined'?window:globalThis);
