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
    return pending[id]||(pending[id]=new Promise(resolve=>{const image=new root.Image();image.onload=()=>{images[id]=image;resolve();};image.onerror=()=>{delete pending[id];resolve();};image.src=src;}));
  }
  function load(set){
    const assets=Object.entries(sources[set]||{}).map(([id,src])=>fetchImage(id,src));
    if(set==='one'||set==='two'||set==='three')assets.push(root.ArcadeSoldierAnimation?.loadBase?.('soldier')?.catch(()=>{}));
    return Promise.all(assets);
  }
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
    c.drawImage(image,f[0],f[1],f[2],f[3],Math.round(-(f[5]??f[2]/2)*k),Math.round(-f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();
  }
  // Silueta: el cuadro teñido de un color, para insinuar sin mostrar.
  let stencil=null;
  function silhouette(c,image,f,x,y,k,color,alpha=1,flip=false){
    if(!image||!f||!doc?.createElement)return;
    try{
      stencil=stencil||doc.createElement('canvas');const w=Math.max(1,Math.ceil(f[2]*k)),h=Math.max(1,Math.ceil(f[3]*k));stencil.width=w;stencil.height=h;
      const s=stencil.getContext('2d');s.imageSmoothingEnabled=false;s.drawImage(image,f[0],f[1],f[2],f[3],0,0,w,h);s.globalCompositeOperation='source-in';s.fillStyle=color;s.fillRect(0,0,w,h);
      c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);c.globalAlpha*=alpha;c.drawImage(stencil,Math.round(-(f[5]??f[2]/2)*k),-h);c.restore();
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
    const sheet=atlas('heli',3,2);if(!sheet)return;
    c.save();c.translate(Math.round(x),Math.round(y));if(o.flip)c.scale(-1,1);if(o.tilt)c.rotate(o.tilt);if(o.alpha!=null)c.globalAlpha*=o.alpha;
    if(root.ArcadeRescueHelicopter)root.ArcadeRescueHelicopter.draw(c,sheet.image,0,0,size,t);
    else {
      const f=HELI[Math.floor(Math.max(0,t)*14)%3],k=size/504;
      c.drawImage(sheet.image,f[0],f[1],f[2],f[3],Math.round(-f[4]*k),Math.round(-f[5]*k),Math.round(f[2]*k),Math.round(f[3]*k));
    }
    c.restore();
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
    const nx=Math.cos(angle),ny=Math.sin(angle);
    c.save();c.globalCompositeOperation='screen';c.fillStyle=g;c.beginPath();c.moveTo(x-2*nx,y-2*ny);c.lineTo(x+2*nx,y+2*ny);c.lineTo(tx+spread*nx,ty+spread*ny);c.lineTo(tx-spread*nx,ty-spread*ny);c.fill();c.restore();
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
  // Puntos de apoyo en píxeles del fondo original. La base de cada llama
  // y su humo recorren exactamente la misma cámara que la superficie.
  const cityFires=[[633,554,29],[865,653,34],[1187,604,26],[1328,654,39]];
  const towerFires=[[152,1600,26],[485,1054,32],[222,707,26],[475,531,24]];
  function firesOnSet(c,bg,sites,t){
    const sheet=atlas('fx',4,8);
    if(!bg||!sheet)return;
    for(const [x,y,width] of sites){
      const footX=bg.px(x),footY=bg.py(y),w=width*bg.k;
      const age=t+x*.13,beat=Math.floor(age*9)%8;
      // Dos lenguas de la hoja de ambiente alternan en ocho siluetas.
      // El recorte ajustado descarta el margen transparente bajo cada celda.
      for(let i=0;i<2;i++){
        const u=(age*.42+i*.5)%1;
        const puff=sheet.frames[16+Math.min(3,Math.floor(u*4))];
        frame(c,sheet.image,puff,footX+w*.46*u,footY-w*(.42+1.25*u),
          w*(.7+u)/sheet.cw,false,Math.sin(Math.PI*u)*.46);
      }
      frame(c,sheet.image,sheet.frames[12+(beat>>1)],footX-w*.12,footY,w/sheet.cw);
      frame(c,sheet.image,sheet.frames[12+(((beat+3)%8)>>1)],footX+w*.20,footY,w*.63/sheet.cw,true);
    }
  }
  function nightCity(c,v,t,u,dark=.3){
    fill(c,v,'#121a33','#2a3350');
    const bg=plate(c,images.city,v,{u,vy:.3,zoom:1.12});
    const dusk=c.createLinearGradient(0,0,0,v.h);dusk.addColorStop(0,'rgba(8,12,34,'+(dark+.25)+')');dusk.addColorStop(1,'rgba(255,120,60,.16)');c.fillStyle=dusk;c.fillRect(0,0,v.w,v.h);
    firesOnSet(c,bg,cityFires,t);
    if(bg)for(const [x,y,phase] of [[690,603,0],[1130,698,2],[1375,653,4]])
      beam(c,bg.px(x),bg.py(y),Math.sin(t*.32+phase)*.42,v.h*1.3,34,'190,214,255',.16);
  }
  function rooftop(c,v,y=FLOOR){
    c.fillStyle='#090e16';c.fillRect(0,y,v.w,v.h-y);c.fillStyle='#1d2a3a';c.fillRect(0,y,v.w,4);
    strip(c,images.city,v,[1304,653,175,86],y,v.h-y);
  }
  function worksiteSoldier(c,x,y,size,stepPhase=null,salute=0){
    if(stepPhase!==null){
      const zoom=size/46;
      c.save();c.translate(Math.round(x),Math.round(y));c.scale(zoom,zoom);
      const drawn=root.ArcadeSoldierAnimation?.baseSprite(c,{x:0,y:0,form:'soldier'},0,stepPhase);
      c.restore();
      if(!drawn)hunter(c,x,y,size,stepPhase,'walk');
    }else if(images.capSalute){
      const img=images.capSalute,w=img.width/12,i=Math.round(clamp(salute)*11),k=size/145;
      c.drawImage(img,i*w,0,w,img.height,Math.round(x-63*k),Math.round(y-154*k),Math.round(w*k),Math.round(img.height*k));
    }else hunter(c,x,y,size,0,salute>.6?'salute':'idle');
  }
  function worksiteHeli(c,x,y,width,t,flip=false){
    root.ArcadePatrolHelicopter?.draw(c,images.patrolHeli,x,y,width,t,flip);
  }
  const one={
    intro:[
      // 1 · La ciudad tras la guerra: travelling nocturno con reflectores y combates lejanos.
      {id:'ciudad',dur:8,draw(c,t,v){
        nightCity(c,v,t,lerp(.05,.75,drift(t,v.dur)),.2);
        flak(c,v,t,TOP+10,170,.7);
        rain(c,v,t,.22);vignette(c,v);
      }},
      // 2 · El cazador y su piloto: Cap en la cornisa, el helicóptero de Vega a su espalda.
      {id:'cazador',dur:8,draw(c,t,v){
        nightCity(c,v,t,.55+.1*drift(t,v.dur),.35);
        const hx=v.cx+lerp(520,140,ease(t/3.2))+Math.sin(t*.9)*8,hy=205+Math.sin(t*1.7)*5;
        beam(c,hx-115,hy+38,Math.PI+.5+Math.sin(t*.8)*.18,330,70,'220,236,255',.25);
        worksiteHeli(c,hx,hy,335,t,true);
        rooftop(c,v);
        const distance=Math.min(t,2.4)*62,x=v.cx-310+distance,height=116;
        shadow(c,x,FLOOR,56);
        const salute=ramp(t,2.55,3.55)*(1-ramp(t,5.3,6.2));
        worksiteSoldier(c,x,FLOOR,height,t<2.4?distance/(52*height/46):null,salute);
        rain(c,v,t,.28);vignette(c,v);
      }},
      // 3 · La obra: la cámara sube por la torre mientras los obreros huyen.
      {id:'obra',dur:9,draw(c,t,v){
        fill(c,v,'#0d1522','#16202f');
        const rise=ease(t/(v.dur*.95)),bg=plate(c,images.tower,v,{vy:1-rise});
        if(bg){
          const ground=bg.py(2036);
          for(let i=0;i<4;i++){
            const dir=i%2?1:-1,x=bg.px(360)+dir*(40+t*135+i*65);
            const f=root.WORKER_RUN_FRAMES?.[Math.floor(t*11+i*2)%8];
            if(!f||!images.workers)continue;
            const [sx,sy,sw,sh,pivot,face]=f,k=bg.k*.15;
            c.save();c.translate(x,ground+(i%3)*4);c.scale(dir*face,1);
            c.drawImage(images.workers,sx,sy,sw,sh,-pivot*k,-sh*k,sw*k,sh*k);c.restore();
          }
          firesOnSet(c,bg,towerFires,t);
        }
        shade(c,v,'rgba(8,12,30,'+(.12+.34*rise).toFixed(3)+')');rain(c,v,t,.2);vignette(c,v);
      }},
      // 4 · Lo que acecha arriba: una silueta en la azotea, contra la luna.
      {id:'luna',dur:7.5,draw(c,t,v){
        fill(c,v,'#0a1024','#1b2740');
        const bg=plate(c,images.tower,v,{band:[0,0,729,640],vy:lerp(.45,.2,drift(t,v.dur)),zoom:1.04});
        const stride=Math.min(t,3.6)*18;
        const x=bg?bg.px(238+stride):v.cx-110,y=bg?bg.py(235):300,k=bg?bg.k:1.4,rise=ease(ramp(t,.6,2.6));
        shade(c,v,'rgba(6,9,26,.5)');
        if(bg){
          const mx=bg.px(283),my=bg.py(140);
          glow(c,mx,my,45*k,'196,208,235',.27);
          c.fillStyle='rgba(207,218,238,.57)';c.beginPath();c.arc(mx,my,19*k,0,TAU);c.fill();
        }
        const walking=t<3.6&&images.wolfWalk&&root.WOLF_WALK_FRAMES;
        const img=walking?images.wolfWalk:images.wolf;
        const f=walking?root.WOLF_WALK_FRAMES[0][Math.floor(stride/9)%8]:root.ACTION_FRAMES?.wolf?.[0][7];
        const scale=k*(walking?root.WOLF_WALK_SCALE*.57/.48:.57);
        if(img&&f){frame(c,img,f,x,y,scale,false,rise);silhouette(c,img,f,x,y,scale,'#04060c',.86*rise);}
        rain(c,v,t,.2);vignette(c,v,.8);
      }}
    ],
    // El vuelo de victoria (victory.js) ya enseña el helicóptero: el epílogo sigue con planos distintos.
    outro:[
      // 1 · La mordida: el cazador cambia, cuadro a cuadro, bajo una luz de luna.
      {id:'mordida',dur:9,draw(c,t,v){
        nightCity(c,v,t,.61,.45);rooftop(c,v);
        const x=v.cx,y=FLOOR,k=2.65,u=ramp(t,1.7,4.2);
        shadow(c,x,y,68);
        if(t<1.7)worksiteSoldier(c,x,y,46*k);
        else if(u<1){
          c.save();c.translate(x,y);c.scale(k,k);
          const p={x:0,y:0,facing:1,form:'wolf',transformFrom:'soldier',transform:(1-u)*1.2};
          if(!root.ArcadeFormTransition?.draw(c,p)){
            const pose=root.ArcadeSoldierAnimation?.transformation(Math.min(7,Math.floor(u*8)));
            if(pose){
              const frames={soldier:root.SOLDIER_V2_FRAMES,wolf:root.ACTION_FRAMES?.wolf,transformation:root.ArcadeSoldierAnimation.transformationFrames};
              frame(c,images[pose.sheet],frames[pose.sheet]?.[pose.row]?.[pose.frame],0,0,pose.scale);
            }
          }
          c.restore();
        }else{
          c.save();c.translate(x,y);c.scale(k,k);
          const wolf={x:0,y:0,form:'wolf',facing:1,grounded:true,anim:t-4.2,idleTime:5+t-4.2,vx:0};
          const anim=root.ArcadeSoldierAnimation,pose=anim?.wolfIdlePose(wolf);
          anim?.applyWolfMotion(c,wolf);
          if(pose&&images.wolfActions)frame(c,atlas('wolfActions',6,4).image,anim.wolfActionFrames[pose.row][pose.frame],0,-pose.lift,pose.scale);
          else frame(c,images.wolf,root.ACTION_FRAMES?.wolf?.[0][7],0,0,.48);
          c.restore();
        }
        rain(c,v,t,.15);vignette(c,v,.74);
      }},
      // 2 · El rastro: el helicóptero pone rumbo al otro lado de la ciudad, de día.
      {id:'rastro',dur:8,draw(c,t,v){
        fill(c,v,'#6a86a8','#c9b08c');
        plate(c,images.ruins,v,{u:lerp(.1,.55,drift(t,v.dur)),vy:.2});
        shade(c,v,'rgba(40,30,50,.22)');
        const go=ease(t/v.dur);
        worksiteHeli(c,lerp(v.cx-235,v.w+88,go),lerp(304,164,go)+Math.sin(t*1.6)*3,lerp(295,122,go),t);
        vignette(c,v,.6);
      }}
    ]
  };

  // ═════════════════ MISIÓN 02 · EL UMBRAL DEL REY ═════════════════
  function cityHunter(c,x,floor,size,t,distance=0,moving=false,data={}){
    const animation=root.ArcadeSoldierAnimation,F=root.SOLDIER_V2_FRAMES;
    if(!animation?.drawGait||!F||!images.soldier){hunter(c,x,floor,size,t,moving?'walk':'idle');return;}
    const form=data.form||'soldier',k=size/46,p={form,x:0,y:0,grounded:true,facing:1,vx:moving?100:0,vy:0,anim:t,aim:{x:1,y:0},walkCycle:distance/((form==='wolf'?110:52)*k)};
    const loadout={inventory:data.inventory||{selected:3}},actors=data.actors;
    c.save();c.translate(Math.round(x),Math.round(floor));c.scale(k,k);
    if(form==='wolf'&&actors){
      animation.applyWolfMotion(c,p,{});
      const pose=moving?animation.wolfWalkPose(p):animation.wolfIdlePose(p);
      const frames=moving?root.WOLF_WALK_FRAMES:animation.wolfActionFrames;
      frame(c,moving?actors.wolfWalk:actors.wolfActions,frames[pose.row][pose.frame],0,0,moving?root.WOLF_WALK_SCALE:pose.scale);
    }else if(form==='robot'){
      root.ArcadeRobotForm.draw(c,p,loadout);root.ArcadeWeaponRenderer.draw(c,p,loadout);
    }else if(form==='soldier'){
      const pose=animation.pose(p,{},loadout),gait=animation.gait(p,{},loadout),melee=pose.sheet==='melee';
      const body=melee?actors?.melee:images.soldier,frames=melee?root.MELEE_FRAMES:F;
      animation.drawGait(c,p,gait,i=>frame(c,images.soldier,F[1][i],0,0,46/145),
        bob=>frame(c,body,frames[pose.row][pose.frame],0,bob,melee?root.MELEE_SCALE:46/145),melee?pose:null);
      if(gait)c.translate(0,gait.bob);
      if(pose.armed)root.ArcadeWeaponRenderer?.draw(c,p,loadout);
    }else root.ArcadeZombieForm?.drawPlayer(c,p);
    c.restore();
  }
  const two={
    intro:[
      // 1 · El rumbo: el helicóptero cruza la ciudad en ruinas bajo el fuego antiaéreo.
      {id:'ruinas',dur:7.5,draw(c,t,v){
        fill(c,v,'#86a9cf','#c9c2b0');const bg=plate(c,images.ruins,v,{u:lerp(.15,.6,drift(t,v.dur)),vy:.5});
        firesOnSet(c,bg,[[312,471,27],[811,502,20],[1165,520,21],[1638,481,29]],t);
        const hx=v.cx-90+drift(t,v.dur)*150,hy=205+Math.sin(t*1.5)*7;
        worksiteHeli(c,hx,hy,400,t);
        for(let k=0;k<4;k++){const clock=t*1.3+k*.31,cycle=Math.floor(clock),phase=clock-cycle;boom(c,hx+(hash(cycle*5+k)-.5)*520,hy-40+(hash(cycle*11+k)-.5)*220,90,phase*1.6,.9);}
        for(let i=0;i<6;i++){const u=(t*1.4+i*.17)%1;c.fillStyle='#ffe08a';c.fillRect(Math.round(lerp(v.w*(.2+hash(i)*.6),hx+(hash(i+3)-.5)*200,u)),Math.round(lerp(420,hy,u)),4,10);}
        shade(c,v,'rgba(40,24,16,.16)');vignette(c,v,.6);
      }},
      // 2 · El salto: Vega no puede bajar; el cazador se descuelga en paracaídas.
      {id:'salto',dur:7.5,draw(c,t,v){
        fill(c,v,'#86a9cf','#c9c2b0');plate(c,images.ruins,v,{u:.62,vy:.72,zoom:1.15});
        const drop=drift(t,v.dur),px=v.cx-90+Math.sin(t*1.1)*17,feet=lerp(260,410,drop);
        worksiteHeli(c,v.cx+90+t*45,125+Math.sin(t*1.4)*4,260,t);
        c.save();c.translate(px,feet);c.rotate(Math.sin(t*1.1)*.045);
        root.ArcadeParachute?.drawCanopy(c,images.chute,{x:0,y:0},{flight:true,frame:Math.floor(t*5)%4,alpha:1,collapse:0},1.35);
        frame(c,images.chuteSoldier,root.CLIMB_FRAMES?.[1][0],0,0,.14*1.35);
        c.restore();
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
        shadow(c,x,floor,70);cityHunter(c,x,floor,112,t,walk*150,t>.3&&walk<1);
        rain(c,v,t,.26);vignette(c,v,.85);
      }}
    ],
    outro:[
      // 1 · La cripta: el rey caído y unas cajas que no tienen siglos.
      {id:'cripta',dur:8,draw(c,t,v){
        fill(c,v,'#1a1410','#0c0a0c');
        const bg=plate(c,images.crypt,v,{u:lerp(.3,.55,drift(t,v.dur)),ground:[592,FLOOR]}),floor=bg?bg.py(592):FLOOR;
        shade(c,v,'rgba(10,8,20,.38)');
        const king=images.kingFallen;
        if(king){
          const width=332,height=Math.round(width*king.height/king.width);
          c.drawImage(king,Math.round(v.cx-width/2),Math.round(floor-height),width,height);
        }
        for(const [dx,w,h,up] of [[250,96,74,0],[338,84,66,0],[292,78,58,70]])crate(c,v.cx+dx,floor-up,w,h,.9);
        const walk=clamp(t/3.2),distance=walk*92,x=v.cx-270+distance;
        shadow(c,x,floor,80);cityHunter(c,x,floor,110,t,distance,walk<1,v.data);
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
      // 3 · Los dos envíos que se pueden perseguir tras la extracción.
      {id:'rumbos',dur:8,draw(c,t,v){
        fill(c,v,'#4a4a78','#f0a868','#a36a78');
        plate(c,images.graves,v,{u:.4,vy:.3});
        const dawn=c.createLinearGradient(0,0,0,v.h);dawn.addColorStop(0,'rgba(60,50,110,.2)');dawn.addColorStop(1,'rgba(255,160,90,.36)');c.fillStyle=dawn;c.fillRect(0,0,v.w,v.h);
        const hx=v.cx-20+Math.sin(t*.7)*10,hy=250+Math.sin(t*1.6)*5;
        const spread=Math.min(245,v.w*.24),routes=[['AIRE',-spread,-72,'150,220,255'],['CARRETERA',spread,-72,'255,196,110']];
        routes.forEach(([label,dx,dy,rgb],i)=>{
          const show=ease(ramp(t,1+i*.9,2.2+i*.9));if(show<=0)return;
          c.fillStyle='rgba('+rgb+',.9)';for(let s=0;s<14;s++){const u=s/14;if(u>show)break;if((s+Math.floor(t*6))%3===0)continue;c.fillRect(Math.round(hx+dx*u),Math.round(hy-60+dy*u-Math.sin(u*Math.PI)*36),6,4);}
          if(show>=1){glow(c,hx+dx,hy-60+dy,34,rgb,.5+.3*Math.sin(t*4+i));c.font='bold 15px Consolas, monospace';c.textAlign='center';c.fillStyle='rgba('+rgb+',1)';c.fillText(label,hx+dx,hy-84+dy);c.textAlign='left';}
        });
        worksiteHeli(c,hx,hy,430,t);
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
    const k=w/SHIP[2],lip=676,top=-h/2,left=-w/2;
    c.drawImage(img,0,SHIP[1],1536,lip-SHIP[1],left,top,w,(lip-SHIP[1])*k);
    // Each plume starts at its painted nozzle and varies independently.
    for(const [i,cx] of [255,560,870,1177].entries()){
      const power=o.dead ? .55 : .96+.12*Math.sin(t*10+i*1.9);
      c.drawImage(img,cx-78,lip,156,150,left+(cx-78)*k,top+(lip-SHIP[1])*k,156*k,150*k*power);
    }
    c.restore();
  }
  // Separate painted poses in the combat atlas. Register the planted foot and pelvis
  // explicitly: muzzle flashes, missiles and gravel change the size of the silhouette.
  const sentryPoses=[[208,329],[184,325],[178,325],[201,329],[218,671],[209,671],[179,671],[200,666]];
  function sentry(c,x,floor,height,pose){
    const sheet=images.mecha;if(!sheet)return;
    const sy=pose<4?0:341,[hip,sole]=sentryPoses[pose],k=height/321;
    c.save();c.translate(Math.round(x-hip*k),Math.round(floor-(sole-sy)*k));c.scale(k,k);
    if(pose===5){
      // This cell also contains airborne missiles. Keep the launcher and its exhaust.
      c.beginPath();c.moveTo(0,81);c.lineTo(165,81);c.lineTo(215,63);c.lineTo(215,39);
      c.lineTo(265,27);c.lineTo(279,0);c.lineTo(384,0);c.lineTo(384,333);c.lineTo(0,333);c.closePath();c.clip();
    }
    c.drawImage(sheet,(pose%4)*384,sy,384,333,0,0,384,333);c.restore();
  }
  function sentryMissiles(c,x,floor,t){
    if(!images.mecha)return;
    // A single painted projectile leaves the shoulder rack at each ignition.
    for(const start of [4.3,4.46,4.62]){
      const flight=t-start;
      if(flight>=0&&flight<1.55){
        const px=x+11-470*flight,py=floor-181-57*flight;
        c.drawImage(images.mecha,437,393,114,29,Math.round(px-60),Math.round(py-8),60,15);
      }
    }
  }
  const three={
    intro:[
      {id:'portaaviones',dur:5.8,draw(c,t,v){
        sky(c,v);clouds(c,v,t,22,.65,4,390);
        const width=Math.min(v.w*.84,910),cx=v.cx+42-48*drift(t,v.dur),y=254+Math.sin(t*.7)*4;
        carrier(c,cx,y,width,t);
        // The escort flies beside the parked fighters at the same depth.
        for(let i=0;i<2;i++){
          const x=cx+width*(.35+i*.15)-t*(32+i*6);
          cut(c,images.air,JET,x,y-80-i*27,width*(.078-i*.012));
        }
        root.ArcadeRescueHelicopter?.draw(c,images.heli,cx-width*.58+t*15,y+19+Math.sin(t)*2,width*.082,t);
        clouds(c,v,t,90,.32,2,410);vignette(c,v,.45);
      }},
      {id:'centinela',dur:5.8,draw(c,t,v){
        sky(c,v,'#263c58','#5987a1','#c4c4b1');clouds(c,v,t,32,.55,4,390);
        const floor=397;
        cut(c,images.air,JET,v.cx-175,floor-38,225);
        deck(c,v,floor,130);
        const distance=Math.min(t,2)*42,x=v.cx+125-distance;
        let pose;
        if(t<2)pose=0;
        else if(t<2.6)pose=6;
        else if(t<2.92)pose=7;
        else if(t<3.45)pose=0;
        else if(t<4.3)pose=Math.floor((t-3.45)*9)%2?0:4;
        else if(t<4.75)pose=5;
        else pose=0;
        shadow(c,x,floor,148,.37);
        if(t<2&&images.mechaWalk&&root.ArcadeAirMecha)root.ArcadeAirMecha.drawWalk(c,images.mechaWalk,x,floor,205/321,distance);
        else sentry(c,x,floor,205,pose);
        sentryMissiles(c,x,floor,t);
        vignette(c,v,.52);
      }},
      {id:'aproximacion',dur:5,draw(c,t,v){
        sky(c,v,'#284b68','#7bafc4','#d0daca');clouds(c,v,t,74,.7,4,410);
        const floor=417,travel=t*60;
        cut(c,images.air,[674,49,347,474],v.cx+440-travel,floor-122,185);
        cut(c,images.air,JET,v.cx+185-travel,floor-40,252);
        deck(c,v,floor,travel);
        const x=v.cx-120+ease(ramp(t,0,4))*64,y=244+Math.sin(t*1.8)*4;
        const passenger=()=>cityHunter(c,x,y,43,t,0,false,v.data||{});
        root.ArcadeRescueHelicopter?.draw(c,images.heli,x,y,334,t,passenger);
        vignette(c,v,.48);
      }}
    ],
    // Después del rescate se revela el destino de la carta náutica.
    outro:[
      // 1 · La caída: sin su guardián, el portaaviones se escora y pierde altura.
      {id:'caida',dur:8,draw(c,t,v){
        sky(c,v,'#33375f','#b9826c','#f1c894');clouds(c,v,t,90,.8,5,460);
        const sink=drift(t,v.dur),x=v.cx+60+sink*70,y=230+sink*130,w=Math.min(v.w*.8,820);
        c.save();c.translate(x,y);c.rotate(.06+sink*.12);
        carrier(c,0,0,w,t,{dead:true});
        for(const [i,dx] of [-.27,-.06,.17].entries()){
          const base=-w*.036;
          smoke(c,dx*w,base-12,t,i*7+3,.9);
          fx(c,3,t*10+i,dx*w,base-20,52,54);
        }
        c.restore();
        for(let i=0;i<3;i++)cut(c,images.air,JET,v.cx+260-((t*210+i*330)%(v.w+500)),120+i*40,120);
        worksiteHeli(c,v.cx-330+t*36,370+Math.sin(t*2)*5,250,t);
        clouds(c,v,t,360,.5,3,640);vignette(c,v,.6);
      }},
      // La carta náutica conduce a la siguiente misión, frente al puerto.
      {id:'huida',dur:6,draw(c,t,v){
        fill(c,v,'#1c6071','#061d30');
        plate(c,images.trench,v,{u:lerp(.42,.55,drift(t,v.dur)),vy:.25});
        const boats=images.submarines;
        if(boats){
          const sw=boats.width/8,sh=boats.height/3,x=v.cx+185-t*38,y=275+Math.sin(t*1.3)*5;
          cut(c,boats,[Math.floor(t*8)%8*sw,2*sh,sw,sh],x,y,245);
        }
        vignette(c,v,.65);
      }}
    ]
  };

  const files={
    one:{city:'assets/worlds/ciudad-fondo-v2.png',tower:'assets/worlds/mundo-01-edificio-v1.png',workers:'assets/sprites/trabajadores-carrera-v4.png',wolfWalk:'assets/sprites/lobo-caminata-v2.png',wolf:'assets/sprites/soldado-lobo-v1.png',patrolHeli:'assets/sprites/suceso-helicoptero-8.webp',capSalute:'assets/sprites/cine-cap-saludo-12.webp'},
    two:{ruins:'assets/worlds/mission-02/city-day-v1.png',graves:'assets/worlds/mission-02/cemetery-dusk-v1.png',chute:'assets/sprites/paracaidas-v1.png',chuteSoldier:'assets/sprites/soldado-escalada-v2.png',patrolHeli:'assets/sprites/suceso-helicoptero-8.webp',zombie:'assets/sprites/zombi-cementerio-v1.png',atlas02:'assets/worlds/mission-02/environment-atlas-v1.png'},
    three:{carrier:'assets/worlds/mission-03/portaaviones-v1.png',air:'assets/worlds/mission-03/cubierta-atlas-v1.png',mecha:'assets/sprites/mecha-aereo-v1.png',mechaWalk:'assets/sprites/centinela-marcha-16.webp',patrolHeli:'assets/sprites/suceso-helicoptero-8.webp'}
  };

  // Otras misiones aportan sus planos sin engordar este archivo. `list` es
  // {intro:[…], outro:[…]} o, en el formato antiguo, una lista de viñetas (c, w, h, t).
  // Registrar dos veces el mismo conjunto suma sus secuencias (el final de la 08 vive aparte).
  function register(set,files,list){sources[set]={...shared,...sources[set],...files};scenes[set]={...scenes[set],...(Array.isArray(list)?{intro:list}:list)};api.sets=Object.keys(scenes);}
  function sequence(set,kind='intro'){return scenes[set]?.[kind]||[];}
  const tools={TOP,BOTTOM,FLOOR,TAU,clamp,lerp,ease,ramp,drift,hash,atlas,fill,shade,plate,strip,cut,put,frame,silhouette,hunter,heli,huey,fx,boom,glow,beam,searchlights,rain,stars,smoke,dust,shadow,bolt,flash,vignette,flak,clouds,seal,crate};
  const api={register,sequence,load,images,sources,tools,span,sets:[]};
  register('one',files.one,one);register('two',files.two,two);register('three',files.three,three);
  sources['one:outro']={ruins:'assets/worlds/mission-02/city-day-v1.png',transformation:'assets/sprites/soldado-transformacion-v2.png',wolfActions:'assets/sprites/lobo-reposo-patadas-v2.png'};
  sources['two:outro']={crypt:'assets/worlds/mission-02/mausoleum-interior-v1.png',kingFallen:'assets/sprites/rey-zombi-caido.webp'};
  sources['three:outro']={trench:'assets/worlds/mission-05/fosa-panoramica.webp',submarines:'assets/sprites/submarinos-abismo-8.webp'};
  root.ArcadeStoryScenes=api;
})(typeof window!=='undefined'?window:globalThis);
