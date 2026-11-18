(function(root){
'use strict';
const catalog=[
{id:'cloak',name:'Invisibilidad',kind:'power',cost:0,rewardOnly:true,rewardHint:'Alcanza al fugitivo en Fuga del Sol',rewardLabel:'Recompensa · Fuga del Sol',cooldown:18,text:'Durante 6 s los enemigos pierden tu rastro y las balas te atraviesan. Recarga: 18 s.'},
{id:'alien',name:'Pulso del Vacío',cost:0,rewardOnly:true,kind:'power',cooldown:9,text:'Recompensa del Soberano: energía alienígena que alcanza hasta tres enemigos, los inmoviliza brevemente y causa daño. Recarga: 9 s.'},
{id:'jump',name:'Salto extra',cost:1500,max:5,kind:'upgrade',text:'+1 salto aéreo por nivel. Todas las formas.'},
{id:'jet',name:'Depósito ampliado',cost:2000,max:5,kind:'upgrade',text:'+5 segundos de vuelo normal por nivel. Solo soldado.'},
{id:'life',name:'Vida permanente',cost:2500,max:5,kind:'upgrade',text:'+1 vida máxima por nivel en todas las formas.'},
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
{id:'orbital',name:'Ataque orbital',cost:5000,kind:'power',cooldown:120,text:'Superrayo desde el cielo: atraviesa los pisos visibles en una franja de 290 px alrededor de ti. Solo afecta a jefes en combate. Daño: 24. Recarga: 2 minutos.'}
];
function fresh(){return{version:1,jetpackMk2:false,tankUnlocked:false,heroUnlocked:false,fighterUnlocked:false,robotUnlocked:false,zombieUnlocked:false,wallet:0,earned:0,levels:Object.fromEntries(catalog.filter(c=>c.kind==='upgrade').map(c=>[c.id,0])),owned:[],equipped:null,shield:0};}
function load(storage){const p=fresh();try{const r=JSON.parse(storage.getItem('obra10.progress.v1'));if(!r)return p;p.tankUnlocked=r.tankUnlocked===true;p.heroUnlocked=r.heroUnlocked===true;p.fighterUnlocked=r.fighterUnlocked===true;p.robotUnlocked=r.robotUnlocked===true;p.zombieUnlocked=r.zombieUnlocked===true;p.jetpackMk2=r.jetpackMk2===true;p.wallet=Math.max(0,Math.floor(Number(r.wallet)||0));p.earned=Math.max(p.wallet,Math.floor(Number(r.earned)||0));for(const c of catalog.filter(c=>c.kind==='upgrade'))p.levels[c.id]=Math.max(0,Math.min(c.max,Math.floor(Number(r.levels?.[c.id])||0)));p.owned=catalog.filter(c=>c.kind==='power'&&r.owned?.includes(c.id)).map(c=>c.id);p.equipped=p.owned.includes(r.equipped)?r.equipped:p.owned[0]||null;p.shield=Math.max(0,Math.min(10,Math.floor(Number(r.shield)||0)));}catch{}return p;}
function save(p,storage){try{storage.setItem('obra10.progress.v1',JSON.stringify(p));return true;}catch{return false;}}
function beginWorld(p){p.shield=0;if(p.equipped==='shield')p.equipped=p.owned[0]||null;}
function credit(p,amount){if(amount>0&&Number.isFinite(amount)){p.wallet+=Math.floor(amount);p.earned+=Math.floor(amount);}}
function buy(p,id){const c=catalog.find(c=>c.id===id);if(!c)return{ok:false,message:'Mejora desconocida.'};if(c.rewardOnly&&!p.owned.includes(id))return{ok:false,message:c.rewardHint||'Derrota al Soberano en la misión 7 para desbloquear este poder.'};if(c.kind==='upgrade'&&(p.levels[id]||0)>=c.max||c.kind==='power'&&p.owned.includes(id)||c.kind==='shield'&&p.shield>=10)return{ok:false,message:'Ya tienes el máximo.'};if(p.wallet<c.cost)return{ok:false,message:'Faltan '+(c.cost-p.wallet)+' puntos.'};p.wallet-=c.cost;if(c.kind==='upgrade')p.levels[id]=(p.levels[id]||0)+1;else if(c.kind==='shield')p.shield=10;else{p.owned.push(id);p.equipped=id;}return{ok:true,message:c.name+' comprado. −'+c.cost.toLocaleString('es-CO')+' puntos. Saldo: '+p.wallet.toLocaleString('es-CO')+' puntos.'};}
function apply(profile,p,e,fill=false){p.tankUnlocked=!!profile.tankUnlocked;p.heroUnlocked=!!profile.heroUnlocked;p.fighterUnlocked=!!profile.fighterUnlocked;p.robotUnlocked=!!profile.robotUnlocked;p.zombieUnlocked=!!profile.zombieUnlocked;p.jetpackMk2=!!profile.jetpackMk2;const l=profile.levels,oldMax=e.maxHp,oldFuel=p.fuelMax||676;p.maxJumps=2+(l.jump||0);p.fuelMax=676+(l.jet||0)*800;p.speedBonus=1+(l.speed||0)*.08;p.damageBonus=1+(l.damage||0)*.1;p.rateBonus=1+(l.rate||0)*.1;p.regenLevel=l.regen||0;p.healthBonus=l.life||0;p.shield=profile.shield;e.maxHp=(e.won?8:5)+p.healthBonus;e.hp=fill?e.maxHp:Math.min(e.maxHp,e.hp+Math.max(0,e.maxHp-oldMax));p.fuel=fill?p.fuelMax:Math.min(p.fuelMax,(p.fuel??oldFuel)+Math.max(0,p.fuelMax-oldFuel));}
const api={beginWorld,catalog,fresh,load,save,credit,buy,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeProgression=api;
})(typeof window!=='undefined'?window:globalThis);
