const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../ambience');
test('distant city is world anchored and changes only by the camera parallax',()=>{const a=A.cityPlacement({x:0,y:3400},3700),b=A.cityPlacement({x:100,y:3300},3700);assert.equal(b.x-a.x,-12);assert.equal(b.y-a.y,12);assert.equal(a.w,b.w);assert.equal(a.h,b.h);assert.deepEqual(A.cityPlacement({x:0,y:3400},3700),a);});

test('planes keep fixed world altitude when the camera follows a jump',()=>{
 const s={t:12,ground:3700},before=A.flightPositions(s,{x:0,y:3200}),after=A.flightPositions(s,{x:0,y:3100});
 assert.equal(before.length,after.length);
 for(let i=0;i<before.length;i++){assert.equal(after[i].x,before[i].x);assert.ok(Math.abs(after[i].y-before[i].y-100)<1e-9);assert.ok(Math.abs(after[i].y+3100-(before[i].y+3200))<1e-9);}
});
test('plane motion progresses with time independently of the player and camera',()=>{
 const camera={x:0,y:3200},a=A.flightPositions({t:1,ground:3700},camera),b=A.flightPositions({t:2,ground:3700},camera);
 assert.ok(b[0].x>a[0].x);assert.ok(b[2].x<a[2].x);
});
