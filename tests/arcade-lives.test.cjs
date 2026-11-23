const test = require('node:test');
const assert = require('node:assert/strict');
const progress = require('../progression');
const encounter = require('../encounter');
const road = require('../road-war');
const sea = require('../sea-war');

function storage() {
  const data = new Map();
  return {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)};
}

test('extra lives follow earned play points across thresholds, shops and mission changes', () => {
  const store = storage(), profile = progress.load(store);
  assert.equal(profile.lives, 3);
  progress.credit(profile, 4999, {repeat: true});
  assert.equal(profile.lives, 3);
  assert.ok(progress.buy(profile, 'speed').ok);
  progress.beginWorld(profile);
  progress.credit(profile, 1, {repeat: true});
  assert.equal(profile.lives, 4);
  progress.credit(profile, 10775);
  assert.equal(profile.lives, 6);
  assert.equal(profile.lifePoints, 775);
  progress.save(profile, store);
  const restored = progress.load(store);
  assert.deepEqual(restored, profile);
});

test('old profiles keep the remainder, and reloading a death cannot charge two lives', () => {
  const store = storage();
  store.setItem('obra10.progress.v1', JSON.stringify({wallet: 250, earned: 9900, heroUnlocked: true}));
  let profile = progress.load(store);
  assert.equal(profile.lives, 3);
  progress.credit(profile, 100);
  assert.equal(profile.lives, 4);
  const attempt = {};
  progress.loseLife(profile, attempt);
  progress.loseLife(profile, attempt);
  assert.equal(profile.lives, 3);
  for (let n=0; n<3; n++) progress.loseLife(profile, {});
  progress.save(profile, store);
  profile = progress.load(store);
  assert.equal(profile.lives, 0);
  assert.ok(progress.restartLives(profile, store));
  assert.equal(progress.load(store).lives, 3);
  assert.equal(profile.heroUnlocked, true);
  assert.equal(progress.restartLives(profile, store), false);
});

test('five seconds of protection cover bullets, falls, motorcycle and underwater hits', () => {
  const player = {form: 'soldier', shield: 0}, combat = {hp: 6}, world = {events: []};
  const hits = [() => encounter.hurtPlayer(combat, player, 80, true),
    () => {player.fallDamage=2; return encounter.applyFallDamage(combat, player);},
    () => road.hurt(world, player, combat), () => sea.hurt(world, player, combat)];
  for (const hit of hits) {
    Object.assign(combat, {hp: 6, dead: false, invincible: 0});
    world.hitWait=0;
    progress.protect(player);
    assert.ok(progress.respawnAlpha(player) < .25);
    assert.equal(hit(), false);
    progress.tickProtection(player, 4.9);
    assert.equal(hit(), false);
    assert.equal(combat.hp, 6);
    progress.tickProtection(player, .11);
    assert.equal(progress.respawnAlpha(player), 1);
    assert.equal(hit(), true);
    assert.ok(combat.hp < 6);
  }
});

test('shots hit the fighter and the chase car again when respawn protection expires', () => {
  const district = require('../quimera'), chase = require('../fuga');
  const arena = district.create(), car = chase.create();
  car.mode = 'race';
  const fighter = arena.player;
  function fireInArena() {
    arena.shots.push({x: fighter.x, y: fighter.y, age: 0, vx: 0, damage: 8});
    district.update(arena, {}, 1/120);
  }
  function fireOnRoad() {
    car.shots.push({x: car.x, z: car.z+1, vx: 0, speed: 0});
    chase.update(car, {}, 1/120);
  }
  for (const [actor, hit] of [[fighter, fireInArena], [car, fireOnRoad]]) {
    const hp = actor.hp;
    progress.protect(actor);
    hit();
    assert.equal(actor.hp, hp);
    progress.tickProtection(actor, 5);
    hit();
    assert.ok(actor.hp < hp);
  }
});
