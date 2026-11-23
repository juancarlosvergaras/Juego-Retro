const test=require('node:test');
const assert=require('node:assert/strict');
const Physics=require('../physics'),Arsenal=require('../arsenal'),Difficulty=require('../difficulty');
const Encounter=require('../encounter'),Mission=require('../mission-combat'),Powers=require('../powers');
const Forms=require('../zombie-form'),Progress=require('../progression'),Rig=require('../oil-rig');

test('una skin ocupa el mismo espacio al entrar, transformarse y retomar una partida',()=>{
  const p=Physics.createPlayer();
  assert.equal(p.form,'soldier');
  const unlocked={zombieUnlocked:true,robotUnlocked:true,fighterUnlocked:true,tankUnlocked:true,heroUnlocked:true};
  for(const id of Forms.forms(unlocked,true)){
    const live=Object.assign(Physics.createPlayer(),unlocked),saved={...unlocked};
    if(id!=='soldier')assert.ok(Forms.change({won:true},live,id));
    Forms.restoreBody(saved,id,true);
    assert.deepEqual([saved.form,saved.w,saved.h],[live.form,live.w,live.h],id);
  }
  Forms.restoreBody(p,'hero');
  assert.equal(p.form,'soldier');
});

test('la animación de cambio de forma solo bloquea el ataque hasta su último cuadro',()=>{
  for(const first of [true,false]){
    const {e,p,step}=shooter(first,'soldier',3,'normal');
    p.heroUnlocked=true;assert.ok(Forms.change(e,p,'hero'));
    step({fire:true});assert.equal(e.shotSerial,undefined);
    // Los mundos con introducción propia pueden suspender el combate durante la transición.
    p.transform=0;step({fire:true});assert.equal(e.shotSerial,1);
  }
});

function shooter(first,form,slot,level){
  const e=first?Encounter.createEncounter():Mission.create(Arsenal.createInventory());
  const p=Object.assign(Physics.createPlayer(),{x:300,y:800,facing:1,aim:{x:1,y:0}});
  Forms.setBody(p,form);e.enemies=[];
  e.inventory={selected:slot,secondary:4,owned:[1,2,3,4,5,6,7,8,9],ammo:{3:45,4:20,5:44,6:8,7:9,8:9,9:10}};
  const powers=Powers.create(),profile=Progress.fresh();
  if(first)Difficulty.apply(e,level);else Difficulty.applyPlayerDamage(e,level);
  const step=input=>first?Encounter.updateEncounter(e,p,input,1/120,[]):
    Mission.update(e,p,input,1/120,[],powers,profile,{left:0,right:960,top:500,bottom:940});
  return {p,e,step};
}

test('La Obra y los mundos shooter producen la misma descarga, postura, munición y cadencia',()=>{
  for(const form of ['soldier','robot','fighter','hero','tank','wolf','zombie']){
    const slots=form==='soldier'?[1,2,3,4,5,6,7,8,9]:[3];
    for(const slot of slots){
      const games=[true,false].map(first=>shooter(first,form,slot,'normal'));
      for(const g of games){
        g.step({fire:true});
        // Las dos entradas normales de cada mundo deben crear y mover los mismos proyectiles.
      }
      const snapshot=({p,e})=>({ammo:e.inventory.ammo,wait:e.cooldown,action:e.weaponAction,flash:e.flash,
        bullets:e.bullets.map(b=>[b.slot,b.x,b.y,b.vx,b.vy,b.damage,b.gravity,b.carShot]),
        fighter:p.fighterMove,wolf:p.wolfAttack?.kind,ray:e.zombieEffects?.map(f=>f.kind)});
      assert.deepEqual(snapshot(games[0]),snapshot(games[1]),form+' '+slot);
      if(!['wolf','zombie'].includes(form))assert.equal(games[0].e.shotSerial,1);
      if(form==='zombie')assert.ok(games[0].e.zombieEffects.some(f=>f.kind==='ray'));
      if(form==='wolf')assert.ok(games[0].p.wolfAttack);
    }
  }
});

test('la dificultad y la resistencia de la skin se conservan en la obra, la calle y la cubierta petrolera',()=>{
  for(const level of Difficulty.levels)for(const form of ['soldier','wolf','zombie','robot','fighter','tank','hero']){
    const stage={rig:Rig.create(3,level.health),hp:100};
    const rig=Rig.equip(stage,Progress.fresh(),{},level.id);Forms.setBody(stage.rig.p,form);
    for(const {e,p} of [shooter(true,form,3,level.id),shooter(false,form,3,level.id),{e:rig.e,p:stage.rig.p}]){
      const hp=e.hp;
      assert.ok(Encounter.hurtPlayer(e,p,p.x+10,false,1));
      assert.equal(hp-e.hp,level.damage*(form==='zombie'?.5:1));
      assert.equal(e.invincible,level.grace);
      assert.equal(Encounter.hurtPlayer(e,p,p.x+10,false,1),false);
    }
  }
});

test('subir una escalera, colgarse o transformarse bloquea la descarga en ambos motores',()=>{
  for(const first of [true,false])for(const slot of [1,3,6])for(const state of [{ladder:{}},{rope:{}},{transform:.6}]){
    const {p,e,step}=shooter(first,'soldier',slot,'normal');Object.assign(p,state);
    const ammo={...e.inventory.ammo};step({fire:true});
    assert.deepEqual(e.inventory.ammo,ammo);assert.equal(e.weaponAction,undefined);assert.equal(e.bullets.length,0);
  }
});
