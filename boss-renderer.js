(function(root){
  function whiteGun(ctx,b,p){
    const g=root.ArcadeFinalBoss.whiteGun(b,p);
    ctx.save();ctx.translate(g.hand.x,g.hand.y);ctx.scale(g.facing,1);ctx.rotate(g.angle);
    const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    // Stock sits against the forearm; fingers cover the grip and fore-end.
    r(-17,-5,17,9,'#172124');r(-15,-4,14,6,'#5e6546');r(-13,-4,11,2,'#9c9c6c');
    r(-2,-7,25,10,'#152026');r(0,-6,20,3,'#73858b');r(0,-2,21,4,'#37494f');
    r(21,-5,10,4,'#172124');r(23,-5,6,1,'#9daeb0');r(28,-7,2,3,'#1c2529');
    r(4,3,6,10,'#172124');r(5,4,3,7,'#52604d');r(12,-8,3,2,'#172124');
    r(-4,-1,7,6,'#292e30');r(-3,0,5,4,'#b4b8ae');r(-2,0,4,1,'#ebeadb');
    r(15,0,7,5,'#292e30');r(16,1,5,3,'#a5aaa3');
    if(b.flash>0)root.ArcadeBossAttackSprites?.draw(ctx,'blast',.16-b.flash,37,0,24,20,{duration:.16,loop:false});
    ctx.restore();
  }
  function cannonArt(ctx,b){
    const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    r(-11,31,22,23,'#172127');r(-9,33,18,19,'#454d3d');r(-8,39,16,3,'#9a8459');r(-8,48,16,3,'#9a8459');
    r(-16,18,32,22,'#131c20');r(-14,20,28,16,'#4f5545');r(-13,22,26,3,'#878671');
    for(const x of [-10,0,10]){r(x-5,0,10,29,'#121b21');r(x-4,1,8,25,'#4c6064');r(x-4,2,3,21,'#8e9c95');r(x+3,2,2,22,'#2b3c43');r(x-5,-2,10,5,'#19272d');r(x-4,-1,8,2,'#a3aaa0');r(x-3,-2,6,2,'#101619');r(x-2,0,4,7,'#aeb7a7');r(x-1,-2,2,3,'#cf7951');r(x-7,13,14,3,'#9a8055');r(x+4,7,2,3,'#151f24');r(x+4,19,2,3,'#151f24');r(x-3,5,1,6,'#c1c1a5');
      if(b.recoil>0)root.ArcadeBossAttackSprites?.draw(ctx,'blast',.25-b.recoil,x,-10,17,25,{duration:.25,loop:false});}
    r(-11,34,22,3,'#89734f');r(1,23,3,4,b.phase==='charge'?'#ffe57c':'#ae463b');
  }
  function blackCannon(ctx,b){if(b.stage===2)return;const port=root.ArcadeFinalBoss.cannon(b);ctx.save();ctx.translate(port.x,port.y);cannonArt(ctx,b);ctx.restore();}
  function zombieEffects(ctx,b){ctx.save();if(b.phase==='attack')root.ArcadeBossAttackSprites?.draw(ctx,'slash',b.age,b.x+b.facing*43,b.y-45,95,80,{flip:b.facing<0,duration:.35,loop:false});
    if(b.discarded){const d=b.discarded;ctx.save();ctx.globalAlpha=Math.min(1,d.life);ctx.translate(d.x,d.y);ctx.rotate(d.angle);cannonArt(ctx,{recoil:0});ctx.restore();}
    if(b.marker){const m=b.marker,locked=b.phase!=='track';ctx.fillStyle=locked?'#ff574866':'#b6ef6244';ctx.strokeStyle=locked?'#ff8260':'#d7ff87';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(m.x,m.y-2,100,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=locked?'#ffc3a7':'#d7ff87';ctx.fillText(locked?'¡APÁRTATE!':'TE SIGUE',m.x,m.y-19);}
    if(b.phase==='mutate'){ctx.globalAlpha=.35;ctx.strokeStyle='#b2dd66';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(b.x,b.y-65,40+b.age*12,70+b.age*6,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  function missiles(ctx,b){for(const m of b.missiles){
    const pos=root.ArcadeFinalBoss.missilePosition(m),ground=m.targetY??root.ArcadeFinalBoss.ARENA.y;
    ctx.save();ctx.strokeStyle=Math.floor(m.t*10)%2?'#ff654b':'#ffc475';ctx.fillStyle='#ef553333';ctx.fillRect(m.targetX-48,ground-5,96,5);ctx.lineWidth=2;ctx.strokeRect(m.targetX-46,ground-5,92,4);ctx.beginPath();ctx.moveTo(m.targetX-7,ground-15);ctx.lineTo(m.targetX+7,ground-15);ctx.moveTo(m.targetX,ground-22);ctx.lineTo(m.targetX,ground-8);ctx.stroke();
    root.ArcadeBossAttackSprites?.draw(ctx,'missile',m.t,pos.x,pos.y,31,14,{angle:m.t>=.7?Math.PI/2:-Math.PI/2});ctx.restore();
  }}
  root.ArcadeBossRenderer={whiteGun,blackCannon,missiles,zombieEffects};
})(typeof window!=='undefined'?window:globalThis);
