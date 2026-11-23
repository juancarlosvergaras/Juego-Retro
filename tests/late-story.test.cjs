const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const One=require('../mission-one-story.js');
const read=file=>fs.readFileSync(file,'utf8');
// Las cuatro misiones tardías: módulo, página, motor y un contexto que dispara cada aviso de radio.
const missions=[
 {n:5,name:'five',page:'level-five.html',game:'level-five-game.js',story:require('../mission-five-story.js'),eyebrow:/^MISIÓN 05 · BAJO EL ABISMO$/,
  fire:{start:{diving:true},hull:{diving:true,submersible:true},mines:{mines:true},shark:{shark:true},hurt:{hp:3},sonar:{checkpoint:0,inside:false},reef:{x:5000,inside:false},trench:{x:9000,inside:false},airlock:{airlock:true},boss:{bossActive:true},half:{bossHalf:true},books:{bossDown:true},next:{reward:true}}},
 {n:6,name:'six',page:'level-six.html',game:'level-six-game.js',story:require('../mission-six-story.js'),eyebrow:/^MISIÓN 06 · EL ÚLTIMO CENTRO$/,
  fire:{start:{playing:true,floor:0},guards:{guards:2},rear:{rear:true},arcade:{arcade:true},hurt:{hp:2},floor2:{floor:1},floor3:{floor:2},roof:{floor:3},boss:{bossActive:true},half:{bossHalf:true},signal:{bossDown:true},orbit:{bossDown:true}}},
 {n:7,name:'seven',page:'level-seven.html',game:'level-seven-game.js',story:require('../mission-seven-story.js'),eyebrow:/^MISIÓN 07 · EL SOBERANO DEL VACÍO$/,
  fire:{start:{playing:true,floor:0},crew:{aliens:1},pilots:{pilots:1},hurt:{hp:1},mid:{floor:0,x:5000},lock:{floor:0,airlockNear:true},inside:{floor:1},gallery:{floor:1,x:3500},core:{floor:2},boss:{bossActive:true},half:{bossHalf:true},down:{bossDown:true},home:{wrap:true}}},
 {n:8,name:'eight',page:'level-eight.html',game:'level-eight-game.js',story:require('../mission-eight-story.js'),eyebrow:/^MISIÓN 08 · NUEVA YORK/,
  fire:{start:{playing:true,floor:0},traffic:{traffic:true},soldiers:{soldiers:3},police:{policeNear:true},joined:{allies:1},hurt:{hp:3},midtown:{floor:1},plaza:{floor:2},boss:{bossActive:true},retreat:{retreat:true},titan:{titan:true},half:{titanHalf:true},down:{bossDown:true}}}
];
const finaleText=story=>story.finaleScript?story.finaleScript({}).flatMap(p=>[p.text||'',p.title?.title||'',...(p.credits||[]).map(l=>l.text||l.label||'')]):[];
const allText=story=>[...story.briefing.flatMap(p=>[p.title||'',p.text,...(p.objectives||[])]),...(story.config.outro||[]).map(p=>p.text),...story.beats.map(b=>b.text),story.config.epilogue||'',...(story.finale?[story.finale.title,...story.finale.paragraphs,...(story.finale.credits||[])]:[]),...finaleText(story)];

test('las misiones 5 a 8 cuentan su historia en subtítulos, con radio de Vega y epílogo',()=>{
 for(const {n,story,eyebrow} of missions){
  const lines=story.briefing.filter(p=>p.text);
  assert.ok(story.briefing.length>=3&&story.briefing.length<=5,'misión '+n+': de tres a cinco planos');
  assert.ok(lines.length>=2&&lines.length<=4,'misión '+n+': de dos a cuatro subtítulos');
  for(const page of story.briefing){assert.ok(!page.objectives,'sin objetivos: '+n);assert.ok(page.text.length<=150,'subtítulo breve: '+n);}
  if(n<8)assert.ok(story.config.outro.length>=2&&story.config.outro.length<=3,'epílogo animado de dos o tres planos: '+n);
  assert.match(story.config.eyebrow,eyebrow);assert.ok(story.config.startLabel.length>3);assert.ok(story.config.epilogue.length>60,'epílogo '+n);
  assert.equal(story.config.briefing,story.briefing);assert.equal(story.config.beats,story.beats);assert.equal(typeof story.mount,'function');
  const ids=story.beats.map(b=>b.id);assert.equal(new Set(ids).size,ids.length,'avisos sin repetir en la misión '+n);assert.equal(ids[0],'start');
  assert.ok(story.beats.some(b=>b.who==='VEGA · PILOTO'),'Vega acompaña en la misión '+n);assert.ok(story.beats.some(b=>b.who==='CAP DOLLAR'));
  assert.equal(story.beats[0].who,'VEGA · PILOTO','Vega abre la misión '+n);
  for(const b of story.beats){assert.ok(['VEGA · PILOTO','CAP DOLLAR'].includes(b.who),b.id);assert.ok(b.text.length>10&&b.text.length<125,'aviso breve: '+n+'/'+b.id);if(b.after)assert.ok(ids.includes(b.after),b.id+' espera a un aviso que existe');}
  assert.ok(story.config.ambient instanceof RegExp&&story.config.series instanceof RegExp);
  for(const id of ['start','boss','half',ids.at(-1),ids.at(-2)])assert.ok(!story.config.ambient.test(id),'un aviso de historia nunca caduca: '+n+'/'+id);
 }
});

test('cada aviso de radio se dispara con su contexto y ninguno falla con un contexto vacío',()=>{
 for(const {n,story,fire} of missions){
  const base={hp:8,x:0,floor:-1,checkpoint:-1,inside:false,guards:0,aliens:0,pilots:0,soldiers:0,allies:0};
  assert.deepEqual(Object.keys(fire).sort(),story.beats.map(b=>b.id).sort(),'la prueba cubre todos los avisos de la misión '+n);
  for(const b of story.beats){
   assert.doesNotThrow(()=>b.when({}),'contexto vacío: '+n+'/'+b.id);assert.equal(!!b.when({}),false,'nada suena sin contexto: '+n+'/'+b.id);
   assert.equal(!!b.when(base),false,'nada suena en reposo: '+n+'/'+b.id);
   assert.equal(!!b.when({...base,...fire[b.id]}),true,'se dispara: '+n+'/'+b.id);
   assert.equal(!!b.when({...base,hp:0}),false,'sin vida no hay aviso: '+n+'/'+b.id);
  }
  const radio=One.createRadio(story.beats,story.config.ambient,story.config.series);radio.reset();
  const cues=story.beats.slice(n===8?-1:-2);
  if(cues.length===2)assert.equal(cues[1].after,cues[0].id);
  const end=Object.assign({...base},...cues.map(c=>fire[c.id]));
  const heard=[];for(let i=0;i<60*30;i++){const now=radio.update(end,1/60);if(now&&heard.at(-1)!==now.id)heard.push(now.id);}
  assert.deepEqual(heard,cues.map(c=>c.id),'cierre en orden en la misión '+n);
  const closing=cues.reduce((sum,b)=>sum+Math.max(4,2.2+b.text.length*.055)+.6,0);
  assert.ok(closing<(n===8?5.2:13.5),'el cierre cabe en el final de la misión '+n);
 }
});

test('el hilo es uno solo: el Consorcio, sin regionalismos ni restos del guion anterior',()=>{
 const stories=[require('../mission-two-story.js'),require('../mission-three-story.js'),require('../mission-four-story.js'),...missions.map(m=>m.story)];
 const sources=['mission-two-story.js','mission-three-story.js','mission-four-story.js','mission-five-story.js','mission-six-story.js','mission-seven-story.js','mission-eight-story.js','mission-endings.js','level-three-game.js','level-five-game.js','level-six-game.js','level-seven-game.js','level-eight-game.js','sea-renderer.js','mall-renderer.js','space-renderer.js','new-york-renderer.js','quimera-game.js','level-three.html','level-four.html','level-five.html','level-six.html','level-seven.html','level-eight.html'];
 for(const file of sources){const text=read(file);for(const banned of [/os vean/,/aparcad/i,/los dueños/i,/vosotros/i,/\bcoches?\b/i])assert.doesNotMatch(text,banned,file+' no contiene '+banned);}
 for(const story of stories)for(const line of allText(story))for(const banned of [/os vean/,/aparcad/i,/los dueños/i,/dueño de la manada/i])assert.doesNotMatch(line,banned);
 for(const story of stories.slice(1))assert.ok(allText(story).some(line=>line.includes('Consorcio')),'cada misión desde la 03 nombra al Consorcio');
 assert.ok(allText(stories[0]).some(line=>line.includes('Consorcio')),'la misión 02 lo presenta al cerrar');
 // Rutas ramificadas: una misión no da por jugada otra de su misma bifurcación.
 const [two,three,four,five,six,seven,eight]=stories.map(s=>allText(s).join('\n'));
 assert.doesNotMatch(two,/portaaviones/i,'la misión 02 no empuja a la 03 como única salida');
 assert.doesNotMatch(four,/portaaviones|Centinela/i,'la misión 04 no da por jugada la 03');
 assert.doesNotMatch(four,/submarino esperándolos/);assert.match(require('../mission-four-story.js').config.epilogue,/submarino/);
 assert.doesNotMatch(five,/portaaviones|Centinela|Devorador|convoy|mini tanque/i,'la misión 05 no da por jugadas la 03 ni la 04');
 assert.doesNotMatch(six,/portaaviones|Centinela|Devorador|convoy|submarino|Capitán/i,'la misión 06 no da por jugada ninguna de las 03 a 05');
 assert.doesNotMatch(seven,/Centinela|Devorador|Capitán del Abismo|submarino/i);assert.match(seven,/libros del Capitán/);
 assert.doesNotMatch(eight,/Soberano|nave nodriza|Quimera|Varela/i,'la misión 08 no dice quién apagó la señal');assert.match(eight,/La señal que alimentaba al Consorcio se apagó/);
 const sea=read('sea-renderer.js');
 assert.match(sea,/const launching=s\.intro<5&&!s\.inside&&p\.tankUnlocked&&p\.form==='tank'/,'la transformación necesita el tanque activo en el exterior');
 assert.match(sea,/launching\?'El mini tanque sella su blindaje\.'/,'el rótulo corresponde a la transformación visible');
 assert.match(read('quimera-game.js'),/a bordo del helicóptero de Vega/);assert.doesNotMatch(read('quimera-game.js'),/a bordo de Vega/);
 assert.match(read('level-three-game.js'),/coordenadas del submarino/);assert.doesNotMatch(read('mission-endings.js'),/FURIA EN LA CARRETERA|MISIÓN 04/,'el final de la 03 no anuncia la 04 como único camino');
 assert.doesNotMatch(read('level-seven-game.js')+read('space-renderer.js'),/núcleo expuesto/i,'el Soberano no tiene un núcleo que se exponga');
});

test('el parte de Manhattan enlaza directamente con el delta',()=>{
 const {finale,config}=missions[3].story,html=read('level-eight.html');
 const panel=html.slice(html.indexOf('id="victory-screen"'),html.indexOf('id="mall-interact"'));
 assert.ok(panel.includes('>'+finale.title+'<'));assert.ok(panel.includes(finale.paragraphs[0]));
 assert.match(panel,/Misión 09 · Marea de hierro/);assert.doesNotMatch(panel,/victory-credits/);
 assert.match(config.epilogue,/Comandante/);
});

test('las páginas 5 a 8 cargan estilos y guiones en orden, con los marcadores de su misión',()=>{
 for(const {n,name,page,story} of missions){
  const html=read(page),order=file=>{const tag='<script src="'+file+'"></script>',i=html.indexOf(tag);assert.ok(i>0,page+' carga '+file);assert.equal(html.indexOf(tag,i+1),-1,page+' carga '+file+' una sola vez');return i;};
  const game=order('level-'+name+'-game.js');
  for(const file of ['mission-results.js','story-cinema.js','mission-one-scenes.js','mission-one-story.js','mission-late-scenes.js','mission-'+name+'-story.js'])assert.ok(order(file)<game,page+': '+file+' antes del motor');
  if(n===8)assert.ok(order('mission-late-scenes.js')<order('mission-finale-scenes.js')&&order('mission-finale-scenes.js')<game,'el final se registra tras las escenas de la misión');
  assert.ok(order('mission-one-scenes.js')<order('mission-late-scenes.js'),'las viñetas se registran sobre el sistema común');
  assert.ok(order('mission-one-story.js')<order('mission-'+name+'-story.js'));assert.ok(order('white-death-atlas.js')<order('mission-late-scenes.js'));
  const sheet='<link rel="stylesheet" href="mission-one-polish.css">';assert.equal(html.split(sheet).length,2,page+' enlaza la hoja una vez');
  assert.ok(html.includes(sheet+'<link rel="stylesheet" href="mobile-play.css">'),page+': la hoja va justo antes de mobile-play.css');assert.ok(html.indexOf(sheet)<html.indexOf('</head>'));
  assert.match(html,/<body class="[^"]*\bmission-(five|six)\b/,'la hoja reconoce la página por la clase del body');
  const panel=html.slice(html.indexOf('id="victory-screen"'),html.indexOf('class="touch-two"'));assert.match(panel,/Consorcio/,page+': el panel de victoria sigue el hilo');
  assert.ok(story.config.scenes===name);
 }
 const boss=file=>read(file).match(/id="boss-title">([^<]*)<\/span>.*?aria-label="([^"]*)"/).slice(1);
 assert.deepEqual(boss('level-three.html'),['JEFE · CENTINELA AÉREO','Vida del Centinela Aéreo']);
 assert.deepEqual(boss('level-four.html'),['JEFE · EL DEVORADOR DE ASFALTO · 3 TORRETAS','Vida del Devorador de Asfalto']);
 assert.deepEqual(boss('level-five.html'),['JEFE · CAPITÁN DEL ABISMO','Vida del Capitán del Abismo']);
 assert.deepEqual(boss('level-six.html'),['JEFE · EL COLOSO','Vida del Coloso']);
 assert.deepEqual(boss('level-eight.html'),['JEFE · EL COMANDANTE','Vida del Comandante']);
 assert.ok(read('level-five.html').includes('id="stars-two">★ 0 / 4<'),'la misión 05 tiene cuatro estrellas');assert.ok(read('level-five-game.js').includes("s.stars.size+' / 4'"));
 // Las misiones 5 a 8 comparten el encuadre amplio de la 4; la tienda y la rueda de poderes siguen siendo las suyas.
 const css=read('mission-one-polish.css'),guard=':not(.mission-five):not(.mission-six)';
 for(const line of css.split('\n'))if(/#power-status\{display|#power-wheel:has|\.overlay-panel:has\(#shop|#shop \.shop-summary|^.*#shop-list\{display:block/.test(line)&&!line.trimStart().startsWith('/*'))assert.ok(line.includes(guard),'regla acotada: '+line.slice(0,70));
 assert.ok(css.includes(':root:not(.mobile-play) body>.header,')&&css.includes(':root:not(.mobile-play) body{--scene-height:'),'el encuadre sin cabecera vale para las ocho misiones');
 assert.match(read('level-five.css'),/body\.mission-five \.combat-hud,body\.mission-six \.combat-hud\{top:20px/,'munición y saltos van en la fila superior del HUD');
 assert.match(css,/\.mission-five #radio,[^{]*\.mission-six #radio\{top:/,'la radio baja por debajo del HUD de munición');
 for(const id of ['#radio{','#briefing{','#mission-results{'])assert.ok(css.includes('\n'+id),'la radio, el informe y el parte siguen sin acotar: '+id);
});

test('los planos de las misiones 5 a 8 se registran y hay uno por subtítulo',()=>{
 const sets={};const root={ArcadeStoryScenes:{images:{},tools:new Proxy({},{get:()=>()=>{}}),register(set,files,list){sets[set]={files,list};}}};
 vm.runInNewContext(read('mission-late-scenes.js'),{window:root,globalThis:root,Math});
 assert.deepEqual(Object.keys(sets),['five','six','seven','eight']);
 for(const {n,name,story} of missions){
  const {files,list}=sets[name];assert.equal(list.intro.length,story.briefing.length,'misión '+n+': un plano por página de la intro');
  if(n<8)assert.equal(list.outro.length,story.config.outro.length,'misión '+n+': un plano por página del epílogo');
  for(const path of Object.values(files))assert.ok(fs.statSync(path).size>1000,path);
 }
 const source=read('mission-late-scenes.js');for(const path of source.match(/assets\/[^'"]+/g))assert.ok(fs.existsSync(path),path);
});

// Arnés: el motor real de cada misión, con la radio real y un informe que la prueba abre y cierra.
function fakeStory(story){
 const radio=One.createRadio(story.beats,story.config.ambient,story.config.series),state={open:false,opened:0,done:null,blocked:null,shown:new Set(),missing:new Set(),updates:0,outros:0,finales:[]};
 const api={radio,epilogue:story.config.epilogue,briefingOpen:()=>state.open,briefing(callback){state.open=true;state.opened++;state.done=callback;},reset(){radio.reset();},
  outro(callback){state.open=true;state.outros++;state.done=callback;},finale(data,callback){state.open=true;state.finales.push(data);state.done=callback;},
  update(c,dt){state.updates++;radio.update(new Proxy(c,{get(t,k){if(typeof k==='string'&&!(k in t))state.missing.add(k);return t[k];}}),dt);if(radio.state.current)state.shown.add(radio.state.current.id);},
  render(blocked){state.blocked=!!blocked;}};
 return{api,state,close(){state.open=false;const done=state.done;state.done=null;done?.();}};
}
async function game(mission,query,initial={},{story,results}={}){
 const data=new Map(Object.entries(initial)),els=new Map(),listeners={};let frame,view,loader,menu,navigation;
 const el=id=>{if(!els.has(id))els.set(id,{hidden:id==='victory-screen',disabled:false,style:{},classList:{toggle(){}},parentElement:{setAttribute(){}},setAttribute(){},focus(){},addEventListener(){},querySelectorAll:()=>[],getContext:()=>({}),click(){this.onclick?.();}});return els.get(id);};
 const context={console,Math,Set,Map,Number,JSON,String,URLSearchParams,location:{search:query,assign:u=>navigation=u},history:{replaceState(){}},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{hidden:false,getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(){}},addEventListener:(n,f)=>listeners[n]=f,requestAnimationFrame:f=>frame=f,Image:class{set src(v){this.width=120;this.height=120;queueMicrotask(()=>this.onload());}},prepareWhiteDeath:x=>x,
  ArcadeDeveloperMode:{storage:s=>s,prepare(){},tick(){},poll(){}},ArcadeControls:{poll(){},decorate:i=>i},ArcadeFrameBudget:{create:()=>({plan:()=>({render:true,hud:true})})},ArcadeAudio:{create:()=>({play(){},loop(){},setRunning(){},unlock(){}})},ArcadeCampaign:require('../campaign'),ArcadeProgression:require('../progression'),ArcadeMissionCombat:require('../mission-combat'),ArcadeSoundEvents:require('../sound-events'),ArcadePhysics:require('../physics'),ArcadePowers:require('../powers'),ArcadeDifficulty:require('../difficulty'),ArcadeArsenal:require('../arsenal'),ArcadeRoadWar:require('../road-war'),ArcadeSeaWar:require('../sea-war'),ArcadeZombieForm:require('../zombie-form'),ArcadeAdvancedForms:{load:()=>Promise.resolve()},ArcadeRobotForm:{load:()=>Promise.resolve(),installDock:()=>()=>{},cycle(){}},ArcadeMissionHud:{create:()=>({update(){}})},ArcadeCharacterWheel:{create:()=>({update(){},setSprites(){}})},ArcadeTutorial:{create:()=>({})},ArcadeLoading:{begin(){},step(){},finish(){},fail(){throw Error('Asset load failed');}},ArcadePowerSprites:{setSpriteSheet(){},setOrbitalSheet(){}},ArcadeCheckpoints:{setSheet(){}},ArcadeMainMenu:{create:o=>{menu=o;return{isOpen:()=>false,defer:f=>loader=f,ready:({autoPlay})=>{if(autoPlay)o.onPlay();},show(){},fail(){}};}},SOLDIER_V2_FRAMES:[[[0,0,10,10]]],ACTION_FRAMES:{wolf:[[0,0,0,0,0,0,0,[0,0,10,10]]]}};
 context.ArcadeZombieForm={...context.ArcadeZombieForm,...Object.fromEntries(['setRunSheet','setShockSheet','setSheet','setExtra','setCastSheet','setPlayerSheets','setIdleSheet'].map(k=>[k,()=>{}]))};context.window=context;
 const renderer={create:()=>({riders:Array(12).fill([0,0,10,10]),divers:Array(16).fill([0,0,10,10]),draw(c,s,p,e){view={s,p,e};}})};context.ArcadeSeaRenderer=renderer;
 const paths=file=>JSON.parse(read(file).match(/const paths=(\{.*?\});function create/)[1]);
 vm.runInNewContext(read('mall-renderer.js'),{window:context});context.ArcadeMallRenderer.create=renderer.create;context.ArcadeMallWorld=require('../mall-world');context.ArcadeSpaceWorld=require('../space-world');context.ArcadeSpaceRenderer={...renderer,paths:paths('space-renderer.js')};
 context.ArcadeMallArcadeUI={create:o=>({active:false,show(){this.active=true;},close(){this.active=false;o.onClose();}})};context.ArcadeSoldierAnimation=require('../soldier-animation');context.ArcadeJetpackRenderer={setSheet(){}};context.ArcadeFormTransition={setSheet(){},setEndpoint(){}};context.ArcadeImpact={setSheet(){}};
 context.ArcadeNewYorkWorld=require('../new-york-world');context.ArcadeNewYorkRenderer={...renderer,paths:paths('new-york-renderer.js')};
 const m=missions.find(x=>x.n===mission);
 if(story)context['ArcadeMission'+m.name[0].toUpperCase()+m.name.slice(1)+'Story']={mount:()=>story.api};
 if(results)context.ArcadeMissionResults=results;
 vm.runInNewContext(read(m.game),context);await new Promise(r=>setImmediate(r));
 let now=0;const tick=t=>{for(let i=0;i<Math.ceil(t*120);i++){now+=1000/120;frame(now);}};tick(.02);
 // Avanza sin que el jefe pueda tumbar al cazador mientras se escucha la radio.
 const survive=t=>{for(let i=0;i<Math.ceil(t*4);i++){view.e.hp=view.e.maxHp;view.e.dead=false;tick(.25);}};
 return{data,el,tick,survive,loader:()=>loader(),play:()=>el('play-two').click(),key:(code,down=true)=>listeners[down?'keydown':'keyup']?.({code,key:code.slice(-1),repeat:false,preventDefault(){}}),get menu(){return menu;},get navigation(){return navigation;},get view(){return view;}};
}
const saveKey=m=>'cap-dollar.mission-'+m.name+'.v1',world={5:'sea',6:'mall',7:'space',8:'newYork'},intro={5:5,6:4,7:4,8:4};
const fakeResults=()=>{const r={shown:[],open:false,show(card){r.shown.push(card);r.open=true;},isOpen:()=>r.open};return r;};

test('una partida nueva abre el informe una sola vez y el juego no corre hasta que se cierra',async()=>{
 for(const m of missions){
  const story=fakeStory(m.story),g=await game(m.n,'?entry=campaign',{},{story});
  assert.equal(story.state.opened,1,'misión '+m.n+': el informe se abre al empezar');assert.equal(story.state.open,true);
  g.tick(1);assert.equal(g.view.s.intro,0,'misión '+m.n+': la partida espera al informe');assert.equal(story.state.updates,0);assert.equal(story.state.blocked,true,'sin radio durante el informe');
  g.key('Space');g.key('Escape');g.play();g.menu.onPlay();g.tick(.5);
  assert.equal(g.view.s.intro,0,'ni el teclado ni el menú arrancan la partida con el informe abierto');assert.equal(story.state.opened,1);assert.equal(story.state.open,true);
  story.close();g.tick(.5);
  assert.ok(g.view.s.intro>0,'misión '+m.n+': al cerrar el informe la partida arranca');assert.equal(story.state.opened,1);assert.equal(story.state.blocked,true,'sin radio durante la intro');
  g.tick(intro[m.n]+.5);assert.equal(g.view.s.intro,intro[m.n]);assert.equal(story.state.blocked,false,'la radio habla al terminar la intro');
  assert.ok(story.api.radio.state.seen.has('start'),'Vega abre la misión '+m.n);
  // El teclado responde: el cazador se mueve.
  const x=g.view.p.x;g.key('ArrowRight');g.tick(.6);g.key('ArrowRight',false);assert.ok(g.view.p.x>x+20,'misión '+m.n+': el teclado no queda bloqueado tras el informe');
  // Pausa y vuelta: sin informe y sin radio mientras dura.
  g.el('pause-two').click();g.tick(.2);assert.equal(story.state.blocked,true,'sin radio en pausa');
  g.el('pause-two').click();g.tick(.2);assert.equal(story.state.blocked,false);assert.equal(story.state.opened,1,'volver de la pausa no repite el informe');
  // Muerte y reintento desde el checkpoint.
  g.view.e.dead=true;g.tick(.2);assert.equal(story.state.blocked,true,'sin radio al caer');
  g.play();g.tick(.3);assert.equal(g.view.e.dead,false);assert.equal(story.state.opened,1,'el reintento no repite el informe');assert.equal(story.state.blocked,false);
  assert.deepEqual([...story.state.missing],[],'misión '+m.n+': el contexto trae todo lo que la radio consulta');
 }
});

test('reanudar una partida empezada no muestra el informe',async()=>{
 for(const m of missions){
  const story=fakeStory(m.story),g=await game(m.n,'?entry=resume',{[saveKey(m)]:JSON.stringify({hp:8,[world[m.n]]:{started:true}})},{story});
  assert.equal(story.state.opened,0,'misión '+m.n);g.tick(.5);assert.equal(story.state.blocked,false);assert.ok(story.state.updates>0);
 }
});

test('sin los módulos de historia las misiones 5 a 8 siguen arrancando',async()=>{
 for(const m of missions){const g=await game(m.n,'?entry=campaign');g.tick(.5);assert.ok(g.view.s.intro>0,'misión '+m.n);}
});

test('la radio acompaña al jefe y cierra cada misión antes del parte, que sustituye al panel antiguo',async()=>{
 const arena={5:{inside:true,started:true,x:180,y:436,checkpoint:3},6:{floor:3,checkpoint:3,started:true,x:350,y:472},7:{floor:2,started:true,x:350,y:472},8:{floor:2,started:true,x:350,y:472}};
 const closing={5:['books','next'],6:['signal','orbit'],7:['down','home'],8:['down']},ending={5:14,6:11,7:14,8:5.2};
 const next={5:'level-six.html?entry=campaign',6:'level-eight.html?entry=campaign',7:'level-eight.html?entry=campaign'};
 for(const m of missions){
  const story=fakeStory(m.story),results=fakeResults(),g=await game(m.n,'?entry=resume',{[saveKey(m)]:JSON.stringify({hp:8,[world[m.n]]:arena[m.n]})},{story,results});
  g.survive(12);assert.ok(story.state.shown.has('boss'),'misión '+m.n+': Vega presenta al jefe');
  // En la misión 08 el aviso de media vida es del Titán: antes hay que tumbar al Comandante a pie.
  if(m.n===8){g.view.s.boss.hp=g.view.s.boss.maxHp*.4;g.survive(3);assert.ok(!story.state.shown.has('half'),'el Comandante a pie no gasta el aviso del Titán');
   g.view.s.boss.hp=0;g.survive(1);assert.ok(g.view.s.boss.invulnerable);g.survive(6);assert.equal(g.view.s.boss.stage,2);assert.ok(story.state.shown.has('retreat'));g.survive(9);assert.ok(story.state.shown.has('titan'),'Vega presenta al Titán');}
  g.view.s.boss.hp=g.view.s.boss.maxHp*.4;g.survive(9);assert.ok(story.state.shown.has('half'),'misión '+m.n+': aviso de media vida');
  g.view.s.boss.hp=0;
  g.tick(.3);assert.ok(g.view.s.ending>=0);assert.equal(story.state.blocked,false,'la radio cierra la misión durante el final');
  g.tick(ending[m.n]+.3);
  for(const id of closing[m.n])assert.ok(story.state.shown.has(id),'misión '+m.n+': se llega a oír «'+id+'»');
  assert.equal(story.state.blocked,true,'sin radio en la victoria');
  if(m.n===8){
   // La misión 08 no pasa por el parte: el final se reproduce solo y deja paso al panel.
   assert.equal(story.state.finales.length,1,'el final arranca solo');assert.equal(results.shown.length,0);assert.equal(g.el('victory-screen').hidden,true,'el panel espera al final');
   const data=story.state.finales[0];assert.ok(data.store&&data.player&&data.stats.length>=3,'el final recibe los datos de la campaña');
   g.play();g.tick(.3);assert.equal(story.state.finales.length,1,'el final no se repite');
   story.close();assert.equal(g.el('victory-screen').hidden,false,'al terminar o saltar el final, el panel con los botones');assert.equal(results.shown.length,0);
   g.play();assert.equal(story.state.finales.length,1);assert.deepEqual([...story.state.missing],[]);continue;
  }
  assert.equal(story.state.outros,1,'misión '+m.n+': el epílogo se abre al terminar');assert.equal(results.shown.length,0,'el parte espera al epílogo');
  g.tick(.5);assert.equal(story.state.outros,1,'un solo epílogo');story.close();
  assert.equal(results.shown.length,1,'misión '+m.n+': un parte, después del epílogo');const card=results.shown[0];
  assert.equal(card.kicker,'MISIÓN 0'+m.n+' COMPLETADA');assert.equal(card.epilogue,m.story.config.epilogue);assert.ok(card.stats.length>=3&&card.stats.every(row=>row.length===2&&typeof row[1]==='string'));
  assert.equal(g.el('victory-screen').hidden,true,'el parte sustituye al panel antiguo');
  const x=g.view.p.x;g.key('ArrowRight');g.key('Escape');g.tick(.3);assert.equal(g.view.p.x,x,'el teclado del juego calla con el parte abierto');assert.equal(results.shown.length,1);
  assert.deepEqual([...story.state.missing],[],'misión '+m.n+': contexto completo también en el combate final');
  if(m.n===5)assert.deepEqual(Array.from(card.routes,r=>r.label),['Espacio · Misión 07','Especial · Distrito Quimera']);
  if(m.n===6)assert.equal(card.routes,undefined);
  results.open=false;card.next.run();assert.equal(g.navigation,next[m.n]);
 }
 const fork=fakeResults(),five=missions[0],fiveStory=fakeStory(five.story),g=await game(5,'?entry=resume',{[saveKey(five)]:JSON.stringify({hp:8,sea:{inside:true,checkpoint:3,started:true,complete:true,ending:true}})},{story:fiveStory,results:fork});
 g.play();fiveStory.close();fork.shown.at(-1).routes[0].run();assert.equal(g.navigation,'level-seven.html?entry=campaign');
});
