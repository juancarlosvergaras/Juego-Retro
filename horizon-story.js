(function(root){
  'use strict';
  const sequences={
    9:{
      intro:[
        ['signal','Desde una torre petrolera, el contramaestre ha cerrado las esclusas del delta. El convoy de Vega queda atrapado río abajo.'],
        ['patrol','Dos patrulleras salen del muelle. Otra corta por el canal de popa. «Cap, te están encerrando».'],
        ['launch','Cap carga los torpedos y suelta amarras. «Cúbreme hasta la torre. El mando de las compuertas está en la cima».']
      ],
      ending:[
        ['control','Desde la grúa, Cap ve las luces del convoy. Aparta la llave del contramaestre y tira de la palanca de desvío.'],
        ['release','Las compuertas se levantan. El agua arrastra las minas y el convoy pasa entre dos paredes de espuma.'],
        ['scramble','Entre las transmisiones queda una activa. El Cénit sigue en el aire. Vega abre el hangar de la presa. «Esta vez te cubro yo».']
      ]
    },
    10:{
      intro:[
        ['hangar','El convoy está a salvo. Sobre las islas, la fortaleza Cénit prepara una segunda orden de cierre.'],
        ['formation','Vega atrae a la primera escolta. Cap vuela bajo sobre los radares costeros, con la caldera en la proa.'],
        ['vector','«Cuando crucemos la cresta, rompe la formación. El núcleo de mando está bajo la cola».']
      ],
      ending:[
        ['rupture','El Cénit pierde sustentación. Cae al mar, lejos del convoy.'],
        ['escape','La onda alcanza el ala de Cap. Vega entra por su izquierda y lo guía entre los restos hasta el amanecer.'],
        ['home','El convoy saluda desde la presa. Cap y Vega toman tierra juntos.'],
        ['credits','']
      ]
    }
  };
  function scene(id,images){
    return {id,dur:id==='credits'?10:4.4,
      sounds:({release:[[.8,'splash',.65],[1.2,'explosion',.36]],rupture:[[.6,'explosion',.65],[1.3,'explosion',.72],[2.1,'titanBlast',.86]],launch:[[1,'splash',.5]],scramble:[[1.3,'distant',.3]]})[id],
      draw(c,t,v){
        const {w,h}=v,u=Math.min(1,t/4.6),ease=u*u*(3-2*u);
        const river=['signal','patrol','launch','arrival','release','scramble','home','credits'].includes(id);
        const ground=id==='control'?images.rigBackdrop:river?images.delta:id==='formation'?images.terrain:images.sky;
        const scale=Math.max(w/ground.width,h/ground.height)*(1.06+.045*ease);
        const gw=ground.width*scale,gh=ground.height*scale;
        if(id==='control'){
          const sw=ground.width*(.35-.025*ease),sh=sw*h/w;
          c.drawImage(ground,ground.width*(.312+.016*ease),ground.height*.23-sh*.70,sw,sh,0,0,w,h);
        }else c.drawImage(ground,(w-gw)*(.5+.26*ease),(h-gh)*.52,gw,gh);
        function vehicle(index,x,y,width,tilt=0,flip=index<2){
          const height=width*352/512;
          c.save();c.translate(x,y);c.rotate(tilt);c.scale(flip?-1:1,1);
          c.drawImage(images.portraits,index%2*512,Math.floor(index/2)*352,512,352,-width/2,-height/2,width,height);c.restore();
        }
        function watercraft(enemy,x,depth,size,heading=1){
          const horizon=(h-gh)*.52+gh*.60;
          const waterBottom=h*.785;
          const y=horizon+(waterBottom-horizon)*depth+Math.sin(t*3+depth)*h*.002;
          const width=w*size,height=width*(enemy?.60:.57);
          const image=enemy?images.patrol:images.hull;
          if(!image)return;
          const sx=enemy&&heading>0?180:0,sw=enemy?180:image.width,sh=enemy?220:image.height;
          c.save();c.translate(x,y);
          c.fillStyle='rgba(21,69,71,.46)';c.beginPath();c.ellipse(0,0,width*.46,height*.09,0,0,Math.PI*2);c.fill();
          for(const side of [-1,1]){
            c.beginPath();c.moveTo(side*width*.32,0);c.quadraticCurveTo(side*width*.48,heading*height*.12,side*width*.73,heading*height*.27);
            c.quadraticCurveTo(side*width*.43,heading*height*.19,side*width*.29,1);
            c.fillStyle='rgba(208,239,221,.72)';c.fill();
          }
          // Sink the keel into the water. Its reflection and bow wave share the contact line.
          c.save();c.beginPath();c.rect(-width*.6,-height,width*1.2,height);c.clip();
          c.drawImage(image,sx,0,sw,sh,-width/2,-height*.81,width,height);c.restore();
          for(let j=0;j<7;j++){
            const offset=j/7,d=width*(.10+.17*offset),y=height*(.012+.16*offset);
            c.globalAlpha=(1-offset)*.24;
            c.drawImage(image,sx+sw*.34,sh*(.74-.06*offset),sw*.32,2,-d,y,d*2,height*.018+1);
          }
          c.globalAlpha=1;c.lineWidth=Math.max(1,width*.014);
          for(const side of [-1,1]){
            c.beginPath();c.moveTo(0,1);c.quadraticCurveTo(side*width*.24,height*.016,side*width*.41,-height*.09);
            c.strokeStyle='rgba(217,245,220,.90)';c.stroke();
            for(let j=0;j<8;j++){
              const drift=(t*1.4+j*.127)%1;
              c.fillStyle='rgba(224,245,226,'+(.62*(1-drift))+')';
              c.fillRect(side*width*(.22+.37*drift),-height*(.015+.18*drift)+Math.sin(j*4)*height*.025,width*.035,height*.018+1);
            }
          }
          if(!enemy&&images.exhaust)root.ArcadeHorizonRenderer.exhaust(c,images.exhaust,-width/2,-height*.81,width,height,t,.36);
          c.restore();
        }
        function sparks(x,y,r,k,water=false){
          for(let i=0;i<45;i++){
            const phase=(k+i*.037)%1,a=i*2.3999;
            const dx=Math.cos(a)*phase*r,dy=-Math.abs(Math.sin(a))*phase*r+phase*phase*r*.6;
            c.fillStyle=water?(i%3?'#c9f2dd':'#5eafb1'):(i%3?'#ef9852':'#fff1a7');
            c.globalAlpha=1-phase;c.fillRect(x+dx,y+dy,2+(1-phase)*7,2+(1-phase)*5);
          }c.globalAlpha=1;
        }
        const bob=Math.sin(t*3.5)*h*.006;
        if(id==='patrol'||id==='arrival'||id==='launch'){
          if(id==='patrol'){
            watercraft(true,w*(.66-.055*ease),.22+.12*ease,.095+.035*ease,-1);
            watercraft(true,w*(.30+.11*ease),.39+.23*ease,.155+.065*ease,-1);
          }else watercraft(false,w*(.34+.12*ease),.66-.32*ease,.21-.075*ease);
        }else if(id==='control'){
          // Establish the working deck while the illustrated close-up is decoding.
          sparks(w*.68,h*.48,w*.035,t*.43);
        }else if(id==='release'){
          watercraft(false,w*(.37+.25*ease),.62-.19*ease,.18-.04*ease);
        }else if(id==='signal'||id==='home'||id==='credits'){
          if(images.hull)watercraft(false,w*(.42+.12*ease),.52-.12*ease,.16-.03*ease);
          else vehicle(0,w*(.42+.18*ease),h*.71+bob,w*.21);
          if(id!=='signal'){vehicle(2,w*(.24+.67*ease),h*(.4-.21*ease),w*.14,-.16);
            for(let j=0;j<6;j++){c.fillStyle=Math.sin(t*4+j)>0?'#fff0a8':'#7fb5af';c.fillRect(w*(.24+j*.086),h*(.67+.011*Math.sin(j)),4,3);}}
        }else if(id==='formation'){
          for(let j=-1;j<=1;j++)vehicle(2,w*(.5+j*.25),h*(.55+.1*Math.abs(j)-.12*ease),w*(j===0?.31:.19),-.15);
        }else{
          if(id==='vector')vehicle(3,w*.64,h*.32,w*.22,.05);
          const x=w*(.28+.47*ease),y=h*(.70-.36*ease);
          vehicle(2,x,y,w*(.39+.07*Math.sin(ease*Math.PI)),-.10-.15*ease);
          if(id==='escape')vehicle(2,x-w*.22,y-h*.07,w*.23,-.16);
        }
      }};
  }
  const finalFilm={rupture:['cenit-picado','cenit-mar'],escape:['ten-escape','cenit-estela'],home:['ten-home','cenit-regreso'],credits:['cenit-regreso']};
  function finale(id,text,images){
    const plates=finalFilm[id],art=root.ArcadeStoryIllustrations;
    for(const plate of plates)art.load(plate);
    const dur=id==='credits'?10:Math.max(5.1,root.ArcadeStoryCinema.readTime(text));
    return {id,dur,sounds:id==='rupture'?[[dur*.40,'splash',.82],[dur*.57,'distant',.38]]:undefined,
      draw(c,time,view){
        const segment=dur/plates.length,index=Math.min(plates.length-1,Math.floor(time/segment));
        const local=id==='credits'?1:Math.max(0,time-index*segment);
        if(art.draw(c,plates[index],local,view,id==='credits'?1:segment))return;
        if(index&&art.draw(c,plates[index-1],1,view,1))return;
        c.drawImage(images.sky,0,0,view.w,view.h);
      }};
  }
  function play(cinema,level,part,images,audio,onDone){
    const rows=sequences[level][part];
    const pages=rows.map(([id,text])=>id==='credits'?{text:'',credits:[
      {kind:'head',text:'CAMPAÑA COMPLETADA'},{kind:'title',text:'CAP DOLLAR, THE HUNTER'},
      {kind:'line',text:'Cap Dollar · el cazador'},{kind:'line',text:'Vega · la piloto'},
      {kind:'gap'},{kind:'line',text:'Delta de Hierro · canal abierto'},{kind:'head',text:'Gracias por jugar'}
    ]}:{text});
    let shots;
    if(level===10&&part==='ending')shots=rows.map(([id,text])=>finale(id,text,images));
    else{const base=rows.map(([id])=>scene(id,images));shots=root.ArcadeStoryIllustrations?.decorate(level===9?'nine':'ten',base)||base;}
    return cinema.play({cues:root.ArcadeStoryCinema.buildCues(pages,shots),label:level===9?'Marea de hierro':'Último vector',
      theme:level===9?'marea':'cenit',musicMode:part==='ending'?'victory':'explore',data:{audio},onDone});
  }
  root.ArcadeHorizonStory={play};
})(window);
