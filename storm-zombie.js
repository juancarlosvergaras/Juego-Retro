(function(root){
 'use strict';const common=typeof module!=='undefined'&&module.exports;
 function create(saved={}){return{id:400,kind:'stormZombie',baseHp:42,maxHp:42,hp:Number.isFinite(saved.hp)?Math.max(0,Math.min(42,saved.hp)):42,x:Math.max(16080,Math.min(17170,saved.x||16840)),y:620,w:38,h:82,facing:-1,anim:0,vx:0,hit:0,flash:0,death:0,active:false,phase:'idle',age:0,cycle:0,wait:1.5,grounded:true};}
 function update(n,p,dt,bullets,view){n.anim+=dt;if(n.hp<=0){n.death=Math.max(0,n.death-dt);return;}
  const visible=!view||(n.x>view.left+25&&n.x<view.right-25&&n.y>view.top+25&&n.y-n.h<view.bottom-15);
  if(!visible){n.active=false;n.vx=0;n.phase='idle';n.age=0;n.wait=1.5;n.zombiePose=0;return;}
  const dx=p.x-n.x;if(Math.abs(dx)<650)n.active=true;if(!n.active)return;n.age+=dt;
  if(n.phase==='idle'){n.facing=Math.sign(dx)||n.facing;n.wait-=dt;n.vx=Math.abs(dx)>230?n.facing*35:0;n.x=Math.max(16080,Math.min(17170,n.x+n.vx*dt));if(n.wait<=0){n.phase=['ray','ring','plasma'][n.cycle++%3];n.age=0;n.target={x:p.x,y:p.y-(p.h||46)*.5};n.fired=false;}return;}
  n.vx=0;n.zombieAction=n.phase==='plasma'?'plasma':'ray';n.zombiePose=Math.max(.05,.45-n.age*.16);
  if(n.age>=.85&&!n.fired){n.fired=true;const sx=n.x+n.facing*22,sy=n.y-57,angle=Math.atan2(n.target.y-sy,n.target.x-sx);
   if(n.phase==='ring'){for(const direction of [-1,1])bullets.push({x:n.x+direction*30,y:610,vx:direction*240,vy:0,life:1.7,enemy:true,stormRay:true,damage:2});}
   else for(const offset of n.phase==='plasma'?[-.24,0,.24]:[0]){const a=angle+offset;bullets.push({x:sx,y:sy,vx:Math.cos(a)*(n.phase==='ray'?510:220),vy:Math.sin(a)*(n.phase==='ray'?510:220),life:2.4,enemy:true,stormRay:n.phase==='ray',zombiePlasma:n.phase==='plasma',age:0,damage:n.phase==='ray'?2:1});}
  }
  if(n.age>=1.55){n.phase='idle';n.age=0;n.wait=1.2;n.zombiePose=0;}
 }
 function draw(c,n){const Z=common?require('./zombie-form'):root.ArcadeZombieForm;c.save();if(n.hp<=0)c.globalAlpha=Math.min(1,n.death*3);Z.draw(c,n,82/68);c.restore();if(n.hp>0&&n.phase!=='idle'&&!n.fired){c.save();c.strokeStyle=n.phase==='plasma'?'#a4eb60':'#80eaff';c.lineWidth=2;c.setLineDash([6,5]);c.beginPath();if(n.phase==='ring')c.ellipse(n.x,n.y-2,120,8,0,0,Math.PI*2);else{c.moveTo(n.x+n.facing*22,n.y-57);c.lineTo(n.target.x,n.target.y);}c.stroke();c.restore();}}
 const api={create,update,draw};if(common)module.exports=api;else root.ArcadeStormZombie=api;
})(typeof window!=='undefined'?window:globalThis);
