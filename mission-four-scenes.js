(function(root){
  'use strict';
  // Planos de la misión 04 (intro y epílogo a pantalla completa), compuestos con el
  // arte de la carretera: el convoy que huye, la moto del cazador y el Devorador.
  // Escenario: 540 de alto y v.w de ancho; ver las reglas en mission-one-scenes.js.
  const Scenes=root.ArcadeStoryScenes;if(!Scenes)return;
  const {FLOOR,TOP,clamp,lerp,ease,ramp,drift,hash,atlas,fill,shade,strip,put,fx,glow,beam,smoke,dust,shadow,boom,vignette,hunter,heli,stars}=Scenes.tools,images=Scenes.images;
  // Autopista al atardecer: la franja del cielo corre despacio y la calzada deprisa.
  // La línea del horizonte queda en HORIZON; los carriles, en LANE[0] (lejos) y LANE[1] (cerca).
  const HORIZON=250,LANE=[352,414],SKY=[0,0,2172,345],ROAD=[0,345,2172,379];
  function highway(c,v,t,speed,tint){
    fill(c,v,'#d98548','#2a2230');
    strip(c,images.road,v,SKY,0,HORIZON+2,t*speed*.03);
    strip(c,images.road,v,ROAD,HORIZON,v.h-HORIZON+40,t*speed);
    if(tint)shade(c,v,tint);
  }
  const riders=()=>atlas('riders',4,3),rig=()=>atlas('rig',2,3);
  // Líneas de velocidad sobre la calzada.
  function speedLines(c,v,t,alpha=.22){c.fillStyle='#ffe9c2';for(let i=0;i<14;i++){const u=(t*1.5+hash(i)*3)%1;c.globalAlpha=alpha*(1-u);c.fillRect(Math.round(v.w-u*(v.w+200)),HORIZON+30+((i*41)%200),120,2);}c.globalAlpha=1;}
  // Hoja de papel con un mapa a mano: los dos destinos que nombran los papeles del convoy.
  function map(c,v,t){
    const x=v.cx,y=250,w=640,h=330;
    c.save();c.translate(x,y);c.rotate(-.03);
    if(root.ArcadeStorySprites?.draw(c,'ruta',t,0,171,325)){
      const labels=[['PUERTO',-98,65],['CENTRO COMERCIAL',59,-27]];
      labels.forEach(([label,mx,my],i)=>{const show=ease(ramp(t,.4+i*1.4,1.2+i*1.4));if(!show)return;
        c.save();c.globalAlpha=show;c.fillStyle='#291f1a';c.font='bold 14px monospace';
        const width=c.measureText(label).width+12;c.fillRect(mx-width/2,my,width,23);c.fillStyle='#ffe9bb';c.textAlign='center';c.fillText(label,mx,my+16);c.restore();});
      c.restore();return;
    }
    c.fillStyle='#d9ccaa';c.fillRect(-w/2,-h/2,w,h);c.fillStyle='#c4b48e';for(let i=0;i<8;i++)c.fillRect(-w/2,-h/2+i*h/8,w,1);
    c.strokeStyle='#5a4a32';c.lineWidth=3;c.beginPath();c.moveTo(-w/2+30,h/2-40);c.bezierCurveTo(-120,40,40,-10,w/2-70,-h/2+60);c.stroke();
    // Costa a la izquierda, con su puerto; la ciudad a la derecha, con el centro comercial.
    c.fillStyle='#7d9cae';c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(-w/2+150,-h/2);c.bezierCurveTo(-w/2+120,-40,-w/2+170,40,-w/2+110,h/2);c.lineTo(-w/2,h/2);c.fill();
    const show=k=>ease(ramp(t,1+k*1.4,1.8+k*1.4));
    const mark=(mx,my,label,k)=>{const s=show(k);if(s<=0)return;c.strokeStyle='rgba(176,32,24,'+s+')';c.lineWidth=5;c.beginPath();c.arc(mx,my,30+(1-s)*30,0,Math.PI*2*s);c.stroke();
      c.fillStyle='rgba(70,40,20,'+s+')';c.font='bold 20px Consolas, monospace';c.textAlign='center';c.fillText(label,mx,my+58);c.textAlign='left';};
    c.fillStyle='#3b3226';c.fillRect(-w/2+122,-26,26,10);c.fillRect(-w/2+130,-34,8,8);
    for(let i=0;i<5;i++)c.fillRect(w/2-210+i*26,-h/2+70-(i%3)*14,18,46+(i%3)*14);
    mark(-w/2+135,-22,'PUERTO',0);mark(w/2-150,-h/2+90,'CENTRO COMERCIAL',1);
    c.fillStyle='#4a3b28';c.font='bold 14px Consolas, monospace';c.fillText('CONSORCIO · RUTA DE EVACUACIÓN',-w/2+24,-h/2+28);
    c.restore();
    // Luz de una linterna sobre el papel.
    const lx=x+Math.sin(t*.6)*120,ly=y+Math.cos(t*.45)*40,dark=c.createRadialGradient(lx,ly,80,lx,ly,420);
    dark.addColorStop(0,'rgba(6,5,8,0)');dark.addColorStop(1,'rgba(6,5,8,.9)');c.fillStyle=dark;c.fillRect(0,0,v.w,v.h);
  }

  Scenes.register('four',{road:'assets/worlds/mission-04/carretera-atardecer-v1.png',riders:'assets/sprites/motos-carretera-v3.webp',rig:'assets/sprites/jefe-convoy-v3.png',tank:'assets/sprites/mini-tanque-salto-v1.png'},{
    intro:[
      // 1 · La huida: el convoy se aleja por la autopista, visto desde lejos.
      {id:'huida',dur:8,draw(c,t,v){
        highway(c,v,t,260);
        for(let i=0;i<3;i++)smoke(c,v.w*(.12+i*.36),HORIZON-6,t,i*4,.7,'#4b3f41');
        const drift4=Math.sin(t*.5)*12,rx=v.cx+120+drift4;
        shadow(c,rx,LANE[0],300);dust(c,rx-150,LANE[0],t,3,1.6);put(c,rig(),Math.floor(t*3)%7===0?1:0,rx,LANE[0]+Math.sin(t*15),190);
        shadow(c,v.cx-230-drift4*.6,LANE[1],110);dust(c,v.cx-280,LANE[1],t,9);put(c,riders(),9,v.cx-230-drift4*.6,LANE[1]+Math.sin(t*19),112);
        shadow(c,v.cx+300+drift4*.4,LANE[1]-8,80);put(c,riders(),8,v.cx+300+drift4*.4,LANE[1]-8+Math.sin(t*21),96);
        shade(c,v,'rgba(255,120,60,.08)');vignette(c,v,.6);
      }},
      // 2 · El convoy de cerca: la cámara corre junto al camión blindado.
      {id:'convoy',dur:8,draw(c,t,v){
        highway(c,v,t,520,'rgba(20,14,34,.12)');speedLines(c,v,t);
        const rx=v.cx+lerp(260,60,drift(t,v.dur))+Math.sin(t*.7)*8,y=LANE[1]+14;
        shadow(c,rx,y,640,.55);dust(c,rx-320,y,t,2,2.4);put(c,rig(),Math.floor(t*2.4)%5===0?1:0,rx,y+Math.sin(t*14)*1.5,280);
        glow(c,rx-30,y-210,120,'255,170,70',.45+.15*Math.sin(t*5));
        put(c,riders(),8,rx-470+Math.sin(t*.9)*20,LANE[0]+Math.sin(t*20),92);
        vignette(c,v,.6);
      }},
      // 3 · La persecución: Vega suelta al cazador en la autopista y la moto arranca.
      {id:'persecucion',dur:7.5,draw(c,t,v){
        highway(c,v,t,620,'rgba(20,14,34,.18)');speedLines(c,v,t,.3);
        const lift=ramp(t,1.6,5),hx=v.cx-120+t*60,hy=lerp(160,-40,ease(lift))+Math.sin(t*1.6)*4;
        heli(c,hx,hy,360,t,{tilt:-.06-lift*.1});
        const enter=ease(ramp(t,.2,2.6)),x=lerp(-140,v.cx-160,enter)+Math.sin(t*.9)*8,y=LANE[1]+6;
        beam(c,x+70,y-58,Math.PI/2-.06,420,70,'255,236,180',.32);
        shadow(c,x,y,190);dust(c,x-80,y,t,5,1.5);put(c,riders(),enter<1?1:Math.floor(t*.5)%4===3?2:0,x,y+Math.sin(t*23),150);
        for(let i=0;i<3;i++){c.fillStyle=Math.floor(t*6+i)%5?'#ff5a44':'#ffb08a';const tx=v.cx+330+i*30+Math.sin(t+i)*4;c.fillRect(Math.round(tx),LANE[0]-30-i*8,5,4);glow(c,tx,LANE[0]-30-i*8,18,'255,90,60',.4);}
        vignette(c,v,.6);
      }},
      // 4 · El Devorador de Asfalto: el camión que cierra el convoy, a la caída de la noche.
      {id:'devorador',dur:7.5,draw(c,t,v){
        highway(c,v,t,380,'rgba(12,8,24,.55)');stars(c,v,t,30,HORIZON-60);
        const rx=v.cx+60+Math.sin(t*.6)*10,y=LANE[1]+20,fire=Math.floor(t*2)%3===0,k=lerp(330,370,drift(t,v.dur));
        shadow(c,rx,y,k*2.3,.6);dust(c,rx-k*1.1,y,t,2,2.6);put(c,rig(),fire?1:0,rx,y+Math.sin(t*13)*1.5,k);
        glow(c,rx-30,y-k*.62,k*.5,'255,170,70',.6+.2*Math.sin(t*5));
        if(fire)for(const dx of [-.62,.12])glow(c,rx+k*dx,y-k*.82,70,'255,220,150',.8);
        for(let i=0;i<4;i++)fx(c,3,t*10+i,rx-k*.5+i*k*.3,y-k*.72-(i%2)*24,26,38,.6);
        vignette(c,v,.75);
      }}
    ],
    outro:[
      // 1 · El botín: los restos humean y de ellos sale el prototipo, ya del cazador.
      {id:'botin',dur:8,draw(c,t,v){
        highway(c,v,t,0,'rgba(30,14,30,.3)');
        const wx=v.cx+170,y=LANE[1]+10;
        put(c,rig(),5,wx,y,250);for(let i=0;i<4;i++){fx(c,3,t*9+i,wx-170+i*110,y-60-(i%2)*30,52,72,.9);smoke(c,wx-150+i*100,y-90,t,i*5+1,1.2);}
        const roll=ease(ramp(t,.8,4.2)),tx=lerp(wx-60,v.cx-120,roll),tank=atlas('tank',4,3);
        shadow(c,tx,y,150);put(c,tank,roll<1?4+Math.floor(t*8)%4:0,tx,y+2,118);
        shadow(c,v.cx-290,y,64);hunter(c,v.cx-290,y,112,t,'idle');
        vignette(c,v,.65);
      }},
      // 2 · Los papeles: el mapa del convoy, con dos destinos marcados.
      {id:'papeles',dur:8,draw(c,t,v){fill(c,v,'#1a120c','#0a0806');map(c,v,t);}}
    ]
  });
})(typeof window!=='undefined'?window:globalThis);
