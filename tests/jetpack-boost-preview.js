const canvas=document.getElementById('scene'),ctx=canvas.getContext('2d'),img=new Image();let facing=1;
document.getElementById('turn').onclick=()=>facing*=-1;
function frame(t){ctx.fillStyle='#24323c';ctx.fillRect(0,0,1100,480);ctx.imageSmoothingEnabled=false;
 for(const [i,boost] of [false,true].entries()){
  const p={x:0,y:0,anim:t/1000,facing,jetpack:true,jetBoost:boost,form:'soldier',vx:(boost?280:160)*facing,vy:0,fuel:500,fuelMax:680},pose=ArcadeSoldierAnimation.pose(p),f=SOLDIER_V2_FRAMES[pose.row][pose.frame],scale=SOLDIER_V2_SCALE;
  ctx.fillStyle='#f9dda9';ctx.font='20px system-ui';ctx.fillText(boost?'SHIFT · TURBO · 280 px/s · gasolina ×2':'NORMAL · 160 px/s',30+i*550,45);
  ctx.save();ctx.translate(265+i*550,325);ctx.scale(4,4);ArcadeJetpackRenderer.pose(ctx,p);ArcadeJetpackRenderer.draw(ctx,p,[],'back');ctx.save();ctx.scale(facing,1);ctx.drawImage(img,...f.slice(0,4),-f[2]*scale/2,-f[3]*scale,f[2]*scale,f[3]*scale);ctx.restore();ArcadeJetpackRenderer.draw(ctx,p,[],'front');ctx.restore();
 }requestAnimationFrame(frame);
}
img.onload=()=>requestAnimationFrame(frame);img.src='../assets/sprites/soldado-v2.png';
