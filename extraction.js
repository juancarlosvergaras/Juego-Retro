(function(root){
  let sheet=null,frames=[],doorSheet=null,closedSheet=null;
  const passengers={};
  function setPassengerSprites(soldier,soldierFrame,wolf,wolfFrame){
    passengers.soldier={image:soldier,frame:soldierFrame,height:46};
    passengers.wolf={image:wolf,frame:wolfFrame,height:60};
  }
  function setPassengerSprite(form,portrait,height){if(portrait)passengers[form]={image:portrait.image,frame:portrait.frame,height};}
  function setSpriteSheet(image,atlas){sheet=image;frames=atlas;}
  const doorFrames=[[271,347,59,70],[781,347,58,70],[1289,347,58,70],[271,707,59,70],[781,707,59,70],[1289,707,59,70]];
  function setDoorSprite(image){
    doorSheet=image;closedSheet=image;
    if(sheet&&typeof document!=='undefined'){
      // Reuse the original silhouette: the closed-door artwork has an opaque backdrop.
      closedSheet=document.createElement('canvas');closedSheet.width=sheet.width;closedSheet.height=sheet.height;
      const c=closedSheet.getContext('2d');c.drawImage(image,0,0);c.globalCompositeOperation='destination-in';c.drawImage(sheet,0,0);
    }
  }
  function ready(e,powers){return !!e.finalWon&&!e.extraction&&e.finalBoss.death<=0&&!(powers.beams||[]).length;}
  function updateCamera(camera,s,p,view,dt){
    const x=Math.max(0,Math.min(Math.max(0,729-view.width),(s.returning?p.x:s.pickX)-view.width*(s.returning?.4:.5)));
    const y=s.returning?p.y-view.height*.65:s.ground-Math.min(320,view.height-22);
    const blend=1-Math.exp(-3*Math.max(0,dt));
    camera.x+=(x-camera.x)*blend;camera.y+=(y-camera.y)*blend;
    return camera;
  }
  function create(p,platforms=[],returnToRoof=false){
    const roof=returnToRoof&&platforms.find(pl=>pl.arena&&p.y<=pl.y+2);
    const support=roof||platforms.filter(q=>q.y>=p.y-2&&p.x>=q.x&&p.x<=q.x+q.w).sort((a,b)=>a.y-b.y)[0];
    const ground=support?support.y:p.y,pickX=support?Math.max(support.x+20,Math.min(support.x+support.w-20,366)):366;
    if(returnToRoof&&ground>-138){const climbX=support?Math.max(support.x+20,Math.min(support.x+support.w-20,160)):160;return{phase:'return',returning:true,t:0,x:-220,y:-265,ground,pickX:366,climbX,platforms,form:p.form||'soldier',boarded:false,done:false};}
    const landX=roof?Math.max(roof.x+12,Math.min(roof.x+roof.w-12,p.x)):p.x;
    const landTime=Math.max(0,(ground-p.y)/240,Math.abs(p.x-landX)/110),walkTime=Math.abs(pickX-landX)/110,grabAt=Math.max(3.2,landTime+walkTime);
    return{t:0,x:-220,y:ground-125,pickX,ground,startX:p.x,startY:p.y,landX,landTime,walkTime,grabAt,liftAt:grabAt+.5,boardAt:grabAt+2.7,form:p.form||'soldier',phase:'walk',door:0,boarded:false,done:false};
  }
  function update(s,p,dt){
    p.heroFlight=false;
    if(s.returning){p.anim+=dt;p.jetpack=false;p.rope=null;p.claw=0;p.kick=0;p.transform=0;p.rescueGrip=false;p.hurt=0;
      if(Math.abs(p.x-s.climbX)>1){const dx=s.climbX-p.x;p.facing=Math.sign(dx);p.vx=p.facing*110;p.x+=Math.sign(dx)*Math.min(Math.abs(dx),110*dt);p.walkCycle=(p.walkCycle||0)+110*dt/52;p.grounded=true;p.y=s.ground;p.ladder=null;}
      else{p.x=s.climbX;p.ladder={x:s.climbX,top:-140,bottom:s.ground};p.grounded=false;p.vx=0;p.vy=-140;p.y=Math.max(-140,p.y-140*dt);if(p.y===-140){p.ladder=null;p.grounded=true;Object.assign(s,create(p,s.platforms));s.returning=false;}}
      return;
    }
    s.t+=dt;p.anim+=dt;p.vx=0;p.vy=0;p.rope=null;p.ladder=null;p.jetpack=false;p.claw=0;p.kick=0;p.transform=0;p.hurt=0;p.landing=0;p.slide=0;p.idleGesture=false;p.rescueGrip=false;p.grounded=true;
    s.x=s.t<2?-220+(s.pickX+220)*(1-Math.pow(1-s.t/2,3)):s.pickX;
    if(s.t<s.landTime){s.phase='land';const u=s.t/s.landTime;p.y=s.startY+(s.ground-s.startY)*u;p.x=s.startX+(s.landX-s.startX)*u;p.grounded=false;p.vy=240;}
    else if(s.t<s.grabAt){
      const progress=Math.min(1,(s.t-s.landTime)/(s.walkTime||1)),dir=Math.sign(s.pickX-s.landX);
      s.phase=progress<1?'walk':'wait';p.x=s.landX+(s.pickX-s.landX)*progress;p.y=s.ground;
      if(progress<1){p.vx=dir*110;p.facing=dir||p.facing;p.walkCycle=(p.walkCycle||0)+110*dt/52;}
    }else if(s.t<s.boardAt){
      s.phase=s.t<s.liftAt?'grab':'lift';p.rescueGrip=true;p.grounded=false;p.facing=1;
      const lift=Math.max(0,Math.min(1,(s.t-s.liftAt)/2.2));
      p.x=s.pickX+(s.form==='wolf'?-17:3.5);p.y=s.ground-lift*108;p.vy=s.phase==='lift'?-108/2.2:0;
    }else{
      s.boarded=true;const aboard=s.t-s.boardAt;s.door=Math.max(s.door||0,Math.min(1,aboard/1.1));s.phase=s.door<1?'close':aboard<1.4?'latch':'depart';const t=Math.max(0,aboard-1.4);s.x=s.pickX+t*t*60;s.y=s.ground-125-t*35;p.x=s.x;p.y=s.y+17;
      if(t>3.2&&s.x>1040)s.done=true;
    }
    s.handY=p.y-(s.form==='wolf'?60:46);
  }
  function draw(ctx,s){
    if(s.done)return;
    if(s.returning){ctx.save();ctx.fillStyle='#ae9560';ctx.fillRect(s.climbX-9,-140,2,s.ground+140);ctx.fillRect(s.climbX+7,-140,2,s.ground+140);for(let y=-140;y<s.ground;y+=14)ctx.fillRect(s.climbX-9,y,18,2);ctx.restore();return;}
    const x=Math.round(s.x),y=Math.round(s.y+Math.sin(s.t*7)*1.5),r=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(a,b,w,h);};
    ctx.save();ctx.translate(x,y);
    // Cable deploys before boarding and retracts once the character is inside.
    if(s.t>2&&!s.boarded){
      const end=s.phase==='grab'||s.phase==='lift'?s.handY-y:s.ground-(s.form==='wolf'?60:46)-y;
      const deployed=Math.min(1,(s.t-2)/1.2),length=Math.max(0,(end+52)*deployed);
      r(-1,-52,2,length,'#d4d9be');r(-4,-52+length,8,3,'#697277');
    }
    if(sheet){
      const frame=Math.floor(s.t*18)%frames.length,f=frames[frame],scale=.9;
      // The closed fuselage is permanent: boarding must never replace the rear panels.
      const progress=Math.max(0,Math.min(1,s.door||0));
      ctx.drawImage(closedSheet||sheet,f[0],f[1],f[2],f[3],-f[4]*scale,17-f[5]*scale,f[2]*scale,f[3]*scale);
      if(doorSheet&&progress<1){
        const d=doorFrames[frame],w=d[2]*scale,h=d[3]*scale;
        const left=(d[0]-f[0]-f[4])*scale,top=17+(d[1]-f[1]-f[5])*scale;
        // Only the passenger opening is exposed. The sliding panel cannot uncover a second door.
        ctx.save();ctx.beginPath();ctx.rect(left,top,w,h);ctx.clip();
        // Closed opposite cabin door remains visible behind the passenger.
        ctx.drawImage(doorSheet,...d,left,top,w,h);
        ctx.fillStyle='#101b24aa';ctx.fillRect(left,top,w,h);
        const passenger=passengers[s.form||'soldier'];
        if(s.boarded&&passenger){
          const pf=passenger.frame,ps=passenger.height/pf[3];
          // A real character sprite enters the fixed cabin. Never paint a pale
          // rectangular placeholder: it reads as a second door opening.
          const enter=Math.min(1,Math.max(0,(s.t-s.boardAt)/.35||0));
          const px=left+w*.68-enter*5,feet=top+h-2;
          ctx.drawImage(passenger.image,...pf,px-pf[2]*ps/2,feet-pf[3]*ps,pf[2]*ps,pf[3]*ps);
        }
        ctx.drawImage(doorSheet,...d,left-w*(1-progress),top,w,h);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function drawFlyby(ctx,x,y,width,t){
    if(!sheet)return;
    // Rotor extents vary between frames. Keep the fuselage pivot and scale fixed
    // instead of re-centering/resizing the whole silhouette on every rotor pose.
    const base=frames[0],f=frames[Math.floor(t*18)%frames.length],scale=width/base[2];
    const pivotX=x+(base[4]-base[2]/2)*scale,pivotY=y+(base[5]-base[3]/2)*scale;
    ctx.drawImage(closedSheet||sheet,f[0],f[1],f[2],f[3],pivotX-f[4]*scale,pivotY-f[5]*scale,f[2]*scale,f[3]*scale);
  }
  const api={ready,create,update,updateCamera,draw,drawFlyby,setSpriteSheet,setDoorSprite,setPassengerSprites,setPassengerSprite};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeExtraction=api;
})(typeof window!=='undefined'?window:globalThis);
