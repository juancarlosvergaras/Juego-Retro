(function(root){
 'use strict';
 function create(images){const atlas=root.ArcadeAdvancedForms.atlas,divers=atlas(images.divers),naval=atlas(images.naval,4,3,{x:{1:[0,.25,825/1448,1120/1448,1]}}),zombie=atlas(images.zombie,6,6);
  // The exterior ship is wider than one grid cell; its own row uses unequal slots.
  const n=images.naval;naval[8]=[0,Math.round(n.height*2/3),Math.round(n.width*.39),Math.round(n.height/3)];naval[9]=[Math.round(n.width*.4),Math.round(n.height*2/3),Math.round(n.width*.19),Math.round(n.height/3)];naval[10]=[Math.round(n.width*.595),Math.round(n.height*2/3),Math.round(n.width*.205),Math.round(n.height/3)];naval[11]=[Math.round(n.width*.81),Math.round(n.height*2/3),Math.round(n.width*.19),Math.round(n.height/3)];
  function trim(image,frames,indices){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const g=canvas.getContext('2d');g.drawImage(image,0,0);const data=g.getImageData(0,0,canvas.width,canvas.height).data;for(const i of indices){const f=frames[i],x0=Math.ceil(f[0]),y0=Math.ceil(f[1]),x1=Math.min(image.width,Math.floor(f[0]+f[2])),y1=Math.min(image.height,Math.floor(f[1]+f[3]));let l=x1,r=x0,t=y1,b=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*image.width+x)*4+3]>200){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}if(r>l)frames[i]=[l,t,r-l+1,b-t+1];}}
  trim(images.naval,naval,[8,9,10,11]);
  function sprite(c,img,f,x,y,scale,flip=false,angle=0){c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip?-1:1,1);c.rotate(angle);c.drawImage(img,...f,-Math.round(f[2]*scale/2),-Math.round(f[3]*scale),Math.round(f[2]*scale),Math.round(f[3]*scale));c.restore();}
  function title(c,small,big,detail){c.fillStyle='#071b2de8';c.fillRect(0,0,960,64);c.fillRect(0,445,960,95);c.textAlign='center';c.fillStyle='#8ce7ef';c.font='bold 14px monospace';c.fillText(small,480,30);c.fillStyle='#ecf9ef';c.font='bold 28px monospace';c.fillText(big,480,483);c.fillStyle='#c5dce2';c.font='12px monospace';c.fillText(detail,480,517);}
  const sprites=root.ArcadeSeaSprites.create(images);
  let scenery;
  function background(c,s){
   if(!s.inside){scenery??=root.ArcadeSeaScenery.create(images,sprites);scenery.water(c,s);return;}
   const img=images.sea,half=Math.floor(img.height/2);
   c.drawImage(img,0,half,img.width,half,0,0,960,540);
  }
  function player(c,s,p){if(p.cloak>0&&Math.floor(p.cloak*9)%4!==0)return;if(root.ArcadeFormTransition?.compose(c,{...p,swimming:!s.inside,onMotorcycle:false},q=>player(c,s,q),s.inside?'ground':'swim'))return;if(p.hurt>0&&Math.floor(s.time*18)%2)c.globalAlpha=.45;
   if(root.ArcadeFormTransition?.draw(c,p)){c.globalAlpha=1;return;}
   if(!s.inside&&sprites.player(c,p,s)){
    c.globalAlpha=1;return;
   }
   if(root.ArcadeAdvancedForms.draw(c,p)){c.globalAlpha=1;return;}
   if(p.form==='robot'){root.ArcadeRobotForm.draw(c,p);root.ArcadeWeaponRenderer.draw(c,p,{inventory:s.inventory,flash:s.flash});}
   else if(p.form==='zombie'){const row=Math.abs(p.vx)>8?1:0,f=zombie[row*6+Math.floor(s.time*(row?8:3))%6];sprite(c,images.zombie,f,p.x,p.y,64/zombie[0][3],p.facing<0);}
   else{const wolf=p.form==='wolf',row=wolf?(s.flash>0?3:Math.abs(p.vx)>8?1:0):!p.grounded?3:Math.abs(p.vx)>8?1:0,fs=wolf?root.ACTION_FRAMES.wolf:root.SOLDIER_V2_FRAMES,col=wolf&&row===0?7:Math.floor(s.time*(row===1?9:4))%fs[row].length,f=fs[row][col];sprite(c,wolf?images.wolf:images.soldier,f,p.x,p.y,wolf?.48:root.SOLDIER_V2_SCALE,p.facing<0);if(!wolf)root.ArcadeWeaponRenderer.draw(c,p,{inventory:s.inventory,flash:s.flash});}
   c.globalAlpha=1;
  }
  function landingMark(c,x,r,pulse){
   c.save();c.translate(Math.round(x),root.ArcadeSeaWar.FLOOR);
   c.strokeStyle='#7eeaff';c.globalAlpha=.50+pulse*.35;c.setLineDash([5,4]);c.lineWidth=2;
   c.beginPath();c.ellipse(0,-2,r,6,0,0,Math.PI*2);c.stroke();c.restore();
  }
  function grenade(c,h){
   const fx=root.ArcadeBossAttackSprites,deck=root.ArcadeSeaWar.FLOOR;
   if(h.stage==='electric'){
    fx.draw(c,'electric',h.age,h.x,deck+2,h.radius*2,48,{ground:true});return;
   }
   const pulse=.5+.5*Math.cos(h.age*(h.stage==='fuse'?28:9));
   landingMark(c,h.targetX,h.radius,pulse);
   c.save();c.translate(Math.round(h.x),Math.round(h.y));c.rotate(h.stage==='flight'?Math.sign(h.targetX-h.fromX)*h.age*8:0);
   if(h.stage==='fuse')c.filter='brightness('+(1+pulse*.7)+')';
   c.drawImage(images.captainMotion,0,864,24,24,-11,-11,22,22);c.restore();
  }
  function boss(c,s){
   const b=s.boss,phase=b.phase,war=root.ArcadeSeaWar;
   if(s.ending>=6)return;
   const pose=war.captainPose(b,s.ending);
   c.save();c.translate(Math.round(b.x),Math.round(b.y));c.scale(b.facing>0?-1:1,1);
   if(b.hit>0&&s.ending<0)c.filter='brightness(1.4)';
   c.drawImage(images.captainMotion,pose.frame*200,pose.row*144,200,144,-100,-139,200,144);c.restore();
   if(s.ending>=0)return;
   if(phase==='gun'&&b.shot>.16){
    const muzzle=war.captainSocket(b,'muzzle');
    root.ArcadeBossAttackSprites.draw(c,'blast',.24-b.shot,muzzle.x+b.facing*9,muzzle.y,26,14);
   }
   if(phase==='dash'&&b.age<.30)root.ArcadeBossAttackSprites.draw(c,'shock',b.age,b.x-b.facing*34,b.y,49,14,{ground:true});
   if(phase==='grenadeWarn')landingMark(c,b.targetX,76,.5+.5*Math.sin(b.age*10));
   if(phase==='missileWarn'||phase==='missile')for(const x of b.targets){c.fillStyle='#ff63574d';c.fillRect(x-30,80,60,war.FLOOR-80);c.strokeStyle='#ff9686';c.strokeRect(x-29,war.FLOOR-27,58,26);c.font='bold 12px monospace';c.textAlign='center';c.fillStyle='#ffe0b5';c.fillText('↓',x,war.FLOOR-40);}
   const warning={arrival:'CAPITÁN DEL ABISMO',gunWarn:'AMETRALLADORA · PREPARA EL SALTO',missileWarn:'MISILES · SAL DE LAS MARCAS',grenadeWarn:'GRANADA ELÉCTRICA · SAL DEL RADIO AZUL',dashWarn:'EMBESTIDA · SALTA SOBRE EL CAPITÁN'}[phase];
   if(warning){c.fillStyle='#0c182ee6';c.fillRect(190,105,580,29);c.fillStyle='#ffd089';c.font='bold 13px monospace';c.textAlign='center';c.fillText(warning,480,124);}
  }
  function effects(c,s,p){for(const f of s.effects){const age=f.max-f.life,fx=root.ArcadeBossAttackSprites;if(f.color==='ray'){if(f.swimFacing&&(p.form!=='zombie'||p.facing!==f.swimFacing))continue;
    const palm=f.swimFacing?root.ArcadeSeaSprites.muzzle(p):f;
    const dx=f.swimFacing&&!f.fixedTarget?palm.x-f.x:0,dy=f.swimFacing&&!f.fixedTarget?palm.y-f.y:0;
    fx?.beam(c,'lightning',s.time,palm.x,palm.y,f.tx+dx,f.ty+dy,20);continue;}fx?.draw(c,f.color==='plasma'?'plasma':f.color==='dust'?'shock':f.color==='claw'?'slash':'blast',age,f.x,f.y,Math.max(20,f.size*2),Math.max(20,f.size*1.5),{loop:false,duration:f.max,alpha:Math.min(1,f.life*5)});}}
  function draw(c,s,p,e,powers,profile){s.inventory=e.inventory;c.save();c.imageSmoothingEnabled=false;
   background(c,s);c.save();c.translate(-Math.round(s.camera.x),-Math.round(s.camera.y));const visible=(x,y,margin=160)=>x>s.camera.x-margin&&x<s.camera.x+960+margin&&y>s.camera.y-margin&&y<s.camera.y+540+margin;
   if(!s.inside){
    scenery.terrain(c,s);
    // Full hull is visible before the entry trigger: the boss is inside this ship.
    if(visible(11200,3060,700)){sprite(c,images.naval,naval[8],11180,3080,900/naval[8][2]);sprite(c,images.naval,naval[s.airlock>=0?10:9],11280,2950,85/naval[9][2]);c.fillStyle='#b8eeeb';c.textAlign='center';c.font='bold 14px monospace';c.fillText('ESCLUSA →',11280,2802);}
    for(let i=0;i<3;i++){const cp=root.ArcadeSeaWar.stations[i];if(visible(cp.x,cp.y)){sprite(c,images.naval,naval[11],cp.x,cp.y,60/naval[11][3]);c.fillStyle=i<=s.checkpoint?'#a3f2ba':'#d5eaf0';c.textAlign='center';c.font='10px monospace';c.fillText(i<=s.checkpoint?'CHECK POINT ✓':'CHECK POINT',cp.x,cp.y-66);}}
    for(const item of s.pickups)if(!s.taken.has(item.id)&&visible(item.x,item.y))root.ArcadePickupRenderer.draw(c,{...item,amount:3,y:item.y+Math.sin(s.time*3)*4},s.time,p);
    for(const m of s.mines)if(m.active&&visible(m.x,m.y)){sprite(c,images.naval,naval[6],m.x,m.y+25+Math.sin(s.time*2+m.x)*3,48/naval[6][2]);}
    for(const n of s.enemies)if(visible(n.x,n.y)&&n.deadAge<.7){c.save();if(n.hit>0)c.filter='brightness(1.7)';if(n.hp<=0)c.globalAlpha=Math.max(0,1-n.deadAge/.7);if(n.type==='shark'||n.type==='squid')sprites.predator(c,n);else sprites.enemy(c,n);c.restore();}
   }else boss(c,s);
   for(const pool of s.pools){c.globalAlpha=Math.min(.7,pool.life);c.fillStyle='#67dd8b';for(let i=0;i<10;i++)c.fillRect(pool.x-50+i*10,pool.y-6+Math.sin(i+s.time*4)*2,12,6);c.globalAlpha=1;}
   for(const h of s.hazards)grenade(c,h);
   if(s.ending<6)player(c,s,p);
   for(const b of s.bullets){if(root.ArcadeBossAttackSprites?.projectile(c,b,s.time))continue;c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(Math.atan2(b.vy,b.vx));c.fillStyle=b.plasma?'#8bf396':b.enemy?'#ff705d':'#c4fcff';c.fillRect(-8,-2,b.slot===6||b.type==='missile'||b.type==='torpedo'?22:11,b.superCannon?7:4);c.fillStyle='#fff5d0';c.fillRect(5,-1,4,2);if(!s.inside){c.strokeStyle='#a4f4ff66';for(let j=1;j<5&&10+j*9<=(b.waterDistance??Infinity);j++)c.strokeRect(-10-j*9,-2+j%2,3,3);}c.restore();}
   effects(c,s,p);if(powers&&s.ending<0)root.ArcadePowers.draw(c,powers,p,e,{top:s.camera.y,bottom:s.camera.y+540});c.restore();
   if(s.intro<5){if(p.tankUnlocked)root.ArcadeAdvancedForms.morph(c,480,350,Math.min(1,(s.intro-1)/2),170);title(c,'MISIÓN 5','BAJO EL ABISMO',s.intro<2?'El mini tanque sella su blindaje.':'Mini submarino listo · Flechas: nadar · J: atacar · Shift: impulso');}
   if(s.airlock>=0){c.fillStyle='#081825';c.globalAlpha=Math.sin(s.airlock/4*Math.PI)*.8;c.fillRect(0,0,960,540);c.globalAlpha=1;title(c,'SUBMARINO EN LAS PROFUNDIDADES','CÁMARA DE DESCOMPRESIÓN','Sellando la esclusa · Recuperando la forma terrestre');}
   if(s.ending>=0){if(s.ending>=6){const t=(s.ending-6)/8;root.ArcadeAdvancedForms.draw(c,{...p,form:'fighter',x:480,y:root.ArcadeSeaWar.FLOOR,anim:s.time,vx:0,grounded:true,facing:1,idleTime:9,transform:0,hurt:0,fighterPose:0,swimming:false,onMotorcycle:false,victoryAge:s.ending-6});for(let i=0;i<20;i++){c.fillStyle=i%2?'#78efe3':'#f9d08f';c.fillRect(480+Math.sin(i*2.4+t)*80,300+Math.cos(i*2.4+t)*85,3,3);}}title(c,'MISIÓN 5 COMPLETADA',s.ending<6?'EL CAPITÁN HA CAÍDO':'LUCHADOR DESBLOQUEADO',s.ending<6?'Su arsenal queda inutilizado.':'J: combo de puños · L: patadas · Disponible en todas las misiones');}
   c.restore();
  }
  return{draw,player,divers,naval,title};
 }
 root.ArcadeSeaRenderer={create};
})(window);


