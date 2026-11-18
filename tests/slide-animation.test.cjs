const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../soldier-animation.js');
test('slide plays all six unarmed frames, separately from crouching',()=>{
 const frames=[];for(let i=0;i<6;i++){const p={grounded:true,slide:.44*(1-(i+.1)/6),vx:330};const f=A.pose(p,{sliding:true});assert.equal(f.sheet,'slide');assert.equal(f.armed,false);frames.push(f.frame);}
 assert.deepEqual(frames,[0,1,2,3,4,5]);assert.notEqual(A.pose({grounded:true,vx:0},{crouching:true}).sheet,'slide');
});
