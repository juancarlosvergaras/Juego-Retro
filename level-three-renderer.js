(function(root){
 'use strict';
 const cuts={deck:[12,344,642,172],tower:[674,49,347,474],jet:[1027,313,509,208],cloud:[16,576,570,164],crate:[616,677,296,206],heli:[936,640,600,240]};
 function create(images){
  function art(c,key,x,y,w,h){c.drawImage(images.airAtlas,...cuts[key],Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function sky(c,w,h,time,camera){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#254566');g.addColorStop(.55,'#69a8c5');g.addColorStop(1,'#d1decc');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#ffedba';c.fillRect(w*.77,45,22,22);for(let i=0;i<7;i++){const span=w+650,x=((i*379-time*(10+i*2)-camera.x*.12)%span+span)%span-500;art(c,'cloud',x,70+(i*67)%(Math.max(160,h-60)),500,140);}root.ArcadeWorldLighting?.sky(c,{x:camera.x,y:camera.y},w,h,time,{mission:1});}
  function helicopter(c,x,y,time,scale=1){c.save();c.translate(x,y);art(c,'heli',-150*scale,-68*scale,300*scale,120*scale);c.fillStyle='#c9d4d4';const rotor=Math.sin(time*92)*138*scale;c.fillRect(-rotor,-50*scale,rotor*2,2);c.restore();}
  function draw(c,state,camera,w,h,loadout){const t=state.time;c.save();c.imageSmoothingEnabled=false;sky(c,w,h,t,camera);
   // A second carrier in the formation makes flight and the scale of the fleet visible during play.
   c.globalAlpha=.45;c.drawImage(images.carrier,w*.52-camera.x*.025,110,430,287);c.globalAlpha=1;
   c.save();c.translate(-Math.round(camera.x),-Math.round(camera.y));
   for(const x of [1330,2640,3690,4900]){if(x<camera.x-500||x>camera.x+w+300)continue;art(c,'tower',x-145,620-260,290,260);c.fillStyle=Math.sin(t*4+x)>0?'#ff8066':'#603b43';c.fillRect(x+36,358,4,4);c.save();c.translate(x+55,402);c.scale(Math.cos(t*1.8),1);c.strokeStyle='#9bc0c7';c.strokeRect(-19,-14,38,25);c.restore();}
   for(let x=Math.floor(camera.x/400)*400;x<Math.min(7800,camera.x+w+400);x+=400){art(c,'deck',x,620,402,140);c.fillStyle=Math.sin(t*5-x)>.4?'#8bedee':'#476c77';c.fillRect(x+70,624,5,3);}
   for(const p of state.geometry.platforms.slice(1)){if(p.x+p.w<camera.x||p.x>camera.x+w)continue;art(c,'deck',p.x,p.y,p.w,32);c.fillStyle='#33424b';c.fillRect(p.x+12,p.y+32,8,620-p.y-32);c.fillRect(p.x+p.w-20,p.y+32,8,620-p.y-32);if(p.solid)art(c,'crate',p.x,p.y+19,p.w,620-p.y-19);}
   for(const x of [370,2130,4100,5660])if(x>camera.x-300&&x<camera.x+w+300)art(c,'jet',x,552,240,66);
   // A launch passes overhead, followed by the moving navigation lights of the escort.
   const jetX=(t*220)%9500-500;art(c,'jet',jetX,160-Math.sin(t*.4)*35,170,58);
   if(state.mecha?.active&&state.mecha.hp>0){for(const x of [6160,7620]){c.fillStyle='#ffba6955';c.fillRect(x-3,250,6,370);c.fillStyle='#fff2a6';for(let y=280;y<620;y+=24)c.fillRect(x-2,y+(Math.floor(t*20)%16),4,8);}}
   if(state.mecha?.defeated){c.fillStyle="#adf7d699";c.fillRect(7510,390,3,230);c.fillStyle="#ddffe8";c.font="bold 13px monospace";c.textAlign="center";c.fillText("EXTRACCIÓN →",7490,385);}
   loadout();c.restore();
   // Foreground wisps are fast, translucent, and kept away from the aiming centre.
   for(let i=0;i<3;i++){const span=w+1000,x=((i*580-t*(340+i*70))%span+span)%span-650;c.globalAlpha=.18;art(c,'cloud',x,i===1?h-70:20+i*31,650,125);}c.globalAlpha=1;
   if(state.introAge<9){const a=state.introAge;c.fillStyle='#142b48';c.fillRect(0,0,w,h);sky(c,w,h,t,{x:0,y:0});const sw=Math.min(w*.88,(h-94)*1536/690),sh=sw*690/1536,sy=28+(h-94-sh)/2;c.drawImage(images.carrier,0,140,1536,690,(w-sw)/2,sy,sw,sh);helicopter(c,w*.19+Math.min(1,a/8)*w*.38,sy+sh*.17+Math.sin(a*3)*3,a,.44);c.fillStyle='#08131ac9';c.fillRect(0,0,w,26);c.fillRect(0,h-62,w,62);c.textAlign='center';c.fillStyle='#ffda85';c.font='bold 15px monospace';c.fillText('MISIÓN 3',w/2,h-40);c.fillStyle='#edf5ed';c.font='bold 25px monospace';c.fillText('GUERRA EN EL AIRE',w/2,h-14);c.font='11px monospace';c.fillText('Rumbo al portaaviones · '+Math.max(1,Math.ceil(9-a))+' s',w/2,18);}
   if(state.endingAge>=0)root.ArcadeMissionEndings?.draw(c,images,state,w,h);
   c.restore();
  }
  return{draw};
 }
 root.ArcadeLevelThreeRenderer={create};
})(window);
