const test=require('node:test'),assert=require('node:assert/strict'),Z=require('../zombie-form'),P=require('../physics'),M=require('../mission-combat');
test('burial sinks progressively and completely hides the player during underground travel',()=>{for(const facing of [-1,1]){const p={h:68,facing,burrow:{age:0}};assert.deepEqual(Z.burial(p),{hidden:false,depth:0});p.burrow.age=.25;assert.equal(Z.burial(p).depth,40);for(const age of [.5,1,2.99]){p.burrow.age=age;assert.equal(Z.burial(p).hidden,true);assert.ok(Z.burial(p).depth>=p.h);}p.burrow=null;p.emerging=.35;assert.equal(Z.burial(p).depth,80);p.emerging=0;assert.equal(Z.burial(p).depth,0);}});
test('native attack origin mirrors the animated palm in all directions, on ground and in air',()=>{
 for(const facing of [-1,1])for(const kick of [false,true])for(const grounded of [false,true])for(const [x,y] of [[1,0],[1,-1],[0,-1],[1,1],[0,1]]){
  const d=Math.hypot(x,y),p=Object.assign(P.createPlayer(),{form:'zombie',h:68,x:500,y:200,grounded,facing,aim:{x:x*facing/d,y:y/d}}),e=M.create();
  Z.combat(e,p,kick?{kick:true}:{fire:true},.01,[]);const shot=kick?e.playerPlasma[0]:e.zombieEffects.find(f=>f.kind==='ray'),q=Z.pose(p);
  assert.equal(q.cast,true);assert.equal(q.frame,1);assert.equal(shot.x,500+facing*(q.palm[0]-q.pivot)*q.scale);assert.equal(shot.y,200+(q.palm[1]-q.base)*q.scale);
  if(y<0)assert.ok(shot.y<200-60);if(!kick){assert.ok(Math.abs((shot.tx-shot.x)*p.aim.y-(shot.ty-shot.y)*p.aim.x)<1e-8);}
  p.facing=-facing;p.aim={x:-facing,y:0};assert.equal(Z.pose(p).facing,facing,'casting does not flip away from its ray');
 }
});
test('plasma liquid trails remain bounded throughout flight and stop producing effects when buried',()=>{const p=Object.assign(P.createPlayer(),{form:'zombie',h:68,x:100,y:200,facing:1}),e=M.create();Z.combat(e,p,{kick:true},.01,[]);for(let i=0;i<120;i++)Z.combat(e,p,{},1/120,[]);assert.equal(e.playerPlasma[0].trail.length,9);p.burrow={age:1};p.plasmaWait=0;p.rayWait=0;const count=e.playerPlasma.length;Z.combat(e,p,{kick:true,fire:true},.01,[]);assert.equal(e.playerPlasma.length,count);assert.equal(e.zombieEffects.length,0);});
