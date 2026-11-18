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
   A.advanceWalk(p,(Math.abs(vx)>170?82:52)/Math.abs(vx)/6);
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
