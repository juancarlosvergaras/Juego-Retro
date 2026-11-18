const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../soldier-animation.js');
const p={vx:145,vy:0,grounded:true,anim:0,facing:1,aim:{x:1,y:0}};
test('walk cycle uses all six full-body frames and remains stable while distance is unchanged',()=>{assert.deepEqual(Array.from({length:6},(_,i)=>A.pose({...p,walkCycle:(i+.1)/6}).frame),[0,1,2,3,4,5]);assert.equal(A.pose({...p,walkCycle:.4,anim:100}).frame,A.pose({...p,walkCycle:.4,anim:0}).frame);assert.equal(A.pose({...p,vx:235}).row,2);});
test('falling hides weapons and upper directional poses use their dedicated rows',()=>{assert.equal(A.pose({...p,grounded:false,vy:250}).armed,false);assert.equal(A.pose({...p,grounded:false,vy:250}).row,4);assert.equal(A.pose({...p,vx:0,aim:{x:0,y:-1}}).row,6);assert.equal(A.pose({...p,vx:0,aim:{x:0,y:1}}).row,7);});
test('wolf launch, apex and descent use distinct airborne poses instead of the standing frame',()=>{
 const poses=[-510,-170,0,140,350,650].map(vy=>A.wolfAirPose({...p,vy,grounded:false}));
 assert.deepEqual(poses,[{row:2,frame:3},{row:2,frame:4},{row:2,frame:5},{row:3,frame:0},{row:3,frame:1},{row:3,frame:2}]);
 assert.ok(poses.every(pose=>pose.row!==3||pose.frame!==4));
});
test('wolf landing compresses and recovers only when grounded',()=>{
 assert.deepEqual([.24,.1,.03].map(landing=>A.wolfAirPose({...p,landing}).frame),[5,6,7]);
 assert.equal(A.wolfAirPose({...p,landing:0}),null);
 assert.deepEqual(A.wolfAirPose({...p,grounded:false,vy:350,landing:.2}),{row:3,frame:1});
});
