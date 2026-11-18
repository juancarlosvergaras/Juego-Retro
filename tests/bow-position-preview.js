const c=document.getElementById('scene').getContext('2d'),images={};let age=10,time=0,last=0;
document.getElementById('fire').onclick=()=>age=0;
function frame(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;time+=dt;age+=dt;c.imageSmoothingEnabled=false;c.fillStyle='#34454d';c.fillRect(0,0,1200,570);
 for(let i=0;i<6;i++){const facing=i%2?-1:1,y=i<2?0:i<4?-.707:.707,x=y?facing*.707:facing,walk=i>=4,p={x:0,y:0,facing,aim:{x,y},grounded:true,vx:walk?145:0,anim:time,walkCycle:time*2,form:'soldier'},e={inventory:{selected:7},weaponAction:{slot:7,age,duration:.6}},pose=ArcadeSoldierAnimation.pose(p,{},e),gait=ArcadeSoldierAnimation.gait(p);
  c.save();c.translate(155+(i%3)*400,245+Math.floor(i/3)*285);c.scale(3.5,3.5);
  function sprite(sheet,atlas,row,index,scale,bob=0){const f=atlas[row][index];c.save();c.translate(0,bob);c.scale(facing,1);c.drawImage(sheet,...f.slice(0,4),-(f[5]??f[2]/2)*scale,-f[3]*scale,f[2]*scale,f[3]*scale);c.restore();}
  ArcadeSoldierAnimation.drawGait(c,p,gait,index=>sprite(images.walk,WALK_FRAMES,0,index,WALK_SCALE),bob=>sprite(images.soldier,SOLDIER_V2_FRAMES,pose.row,pose.frame,SOLDIER_V2_SCALE,bob));
  if(gait)c.translate(0,gait.bob);ArcadeWeaponRenderer.draw(c,p,e);c.restore();
 }requestAnimationFrame(frame);
}
Promise.all(Object.entries({soldier:'soldado-v2.png',walk:'soldado-pasos-v3.png'}).map(([key,file])=>new Promise(resolve=>{const i=new Image();i.onload=()=>{images[key]=i;resolve();};i.src='../assets/sprites/'+file;}))).then(()=>requestAnimationFrame(frame));
