const ctx=document.getElementById('scene').getContext('2d'),images={};let time=0,last=0,animate=true;
document.getElementById('animate').onclick=()=>animate=!animate;
function draw(now){if(animate)time+=Math.min(.04,(now-last)/1000||0);last=now;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#42515a';ctx.fillRect(0,0,1200,600);ctx.font='18px system-ui';ctx.fillStyle='#ffe1a1';ctx.fillText('Torreta: reposo · aviso · ráfaga · recarga',20,28);ctx.fillText('Cuchillo: carrera · preparación · estocada · caída',20,340);
 for(let i=0;i<4;i++){
  const n={kind:'turret',hp:3,grounded:true,x:0,y:0,facing:1,shot:i===3?2:0,alert:i>0,flash:i===2&&time%0.14<.09?.09:0,burst:Math.floor(time/.14)%5};
  ctx.save();ctx.translate(85+i*300,245);ctx.scale(3,3);ArcadeEnemySpecialists.draw(ctx,n,images);ctx.restore();
  const k={kind:'knife',hp:i===3?0:3,death:.25,x:0,y:0,facing:1,grounded:true,vx:i===0?235:0,runCycle:time*3,attackAge:i===1?.1:i===2?.3:null};
  ctx.save();ctx.translate(90+i*300,545);ctx.scale(3,3);ArcadeEnemySpecialists.draw(ctx,k,images);ctx.restore();
 }
 ctx.fillStyle='#b4ae99';ctx.fillRect(0,246,1200,3);ctx.fillRect(0,546,1200,3);requestAnimationFrame(draw);
}
Promise.all(Object.entries({turret:'enemigo-torreta-v1.png',knife:'enemigo-cuchillo-v1.png'}).map(([key,file])=>new Promise(resolve=>{const i=new Image();i.onload=()=>{images[key]=prepareWhiteDeath(i);resolve();};i.src='../assets/sprites/'+file;}))).then(()=>requestAnimationFrame(draw));
