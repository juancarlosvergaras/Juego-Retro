(function(root){
  'use strict';
  const strips = {
    maletin: ['assets/sprites/cine-maletin-8.webp', 5],
    radio: ['assets/sprites/cine-radio-8.webp', 5],
    salto: ['assets/sprites/cine-salto-8.webp', 5],
    cuerda: ['assets/sprites/cine-cuerda-8.webp', 8],
    ruta: ['assets/sprites/cine-ruta-8.webp', 5],
    buzo: ['assets/sprites/cine-buzo-8.webp', 8],
    camara: ['assets/sprites/cine-camara-8.webp', 4],
    orbita: ['assets/sprites/cine-orbita-8.webp', 6],
    commander: ['assets/sprites/cine-commander-8.webp', 5],
    ines: ['assets/sprites/cine-ines-8.webp', 10],
    modulo: ['assets/sprites/cine-modulo-8.webp', 7]
  };
  const images = new Map();
  // These close-ups belong to the film. Only request a strip once its shot is on screen.
  function draw(c,id,time,x,baseline,height,flip=false){
    const [path,fps]=strips[id];
    let img=images.get(id);
    if(!img){
      img=new root.Image();
      images.set(id,img);
      img.decoding='async';
      img.src=path;
      img.onerror=()=>root.setTimeout(()=>images.delete(id),30000);
    }
    if(!img.complete||!img.naturalWidth||!img.naturalHeight)return false;
    const sw=img.naturalWidth/8,sh=img.naturalHeight,w=Math.round(height*sw/sh);
    const step=Math.floor(Math.max(0,time)*fps);
    const frame=id==='maletin'?Math.min(7,step):step%8;
    c.save();c.translate(Math.round(x),Math.round(baseline));
    if(flip)c.scale(-1,1);
    c.drawImage(img,frame*sw,0,sw,sh,-Math.round(w/2),-Math.round(height),w,Math.round(height));
    c.restore();return true;
  }
  root.ArcadeStorySprites={draw};
})(typeof window==='undefined'?globalThis:window);
