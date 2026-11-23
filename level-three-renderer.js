(function(root){
 'use strict';
 const cuts={deck:[12,344,642,172],tower:[674,49,347,474],jet:[1027,313,509,208],cloud:[16,576,570,164],crate:[616,677,296,206],heli:[936,640,600,240]};
 function create(images){
  function art(c,key,x,y,w,h){c.drawImage(images.airAtlas,...cuts[key],Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function sky(c,w,h,time,camera){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#254566');g.addColorStop(.55,'#69a8c5');g.addColorStop(1,'#d1decc');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#ffedba';c.fillRect(w*.77,45,22,22);for(let i=0;i<7;i++){const span=w+650,x=((i*379-time*(10+i*2)-camera.x*.12)%span+span)%span-500;art(c,'cloud',x,70+(i*67)%(Math.max(160,h-60)),500,140);}root.ArcadeWorldLighting?.sky(c,{x:camera.x,y:camera.y},w,h,time,{mission:1});}
  // The insertion is drawn in world space on the very same plate that supports play.
  function insertSoldier(c,state,w,h){
    const L=root.ArcadeLevelThree,ground=state.geometry.platforms[0];
    const floor=root.ArcadePhysics.surfaceY(ground,L.INSERTION.x),t=state.introAge;
    const drop=L.insertion(t,w,h,floor);
    const actor={...state.player,x:drop.x,y:drop.y,grounded:drop.grounded,anim:t,landing:drop.landing,
      rope:drop.grounded?null:{},facing:1,aim:{x:1,y:0}};
    const paint=()=>root.ArcadeMissionKit.drawShooter(c,actor,{},state.combat,images,{},state.geometry.platforms);
    if(drop.rope>0){
      c.fillStyle='#3b3126';c.fillRect(Math.round(drop.heliX)-1,Math.round(drop.sill),2,Math.ceil((floor-drop.sill-4)*drop.rope));
    }
    if(drop.grounded)paint();
    else if(drop.y>drop.sill){
      c.save();c.beginPath();c.rect(actor.x-75,drop.sill,150,Math.ceil(drop.y-drop.sill)+2);c.clip();paint();c.restore();
    }
    const cabin=!drop.grounded&&drop.y-drop.sill<56?paint:null;
    root.ArcadeRescueHelicopter.draw(c,images.rescueHeli,drop.heliX,drop.sill,L.INSERTION.heliWidth,t,cabin);
  }
  // Raised walkways stand on riveted lattice towers, not bare posts: two legs
  // per tower, cross-bracing, a footing on the deck and a beam under the span.
  function gantry(c,p,t){
    const top=Math.round(p.y+30),base=620,legs=[Math.round(p.x+14),Math.round(p.x+p.w-34)];
    // Underside beam with hanging work lights.
    c.fillStyle='#1d262c';c.fillRect(Math.round(p.x+6),top,Math.round(p.w-12),7);c.fillStyle='#4d5e68';c.fillRect(Math.round(p.x+6),top,Math.round(p.w-12),2);c.fillStyle='#10171b';c.fillRect(Math.round(p.x+6),top+6,Math.round(p.w-12),1);
    for(let x=p.x+56;x<p.x+p.w-50;x+=96){const lx=Math.round(x),on=Math.sin(t*3+x)>-.6;c.fillStyle='#10171b';c.fillRect(lx,top+7,1,7);c.fillRect(lx-3,top+14,7,3);c.fillStyle=on?'#ffe7a3':'#7a6a45';c.fillRect(lx-2,top+17,5,2);}
    for(const x of legs){
      const w=20,h=base-top;
      // Footing plate bolted to the deck.
      c.fillStyle='#0b111680';c.fillRect(x-9,base,w+18,3);c.fillStyle='#12191d';c.fillRect(x-5,base-5,w+10,7);c.fillStyle='#5c6d77';c.fillRect(x-5,base-5,w+10,1);c.fillStyle='#e0a83a';for(let k=0;k<3;k++)c.fillRect(x-3+k*10,base-3,5,2);
      // Two chords with a lit edge and a shadowed edge.
      for(const cx of [x,x+w-4]){c.fillStyle='#17222a';c.fillRect(cx,top+7,4,h-7);c.fillStyle='#55707e';c.fillRect(cx,top+7,1,h-7);c.fillStyle='#0c1317';c.fillRect(cx+3,top+7,1,h-7);}
      // Zig-zag bracing and gusset plates at every bay.
      c.strokeStyle='#33454f';c.lineWidth=2;c.beginPath();let flip=false;
      for(let y=top+10;y<base-8;y+=22,flip=!flip){const y2=Math.min(base-6,y+22);c.moveTo(flip?x+2:x+w-2,y);c.lineTo(flip?x+w-2:x+2,y2);}
      c.stroke();c.strokeStyle='#6c8794';c.lineWidth=1;c.stroke();
      c.fillStyle='#1d2a32';for(let y=top+10;y<base-8;y+=22){c.fillRect(x-1,y-1,w+2,3);c.fillStyle='#6c8794';c.fillRect(x-1,y-1,w+2,1);c.fillStyle='#1d2a32';}
      // Knee braces spread the load into the span.
      c.strokeStyle='#33454f';c.lineWidth=2;c.beginPath();c.moveTo(x+2,top+26);c.lineTo(x-14,top+7);c.moveTo(x+w-2,top+26);c.lineTo(x+w+14,top+7);c.stroke();
    }
  }
  function draw(c,state,camera,w,h,loadout){const t=state.time;c.save();c.imageSmoothingEnabled=false;
   if(state.endingAge>=0){root.ArcadeMissionEndings.draw(c,images,state,w,h);c.restore();return;}
   const entering=state.introAge<root.ArcadeLevelThree.INSERTION.duration;
   sky(c,w,h,t,camera);
   const decor=root.ArcadeSceneryAnimation;
   if(decor&&!entering){
     if(decor.next){
       const gull=decor.next(state,'aire',t);
       decor.place(c,gull,camera.x*.10,h*.23+Math.sin(t*2)*3,w,52,.92,w+76);
     }
     const x=decor.pass(w*.16+120+t*28-camera.x*.10,w,100);
     if(x>-62&&x<w+62)decor.draw(c,'plane',t,x,h*.31+Math.sin(t*.46)*3,100,.78);
   }
   // A second carrier in the formation makes flight and the scale of the fleet visible during play.
   c.globalAlpha=.45;c.drawImage(images.carrier,w*.52-camera.x*.025,110,430,287);c.globalAlpha=1;
   c.save();c.translate(-Math.round(camera.x),-Math.round(camera.y));
   for(const x of [1330,2640,3690,4900]){if(x<camera.x-500||x>camera.x+w+300)continue;art(c,'tower',x-145,620-260,290,260);c.fillStyle=Math.sin(t*4+x)>0?'#ff8066':'#603b43';c.fillRect(x+36,358,4,4);c.save();c.translate(x+55,402);c.scale(Math.cos(t*1.8),1);c.strokeStyle='#9bc0c7';c.strokeRect(-19,-14,38,25);c.restore();}
   // The plating has a lit top face about 9 px tall. Raising the art by 7 px puts
   // every foot, footing and wreck on that face instead of on its upper edge.
   for(let x=Math.floor(camera.x/400)*400;x<Math.min(7800,camera.x+w+400);x+=400){art(c,'deck',x,613,402,140);c.fillStyle=Math.sin(t*5-x)>.4?'#8bedee':'#476c77';c.fillRect(x+70,624,5,3);}
   for(const p of state.geometry.platforms.slice(1)){if(p.x+p.w<camera.x||p.x>camera.x+w)continue;if(!p.solid)gantry(c,p,t);art(c,'deck',p.x,p.y-6,p.w,32);if(p.solid)art(c,'crate',p.x,p.y+13,p.w,620-p.y-13);}
   for(const x of [370,2130,4100,5660])if(x>camera.x-300&&x<camera.x+w+300){c.fillStyle='#0b111666';c.fillRect(x+30,618,180,4);art(c,'jet',x,554,240,66);}
   // A launch passes overhead, followed by the moving navigation lights of the escort.
   const jetX=(t*220)%9500-500;art(c,'jet',jetX,160-Math.sin(t*.4)*35,170,58);
   if(state.mecha?.active&&state.mecha.hp>0){
     for(const x of [6160,7620]){
       c.fillStyle='#26323b';c.fillRect(x-9,616,18,5);
       c.fillStyle=Math.sin(t*5)>0?'#ffc06a':'#a34e33';c.fillRect(x-6,615,12,2);
     }
   }
   if(state.mecha?.defeated){c.fillStyle="#adf7d699";c.fillRect(7510,390,3,230);c.fillStyle="#ddffe8";c.font="bold 13px monospace";c.textAlign="center";c.fillText("EXTRACCIÓN →",7490,385);}
   loadout(entering);if(entering)insertSoldier(c,state,w,h);c.restore();
   // Foreground wisps are fast, translucent, and kept away from the aiming centre.
   for(let i=0;i<3;i++){const span=w+1000,x=((i*580-t*(340+i*70))%span+span)%span-650;c.globalAlpha=.18;art(c,'cloud',x,i===1?h-70:20+i*31,650,125);}c.globalAlpha=1;
   c.restore();
  }
  return{draw};
 }
 root.ArcadeLevelThreeRenderer={create};
})(window);
