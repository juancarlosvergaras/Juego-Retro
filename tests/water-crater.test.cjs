const test=require('node:test'),assert=require('node:assert/strict'),P=require('../physics'),L=require('../level-two'),W=require('../water-crater'),E=require('../encounter');
test('crater slopes are walkable in both directions and put water at soldier waist',()=>{
 const original={...P.WORLD};Object.assign(P.WORLD,L.WORLD);
 try{const platforms=L.geometry().platforms,floor=platforms[0];assert.equal(L.geometry(true).platforms[0].terrain,undefined);
 for(const direction of [-1,1])for(const form of ['soldier','wolf']){const p=Object.assign(P.createPlayer(),{x:direction>0?5560:5880,y:620,form,ground:floor,h:form==='wolf'?64:46});let deepest=0;
  for(let i=0;i<350;i++){const oldY=p.y;P.step(p,{right:direction>0,left:direction<0},1/120,platforms);deepest=Math.max(deepest,W.depth(p,L.CRATER));assert.ok(Math.abs(p.y-oldY)<2);assert.equal(p.fallDamage,0);}
  assert.ok(deepest>23&&deepest<26);assert.equal(p.y,620);
 }
 const p=Object.assign(P.createPlayer(),{x:5742,y:652.8,ground:floor,form:'soldier'});P.step(p,{jumpPressed:true},1/120,platforms);assert.ok(p.vy<0);assert.equal(p.grounded,false);
 Object.assign(p,{x:5742,y:649.8,vy:0,grounded:false,jetpack:true});P.step(p,{},1/120,platforms);assert.ok(p.y>648,'hover must not teleport to street height');
 }finally{Object.assign(P.WORLD,original);}
});
test('water emits bounded splash effects on entry, steps and exit, not while dry or idle',()=>{
 const s=W.create(L.CRATER),p={x:5742,y:620,h:46};let sounds=0;const tick=dt=>W.update(s,p,dt,false,()=>sounds++);
 tick(.1);assert.equal(s.drops.length,0);p.y=652.8;tick(.01);assert.equal(sounds,1);assert.ok(s.drops.length>0);
 for(let i=0;i<120;i++)tick(1/120);assert.equal(sounds,1);assert.equal(s.drops.length,0);p.x+=20;tick(.01);assert.equal(sounds,2);
 p.y=600;tick(.01);assert.equal(sounds,3);assert.equal(s.wet,false);
 for(let i=0;i<200;i++)tick(1/120);assert.equal(s.drops.length,0);assert.equal(s.ripples.length,0);
});
test('projectiles and grenades use the actual crater floor below the old road',()=>{
 const floor=L.geometry().platforms[0],box={...floor,h:36};assert.equal(E.segmentHit(5690,630,70,0,box),null);assert.notEqual(E.segmentHit(5742,630,0,40,box),null);
 const g={x:5742,y:630,vx:0,vy:0,gravity:420,life:4,age:0};for(let i=0;i<180;i++)E.stepGrenade(g,1/120,[floor]);assert.ok(g.y>640&&g.y<653);
});
test('second city crater is over three times longer, avoids structures, and keeps waist-deep traversable banks',()=>{
 const original={...P.WORLD};Object.assign(P.WORLD,L.WORLD);
 try{const g=L.geometry(),floor=g.platforms[0],[first,long]=L.CRATERS;
  assert.equal(first,L.CRATER);assert.ok(long.w>first.w*3);assert.ok(long.x>first.x+first.w&&long.x+long.w<9700);
  for(const obstacle of [...g.buildings,...g.cars,...g.barricades])assert.ok(obstacle.x+obstacle.w<long.x||obstacle.x>long.x+long.w);
  for(let i=1;i<floor.terrain.length;i++)assert.ok(floor.terrain[i][0]>floor.terrain[i-1][0]);
  assert.equal(P.surfaceY(floor,7000),620);
  for(const direction of [-1,1])for(const form of ['soldier','wolf']){const p=Object.assign(P.createPlayer(),{x:direction>0?long.x+10:long.x+long.w-10,y:620,form,ground:floor,h:form==='wolf'?64:46});let deepest=0,wetDistance=0;
   for(let i=0;i<Math.ceil((long.w+60)*120/(form==='wolf'?176.9:145));i++){const oldY=p.y,oldX=p.x;P.step(p,{right:direction>0,left:direction<0},1/120,g.platforms);const depth=W.depth(p,long);deepest=Math.max(deepest,depth);if(depth>20)wetDistance+=Math.abs(p.x-oldX);assert.ok(Math.abs(p.y-oldY)<2);assert.equal(p.fallDamage,0);}
   assert.ok(deepest>23&&deepest<26);assert.ok(wetDistance>800);assert.equal(p.y,620);
  }
  const mid=long.x+long.w/2;assert.equal(E.segmentHit(mid,630,70,0,{...floor,h:36}),null);assert.notEqual(E.segmentHit(mid,630,0,40,{...floor,h:36}),null);
 }finally{Object.assign(P.WORLD,original);}
});
test('water effects are independent in each crater, including far along the longer basin',()=>{
 const states=L.CRATERS.map(W.create),a=L.CRATERS[1],floor=L.geometry().platforms[0],p={x:a.x+a.w-200,h:46};p.y=P.surfaceY(floor,p.x);
 for(const s of states)W.update(s,p,.01);assert.equal(states[0].wet,false);assert.equal(states[0].drops.length,0);assert.equal(states[1].wet,true);
 p.x-=20;for(const s of states)W.update(s,p,.01);assert.equal(states[1].ripples.length,2);
 for(const s of states)W.update(s,p,2,true);assert.equal(states[1].wet,false);
});
test('long basin repeats the floor art without stretching either bank',()=>{
 const calls=[],gradient={addColorStop(){}},c=new Proxy({drawImage(...args){calls.push(args)},createLinearGradient(){return gradient}},{get:(o,k)=>k in o?o[k]:()=>{}}),a=L.CRATERS[1];
 W.drawBack(c,W.create(a),{});assert.ok(calls.length>8);
 for(const [,sx,sy,sw,sh,x,y,w,h] of calls){assert.ok(sx>=0&&sx+sw<=2172.001);assert.equal(sy,0);assert.equal(sh,724);assert.ok(Math.abs(w/sw-.16)<1e-8);assert.ok(Math.abs(h/sh-.16)<1e-8);assert.ok(x>=a.x&&x+w<=a.x+a.w+.001);}
 assert.equal(calls[0][5],a.x);const last=calls.at(-1);assert.equal(last[5]+last[7],a.x+a.w);
});
