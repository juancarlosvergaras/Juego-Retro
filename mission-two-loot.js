(function(root){
  'use strict';
  const A=typeof module!=='undefined'&&module.exports?require('./arsenal'):root.ArcadeArsenal;
  const M=typeof module!=='undefined'&&module.exports?require('./medkits'):root.ArcadeMedkits;
  const P=typeof module!=='undefined'&&module.exports?require('./physics'):root.ArcadePhysics;
  function create(platforms,seed,saved={}){
    const taken=(kind,id)=>Array.isArray(saved?.[kind])&&saved[kind].includes(id);
    let value=seed>>>0;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
    const stars=[1450,3650,7900,11600,16500].map((x,id)=>{const deck=platforms.filter(s=>s.kind==='deck'&&Math.abs(s.x+s.w/2-x)<240).sort((a,b)=>a.y-b.y)[0];return{id,x:deck?deck.x+deck.w*.6:x,y:(deck?deck.y:620)-23,taken:taken('stars',id)};});
    const slots=[1,2,3,4,5,6,7,8,9,...Array.from({length:3},()=>3+Math.floor(random()*7))];
    for(let i=slots.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
    // A randomized early launcher guarantees ammunition for the armored encounter.
    const launcher=slots.indexOf(6),early=Math.floor(random()*3);[slots[launcher],slots[early]]=[slots[early],slots[launcher]];
    const weapons=slots.map((slot,id)=>{const left=430+id*1390;let x=left+random()*640;const decks=platforms.filter(s=>s.kind==='deck'&&s.x+s.w>left+40&&s.x<left+700);const deck=decks.length&&random()<.45?decks[Math.floor(random()*decks.length)]:null;let y=608;if(deck){x=Math.max(deck.x+30,Math.min(deck.x+deck.w-30,x));y=deck.y-12;}if(stars.some(s=>Math.hypot(s.x-x,s.y-y)<100)){x+=150;if(deck&&x>deck.x+deck.w-25){x=left+700;y=608;}}const cover=platforms.filter(s=>s.solid&&x>s.x-16&&x<s.x+s.w+16).sort((a,b)=>a.y-b.y)[0];if(cover&&y>cover.y-12){const inset=Math.min(14,cover.w/2);x=Math.max(cover.x+inset,Math.min(cover.x+cover.w-inset,x));y=cover.y-12;}return{id,slot,x,y,taken:taken('weapons',id)};});
    const placed=[...weapons,...stars],ground=platforms.find(p=>p.kind==='ground');
    function supply(at,id,kind){
      let x=at;
      for(let i=0;i<100;i++){
        x=at+(i%2?1:-1)*Math.ceil(i/2)*32;
        if(x<100||x>17800||placed.some(p=>Math.abs(p.x-x)<70)||platforms.some(p=>p.solid&&x>p.x-26&&x<p.x+p.w+26))continue;
        break;
      }
      const item={id,x,y:ground?P.surfaceY(ground,x):620,taken:taken(kind,id)};
      placed.push(item);return item;
    }
    const medkits=[1850,3350,4900,10400,14900].map((x,id)=>({...supply(x,id,'medkits'),type:'red'}));
    const fuelTanks=[2700,6900,13600].map((x,id)=>supply(x,id,'fuelTanks'));
    return{seed:seed>>>0,weapons,stars,medkits,fuelTanks};
  }
  function collect(s,p,inventory){const names=A.collect(inventory,s.weapons,p),stars=[];for(const star of s.stars)if(!star.taken&&Math.abs(p.x-star.x)<23&&Math.abs(p.y-(p.h||46)/2-star.y)<34){star.taken=true;stars.push(star);}return{names,stars};}
  function collectSupplies(s,p,e){
    if(e.dead)return{healed:null,fuel:false};
    const healed=M.collect(e,p,s.medkits);let fuel=false;
    for(const tank of s.fuelTanks)if(!tank.taken&&p.form!=='wolf'&&p.fuel<p.fuelMax&&Math.abs(p.x-tank.x)<25&&Math.abs(p.y-tank.y)<28){tank.taken=true;p.fuel=p.fuelMax;fuel=true;break;}
    return{healed,fuel};
  }
  function snapshot(s){return Object.fromEntries(['weapons','stars','medkits','fuelTanks'].map(kind=>[kind,s[kind].filter(w=>w.taken).map(w=>w.id)]));}
  function draw(c,s,time,view,p){
    const visible=item=>!item.taken&&item.x>=view.left-100&&item.x<=view.right+100;
    for(const t of s.fuelTanks)if(visible(t))root.ArcadePickupRenderer.fuel(c,t);
    for(const w of s.weapons)if(visible(w))root.ArcadePickupRenderer.weapon(c,w,time,p);
    for(const star of s.stars)if(visible(star))root.ArcadePickupRenderer.star(c,star,time);
  }
  const api={create,collect,collectSupplies,snapshot,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionTwoLoot=api;
})(typeof window!=='undefined'?window:globalThis);

