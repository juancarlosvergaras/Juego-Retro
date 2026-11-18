(function(root){
  'use strict';
  const S=729/692;
  // Samples from the original construction artwork, in reference coordinates.
  function patch(ctx,img,sx,sy,sw,sh,x,y,w,h){ctx.drawImage(img,Math.round(sx*S),Math.round(sy*S),Math.round(sw*S),Math.round(sh*S),Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function tile(ctx,img,sx,sy,sw,sh,x,y,w,h){
    const tw=Math.round(sw*S),th=Math.round(sh*S);
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    for(let yy=y;yy<y+h;yy+=th)for(let xx=x;xx<x+w;xx+=tw)patch(ctx,img,sx,sy,sw,sh,xx,yy,tw,th);
    ctx.restore();
  }
  function cleanArtwork(img){
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0);
    // Remove painted ladder rails; traversal draws only the actual climbable routes.
    const painted=[[236,1668,1905],[164,1519,1628],[433,1348,1628],[551,1168,1519],[125,1168,1348],[145,1000,1168],[550,831,1105],[145,831,940],[125,670,831],[211,503,605],[533,503,619],[162,360,454],[533,223,320]];
    for(const [x,top,bottom] of painted){
      const y=top-8,h=bottom-y+8;
      patch(ctx,img,x+25,y,42,h,(x-20)*S,y*S,42*S,h*S);
    }
    // Preserve the slab edges where one painted ladder crossed several floors.
    const P=root.ArcadePhysics;
    for(const p of P.createPlatforms().filter(p=>!p.custom)){
      const y=p.y>=P.EXTENSION.cut+P.EXTENSION.height?p.y-P.EXTENSION.height:p.y;
      ctx.drawImage(img,p.x,y,p.w,p.thickness,p.x,y,p.w,p.thickness);
      for(const [x,top,bottom] of painted){
        if(y+p.thickness<(top-8)*S||y>(bottom+8)*S)continue;
        const left=Math.max(p.x,(x-20)*S),right=Math.min(p.x+p.w,(x+22)*S);
        if(right<=left)continue;
        if(p.kind==='ledge')patch(ctx,img,340,1247,30,9,left,y,right-left,p.thickness);
        else patch(ctx,img,180,1348,40,18,left,y,right-left,p.thickness);
      }
    }
    // Keep the crane and rooftop silhouettes; the sky comes exclusively from the live background.
    const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;const m=mask.getContext('2d');m.fillStyle='#fff';m.fillRect(0,223*S,canvas.width,canvas.height);
    const silhouettes=[
      [[150,65],[442,24],[461,39],[461,52],[173,97],[150,90]],
      [[159,75],[163,18],[175,15],[189,79],[183,190],[189,195],[189,224],[147,224],[147,195],[159,190]],
      [[97,68],[194,61],[195,121],[98,119]],
      [[167,16],[443,26],[443,30],[167,20]],
      [[169,18],[105,73],[101,72],[166,16]],
      [[70,171],[87,165],[87,148],[92,148],[92,163],[98,163],[98,150],[103,150],[103,165],[113,166],[113,189],[143,189],[143,224],[70,224]],
      [[208,195],[245,195],[245,223],[208,223]],
      [[242,200],[366,200],[366,224],[242,224]],
      [[455,224],[455,212],[505,212],[505,165],[513,153],[519,168],[602,168],[602,135],[615,135],[619,224]]
    ];
    for(const polygon of silhouettes){m.beginPath();polygon.forEach(([x,y],i)=>m[i?'lineTo':'moveTo'](x*S,y*S));m.closePath();m.fill();}
    ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.restore();
    // Remove blue sky inside the open truss and around its support cables.
    const pixels=ctx.getImageData(0,0,canvas.width,Math.ceil(190*S));
    for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];const x=(i/4)%canvas.width,y=Math.floor(i/4/canvas.width);if(y<125*S||x>145*S&&x<465*S){if(b>45&&b>r-10&&b>g+3)pixels.data[i+3]=0;}}
    ctx.putImageData(pixels,0,0);
    // Preserve continuous steel stays after removing the baked blue sky.
    ctx.strokeStyle='#23282a';ctx.lineWidth=2*S;ctx.beginPath();ctx.moveTo(105*S,73*S);ctx.lineTo(168*S,18*S);ctx.lineTo(443*S,28*S);ctx.stroke();
    ctx.strokeStyle='#969180';ctx.lineWidth=.7*S;ctx.stroke();
    // Erase only the obsolete load and cable below the sloping lower rail.
    ctx.save();ctx.beginPath();ctx.moveTo(343*S,(107.5-.132*343)*S);ctx.lineTo(432*S,(107.5-.132*432)*S);ctx.lineTo(432*S,184*S);ctx.lineTo(343*S,184*S);ctx.closePath();ctx.clip();
    ctx.clearRect(343*S,48*S,89*S,136*S);ctx.restore();
    // Blue scenery painted inside open bays is not part of the structure.
    // Keep warm masonry, chains, lamps and platform silhouettes over the live skyline.
    const openings=ctx.getImageData(0,0,canvas.width,canvas.height);
    const bays=[[260,357,255,457],[390,501,309,481],[540,669,235,480],[709,830,250,455],[861,999,228,478],[1038,1167,250,478],[1206,1347,249,477],[1385,1518,250,476],[1553,1666,250,477]];
    for(const [top,bottom,left,right] of bays)for(let y=Math.ceil(top*S);y<bottom*S;y++)for(let x=Math.ceil(left*S);x<right*S;x++){
      const i=(y*canvas.width+x)*4,r=openings.data[i],g=openings.data[i+1],b=openings.data[i+2];
      if(b>r+5&&b>=g&&g>r+2)openings.data[i+3]=0;
    }
    ctx.putImageData(openings,0,0);
    return canvas;
  }
  function bay(ctx,img,y,height,index){
    ctx.save();ctx.beginPath();ctx.rect(75,y,581,height);ctx.clip();
    // The distant city remains visible through the unfinished central shaft.
    // Leave open spans transparent so the same city is visible inside and outside.
    const left=index%3!==1,right=index%3!==0;
    if(left)patch(ctx,img,160,1193,65,150,110,y+19,126,height-19);
    if(right){ctx.save();ctx.translate(729,0);ctx.scale(-1,1);patch(ctx,img,160,1193,65,150,110,y+19,126,height-19);ctx.restore();}
    // Real masonry pillars replace the flat painted strips.
    for(const x of [76,620])tile(ctx,img,76,1190,29,151,x,y,32,height);
    if(index%2===0)tile(ctx,img,76,1190,18,151,240,y+19,19,height-19);
    else tile(ctx,img,76,1190,18,151,470,y+19,19,height-19);
    ctx.restore();
  }
  function platform(ctx,img,p){
    if(p.kind==='scaffold'){
      const bottom=p.supportBottom,left=p.x+9,right=p.x+p.w-10;
      ctx.save();
      // Rear bracing stays below the walkable plank, with feet on the slab.
      ctx.lineWidth=3;ctx.strokeStyle='#394343';ctx.beginPath();
      ctx.moveTo(left,p.y+12);ctx.lineTo(right,bottom-5);
      ctx.moveTo(right,p.y+12);ctx.lineTo(left,bottom-5);ctx.stroke();
      ctx.lineWidth=1;ctx.strokeStyle='#8d9987';ctx.stroke();
      for(const x of [left,right]){
        ctx.fillStyle='#292b28';ctx.fillRect(x-3,p.y+9,6,bottom-p.y-9);
        ctx.fillStyle='#a88043';ctx.fillRect(x-2,p.y+9,3,bottom-p.y-9);
        ctx.fillStyle='#e2ba72';ctx.fillRect(x-2,p.y+10,1,bottom-p.y-11);
        ctx.fillStyle='#454b45';ctx.fillRect(x-7,bottom-4,14,4);
        ctx.fillStyle='#b4b4a0';ctx.fillRect(x-5,bottom-4,10,1);
      }
      tile(ctx,img,327,1247,69,9,p.x,p.y,p.w,p.thickness);
      ctx.fillStyle='#f1ce87';ctx.fillRect(p.x,p.y,p.w,2);
      ctx.fillStyle='#3a2e23';ctx.fillRect(p.x,p.y+8,p.w,3);
      for(let x=p.x+19;x<p.x+p.w;x+=25){ctx.fillStyle='#4b3e2d';ctx.fillRect(x,p.y+2,1,5);}
      ctx.restore();return;
    }
    if(p.kind==='deck'){
      // The visible upper edge is the collision surface, including every gap.
      tile(ctx,img,75,1348,175,18,p.x,p.y,p.w,p.thickness);
      tile(ctx,img,111,1370,139,13,p.x+5,p.y+p.thickness,Math.max(0,p.w-10),13);
      ctx.fillStyle='#111b2380';ctx.fillRect(p.x+5,p.y+p.thickness+13,p.w-10,3);
    }else{
      patch(ctx,img,327,1247,69,12,p.x,p.y,p.w,p.thickness+4);
      patch(ctx,img,331,1259,10,8,p.x+6,p.y+p.thickness+4,10,8);
      patch(ctx,img,331,1259,10,8,p.x+p.w-16,p.y+p.thickness+4,10,8);
    }
  }
  function ladder(ctx,img,l){
    const x=Math.round(l.x),top=Math.round(l.top),bottom=Math.round(l.bottom);
    ctx.save();
    // Open space between the rails: never repeat a rectangular background crop.
    for(const side of [-1,1]){
      const rail=x+side*8-2;
      ctx.fillStyle='#302819';ctx.fillRect(rail-1,top,5,bottom-top);
      ctx.fillStyle='#aa762c';ctx.fillRect(rail,top,3,bottom-top);
      ctx.fillStyle='#e3b858';ctx.fillRect(rail,top,1,bottom-top);
      for(let y=top+26;y<bottom-8;y+=39){ctx.fillStyle='#715329';ctx.fillRect(rail+1,y,2,3);}
    }
    const steps=Math.max(1,Math.floor((bottom-top-8)/13)),spacing=(bottom-top-8)/steps;
    for(let i=0;i<=steps;i++){
      const y=Math.round(top+4+i*spacing);
      ctx.fillStyle='#3d2d19';ctx.fillRect(x-7,y,14,4);
      ctx.fillStyle='#b78a40';ctx.fillRect(x-7,y,14,2);
      ctx.fillStyle='#f0cd79';ctx.fillRect(x-6,y,12,1);
    }
    ctx.restore();
  }
  root.ArcadeBuildingRenderer={bay,platform,ladder,cleanArtwork};
})(typeof window!=='undefined'?window:globalThis);
