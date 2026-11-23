(function(root){
  'use strict';
  const Scenes=root.ArcadeStoryScenes;if(!Scenes)return;
  const {FLOOR,lerp,ease,ramp,atlas,fill,shade,plate,cut,put,glow,smoke,shadow,vignette}=Scenes.tools,images=Scenes.images;
  const STREET=[920,FLOOR+12];
  const titan=()=>atlas('m8titan',4,4),boss=()=>atlas('m8boss',4,4),troops=()=>atlas('m8troops',4,4);
  // Coche patrulla (recorte de la hoja de tráfico) con su barra de luces.
  const PATROL=[1089,140,341,158];
  function patrol(c,x,y,w,t,flip=false){
    cut(c,images.f8traffic,PATROL,x,y-w*PATROL[3]/PATROL[2]/2,w,{flip});
    const red=Math.floor(t*5)%2;glow(c,x-w*.06,y-w*.4,70,'255,60,60',red?.8:.15);glow(c,x+w*.06,y-w*.4,70,'70,120,255',red?.15:.8);
  }
  Scenes.register('eight:finale',{f8traffic:'assets/sprites/nueva-york-trafico-v1.png'},{});
  Scenes.register('eight',{},{finale:[
    // 2 · Las esposas: el Comandante, de rodillas entre los restos; la policía llega.
    {id:'esposas',dur:4,draw(c,t,v){
      fill(c,v,'#5a3a78','#e0703a');plate(c,images.m8plaza,v,{ground:STREET,u:.28,zoom:1.2});shade(c,v,'rgba(24,12,30,.3)');
      put(c,titan(),15,v.cx+300,FLOOR+2,300);for(let i=0;i<3;i++)smoke(c,v.cx+220+i*80,FLOOR-60,t,i*3+2,1.2);
      patrol(c,v.cx-260,FLOOR+4,230,t);
      const x=v.cx+30;shadow(c,x,FLOOR,90,.6);put(c,boss(),15,x,FLOOR+2,128);
      const walk=ease(ramp(t,.15,1.9));
      for(const [side,from] of [[-1,-260],[1,260]]){const px=x+side*lerp(Math.abs(from),70,walk);shadow(c,px,FLOOR,60);put(c,troops(),walk<1?1+Math.floor(t*8)%2:0,px,FLOOR,122,{flip:side>0});}
      glow(c,x,FLOOR-60,200,'255,60,60',Math.floor(t*5)%2?.18:.05);glow(c,x,FLOOR-60,200,'70,120,255',Math.floor(t*5)%2?.05:.18);
      vignette(c,v,.65);
    }},
    {id:'senal',dur:4,draw(c,t,v){
      fill(c,v,'#36414d','#ba8663');plate(c,images.m8plaza,v,{ground:STREET,u:.28,zoom:1.2});
      put(c,titan(),15,v.cx+300,FLOOR+2,300);smoke(c,v.cx+230,FLOOR-64,t,3,1.1);
      const x=v.cx-100;patrol(c,x,FLOOR+4,260,t);
      glow(c,x+26,FLOOR-52,40,'120,225,233',.2+.15*Math.sin(t*6));
      vignette(c,v,.65);
    }}
  ]});
})(typeof window!=='undefined'?window:globalThis);
