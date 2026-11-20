(function(root){
  'use strict';
  // Planos de las historias a pantalla completa. Este archivo guarda el registro
  // común (imágenes, utilidades de dibujo) y los planos de las misiones 01 a 03;
  // las demás misiones registran los suyos desde sus propios archivos.
  //
  // Un plano es {id, dur, draw(c, t, v)} y lo reproduce story-cinema.js:
  //  · se dibuja en un escenario de 540 de alto y v.w de ancho (720–1320); v.cx es el centro;
  //  · t son segundos reales desde que empezó el plano; v.dur, su duración prevista;
  //  · las franjas de cine tapan y < TOP y y > BOTTOM: lo importante va entre ambas,
  //    los pies en FLOOR y nada esencial más allá de v.cx ± 340 (ventanas 4:3).
  const doc=root.document,TOP=58,BOTTOM=436,FLOOR=428,TAU=Math.PI*2;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const lerp=(a,b,u)=>a+(b-a)*u;
  const ease=u=>{u=clamp(u);return u*u*(3-2*u);};
  // 0 → 1 entre los instantes a y b.
  const ramp=(t,a,b)=>clamp((t-a)/(b-a));
  // Movimiento de cámara que nunca se detiene en seco: llega a ~0,85 al cumplirse `dur`.
  const drift=(t,dur)=>1-Math.exp(-1.9*Math.max(0,t)/dur);
  const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};

  // ───────────────────────── Imágenes ─────────────────────────
  const shared={soldier:'assets/sprites/soldado-v2.png',heli:'assets/sprites/helicoptero-rescate-v3.png',fx:'assets/sprites/ambiente-animado-v1.png',boom:'assets/sprites/explosion-impacto-v1.png'};
  const sources={},scenes={},images={},pending={};
  // Cada imagen se pide una sola vez; si falla o tarda, el plano dibuja lo que haya.
  function fetchImage(id,src){
    if(images[id]||!root.Image)return Promise.resolve();
    return pending[id]||(pending[id]=new Promise(resolve=>{const image=new root.Image();image.onload=()=>{images[id]=image;resolve();};image.onerror=()=>resolve();image.src=src;}));
  }
  function load(set){return Promise.all(Object.entries(sources[set]||{}).map(([id,src])=>fetchImage(id,src)));}
  // Hoja de sprites en rejilla: limpia el alfa (como hace el juego) y mide la caja
  // ajustada de cada celda, para poder apoyar cada cuadro por los pies.
  const sheets={};
  // Tramo ocupado de una celda, sin los restos del cuadro vecino pegados al borde.
  function span(filled){
    const n=filled.length;let lo=0,hi=n-1;
    while(lo<n&&!filled[lo])lo++;while(hi>=0&&!filled[hi])hi--;if(lo>hi)return null;
    if(lo<=1){let end=lo;while(end<n&&filled[end])end++;let next=end;while(next<n&&!filled[next])next++;if(next<=hi&&end-lo<n*.2&&next-end>=6)lo=next;}
    if(hi>=n-3){let start=hi;while(start>=0&&filled[start])start--;let before=start;while(before>=0&&!filled[before])before--;if(before>=lo&&hi-start<n*.2&&start-before>=6)hi=before;}
    return[lo,hi];
  }
  function atlas(id,cols=1,rows=1,ref=0){
    const key=id+'/'+cols+'x'+rows;if(sheets[key])return sheets[key];
    const image=images[id];if(!image)return null;
    const cw=image.width/cols,ch=image.height/rows,frames=[];
    for(let i=0;i<cols*rows;i++)frames.push([Math.floor((i%cols)*cw),Math.floor(Math.floor(i/cols)*ch),Math.floor(cw),Math.floor(ch)]);
    let source=image;
    try{
      const canvas=doc.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const g=canvas.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);
      const picture=g.getImageData(0,0,canvas.width,canvas.height),d=picture.data,W=canvas.width,H=canvas.height;
      // Filas y columnas ocupadas de cada celda.
      const across=frames.map(f=>new Uint8Array(f[2]+2)),down=frames.map(f=>new Uint8Array(f[3]+2));
      const column=new Uint16Array(W),localX=new Uint16Array(W);
      for(let x=0;x<W;x++){column[x]=Math.min(cols-1,Math.floor(x/cw));localX[x]=Math.min(frames[column[x]][2]+1,x-frames[column[x]][0]);}
      for(let y=0;y<H;y++){
        const row=Math.min(rows-1,Math.floor(y/ch)),base=row*cols,localY=Math.min(frames[base][3]+1,y-frames[base][1]);
        for(let x=0;x<W;x++){
          const i=(y*W+x)*4+3;
          if(d[i]>=200){d[i]=255;const cell=base+column[x];across[cell][localX[x]]=1;down[cell][localY]=1;}else d[i]=0;
        }
      }
      g.putImageData(picture,0,0);source=canvas;
      frames.forEach((f,i)=>{const xs=span(across[i]),ys=span(down[i]);if(xs&&ys)frames[i]=[f[0]+xs[0],f[1]+ys[0],xs[1]-xs[0]+1,ys[1]-ys[0]+1];});
    }catch{}
    return sheets[key]={image:source,frames,cols,rows,cw,ch,ref:frames[Math.min(ref,frames.length-1)][3]||ch};
  }

  // ───────────────────────── Dibujo ─────────────────────────
  function fill(c,v,top,bottom,mid){const g=c.createLinearGradient(0,0,0,v.h);g.addColorStop(0,top);if(mid)g.addColorStop(.55,mid);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,v.w,v.h);}
  function shade(c,v,color){c.fillStyle=color;c.fillRect(0,0,v.w,v.h);}
  // Fondo que cubre el escenario sin deformarse. o.band: franja [x,y,w,h] de la imagen;
  // o.u / o.vy (0–1): posición de la cámara; o.zoom; o.ground:[yImagen,yEscenario] apoya
  // esa línea del fondo en esa altura. Devuelve px/py para pasar de imagen a escenario.
  function plate(c,img,v,o={}){
    if(!img)return null;
    const band=o.band||[0,0,img.width,img.height],k=Math.max(v.w/band[2],v.h/band[3])*(o.zoom||1),sw=v.w/k;
    let sh=v.h/k,sy=band[1]+(band[3]-sh)*clamp(o.vy??.5);
    const sx=band[0]+(band[2]-sw)*clamp(o.u??.5);
    if(o.ground){sy=Math.max(band[1],o.ground[0]-o.ground[1]/k);sh=Math.min(sh,band[1]+band[3]-sy);}
    c.drawImage(img,sx,sy,sw,sh,0,0,v.w,sh*k);
    // Si el fondo se acaba antes que el escenario, su último borde se prolonga hacia abajo.
    if(sh*k<v.h-1)c.drawImage(img,sx,sy+sh-3,sw,3,0,Math.floor(sh*k)-1,v.w,v.h-Math.floor(sh*k)+1);
    return{k,px:x=>(x-sx)*k,py:y=>(y-sy)*k};
  }
  // Franja que se repite en horizontal (calzadas, cubiertas, nubes).
  function strip(c,img,v,band,y,h,offset=0){
    if(!img)return;const w=band[2]*h/band[3];
    for(let x=-(((offset%w)+w)%w);x<v.w;x+=w)c.drawImage(img,band[0],band[1],band[2],band[3],Math.floor(x),Math.round(y),Math.ceil(w)+1,Math.round(h));
  }
  // Recorte suelto de una imagen, centrado en (x, y) con ancho w.
  function cut(c,img,r,x,y,w,o={}){
    if(!img)return;const h=w*r[3]/r[2];
    c.save();c.translate(Math.round(x),Math.round(y));if(o.rotate)c.rotate(o.rotate);if(o.flip)c.scale(-1,1);if(o.alpha!=null)c.globalAlpha*=o.alpha;
    c.drawImage(img,r[0],r[1],r[2],r[3],Math.round(-w/2),Math.round(-h/2),Math.round(w),Math.round(h));c.restore();
  }
  // Un cuadro de una hoja apoyado en el suelo: (x, y) es el punto entre los pies y
  // `size`, la altura en pantalla del cuadro de referencia de la hoja.
  function put(c,a,index,x,y,size,o={}){
    const f=a?.frames[index];if(!f)return;
    const k=size/a.ref,cellX=Math.floor((index%a.cols)*a.cw),off=o.anchor==='box'?0:(f[0]+f[2]/2-cellX-a.cw/2)*k;
    c.save();c.translate(Math.round(x),Math.round(y));if(o.rotate)c.rotate(o.rotate);if(o.flip)c.scale(-1,1);if(o.alpha!=null)c.globalAlpha*=o.alpha;
    c.drawImage(a.image,f[0],f[1],f[2],f[3],Math.round(off-f[2]*k/2),Math.round(-f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();
  }
  // Un cuadro dado por su rectángulo [x,y,w,h], apoyado en el suelo.
  function frame(c,image,f,x,y,k,flip=false,alpha=1){
    if(!image||!f)return;c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);c.globalAlpha*=alpha;
    c.drawImage(image,f[0],f[1],f[2],f[3],Math.round(-f[2]*k/2),Math.round(-f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();
  }
  // Silueta: el cuadro teñido de un color, para insinuar sin mostrar.
  let stencil=null;
  function silhouette(c,image,f,x,y,k,color,alpha=1,flip=false){
    if(!image||!f||!doc?.createElement)return;
    try{
      stencil=stencil||doc.createElement('canvas');const w=Math.max(1,Math.ceil(f[2]*k)),h=Math.max(1,Math.ceil(f[3]*k));stencil.width=w;stencil.height=h;
      const s=stencil.getContext('2d');s.imageSmoothingEnabled=false;s.drawImage(image,f[0],f[1],f[2],f[3],0,0,w,h);s.globalCompositeOperation='source-in';s.fillStyle=color;s.fillRect(0,0,w,h);
      c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);c.globalAlpha*=alpha;c.drawImage(stencil,Math.round(-w/2),-h);c.restore();
    }catch{}
  }
  // Cap Dollar con la hoja del soldado. size: su altura en pantalla. Mira a la derecha salvo flip.
  const HERO={idle:[0,[0,1,2,1],2.2],walk:[1,[0,1,2,3,4,5],9],run:[2,[0,1,2,3,4,5],12],jump:[3,[2],1],hang:[4,[0],1],salute:[0,[3],1],crouch:[4,[3],1]};
  function hunter(c,x,y,size,t,pose='idle',flip=false,alpha=1){
    const F=root.SOLDIER_V2_FRAMES,sheet=atlas('soldier',6,8);if(!F||!sheet)return;
    const [row,order,rate]=HERO[pose]||HERO.idle;
    frame(c,sheet.image,F[row]?.[order[Math.floor(Math.max(0,t)*rate)%order.length]],x,y,size/145,flip,alpha);
  }
  // Helicóptero de Vega. (x, y) es el umbral de la puerta; size, el largo del fuselaje. Morro a la derecha salvo flip.
  const HELI=[[8,242,504,211,332,174],[512,237,500,216,336,179],[1035,203,485,250,318,213]];
  function heli(c,x,y,size,t,o={}){
    const sheet=atlas('heli',3,2);if(!sheet)return;const f=HELI[Math.floor(Math.max(0,t)*14)%3],k=size/504;
    c.save();c.translate(Math.round(x),Math.round(y));if(o.flip)c.scale(-1,1);if(o.tilt)c.rotate(o.tilt);if(o.alpha!=null)c.globalAlpha*=o.alpha;
    c.drawImage(sheet.image,f[0],f[1],f[2],f[3],Math.round(-f[4]*k),Math.round(-f[5]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();
  }
  // Ambiente animado (fuego 3, humo 4, salpicadura 6…): celda centrada en (x, y).
  function fx(c,row,index,x,y,w,h,alpha=1){
    const sheet=atlas('fx',4,8);if(!sheet)return;
    c.save();c.globalAlpha*=alpha;c.drawImage(sheet.image,(Math.floor(index)%4)*sheet.cw,row*sheet.ch,sheet.cw,sheet.ch,Math.round(x-w/2),Math.round(y-h/2),Math.round(w),Math.round(h));c.restore();
  }
  // Explosión de ocho cuadros; phase va de 0 a 1.
  function boom(c,x,y,size,phase,alpha=1){
    const sheet=atlas('boom',4,2);if(!sheet||phase<0||phase>=1)return;const i=Math.floor(phase*8);
    c.save();c.globalAlpha*=alpha;c.drawImage(sheet.image,(i%4)*sheet.cw,Math.floor(i/4)*sheet.ch,sheet.cw,sheet.ch,Math.round(x-size/2),Math.round(y-size*.5),Math.round(size),Math.round(size*sheet.ch/sheet.cw));c.restore();
  }
  function glow(c,x,y,r,rgb,alpha){
    if(!(alpha>0)||!(r>0))return;c.save();c.globalCompositeOperation='screen';const g=c.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,'rgba('+rgb+','+Math.min(1,alpha).toFixed(3)+')');g.addColorStop(1,'rgba('+rgb+',0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
  }
  // Haz de luz desde (x, y) con un ángulo (0 = hacia arriba) y una apertura.
  function beam(c,x,y,angle,length,spread,rgb,alpha){
    const tx=x+Math.sin(angle)*length,ty=y-Math.cos(angle)*length,g=c.createLinearGradient(x,y,tx,ty);
    g.addColorStop(0,'rgba('+rgb+','+alpha+')');g.addColorStop(1,'rgba('+rgb+',0)');
    c.save();c.globalCompositeOperation='screen';c.fillStyle=g;c.beginPath();c.moveTo(x-2,y);c.lineTo(x+2,y);c.lineTo(tx+spread,ty);c.lineTo(tx-spread,ty);c.fill();c.restore();
  }
  function searchlights(c,v,t,y,count=3,alpha=.22){for(let i=0;i<count;i++)beam(c,v.w*(.16+i*.68/Math.max(1,count-1)),y,Math.sin(t*(.3+i*.07)+i*2)*.5,v.h*1.3,40,'190,214,255',alpha);}
  function rain(c,v,t,alpha=.25){
    c.save();c.strokeStyle='rgba(190,210,235,'+alpha+')';c.lineWidth=1.5;c.beginPath();
    for(let i=0;i<110;i++){const x=((hash(i)*v.w+t*60)%v.w+v.w)%v.w,y=(hash(i+90)*v.h+t*(620+hash(i+7)*320))%v.h;c.moveTo(x,y);c.lineTo(x-5,y+18);}
    c.stroke();c.restore();
  }
  function stars(c,v,t,count=60,height=v.h){
    c.fillStyle='#e6ecff';
    for(let i=0;i<count;i++){c.globalAlpha=.25+.6*Math.abs(Math.sin(t*(.6+hash(i)*1.4)+i));const s=i%7===0?3:2;c.fillRect(Math.round(hash(i+3)*v.w),Math.round(hash(i+70)*height),s,s);}
    c.globalAlpha=1;
  }
  // Columna de humo que sube desde (x, y).
  function smoke(c,x,y,t,seed=0,scale=1,tone='#2b2a31'){
    for(let i=0;i<8;i++){const u=(t*.09+i/8+hash(seed))%1,size=(10+u*44)*scale;c.globalAlpha=(1-u)*.42;c.fillStyle=i%2?tone:'#3d3b43';c.fillRect(Math.round(x+u*60*scale-size/2),Math.round(y-u*240*scale),Math.round(size),Math.round(size*.8));}
    c.globalAlpha=1;
  }
  function dust(c,x,y,t,seed=0,strength=1,dir=-1){
    for(let i=0;i<7;i++){const u=(t*1.5+i/7+hash(seed))%1,size=Math.round((6+u*16)*strength);c.globalAlpha=(1-u)*.4;c.fillStyle=i%2?'#c9b79a':'#a39077';c.fillRect(Math.round(x+dir*u*110*strength),Math.round(y-size-u*12),size*2,size);}
    c.globalAlpha=1;
  }
  function shadow(c,x,y,w,alpha=.5){c.fillStyle='rgba(6,9,14,'+alpha+')';c.fillRect(Math.round(x-w*.4),Math.round(y-2),Math.round(w*.8),4);c.fillStyle='rgba(6,9,14,'+alpha*.55+')';c.fillRect(Math.round(x-w*.5),Math.round(y+1),Math.round(w),4);}
  function bolt(c,x,y,length,seed,width=3,color='rgba(235,242,255,.95)'){
    c.save();c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);for(let i=1;i<=8;i++)c.lineTo(x+(hash(seed+i)-.5)*70,y+length*i/8);c.stroke();c.restore();
  }
  function flash(c,v,alpha,rgb='255,255,255'){if(alpha>0){c.save();c.globalCompositeOperation='screen';c.fillStyle='rgba('+rgb+','+Math.min(1,alpha).toFixed(3)+')';c.fillRect(0,0,v.w,v.h);c.restore();}}
  function vignette(c,v,strength=.7){const g=c.createRadialGradient(v.cx,v.h/2,v.h*.42,v.cx,v.h/2,Math.max(v.w,v.h)*.72);g.addColorStop(0,'rgba(4,8,14,0)');g.addColorStop(1,'rgba(4,8,14,'+strength+')');c.fillStyle=g;c.fillRect(0,0,v.w,v.h);}
  // Estallidos lejanos: destellos breves repartidos por una banda del cielo.
  function flak(c,v,t,top,height,rate=.5,rgb='255,170,90'){
    for(let k=0;k<5;k++){const clock=t*rate+k*.37,cycle=Math.floor(clock),phase=clock-cycle;if(phase>.22)continue;const life=1-phase/.22;glow(c,v.w*(.08+hash(cycle*7+k)*.84),top+hash(cycle*13+k)*height,14+40*(1-life),rgb,.85*life);}
  }
  // Nubes de la hoja de cubierta (misión 03) cruzando el cielo.
  const CLOUD=[16,576,570,164];
  function clouds(c,v,t,speed,alpha=1,count=6,size=420){
    const img=images.air;if(!img)return;c.save();c.globalAlpha*=alpha;
    for(let i=0;i<count;i++){const span=v.w+size*1.6,x=((i*span/count+hash(i)*200-t*speed*(.6+hash(i+5)*.6))%span+span)%span-size*.8;c.drawImage(img,CLOUD[0],CLOUD[1],CLOUD[2],CLOUD[3],Math.round(x),Math.round(40+hash(i+11)*(v.h-200)),Math.round(size*(.7+hash(i+2)*.6)),Math.round(size*.29*(.7+hash(i+2)*.6)));}
    c.restore();
  }
  // Helicóptero de la misión 03 (el de la hoja de cubierta). Morro a la derecha salvo flip.
  function huey(c,x,y,size,t,o={}){
    const img=images.air;if(!img)return;const h=size*.4;
    c.save();c.translate(Math.round(x),Math.round(y));if(o.tilt)c.rotate(o.tilt);if(!o.flip)c.scale(-1,1);
    c.drawImage(img,936,640,600,240,Math.round(-size/2),Math.round(-h/2),Math.round(size),Math.round(h));
    c.fillStyle='#d5dcd6';const rotor=Math.abs(Math.sin(t*46))*size*.46+size*.06;c.fillRect(Math.round(size*.03-rotor),Math.round(-h*.42),Math.round(rotor*2),3);c.restore();
  }
  // Sello del Consorcio dibujado por código: un hexágono con una C.
  function seal(c,x,y,r,color='#d8a23a',alpha=1){
    c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=Math.max(2,r*.14);c.beginPath();
    for(let i=0;i<6;i++){const a=TAU*i/6+TAU/12;c[i?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r);}
    c.closePath();c.stroke();c.beginPath();c.arc(x,y,r*.5,TAU*.12,TAU*.88);c.stroke();c.restore();
  }
  // Caja de carga con el sello.
  function crate(c,x,y,w,h,light=1){
    const tone=n=>'rgb('+Math.round(74*light+n)+','+Math.round(66*light+n)+','+Math.round(48*light+n)+')';
    c.fillStyle=tone(0);c.fillRect(Math.round(x-w/2),Math.round(y-h),Math.round(w),Math.round(h));
    c.fillStyle=tone(22);c.fillRect(Math.round(x-w/2),Math.round(y-h),Math.round(w),4);c.fillStyle=tone(-26);c.fillRect(Math.round(x-w/2),Math.round(y-5),Math.round(w),5);
    c.fillRect(Math.round(x-w/2),Math.round(y-h),5,Math.round(h));c.fillRect(Math.round(x+w/2-5),Math.round(y-h),5,Math.round(h));
    seal(c,x,y-h/2,Math.min(w,h)*.26,'#e0aa3e',.9*light);
  }

  // ═════════════════════ MISIÓN 01 · LA OBRA ═════════════════════
  const WOLF=()=>root.ACTION_FRAMES?.wolf,DEATH=()=>root.WHITE_DEATH_FRAMES;
  function nightCity(c,v,t,u,dark=.3){
    fill(c,v,'#121a33','#2a3350');
    plate(c,images.city,v,{u,vy:.3,zoom:1.12});
    const dusk=c.createLinearGradient(0,0,0,v.h);dusk.addColorStop(0,'rgba(8,12,34,'+(dark+.25)+')');dusk.addColorStop(1,'rgba(255,120,60,.16)');c.fillStyle=dusk;c.fillRect(0,0,v.w,v.h);
  }
  // Azotea en primer plano: una cornisa oscura con su pretil.
  function rooftop(c,v,y=FLOOR){
    c.fillStyle='#090e16';c.fillRect(0,y,v.w,v.h-y);c.fillStyle='#1d2a3a';c.fillRect(0,y,v.w,4);
    for(let x=40;x<v.w;x+=150){c.fillStyle='#090e16';c.fillRect(x,y-22,8,22);c.fillRect(x-12,y-26,32,5);}
  }
  const one={
    intro:[
      // 1 · La ciudad tras la guerra: travelling nocturno con reflectores y combates lejanos.
      {id:'ciudad',dur:8,draw(c,t,v){
        nightCity(c,v,t,lerp(.05,.75,drift(t,v.dur)),.2);
        searchlights(c,v,t,v.h*.74,4);flak(c,v,t,TOP+10,170,.7);
        for(let i=0;i<4;i++)fx(c,3,t*9+i,v.w*(.2+i*.21),372-(i%2)*26,44,62,.85);
        for(let i=0;i<3;i++)smoke(c,v.w*(.24+i*.28),350,t,i*3,.9);
        rain(c,v,t,.22);vignette(c,v);
      }},
      // 2 · El cazador y su piloto: Cap en la cornisa, el helicóptero de Vega a su espalda.
      {id:'cazador',dur:8,draw(c,t,v){
        nightCity(c,v,t,.55+.1*drift(t,v.dur),.35);searchlights(c,v,t,v.h*.76,3,.16);
        const hx=v.cx+lerp(520,150,ease(t/3.2))+Math.sin(t*.9)*8,hy=215+Math.sin(t*1.7)*5;
        beam(c,hx-120,hy+10,Math.PI+.5+Math.sin(t*.8)*.18,330,70,'220,236,255',.34);
        heli(c,hx,hy,430,t,{flip:true,tilt:.04});
        rooftop(c,v);
        shadow(c,v.cx-220,FLOOR,90);hunter(c,v.cx-220,FLOOR,158,t,'idle');
        rain(c,v,t,.28);vignette(c,v);
      }},
      // 3 · La obra: la cámara sube por la torre mientras los obreros huyen.
      {id:'obra',dur:9,draw(c,t,v){
        fill(c,v,'#0d1522','#16202f');
        const rise=ease(t/(v.dur*.95)),bg=plate(c,images.tower,v,{vy:1-rise});
        if(bg){
          const workers=atlas('workers',4,2),ground=bg.py(2036);
          for(let i=0;i<4;i++){const dir=i%2?1:-1,x=bg.px(360)+dir*(40+((t*150+i*90)%420));put(c,workers,Math.floor(t*11+i*2)%4,x,ground+(i%3)*5,78*bg.k/1.3,{flip:dir<0});}
          for(const [x,y] of [[150,1660],[560,1330],[170,980],[540,640],[300,420]])fx(c,3,t*10+x,bg.px(x),bg.py(y),40*bg.k,58*bg.k,.9);
        }
        shade(c,v,'rgba(8,12,30,'+(.12+.34*rise).toFixed(3)+')');rain(c,v,t,.2);vignette(c,v);
      }},
      // 4 · Lo que acecha arriba: una silueta en la azotea, contra la luna.
      {id:'luna',dur:7.5,draw(c,t,v){
        fill(c,v,'#0a1024','#1b2740');
        const bg=plate(c,images.tower,v,{band:[0,0,729,640],vy:lerp(.45,.2,drift(t,v.dur)),zoom:1.04});
        const x=bg?bg.px(318):v.cx-110,y=bg?bg.py(252):300,k=bg?bg.k:1.4,rise=ease(ramp(t,.6,2.6));
        shade(c,v,'rgba(6,9,26,.5)');
        glow(c,x,y-120*k,150*k,'226,234,255',.5*rise);c.fillStyle='rgba(236,240,255,'+(.9*rise).toFixed(3)+')';c.beginPath();c.arc(x,y-120*k,58*k,0,TAU);c.fill();
        const death=atlas('whiteWolf',3,2),pose=t%5>3.4?0:1,f=DEATH()?.[pose]||death?.frames[pose];
        if(death&&f){frame(c,death.image,f,x,y,k*.25,false,rise);silhouette(c,death.image,f,x,y,k*.25,'#04060c',.86*rise);}
        rain(c,v,t,.2);vignette(c,v,.8);
      }}
    ],
    // El vuelo de victoria (victory.js) ya enseña el helicóptero: el epílogo sigue con planos distintos.
    outro:[
      // 1 · La mordida: el cazador cambia, cuadro a cuadro, bajo una luz de luna.
      {id:'mordida',dur:9,draw(c,t,v){
        fill(c,v,'#05070f','#0f1424');
        const pulse=.5+.5*Math.sin(t*3.2),x=v.cx,y=FLOOR;
        glow(c,x,y-150,260,'150,170,255',.2+.1*pulse);glow(c,x,y-120,120,'255,70,60',.16*pulse*ramp(t,.4,2));
        c.fillStyle='#0b101a';c.fillRect(0,y,v.w,v.h-y);c.fillStyle='#1a2434';c.fillRect(0,y,v.w,3);
        // Soldado → lobo: los ocho cuadros de la transformación, del segundo 2 al 5.
        const wolf=atlas('wolf',8,7),F=WOLF()?.[0],step=clamp(Math.floor(ramp(t,2,5)*8),0,7);
        if(wolf&&F){shadow(c,x,y,150,.6);frame(c,wolf.image,F[step],x,y,1.62);if(step>=7)glow(c,x+16,y-150,26,'255,214,90',.25+.2*pulse);}
        else hunter(c,x,y,190,t,'idle');
        for(let i=0;i<26;i++){const u=(t*.25+hash(i))%1;c.fillStyle='rgba(190,205,255,'+(.5*(1-u)).toFixed(3)+')';c.fillRect(Math.round(x+(hash(i+9)-.5)*520),Math.round(y-u*330),3,3);}
        vignette(c,v,.85);
      }},
      // 2 · El rastro: el helicóptero pone rumbo al otro lado de la ciudad, de día.
      {id:'rastro',dur:8,draw(c,t,v){
        fill(c,v,'#6a86a8','#c9b08c');
        plate(c,images.ruins,v,{u:lerp(.1,.55,drift(t,v.dur)),vy:.2});
        shade(c,v,'rgba(40,30,50,.22)');
        const go=drift(t,v.dur);heli(c,v.cx-260+go*330,lerp(300,190,go)+Math.sin(t*1.6)*4,lerp(300,150,go),t,{tilt:-.06});
        for(let i=0;i<3;i++)smoke(c,v.w*(.2+i*.3),FLOOR-20,t,i*4+1,1.1);
        vignette(c,v,.6);
      }}
    ]
  };

  // ═════════════════ MISIÓN 02 · EL UMBRAL DEL REY ═════════════════
  const two={
    intro:[
      // 1 · El rumbo: el helicóptero cruza la ciudad en ruinas bajo el fuego antiaéreo.
      {id:'ruinas',dur:7.5,draw(c,t,v){
        fill(c,v,'#86a9cf','#c9c2b0');plate(c,images.ruins,v,{u:lerp(.15,.6,drift(t,v.dur)),vy:.5});
        for(let i=0;i<4;i++)smoke(c,v.w*(.14+i*.25),400,t,i*5,1.2);
        const hx=v.cx-90+drift(t,v.dur)*150,hy=205+Math.sin(t*1.5)*7;
        heli(c,hx,hy,400,t,{tilt:-.05});
        for(let k=0;k<4;k++){const clock=t*1.3+k*.31,cycle=Math.floor(clock),phase=clock-cycle;boom(c,hx+(hash(cycle*5+k)-.5)*520,hy-40+(hash(cycle*11+k)-.5)*220,90,phase*1.6,.9);}
        for(let i=0;i<6;i++){const u=(t*1.4+i*.17)%1;c.fillStyle='#ffe08a';c.fillRect(Math.round(lerp(v.w*(.2+hash(i)*.6),hx+(hash(i+3)-.5)*200,u)),Math.round(lerp(420,hy,u)),4,10);}
        shade(c,v,'rgba(40,24,16,.16)');vignette(c,v,.6);
      }},
      // 2 · El salto: Vega no puede bajar; el cazador se descuelga en paracaídas.
      {id:'salto',dur:7.5,draw(c,t,v){
        fill(c,v,'#86a9cf','#c9c2b0');plate(c,images.ruins,v,{u:.62,vy:.72,zoom:1.15});
        heli(c,v.cx+120+t*42,128+Math.sin(t*1.4)*4,230,t,{tilt:-.08});
        const drop=drift(t,v.dur*1.3),px=v.cx-120+Math.sin(t*1.1)*26,py=lerp(110,300,drop),sway=Math.sin(t*1.1)*.08;
        const chute=atlas('chute',4,2);
        c.save();c.translate(px,py);c.rotate(sway);put(c,chute,Math.floor(t*3)%4,0,150,150);hunter(c,0,206,62,t,'jump');c.restore();
        for(let i=0;i<5;i++){const u=(t*1.1+i*.2)%1;c.fillStyle='#ffe08a';c.fillRect(Math.round(v.w*(.15+hash(i)*.7)+u*40),Math.round(430-u*380),4,12);}
        flak(c,v,t,TOP+10,200,1.1,'255,200,120');
        shade(c,v,'rgba(40,24,16,.14)');vignette(c,v,.6);
      }},
      // 3 · Los caídos: la tormenta sobre el cementerio y los muertos que se levantan.
      {id:'caidos',dur:8,draw(c,t,v){
        fill(c,v,'#3c4660','#1c2030');
        const bg=plate(c,images.graves,v,{u:lerp(.2,.5,drift(t,v.dur)),ground:[688,FLOOR]}),floor=bg?bg.py(688):FLOOR;
        shade(c,v,'rgba(20,22,52,.4)');
        const zombies=atlas('zombie',6,6,5);
        for(let i=0;i<4;i++){
          const age=t-i*.9,x=v.cx+[-250,-90,110,270][i];if(age<0)continue;
          // Primero salen de la tierra (fila 0); después echan a andar (fila 3).
          if(age<2.4)put(c,zombies,Math.min(5,Math.floor(age/2.4*6)),x,floor+6,118,{flip:i%2===0});
          else put(c,zombies,18+Math.floor(age*5)%6,x+(i%2?1:-1)*(age-2.4)*16,floor+6,118,{flip:i%2===0});
        }
        const storm=t%4.6,light=storm<.5?(storm<.08?storm/.08:1-(storm-.08)/.42):0;
        if(light>0){flash(c,v,light*.42,'170,196,255');bolt(c,v.w*(.2+hash(Math.floor(t/4.6))*.6),0,340,Math.floor(t/4.6)*13);}
        rain(c,v,t,.34);vignette(c,v,.8);
      }},
      // 4 · El umbral: la puerta del mausoleo, y el cazador ante ella.
      {id:'umbral',dur:7.5,draw(c,t,v){
        fill(c,v,'#0c1024','#232a44');
        const bg=plate(c,images.graves,v,{u:.82,ground:[688,FLOOR]}),floor=bg?bg.py(688):FLOOR;
        shade(c,v,'rgba(8,10,30,.62)');
        const tomb=atlas('atlas02',4,2,6),door=v.cx+200,pulse=.55+Math.sin(t*5)*.2+hash(Math.floor(t*12))*.25;
        put(c,tomb,6,door,floor+8,380);
        glow(c,door,floor-90,150,'120,190,255',.5*pulse);
        c.save();c.globalCompositeOperation='screen';for(let i=0;i<3;i++)bolt(c,door+(i-1)*22,floor-170,150,Math.floor(t*11)*7+i*31,2,'rgba(205,236,255,'+(.7*pulse).toFixed(3)+')');c.restore();
        const walk=ramp(t,.3,3.2),x=v.cx-330+walk*150;
        shadow(c,x,floor,70);hunter(c,x,floor,112,t,walk<1?'walk':'idle');
        rain(c,v,t,.26);vignette(c,v,.85);
      }}
    ],
    outro:[
      // 1 · La cripta: el rey caído y unas cajas que no tienen siglos.
      {id:'cripta',dur:8,draw(c,t,v){
        fill(c,v,'#1a1410','#0c0a0c');
        const bg=plate(c,images.crypt,v,{u:lerp(.3,.55,drift(t,v.dur)),ground:[592,FLOOR]}),floor=bg?bg.py(592):FLOOR;
        shade(c,v,'rgba(10,8,20,.38)');
        put(c,atlas('king',6,5),28,v.cx+40,floor+4,150);
        for(const [dx,w,h,up] of [[250,96,74,0],[338,84,66,0],[292,78,58,70]])crate(c,v.cx+dx,floor-up,w,h,.9);
        shadow(c,v.cx-270,floor,80);hunter(c,v.cx-270,floor,128,t,'idle');
        for(const dx of [-420,-120,180,470])glow(c,v.cx+dx,floor-150,90,'255,170,80',.22+.08*Math.sin(t*7+dx));
        vignette(c,v,.85);
      }},
      // 2 · El sello: la luz de una linterna recorre la tapa de una caja.
      {id:'sello',dur:7.5,draw(c,t,v){
        fill(c,v,'#0d0b0a','#060506');
        const x=v.cx,y=250,w=560,h=300;
        c.fillStyle='#3a3426';c.fillRect(x-w/2,y-h/2,w,h);c.fillStyle='#2b261c';for(let i=0;i<5;i++)c.fillRect(x-w/2,y-h/2+i*h/5,w,3);
        c.fillStyle='#4d4532';c.fillRect(x-w/2,y-h/2,w,8);c.fillRect(x-w/2,y+h/2-8,w,8);c.fillRect(x-w/2,y-h/2,10,h);c.fillRect(x+w/2-10,y-h/2,10,h);
        seal(c,x,y-26,78,'#e3ad42');
        c.fillStyle='#e3ad42';c.font='bold 40px Consolas, monospace';c.textAlign='center';c.fillText('CONSORCIO',x,y+112);
        c.font='bold 13px Consolas, monospace';c.fillStyle='#b98f3c';c.fillText('LOGÍSTICA MILITAR PRIVADA  ·  LOTE 07',x,y+136);c.textAlign='left';
        // Todo a oscuras salvo donde apunta la linterna.
        const lx=x+Math.sin(t*.7)*190,ly=y+Math.cos(t*.5)*50,dark=c.createRadialGradient(lx,ly,60,lx,ly,330);
        dark.addColorStop(0,'rgba(4,4,6,0)');dark.addColorStop(1,'rgba(4,4,6,.93)');c.fillStyle=dark;c.fillRect(0,0,v.w,v.h);
        glow(c,lx,ly,180,'255,236,190',.16);
        for(let i=0;i<22;i++){const u=(t*.12+hash(i))%1;c.fillStyle='rgba(255,240,210,'+(.35*(1-u)).toFixed(3)+')';c.fillRect(Math.round(lx+(hash(i+4)-.5)*300),Math.round(ly+120-u*260),2,2);}
      }},
      // 3 · Tres rumbos: el helicóptero espera sobre el cementerio mientras amanece.
      {id:'rumbos',dur:8,draw(c,t,v){
        fill(c,v,'#4a4a78','#f0a868','#a36a78');
        plate(c,images.graves,v,{u:.4,vy:.3});
        const dawn=c.createLinearGradient(0,0,0,v.h);dawn.addColorStop(0,'rgba(60,50,110,.2)');dawn.addColorStop(1,'rgba(255,160,90,.36)');c.fillStyle=dawn;c.fillRect(0,0,v.w,v.h);
        const hx=v.cx-20+Math.sin(t*.7)*10,hy=250+Math.sin(t*1.6)*5;
        // Aire, carretera y mar: tres trazos que parten del helicóptero hacia el horizonte.
        const routes=[['AIRE',-300,-150,'150,220,255'],['CARRETERA',40,-185,'255,196,110'],['MAR',320,-130,'120,255,214']];
        routes.forEach(([label,dx,dy,rgb],i)=>{
          const show=ease(ramp(t,1+i*.9,2.2+i*.9));if(show<=0)return;
          c.fillStyle='rgba('+rgb+',.9)';for(let s=0;s<14;s++){const u=s/14;if(u>show)break;if((s+Math.floor(t*6))%3===0)continue;c.fillRect(Math.round(hx+dx*u),Math.round(hy-60+dy*u-Math.sin(u*Math.PI)*36),6,4);}
          if(show>=1){glow(c,hx+dx,hy-60+dy,34,rgb,.5+.3*Math.sin(t*4+i));c.font='bold 15px Consolas, monospace';c.textAlign='center';c.fillStyle='rgba('+rgb+',1)';c.fillText(label,hx+dx,hy-84+dy);c.textAlign='left';}
        });
        heli(c,hx,hy,430,t);
        vignette(c,v,.6);
      }}
    ]
  };

  // ═════════════════ MISIÓN 03 · GUERRA EN EL AIRE ═════════════════
  const DECK=[12,344,642,172],JET=[1027,313,509,208],SHIP=[0,140,1536,690];
  function sky(c,v,top='#254566',mid='#69a8c5',bottom='#d1decc'){fill(c,v,top,bottom,mid);}
  // Cubierta del portaaviones: la pieza de la hoja repetida, con su borde en `y`.
  function deck(c,v,y,offset=0){strip(c,images.air,v,DECK,y-5,140,offset);c.fillStyle='#10161d';c.fillRect(0,y+130,v.w,v.h-y-130);}
  function carrier(c,x,y,w,t,o={}){
    const img=images.carrier;if(!img)return;const h=w*SHIP[3]/SHIP[2];
    c.save();c.translate(Math.round(x),Math.round(y));if(o.rotate)c.rotate(o.rotate);if(o.alpha!=null)c.globalAlpha*=o.alpha;
    c.drawImage(img,SHIP[0],SHIP[1],SHIP[2],SHIP[3],Math.round(-w/2),Math.round(-h/2),Math.round(w),Math.round(h));
    if(!o.dead)for(const fx of [.12,.32,.52,.72])glow(c,-w/2+w*(fx+.06),h*.36,w*.06,'120,200,255',.5+.3*Math.sin(t*9+fx*20));
    c.restore();
  }
  const three={
    intro:[
      // 1 · El portaaviones que no toca el agua, con su escolta.
      {id:'portaaviones',dur:8,draw(c,t,v){
        sky(c,v);c.fillStyle='#ffedba';c.fillRect(Math.round(v.w*.82),84,26,26);glow(c,v.w*.82+13,97,90,'255,240,190',.5);
        clouds(c,v,t,40,.9,5,460);
        carrier(c,v.cx+lerp(90,-20,drift(t,v.dur)),258+Math.sin(t*.8)*5,Math.min(v.w*.84,880),t);
        for(let i=0;i<3;i++){const span=v.w+700,x=v.w+300-((t*260+i*span/3)%span);cut(c,images.air,JET,x,150+i*96,190+i*26);}
        clouds(c,v,t,300,.55,3,620);vignette(c,v,.5);
      }},
      // 2 · La aproximación: el helicóptero bajo las nubes y el cielo lleno de metralla.
      {id:'aproximacion',dur:7.5,draw(c,t,v){
        sky(c,v,'#1f3d5e','#5f9cbb','#c4d6c8');clouds(c,v,t,240,.9,6,480);
        carrier(c,v.cx+320,236+Math.sin(t)*4,440,t,{alpha:.92});
        const hx=v.cx-170+Math.sin(t*.7)*26,hy=262+Math.sin(t*4.6)*9;
        for(let i=0;i<7;i++){const u=(t*1.9+i*.14)%1,ex=hx+(hash(i+Math.floor(t*1.9))-.5)*240,ey=hy+(hash(i+9)-.5)*130;c.fillStyle='#ffe08a';c.fillRect(Math.round(lerp(v.cx+250,ex,u)),Math.round(lerp(250,ey,u)),10,3);}
        for(let k=0;k<5;k++){const clock=t*1.7+k*.23,cycle=Math.floor(clock),phase=clock-cycle;boom(c,hx+(hash(cycle*5+k)-.5)*420,hy-30+(hash(cycle*11+k)-.5)*230,100,phase*1.7,.9);}
        huey(c,hx,hy,320,t,{tilt:-.07+Math.sin(t*2.3)*.03});
        clouds(c,v,t,620,.6,3,700);vignette(c,v,.55);
      }},
      // 3 · El descenso: el cazador baja por la cuerda a la cubierta.
      {id:'descenso',dur:7.5,draw(c,t,v){
        sky(c,v,'#2a4a6c','#74a9c2','#d6dccb');clouds(c,v,t,180,.8,4,460);
        deck(c,v,FLOOR,t*60);
        const hx=v.cx+70+Math.sin(t*.9)*10,hy=168+Math.sin(t*2)*5,drop=ease(ramp(t,.8,4)),x=hx-14,y=lerp(hy+70,FLOOR,drop);
        c.strokeStyle='#cbbd92';c.lineWidth=3;c.beginPath();c.moveTo(x,hy+26);c.lineTo(x,drop<1?y-88:hy+26+lerp(FLOOR-hy-60,0,ramp(t,4,5)));c.stroke();
        huey(c,hx,hy,360,t,{tilt:-.03});
        shadow(c,x,FLOOR,80,.35*drop);hunter(c,x,y,104,t,drop<1?'hang':'idle');
        for(let i=0;i<9;i++){const u=(t*1.2+hash(i)*3)%1;c.fillStyle='rgba(255,255,255,'+(.25*(1-u)).toFixed(3)+')';c.fillRect(Math.round(v.w-u*(v.w+200)),90+((i*53)%300),130,2);}
        flak(c,v,t,TOP+10,150,.9,'255,200,120');vignette(c,v,.55);
      }},
      // 4 · El Centinela: la máquina que guarda la proa, y el cazador frente a ella.
      {id:'centinela',dur:7.5,draw(c,t,v){
        sky(c,v,'#1c2f4c','#51748f','#c9a886');clouds(c,v,t,60,.5,4,460);shade(c,v,'rgba(14,20,40,.34)');
        deck(c,v,FLOOR,0);
        const mecha=atlas('mecha',4,3),mx=v.cx+170+Math.sin(t*.5)*10,step=Math.floor(t*3)%4;
        for(const x of [v.cx-40,v.cx+400]){c.fillStyle='rgba(255,186,105,.25)';c.fillRect(Math.round(x)-3,TOP+30,6,FLOOR-TOP-30);c.fillStyle='#fff2a6';for(let y=TOP+40;y<FLOOR-20;y+=34)c.fillRect(Math.round(x)-2,Math.round(y+(Math.floor(t*20)%20)),4,10);}
        shadow(c,mx,FLOOR,330,.5);put(c,mecha,step,mx,FLOOR+2+(step%2)*2,330);
        glow(c,mx-52,FLOOR-262,26,'255,80,60',.4+.3*Math.sin(t*4));
        shadow(c,v.cx-290,FLOOR,66);hunter(c,v.cx-290,FLOOR,100,t,'idle');
        vignette(c,v,.7);
      }}
    ],
    // La cinemática de cierre (mission-endings.js) ya enseña la extracción del chasis y la
    // autopista con la moto: el epílogo sigue con la caída del portaaviones y los dos rastros.
    outro:[
      // 1 · La caída: sin su guardián, el portaaviones se escora y pierde altura.
      {id:'caida',dur:8,draw(c,t,v){
        sky(c,v,'#33375f','#b9826c','#f1c894');clouds(c,v,t,90,.8,5,460);
        const sink=drift(t,v.dur),x=v.cx+60+sink*70,y=230+sink*130,w=Math.min(v.w*.8,820);
        for(let i=0;i<4;i++)smoke(c,x-w*.32+i*w*.2,y-40+i*14,t,i*7+3,1.5);
        carrier(c,x,y,w,t,{rotate:.06+sink*.12,dead:true});
        for(let i=0;i<4;i++)fx(c,3,t*10+i,x-w*.3+i*w*.19,y-26+i*16,60,84,.9);
        for(let i=0;i<3;i++)cut(c,images.air,JET,v.cx+260-((t*210+i*330)%(v.w+500)),120+i*40,120);
        huey(c,v.cx-330+t*36,370+Math.sin(t*2)*5,250,t,{tilt:-.06});
        clouds(c,v,t,360,.5,3,640);vignette(c,v,.6);
      }},
      // 2 · Dos rastros: las luces del convoy por la carretera y, al fondo, la ciudad encendida.
      {id:'huida',dur:8,draw(c,t,v){
        fill(c,v,'#d98548','#2a2230');
        const bg=plate(c,images.road,v,{u:lerp(.3,.6,drift(t,v.dur)),vy:.32});
        shade(c,v,'rgba(24,14,34,.3)');
        if(bg){
          // Las luces del convoy se alejan por la calzada; en el horizonte, un resplandor sobre la ciudad.
          const y=bg.py(520);for(let i=0;i<5;i++){const x=v.cx+120+i*54+t*26;c.fillStyle=Math.floor(t*6+i)%5?'#ff5a44':'#ffb08a';c.fillRect(Math.round(x),Math.round(y-i*4),7,4);glow(c,x,y-i*4,22,'255,90,60',.35);}
          const cityX=bg.px(1560),cityY=bg.py(250);glow(c,cityX,cityY,110,'255,220,150',.35+.12*Math.sin(t*2));beam(c,cityX,cityY,0,260,10,'255,236,190',.5);
        }
        huey(c,v.cx-250+Math.sin(t*.6)*14,178+Math.sin(t*1.8)*5,330,t,{tilt:-.04});
        vignette(c,v,.65);
      }}
    ]
  };

  const files={
    one:{city:'assets/worlds/ciudad-fondo-v2.png',tower:'assets/worlds/mundo-01-edificio-v1.png',workers:'assets/sprites/trabajadores-carrera-v4.png',whiteWolf:'assets/sprites/lobo-blanco-muerte-v1.png',wolf:'assets/sprites/soldado-lobo-v1.png',ruins:'assets/worlds/mission-02/city-day-v1.png'},
    two:{ruins:'assets/worlds/mission-02/city-day-v1.png',graves:'assets/worlds/mission-02/cemetery-dusk-v1.png',chute:'assets/sprites/paracaidas-v1.png',zombie:'assets/sprites/zombi-cementerio-v1.png',atlas02:'assets/worlds/mission-02/environment-atlas-v1.png',crypt:'assets/worlds/mission-02/mausoleum-interior-v1.png',king:'assets/sprites/rey-zombi-v3.png'},
    three:{carrier:'assets/worlds/mission-03/portaaviones-v1.png',air:'assets/worlds/mission-03/cubierta-atlas-v1.png',mecha:'assets/sprites/mecha-aereo-v1.png',road:'assets/worlds/mission-04/carretera-atardecer-v1.png'}
  };

  // Otras misiones aportan sus planos sin engordar este archivo. `list` es
  // {intro:[…], outro:[…]} o, en el formato antiguo, una lista de viñetas (c, w, h, t).
  // Registrar dos veces el mismo conjunto suma sus secuencias (el final de la 08 vive aparte).
  function register(set,files,list){sources[set]={...shared,...sources[set],...files};scenes[set]={...scenes[set],...(Array.isArray(list)?{intro:list}:list)};api.sets=Object.keys(scenes);}
  function sequence(set,kind='intro'){return scenes[set]?.[kind]||[];}
  const tools={TOP,BOTTOM,FLOOR,TAU,clamp,lerp,ease,ramp,drift,hash,atlas,fill,shade,plate,strip,cut,put,frame,silhouette,hunter,heli,huey,fx,boom,glow,beam,searchlights,rain,stars,smoke,dust,shadow,bolt,flash,vignette,flak,clouds,seal,crate};
  const api={register,sequence,load,images,sources,tools,span,sets:[]};
  register('one',files.one,one);register('two',files.two,two);register('three',files.three,three);
  root.ArcadeStoryScenes=api;
})(typeof window!=='undefined'?window:globalThis);
