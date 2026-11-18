const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../difficulty.js'),E=require('../encounter.js'),P=require('../physics.js'),F=require('../final-boss.js');
test('four difficulties progressively scale combat while preserving player health',()=>{
  assert.deepEqual(D.levels.map(l=>l.name),['Novato','Normal','Fuerte','Extrema']);
  let previous=0;
  for(const level of D.levels){const e=E.createEncounter(),p=P.createPlayer();D.apply(e,level.id);
    assert.ok(e.boss.maxHp>previous);previous=e.boss.maxHp;
    assert.equal(e.maxHp,5);assert.equal(e.hp,5);
    E.hurtPlayer(e,p,p.x+40,true);assert.equal(e.hp,5-level.damage);assert.equal(e.invincible,level.grace);
    e.invincible=0;p.shield=1;const hp=e.hp;E.hurtPlayer(e,p,p.x+40,true);assert.equal(e.hp,hp);assert.equal(p.shield,0);
  }
});
test('normal retains the original enemy health and damage',()=>{
  const e=E.createEncounter();D.apply(e,'normal');assert.equal(e.enemies[0].hp,3);assert.equal(e.boss.hp,18);assert.equal(e.finalBoss.hp,32);assert.equal(e.combatDamage,1);
});
test('switching difficulty preserves wounds, deaths and encounter activation',()=>{
  const e=E.createEncounter();e.boss.hp=9;e.enemies[0].hp=0;e.enemies[0].death=.4;e.finalBoss.hp=16;
  D.apply(e,'extrema');assert.equal(e.boss.hp/e.boss.maxHp,.5);assert.equal(e.finalBoss.hp/e.finalBoss.maxHp,.5);assert.equal(e.boss.active,false);assert.equal(e.enemies[0].hp,0);assert.equal(e.enemies[0].death,.4);
  const hp=e.boss.hp;D.apply(e,'extrema');assert.equal(e.boss.hp,hp);
  D.apply(e,'normal');assert.equal(e.boss.hp,9);assert.equal(e.finalBoss.hp,16);
});
test('final boss mutation and subsequent difficulty changes retain the chosen scale',()=>{
  for(const level of D.levels){const e=E.createEncounter();D.apply(e,level.id);e.finalBoss.active=true;F.damage(e.finalBoss,9999);
    assert.equal(e.finalBoss.stage,2);assert.equal(e.finalBoss.maxHp,Math.round(64*level.health));assert.equal(e.finalBoss.hp,e.finalBoss.maxHp);
    D.apply(e,'normal');assert.equal(e.finalBoss.maxHp,64);assert.equal(e.finalBoss.hp,64);
  }
});
test('difficulty persists, validates stored values and tolerates unavailable storage',()=>{
  const map=new Map(),store={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  assert.equal(D.load(store),'normal');assert.equal(D.save('fuerte',store),true);assert.equal(D.load(store),'fuerte');
  const e=E.createEncounter();D.apply(e,D.load(store));assert.equal(e.combatDamage,2);
  const bad={getItem(){return 'unknown';},setItem(){throw Error('blocked');}};assert.equal(D.load(bad),'normal');assert.equal(D.save('novato',bad),false);
  assert.equal(D.load({getItem(){throw Error('blocked');}}),'normal');
});
