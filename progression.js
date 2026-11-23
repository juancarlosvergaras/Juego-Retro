(function(root){
'use strict';
const catalog=[
{id:'cloak',name:'Invisibilidad',kind:'power',cost:0,rewardOnly:true,rewardHint:'Alcanza al fugitivo en Fuga del Sol',rewardLabel:'Recompensa · Fuga del Sol',cooldown:18,text:'Durante 6 s los enemigos pierden tu rastro y las balas te atraviesan. Recarga: 18 s.'},
{id:'alien',name:'Pulso del Vacío',cost:0,rewardOnly:true,kind:'power',cooldown:9,text:'Recompensa del Soberano: energía alienígena que alcanza hasta tres enemigos, los inmoviliza brevemente y causa daño. Recarga: 9 s.'},
{id:'jump',name:'Salto extra',cost:1500,max:5,kind:'upgrade',text:'+1 salto aéreo por nivel. Todas las formas.'},
{id:'jet',name:'Depósito ampliado',cost:2000,max:5,kind:'upgrade',text:'+5 segundos de vuelo normal por nivel. Solo soldado.'},
{id:'life',name:'Salud máxima',cost:2500,max:5,kind:'upgrade',text:'+1 punto de salud máxima por nivel en todas las formas.'},
{id:'speed',name:'Agilidad',cost:1000,max:5,kind:'upgrade',text:'+8 % de velocidad terrestre por nivel.'},
{id:'damage',name:'Potencia',cost:2200,max:5,kind:'upgrade',text:'+10 % de daño de armas y ataques por nivel.'},
{id:'rate',name:'Reflejos',cost:1800,max:5,kind:'upgrade',text:'+10 % de cadencia de armas por nivel.'},
{id:'regen',name:'Recuperación',cost:1800,max:5,kind:'upgrade',text:'Recupera 1 vida sin recibir daño: cada 27 s al nivel 1, hasta 15 s al nivel 5.'},
{id:'shield',name:'Escudo antibalas',cost:3000,max:10,kind:'shield',text:'Escudo automático para este mundo: hasta 10 balas. Se pierde al iniciar otra aventura o al agotarse; debes volver a comprarlo.'},
{id:'flame',name:'Lanzallamas',cost:4000,kind:'power',cooldown:.12,text:'Mantén G: fuego de corto alcance. Solo soldado; no consume balas.'},
{id:'drone',name:'Dron bomba',cost:4000,kind:'power',cooldown:12,text:'Persigue al enemigo más próximo y explota. Recarga: 12 s.'},
{id:'turret',name:'Torreta automática',cost:4000,kind:'power',cooldown:20,text:'Colócala sobre una plataforma: dispara en 360° durante 15 s. Recarga: 20 s.'},
{id:'wave',name:'Onda expansiva',cost:3500,kind:'power',cooldown:10,text:'Daño en un radio de 130. Recarga: 10 s.'},
{id:'cryo',name:'Congelación',cost:3500,kind:'power',cooldown:14,text:'Inmoviliza enemigos cercanos durante 3 s. Recarga: 14 s.'},
{id:'heal',name:'Pulso de curación',cost:4500,kind:'power',cooldown:25,text:'Recupera 3 vidas, sin superar el máximo. Recarga: 25 s.'},
{id:'orbital',name:'Ataque orbital',cost:5000,kind:'power',cooldown:90,damage:60,text:'Superrayo desde el cielo: cae sobre ti y atraviesa todos los pisos visibles en una franja ancha. Golpea a todos los enemigos que alcanza; a los jefes, solo si ya están en combate. Daño: 60. Recarga: 90 s.'}
];
// Vida inicial del soldado y vida tras vencer al Capataz (encounter.js arranca con la misma cifra).
const START_HP=6,WOLF_HP=8;
// Economía: repetir una misión ya completada paga una cuarta parte y la dificultad
// pondera lo ganado (difficulty.js, campo points). Sin página (Node) el factor es 1.
const REPEAT_FACTOR=.25;
const pages={'index.html':1,'level-two.html':2,'level-three.html':3,'level-four.html':4,'level-five.html':5,'level-six.html':6,'level-seven.html':7,'level-eight.html':8,'level-nine.html':9,'level-ten.html':10};
const Difficulty=()=>typeof module!=='undefined'&&module.exports?require('./difficulty.js'):root.ArcadeDifficulty;
function rewardFactor({repeat=false,difficulty='normal'}={}){return(repeat?REPEAT_FACTOR:1)*(Difficulty()?.get(difficulty).points??1);}
// La repetición se decide en el primer abono de cada partida: completar la misión
// no rebaja lo que aún quede por cobrar en esa misma partida. beginWorld la reinicia.
let run=null;
function rewardContext(env=root){
  try{
    const doc=env.document;if(!doc?.getElementById)return null;
    const mission=Number(doc.getElementById('main-menu')?.dataset?.mission)||pages[String(env.location?.pathname||'').split('/').pop()]||0;
    if(!mission)return null;
    const store=env.ArcadeDeveloperMode?.storage?.(env.localStorage)||env.localStorage;
    if(!run||run.env!==env||run.mission!==mission)run={env,mission,repeat:!!env.ArcadeCampaign?.completedMissions(store).includes(mission)};
    return{mission,repeat:run.repeat,difficulty:env.ArcadeDifficulty?.load(store)||'normal'};
  }catch{return null;}
}
// Aviso para la tienda; cadena vacía cuando la misión paga el 100 %.
function rewardNote(context=rewardContext()){
  if(!context)return'';const factor=rewardFactor(context),level=Difficulty()?.get(context.difficulty);if(factor===1)return'';
  const why=[...(context.repeat?['misión ya completada']:[]),...(level&&(level.points??1)!==1?['dificultad '+level.name]:[])];
  return'Esta misión paga el '+String(Math.round(factor*1000)/10).replace('.',',')+' % de los puntos ('+why.join(' · ')+')';
}
const START_LIVES=3, LIFE_INTERVAL=5000, RESPAWN_SECONDS=5;
const gameOver={title:'Fin de la partida',message:'Has usado todas tus vidas. Puedes comenzar esta misión de nuevo.',action:'Reiniciar misión · 3 vidas'};
function addLifePoints(profile,amount){
  if(!Number.isSafeInteger(amount)||amount<=0)return 0;
  const total=(profile.lifePoints||0)+amount,bonus=Math.floor(total/LIFE_INTERVAL);
  profile.lifePoints=total%LIFE_INTERVAL;
  profile.lives=(profile.lives??START_LIVES)+bonus;
  return bonus;
}
function loseLife(profile,attempt){
  if(attempt.lifeLost)return;
  attempt.lifeLost=true;
  profile.lives=Math.max(0,(profile.lives??START_LIVES)-1);
}
function restartLives(profile,storage,missionKey){
  if(profile.lives!==0)return false;
  if(missionKey)try{storage.removeItem(missionKey);}catch{}
  profile.lives=START_LIVES;
  save(profile,storage);
  return true;
}
function protect(player,remaining=RESPAWN_SECONDS){
  player.respawnProtection=Number.isFinite(remaining)?Math.max(0,Math.min(RESPAWN_SECONDS,remaining)):0;
}
function tickProtection(player,dt){
  if(player.respawnProtection>0)player.respawnProtection=Math.max(0,player.respawnProtection-dt);
}
function respawnAlpha(player){
  return 1-.80*Math.min(1,(player.respawnProtection||0)/.45);
}
function showGameOver(doc,profile){
  if(profile.lives!==0)return;
  doc.getElementById('level-two-title').textContent=gameOver.title;
  doc.getElementById('level-two-message').textContent=gameOver.message;
  doc.getElementById('play-two').textContent=gameOver.action;
}
function showLives(doc,profile){
  const counter=doc.getElementById('life-count');
  if(counter&&counter.textContent!==String(profile.lives))counter.textContent=String(profile.lives);
}
function fresh(){return{version:1,jetpackMk2:false,tankUnlocked:false,heroUnlocked:false,fighterUnlocked:false,robotUnlocked:false,zombieUnlocked:false,wallet:0,earned:0,lives:START_LIVES,lifePoints:0,levels:Object.fromEntries(catalog.filter(c=>c.kind==='upgrade').map(c=>[c.id,0])),owned:[],equipped:null,shield:0};}
function load(storage){const p=fresh();try{const r=JSON.parse(storage.getItem('obra10.progress.v1'));if(!r)return p;p.tankUnlocked=r.tankUnlocked===true;p.heroUnlocked=r.heroUnlocked===true;p.fighterUnlocked=r.fighterUnlocked===true;p.robotUnlocked=r.robotUnlocked===true;p.zombieUnlocked=r.zombieUnlocked===true;p.jetpackMk2=r.jetpackMk2===true;p.wallet=Math.max(0,Math.floor(Number(r.wallet)||0));p.earned=Math.max(p.wallet,Math.floor(Number(r.earned)||0));p.lives=Number.isSafeInteger(r.lives)&&r.lives>=0?r.lives:START_LIVES;p.lifePoints=Number.isSafeInteger(r.lifePoints)&&r.lifePoints>=0?r.lifePoints%LIFE_INTERVAL:p.earned%LIFE_INTERVAL;for(const c of catalog.filter(c=>c.kind==='upgrade'))p.levels[c.id]=Math.max(0,Math.min(c.max,Math.floor(Number(r.levels?.[c.id])||0)));p.owned=catalog.filter(c=>c.kind==='power'&&r.owned?.includes(c.id)).map(c=>c.id);p.equipped=p.owned.includes(r.equipped)?r.equipped:p.owned[0]||null;p.shield=Math.max(0,Math.min(10,Math.floor(Number(r.shield)||0)));}catch{}return p;}
function save(p,storage){try{storage.setItem('obra10.progress.v1',JSON.stringify(p));return true;}catch{return false;}}
function beginWorld(p){run=null;p.shield=0;if(p.equipped==='shield')p.equipped=p.owned[0]||null;}
// Abona `amount` ponderado por la misión y la dificultad en curso; devuelve lo abonado.
function credit(p,amount,context=rewardContext()){if(!(amount>0)||!Number.isFinite(amount))return 0;const paid=Math.floor(amount*rewardFactor(context||{}));addLifePoints(p,Math.floor(amount));p.wallet+=paid;p.earned+=paid;return paid;}
function buy(p,id){const c=catalog.find(c=>c.id===id);if(!c)return{ok:false,message:'Mejora desconocida.'};if(c.rewardOnly&&!p.owned.includes(id))return{ok:false,message:c.rewardHint||'Derrota al Soberano en la misión 7 para desbloquear este poder.'};if(c.kind==='upgrade'&&(p.levels[id]||0)>=c.max||c.kind==='power'&&p.owned.includes(id)||c.kind==='shield'&&p.shield>=10)return{ok:false,message:'Ya tienes el máximo.'};if(p.wallet<c.cost)return{ok:false,message:'Faltan '+(c.cost-p.wallet)+' puntos.'};p.wallet-=c.cost;if(c.kind==='upgrade')p.levels[id]=(p.levels[id]||0)+1;else if(c.kind==='shield')p.shield=10;else{p.owned.push(id);p.equipped=id;}return{ok:true,message:c.name+' comprado. −'+c.cost.toLocaleString('es-CO')+' puntos. Saldo: '+p.wallet.toLocaleString('es-CO')+' puntos.'};}
function apply(profile,p,e,fill=false){p.tankUnlocked=!!profile.tankUnlocked;p.heroUnlocked=!!profile.heroUnlocked;p.fighterUnlocked=!!profile.fighterUnlocked;p.robotUnlocked=!!profile.robotUnlocked;p.zombieUnlocked=!!profile.zombieUnlocked;p.jetpackMk2=!!profile.jetpackMk2;const l=profile.levels,oldMax=e.maxHp,oldFuel=p.fuelMax||676;p.maxJumps=2+(l.jump||0);p.fuelMax=676+(l.jet||0)*800;p.speedBonus=1+(l.speed||0)*.08;p.damageBonus=1+(l.damage||0)*.1;p.rateBonus=1+(l.rate||0)*.1;p.regenLevel=l.regen||0;p.healthBonus=l.life||0;p.shield=profile.shield;e.maxHp=(e.won?WOLF_HP:START_HP)+p.healthBonus;e.hp=fill?e.maxHp:Math.min(e.maxHp,e.hp+Math.max(0,e.maxHp-oldMax));p.fuel=fill?p.fuelMax:Math.min(p.fuelMax,(p.fuel??oldFuel)+Math.max(0,p.fuelMax-oldFuel));}
const api={START_LIVES,LIFE_INTERVAL,RESPAWN_SECONDS,addLifePoints,loseLife,restartLives,protect,tickProtection,respawnAlpha,showLives,showGameOver,gameOver,START_HP,WOLF_HP,REPEAT_FACTOR,rewardFactor,rewardContext,rewardNote,beginWorld,catalog,fresh,load,save,credit,buy,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeProgression=api;
})(typeof window!=='undefined'?window:globalThis);
