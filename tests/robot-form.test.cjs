const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../robot-form.js'),A=require('../arsenal.js'),S=require('../mission-three-story.js'),Story=require('../mission-one-story.js');
const robot=o=>({form:'robot',x:500,y:620,facing:1,grounded:true,vx:0,vy:0,anim:0,walkCycle:0,...o});
test('the robot picks one drawing per situation and its fists follow it',()=>{
 assert.equal(R.pose(robot()).name,'stand');assert.equal(R.pose(robot({vx:150})).name,'walk');
 assert.equal(R.pose(robot({crouching:true})).name,'crouch');assert.equal(R.pose(robot({grounded:false,vy:-200})).name,'rise');assert.equal(R.pose(robot({grounded:false,vy:200})).name,'fall');
 const cols=new Set();for(let i=0;i<6;i++){const q=R.pose(robot({vx:150,walkCycle:(i+.5)/6}));assert.equal(q.row,0);cols.add(q.col);}assert.equal(cols.size,6,'steps follow the distance walked');
 assert.equal(R.pose(robot({vx:150,walkCycle:3.5})).col,3);
 for(const p of [robot(),robot({vx:150}),robot({crouching:true}),robot({crouching:true,vx:60}),robot({grounded:false,vy:-200}),robot({grounded:false,vy:200})]){
  const hands=R.hands(p);assert.equal(hands.length,2);
  for(const h of hands){assert.ok(h.x>4&&h.x<26,'fist ahead of the body: '+h.x);assert.ok(h.y<-14&&h.y>-48,'fist between waist and shoulder: '+h.y);}
  assert.ok(hands[0].y<hands[1].y,'the main weapon sits in the upper fist');
  const eye=R.eye(p);assert.ok(eye.y<hands[0].y,'the optic is above the fists');
 }
});
test('every row of the sheet shares one floor line',()=>{
 assert.deepEqual(R.FLOORS,[224,231,224,229]);assert.ok(Math.abs(R.SCALE*217-54)<1e-9,'the robot stands 54 px tall');
});
test('shots leave from the gun in each fist and both arms differ',()=>{
 for(const p of [robot({aim:{x:1,y:0}}),robot({facing:-1,aim:{x:-1,y:0}}),robot({vx:150,aim:{x:1,y:0}}),robot({aim:{x:0,y:-1}})]){
  const hands=R.hands(p),upper=A.robotMuzzle(p,0),lower=A.robotMuzzle(p,1);
  assert.ok(Math.abs(upper.x-(p.x+p.facing*hands[0].x+p.aim.x*13))<1e-9);assert.ok(Math.abs(upper.y-(p.y+hands[0].y+p.aim.y*13))<1e-9);
  assert.ok(upper.y<lower.y);assert.ok(Math.hypot(upper.x-lower.x,upper.y-lower.y)>5);
  if(p.aim.x)assert.ok((upper.x-p.x)*p.facing>10,'the muzzle is in front of the body');
 }
 const riding=A.robotMuzzle(robot({onMotorcycle:true,aim:{x:1,y:0}}),0);assert.ok(Number.isFinite(riding.x)&&riding.y<600,'vehicles keep their own mount');
});
test('the robot breathes, bobs, squashes on landing and kicks when it fires',()=>{
 const breaths=new Set();for(let i=0;i<20;i++)breaths.add(R.motion(robot({anim:i*.3})).stretch.toFixed(3));assert.ok(breaths.size>6);
 assert.ok(R.motion(robot({vx:150,walkCycle:.25})).bob<-1);assert.ok(R.motion(robot({landing:.24})).stretch<.93);
 assert.equal(R.motion(robot(),{weaponAction:{age:.5}}).kick,0);assert.ok(R.motion(robot(),{weaponAction:{age:.01}}).kick>.8);
 const lights=R.lights(robot(),{flash:.1});assert.equal(lights.length,1);assert.ok(lights[0].r>60);assert.deepEqual(R.lights({form:'soldier'}),[]);
});
test('mission three has a three-page briefing and a radio that follows the assault',()=>{
 assert.ok(S.briefing.length>=3&&S.briefing.length<=5);for(const page of S.briefing)assert.ok(!page.objectives&&page.text.length<=150);
 assert.equal(new Set(S.beats.map(b=>b.id)).size,S.beats.length);for(const b of S.beats)assert.ok(b.who&&b.text.length>20&&b.text.length<150,b.id);
 const radio=Story.createRadio(S.beats,S.config.ambient,S.config.series),base={landed:false,x:160,hp:8,enemyAlert:false,jetSeen:false,mechaActive:false,mechaHalf:false,mechaDown:false};
 radio.reset();const seen=[];const run=(c,seconds)=>{for(let i=0;i<seconds*60;i++){const cur=radio.update(c,1/60);if(cur&&seen.at(-1)!==cur.id)seen.push(cur.id);}};
 run(base,1);run({...base,landed:true},9);run({...base,landed:true,x:3700},.1);run({...base,landed:true,x:6000},.1);run({...base,landed:true,x:6300,mechaActive:true},9);run({...base,landed:true,x:6300,mechaDown:true},20);
 assert.deepEqual(seen,['start','mid','mecha','robot','exit'],'the bow warning still queued is dropped once the boss appears');
});
test('the Sentinel wreck keeps burning: flames, smoke and light change every moment',()=>{
 const M=require('../air-mecha.js'),n=M.create({},1);
 const frame=()=>{const rects=[],c={fillRect(...r){rects.push(r.join(','));},fillStyle:'',globalAlpha:1};M.wreckage(c,n);return rects;};
 assert.equal(frame().length,0,'nothing burns while it stands');assert.deepEqual(M.lights(n),[]);
 n.hp=0;n.deathAge=1.2;n.anim=10;const falling=frame();assert.ok(falling.length>40,'detonations during the collapse');
 n.deathAge=4;n.anim=20;const a=frame();n.anim=20.1;const b=frame();n.anim=20.5;const d=frame();
 assert.ok(a.length>80);assert.notDeepEqual(a,b);assert.notDeepEqual(b,d,'the fire never freezes');
 assert.ok(a.every(r=>r.split(',').every(v=>Number.isInteger(Number(v)))),'hard pixels only');
 const lights=M.lights(n);assert.equal(lights.length,3);for(const l of lights)assert.ok(l.r>0&&l.a>0&&l.a<=1);
 n.facing=1;const mirrored=M.lights(n);n.facing=-1;assert.notEqual(mirrored[0].x,M.lights(n)[0].x,'effects follow the way the hull fell');
});
