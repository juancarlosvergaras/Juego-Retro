const {test}=require('node:test'),assert=require('node:assert/strict'),X=require('../extraction');
test('door closes immediately after boarding and stays sealed throughout departure',()=>{for(const form of ['soldier','wolf']){const p={x:366,y:-140,anim:0,form},s=X.create(p);X.update(s,p,s.boardAt-.01);assert.equal(s.door,0);X.update(s,p,.26);assert.equal(s.phase,'close');assert.ok(s.door>0);const x=s.x;X.update(s,p,.9);assert.equal(s.door,1);assert.equal(s.phase,'latch');assert.equal(s.x,x);for(let i=0;i<300;i++){X.update(s,p,1/60);assert.equal(s.door,1);}assert.equal(s.phase,'depart');assert.ok(s.x>x);}});
test('boarding exposes only the passenger opening over a permanently closed fuselage',()=>{const sheet={},door={},calls=[],clips=[];X.setSpriteSheet(sheet,[[8,242,504,211,332,174]]);X.setDoorSprite(door);const ctx={save(){},restore(){},translate(){},scale(){},fillRect(){},beginPath(){},rect(...a){clips.push(a);},clip(){},drawImage(...a){calls.push(a);}};for(const progress of [0,.35,.7]){calls.length=0;X.draw(ctx,{x:366,y:-265,t:0,boarded:progress>0,door:progress,form:'wolf'});assert.equal(calls[0][0],door);assert.ok(calls.every(a=>a[0]===door));assert.deepEqual(calls[1].slice(1,5),[271,347,59,70]);assert.ok(clips.length);assert.equal(calls.at(-1)[0],door);}});

test('all rotor frames use the closed fuselage once the door latches',()=>{const sheet={},door={},calls=[],frames=Array.from({length:6},()=>[8,242,504,211,332,174]);X.setSpriteSheet(sheet,frames);X.setDoorSprite(door);const ctx={save(){},restore(){},translate(){},drawImage(...a){calls.push(a);}};for(let frame=0;frame<6;frame++){calls.length=0;X.draw(ctx,{x:366,y:-265,t:frame/18,boarded:true,door:1,form:'wolf'});assert.equal(calls.length,1);assert.equal(calls[0][0],door);}});
test('boarding adds the real passenger without changing the rear door or drawing placeholder blocks',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),scope={window:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../helicopter-atlas.js'),'utf8'),scope);
 const hull={},closed={},soldier={},wolf={},sf=[62,29,83,145],wf=[10,20,100,140];
 X.setSpriteSheet(hull,scope.window.HELICOPTER_FRAMES);X.setDoorSprite(closed);X.setPassengerSprites(soldier,sf,wolf,wf);
 const calls=[],fills=[];
 const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},rect(){},clip(){},drawImage(...args){calls.push(args);},fillRect(...args){fills.push([this.fillStyle,...args]);}};
 for(const form of ['soldier','wolf'])for(let rotor=0;rotor<6;rotor++){
  const state={x:366,y:-265,t:rotor/18,boardAt:0,form,door:0,boarded:false};
  calls.length=0;fills.length=0;X.draw(ctx,state);
  const cabin=calls.slice(0,2).map(c=>c.slice()),rearFills=fills.map(c=>c.slice());
  for(const progress of [.01,.35,.7,.99]){
   calls.length=0;fills.length=0;X.draw(ctx,{...state,boarded:true,door:progress});
   assert.deepEqual(calls.slice(0,2),cabin,'same fuselage and rear door before and after boarding');
   assert.deepEqual(fills,rearFills,'boarding never paints additional rectangular blocks');
   const passenger=calls.filter(c=>c[0]===(form==='wolf'?wolf:soldier));
   assert.equal(passenger.length,1);assert.equal(calls.at(-1)[0],closed,'sliding door covers passenger');
  }
  calls.length=0;X.draw(ctx,{...state,boarded:true,door:1});assert.equal(calls.length,1);
 }
});

test('unlocked zombie remains visible inside the helicopter until the door closes',()=>{
 const sheet={},door={},zombie={},calls=[];X.setSpriteSheet(sheet,[[8,242,504,211,332,174]]);X.setDoorSprite(door);X.setPassengerSprite('zombie',{image:zombie,frame:[10,20,80,100]},68);
 const c={save(){},restore(){},translate(){},scale(){},fillRect(){},beginPath(){},rect(){},clip(){},drawImage(...a){calls.push(a)}};
 X.draw(c,{x:366,y:-265,t:0,boarded:true,door:.4,form:'zombie'});assert.equal(calls.filter(a=>a[0]===zombie).length,1);assert.equal(calls.at(-1)[0],door);
});
