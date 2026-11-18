const {test}=require('node:test'),assert=require('node:assert/strict'),L=require('../level-two.js'),P=require('../physics.js');
test('the horizontal route preserves a long city and cemetery with an interior beyond the entrance',()=>{
 assert.equal(L.WORLD.width,18000);assert.ok(L.WORLD.width/L.WORLD.height>20);
 assert.equal(L.atmosphere(0).rain,0);assert.equal(L.atmosphere(7600).rain,0);
 assert.ok(L.atmosphere(8500).rain>0&&L.atmosphere(8500).rain<1);
 assert.equal(L.atmosphere(11000).rain,1);assert.equal(L.atmosphere(11000).cemetery,1);
 assert.equal(L.atmosphere(11000,true).rain,0);assert.ok(L.ENTRANCE>L.WORLD.width*.9);
 for(let x=0;x<18000;x+=10){assert.ok(Math.abs(L.atmosphere(x).rain-L.atmosphere(x+10).rain)<.01);}
});
test('open buildings can be traversed and every interior floor reached by both forms',()=>{
 const oldWorld={...P.WORLD};Object.assign(P.WORLD,L.WORLD);
 try{const g=L.geometry();assert.ok(g.buildings.length>=12);assert.equal(new Set(g.buildings.map(b=>b.art)).size,4);assert.ok(g.buildings.some((b,i)=>i&&Math.abs(g.buildings[i-1].x+g.buildings[i-1].w-b.x)<1));
 for(const b of g.buildings)for(const form of ['soldier','wolf']){
   const p=Object.assign(P.createPlayer(),{x:b.x-15,y:620,form,h:form==='wolf'?64:46});
   for(let i=0;i<400;i++){const old=p.x;P.step(p,{right:true},1/120,g.platforms,{ladders:g.ladders});L.solidWalls(p,old,g.buildings);}
   assert.ok(p.x>b.x+b.w);assert.equal(p.y,P.surfaceY(g.platforms[0],p.x));assert.equal(p.grounded,true);
   for(const l of g.ladders.filter(l=>l.x>b.x&&l.x<b.x+b.w)){
     Object.assign(p,{x:l.x,y:l.bottom,vx:0,vy:0,ladder:null,ladderCooldown:0,grounded:true});
     for(let i=0;i<200&&p.y>l.top;i++){const ladder=p.ladder;P.step(p,{up:true},1/120,g.platforms,{ladders:g.ladders});L.finishClimb(p,ladder,g);}
     assert.ok(Math.abs(p.y-l.top)<.001);assert.equal(p.ladder,null);assert.equal(p.ground.y,l.top);
   }
 }
 }finally{Object.assign(P.WORLD,oldWorld);}
});
test('men and women flee left, shout once each, and permanently leave the scene',()=>{
 let civilians=L.createCivilians(),calls=[];assert.equal(civilians.length,9);assert.deepEqual(new Set(civilians.map(p=>p.variant)),new Set([0,1,2,3]));assert.deepEqual(new Set(civilians.map(p=>p.sex)),new Set([0,1]));const starts=civilians.map(p=>p.x);
 civilians=L.updateCivilians(civilians,1,p=>calls.push(p.id));civilians.forEach((p,i)=>{assert.ok(p.x<starts[i]);assert.equal(p.y,620);});
 for(let i=0;i<200;i++)civilians=L.updateCivilians(civilians,.1,p=>calls.push(p.id));assert.equal(civilians.length,0);assert.equal(calls.length,9);assert.equal(new Set(calls).size,9);
});
test('the office has no invisible floor extending over the facade edge',()=>{
 const oldWorld={...P.WORLD};Object.assign(P.WORLD,L.WORLD);
 try{const g=L.geometry(),office=g.buildings.find(b=>b.art===2),deck=g.platforms.find(p=>p.building===g.buildings.indexOf(office));
 for(const x of [office.x+8,deck.x+deck.w/2]){const p=Object.assign(P.createPlayer(),{x,y:deck.y-3,grounded:false,ground:null,vy:40});for(let i=0;i<30;i++)P.step(p,{},1/120,g.platforms);
 if(x<deck.x){assert.ok(p.y>deck.y+10);assert.notEqual(p.ground,deck);}else{assert.equal(p.y,deck.y);assert.equal(p.ground,deck);}}
 }finally{Object.assign(P.WORLD,oldWorld);}
});
test('mausoleum doors only work near the ground-level opening in the matching scene',()=>{
 assert.equal(L.canEnter({x:L.ENTRANCE,y:620},false),true);
 assert.equal(L.canEnter({x:L.ENTRANCE,y:500},false),false);
 assert.equal(L.canEnter({x:L.ENTRANCE-200,y:620},false),false);
 assert.equal(L.canEnter({x:L.ENTRANCE,y:620},true),false);
 assert.equal(L.canExit({x:100,y:620},true),true);assert.equal(L.canExit({x:2180,y:620},true),false);
 assert.equal(L.geometry(true).buildings.length,0);assert.equal(L.geometry(true).platforms[0].w,L.INTERIOR_WIDTH);
});
