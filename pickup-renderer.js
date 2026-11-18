(function(root){
 'use strict';
 // The mission-one artwork is the single visual vocabulary for every world.
 function weapon(ctx,item,time=0,p){
  const x=item.x,y=item.y-(item.slot===7?18:12),near=!!p&&Math.abs(p.x-x)<65&&Math.abs(p.y-item.y)<45;
  const seed=typeof item.id==='number'?item.id:0,pulse=.5+.5*Math.sin(time*3+seed);
  ctx.save();ctx.textAlign='left';ctx.fillStyle='#111b28bb';ctx.fillRect(x-22,y-17,44,34);
  ctx.shadowColor='#ffd476';ctx.shadowBlur=near?10:6;ctx.strokeStyle='rgba(255,210,118,'+(near?.9:.4+pulse*.2)+')';ctx.lineWidth=1;
  ctx.strokeRect(x-22.5,y-17.5,45,35);ctx.shadowBlur=0;
  ctx.fillStyle='#ffe9ab';const sparkX=x+17,sparkY=y-12-Math.round(pulse*3);ctx.fillRect(sparkX-2,sparkY,5,1);ctx.fillRect(sparkX,sparkY-2,1,5);
  ctx.fillStyle='#10181da0';ctx.fillRect(x-19,item.y-3,38,3);ctx.fillStyle=near?'#fbc87250':'#fbc87220';ctx.fillRect(x-18,item.y-5,36,2);
  root.ArcadeWeaponRenderer.pickup(ctx,item.slot,x,y);
  ctx.fillStyle='#14212a';ctx.fillRect(x-5,y-23,10,10);ctx.fillStyle='#ffe1a1';ctx.font='bold 8px monospace';ctx.fillText(String(item.slot),x-2,y-15);
  if(near){ctx.textAlign='center';ctx.font='8px monospace';ctx.fillStyle='#ffe9b6';ctx.fillText(root.ArcadeArsenal.weapons[item.slot].name,x,y-27);}ctx.restore();
 }
 function fuel(ctx,t){ctx.save();ctx.translate(Math.round(t.x),Math.round(t.y));ctx.shadowColor='#7ddce6';ctx.shadowBlur=7;ctx.fillStyle='#152c32';ctx.fillRect(-10,-26,20,26);ctx.shadowBlur=0;ctx.fillStyle='#cc9a35';ctx.fillRect(-8,-23,16,22);ctx.fillStyle='#ffe395';ctx.fillRect(-7,-22,3,19);ctx.fillStyle='#293d42';ctx.fillRect(-5,-29,10,5);ctx.fillRect(2,-27,7,4);ctx.fillStyle='#22383e';ctx.fillRect(-3,-17,6,10);ctx.fillStyle='#d6f7ee';ctx.fillRect(-1,-16,2,6);ctx.font='7px monospace';ctx.textAlign='center';ctx.fillStyle='#bff6ec';ctx.fillText('GAS',0,-34);ctx.restore();}
 function star(ctx,a,time=0){const seed=typeof a.id==='number'?a.id:0,y=a.y+Math.sin(time*3+seed)*3;ctx.save();ctx.beginPath();for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,r=i%2?5:12,x=a.x+Math.cos(angle)*r,py=y+Math.sin(angle)*r;if(i===0)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.closePath();ctx.fillStyle='#ffe77b';ctx.strokeStyle='#895126';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.fillStyle='#fff9da';ctx.fillRect(a.x-2,y-4,3,3);ctx.restore();}
 function draw(ctx,item,time=0,p){if(item.taken)return;if(item.type==='health'||item.type==='red'||item.type==='full')root.ArcadeMedkits.draw(ctx,[item],p,{y:item.y-50},100);else if(item.type==='fuel')fuel(ctx,item);else if(item.type==='star')star(ctx,{...item,y:item.y-23},time);else weapon(ctx,item,time,p);}
 root.ArcadePickupRenderer={draw,weapon,fuel,star};
})(typeof window!=='undefined'?window:globalThis);
