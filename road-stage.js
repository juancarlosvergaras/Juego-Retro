(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const War=common?require('./road-war'):root.ArcadeRoadWar,Crash=common?require('./road-crash'):root.ArcadeRoadCrash;
 // Puesta en escena de la misión 04: guion puro de la entrada y la salida, las
 // farolas de la autopista y las luces del atardecer. No decide nada del
 // combate; el dibujo vive en road-renderer.js.
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=u=>{u=clamp(u);return u*u*(3-2*u);};
 // HELI: escala del helicóptero frente a los motoristas, que aquí se dibujan más grandes que a pie.
 const HELI=.7,INTRO=5,CRUISE=360,LAMP_GAP=560,LAMP_Y=238,RAIL_Y=330,REST=200;
 // Entrada: los últimos motoristas del convoy se alejan, el helicóptero de Vega
 // pasa bajo y se aparta, y el cazador entra acelerando hasta su carril.
 function intro(t,lane=414){
  const u=ease((t-.5)/2.4),x=-130+(REST+130)*u,arriving=t>.5&&u<1;
  return{
   rider:{x,y:lane,wheelie:arriving?Math.sin(clamp((t-.5)/1.1)*Math.PI)*.2:0,boost:arriving,visible:t>.4},
   heli:{x:-260+t*330,y:176-ease((t-1.6)/2.6)*150+Math.sin(t*2.4)*3,tilt:.07-ease((t-1.6)/2.6)*.22,visible:t<4.6},
   // Dos colas del convoy que aceleran y se pierden por la derecha.
   convoy:[0,1].map(i=>({x:690+i*130+Math.max(0,t-.3-i*.25)**2*85,y:[366,462][i],type:i?'bike':'sidecar'})).filter(n=>n.x<1120),
   title:t>=1.1,bars:t<INTRO-.5?ease(t/.5):ease((INTRO-t)/.5),hint:t<INTRO-1.2,done:t>=INTRO};
 }
 // Salida: el camión estalla por partes mientras todo frena; el cazador se queda
 // ante los restos, recibe el mini tanque y se marcha con él.
 function ending(age,restX=REST){
  const phase=age<1.6?'breaking':age<2.5?'blast':'wreck',change=clamp((age-7)/.9),left=ease((age-10.5)/3);
  // Lo que ha avanzado la calzada desde que todo se detuvo (integral de la velocidad de salida).
  const U=(age-10.5)/2,drift=CRUISE*.85*2*(U<=0?0:U<1?U*U*U-U*U*U*U/2:.5+(U-1));
  return{phase,rigFrame:phase==='breaking'?3:phase==='blast'?4:5,quake:phase==='wreck'?0:1-age/2.5,
   fire:clamp((age-2.3)/1.2),burst:age>=7&&age<7.9?(age-7)/.9:-1,
   form:age<7.45?'rider':'tank',x:restX+left*980,idle:age>=4&&age<10.5,
   bars:ease(age/.6),reward:age>=7.8,done:age>=14,change,drift};
 }
 // Farolas plantadas en el guardarraíl: se mueven con la calzada.
 function lamps(scroll,width=960){
  const first=Math.floor((scroll-80)/LAMP_GAP),list=[];
  for(let i=first;i<=first+Math.ceil(width/LAMP_GAP)+1;i++){const x=i*LAMP_GAP+180-scroll;if(x>-90&&x<width+90)list.push({id:i,x,y:LAMP_Y,foot:RAIL_Y,flicker:i%5===2});}
  return list;
 }
 const rnd=v=>{const q=Math.sin(v*127.1+311.7)*43758.5453;return q-Math.floor(q);};
 // Luces de la escena en coordenadas de pantalla (la cámara no se mueve).
 function lights(s,p){
  const list=[],cut=s.intro<INTRO?intro(s.intro,p.lane):null,end=s.ending>=0?ending(s.ending,p.x):null;
  for(const l of lamps(s.scroll)){const on=l.flicker?(rnd(Math.floor(s.time*11)+l.id)>.3?1:.25):1;list.push({x:l.x-14,y:l.y+6,r:46,a:.5*on,glow:'255,196,120',ga:.3*on},{x:l.x-22,y:392,r:120,a:.42*on,glow:'255,188,112',ga:.07*on});}
  // Faro de la moto: un haz corto por delante.
  const crash=(s.crash>0||s.fatalCrash)&&!end?Crash.motion(s.crashAge,s.crashLift):null;
  const x=(cut?cut.rider.x:end?end.x:p.x)+(crash?crash.bikeX:0),y=(p.y??p.lane)-(crash?crash.bikeLift:0);
  const upright=crash?1-.78*Math.sin(crash.bikeFrame*Math.PI/16):1;
  if(!cut||cut.rider.visible){list.push({x:x+62,y:y-30*upright,r:74,a:.6*upright,glow:'255,236,180',ga:.2*upright},{x:x+88*upright+62,y:y-14*upright,r:96,a:.4*upright,glow:'255,236,180',ga:.08*upright},{x:x-46,y:y-34*upright,r:26,a:.4,glow:'255,70,50',ga:.2});}
  if(s.shotFlash>0&&!s.crash&&p.form!=='wolf'){
   const origin=p.form==='soldier'?War.soldierMuzzle(s,p):p.form==='zombie'?War.zombiePalm(s,p):p.form==='hero'?War.mountedEyes(s,p):{x:p.x+58,y:p.y-44};
   const k=clamp(s.shotFlash/.12);list.push({...origin,r:150,a:k,glow:p.form==='hero'?'110,200,255':p.form==='zombie'?'150,240,255':'255,214,140',ga:.3*k});
  }
  for(const n of s.enemies){if(n.hp<=0){if(n.type==='jeep')list.push({x:n.x,y:n.y-30,r:90,a:.6,glow:'255,150,70',ga:.2});continue;}
   if(n.type!=='jetSoldier')list.push({x:n.x-n.w*.42,y:n.y-26,r:24,a:.4,glow:'255,70,50',ga:.22});
   if(n.flash>0)list.push({x:n.x-n.w*.4,y:n.y-n.h*.7,r:110,a:.9,glow:'255,180,120',ga:.26});}
  const b=s.boss;
  if(b.active&&!end){const heat=.75+rnd(Math.floor(s.time*12))*.25;list.push({x:b.x-12,y:b.y-112,r:92,a:.6*heat,glow:'255,150,60',ga:.22*heat});if(b.flash>0)for(let gun=b.stage;gun<3;gun++)list.push({x:b.x-145+gun*100,y:b.y-150-(gun===1?20:0),r:100,a:.9,glow:'255,190,120',ga:.28});
   if(b.phase==='ramWarn'||b.phase==='ram'){const blink=Math.floor(s.time*8)%2?1:.4;list.push({x:b.x-b.w/2,y:b.y-60,r:130,a:.5*blink,glow:'255,80,60',ga:.2*blink});}}
  if(end){const k=end.phase==='blast'?1:end.phase==='breaking'?.5+rnd(Math.floor(s.ending*9))*.3:.55+rnd(Math.floor(s.time*13))*.25;list.push({x:b.x-20,y:b.y-70,r:end.phase==='wreck'?190:260,a:.85*k,glow:'255,150,70',ga:.3*k});
   if(end.burst>=0)list.push({x:end.x,y:p.lane-40,r:160,a:1-end.burst,glow:'190,240,255',ga:.4*(1-end.burst)});}
  // El rayo ya ilumina la palma mientras dura la pose de ataque. Solo las explosiones tienen tamaño radial.
  for(const f of s.effects){if(f.color==='dust'||f.color==='claw'||f.color==='ray')continue;const k=clamp(f.life/f.max);list.push({x:f.x,y:f.y,r:f.size*2.2,a:k,glow:f.color==='plasma'?'150,255,120':'255,170,90',ga:.32*k});}
  for(const m of s.mines)if(Math.floor(m.age*5)%2)list.push({x:m.x,y:m.y-8,r:30,a:.6,glow:'255,60,50',ga:.3});
  let shots=0;for(const q of s.bullets){if(shots++>=28)break;list.push({x:q.x,y:q.y,r:q.plasma?44:q.slot===6?46:26,a:.55,glow:q.plasma?'150,255,120':q.enemy?'255,120,90':'255,236,170',ga:q.plasma?.28:.16});}
  return list;
 }
 const api={HELI,INTRO,LAMP_GAP,LAMP_Y,RAIL_Y,REST,intro,ending,lamps,lights};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeRoadStage=api;
})(typeof window!=='undefined'?window:globalThis);
