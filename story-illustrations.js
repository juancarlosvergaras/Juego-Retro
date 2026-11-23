(function(root){
  'use strict';
  // Each tile is painted for a single narrative action, in reading order.
  const plates={
    'four-intro':'assets/sprites/historia-four-intro-8.webp',
    'four-outro':'assets/sprites/historia-four-outro-8.webp',
    'five-intro':'assets/sprites/historia-five-intro-8.webp',
    'five-outro':'assets/sprites/historia-five-outro-8.webp',
    'six-intro':'assets/sprites/historia-six-intro-8.webp',
    'six-outro':'assets/sprites/historia-six-outro-8.webp',
    'seven-intro':'assets/sprites/historia-seven-intro-8.webp',
    'seven-outro':'assets/sprites/historia-seven-outro-8.webp',
    'eight-intro':'assets/sprites/historia-eight-intro-8.webp',
    'eight-outro':'assets/sprites/historia-eight-outro-8.webp',
    'nine-intro':'assets/sprites/historia-nine-intro-8.webp',
    'nine-outro':'assets/sprites/historia-nine-outro-8.webp',
    'nine-release':'assets/sprites/historia-nine-release-8.webp',
    'nine-scramble':'assets/sprites/historia-nine-scramble-8.webp',
    'ten-intro':'assets/sprites/historia-ten-intro-8.webp',
    'ten-outro':'assets/sprites/historia-ten-outro-8.webp',
    'quimera-intro':'assets/sprites/historia-quimera-intro-8.webp',
    'quimera-outro':'assets/sprites/historia-quimera-outro-8.webp',
    'fuga-intro':'assets/sprites/historia-fuga-intro-8.webp',
    'fuga-outro':'assets/sprites/historia-fuga-outro-8.webp',
    'nine-interlock':'assets/sprites/historia-nine-interlock-8.webp',
    'nine-passage':'assets/sprites/historia-nine-passage-8.webp',
    'nine-taxi':'assets/sprites/historia-nine-taxi-8.webp',
    'eight-signal':'assets/sprites/historia-eight-signal-8.webp',
    'nine-patrol':'assets/sprites/historia-nine-patrol-8.webp',
    'nine-launch':'assets/sprites/historia-nine-launch-8.webp',
    'ten-formation':'assets/sprites/historia-ten-formation-8.webp',
    'ten-vector':'assets/sprites/historia-ten-vector-8.webp',
    'ten-escape':'assets/sprites/historia-ten-escape-8.webp',
    'ten-home':'assets/sprites/historia-ten-home-8.webp',
    'cenit-picado':'assets/sprites/historia-cenit-picado-8.webp',
    'cenit-mar':'assets/sprites/historia-cenit-mar-8.webp',
    'cenit-estela':'assets/sprites/historia-cenit-estela-8.webp',
    'cenit-regreso':'assets/sprites/historia-cenit-regreso-8.webp'
  };
  const shots={
    four:{convoy:'four-intro',botin:'four-outro'},
    five:{submarino:'five-intro',libros:'five-outro'},
    six:{atrio:'six-intro',orbita:'six-outro'},
    seven:{haz:'seven-intro',apagon:'seven-outro'},
    eight:{avenida:'eight-intro',esposas:'eight-outro',senal:'eight-signal'},
    nine:{signal:'nine-intro',patrol:'nine-patrol',launch:'nine-launch',control:'nine-outro',release:'nine-release',scramble:'nine-scramble'},
    ten:{hangar:'ten-intro',formation:'ten-formation',vector:'ten-vector',rupture:'ten-outro',escape:'ten-escape',home:'ten-home'},
    quimera:{'plano-1':'quimera-intro'}
  };
  const cache=new Map();
  function load(id){
    if(!plates[id]||!root.Image)return;
    if(!cache.has(id)){
      const img=new root.Image();
      img.decoding='async';cache.set(id,img);
      img.onerror=()=>root.setTimeout(()=>{if(cache.get(id)===img)cache.delete(id);},30000);
      img.src=plates[id];
    }
    return cache.get(id);
  }
  function draw(c,id,time,v,span=2.4){
    const img=load(id);
    if(!img?.complete||!img.naturalWidth)return false;
    const fw=img.naturalWidth/4,fh=img.naturalHeight/2;
    const progress=Math.min(1,Math.max(0,time/span));
    const frame=v.still?5:Math.min(7,Math.floor(progress*8));
    // Fit the entire drawing between the subtitle and the upper cinema bar.
    // On short phones the subtitle occupies up to 19 percent of the stage.
    const top=v.h*.105,bottom=v.h*.81;
    const scale=Math.min(v.w/fw,(bottom-top)/fh);
    const width=fw*scale,height=fh*scale;
    c.save();c.imageSmoothingEnabled=false;
    c.fillStyle='#05080d';c.fillRect(0,0,v.w,v.h);
    c.drawImage(img,(frame%4)*fw,Math.floor(frame/4)*fh,fw,fh,
      Math.round((v.w-width)/2),Math.round((top+bottom-height)/2),width,height);c.restore();
    return true;
  }
  function decorate(set,list){
    return list.map((raw,index)=>{
      const shot=root.ArcadeStoryCinema.normalize(raw,index);
      const id=shots[set]?.[shot.id];
      if(!id)return raw;
      load(id);
      const follow={'nine-outro':'nine-interlock','nine-release':'nine-passage','nine-scramble':'nine-taxi'}[id];
      if(follow)load(follow);
      return {...shot,draw(c,t,v){
        // A close-up followed by the moving wide shot. Consecutive captions share the
        // same shot clock so irreversible gestures never start over mid-sentence.
        if(follow){
          if(t>=2.65&&!v.still){
            if(id==='nine-outro'&&draw(c,follow,(t-2.65)%1.6,v,1.6))return;
            if(id!=='nine-outro'&&t<5.4&&draw(c,follow,t-2.65,v,2.65))return;
            if(id!=='nine-outro'&&t>=5.4){shot.draw(c,t,v);return;}
          }
          if(draw(c,id,t,v,2.55))return;
        }else{
          // The patrolmen approach first; only then does the close-up show the cuffs.
          const start=id==='eight-outro'?1.65:0;
          if((v.still||t>=start&&t<start+2.65)&&draw(c,id,t-start,v,2.5))return;
        }
        shot.draw(c,t,v);
      }};
    });
  }
  root.ArcadeStoryIllustrations={load,draw,decorate};
})(typeof window==='undefined'?globalThis:window);
