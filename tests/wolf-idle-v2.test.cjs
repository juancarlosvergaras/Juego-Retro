const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../physics'),S=require('../soldier-animation'),Audio=require('../sound-events');
const wolf=()=>Object.assign(P.createPlayer(),{form:'wolf',grounded:true,vx:0});
test('wolf rests before howling and hopping, without changing physics',()=>{
 const p=wolf(),y=p.y,vy=p.vy;P.updateIdle(p,{},5.9);assert.equal(S.wolfIdlePose(p).frame,0);
 P.updateIdle(p,{},1);assert.equal(S.wolfIdlePose(p).frame,3);assert.equal(p.idleHowl,1);
 P.updateIdle(p,{},6.45);const hop=S.wolfIdlePose(p);assert.equal(hop.row,1);assert.ok(hop.lift>5);assert.equal(p.y,y);assert.equal(p.vy,vy);assert.equal(p.grounded,true);
 P.updateIdle(p,{},1);assert.equal(S.wolfIdlePose(p).row,0);
 P.updateIdle(p,{},7);assert.equal(p.idleHowl,2);
});
test('movement, attacks, hurt, air and climbing immediately interrupt idle gestures',()=>{
 for(const input of [{left:true},{fire:true},{kick:true},{jumpPressed:true}]){const p=wolf();p.idleTime=6.9;P.updateIdle(p,input,.01);assert.equal(p.idleTime,0);assert.equal(S.wolfIdlePose(p).frame,0);}
 for(const state of [{hurt:.2},{grounded:false},{ladder:{}},{ram:{}},{wolfAttack:{}},{rope:{}}]){const p=Object.assign(wolf(),state,{idleTime:13.4});P.updateIdle(p,{},.01);assert.equal(p.idleTime,0);assert.equal(S.wolfIdlePose(p),null);}
});
test('howl audio is emitted once rather than on every animation frame',()=>{
 const events=[],audio=Audio.create({play:(name)=>events.push(name),loop(){}}),p=wolf(),e={hp:8};
 for(let i=0;i<10*120;i++){P.updateIdle(p,{},1/120);audio.update({player:p,encounter:e},1/120);}
 assert.equal(events.filter(n=>n==='whiteRoar').length,1);
});
test('new idle and kick crops stay separate, share ground baselines and retain body scale',()=>{
 for(const [row,frames] of S.wolfActionFrames.entries())for(const [i,f] of frames.entries()){
  const [x,y,w,h,,pivot]=f;assert.ok(x>=0&&y>=0&&x+w<=1536&&y+h<=1024);assert.ok(pivot>0&&pivot<w);
  assert.equal(y+h,[250,505,746,1002][row]);if(i<5)assert.ok(x+w<frames[i+1][0],'adjacent poses cannot leak into a crop');
 }
 for(const air of [false,true])for(const stage of [1,2,3]){const seen=new Set();for(let i=0;i<100;i++){const pose=S.wolfComboPose({form:'wolf',kickAir:air,wolfAttack:{kind:'kick',stage,age:i/100,duration:1}});assert.equal(pose.sheet,'actions');assert.equal(pose.row,air?3:2);assert.equal(pose.scale,.31);seen.add(pose.frame);}assert.equal(seen.size,6);const hit=S.wolfComboPose({form:'wolf',kickAir:air,wolfAttack:{kind:'kick',stage,age:.38,duration:1}});assert.equal(hit.frame,air?2:3);}
});
