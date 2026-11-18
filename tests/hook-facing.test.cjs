const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../physics');
const ceiling={id:1,x:100,y:180,w:180,thickness:18,kind:'deck'};
test('only the soldier can select or attach hooks, including old restored grips',()=>{
 for(const form of ['wolf','zombie','robot','tank','fighter','alien']){
  const p=Object.assign(P.createPlayer(),{x:180,y:340,form,grounded:false});
  assert.equal(P.findAnchor(p,[],[ceiling]),null);
  assert.equal(P.findAnchor(p,[{x:180,y:198}]),null);
  assert.equal(P.attachHook(p,{x:180,y:198,surface:ceiling}),false);
  P.step(p,{hookPressed:true,hookHeld:true},1/120,[ceiling]);assert.equal(p.rope,null);
  p.rope={x:180,y:198,surface:ceiling,offset:80,length:30};
  P.step(p,{hookHeld:true},1/120,[ceiling]);assert.equal(p.rope,null);assert.equal(p.hookHeld,false);
 }
});
test('both anchor systems refuse targets behind and allow them after turning',()=>{
 for(const facing of [-1,1])for(const direct of [false,true]){
  const p=Object.assign(P.createPlayer(),{x:300,y:340,facing,form:'soldier'});
  const s={...ceiling,x:facing>0?100:350,w:80},a={x:s.x+40,y:198};
  const find=()=>P.findAnchor(p,direct?[]:[a],direct?[s]:[]);
  assert.equal(find(),null);assert.equal(P.attachHook(p,a),false);
  p.facing=-facing;assert.ok(find());assert.ok(P.attachHook(p,find()));
 }
});
test('a nearer anchor behind never beats a visible forward target',()=>{
 for(const facing of [-1,1]){
  const p=Object.assign(P.createPlayer(),{x:300,y:340,facing});
  const back={x:300-facing*5,y:240},front={x:300+facing*160,y:180};
  assert.equal(P.findAnchor(p,[back,front]),front);
 }
});
test('turning and hooking together uses the new direction; reeling keeps the soldier facing his grip',()=>{
 for(const facing of [-1,1]){
  const p=Object.assign(P.createPlayer(),{x:facing>0?60:320,y:340,facing:-facing,grounded:false});
  P.step(p,{hookPressed:true,left:facing<0,right:facing>0},1/120,[ceiling]);assert.ok(p.rope);
  for(let i=0;i<20;i++){
   const x=p.x;P.step(p,{left:facing>0,right:facing<0},1/120,[ceiling]);
   assert.equal(p.facing,facing);assert.ok((p.x-x)*facing>0);
  }
 }
});
