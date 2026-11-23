window.HELICOPTER_FRAMES=[[8, 242, 504, 211, 332, 174], [512, 237, 500, 216, 336, 179], [1035, 203, 485, 250, 318, 213], [7, 598, 498, 215, 333, 177], [529, 605, 484, 208, 319, 170], [1043, 589, 477, 224, 310, 186]];

window.ArcadePatrolHelicopter={
  draw(c,img,x,y,width,time,flip=false){
    if(!img)return;
    const cell=img.width/8,height=width*img.height/cell,frame=Math.floor(time*12)%8;
    c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);
    c.drawImage(img,frame*cell,0,cell,img.height,-width/2,-height/2,width,height);c.restore();
  }
};
// Door coordinates stay fixed while the painted blades turn above the open cabin.
// The reference point is the middle of the sill on the rescue helicopter used in play.
// Each tail is registered against the fixed boom of the first rescue pose.
const rescueTailOrigins=[[8,242],[520,242],[1025,242],[7,601],[520,601],[1025,601],[1025,242],[520,242]];
window.ArcadeRescueHelicopter={
  draw(c,sheet,x,y,width,time,passenger){
    if(!sheet)return;
    const scale=width/504,phase=Math.floor(time*16)%8;
    const blade=phase*Math.PI/8,dx=Math.cos(blade)*207,dy=Math.sin(blade)*24;
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);c.translate(-294,-173);
    const part=(sx,sy,w,h)=>c.drawImage(sheet,8+sx,242+sy,w,h,sx,sy,w,h);
    // The airframe and door are registered to one pose. Only the rotors change.
    const [tailX,tailY]=rescueTailOrigins[phase];
    c.drawImage(sheet,tailX,tailY,83,99,0,0,83,99);
    part(0,99,83,112);part(83,44,421,167);part(274,24,40,21);
    c.save();c.translate(295,34);c.rotate(Math.atan2(dy,dx));
    const length=Math.hypot(dx,dy);
    for(let i=0;i<2;i++){
      c.drawImage(sheet,8+322,242+28,182,13,0,-6,length,13);
      c.rotate(Math.PI);
    }
    c.restore();part(278,27,31,15);
    c.restore();
    if(passenger){
      c.save();c.beginPath();c.rect(x-29*scale,y-69*scale,57*scale,68*scale);c.clip();
      passenger();c.restore();
    }
  }
};
