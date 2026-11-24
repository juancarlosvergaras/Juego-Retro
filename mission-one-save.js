(function(root){
 'use strict';
 const KEY='cap-dollar.mission-one.v1';
 const n=(v,f=0)=>Number.isFinite(v)?Math.max(0,v):f;
 function read(store){try{const s=JSON.parse(store.getItem(KEY));return s?.version===1&&s.checkpoint&&Number.isFinite(s.checkpoint.x)&&Number.isFinite(s.checkpoint.y)?s:null;}catch{return null;}}
 function write(store,{player:p,encounter:e,score,checkpoint,maxFloor,challenges,fuelTanks,checkpoints}){try{store.setItem(KEY,JSON.stringify({version:1,checkpoint,checkpoints,maxFloor,won:e.won,finalWon:e.finalWon,dead:e.dead,respawnProtection:p.respawnProtection,landed:true,form:p.form,hp:e.hp,fuel:p.fuel,shield:p.shield,formCooldown:p.formCooldown,inventory:e.inventory,defeated:e.enemies.filter(x=>x.hp<=0).map(x=>x.id),pickups:e.pickups.filter(x=>x.taken).map(x=>x.id),pickupLayout:e.pickups.map(x=>({id:x.id,slot:x.slot,x:x.x,y:x.y})),medkits:e.medkits.filter(x=>x.taken).map(x=>x.id),tanks:fuelTanks.filter(x=>x.taken).map(x=>x.id),score:{total:score.total,counts:score.counts,bonuses:score.bonuses,awarded:[...score.awarded]},challenges:{elapsed:challenges.elapsed,damaged:challenges.damaged,done:challenges.done,awarded:challenges.awarded,stars:challenges.stars.filter(x=>x.taken).map(x=>x.id)}}));return true;}catch{return false;}}
 function restore(s,{player:p,encounter:e,score,profile,platforms,challenges,fuelTanks,progression,campaign}){
  // Resume at a verified checkpoint, never inside a wall or halfway through an attack.
  const cp=s.checkpoint,support=platforms.find(pl=>Math.abs(pl.y-cp.y)<2&&cp.x>=pl.x&&cp.x<=pl.x+pl.w),fallback=platforms.find(pl=>pl.kind==='ground');
  if(!support&&!fallback)return null;const ground=support||fallback;
  p.x=support?Math.max(ground.x+12,Math.min(ground.x+ground.w-12,cp.x)):145;p.y=ground.y;p.grounded=true;p.ground=ground;p.vx=0;p.vy=0;p.fallPeak=p.y;
  e.won=s.won===true;e.finalWon=e.won&&s.finalWon===true;
  if(e.won)e.boss.hp=0;if(e.finalWon){Object.assign(e.finalBoss,{hp:0,stage:2,phase:'dead',death:0,active:false});}
  progression.apply(profile,p,e,true);
  const forms=typeof module!=='undefined'&&module.exports?require('./zombie-form'):root.ArcadeZombieForm;
  forms.restoreBody(p,s.form,e.won);
  p.fuel=Math.min(p.fuelMax,n(s.fuel,p.fuelMax));p.shield=Math.min(10,n(s.shield));p.formCooldown=Math.min(5,n(s.formCooldown));progression.protect(p,s.dead?progression.RESPAWN_SECONDS:(s.respawnProtection||0));e.hp=s.dead?e.maxHp:Math.max(1,Math.min(e.maxHp,n(s.hp,e.maxHp)));e.inventory=campaign.inventory(s.inventory);
  const contains=(list,id)=>Array.isArray(list)&&list.includes(id);
  // Las armas del suelo se sortean en cada partida: al reanudar vuelven las mismas, en su sitio.
  // Sin esto, «recogida» se aplicaría a otras armas y recargar volvería a repartirlas.
  const layout=s.pickupLayout;
  if(Array.isArray(layout)&&layout.length===e.pickups.length&&layout.every((x,i)=>x&&x.id===i&&Number.isInteger(x.slot)&&x.slot>=2&&x.slot<=9&&Number.isFinite(x.x)&&Number.isFinite(x.y)))e.pickups=layout.map(x=>({id:x.id,slot:x.slot,x:x.x,y:x.y,taken:false}));
  for(const enemy of e.enemies)if(contains(s.defeated,enemy.id)){enemy.hp=0;enemy.death=0;}
  for(const [list,ids] of [[e.pickups,s.pickups],[e.medkits,s.medkits],[fuelTanks,s.tanks],[challenges.stars,s.challenges?.stars]])for(const item of list)item.taken=contains(ids,item.id);
  score.total=n(s.score?.total);for(const key of Object.keys(score.counts))score.counts[key]=Math.floor(n(s.score?.counts?.[key]));score.awarded=new Set(Array.isArray(s.score?.awarded)?s.score.awarded.filter(x=>typeof x==='string'):[]);score.bonuses=Array.isArray(s.score?.bonuses)?s.score.bonuses.filter(x=>x&&typeof x.label==='string'&&Number.isFinite(x.points)):[];
  challenges.elapsed=n(s.challenges?.elapsed);challenges.damaged=!!s.challenges?.damaged;challenges.done=!!s.challenges?.done;for(const key of ['stars','speed','perfect','all'])if(n(s.challenges?.awarded?.[key]))challenges.awarded[key]=s.challenges.awarded[key];
  return{checkpoint:{x:p.x,y:p.y,floor:Math.floor(n(ground.floor))},maxFloor:Math.min(30,Math.floor(n(s.maxFloor)))};
 }
 const api={KEY,read,write,restore};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionOneSave=api;
})(typeof window!=='undefined'?window:globalThis);
