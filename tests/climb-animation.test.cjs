const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../soldier-animation.js');
test('climbing uses rear view and follows distance instead of elapsed time',()=>{
 const p={ladder:{},y:100,anim:0};const a=A.pose(p);assert.equal(a.sheet,'mobility');assert.equal(a.row,0);assert.equal(a.armed,false);
 p.anim=100;assert.deepEqual(A.pose(p),a);p.y+=6.5;assert.notEqual(A.pose(p).frame,a.frame);
 for(const y of [-140,0,233,1000]){p.y=y;assert.ok(A.pose(p).frame>=0&&A.pose(p).frame<4);}
});
test('grappling uses the matching unarmed soldier set',()=>{const p={rope:{},anim:0};assert.deepEqual(A.pose(p),{sheet:'mobility',row:1,frame:0,armed:false});p.anim=.3;assert.equal(A.pose(p).frame,1);});
