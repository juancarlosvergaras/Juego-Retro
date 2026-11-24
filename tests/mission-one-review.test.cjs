// Regresiones de la revisión completa de la misión 1.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../physics'),E=require('../encounter'),X=require('../extraction'),F=require('../final-boss'),S=require('../mission-one-save'),C=require('../campaign'),U=require('../progression'),Score=require('../score'),Challenges=require('../challenges'),W=require('../powers'),Z=require('../zombie-form'),Fx=require('../power-fx'),Events=require('../sound-events'),Audio=require('../sound-effects');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function setup(){const platforms=P.createPlatforms();return{player:P.createPlayer(),encounter:E.createEncounter(),score:Score.create(),profile:U.fresh(),platforms,challenges:Challenges.create(platforms),fuelTanks:[{id:0,taken:false}],progression:U,campaign:C};}
const signature=list=>list.map(x=>[x.id,x.slot,x.x,x.y,!!x.taken].join(':')).join('|');

test('el rescate recoge al jugador en la azotea aunque esté pegado al borde',()=>{
  const platforms=P.createPlatforms(),arena=platforms.find(p=>p.arena);
  for(const x of [20,709]){
    const onGround=P.createPlayer();Object.assign(onGround,{x,y:arena.y,grounded:true,ground:arena});
    const overlap=P.createPlayer();Object.assign(overlap,{x,y:arena.y,grounded:true,ground:null});
    for(const p of [onGround,overlap]){const s=X.create(p,platforms,true);assert.equal(s.ground,arena.y,'x='+x);assert.ok(!s.returning,'no vuelve a subir desde la calle');}
  }
});

test('el rescate no deja ataques ni poses de combate congelados',()=>{
  const platforms=P.createPlatforms(),arena=platforms.find(p=>p.arena),p=P.createPlayer();
  Object.assign(p,{x:300,y:arena.y,grounded:true,ground:arena,form:'wolf',wolfAttack:{kind:'claw',age:.25,stage:1},ram:{dir:1},sprinting:true,zombiePose:.3,cloak:2,burrow:{age:1}});
  const s=X.create(p,platforms,true);X.update(s,p,1/120);
  assert.equal(p.wolfAttack,null);assert.equal(p.ram,null);assert.equal(p.sprinting,false);assert.equal(p.zombiePose,0);assert.equal(p.cloak,0);assert.equal(p.burrow,null);
});

test('el Lobo Negro alcanza cuerpo a cuerpo a un jugador en las esquinas de la azotea',()=>{
  const platforms=P.createPlatforms();
  for(const x of [20,709]){
    const e=E.createEncounter(),p=P.createPlayer();e.won=true;e.boss.hp=0;Object.assign(p,{form:'wolf',x,y:F.ARENA.y,grounded:true});
    let windups=0,previous='';
    for(let i=0;i<120*30;i++){F.update(e,p,1/120,()=>true,platforms);const phase=e.finalBoss.phase;if(phase==='windup'&&previous!=='windup')windups++;previous=phase;}
    assert.ok(windups>=5,'x='+x+' · amagos: '+windups);
  }
});

test('las armas del suelo vuelven en el mismo sitio al reanudar la partida',()=>{
  for(let round=0;round<5;round++){
    const g=setup();g.encounter.pickups[1].taken=true;let data;
    assert.ok(S.write({setItem:(k,v)=>data=v},{...g,checkpoint:{x:145,y:P.WORLD.ground,floor:0},maxFloor:0}));
    const next=setup();S.restore(S.read({getItem:()=>data}),next);
    assert.equal(signature(next.encounter.pickups),signature(g.encounter.pickups));
  }
  // Un guardado anterior (sin distribución) o manipulado conserva el reparto recién creado.
  const g=setup();let data;S.write({setItem:(k,v)=>data=v},{...g,checkpoint:{x:145,y:P.WORLD.ground,floor:0},maxFloor:0});
  for(const mutate of [s=>delete s.pickupLayout,s=>{s.pickupLayout[0].slot=42;},s=>{s.pickupLayout.pop();},s=>{s.pickupLayout[2].x=null;}]){
    const saved=JSON.parse(data);mutate(saved);const next=setup(),fresh=signature(next.encounter.pickups);
    assert.ok(S.restore(saved,next));assert.equal(signature(next.encounter.pickups),fresh);
  }
});

test('la misión 1 no cuenta como completada mientras el rescate sigue en curso',()=>{
  const mem={},store={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);}};
  mem['cap-dollar.mission-one.v1']=JSON.stringify({version:1,finalWon:true,challenges:{done:false}});
  assert.equal(C.completedMissions(store).includes(1),false);
  mem['cap-dollar.mission-one.v1']=JSON.stringify({version:1,finalWon:true,challenges:{done:true}});
  assert.equal(C.completedMissions(store).includes(1),true);
  // Guardados de versiones anteriores, sin el campo «done», siguen contando.
  const old={},oldStore={getItem:k=>old[k]??null,setItem:(k,v)=>{old[k]=String(v);}};
  old['cap-dollar.mission-one.v1']=JSON.stringify({version:1,finalWon:true});
  assert.equal(C.completedMissions(oldStore).includes(1),true);
});

test('la regeneración no destella con la vida completa y sigue curando heridas',()=>{
  const e=E.createEncounter(),p=P.createPlayer(),s=W.create(),profile=U.fresh(),view={left:0,right:729,top:0,bottom:450};p.regenLevel=5;
  for(let i=0;i<120*20;i++){W.update(s,e,p,profile,false,1/120,[],view);assert.ok(!(p.healGlow>0));}
  e.hp=e.maxHp-2;for(let i=0;i<120*2;i++)W.update(s,e,p,profile,false,1/120,[],view);
  assert.equal(e.hp,e.maxHp-1);
});

test('el rayo del zombi acierta a los jefes donde acertaría una bala',()=>{
  let would=0,hits=0;
  for(const [ax,ay] of [[1,0],[Math.SQRT1_2,-Math.SQRT1_2],[Math.SQRT1_2,Math.SQRT1_2]])for(let dx=40;dx<=200;dx+=40)for(let dy=-120;dy<=120;dy+=20){
    const e=E.createEncounter(),p=P.createPlayer();Object.assign(p,{form:'zombie',h:68,x:300,y:300,grounded:true,aim:{x:ax,y:ay},facing:1});Object.assign(e.boss,{x:300+dx,y:300+dy,active:true});
    const hp=e.boss.hp;Z.combat(e,p,{fire:true},1/120,[]);
    const ray=e.zombieEffects.find(f=>f.kind==='ray');
    if(E.segmentHit(ray.x,ray.y,ax*440,ay*440,{x:e.boss.x-30,y:e.boss.y-75,w:60,h:75})!==null){would++;if(e.boss.hp<hp)hits++;}
  }
  assert.ok(would>10);assert.equal(hits,would);
});

test('las recargas restauradas no cuentan como lanzamientos nuevos',()=>{
  const powers={age:3,cooldowns:{orbital:11,wave:4},effects:[],beams:[],drones:[],turrets:[]},p={x:100,y:100,facing:1};
  Fx.prime(powers);assert.equal(Fx.launches(powers,p).length,0);
  powers.cooldowns.drone=12;assert.equal(Fx.launches(powers,p).length,1,'un poder usado después sí lanza');
  const calls=[],events=Events.create({play:name=>calls.push(name),loop(){}}),resumed={cooldowns:{orbital:11,wave:4},effects:[],turrets:[]};
  const state={player:{x:100,y:100,grounded:true,jumps:0,vx:0},encounter:{hp:5,enemies:[],boss:{hp:18},finalBoss:{hp:32},bullets:[],explosions:[],pickups:[],medkits:[]},powers:resumed,ambience:null,arrival:null,fuelTanks:[]};
  events.prime(resumed);events.update(state,1/120);
  assert.ok(!calls.includes('orbital')&&!calls.includes('wave'),calls.join());
});

test('el sonido de compra suena con la partida en pausa sin abrir la compuerta del juego',async()=>{
  const links=[],param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=kind=>new Proxy({kind,connect(to){links.push([kind,to?.kind]);},disconnect(){},start(){},stop(){}},{get(t,k){if(!(k in t))t[k]=param();return t[k];},set(t,k,v){t[k]=v;return true;}});
  const context=new Proxy({currentTime:0,sampleRate:800,state:'interrupted',destination:node('destination'),resume(){this.state='running';return Promise.resolve();}},{get(t,k){if(k in t)return t[k];if(k==='createBuffer')return(c,n)=>({getChannelData:()=>new Float32Array(n)});if(typeof k==='string'&&k.startsWith('create'))return()=>node(k.slice(6));}});
  const audio=Audio.create({storage:{getItem:()=>null,setItem(){}},music:null,context});
  assert.equal(await audio.unlock(),true,'un contexto interrumpido (iOS) también se reanuda');
  audio.setRunning(false);
  assert.equal(audio.play('pickup',{gain:.5}),false,'los efectos del juego siguen callados en pausa');
  links.length=0;assert.equal(audio.play('pickup',{gain:.5,ui:true}),true);
  assert.deepEqual(links.filter(l=>l[0]==='StereoPanner').map(l=>l[1]),['DynamicsCompressor']);
});

test('controls.js solo consume la suelta de las teclas que él mismo dirigió',()=>{
  const listeners={keydown:[],keyup:[]},emitted=[],menu={hidden:true,closest:()=>null};
  const el=()=>({hidden:true,closest:()=>null,querySelector:()=>null,querySelectorAll:()=>[],append(){},setAttribute(){},focus(){},classList:{add(){},remove(){}},style:{}});
  const byId=new Map([['main-menu',menu]]),getElementById=id=>{if(!byId.has(id))byId.set(id,el());return byId.get(id);};
  const doc={hidden:false,activeElement:null,body:el(),getElementById,querySelector:()=>null,querySelectorAll:()=>[],createElement:el,addEventListener(){},dispatchEvent(e){emitted.push([e.type,e.code]);}};
  const root={document:doc,localStorage:{getItem:()=>null,setItem(){}},navigator:{},KeyboardEvent:class{constructor(type,init){this.type=type;Object.assign(this,init);}},addEventListener(type,fn){listeners[type]?.push(fn);}};
  root.window=root;vm.runInNewContext(read('controls.js'),root);
  assert.ok(root.ArcadeControls,'controls.js se instala');
  const fire=(type,code,extra={})=>{const e={type,code,key:code,target:{tagName:'BODY'},prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const fn of listeners[type])fn(e);return e;};
  // En un menú, Espacio pertenece al navegador: su suelta activa botones y casillas.
  menu.hidden=false;assert.equal(fire('keydown','Space').prevented,false);assert.equal(fire('keyup','Space').prevented,false);
  // En partida la tecla se dirige y su suelta se consume.
  menu.hidden=true;emitted.length=0;assert.equal(fire('keydown','KeyD').stopped,true);assert.equal(fire('keyup','KeyD').prevented,true);
  assert.deepEqual(emitted,[['keydown','KeyD'],['keyup','KeyD']]);
  // Con Ctrl es un atajo del navegador: ni se cancela ni llega a la misión, y su suelta pasa de largo.
  emitted.length=0;const down=fire('keydown','KeyD',{ctrlKey:true});assert.equal(down.prevented,false);assert.equal(down.stopped,true);
  assert.equal(fire('keyup','KeyD',{ctrlKey:true}).stopped,false);assert.equal(emitted.length,0);
  // Ctrl y Alt no se pueden asignar a una acción.
  assert.doesNotMatch(read('controls.js'),/Control\(Left\|Right\)|Alt\(Left\|Right\)/);
});

test('game.js: cierre de misión, reaparición y accesos protegidos',()=>{
  const source=read('game.js');
  // Completar la misión borra la partida a medias y deja de guardarla.
  assert.match(source,/onFinish\(\)\{ArcadeCampaign\.markCompleted\(saveStore,1\);[\s\S]{0,160}missionClosed=true;try\{saveStore\.removeItem\(window\.ArcadeMissionOneSave\?\.KEY\);\}catch\{\}/);
  assert.match(source,/if\(!arrival\?\.active&&!missionClosed\)window\.ArcadeMissionOneSave\?\.write\(/);
  assert.match(source,/if\(full\)\{missionClosed=false;/);
  // R no actúa en pausa ni durante la llegada en jeep.
  assert.match(source,/code==='KeyR'&&loaded&&!encounter\.extraction\)\{if\(paused\|\|arrival\?\.active\)return;/);
  // Las recargas que se conservan al reaparecer o al reanudar no suenan ni se dibujan como lanzamientos nuevos.
  assert.match(source,/Object\.assign\(powers\.cooldowns,previousCooldowns\);soundEvents\.prime\?\.\(powers\);window\.ArcadePowerFx\?\.prime\?\.\(powers\);/);
  assert.match(source,/powers\.cooldowns\[id\]=Math\.max\(0,Math\.min\(power\.cooldown,time\)\);\}soundEvents\.prime\?\.\(powers\);/);
  // Un jefe abatido en el mismo instante en que cae el jugador sigue abatido al reaparecer.
  assert.match(source,/keepWolf=!full&&\(encounter\.won\|\|encounter\.boss\.hp<=0\)/);
  assert.match(source,/savedFinalWon=encounter\.finalWon\|\|\(encounter\.finalBoss\.stage===2&&encounter\.finalBoss\.hp<=0\)/);
  // El parte de resultados y la cinemática bloquean las teclas del juego; Tab sin destino no falla.
  assert.equal(source.split('window.ArcadeMissionResults?.isOpen?.()').length-1,2);
  assert.match(source,/e\.preventDefault\(\);if\(!focusable\.length\)return;/);
  assert.match(source,/if\(!story\?\.briefingOpen\(\)\)sound\.setRunning\(/);
  // Los botones táctiles se bloquean durante el rescate y el lienzo sin tamaño no rompe la cámara.
  assert.match(source,/button\.addEventListener\('pointerdown',e=>\{e\.preventDefault\(\);if\(!loaded\|\|paused\|\|encounter\.dead\|\|encounter\.extraction\|\|arrival\?\.active\)return;/);
  assert.match(source,/const bounds=canvas\.getBoundingClientRect\(\);if\(!\(bounds\.width>0&&bounds\.height>0\)\)return;/);
});

test('el menú responde a Esc y Tab aunque el foco quede fuera',()=>{
  const source=read('main-menu.js');
  assert.match(source,/layer\.addEventListener\('keydown',onKey\);/);
  assert.match(source,/document\.addEventListener\?\.\('keydown',e=>\{if\(layer\.hidden\|\|e\.defaultPrevented\|\|layer\.contains\(e\.target\)\|\|e\.target\?\.closest\?\.\('\[role="dialog"\]'\)\)return;onKey\(e\);\},true\);/);
});
