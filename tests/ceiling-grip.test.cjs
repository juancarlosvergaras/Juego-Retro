const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../physics');
test('diagonal hooks move continuously above the floor in both mission geometries',()=>{
 const L=require('../level-two'),original={...P.WORLD};let cases=0;
 try{
  for(const mission of [1,2]){
   Object.assign(P.WORLD,mission===1?original:L.WORLD);
   const ps=mission===1?P.createPlatforms():L.geometry().platforms;
   for(const s of ps.filter(s=>s.kind!=='ground'))for(const side of [-1,1])for(const form of ['soldier']){
    const x=side<0?s.x-90:s.x+s.w+90,y=s.y+(s.thickness||0)+66;
    if(x<30||x>P.WORLD.width-30||y>P.WORLD.ground)continue;
    const p=Object.assign(P.createPlayer(),{x,y,form,facing:-side,grounded:false});
    if(!P.findAnchor(p,[],ps))continue;
    cases++;
    for(let i=0;i<180;i++){
     const old={x:p.x,y:p.y},dt=[1/120,1/60,1/30][i%3];
     P.step(p,i===0?{hookPressed:true}:{},dt,ps);
     assert.ok(p.rope,`mission ${mission} keeps its grip`);
     assert.ok(Math.hypot(p.x-old.x,p.y-old.y)<=380*dt+1e-8,`mission ${mission}: no teleport`);
     assert.ok(p.y<=old.y+1e-8,`mission ${mission}: reeling never pushes feet downward`);
     assert.ok(p.y<=P.WORLD.ground,`mission ${mission}: feet stay above ground`);
    }
    assert.equal(p.rope.length,3);
   }
  }
  assert.ok(cases>50);
 }finally{Object.assign(P.WORLD,original);}
});
test('attaching preserves position and clears stale motion and jump input',()=>{
 const s={x:100,y:180,w:180,thickness:18},p=Object.assign(P.createPlayer(),{x:70,y:310,buffer:.13,slide:.3,dropping:true,landing:.2});
 assert.ok(P.attachHook(p,P.findAnchor(p,[],[s])));
 assert.equal(p.x,70);assert.equal(p.y,310);assert.equal(p.vy,0);
 assert.equal(p.buffer,0);assert.equal(p.slide,0);assert.equal(p.dropping,false);
 for(let i=0;i<100;i++)P.step(p,{},1/120,[s]);
 P.step(p,{hookPressed:true},1/120,[s]);
 assert.equal(p.rope,null);assert.ok(p.vy>0,'E releases without an old buffered jump');
});
test('direct grip targets the nearest solid underside without preset anchors',()=>{
 const p=Object.assign(P.createPlayer(),{x:173,y:300}),near={x:100,y:180,w:180,thickness:18},far={x:100,y:100,w:180,thickness:18};
 const target=P.findAnchor(p,[],[far,near]);assert.equal(target.surface,near);assert.equal(target.x,p.x);assert.equal(target.y,198);
 assert.equal(P.findAnchor(p,[],[{x:100,y:-100,w:180,thickness:18}]),null);
});
test('soldier retracts to the ceiling and follow a moving platform',()=>{
 for(const form of ['soldier']){
  const p=Object.assign(P.createPlayer(),{x:180,y:340,form,grounded:false}),s={x:100,y:180,w:180,thickness:18},ps=[s];
  P.step(p,{hookPressed:true},1/120,ps);assert.ok(p.rope);
  for(let i=0;i<120;i++)P.step(p,{},1/120,ps);
  assert.equal(p.rope.length,3);assert.ok(Math.abs(p.y-(198+(form==='wolf'?60:45.58)+3))<.01);
  const start=p.x;for(let i=0;i<30;i++)P.step(p,{right:true},1/120,ps);assert.ok(p.x>start);
  const old=p.x;s.x+=2;s.y+=1;P.step(p,{},1/120,ps);assert.ok(Math.abs(p.x-old-2)<.01);assert.equal(p.rope.y,199);
  P.step(p,{down:true,jetpackPressed:true},1/120,ps);assert.ok(p.rope);assert.ok(!p.jetpack);
  P.step(p,{hookPressed:true},1/120,ps);assert.equal(p.rope,null);
 }
});
test('one press of up immediately climbs in place from anywhere under the platform',()=>{
 for(const form of ['soldier'])for(const x of [130,190,250]){
  const s={x:100,y:180,w:180,thickness:18},p=Object.assign(P.createPlayer(),{x,y:340,form});
  P.step(p,{hookPressed:true},1/120,[s]);for(let i=0;i<120;i++)P.step(p,{},1/120,[s]);
  const startX=p.x,startY=p.y,result=P.step(p,{up:true},1/120,[s]);
  assert.ok(result.mantling);assert.ok(p.y<startY);assert.equal(p.x,startX);
  for(let i=0;i<90&&!p.grounded;i++){P.step(p,{},1/120,[s]);assert.equal(p.x,startX);}
  assert.equal(p.rope,null);assert.equal(p.ground,s);assert.equal(p.y,s.y);assert.equal(p.jumps,0);
 }
});
test('ceiling travel changes hand poses, remains at edges and crosses connected slabs',()=>{
 const s={x:100,y:180,w:80,thickness:18},next={x:180,y:180,w:90,thickness:18},p=Object.assign(P.createPlayer(),{x:145,y:340});
 P.step(p,{hookPressed:true},1/120,[s,next]);
 const frames=new Set();for(let i=0;i<350;i++){P.step(p,{right:true},1/120,[s,next]);frames.add(Math.floor(p.hangCycle||0)%4);}
 assert.equal(frames.size,4);assert.equal(p.rope.surface,next);assert.equal(p.rope.offset,next.w-6);
 const x=p.x;for(let i=0;i<120;i++)P.step(p,{down:true},1/120,[s,next]);assert.equal(p.x,x);assert.ok(p.rope);
});
test('E and jump cancel a mantle and an obstructed top prevents climbing through a ceiling',()=>{
 for(const release of ['hookPressed','jumpPressed']){
  const s={x:100,y:180,w:100,thickness:18},p=Object.assign(P.createPlayer(),{x:106,y:340});
  P.step(p,{hookPressed:true},1/120,[s]);for(let i=0;i<70;i++)P.step(p,{up:true},1/120,[s]);assert.ok(p.rope.mantle);
  P.step(p,{[release]:true},1/120,[s]);assert.equal(p.rope,null);
 }
 const s={x:100,y:180,w:100,thickness:18},ceiling={x:90,y:150,w:130,thickness:18},p=Object.assign(P.createPlayer(),{x:106,y:340});
 P.step(p,{hookPressed:true},1/120,[s,ceiling]);for(let i=0;i<200;i++)P.step(p,{up:true},1/120,[s,ceiling]);assert.ok(p.rope);assert.ok(!p.rope.mantle);
});
test('jump releases a direct grip and no grip survives a removed ceiling',()=>{
 for(const jump of [true,false]){
  const p=Object.assign(P.createPlayer(),{x:180,y:340}),s={x:100,y:180,w:180,thickness:18};
  P.step(p,{hookPressed:true},1/120,[s]);P.step(p,{jumpPressed:jump},1/120,jump?[s]:[]);
  assert.equal(p.rope,null);if(jump)assert.ok(p.vy<0);
 }
});
