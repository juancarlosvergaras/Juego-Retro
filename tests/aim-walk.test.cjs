const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../soldier-animation.js');
test('feet cycle through six steps independently of horizontal or diagonal aim',()=>{
 for(const aim of [{x:1,y:0},{x:1,y:-1},{x:-1,y:1},{x:0,y:-1}]){
  const p={grounded:true,vx:145,aim,anim:0};const frames=new Set();
  for(let i=0;i<6;i++){p.walkCycle=(i+.1)/6;frames.add(A.gait(p).frame);assert.equal(A.gait(p).row,1);}
  assert.equal(frames.size,6);
 }
});
test('running uses running legs, and idle, air and traversal never step',()=>{
 const p={grounded:true,vx:230,walkCycle:.2};assert.equal(A.gait(p).row,2);
 for(const change of [{vx:0},{grounded:false},{ladder:{}},{rope:{}},{form:'wolf'}])assert.equal(A.gait({...p,...change}),null);
 assert.equal(A.gait(p,{sliding:true}),null);assert.equal(A.gait(p,{crouching:true}),null);
});
test('knife and axe attacks keep six moving leg poses and preserve their attack frames',()=>{
 const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},moveTo(){},lineTo(){},closePath(){}};
 for(const slot of [1,2])for(const vx of [145,-145,230,-230]){
  const p={x:100,y:100,grounded:true,vx,walkCycle:.01},frames=new Set();
  for(let i=0;i<6;i++){
   A.advanceWalk(p,(Math.abs(vx)>170?104:52)/Math.abs(vx)/6);
   const action={slot,age:i*.08,duration:.6},pose=A.pose(p,{}, {inventory:{selected:slot},weaponAction:action});
   assert.equal(pose.sheet,'melee');assert.equal(pose.frame,A.meleeFrame(action,slot));
   const result=A.drawGait(ctx,p,A.gait(p),frame=>frames.add(frame),bob=>{assert.ok(bob<=0&&bob>=-1.2);return 46;},pose);
   assert.equal(result,46);
  }
  assert.equal(frames.size,6);
 }
});
test('stationary and airborne melee render a single complete pose with no stepping',()=>{
 const ctx={save(){throw Error('unnecessary clipping');}};
 for(const p of [{grounded:true,vx:0},{grounded:false,vx:230}]){
  let torso=0;A.drawGait(ctx,p,A.gait(p),()=>assert.fail('idle legs'),bob=>{assert.equal(bob,0);torso++;});assert.equal(torso,1);
 }
 const airborne={grounded:false,vx:230,walkCycle:.2};A.advanceWalk(airborne,1);assert.equal(airborne.walkCycle,.2);
});

test('crouch walking cycles six low poses in both directions with every loadout and stops at rest',()=>{
 for(const facing of [-1,1])for(const slot of [1,2,3,7]){
  const p={grounded:true,vx:65*facing,facing,walkCycle:.01},seen=new Set(),mode={crouching:true},e={inventory:{selected:slot}};
  for(let i=0;i<6;i++){
   const pose=A.pose(p,mode,e);assert.equal(pose.sheet,'crouch');assert.equal(pose.armed,false);seen.add(pose.frame);
   assert.equal(A.gait(p,mode),null);A.advanceWalk(p,52/65/6);
  }
  assert.equal(seen.size,6);
  for(const phase of [.05,.22,.4,.56,.72,.9]){p.walkCycle=phase;p.vx=65*facing;const moving=A.pose(p,mode,e);p.vx=0;A.advanceWalk(p,2);assert.deepEqual(A.pose(p,mode,e),moving,'stopping preserves the same sprite, scale and anchors');assert.equal(p.walkCycle,phase);}
  assert.notEqual(A.pose({...p,grounded:false,vy:300},mode,e).sheet,'crouch');
  assert.notEqual(A.pose({...p,rope:{}},mode,e).sheet,'crouch');
 }
});
test('running draws the whole stride with a level helmet instead of walking legs',()=>{
 const armed={inventory:{selected:3}},p={x:100,y:100,grounded:true,vx:220,walkCycle:0,aim:{x:1,y:0}};
 const lifts=new Set();
 for(let i=0;i<6;i++){
  p.walkCycle=(i+.5)/6;const g=A.gait(p,{},armed);
  assert.equal(g.full,true);assert.equal(g.row,2);assert.equal(g.frame,i);assert.equal(g.bob,-A.RUN_LIFT[i]);lifts.add(g.bob);
  let legs=0,torso=null;A.drawGait({},p,g,()=>legs++,bob=>{torso=bob;return 46;});
  assert.equal(legs,0,'no separate walking legs');assert.equal(torso,g.bob);
 }
 assert.ok(lifts.size>3,'feet leave the ground during the flight phases');assert.ok(Math.max(...A.RUN_LIFT)<=3.5&&Math.min(...A.RUN_LIFT)===0);
 // Walking, melee torsos and aiming keep the composed legs.
 assert.equal(A.gait({...p,vx:140},{},armed).full,undefined);
 assert.equal(A.gait(p,{},{inventory:{selected:1}}).full,undefined);
 assert.equal(A.gait({...p,aim:{x:.7,y:-.7}},{},armed).full,undefined);
 assert.equal(A.gait(p,{}).full,undefined,'callers that pass no loadout keep the old behaviour');
});
test('the wolf carries weight: breathing, stride bob, lunge, landing squash and recoil',()=>{
 const wolf=o=>({form:'wolf',facing:1,grounded:true,vx:0,vy:0,anim:0,...o});
 assert.deepEqual(A.wolfMotion({form:'soldier'}),{lean:0,bob:0,stretch:1,dx:0});
 const breaths=new Set();for(let i=0;i<30;i++){const m=A.wolfMotion(wolf({anim:i*.2}));breaths.add(m.stretch.toFixed(3));assert.ok(Math.abs(m.stretch-1)<=.0141&&m.dx===0);}assert.ok(breaths.size>8);
 assert.ok(A.wolfMotion(wolf({vx:150,walkCycle:.25})).bob<-1);assert.ok(Math.abs(A.wolfMotion(wolf({vx:150,walkCycle:.5})).bob)<.01);
 const swing=A.wolfMotion(wolf({wolfAttack:{age:.16,duration:.32,stage:1,kind:'claw'}}));assert.ok(swing.dx>6&&swing.lean>.06,'leans into the blow');
 assert.ok(A.wolfMotion(wolf({facing:-1,wolfAttack:{age:.16,duration:.32,stage:1,kind:'claw'}})).dx< -6);
 assert.ok(A.wolfMotion(wolf({wolfAttack:{age:.02,duration:.32,stage:1,kind:'claw'}})).lean<0,'winds up first');
 assert.ok(A.wolfMotion(wolf({landing:.24})).stretch<.92);assert.ok(A.wolfMotion(wolf({hurt:.32})).lean< -.14);
 assert.ok(A.wolfMotion(wolf({grounded:false,vy:-500})).stretch>1.02);assert.ok(A.wolfMotion(wolf({grounded:false,vy:600})).lean>.09);
 // The transform always pivots on the paws and leaves the player untouched.
 const p=wolf({x:300,y:620,landing:.2}),before=JSON.stringify(p),calls=[];A.applyWolfMotion({translate:(x,y)=>calls.push(['t',x,y]),rotate:a=>calls.push(['r',a]),scale:(x,y)=>calls.push(['s',x,y])},p,{});
 assert.deepEqual(calls[0],['t',300,620]);assert.deepEqual(calls.at(-1),['t',-300,-620]);assert.equal(JSON.stringify(p),before);
});
