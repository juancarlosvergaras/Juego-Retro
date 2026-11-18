const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('../score.js'),E=require('../encounter.js');
test('score text originates at each reward, rises, fades and is never duplicated',()=>{
 const s=S.create(),e=E.createEncounter();e.enemies[0].hp=0;e.pickups[0].taken=true;
 assert.equal(S.sync(s,e),300);assert.equal(s.floating.length,2);
 const kill=s.floating[0],pickup=s.floating[1];assert.equal(kill.x,e.enemies[0].x);assert.equal(kill.y,e.enemies[0].y-48);assert.equal(pickup.x,e.pickups[0].x);assert.equal(pickup.points,100);
 S.sync(s,e);assert.equal(s.floating.length,2);
 const drawn=[],ctx={save(){},restore(){},strokeText(){},fillText(text,x,y){drawn.push({text,x,y,alpha:this.globalAlpha});}};
 S.draw(ctx,s);const initial=drawn[0];assert.equal(initial.text,'+200');S.tick(s,1.2);drawn.length=0;S.draw(ctx,s);assert.ok(drawn[0].y<initial.y);assert.ok(drawn[0].alpha<initial.alpha);
 S.tick(s,.31);assert.equal(s.floating.length,0);assert.equal(s.total,300);
});
test('challenge floating points share the player position and cannot be awarded twice',()=>{
 const s=S.create(),r={id:'stars',points:2000,label:'Tres estrellas',x:320,y:840};assert.equal(S.bonus(s,r),2000);assert.equal(s.floating[0].x,320);assert.equal(s.floating[0].y,805);assert.equal(S.bonus(s,r),0);assert.equal(s.floating.length,1);
});
test('awards exact values for kills and every collected item',()=>{const s=S.create(),e=E.createEncounter(),tanks=[{id:0,taken:true},{id:1,taken:false}];e.enemies[0].hp=0;e.boss.hp=0;e.finalBoss.hp=0;e.pickups[0].taken=true;e.medkits[0].taken=true;assert.equal(S.sync(s,e,tanks),200+500+1000+300);assert.equal(s.total,2000);assert.deepEqual(s.counts,{soldiers:1,subboss:1,boss:1,weapons:1,health:1,fuel:1});assert.equal(S.sync(s,e,tanks),0);});
test('checkpoint recreations cannot award the same enemy twice; a new adventure resets',()=>{const s=S.create(),e=E.createEncounter();e.enemies[0].hp=0;S.sync(s,e);const retry=E.createEncounter();retry.enemies[0].hp=0;S.sync(s,retry);assert.equal(s.total,200);retry.enemies[1].hp=0;S.sync(s,retry);assert.equal(s.total,400);assert.equal(S.create().total,0);});
test('full adventure totals match final itemized summary',()=>{const s=S.create(),e=E.createEncounter(),tanks=[{id:0,taken:true},{id:1,taken:true}];e.enemies.forEach(n=>n.hp=0);e.boss.hp=0;e.finalBoss.hp=0;e.pickups.forEach(n=>n.taken=true);e.medkits.forEach(n=>n.taken=true);S.sync(s,e,tanks);assert.equal(s.total,1800+500+1000+100*(e.pickups.length+e.medkits.length+2));assert.match(S.summary(s),new RegExp('TOTAL: '+s.total+' PUNTOS'));});
