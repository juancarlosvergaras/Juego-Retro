const {test}=require('node:test'),assert=require('node:assert/strict'),L=require('../level-two'),P=require('../physics'),Loot=require('../mission-two-loot'),E=require('../encounter');
function world(fn){const old={...P.WORLD};Object.assign(P.WORLD,L.WORLD);try{fn();}finally{Object.assign(P.WORLD,old);}}
test('four distinct wrecks stay on city streets clear of fixed stars, crater and tank arena',()=>{
 const g=L.geometry();assert.equal(g.cars.length,4);assert.equal(L.geometry(true).cars.length,0);assert.equal(new Set(g.cars.map(c=>c.frame.join(','))).size,4);assert.equal(new Set(g.platforms.map(p=>p.id)).size,g.platforms.length);
 for(const c of g.cars){assert.ok(c.x>1000&&c.x+c.w<8100);assert.ok(c.x+c.w<3640||c.x>4440);assert.ok(c.x+c.w<L.CRATER.x||c.x>L.CRATER.x+L.CRATER.w);assert.ok(c.smoke.x>c.x&&c.smoke.x<c.x+c.w&&c.smoke.y<620);for(const p of c.platforms)assert.ok(Math.abs(p.y+p.thickness-620)<1e-7);}
 for(let seed=0;seed<100;seed++){const loot=Loot.create(g.platforms,seed);for(const item of [...loot.weapons,...loot.stars])assert.ok(!g.platforms.some(p=>p.kind==='wreck'&&item.x>p.x&&item.x<p.x+p.w&&item.y>p.y));}
});
test('both characters must jump the wrecks and can cross every car from either side',()=>world(()=>{
 const g=L.geometry();for(const c of g.cars)for(const form of ['soldier','wolf'])for(const dir of [-1,1]){
 const p=Object.assign(P.createPlayer(),{x:dir>0?c.x-35:c.x+c.w+35,y:620,form,h:form==='wolf'?64:46}),input=dir>0?{right:true}:{left:true};
 for(let i=0;i<180;i++)P.step(p,input,1/120,g.platforms);assert.ok(dir>0?p.x<c.x+25:p.x>c.x+c.w-25,'walking cannot cross');
 for(let i=0;i<420;i++){P.step(p,{...input,jumpPressed:i%95===0},1/120,g.platforms);assert.ok(!c.platforms.some(s=>p.x+p.w/2>s.x+.01&&p.x-p.w/2<s.x+s.w-.01&&p.y>s.y+.01&&p.y-p.h<s.y+s.thickness-.01));if(dir>0?p.x>c.x+c.w+25:p.x<c.x-25)break;}
 assert.ok(dir>0?p.x>c.x+c.w:p.x<c.x,'jump route is open');
 }
}));
test('wrecks stop low projectiles and support saved players without trapping them',()=>world(()=>{
 const g=L.geometry();for(const c of g.cars){const s=[...c.platforms].sort((a,b)=>a.y-b.y)[0],p=Object.assign(P.createPlayer(),{x:s.x+s.w/2,y:620,form:'soldier'});P.step(p,{},0,g.platforms);assert.equal(p.y,s.y);assert.ok(E.segmentHit(c.x-30,610,c.w+60,0,{...s,h:s.thickness})!==null);P.step(p,{down:true,jumpPressed:true},1/120,g.platforms);assert.ok(p.y<s.y);}
}));
