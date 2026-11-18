const {test}=require('node:test'),assert=require('node:assert/strict');
const N=require('../enemies'),P=require('../physics'),E=require('../encounter'),C=require('../mission-combat'),A=require('../arsenal'),V=require('../powers'),U=require('../progression'),S=require('../soldier-animation');
function setup(mission,dir=1){const p=Object.assign(P.createPlayer(),{x:300,y:620,h:64,form:'wolf',facing:dir,shield:99}),e=mission===1?E.createEncounter():C.create(A.createInventory());e.won=true;e.boss.hp=0;e.finalBoss.hp=0;
 const n=Object.assign(N.createSoldier({x:300+dir*50,y:620},0),{hp:40,maxHp:40,frozen:99});e.enemies=[n];const floor=[{x:0,y:620,w:729,kind:'ground'}],powers=V.create(),profile=U.fresh();
 return{p,e,n,tick(input={},seconds=1/120){for(let i=0;i<Math.ceil(seconds*120);i++)if(mission===1)E.updateEncounter(e,p,input,1/120,floor);else C.update(e,p,input,1/120,floor,powers,profile);}};
}
test('both missions chain three claws, kicks and mixed attacks with one timed hit per stage',()=>{
 for(const mission of [1,2])for(const dir of [-1,1])for(const pattern of [['fire','fire','fire'],['fire','fire','kick'],['kick','fire','kick'],['kick','kick','kick']]){
  const f=setup(mission,dir);let damage=0;
  pattern.forEach((key,i)=>{f.tick({[key]:true});assert.equal(f.p.wolfAttack.stage,i+1);assert.equal(f.p.wolfAttack.kind,key==='kick'?'kick':'claw');const hp=f.n.hp;f.tick({},.07);assert.equal(f.n.hp,hp,'windup does not damage');f.tick({},.5);damage+=(key==='kick'?3:2)+i;assert.equal(f.n.hp,40-damage);});
  f.tick({},.5);assert.equal(f.p.wolfAttack,null);assert.equal(f.n.hp,40-damage);
 }
});
test('one buffered press links during recovery; holding a button never builds automatic combos',()=>{
 for(const mission of [1,2]){const f=setup(mission);f.tick({fire:true});f.tick({},.08);f.tick({kick:true});f.tick({},.2);assert.equal(f.p.wolfAttack.stage,2);assert.equal(f.p.wolfAttack.kind,'kick');f.tick({},.8);assert.equal(f.p.wolfAttack,null);assert.equal(f.n.hp,34);
 const held=setup(mission);for(let i=0;i<190;i++){held.tick({fire:true});if(held.p.wolfAttack)assert.equal(held.p.wolfAttack.stage,1);}
 }
});
test('hurt, transformation and climbing cancel a queued combo, and a late press starts stage one',()=>{
 for(const mission of [1,2])for(const state of [{hurt:.5},{transform:1},{ladder:{}},{rope:{}},{form:'soldier'}]){const f=setup(mission);f.tick({fire:true});f.tick({},.04);f.tick({kick:true});Object.assign(f.p,state);f.tick();assert.equal(f.p.wolfAttack,null);assert.equal(f.p.wolfQueued,null);assert.equal(f.n.hp,40);}
 const f=setup(2);f.tick({fire:true});f.tick({},.9);f.tick({kick:true});assert.equal(f.p.wolfAttack.stage,1);
});
test('combo sprites have six phases, fixed scale, correct attack row and bounded source frames',()=>{
 const png=require('node:fs').readFileSync(require('node:path').join(__dirname,'../assets/sprites/lobo-combos-v1.png'));
 for(const kind of ['claw','kick'])for(const stage of [1,2,3]){const seen=new Set();for(let i=0;i<100;i++){const pose=S.wolfComboPose({form:'wolf',wolfAttack:{kind,stage,age:i/100,duration:1}});seen.add(pose.frame);if(pose.sheet==='combo'){assert.equal(pose.row,stage-1);assert.equal(pose.scale,.31);const [x,y,w,h,,pivot]=S.wolfComboFrames[pose.row][pose.frame];assert.ok(x>=0&&y>=0&&x+w<=png.readUInt32BE(16)&&y+h<=png.readUInt32BE(20));assert.ok(pivot>0&&pivot<w);}else{assert.equal(pose.sheet,'actions');assert.equal(pose.row,2);}}assert.equal(seen.size,6);}
 assert.equal(S.wolfComboPose({form:'wolf'}),null);
});
