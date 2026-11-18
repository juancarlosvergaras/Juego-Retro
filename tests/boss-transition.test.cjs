const {test}=require('node:test'),assert=require('node:assert/strict');
const X=require('../extraction.js'),F=require('../final-boss.js'),E=require('../encounter.js'),P=require('../physics.js');
test('rescue camera interpolates from the current view instead of cutting to its target',()=>{
 const camera={x:0,y:-380},p={x:180,y:-140},s={pickX:366,ground:-140},view={width:600,height:300};
 X.updateCamera(camera,s,p,view,0);assert.deepEqual(camera,{x:0,y:-380});
 X.updateCamera(camera,s,p,view,1/120);assert.ok(camera.x>0&&camera.x<2);assert.ok(camera.y<-380&&camera.y>-382);
 for(let i=0;i<600;i++)X.updateCamera(camera,s,p,view,1/120);
 assert.ok(Math.abs(camera.x-66)<.001);assert.ok(Math.abs(camera.y-(-418))<.001);
});
test('camera remains continuous when rescue switches from climbing back to boarding',()=>{
 const view={width:430,height:400},p={x:160,y:-140},s={returning:true,pickX:366,ground:-140},camera={x:0,y:-350};
 for(let i=0;i<200;i++)X.updateCamera(camera,s,p,view,1/120);
 const before={...camera};s.returning=false;X.updateCamera(camera,s,p,view,1/120);
 assert.ok(Math.abs(camera.x-before.x)<4);assert.ok(Math.abs(camera.y-before.y)<3);
});
test('final boss corpse falls onto real support and remains there during death',()=>{
 const e=E.createEncounter(),p=P.createPlayer(),platforms=[{x:0,y:100,w:729}];
 Object.assign(e.finalBoss,{stage:2,hp:0,phase:'dead',death:2.4,x:350,y:20});
 for(let i=0;i<120;i++)F.update(e,p,1/120,()=>{},platforms);
 assert.equal(e.finalBoss.y,100);assert.equal(e.finalBoss.deathVy,0);assert.ok(e.finalBoss.death>0);
 for(let i=0;i<100;i++)F.update(e,p,1/120,()=>{},platforms);
 assert.equal(e.finalBoss.y,100);
});
test('death art contact is anchored to the floor throughout the collapse',()=>{
 const frames=[[299,299],[215,207],[210,201],[128,120]];
 for(const [i,age] of [.1,.6,1.1,1.6].entries()){
   const pose=F.deathPose({age}),[height,contact]=frames[i],scale=.55,ground=-140;
   const drawnTop=ground+pose.groundInset*scale-height*scale;
   assert.ok(Math.abs(drawnTop+contact*scale-ground)<1e-9);
 }
});
