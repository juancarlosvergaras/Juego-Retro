const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../physics.js'),A=require('../soldier-animation.js'),X=require('../extraction.js');
test('held Shift boosts all eight directions in both worlds and burns twice the fuel',()=>{
 const original={...P.WORLD};
 try{for(const world of [original,require('../level-two').WORLD]){Object.assign(P.WORLD,world);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const input={right:dx>0,left:dx<0,down:dy>0,up:dy<0},results=[];
   for(const run of [false,true]){
    const p=Object.assign(P.createPlayer(),{x:350,y:400,jetpack:true,grounded:false,fuel:500});
    P.step(p,{...input,run},.1,[]);results.push({distance:Math.hypot(p.x-350,p.y-400),used:500-p.fuel});
    assert.equal(p.jetBoost,run);assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-(run?280:160))<1e-8);
    P.step(p,input,.1,[]);assert.equal(p.jetBoost,false);assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-160)<1e-8);
   }
   assert.ok(Math.abs(results[1].distance/results[0].distance-1.75)<1e-8);assert.equal(results[1].used/results[0].used,2);
  }
 }}finally{Object.assign(P.WORLD,original);}
});
test('boost runs only while moving and stops exactly when fuel is exhausted',()=>{
 const p=Object.assign(P.createPlayer(),{x:350,y:400,jetpack:true,grounded:false,fuel:100});
 P.step(p,{run:true},.1,[]);assert.equal(p.jetBoost,false);assert.equal(p.fuel,96);assert.equal(p.x,350);assert.equal(p.y,400);
 p.fuel=16;P.step(p,{right:true,run:true},.1,[]);assert.equal(p.fuel,0);assert.equal(p.jetpack,false);assert.equal(p.jetBoost,false);assert.equal(p.x,364);
});
test('jetpack lifts off, holds perfectly still, switches off into gravity',()=>{const p=P.createPlayer(),ps=P.createPlatforms();P.step(p,{jetpackPressed:true},1/120,ps);assert.ok(p.jetpack);const y=p.y,x=p.x;for(let i=0;i<300;i++)P.step(p,{},1/120,ps);assert.equal(p.y,y);assert.equal(p.x,x);P.step(p,{jetpackPressed:true},1/120,ps);assert.equal(p.jetpack,false);assert.ok(p.vy>0);});
test('eight flight directions have equal speed and release stops instantly',()=>{for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const p=Object.assign(P.createPlayer(),{x:350,y:500,jetpack:true,grounded:false});P.step(p,{right:dx>0,left:dx<0,down:dy>0,up:dy<0},.1,[]);assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-160)<.01);const x=p.x,y=p.y;P.step(p,{},.1,[]);assert.equal(p.x,x);assert.equal(p.y,y);}});
test('flight detaches traversal, lands on platforms, preserves armed pose and clears for rescue',()=>{const p=Object.assign(P.createPlayer(),{x:200,y:90,jetpack:true,grounded:false,rope:{},ladder:{}}),pl={x:100,y:100,w:200};P.step(p,{down:true},.1,[pl]);assert.equal(p.y,100);assert.equal(p.ground,pl);assert.equal(p.rope,null);assert.equal(p.ladder,null);assert.equal(A.pose(p).armed,true);P.step(p,{up:true},.1,[pl]);assert.ok(p.y<100);const s=X.create(p);X.update(s,p,.1);assert.equal(p.jetpack,false);});
