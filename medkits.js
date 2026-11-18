(function(root){
  'use strict';
  const P=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.ArcadePhysics;
  function create(){
    const platforms=P.createPlatforms();
    const kits=[2,9,16].map((floor,id)=>{const deck=platforms.filter(s=>s.kind==='deck'&&s.floor===floor).sort((a,b)=>b.w-a.w)[0];return{id,type:'red',x:Math.round(deck.x+deck.w*.72),y:deck.y,taken:false};});
    kits.push({id:3,type:'full',x:106,y:P.WORLD.roof,taken:false,hidden:true});
    return kits;
  }
  function collect(e,p,kits=e.medkits){
    if(e.dead||e.hp>=e.maxHp)return null;
    for(const kit of kits){
      if(kit.taken||Math.abs(p.x-kit.x)>19||Math.abs(p.y-kit.y)>21)continue;
      const before=e.hp;e.hp=kit.type==='full'?e.maxHp:Math.min(e.maxHp,e.hp+1);kit.taken=true;p.healGlow=.7;
      return{amount:e.hp-before,full:kit.type==='full'};
    }
    return null;
  }
  function draw(ctx,kits,p,camera,height){
    for(const kit of kits){
      if(kit.taken||kit.y<camera.y-30||kit.y>camera.y+height+25)continue;
      const x=Math.round(kit.x),y=Math.round(kit.y),full=kit.type==='full';
      ctx.save();ctx.fillStyle='#10182099';ctx.fillRect(x-12,y-2,24,2);
      ctx.shadowColor=full?'#a8ff43':'#ff6262';ctx.shadowBlur=full?5:3;
      ctx.fillStyle='#1d2427';ctx.fillRect(x-10,y-16,20,15);ctx.fillRect(x-5,y-19,10,4);
      ctx.fillStyle=full?'#b7ff4b':'#bf3645';ctx.fillRect(x-9,y-15,18,13);
      ctx.shadowBlur=0;ctx.fillStyle=full?'#e3ffa2':'#fa7b79';ctx.fillRect(x-8,y-15,16,2);
      ctx.fillStyle=full?'#50852f':'#6b2330';ctx.fillRect(x-9,y-4,18,2);
      ctx.fillStyle='#fff4df';ctx.fillRect(x-2,y-13,4,9);ctx.fillRect(x-5,y-10,10,3);
      ctx.fillStyle='#a7adb0';ctx.fillRect(x-3,y-18,6,2);
      if(kit.hidden){
        // A foreground packing crate hides half the fluorescent case.
        ctx.fillStyle='#2c241d';ctx.fillRect(x-14,y-17,15,17);ctx.fillStyle='#705137';ctx.fillRect(x-13,y-16,13,15);
        ctx.fillStyle='#ab8252';ctx.fillRect(x-13,y-16,13,2);ctx.fillRect(x-13,y-9,13,2);ctx.fillRect(x-12,y-15,2,15);
        ctx.fillStyle='#3e3024';ctx.fillRect(x-2,y-15,2,15);
      }
      const near=!!p&&Math.abs(p.x-x)<42&&Math.abs(p.y-y)<30;
      if(near){ctx.font='bold 8px monospace';ctx.textAlign='center';const label=full?'VIDA 100%':'+'+(kit.amount||1)+' VIDA';ctx.fillStyle='#101820df';ctx.fillRect(x-30,y-32,60,11);ctx.fillStyle=full?'#d4ff8a':'#ffd1cb';ctx.fillText(label,x,y-24);}
      ctx.restore();
    }
  }
  const api={create,collect,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMedkits=api;
})(typeof window!=='undefined'?window:globalThis);
