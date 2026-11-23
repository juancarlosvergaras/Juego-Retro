(function(root){
  'use strict';
  function create(images,audio){
    if(root.ArcadeAmbience)root.ArcadeAmbience.setSpriteSheet(images.effects);
    const skyColors=new Map();
    for(const img of [images.cityStart,images.city,images.cemetery]){
      const sample=document.createElement('canvas');sample.width=64;sample.height=16;const sc=sample.getContext('2d',{willReadFrequently:true});
      sc.drawImage(img,0,0,img.width,Math.floor(img.height*.2),0,0,64,16);const pixels=sc.getImageData(0,0,64,16).data,total=pixels.length/4,sums=[0,0,0];
      for(let i=0;i<pixels.length;i+=4)for(let channel=0;channel<3;channel++)sums[channel]+=pixels[i+channel];
      skyColors.set(img,sums.map(sum=>Math.round(sum/total)).join(','));
    }
    function trim(img,regions){
      const scan=document.createElement('canvas');scan.width=img.width;scan.height=img.height;const context=scan.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0);const pixels=context.getImageData(0,0,img.width,img.height).data;
      return regions.map(([ox,oy,w,h])=>{let l=w,t=h,r=0,b=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[((oy+y)*img.width+ox+x)*4+3]>140){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return[ox+l,oy+t,Math.max(1,r-l+1),Math.max(1,b-t+1)];});
    }
    const cityFrames=trim(images.cityObjects,[[0,0,392,552],[394,0,374,552],[770,0,405,552],[1180,0,356,552],[0,560,414,425],[416,560,394,425],[810,560,413,425],[1225,560,311,425]]);
    const flameFrames=trim(images.effects,Array.from({length:4},(_,i)=>[i*images.effects.width/4,3*images.effects.height/8,images.effects.width/4,images.effects.height/8]));
    function object(c,n,x,base,width,height){const f=cityFrames[n],h=height||width*f[3]/f[2];c.drawImage(images.cityObjects,...f,Math.round(x-width/2),Math.round(base-h),width,h);}
    function fire(c,time,x,base,height=28,alpha=1){const f=flameFrames[Math.floor(time*9)%4],w=height*f[2]/f[3];c.save();c.globalAlpha*=alpha;c.drawImage(images.effects,...f,Math.round(x-w/2),Math.round(base-height),w,height);c.restore();}
    const civilianFrames=[
      [[56,29,196,225],[335,29,166,228],[576,29,187,220],[824,29,195,225],[1102,29,168,228],[1344,29,185,220]],
      [[55,279,195,229],[335,279,166,233],[576,279,186,224],[823,279,195,229],[1102,279,168,233],[1344,279,185,224]],
      [[53,530,199,224],[335,532,174,225],[576,530,191,218],[822,530,199,224],[1102,532,175,225],[1344,530,191,218]],
      [[54,774,195,236],[334,774,165,237],[576,774,184,230],[822,774,195,236],[1102,774,165,237],[1344,774,184,230]]
    ];
    const civilianAnchors=[[145,401,657,913,1169,1425],[157,415,670,925,1183,1438],[132,395,651,900,1163,1419],[137,394,650,905,1162,1418]];
    const civilianBaselines=[257,512,757,1011],civilianHeights=[228,233,227,237];
    function civilian(c,p){
      const row=p.variant??p.sex,frame=Math.floor(p.phase*6)%6,f=civilianFrames[row][frame],scale=46/civilianHeights[row];
      // Match mission-one workers' height; stable torso anchors preserve the natural foot lift.
      c.drawImage(images.civilians,...f,Math.round(p.x+(f[0]-civilianAnchors[row][frame]-16)*scale),Math.round(p.y-(civilianBaselines[row]-f[1])*scale),f[2]*scale,f[3]*scale);
    }
    const source=images.atlas,scan=document.createElement('canvas');scan.width=source.width;scan.height=source.height;
    const sc=scan.getContext('2d',{willReadFrequently:true});sc.drawImage(source,0,0);const data=sc.getImageData(0,0,scan.width,scan.height).data;
    const cw=source.width/4,ch=source.height/2,frames=[];
    for(let cell=0;cell<8;cell++){
      const ox=cell%4*cw,oy=Math.floor(cell/4)*ch;let left=cw,top=ch,right=0,bottom=0;
      for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[((y+oy)*scan.width+x+ox)*4+3]>100){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      frames.push([ox+left,oy+top,right-left+1,bottom-top+1]);
    }
    function art(c,n,x,base,w,h,flip=false,alpha=1){c.save();c.globalAlpha*=alpha;c.translate(Math.round(x),Math.round(base));if(flip)c.scale(-1,1);c.drawImage(source,...frames[n],-w/2,-h,w,h);c.restore();}
    function effect(c,row,frame,x,y,w,h,alpha=1){const img=images.effects;c.save();c.globalAlpha*=alpha;c.drawImage(img,(frame%4)*img.width/4,row*img.height/8,img.width/4,img.height/8,Math.round(x-w/2),Math.round(y-h/2),w,h);c.restore();}
    // Registered cell origins keep tank tracks and masonry on their shared street baseline.
    function battleSprite(c,row,frame,x,base,width,dir=1,alpha=1){
      if(!images.tankBattle)return;const scale=width/384,baseline=row===3?208:250;
      c.save();c.globalAlpha*=alpha;c.translate(Math.round(x),Math.round(base));c.scale(dir,1);
      c.drawImage(images.tankBattle,frame*384,row*256,384,256,-width/2,-baseline*scale,width,256*scale);c.restore();
    }
    function battle(c,time,cam,w){
      const B=root.ArcadeBackgroundBattle;if(!B||!images.tankBattle)return;
      for(const tank of B.tanks){
        // The far layer scrolls at half speed: tanks beyond this point would surface over the cemetery.
        if(tank.x>8000*B.DEPTH-150)continue;
        const q=B.sample(tank,time),x=q.x-cam.x*B.DEPTH,target=q.targetX-cam.x*B.DEPTH,base=q.base-cam.y;
        if(Math.max(x,target)<-100||Math.min(x,target)>w+100)continue;
        // One opaque layer for street, tank, projectile and damaged wall: no camera-dependent fading.
        c.fillStyle='#45443c';c.fillRect(Math.round(Math.min(x,target)-60),Math.round(base),Math.round(Math.abs(x-target)+120),8);
        c.fillStyle='#777365';c.fillRect(Math.round(Math.min(x,target)-60),Math.round(base),Math.round(Math.abs(x-target)+120),1);
        battleSprite(c,3,q.targetFrame,target,base,70);
        battleSprite(c,q.row,q.frame,x,base,q.width,q.dir);
        if(q.shell){c.fillStyle='#ffe2a0';c.fillRect(Math.round(q.shell.x-cam.x*B.DEPTH),Math.round(q.shell.y-cam.y),4,2);}
        if(q.impactFrame!==null)battleSprite(c,2,q.impactFrame,target,base,85);
        else if(q.smoke>0)battleSprite(c,2,3,target,base,85,1,q.smoke);
      }
    }
    // Alternating mirrored copies share their edge pixels, avoiding a hard scrolling seam.
    function panorama(c,img,cam,w,base,height,speed,alpha=1,sky=true){
      const tile=height*img.width/img.height,offset=cam.x*speed,start=Math.floor(offset/tile);
      c.save();c.globalAlpha*=alpha;
      for(let i=start;i<start+Math.ceil(w/tile)+2;i++){
        const x=i*tile-offset,top=Math.round(base-height);c.save();c.translate(Math.round(x),top);if(Math.abs(i)%2){c.translate(tile,0);c.scale(-1,1);}
        if(top>0&&sky){
          // Continue the actual cloud texture at its native scale, with shared edge pixels.
          // A one-pixel strip stretched upwards produces vertical streaks and a hard horizon.
          const sourceHeight=Math.floor(img.height*.2),band=sourceHeight*height/img.height;
          for(let n=0;n<Math.ceil(top/band);n++){c.save();c.translate(0,-n*band);if(n%2===0)c.scale(1,-1);else c.translate(0,-band);c.drawImage(img,0,0,img.width,sourceHeight,0,0,tile,band);c.restore();}
          // At extreme jump heights, soften repetitions into this panorama's own sky tone.
          const tint=skyColors.get(img),haze=c.createLinearGradient(0,-320,0,0);
          haze.addColorStop(0,'rgba('+tint+',1)');haze.addColorStop(.5,'rgba('+tint+',.65)');haze.addColorStop(1,'rgba('+tint+',0)');
          c.fillStyle=haze;c.fillRect(0,-top,tile,top);
        }else if(top>0)c.drawImage(img,0,0,img.width,1,0,-top,tile,top+1);
        c.drawImage(img,0,0,tile,height);c.restore();
      }c.restore();
    }
    // The way out of the vault: a stone arch at the west end with the storm
    // light of the cemetery beyond it, so the interior has a real threshold.
    function vaultDoor(c,x,base,time){
      // Built from the mausoleum's own carved portal, so the inside of the door
      // is the same stone the player walked through outside.
      const sx=885,sy=748,sw=150,sh=237,k=.56,w=Math.round(sw*k),h=Math.round(sh*k),left=Math.round(x-w/2),top=base-h;
      const at=(px,py)=>[left+(px-sx)*k,top+(py-sy)*k];
      // A buttress of the same masonry ties the portal into the wall.
      c.fillStyle='#2b2d2a';c.fillRect(left-26,top+10,w+52,h-10);c.fillStyle='#3a3c37';for(let y=top+18;y<base-6;y+=14)c.fillRect(left-26,y,w+52,1);for(let y=top+18,n=0;y<base-6;y+=14,n++)for(let bx=left-26+(n%2?9:0);bx<left+w+26;bx+=18)c.fillRect(bx,y,1,14);
      c.fillStyle='#1c1e1c';c.fillRect(left-26,top+10,2,h-10);c.fillRect(left+w+24,top+10,2,h-10);
      c.drawImage(source,sx,sy,sw,sh,left,top,w,h);
      // The pointed opening shows the cemetery under the storm.
      const opening=[[921,985],[921,838],[934,803],[960,779],[986,803],[999,838],[999,985]].map(([px,py])=>at(px,py));
      c.save();c.beginPath();opening.forEach(([px,py],n)=>c[n?'lineTo':'moveTo'](px,py));c.closePath();c.clip();
      const far=images.cemetery;c.drawImage(far,Math.round(far.width*.43),Math.round(far.height*.36),Math.round(far.width*.06),Math.round(far.height*.52),left,top,w,h);
      c.fillStyle='rgba(26,32,66,.42)';c.fillRect(left,top,w,h);
      c.fillStyle='rgba(205,218,245,.5)';for(let n=0;n<10;n++){const ry=(time*170+n*37)%h;c.fillRect(Math.round(left+w*.34+(n*13)%(w*.32)),Math.round(top+ry),1,6);}
      // Depth of the wall: the jambs fall into shadow.
      const [ox]=opening[0],[ox2]=opening[6],jamb=c.createLinearGradient(ox,0,ox2,0);jamb.addColorStop(0,'rgba(6,8,14,.85)');jamb.addColorStop(.22,'rgba(6,8,14,0)');jamb.addColorStop(.78,'rgba(6,8,14,0)');jamb.addColorStop(1,'rgba(6,8,14,.85)');c.fillStyle=jamb;c.fillRect(left,top,w,h);
      c.restore();
      // Worn threshold and the cold light it lets in.
      c.fillStyle='#4d4f49';c.fillRect(left-8,base-4,w+16,4);c.fillStyle='#74766c';c.fillRect(left-8,base-4,w+16,1);
      c.save();c.globalCompositeOperation='screen';const spill=c.createLinearGradient(left,0,left+w+170,0);spill.addColorStop(0,'rgba(130,150,200,.3)');spill.addColorStop(1,'rgba(130,150,200,0)');c.fillStyle=spill;c.beginPath();c.moveTo(opening[0][0],base);c.lineTo(opening[6][0],base);c.lineTo(left+w+170,base+18);c.lineTo(left-34,base+18);c.closePath();c.fill();c.restore();
    }
    // While the Herald lives, his charge seals the mausoleum's outer door.
    function heraldSeal(c,x,base,time,power){
      if(power<=0)return;const w=74,h=112,left=x-w/2,top=base-h;
      c.save();c.globalAlpha=power;c.fillStyle='rgba(60,120,220,.22)';c.fillRect(left,top,w,h);
      c.globalCompositeOperation='screen';const glow=c.createRadialGradient(x,base-h/2,6,x,base-h/2,96);glow.addColorStop(0,'rgba(150,215,255,'+(.42+.12*Math.sin(time*9))+')');glow.addColorStop(1,'rgba(90,150,255,0)');c.fillStyle=glow;c.fillRect(x-100,base-h/2-100,200,200);
      c.strokeStyle='rgba(215,240,255,.9)';c.lineWidth=1.5;const tick=Math.floor(time*14);
      for(let k=0;k<4;k++){c.beginPath();let px=left+(k+.5)*w/4,py=top;c.moveTo(px,py);for(let j=1;j<=8;j++){const n=Math.sin((tick*7+k*13+j)*91.7)*43758.5;px=left+(k+.5)*w/4+((n-Math.floor(n))-.5)*22;py=top+h*j/8;c.lineTo(Math.round(px),Math.round(py));}c.stroke();}
      c.strokeStyle='rgba(150,215,255,.8)';c.lineWidth=2;c.strokeRect(Math.round(left)+.5,Math.round(top)+.5,w,h);c.restore();
    }
    function draw(c,s,cam,w,h,drawPlayer){
      const env=ArcadeLevelTwo.atmosphere(s.player.x,s.inside),base=620-cam.y;c.imageSmoothingEnabled=false;
      c.fillStyle=s.inside?'#1b252b':env.dusk>.5?'#677282':'#98b4c8';c.fillRect(0,0,w,h);
      if(s.inside){
        panorama(c,images.interior,cam,w,base+112,650,.65,1,false);
      }else{
        c.fillStyle='#4c505a';c.fillRect(0,base-100,w,h);
        panorama(c,images.cityStart,cam,w,base+2,540,.24,1);
        if(env.mechas>0)panorama(c,images.city,cam,w,base+2,540,.24,env.mechas);
        for(let x=-((cam.x*.24)%180);x<w;x+=180)c.drawImage(images.cityStart,0,images.cityStart.height-32,400,32,x,base-30,181,32);
        if(env.cemetery>0)panorama(c,images.cemetery,cam,w,base+4,550,.3,env.cemetery);
        const decor=root.ArcadeSceneryAnimation;
        if(decor){
          if(decor.next){
            if(env.cemetery<.8){
              const building=decor.next(s,'ciudad',s.time);
              const scroll=cam.x*.24;
              decor.place(c,building,scroll,base-32,w,135,.90*(1-env.cemetery));
              if(building&&building.frame>=1&&!building.sounded){
                building.sounded=true;
                const pan=(building.anchor-scroll-w/2)/(w/2);
                if(building.frame<4&&Math.abs(pan)<1.1)audio?.play('explosion',{gain:.32,pan:Math.max(-1,Math.min(1,pan))});
              }
            }else{
              const skeleton=decor.next(s,'cementerio',s.time);
              decor.place(c,skeleton,cam.x*.30,base-31,w,46,.83*env.cemetery);
            }
          }
          const lead=decor.pass(w*.10+130+s.time*21-cam.x*.24,w,130);
          for(let i=0;i<3;i++){
            const x=lead-i*31,y=Math.max(48,h*.145)+(620-h*.84-cam.y)*.24-i%2*13+Math.sin(s.time*1.5+i)*4;
            if(x>-22&&x<w+22)decor.draw(c,'raven',s.time,x,y,30-i*4,.83,i*3);
          }
        }
        if(env.cemetery<1){
          c.save();c.globalAlpha=1-env.cemetery;
          if(root.ArcadeBackgroundBattle&&root.ArcadeAmbience)for(const f of root.ArcadeBackgroundBattle.flights(s.time,cam))if(f.x>-100&&f.x<w+100&&f.y>-60&&f.y<h+60)root.ArcadeAmbience.drawPlane(c,f.x,f.y,f.dir,f.enemy,f.t);
          for(let i=0;i<18;i++){
            const x=i*440+280-cam.x*.48;if(x<-60||x>w+60)continue;
            // This rubble sprite and its flame share the same origin and parallax.
            // Source y=148 is the pile's center surface; y=208 is its ground contact.
            const rubbleWidth=46,hearth=base-(208-148)*rubbleWidth/384;
            battleSprite(c,3,3,x,base,rubbleWidth);
            fire(c,s.time+i,x,hearth+1,21,.9);
            effect(c,4,Math.floor(s.time*5+i),x+2,hearth-31,32,48,.18);
          }
          c.restore();
        }
        // Tanks occupy the city only. Their opacity never changes with the player's position.
        battle(c,s.time,cam,w);
      }
      // Indoors the painted window light is the light: procedural beams used to cross it the wrong way.
      if(s.inside)root.ArcadeWorldLighting?.dust(c,cam,w,Math.round(base+112-650),s.time);else root.ArcadeWorldLighting?.sky(c,cam,w,h,s.time,{night:env.cemetery>.5});
      if(!s.inside)root.ArcadeWorldLighting?.storm(c,s.weather,images.lightning,cam,w,h);
      c.save();const shake=s.inside?(s.king?.shake||0)*3:0;c.translate(-Math.round(cam.x)+Math.sin(s.time*79)*shake,-Math.round(cam.y)+Math.cos(s.time*83)*shake*.55);
      // Draw the walking plane first; feet and pedestal bases stay visible on top.
      const start=Math.floor(cam.x/144)*144;
      c.fillStyle=s.inside?'#27282b':'#48473e';c.fillRect(cam.x,620,w,500);
      for(let x=start;x<cam.x+w+144;x+=144){if(s.inside)c.drawImage(images.interior,0,Math.floor(images.interior.height*.94),384,35,x,620,144,18);else c.drawImage(images.cityStart,0,images.cityStart.height-22,384,22,x,620,144,20);}
      c.fillStyle=s.inside?'#8a7962':'#8b8472';c.fillRect(cam.x,620,w,2);
      // Fixed world-space asphalt/soil grain below the curb, never a screen-locked strip.
      for(let y=642;y<cam.y+h;y+=9)for(let x=Math.floor(cam.x/23)*23;x<cam.x+w;x+=23){const grain=Math.abs(Math.imul(x+17,y+31))%7;c.fillStyle=s.inside?(grain<3?'#343236':'#202529'):(grain<3?'#555348':'#3d403b');c.fillRect(x+grain*2,y+grain%3,grain+2,1);}
      if(!s.inside){
        for(const [x,n,width] of [[3580,4,290],[4030,6,330],[5410,5,355],[6840,4,310],[7140,6,300]])if(x>cam.x-450&&x<cam.x+w+450){c.fillStyle='#151b1e66';c.beginPath();c.ellipse(x,620,width*.46,5,0,0,Math.PI*2);c.fill();object(c,n,x,622,width);}
        for(const bridge of s.geometry.bridges||[]){
          if(!images.cityBridge||bridge.x+bridge.w<cam.x||bridge.x>cam.x+w)continue;
          const top=bridge.terrain[0][1],slope=(bridge.terrain[1][1]-top)/bridge.w;
          c.save();c.translate(bridge.x,top);c.transform(1,slope,0,1,0,0);
          c.drawImage(images.cityBridge,22,432,1493,142,0,-2,bridge.w,48);c.restore();
        }
        for(const b of s.geometry.buildings){
          if(b.x+b.w<cam.x-50||b.x>cam.x+w+50)continue;
          if(b.tall){
            const scale=b.scale,base=620-128*scale,repeat=113*scale;
            c.drawImage(images.cityObjects,11,419,376,128,Math.round(b.x),Math.round(base),b.w,128*scale);
            for(let i=0;i<b.extraFloors;i++)c.drawImage(images.cityObjects,11,306,376,113,Math.round(b.x),Math.round(base-(i+1)*repeat),b.w,Math.ceil(repeat));
            c.drawImage(images.cityObjects,11,13,376,406,Math.round(b.x),Math.round(base-b.extraFloors*repeat-406*scale),b.w,406*scale);
          }else object(c,b.art,b.x+b.w/2,620,b.w,cityFrames[b.art][3]*b.scale);
          for(const l of s.geometry.ladders.filter(l=>l.x>b.x&&l.x<b.x+b.w)){c.fillStyle='#303535';c.fillRect(l.x-7,l.top,2,l.bottom-l.top);c.fillRect(l.x+6,l.top,2,l.bottom-l.top);c.fillStyle='#b0a284';for(let y=l.top+5;y<l.bottom;y+=10)c.fillRect(l.x-7,y,15,2);}
        }
        root.ArcadeCemeteryBat?.drawTrees(c,images.cemeteryTrees,cam,w);
        for(let i=0;i<40;i++){
          const x=8500+i*215;if(x<cam.x-200||x>cam.x+w+200||ArcadeLevelTwo.CRATERS.some(a=>x+130>a.x&&x-110<a.x+a.w))continue;
          art(c,5,x,620,210,120,i%2===0,.75);
          art(c,4,x+45,623,160+(i%3)*24,90+(i%4)*14,i%2===0);
        }
        art(c,6,ArcadeLevelTwo.ENTRANCE,620,520,505);
        if(s.storm&&ArcadeLevelTwo.ENTRANCE>cam.x-120&&ArcadeLevelTwo.ENTRANCE<cam.x+w+120)heraldSeal(c,ArcadeLevelTwo.ENTRANCE,620,s.time,s.storm.hp>0?1:Math.min(1,(s.storm.death||0)/1.2));
      }else{
        if(cam.x<260)vaultDoor(c,96,620,s.time);
        const f=frames[7],basePart=.29,base=ArcadeLevelTwo.PEDESTAL;c.drawImage(source,f[0],f[1]+f[3]*(1-basePart),f[2],f[3]*basePart,base.x,base.y,base.w,base.h);
        for(const scaffold of s.geometry.scaffolds||[]){if(scaffold.x+scaffold.w<cam.x||scaffold.x>cam.x+w)continue;c.drawImage(images.mausoleumScaffold,...scaffold.frame,Math.round(scaffold.x),Math.round(scaffold.y-scaffold.frame[3]*scaffold.scale),Math.round(scaffold.w),Math.round(scaffold.frame[3]*scaffold.scale));}
        for(const x of [200,820,1430,1950,2370]){object(c,7,x,620,63,88);fire(c,s.time+x,x,535,30,.95);}
      }
      // Soft reflected light separates the dark uniforms from the lower scenery.
      // World-space stops keep the lift on the street as the camera follows a jump.
      const lowerLight=c.createLinearGradient(0,450,0,735),light=s.inside?'190,194,187':'218,221,204';
      lowerLight.addColorStop(0,'rgba('+light+',0)');
      lowerLight.addColorStop(.35,'rgba('+light+',.07)');
      lowerLight.addColorStop(.59,'rgba('+light+','+(s.inside?'.12':'.18')+')');
      lowerLight.addColorStop(.76,'rgba('+light+',.10)');
      lowerLight.addColorStop(1,'rgba('+light+',0)');
      c.fillStyle=lowerLight;c.fillRect(cam.x,450,w,285);
      if(!s.inside)for(const b of s.geometry.barricades||[]){const image=images[b.image];if(image&&b.x+b.w>cam.x&&b.x<cam.x+w){const scale=b.w/b.frame[2];c.drawImage(image,...b.frame,Math.round(b.x),Math.round(b.y-(b.baseline-b.frame[1])*scale),b.w,b.frame[3]*scale);}}
      if(!s.inside)for(const water of s.waters||[])if(water.area.x+water.area.w>cam.x&&water.area.x<cam.x+w)root.ArcadeWaterCrater.drawBack(c,water,images.crater);
      if(!s.inside&&images.wreckedCars)for(const car of s.geometry.cars||[]){if(car.x+car.w<cam.x-70||car.x>cam.x+w)continue;root.ArcadeWreckedCars.draw(c,car,images.carDamage,images.wreckedCars);c.save();c.filter='grayscale(1) brightness(.55)';if(car.hp>0)root.ArcadeImpact?.smoke(c,car.smoke.x,car.smoke.y,s.time+car.id*1.37,1.5);c.restore();}
      root.ArcadeWorldLighting?.fixtures(c,2,s.geometry,cam,w,h,s.time,s.inside);
      c.save();root.ArcadeWorldLighting?.shadow(c,s.weather);
      if(!s.inside)for(const p of s.civilians||[])if(p.x>cam.x-50&&p.x<cam.x+w+50)civilian(c,p);
      c.restore();
      if(!s.combat)for(const bullet of s.bullets){c.fillStyle='#ffd27b';c.fillRect(bullet.x,bullet.y,7,2);}
      drawPlayer();if(!s.inside)for(const water of s.waters||[])if(water.area.x+water.area.w>cam.x&&water.area.x<cam.x+w)root.ArcadeWaterCrater.drawFront(c,water);c.restore();
      if(!s.inside&&env.dusk>0){c.fillStyle='rgba(33,36,62,'+(env.dusk*.14)+')';c.fillRect(0,0,w,h);}
      if(env.rain>0){
        c.save();c.beginPath();c.rect(0,0,w,Math.max(0,base));c.clip();
        for(let x=-128;x<w+128;x+=128)for(let y=-128;y<h+128;y+=128)effect(c,5,Math.floor(s.time*10),x+64-(s.time*12)%128,y+64+(s.time*75)%128,128,128,env.rain*.46);
        c.restore();for(let x=10;x<w;x+=45)effect(c,6,Math.floor(s.time*9+x/33),x,base-2,18,12,env.rain*.55);
      }
      if(s.fade>0){c.fillStyle='rgba(10,17,24,'+s.fade+')';c.fillRect(0,0,w,h);}
    }
    return{draw,frames};
  }
  root.ArcadeLevelTwoRenderer={create};
})(window);
