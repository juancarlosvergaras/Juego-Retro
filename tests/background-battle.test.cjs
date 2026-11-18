const {test}=require('node:test'),assert=require('node:assert/strict'),B=require('../background-battle.js');
test('tank tracks stay grounded and hull eases to a stop before firing without teleporting',()=>{
 for(const tank of B.tanks){let prev=B.sample(tank,0);for(let time=.01;time<35;time+=.01){const q=B.sample(tank,time);assert.equal(q.base,612);assert.ok(Math.abs(q.x-prev.x)<.27);assert.ok((q.x-prev.x)*tank.dir>=-1e-9);if(q.row===1)assert.equal(q.moving,false);prev=q;}assert.equal(prev.x,tank.x+26*tank.dir);}
});
test('cannon shot precedes impact and damaged masonry never becomes intact again',()=>{
 const tank=B.tanks[0];assert.equal(B.sample(tank,3.6).targetFrame,0);const shell=B.sample(tank,3.9);assert.ok(shell.shell);assert.equal(shell.impactFrame,null);
 const hit=B.sample(tank,4.29);assert.equal(hit.shell,null);assert.equal(hit.impactFrame,0);assert.ok(hit.targetFrame>0);
 for(let time=5;time<50;time+=.1)assert.equal(B.sample(tank,time).targetFrame,3);
});
test('tank, target and shell have identical parallax displacement in both directions',()=>{
 for(const tank of B.tanks.slice(0,2)){const q=B.sample(tank,tank.delay+3.9);assert.ok(q.shell);for(const x of [q.x,q.targetX,q.shell.x])assert.equal((x-600*B.DEPTH)-(x-300*B.DEPTH),-144);assert.ok((q.targetX-q.x)*q.dir>0);}
});
test('mission two reuses the original animated plane renderer and has camera-stable flight lanes',()=>{
 const A=require('../ambience.js');assert.equal(typeof A.drawPlane,'function');const a=B.flights(12,{x:500,y:100}),b=B.flights(12,{x:600,y:140});a.forEach((f,i)=>{assert.ok(Math.abs(f.x-b[i].x-18)<1e-8);assert.ok(Math.abs(f.y-b[i].y-40)<1e-8);});
});
test('opposing artillery crews have distinct targets so an intact wall cannot cover destroyed rubble',()=>{
 const targets=B.tanks.map(t=>B.sample(t,10).targetX);for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++)assert.ok(Math.abs(targets[i]-targets[j])>80);
});
