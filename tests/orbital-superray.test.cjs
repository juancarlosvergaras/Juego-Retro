const {test}=require('node:test'),assert=require('node:assert/strict'),W=require('../powers'),C=require('../progression'),E=require('../encounter'),P=require('../physics'),A=require('../arsenal');
test('orbital activates without a nearby target, pierces floors both sides and hits once',()=>{const s=W.create(),e=E.createEncounter(),p=P.createPlayer(),profile=C.fresh();profile.owned=['orbital'];profile.equipped='orbital';p.x=350;p.y=1600;e.enemies=[{x:220,y:500,hp:100},{x:480,y:1500,hp:100},{x:600,y:500,hp:100}];const hp=e.hp;W.update(s,e,p,profile,true,.01);assert.equal(s.cooldowns.orbital,90);for(let i=0;i<210;i++)W.update(s,e,p,profile,false,.01,[{x:0,y:1000,w:729}]);assert.deepEqual(e.enemies.map(n=>n.hp),[100,40,100]);assert.equal(e.hp,hp);assert.equal(s.beams.length,0);W.update(s,e,p,profile,true,0);assert.equal(s.beams.length,0);W.update(s,e,p,profile,true,91);assert.equal(s.cooldowns.orbital,90);});
test('orbital shakes during impact and damages an engaged final boss heavily',()=>{const s=W.create(),e=E.createEncounter(),p=P.createPlayer(),profile={owned:['orbital'],equipped:'orbital'};e.won=true;p.x=e.finalBoss.x;p.y=e.finalBoss.y;e.finalBoss.active=true;e.finalBoss.hp=e.finalBoss.maxHp=100;W.update(s,e,p,profile,true,.5);assert.equal(e.finalBoss.hp,40);assert.ok(s.shake>0);W.update(s,e,p,profile,false,2);assert.equal(s.shake,0);});
test('the orbital strike is worth its price: catalogue, damage and description agree',()=>{
 const orbital=C.catalog.find(c=>c.id==='orbital'),powers=C.catalog.filter(c=>c.kind==='power'&&c.cost>0);
 assert.equal(orbital.cost,Math.max(...powers.map(c=>c.cost)),'sigue siendo el poder más caro');
 assert.equal(orbital.damage,60);assert.equal(orbital.cooldown,90);
 // El texto anuncia las cifras reales, no promete "solo jefes" y no habla en píxeles.
 assert.ok(orbital.text.includes('Daño: '+orbital.damage+'.'));assert.ok(orbital.text.includes('Recarga: '+orbital.cooldown+' s.'));
 assert.doesNotMatch(orbital.text,/px|Solo afecta a jefes/);assert.match(orbital.text,/todos los enemigos/);
 // Las mejoras de daño del jugador multiplican la cifra del catálogo.
 const s=W.create(),e=E.createEncounter(),p=P.createPlayer(),profile={owned:['orbital'],equipped:'orbital'};p.x=400;p.damageBonus=1.5;
 e.enemies=[{x:400,y:600,hp:200}];W.update(s,e,p,profile,true,.5,[],{left:0,right:729,top:400,bottom:900});
 assert.equal(e.enemies[0].hp,200-60*1.5);
});
test('right diagonal shots have positive horizontal velocity and clear the real ground',()=>{for(const down of [false,true]){const e=E.createEncounter(),p=P.createPlayer();e.enemies=[];p.facing=-1;p.aim=A.aimDirection({aimRight:true,diagonalUp:!down,diagonalDown:down},p.facing);p.facing=Math.sign(p.aim.x);E.updateEncounter(e,p,{fire:true},1/120,P.createPlatforms());assert.equal(e.inventory.ammo[3],35);const b=e.bullets.find(b=>!b.enemy);assert.ok(b&&b.vx>0);assert.equal(Math.sign(b.vy),down?1:-1);}});

test('orbital respects the visible rectangle and never wakes inactive bosses',()=>{
 const s=W.create(),e=E.createEncounter(),p=P.createPlayer(),profile={owned:['orbital'],equipped:'orbital'},view={left:200,right:500,top:400,bottom:900};
 p.x=400;p.y=850;e.won=true;Object.assign(e.boss,{x:400,y:700,active:false});Object.assign(e.finalBoss,{x:400,y:800,active:false});
 e.enemies=[{x:400,y:450,hp:100},{x:400,y:350,hp:100},{x:400,y:960,hp:100},{x:530,y:700,hp:100}];
 W.update(s,e,p,profile,true,.5,[],view);
 assert.deepEqual(e.enemies.map(n=>n.hp),[40,100,100,100]);assert.equal(e.boss.hp,18);assert.equal(e.boss.active,false);assert.equal(e.finalBoss.hp,32);assert.equal(e.finalBoss.active,false);
});
test('active white wolf is only damaged when visible and inside the column',()=>{
 for(const visible of [false,true]){const s=W.create(),e=E.createEncounter(),p=P.createPlayer(),profile={owned:['orbital'],equipped:'orbital'};p.x=400;Object.assign(e.boss,{x:400,y:visible?600:200,active:true});W.update(s,e,p,profile,true,.5,[],{left:0,right:729,top:400,bottom:900});assert.equal(e.boss.hp,visible?0:18);}
});
test('beam checks the current viewport when impact begins after charging',()=>{
 const s=W.create(),e=E.createEncounter(),p=P.createPlayer(),profile={owned:['orbital'],equipped:'orbital'};p.x=400;e.enemies=[{x:400,y:600,hp:40}];
 W.update(s,e,p,profile,true,.1,[],{left:0,right:729,top:400,bottom:900});
 W.update(s,e,p,profile,false,.4,[],{left:0,right:729,top:1000,bottom:1500});assert.equal(e.enemies[0].hp,40);
});
