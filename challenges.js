(function(root){
'use strict';
function create(platforms){return{elapsed:0,damaged:false,done:false,awarded:{},stars:[5,10,17].map((floor,id)=>{const d=platforms.filter(s=>s.kind==='deck'&&s.floor===floor).sort((a,b)=>b.w-a.w)[0];return{id,x:id===0?699:d.x+d.w*.7,y:d.y-23,taken:false};})};}
function update(s,p,e,dt){if(s.done)return [];s.elapsed+=dt;if(e.damageTaken>0||e.dead)s.damaged=true;const rewards=[];
 function award(id,points,label){if(!s.awarded[id]){s.awarded[id]=points;rewards.push({id,points,label,x:p.x,y:p.y-(p.h||46)/2});}}
 for(const star of s.stars)if(!star.taken&&Math.abs(star.x-p.x)<23&&Math.abs(star.y-(p.y-(p.h||46)/2))<34)star.taken=true;
 if(s.stars.every(x=>x.taken))award('stars',2000,'Tres estrellas');
 if(e.extraction?.done&&!e.dead){if(s.elapsed<120)award('speed',1000,'Nivel en menos de 2 minutos');if(!s.damaged)award('perfect',1000,'Nivel sin perder vida');if(s.awarded.stars&&s.awarded.speed&&s.awarded.perfect)award('all',4000,'Los tres retos');s.done=true;}
 return rewards;
}
function draw(ctx,s){for(const a of s.stars)if(!a.taken)root.ArcadePickupRenderer.star(ctx,a,s.elapsed);}
function status(s){const sec=Math.floor(s.elapsed),time=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');return '★ '+s.stars.filter(x=>x.taken).length+'/3 · '+time+' / 2:00 · Sin daño: '+(s.damaged?'no': 'sí')+(s.done?' · Retos cerrados':'');}
const api={create,update,draw,status};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeChallenges=api;
})(typeof window!=='undefined'?window:globalThis);
