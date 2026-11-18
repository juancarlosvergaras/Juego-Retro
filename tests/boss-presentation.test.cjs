const test=require('node:test'),assert=require('node:assert/strict'),B=require('../boss-presentation.js'),F=require('../power-fx.js');
const run=(line,seconds,dt=1/60)=>{let simulated=0;for(let i=0;i<Math.round(seconds/dt);i++)simulated+=line.tick(dt)*dt;return simulated;};
test('a boss entrance freezes the action briefly, then gives control back',()=>{
 const line=B.timeline();assert.ok(Math.abs(run(line,1)-1)<1e-9,'no cue: time runs normally');
 const cue=line.cue('intro','EL CAPATAZ','Lobo Blanco');assert.equal(cue.title,'EL CAPATAZ');
 assert.equal(line.tick(1/60),0);assert.ok(line.state.shake>0);
 const simulated=run(line,3);assert.ok(simulated>3-B.CUES.intro.freeze-.05&&simulated<3,'only the freeze is lost: '+simulated);
 assert.equal(line.state.cue,null);assert.equal(line.tick(1/60),1);
});
test('phase changes and defeats play in slow motion with a flash that fades out',()=>{
 for(const kind of ['phase','defeat']){
  const line=B.timeline();line.cue(kind,'X');run(line,B.CUES[kind].freeze+.02);
  const factor=line.tick(1/60);assert.ok(factor>0&&factor<.5,kind+' slow motion: '+factor);assert.ok(line.flashAlpha()>0&&line.flashAlpha()<=.85);
  run(line,3);assert.equal(line.tick(1/60),1);assert.equal(line.flashAlpha(),0);
 }
});
test('a second cue waits for the first banner instead of replacing it',()=>{
 const line=B.timeline();line.cue('defeat','TANQUE DESTRUIDO');assert.equal(line.cue('intro','HERALDO'),null);
 assert.equal(line.state.cue.title,'TANQUE DESTRUIDO');run(line,B.CUES.defeat.banner+.05);
 assert.equal(line.state.cue.title,'HERALDO');run(line,4);assert.equal(line.state.cue,null);
 line.cue('intro','A');line.cue('phase','B');line.reset();assert.equal(line.state.cue,null);assert.equal(line.state.queue.length,0);assert.equal(line.tick(1/60),1);
 assert.equal(line.cue('nope','X'),null);
});
test('powers light the scene with bounded, finite sources',()=>{
 assert.deepEqual(F.lights(null),[]);
 const p={x:100,y:620,facing:1,shield:3},s={age:1,effects:[{kind:'wave',x:100,y:590,r:130,life:.25,duration:.5},{kind:'alien',x:100,y:590,tx:300,ty:580,r:65,life:.5,duration:.75}],beams:[{x:200,y:620,age:1},{x:200,y:620,age:.1}],drones:[{x:150,y:500}],turrets:[{x:120,y:594,flash:.1,angle:0}],flame:.1,shieldFlash:0};
 const lights=F.lights(s,p);assert.equal(lights.length,7);
 for(const l of lights){assert.ok([l.x,l.y,l.r,l.a].every(Number.isFinite)&&l.r>0&&l.a>=0&&l.a<=1,JSON.stringify(l));assert.match(l.glow,/^\d+,\d+,\d+$/);}
 assert.ok(lights.some(l=>l.x===300),'the alien pulse lights its target');assert.equal(lights.filter(l=>l.r>400).length,1,'only the firing beam floods the screen');
});
test('power effects are drawn as hard pixels and leave the context balanced',()=>{
 let depth=0;const rects=[],c={save(){depth++;},restore(){depth--;},fillRect(x,y,w,h){rects.push([x,y,w,h]);},imageSmoothingEnabled:true,fillStyle:''};
 const p={x:100,y:620,facing:1,shield:2,form:'soldier'},e={enemies:[{x:200,y:620,hp:3,frozen:1}]};
 F.draw(c,{age:2,cooldowns:{},effects:['wave','cryo','heal','alien','orbital'].map(kind=>({kind,x:100,y:590,tx:260,ty:580,r:120,life:.3,duration:.6})),beams:[{x:300,y:620,age:.2},{x:300,y:620,age:1.2}],drones:[{x:150,y:500,target:{x:200,y:620,hp:3}}],turrets:[{x:120,y:594,flash:.1,angle:.3,age:.2,life:2}],flame:.1,shieldFlash:.2},p,e);
 assert.equal(depth,0);assert.ok(rects.length>150,'plenty of marks: '+rects.length);assert.equal(c.imageSmoothingEnabled,false);
 assert.ok(rects.every(r=>r.every(Number.isInteger)),'every mark sits on whole pixels');
 assert.equal(c.globalCompositeOperation,undefined,'no additive blending or gradients');
});
test('every power launches from the player the moment its recharge starts',()=>{
 const p={x:300,y:620,facing:-1,form:'soldier'},s={age:5,cooldowns:{},effects:[],beams:[],drones:[],turrets:[]};
 assert.equal(F.launches(s,p).length,0);
 s.cooldowns.drone=12;const [launch]=F.launches(s,p);assert.equal(launch.id,'drone');assert.equal(launch.x,300);assert.equal(launch.facing,-1);
 s.cooldowns.drone=11.5;s.age=5.2;assert.equal(F.launches(s,p).length,1,'a draining recharge is not a new launch');
 s.cooldowns.flame=.12;assert.equal(F.launches(s,p).length,1,'the flamethrower has no launch');
 s.age=5+F.LAUNCH+.5;assert.equal(F.launches(s,p).length,0,'launches expire');
 for(const id of ['drone','turret','wave','cryo','heal','orbital','alien']){const rects=[],c={save(){},restore(){},fillRect(...r){rects.push(r);}},state={age:1,cooldowns:{},effects:[],beams:[],drones:[],turrets:[]};F.launches(state,p);state.cooldowns[id]=9;for(const age of [1.02,1.2,1.4]){state.age=age;F.draw(c,state,p,null);}assert.ok(rects.length>6,id+' draws its launch: '+rects.length);}
});
