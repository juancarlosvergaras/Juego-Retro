const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../arrival'),P=require('../physics');
test('jeep reverses into position then soldier jumps and lands exactly at spawn',()=>{const p=P.createPlayer(),x=p.x,y=p.y,s=A.create(p);let prior=s.x;for(let i=0;i<230;i++){A.update(s,p,.01);assert.ok(s.x>=prior-1e-6);prior=s.x;assert.ok(s.active);}A.update(s,p,.55);const launch=p.y;let highest=p.y;for(let i=0;i<100;i++){A.update(s,p,.01);highest=Math.min(highest,p.y);}assert.ok(highest<launch-20);for(let i=0;i<60;i++)A.update(s,p,.01);assert.equal(s.active,false);assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(p.grounded,true);assert.equal(p.fallDamage,0);assert.equal(p.vy,0);});
test('pause leaves arrival fixed, jeep departs without moving controllable player',()=>{const p=P.createPlayer(),s=A.create(p);A.update(s,p,1);const before=JSON.stringify(s);A.update(s,p,0);assert.equal(JSON.stringify(s),before);A.update(s,p,4);p.x=333;p.y=222;for(let i=0;i<200;i++)A.update(s,p,.01);assert.equal(p.x,333);assert.equal(p.y,222);assert.equal(s.visible,false);});
test('arrival uses a stable doorless body and real jump poses through every stage',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),scope={window:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../jeep-atlas.js'),'utf8'),scope);
 const frames=scope.window.JEEP_ARRIVAL_FRAMES,sheet={},calls=[];
 A.setSprites(sheet,frames,null,[],1);
 const c=new Proxy({drawImage:(...args)=>calls.push(args)},{get:(o,k)=>k in o?o[k]:()=>{}});
 for(const t of [1,2.6,2.9,3.2,3.5,3.8,3.95,4.1,4.25,4.6]){
  const p=P.createPlayer(),s=A.create(p);A.update(s,p,t);calls.length=0;A.draw(c,s,p);
  assert.ok(calls.length>0);
  assert.deepEqual(calls[0].slice(1,5),Array.from(frames[0]));
  assert.ok(calls.every(call=>call[2]+call[4]<=418),'never samples the door or distorted brake frames');
  const [row,frame]=A.soldierPose(s);
  if(s.phase==='jump'){assert.equal(row,3);assert.ok(frame>=1&&frame<=4);}
  if(s.phase==='land'){assert.equal(row,4);assert.ok(frame>=3);}
 }
});
test('dedicated dismount covers sitting, bracing, turning, launch, flight and landing',()=>{
 const stages=[1,2.4,2.63,2.8,3.2,3.6,3.95,4.2];
 assert.deepEqual(stages.map(t=>A.dismountPose({t})),[0,1,2,3,4,5,6,7]);
 const vm=require('node:vm'),fs=require('node:fs'),scope={window:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../jeep-atlas.js'),'utf8'),scope);
 const atlas=scope.window.SOLDIER_DISMOUNT_FRAMES,sprite={},jeep={},calls=[];
 A.setSprites(jeep,scope.window.JEEP_ARRIVAL_FRAMES,null,[],1);
 A.setDismountSprites(sprite,atlas,scope.window.SOLDIER_DISMOUNT_SCALE);
 const c=new Proxy({drawImage:(...args)=>calls.push(args)},{get:(o,k)=>k in o?o[k]:()=>{}});
 for(let i=0;i<stages.length;i++){
  const p=P.createPlayer(),s=A.create(p);A.update(s,p,stages[i]);calls.length=0;A.draw(c,s,p);
  const body=calls.filter(call=>call[0]===sprite);assert.equal(body.length,1);
  assert.deepEqual(body[0].slice(1,5),Array.from(atlas[i].slice(0,4)));
  assert.equal(body[0][8],atlas[i][3]*scope.window.SOLDIER_DISMOUNT_SCALE);
 }
});
