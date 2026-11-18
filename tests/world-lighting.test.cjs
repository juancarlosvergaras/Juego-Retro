const test=require('node:test'),assert=require('node:assert/strict'),L=require('../world-lighting');
test('cemetery lightning recurs between fifteen and twenty active seconds, never in the city or mausoleum',()=>{
 let seed=91;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),s=L.create(random),cam={x:10000,y:0};
 L.update(s,100,false,cam,960);assert.equal(s.count,0);let elapsed=0,last=0;
 for(let i=0;i<240*120;i++){elapsed+=1/120;const count=s.count;L.update(s,1/120,true,cam,960);if(s.count!==count){assert.ok(elapsed-last>=15-1/120&&elapsed-last<=20+1/120);assert.ok(s.bolt.x>cam.x&&s.bolt.x<cam.x+960);last=elapsed;}assert.ok(L.flash(s)>=0&&L.flash(s)<=1);}
 assert.ok(s.count>=12);s.bolt={age:.2};L.update(s,.01,false,cam,960);assert.equal(s.bolt,null);assert.equal(L.flash(s),0);
});
test('shadow returns to normal, only affects characters inside a caller-owned save/restore',()=>{
 const c={},s=L.create(()=>0);assert.equal(L.flash(s),0);L.shadow(c,s);assert.equal(c.filter,undefined);s.bolt={age:.12};L.shadow(c,s);assert.match(c.filter,/brightness\(0.220\)/);s.bolt.age=1.05;assert.equal(L.flash(s),0);
});
test('lighting renders a bounded number of sources and does not alter gameplay or allocate pixel buffers',()=>{
 let draws=0;const c=new Proxy({save(){},restore(){},createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};},fill(){draws++;}},{get:(o,k)=>k in o?o[k]:()=>{}}),cam={x:11000,y:200},s=L.create(()=>0);L.update(s,15,true,cam,960);
 const before=JSON.stringify(s);L.sky(c,cam,960,540,16,{night:true});L.storm(c,s,{width:1536,height:1024},cam,960,540);assert.equal(JSON.stringify(s),before);assert.ok(draws<=8);assert.ok(draws>0);
});
