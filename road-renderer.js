(function(root){
 'use strict';
 function atlas(img,cols,rows){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const cx=c.getContext('2d');cx.drawImage(img,0,0);const data=cx.getImageData(0,0,c.width,c.height).data,cw=Math.floor(c.width/cols),ch=Math.floor(c.height/rows),out=[];for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){let x0=cw,y0=ch,x1=0,y1=0;for(let y=1;y<ch-1;y++)for(let x=1;x<cw-1;x++)if(data[((y+r*ch)*c.width+x+col*cw)*4+3]>200){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}out.push(x1>x0?[col*cw+x0,r*ch+y0,x1-x0+1,y1-y0+1]:[col*cw,r*ch,cw,ch]);}return out;}
 // El cuadro de los restos trae humo pintado, que quedaría congelado: se borra
 // para poner encima humo y llamas animados.
 function scrub(img,cols,rows,cell){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const cx=c.getContext('2d');cx.drawImage(img,0,0);const cw=Math.floor(c.width/cols),ch=Math.floor(c.height/rows),x0=(cell%cols)*cw,y0=Math.floor(cell/cols)*ch,h=Math.floor(ch*.62);let data;try{data=cx.getImageData(x0,y0,cw,h);}catch{return img;}const d=data.data;for(let i=0;i<d.length;i+=4)if(d[i+3]>0&&d[i]>72&&Math.abs(d[i]-d[i+1])<16&&Math.abs(d[i+1]-d[i+2])<16)d[i+3]=0;cx.putImageData(data,x0,y0);return c;}
 const AMBIENT=.3;
 function create(images){const Stage=root.ArcadeRoadStage,War=root.ArcadeRoadWar,Fire=root.ArcadeAirMecha,Kit=root.ArcadeMissionKit;images.rig=scrub(images.rig,2,3,5);const mounted=images.mounted?atlas(images.mounted,4,2):null,obstacles=images.obstacles?atlas(images.obstacles,3,2):null,crashes=images.crashes?root.ArcadeAdvancedForms.atlas(images.crashes,4,4,{y:[0,.27,.52,.765,1]}):null,actions=images.actions?atlas(images.actions,3,3):null,riders=atlas(images.riders,4,3),rig=atlas(images.rig,2,3),foes=images.foes?root.ArcadeAdvancedForms.atlas(images.foes,3,2,{x:[[0,1/3,992/1536,1],[0,1/3,992/1536,1]],y:[0,.515,1]}):null,rigAim=images.rigAim?atlas(images.rigAim,2,3):rig,soldierCrash=images.soldierCrash?atlas(images.soldierCrash,4,1):null;
  function sprite(c,img,f,x,y,width,angle=0,alpha=1){c.save();c.globalAlpha*=alpha;c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.drawImage(img,...f,-width/2,-width*f[3]/f[2],width,width*f[3]/f[2]);c.restore();}
  function background(c,scroll,time){const img=images.road,cut=Math.round(img.height*.48),skyW=1280;for(let x=-(scroll*.05%skyW);x<960;x+=skyW)c.drawImage(img,0,0,img.width,cut,Math.round(x),0,skyW,322);const roadW=1180;for(let x=-(scroll%roadW);x<960;x+=roadW)c.drawImage(img,0,cut,img.width,img.height-cut,Math.round(x),322,roadW+1,218);c.fillStyle='#edcd8f';for(let i=0;i<7;i++){const x=((i*211-scroll*1.5)%1200+1200)%1200-120;c.globalAlpha=.25;c.fillRect(x,506+i%3*8,18+(i%2)*20,2);}c.globalAlpha=1;
   // The sign is planted on the guardrail, so it travels with the road.
   const signX=((1100-scroll)%1900+1900)%1900-200;c.fillStyle='#575a52';c.fillRect(signX,255,5,78);c.fillStyle='#254941';c.fillRect(signX-57,236,118,34);c.strokeStyle='#bec4a0';c.strokeRect(signX-55,238,114,30);c.fillStyle='#e6e5c6';c.font='bold 11px monospace';c.textAlign='center';c.fillText('AUTOPISTA 04 →',signX+2,257);c.textAlign='start';
   // Farolas del guardarraíl: poste, brazo y lámpara encendida.
   for(const l of Stage?.lamps(scroll)||[]){const x=Math.round(l.x);c.fillStyle='#23282c';c.fillRect(x-2,l.y,4,l.foot-l.y);c.fillRect(x-20,l.y,20,3);c.fillRect(x-5,l.foot-6,10,6);c.fillStyle='#3b4247';c.fillRect(x-1,l.y+3,1,l.foot-l.y-9);c.fillStyle='#1b1f22';c.fillRect(x-24,l.y+3,12,4);c.fillStyle=l.flicker&&Math.floor(time*11)%4===0?'#8c7a52':'#ffe7a8';c.fillRect(x-22,l.y+7,8,2);}
  }
  // Balizas del arcén cercano: pasan más deprisa que la calzada y dan profundidad.
  function foreground(c,scroll,boost){const gap=310;for(let x=-((scroll*1.22)%gap);x<1000;x+=gap){const px=Math.round(x+120);c.fillStyle='#14181b';c.fillRect(px,516,5,24);c.fillStyle='#d8d2bd';c.fillRect(px,518,5,4);c.fillStyle='#d2493c';c.fillRect(px+1,524,3,3);}
   if(boost){c.fillStyle='#ffe9c2';for(let i=0;i<9;i++){const u=((scroll*.011+i*.37)%1+1)%1;c.globalAlpha=.18*(1-u);c.fillRect(Math.round(960-u*1100),350+((i*53)%150),90,1);}c.globalAlpha=1;}}
  // Sombra de contacto: nada de lo que rueda flota sobre el asfalto.
  function shadow(c,x,y,w,k=1){c.fillStyle='rgba(8,12,16,'+(.5*k).toFixed(3)+')';c.fillRect(Math.round(x-w*.4),Math.round(y-2),Math.round(w*.8),3);c.fillStyle='rgba(8,12,16,'+(.3*k).toFixed(3)+')';c.fillRect(Math.round(x-w*.48),Math.round(y),Math.round(w*.96),3);}
  function exhaust(c,x,y,t,boost=false){for(let i=0;i<7;i++){const phase=(t*6+i*.7)%4;c.globalAlpha=(1-phase/4)*.3;c.fillStyle=boost?'#d0ad76':'#899093';const size=4+phase*3;c.fillRect(x-phase*12,y-phase*3,size,size);}c.globalAlpha=1;}
  function spokes(c,x,y,w,t){c.strokeStyle='#b9a98688';c.lineWidth=1;for(const dx of [-w*.32,w*.34]){c.save();c.translate(x+dx,y-w*.12);c.rotate(t*28);c.beginPath();c.moveTo(-w*.065,0);c.lineTo(w*.065,0);c.moveTo(0,-w*.065);c.lineTo(0,w*.065);c.stroke();c.restore();}}
  // Caída del soldado con el mismo arte con el que conduce: el bache lo lanza en
  // una voltereta completa, aterriza con rebote y recupera el equilibrio.
  function wipeout(c,img,f,x,lane,width,age){const h=width*f[3]/f[2],air=1,u=Math.min(1,age/air),e=u*u*(3-2*u),theta=age<air?e*Math.PI*2:Math.sin(age*22)*.09*Math.max(0,1-(age-air)/.9),hop=age<air?Math.sin(u*Math.PI)*48:0,half=Math.abs(Math.sin(theta))*width/2+Math.abs(Math.cos(theta))*h/2;c.save();c.translate(Math.round(x),Math.round(lane-half-hop));c.rotate(theta);c.drawImage(img,...f,-width/2,-h/2,width,h);c.restore();if(age>=air&&age<air+.6)for(let i=0;i<6;i++){const k=(age-air)/.6;c.globalAlpha=(1-k)*.55;c.fillStyle=i%2?'#c9b28a':'#8f8068';c.fillRect(Math.round(x-36+i*14+(i-2.5)*k*20),Math.round(lane-4-k*12-(i%2)*5),6+Math.round(k*6),4);}c.globalAlpha=1;}
  function player(c,p,s,x=p.x,y=p.y,alpha=1){if(p.cloak>0&&Math.floor(p.cloak*9)%4!==0)return;
   if((s.crash>0||s.fatalCrash)&&images.stunts){
    const grounded={...p,hurt:0,transform:0,roadBoost:false,eyeFlash:0};
    const stopped={...s,shadowed:true,stuntMount:true,crash:0,fatalCrash:false,jump:0,boost:false,ram:0,landing:0,shotFlash:0};
    c.save();c.globalAlpha*=alpha;
    root.ArcadeRoadCrash.draw(c,images.stunts,p.form,x,p.lane,s.crashAge,s.crashLift||0,(px,py)=>player(c,grounded,stopped,px,py));
    c.restore();return;
   }
   if(!s.shadowed){shadow(c,x,p.lane,104,Math.max(.35,1-(s.jump||0)/160)*alpha);s={...s,shadowed:true};}
   if(root.ArcadeFormTransition?.compose(c,{...p,x,y,onMotorcycle:true,swimming:false},q=>player(c,q,{...s,shotFlash:0,ram:0},x,y,alpha),'road'))return;
   if(p.form==='hero'){
    if(!images.stunts){root.ArcadeAdvancedForms.draw(c,{...p,x,y,anim:s.time,onMotorcycle:true});return;}
    const index=s.shotFlash>0?2:s.jump?3:s.boost?1:0;
    root.ArcadeRoadCrash.mountedHero(c,images.stunts,War.riderPose(s,x,y,0,.6),index);
    if(s.shotFlash>0){
     const eyes=War.mountedEyes(s,{x,y}),aim=p.aim||{x:1,y:0};
     c.save();c.translate(eyes.x,eyes.y);c.rotate(Math.atan2(aim.y,aim.x));c.fillStyle='#489dff';c.fillRect(0,-2,19,4);c.fillStyle='#d1fbff';c.fillRect(0,-1,20,1);c.restore();
    }
    return;
   }
   if(mounted&&!s.crash&&(p.form==='robot'||p.form==='fighter')){
    const robot=p.form==='robot',row=robot?0:4,index=row+(robot?3:s.jump?2:s.ram>0?3:s.boost?1:0),f=mounted[index],scale=104/mounted[row][2],cw=Math.floor(images.mounted.width/4),offset=(f[0]%cw+f[2]/2-cw/2)*scale;
    c.save();c.globalAlpha*=alpha;if(!s.stuntMount)exhaust(c,x-43,y-12,s.time,!!s.boost);c.translate(x,y);c.rotate(s.jump?Math.max(-.16,Math.min(.13,s.jumpV*-.0005)):0);const bob=Math.sin(s.time*23)*.6;sprite(c,images.mounted,f,offset,bob,f[2]*scale);
    if(robot)root.ArcadeWeaponRenderer.draw(c,{...p,x:0,y:bob,onMotorcycle:true},{inventory:s.inventory,flash:s.shotFlash});c.restore();return;
   }
   if(p.form==='robot'){root.ArcadeRobotForm.draw(c,{...p,x,y,anim:s.time,onMotorcycle:true,grounded:!s.jump,crash:s.crash,crashAge:s.crashAge});if(!s.crash)root.ArcadeWeaponRenderer.draw(c,{...p,x,y,onMotorcycle:true},{inventory:s.inventory,flash:s.shotFlash});return;}if(s.crash>0){const row={wolf:0,zombie:1,fighter:2,tank:3}[p.form];if(crashes&&row!==undefined){const f=crashes[row*4+Math.min(3,Math.floor(s.crashAge/.55))],k=(p.form==='tank'?105:104)/crashes[row*4+3][2];sprite(c,images.crashes,f,x,p.lane,f[2]*k);}else if(soldierCrash){const f=soldierCrash[Math.min(3,Math.floor(s.crashAge/.55))],k=104/soldierCrash[3][2];sprite(c,images.soldierCrash,f,x,p.lane,f[2]*k);}else wipeout(c,images.riders,riders[0],x,p.lane,104,s.crashAge);return;}if(p.form==='tank'||p.form==='fighter'){c.save();c.globalAlpha*=alpha;root.ArcadeAdvancedForms?.draw(c,{...p,x,y,anim:s.time,grounded:!s.jump,vy:-s.jumpV,tankAirAge:s.jumpAge??.2,landing:s.landing||0,cannonPose:s.shotFlash>0?.45:0});c.restore();return;}const width=War.RIDER_WIDTH;
   c.save();c.globalAlpha*=alpha;if(p.hurt>0&&Math.floor(s.time*18)%2)c.globalAlpha*=.45;
   if(!s.stuntMount)exhaust(c,x-43,y-12,s.time,!!s.boost);
   const useActions=actions&&p.form!=='soldier',img=useActions?images.actions:images.riders;
   const col=p.form==='wolf'?0:p.form==='zombie'?1:2;
   const row=s.ram>0||s.shotFlash>0?2:s.jump?1:0;
   const rider=p.form==='wolf'?(s.jump?7:4):p.form==='zombie'?5:s.shotFlash>0?2:s.jump?3:s.boost?1:0;
   const f=useActions?actions[row*3+col]:riders[rider],scale=width/(useActions?actions[col]:riders[0])[2];
   const cw=Math.floor(img.width/(useActions?3:4)),offset=(f[0]%cw+f[2]/2-cw/2)*scale;
   const pose=War.riderPose(s,x,y,offset,useActions?1.2:.6);
   sprite(c,img,f,pose.x,pose.y,f[2]*scale,pose.angle);
   c.restore();
  }
  function enemy(c,n,s){if(n.type==='jetSoldier'){root.ArcadeExpansionEnemies.draw(c,{...n,kind:'jetSoldier',death:Math.max(0,1-n.death/2.8),facing:-1,scale:War?.JET_SCALE||1},images.expansion);if(n.hp>0&&Kit)Kit.enemyBar(c,n,n.h+10);return;}const index=n.type==='jeep'?2:n.type==='sidecar'?1:0,crop=foes?.[index+(n.hp<n.maxHp*.5?3:0)],img=foes?images.foes:images.riders,frame=crop||riders[8+index];shadow(c,n.x,n.y,n.w,n.hp<=0?Math.max(0,1-n.death/2):1);
   if(n.hp<=0&&images.stunts&&(n.type==='bike'||n.type==='sidecar')){
    root.ArcadeRoadCrash.convoy(c,images.stunts,n.type,n.x,n.y,n.death,()=>sprite(c,img,frame,0,0,n.w));return;
   }
   if(n.hp>0)exhaust(c,n.x-n.w*.45,n.y-16,s.time+n.age);if(n.hp<=0){if(n.type==='jeep'){const k=Math.max(0,1-n.death/3);sprite(c,images.riders,riders[11],n.x,n.y,n.w,0,k);if(Fire&&k>.25){c.save();c.globalAlpha=k;Fire.smoke(c,n.x+8,n.y-52,s.time,7,.5);Fire.flame(c,n.x+10,n.y-30,1,s.time,5);Fire.flame(c,n.x-28,n.y-22,.7,s.time,23);c.restore();}}else sprite(c,img,foes?.[index+3]||frame,n.x,n.y+8,n.w,Math.min(.42,n.death*.4),Math.max(0,1-n.death/3));return;}sprite(c,img,frame,n.x,n.y+Math.sin(s.time*25+n.x)*.6,frame[2]*(n.w/(foes?.[index]||riders[8+index])[2]),0,n.hit>0?.65:1);if(n.escort){}else if(Kit)Kit.enemyBar(c,n,n.h+12);else{c.fillStyle='#1a202dcc';c.fillRect(n.x-26,n.y-n.h-12,52,5);c.fillStyle='#df8262';c.fillRect(n.x-25,n.y-n.h-11,50*n.hp/n.maxHp,3);}if(n.flash>0){c.fillStyle='#fff1aa';c.fillRect(n.x-n.w*.4-13,n.y-n.h*.7,22,5);}if(n.shock>0){c.strokeStyle='#9ffff0';c.lineWidth=2;c.beginPath();for(let i=0;i<12;i++){const x=n.x-50+i*9,y=n.y-30+Math.sin(i*8+s.time*70)*24;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();}}
  // Puntos calientes de los restos, como fracción del cuadro (izquierda→derecha, suelo→arriba).
  const HOT=[[.283,.66,1.1],[.76,.36,1],[.32,.1,.85],[.5,.57,1.1],[.665,.61,.9]],STACKS=[[.3,.86],[.72,.64]],rnd=v=>{const q=Math.sin(v*127.1+311.7)*43758.5453;return q-Math.floor(q);};
  // Todos los cuadros del camión comparten escala y anclaje: no salta al disparar ni al romperse.
  const rigCell=Math.floor(images.rig.width/2);
  function rigBox(index,x,y,width){const f=rig[index],k=width/rig[0][2],base=rig[0][0]%rigCell+rig[0][2]/2;return{f,left:x+(f[0]%rigCell-base)*k,top:y-f[3]*k,w:f[2]*k,h:f[3]*k};}
  function rigDraw(c,box,alpha=1){c.save();c.globalAlpha*=alpha;c.drawImage(images.rig,...box.f,Math.round(box.left),Math.round(box.top),Math.round(box.w),Math.round(box.h));c.restore();}
  function wreck(c,b,s,p){const E=Stage.ending(s.ending,p.x),x=b.x-E.drift+(E.quake>0?Math.round((rnd(Math.floor(s.time*30))-.5)*5*E.quake):0),y=b.y,box=rigBox(E.rigFrame,x,y,b.w),w=box.w,h=box.h,at=([fx,fy])=>[box.left+w*fx,y-h*fy];
   shadow(c,box.left+w/2,y,w*.92);rigDraw(c,box);if(!Fire)return;
   if(E.phase!=='wreck'){const rate=2.4+s.ending*1.4,clock=s.ending*rate,cycle=Math.floor(clock);for(let k=0;k<3;k++){const id=cycle-k;if(id<0)continue;Fire.blast(c,x+(rnd(id*5.3)-.5)*w*.8,y-16-rnd(id*9.1)*h*.8,(clock-id)/1.6,id);}Fire.smoke(c,x-20,y-h*.8,s.time,3,.6+s.ending*.2);}
   if(E.fire>0){c.save();c.globalAlpha=E.fire;for(const [i,stack] of STACKS.entries())Fire.smoke(c,...at(stack),s.time,i*5+1,.95);c.globalAlpha=E.fire;for(const [i,spot] of HOT.entries()){const [fx,fy]=at(spot);Fire.flame(c,fx-6,fy+1,spot[2]*.9,s.time,i*17+5);Fire.flame(c,fx+6,fy+1,spot[2]*.85,s.time,i*17+11);Fire.flame(c,fx,fy,spot[2],s.time,i*17);}c.restore();const clock=s.time*.3,cycle=Math.floor(clock);Fire.blast(c,x+(rnd(cycle*3.7)-.5)*w*.5,y-20-rnd(cycle*6.1)*h*.5,(clock-cycle)*3.2,cycle);}
  }
  function boss(c,b,s,p){if(s.ending>=0&&Stage){wreck(c,b,s,p);return;}const index=s.ending>=0?s.ending<3.8?4:5:b.stage===2?3:b.stage===1?2:b.flash>0?1:0;const x=s.ending>=0?b.x-Math.min(780,s.ending*90):b.x,y=b.y+Math.sin(s.time*16)*1.5;shadow(c,x,b.y,b.w*.94);rigDraw(c,rigBox(index,x,y,b.w),b.hit>0?.7:1);if(s.ending<0){spokes(c,x,y,b.w*.85,s.time);exhaust(c,x-145,y-125,s.time);if(b.flash>0)for(let gun=b.stage;gun<3;gun++)root.ArcadeBossAttackSprites?.draw(c,'blast',.16-b.flash,b.x-145+gun*100,b.y-150-(gun===1?20:0),32,23,{duration:.16,loop:false});if(b.phase==='ram')root.ArcadeBossAttackSprites?.draw(c,'shock',s.time,x,y,180,40,{ground:true});if(b.phase==='ramWarn'){c.fillStyle='#f0554840';c.fillRect(40,b.targetY-24,b.x-40,44);c.fillStyle='#ffe6bc';c.font='bold 13px monospace';c.textAlign='left';c.fillText('⚠ EMBESTIDA',Math.max(50,b.x-350),b.targetY-30);}if(b.phase==='mines'){c.fillStyle='#ffac5e';c.font='bold 11px monospace';c.textAlign='center';c.fillText('MINAS EN LA CALZADA',b.x,b.y-b.h-12);}}}
  function effects(c,s){for(const f of s.effects){const age=f.max-f.life,fx=root.ArcadeBossAttackSprites;if(f.color==='ray'){fx?.beam(c,'lightning',s.time,f.x,f.y,f.toX,f.toY,20);continue;}fx?.draw(c,f.color==='plasma'?'plasma':f.color==='dust'?'shock':f.color==='claw'?'slash':'blast',age,f.x,f.y,Math.max(20,f.size*2),Math.max(20,f.size*1.5),{loop:false,duration:f.max,alpha:Math.min(1,f.life*5)});}
   for(const p of s.parts){const f=p.rig?rig[0]:riders[10],img=p.rig?images.rig:images.riders,cuts=[[.08,.67,.2,.29],[.23,.22,.18,.22],[.47,.34,.2,.23],[.64,.58,.18,.3]],a=cuts[p.part];c.save();c.globalAlpha=Math.min(1,p.life);c.translate(p.x,p.y);c.rotate(p.rotation);c.drawImage(img,f[0]+f[2]*a[0],f[1]+f[3]*a[1],f[2]*a[2],f[3]*a[3],-16,-13,32,26);c.restore();}
  }
  function draw(c,s,p,e,powers,profile){s.inventory=e.inventory;c.save();c.imageSmoothingEnabled=false;background(c,s.scroll,s.time);s.boost=p.roadBoost?1:0;
   const posts=War?.CHECKPOINTS||[3200,7800],stations=posts.map((d,i)=>({id:'road-cp-'+i,x:220+(d-s.distance)*5,y:338,inside:false}));const active=Math.max(-1,posts.indexOf(s.checkpoint));root.ArcadeCheckpoints?.draw(c,{stations,active:active<0?null:'road-cp-'+active,visited:new Set(stations.filter((_,i)=>i<=active).map(p=>p.id)),flash:Math.max(0,2.8-(s.distance-s.checkpoint)/72)},false,s.time,{left:0,right:960,top:0,bottom:540});
   for(const o of s.obstacles||[])if(o.x>-180&&o.x<1140&&obstacles){
    const ramp=o.type==='ramp',f=obstacles[(ramp?3:0)+Math.floor(s.time*(ramp?3:5))%3],w=ramp?200:116,h=ramp?65:34;
    // Potholes sit in the road plane; only the water changes frame, never their ground anchor.
    c.drawImage(images.obstacles,...f,Math.round(o.x-w/2),Math.round(o.lane-(ramp?h:h/2)),w,h);
    if(!o.used){c.fillStyle=ramp?'#ffe3a0':'#ff9978';c.font='bold 10px monospace';c.textAlign='center';c.fillText(ramp?'RAMPA ↗':'¡BACHE! SALTA',o.x,o.lane-(ramp?73:30));}
   }
   for(const pool of s.pools||[]){c.globalAlpha=Math.min(.7,pool.life);c.fillStyle='#40ca7199';for(let i=0;i<8;i++)c.fillRect(pool.x-45+i*12,pool.y-8+Math.sin(i*3+s.time*9)*3,15,7);c.globalAlpha=1;}
   for(const item of s.pickups)root.ArcadePickupRenderer.draw(c,{...item,amount:3},s.time,p);
   for(const m of s.mines)root.ArcadeBossAttackSprites?.draw(c,'mine',m.age,m.x,m.y,29,21,{ground:true});
   const cut=Stage&&s.intro<Stage.INTRO?Stage.intro(s.intro,p.lane):null,end=Stage&&s.ending>=0?Stage.ending(s.ending,p.x):null;
   const things=s.enemies.map(n=>({y:n.y,draw:()=>enemy(c,n,s)}));if(s.boss.active)things.push({y:s.boss.y,draw:()=>boss(c,s.boss,s,p)});
   if(cut){for(const n of cut.convoy)things.push({y:n.y,draw:()=>enemy(c,{...n,w:n.type==='sidecar'?124:104,h:76,hp:1,maxHp:1,age:0,hit:0,flash:0,death:0,escort:true},s)});if(cut.rider.visible)things.push({y:p.lane,draw:()=>player(c,p,{...s,jump:0,ram:0,shotFlash:0,wheelie:cut.rider.wheelie,boost:cut.rider.boost?1:0},cut.rider.x,cut.rider.y)});}
   else if(end)things.push({y:p.lane,draw:()=>hero(c,p,s,end)});
   else if(s.ending<4)things.push({y:p.lane,draw:()=>player(c,p,s)});
   things.sort((a,b)=>a.y-b.y).forEach(t=>t.draw());if(cut?.heli.visible)helicopter(c,cut.heli,s.time);
   for(const b of s.bullets){if(root.ArcadeBossAttackSprites?.projectile(c,b,s.time))continue;c.fillStyle=b.eyeRay?'#71cfff':b.plasma?'#83ff88':b.enemy?'#ff6259':'#fff1b1';if(b.plasma){c.fillRect(b.x-7,b.y-5,14,10);c.fillStyle='#d8ffc5';c.fillRect(b.x-3,b.y-3,6,5);}else{c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.fillRect(-9,-2,b.slot===6?19:12,b.slot===6?6:3);c.restore();}}
   if(powers&&s.ending<0&&!cut){root.ArcadePowers?.draw(c,powers,p,e,{top:0,bottom:540});root.ArcadePowerFx?.draw(c,powers,p,e);}effects(c,s);foreground(c,s.scroll,s.boost&&!cut&&!end);
   // Atardecer: el cielo conserva su luz y la calzada se oscurece entre farolas.
   if(Stage&&root.ArcadeMissionOneFx)root.ArcadeMissionOneFx.lightmap(c,{x:0,y:0},960,540,[{x:480,y:40,r:520,a:.95},{x:120,y:120,r:360,a:.8},{x:840,y:120,r:360,a:.8},...Stage.lights(s,p),...(powers&&root.ArcadePowerFx?root.ArcadePowerFx.lights(powers,p):[])],AMBIENT);
   if(Stage){if(cut)cinema(c,cut.bars,s.shared?null:['MISIÓN 04','FURIA EN LA CARRETERA','El convoy huye por la autopista'],cut.hint?'Espacio · Saltar la escena':'');
    else if(end)cinema(c,end.bars,s.shared?null:end.reward?['MISIÓN 04 COMPLETADA','MINI TANQUE DESBLOQUEADO','Súper cañón · Transformación submarina · Próximo destino: el mar']:['CONVOY NEUTRALIZADO','EL DEVORADOR HA CAÍDO','Blindaje roto · Tripulación derrotada'],'');
    c.restore();return;}
   if(s.intro<5){letterbox(c,'MISIÓN 04','FURIA EN LA CARRETERA',s.intro<2?'Despliegue desde el portaaviones':'Flechas: maniobrar · Espacio: saltar · J: atacar · Shift: turbo');}
   if(s.ending>=0){const age=s.ending;if(age<4){c.fillStyle='#ffde9822';c.fillRect(0,0,960,540);letterbox(c,'CONVOY NEUTRALIZADO','EL DEVORADOR HA CAÍDO','Blindaje roto · Tripulación derrotada');}else{const fade=Math.min(1,(age-4)/2);c.fillStyle='#f2bb6922';c.fillRect(0,0,960,540);player(c,p,{...s,jump:0,ram:0,shotFlash:0},p.x+Math.min(800,(age-4)*75),p.lane,1);if(age>=8)root.ArcadeAdvancedForms?.draw(c,{...p,form:'tank',x:480,y:390,anim:s.time,transform:0,hurt:0,cannonPose:0});letterbox(c,'MISIÓN 04 COMPLETADA',age<8?'CARRETERA LIBERADA':'MINI TANQUE DESBLOQUEADO',age<8?'El cazador deja atrás el convoy en llamas.':'Súper cañón · Transformación submarina · Próximo destino: el mar');c.globalAlpha=fade;}}
   c.restore();
  }
  // Bandas de cine; el rótulo solo se pinta aquí cuando no hay tarjeta compartida.
  function cinema(c,k,text,hint){const top=Math.round(46*k),bottom=Math.round(62*k);c.fillStyle='#05080d';c.fillRect(0,0,960,top);c.fillRect(0,540-bottom,960,bottom);if(text&&k>.9){c.textAlign='center';c.fillStyle='#efd29a';c.font='bold 13px monospace';c.fillText(text[0],480,29);c.fillStyle='#f9f2de';c.font='bold 24px monospace';c.fillText(text[1],480,513);c.font='11px monospace';c.fillStyle='#cbd7d3';c.fillText(text[2],480,531);c.textAlign='start';}else if(hint&&k>.9){c.textAlign='center';c.fillStyle='#9fb4c4';c.font='11px monospace';c.fillText(hint,480,540-Math.round(bottom/2)+4);c.textAlign='start';}}
  function helicopter(c,h,time){const frames=root.HELICOPTER_FRAMES,img=images.heli;if(!frames||!img)return;const f=frames[Math.floor(time*16)%frames.length],k=Stage?.HELI||.7;shadow(c,h.x,414,250,.35);c.save();c.translate(Math.round(h.x),Math.round(h.y));c.rotate(-h.tilt);c.drawImage(img,f[0],f[1],f[2],f[3],Math.round(-(f[4]??f[2]/2)*k),Math.round(-(f[5]??f[3]/2)*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();}
  // El cazador en el final: en moto ante los restos y luego con el mini tanque.
  function hero(c,p,s,end){const calm={...s,jump:0,ram:0,shotFlash:0,crash:0,boost:0};if(end.form==='rider')player(c,{...p,hurt:0,transform:0},calm,end.x,p.lane);else{shadow(c,end.x,p.lane,110);root.ArcadeAdvancedForms?.draw(c,{...p,form:'tank',x:end.x,y:p.lane,anim:s.time,transform:0,hurt:0,cannonPose:0,grounded:true,vy:0,landing:0});}
   if(end.burst>=0){const u=end.burst,x=Math.round(end.x),y=Math.round(p.lane-40);c.save();c.globalAlpha=1-u;c.fillStyle='#e8fbff';c.fillRect(x-3-Math.round(u*4),y-90,6+Math.round(u*8),130);c.fillStyle='#9fe8ff';for(let i=0;i<14;i++){const a=i/14*Math.PI*2,d=16+u*70;c.fillRect(Math.round(x+Math.cos(a)*d),Math.round(y+Math.sin(a)*d*.6),4,4);}c.restore();}}
  function letterbox(c,small,title,detail){c.fillStyle='#101a22df';c.fillRect(0,0,960,66);c.fillRect(0,454,960,86);c.textAlign='center';c.fillStyle='#efd29a';c.font='bold 14px monospace';c.fillText(small,480,30);c.fillStyle='#f9f2de';c.font='bold 28px monospace';c.fillText(title,480,491);c.font='12px monospace';c.fillStyle='#cbd7d3';c.fillText(detail,480,518);}
  return{draw,background,player,letterbox,riders,actions,mounted,crashes,rig,wreck,HOT,STACKS};
 }
 const api={create,atlas};root.ArcadeRoadRenderer=api;
})(window);
