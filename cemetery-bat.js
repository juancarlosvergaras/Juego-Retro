(function(root){
  'use strict';
  // Anchors are measured in the tree atlas: the sleeping bat's toes touch bark.
  const TREES=[{x:10060,art:0,scale:.30},{x:11480,art:1,scale:.28},{x:12510,art:2,scale:.31},{x:14420,art:0,scale:.27},{x:16030,art:1,scale:.32}];
  const ROOSTS=[{tree:0,x:365,y:562},{tree:1,x:173,y:448},{tree:2,x:396,y:442},{tree:3,x:365,y:562},{tree:4,x:348,y:338},{tree:2,x:157,y:604}];
  function trees(){return TREES.map(t=>({...t,y:620}));}
  function create(defeated=[],index=0){const roost=ROOSTS[index],tree=TREES[roost.tree],id=200+index,x=tree.x+(roost.x-256)*tree.scale,y=620-(882-roost.y)*tree.scale+24;return{id,treeIndex:roost.tree,kind:'bat',x,y,home:{x,y},w:24,h:20,hp:defeated.includes(id)?0:1,maxHp:1,baseHp:1,phase:'sleep',age:0,anim:0,vx:0,vy:0,facing:1,hit:0,flash:0,death:0,alert:false,attackReady:false};}
  function createAll(defeated=[]){return ROOSTS.map((_,index)=>create(defeated,index));}
  function phase(n,value){n.phase=value;n.age=0;}
  function update(n,p,dt){
    n.anim+=dt;n.age+=dt;
    if(n.hp<=0){n.death=Math.max(0,n.death-dt);n.vy+=650*dt;n.y=Math.min(620,n.y+n.vy*dt);return;}
    const distance=Math.hypot(p.x-n.x,p.y-24-(n.y-10));
    if(n.phase==='sleep'){if(distance<(n.wakeRadius||250)&&Math.abs(p.x-n.x)<(n.wakeWidth||Infinity)||n.hit>0){phase(n,'wake');n.alert=true;}return;}
    if(n.phase==='wake'){if(n.wallRoost){const t=Math.min(1,n.age/.65);n.x=n.home.x+n.roostSide*40*t;n.y=n.home.y-Math.sin(t*Math.PI)*7;n.facing=n.roostSide;}if(n.age>=.65)phase(n,'aim');return;}
    if(Math.abs(p.x-n.home.x)>650&&n.phase!=='return')phase(n,'return');
    if(n.phase==='return'){
      const dx=n.home.x-n.x,dy=n.home.y-n.y,d=Math.hypot(dx,dy),step=145*dt;
      if(d<=step){n.x=n.home.x;n.y=n.home.y;n.alert=false;n.attackReady=false;phase(n,'sleep');}
      else{n.x+=dx/d*step;n.y+=dy/d*step;n.facing=Math.sign(dx)||n.facing;}return;
    }
    if(n.phase==='aim'){
      n.facing=Math.sign(p.x-n.x)||n.facing;
      if(n.age>=.4){const dx=p.x-n.x,dy=p.y-18-n.y,d=Math.hypot(dx,dy)||1;n.vx=dx/d*240;n.vy=dy/d*240;n.attackReady=true;phase(n,'dive');}
      return;
    }
    if(n.phase==='dive'){
      n.x+=n.vx*dt;n.y+=n.vy*dt;n.facing=Math.sign(n.vx)||n.facing;
      if(n.age>.85||n.y>=611){n.y=Math.min(n.y,611);n.attackReady=false;phase(n,'recover');}
      return;
    }
    if(n.phase==='recover'){
      n.x+=n.facing*65*dt;n.y=Math.max(n.home.y-30,n.y-120*dt);
      if(n.age>1.15)phase(n,'aim');
    }
  }
  function contact(n,p){
    if(n.hp<=0||n.frozen>0||n.phase!=='dive'||!n.attackReady)return false;
    if(Math.abs(n.x-p.x)>24||n.y<p.y-(p.h||46)||n.y-n.h>p.y)return false;
    n.attackReady=false;phase(n,'recover');return true;
  }
  // Each frame uses a body anchor, so wide wing strokes never move the torso.
  const FRAMES=[[162,78,124,280,224,78],[570,70,199,290,672,70],[980,60,264,316,1142,319],[1374,160,359,208,1587,316],[14,569,470,157,274,666],[528,558,343,236,736,637],[948,525,330,220,1191,707],[1414,548,260,230,1550,679]];
  function draw(c,n,image){if(!image||n.hp<=0&&n.death<=0)return;if(n.wallRoost&&n.hp>0&&n.phase==='sleep'){c.save();c.fillStyle='#c3a36b';c.fillRect(Math.round(n.x)-3,Math.round(n.y)-12,2,1);c.fillRect(Math.round(n.x)+2,Math.round(n.y)-12,2,1);c.restore();return;}const sleeping=!n.wallRoost&&(n.phase==='sleep'||n.phase==='wake'),index=n.hp<=0?7:sleeping?(n.phase==='wake'?1:0):n.phase==='dive'?6:[2,3,4,5,4,3][Math.floor(n.anim*12)%6],f=FRAMES[index],scale=.09;
    c.save();if(n.wallRoost&&n.phase==='wake')c.globalAlpha=Math.min(1,n.age/.22);c.translate(Math.round(n.x),Math.round(n.y));c.scale(sleeping?1:n.facing,1);if(n.hp<=0)c.globalAlpha=Math.min(1,n.death*2);if(n.hit>0)c.filter='brightness(1.7)';c.drawImage(image,...f.slice(0,4),(f[0]-f[4])*scale,(f[1]-f[5])*scale-(sleeping?24:10),f[2]*scale,f[3]*scale);c.restore();
  }
  function drawTrees(c,image,cam,width){if(!image)return;for(const t of trees()){const w=512*t.scale;if(t.x+w/2<cam.x||t.x-w/2>cam.x+width)continue;c.drawImage(image,t.art*512,100,512,790,t.x-w/2,t.y-(882-100)*t.scale,w,790*t.scale);}}
  const api={trees,create,createAll,update,contact,draw,drawTrees};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeCemeteryBat=api;
})(typeof window!=='undefined'?window:globalThis);
