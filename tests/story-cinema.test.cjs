const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../story-cinema.js');
const read=file=>fs.readFileSync(file,'utf8');
const stories=[1,2,3,4,5,6,7,8].map(n=>require('../mission-'+['one','two','three','four','five','six','seven','eight'][n-1]+'-story.js'));
const names=['one','two','three','four','five','six','seven','eight'];

// ── Página de mentira: lo justo para montar la capa, dibujar y pulsar teclas ──
function fakeContext(log){
 const grad={addColorStop(){}};
 return new Proxy({},{get:(t,k)=>k in t?t[k]:k==='measureText'?()=>({width:10}):k==='drawImage'?(...a)=>{log&&log.push(a);}:()=>grad,set:(t,k,v)=>{t[k]=v;return true;}});
}
function fakeDocument(){
 const listeners={},draws=[];
 class El{
  constructor(tag){this.tagName=String(tag).toUpperCase();this.children=[];this.attrs={};this.style={};this.hidden=false;this.textContent='';this.className='';this.width=300;this.height=150;this.clientWidth=1280;this.clientHeight=720;this.offsetHeight=900;const set=new Set();this.classList={toggle:(n,on)=>{on?set.add(n):set.delete(n);},contains:n=>set.has(n)};}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
  focus(){doc.activeElement=this;}getContext(){return fakeContext(draws);}querySelector(){return new El('span');}
  find(test){for(const c of this.children){if(test(c))return c;const deep=c.find?.(test);if(deep)return deep;}return null;}
 }
 const doc={body:new El('body'),activeElement:null,createElement:t=>new El(t),listeners,draws,
  addEventListener:(n,f)=>{(listeners[n]||(listeners[n]=new Set())).add(f);},removeEventListener:(n,f)=>{listeners[n]?.delete(f);}};
 doc.key=(key,type='keydown',extra={})=>{for(const f of [...(listeners[type]||[])])f({type,key,code:key===' '?'Space':key,repeat:false,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...extra});};
 return doc;
}
// Un «window» aislado con reloj simulado y requestAnimationFrame manual.
function sandbox({music=true,pads=[],reduced=false}={}){
 const doc=fakeDocument(),frames=new Map();let now=1000,id=0;
 const calls=[],player=music?{state:{running:false,theme:'obra'},status(){return{...this.state};},setRunning(v){calls.push(['running',!!v]);this.state.running=!!v;},setTheme(v){calls.push(['theme',v]);this.state.theme=v;}}:null;
 const win={console,Math,Date,JSON,Promise,Set,Map,Object,Array,Number,String,Uint8Array,Uint16Array,document:doc,
  performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),
  matchMedia:q=>({matches:reduced&&/reduce/.test(q)}),navigator:{getGamepads:()=>pads},innerWidth:1280,innerHeight:720,devicePixelRatio:1,ArcadeMusic:{current:player}};
 win.window=win;win.globalThis=win;
 const run=file=>vm.runInNewContext(read(file),win,{filename:file});
 // Avanza el reloj en pasos de `ms`: cada paso entrega un cuadro, como un navegador lento.
 const step=(seconds,ms=1000/60)=>{const end=now+seconds*1000;while(now<end){now+=ms;const list=[...frames.values()];frames.clear();for(const f of list)f(now);}};
 return{win,doc,run,step,frames,calls,player,get now(){return now;}};
}
const shot=(id,dur=4)=>({id,dur,draw(){}});

test('los guiones se reparten en subtítulos breves y el rótulo sale del antetítulo',()=>{
 assert.deepEqual(C.captions('Uno. Dos.\n\nTres.'),['Uno. Dos.','Tres.']);
 const long='Primera frase con bastante texto para llenar. '.repeat(5).trim();
 for(const line of C.captions(long))assert.ok(line.length<=150,line);
 assert.deepEqual(C.titleFrom('MISIÓN 06 · EL ÚLTIMO CENTRO'),{kicker:'MISIÓN 06',title:'EL ÚLTIMO CENTRO'});
 assert.deepEqual(C.titleFrom('MISIÓN 08 · NUEVA YORK · LA ÚLTIMA BATALLA'),{kicker:'MISIÓN 08',title:'NUEVA YORK · LA ÚLTIMA BATALLA'});
 const a=shot('a'),b=shot('b'),cues=C.buildCues([{text:'Hola.'},{text:'Uno.\n\nDos.'},{text:''}],[a,b],{title:{kicker:'K',title:'T'}});
 assert.deepEqual(cues.map(c=>[c.shot.id,c.text,!!c.title]),[['a','Hola.',false],['b','Uno.',false],['b','Dos.',false],['b','',false],['b','',true]],'la última página reutiliza el último plano y el rótulo cierra');
 assert.deepEqual(C.buildCues([{text:'',title:{title:'X'},hold:5}],[a]).map(c=>[c.text,c.min]),[['',5]],'una página solo con rótulo no deja un plano vacío delante');
 // Las viñetas antiguas (c, w, h, t) siguen sirviendo: se encajan cubriendo el escenario.
 let got;const legacy=C.normalize((c,w,h,t)=>{got=[w,h,t];});legacy.draw({translate(){},scale(){}},2,{w:1100});assert.deepEqual(got,[960,540,2]);
});

test('el reloj avanza por tiempo real: igual a 60 cuadros por segundo que a uno y medio',()=>{
 const list=C.buildCues([{text:'Un subtítulo de prueba que se lee.'},{text:'Otro.'},{text:''}],[shot('a',3),shot('b',6),shot('c',5)]);
 const total=C.duration(list);assert.ok(total>13&&total<20,total);
 const trace=dt=>{const seen=[];let t=0,done=0;const tl=C.createTimeline(list,{onCue:(cue,i)=>seen.push([i,t]),onDone:()=>done++});tl.start();while(!done&&t<60){tl.update(dt);t+=dt;}return{seen,t,done};};
 const fast=trace(1/60),slow=trace(1/1.5);
 assert.equal(fast.done,1);assert.equal(slow.done,1);assert.deepEqual(fast.seen.map(s=>s[0]),[0,1,2]);assert.deepEqual(slow.seen.map(s=>s[0]),[0,1,2]);
 for(let i=0;i<3;i++)assert.ok(Math.abs(fast.seen[i][1]-slow.seen[i][1])<=.7,'mismo instante de cambio: '+i);
 assert.ok(Math.abs(fast.t-total)<.05&&Math.abs(slow.t-total)<.7,'dura lo previsto: '+fast.t+' / '+slow.t);
 // Un subtítulo se cambia cuando lleva un rato leído, nunca antes de terminar de escribirse.
 const one=C.createTimeline(C.buildCues([{text:'x'.repeat(96)}],[shot('a',1)]));one.start();one.update(1);assert.ok(one.typed()<96);assert.equal(one.state.index,0);
});

test('un toque completa el subtítulo y el siguiente pasa de plano; saltar llama una sola vez',()=>{
 let done=0;const tl=C.createTimeline(C.buildCues([{text:'Una frase larga que todavía se está escribiendo.'},{text:'Dos.'}],[shot('a'),shot('b')]),{onDone:()=>done++});
 tl.start();tl.update(.5);assert.equal(tl.advance(),'reveal');assert.equal(tl.typed(),tl.cue().text.length);assert.equal(tl.state.index,0);
 assert.equal(tl.advance(),'next');assert.equal(tl.state.index,1);
 tl.skip();tl.skip();tl.advance();tl.update(30);assert.equal(done,1);
 // Con movimiento reducido el texto sale entero y nada avanza solo.
 let still=0;const fixed=C.createTimeline(C.buildCues([{text:'Uno.'},{text:'Dos.'}],[shot('a'),shot('b')]),{still:true,onDone:()=>still++});
 fixed.start();assert.equal(fixed.typed(),4);fixed.update(120);assert.equal(fixed.state.index,0);assert.equal(still,0);fixed.advance();fixed.advance();assert.equal(still,1);
});

test('el escenario cubre la ventana sin deformarse en 4:3, 16:9, 21:9 y móvil',()=>{
 for(const [w,h] of [[1024,768],[1600,900],[1600,686],[1600,1200],[812,375],[375,812]]){
  const v=C.stage(w,h);assert.ok(v.w>=C.MIN_W&&v.w<=C.MAX_W,w+'×'+h+' ancho '+v.w);
  assert.ok(v.w*v.scale>=w-1e-6&&C.STAGE_H*v.scale>=h-1e-6,w+'×'+h+' cubre');assert.ok(v.ox<=0&&v.oy<=0,'centrado, recortando lo que sobra');
  if(w/h>=4/3-1e-9&&w/h<=22/9)assert.ok(Math.abs(v.w*v.scale-w)<1e-6,'sin recorte lateral entre 4:3 y 22:9');
 }
 assert.deepEqual(C.pixels(3840,2160,2),{width:1600,height:900},'tope de 1600 px de ancho');assert.deepEqual(C.pixels(800,600,2),{width:1600,height:1200});assert.deepEqual(C.pixels(1280,720,1),{width:1280,height:720});
});

test('la capa es un diálogo a pantalla completa: avanza sola, se salta con Esc y suelta su bucle',()=>{
 const box=sandbox();box.run('story-cinema.js');const player=box.win.ArcadeStoryCinema.create(box.doc),layer=player.layer;
 assert.equal(layer.attrs.role,'dialog');assert.equal(layer.attrs['aria-modal'],'true');assert.equal(layer.hidden,true);
 assert.ok(layer.find(n=>n.attrs?.['aria-live']==='polite'),'subtítulos con aria-live');
 const buttons=[];layer.find(n=>{if(n.tagName==='BUTTON')buttons.push(n);return false;});
 assert.deepEqual(buttons.map(b=>b.textContent||b.attrs['aria-label']),['Siguiente plano','Saltar'],'un único botón visible: Saltar');
 const cues=C.buildCues([{text:'Uno.'},{text:'Dos.'}],[shot('a',3),shot('b',3)],{title:{kicker:'MISIÓN 01',title:'LA OBRA'}});let done=0;
 assert.equal(player.play({cues,onDone:()=>done++}),true);assert.equal(layer.hidden,false);assert.equal(player.isOpen(),true);
 assert.deepEqual(box.calls,[['running',true]],'la música de la misión suena durante la historia');
 assert.equal(box.doc.activeElement?.className.includes('story-next'),true,'el foco entra en la capa');
 box.step(C.duration(cues)-.8,700);assert.equal(done,0,'no termina antes de tiempo');
 box.step(1.5,700);assert.equal(done,1,'termina sola a su hora, aun a 1,4 cuadros por segundo');assert.equal(layer.hidden,true);
 assert.deepEqual(box.calls.at(-1),['running',false],'la música vuelve a como estaba');assert.equal(box.frames.size,0,'no deja cuadros pedidos');
 assert.equal(box.doc.listeners.keydown.size,0,'ni teclas escuchando');
 // Escape salta; las teclas no llegan al juego mientras tanto.
 done=0;player.play({cues,onDone:()=>done++});box.step(.4);
 let reached=false;box.doc.key('ArrowRight','keydown',{stopPropagation(){reached=false;}});box.doc.key('Escape');box.doc.key('Escape');
 assert.equal(done,1);assert.equal(reached,false);box.step(1);assert.equal(box.frames.size,0);
 // Clic, Espacio y Enter pasan de plano.
 done=0;player.play({cues,onDone:()=>done++});box.step(.4);player.timeline().advance();const before=player.timeline().state.index;
 box.step(.3);box.doc.key(' ');assert.equal(player.timeline().state.index,before+1,'Espacio');box.step(.3);layer.find(n=>n.className?.includes('story-next')).onclick();box.step(.3);box.doc.key('Enter');
 assert.equal(player.timeline().cue().title?.title,'LA OBRA','el rótulo de la misión cierra la intro');assert.equal(done,0);
 box.step(.3);box.doc.key('Enter');assert.equal(done,1,'el último toque cierra');
});

test('el botón A del mando pasa de plano y Start salta',()=>{
 const pad={buttons:Array.from({length:16},()=>({pressed:false}))},box=sandbox({pads:[pad]});box.run('story-cinema.js');
 const player=box.win.ArcadeStoryCinema.create(box.doc),cues=C.buildCues([{text:'Uno.'},{text:'Dos.'},{text:'Tres.'}],[shot('a',9),shot('b',9),shot('c',9)]);let done=0;
 pad.buttons[0].pressed=true;player.play({cues,onDone:()=>done++});box.step(.5);assert.equal(player.timeline().state.index,0,'el botón que seguía pulsado al abrir no cuenta');
 pad.buttons[0].pressed=false;box.step(.1);pad.buttons[0].pressed=true;box.step(.1);assert.equal(player.timeline().state.index,1);
 pad.buttons[0].pressed=false;box.step(.3);pad.buttons[9].pressed=true;box.step(.1);assert.equal(done,1);
});

test('con movimiento reducido los planos quedan fijos y solo avanza el jugador',()=>{
 const box=sandbox({reduced:true});box.run('story-cinema.js');const player=box.win.ArcadeStoryCinema.create(box.doc);let done=0,times=[];
 const cues=C.buildCues([{text:'Uno.'},{text:'Dos.'}],[{id:'a',dur:4,still:2.5,draw:(c,t)=>times.push(t)},shot('b')]);
 player.play({cues,onDone:()=>done++});box.step(60,250);assert.equal(done,0);assert.equal(player.timeline().state.index,0);
 assert.ok(times.length>0&&times.every(t=>t===2.5),'siempre el mismo instante del plano');assert.ok(times.length<200,'repinta solo cuando hace falta');
 player.advance();box.step(.3);player.advance();assert.equal(done,1);
});

// Todas las escenas, montadas sobre la página de mentira con sus atlas reales.
function scenes(){
 const box=sandbox();
 for(const file of ['story-cinema.js','soldier-v2-atlas.js','action-atlas.js','white-death-atlas.js','helicopter-atlas.js','mission-one-scenes.js','mission-four-scenes.js','mission-late-scenes.js','mission-finale-scenes.js'])box.run(file);
 return box;
}
test('cada plano usa arte que existe y dibuja sin errores, con o sin imágenes, en cualquier ventana',()=>{
 const box=scenes(),S=box.win.ArcadeStoryScenes,sets=['one','two','three','four','five','six','seven','eight'];
 for(const file of ['mission-one-scenes.js','mission-four-scenes.js','mission-late-scenes.js','mission-finale-scenes.js'])for(const path of read(file).match(/assets\/[^'"]+/g))assert.ok(fs.existsSync(path),file+': '+path);
 for(const [set,files] of Object.entries(S.sources))for(const path of Object.values(files))assert.ok(fs.statSync(path).size>1000,set+': '+path);
 const draw=label=>{
  for(const set of sets)for(const kind of ['intro','outro','finale'])for(const s of S.sequence(set,kind)){
   assert.ok(s.id&&s.dur>=4&&s.dur<=20,set+'/'+kind+'/'+s.id+' dura '+s.dur);
   for(const w of [720,960,1320])for(const t of [0,.3,2.2,s.dur*.6,s.dur,s.dur+25])
    assert.doesNotThrow(()=>s.draw(fakeContext(),t,{w,h:540,cx:w/2,dur:s.dur,u:Math.min(1,t/s.dur),data:{campaign:{completed:[1,2,4,6,8],forms:{wolf:true,zombie:true,tank:true}}}}),label+': '+set+'/'+kind+'/'+s.id+' w='+w+' t='+t);
  }
 };
 draw('sin imágenes');
 for(const files of Object.values(S.sources))for(const id of Object.keys(files))S.images[id]={width:1536,height:1024};
 draw('con imágenes');
});

test('el epílogo del mausoleo usa la forma y las armas con las que volvió el jugador',()=>{
 const {win}=scenes(),S=win.ArcadeStoryScenes,shot=S.sequence('two','outro')[0],c=fakeContext(),drawn=[];
 S.images.soldier={width:1536,height:1024};
 win.ArcadeSoldierAnimation={drawGait(){},pose:()=>({armed:true}),gait:()=>null};
 win.ArcadeZombieForm={drawPlayer(ctx,p){drawn.push(p.form);}};
 win.ArcadeRobotForm={draw(ctx,p){drawn.push(p.form);}};
 win.ArcadeWeaponRenderer={draw(ctx,p,e){drawn.push([p.form,e.inventory.selected]);}};
 for(const form of ['soldier','zombie','tank','fighter','hero','robot']){
  shot.draw(c,1,{w:960,h:540,cx:480,dur:8,data:{form,inventory:{selected:5}}});
 }
 assert.deepEqual(drawn,[['soldier',5],'zombie','tank','fighter','hero','robot',['robot',5]]);
});

test('en el atrio y sus cámaras los paseantes recorren los dos ciclos de marcha y quien mira la vitrina queda plantado',()=>{
 const S=scenes().win.ArcadeStoryScenes;
 const walking=S.images.m6walk={width:1920,height:160},browsing=S.images.m6shoppers={width:640,height:480};
 const view={w:1320,h:540,cx:660,dur:8};
 for(const shot of S.sequence('six','intro').slice(0,2)){
  const frames=[new Set(),new Set()],idleX=new Set(),walkingX=new Set();
  const c=fakeContext();let x;
  c.translate=tx=>{x=tx;};
  c.drawImage=(img,sx,sy,w,h,dx,dy)=>{
   if(img!==walking&&img!==browsing)return;
   assert.deepEqual([w,h,dx,dy],[80,80,-40,-74]);
   if(img===walking){frames[sy/80].add(sx/80);walkingX.add(x);}
   else idleX.add(x);
  };
  for(let i=0;i<120;i++)shot.draw(c,i/60,view);
  assert.deepEqual(frames.map(f=>f.size),[24,24],shot.id);
  assert.equal(idleX.size,1,'mismo lugar con la cámara fija');
  assert.ok(walkingX.size>60,'las dos marchas avanzan por el pasillo');
 }
});

test('el pie de las llamas de La Obra sigue el mismo recorte que su tejado o losa',()=>{
 const {win}=scenes(),S=win.ArcadeStoryScenes;
 Object.assign(S.images,{city:{width:1536,height:1024},tower:{width:729,height:2158},fx:{width:400,height:800}});
 for(const [id,image,sites] of [
  ['ciudad',S.images.city,[[633,554],[865,653],[1187,604],[1328,654]]],
  ['obra',S.images.tower,[[152,1600],[485,1054],[222,707],[475,531]]]
 ]){
  const shot=S.sequence('one','intro').find(s=>s.id===id);
  for(const w of [720,960,1320])for(const t of [.25,3.45,7.2]){
   const c=fakeContext(),contacts=[];let projection,point;
   c.translate=(x,y)=>{point=[x,y];};
   c.drawImage=(img,sx,sy,sw,sh,dx,dy,dw,dh)=>{
    if(img===image)projection={sx,sy,k:dw/sw};
    if(img===S.images.fx&&sy===300)contacts.push([point[0],point[1]+dy+dh]);
   };
   shot.draw(c,t,{w,h:540,cx:w/2,dur:shot.dur});
   assert.equal(contacts.length,2*sites.length);
   sites.forEach(([x,y],i)=>{
    const px=(x-projection.sx)*projection.k,py=(y-projection.sy)*projection.k;
    for(const [cx,cy] of contacts.slice(2*i,2*i+2)){
     assert.ok(Math.abs(cy-py)<=1,id+' base');assert.ok(Math.abs(cx-px)<10*projection.k+1,id+' foco');
    }
   });
  }
 }
});

test('el protagonista de la cornisa y de la mordida usa los sprites y la transformación de la partida',()=>{
 const {win}=scenes(),S=win.ArcadeStoryScenes,draws=[];
 win.ArcadeSoldierAnimation={baseSprite(c,p,row,phase){draws.push([p.form,row,Math.floor((phase%1)*12)]);return true;}};
 win.ArcadeFormTransition={draw(c,p){draws.push([p.transformFrom,p.form]);return true;}};
 win.ArcadeStorySprites={draw(){assert.fail('El retrato alternativo sustituyó al soldado');}};
 const v={w:960,h:540,cx:480,dur:8},roof=S.sequence('one','intro')[1],bite=S.sequence('one','outro')[0];
 const salute=S.images.capSalute={width:1728,height:160},poses=new Set(),c=fakeContext();
 c.drawImage=(img,sx)=>{if(img===salute)poses.add(sx/144);};
 for(let i=0;i<8*60;i++)roof.draw(c,i/60,v);
 assert.equal(new Set(draws.filter(d=>d[0]==='soldier'&&d[1]===0).map(d=>d[2])).size,12);
 assert.equal(poses.size,12);
 poses.clear();draws.length=0;bite.draw(c,1,v);bite.draw(c,2,v);
 assert.deepEqual([...poses],[0]);assert.deepEqual(draws,[['soldier','wolf']]);
});

test('cada misión tiene una intro de 3 a 5 planos y un epílogo de 2 o 3, uno por subtítulo',()=>{
 const S=scenes().win.ArcadeStoryScenes;
 stories.forEach((story,i)=>{
  const n=i+1,config=story.config,intro=S.sequence(config.scenes,'intro');
  assert.equal(config.scenes,names[i]);assert.ok(intro.length>=3&&intro.length<=5,'misión '+n+': '+intro.length+' planos');
  assert.equal(story.briefing.length,intro.length,'misión '+n+': un subtítulo por plano');
  const cues=C.buildCues(story.briefing,intro,{title:C.titleFrom(config.eyebrow)});assert.ok(cues.at(-1).title.title.length>3,'termina con el rótulo de la misión');
  const seconds=C.duration(cues);assert.ok(seconds>=18&&seconds<=45,'misión '+n+': la intro dura '+seconds.toFixed(1)+' s');
  if(n<8){const outro=S.sequence(config.scenes,'outro');assert.ok(outro.length>=2&&outro.length<=3,'misión '+n+': epílogo de '+outro.length+' planos');assert.equal(config.outro.length,outro.length,'misión '+n+': un subtítulo por plano del epílogo');}
 });
 assert.equal(S.sequence('eight','outro').length,0,'la misión 08 cierra con el final, no con un epílogo');
 // Los cierres propios de los motores no se repiten: el epílogo de la 01 no vuelve a volar y el de la 03 no repite la extracción.
 assert.ok(!S.sequence('one','outro').some(s=>/regreso|vuelo/.test(s.id))&&!S.sequence('three','outro').some(s=>/chasis|extraccion/.test(s.id)));
});

test('los subtítulos narran: sin objetivos, sin consejos y sin describir enemigos ni ataques',()=>{
 const banned=/\b(dispara|disparo|salta|esquiva|cúbrete|apunta|busca|acércate|botiquín|torretas?|misiles?|ametralladora|láser|granadas?|minas|objetivos?|consejo|ráfagas?|pisotón|tentáculos|zombis?|tramo|planta|nivel|derrota|destruye)\b/i;
 stories.forEach((story,i)=>{
  const lines=[...story.briefing,...(story.config.outro||[])];
  for(const page of lines){assert.ok(!page.objectives&&!page.title,'misión '+(i+1)+': sin listas ni títulos de página');assert.ok(page.text.length<=150,'breve: '+page.text);assert.doesNotMatch(page.text,banned,'misión '+(i+1)+': '+page.text);assert.doesNotMatch(page.text,/\b(tu|tú|te)\b/i,'narración, no instrucciones: '+page.text);}
  const spoken=story.briefing.filter(p=>p.text);assert.ok(spoken.length>=2&&spoken.length<=4,'misión '+(i+1)+': de dos a cuatro líneas');
 });
 for(const file of ['mission-one-story.js','mission-two-story.js','mission-three-story.js','mission-four-story.js','mission-five-story.js','mission-six-story.js','mission-seven-story.js','mission-eight-story.js'])assert.doesNotMatch(read(file),/objectives:/,file);
 // La trama decidida se mantiene: contrato, mordida, Vega y el Consorcio.
 const all=stories.flatMap(s=>[...s.briefing,...(s.config.outro||[])].map(p=>p.text)).join('\n');
 for(const word of ['Cap Dollar','Vega','Capataz','lobo blanco','mordida','Consorcio','Comandante','rey','antena','Soberano'])assert.ok(all.includes(word),word);
});

test('mount conserva la API de los motores y llama una sola vez al callback',()=>{
 const box=scenes();box.run('mission-one-story.js');box.run('mission-two-story.js');
 const host=box.doc.createElement('div'),story=box.win.ArcadeMissionOneStory.mount(host);let begun=0,closed=0;
 for(const key of ['radio','epilogue','briefingOpen','briefing','outro','finale','reset','update','render'])assert.ok(key in story,key);
 assert.equal(story.briefingOpen(),false);story.briefing(()=>begun++);assert.equal(story.briefingOpen(),true);
 box.step(1);box.doc.key('Escape');box.doc.key('Escape');assert.equal(begun,1);assert.equal(story.briefingOpen(),false);
 story.outro(()=>closed++);assert.equal(story.briefingOpen(),true,'el epílogo usa la misma capa');box.step(40,500);assert.equal(closed,1,'el epílogo termina solo');
 let none=0;story.finale({},()=>none++);assert.equal(none,1,'sin final en la misión 01: el callback sigue en el acto');
 story.render(true);story.reset();story.update({},.1);
 // La misión 02 usa sus propios planos y su propio rótulo.
 const two=box.win.ArcadeMissionTwoStory.mount(host);two.briefing(()=>{});const player=two.player;assert.ok(player.timeline().cue().shot.id==='ruinas');box.doc.key('Escape');
 // Sin reproductor (página antigua o módulo que no cargó), la partida arranca igual.
 const bare=sandbox();bare.run('mission-one-story.js');const old=bare.win.ArcadeMissionOneStory.mount(bare.doc.createElement('div'));let direct=0;
 old.briefing(()=>direct++);old.outro(()=>direct++);assert.equal(direct,2);assert.equal(old.briefingOpen(),false);
 // Quimera monta la historia con sus viñetas antiguas (c, w, h, t).
 assert.match(read('quimera-story.js'),/ArcadeMissionOneStory\.mount\(host,\{briefing,beats,scenes:'quimera'/);assert.match(read('quimera-game.js'),/\.briefing-next'\)\.click\(\)/);
});

test('Manhattan enlaza con el delta en dos planos sin créditos ni transformaciones',()=>{
 const shots=scenes().win.ArcadeStoryScenes.sequence('eight','finale'),story=stories[7];
 assert.deepEqual([...shots.map(s=>s.id)],['esposas','senal']);
 const cues=C.buildCues(story.finaleScript({}),shots);
 assert.ok(C.duration(cues)<12);assert.ok(cues.every(c=>!c.credits));
 assert.match(cues.at(-1).text,/presa|muelle/);
});

test('los motores enganchan la historia sin tocar el juego: intro al empezar, epílogo antes del parte',()=>{
 for(const file of ['game.js','level-two-game.js','level-three-game.js','level-four-game.js','level-five-game.js','level-six-game.js','level-seven-game.js']){
  const source=read(file);assert.match(source,/story\.briefing\(/,file);
  assert.match(source,/debrief=\(\)=>ArcadeMissionResults\.show\(/,file+': el parte espera');assert.match(source,/if\(story\?\.outro\)story\.outro\(debrief(?:,\{[^\n;]*\})?\);else debrief\(\);/,file+': epílogo y después parte');
 }
 const eight=read('level-eight-game.js');assert.match(eight,/if\(story\?\.finale\)\{story\.finale\(\{store,player:p,stats:/);assert.doesNotMatch(eight,/Ver el final/,'el final ya no espera a un botón');
 for(const page of ['index.html','level-two.html','level-three.html','level-four.html','level-five.html','level-six.html','level-seven.html','level-eight.html','quimera.html']){
  const html=read(page);assert.ok(html.indexOf('<script src="story-cinema.js"></script>')>0&&html.indexOf('story-cinema.js')<html.indexOf('mission-one-story.js'),page);
 }
 const css=read('mission-one-polish.css');assert.match(css,/\n#briefing\{position:fixed;inset:0;z-index:500/,'la capa cubre la ventana, por encima del marco del juego');
 assert.match(css,/#briefing \.story-canvas\{[^}]*image-rendering:pixelated/);assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/briefing-objectives|briefing-card/,'sin tarjeta ni lista de objetivos');
});

test('los planos ilustrados conservan sus ocho poses y la obra conserva sus actores independientes',()=>{
  const box=sandbox(),loaded=[];
  box.win.Image=class{
    constructor(){this.complete=true;this.naturalWidth=2048;this.naturalHeight=432;}
    set src(value){this.path=value;loaded.push(value);}
  };
  box.run('story-cinema.js');box.run('story-illustrations.js');box.run('mission-one-scenes.js');
  box.run('mission-four-scenes.js');box.run('mission-late-scenes.js');box.run('mission-finale-scenes.js');
  const art=box.win.ArcadeStoryIllustrations,scenes=box.win.ArcadeStoryScenes;
  assert.equal(loaded.length,0);
  for(const set of names)for(const kind of ['intro',set==='eight'?'finale':'outro']){
    const base=scenes.sequence(set,kind),film=art.decorate(set,base),i=film.findIndex((s,j)=>s!==base[j]);
    if(['one','two','three'].includes(set)){assert.deepEqual(film,base);assert.equal(loaded.length,0);continue;}
    assert.ok(i>=0,set+' '+kind);assert.equal(film[i].id,base[i].id);
    const calls=[],ctx=fakeContext(calls),view={w:960,h:540};
    const start=film[i].id==='esposas'?1.65:0;
    for(let j=0;j<8;j++)film[i].draw(ctx,start+(j+.35)*2.5/8,view);
    const pose=calls.map(([img,x,y])=>[img.path,Math.floor(x/512)+Math.floor(y/216)*4]);
    assert.deepEqual(pose.map(row=>row[1]),[0,1,2,3,4,5,6,7]);
    assert.ok(pose.every(([path])=>path.includes('historia-'+set+'-')));
  }
  const [lever]=art.decorate('nine',[{id:'control',draw(){throw Error('postura antigua');}}]);
  const calls=[],ctx=fakeContext(calls);
  for(const t of [.1,2.55,2.85,5.2,8])lever.draw(ctx,t,{w:720,h:540});
  assert.ok(calls.slice(2).every(([img])=>img.path.includes('interlock')));
  calls.length=0;lever.draw(ctx,8,{w:720,h:540,still:true});
  assert.ok(calls[0][0].path.includes('nine-outro'));
});
test('el Centinela usa ocho poses y sus misiles salen de la hombrera como sprites independientes',()=>{
 const S=scenes().win.ArcadeStoryScenes,robot=S.images.mecha={width:1536,height:1024};
 const shot=S.sequence('three').find(s=>s.id==='centinela'),v={w:960,h:540,cx:480,dur:shot.dur};
 const poses=new Set(),missiles=[];
 for(let tick=0;tick<shot.dur*60;tick++){
   const calls=[];shot.draw(fakeContext(calls),tick/60,v);
   const body=calls.filter(([img,,,width])=>img===robot&&width===384);
   assert.equal(body.length,1);poses.add(body[0][1]+','+body[0][2]);
   const rocket=calls.find(([img,,,width])=>img===robot&&width===114);
   if(rocket)missiles.push(rocket[5]);
 }
 assert.equal(poses.size,8);assert.ok(missiles.length>60);
 assert.ok(missiles[0]-Math.min(...missiles)>400);
});
