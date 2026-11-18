(function(root){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const names=['knife','axe','pistol','shotgun','rifle','rocket','bow','crossbow','grenade','explosion','debris','whiteRoar','blackRoar','zombieRoar','wolfHurt','wolfDeath','claw','kick','scream','brake','door','pickup','heal','cryo','wave','drone','turret','orbital','shield','hurt','jump','land','step','grip','splash','plasma','bat'];
  function create(options={}){
    let context=options.context||null,master,gate,compressor,noiseBuffer,unlocked=!!context,running=true,muted=false,volume=.55;
    const voices=new Set(),loops=new Map(),limits=new Map();
    let storage=options.storage;
    if(storage===undefined)try{storage=root.localStorage;}catch{}
    try{const saved=JSON.parse(storage?.getItem('obra10-audio')||'null');if(saved){volume=clamp(Number(saved.volume)||0,0,1);muted=!!saved.muted;}}catch{}
    function save(){try{storage?.setItem('obra10-audio',JSON.stringify({volume,muted}));}catch{}}
    function setup(){
      if(master)return;
      master=context.createGain();gate=context.createGain();compressor=context.createDynamicsCompressor();
      compressor.threshold.value=-12;compressor.knee.value=14;compressor.ratio.value=12;compressor.attack.value=.003;compressor.release.value=.18;
      gate.connect(compressor);compressor.connect(master);master.connect(context.destination);master.gain.value=muted?0:volume;gate.gain.value=running?1:0;
      noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const data=noiseBuffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    function target(param,value,time=.02){param.cancelScheduledValues(context.currentTime);param.setTargetAtTime(value,context.currentTime,time);}
    async function unlock(){
      try{if(!context){const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return false;context=new Audio();}setup();if(context.state==='suspended')await context.resume();unlocked=context.state==='running';return unlocked;}catch{return false;}
    }
    function output(gain,pan){const g=context.createGain(),p=context.createStereoPanner();g.gain.value=gain;p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(gate);return{g,p};}
    function voice(out,{type='noise',freq=180,end=freq,cut=2000,q=.7,filter='lowpass',gain=.2,duration=.2,delay=0,attack=.003,vibrato=0,flutter=0}){
      const t=context.currentTime+delay,node=type==='noise'?context.createBufferSource():context.createOscillator(),f=context.createBiquadFilter(),env=context.createGain(),extra=[];
      if(type==='noise')node.buffer=noiseBuffer;else{node.type=type;node.frequency.setValueAtTime(freq,t);node.frequency.exponentialRampToValueAtTime(Math.max(15,end),t+duration);}
      f.type=filter;f.frequency.value=cut;f.Q.value=q;node.connect(f);f.connect(env);env.connect(out);
      env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+attack);env.gain.exponentialRampToValueAtTime(.0001,t+duration);
      if(vibrato&&type!=='noise'){const lfo=context.createOscillator(),depth=context.createGain();lfo.frequency.value=7;depth.gain.value=vibrato;lfo.connect(depth);depth.connect(node.frequency);lfo.start(t);lfo.stop(t+duration);extra.push(lfo,depth);}
      if(flutter){const lfo=context.createOscillator(),depth=context.createGain();lfo.frequency.value=flutter;depth.gain.setValueAtTime(gain*.22,t);depth.gain.exponentialRampToValueAtTime(.0001,t+duration);lfo.connect(depth);depth.connect(env.gain);lfo.start(t);lfo.stop(t+duration);extra.push(lfo,depth);}
      const entry={node,stop(){try{node.stop();}catch{}for(const n of extra)try{n.stop?.();}catch{}}};voices.add(entry);
      node.onended=()=>{voices.delete(entry);node.disconnect();f.disconnect();env.disconnect();for(const n of extra)n.disconnect();};
      node.start(t);node.stop(t+duration+.01);return duration+delay+.03;
    }
    function play(name,{gain=1,pan=0,variant=0}={}){
      if(!context||!unlocked||!running||muted||!volume||gain<.015||!names.includes(name))return false;
      setup();const now=context.currentTime,minGap=name==='debris'?.07:name==='step'?.065:.018;
      if(now-(limits.get(name)??-Infinity)<minGap||voices.size>96)return false;limits.set(name,now);
      const {g,p}=output(clamp(gain,0,1),pan);let length=0;
      const layer=o=>{length=Math.max(length,voice(g,o));};
      const tone=(freq,end,duration,gain=.2,type='sine',delay=0)=>layer({type,freq,end,duration,gain,delay,cut:4500});
      const noise=(duration,gain=.2,cut=2000,delay=0)=>layer({duration,gain,cut,delay});
      const boom=(size=1)=>{tone(110,27,.65*size,.65);noise(.7*size,.65,1400);noise(.09,.42,6000);};
      if(['pistol','rifle','shotgun'].includes(name)){
        const heavy=name==='shotgun',rapid=name==='rifle';tone(heavy?150:220,rapid?65:42,heavy?.22:.12,.36);noise(heavy?.34:.13,heavy?.6:.38,rapid?3500:4700);noise(.028,.35,8500);
        noise(.08,.07,2100,.12);tone(1700,750,.05,.025,'triangle',.09);
      }else if(name==='rocket'){noise(.65,.44,1750);tone(155,40,.5,.38);noise(.06,.32,5000);}
      else if(name==='explosion')boom(1.25);
      else if(name==='orbital'){tone(90,680,.44,.22,'sawtooth');tone(45,30,1.85,.5,'sine',.43);noise(1.7,.45,2800,.45);tone(960,170,1.5,.09,'triangle',.45);}
      else if(name==='knife'||name==='axe'||name==='claw'||name==='kick'){
        noise(name==='axe'?.3:.16,.22,name==='knife'?4800:2100);if(name==='kick')tone(95,40,.15,.3);
        if(name==='claw'){noise(.16,.16,3200,.045);noise(.15,.12,4000,.09);}
      }else if(name==='bow'||name==='crossbow'){tone(name==='bow'?280:450,90,.12,.2,'triangle');noise(.12,.12,3800);if(name==='crossbow')noise(.04,.2,1700);}
      else if(name==='grenade'){noise(.06,.1,6200);tone(1800,1100,.055,.1,'triangle');noise(.16,.08,1800,.1);}
      else if(name==='debris'){for(let i=0;i<4;i++){noise(.065,.13,1800+i*700,i*.04);tone(760+i*430,200,.04,.04,'triangle',i*.04);}}
      else if(['whiteRoar','blackRoar','zombieRoar','wolfHurt','wolfDeath'].includes(name)){
        const deep=name==='blackRoar'||name==='zombieRoar',death=name==='wolfDeath',short=name==='wolfHurt',freq=name==='zombieRoar'?42:deep?64:105,duration=short?.28:death?1.2:name==='zombieRoar'?1.7:1.35;
        layer({type:'sawtooth',freq,end:death?28:freq*.65,duration,gain:.25,cut:deep?550:1100,vibrato:8,flutter:24,attack:.06});
        layer({type:'triangle',freq:freq*1.51,end:freq*.8,duration,gain:.16,cut:1800,vibrato:11,attack:.05});noise(duration,.25,deep?500:1250);
      }else if(name==='scream'){
        const pitch=390+variant*85;
        layer({type:'sawtooth',freq:pitch,end:pitch*.72,duration:.7,gain:.19,filter:'bandpass',cut:1300+variant*170,q:1.1,vibrato:28,attack:.06});
        layer({type:'triangle',freq:pitch*1.02,end:pitch*.85,duration:.82,gain:.08,cut:2300,vibrato:21,attack:.07});noise(.3,.035,3000);
      }else if(name==='brake'){layer({duration:.42,gain:.22,filter:'bandpass',cut:2100,q:3});tone(820,340,.35,.06,'triangle');}
      else if(name==='door'){noise(.18,.16,1600);tone(130,55,.16,.2);noise(.055,.2,2700,.17);}
      else if(name==='pickup'||name==='heal'){for(let i=0;i<3;i++)tone([523,659,880][i],name==='heal'?1047:[523,659,880][i],.22,.11,'sine',i*.085);}
      else if(name==='cryo'){noise(.7,.2,6500);for(let i=0;i<4;i++)tone(1400+i*280,2600,.22,.065,'sine',i*.06);}
      else if(name==='plasma'){tone(620,95,.32,.18,'sawtooth');noise(.16,.09,850);}
      else if(name==='wave'){tone(360,32,.7,.4);noise(.5,.25,1100);}
      else if(name==='drone'){tone(210,650,.6,.11,'triangle');tone(840,1100,.12,.08,'sine',.2);}
      else if(name==='turret'){noise(.2,.15,2700);tone(170,70,.15,.13);tone(600,900,.2,.08,'square',.1);}
      else if(name==='shield'){tone(1600,280,.28,.16,'sine');noise(.17,.13,4600);}
      else if(name==='hurt'){tone(140,65,.18,.16,'triangle');noise(.12,.12,600);}
      else if(name==='jump'){noise(.13,.09,1800);tone(130,260,.11,.045,'triangle');}
      else if(name==='bat'){tone(1700,3100,.09,.075,'sine');tone(2800,900,.14,.06,'sine',.10);noise(.12,.035,2800);}
      else if(name==='splash'){noise(.22,.18,1600);tone(330,85,.16,.05,'sine');}
      else if(name==='land'){tone(90,35,.17,.18);noise(.16,.2,950);}
      else if(name==='step'||name==='grip'){noise(.065,.09,name==='step'?1100:1700);tone(105,55,.07,.07);}
      // Each effect owns its output bus; release it after its final layer ends.
      const timer=context.createBufferSource();timer.buffer=context.createBuffer(1,1,context.sampleRate);timer.connect(g);timer.onended=()=>{timer.disconnect();g.disconnect();p.disconnect();};timer.start(now+length);
      return true;
    }
    function stopLoop(name){const item=loops.get(name);if(!item)return;target(item.g.gain,0,.015);for(const n of item.nodes)try{n.stop?.(context.currentTime+.08);}catch{}item.osc.onended=()=>{for(const n of item.nodes)n.disconnect();item.g.disconnect();item.p.disconnect();};loops.delete(name);}
    function loop(name,gain=0,pan=0,speed=1){
      if(!context||!unlocked||!running||muted||!volume||gain<.01){stopLoop(name);return;}
      setup();let item=loops.get(name);
      if(!item){
        const {g,p}=output(0,pan),nodes=[],source=context.createBufferSource(),filter=context.createBiquadFilter(),bed=context.createGain();source.buffer=noiseBuffer;source.loop=true;filter.type='lowpass';filter.frequency.value={jeep:380,helicopter:650,jetpack:2600,flame:1700,beam:2000}[name]||900;bed.gain.value=.12;source.connect(filter);filter.connect(bed);bed.connect(g);source.start();nodes.push(source,filter,bed);
        const osc=context.createOscillator(),body=context.createGain(),pulse=context.createOscillator(),depth=context.createGain();osc.type=name==='jeep'?'sawtooth':'triangle';osc.frequency.value=name==='jeep'?47:name==='helicopter'?36:65;body.gain.value=name==='jeep'?.13:.08;pulse.frequency.value=name==='helicopter'?14:name==='jeep'?22:9;depth.gain.value=.055;pulse.connect(depth);depth.connect(body.gain);osc.connect(body);body.connect(g);osc.start();pulse.start();nodes.push(osc,body,pulse,depth);
        item={g,p,nodes,osc,pulse};loops.set(name,item);
      }
      target(item.g.gain,clamp(gain,0,1));target(item.p.pan,clamp(pan,-1,1));target(item.osc.frequency,(name==='jeep'?47:name==='helicopter'?36:65)*speed,.08);
    }
    function setRunning(value){if(running===value)return;running=value;if(gate)target(gate.gain,value?1:0,.01);if(!value){for(const name of [...loops.keys()])stopLoop(name);for(const v of voices)v.stop();}}
    function setVolume(value){volume=clamp(Number(value)||0,0,1);if(master)target(master.gain,muted?0:volume);save();}
    function setMuted(value){muted=!!value;if(master)target(master.gain,muted?0:volume);if(muted)for(const name of [...loops.keys()])stopLoop(name);save();}
    function status(){return{unlocked,muted,volume,running,voices:voices.size,loops:loops.size,supported:!!(context||root.AudioContext||root.webkitAudioContext)};}
    if(context)setup();
    return{unlock,play,loop,setRunning,setVolume,setMuted,status};
  }
  const api={create,names};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeAudio=api;
})(typeof window!=='undefined'?window:globalThis);

