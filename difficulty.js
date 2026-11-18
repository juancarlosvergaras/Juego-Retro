(function(root){
  'use strict';
  const key='cap-dollar.difficulty.v1';
  const levels=[
    {id:'novato',name:'Novato',health:.65,damage:1,grace:1.7,text:'Enemigos menos resistentes y más tiempo de protección después de recibir un golpe.'},
    {id:'normal',name:'Normal',health:1,damage:1,grace:1.2,text:'El equilibrio original de la misión.'},
    {id:'fuerte',name:'Fuerte',health:1.35,damage:2,grace:1.2,text:'Enemigos más resistentes. Sus ataques causan el doble de daño.'},
    {id:'extrema',name:'Extrema',health:1.75,damage:3,grace:1,text:'Máxima resistencia enemiga, daño triple y menos protección entre golpes.'}
  ];
  const get=id=>levels.find(level=>level.id===id)||levels[1];
  function load(storage){try{return get((storage||root.localStorage).getItem(key)).id;}catch{return 'normal';}}
  function save(id,storage){try{(storage||root.localStorage).setItem(key,get(id).id);return true;}catch{return false;}}
  function apply(encounter,id){
    const level=get(id);encounter.difficulty=level.id;encounter.combatDamage=level.damage;encounter.hitProtection=level.grace;
    function scale(enemy,base){
      const fraction=enemy.maxHp>0?enemy.hp/enemy.maxHp:0;
      enemy.maxHp=enemy.kind==='bat'?1:Math.max(1,Math.round(base*level.health));
      enemy.hp=fraction>0?enemy.maxHp*Math.min(1,fraction):0;
    }
    for(const enemy of encounter.enemies)scale(enemy,enemy.baseHp||3);
    scale(encounter.boss,18);
    scale(encounter.finalBoss,encounter.finalBoss.stage===2?64:32);
    encounter.finalBoss.healthScale=level.health;
    return level;
  }
  const api={levels,get,load,save,apply};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeDifficulty=api;
})(typeof window!=='undefined'?window:globalThis);
