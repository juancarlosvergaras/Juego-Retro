const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../arsenal.js'),P=require('../physics.js'),E=require('../encounter.js');
test('eight directions preserve projectile speed and consume one round',()=>{
  for(const input of [{right:true},{left:true},{aimUp:true},{aimDown:true},{aimUp:true,right:true},{aimUp:true,left:true},{aimDown:true,right:true},{aimDown:true,left:true}]){
    const inv=A.createInventory(),p=P.createPlayer();p.aim=A.aimDirection(input);const b=A.fire(inv,p).bullets[0];
    assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-510)<.001);assert.equal(inv.ammo[3],35);
    assert.ok(Math.abs(b.vx/510-p.aim.x)<.001&&Math.abs(b.vy/510-p.aim.y)<.001);
    assert.deepEqual({x:b.x,y:b.y},A.muzzle(p));
  }
});
test('shotgun spread rotates upward and uses one shell for five pellets',()=>{const inv=A.createInventory();inv.selected=4;inv.ammo[4]=2;const p=P.createPlayer();p.aim={x:0,y:-1};const b=A.fire(inv,p).bullets;assert.equal(b.length,5);assert.equal(inv.ammo[4],1);assert.ok(b.every(x=>x.vy<0));assert.ok(b.some(x=>x.vx<0)&&b.some(x=>x.vx>0));});
test('wolf ground kick stays grounded, has cooldown and ends',()=>{const e=E.createEncounter(),p=P.createPlayer();E.transformWolf(e,p);p.transform=0;E.updateEncounter(e,p,{kick:true},1/120);assert.ok(p.kick>0);assert.equal(p.kickAir,false);assert.equal(p.grounded,true);const duration=p.kick;E.updateEncounter(e,p,{kick:true},1/120);assert.ok(p.kick<duration);for(let i=0;i<80;i++)E.updateEncounter(e,p,{},1/120);assert.equal(p.kick,0);});
test('airborne wolf kick releases rope and produces a flying attack',()=>{const e=E.createEncounter(),p=P.createPlayer();E.transformWolf(e,p);p.transform=0;p.grounded=false;p.rope={};p.facing=-1;E.updateEncounter(e,p,{kick:true},1/120);assert.equal(p.kickAir,true);assert.equal(p.rope,null);assert.ok(p.vx< -300);const x=p.x;P.step(p,{},1/120,[]);assert.ok(p.x<x);});
test('soldier cannot use wolf kicks and wolf cooldown prevents simultaneous claw',()=>{const e=E.createEncounter(),p=P.createPlayer();E.updateEncounter(e,p,{kick:true},1/120);assert.ok(!p.kick);E.transformWolf(e,p);p.transform=0;E.updateEncounter(e,p,{kick:true,fire:true},1/120);assert.ok(p.kick>0);assert.equal(p.claw,0);});

test('shots originate at the animated hand and animation starts only for real shots',()=>{const e=E.createEncounter(),p=P.createPlayer();p.aim={x:1,y:0};p.aimHeight=20;assert.equal(A.muzzle(p).y,p.y-36);E.updateEncounter(e,p,{fire:true},1/120);assert.equal(e.weaponAction.slot,3);assert.equal(e.weaponAction.age,0);E.updateEncounter(e,p,{},.3);const age=e.weaponAction.age;e.inventory.ammo[3]=0;E.updateEncounter(e,p,{fire:true},1/120);assert.ok(e.weaponAction.age>age);assert.equal(e.inventory.ammo[3],0);});
test('bow stays ahead of the support arm and arrows leave its tip in both directions',()=>{
 const S=require('../soldier-animation');
 for(const facing of [-1,1])for(const vy of [0,300])for(const vertical of [-1,0,1]){
  const p=Object.assign(P.createPlayer(),{facing,grounded:vy===0,vy,aim:A.aimDirection({[facing<0?'left':'right']:true,aimUp:vertical<0,aimDown:vertical>0},facing)}),e={inventory:{selected:7},weaponAction:{slot:7,age:0,duration:.6}};
  const hand=S.grip(p,{},e),base=S.grip(p,{}, {...e,inventory:{selected:3},weaponAction:{...e.weaponAction,slot:3}}),angle=Math.atan2(p.aim.y,p.aim.x*facing),tip=A.muzzle(p,7);
  assert.ok(Math.abs(Math.hypot(hand.x-base.x,hand.y-base.y)-9)<1e-8);
  assert.ok(Math.abs(tip.x-(p.x+facing*(hand.x+Math.cos(angle)*7)))<1e-8);
  assert.ok(Math.abs(tip.y-(p.y+hand.y+Math.sin(angle)*7))<1e-8);
  const shot=A.fire({selected:7,ammo:{7:1}},p);assert.equal(shot.bullets[0].x,tip.x);assert.equal(shot.bullets[0].y,tip.y);
 }
});

test('sustained diagonal fire keeps shooting while walking in both directions',()=>{
 for(const dir of [-1,1]){
  const e=E.createEncounter(),p=P.createPlayer(),ps=[{x:0,y:100,w:729,thickness:15}];e.enemies=[];e.boss.hp=0;e.won=true;
  Object.assign(p,{x:dir>0?100:600,y:100,facing:dir,grounded:true});
  const input={left:dir<0,right:dir>0,aimUp:true,fire:true};const start=p.x;let shots=0;
  for(let i=0;i<90;i++){p.aim=A.aimDirection(input,p.facing);P.step(p,input,1/60,ps);const ammo=e.inventory.ammo[3];E.updateEncounter(e,p,input,1/60,ps);if(e.inventory.ammo[3]<ammo){shots++;const b=e.bullets.filter(b=>!b.enemy).at(-1);assert.ok(b);assert.equal(Math.sign(b.vx),dir);assert.ok(b.vy<0);}}
  assert.ok(shots>=6);assert.ok((p.x-start)*dir>100);
 }
});

test('arrow controls honor actual navigation keys even when physical codes belong to the keypad',()=>{for(const [key,code] of [['ArrowRight','Numpad6'],['ArrowLeft','Numpad4'],['ArrowUp','Numpad8'],['ArrowDown','Numpad2']]){assert.equal(A.controlCode({key,code}),key);assert.equal(A.controlCode({key,code:key}),key);}assert.equal(A.controlCode({key:'6',code:'Numpad6'}),'Numpad6');});
test('arrow diagonal chords shoot symmetrically regardless of which key arrives first',()=>{for(const right of [true,false]){const horizontal=right?'ArrowRight':'ArrowLeft';for(const order of [[horizontal,'ArrowUp','KeyJ'],['KeyJ',horizontal,'ArrowUp'],['ArrowUp','KeyJ',horizontal]]){const held=new Set(order.map(code=>A.controlCode({code,key:code}))),p=P.createPlayer();p.facing=right?1:-1;p.aim=A.aimDirection({right:held.has('ArrowRight'),left:held.has('ArrowLeft'),aimUp:held.has('ArrowUp')},p.facing);const inv=A.createInventory(),b=A.fire(inv,p).bullets[0];assert.equal(inv.ammo[3],35);assert.equal(Math.sign(b.vx),right?1:-1);assert.ok(b.vy<0);}}});

test('shared shooting movement preserves aim and leaves aerial and hook controls available',()=>{
 const input={fire:true,up:true,down:true,right:true};const p={form:'soldier'};const move=A.movementInput(p,input);assert.equal(move.up,false);assert.equal(move.down,false);assert.equal(move.right,true);assert.equal(input.up,true);
 for(const state of [{form:'wolf'},{form:'soldier',jetpack:true},{form:'soldier',rope:{}}])assert.equal(A.movementInput(state,input),input);
 for(const action of ['jumpPressed','jetpackPressed']){const keys={...input,[action]:true};assert.equal(A.movementInput(p,keys),keys);}
});

test('first mission buffers one diagonal tap during cooldown without extra shots',()=>{
 const p=Object.assign(P.createPlayer(),{form:'soldier',aim:A.aimDirection({aimUp:true,right:true})}),e=E.createEncounter(),buffer=A.createFireBuffer();e.enemies=[];e.boss.hp=0;e.finalBoss.hp=0;e.cooldown=.1;buffer.press(3);let queued=true;
 for(let i=0;i<60;i++){const before=e.weaponAction;E.updateEncounter(e,p,{fire:queued},1/120,[]);queued=buffer.tick(1/120,p,e,before);}
 assert.equal(e.inventory.ammo[3],35);assert.ok(Math.abs(e.lastAim.x-Math.SQRT1_2)<1e-10);assert.ok(Math.abs(e.lastAim.y+Math.SQRT1_2)<1e-10);assert.equal(queued,false);
});

test('fire buffer cancels on weapon changes, no ammunition, pause clear and expiry',()=>{
 for(const reason of ['weapon','empty','pause','expiry','rope']){const buffer=A.createFireBuffer(),p=P.createPlayer(),e=E.createEncounter();buffer.press(3);e.cooldown=1;
 if(reason==='weapon')e.inventory.selected=1;if(reason==='empty')e.inventory.ammo[3]=0;if(reason==='pause')buffer.clear();if(reason==='rope')p.rope={};
 assert.equal(buffer.tick(reason==='expiry'?.2:.01,p,e,e.weaponAction),false);
 }
});


test('both missions share trigger mapping, including independent pointer and keyboard release',()=>{
 for(const key of A.fireKeys){const held=new Set([key]);assert.equal(A.triggerInput(held).fire,true);held.clear();assert.equal(A.triggerInput(held).fire,false);}
 const keys=new Set(['ArrowUp','ArrowLeft']);assert.equal(A.triggerInput(keys).fire,false);
 assert.equal(A.triggerInput(keys,true).fireHeld,true);keys.add('KeyJ');assert.equal(A.triggerInput(keys,false).fireHeld,true);
 keys.delete('KeyJ');assert.deepEqual(A.triggerInput(keys,false,true),{fireHeld:false,fire:true,aimRight:false,diagonalUp:false,diagonalDown:false});
 for(const key of ['KeyQ','KeyC','KeyO','KeyM'])for(const facing of [-1,1]){
  const controls=A.triggerInput(new Set([key])),p=Object.assign(P.createPlayer(),{facing});p.aim=A.aimDirection(controls,facing);
  const e=E.createEncounter();e.enemies=[];e.boss.hp=0;e.finalBoss.hp=0;E.updateEncounter(e,p,controls,1/120,[]);
  assert.equal(e.inventory.ammo[3],35);const b=e.bullets.find(b=>!b.enemy);assert.ok(b);assert.equal(Math.sign(b.vx),['KeyO','KeyM'].includes(key)?1:facing);assert.equal(Math.sign(b.vy),['KeyC','KeyM'].includes(key)?1:-1);
 }
});
