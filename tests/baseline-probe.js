// Sonda de depuración (no forma parte del juego). Se inyecta en una misión
// abierta con ?debug y registra, para cada hoja de sprites, a qué distancia del
// suelo queda el borde inferior VISIBLE de lo que se dibuja. Sirve para
// encontrar personajes que flotan, se hunden o cambian de altura entre cuadros.
(function(){
  const g=window.__game;if(!g||!g.ctx){window.__probe=null;return;}
  const names=new Map();const label=(img,path)=>{if(img&&typeof img==='object'&&!names.has(img))names.set(img,path);};
  for(const [k,v] of Object.entries(g.images||{})){label(v,k);if(v&&v.texture)label(v.texture,k+'.texture');if(v&&typeof v==='object'&&!(v instanceof HTMLImageElement)&&!(v instanceof HTMLCanvasElement))for(const [k2,v2] of Object.entries(v))label(v2,k+'.'+k2);}
  let other=0;const rows=[];let on=false;
  // Borde opaco real de cada recorte, calculado una vez por hoja y rectángulo.
  const pixels=new Map(),bounds=new Map();
  function opaque(img,sx,sy,sw,sh){
    const key=sx+','+sy+','+sw+','+sh;let per=bounds.get(img);if(!per){per=new Map();bounds.set(img,per);}if(per.has(key))return per.get(key);
    let data=pixels.get(img);
    if(data===undefined){try{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);data={d:x.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};}catch{data=null;}pixels.set(img,data);}
    let out=null;
    if(data){const x0=Math.max(0,Math.floor(sx)),x1=Math.min(data.w,Math.ceil(sx+sw)),y0=Math.max(0,Math.floor(sy)),y1=Math.min(data.h,Math.ceil(sy+sh));let top=-1,bottom=-1;
      // Una fila cuenta si tiene cuerpo: ignora píxeles sueltos y brillos.
      for(let y=y0;y<y1;y++){let n=0;for(let x=x0;x<x1;x++)if(data.d[(y*data.w+x)*4+3]>=160)n++;if(n>=Math.max(3,(x1-x0)*.02)){if(top<0)top=y;bottom=y;}}
      if(top>=0)out={top:(top-sy)/sh,bottom:(bottom+1-sy)/sh};}
    per.set(key,out);return out;
  }
  const original=g.ctx.drawImage.bind(g.ctx);
  g.ctx.drawImage=function(img,...a){
    if(on&&a.length===8){const [sx,sy,sw,sh,dx,dy,dw,dh]=a,m=g.ctx.getTransform();
      if(!names.has(img))names.set(img,'otra'+(++other)+'('+img.width+'x'+img.height+')');
      const o=opaque(img,sx,sy,sw,sh);
      if(o){const at=v=>m.b*(dx+dw/2)+m.d*(dy+dh*v)+m.f,bx=m.a*(dx+dw/2)+m.c*(dy+dh)+m.e,by=at(o.bottom),ty=at(o.top);
        rows.push({k:names.get(img),src:[sx,sy,sw,sh].map(Math.round).join(','),x:bx+Math.round(g.camera.x),bottom:Math.max(by,ty)+Math.round(g.camera.y),h:Math.abs(by-ty)});}}
    return original(img,...a);
  };
  const surfaces=()=>(g.state?g.state.geometry.platforms:g.platforms)||[];
  function surface(x,bottom){let best=null;for(const p of surfaces()){if(x<p.x-6||x>p.x+p.w+6)continue;const d=bottom-p.y;if(best===null||Math.abs(d)<Math.abs(best))best=d;}return best;}
  window.__probe={start(){rows.length=0;on=true;},stop(){on=false;},names:()=>[...names.values()],
    // Solo cuentan los sprites de tamaño de personaje dibujados cerca de una superficie.
    report({min=18,max=260,near=16,only=null}={}){const by={};
      for(const r of rows){if(r.h<min||r.h>max||only&&!only.test(r.k))continue;const d=surface(r.x,r.bottom);if(d===null||Math.abs(d)>near)continue;const e=by[r.k]||(by[r.k]={n:0,offsets:{},frames:{},heights:{}});e.n++;const o=Math.round(d);e.offsets[o]=(e.offsets[o]||0)+1;(e.frames[r.src]||(e.frames[r.src]=new Set())).add(o);e.heights[r.src]=Math.round(r.h);}
      return Object.fromEntries(Object.entries(by).map(([k,e])=>{const hs=Object.values(e.heights);return[k,{n:e.n,offsets:e.offsets,alto:[Math.min(...hs),Math.max(...hs)],raros:Object.entries(e.frames).filter(([,s])=>[...s].some(o=>Math.abs(o)>2)).map(([src,s])=>src+' => '+[...s].join('/')).slice(0,10)}];}));}};
})();
