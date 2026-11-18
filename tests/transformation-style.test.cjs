const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../soldier-animation.js'),E=require('../encounter.js');
test('transformation uses the canonical gameplay endpoints in both directions',()=>{
 for(const [form,start,end] of [['wolf','soldier','wolf'],['soldier','wolf','soldier']]){
  assert.equal(A.transformation(E.transformationFrame({form,transform:1.2})).sheet,start);
  assert.equal(A.transformation(E.transformationFrame({form,transform:.001})).sheet,end);
 }
 assert.equal(A.transformation(0).scale*145,46);
 assert.equal(A.transformation(7).scale,.48);
});
test('all intermediate frames share the new sheet and remain planted at a consistent scale',()=>{
 const forward=[],reverse=[];
 for(let i=1;i<7;i++){
  const pose=A.transformation(i),rect=A.transformationFrames[pose.row][pose.frame];
  assert.equal(pose.sheet,'transformation');assert.ok(rect.every(Number.isFinite));
  assert.ok(rect[0]>=0&&rect[0]+rect[2]<=1774&&rect[1]>=0&&rect[1]+rect[3]<=887);
  const height=rect[3]*pose.scale;assert.ok(height>=40&&height<=66);forward.push(pose);
 }
 for(let i=6;i>0;i--)reverse.push(A.transformation(i));
 assert.deepEqual(reverse,forward.reverse());
});
