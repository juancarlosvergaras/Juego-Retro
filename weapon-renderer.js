(function(root){
  'use strict';
  function axePickup(ctx,x,y){
    // A long diagonal wooden haft and a single broad, bearded steel blade.
    // Integer steps keep the silhouette sharp at the game's native resolution.
    ctx.save();ctx.translate(Math.round(x)-16,Math.round(y)-15);
    const shape=(color,points)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([px,py],i)=>ctx[i?'lineTo':'moveTo'](px,py));ctx.closePath();ctx.fill();};
    shape('#151b1b',[[16,5],[21,8],[18,13],[7,29],[4,31],[0,28],[2,24],[13,9]]);
    shape('#70502f',[[16,8],[19,9],[16,14],[5,28],[2,27],[5,22]]);
    shape('#ba8a4c',[[16,8],[17,9],[13,15],[4,27],[2,27],[5,22]]);
    shape('#dfb875',[[15,10],[16,10],[12,16],[6,23],[5,23]]);
    shape('#202829',[[10,3],[13,0],[17,1],[21,4],[25,4],[29,2],[31,3],[32,7],[32,12],[30,16],[26,18],[23,17],[21,13],[17,11],[14,9],[11,8]]);
    shape('#51646a',[[11,4],[13,2],[17,3],[21,6],[26,6],[29,4],[30,7],[30,12],[28,15],[26,16],[24,15],[22,11],[17,9],[14,7],[12,7]]);
    shape('#91a7a8',[[14,2],[17,3],[21,6],[26,6],[29,4],[30,7],[29,11],[27,13],[24,13],[22,10],[17,8],[14,6]]);
    shape('#d4dfd3',[[29,4],[30,7],[30,12],[28,15],[26,16],[24,15],[23,12],[26,13],[28,11],[29,8]]);
    shape('#edf0db',[[30,7],[31,7],[31,12],[29,15],[26,17],[26,16],[28,14],[30,11]]);
    shape('#34454b',[[15,4],[18,6],[18,9],[16,8],[14,6]]);
    ctx.fillStyle='#b9c7bd';ctx.fillRect(12,3,2,2);
    ctx.restore();
  }
  const itemSprites=new Map();
  function itemArtwork(ctx,slot){
    const ink='#151e22',shadow='#34454b',steel='#657d83',light='#aabdbc',edge='#e1e6d6',wood='#946538',grain='#c79453',darkWood='#513826',olive='#657342',oliveLight='#a6ae6c';
    const r=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    const shape=(color,points)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x,y));ctx.closePath();ctx.fill();};
    const line=(color,points,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='miter';ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x,y));ctx.stroke();};
    if(slot===2){axePickup(ctx,22,17);return;}
    if(slot===1){
      shape(ink,[[5,27],[15,17],[14,15],[17,12],[20,14],[30,4],[38,1],[35,10],[24,21],[26,24],[23,27],[20,24],[11,33],[7,33],[4,30]]);
      shape(wood,[[7,27],[16,19],[20,23],[11,31],[8,31],[6,29]]);
      shape(grain,[[7,27],[16,19],[17,21],[8,29]]);
      line(darkWood,[[9,26],[12,28]]);line(darkWood,[[12,23],[15,25]]);line(darkWood,[[14,21],[17,23]]);
      shape(shadow,[[18,15],[30,5],[36,3],[33,10],[23,20]]);
      shape(steel,[[20,16],[31,6],[36,3],[32,10],[22,19]]);
      shape(edge,[[36,3],[33,10],[23,20],[21,18],[24,17],[32,9]]);
      shape(light,[[15,16],[17,14],[24,23],[23,25]]);r(8,28,2,2,edge);
    }else if(slot===3){
      shape(ink,[[7,8],[12,8],[12,6],[15,6],[16,8],[35,8],[35,6],[38,6],[38,9],[40,9],[40,16],[29,16],[27,21],[23,22],[21,31],[10,31],[12,23],[14,18],[9,18],[9,15],[7,15]]);
      r(9,9,29,6,shadow);r(10,9,27,2,light);r(10,11,26,2,steel);r(30,11,6,2,'#879b9e');r(37,11,2,3,ink);
      r(18,10,7,3,ink);r(19,10,5,1,'#8a9b95');for(let x=11;x<17;x+=2)r(x,11,1,3,light);
      shape(steel,[[13,15],[29,15],[27,19],[24,20],[21,19],[20,17],[13,18]]);
      shape(ink,[[22,17],[27,17],[26,20],[23,20]]);r(23,17,1,2,light);
      shape(darkWood,[[15,19],[23,20],[20,29],[12,29]]);shape(wood,[[16,19],[21,20],[18,28],[13,28]]);
      line(grain,[[16,21],[14,26]]);r(16,24,2,2,edge);r(12,29,8,1,steel);r(35,7,2,1,edge);
    }else if(slot===4){
      shape(ink,[[1,17],[12,14],[15,14],[15,11],[38,11],[38,9],[41,9],[41,11],[43,11],[43,16],[34,16],[34,21],[24,21],[22,18],[18,18],[19,25],[14,26],[13,20],[9,21],[3,25],[1,25]]);
      shape(darkWood,[[3,18],[12,16],[15,17],[12,19],[8,20],[3,23]]);shape(wood,[[3,18],[11,16],[12,18],[8,19],[3,21]]);line(grain,[[4,18],[10,17]]);r(2,18,1,6,steel);
      r(15,12,27,3,shadow);r(16,12,25,1,light);r(24,15,15,2,steel);r(40,12,2,3,ink);r(38,10,2,1,edge);
      r(14,14,10,5,steel);r(16,14,6,2,light);r(19,15,4,2,ink);r(16,18,2,5,wood);r(17,18,5,3,ink);r(18,18,2,1,light);
      r(25,17,10,4,darkWood);r(25,17,9,2,grain);r(25,19,9,1,wood);for(let x=26;x<34;x+=2)r(x,18,1,3,darkWood);
    }else if(slot===5){
      shape(ink,[[1,15],[9,12],[13,14],[14,11],[21,11],[22,8],[25,8],[25,10],[36,10],[36,8],[39,8],[39,12],[43,12],[43,16],[33,16],[31,18],[25,18],[26,24],[29,27],[27,31],[22,29],[20,24],[19,19],[16,19],[16,25],[11,26],[12,19],[10,18],[4,22],[1,22]]);
      shape(darkWood,[[3,16],[9,14],[13,15],[10,17],[4,20],[3,20]]);shape(wood,[[3,16],[9,14],[10,16],[4,18]]);line(grain,[[4,16],[8,15]]);r(2,16,1,5,steel);
      r(14,12,16,6,shadow);r(15,12,14,1,light);r(14,14,11,2,steel);r(21,14,6,2,ink);r(22,14,3,1,light);
      r(29,12,13,3,steel);r(30,12,11,1,light);r(41,12,2,3,ink);r(36,9,2,3,steel);r(22,9,2,2,light);
      r(27,15,8,3,darkWood);r(27,15,7,1,grain);r(28,16,5,1,wood);r(13,19,2,5,wood);r(14,19,1,3,grain);
      shape(shadow,[[20,18],[24,18],[25,24],[27,28],[26,29],[23,27],[21,23]]);line(light,[[21,19],[23,25],[26,28]]);line(steel,[[23,19],[24,24],[27,27]]);
      r(16,18,4,3,ink);r(17,18,1,1,light);
    }else if(slot===6){
      r(2,11,40,11,ink);r(1,12,3,9,ink);r(3,12,37,8,'#3b4831');r(4,12,35,2,oliveLight);r(4,14,35,4,olive);r(4,18,35,2,'#435334');
      r(2,12,3,9,shadow);r(3,12,1,8,light);r(39,10,4,13,ink);r(39,11,3,11,steel);r(40,12,2,9,edge);r(40,14,1,5,ink);
      for(const x of [10,31]){r(x,11,3,11,ink);r(x,12,1,8,steel);r(x+1,12,1,2,light);}
      r(18,7,9,4,ink);r(19,8,6,2,steel);r(20,8,4,1,edge);r(18,21,5,8,ink);r(19,22,3,5,wood);r(19,22,1,4,grain);
      r(23,22,6,5,ink);r(25,23,3,2,steel);r(24,22,1,3,oliveLight);r(15,15,5,3,'#b8b36e');r(16,16,3,1,'#ded49a');
    }else if(slot===7){
      line(ink,[[15,1],[20,4],[26,10],[28,17],[26,24],[20,30],[15,33]],5);
      line(darkWood,[[15,2],[20,5],[24,11],[26,17],[24,23],[20,29],[15,32]],3);
      line(grain,[[15,2],[20,5],[24,11],[26,17],[24,23],[20,29],[15,32]],1);
      line('#e0c994',[[15.5,3],[9.5,17],[15.5,31]],1);r(24,13,4,8,ink);r(25,14,2,6,wood);for(let y=14;y<21;y+=2)r(25,y,2,1,light);
      r(6,16,31,3,ink);r(7,17,29,1,grain);shape(ink,[[35,13],[42,17],[35,21]]);shape(light,[[36,15],[40,17],[36,19]]);r(36,16,3,1,edge);
      shape('#b7c4b5',[[6,13],[12,16],[8,16],[4,14]]);shape(steel,[[6,21],[12,18],[8,18],[4,20]]);
    }else if(slot===8){
      shape(ink,[[1,21],[10,17],[15,15],[27,14],[28,18],[19,20],[17,27],[11,27],[12,22],[6,26],[2,26]]);
      shape(darkWood,[[3,22],[11,19],[17,18],[18,20],[15,25],[13,25],[14,21],[6,24],[3,24]]);line(grain,[[4,22],[12,19],[16,19]]);
      line(ink,[[20,2],[26,6],[30,12],[31,17],[30,22],[26,28],[20,32]],5);
      line(steel,[[20,3],[25,7],[28,12],[29,17],[28,22],[25,27],[20,31]],3);
      line(light,[[20,3],[25,7],[28,12],[29,17],[28,22],[25,27],[20,31]],1);
      line('#c9b888',[[20.5,4],[14.5,17],[20.5,30]],1);
      r(11,14,29,6,ink);r(12,15,27,3,shadow);r(13,15,25,1,light);r(15,16,23,1,wood);r(14,18,11,1,steel);
      r(12,16,28,1,grain);shape(edge,[[38,14],[43,16],[38,18]]);r(18,13,4,2,ink);r(19,13,2,1,light);r(28,17,3,2,light);
    }else if(slot===9){
      // Steel safety ring, lever and segmented olive casing.
      line(ink,[[23,3],[27,2],[31,4],[31,7],[27,9],[24,7],[23,3]],3);line(light,[[24,3],[27,3],[30,5],[30,7],[27,8],[25,6],[24,3]]);
      r(16,4,9,7,ink);r(17,5,7,4,steel);r(18,5,5,1,edge);
      shape(ink,[[16,9],[25,9],[30,14],[32,26],[28,32],[13,32],[9,27],[10,15]]);
      shape('#3d4d30',[[16,11],[25,11],[28,15],[30,26],[27,30],[14,30],[11,26],[12,16]]);
      shape(olive,[[16,12],[23,12],[26,16],[27,27],[24,30],[14,29],[12,25],[13,16]]);
      for(const [x,y,w,h] of [[16,12,4,4],[21,12,3,4],[13,17,6,5],[21,17,5,5],[13,24,6,4],[21,24,6,4]]){r(x,y,w,h,'#526639');r(x,y,w,1,oliveLight);r(x,y,1,h,'#80914d');}
      shape(ink,[[22,7],[26,7],[30,13],[32,25],[29,26],[27,15]]);shape(light,[[23,8],[25,8],[29,14],[31,24],[30,24],[27,14]]);r(17,7,6,2,shadow);r(18,7,4,1,light);
    }
  }
  function itemSprite(slot){
    if(!itemSprites.has(slot)){const image=document.createElement('canvas');image.width=44;image.height=34;itemArtwork(image.getContext('2d'),slot);itemSprites.set(slot,image);}
    return itemSprites.get(slot);
  }
  function draw(ctx,p,e,body,frames,row,frame,scale){
    if(p.form==='hero'||p.form==='tank'||p.form==='fighter')return;
    if(p.form==='robot'&&!e.robotArm){
      const R=root.ArcadeRobotForm,inv=e.inventory;
      // On a motorcycle or in the water the body is a different drawing; keep the simple mount there.
      if(!R?.hands||p.onMotorcycle||p.swimming){const slots=[inv.selected,R?.secondary(inv)];for(let i=0;i<slots.length;i++){const slot=slots[i];if(slot<3||!slot)continue;const a=p.aim||{x:p.facing,y:0};ctx.save();const k=p.onMotorcycle?.8:1;ctx.translate(p.x+(p.onMotorcycle?p.facing*12:0)+a.x*i*8*k,p.y-(p.onMotorcycle?64:p.swimming?22:p.crouching?23:35)+(i*8+a.y*i*8)*k);ctx.scale(p.facing*k,k);ctx.rotate(Math.atan2(a.y,a.x*p.facing));ctx.drawImage(itemSprite(slot),10,-17,44,34);ctx.fillStyle='#a7b3b3';ctx.fillRect(4,-2,14,4);if(e.flash>0){ctx.fillStyle='#ffdd83';ctx.fillRect(49,-2,6,4);}ctx.restore();}return;}
      // Each fist holds a real weapon by its grip and turns it at the wrist. The
      // far arm is drawn first so the near one overlaps it, as the body does.
      const fists=R.hands(p,e),slots=[inv.selected,R.secondary(inv)],motion=R.motion(p,e);
      for(const arm of [1,0]){const slot=slots[arm];if(!slot||slot<3||!fists[arm])continue;
        const action=e.weaponAction&&e.weaponAction.age<.5?{...e.weaponAction,slot}:null;
        draw(ctx,{...p,form:'soldier',y:p.y+(motion.bob||0)},{inventory:{...inv,selected:slot},weaponAction:action,robotArm:arm+1,hand:{x:fists[arm].x-(motion.kick||0)*1.5,y:fists[arm].y*(motion.stretch||1)},chrome:true});}
      return;
    }
    const slot=e.inventory.selected,active=e.weaponAction&&e.weaponAction.slot===slot?e.weaponAction:null;
    const age=active?active.age:10,rate=active?active.duration:1;
    const facing=p.facing,aim=p.aim||{x:facing,y:0};
    const h=p.aimHeight||28;
    const recoil=age<.16?Math.sin(Math.min(1,age/.16)*Math.PI)*(slot===4||slot===6?3:1.5):0;
    const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(facing,1);
    // Mirroring before rotation keeps stocks and grips upright when facing left.
    const angle=Math.atan2(aim.y,aim.x*facing);
    let actionAngle=angle;
    if(slot<=2)actionAngle=age<rate?-.9+Math.min(1,age/(rate*.65))*1.7:.5;
    if(slot===9)actionAngle=age<.35?angle-.65*(1-age/.35):angle+.25;
    let supportX=slot===7?19:slot===6?14:18;
    if(slot===4&&age>.14&&age<.5)supportX-=Math.sin((age-.14)/.36*Math.PI)*6;
    const hand=e.pickup?{x:0,y:0}:e.hand||root.ArcadeSoldierAnimation.grip(p,{},e),grip=e.pickup?{x:slot<=2?22:slot===7?20:slot===9?16:13,y:0}:root.ArcadeSoldierAnimation.weaponGrip(slot);
    if(e.pickup)actionAngle=0;
    if(slot===7&&!e.pickup){
      // Extend the support arm along the aiming direction, keeping the bow clear of the torso.
      const dx=Math.cos(actionAngle),dy=Math.sin(actionAngle);
      ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hand.x-dx*13-dy*2,hand.y-dy*13+dx*2);ctx.lineTo(hand.x-dx*6,hand.y-dy*6);ctx.lineTo(hand.x,hand.y);
      ctx.strokeStyle='#292c1b';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#b88d50';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#e3b573';ctx.lineWidth=2;ctx.stroke();ctx.lineCap='butt';
    }
    // Rotate around the hand, never around the torso: every handle stays attached.
    ctx.save();ctx.translate(hand.x,hand.y);ctx.rotate(actionAngle);ctx.translate(-grip.x,-grip.y);
    if(slot<=2){
      rect(10,-2,7,4,'#172021');rect(11,-1,5,2,'#674d35');rect(12,-1,1,2,'#aa8856');
      rect(16,-3,2,6,'#292b25');rect(16,-2,1,4,'#b69c65');
      if(slot===2){
        rect(17,-2,13,4,'#33291f');rect(18,-1,11,2,'#99713d');rect(21,-1,7,1,'#c39a59');
        rect(25,-5,4,9,'#26383c');rect(29,-7,4,14,'#26383c');rect(32,-9,3,18,'#26383c');
        rect(28,-4,4,8,'#78938e');rect(31,-6,3,12,'#a7bab0');rect(34,-8,1,16,'#e0e7d7');
      }else{
        rect(18,-2,7,4,'#263b40');rect(18,-1,8,2,'#77908c');rect(18,-2,6,1,'#c4cec0');rect(25,-1,2,1,'#e0e3c9');
      }
      if(age<rate*.55){ctx.strokeStyle='#f8e9b455';ctx.lineWidth=1;ctx.beginPath();ctx.arc(13,0,slot===2?24:18,-.4,.5);ctx.stroke();}
    }
    else if(slot===7){
      const draw=age<.16?Math.max(0,1-age/.16):Math.min(1,(age-.16)/.44);
      ctx.strokeStyle='#442d23';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(20,-15);ctx.lineTo(25,-8);ctx.lineTo(26,0);ctx.lineTo(25,8);ctx.lineTo(20,15);ctx.stroke();
      ctx.strokeStyle='#be8d4b';ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle='#dfd9b2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(20,-15);ctx.lineTo(20-draw*10,0);ctx.lineTo(20,15);ctx.stroke();
      if(age>.2){const nock=20-draw*10;rect(nock,0,32-nock,1,'#d5c18a');rect(30,-1,3,3,'#d5ddd4');rect(nock,-2,3,1,'#9da991');rect(nock,2,3,1,'#9da991');}
      if(!e.pickup){const nock=20-draw*10;rect(nock-2,-2,4,4,'#303421');rect(nock-1,-1,3,2,'#77794a');}
    }else if(slot===8){rect(4,0,14,5,'#7f5531');rect(12,-3,14,5,'#3a454c');rect(14,-2,11,1,'#a4b6bd');rect(20,-9,3,18,'#172329');rect(21,-8,1,16,'#af8654');rect(22,-7,2,14,'#34434a');if(age>.22)rect(11,-1,16,1,'#e2ca94');}
    else if(slot===9){if(age>.3){rect(13,-4,7,8,'#233425');rect(14,-3,5,6,'#8a9654');rect(15,-6,3,2,'#b5bba3');}}
    else{
      const ink='#121c20',steel='#506369',light='#9daea7',wood='#795335';
      if(slot===3){
        rect(15,-3,11,4,ink);rect(16,-2,9,2,steel);rect(17-recoil,-3,8,1,light);
        rect(16,1,4,5,ink);rect(17,1,2,4,wood);rect(20,1,3,3,ink);rect(21,1,1,1,'#a5a28a');rect(24,-4,1,1,ink);
      }else if(slot===4){
        rect(-1,-1,10,5,ink);rect(0,0,8,3,wood);rect(1,0,5,1,'#ad8050');
        rect(8,-3,19,4,ink);rect(9,-2,16,1,light);rect(10,-1,16,1,steel);
        rect(10,1,4,4,ink);rect(11,1,2,3,wood);rect(supportX-3,0,7,3,wood);rect(supportX-2,0,1,2,'#be945d');
      }else if(slot===5){
        rect(-2,-1,11,5,ink);rect(-1,0,9,3,wood);rect(0,0,6,1,'#a67b46');
        rect(8,-3,13,5,ink);rect(9,-2,10,2,steel);rect(10,-3,8,1,light);
        rect(20,-2,7,2,ink);rect(21,-2,4,1,light);rect(24,-4,1,3,ink);
        rect(11,1,3,5,ink);rect(12,2,1,3,wood);rect(16,2,4,4,ink);rect(17,5,4,3,ink);rect(17,2,2,4,steel);rect(18,6,2,1,steel);
        rect(18,0,5,2,wood);rect(19,0,3,1,'#aa7d49');
      }else if(slot===6){
        rect(-3,-4,28,7,ink);rect(-2,-3,26,5,'#4a5436');rect(-1,-3,23,1,'#a1a77a');rect(0,0,23,2,'#343e2d');
        rect(-4,-3,3,5,ink);rect(23,-4,3,7,ink);rect(23,-3,2,5,'#929b76');rect(7,-4,2,7,'#242c26');rect(19,-4,2,7,'#242c26');
        rect(10,2,4,4,ink);rect(11,2,2,3,'#796044');rect(12,-6,5,2,ink);rect(13,-6,3,1,light);
      }
      if(age<.1){
        const burst=slot===4||slot===6?1.35:1;
        ctx.save();ctx.translate(27,0);ctx.scale(burst,burst);
        rect(0,-4,10,8,'#f07120');rect(4,-6,5,12,'#ffb631');rect(8,-2,7,4,'#ffb631');
        rect(0,-2,10,4,'#fff4b2');rect(2,-3,4,6,'#fffbe3');
        if(slot===6){rect(-33,-3,7,6,'#ffb631');rect(-36,-1,6,2,'#fff0a0');}
        ctx.restore();
      }
    }
    ctx.restore();
    // Fingers cover the handle, connecting it to the glove in the full-body sprite.
    if(!e.pickup&&(slot!==9||age>.3)){
      // Steel knuckles for the robot, an olive glove for the soldier.
      const [dark,mid,lit]=e.chrome?['#2c3338','#93a1a6','#e6eef0']:['#303421','#697047','#959365'];
      rect(hand.x-2,hand.y-2,e.chrome?5:4,4,dark);rect(hand.x-1,hand.y-1,3,2,mid);rect(hand.x-1,hand.y-2,2,1,lit);}
    ctx.restore();
    return h+24;
  }
  function pickup(ctx,slot,x,y){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(itemSprite(slot),Math.round(x)-22,Math.round(y)-17);ctx.restore();}
  root.ArcadeWeaponRenderer={draw,pickup,itemArtwork};
})(typeof window!=='undefined'?window:globalThis);
