(function(root){
 'use strict';
 const W=960,H=540,TAU=2*Math.PI;
 function surface(w,h){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  return canvas;
 }
 // Feather only the distant scenery. Collision-bearing foreground art keeps a crisp silhouette.
 function plate(image,width,height){
  const canvas=surface(width,height),g=canvas.getContext('2d');
  g.drawImage(image,0,0,width,height);
  g.globalCompositeOperation='destination-in';
  for(const horizontal of [true,false]){
   const extent=horizontal?width:height;
   const fade=g.createLinearGradient(0,0,horizontal?extent:0,horizontal?0:extent);
   fade.addColorStop(0,'transparent');fade.addColorStop(horizontal?.14:.15,'#fff');
   fade.addColorStop(horizontal?.86:.87,'#fff');fade.addColorStop(1,'transparent');
   g.fillStyle=fade;g.fillRect(0,0,width,height);
  }
  return canvas;
 }
 function hash(x,y){const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);}
 function create(images,sprites){
  const reef=root.ArcadeSeaWar.reef;
  const cave=plate(images.grotto,1520,810);
  const species=['fish','ray','jelly','turtle'];
  const cadence={fish:1.45,ray:.94,jelly:.86,turtle:1.06};
  function faunaLayer(c,s,factor){
   const px=s.camera.x*factor,py=s.camera.y*factor;
   const far=factor<.4,spacing=far?360:570,dy=far?224:330;
   for(let row=Math.floor((py-100)/dy);row<=Math.floor((py+H+100)/dy);row++){
    const direction=hash(row,far?11:27)<.5?-1:1;
    const current=direction*(far?9:17)*s.time;
    for(let col=Math.floor((px-current-130)/spacing);col<=Math.floor((px-current+W+130)/spacing);col++){
     const seed=hash(col+15,row+(far?28:51)),phase=seed*TAU;
     const kind=far?'fish':species[Math.floor(seed*4)];
     const t=s.time*(kind==='jelly'?.33:.23)+phase;
     const x=(col+.2+.55*seed)*spacing-px+current+Math.sin(t)*12;
     const y=(row+.2+.5*hash(row+5,col+7))*dy-py+Math.cos(t*.83)*18;
     if(x<-110||x>W+110||y<-70||y>H+70)continue;
     const count=kind==='fish'?(far?7:5):kind==='jelly'?3:1;
     c.globalAlpha=far?.27:.52;
     for(let i=0;i<count;i++){
      const drift=i*.85+phase;
      const dx=i*(kind==='jelly'?21:9),oy=i?Math.sin(drift)*12:0;
      const size=(kind==='fish'?(far?16:27):kind==='ray'?91:kind==='jelly'?31:57)*(1+(i%3)*.08);
      sprites.ambient(c,kind,s.time*cadence[kind]+drift/TAU,x+dx,y+oy+Math.sin(t*2+drift)*3,size,direction>0);
     }
    }
   }
   c.globalAlpha=1;
  }
  function water(c,s){
   const cam=s.camera;
   // Sample the same continuous water column at every camera position in either direction.
   const tile=1440,offset=Math.round(cam.x*.29)%tile,top=-Math.round(cam.y*.20);
   for(let x=-offset;x<W;x+=tile)c.drawImage(images.trench,x,top,tile,1088);
   c.fillStyle='rgba(3,24,48,.12)';c.fillRect(0,0,W,H);
   const decor=root.ArcadeSceneryAnimation;
   if(decor){
     if(decor.next&&s.intro>=5&&s.y<410){
       const whale=decor.next(s,'superficie',s.time);
       const visibility=Math.min(1,(410-s.y)/85);
       decor.place(c,whale,cam.x*.22,225-cam.y*.32+Math.sin(s.time*.65)*4,W,242,.72*visibility,900);
     }
     const mantaX=decor.pass(488+s.time*22-cam.x*.29,W,120);
     const mantaY=296-cam.y*.2+Math.sin(s.time*.52)*10;
     if(mantaX>-60&&mantaX<W+60)decor.draw(c,'manta',s.time,mantaX,mantaY,114,.72);
   }
   const cx=(reef.left+reef.right)/2,cy=reef.seabed(cx)-355;
   const caveX=(cx-cam.x-W/2)*.84+W/2-cave.width/2;
   const caveY=(cy-cam.y-H/2)*.80+H/2-cave.height/2;
   if(caveX<W&&caveX+cave.width>0&&caveY<H&&caveY+cave.height>0)c.drawImage(cave,Math.round(caveX),Math.round(caveY));
   faunaLayer(c,s,.28);
   // These arches are on the back wall. The sharper rock lips in front delimit each passage.
   for(const gate of [reef.left+155,reef.right-140]){
    const width=gate<cx?388:320,x=gate-width/2-cam.x,y=reef.seabed(gate)-706-cam.y;
    if(x>W||x+width<0||y>H||y+785<0)continue;
    c.save();c.transform(1,.13,0,1,Math.round(x),Math.round(y-width*.065));
    if(gate>cx){c.translate(width,0);c.scale(-1,1);}
    c.drawImage(images.arch,0,0,width,785);c.restore();
   }
   faunaLayer(c,s,.59);
   c.fillStyle='#bee8e99a';
   for(let i=0;i<36;i++){
    const x=((i*173-cam.x*.58+s.time*4)%1040+1040)%1040-34;
    const y=((i*91-cam.y*.58-s.time*(8+i%9))%610+610)%610-30;
    c.globalAlpha=.24+.4*(1+Math.sin(s.time*.8+i))*.5;
    c.fillRect(Math.round(x),Math.round(y),i%4===0?2:1,1);
   }
   c.globalAlpha=1;
  }
  function terrain(c,s){
   const cam=s.camera,sheet=images.reef;
   for(const rock of reef.rocks){
    if(rock.start>cam.x+W||rock.end<cam.x)continue;
    const length=rock.end-rock.start,base=reef.seabed(rock.start);
    c.save();c.transform(1,(reef.seabed(rock.end)-base)/length,0,1,rock.start,base+rock.depth-rock.height/2);
    if(rock.mirror){c.translate(length,0);c.scale(-1,1);}
    c.drawImage(sheet,0,0,1024,128,0,0,length,rock.height);c.restore();
   }
   // Start and end each strip on the physical bottom, including its flat final stretch.
   const size=560,limit=(3060-650)/.22;
   for(let i=Math.floor(cam.x/size);i<=Math.floor((cam.x+W)/size);i++){
    const start=i*size,end=start+size,breaks=start<limit&&limit<end?[start,limit,end]:[start,end];
    for(let j=1;j<breaks.length;j++){
     const x=breaks[j-1],to=breaks[j],bed=reef.seabed(x);
     if(bed-34>cam.y+H)continue;
     c.save();c.transform(1,(reef.seabed(to)-bed)/(to-x),0,1,x,bed);
     c.fillStyle='#061322';c.fillRect(0,55,to-x+1,600);
     const left=(x-start)/size,w=(to-x)/size;
     if(i%2){c.translate(to-x,0);c.scale(-1,1);}
     c.drawImage(sheet,(i%2?1-left-w:left)*1024,128,w*1024,128,0,-25,to-x+.6,92);
     c.restore();
    }
   }
   const decor=root.ArcadeSceneryAnimation;
   if(decor?.next&&s.intro>=5&&reef.seabed(s.x)-s.y<285){
     const crab=decor.next(s,'lecho',s.time);
     if(crab){
       if(crab.anchor===null){
         const near=cam.x+W*(.18+.34*crab.seed),tile=Math.floor(near/size);
         const fraction=near/size-tile,mirrored=tile%2!==0;
         // Two flat ledges in the reef painting, including their painted height.
         const ledge=(mirrored?1-fraction:fraction)<.615?.45:.78;
         crab.anchor=(tile+(mirrored?1-ledge:ledge))*size;
         crab.floor=reef.seabed(crab.anchor)+(ledge===.45?23:16);
       }
       decor.paint(c,crab.id,crab.frame,crab.anchor,crab.floor,47,.89*crab.alpha);
     }
   }
  }
  return {water,terrain};
 }
 root.ArcadeSeaScenery={create};
})(window);
