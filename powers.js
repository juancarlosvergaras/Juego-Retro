(function(root){
'use strict';
const N=typeof module!=='undefined'&&module.exports?require('./enemies.js'):root.ArcadeEnemies;
const F=typeof module!=='undefined'&&module.exports?require('./final-boss.js'):root.ArcadeFinalBoss;
const C=typeof module!=='undefined'&&module.exports?require('./progression.js'):root.ArcadeProgression;
function create(){return{cooldowns:{},beams:[],shake:0,drones:[],turrets:[],marks:[],effects:[],flame:0,quiet:0,age:0,shieldFlash:0,lastShield:null};}
function targets(e){return [...e.enemies.filter(n=>n.hp>0),...(e.boss.active&&e.boss.hp>0?[e.boss]:[]),...(e.finalBoss.active&&e.finalBoss.hp>0?[e.finalBoss]:[]),...(e.tank?.active&&e.tank.hp>0?[e.tank]:[]),...(e.king?.active&&e.king.hp>0&&!['descend','roar'].includes(e.king.phase)?[e.king]:[])];}
function nearest(e,x,y,range=600){return targets(e).filter(n=>Math.hypot(n.x-x,n.y-30-y)<range).sort((a,b)=>Math.hypot(a.x-x,a.y-30-y)-Math.hypot(b.x-x,b.y-30-y))[0];}
function damage(e,n,amount){if(n===e.finalBoss)F.damage(n,amount);else if(n===e.boss||n===e.tank){n.hp=Math.max(0,n.hp-amount);n.hit=.18;}else N.damage(n,amount);}
function blast(s,e,p,x,y,r,amount,color,kind='wave'){for(const n of targets(e))if(Math.hypot(n.x-x,n.y-30-y)<r)damage(e,n,amount*(p.damageBonus||1));s.effects.push({x,y,r,life:.5,duration:.5,color,kind});}
function update(s,e,p,profile,pressed,dt,platforms=[],view={left:0,right:729,top:p.y-600,bottom:p.y+60}){
 p.cloak=Math.max(0,(p.cloak||0)-dt);
 s.age+=dt;s.shieldFlash=Math.max(0,s.shieldFlash-dt);if(s.lastShield!==null&&p.shield<s.lastShield)s.shieldFlash=.3;s.lastShield=p.shield;
 for(const k in s.cooldowns)s.cooldowns[k]=Math.max(0,s.cooldowns[k]-dt);
 s.effects=s.effects.filter(f=>(f.life-=dt)>0);s.flame=Math.max(0,s.flame-dt);
 s.quiet=p.hurt>0?0:s.quiet+dt;if(p.regenLevel&&s.quiet>=30-p.regenLevel*3){e.hp=Math.min(e.maxHp,e.hp+1);s.quiet=0;p.healGlow=.7;s.effects.push({kind:'heal',x:p.x,y:p.y-28,r:45,life:.8,duration:.8});}
 const id=profile.equipped,c=C.catalog.find(c=>c.id===id);let message=null;
 if(pressed&&!p.burrow&&c&&profile.owned.includes(id)&&!s.cooldowns[id]&&!p.transform){
  const target=nearest(e,p.x,p.y-30);let used=true;
  if(id==='cloak'){p.cloak=6;message='Invisibilidad activa · 6 s';}else if(id==='alien'){const list=targets(e).filter(n=>Math.hypot(n.x-p.x,n.y-30-(p.y-30))<520).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x)).slice(0,3);if(!list.length){used=false;message='No hay enemigos al alcance.';}else{for(const n of list){damage(e,n,7*(p.damageBonus||1));n.frozen=Math.max(n.frozen||0,1.4);s.effects.push({kind:'alien',x:p.x,y:p.y-30,tx:n.x,ty:n.y-30,r:65,life:.75,duration:.75});}message='¡PULSO DEL VACÍO!';}}else if(id==='flame'){
   if(p.form==='wolf'||p.form==='zombie'){used=false;message='Lanzallamas: solo soldado.';}
   else{const aim=p.aim||{x:p.facing,y:0};s.flame=.16;for(const n of targets(e)){const dx=n.x-p.x,dy=n.y-30-(p.y-30),along=dx*aim.x+dy*aim.y,side=Math.abs(dx*aim.y-dy*aim.x);if(along>0&&along<140&&side<30)damage(e,n,.45*(p.damageBonus||1));}}
  }else if(id==='drone'){if(target)s.drones.push({x:p.x,y:p.y-45,life:6,target});else{used=false;message='No hay enemigos al alcance.';}}
  else if(id==='turret'){if(p.grounded){s.turrets=[{x:p.x,y:p.y-26,life:15,shot:0,angle:0,flash:0,age:0}];}else{used=false;message='Coloca la torreta sobre una plataforma.';}}
  else if(id==='wave')blast(s,e,p,p.x,p.y-25,130,4,'#ffd36b');
  else if(id==='cryo'){for(const n of targets(e))if(Math.hypot(n.x-p.x,n.y-p.y)<180)n.frozen=3;s.effects.push({x:p.x,y:p.y-30,r:180,life:.65,duration:.65,kind:'cryo',color:'#90eaff'});}
  else if(id==='heal'){if(e.hp<e.maxHp){e.hp=Math.min(e.maxHp,e.hp+3);p.healGlow=.7;s.effects.push({kind:'heal',x:p.x,y:p.y-28,r:45,life:.8,duration:.8});}else{used=false;message='Ya tienes la vida completa.';}}
  else if(id==='orbital'){s.beams.push({x:p.x,y:p.y,r:145,age:0,hits:new Set()});message='¡SUPER RAYO ORBITAL!';}
  if(used)s.cooldowns[id]=c.cooldown;
 }
 s.shake=0;
 for(const beam of s.beams){
  beam.age+=dt;if(beam.age<.45||beam.age>=2)continue;
  s.shake=Math.max(s.shake,12*Math.min(1,(2-beam.age)*2));
  // Damage is confined to the same visible column that is rendered, without waking dormant bosses.
  const left=Math.max(beam.x-beam.r,view.left),right=Math.min(beam.x+beam.r,view.right);
  const victims=[...e.enemies,...(e.boss.active&&e.boss.hp>0?[e.boss]:[]),...(e.won&&e.finalBoss.active&&e.finalBoss.hp>0?[e.finalBoss]:[]),...(e.tank?.active&&e.tank.hp>0?[e.tank]:[]),...(e.king?.active&&e.king.hp>0&&!['descend','roar'].includes(e.king.phase)?[e.king]:[])];
  for(const n of victims){
   const box=n===e.finalBoss?F.box(n):n===e.tank||n===e.king?{x:n.x-n.w/2,y:n.y-n.h,w:n.w,h:n.h}:{x:n.x-(n===e.boss?30:14),y:n.y-(n===e.boss?75:46),w:n===e.boss?60:28,h:n===e.boss?75:46};
   if(n.hp<=0||beam.hits.has(n)||left>=right||box.x+box.w<=left||box.x>=right||box.y+box.h<=view.top||box.y>=view.bottom)continue;
   beam.hits.add(n);
   damage(e,n,24*(p.damageBonus||1));
  }
 }
 s.beams=s.beams.filter(b=>b.age<2);
 for(const d of s.drones){d.life-=dt;if(d.target.hp<=0)d.target=nearest(e,d.x,d.y);if(!d.target){d.life=0;continue;}const dx=d.target.x-d.x,dy=d.target.y-30-d.y,len=Math.hypot(dx,dy)||1;const step=Math.min(len,220*dt);d.x+=dx/len*step;d.y+=dy/len*step;if(len<18){blast(s,e,p,d.x,d.y,85,6,'#ffb54b','orbital');d.life=0;}}
 s.drones=s.drones.filter(d=>d.life>0);
 for(const t of s.turrets){t.life-=dt;t.shot-=dt;t.age+=dt;t.flash=Math.max(0,t.flash-dt);const n=nearest(e,t.x,t.y,320);if(n){t.angle=Math.atan2(n.y-30-t.y,n.x-t.x);if(t.shot<=0){t.shot=.32;t.flash=.16;e.bullets.push({x:t.x+Math.cos(t.angle)*18,y:t.y+Math.sin(t.angle)*18,vx:Math.cos(t.angle)*500,vy:Math.sin(t.angle)*500,life:.65,damage:1*(p.damageBonus||1),enemy:false,fromTurret:true});}}}
 s.turrets=s.turrets.filter(t=>t.life>0);
 for(const m of s.marks){m.t-=dt;if(m.t<=0)blast(s,e,p,m.x,m.y,100,8,'#ff8369','orbital');}s.marks=s.marks.filter(m=>m.t>0);
 return message;
}
function draw(ctx,s,p,e,view={top:-400,bottom:4000}){
 const V=typeof module!=='undefined'&&module.exports?require('./power-sprites.js'):root.ArcadePowerSprites;
 if(!V)return;
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(e)for(const n of targets(e))if(n.frozen>0)V.draw(ctx,'cryo',Math.min(2,Math.floor((3-n.frozen)*9)),n.x,n.y-26,58,58,.75);
 for(const f of s.effects){const phase=1-f.life/(f.duration||.5),index=Math.min(3,Math.floor(phase*4));
  if(f.kind==='alien'){const t=Math.min(1,phase*2);ctx.save();ctx.translate(f.x+(f.tx-f.x)*t,f.y+(f.ty-f.y)*t);ctx.rotate(Math.atan2(f.ty-f.y,f.tx-f.x));V.draw(ctx,'alienShot',phase<.5?1:2,0,0,phase<.5?105:85,65,Math.min(1,f.life*5));ctx.restore();}
  else if(f.kind==='heal')V.draw(ctx,'heal',index,p.x,p.y-(p.form==='wolf'?38:26),p.form==='wolf'?62:45,p.form==='wolf'?88:64,Math.min(1,f.life*5));
  else if(f.kind==='orbital')V.draw(ctx,'orbital',index,f.x,f.y-68,110,190,Math.min(1,f.life*6));
  else V.draw(ctx,f.kind||'wave',index,f.x,f.y,f.r*2,f.r*2,Math.min(1,f.life*6));
 }
 for(const b of s.beams){
  if(b.age<.45){V.draw(ctx,'wave',Math.floor(b.age*10)%4,b.x,b.y,290,35,.8);continue;}
  const phase=b.age<.6?0:b.age>1.7?3:1+Math.floor(b.age*18)%2;
  V.orbital(ctx,phase,b.x,view.top-30,view.bottom+30,290,Math.min(1,(2-b.age)*4));
 }
 for(const d of s.drones)V.draw(ctx,'drone',V.frame(s.age,20),d.x,d.y,44,37);
 for(const t of s.turrets)V.turret(ctx,t);
 for(const m of s.marks){V.draw(ctx,'wave',Math.floor(s.age*8)%4,m.x,m.y+22,58,18,.7);V.draw(ctx,'orbital',0,m.x,m.y-80,35,200,(1-m.t)*.65);}
 if(s.flame>0)V.flame(ctx,p,s.age);
 if(!p.burrow&&(p.shield>0||s.shieldFlash>0)){const wolf=p.form==='wolf',ride=!!p.onMotorcycle;/* On the bike the shield covers rider and machine. */V.draw(ctx,'shield',s.shieldFlash>0?3:Math.floor(s.age*7)%3,p.x,p.y-(ride?36:wolf?38:26),ride?136:wolf?78:58,ride?98:wolf?98:76,s.shieldFlash>0?1:.58);}
 ctx.restore();
}
const api={create,update,draw,nearest};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadePowers=api;
})(typeof window!=='undefined'?window:globalThis);
