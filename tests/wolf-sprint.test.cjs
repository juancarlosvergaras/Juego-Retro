const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../physics'),A=require('../soldier-animation');
test('headbutt progresses once through six dedicated poses with a fixed scale in both directions',()=>{
 const fs=require('node:fs'),png=fs.readFileSync(require('node:path').join(__dirname,'../assets/sprites/lobo-cabezazo-v1.png'));
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
 for(const facing of [-1,1]){
  const frames=new Set();let previous=-1;
  for(let i=0;i<=36;i++){
   const p={form:'wolf',facing,ram:{remaining:.36-i*.01},sprinting:true,grounded:true,vx:facing*520};
   const pose=A.wolfRamPose(p);frames.add(pose.frame);assert.ok(pose.frame>=previous);previous=pose.frame;
   assert.equal(A.wolfSprintPose(p),null);
   const [x,y,w,h,,pivot]=A.wolfRamFrames[pose.row][pose.frame];
   assert.ok(x>=0&&y>=0&&x+w<=width&&y+h<=height);assert.ok(pivot>0&&pivot<w);
   assert.ok(h*A.wolfRamScale>=45&&h*A.wolfRamScale<=51);
  }
  assert.equal(frames.size,6);
 }
 assert.equal(A.wolfRamPose({form:'wolf'}),null);assert.equal(A.wolfRamPose({form:'soldier',ram:{remaining:.2}}),null);
});
test('wolf sprint cycles through eight poses only while Shift is held in either mission',()=>{
 const original={...P.WORLD};
 try{for(const world of [original,require('../level-two').WORLD])for(const direction of [-1,1]){
  Object.assign(P.WORLD,world);const p=Object.assign(P.createPlayer(),{form:'wolf',x:350,y:world.ground}),floor=[{x:0,y:world.ground,w:world.width,kind:'ground'}],frames=new Set();
  for(let i=0;i<95;i++){P.step(p,{run:true,left:direction<0,right:direction>0},1/120,floor);const pose=A.wolfSprintPose(p);if(pose)frames.add(pose.frame);}
  assert.equal(frames.size,8);assert.equal(p.facing,direction);
  P.step(p,{left:direction<0,right:direction>0},1/120,floor);assert.equal(A.wolfSprintPose(p),null);
  P.step(p,{run:true,right:true,jumpPressed:true},1/120,floor);assert.equal(A.wolfSprintPose(p),null);
 }}finally{Object.assign(P.WORLD,original);}
});
test('sprint poses are distance driven and never override actions or airborne poses',()=>{
 const p={form:'wolf',sprinting:true,grounded:true,vx:286,sprintCycle:.4};assert.equal(A.wolfSprintPose(p).frame,3);
 assert.deepEqual(A.wolfSprintPose({...p,anim:100}),A.wolfSprintPose({...p,anim:0}));
 for(const state of [{form:'soldier'},{grounded:false},{sprinting:false},{vx:0},{rope:{}},{ladder:{}},{claw:.2},{kick:.2},{landing:.2},{hurt:.2},{transform:1},{slide:.2}])assert.equal(A.wolfSprintPose({...p,...state}),null);
});

test('ordinary wolf walk uses eight dedicated distance-driven steps and yields to sprint and actions',()=>{
 for(const direction of [-1,1]){
  const p={form:'wolf',grounded:true,vx:direction*177,walkCycle:.01},frames=new Set();
  for(let i=0;i<8;i++){frames.add(A.wolfWalkPose(p).frame);A.advanceWalk(p,110/177/8);}
  assert.equal(frames.size,8);assert.equal(A.wolfSprintPose(p),null);
  const phase=p.walkCycle;A.advanceWalk({...p,vx:0},1);assert.equal(A.wolfWalkPose({...p,vx:0}),null);
  assert.deepEqual(A.wolfWalkPose({...p,anim:900}),A.wolfWalkPose({...p,anim:0}));
  for(const state of [{form:'soldier'},{grounded:false},{sprinting:true},{rope:{}},{ladder:{}},{claw:.2},{kick:.2},{landing:.2},{hurt:.2},{transform:1},{slide:.2}])assert.equal(A.wolfWalkPose({...p,...state}),null);
  assert.equal(A.wolfWalkPose(p,{crouching:true}),null);
  const faster={...p,vx:p.vx*2},normal={...p};A.advanceWalk(faster,.1);A.advanceWalk(normal,.2);assert.ok(Math.abs(faster.walkCycle-normal.walkCycle)<1e-9);assert.ok(normal.walkCycle>phase);
 }
});
