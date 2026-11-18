const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../physics.js');
test('soldier and wolf can jump onto and drop from every scaffold',()=>{
 const ps=P.createPlatforms(),scaffolds=ps.filter(p=>p.kind==='scaffold');assert.equal(scaffolds.length,4);
 for(const scaffold of scaffolds)for(const form of ['soldier','wolf']){
  const x=scaffold.x+scaffold.w/2,base=ps.find(p=>p.y===scaffold.supportBottom&&x>p.x&&x<p.x+p.w);assert.ok(base);
  const p=Object.assign(P.createPlayer(),{x,y:base.y,form,ground:base});let landed=false;
  for(let i=0;i<180;i++){P.step(p,{jumpPressed:i===0||(form!=='wolf'&&i===35)},1/120,ps);if(p.ground===scaffold){landed=true;break;}}
  assert.ok(landed,form+' reaches scaffold '+scaffold.id);
  P.step(p,{down:true,jumpPressed:true},1/120,ps);assert.ok(p.y>scaffold.y);
  for(let i=0;i<120;i++)P.step(p,{},1/120,ps);assert.equal(p.ground,base);
 }
});

