(function(root){
  'use strict';
  const knife=[
    [35,88,280,308,170,390],[376,88,246,306,495,390],[651,88,285,306,805,390],[991,88,242,306,1115,390],
    [43,470,244,292,160,756],[323,470,291,292,478,756],[627,493,352,270,800,756],[988,470,246,292,1115,756],
    [47,819,261,269,164,1085],[344,860,255,302,470,1158],[635,935,269,230,780,1166],[918,1050,327,122,1092,1170]
  ];
  function frame(n){
    if(n.kind==='knife')return n.hp<=0?(n.death>.55?10:11):n.hit>0?9:n.attackAge!==null&&n.attackAge!==undefined?(n.attackAge<.24?5:n.attackAge<.4?6:7):!n.grounded?8:Math.abs(n.vx)>10?Math.floor((n.runCycle||0)*4)%4:4;
    return n.hp<=0?(n.death>.55?6:7):n.hit>0?5:n.flash>0?(n.burst%2?2:3):n.shot>1.3?4:n.alert?1:0;
  }
  const ramFrames=[
    [[27,70,257,265],[323,76,272,259],[618,128,288,197],[943,226,292,111]],
    [[19,378,243,250],[315,380,272,234],[625,427,274,187],[946,526,289,106]],
    [[22,664,257,254],[321,660,264,243],[627,716,291,202],[943,827,296,101]],
    [[53,951,243,249],[348,951,257,230],[642,999,287,200],[929,1108,303,95]]
  ],ramBases=[337,632,928,1203],ramScales=[.175,.19,.185,.20];
  function drawRam(c,n,image){
    if(!n.ramHit||!image)return false;
    const row={rifle:0,turret:1,knife:2,zombie:3}[n.kind];if(row===undefined)return false;
    const index=n.grounded&&n.ramHit.age>.2?3:n.ramHit.age<.09?0:n.ramHit.age<.23?1:2,f=ramFrames[row][index],scale=ramScales[row];
    c.save();c.translate(Math.round(n.x),Math.round(n.y));c.scale(-n.ramHit.dir,1);if(n.hp<=0)c.globalAlpha=Math.min(1,n.death/.3);
    if(n.kind==='zombie'&&n.variant===1)c.filter='hue-rotate(22deg) saturate(.8)';if(n.kind==='zombie'&&n.variant===2)c.filter='hue-rotate(-18deg) brightness(.92)';
    c.drawImage(image,...f,-f[2]*scale/2,(f[1]-ramBases[row])*scale,f[2]*scale,f[3]*scale);c.restore();return true;
  }
  function draw(ctx,n,images){
    if(root.ArcadeExpansionEnemies?.draw(ctx,n,images.expansion))return true;
    if(n.kind!=='turret'&&n.kind!=='knife')return false;
    const image=images[n.kind];if(!image)return false;
    const index=frame(n),col=index%4,row=Math.floor(index/4),scale=n.kind==='knife'?.16:.17;
    const f=n.kind==='knife'?knife[index]:[col*384,row*512,384,512,col*384+126,row?900:440];
    ctx.save();ctx.translate(Math.round(n.x),Math.round(n.y));ctx.scale(n.facing,1);
    if(n.hp<=0)ctx.globalAlpha=Math.min(1,n.death*2);
    const aiming=n.kind==='turret'&&n.hp>0&&n.turretAim;
    if(aiming){ctx.save();ctx.beginPath();ctx.rect(-100,-150,230,180);ctx.rect(8.33,-35,62,15);ctx.clip('evenodd');}
    ctx.drawImage(image,f[0],f[1],f[2],f[3],(f[0]-f[4])*scale,(f[1]-f[5])*scale,f[2]*scale,f[3]*scale);
    if(aiming){ctx.restore();ctx.translate(15.64,-28.22);ctx.rotate(n.turretAim.angle);ctx.drawImage(image,175,239,209,71,-43*.17,-35*.17,209*.17,71*.17);if(n.flash>0){ctx.fillStyle='#ff3344';ctx.fillRect(28,-2,8,4);ctx.fillStyle='#fff0d4';ctx.fillRect(28,-1,5,2);}}
    ctx.restore();return true;
  }
  const api={draw,frame,drawRam};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeEnemySpecialists=api;
})(typeof window!=='undefined'?window:globalThis);
