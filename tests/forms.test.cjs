const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../encounter.js'),P=require('../physics.js');
test('form toggle requires boss defeat, preserves health and arsenal, and has transition lock',()=>{const e=E.createEncounter(),p=P.createPlayer();assert.equal(E.toggleForm(e,p),false);E.transformWolf(e,p);p.transform=0;e.hp=6;const inv=JSON.stringify(e.inventory);assert.equal(E.toggleForm(e,p),true);assert.equal(p.form,'soldier');assert.equal(p.h,46);assert.equal(e.hp,6);assert.equal(E.toggleForm(e,p),false);E.updateEncounter(e,p,{},1.3);assert.equal(E.toggleForm(e,p),false);E.updateEncounter(e,p,{},8.7);assert.equal(E.toggleForm(e,p),true);assert.equal(p.form,'wolf');assert.equal(e.hp,6);assert.equal(JSON.stringify(e.inventory),inv);});
test('soldier projectiles keep moving after boss defeat',()=>{const e=E.createEncounter(),p=P.createPlayer();e.boss.hp=0;E.transformWolf(e,p);p.transform=0;E.toggleForm(e,p);E.updateEncounter(e,p,{},1.3);E.updateEncounter(e,p,{fire:true},1/120);assert.equal(e.bullets.length,1);const x=e.bullets[0].x;E.updateEncounter(e,p,{},.1);assert.ok(e.bullets[0].x>x);assert.equal(e.boss.active,false);assert.equal(e.boss.hp,0);});

test('wolf to soldier plays every transformation frame in reverse',()=>{for(const form of ['wolf','soldier']){const frames=[];for(let i=0;i<8;i++)frames.push(E.transformationFrame({form,transform:1.2-(i+.1)*.15}));assert.deepEqual(frames,form==='wolf'?[0,1,2,3,4,5,6,7]:[7,6,5,4,3,2,1,0]);}});

test('boss transformation starts from the actual current form instead of a stale earlier form',()=>{
 const e=E.createEncounter(),p=P.createPlayer();p.form='soldier';p.transformFrom='zombie';E.transformWolf(e,p);assert.equal(p.transformFrom,'soldier');
});
