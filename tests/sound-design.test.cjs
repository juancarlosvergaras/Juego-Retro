const test=require('node:test'),assert=require('node:assert/strict'),A=require('../sound-effects.js'),S=require('../sound-events.js');
// A counting stand-in for the Web Audio graph: every node accepts the calls the
// engine makes, so each effect can be exercised end to end.
function fakeContext({convolver=true}={}){
 const made={source:0,osc:0};let time=0;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(v){this.value=v;}});
 const node=kind=>{made[kind]=(made[kind]||0)+1;return{kind,gain:param(),frequency:param(),Q:param(),pan:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){},disconnect(){},start(){},stop(){this.onended?.();},buffer:null,type:''};};
 const ctx={sampleRate:8000,state:'running',destination:{},get currentTime(){return time;},advance(dt){time+=dt;},made,
  createGain:()=>node('gain'),createOscillator:()=>node('osc'),createBiquadFilter:()=>node('filter'),createStereoPanner:()=>node('pan'),createDynamicsCompressor:()=>node('comp'),createBufferSource:()=>node('source'),
  createBuffer:(channels,length)=>({getChannelData:()=>new Float32Array(length)}),resume:async()=>{}};
 if(convolver)ctx.createConvolver=()=>node('convolver');
 return ctx;
}
const storage={getItem:()=>null,setItem(){}};
test('every named effect plays through the layered engine without errors',()=>{
 const ctx=fakeContext(),audio=A.create({context:ctx,storage});
 for(const name of A.names){ctx.advance(1);const before=ctx.made.source+ctx.made.osc;assert.equal(audio.play(name,{gain:.8,pan:.2,variant:1}),true,name);assert.ok(ctx.made.source+ctx.made.osc>before,name+' creates sound sources');}
 assert.ok(A.names.includes('thunder')&&A.names.includes('distant'));
 assert.equal(ctx.made.convolver,1,'one shared room reverb');
});
test('gunshots and blasts are built from several layers and vary between shots',()=>{
 const ctx=fakeContext(),audio=A.create({context:ctx,storage}),layers=name=>{ctx.advance(1);const before=ctx.made.source+ctx.made.osc;audio.play(name);return ctx.made.source+ctx.made.osc-before-1;};
 assert.ok(layers('pistol')>=5);assert.ok(layers('shotgun')>layers('pistol'),'the shotgun adds its pump');assert.ok(layers('explosion')>=10);
});
test('the engine still works where convolution is unavailable',()=>{
 const ctx=fakeContext({convolver:false}),audio=A.create({context:ctx,storage});
 for(const name of ['pistol','explosion','thunder']){ctx.advance(1);assert.equal(audio.play(name),true);}
 assert.equal(ctx.made.convolver,undefined);
});
test('weather loops and one-shots follow the scene',()=>{
 const calls=[],audio={play:(name,o)=>{calls.push(['play',name,o]);return true;},loop:(name,gain)=>calls.push(['loop',name,gain])};
 const events=S.create(audio),p={x:100,y:620,grounded:true,vx:0},e={hp:5,enemies:[],bullets:[],explosions:[]},bolt={x:300,age:0};
 events.update({player:p,encounter:e,weather:{wind:.5,rain:1,bolt}},.01);
 assert.ok(calls.some(c=>c[0]==='loop'&&c[1]==='wind'&&c[2]>0));assert.ok(calls.some(c=>c[0]==='loop'&&c[1]==='rain'&&c[2]>0));
 assert.equal(calls.filter(c=>c[1]==='thunder').length,1);
 events.update({player:p,encounter:e,weather:{wind:.5,rain:1,bolt}},.01);assert.equal(calls.filter(c=>c[1]==='thunder').length,1,'one clap per bolt');
 calls.length=0;for(let i=0;i<2000;i++)events.update({player:p,encounter:e,weather:{distant:true}},.01);
 const far=calls.filter(c=>c[1]==='distant').length;assert.ok(far>=1&&far<=4,'artillery every few seconds: '+far);
 calls.length=0;events.update({player:p,encounter:e},.01);assert.ok(!calls.some(c=>c[1]==='wind'||c[1]==='rain'),'missions without weather are untouched');
});
