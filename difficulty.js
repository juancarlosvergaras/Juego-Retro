(function(root){
  'use strict';
  const key='cap-dollar.difficulty.v1';
  // Los ids se guardan en las partidas y no cambian; los nombres sí son libres.
  // health: vida enemiga · damage: daño que recibe el jugador (medkits.js cura
  // en proporción) · grace: protección tras un golpe · points: puntos ganados
  // (progression.js).
  const levels=[
    {id:'novato',name:'Novato',health:.65,damage:1,grace:1.7,points:.75,text:'Enemigos menos resistentes y más tiempo de protección después de recibir un golpe. Ganas un 25 % menos de puntos.'},
    {id:'normal',name:'Normal',health:1,damage:1,grace:1.2,points:1,text:'El equilibrio original de la misión.'},
    {id:'fuerte',name:'Difícil',health:1.35,damage:1.5,grace:1.2,points:1.25,text:'Enemigos más resistentes y ataques un 50 % más dañinos. Ganas un 25 % más de puntos.'},
    {id:'extrema',name:'Extremo',health:1.75,damage:2,grace:1,points:1.5,text:'Máxima resistencia enemiga, daño doble y menos protección entre golpes. Ganas un 50 % más de puntos.'}
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
