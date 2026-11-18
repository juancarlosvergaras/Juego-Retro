(function(root){
 'use strict';
 const attacks={lash:0,wave:1,laser:2,pods:3},durations={lash:1,wave:2.4,laser:1.5,pods:2.5},warnings={lash:1.1,wave:1.1,laser:1.3,pods:1.3};
 function pose(b,ending=-1){
  if(ending>=0)return{sheet:'base',index:12+Math.min(3,Math.floor(ending/2))};
  if(b.phase==='arrival')return{sheet:'base',index:Math.min(3,Math.floor(b.age/3*4))};
  if(b.hit>0)return{sheet:'base',index:10+(Math.floor((b.anim||0)*14)%2)};
  const warning=b.phase.endsWith('Warn'),attack=warning?b.phase.slice(0,-4):b.phase;
  if(Object.hasOwn(attacks,attack)){const frame=warning?Math.min(2,Math.floor(b.age/warnings[attack]*3)):b.age<durations[attack]*.65?3:b.age<durations[attack]*.85?4:5;return{sheet:'attack',index:attacks[attack]*6+frame};}
  if(b.phase==='recover'&&b.age<.5)return{sheet:'base',index:8+Math.floor(b.age*4)%2};
  return{sheet:'base',index:4+Math.floor((b.anim||b.age)*5)%4};
 }
 // Isolate each body, including tentacles that extend beyond its nominal cell.
 // Cached canvases prevent neighbouring frames from leaking into the silhouette.
 function prepare(image,cols,cuts){const source=document.createElement('canvas');source.width=image.width;source.height=image.height;const g=source.getContext('2d');g.drawImage(image,0,0);const data=g.getImageData(0,0,image.width,image.height).data,w=image.width,frames=[];
  for(let row=0;row<cuts.length-1;row++){const top=Math.round(cuts[row]*image.height),bottom=Math.round(cuts[row+1]*image.height),seen=new Uint8Array(w*(bottom-top)),queue=new Int32Array(seen.length),parts=[];
   for(let start=0;start<seen.length;start++){if(seen[start]||data[((top*w)+start)*4+3]<200)continue;let head=0,tail=1,l=start%w,r=l,t=Math.floor(start/w),b=t;queue[0]=start;seen[start]=1;
    while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const q of [x?p-1:-1,x<w-1?p+1:-1,p-w,p+w])if(q>=0&&q<seen.length&&!seen[q]&&data[(top*w+q)*4+3]>=200){seen[q]=1;queue[tail++]=q;}}
    if(tail<500)continue;const canvas=document.createElement('canvas');canvas.width=r-l+1;canvas.height=b-t+1;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(canvas.width,canvas.height);for(let i=0;i<tail;i++){const p=queue[i],to=((Math.floor(p/w)-t)*canvas.width+p%w-l)*4;pixels.data.set(data.subarray((top*w+p)*4,(top*w+p)*4+4),to);}ctx.putImageData(pixels,0,0);const f=[l,top+t,canvas.width,canvas.height];f.image=canvas;f.area=tail;parts.push(f);
   }
   parts.sort((a,b)=>b.area-a.area);const bodies=parts.slice(0,cols).sort((a,b)=>(a[0]+a[2]/2)-(b[0]+b[2]/2));if(bodies.length!==cols)throw Error('Soberano: fila incompleta '+row);frames.push(...bodies);
  }return frames;
 }
 const api={pose,prepare,attacks,durations,warnings};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeSovereignAnimation=api;
})(typeof window!=='undefined'?window:globalThis);
