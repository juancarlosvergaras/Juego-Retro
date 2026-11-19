(function (root) {
  'use strict';

  const QUERY = '(max-width: 720px), (pointer: coarse), (max-width: 1100px) and (max-height: 500px)';

  function contacts(release) {
    const held = new Map();
    function end(id) {
      const item = held.get(id);
      if (!item) return null;
      held.delete(id);
      release(id, [], item.element);
      return item;
    }
    return {
      held, end,
      start(id, element) { end(id); held.set(id, {element}); },
      clear() { for (const id of [...held.keys()]) end(id); }
    };
  }

  function bindPads(win, elements, {allow, down, up, move, stick}) {
    function hasContact(el) {
      return [...pad.held.values()].some(item => item.element === el);
    }
    const pad = contacts((id, actions, el) => {
      up(id, el);
      if (!hasContact(el)) el.classList.remove('held');
      if (el.hasPointerCapture?.(id)) el.releasePointerCapture(id);
    });
    for (const el of elements) {
      el.addEventListener('pointerdown', ev => {
        if (ev.button > 0 || el.disabled || !allow(el) || (el === stick && hasContact(el))) return;
        ev.preventDefault();
        pad.start(ev.pointerId, el);
        el.classList.add('held');
        try { el.setPointerCapture(ev.pointerId); } catch { /* Window handlers still see uncaptured pointers. */ }
        down(ev.pointerId, el, ev);
      });
    }
    win.addEventListener('pointermove', ev => {
      const el = pad.held.get(ev.pointerId)?.element;
      if (!el) return;
      if (ev.cancelable) ev.preventDefault();
      const box = el.getBoundingClientRect();
      const margin = el === stick ? box.width * .5 : 5;
      const outside = ev.clientX < box.left - margin || ev.clientX > box.right + margin ||
        ev.clientY < box.top - margin || ev.clientY > box.bottom + margin;
      if (outside || el.disabled || !allow(el) || (ev.buttons === 0 && ev.pointerType === 'mouse')) pad.end(ev.pointerId);
      else move?.(ev.pointerId, el, ev);
    }, {capture: true, passive: false});
    for (const event of ['pointerup', 'pointercancel']) win.addEventListener(event, ev => pad.end(ev.pointerId), true);
    win.addEventListener('lostpointercapture', ev => {
      if (pad.held.get(ev.pointerId)?.element === ev.target) pad.end(ev.pointerId);
    }, true);
    return {clear: pad.clear};
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {contacts, bindPads, QUERY};
    return;
  }

  const doc = root.document;
  const media = root.matchMedia(QUERY);
  const html = doc.documentElement;
  const card = doc.querySelector('.game-card');
  const toolbar = card.querySelector('.game-toolbar');
  const stage = card.querySelector('.viewport,.highway');
  const special = !!card.querySelector('.drive-touch,.touch');
  const resets = new Set();
  function reset() { for (const clear of resets) clear(); }

  const barButton = doc.createElement('button');
  barButton.type = 'button';
  barButton.className = 'touch-fullscreen';
  toolbar.append(barButton);
  const buttons = [barButton];
  const menuPlay = doc.querySelector('#menu-play');
  if (menuPlay) {
    const home = doc.createElement('button');
    home.type = 'button';
    home.className = 'secondary touch-home-full';
    menuPlay.after(home);
    buttons.push(home);
  }

  const rail = doc.createElement('div');
  rail.className = 'play-notices';
  const detail = doc.createElement('button');
  detail.className = 'play-notices-toggle';
  detail.type = 'button';
  detail.textContent = 'Avisos';
  detail.setAttribute('aria-expanded', 'false');
  detail.setAttribute('aria-controls', 'play-notice-text');
  const copy = doc.createElement('div');
  copy.className = 'play-notice-text';
  copy.id = 'play-notice-text';
  rail.append(detail, copy);
  card.insertBefore(rail, stage);
  detail.onclick = () => detail.setAttribute('aria-expanded', String(rail.classList.toggle('open')));

  let fallback = false;
  const native = () => doc.fullscreenElement || doc.webkitFullscreenElement;
  function syncScreen() {
    const expanded = !!native() || fallback;
    html.classList.toggle('game-expanded', expanded);
    html.classList.toggle('game-expanded-fallback', fallback && media.matches);
    if (fallback && media.matches) toolbar.insertBefore(detail, barButton);
    else if (detail.parentElement !== rail) rail.prepend(detail);
    for (const b of buttons) {
      b.setAttribute('aria-pressed', String(expanded));
      b.textContent = expanded ? 'Salir' : 'Pantalla completa';
      b.setAttribute('aria-label', fallback ? 'Salir de vista ampliada' : expanded ? 'Salir de pantalla completa' : 'Pantalla completa');
    }
  }
  async function toggle() {
    reset();
    if (native()) {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) await exit.call(doc);
    } else if (fallback) {
      fallback = false;
    } else {
      const enter = html.requestFullscreen || html.webkitRequestFullscreen;
      try {
        if (enter) await enter.call(html);
        fallback = !native();
      } catch { fallback = true; }
    }
    syncScreen();
    return fallback ? 'Vista ampliada activa.' : native() ? 'Pantalla completa activa.' : 'Vista normal.';
  }
  for (const b of buttons) b.addEventListener('click', toggle);
  for (const event of ['fullscreenchange', 'webkitfullscreenchange']) {
    doc.addEventListener(event, () => { fallback = false; reset(); syncScreen(); });
  }
  root.addEventListener('keydown', ev => {
    if (fallback && ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      fallback = false;
      syncScreen();
      reset();
    }
  }, true);

  // Move the live notice nodes so game updates, dismiss buttons and desktop layout stay in sync.
  const marks = new Map();
  const selector = '#radio,#tutorial-hint,#boss-banner,#context-two,#message.toast,#notice';
  function arrange() {
    if (media.matches) {
      for (const el of card.querySelectorAll(selector)) {
        if (marks.has(el)) continue;
        const mark = doc.createComment('game notice');
        el.before(mark);
        marks.set(el, mark);
        copy.append(el);
      }
    } else {
      for (const [el, mark] of marks) mark.replaceWith(el);
      marks.clear();
    }
  }
  const observer = new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && n.matches(selector)))) arrange();
  });
  observer.observe(stage, {childList: true});
  const combat = card.querySelector('#combat-hud');
  const combatMark = combat && doc.createComment('combat hud');
  if (combat) combat.before(combatMark);
  function layout() {
    if (combat) {
      if (media.matches) card.insertBefore(combat, rail);
      else combatMark.after(combat);
    }
    html.classList.toggle('touch-game', media.matches);
    html.classList.toggle('touch-special', media.matches && special);
    arrange();
    syncScreen();
    reset();
  }
  if (media.addEventListener) media.addEventListener('change', layout);
  else media.addListener(layout);
  layout();
  for (const event of ['blur', 'pagehide', 'orientationchange', 'resize']) root.addEventListener(event, reset);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) reset(); });

  const surfaces = '.viewport canvas,.highway canvas,.mobile-controls,.drive-touch,.touch,.touch-two,.touch-controls';
  for (const event of ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'gesturechange', 'dblclick']) {
    doc.addEventListener(event, ev => {
      if (media.matches && ev.target.closest?.(surfaces)) ev.preventDefault();
    }, {capture: true, passive: false});
  }
  root.ArcadeTouchScreen = {
    contacts, QUERY, toggle, media, reset,
    bindPads(elements, options) {
      const pad = bindPads(root, elements, options);
      resets.add(pad.clear);
      return pad;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
