const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const A=require('../arsenal.js');
const near=(a,b)=>Math.abs(a-b)<1e-9;
test('the four diagonal keys follow the direction the character faces',()=>{
 for(const key of ['KeyQ','KeyO','KeyC','KeyM'])for(const facing of [-1,1]){
  const input=A.triggerInput(new Set([key])),p={facing,form:'zombie'},aim=A.playerAim(p,input,{turn:false});
  assert.equal(Math.sign(aim.x),facing,key+' fires towards the facing side');
  assert.equal(Math.sign(aim.y),['KeyC','KeyM'].includes(key)?1:-1);
  assert.ok(near(Math.hypot(aim.x,aim.y),1));assert.equal(p.aim,aim);}
 assert.ok(!('aimRight' in A.triggerInput(new Set(['KeyO']))),'no key forces a fixed side');
});
test('up and down aim in every mission and a tap keeps its direction',()=>{
 const p={facing:-1,form:'soldier'};
 assert.deepEqual(A.playerAim(p,{up:true,fire:true}),{x:0,y:-1});assert.equal(p.facing,-1,'aiming straight up keeps the facing side');
 const diagonal=A.playerAim(p,{up:true,right:true,fire:true});assert.ok(diagonal.x>0&&diagonal.y<0);assert.equal(p.facing,1,'the character turns towards the aim');
 const queued={x:-Math.SQRT1_2,y:-Math.SQRT1_2};
 assert.equal(A.playerAim(p,{fire:true,fireHeld:false},{queuedAim:queued,turn:false}),queued);assert.equal(p.facing,1,'engines that turn the character themselves can opt out');
 const wolf={facing:1,form:'wolf'};A.playerAim(wolf,{left:true});assert.equal(wolf.facing,1);A.playerAim(wolf,{left:true},{turn:'always'});assert.equal(wolf.facing,-1);
 const hanging={facing:1,form:'soldier',rope:{}};A.playerAim(hanging,{left:true});assert.equal(hanging.facing,1,'hanging from the hook does not turn');
});
test('every platform mission aims through the shared function',()=>{
 for(const file of ['game.js','level-two-game.js','level-three-game.js','level-six-game.js','level-seven-game.js','level-eight-game.js']){const src=fs.readFileSync(file,'utf8');
  assert.match(src,/ArcadeArsenal\.playerAim\(/,file);assert.ok(!/\.aim=ArcadeArsenal\.firingAim\(/.test(src),file+' no longer builds its own aim');}
 for(const file of ['level-six-game.js','level-seven-game.js','level-eight-game.js'])assert.match(fs.readFileSync(file,'utf8'),/queuedAim=ArcadeArsenal\.aimDirection\(ArcadeArsenal\.aimInput\(controls\(\)\),p\.facing\)/,file+' keeps the direction of a quick tap');
 assert.ok(!fs.readFileSync('controls.js','utf8').includes('result.aimRight=true'));
});
