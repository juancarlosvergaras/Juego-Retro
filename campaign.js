(function(root){
  'use strict';
  const key='cap-dollar.campaign.v1';
  const firstKey='cap-dollar.mission-one-loadout.v1';
  const number=(n,f=0)=>Number.isFinite(n)?Math.max(0,n):f;
  function read(store){try{const s=JSON.parse(store.getItem(key)||'null');return s&&s.version===1?s:null;}catch{return null;}}
  function write(store,data){try{store.setItem(key,JSON.stringify({version:1,...data}));return true;}catch{return false;}}
  function snapshot(player,encounter,score,powers){return{form:player.form||'soldier',formCooldown:number(player.formCooldown),zombieUnlocked:!!player.zombieUnlocked,robotUnlocked:!!player.robotUnlocked,tankUnlocked:!!player.tankUnlocked,fighterUnlocked:!!player.fighterUnlocked,score:number(score.total),hp:number(encounter.hp,8),fuel:number(player.fuel),shield:number(player.shield),inventory:encounter.inventory,cooldowns:{...powers?.cooldowns}};}
  function remember(store,player,encounter,score,powers){try{store.setItem(firstKey,JSON.stringify({version:1,...snapshot(player,encounter,score,powers)}));return true;}catch{return false;}}
  function first(store){try{const s=JSON.parse(store.getItem(firstKey)||'null');return s?.version===1?s:null;}catch{return null;}}
  function transfer(store,player,encounter,score,powers){remember(store,player,encounter,score,powers);return write(store,{level:2,arrival:true,...snapshot(player,encounter,score,powers)});}
  function inventory(source){
    if(!source||!Array.isArray(source.owned))return{selected:3,owned:[1,3],ammo:{3:36}};
    const owned=[...new Set(source.owned.filter(n=>Number.isInteger(n)&&n>=1&&n<=9))];if(!owned.length)owned.push(1);
    return{owned,...(owned.includes(source.secondary)&&source.secondary>=3?{secondary:source.secondary}:{}),selected:owned.includes(source.selected)?source.selected:owned[0],ammo:Object.fromEntries(owned.filter(n=>n>2).map(n=>[n,Math.floor(number(source.ammo?.[n]))]))};
  }
  function loadout(store,entry,saved={}){const current=read(store),original=first(store);return entry==='campaign'?current||original||{}:entry==='select'?original||current||{}:{...original,...current,...saved};}
  const routePages={3:'level-three.html',4:'level-four.html',5:'level-five.html',6:'level-six.html'};
  function enterRoute(level,store,player,encounter,score,powers){
    write(store,{level,arrival:true,...snapshot(player,encounter,score,powers)});
    return routePages[level]+'?entry=campaign';
  }
  function transferThree(store,p,e,score,powers){return write(store,{level:3,arrival:true,...snapshot(p,e,score,powers)});}
  function transferFour(store,p,e,score,powers){return write(store,{level:4,arrival:true,...snapshot(p,e,score,powers)});}
  function transferFive(store,p,e,score,powers){return write(store,{level:5,arrival:true,...snapshot(p,e,score,powers)});}
  function transferSix(store,p,e,score,powers){return write(store,{level:6,arrival:true,...snapshot(p,e,score,powers)});}
  function transferSeven(store,p,e,score,powers){return write(store,{level:7,arrival:true,...snapshot(p,e,score,powers)});}
  function transferEight(store,p,e,score,powers){return write(store,{level:8,arrival:true,...snapshot(p,e,score,powers)});}
  const api={enterRoute,transferEight,transferSeven,transferSix,snapshot,read,write,transferFive,transferFour,transferThree,transfer,remember,first,inventory,loadout};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeCampaign=api;
})(typeof window!=='undefined'?window:globalThis);
