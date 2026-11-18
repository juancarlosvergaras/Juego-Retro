(function(root){
 'use strict';
 const cuts={deck:[12,344,642,172],tower:[674,49,347,474],jet:[1027,313,509,208],cloud:[16,576,570,164],crate:[616,677,296,206],heli:[936,640,600,240]};
 function create(images){
  function art(c,key,x,y,w,h){c.drawImage(images.airAtlas,...cuts[key],Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function sky(c,w,h,time,camera){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#254566');g.addColorStop(.55,'#69a8c5');g.addColorStop(1,'#d1decc');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#ffedba';c.fillRect(w*.77,45,22,22);for(let i=0;i<7;i++){const span=w+650,x=((i*379-time*(10+i*2)-camera.x*.12)%span+span)%span-500;art(c,'cloud',x,70+(i*67)%(Math.max(160,h-60)),500,140);}root.ArcadeWorldLighting?.sky(c,{x:camera.x,y:camera.y},w,h,time,{mission:1});}
  function helicopter(c,x,y,time,scale=1,dir=-1){c.save();c.translate(Math.round(x),Math.round(y));c.scale(-dir,1);art(c,'heli',-150*scale,-68*scale,300*scale,120*scale);c.fillStyle='#c9d4d4';const rotor=Math.sin(time*92)*138*scale;c.fillRect(-rotor,-50*scale,rotor*2,2);c.restore();}
  const ease=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);},rnd=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  function burst(c,x,y,phase,seed){if(phase>.8)return;const grow=8+phase*34;for(let i=0;i<16;i++){const a=rnd(seed*3+i)*Math.PI*2,d=grow*(.3+rnd(seed+i*7)*.7);c.fillStyle=phase<.14?'#fff1c2':phase<.3?(i%2?'#ffb23f':'#ff7a2a'):(i%2?'#5b5f66':'#3a3d44');const size=phase<.3?4:rnd(seed+i)>.5?7:5;c.fillRect(Math.round(x+Math.cos(a)*d),Math.round(y+Math.sin(a)*d*.8),size,size);}}
  // Arrival: approach at speed, a run through anti-aircraft fire, a rope drop
  // onto the deck and the title. Nine seconds; Space skips to the landing.
  function intro(c,a,t,w,h){
    const flak=a>2.4&&a<6.2,shake=flak?2.5:a>7.5&&a<7.9?5:0,pass=[1.1,4.3].find(s=>a>s&&a<s+1.1);
    c.save();c.translate(Math.round((rnd(Math.floor(a*40))-.5)*shake*2),Math.round((rnd(Math.floor(a*40)+9)-.5)*shake*2));
    c.fillStyle='#142b48';c.fillRect(-10,-10,w+20,h+20);sky(c,w,h,t*4+a*6,{x:a*900,y:0});
    // The carrier grows as the helicopter closes in, then the shot pushes onto its deck.
    const near=ease((a-5.6)/2),k=(.5+.4*ease(a/5.5)+near*.75)*Math.min(w/1536,(h-60)/690),sw=1536*k,sh=690*k,sx=w*.56-sw*.5+near*w*.42,sy=h*.5-sh*.42+Math.sin(a*1.4)*4+near*h*.1;
    c.drawImage(images.carrier,0,140,1536,690,Math.round(sx),Math.round(sy),Math.round(sw),Math.round(sh));
    // Helicopter: steady at first, jinking through the flak, hovering for the drop.
    const hx=w*(.1+.26*ease(a/5.2))+near*w*.06,hy=h*.36+Math.sin(a*3)*3+(flak?Math.sin(a*11)*8:0),hs=.5+.18*ease(a/6);
    if(flak){
      for(let i=0;i<7;i++){const u=(a*2.4+i*.143)%1,ox=sx+sw*.45,oy=sy+sh*.45,ex=hx+(rnd(i+Math.floor(a*2.4))-.5)*160,ey=hy+(rnd(i+17)-.5)*90;c.fillStyle=i%2?'#ffe08a':'#ffb23f';c.fillRect(Math.round(ox+(ex-ox)*u),Math.round(oy+(ey-oy)*u),6,2);}
      for(let n=0;n<5;n++){const clock=a*2.6+n*.23,cycle=Math.floor(clock);burst(c,hx+(rnd(cycle*5+n)-.5)*220,hy+(rnd(cycle*11+n)-.5)*130,clock-cycle,cycle+n);}
    }
    // Rope drop: the hunter slides down from under the cabin and hits the deck.
    // He is drawn at the helicopter's own scale, so a man is a fraction of its length.
    if(a>5.9){const deck=sy+sh*.392,u=ease((a-6.3)/1.3),top=hy+30*hs,s=.36*hs,tall=145*s,y=top+tall*.4+(deck-top-tall*.4)*u,landed=a>7.6;
      c.fillStyle='#1a2026';c.fillRect(Math.round(hx)-1,Math.round(top),2,Math.round((landed?deck-tall*.5:y-tall*.8)-top));
      const sheet=images.soldier,frames=root.SOLDIER_V2_FRAMES;
      if(sheet&&frames){const f=landed?frames[4][a<7.8?3:4]:frames[4][0];c.drawImage(sheet,f[0],f[1],f[2],f[3],Math.round(hx-f[2]*s/2),Math.round((landed?deck:y)-f[3]*s),Math.round(f[2]*s),Math.round(f[3]*s));}
      if(landed&&a<8.2){const p=(a-7.6)/.6;c.fillStyle='#d9d3c2';for(let i=0;i<10;i++)c.fillRect(Math.round(hx+(rnd(i)-.5)*46*(.3+p)),Math.round(deck-2-p*rnd(i+4)*12),3,2);}
    }
    helicopter(c,hx,hy,a,hs,1);
    // Escort jets tear across the foreground twice.
    if(pass!==undefined){const u=(a-pass)/1.1;art(c,'jet',w*1.25-u*(w*1.9),h*(pass<2?.62:.12),w*.62,w*.62*208/509);}
    for(let i=0;i<4;i++){const span=w+1100,x=((i*520-(t*4+a*6)*(420+i*90))%span+span)%span-700;c.globalAlpha=.22;art(c,'cloud',x,i%2?h-90:10+i*26,700,135);}c.globalAlpha=1;
    c.restore();
    // Letterbox, warning strip and the title slam.
    c.fillStyle='#05080d';c.fillRect(0,0,w,26);c.fillRect(0,h-34,w,34);c.textAlign='center';
    if(flak&&Math.floor(a*6)%2){c.fillStyle='#b3261e';c.fillRect(0,26,w,16);c.fillStyle='#ffe9c4';c.font='bold 11px monospace';c.fillText('¡ARTILLERÍA ANTIAÉREA! · MANIOBRA EVASIVA',w/2,38);}
    c.fillStyle='#9fb4c4';c.font='10px monospace';c.fillText(a<7.6?'Rumbo al portaaviones · Espacio para saltar la entrada':'En cubierta',w/2,17);
    if(a>7.7){const u=Math.min(1,(a-7.7)/.35),flash=Math.max(0,1-(a-7.7)/.5);if(flash>0){c.fillStyle='rgba(255,246,228,'+(flash*.8).toFixed(3)+')';c.fillRect(0,0,w,h);}
    }
    c.textAlign='start';
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
  function draw(c,state,camera,w,h,loadout){const t=state.time;c.save();c.imageSmoothingEnabled=false;sky(c,w,h,t,camera);
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
   if(state.mecha?.active&&state.mecha.hp>0){for(const x of [6160,7620]){c.fillStyle='#ffba6955';c.fillRect(x-3,250,6,370);c.fillStyle='#fff2a6';for(let y=280;y<620;y+=24)c.fillRect(x-2,y+(Math.floor(t*20)%16),4,8);}}
   if(state.mecha?.defeated){c.fillStyle="#adf7d699";c.fillRect(7510,390,3,230);c.fillStyle="#ddffe8";c.font="bold 13px monospace";c.textAlign="center";c.fillText("EXTRACCIÓN →",7490,385);}
   loadout();c.restore();
   // Foreground wisps are fast, translucent, and kept away from the aiming centre.
   for(let i=0;i<3;i++){const span=w+1000,x=((i*580-t*(340+i*70))%span+span)%span-650;c.globalAlpha=.18;art(c,'cloud',x,i===1?h-70:20+i*31,650,125);}c.globalAlpha=1;
   if(state.introAge<9)intro(c,state.introAge,t,w,h);
   if(state.endingAge>=0)root.ArcadeMissionEndings?.draw(c,images,state,w,h);
   c.restore();
  }
  return{draw};
 }
 root.ArcadeLevelThreeRenderer={create};
})(window);
