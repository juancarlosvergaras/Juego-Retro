(function(root){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function create(random=Math.random){return{random,remaining:15+random()*5,bolt:null,count:0};}
 function update(s,dt,active,camera,width){
  if(!active){s.bolt=null;return;}
  if(s.bolt){s.bolt.age+=dt;if(s.bolt.age>=1.05)s.bolt=null;}
  s.remaining-=dt;
  if(s.remaining<=0){s.bolt={age:0,x:camera.x+width*(.28+s.random()*.44),cameraX:camera.x};s.count++;s.remaining+=15+s.random()*5;}
 }
 function flash(s){const age=s?.bolt?.age;if(age===undefined)return 0;return age<.12?age/.12:age<.34?1-(age-.12)/.22*.6:age<.46?.4:age<.55?.4+(age-.46)/.09*.5:Math.max(0,.9*(1-(age-.55)/.5));}
 function shadow(c,s){const a=flash(s);if(a>.01)c.filter='brightness('+(1-a*.78).toFixed(3)+') saturate(.65)';}
 function cone(c,x,y,dx,length,width,color,alpha){
  const g=c.createLinearGradient(x,y,x+dx,y+length);g.addColorStop(0,'rgba('+color+','+alpha+')');g.addColorStop(.68,'rgba('+color+','+(alpha*.32)+')');g.addColorStop(1,'rgba('+color+',0)');c.fillStyle=g;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.lineTo(x+dx+width,y+length);c.lineTo(x+dx-width,y+length);c.closePath();c.fill();
 }
 function halo(c,x,y,r,color,alpha){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,'rgba('+color+','+alpha+')');g.addColorStop(.28,'rgba('+color+','+(alpha*.28)+')');g.addColorStop(1,'rgba('+color+',0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 // Bounded visible beams; no particles, per-pixel reads or allocations of canvases per frame.
 function sky(c,cam,w,h,time,{inside=false,night=false}={}){
  c.save();c.globalCompositeOperation='screen';
  const spacing=inside?480:620,parallax=inside?1:.28,offset=cam.x*parallax;
  for(let i=Math.floor((offset-220)/spacing);i<Math.ceil((offset+w+220)/spacing);i++){
   const x=i*spacing+120-offset,y=inside?80-cam.y:-100-cam.y*.06,sway=Math.sin(time*.14+i)*14,color=night?'123,157,204':'255,233,176';
   cone(c,x,y,110+sway,inside?500:h-y+70,inside?80:170,color,inside?.16:night?.11:.17);
   cone(c,x+36,y,95+sway,inside?440:h-y+30,inside?20:38,color,inside?.12:night?.08:.13);
  }c.restore();
 }
 function lamp(c,x,y,time){c.save();c.globalCompositeOperation='screen';const a=.15+Math.sin(time*1.5+x)*.018;cone(c,x,y,0,155,65,'255,199,108',a);halo(c,x,y,72,'255,177,81',.25);c.restore();c.fillStyle='#283336';c.fillRect(Math.round(x)-6,Math.round(y)-7,12,5);c.fillStyle='#fff0b6';c.fillRect(Math.round(x)-4,Math.round(y)-2,8,3);}
 function fixtures(c,mission,geometry,cam,w,h,time,inside=false){
  const visible=(x,y,r=160)=>x+r>cam.x&&x-r<cam.x+w&&y+r>cam.y&&y-r<cam.y+h;
  if(mission===1){for(const s of geometry.platforms)if(s.kind==='deck'&&s.floor%4===0&&!s.arena){const x=s.x+s.w*.7,y=s.y+(s.thickness||12)+3;if(visible(x,y))lamp(c,x,y,time);}return;}
  if(inside){c.save();c.globalCompositeOperation='screen';for(const x of [200,820,1430,1950,2370])if(visible(x,535))halo(c,x,535,165,'255,167,68',.25+Math.sin(time*7+x)*.025);c.restore();return;}
  for(const b of geometry.buildings||[]){const d=b.decks?.[0];if(d){const x=d.x+d.w*.5,y=d.y+14;if(visible(x,y))lamp(c,x,y,time);}}
 }
 function storm(c,s,image,cam,w,h){if(!s?.bolt||!image)return;const b=s.bolt,a=flash(s),frame=Math.min(5,Math.floor(b.age/1.05*6)),cw=image.width/3,ch=image.height/2,height=clamp(620-cam.y-40,320,720),width=height*.66,x=b.x-b.cameraX-(cam.x-b.cameraX)*.3;
  c.save();c.globalCompositeOperation='screen';c.fillStyle='rgba(153,183,231,'+(a*.22)+')';c.fillRect(0,0,w,h);c.imageSmoothingEnabled=false;c.globalAlpha=.85*Math.min(1,(1.05-b.age)*4);c.drawImage(image,frame%3*cw,Math.floor(frame/3)*ch,cw,ch,Math.round(x-width/2),Math.round(620-cam.y-height-45),Math.round(width),Math.round(height));c.restore();
 }
 const api={create,update,flash,shadow,sky,fixtures,storm};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeWorldLighting=api;
})(typeof window!=='undefined'?window:globalThis);
