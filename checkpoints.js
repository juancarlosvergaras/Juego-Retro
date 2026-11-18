(function(root){
 'use strict';
 const CITY=[420,2000,3500,5100,7000,8050,9900,11750,13850,15960,17360];
 function stations(mission,platforms=[]){
  if(mission===3)return [250,2200,4050,5960].map((x,i)=>({id:'three-'+i,x,y:620,inside:false,floor:0}));
  if(mission===2)return [...CITY.map((x,i)=>({id:'two-out-'+i,x,y:620,inside:false,floor:0})),...[210,1795].map((x,i)=>({id:'two-in-'+i,x,y:620,inside:true,floor:0}))];
  const ground=platforms.find(p=>p.kind==='ground'),list=ground?[{id:'one-ground',x:340,y:ground.y,inside:false,floor:0}]:[];
  for(const floor of [3,6,9,12,15,18,20]){const deck=platforms.filter(p=>p.kind==='deck'&&p.floor===floor&&!p.arena).sort((a,b)=>b.w-a.w)[0];if(deck)list.push({id:'one-floor-'+floor,x:Math.round(deck.x+deck.w*.45),y:deck.y,inside:false,floor});}
  return list;
 }
 function create(mission,platforms,saved){
  const list=stations(mission,platforms),valid=id=>list.some(p=>p.id===id),active=valid(saved?.active)?saved.active:null;
  const visited=new Set(Array.isArray(saved?.visited)?saved.visited.filter(valid):[]);if(active)visited.add(active);
  return{stations:list,active,visited,contact:null,flash:0};
 }
 function snapshot(s){return{active:s.active,visited:[...s.visited]};}
 function spawn(s,fallback){return s.stations.find(p=>p.id===s.active)||fallback;}
 function update(s,p,dt,{inside=false,blocked=false}={}){
  s.flash=Math.max(0,s.flash-dt);
  if(blocked||!p.grounded||p.burrow||p.rope||p.ladder||p.transform>0||p.jetpack){s.contact=null;return null;}
  const near=s.stations.find(c=>c.inside===!!inside&&Math.abs(p.x-c.x)<=34&&Math.abs(p.y-c.y)<=8);
  if(!near){s.contact=null;return null;}
  if(s.contact===near.id||s.active===near.id){s.contact=near.id;return null;}
  s.active=near.id;s.contact=near.id;s.visited.add(near.id);s.flash=2.8;return near;
 }
 let sheet;
 function setSheet(image){sheet=image;}
 function draw(c,s,inside,time,view){
  if(!sheet)return;
  for(const pc of s.stations){if(pc.inside!==!!inside||view&&(pc.x<view.left-75||pc.x>view.right+75||pc.y<view.top||pc.y-65>view.bottom))continue;
   const active=pc.id===s.active,visited=s.visited.has(pc.id),boot=active&&s.flash>2.5,frame=boot?1:visited?2+Math.floor(time*2)%2:0;
   const sx=frame*543+40,sy=98,sw=470,sh=554,scale=40/sh;
   c.save();c.imageSmoothingEnabled=false;c.drawImage(sheet,sx,sy,sw,sh,Math.round(pc.x-sw*scale/2),Math.round(pc.y-sh*scale),sw*scale,sh*scale);
   c.fillStyle=active?'#a7ffd5':visited?'#75bcac':'#d5b778';c.font='bold 6px monospace';c.textAlign='center';c.fillText('CHECK POINT',Math.round(pc.x),Math.round(pc.y-46));
   if(active){c.fillStyle='#90ecc9';c.fillRect(Math.round(pc.x-20),Math.round(pc.y),40,2);}
   if(active&&s.flash>0){const age=2.8-s.flash;c.globalAlpha=Math.min(1,s.flash*2);c.fillStyle='#123831dd';c.fillRect(Math.round(pc.x-51),Math.round(pc.y-75-age*4),102,18);c.strokeStyle='#8fffc8';c.strokeRect(Math.round(pc.x-51)+.5,Math.round(pc.y-75-age*4)+.5,101,17);c.fillStyle='#d6ffe9';c.font='bold 10px monospace';c.fillText('CHECK POINT',Math.round(pc.x),Math.round(pc.y-62-age*4));}
   c.restore();
  }
 }
 const api={stations,create,snapshot,spawn,update,setSheet,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeCheckpoints=api;
})(typeof window!=='undefined'?window:globalThis);
