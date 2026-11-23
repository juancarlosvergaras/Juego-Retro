window.HELICOPTER_FRAMES=[[8, 242, 504, 211, 332, 174], [512, 237, 500, 216, 336, 179], [1035, 203, 485, 250, 318, 213], [7, 598, 498, 215, 333, 177], [529, 605, 484, 208, 319, 170], [1043, 589, 477, 224, 310, 186]];

window.ArcadePatrolHelicopter={
  draw(c,img,x,y,width,time,flip=false){
    if(!img)return;
    const cell=img.width/8,height=width*img.height/cell,frame=Math.floor(time*12)%8;
    c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);
    c.drawImage(img,frame*cell,0,cell,img.height,-width/2,-height/2,width,height);c.restore();
  }
};
