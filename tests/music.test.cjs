const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../music.js'),A=require('../sound-effects.js');

// ── Stand-ins ────────────────────────────────────────────────────────────
function memory(initial={}){const data={...initial};return{data,getItem:key=>key in data?data[key]:null,setItem(key,value){data[key]=String(value);}};}
function fakeTimers(){
 let id=0;const intervals=new Map(),timeouts=new Map();
 return{intervals,timeouts,setInterval(fn){intervals.set(++id,fn);return id;},clearInterval(i){intervals.delete(i);},setTimeout(fn,ms){timeouts.set(++id,{fn,ms});return id;},clearTimeout(i){timeouts.delete(i);},
  tick(){for(const fn of [...intervals.values()])fn();},flush(){for(const [i,t] of [...timeouts]){timeouts.delete(i);t.fn();}}};
}
// A Web Audio graph that keeps time: sources end when their stop time passes,
// and every node remembers what it is connected to.
function fakeAudio(){
 let time=0;const nodes=[],sources=[];
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const node=kind=>{
  const n={kind,outs:new Set(),gain:param(),frequency:param(),Q:param(),delayTime:param(),pan:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),type:'',buffer:null,starts:0,startAt:null,stopAt:null,ended:false,
   connect(to){this.outs.add(to);return to;},disconnect(){this.outs.clear();},start(t=time){this.starts++;this.startAt=t;},stop(t=time){this.stopAt=t;},setPeriodicWave(wave){this.wave=wave;}};
  nodes.push(n);if(kind==='osc'||kind==='source')sources.push(n);return n;};
 return{sampleRate:8000,state:'running',destination:{kind:'destination',outs:new Set()},nodes,sources,get currentTime(){return time;},
  advance(dt){time+=dt;for(const s of sources)if(!s.ended&&s.stopAt!==null&&s.stopAt<=time){s.ended=true;s.onended?.call(s);}},
  connected(){return nodes.filter(n=>n.outs.size>0);},
  createGain:()=>node('gain'),createOscillator:()=>node('osc'),createBiquadFilter:()=>node('filter'),createBufferSource:()=>node('source'),createDelay:()=>node('delay'),createStereoPanner:()=>node('pan'),createDynamicsCompressor:()=>node('comp'),
  createPeriodicWave:()=>({periodic:true}),createBuffer:(channels,length)=>({getChannelData:()=>new Float32Array(length)}),resume:async()=>{}};
}
const reaches=(from,target,seen=new Set())=>from===target||(!seen.has(from)&&(seen.add(from),[...(from.outs||[])].some(next=>reaches(next,target,seen))));
function run(ctx,timers,seconds,dt=.025){for(let t=0;t<seconds-1e-9;t+=dt){ctx.advance(dt);timers.tick();}}
function rig(theme='obra',extra={}){const ctx=fakeAudio(),timers=fakeTimers(),storage=memory(),music=M.create({storage,timers,theme,document:null,...extra});return{ctx,timers,storage,music};}
// A DOM small enough to read: elements keep children, attributes and listeners.
function fakeDom(){
 const observers=[],roots=[];
 const element=tag=>({tagName:tag,id:'',className:'',children:[],parentNode:null,attributes:{},listeners:{},hidden:false,dataset:{},text:'',
  append(...items){for(const item of items){if(typeof item==='string'){this.text+=item;continue;}if(item.parentNode)item.parentNode.children.splice(item.parentNode.children.indexOf(item),1);item.parentNode=this;this.children.push(item);}},
  get lastElementChild(){return this.children[this.children.length-1]||null;},
  setAttribute(key,value){this.attributes[key]=String(value);},addEventListener(type,fn){(this.listeners[type]||(this.listeners[type]=[])).push(fn);},dispatch(type){for(const fn of this.listeners[type]||[])fn({target:this});}});
 const find=(node,id)=>node.id===id?node:node.children.reduce((hit,child)=>hit||find(child,id),null);
 const doc={hidden:false,listeners:{},createElement:element,getElementById:id=>roots.reduce((hit,root)=>hit||find(root,id),null),
  addEventListener(type,fn){(this.listeners[type]||(this.listeners[type]=[])).push(fn);},dispatch(type){for(const fn of this.listeners[type]||[])fn();}};
 class Observer{constructor(callback){this.callback=callback;observers.push(this);}observe(target,options){this.target=target;this.options=options;}}
 const add=(tag,id)=>{const el=element(tag);el.id=id;roots.push(el);return el;};
 return{doc,Observer,observers,add,element,fire:target=>{for(const o of observers)if(o.target===target)o.callback([]);}};
}
const pages=['index.html','level-two.html','level-three.html','level-four.html','level-five.html','level-six.html','level-seven.html','level-eight.html','level-nine.html','level-ten.html','quimera.html','fuga.html'];
const ids=['obra','umbral','aire','carretera','abismo','centro','vacio','nueva-york','quimera','fuga','marea','cenit'];
const melodic=seq=>seq.steps.flatMap(list=>(list||[]).filter(e=>e.midi!==null));
const percussion=seq=>seq.steps.flatMap(list=>(list||[]).filter(e=>e.midi===null));

// ── Pure part: notes, themes, bars ───────────────────────────────────────
test('note names convert to MIDI numbers and frequencies',()=>{
 assert.equal(M.noteToMidi('A4'),69);assert.equal(M.noteToMidi('C4'),60);assert.equal(M.noteToMidi('Bb2'),M.noteToMidi('A#2'));assert.equal(M.noteToMidi('H4'),null);assert.equal(M.noteToMidi('C'),null);
 assert.equal(M.midiToFrequency(69),440);assert.ok(Math.abs(M.noteToFrequency('C4')-261.63)<.01);assert.ok(Math.abs(M.noteToFrequency('E2')-82.41)<.01);assert.equal(M.noteToFrequency('nope'),null);
 assert.deepEqual(M.scaleNotes('D','minor'),[2,4,5,7,9,10,0]);assert.deepEqual(M.scaleNotes('G','major'),[7,9,11,0,2,4,6]);assert.deepEqual(M.scaleNotes('X','minor'),[]);
});
test('twelve themes exist, one per mission and special, each with a valid structure',()=>{
 assert.deepEqual(M.themes.map(t=>t.id),ids);
 for(let mission=1;mission<=10;mission++)assert.equal(M.themeFor(mission).mission,mission);
 assert.equal(M.themeFor('quimera').id,'quimera');assert.equal(M.themeFor('fuga').id,'fuga');assert.equal(M.themeFor(11),null);assert.equal(M.themeFor('nada'),null);
 for(const theme of M.themes){
  assert.deepEqual(M.validate(theme),[],theme.id);
  assert.ok(theme.tempo>=50&&theme.tempo<=200,theme.id+' tempo');assert.ok(theme.bars>=8&&theme.bars<=16,theme.id+' bars');assert.ok(theme.title&&theme.character,theme.id);
  for(const name of ['bass','lead'])assert.ok(theme.tracks[name],theme.id+' has a '+name);
  assert.ok(Object.keys(theme.tracks).length>=3,theme.id+' has an accompaniment');assert.ok(theme.drums.kick&&theme.drums.hat,theme.id+' has percussion');
 }
 assert.equal(new Set(M.themes.map(t=>t.key+' '+t.scale+' '+t.tempo)).size,12,'no two themes share key and tempo');
});
test('every note is audible and belongs to the declared scale, in both variations',()=>{
 for(const theme of M.themes){
  const scale=M.scaleNotes(theme.key,theme.scale);assert.ok(scale.length>=7,theme.id);
  for(const boss of [false,true]){
   const seq=M.compile(theme,boss),notes=melodic(seq);assert.ok(notes.length>40,theme.id);
   for(const e of notes){assert.ok(scale.includes(e.midi%12),theme.id+' '+e.inst.name+' midi '+e.midi+' at step '+e.step);assert.ok(e.frequency>=60&&e.frequency<=2100,theme.id+' '+e.frequency);assert.ok(Math.abs(e.frequency-M.midiToFrequency(e.midi))<1e-9);assert.ok(e.len>=1&&e.step+e.len<=seq.totalSteps,theme.id+' note fits the loop');}
  }
 }
});
test('the writing is sound by construction: tonic bass, resolved phrases, bounded levels',()=>{
 for(const theme of M.themes){
  const seq=M.compile(theme),scale=M.scaleNotes(theme.key,theme.scale),bass=melodic(seq).filter(e=>e.inst.name==='bass'),lead=melodic(seq).filter(e=>e.inst.name==='lead');
  assert.equal(bass[0].step,0,theme.id+' bass enters on the downbeat');assert.equal(bass[0].midi%12,scale[0],theme.id+' bass opens on the tonic');
  assert.ok(bass.every(e=>e.midi<60)&&lead.every(e=>e.midi>=55),theme.id+' bass sits below the melody');
  // Phrases end on the tonic triad or on the dominant that leads back into the loop.
  if(scale.length===7){const rest=[0,2,4,6,1].map(degree=>scale[degree]),last=lead[lead.length-1];assert.ok(rest.includes(last.midi%12),theme.id+' last melody note '+last.midi);}
  for(const inst of seq.instruments)assert.ok(inst.gain>0&&inst.gain<=.3,theme.id+' '+inst.name+' level');
  assert.ok(M.peak(M.compile(theme,true))<=1,theme.id+' mix ceiling');assert.ok(M.peak(seq)<M.peak(M.compile(theme,true)));
 }
 assert.ok(M.MIX<=.8&&M.DEFAULT_VOLUME>=.4&&M.DEFAULT_VOLUME<=.5);
});
test('each theme keeps the character of its mission',()=>{
 const by=id=>M.themeFor(id),tempos=M.themes.map(t=>t.tempo);
 assert.equal(by('carretera').tempo,Math.max(...tempos),'the chase is the fastest');assert.equal(by('abismo').tempo,Math.min(...tempos),'the abyss is the slowest');
 assert.ok(by('aire').tempo>=140&&by('aire').scale==='major');assert.equal(by('obra').scale,'minor');assert.equal(by('umbral').scale,'minor');assert.equal(by('vacio').scale,'octatonic');assert.equal(by('centro').scale,'minor');
 // Mission 6: infiltration at a medium-fast pace, snare on 2 and 4, a two-bar motif that returns.
 const mall=by('centro');assert.ok(mall.tempo>=110&&mall.tempo<=124&&mall.bars>=12&&mall.bars<=16);
 for(let bar=0;bar<mall.bars;bar++){const events=M.barEvents('centro',bar),bass=events.filter(e=>e.track==='bass');
  assert.deepEqual(events.filter(e=>e.track==='snare').map(e=>e.step).slice(0,2),[4,12],'snare on 2 and 4');
  assert.ok(bass.every(e=>e.midi>=M.noteToMidi('F2')),'bass audible on small speakers');
  const root=bass.find(e=>e.step===0).midi,third=bass.find(e=>e.step===8).midi;assert.equal(third,root,'firm pulse: the root on beats 1 and 3');}
 const motif=bar=>M.barEvents('centro',bar).filter(e=>e.track==='lead').map(e=>[e.step,e.len,e.midi]);
 for(const boss of [false,true]){const notes=melodic(M.compile('centro',boss));
  for(const a of notes)for(const b of notes){if(a.inst===b.inst||a.step>=b.step+b.len||b.step>=a.step+a.len)continue;const d=Math.abs(a.midi-b.midi)%12;assert.ok(d!==1&&d!==11,'no semitone clash between '+a.inst.name+' and '+b.inst.name+' at step '+Math.max(a.step,b.step));}}
 assert.deepEqual(motif(4),motif(0),'the question returns');assert.deepEqual(motif(8).map(e=>e[0]),motif(0).map(e=>e[0]),'and is developed in sequence');
 assert.ok(by('abismo').echo&&by('vacio').echo&&by('fuga').echo,'echo where the setting asks for it');
 // Mission 4: the bass runs in eighth notes, eight to the bar, all loop long.
 const road=M.compile('carretera');for(let bar=0;bar<road.bars;bar++){const bass=M.barEvents('carretera',bar).filter(e=>e.track==='bass');assert.deepEqual(bass.map(e=>e.step),[0,2,4,6,8,10,12,14]);assert.ok(bass.every(e=>e.len===2));}
 // Mission 8 restates the mission 1 motif note for note (an octave higher).
 const pitch=(id,bars)=>Array.from({length:bars},(_,bar)=>M.barEvents(id,bar).filter(e=>e.track==='lead').map(e=>[e.step,e.len,e.midi%12]));
 assert.deepEqual(pitch('nueva-york',8),pitch('obra',8));assert.ok(by('nueva-york').tempo>by('obra').tempo&&by('nueva-york').bars>by('obra').bars);
 assert.equal(M.barEvents('nueva-york',0).find(e=>e.track==='lead').midi,M.barEvents('obra',0).find(e=>e.track==='lead').midi+12);
});
test('a bar pattern is generated from its readable notation',()=>{
 const lead=M.barEvents('obra',0).filter(e=>e.track==='lead'); // 'D4 - F4 A4 - - G4 A4'
 assert.deepEqual(lead.map(e=>[e.step,e.len,e.midi]),[[0,4,62],[4,2,65],[6,6,69],[12,2,67],[14,2,69]]);
 const bar=M.barEvents('carretera',0),steps=bar.map(e=>e.step);assert.deepEqual(steps,[...steps].sort((a,b)=>a-b),'events come in step order');
 assert.deepEqual(bar.filter(e=>e.track==='kick').map(e=>e.step),[0,4,8,12]);assert.ok(bar.filter(e=>e.track==='kick').every(e=>e.midi===null&&e.len===1));
 assert.ok(Math.abs(bar.find(e=>e.track==='bass').frequency-82.41)<.01);assert.equal(bar.filter(e=>e.track==='arp').length,16,'sixteenth-note arpeggio');
 const stab=M.barEvents('centro',0,true).filter(e=>e.track==='capa');assert.deepEqual(stab.map(e=>e.step),[2,2,2,6,6,6,10,10,10,14,14,14],'chords sound together');
 assert.deepEqual(M.barEvents('obra',8),M.barEvents('obra',0),'the loop wraps');assert.deepEqual(M.barEvents('obra',-1),M.barEvents('obra',7));assert.deepEqual(M.barEvents('nada',0),[]);
 const hat=M.barEvents('quimera',0).filter(e=>e.track==='hat');assert.equal(hat[hat.length-1].level,1.3,'accents are louder');
 const broken={id:'rota',title:'Rota',tempo:100,bars:8,key:'C',scale:'major',tracks:{bass:{voice:'bass',bars:['C2 . C2']},lead:{voice:'lead',bars:['C4 F#4 . .']}},drums:{kick:['x...']},boss:{tempo:1.3,drums:{},layer:{voice:'arp',bars:['C4']}}};
 assert.throws(()=>M.compile(broken),/no reparte/);const problems=M.validate(broken);assert.ok(problems.length>=2&&problems.some(p=>/8–10/.test(p)));
 const sharp={...broken,id:'sostenida',tracks:{bass:{voice:'bass',bars:['C2 . C2 .']},lead:{voice:'lead',bars:['C4 F#4 . .']}}};assert.ok(M.validate(sharp).some(p=>/fuera de la escala/.test(p)));
});
test('the boss variation raises the tempo 8–10 %, thickens the drums and adds a layer',()=>{
 for(const theme of M.themes){
  const calm=M.compile(theme),boss=M.compile(theme,true),ratio=boss.tempo/calm.tempo;
  assert.ok(ratio>=1.08-1e-9&&ratio<=1.1+1e-9,theme.id+' tempo ratio '+ratio);assert.ok(boss.stepSeconds<calm.stepSeconds);assert.equal(boss.totalSteps,calm.totalSteps,theme.id+' same length, so it can switch mid-loop');
  assert.ok(percussion(boss).length>percussion(calm).length,theme.id+' more percussion');
  assert.ok(melodic(boss).some(e=>e.inst.name==='capa'),theme.id+' extra layer');assert.ok(!melodic(calm).some(e=>e.inst.name==='capa'),theme.id+' layer is boss only');
  assert.equal(M.compile(theme,true),boss,'compiled once and reused');
 }
});

// ── Pure part: scheduler ─────────────────────────────────────────────────
test('the scheduler emits every note exactly once, in order, at its exact time',()=>{
 const seq=M.compile('carretera'),transport=M.createTransport(),got=[],start=10.05,loop=seq.totalSteps*seq.stepSeconds;let now=10;
 transport.start(seq,start);
 while(now<start+loop*2+.5){transport.tick(now,(event,time,step)=>{assert.equal(step,seq.stepSeconds);got.push({event,time,now});});now+=M.INTERVAL_MS/1000;}
 for(let i=1;i<got.length;i++)assert.ok(got[i].time>=got[i-1].time,'in order');
 for(const g of got){const k=Math.round((g.time-start)/seq.stepSeconds);assert.ok(Math.abs(g.time-(start+k*seq.stepSeconds))<1e-6,'on the grid');assert.equal(k%seq.totalSteps,g.event.step);assert.ok(g.time>=g.now&&g.time<g.now+M.LOOKAHEAD+1e-9,'scheduled ahead of the clock, within the lookahead');}
 const first=got.filter(g=>g.time<start+loop-1e-6),two=got.filter(g=>g.time<start+loop*2-1e-6);
 assert.equal(first.length,seq.count);assert.equal(new Set(first.map(g=>g.event)).size,seq.count,'no note twice');assert.equal(two.length,seq.count*2,'the second pass repeats the loop');
 assert.equal(transport.state().skipped,0);
});
test('after a long clock jump the scheduler resynchronises instead of firing the backlog',()=>{
 const seq=M.compile('carretera'),transport=M.createTransport(),got=[];let now=0;
 transport.start(seq,.05);for(let i=0;i<40;i++){transport.tick(now,(event,time)=>got.push(time));now+=.025;}
 const before=got.length;now+=60; // a background tab, a breakpoint, a long pause
 const emitted=transport.tick(now,(event,time)=>got.push(time)),late=got.slice(before);
 assert.equal(emitted,late.length);assert.ok(late.every(time=>time>=now&&time<now+M.LOOKAHEAD),'nothing is scheduled in the past');
 const backlog=Math.round(60/(seq.totalSteps*seq.stepSeconds)*seq.count);assert.ok(emitted<=12&&emitted<backlog/50,'the '+backlog+' missed notes are dropped: '+emitted);
 assert.ok(transport.state().skipped>600);
 for(const time of late){const k=(time-.05)/seq.stepSeconds;assert.ok(Math.abs(k-Math.round(k))<1e-6,'still on the original grid');}
 const more=[];for(let i=0;i<40;i++){now+=.025;transport.tick(now,(event,time)=>more.push(time));}
 assert.ok(more.length>20&&more.every((time,i)=>i===0||time>=more[i-1]));
});
test('pausing keeps the place in the loop and the boss variation switches on a beat',()=>{
 const calm=M.compile('obra'),boss=M.compile('obra',true),transport=M.createTransport();let now=0;
 assert.equal(transport.tick(0,()=>{}),0,'silent until started');
 transport.start(calm,.05);for(let i=0;i<80;i++){transport.tick(now,()=>{});now+=.025;}
 const place=transport.state().step;assert.ok(place>8);transport.stop();assert.equal(transport.tick(now,()=>{}),0,'a stopped transport schedules nothing');
 now+=30;transport.start(calm,now+.05);assert.equal(transport.state().step,place,'resumes where it stopped');
 transport.use(boss);assert.equal(transport.state().sequence,calm,'not before the next beat');
 const steps=[];for(let i=0;i<40;i++){transport.tick(now,(event,time,step)=>steps.push(step));now+=.025;}
 assert.equal(transport.state().sequence,boss);assert.equal(steps[steps.length-1],boss.stepSeconds);assert.equal(transport.state().skipped,0);
 transport.start(M.compile('fuga'),now);assert.equal(transport.state().step,0,'another theme starts from the top');
});

// ── Volume ───────────────────────────────────────────────────────────────
test('music volume is saved and read under its own key, and survives bad storage',()=>{
 assert.equal(M.STORAGE_KEY,'cap-dollar.music.v1');assert.equal(M.readVolume(memory()),M.DEFAULT_VOLUME);assert.equal(M.readVolume(null),M.DEFAULT_VOLUME);
 assert.equal(M.readVolume(memory({[M.STORAGE_KEY]:'{"volume":0.8}'})),.8);assert.equal(M.readVolume(memory({[M.STORAGE_KEY]:'{"volume":0}'})),0,'zero is a real setting');
 assert.equal(M.readVolume(memory({[M.STORAGE_KEY]:'{"volume":7}'})),1);assert.equal(M.readVolume(memory({[M.STORAGE_KEY]:'not json'})),M.DEFAULT_VOLUME);assert.equal(M.readVolume(memory({[M.STORAGE_KEY]:'{"volume":"x"}'})),M.DEFAULT_VOLUME);
 assert.equal(M.readVolume({getItem(){throw new Error('blocked');}}),M.DEFAULT_VOLUME);assert.equal(M.writeVolume({setItem(){throw new Error('full');}},.5),false);assert.equal(M.writeVolume(null,.5),false);
 const {storage,music}=rig();assert.equal(music.status().volume,M.DEFAULT_VOLUME);
 music.setVolume(.8);assert.deepEqual(JSON.parse(storage.data[M.STORAGE_KEY]),{volume:.8});assert.equal(storage.data['obra10-audio'],undefined,'the effects settings are left alone');
 music.setVolume(3);assert.equal(music.status().volume,1);music.setVolume(.3);
 assert.equal(M.create({storage,timers:fakeTimers(),theme:'obra',document:null}).status().volume,.3,'the next page reads it back');
});
test('volume zero schedules no notes at all',()=>{
 const ctx=fakeAudio(),timers=fakeTimers(),storage=memory({[M.STORAGE_KEY]:'{"volume":0}'}),music=M.create({storage,timers,theme:'aire',document:null});
 music.attach(ctx);music.setRunning(true);run(ctx,timers,3);
 assert.equal(music.status().playing,false);assert.equal(ctx.nodes.length,0,'not even the bus is built');assert.equal(timers.intervals.size,0);
 music.setVolume(.5);assert.equal(music.status().playing,true);run(ctx,timers,2);const made=ctx.sources.length;assert.ok(made>30);
 music.setVolume(0);assert.equal(music.status().playing,false);run(ctx,timers,2);timers.flush();assert.equal(ctx.sources.length,made,'silence means no work');assert.equal(ctx.connected().length,0);
});

// ── Audio part ───────────────────────────────────────────────────────────
test('starting and stopping leaves no node connected',()=>{
 for(const id of ids){
  const {ctx,timers,music}=rig(id);
  music.attach(ctx);assert.equal(ctx.nodes.length,0,id+': nothing is built while the game is not running');assert.equal(music.status().attached,true);
  music.setBoss(true);music.setRunning(true);assert.equal(music.status().playing,true);assert.equal(timers.intervals.size,1);
  run(ctx,timers,6);
  assert.ok(ctx.sources.length>30,id+' plays');assert.ok(ctx.sources.every(s=>s.starts===1&&s.stopAt>s.startAt),id+': each source starts once and has an end');
  assert.ok(ctx.sources.filter(s=>s.ended).length>20);assert.ok(ctx.sources.filter(s=>s.ended).every(s=>s.outs.size===0),id+': finished notes are released');
  assert.ok(music.status().voices<=24,id+': few simultaneous voices ('+music.status().voices+')');
  assert.ok(ctx.sources.filter(s=>s.kind==='source').every(s=>s.buffer===ctx.sources.find(x=>x.kind==='source').buffer),id+': one shared noise buffer');
  music.setRunning(false);assert.equal(music.status().playing,false);assert.equal(timers.intervals.size,0,'the scheduler timer is cleared');assert.equal(timers.timeouts.size,1);
  const made=ctx.sources.length,stopBy=ctx.currentTime+M.FADE_OUT+.03;assert.ok(ctx.sources.filter(s=>!s.ended).every(s=>s.stopAt<=stopBy),id+': sounding notes end with the fade');
  run(ctx,timers,1);assert.equal(ctx.sources.length,made,'no notes after stopping');timers.flush();
  assert.equal(ctx.connected().length,0,id+': the whole graph is released');assert.equal(music.status().voices,0);
  music.setRunning(true);run(ctx,timers,1);music.setRunning(false);timers.flush(); // stop before the scheduled notes have ended
  assert.equal(ctx.connected().length,0,id+': released again');assert.equal(music.status().voices,0);assert.equal(timers.intervals.size,0);
 }
});
test('music fades in when it starts and out when it stops, and resumes mid-fade',()=>{
 const {ctx,timers,music}=rig('umbral');music.attach(ctx);music.setRunning(true);
 const fade=ctx.nodes[1],level=ctx.nodes[2];assert.equal(fade.gain.value,1,'fading towards full');assert.ok(Math.abs(level.gain.value-M.DEFAULT_VOLUME*M.MIX)<1e-9);assert.ok(level.outs.has(ctx.destination));
 assert.ok(M.FADE_IN>=1.2&&M.FADE_IN<=1.8&&M.FADE_OUT>=.4&&M.FADE_OUT<=.6);
 run(ctx,timers,2);music.setRunning(false);assert.equal(fade.gain.value,0);assert.equal([...timers.timeouts.values()][0].ms,(M.FADE_OUT+.1)*1000);
 run(ctx,timers,.2);const built=ctx.nodes.filter(n=>n.kind==='gain'&&n.outs.has(ctx.destination)).length;
 music.setRunning(true);assert.equal(timers.timeouts.size,0,'the pending teardown is cancelled');assert.equal(fade.gain.value,1);assert.equal(ctx.nodes.filter(n=>n.kind==='gain'&&n.outs.has(ctx.destination)).length,built,'the same bus is reused');
 music.setVolume(.9);assert.ok(Math.abs(level.gain.value-.9*M.MIX)<1e-9,'the slider acts on the live bus');
});
test('mute, hidden tabs and pause stop the music; the boss bar intensifies it',()=>{
 const {ctx,timers,music}=rig('quimera');music.attach(ctx);
 music.setMuted(true);music.setRunning(true);assert.equal(music.status().playing,false,'muted');music.setMuted(false);assert.equal(music.status().playing,true);
 music.setHidden(true);assert.equal(music.status().playing,false,'hidden tab');music.setHidden(false);assert.equal(music.status().playing,true);
 music.setRunning(false);assert.equal(music.status().playing,false,'paused');music.setRunning(1);assert.equal(music.status().running,true);
 const count=seconds=>{const before=ctx.sources.length;run(ctx,timers,seconds);return ctx.sources.length-before;};
 const calm=count(8);assert.equal(music.status().tempo,116);music.setBoss(true);assert.equal(music.status().boss,true);assert.ok(Math.abs(music.status().tempo-116*1.08)<1e-9);
 count(1);const boss=count(8);assert.ok(boss>calm*1.2,'more notes per second with the boss: '+calm+' → '+boss);
 music.setBoss(false);count(1);assert.ok(count(8)<boss);
 music.setTheme('fuga');assert.equal(music.status().theme,'fuga');assert.equal(music.status().playing,true);music.setTheme(null);assert.equal(music.status().playing,false);timers.flush();assert.equal(ctx.connected().length,0);
});
test('the slider preview plays for a moment while the game is paused',()=>{
 const {ctx,timers,music}=rig('centro');music.preview();assert.equal(music.status().playing,false,'nothing before the audio is unlocked');
 music.attach(ctx);assert.equal(music.status().playing,true,'the preview starts once the context arrives');
 music.preview();assert.equal(timers.timeouts.size,1,'one preview timer');timers.flush();assert.equal(music.status().playing,false,'and stops by itself');timers.flush();assert.equal(ctx.connected().length,0);
});

// ── Link with sound-effects.js ───────────────────────────────────────────
test('the effects engine starts, pauses and mutes the music without sharing its volume',()=>{
 const ctx=fakeAudio(),timers=fakeTimers(),storage=memory(),music=M.create({storage,timers,theme:'aire',document:null}),audio=A.create({context:ctx,storage,music});
 assert.equal(audio.music,music);assert.equal(music.status().attached,true);assert.equal(music.status().playing,false,'the menu is open: nobody has asked to run yet');
 audio.setRunning(true);assert.equal(music.status().playing,true,'the first Play starts it even though the effects were already running');
 run(ctx,timers,1);const compressor=ctx.nodes.find(n=>n.kind==='comp'),master=[...compressor.outs][0],notes=ctx.sources.filter(s=>!s.ended&&s.outs.size);
 assert.ok(notes.length>0);for(const note of notes){assert.ok(reaches(note,ctx.destination));assert.ok(!reaches(note,master),'music does not pass through the effects volume');}
 audio.setVolume(0);assert.equal(music.status().playing,true,'effects volume and music volume are independent');assert.equal(audio.play('pistol'),false);
 music.setVolume(0);audio.setVolume(.6);assert.equal(music.status().playing,false);assert.equal(audio.play('pistol'),true,'and the other way round');music.setVolume(.45);
 audio.setMuted(true);assert.equal(music.status().playing,false,'muting the game silences the music');audio.setMuted(false);assert.equal(music.status().playing,true);
 audio.setRunning(false);assert.equal(music.status().playing,false);audio.setRunning(false);audio.setRunning(true);assert.equal(music.status().playing,true);
 assert.deepEqual(Object.keys(JSON.parse(storage.data['obra10-audio'])).sort(),['muted','volume'],'the effects settings keep their shape');
});
test('a saved mute silences the music from the first frame, and the engine works without music',async()=>{
 const storage=memory({'obra10-audio':'{"volume":0.5,"muted":true}'}),ctx=fakeAudio(),timers=fakeTimers(),music=M.create({storage,timers,theme:'obra',document:null}),audio=A.create({context:ctx,storage,music});
 audio.setRunning(true);assert.equal(music.status().muted,true);assert.equal(music.status().playing,false);audio.setMuted(false);assert.equal(music.status().playing,true);
 const plain=A.create({context:fakeAudio(),storage:memory(),music:null});assert.equal(plain.music,null);plain.setRunning(false);plain.setRunning(true);plain.setMuted(false);assert.equal(plain.play('pistol'),true);
 assert.equal(globalThis.ArcadeMusic,undefined);assert.equal(A.create({context:fakeAudio(),storage:memory()}).music,null,'music.js not loaded: nothing breaks');
 // Unlock path: the context does not exist until the first gesture.
 const late=fakeAudio(),lateTimers=fakeTimers();late.state='suspended';late.resume=async()=>{late.state='running';};
 const lateMusic=M.create({storage:memory(),timers:lateTimers,theme:'fuga',document:null}),had=globalThis.AudioContext;
 globalThis.AudioContext=function(){return late;};
 try{const engine=A.create({storage:memory(),music:lateMusic});engine.unlock();engine.setRunning(true);assert.equal(lateMusic.status().playing,false,'still locked');await engine.unlock();assert.equal(lateMusic.status().attached,true);assert.equal(lateMusic.status().playing,true);}
 finally{if(had===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=had;}
});

// ── Page part ────────────────────────────────────────────────────────────
test('the page picks its theme from the mission or the page name',()=>{
 const menu=mission=>({getElementById:id=>id==='main-menu'?{dataset:{mission:String(mission)}}:null});
 for(let mission=1;mission<=10;mission++)assert.equal(M.detectTheme(menu(mission),{pathname:'/x.html'}).mission,mission);
 const bare={getElementById:()=>null};
 assert.equal(M.detectTheme(bare,{pathname:'/juego/quimera.html'}).id,'quimera');assert.equal(M.detectTheme(bare,{pathname:'/fuga.html'}).id,'fuga');assert.equal(M.detectTheme(bare,{pathname:'/otra.html'}),null);assert.equal(M.detectTheme(null,null),null);
 const ctx=fakeAudio(),timers=fakeTimers(),music=M.create({storage:memory(),timers,document:bare,MutationObserver:null,location:{pathname:'/tests/preview.html'}});music.attach(ctx);music.setRunning(true);assert.equal(music.status().theme,null);assert.equal(music.status().playing,false,'pages without a theme stay silent');assert.equal(timers.intervals.size,0);
});
test('the music slider joins the effects slider in the menu, labelled and saved',()=>{
 const dom=fakeDom(),menu=dom.add('section','main-menu'),host=dom.add('div','menu-sound'),bar=dom.add('div','boss-hud');menu.dataset.mission='5';bar.hidden=true;
 const storage=memory(),timers=fakeTimers(),music=M.create({storage,timers,document:dom.doc,MutationObserver:dom.Observer,location:{pathname:'/level-five.html'}});
 assert.equal(music.status().theme,'abismo');assert.equal(host.children.length,0,'it waits for the effects block, which the engines look up by class');
 const effects=dom.element('div');effects.className='sound-controls';host.append(effects);dom.fire(host);dom.fire(host);
 assert.equal(host.children.length,2);assert.equal(host.children[0],effects);const block=host.children[1],[label,input]=block.children,output=label.children[0];
 assert.equal(block.className,'sound-controls music-controls');assert.equal(label.tagName,'label');assert.equal(label.text,'Volumen de música ');assert.equal(label.htmlFor,'music-volume');assert.equal(output.tagName,'output');
 assert.deepEqual([input.id,input.type,input.min,input.max,input.step,input.attributes['aria-label']],['music-volume','range','0','100','5','Volumen de música']);
 assert.equal(input.value,'45');assert.equal(output.textContent,'45%');
 input.value='70';input.dispatch('input');assert.equal(music.status().volume,.7);assert.equal(output.textContent,'70%');assert.deepEqual(JSON.parse(storage.data[M.STORAGE_KEY]),{volume:.7});
 input.value='0';input.dispatch('input');assert.equal(music.status().volume,0);assert.equal(output.textContent,'Sin música');
 const other=dom.element('p');host.append(other);dom.fire(host);assert.equal(host.lastElementChild,block,'stays below the effects slider');assert.equal(host.children.length,3);
 assert.equal(M.create({storage,timers,document:dom.doc,MutationObserver:dom.Observer,location:{pathname:'/level-five.html'}}).slider,null,'never mounted twice');
});
test('the boss bar and the tab visibility are observed from the DOM',()=>{
 const dom=fakeDom(),bar=dom.add('div','boss-strip');bar.hidden=true;
 const ctx=fakeAudio(),timers=fakeTimers(),music=M.create({storage:memory(),timers,document:dom.doc,MutationObserver:dom.Observer,location:{pathname:'/quimera.html'}});
 assert.equal(music.status().theme,'quimera');assert.equal(music.slider,null,'no menu on this page: it just follows the saved volume');
 const observer=dom.observers.find(o=>o.target===bar);assert.deepEqual(observer.options,{attributes:true,attributeFilter:['hidden']});
 music.attach(ctx);music.setRunning(true);assert.equal(music.status().boss,false);
 bar.hidden=false;dom.fire(bar);assert.equal(music.status().boss,true);dom.fire(bar);assert.equal(music.status().boss,true);bar.hidden=true;dom.fire(bar);assert.equal(music.status().boss,false);
 dom.doc.hidden=true;dom.doc.dispatch('visibilitychange');assert.equal(music.status().playing,false);dom.doc.hidden=false;dom.doc.dispatch('visibilitychange');assert.equal(music.status().playing,true);
 const shown=fakeDom(),hud=shown.add('div','boss-hud');hud.hidden=false;
 assert.equal(M.create({storage:memory(),timers:fakeTimers(),document:shown.doc,MutationObserver:shown.Observer,theme:'obra'}).status().boss,true,'a boss already on screen counts');
});
test('the twelve pages load music.js right after sound-effects.js',()=>{
 for(const page of pages){const html=fs.readFileSync(page,'utf8');
  assert.ok(html.includes('<script src="sound-effects.js"></script><script src="music.js"></script>'),page);assert.equal(html.split('<script src="music.js">').length,2,page+' loads it once');}
 const source=fs.readFileSync('music.js','utf8');assert.ok(!/requestAnimationFrame|new Audio\(|\.(mp3|ogg|wav|m4a)\b|fetch\(|\bimport\b|\brequire\(/.test(source),'no audio files, no frame loop, no dependencies');
});

test('every mission has an in-key combat answer and a distinct cadence before the epilogue',()=>{
 for(const theme of M.themes){
  const quiet=M.compile(theme),combat=M.compile(theme,'combat'),boss=M.compile(theme,true),win=M.compile(theme,'victory');
  assert.ok(quiet.tempo<combat.tempo&&combat.tempo<boss.tempo,theme.id);
  assert.ok(combat.count>quiet.count&&combat.count<boss.count,theme.id);
  assert.ok(melodic(combat).some(n=>n.inst.name==='respuesta'));
  assert.ok(win.count<quiet.count&&win.loopStart===2*win.stepsPerBar);
  for(const seq of [combat,win]){
   assert.ok(M.peak(seq)<=1);
   assert.ok(melodic(seq).every(n=>M.scaleNotes(theme.key,theme.scale).includes(n.midi%12)),theme.id);
   assert.ok(melodic(seq).every(n=>n.frequency>=60&&n.frequency<=2100));
  }
 }
});

test('incoming fire raises the score, a lull lets it settle, and victory overrides a lingering boss bar',()=>{
 const dom=fakeDom(),bar=dom.add('div','boss-hud');bar.hidden=true;
 const {music}=rig('obra',{document:dom.doc,MutationObserver:dom.Observer}),p={x:100,y:465},field={enemies:[],bullets:[]};
 const tick=(seconds,opts={})=>{for(let i=0;i<Math.ceil(seconds*120);i++)music.follow(1/120,p,field,opts);return music.status().mode;};
 field.enemies=[{hp:4,x:110,y:15},{hp:0,x:102,y:462}];assert.equal(tick(.25),'explore');
 field.bullets=[{enemy:true,life:1,x:105,y:440}];assert.equal(tick(.25),'combat');
 field.bullets=[];assert.equal(tick(2),'combat');assert.equal(tick(1.3),'explore');
 assert.equal(tick(.02,{pressure:true}),'combat');assert.equal(tick(.02,{boss:true}),'boss');
 assert.equal(tick(.02,{boss:true,victory:true}),'victory');bar.hidden=false;dom.fire(bar);assert.equal(music.status().mode,'victory');
 assert.equal(tick(.02,{quiet:true}),'explore');
});

test('a mid-bar win starts its cadence on the beat and repeats only the epilogue',()=>{
 const theme='fuga',seq=M.compile(theme,'combat'),victory=M.compile(theme,'victory'),transport=M.createTransport(),notes=[];
 transport.start(seq,.05);for(let i=0;i<45;i++)transport.tick(i*.025,()=>{});
 transport.use(victory);
 for(let i=45;i<2400;i++)transport.tick(i*.025,(e,t,step)=>{if(step===victory.stepSeconds)notes.push(e);});
 assert.equal(notes[0].step,0);
 assert.equal(notes.filter(e=>e.step===0&&e.inst.name==='lead').length,1);
 assert.ok(notes.filter(e=>e.step===victory.loopStart&&e.inst.name==='bass').length>1);
});
