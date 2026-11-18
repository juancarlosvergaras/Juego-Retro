(function(root){
  'use strict';
  const values={soldiers:200,subboss:500,boss:1000,weapons:100,health:100,fuel:100};
  function create(){return{total:0,bonuses:[],floating:[],counts:Object.fromEntries(Object.keys(values).map(k=>[k,0])),awarded:new Set()};}
  function float(s,points,source,offset=22){if(!points||!Number.isFinite(source?.x)||!Number.isFinite(source?.y))return;s.floating.push({points,x:source.x,y:source.y-offset,age:0,life:1.5});}
  function tick(s,dt){s.floating=s.floating.filter(f=>(f.age+=dt)<f.life);}
  function draw(ctx,s){ctx.save();ctx.textAlign='center';ctx.font='bold 13px monospace';ctx.lineJoin='round';ctx.lineWidth=3;for(const f of s.floating){const t=f.age/f.life,y=f.y-38*t;ctx.globalAlpha=Math.min(1,(1-t)*2.5);ctx.strokeStyle='#101923';ctx.fillStyle=f.points>=250?'#ffe285':'#d7ffb1';const text='+'+f.points;ctx.strokeText(text,Math.round(f.x),Math.round(y));ctx.fillText(text,Math.round(f.x),Math.round(y));}ctx.restore();}
  function award(s,kind,id){const key=kind+':'+id;if(s.awarded.has(key))return 0;s.awarded.add(key);s.counts[kind]++;s.total+=values[kind];return values[kind];}
  function sync(s,e,tanks=[]){const before=s.total;
    for(const n of e.enemies||[])if(n.hp<=0)float(s,award(s,'soldiers',n.id),n,48);
    if(e.boss&&e.boss.hp<=0)float(s,award(s,'subboss','white'),e.boss,90);
    if(e.finalBoss&&e.finalBoss.hp<=0)float(s,award(s,'boss','black'),e.finalBoss,130);
    for(const [kind,items] of [['weapons',e.pickups],['health',e.medkits],['fuel',tanks]])for(const item of items||[])if(item.taken)float(s,award(s,kind,item.id),item);
    return s.total-before;
  }
  function bonus(s,reward){const key='challenge:'+reward.id;if(s.awarded.has(key))return 0;s.awarded.add(key);s.bonuses.push(reward);s.total+=reward.points;float(s,reward.points,reward,35+s.floating.filter(f=>f.x===reward.x).length*16);return reward.points;}
  function summary(s){const c=s.counts;return[
    'Soldados: '+c.soldiers+' × 200 = '+c.soldiers*200,
    'Subjefe: '+c.subboss+' × 500 = '+c.subboss*500,
    'Jefe final: '+c.boss+' × 1000 = '+c.boss*1000,
    'Armas: '+c.weapons+' × 100 = '+c.weapons*100,
    'Botiquines: '+c.health+' × 100 = '+c.health*100,
    'Gasolina: '+c.fuel+' × 100 = '+c.fuel*100,
    ...(s.bonuses||[]).map(b=>b.label+': +'+b.points),
    '\nTOTAL: '+s.total+' PUNTOS'
  ].join('\n');}
  const api={create,sync,summary,bonus,tick,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeScore=api;
})(typeof window!=='undefined'?window:globalThis);
