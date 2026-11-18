(function(root){
 'use strict';
 function create(images){const atlas=root.ArcadeAdvancedForms.atlas,divers=atlas(images.divers),naval=atlas(images.naval,4,3),captain=atlas(images.captain,4,4,{y:[0,345/1254,627/1254,971/1254,1],x:{1:[0,.25,602/1254,.75,1]}}),zombie=atlas(images.zombie,6,6);
  // The exterior ship is wider than one grid cell; its own row uses unequal slots.
  const n=images.naval;naval[8]=[0,Math.round(n.height*2/3),Math.round(n.width*.39),Math.round(n.height/3)];naval[9]=[Math.round(n.width*.4),Math.round(n.height*2/3),Math.round(n.width*.19),Math.round(n.height/3)];naval[10]=[Math.round(n.width*.595),Math.round(n.height*2/3),Math.round(n.width*.205),Math.round(n.height/3)];naval[11]=[Math.round(n.width*.81),Math.round(n.height*2/3),Math.round(n.width*.19),Math.round(n.height/3)];
  function trim(image,frames,indices){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const g=canvas.getContext('2d');g.drawImage(image,0,0);const data=g.getImageData(0,0,canvas.width,canvas.height).data;for(const i of indices){const f=frames[i],x0=Math.ceil(f[0]),y0=Math.ceil(f[1]),x1=Math.min(image.width,Math.floor(f[0]+f[2])),y1=Math.min(image.height,Math.floor(f[1]+f[3]));let l=x1,r=x0,t=y1,b=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*image.width+x)*4+3]>200){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}if(r>l)frames[i]=[l,t,r-l+1,b-t+1];}}
  trim(images.naval,naval,[8,9,10,11]);
  function sprite(c,img,f,x,y,scale,flip=false,angle=0){c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip?-1:1,1);c.rotate(angle);c.drawImage(img,...f,-Math.round(f[2]*scale/2),-Math.round(f[3]*scale),Math.round(f[2]*scale),Math.round(f[3]*scale));c.restore();}
  function title(c,small,big,detail){c.fillStyle='#071b2de8';c.fillRect(0,0,960,64);c.fillRect(0,445,960,95);c.textAlign='center';c.fillStyle='#8ce7ef';c.font='bold 14px monospace';c.fillText(small,480,30);c.fillStyle='#ecf9ef';c.font='bold 28px monospace';c.fillText(big,480,483);c.fillStyle='#c5dce2';c.font='12px monospace';c.fillText(detail,480,517);}
  function background(c,s){const img=images.sea,half=Math.floor(img.height/2);if(s.inside){c.drawImage(img,0,half,img.width,half,0,0,960,540);return;}
   const cam=s.camera,tile=1500,offset=-(cam.x*.19%tile);for(let x=offset;x<960;x+=tile)c.drawImage(img,0,0,img.width,half,Math.round(x),0,tile,540);
   c.fillStyle='#010c22';c.globalAlpha=Math.min(.57,cam.y/3500);c.fillRect(0,0,960,540);c.globalAlpha=1;
   for(let i=0;i<7;i++){c.fillStyle='#79e9fa';c.globalAlpha=.035+(1-cam.y/2400)*.04;c.beginPath();const x=i*190-(cam.x*.05%190);c.moveTo(x,0);c.lineTo(x+25,0);c.lineTo(x+180,540);c.lineTo(x+60,540);c.fill();}c.globalAlpha=1;
   for(let i=0;i<38;i++){const x=((i*173-cam.x*.35+s.time*7)%1040+1040)%1040-30,y=((i*91-cam.y*.27-s.time*(8+i%9))%590+590)%590;c.strokeStyle=i%3?'#78bfcd55':'#c0f9ff88';c.strokeRect(Math.round(x),Math.round(y),2+i%3,2+i%3);}
  }
  function player(c,s,p){if(p.cloak>0&&Math.floor(p.cloak*9)%4!==0)return;if(root.ArcadeFormTransition?.compose(c,{...p,swimming:!s.inside,onMotorcycle:false},q=>player(c,s,q),s.inside?'ground':'swim'))return;if(p.hurt>0&&Math.floor(s.time*18)%2)c.globalAlpha=.45;
   if(root.ArcadeFormTransition?.draw(c,p)){c.globalAlpha=1;return;}
   if(root.ArcadeAdvancedForms.draw(c,p)){c.globalAlpha=1;return;}
   if(!s.inside&&p.form==='robot'){root.ArcadeRobotForm.draw(c,p);root.ArcadeWeaponRenderer.draw(c,p,{inventory:s.inventory,flash:s.flash});}
   else if(!s.inside){const row=p.form==='wolf'?1:p.form==='zombie'?2:p.form==='robot'?3:0,f=divers[row*4+Math.floor(s.time*(Math.hypot(p.vx,p.vy)>1?8:3))%4],scale=104/divers[row*4][2];sprite(c,images.divers,f,p.x,p.y,scale,p.facing<0,Math.max(-.16,Math.min(.16,p.vy*.0008*p.facing)));}
   else if(p.form==='robot'){root.ArcadeRobotForm.draw(c,p);root.ArcadeWeaponRenderer.draw(c,p,{inventory:s.inventory,flash:s.flash});}
   else if(p.form==='zombie'){const row=Math.abs(p.vx)>8?1:0,f=zombie[row*6+Math.floor(s.time*(row?8:3))%6];sprite(c,images.zombie,f,p.x,p.y,64/zombie[0][3],p.facing<0);}
   else{const wolf=p.form==='wolf',row=wolf?(s.flash>0?3:Math.abs(p.vx)>8?1:0):!p.grounded?3:Math.abs(p.vx)>8?1:0,fs=wolf?root.ACTION_FRAMES.wolf:root.SOLDIER_V2_FRAMES,col=wolf&&row===0?7:Math.floor(s.time*(row===1?9:4))%fs[row].length,f=fs[row][col];sprite(c,wolf?images.wolf:images.soldier,f,p.x,p.y,wolf?.48:root.SOLDIER_V2_SCALE,p.facing<0);if(!wolf)root.ArcadeWeaponRenderer.draw(c,p,{inventory:s.inventory,flash:s.flash});}
   c.globalAlpha=1;
  }
  function boss(c,s){const b=s.boss,phase=b.phase;let index=phase==='arrival'||phase==='dash'||phase==='recover'?Math.floor(s.time*7)%4:phase==='gun'?4+Math.floor(b.age*12)%4:phase.includes('missile')?8:phase==='grenadeWarn'?9:phase==='grenade'?10:phase==='dashWarn'?11:0;if(s.ending>=0)index=s.ending<1?12:s.ending<3?13:14;
   if(s.ending>=6)return;c.save();if(b.hit>0)c.filter='brightness(1.4)';sprite(c,images.captain,captain[index],b.x,b.y,116/captain[0][3],b.facing>0);c.restore();
   if(s.ending>=0)return;if(phase==='gun'&&b.shot>.12)root.ArcadeBossAttackSprites?.draw(c,'blast',s.time,b.x+b.facing*35,b.y-b.h*.62,30,23);if(phase==='dash')root.ArcadeBossAttackSprites?.draw(c,'shock',s.time,b.x,b.y,100,32,{ground:true});
   if(phase==='missileWarn')for(const x of b.targets){c.fillStyle='#ff63574d';c.fillRect(x-30,80,60,root.ArcadeSeaWar.FLOOR-80);c.strokeStyle='#ff9686';c.strokeRect(x-29,root.ArcadeSeaWar.FLOOR-27,58,26);c.font='bold 12px monospace';c.textAlign='center';c.fillStyle='#ffe0b5';c.fillText('↓',x,root.ArcadeSeaWar.FLOOR-40);}
   const warning={arrival:'CAPITÁN DEL ABISMO',gunWarn:'RÁFAGA · SALTA O CAMBIA DE POSICIÓN',missileWarn:'MISILES · SAL DE LAS MARCAS',grenadeWarn:'GRANADA ELÉCTRICA',dashWarn:'CARGA · SALTA POR ENCIMA'}[phase];if(warning){c.fillStyle='#0c182ee6';c.fillRect(190,105,580,29);c.fillStyle='#ffd089';c.font='bold 13px monospace';c.textAlign='center';c.fillText(warning,480,124);}
  }
  function effects(c,s){for(const f of s.effects){const age=f.max-f.life,fx=root.ArcadeBossAttackSprites;if(f.color==='ray'){fx?.beam(c,'lightning',s.time,f.x,f.y,f.tx,f.ty,20);continue;}fx?.draw(c,f.color==='plasma'?'plasma':f.color==='dust'?'shock':f.color==='claw'?'slash':'blast',age,f.x,f.y,Math.max(20,f.size*2),Math.max(20,f.size*1.5),{loop:false,duration:f.max,alpha:Math.min(1,f.life*5)});}}
  function draw(c,s,p,e,powers,profile){s.inventory=e.inventory;c.save();c.imageSmoothingEnabled=false;
   if(!s.inside){s.camera.x=Math.max(0,Math.min(root.ArcadeSeaWar.WIDTH-960,p.x-340));s.camera.y=Math.max(0,Math.min(root.ArcadeSeaWar.HEIGHT-540,p.y-280));}else{s.camera.x=0;s.camera.y=0;}
   background(c,s);c.save();c.translate(-Math.round(s.camera.x),-Math.round(s.camera.y));const visible=(x,y,margin=160)=>x>s.camera.x-margin&&x<s.camera.x+960+margin&&y>s.camera.y-margin&&y<s.camera.y+540+margin;
   if(!s.inside){
    // Full hull is visible before the entry trigger: the boss is inside this ship.
    if(visible(11200,3060,700)){sprite(c,images.naval,naval[8],11180,3080,900/naval[8][2]);sprite(c,images.naval,naval[s.airlock>=0?10:9],11280,2950,85/naval[9][2]);c.fillStyle='#b8eeeb';c.textAlign='center';c.font='bold 14px monospace';c.fillText('ESCLUSA →',11280,2802);}
    for(let i=0;i<3;i++){const cp=root.ArcadeSeaWar.stations[i];if(visible(cp.x,cp.y)){sprite(c,images.naval,naval[11],cp.x,cp.y,60/naval[11][3]);c.fillStyle=i<=s.checkpoint?'#a3f2ba':'#d5eaf0';c.textAlign='center';c.font='10px monospace';c.fillText(i<=s.checkpoint?'CHECK POINT ✓':'CHECK POINT',cp.x,cp.y-66);}}
    for(const item of s.pickups)if(!s.taken.has(item.id)&&visible(item.x,item.y))root.ArcadePickupRenderer.draw(c,{...item,amount:3,y:item.y+Math.sin(s.time*3)*4},s.time,p);
    for(const m of s.mines)if(m.active&&visible(m.x,m.y)){sprite(c,images.naval,naval[6],m.x,m.y+25+Math.sin(s.time*2+m.x)*3,48/naval[6][2]);}
    for(const n of s.enemies)if(visible(n.x,n.y)&&n.deadAge<.7){c.save();if(n.hit>0)c.filter='brightness(1.7)';if(n.hp<=0)c.globalAlpha=Math.max(0,1-n.deadAge/.7);if(n.type==='shark'){const index=n.phase==='breach'?15:n.phase==='rush'||n.phase==='warn'?14:12+Math.floor(n.age*7)%2;root.ArcadeExpansionEnemies.sprite(c,images.expansion,index,n.x,n.y,58,n.facing>0);if(n.phase==='warn'){c.fillStyle='#ffbf7b';c.font='bold 16px monospace';c.fillText('!',n.x,n.y-80);}c.restore();continue;}if(n.type==='diver'&&root.ArcadeExpansionEnemies.drawDiver(c,n,n.age)){c.restore();continue;}const i=n.type==='sub'?(n.shot<.2?5:4):Math.floor(n.age*7)%4;const scale=n.w/(n.type==='sub'?naval[4][2]:naval[0][2]);sprite(c,images.naval,naval[i],n.x,n.y,scale,n.facing>0);c.restore();}
   }else boss(c,s);
   for(const pool of s.pools){c.globalAlpha=Math.min(.7,pool.life);c.fillStyle='#67dd8b';for(let i=0;i<10;i++)c.fillRect(pool.x-50+i*10,pool.y-6+Math.sin(i+s.time*4)*2,12,6);c.globalAlpha=1;}
   for(const h of s.hazards)root.ArcadeBossAttackSprites?.draw(c,h.age<.75?'grenade':'electric',h.age,h.x,h.y,h.age<.75?23:h.radius*2,h.age<.75?23:50,{ground:true});
   if(s.ending<6)player(c,s,p);
   for(const b of s.bullets){if(root.ArcadeBossAttackSprites?.projectile(c,b,s.time))continue;c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(Math.atan2(b.vy,b.vx));c.fillStyle=b.plasma?'#8bf396':b.enemy?'#ff705d':'#c4fcff';c.fillRect(-8,-2,b.slot===6||b.type==='missile'||b.type==='torpedo'?22:11,b.superCannon?7:4);c.fillStyle='#fff5d0';c.fillRect(5,-1,4,2);if(!s.inside){c.strokeStyle='#a4f4ff66';for(let j=1;j<5;j++)c.strokeRect(-10-j*9,-2+j%2,3,3);}c.restore();}
   effects(c,s);if(powers&&s.ending<0)root.ArcadePowers.draw(c,powers,p,e,{top:s.camera.y,bottom:s.camera.y+540});c.restore();
   if(s.intro<5){if(p.tankUnlocked)root.ArcadeAdvancedForms.morph(c,480,350,Math.min(1,(s.intro-1)/2),170);title(c,'MISIÓN 5','BAJO EL ABISMO',s.intro<2?'El mini tanque sella su blindaje.':'Mini submarino listo · Flechas: nadar · J: atacar · Shift: impulso');}
   if(s.airlock>=0){c.fillStyle='#081825';c.globalAlpha=Math.sin(s.airlock/4*Math.PI)*.8;c.fillRect(0,0,960,540);c.globalAlpha=1;title(c,'SUBMARINO EN LAS PROFUNDIDADES','CÁMARA DE DESCOMPRESIÓN','Sellando la esclusa · Recuperando la forma terrestre');}
   if(s.ending>=0){if(s.ending>=6){const t=(s.ending-6)/8;root.ArcadeAdvancedForms.draw(c,{...p,form:'fighter',x:480,y:root.ArcadeSeaWar.FLOOR,anim:s.time,vx:0,grounded:true,facing:1,idleTime:9,transform:0,hurt:0,fighterPose:0,swimming:false,onMotorcycle:false,victoryAge:s.ending-6});for(let i=0;i<20;i++){c.fillStyle=i%2?'#78efe3':'#f9d08f';c.fillRect(480+Math.sin(i*2.4+t)*80,300+Math.cos(i*2.4+t)*85,3,3);}}title(c,'MISIÓN 5 COMPLETADA',s.ending<6?'EL CAPITÁN HA CAÍDO':'LUCHADOR DESBLOQUEADO',s.ending<6?'Su arsenal queda inutilizado.':'J: combo de puños · L: patadas · Disponible en todas las misiones');}
   c.restore();
  }
  return{draw,player,divers,naval,captain,title};
 }
 root.ArcadeSeaRenderer={create};
})(window);


