(function(root){
  'use strict';
  const briefing=[
    {title:'La llamada del turno de noche',text:'A las dos de la mañana, Vega capta una llamada desde la lonja. Inés, mecánica del puerto, está encerrada con el turno de noche tras la compuerta del laboratorio. El agua ya les llega a las rodillas.\n\nAl otro lado del canal, las bombas siguen funcionando. Alguien ha invertido su marcha.'},
    {title:'La llave del dique',text:'El doctor Varela necesita agua del puerto para enfriar su suero. Ha puesto al Lobo Negro en el varadero y a un artillero junto al cuadro de las bombas.\n\nInés te guía por radio. Entras por el mercado con los puños vendados. Vega se queda en el aire para localizar a los que salgan.'},
    {title:'Centella Azul',text:'Antes del cierre, Inés probaba un traje de rescate capaz de cortar acero con la mirada. Varela lo requisó y lo guardó en el laboratorio, junto a la última dosis.\n\nSi la compuerta se atasca, ese traje es la única forma de sacar al turno de noche.',objectives:['Cruza el varadero del Lobo Negro','Despeja el dique para que Inés detenga las bombas','Vence a Varela y abre la salida del laboratorio']}
  ];
  const vega='VEGA · PILOTO',ines='INÉS · MECÁNICA',cap='CAP DOLLAR';
  const beats=[
    {id:'start',who:ines,text:'Cap, ¿me oyes? Golpeo la tubería tres veces. Si me escuchas por debajo de los pies, vas bien.',when:s=>s.wave===0},
    {id:'market',who:cap,text:'Tres golpes. Te oigo, Inés. Diles que suban a los bancos. Voy hacia el varadero.',when:s=>s.wave===2},
    {id:'wolf',who:vega,text:'Esa silueta junto a la garita… Es el Lobo Negro. Te ha visto.',when:s=>s.wave===5&&s.locked},
    {id:'canal',who:ines,text:'Ya veo tu sombra por la rejilla del canal. El interruptor está en el dique. El artillero lleva toda la noche de guardia.',when:s=>s.wave===6},
    {id:'gun',who:vega,text:'Cap, el artillero te sigue con el cañón. Cruza su línea de tiro entre ráfagas.',when:s=>s.wave===11&&s.locked},
    {id:'pumps',who:ines,text:'¡He cortado la corriente! El agua ha dejado de subir. Pero la compuerta está torcida. Necesitamos el Centella.',when:s=>s.wave===12},
    {id:'lab',who:cap,text:'Veo el traje dentro de la cámara. Varela acaba de romper el precinto del suero.',when:s=>s.wave===17&&s.locked},
    {id:'morph',who:ines,text:'¡Se lo ha inyectado! Sal de delante de esa cola, Cap.',when:s=>s.enemies.some(n=>n.morph>0||n.kind==='lizard')}
  ];
  const clamp=t=>Math.max(0,Math.min(1,t));
  function sprite(c,image,row,frame,x,floor,scale,face=1){
    c.save();c.translate(Math.round(x),Math.round(floor));c.scale(face*scale,scale);
    c.drawImage(image,Math.floor(frame)%12*120,row*98,120,98,-53,-91,120,98);c.restore();
  }
  function drawGait(c,pic,phase,weight,hit=0){
    const frame=Math.round(phase*32)%32,row=Math.round(clamp(weight)*8);
    root.ArcadeImpact.hitSprite(c,hit,pic,frame*96,row*90,96,90,-47,-86,96,90);
  }
  function walkCap(c,art,x,y,scale,travel,weight){
    c.save();c.translate(x,y);c.scale(scale,scale);
    drawGait(c,art.steps_fighter,travel/(72*scale),weight);c.restore();
  }
  function port(c,art,section,pan){
    const pic=art.port,h=Math.floor(pic.height/2),w=Math.floor(h*16/9);
    c.drawImage(pic,Math.round((pic.width-w)*clamp(pan)),section*h,w,h,0,0,960,540);
  }
  function lab(c,art,pan){
    const pic=art.city,w=Math.min(pic.width,pic.height*16/9),h=w*9/16;
    c.drawImage(pic,(pic.width-w)*clamp(pan),(pic.height-h)*.55,w,h,0,0,960,540);
  }
  // One level camera looking across the quay. Positions and sizes are in metres.
  const horizon=352,eyeHeight=1.8,focal=740;
  function project(x,height,depth){
    const ppm=focal/depth;
    return {x:480+x*ppm,y:horizon+(eyeHeight-height)*ppm,ppm};
  }
  function waterfront(c,art){
    const img=art.waterfront,scale=Math.max(960/img.width,540/img.height);
    const width=img.width*scale,height=img.height*scale;
    c.drawImage(img,Math.round((960-width)/2),Math.round((540-height)/2),width,height);
  }
  function helicopter(c,art,t,x,height,depth){
    const pos=project(x,height,depth);
    const [sx,sy,sw,sh,ax,ay]=root.HELICOPTER_FRAMES[Math.floor(t*14)%3];
    const scale=14*pos.ppm/500;
    c.save();c.globalAlpha=.9;
    c.drawImage(art.heli,sx,sy,sw,sh,Math.round(pos.x-ax*scale),Math.round(pos.y-ay*scale),sw*scale,sh*scale);c.restore();
  }
  function transmission(c,t,kicker,line){
    c.fillStyle='#0b151eea';c.fillRect(0,0,960,46);c.fillRect(0,463,960,77);
    c.textAlign='center';c.font='bold 15px Consolas, monospace';c.fillStyle='#f7bf68';c.fillText(kicker,480,29);
    c.fillStyle='#edf1e9';c.font='bold 20px Consolas, monospace';c.fillText(line,480,508,900);c.textAlign='left';
    const fade=clamp(1-t/.27);if(fade){c.fillStyle='rgba(8,14,20,'+fade+')';c.fillRect(0,0,960,540);}
  }
  function arrival(c,art,t){
    const walk=Math.min(t,3.7)*1.75;
    waterfront(c,art);
    helicopter(c,art,t,-35+t*9.2,24+.15*Math.sin(t),76+t*3);
    const foot=project(-6+walk,0,14);
    c.fillStyle='#1e172b70';c.beginPath();c.ellipse(foot.x,foot.y+1,foot.ppm*.38,foot.ppm*.075,0,0,Math.PI*2);c.fill();
    walkCap(c,art,foot.x,foot.y,1.76*foot.ppm/75,walk*foot.ppm,clamp((4-t)/.30));
    transmission(c,t,'ESPECIAL 01  /  DISTRITO QUIMERA','VEGA  ·  Te dejo en la lonja. Busca la entrada del varadero.');
  }
  function ending(c,art,t){
    if(t<4.5){
      lab(c,art,.85+clamp(t/4.5)*.14);
      c.save();c.translate(440,440);c.scale(-1.6,1.6);
      c.drawImage(art.actions,12*164,2*112,164,112,-82,-102,164,112);c.restore();
      const x=165+Math.min(2.6,t)*77;
      if(t<2.7)walkCap(c,art,x,446,1.4,x-165,clamp((2.7-t)/.13));
      else{
        c.save();c.globalAlpha=1-clamp((t-2.7)/1.2);
        sprite(c,art.fighter,12,t*8,x,446,1.4);c.restore();
      }
      if(t>2.7){const glow=clamp((t-2.7)/1.2);
        const aura=c.createRadialGradient(x,390,3,x,390,84);aura.addColorStop(0,'rgba(152,240,255,'+glow+')');aura.addColorStop(1,'transparent');
        c.fillStyle=aura;c.fillRect(x-84,306,168,168);c.save();c.globalAlpha=glow;sprite(c,art.hero,18,t*10,x,446,1.4);c.restore();}
      transmission(c,t,'LABORATORIO  /  SUERO NEUTRALIZADO','INÉS  ·  El traje responde a tus ojos. Apunta a la cerradura.');
    }else if(t<10){
      const a=t-4.5;
      if(a>=1.4&&a<4.15&&root.ArcadeStoryIllustrations?.draw(c,'quimera-outro',a-1.4,{w:960,h:540},2.6)){
        transmission(c,a,'COMPUERTA DE SERVICIO','INÉS  ·  ¡Está abierta! Primero los heridos. Yo cierro la marcha.');return;
      }
      lab(c,art,.95);const doorX=568,sill=431;
      c.drawImage(art.booth,doorX-126,sill-181,252,190);
      const lift=clamp((a-1.25)/1.45),height=Math.round(114*(1-lift));
      c.fillStyle='#515750';c.fillRect(doorX-91,sill-115,183,height);
      c.fillStyle='#28312f';for(let y=0;y<height;y+=7)c.fillRect(doorX-91,sill-115+y,183,2);
      sprite(c,art.hero,a<1.45?17:18,t*12,280,425,1.45);
      if(a>.22&&a<1.45){c.strokeStyle='#449dff';c.lineWidth=6;c.beginPath();c.moveTo(292,337);c.lineTo(doorX-77,398);c.stroke();c.lineWidth=2;c.strokeStyle='#dcffff';c.stroke();
        for(let i=0;i<8;i++){const f=(a*4+i*.14)%1;c.fillStyle='#ffd476';c.fillRect(doorX-77+Math.cos(i)*f*28,398+Math.sin(i)*f*26,3,3);}}
      for(let i=0;i<3;i++){
        const run=a-2.35-i*.45;if(run<0)continue;
        if(i===2&&root.ArcadeStorySprites?.draw(c,'ines',run,doorX+run*132,sill+Math.min(24,run*30)+i*5,90))continue;
        const [sx,sy,sw,sh,pivot,dir]=root.WORKER_RUN_FRAMES[Math.floor(run*12)%8];
        c.save();c.translate(doorX+run*132,sill+Math.min(24,run*30)+i*5);c.scale(dir,1);
        c.drawImage(art.workers,sx,sy,sw,sh,-pivot*.24,-sh*.24,sw*.24,sh*.24);c.restore();
      }
      transmission(c,a,'COMPUERTA DE SERVICIO','INÉS  ·  ¡Está abierta! Primero los heridos. Yo cierro la marcha.');
    }else{
      const a=t-10;
      waterfront(c,art);
      helicopter(c,art,t,8+a*10,25,82+a*4);
      const hero=project(-5+a*6,2+a*4.1,15+a*10);
      sprite(c,art.hero,16,t*14,hero.x,hero.y,1.76*hero.ppm/75);
      transmission(c,a,'RUMBO A NUEVA YORK','VEGA  ·  Turno completo a bordo. Centella, ¿puedes seguirme?');
    }
  }
  function mount(host,art){
    const scenes=root.ArcadeStoryScenes;
    const shots=[
      (c,t)=>{waterfront(c,art);helicopter(c,art,t,-75+(45+t*7.2)%150,19+.25*Math.sin(t),86);},
      (c,t)=>{port(c,art,1,.37+.035*Math.sin(t*.3));sprite(c,art.blackWolf,2,t*9,310,466,2);sprite(c,art.gunner,0,t*7,710,442,1.8,-1);},
      (c,t)=>{lab(c,art,.97);sprite(c,art.scientist,13,t*6,490,450,2,-1);c.save();c.globalAlpha=.6+.13*Math.sin(t*2);sprite(c,art.hero,18,t*9,712,395+Math.sin(t)*4,1.45);c.restore();}
    ];
    scenes.register('quimera',{},shots.map(draw=>(c,w,h,t)=>{c.save();c.scale(w/960,w/960);c.translate(0,-(540-h*960/w)*.60);draw(c,t);c.restore();}));
    return root.ArcadeMissionOneStory.mount(host,{briefing,beats,scenes:'quimera',eyebrow:'ESPECIAL 01 · DISTRITO QUIMERA',startLabel:'Entrar al muelle'});
  }
  root.ArcadeQuimeraStory={mount,arrival,ending,drawGait,arrivalTime:5.2,endingTime:14};
})(window);
