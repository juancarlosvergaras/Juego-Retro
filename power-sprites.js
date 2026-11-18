(function(root){
'use strict';
let sheet=null,orbitalSheet=null,alienSheet=null;
// The effect sheets were painted with soft neon halos. Every other sprite in
// the game has hard pixel edges, so the halo is cut away and the colours are
// pulled toward the game's muted palette.
function harden(image){
 const doc=root.document;if(!doc||!image||!image.width||!doc.createElement)return image;
 try{const c=doc.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);const data=x.getImageData(0,0,c.width,c.height),d=data.data;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<170){d[i+3]=0;continue;}d[i+3]=255;const grey=(d[i]+d[i+1]+d[i+2])/3;for(let k=0;k<3;k++)d[i+k]=Math.round(grey+(d[i+k]-grey)*.78);}
  x.putImageData(data,0,0);return c;}catch{return image;}
}
function setAlienSheet(image){alienSheet=harden(image);}
function setOrbitalSheet(image){orbitalSheet=harden(image);}
function orbital(ctx,index,x,top,bottom,width,alpha=1){if(!orbitalSheet)return;const cw=orbitalSheet.width/4;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(orbitalSheet,index*cw,0,cw,orbitalSheet.height,x-width/2,top,width,bottom-top);ctx.restore();}
const rows={flame:[0,184],drone:[198,382],turret:[386,582],wave:[582,813],cryo:[813,1010],heal:[1010,1230],orbital:[1230,1470],shield:[1470,1754]};
function setSpriteSheet(image){sheet=harden(image);}
function frame(age,fps=12){return Math.floor(age*fps)%4;}
function draw(ctx,kind,index,x,y,w,h,alpha=1){
 if((kind==='alien'||kind==='alienShot')&&alienSheet){const cw=alienSheet.width/4,ch=alienSheet.height/2;ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(alienSheet,index*cw,kind==='alien'?0:ch,cw,ch,Math.round(x-w/2),Math.round(y-h/2),w,h);ctx.restore();return true;}
 if(!sheet)return false;
 const row=rows[kind],cw=sheet.width/4;
 if(!row)return false;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha;
 ctx.drawImage(sheet,Math.floor(index)*cw,row[0],cw,row[1]-row[0],Math.round(x-w/2),Math.round(y-h/2),w,h);ctx.restore();return true;
}
function turret(ctx,t){
 if(!sheet)return;const cw=sheet.width/4,col=t.flash>0?1+Math.floor((.16-t.flash)*18)%3:0;
 // Keep the tripod on the platform while the independent gun tracks in 360 degrees.
 // Deploy: the tripod lands first and the gun unfolds upward out of it.
 const open=t.age===undefined?1:Math.max(0,Math.min(1,t.age/.3));
 ctx.drawImage(sheet,0,504,cw,78,t.x-22,t.y+10,44,16);
 if(open<=0)return;
 ctx.save();ctx.translate(t.x,t.y+13*(1-open));ctx.rotate(t.angle*open);ctx.scale(1,open);
 if(Math.cos(t.angle)<0)ctx.scale(1,-1);
 ctx.drawImage(sheet,col*cw,386,cw,118,-22,-13,44,24);ctx.restore();
}
function flame(ctx,p,age){
 if(!sheet)return;const cw=sheet.width/4,index=frame(age,18),muzzles=[145,115,105,82],a=p.aim||{x:p.facing,y:0};
 ctx.save();ctx.translate(p.x,p.y-30);ctx.rotate(Math.atan2(a.y,a.x));if(a.x<0)ctx.scale(1,-1);
 // Stable weapon/grip; only the flame changes shape, from the exact same muzzle.
 ctx.drawImage(sheet,0,65,145,99,3,-7,32,22);
 ctx.drawImage(sheet,index*cw+muzzles[index],0,cw-muzzles[index],184,35,-27,100,56);ctx.restore();
}
const api={harden,setAlienSheet,setOrbitalSheet,orbital,setSpriteSheet,draw,frame,turret,flame,rows};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadePowerSprites=api;
})(typeof window!=='undefined'?window:globalThis);
