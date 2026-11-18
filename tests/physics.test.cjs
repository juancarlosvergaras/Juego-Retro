const {test}=require('node:test');
const assert=require('node:assert/strict');
const {WORLD,createPlatforms,createPlayer,step}=require('../physics.js');
const dt=1/120,empty={};
function tick(p,input=empty,platforms=createPlatforms(),n=1){for(let i=0;i<n;i++)step(p,input,dt,platforms);}
test('ground support remains stable and running is faster than walking',()=>{const a=createPlayer(),b=createPlayer();tick(a,{right:true},undefined,60);tick(b,{right:true,run:true},undefined,60);assert.equal(a.y,WORLD.ground);assert.ok(b.x>a.x+20);assert.equal(a.grounded,true);});
test('double jump adds height, third jump is ignored',()=>{const p=createPlayer();tick(p,{jumpPressed:true});tick(p,empty,undefined,35);const before=p.vy;tick(p,{jumpPressed:true});assert.equal(p.jumps,2);assert.ok(p.vy<before);tick(p,empty,undefined,10);const vy=p.vy;tick(p,{jumpPressed:true});assert.ok(p.vy>vy);assert.equal(p.jumps,2);});
test('one-way platform passes from below and catches descending feet',()=>{const p=createPlayer();p.y=500;p.grounded=false;p.vy=-430;const platforms=[{x:0,w:729,y:445}];let above=false,landed=false;for(let i=0;i<120;i++){tick(p,empty,platforms);if(p.y<445)above=true;if(above&&p.grounded){landed=true;break;}}assert.ok(above&&landed);assert.equal(p.y,445);assert.equal(p.jumps,0);});
test('fast falls land on first platform instead of tunneling',()=>{const p=createPlayer();p.y=400;p.vy=720;p.grounded=false;tick(p,empty,[{x:0,w:729,y:403},{x:0,w:729,y:405}]);assert.equal(p.y,403);});
test('sliding is finite and a held key cannot restart it',()=>{const p=createPlayer();tick(p,{down:true,run:true});assert.ok(p.slide>0);tick(p,{down:true,run:true},undefined,100);assert.equal(p.slide,0);});
test('world boundaries contain the character',()=>{const p=createPlayer();tick(p,{left:true,run:true},undefined,500);assert.ok(p.x>=p.w/2);tick(p,{right:true,run:true},undefined,1000);assert.ok(p.x<=WORLD.width-p.w/2);});
test('geometry keeps real gaps and all hook anchors touch solid undersides',()=>{
  const ps=createPlatforms(),{createAnchors,createLadders}=require('../physics.js');
  assert.ok(!ps.some(p=>p.kind==='bridge'||p.kind==='step'));
  assert.ok(!ps.some(p=>p.y===Math.round(1168*729/692)&&p.x<360&&p.x+p.w>420),'central void stays open');
  for(const a of createAnchors()){const ceiling=ps.find(p=>p.id===a.ceiling);assert.ok(ceiling);assert.equal(a.y,ceiling.y+ceiling.thickness);assert.ok(a.x>ceiling.x&&a.x<ceiling.x+ceiling.w);}
  for(const l of createLadders())for(const y of [l.top,l.bottom])assert.ok(ps.some(p=>p.y===y&&l.x>=p.x&&l.x<=p.x+p.w),'ladder ends on real surface');
});
test('simulation finds a route to the boss with double jumps and ladders across the new gaps',()=>{
  const {createLadders}=require('../physics.js'),ps=createPlatforms(),edges=ps.map(()=>new Set());
  for(let i=0;i<ps.length;i++)for(let j=0;j<ps.length;j++){
    const a=ps[i],b=ps[j],dy=a.y-b.y;if(i===j||dy<0||dy>176)continue;
    const aim=b.x+b.w/2,launch=Math.max(a.x+15,Math.min(a.x+a.w-15,aim));
    if(Math.abs(aim-launch)>245)continue;
    const p=createPlayer();p.x=launch;p.y=a.y;
    for(let n=0;n<220;n++){
      const diff=aim-p.x;
      step(p,{right:diff>5,left:diff< -5,run:true,jumpPressed:n===0||n===44},dt,ps);
      if(n>3&&p.grounded){const k=ps.indexOf(p.ground);if(k!==i)edges[i].add(k);break;}
    }
  }
  for(const l of createLadders()){
    const from=ps.findIndex(p=>p.y===l.bottom&&l.x>=p.x&&l.x<=p.x+p.w),to=ps.findIndex(p=>p.y===l.top&&l.x>=p.x&&l.x<=p.x+p.w);
    if(from>=0&&to>=0)edges[from].add(to);
  }
  const seen=new Set([0]),queue=[0];while(queue.length){for(const j of edges[queue.shift()])if(!seen.has(j)){seen.add(j);queue.push(j);}}
  assert.ok([...seen].some(i=>ps[i].y===WORLD.roof&&ps[i].x>400),'boss platform must be reachable');
});


