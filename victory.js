(function(root){
  'use strict';
  const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  function scene(t){
    const catchup=ease((t-1.6)/4.5);
    return {lead:{x:.63+Math.sin(t*.28)*.002,y:.32+Math.sin(t*.45)*.001,size:.38},
      ally:{x:-.35+catchup*.68,y:.20+Math.sin(t*.4+1)*.001,size:.29,visible:t>=1.6},
      scenery:(t*.006)%2,blur:ease((t-2.5)/4.5),
      title:ease((t-3)/1.3),subtitle:ease((t-4.7)/1.4),ready:t>=7.5};
  }
  function create({drawHelicopter,onFinish}){
    const layer=document.createElement('section');layer.id='victory-screen';layer.className='victory-screen';layer.hidden=true;
    layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Victoria · Cap Dollar, The Hunter');
    layer.innerHTML='<div class="victory-sky" aria-hidden="true"><div class="victory-sky-track"><i></i><i></i><i></i></div></div><canvas aria-hidden="true"></canvas><div class="victory-vignette" aria-hidden="true"></div><div class="victory-titles"><p class="victory-kicker">MISIÓN CUMPLIDA</p><h1><span>Cap</span> <span>Dollar</span></h1><p class="victory-subtitle"><span>The Hunter</span></p></div><button class="victory-next" type="button">Omitir escena</button>';
    document.body.append(layer);
    const canvas=layer.querySelector('canvas'),ctx=canvas.getContext('2d'),title=layer.querySelector('h1'),subtitle=layer.querySelector('.victory-subtitle'),kicker=layer.querySelector('.victory-kicker'),button=layer.querySelector('button');
    let active=false,age=0,ready=false,previousOverflow='';
    const surfaces=()=>Array.from(document.querySelectorAll('body > header,body > main,body > footer'));
    function finish(){if(!active)return;active=false;layer.hidden=true;document.body.style.overflow=previousOverflow;surfaces().forEach(el=>el.inert=false);onFinish();}
    button.onclick=finish;
    layer.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finish();}if(e.key==='Tab'){e.preventDefault();button.focus();}});
    function draw(){
      const w=Math.min(1440,Math.max(320,layer.clientWidth)),h=Math.max(320,Math.round(layer.clientHeight*w/layer.clientWidth));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      const s=scene(age);ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
      layer.style.setProperty('--scene-blur',(s.blur*9).toFixed(3)+'px');
      layer.style.setProperty('--scenery-offset',(-s.scenery*100).toFixed(5)+'%');
      layer.style.setProperty('--scene-shade',(s.blur*.32).toFixed(3));
      layer.style.setProperty('--title-sheen',(160-ease((age-4.3)/2.2)*220).toFixed(2)+'%');
      const unit=Math.min(w,h*1.9);
      if(s.ally.visible)drawHelicopter(ctx,s.ally.x*w,s.ally.y*h,unit*s.ally.size,age+.19);
      drawHelicopter(ctx,s.lead.x*w,s.lead.y*h,unit*s.lead.size,age);
      title.style.opacity=s.title;title.style.transform='translateY('+((1-s.title)*20)+'px) scale('+(.94+s.title*.06)+')';
      subtitle.style.opacity=s.subtitle;subtitle.style.transform='translateY('+((1-s.subtitle)*12)+'px)';kicker.style.opacity=s.title*.8;
      if(s.ready!==ready){ready=s.ready;button.textContent=ready?'Ver resultados':'Omitir escena';}
    }
    return {isActive:()=>active,start(){if(active)return;active=true;age=0;ready=false;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';layer.hidden=false;button.textContent='Omitir escena';surfaces().forEach(el=>el.inert=true);draw();button.focus({preventScroll:true});},update(dt){if(!active)return;age+=dt;draw();},finish};
  }
  const api={scene,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeVictory=api;
})(typeof window!=='undefined'?window:globalThis);
