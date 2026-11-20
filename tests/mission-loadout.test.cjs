const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../campaign.js'),A=require('../arsenal.js'),P=require('../physics.js'),U=require('../progression.js'),V=require('../powers.js'),Combat=require('../mission-combat.js');
function memory(){const map=new Map();return{getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};}
test('mission selection inherits the last played first-mission inventory instead of resetting it',()=>{
 const store=memory(),inv={selected:6,owned:[1,2,3,6,9],ammo:{3:0,6:2,9:4}};
 C.remember(store,{fuel:321,shield:4},{hp:7,inventory:inv},{total:6300},{cooldowns:{orbital:73}});
 C.write(store,{level:2,score:0,inventory:A.createInventory()});const load=C.loadout(store,'select');
 assert.deepEqual(C.inventory(load.inventory),inv);assert.equal(load.score,6300);assert.equal(load.fuel,321);assert.equal(load.cooldowns.orbital,73);
 const local={inventory:{...inv,ammo:{3:0,6:1,9:3}},cooldowns:{orbital:55},fuel:210};
 assert.deepEqual(C.inventory(C.loadout(store,'resume',local).inventory),local.inventory);assert.equal(C.loadout(store,'resume',local).fuel,210);
});
test('permanent jumps, fuel capacity, health and purchased powers carry into mission two',()=>{
 const store=memory(),profile=U.fresh();Object.assign(profile.levels,{jump:3,jet:2,life:3,speed:2,damage:2,rate:1});profile.owned=['wave','orbital'];profile.equipped='orbital';profile.shield=6;U.save(profile,store);
 const p=P.createPlayer(),e=Combat.create(A.createInventory()),loaded=U.load(store);U.apply(loaded,p,e,true);
 assert.equal(p.maxJumps,5);assert.equal(p.fuelMax,2276);assert.equal(e.maxHp,11);assert.equal(p.shield,6);assert.equal(p.damageBonus,1.2);assert.equal(p.rateBonus,1.1);assert.deepEqual(loaded.owned,['wave','orbital']);assert.equal(loaded.equipped,'orbital');
});
test('all inherited ranged weapons consume their own ammo; melee and locked weapons do not grant ammo',()=>{
 for(let slot=1;slot<=9;slot++){
  const inv={owned:[slot],selected:slot,ammo:{[slot]:2}},e=Combat.create(inv),p=Object.assign(P.createPlayer(),{x:1200,y:500,form:'soldier',aim:{x:1,y:0}}),powers=V.create(),profile=U.fresh();
  Combat.update(e,p,{fire:true},1/120,[],powers,profile,{left:900,right:1800,top:0,bottom:700});
  assert.equal(inv.ammo[slot],slot<=2?2:1);assert.equal(e.weaponAction.slot,slot);assert.equal(e.bullets.length,slot<=2?0:slot===4?5:1);
  if(slot>2){e.cooldown=0;inv.ammo[slot]=0;e.weaponAction=null;Combat.update(e,p,{fire:true},.01,[],powers,profile);assert.equal(e.weaponAction,null);assert.equal(inv.ammo[slot],0);}
 }
 const inv=A.createInventory();assert.equal(A.selectWeapon(inv,6),false);assert.equal(inv.selected,3);
});
test('missiles travel beyond the first mission width and grenades bounce on actual mission floors',()=>{
 const profile=U.fresh(),powers=V.create(),p=Object.assign(P.createPlayer(),{x:1200,y:620,form:'soldier',aim:{x:1,y:0}}),e=Combat.create({owned:[6,9],selected:6,ammo:{6:2,9:2}}),floor=[{x:0,y:620,w:18000,kind:'ground',thickness:20}];
 Combat.update(e,p,{fire:true},.01,floor,powers,profile);for(let i=0;i<30;i++)Combat.update(e,p,{},.01,floor,powers,profile);assert.ok(e.bullets[0].x>1300);
 e.cooldown=0;e.inventory.selected=9;Combat.update(e,p,{fire:true},.01,floor,powers,profile);for(let i=0;i<180;i++)Combat.update(e,p,{},.01,floor,powers,profile);const grenade=e.bullets.find(b=>b.slot===9);assert.ok(grenade);assert.ok(grenade.y<=616);for(let i=0;i<130;i++)Combat.update(e,p,{},.01,floor,powers,profile);assert.ok(e.explosions.length);
});
test('purchased powers use real cooldowns and a drone without a target does not consume its cooldown',()=>{
 const profile=U.fresh(),p=Object.assign(P.createPlayer(),{x:1400,y:620,grounded:true,form:'soldier'}),e=Combat.create(A.createInventory()),powers=V.create();profile.owned=['wave','drone','orbital'];profile.equipped='wave';
 Combat.update(e,p,{power:true},.01,[],powers,profile);assert.equal(powers.cooldowns.wave,10);assert.equal(powers.effects[0].kind,'wave');
 Combat.update(e,p,{power:true},.01,[],powers,profile);assert.equal(powers.effects.length,1);assert.ok(powers.cooldowns.wave<10);
 profile.equipped='drone';assert.match(Combat.update(e,p,{power:true},.01,[],powers,profile),/No hay enemigos/);assert.equal(powers.cooldowns.drone,undefined);
 profile.equipped='orbital';Combat.update(e,p,{power:true},.01,[],powers,profile);assert.equal(powers.beams.length,1);assert.equal(powers.cooldowns.orbital,90);
});
