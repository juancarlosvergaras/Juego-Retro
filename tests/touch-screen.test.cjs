const test = require('node:test');
const assert = require('node:assert/strict');
const {bindPads} = require('../touch-screen');

function surface() {
  const handlers = new Map();
  return {
    classList: new Set(),
    addEventListener(name, fn) { handlers.set(name, fn); },
    fire(name, pointerId, options = {}) {
      handlers.get(name)?.({pointerId, target: this, button: 0, buttons: 1,
        pointerType: 'touch', clientX: 10, clientY: 10, preventDefault() {}, ...options});
    },
    getBoundingClientRect() { return {left: 0, top: 0, right: 44, bottom: 44, width: 44}; }
  };
}

test('independent fingers release when sliding off, losing capture, or cancelling the game', () => {
  const win = surface(), stick = surface(), attack = surface(), released = [];
  for (const el of [stick, attack]) el.classList.remove = el.classList.delete;
  const pad = bindPads(win, [stick, attack], {stick, allow: () => true, down() {}, up: id => released.push(id)});
  stick.fire('pointerdown', 1);
  attack.fire('pointerdown', 2);
  attack.fire('pointerdown', 3);
  stick.fire('pointerdown', 4);
  win.fire('pointermove', 2, {clientX: 65});
  win.fire('lostpointercapture', 3, {target: stick});
  assert.deepEqual(released, [2]);
  assert.ok(stick.classList.has('held') && attack.classList.has('held'));
  win.fire('lostpointercapture', 3, {target: attack});
  win.fire('pointerup', 3);
  assert.equal(attack.classList.has('held'), false);
  win.fire('pointercancel', 1);
  assert.equal(stick.classList.has('held'), false);
  attack.fire('pointerdown', 5);
  pad.clear();
  pad.clear();
  assert.deepEqual(released, [2, 3, 1, 5]);
});
