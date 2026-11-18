const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../encounter.js'),P=require('../physics.js');
function setup(x,y,px,py){const e=E.createEncounter(),p=P.createPlayer();e.enemies=[];e.hp=1000;e.maxHp=1000;Object.assign(e.boss,{x,y,active:true,shot:0});Object.assign(p,{x:px,y:py});return {e,p};}
test('white wolf climbs the actual ladder instead of shooting from below',()=>{
 const {e,p}=setup(560,337,560,235);let climbed=false;
 for(let i=0;i<180;i++){E.updateEncounter(e,p,{},.01,P.createPlatforms());if(e.boss.phase==='climb'){climbed=true;assert.ok(e.boss.ladder);assert.equal(e.bullets.filter(b=>b.enemy).length,0);}}
 assert.ok(climbed);assert.equal(e.boss.y,235);assert.equal(e.boss.ladder,null);
});
test('white wolf jumps to the player on the next floor without a ladder beneath him',()=>{
 const {e,p}=setup(550,530,510,379);let jumped=false;
 for(let i=0;i<250;i++){E.updateEncounter(e,p,{},.01,P.createPlatforms());jumped ||= e.boss.phase==='jump';}
 assert.ok(jumped);assert.equal(e.boss.y,379);
});
test('white wolf returns upstairs through several supports after descending',()=>{
 const {e,p}=setup(550,652,560,235);let climb=false,jump=false;
 for(let i=0;i<2200;i++){E.updateEncounter(e,p,{},.01,P.createPlatforms());climb ||= e.boss.phase==='climb';jump ||= e.boss.phase==='jump';}
 assert.ok(climb);assert.ok(jump);assert.equal(e.boss.y,235);
});
test('climb finishes on its support if player moves away during traversal',()=>{
 const {e,p}=setup(560,337,560,235);
 for(let i=0;i<20;i++)E.updateEncounter(e,p,{},.01,P.createPlatforms());assert.equal(e.boss.phase,'climb');p.y=530;
 let landed=false;for(let i=0;i<150;i++){E.updateEncounter(e,p,{},.01,P.createPlatforms());if(e.boss.y===235&&!e.boss.ladder)landed=true;}
 assert.ok(landed);
});

test('wolf over a gap falls even when the player is at the same height',()=>{
 const {e,p}=setup(425,235,550,235),platforms=P.createPlatforms();
 E.updateEncounter(e,p,{},.05,platforms);
 assert.ok(e.boss.y>235);assert.equal(e.boss.phase,'fall');assert.equal(e.boss.grounded,false);assert.equal(e.bullets.filter(b=>b.enemy).length,0);
});
test('walking off an edge switches to falling and lands on the next real support',()=>{
 const {e,p}=setup(199,400,400,400),platforms=[{x:100,y:400,w:100},{x:0,y:550,w:729}];
 E.updateEncounter(e,p,{},.05,platforms);assert.equal(e.boss.phase,'fall');assert.ok(e.boss.y>400);
 let landed=false;for(let i=0;i<120;i++){E.updateEncounter(e,p,{},.01,platforms);if(e.boss.grounded&&e.boss.y===550){landed=true;break;}}
 assert.ok(landed);assert.equal(e.boss.vy,0);
});
test('wolf standing at the edge has real support and does not sink',()=>{
 const {e,p}=setup(195,400,195,400),platforms=[{x:100,y:400,w:100}];
 for(let i=0;i<50;i++)E.updateEncounter(e,p,{},.01,platforms);
 assert.equal(e.boss.y,400);assert.equal(e.boss.grounded,true);
});

test('white wolf follows the jetpack up the outside of either side of the building',()=>{
 for(const x of [25,705]){
  const {e,p}=setup(550,652,x,200),platforms=P.createPlatforms();p.jetpack=true;p.fuel=500;
  let ascended=false;
  for(let i=0;i<3000;i++){
   E.updateEncounter(e,p,{},.01,platforms);ascended ||= ['climb','jump'].includes(e.boss.phase);
   if(e.boss.ladder)assert.ok(P.availableLadders(P.createLadders(),e).some(l=>l.x===e.boss.ladder.x&&l.top===e.boss.ladder.top));
  }
  assert.ok(ascended);assert.equal(e.boss.y,235);assert.equal(e.boss.grounded,true);
  assert.ok(x<100?e.boss.x<200:e.boss.x>500);
 }
});

test('an unreachable platform under a flying target does not block a reachable approach',()=>{
 const {e,p}=setup(300,600,40,60);p.jetpack=true;
 const platforms=[{x:100,y:600,w:450},{x:100,y:430,w:450},{x:100,y:280,w:450},{x:10,y:60,w:45}];
 for(let i=0;i<2000;i++)E.updateEncounter(e,p,{},.01,platforms);
 assert.ok(e.boss.y<=280);assert.ok(platforms.some(s=>s.y===e.boss.y&&e.boss.x>=s.x&&e.boss.x<=s.x+s.w));
});

test('flying above the locked arena never creates an invisible ladder or leaves the wolf floating',()=>{
 const {e,p}=setup(550,235,35,-250),platforms=P.createPlatforms();p.jetpack=true;
 for(let i=0;i<2400;i++){
  E.updateEncounter(e,p,{},.01,platforms);
  assert.ok(!e.boss.ladder?.finalAccess);
  if(e.boss.grounded)assert.ok(platforms.some(s=>Math.abs(s.y-e.boss.y)<.5&&e.boss.x>=s.x&&e.boss.x<=s.x+s.w));
 }
 assert.equal(e.won,false);assert.equal(e.boss.grounded,true);assert.ok(e.boss.y>=163);
});
