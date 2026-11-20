const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../physics.js'),E=require('../encounter.js');
function drop(floors,form='soldier'){const p=P.createPlayer(),e=E.createEncounter();e.enemies=[];p.form=form;p.y=100;p.grounded=false;p.vy=0;const platform={x:0,y:100+P.EXTENSION.tileHeight*floors,w:729};for(let i=0;i<600&&!p.grounded;i++)P.step(p,{},1/120,[platform]);return {p,e};}
test('fall damage counts complete pairs of floors for both forms, once per landing',()=>{for(const form of ['soldier','wolf'])for(const floors of [1,1.99,2,3,4,6]){const {p,e}=drop(floors,form),damage=form==='wolf'?0:Math.floor(floors/2);p.shield=10;E.updateEncounter(e,p,{},.01);assert.equal(e.hp,6-damage);assert.equal(p.shield,10);assert.equal(e.damageTaken||0,damage);E.updateEncounter(e,p,{},.01);assert.equal(e.hp,6-damage);}});
test('fall damage never scales with difficulty',()=>{for(const scale of [1,1.5,2]){const {p,e}=drop(4);e.combatDamage=scale;E.updateEncounter(e,p,{},.01);assert.equal(e.hp,4,'×'+scale);}});
test('a fall is forgiven while the player is still protected after respawning or being hit',()=>{
  // Reaparecer concede 3 s de protección: caer en ese margen no quita vida ni queda pendiente.
  const {p,e}=drop(4);e.invincible=3;E.updateEncounter(e,p,{},.01);assert.equal(e.hp,6);assert.equal(e.damageTaken||0,0);assert.equal(p.fallDamage,0);assert.ok(!(p.hurt>0));
  e.invincible=0;E.updateEncounter(e,p,{},.01);assert.equal(e.hp,6,'el golpe perdonado no se cobra después');
  // Sin protección, la misma caída sí duele.
  const next=drop(4);E.updateEncounter(next.e,next.p,{},.01);assert.equal(next.e.hp,4);
});
test('fatal landing cannot be healed by attacking on the same frame',()=>{const {p,e}=drop(12);E.updateEncounter(e,p,{fire:true},.01);assert.equal(e.hp,0);assert.equal(e.dead,true);});
test('jetpack arrests falling and starts a fresh drop when disabled',()=>{const p=P.createPlayer();p.y=100;p.grounded=false;p.fallPeak=-600;p.jetpack=true;P.step(p,{},.01,[]);assert.equal(p.fallPeak,p.y);P.step(p,{jetpackPressed:true},.01,[{x:0,y:180,w:729}]);for(let i=0;i<120&&!p.grounded;i++)P.step(p,{},.01,[{x:0,y:180,w:729}]);assert.equal(p.fallDamage,0);});
