const {test}=require('node:test'),assert=require('node:assert/strict'),N=require('../enemies.js'),P=require('../physics.js');
function enemy(){return Object.assign(P.createPlayer(),{x:200,y:300,hp:3,hit:0,flash:0,shot:99,jumpWait:0,facing:1});}
test('hovering player does not trigger repeated jumps or double jumps',()=>{const n=enemy(),ps=[{x:0,y:300,w:729}],p={x:210,y:175,grounded:false,vx:0};for(let i=0;i<1200;i++){N.update([n],p,1/120,ps,[],()=>null);assert.equal(n.jumps,0);assert.equal(n.y,300);}});
test('single planned jump reaches a nearby upper platform',()=>{const n=enemy(),ps=[{x:0,y:300,w:729},{x:230,y:240,w:110}],p={x:270,y:240,vx:0,grounded:true};let jumped=false;for(let i=0;i<250;i++){N.update([n],p,1/120,ps,[],()=>null);jumped||=n.vy<0;assert.ok(n.jumps<=1);}assert.ok(jumped);assert.equal(n.y,240);assert.ok(n.grounded);});
test('enemy stops at an edge without a reachable landing',()=>{const n=enemy(),ps=[{x:100,y:300,w:160}],p={x:600,y:300,vx:0,grounded:true};for(let i=0;i<600;i++)N.update([n],p,1/120,ps,[],()=>null);assert.ok(n.x<260);assert.equal(n.y,300);assert.equal(n.jumps,0);});

const E=require('../encounter');
function trackDrop(platforms,n,p,onFrame=()=>{},rate=120){
 const bullets=[];
 for(let i=0;i<rate*4;i++){
  onFrame(n,p,i/rate);
  N.update([n],p,1/rate,platforms,bullets,E.segmentHit,[{x:p.x,y:p.y,radius:450}]);
  if(n.dropRoute||n.dropRecovery>0)assert.equal(N.contact(n,p,platforms,E.segmentHit),false);
  if(n.dropRecovery>0)return true;
 }
 return false;
}

test('rifle and knife soldiers descend to the free side, inside the world and off the player',()=>{
 const platforms=[{x:0,y:200,w:729,kind:'deck'},{x:0,y:325,w:729,kind:'ground'}];
 for(const kind of ['rifle','knife'])for(const [x,side] of [[32,1],[695,-1]])for(const rate of [30,120]){
  const p={x,y:325,w:64,h:46,vx:0,grounded:true};
  const n=N.createSoldier({kind,x,y:200,ground:platforms[0]},1);
  assert.ok(trackDrop(platforms,n,p,undefined,rate));
  assert.equal(n.ground,platforms[1]);assert.ok((n.x-p.x)*side>=72);
 }
});

test('level one sentries can land beside a stationary or moving player on the actual decks',()=>{
 for(const vx of [0,100,-100]){
  const platforms=P.createPlatforms(),n=N.create().find(n=>n.floor===2);
  const below=platforms.find(s=>s.kind==='deck'&&s.floor===1&&s.x<n.x&&s.x+s.w>n.x);
  const p={x:n.x,y:below.y,vx,w:24,h:46,grounded:true};
  assert.ok(trackDrop(platforms,n,p,()=>{p.x=Math.max(below.x+20,Math.min(below.x+below.w-20,p.x+vx/120));}));
  assert.equal(n.ground,below);assert.ok(Math.abs(n.x-p.x)>=55);
 }
});

test('a blocked narrow landing stays closed until the player moves away',()=>{
 const platforms=[{x:180,y:200,w:75,kind:'deck'},{x:180,y:295,w:75,kind:'deck'}];
 const n=N.createSoldier({x:215,y:200,ground:platforms[0]},1),p={x:215,y:295,h:46,w:24,vx:0};
 assert.equal(trackDrop(platforms,n,p),false);assert.equal(n.y,200);
 p.x=320;assert.ok(trackDrop(platforms,n,p));assert.equal(n.ground,platforms[1]);
});

test('walking into a committed landing leaves time to dodge before contact or a shot',()=>{
 const platforms=[{x:0,y:200,w:729,kind:'deck'},{x:0,y:340,w:729,kind:'ground'}];
 const n=N.createSoldier({x:350,y:200,ground:platforms[0]},0),p={x:350,y:340,vx:0,w:24,h:46};
 assert.ok(trackDrop(platforms,n,p,()=>{if(n.y>323)p.x=n.x;}));
 const hpDistance=Math.abs(n.x-p.x);assert.ok(hpDistance<25);
 const bullets=[];p.x=n.x;for(let i=0;i<36;i++){
  N.update([n],p,1/120,platforms,bullets,E.segmentHit);
  assert.equal(N.contact(n,p,platforms,E.segmentHit),false);
 }
 assert.equal(bullets.length,0);
 for(let i=0;i<25;i++)N.update([n],p,1/120,platforms,bullets,E.segmentHit);
 assert.equal(N.contact(n,p,platforms,E.segmentHit),true);
});
