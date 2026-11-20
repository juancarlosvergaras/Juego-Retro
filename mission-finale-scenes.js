(function(root){
  'use strict';
  // Final de la campaña: ocho planos a pantalla completa que se reproducen al caer
  // el Titán de Acero (story-cinema.js; guion en mission-eight-story.js, finaleScript).
  // Las imágenes propias del final se piden al empezarlo (conjunto 'eight:finale'):
  // los primeros planos usan lo que la misión 08 ya cargó.
  // Escenario: 540 de alto, v.w de ancho; reglas en mission-one-scenes.js.
  const Scenes=root.ArcadeStoryScenes;if(!Scenes)return;
  const {TOP,FLOOR,BOTTOM,TAU,clamp,lerp,ease,ramp,drift,hash,atlas,fill,shade,plate,cut,put,frame,glow,beam,smoke,stars,shadow,boom,flash,vignette,hunter,heli,dust}=Scenes.tools,images=Scenes.images;
  const STREET=[920,FLOOR+12];
  const titan=()=>atlas('m8titan',4,4),boss=()=>atlas('m8boss',4,4),troops=()=>atlas('m8troops',4,4);
  // Coche patrulla (recorte de la hoja de tráfico) con su barra de luces.
  const PATROL=[1089,140,341,158];
  function patrol(c,x,y,w,t,flip=false){
    cut(c,images.f8traffic,PATROL,x,y-w*PATROL[3]/PATROL[2]/2,w,{flip});
    const red=Math.floor(t*5)%2;glow(c,x-w*.06,y-w*.4,70,'255,60,60',red?.8:.15);glow(c,x+w*.06,y-w*.4,70,'70,120,255',red?.15:.8);
  }
  // Fuegos artificiales por tiempo: cada ranura lanza un cohete, estalla y cae.
  const COLORS=['255,214,120','255,120,90','140,220,255','200,140,255','150,255,180','255,255,255'];
  function fireworks(c,v,t,slots=7,top=TOP+20,spread=1){
    for(let k=0;k<slots;k++){
      const period=2.1+hash(k*3)*1.2,clock=(t+hash(k)*period)/period,n=Math.floor(clock),u=clock-n,seed=n*17+k*5;
      const x=v.cx+(hash(seed)-.5)*v.w*.9*spread,y=top+hash(seed+1)*150,rgb=COLORS[Math.floor(hash(seed+2)*COLORS.length)];
      if(u<.22){const r=u/.22;c.fillStyle='rgba(255,230,180,.9)';for(let i=0;i<5;i++)c.fillRect(Math.round(x+(1-r)*(hash(seed+3)-.5)*40),Math.round(lerp(BOTTOM,y,r)+i*7),3,5);continue;}
      const e=(u-.22)/.78,radius=ease(Math.min(1,e*1.6))*(90+hash(seed+4)*80),fade=1-e;
      if(e<.12)glow(c,x,y,radius*2.2,rgb,.5*(1-e/.12));
      c.fillStyle='rgba('+rgb+','+fade.toFixed(3)+')';
      for(let i=0;i<44;i++){const a=TAU*i/44+hash(seed+i)*.12,d=radius*(.7+hash(seed+i*3)*.3);c.fillRect(Math.round(x+Math.cos(a)*d),Math.round(y+Math.sin(a)*d+e*e*60),3,3);}
      glow(c,x,y+e*30,radius*.8,rgb,.12*fade);
    }
  }
  function sunrise(c,v,t,y,alpha=1){
    const g=c.createLinearGradient(0,0,0,v.h);g.addColorStop(0,'rgba(60,70,140,'+(.35*alpha)+')');g.addColorStop(.6,'rgba(255,170,90,'+(.3*alpha)+')');g.addColorStop(1,'rgba(255,210,150,'+(.25*alpha)+')');c.fillStyle=g;c.fillRect(0,0,v.w,v.h);
    glow(c,v.cx,y,v.w*.45,'255,200,120',.55*alpha);glow(c,v.cx,y,110,'255,240,200',.9*alpha);
  }
  function debris(c,x,y,t,seed=0,count=26){
    for(let i=0;i<count;i++){const life=(t*.9+hash(seed+i))%1,a=-Math.PI*(.15+hash(seed+i*3)*.7),speed=180+hash(seed+i*5)*240;
      c.fillStyle=i%3?'#3a3a40':'#ffb04a';c.globalAlpha=1-life;c.fillRect(Math.round(x+Math.cos(a)*speed*life),Math.round(y+Math.sin(a)*speed*life+340*life*life),4,4);}
    c.globalAlpha=1;
  }
  function briefcase(c,x,y,size,t,open=0){
    const w=size,h=size*.7;c.fillStyle='#8f9aa4';c.fillRect(Math.round(x-w/2),Math.round(y-h),Math.round(w),Math.round(h));
    c.fillStyle='#c9d2d8';c.fillRect(Math.round(x-w/2),Math.round(y-h),Math.round(w),4);c.fillStyle='#5b646c';c.fillRect(Math.round(x-w/2),Math.round(y-h*.55),Math.round(w),3);
    c.strokeStyle='#5b646c';c.lineWidth=4;c.beginPath();c.moveTo(x-w*.18,y-h);c.lineTo(x-w*.18,y-h-10);c.lineTo(x+w*.18,y-h-10);c.lineTo(x+w*.18,y-h);c.stroke();
    if(open>0){c.fillStyle='rgba(120,200,110,'+open+')';c.fillRect(Math.round(x-w*.42),Math.round(y-h-h*.5*open),Math.round(w*.84),Math.round(h*.5*open));glow(c,x,y-h,w*1.4,'255,230,150',.5*open);}
    const glint=(t*.7)%1;if(glint<.18)glow(c,x-w*.3+glint/.18*w*.6,y-h*.8,26,'255,255,255',.9);
  }
  // Jefes vencidos (por misión) y formas ganadas, con su hoja y su cuadro.
  const BOSSES=[[1,'EL CAPATAZ','f8wolfWalk',4,2,0,130],[2,'EL REY DEL MAUSOLEO','f8king',6,5,0,130],[3,'EL CENTINELA','f8mecha',4,3,0,140],[4,'EL DEVORADOR DE ASFALTO','f8rig',2,3,0,92],
    [5,'EL CAPITÁN DEL ABISMO','f8captain',8,6,0,124],[6,'EL COLOSO','f8giant',8,5,0,140],[7,'EL SOBERANO DEL VACÍO','f8sovereign',4,4,5,140],[8,'EL TITÁN DE ACERO','m8titan',4,4,0,140]];
  const FORMS=[['hunter','EL CAZADOR'],['wolf','LOBO','f8forms',6,3,11],['zombie','ZOMBI ELÉCTRICO','f8forms',6,3,4],['robot','ROBOT DE COMBATE','f8robot',6,4,0],['tank','MINI TANQUE','f8tank',4,3,0],['fighter','LUCHADOR','f8fighter',4,6,0],['hero','CENTELLA','f8hero',12,19,0]];
  function label(c,x,y,text,rgb='255,214,120'){c.font='bold 13px Consolas, monospace';c.textAlign='center';c.fillStyle='rgba(5,8,13,.75)';const w=c.measureText(text).width+16;c.fillRect(Math.round(x-w/2),Math.round(y-12),Math.round(w),20);c.fillStyle='rgb('+rgb+')';c.fillText(text,x,y+3);c.textAlign='left';}
  function parade(c,v,t,data){
    const done=data?.campaign?.completed,forms=data?.campaign?.forms;
    const bosses=BOSSES.filter(([n])=>!done||n===8||done.includes(n)),owned=FORMS.filter(([id])=>id==='hunter'||!forms||forms[id]);
    const row=(list,y,gap,speed,draw)=>{const span=Math.max(v.w+gap,list.length*gap);list.forEach((item,i)=>{const x=((i*gap-t*speed)%span+span)%span-gap/2;if(x<-gap||x>v.w+gap)return;draw(item,x,y);});};
    row(bosses,262,260,62,([n,name,id,cols,rows,f,size],x,y)=>{glow(c,x,y-size*.5,size*.9,'255,190,110',.18);shadow(c,x,y,size*1.1,.5);put(c,atlas(id,cols,rows),f,x,y,size);label(c,x,y+20,'0'+n+' · '+name);});
    row(owned,404,190,-48,([id,name,sheet,cols,rows,f],x,y)=>{glow(c,x,y-60,90,'140,220,255',.15);shadow(c,x,y,70,.5);if(id==='hunter')hunter(c,x,y,104,t,'salute');else put(c,atlas(sheet,cols,rows),f,x,y,104);label(c,x,y+14,name,'170,230,255');});
  }

  Scenes.register('eight:finale',{f8traffic:'assets/sprites/nueva-york-trafico-v1.png',f8civilians:'assets/sprites/civiles-huyendo-v2.png',f8wolf:'assets/sprites/soldado-lobo-v1.png',
    f8wolfWalk:'assets/sprites/lobo-caminata-v2.png',f8king:'assets/sprites/rey-zombi-v3.png',f8mecha:'assets/sprites/mecha-aereo-v1.png',f8rig:'assets/sprites/jefe-convoy-v3.png',f8captain:'assets/sprites/capitan-abismo-combate.webp',
    f8giant:'assets/sprites/coloso-exterior.webp',f8sovereign:'assets/sprites/soberano-horror-v2.png',f8forms:'assets/sprites/transformaciones-jugador-v3.png',f8robot:'assets/sprites/robot-soldado-v2.png',f8tank:'assets/sprites/mini-tanque-salto-v1.png',
    f8fighter:'assets/sprites/luchador-soldado-v3.png',f8hero:'assets/sprites/quimera-hero.png'},{});

  Scenes.register('eight',{},{finale:[
    // 1 · El desplome: el Titán pierde placas, estalla y cae en mitad de la plaza.
    {id:'desplome',dur:6,still:5,draw(c,t,v){
      const quake=t<4.6?(t>3?6:2.5):0;c.translate((hash(Math.floor(t*30))-.5)*quake,(hash(Math.floor(t*30)+7)-.5)*quake);
      fill(c,v,'#5a3a78','#e0703a');plate(c,images.m8plaza,v,{ground:STREET,u:.5,zoom:1.12});shade(c,v,'rgba(30,10,30,.25)');
      const x=v.cx+40,f=t<1.4?12:t<2.8?13:t<4?14:15;
      shadow(c,x,FLOOR,380,.6);put(c,titan(),f,x,FLOOR+4,340);
      for(let k=0;k<6;k++){const at=.3+k*.62;if(t>at)boom(c,x+(hash(k*5)-.5)*300,FLOOR-80-hash(k*9)*220,170+hash(k)*90,(t-at)/1.1);}
      if(t>3.2)debris(c,x,FLOOR-140,t,3);if(t>3.9)for(let i=0;i<4;i++)smoke(c,x-150+i*100,FLOOR-40,t,i*7,1.6);
      flash(c,v,t>3.8&&t<4.4?(1-(t-3.8)/.6)*.7:0,'255,230,190');
      vignette(c,v,.65);
    }},
    // 2 · Las esposas: el Comandante, de rodillas entre los restos; la policía llega.
    {id:'esposas',dur:6.3,draw(c,t,v){
      fill(c,v,'#5a3a78','#e0703a');plate(c,images.m8plaza,v,{ground:STREET,u:.28,zoom:1.2});shade(c,v,'rgba(24,12,30,.3)');
      put(c,titan(),15,v.cx+300,FLOOR+2,300);for(let i=0;i<3;i++)smoke(c,v.cx+220+i*80,FLOOR-60,t,i*3+2,1.2);
      patrol(c,v.cx-260,FLOOR+4,230,t);
      const x=v.cx+30;shadow(c,x,FLOOR,90,.6);put(c,boss(),15,x,FLOOR+2,128);
      const walk=ease(ramp(t,.3,3));
      for(const [side,from] of [[-1,-260],[1,260]]){const px=x+side*lerp(Math.abs(from),70,walk);shadow(c,px,FLOOR,60);put(c,troops(),walk<1?1+Math.floor(t*8)%2:0,px,FLOOR,122,{flip:side>0});}
      glow(c,x,FLOOR-60,200,'255,60,60',Math.floor(t*5)%2?.18:.05);glow(c,x,FLOOR-60,200,'70,120,255',Math.floor(t*5)%2?.05:.18);
      hunter(c,v.cx+190,FLOOR,118,t,'idle',true);
      vignette(c,v,.65);
    }},
    // 3 · El amanecer: el sol sale sobre Manhattan y la gente vuelve a la calle.
    {id:'amanecer',dur:6,draw(c,t,v){
      const tilt=ease(ramp(t,0,5.5));fill(c,v,'#3e5a9a','#f0b070');
      plate(c,images.m8city,v,{ground:[920,lerp(FLOOR+260,FLOOR+12,tilt)],u:.5,zoom:1.05});
      sunrise(c,v,t,lerp(200,150,tilt)+tilt*40,1);
      const crowd=atlas('f8civilians',6,4);
      for(let i=0;i<6;i++){const dir=i%2?1:-1,x=v.cx+dir*(80+i*60)+dir*t*22*(1+i%3);put(c,crowd,(i%4)*6+Math.floor(t*6+i)%6,x,FLOOR+(i%3)*4,96,{flip:dir<0,alpha:tilt});}
      for(let i=0;i<5;i++){const x=v.w*(.1+i*.2);beam(c,x,0,Math.PI+.25-i*.12,v.h*1.2,40,'255,220,170',.08*tilt);}
      vignette(c,v,.55);
    }},
    // 4 · El aterrizaje: Vega baja entre los restos con el maletín de la recompensa.
    {id:'aterrizaje',dur:8,draw(c,t,v){
      fill(c,v,'#6a5a9a','#f0b070');plate(c,images.m8plaza,v,{ground:STREET,u:.7,zoom:1.15});sunrise(c,v,t,120,.6);
      put(c,titan(),15,v.cx-290,FLOOR+2,260);smoke(c,v.cx-290,FLOOR-40,t,4,1.1);
      const land=ease(ramp(t,0,3.6)),hx=v.cx+30,hy=lerp(-60,FLOOR-38,land)+(land<1?Math.sin(t*2)*4:0);
      if(land>.4){dust(c,hx-80,FLOOR,t,1,1.8,-1);dust(c,hx+80,FLOOR,t,2,1.8,1);}
      shadow(c,hx,FLOOR,lerp(200,460,land),.45*land);heli(c,hx,hy,520,t,{flip:true,tilt:(1-land)*.06});
      if(t>=3.8)briefcase(c,hx-40,FLOOR,58,t);
      const walk=ease(ramp(t,3.8,7)),x=lerp(v.cx+v.w*.5+40,hx+40,walk);shadow(c,x,FLOOR,64);hunter(c,x,FLOOR,118,t,walk<1&&walk>0?'walk':'idle',true);
      vignette(c,v,.6);
    }},
    // 5 · El lobo: frente al sol, el cazador deja salir lo que lleva dentro y no lo esconde.
    {id:'lobo',dur:9,still:8,draw(c,t,v){
      fill(c,v,'#2a2a5a','#f0a060');plate(c,images.m8midtown,v,{ground:STREET,u:.5,zoom:1.2});sunrise(c,v,t,170+Math.max(0,4-t)*10,.9);
      shade(c,v,'rgba(20,12,30,.38)');
      const x=v.cx,F=root.ACTION_FRAMES?.wolf?.[0],wolf=atlas('f8wolf',8,7),step=clamp(Math.floor(ramp(t,3,6)*8),0,7);
      if(wolf&&F){shadow(c,x,FLOOR,160,.6);frame(c,wolf.image,F[step],x,FLOOR,1.62);if(step>=7)glow(c,x+16,FLOOR-152,28,'255,214,90',.35+.2*Math.sin(t*3));}
      else hunter(c,x,FLOOR,180,t,'idle');
      for(let i=0;i<30;i++){const u=(t*.22+hash(i))%1;c.fillStyle='rgba(255,230,190,'+(.5*(1-u)).toFixed(3)+')';c.fillRect(Math.round(x+(hash(i+9)-.5)*600),Math.round(FLOOR-u*360),3,3);}
      vignette(c,v,.7);
    }},
    // 6 · La cacería: los jefes vencidos y las formas ganadas desfilan bajo una luz dorada.
    {id:'caceria',dur:9,draw(c,t,v){
      fill(c,v,'#0b0f1c','#1b1424');
      for(let i=0;i<6;i++)beam(c,v.w*(.1+i*.16),v.h,Math.sin(t*.4+i)*.35,v.h*1.3,50,'255,200,130',.1);
      c.fillStyle='#22180f';c.fillRect(0,262,v.w,6);c.fillRect(0,404,v.w,6);
      parade(c,v,t,v.data);
      vignette(c,v,.75);
    }},
    // 7 · Fuegos y luz: el skyline encendido y el título del juego.
    {id:'fuegos',dur:6,still:4,draw(c,t,v){
      fill(c,v,'#070a1c','#2a1a3a');stars(c,v,t,50,v.h*.5);
      fireworks(c,v,t,8);
      c.save();c.globalAlpha=.9;plate(c,images.m8city,v,{ground:[920,FLOOR+120],u:.5,zoom:1});c.restore();
      shade(c,v,'rgba(6,8,24,.55)');
      for(let i=0;i<60;i++){if(hash(i+5)>.6)continue;c.fillStyle=Math.floor(t*.7+i)%9?'#ffd98a':'#7a6a4a';c.fillRect(Math.round(v.w*hash(i)),Math.round(250+hash(i+9)*170),4,5);}
      fireworks(c,v,t+.7,4,TOP+60,1.1);
      vignette(c,v,.6);
    }},
    // 8 · Créditos: los fuegos siguen, más tranquilos, mientras el helicóptero se aleja.
    {id:'creditos',dur:14,still:3,draw(c,t,v){
      fill(c,v,'#05071a','#1a1030');stars(c,v,t,70,v.h*.6);fireworks(c,v,t,4,TOP+30,1.2);
      c.save();c.globalAlpha=.6;plate(c,images.m8city,v,{ground:[920,FLOOR+150],u:.5,zoom:.95});c.restore();shade(c,v,'rgba(4,6,20,.6)');
      heli(c,v.cx-v.w*.6+t*v.w*.09,180+Math.sin(t*1.2)*6,120,t,{alpha:.8});
    }}
  ]});
})(typeof window!=='undefined'?window:globalThis);
