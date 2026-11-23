(function(root){
  'use strict';
  const key='cap-dollar.campaign.v1';
  const firstKey='cap-dollar.mission-one-loadout.v1';
  const number=(n,f=0)=>Number.isFinite(n)?Math.max(0,n):f;
  function read(store){try{const s=JSON.parse(store.getItem(key)||'null');return s&&s.version===1?s:null;}catch{return null;}}
  function write(store,data){try{store.setItem(key,JSON.stringify({version:1,...data}));return true;}catch{return false;}}
  const missionKeys=['one','two','three','four','five','six','seven','eight','nine','ten'];
  // Los especiales son desvíos opcionales y nunca abren una misión principal.
  const previous={m1:[],m2:[1],m3:[2],m4:[2],m5:[3,4],m6:[5],m7:[5],m8:[6,7],m9:[8],m10:[9],fuga:[4],quimera:[5]};
  function available(id,current,completed,fighterUnlocked,developer=false){
    if(developer)return true;
    if(id==='quimera')return !!fighterUnlocked;
    if(id==='fuga')return completed.includes(4);
    const level=Number(id.slice(1));
    return level===1||level===current||completed.includes(level)||!!previous[id]?.some(n=>completed.includes(n));
  }
  function profileAccess(store){
    return {current:read(store)?.level||1,completed:completedMissions(store),fighter:!!root.ArcadeProgression?.load(store)?.fighterUnlocked,
      developer:!!root.ArcadeDeveloperMode?.active?.()};
  }
  function guardEntry(id){
    if(!root.document)return true;
    const store=root.ArcadeDeveloperMode?.storage(root.localStorage)||root.localStorage;
    const {current,completed,fighter,developer}=profileAccess(store);
    if(available(id,current,completed,fighter,developer))return true;
    root.location.replace('index.html?menu=levels#'+id);
    return false;
  }
  const completionKey=level=>'cap-dollar.completed.v1:'+level;
  function markCompleted(store,level){
    try{store.setItem(completionKey(level),'1');}catch{}
  }
  function completedMissions(store){
    return missionKeys.flatMap((name,index)=>{
      const level=index+1;
      try{
        if(store.getItem(completionKey(level))==='1')return [level];
        const s=JSON.parse(store.getItem('cap-dollar.mission-'+name+'.v1')||'null');
        // Earlier versions saved the last objective within each mission.
        const cleared=[s?.finalWon,s?.king?.defeated&&!s.inside,s?.ending,s?.road?.complete,
          s?.sea?.complete,s?.mall?.complete,s?.space?.complete,s?.newYork?.complete,s?.horizon?.phase==='won',s?.horizon?.phase==='won'];
        if(cleared[index]){markCompleted(store,level);return [level];}
      }catch{}
      return [];
    });
  }
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
  const routePages={3:'level-three.html',4:'level-four.html',5:'level-five.html',6:'level-six.html',7:'level-seven.html',8:'level-eight.html',9:'level-nine.html',10:'level-ten.html'};
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
  const api={previous,available,profileAccess,guardEntry,completedMissions,markCompleted,enterRoute,transferEight,transferSeven,transferSix,snapshot,read,write,transferFive,transferFour,transferThree,transfer,remember,first,inventory,loadout};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeCampaign=api;
})(typeof window!=='undefined'?window:globalThis);
