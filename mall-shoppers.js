(function(root){
 'use strict';
 const interior=typeof module!=='undefined'&&module.exports?require('./mall-interior'):root.ArcadeMallInterior;
 const {parallax}=interior;
 // Bay numbers spread sightings along each route independently of the shop scale.
 const visits=[
  [[0,341,0,1],[5,422,1,-1],[8,232,0,-1]],
  [[1,464,1,-1],[5,258,0,1],[8,461,1,1]],
  [[0,283,0,1],[3,501,1,-1],[7,91,0,1]]
 ];
 const tossTime=.66,releaseTime=tossTime/2;
 function create(floor,departed){
  const layout=interior.storefront(floor);
  if(!layout)return [];
  return visits[floor].map(([bay,offset,look,face],i)=>{
   const x=bay*layout.tile+offset*layout.scale;
   return {id:floor+'-'+i,x,y:layout.ground,ground:layout.ground,height:layout.height,
    exits:interior.exits(layout,bay,x),threshold:layout.threshold,look,face,
    phase:'browse',age:i*.37,pace:136+i*9,lag:.06+i*.045};
  }).filter(v=>!departed.has(v.id));
 }
 function hear(s,origin,camera){
  const sourceX=origin.x-camera*(1-parallax);
  for(const v of s.shoppers){
   if(v.phase!=='browse'||Math.hypot(v.x-sourceX,v.y-origin.y)>455)continue;
   v.lastBrowse=frame(v);v.phase='startle';v.age=0;v.escape=sourceX<v.x?1:-1;
   v.exit=v.escape>0?v.exits.right:v.exits.left;
   s.departedShoppers.add(v.id);
  }
 }
 function browsing(v){return v.phase==='browse'||v.phase==='startle'&&v.age<v.lag;}
 function frame(v){
  if(v.phase==='startle'&&v.age<v.lag)return Math.min(7,v.lastBrowse+Math.floor((8-v.lastBrowse)*v.age/v.lag));
  if(v.phase==='browse')return Math.floor(v.age*5)%8;
  if(v.phase==='startle')return Math.min(7,Math.floor(Math.max(0,v.age-v.lag)/tossTime*8));
  return Math.floor(v.distance/5.8)%8;
 }
 // Handle offsets from the common foot pivot in the packed 80-pixel sprites.
 const grips=[
  {browse:[[8,-22],[16,-35],[23,-38],[23,-41],[17,-39],[16,-35],[10,-30],[8,-22]],toss:[[8,-23],[9,-23],[9,-26],[21,-33],[26,-37]]},
  {browse:[[-9,-23],[-5,-23],[-5,-23],[-5,-23],[-6,-23],[-5,-23],[-9,-23],[-8,-23]],toss:[[-8,-22],[-7,-23],[-7,-27],[-2,-32],[22,-37]]}
 ];
 function hand(v,release=false){
  const g=grips[v.look],coords=browsing(v)&&!release?g.browse:g.toss;
  const [dx,dy]=coords[release?4:Math.min(coords.length-1,frame(v))];
  const scale=v.height/64;
  return {x:v.x+dx*scale*v.face,y:v.y+dy*scale};
 }
 // The bag rotates around its handle. Use the lowest corner for ground contact.
 function bottom(b){
  const sine=Math.sin(b.angle),cosine=Math.cos(b.angle);
  return b.scale*(Math.max(-7*sine,8*sine)+Math.max(4*cosine,20*cosine));
 }
 function update(s,dt){
  for(const b of s.shoppingBags){
   b.age+=dt;
   if(b.rest)continue;
   b.vy+=460*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.spin*dt;
   if(b.y+bottom(b)>=b.floor&&b.vy>0){
    b.y=b.floor-bottom(b);
    if(b.vy>74){b.vy=-b.vy*.25;b.vx*=.42;b.spin*=.4;}
    else{b.rest=true;b.angle=Math.sign(b.angle)*1.24;b.y=b.floor-bottom(b);}
   }
  }
  s.shoppingBags=s.shoppingBags.filter(b=>b.age<6);
  for(const v of s.shoppers){
   const previous=v.age;v.age+=dt;
   if(v.phase==='startle'){
    if(previous<v.lag+releaseTime&&v.age>=v.lag+releaseTime){
     const grip=hand(v,true);
     s.shoppingBags.push({...grip,look:v.look,scale:v.height/64,floor:v.ground,
      vx:v.face*(73+v.look*9),vy:-132,angle:0,spin:v.face*4.6,age:0,rest:false});
    }
    if(v.age>=v.lag+tossTime){v.phase='run';v.face=v.escape;v.age=0;v.distance=0;}
   }else if(v.phase==='run'){
    const remaining=Math.abs(v.exit.x-v.x),step=Math.min(remaining,v.pace*dt);
    v.distance+=step;v.x+=step*v.face;
    v.y=v.ground-(v.ground-v.threshold)*Math.max(0,1-Math.abs(v.exit.x-v.x)/28);
    if(step>=remaining){v.phase='enter';v.age=0;}
   }else if(v.phase==='enter'){
    v.distance+=v.pace*.25*dt;
    if(v.age>=.55)v.phase='gone';
   }
  }
  s.shoppers=s.shoppers.filter(v=>v.phase!=='gone');
 }
 function bag(c,x,y,scale,angle,look){
  c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.scale(scale,scale);
  c.strokeStyle='#352b2e';c.lineWidth=2;c.beginPath();c.moveTo(-3,5);c.lineTo(-2,0);c.lineTo(2,-1);c.lineTo(4,5);c.stroke();
  c.fillStyle='#362d32';c.fillRect(-7,4,15,16);
  c.fillStyle=look?'#c65a55':'#c29855';c.fillRect(-6,5,11,14);
  c.fillStyle=look?'#813b43':'#82613e';c.fillRect(5,5,2,14);
  c.fillStyle=look?'#ffc995':'#f2d397';c.fillRect(-5,6,9,2);c.fillRect(-3,11,5,3);c.restore();
 }
 // Use the painted door panels themselves as they slide aside or roll up.
 function drawDoors(c,s,offset,panorama){
  if(!panorama)return;
  for(const v of s.shoppers){
   if(v.phase!=='run'&&v.phase!=='enter'||v.exit.x<offset-40||v.exit.x>offset+1000)continue;
   const entering=v.phase==='enter';
   const open=entering?Math.min(1,(.55-v.age)/.22):Math.min(1,Math.max(0,(48-Math.abs(v.exit.x-v.x))/37));
   if(open<=0)continue;
   const {width:w,height:h,center,sourceWidth,sourceTop}=v.exit,x=v.exit.x-w/2,y=v.threshold-h;
   const image=panorama.image,ratio=image.width/panorama.layout.tile;
   const px=image.width/interior.referenceWidth,sx=(center-sourceWidth/2)*px,sy=sourceTop*px;
   c.fillStyle='#242529';c.fillRect(x,y,w,h);
   // A dim slice of the shop interior remains visible through the opening.
   c.save();c.globalAlpha=.32;c.drawImage(image,sx-33*ratio,sy,w*ratio,h*ratio,x,y,w,h);c.restore();
   if(s.floor===2){
    const left=h-Math.round((h-5)*open);
    c.drawImage(image,sx,sy+(h-left)*ratio,w*ratio,left*ratio,x,y,w,left);
   }else{
    const leaf=w/2,visible=leaf-Math.round((leaf-3)*open);
    c.drawImage(image,sx+(leaf-visible)*ratio,sy,visible*ratio,h*ratio,x,y,visible,h);
    c.drawImage(image,sx+leaf*ratio,sy,visible*ratio,h*ratio,x+w-visible,y,visible,h);
   }
  }
 }
 function draw(c,s,atlas,panorama){
  if(!s.shoppers.length&&!s.shoppingBags.length)return;
  const offset=Math.round(s.camera.x*parallax);
  c.save();c.translate(-offset,0);
  drawDoors(c,s,offset,panorama);
  for(const v of s.shoppers){
   if(v.x<offset-45||v.x>offset+1005)continue;
   const entering=v.phase==='enter',running=v.phase==='run'||entering,scale=v.height/64*(entering?1-Math.min(.13,v.age*.48):1);
   const row=v.look*3+(browsing(v)?0:running?2:1);
   c.save();
   if(entering)c.globalAlpha=Math.max(0,1-v.age/.27);
   c.fillStyle='#13212e54';c.beginPath();c.ellipse(v.x,v.y+1,v.height*.19,2,0,0,Math.PI*2);c.fill();
   c.translate(Math.round(v.x),Math.round(v.y));c.scale(v.face*scale,scale);
   c.drawImage(atlas,frame(v)*80,row*80,80,80,-40,-74,80,80);c.restore();
   if(v.phase==='browse'||v.phase==='startle'&&v.age<v.lag+releaseTime){
    const grip=hand(v);bag(c,grip.x,grip.y,scale,0,v.look);
   }
  }
  for(const b of s.shoppingBags){
   if(b.x<offset-15||b.x>offset+975)continue;
   c.save();c.globalAlpha=Math.min(1,6-b.age);bag(c,b.x,b.y,b.scale,b.angle,b.look);c.restore();
  }
  c.restore();
 }
 const api={parallax,create,hear,update,draw};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMallShoppers=api;
})(typeof window!=='undefined'?window:globalThis);
