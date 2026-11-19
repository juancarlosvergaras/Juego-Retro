(function(root){
 'use strict';
 const frames=8,turn=Math.PI*2;
 const wildlife={shark:0,bite:1,squid:2,fish:3,ray:4,jelly:5,turtle:6};
 const swimmers={soldier:0,wolf:1,zombie:2,robot:3,fighter:4,diver:5};
 const submarines={tank:0,cannon:1,sub:2};
 function loopFrame(cycles){return Math.floor((cycles-Math.floor(cycles))*frames);}
 function actionFrame(progress){return Math.min(frames-1,Math.max(0,Math.floor(progress*frames)));}
 // All cels in a row share one anatomical pivot. Never trim a fin or move the pivot at draw time.
 function atlas(image,rows){
  const w=image.width/frames,h=image.height/Object.keys(rows).length;
  return function draw(c,name,col,x,y,width,flip,pitch=0){
   const height=width*h/w;
   c.save();c.translate(Math.round(x),Math.round(y));if(pitch)c.rotate(pitch);
   if(flip)c.scale(-1,1);
   c.drawImage(image,col*w,rows[name]*h,w,h,-width/2,-height/2,width,height);
   c.restore();
  };
 }
 // Pitch is relative to the swimmer's nose. Mirroring the body keeps the
 // nose up on ascent even when changing horizontal direction mid-stroke.
 function updatePitch(p,vy,dt){
  const tank=p.form==='tank',limit=tank?.235:.31;
  const target=limit*Math.max(-1,Math.min(1,vy/(tank?182:165)));
  const old=p.swimPitch||0;
  p.swimPitch=old+(target-old)*(-Math.expm1(-dt*(tank?5:7)));
  if(Math.abs(p.swimPitch)<.0001&&target===0)p.swimPitch=0;
 }
 function lift(p){return p.form==='tank'?30:21;}
 function angle(p){return (p.swimPitch||0)*(p.facing||1);}
 function rotate(x,y,a){
  const cos=Math.cos(a),sin=Math.sin(a);
  return {x:x*cos-y*sin,y:x*sin+y*cos};
 }
 function point(p,forward,down){
  const v=rotate(forward*(p.facing||1),down,angle(p));
  return {x:p.x+v.x,y:p.y-lift(p)+v.y};
 }
 function forwardAim(p){return rotate(p.facing||1,0,angle(p));}
 function recoil(p){
  const t=(.65-(p.cannonPose||0))/.26;
  return t>0&&t<1?3*Math.sin(t*Math.PI)*(1-t):0;
 }
 function muzzle(p){
  // Anatomical sockets measured on the registered 192 x 128 cels.
  if(p.form==='tank')return point(p,47.5-recoil(p),-13.5);
  if(p.form==='zombie')return point(p,44,9);
  if(p.form==='wolf')return point(p,45,5);
  if(p.form==='fighter')return point(p,40,8);
  return point(p,50.5,3.4);
 }
 // Offsets from the grip to the actual barrel on each 44 x 34 inventory sprite.
 const robotTips={3:[40,12],4:[43,14],5:[43,14],6:[43,16],7:[42,17],8:[43,16],9:[23,9]};
 function robotGun(p,arm,slot){
  const facing=p.facing||1,aim=p.aim||forwardAim(p);
  const wrist=arm===0?point(p,40,13):point(p,32,8);
  const rotation=Math.atan2(aim.y,aim.x*facing),tip=robotTips[slot]||robotTips[5];
  const offset=rotate(tip[0]-15,tip[1]-20,rotation);
  return {wrist,rotation,x:wrist.x+facing*offset.x,y:wrist.y+offset.y};
 }
 function create(images){
  const animal=atlas(images.wildlife,wildlife),swim=atlas(images.swimmers,swimmers);
  const vessel=atlas(images.submarines,submarines);
  function predator(c,n){
   let name=n.type,frame=loopFrame((n.stroke||0)/turn+(name==='squid'?.20:0));
   const direction=n.facing||-1,cy=n.y-n.h*.5;
   if(name==='shark'){
    if(n.phase==='warn'){
     name='bite';frame=actionFrame(.5*n.phaseAge/.85);
     c.save();c.textAlign='center';c.font='bold 16px monospace';c.fillStyle='#ffbf7b';c.fillText('!',n.x,n.y-n.h-12);c.restore();
    }
    if(n.phase==='rush'||n.phase==='breach'){
     name='bite';frame=actionFrame(.5+.5*n.phaseAge/1.1);
     c.strokeStyle='#a0ebf393';
     for(let i=0;i<5;i++){
      const t=n.stroke||0,age=(t*.45+i/5)%1;
      c.strokeRect(Math.round(n.x-direction*(53+age*49)),Math.round(cy+Math.sin(i*7+t)*9-age*12),2+i%3,2+i%3);
     }
    }
   }
   animal(c,name,frame,n.x,cy,n.type==='shark'?159:110,direction>0,(n.pitch||0)*direction);
  }
  function player(c,p,e){
   const form=p.form||'soldier',tank=form==='tank',facing=p.facing||1,pitch=angle(p);
   if(form==='hero'){
    // The hero's existing twelve-cel gliding strip uses a foot-relative origin.
    // Draw it around the same water pivot used to project his eyes.
    const aim=p.aim||forwardAim(p),flat=rotate(aim.x,aim.y,-pitch);
    c.save();c.translate(p.x,p.y-lift(p));c.rotate(pitch);
    root.ArcadeAdvancedForms.draw(c,{...p,x:0,y:lift(p),swimming:true,swimPitch:0,aim:flat});
    c.restore();return true;
   }
   if(!tank&&!Object.hasOwn(swimmers,form))return false;
   const width=tank?118:form==='fighter'?107:form==='robot'?113:124;
   const frame=loopFrame(p.swimCycle??(p.anim||0)*1.4);
   c.save();c.translate(p.x,p.y-lift(p));c.scale(facing,1);c.rotate(p.swimPitch||0);
   if(tank)c.translate(-recoil(p),0);
   (tank?vessel:swim)(c,form,frame,0,0,width,false);
   c.restore();
   if(tank&&p.cannonPose>.52){
    const m=muzzle(p),aim=p.aim||forwardAim(p),k=Math.min(1,(p.cannonPose-.52)/.08);
    c.save();c.translate(m.x,m.y);c.rotate(Math.atan2(aim.y,aim.x));c.globalAlpha*=k;
    c.drawImage(images.submarines,139,155,46,21,0,-6,26*k,12);c.restore();
   }
   if(form==='robot'&&e?.inventory){
    const inv=e.inventory,guns=inv.owned.filter(n=>n>=3);
    const slots=[guns.includes(inv.selected)?inv.selected:guns[0],root.ArcadeRobotForm.secondary(inv)];
    for(const arm of [1,0]){
     const slot=slots[arm];if(!slot)continue;
     const gun=robotGun(p,arm,slot);
     c.save();c.translate(gun.wrist.x,gun.wrist.y);c.scale(facing,1);c.rotate(gun.rotation);
     root.ArcadeWeaponRenderer.pickup(c,slot,7,-3);
     if(e.robotFlashUntil?.[arm]>e.time){const tip=robotTips[slot];c.fillStyle='#ffdd83';c.fillRect(tip[0]-15,tip[1]-21,5,2);}
     c.restore();
    }
   }
   return true;
  }
  function enemy(c,n){
   const sub=n.type==='sub';
   const draw=sub?vessel:swim;
   draw(c,n.type,loopFrame(n.swimCycle||0),n.x,n.y-n.h/2,sub?143:99,sub?n.facing>0:n.facing<0);
  }
  function ambient(c,name,cycles,x,y,width,flip){
   animal(c,name,loopFrame(cycles),x,y,width,flip);
  }
  return {ambient,predator,player,enemy};
 }
 const api={create,updatePitch,point,forwardAim,muzzle,robotGun};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeSeaSprites=api;
})(typeof window==='undefined'?globalThis:window);
