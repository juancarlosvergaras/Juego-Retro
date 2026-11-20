// Reglas de balance, economía, progresión y respuesta al daño que salieron de la
// auditoría del juego. Cada prueba describe la regla, no solo el número.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../arsenal.js'),Armory=require('../armory.js'),E=require('../encounter.js'),C=require('../mission-combat.js'),N=require('../enemies.js'),P=require('../physics.js');
const V=require('../powers.js'),U=require('../progression.js'),D=require('../difficulty.js'),M=require('../medkits.js'),Campaign=require('../campaign.js'),Map=require('../mission-map.js');
const Kit=require('../mission-kit.js'),Specialists=require('../enemy-specialists.js');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const floor=[{x:0,y:620,w:18000,kind:'ground',thickness:36}];
// Los dos motores de combate con el mismo jugador, sobre el mismo suelo.
function engines(){
  return[['encounter.js',()=>{const e=E.createEncounter(),p=Object.assign(P.createPlayer(),{x:300,y:620});e.enemies=[];e.boss.hp=0;e.finalBoss.hp=0;return{e,p,tick:(input={},dt=1/120)=>E.updateEncounter(e,p,input,dt,floor)};}],
    ['mission-combat.js',()=>{const e=C.create(A.createInventory()),p=Object.assign(P.createPlayer(),{x:300,y:620,form:'soldier'}),powers=V.create(),profile=U.fresh();return{e,p,tick:(input={},dt=1/120)=>C.update(e,p,input,dt,floor,powers,profile)};}]];
}
const soldier=(x,extra={})=>Object.assign(N.createSoldier({x,y:620},'t'+x),extra);

test('el hacha compensa su precio: supera con claridad al cuchillo gratis y conserva su alcance',()=>{
  const knife=A.weapons[1],axe=A.weapons[2],dps=w=>w.damage/w.rate;
  assert.ok(dps(axe)>=dps(knife)*1.25,'al menos un 25 % más de daño por segundo');
  assert.ok(axe.range>knife.range);assert.ok(axe.rate>knife.rate,'sigue siendo el golpe lento y contundente');
  assert.ok(axe.damage>=3,'un soldado normal (3 de vida) cae de un hachazo');
  assert.ok(Armory.prices[2]>0);
});

test('el arco es tan silencioso como el cuerpo a cuerpo y la ballesta hace bastante menos ruido que un arma de fuego',()=>{
  assert.equal(A.noiseRadius(7),A.noiseRadius(1));assert.equal(A.noiseRadius(2),A.noiseRadius(1));
  for(const gun of [3,4,5,6,9])assert.equal(A.noiseRadius(gun),A.GUN_NOISE);
  assert.ok(A.noiseRadius(8)>A.noiseRadius(7));assert.ok(A.noiseRadius(8)<=A.GUN_NOISE*.6);
  assert.doesNotMatch(Armory.notes[7],/milicia/);assert.match(Armory.notes[7],/Silencioso: no alerta a los enemigos cercanos/);
  assert.doesNotMatch(Object.values(Armory.notes).join(' '),/milicia/);
});
for(const [name,make] of engines())test(name+': un disparo de arco no alerta al soldado que no te ve; uno de pistola sí',()=>{
  // El soldado está a 300 px y de espaldas: solo puede enterarse por el ruido.
  const heard=(slot,distance=300)=>{const {e,p,tick}=make();e.inventory.owned=[1,3,7,8];e.inventory.ammo={3:9,7:9,8:9};e.inventory.selected=slot;p.facing=-1;const n=soldier(p.x+distance,{facing:1});e.enemies=[n];tick({fire:true});assert.ok(e.flash>0,'el arma ha disparado');return n.alert;};
  assert.equal(heard(3),true,'pistola');assert.equal(heard(7),false,'arco');
  assert.equal(heard(8),false,'ballesta a 300 px');assert.equal(heard(8,180),true,'ballesta de cerca');
  assert.equal(heard(1),false,'cuchillo');
});

for(const [name,make] of engines())test(name+': el misil hace su daño de impacto al blanco que alcanza y solo la onda expansiva a los demás',()=>{
  const {e,tick}=make(),struck=soldier(500,{hp:40,maxHp:40,frozen:9}),near=soldier(540,{hp:40,maxHp:40,frozen:9}),far=soldier(700,{hp:40,maxHp:40,frozen:9});
  e.enemies=[struck,near,far];e.bullets=[{x:440,y:595,vx:300,vy:0,life:2,damage:5,slot:6,enemy:false}];
  for(let i=0;i<120&&!e.explosions.length;i++)tick();
  assert.equal(e.explosions.length,1);
  assert.equal(struck.hp,40-A.weapons[6].impact,'impacto directo');assert.equal(near.hp,40-A.weapons[6].damage,'onda expansiva');assert.equal(far.hp,40,'fuera del radio');
  for(let i=0;i<30;i++)tick();assert.equal(struck.hp,40-A.weapons[6].impact,'una sola vez');
});
test('el lanzamisiles vale contra jefes sin trivializar a la tropa',()=>{
  const launcher=A.weapons[6];
  assert.equal(launcher.damage,5,'la onda expansiva contra la tropa no cambia');assert.ok(launcher.impact>=launcher.damage*2.5,'el impacto directo es claramente mayor');
  // Un cargador entero sobre un jefe rinde más que el de la AK (90) y no acaba él solo con un jefe de las misiones 4–8 (160–280).
  assert.ok(launcher.ammo*launcher.impact>=90);assert.ok(launcher.ammo*launcher.impact<160);
  // Las mejoras de daño multiplican el impacto en la misma proporción que la onda.
  assert.equal(A.impactDamage({slot:6,damage:5}),15);assert.equal(A.impactDamage({slot:6,damage:6}),18);
  assert.equal(A.impactDamage({slot:9,damage:4}),4,'solo el misil tiene impacto');assert.equal(A.impactDamage({slot:3,damage:1}),1);
  assert.equal(Armory.offer(A.createInventory(),6).stats.damage,launcher.impact,'la tienda enseña el daño de impacto');
  assert.match(Armory.notes[6],/impacto directo/);
});
test('mission-combat.js: un misil directo castiga a un jefe en combate con el daño de impacto',()=>{
  const [,make]=engines()[1],{e,tick}=make(),boss={kind:'mallGiant',id:'giant',x:520,y:620,w:120,h:200,hp:200,maxHp:200,active:true,hit:0},guard=soldier(470,{hp:40,maxHp:40,frozen:9});
  e.enemies=[boss,guard];e.bullets=[{x:380,y:500,vx:300,vy:0,life:2,damage:5,slot:6,enemy:false}];
  for(let i=0;i<120&&!e.explosions.length;i++)tick();
  assert.equal(boss.hp,200-15);assert.equal(guard.hp,40-5);
});

test('mission-combat.js: la granada propia hiere igual en todas las dificultades; el fuego enemigo sí escala',()=>{
  const [,make]=engines()[1];
  for(const level of D.levels){
    const own=make();own.e.combatDamage=level.damage;own.e.bullets=[{x:own.p.x,y:own.p.y-20,vx:0,vy:0,gravity:0,life:.01,slot:9,damage:4,enemy:false}];own.tick({}, .02);
    assert.equal(own.e.hp,8-2,level.name+': granada propia a quemarropa');
    const hostile=make();hostile.e.combatDamage=level.damage;hostile.e.bullets=[{x:hostile.p.x,y:hostile.p.y-25,vx:0,vy:0,life:1,enemy:true}];hostile.tick();
    assert.equal(hostile.e.hp,8-level.damage,level.name+': bala enemiga');
  }
});
test('hurtPlayer solo deja de escalar cuando se le pide',()=>{
  const e=E.createEncounter(),p=P.createPlayer();e.combatDamage=2;
  E.hurtPlayer(e,p,0,false,1,false);assert.equal(e.hp,E.START_HP-1);e.invincible=0;
  E.hurtPlayer(e,p,0,false,1);assert.equal(e.hp,E.START_HP-3);
});

test('el soldado empieza con un punto más de vida y la tienda parte de la misma cifra',()=>{
  assert.equal(E.START_HP,6);assert.equal(U.START_HP,E.START_HP);
  const e=E.createEncounter(),p=P.createPlayer();assert.equal(e.hp,6);assert.equal(e.maxHp,6);
  U.apply(U.fresh(),p,e,true);assert.equal(e.maxHp,6);
  E.transformWolf(e,p);assert.equal(e.maxHp,U.WOLF_HP,'la vida tras vencer al Capataz no cambia');
});
test('un botiquín rojo devuelve lo que quita un golpe en cada dificultad',()=>{
  assert.deepEqual(D.levels.map(l=>M.redHeal({combatDamage:l.damage})),[1,1,2,2]);
  for(const level of D.levels){
    const e={hp:1,maxHp:6,combatDamage:level.damage,dead:false},kit={id:0,type:'red',x:100,y:100,taken:false};
    const healed=M.collect(e,{x:100,y:100},[kit]);
    assert.equal(healed.amount,Math.ceil(level.damage),level.name);assert.ok(healed.amount>=level.damage,'compensa al menos un golpe');assert.equal(kit.taken,true);
    assert.deepEqual(Object.keys(kit).sort(),['id','taken','type','x','y'],'el botiquín guardado no cambia de forma');
  }
  // Nunca supera el máximo y el botiquín completo sigue llenando la vida.
  const nearFull={hp:5,maxHp:6,combatDamage:2,dead:false};assert.equal(M.collect(nearFull,{x:0,y:0},[{type:'red',x:0,y:0}]).amount,1);assert.equal(nearFull.hp,6);
  const full={hp:1,maxHp:6,combatDamage:2,dead:false};assert.equal(M.collect(full,{x:0,y:0},[{type:'full',x:0,y:0}]).full,true);assert.equal(full.hp,6);
});

// ---- Economía ----
test('el factor de recompensa combina repetición (25 %) y dificultad',()=>{
  assert.equal(U.rewardFactor(),1);assert.equal(U.rewardFactor({}),1);
  assert.equal(U.rewardFactor({repeat:true}),.25);assert.equal(U.REPEAT_FACTOR,.25);
  assert.deepEqual(['novato','normal','fuerte','extrema'].map(difficulty=>U.rewardFactor({difficulty})),[.75,1,1.25,1.5]);
  assert.equal(U.rewardFactor({repeat:true,difficulty:'extrema'}),.375);
  assert.equal(U.rewardFactor({difficulty:'desconocida'}),1,'una dificultad inválida paga como Normal');
});
test('credit abona los puntos ponderados y en Node, sin página, paga el 100 %',()=>{
  const profile=U.fresh();
  assert.equal(typeof window,'undefined');assert.equal(U.rewardContext(),null);
  assert.equal(U.credit(profile,200),200);assert.equal(profile.wallet,200);assert.equal(profile.earned,200);
  assert.equal(U.credit(profile,200,{repeat:true,difficulty:'normal'}),50);assert.equal(profile.wallet,250);assert.equal(profile.earned,250);
  assert.equal(U.credit(profile,150,{repeat:false,difficulty:'fuerte'}),187,'los decimales se pierden, como antes');
  assert.equal(U.credit(profile,100,{repeat:true,difficulty:'extrema'}),37);
  assert.equal(U.credit(profile,200,null),200,'sin contexto, factor 1');
  const before=profile.wallet;for(const bad of [0,-50,NaN,Infinity,undefined])assert.equal(U.credit(profile,bad,{repeat:true}),0);assert.equal(profile.wallet,before);
});
// Página simulada: #main-menu[data-mission], almacenamiento y los módulos que consulta el abono.
function page({mission=3,completed=[],difficulty='normal',pathname='/',menu=true}={}){
  const data=new globalThis.Map(completed.map(n=>['cap-dollar.completed.v1:'+n,'1']));data.set('cap-dollar.difficulty.v1',difficulty);
  const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,String(v));}};
  return{data,localStorage,location:{pathname},document:{getElementById:id=>menu&&id==='main-menu'?{dataset:{mission:String(mission)}}:null},ArcadeCampaign:Campaign,ArcadeDifficulty:D};
}
test('una misión ya completada paga el 25 % al repetirla, pero completarla no rebaja la partida en curso',()=>{
  const env=page({mission:3,completed:[1,2]}),profile=U.fresh();
  assert.deepEqual(U.rewardContext(env),{mission:3,repeat:false,difficulty:'normal'});
  assert.equal(U.credit(profile,200,U.rewardContext(env)),200);
  // Se completa la misión: lo que quede por cobrar en esta partida sigue al 100 %.
  Campaign.markCompleted(env.localStorage,3);
  assert.equal(U.rewardContext(env).repeat,false);assert.equal(U.credit(profile,1000,U.rewardContext(env)),1000);
  // Repetir sin recargar la página (la misión 1 lo hace) pasa por beginWorld.
  U.beginWorld(profile);
  assert.equal(U.rewardContext(env).repeat,true);assert.equal(U.credit(profile,200,U.rewardContext(env)),50);
  // Recargar la página (misiones 2–8) es otra partida: la bandera ya cuenta.
  const reloaded=page({mission:3,completed:[1,2,3]});assert.equal(U.rewardContext(reloaded).repeat,true);
  // Otra misión aún no completada paga entera.
  assert.equal(U.rewardContext(page({mission:4,completed:[1,2,3]})).repeat,false);
});
test('la dificultad se lee en cada abono y la misión se deduce también del nombre de la página',()=>{
  const env=page({mission:5,difficulty:'extrema'});
  assert.equal(U.credit(U.fresh(),200,U.rewardContext(env)),300);
  env.data.set('cap-dollar.difficulty.v1','novato');assert.equal(U.credit(U.fresh(),200,U.rewardContext(env)),150);
  const byName=page({menu:false,pathname:'/juego/level-five.html',completed:[5]});assert.deepEqual(U.rewardContext(byName),{mission:5,repeat:true,difficulty:'normal'});
  assert.equal(U.rewardContext(page({menu:false,pathname:'/juego/index.html'})).mission,1);
  assert.equal(U.rewardContext(page({menu:false,pathname:'/juego/quimera.html'})),null,'los especiales no tienen factor');
  assert.equal(U.rewardContext({}),null);assert.equal(U.rewardContext({document:{}}),null);
  // Con el modo desarrollador manda su almacenamiento aislado.
  const dev=page({mission:2}),isolated=page({mission:2,completed:[2],difficulty:'fuerte'}).localStorage;dev.ArcadeDeveloperMode={storage:()=>isolated};
  assert.deepEqual(U.rewardContext(dev),{mission:2,repeat:true,difficulty:'fuerte'});
  // Un almacenamiento bloqueado no rompe el abono.
  const broken=page({mission:2});broken.localStorage={getItem(){throw Error('bloqueado');}};
  const context=U.rewardContext(broken);assert.equal(U.credit(U.fresh(),200,context),200);
});
test('la tienda avisa del porcentaje solo cuando la misión no paga el 100 %',()=>{
  assert.equal(U.rewardNote(null),'');assert.equal(U.rewardNote({mission:1,repeat:false,difficulty:'normal'}),'');
  assert.equal(U.rewardNote({mission:1,repeat:true,difficulty:'normal'}),'Esta misión paga el 25 % de los puntos (misión ya completada)');
  assert.equal(U.rewardNote({mission:1,repeat:false,difficulty:'extrema'}),'Esta misión paga el 150 % de los puntos (dificultad Extremo)');
  assert.equal(U.rewardNote({mission:1,repeat:true,difficulty:'extrema'}),'Esta misión paga el 37,5 % de los puntos (misión ya completada · dificultad Extremo)');
  for(const file of ['game.js','mission-hud.js'])assert.match(read(file),/rewardNote/,file+' muestra el aviso junto al saldo');
});

// ---- Mapa ----
const {nodes}=Map.graph();
const locked=(level,completed=[],{fighter=false,developer=false}={})=>Object.fromEntries(Map.locks(level,nodes,completed,fighter,developer).map((value,i)=>[nodes[i].id,value]));
const openIds=state=>Object.keys(state).filter(id=>!state[id]);
test('las dos bifurcaciones requieren la victoria anterior',()=>{
  assert.deepEqual(openIds(locked(1)),['m1']);
  assert.deepEqual(openIds(locked(2,[1,2])),['m1','m2','m3','m4']);
  assert.deepEqual(openIds(locked(3,[1,2,3])),['m1','m2','m3','m4','m5']);
  assert.equal(locked(5,[1,2,3,5]).m6,false);assert.equal(locked(5,[1,2,3,5]).m7,false);
  assert.equal(locked(6,[1,2,3,5],{fighter:true}).m8,true);
  for(const n of [6,7])assert.equal(locked(n,[n]).m8,false);
});
test('Fuga requiere ganar en moto y Quimera requiere el traje de luchador',()=>{
  assert.equal(locked(4,[]).fuga,true);assert.equal(locked(5,[3,5]).fuga,true);
  assert.equal(locked(4,[4]).fuga,false);assert.equal(locked(4,[4]).quimera,true);
  assert.equal(locked(5,[5]).quimera,true);
  assert.equal(locked(5,[],{fighter:true}).quimera,false);
  assert.equal(locked(6,[6],{fighter:true}).fuga,true);
});
test('se puede continuar una misión guardada con la ruta antigua',()=>{
  assert.equal(locked(7).m7,false);assert.equal(locked(7).m8,true);assert.equal(locked(2,[8]).m8,false);
});
test('el modo desarrollador abre todo el mapa',()=>{
  assert.deepEqual(openIds(locked(1,[],{developer:true})),nodes.map(n=>n.id));
  const source=read('mission-map.js');
  assert.match(read('campaign.js'),/ArcadeDeveloperMode\?\.active\?\.\(\)/,'el mapa consulta el modo desarrollador');
  assert.equal(typeof require('../developer-mode.js').create({getItem:()=>null},{getItem:()=>null,setItem(){},removeItem(){}}).active,'function');
});
test('el bloqueo no altera los estados ni el dibujo del mapa',()=>{
  const before=JSON.stringify(Map.graph());Map.locks(4,nodes,[1,2]);assert.equal(JSON.stringify(Map.graph()),before);
  assert.deepEqual(Map.states(1,nodes),['current',...Array(nodes.length-1).fill('open')]);
});
test('la tarjeta bloqueada dice qué completar y no inicia la misión',()=>{
  assert.equal(Map.requirement('m1',nodes),'');
  assert.equal(Map.requirement('m2',nodes),'Completa la misión 1 para abrir este mundo.');
  assert.equal(Map.requirement('m5',nodes),'Completa una de las misiones 3 o 4 para abrir este mundo.');
  for(const id of ['m6','m7'])assert.equal(Map.requirement(id,nodes),'Completa la misión 5 para abrir este mundo.');
  assert.match(Map.requirement('quimera',nodes),/traje de luchador/);
  assert.match(Map.requirement('fuga',nodes),/Furia en la Carretera/);
  assert.equal(Map.requirement('m8',nodes),'Completa una de las misiones 6 o 7 para abrir este mundo.');
  const source=read('mission-map.js'),css=read('mission-map.css');
  assert.match(source,/aria-disabled/);assert.match(source,/preventDefault\(\);e\.stopImmediatePropagation\(\)/);assert.match(source,/removeAttribute\('href'\)/);
  assert.match(css,/\.map-node\.locked \.map-thumb\{[^}]*grayscale/);assert.match(css,/\.map-node\.locked b::after\{content:'🔒'/);assert.match(css,/\.mission-card\.map-locked/);
});

// ---- Respuesta al daño ----
test('la respuesta al daño solo salta cuando la vida baja de verdad',()=>{
  const feedback=E.createHitFeedback(),e={hp:6,maxHp:6};
  assert.equal(feedback.lost(e),0,'la primera lectura no es un golpe');
  e.hp=5;assert.equal(feedback.lost(e),1);assert.equal(feedback.lost(e),0,'una vez por golpe');
  e.hp=3.5;assert.equal(feedback.lost(e),1.5);
  e.hp=6;assert.equal(feedback.lost(e),0,'curarse no sacude');
  // Reaparecer o reiniciar crea otro encuentro, aunque tenga menos vida que el anterior.
  const wolf={hp:9,maxHp:9};feedback.lost(wolf);assert.equal(feedback.lost({hp:6,maxHp:6}),0);
  // Cambiar la vida máxima (transformarse, comprar vida) tampoco cuenta.
  const same={hp:8,maxHp:8};feedback.lost(same);same.maxHp=6;same.hp=6;assert.equal(feedback.lost(same),0);
  same.hp=5;assert.equal(feedback.lost(same),1);
});
test('un golpe sacude el lienzo y hace destellar el marcador; sin golpe no toca nada',()=>{
  const node=()=>{const names=new Set();return{names,offsetWidth:0,classList:{add:n=>names.add(n),remove:n=>names.delete(n)}};};
  const feedback=E.createHitFeedback(),canvas=node(),meter=node(),e={hp:6,maxHp:6};
  assert.equal(feedback.update(e,canvas,meter),0);assert.equal(canvas.names.size+meter.names.size,0);
  e.hp=4;assert.equal(feedback.update(e,canvas,meter),2);assert.ok(canvas.names.has('hit-shake'));assert.ok(meter.names.has('hit-flash'));
  e.hp=3;assert.equal(E.createHitFeedback().update(e,null,undefined),0);
  const alone=E.createHitFeedback();alone.update(e,null,null);e.hp=2;assert.equal(alone.update(e,null,null),1,'sin elementos no falla');
});
test('las ocho misiones enganchan la respuesta al daño y el CSS respeta prefers-reduced-motion',()=>{
  assert.match(read('game.js'),/hitFeedback\.update\(encounter,canvas,ui\.health\.parentElement\)/);
  assert.match(read('mission-hud.js'),/hitFeedback\?\.update\(encounter,canvas,ui\.health\.parentElement\)/);
  const css=read('mission-map.css');
  assert.match(css,/canvas\.hit-shake\{animation:hit-shake \.15s/);assert.match(css,/@keyframes hit-shake\{[^@]*translate:-?\dpx/);
  assert.match(css,/\.hit-flash \.life-track\{animation:/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{canvas\.hit-shake\{animation:none\}\}/);
  assert.doesNotMatch(read('styles.css'),/hit-shake|hit-flash/);
  for(const pageName of ['index.html','level-two.html','level-three.html','level-four.html','level-five.html','level-six.html','level-seven.html','level-eight.html']){const html=read(pageName);assert.ok(html.includes('mission-map.css')&&html.includes('"encounter.js"'),pageName);}
});

// ---- Aviso de disparo ----
test('aimWarning es un valor puro entre 0 y 1 que sube en los últimos 0,3 s antes del disparo',()=>{
  const ready=extra=>({kind:'rifle',hp:3,alert:true,aimReady:true,shot:0,...extra});
  assert.equal(N.AIM_WARNING,.3);
  assert.equal(N.aimWarning(undefined),0);assert.equal(N.aimWarning(N.createSoldier({x:0,y:0},0)),0,'un soldado en reposo no avisa');
  assert.equal(N.aimWarning(ready({shot:1})),0);assert.equal(N.aimWarning(ready({shot:.3})),0);
  assert.ok(Math.abs(N.aimWarning(ready({shot:.15}))-.5)<1e-9);assert.equal(N.aimWarning(ready({shot:0})),1);
  let previous=0;for(let shot=.3;shot>=0;shot-=.01){const level=N.aimWarning(ready({shot}));assert.ok(level>=previous&&level<=1);previous=level;}
  for(const off of [{aimReady:false},{hp:0},{alert:false},{frozen:1},{ramHit:{age:0}},{dropRoute:{}},{dropRecovery:.2}])assert.equal(N.aimWarning(ready({shot:.05,...off})),0,JSON.stringify(off));
  assert.equal(N.aimWarning(ready({kind:'turret',burst:2,shot:.05})),0,'la torreta solo avisa del primer tiro de la ráfaga');
  assert.ok(N.aimWarning(ready({kind:'turret',burst:0,shot:.05}))>.8);
});
test('el aviso precede a cada disparo real sin cambiar el momento del tiro',()=>{
  const n=soldier(500),p=Object.assign(P.createPlayer(),{x:300,y:620}),bullets=[],dt=1/120;let warned=0,first=null,fired=null,peak=0;
  for(let i=0;i<400&&fired===null;i++){
    N.update([n],p,dt,floor,bullets,E.segmentHit);
    if(bullets.length){fired=i;break;}
    const level=N.aimWarning(n);if(level>0){warned++;first??=i;assert.ok(level>=peak,'el aviso solo crece');peak=level;}
  }
  assert.ok(fired!==null,'el soldado acaba disparando');
  // Un segundo de gracia al alertarse, como antes; el aviso ocupa sus últimos 0,3 s.
  assert.ok(Math.abs(fired*dt-1)<.03,'el disparo llega al segundo de verle: '+fired*dt);
  assert.ok(Math.abs((fired-first)*dt-N.AIM_WARNING)<.03,'duración del aviso: '+(fired-first)*dt);
  assert.ok(peak>.9);assert.equal(N.aimWarning(n),0,'tras disparar el aviso se apaga');
  assert.equal(bullets[0].vx<0,true);assert.equal(Math.round(Math.hypot(bullets[0].vx,bullets[0].vy)),190,'la bala no cambia');
});
test('sin línea de tiro no hay aviso',()=>{
  // Lejos: lo ve (480 px) pero aún no puede disparar (430 px); un centinela no avanza.
  const p=Object.assign(P.createPlayer(),{x:100,y:620}),sentry=soldier(p.x+460,{guardPost:'a'}),bullets=[];
  for(let i=0;i<300;i++){N.update([sentry],p,1/120,floor,bullets,E.segmentHit);assert.equal(N.aimWarning(sentry),0);}
  assert.equal(sentry.alert,true);assert.equal(bullets.length,0);
  // Invisible: pierde el rastro y deja de avisar.
  const n=soldier(500);for(let i=0;i<100;i++)N.update([n],p,1/120,floor,bullets,E.segmentHit);assert.ok(N.aimWarning(n)>0);
  p.cloak=3;N.update([n],p,1/120,floor,bullets,E.segmentHit);assert.equal(N.aimWarning(n),0);
});
test('el destello se dibuja en la boca del arma del soldado y de la torreta',()=>{
  const canvas=()=>{const rects=[];return{rects,fillStyle:'',globalAlpha:1,font:'',save(){},restore(){},fillRect(...r){rects.push(r);},fillText(){},translate(){},scale(){},rotate(){},beginPath(){},rect(){},clip(){},drawImage(){}};};
  const rifle=soldier(400,{alert:true,aimReady:true,shot:.05,facing:-1}),calm=soldier(400,{alert:true,aimReady:true,shot:1});
  let c=canvas();assert.equal(Specialists.aimFlash(c,calm),false);assert.equal(c.rects.length,0);
  c=canvas();assert.equal(Specialists.aimFlash(c,rifle),true);
  // La bala sale de (x+facing*20, y-28): el destello está centrado ahí.
  for(const [x,y,w,h] of c.rects){assert.ok(Math.abs(x+w/2-(400-20))<=1);assert.ok(Math.abs(y+h/2-(620-28))<=1);}
  // La barra de vida de las misiones 1–3 lo pinta sobre el soldado; el de la torreta va con su dibujo.
  const quiet=canvas();Kit.enemyBar(quiet,calm);const loud=canvas();Kit.enemyBar(loud,rifle);assert.equal(loud.rects.length,quiet.rects.length+3);
  const turret=soldier(400,{kind:'turret',alert:true,aimReady:true,shot:.05,burst:0,turretAim:{x:430,y:590,angle:0}});
  const viaBar=canvas();Kit.enemyBar(viaBar,turret);assert.equal(viaBar.rects.length,quiet.rects.length,'la torreta no se avisa dos veces');
  const drawn=canvas();assert.equal(Specialists.draw(drawn,turret,{turret:{}}),true);
  assert.ok(drawn.rects.some(([x,y,w,h])=>Math.abs(x+w/2-430)<=1&&Math.abs(y+h/2-590)<=1),'destello en la punta del cañón');
});

// ---- Tecla R de la misión 1 ----
test('la tecla R vuelve al checkpoint sin curar: solo quien ha caído reaparece con la vida completa',()=>{
  const source=read('game.js');
  assert.match(source,/code==='KeyR'&&loaded&&!encounter\.extraction\)\{[\s\S]{0,200}const kept=encounter\.dead\?0:encounter\.hp;respawn\(\);if\(kept>0&&kept<encounter\.maxHp\)\{encounter\.hp=kept;/);
  assert.doesNotMatch(source,/code==='KeyR'&&loaded&&!encounter\.extraction\)\{respawn\(\);return;\}/);
  assert.match(read('index.html'),/<dt>Volver al checkpoint<\/dt><dd><kbd>R<\/kbd> · No cura: conservas tu salud<\/dd>/);
});
