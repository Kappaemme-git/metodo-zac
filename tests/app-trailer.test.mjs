import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const script = await readFile(new URL('../app-trailer.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

class FakeElement {
  listeners = new Map();
  attributes = new Map();
  focusCalls = [];

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, properties = {}) {
    const event = {
      target: this,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...properties,
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }

  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus(options) { this.focusCalls.push(options); }
}

function setup({ modalSupported = true, playDenied = false, missing = null, overflow = 'auto' } = {}) {
  const trigger = new FakeElement();
  trigger.href = 'https://metodozac.com/assets/video/metodo-zac-trailer.mp4';
  const closeButton = new FakeElement();
  const error = new FakeElement();
  error.hidden = true;
  const dialog = new FakeElement();
  dialog.open = false;
  dialog.showCalls = 0;
  dialog.closeCalls = 0;
  dialog.querySelector = (selector) => selector === '.app-trailer-close' ? closeButton : null;
  dialog.getBoundingClientRect = () => ({ left: 100, right: 900, top: 80, bottom: 680 });
  if (modalSupported) {
    dialog.showModal = () => {
      dialog.showCalls += 1;
      dialog.open = true;
    };
  }
  dialog.close = () => {
    if (!dialog.open) return;
    dialog.closeCalls += 1;
    dialog.open = false;
    dialog.emit('close');
  };

  const video = new FakeElement();
  video.playCalls = 0;
  video.pauseCalls = 0;
  video.loadCalls = 0;
  video.paused = true;
  video.currentTime = 0;
  Object.defineProperty(video, 'src', {
    get() { return this.attributes.get('src') || ''; },
    set(value) { this.attributes.set('src', value); },
  });
  video.play = () => {
    video.playCalls += 1;
    if (playDenied) return Promise.reject(new Error('NotAllowedError'));
    video.paused = false;
    return Promise.resolve();
  };
  video.pause = () => { video.pauseCalls += 1; video.paused = true; };
  video.load = () => { video.loadCalls += 1; video.currentTime = 0; };

  const elements = {
    'app-trailer-trigger': trigger,
    'app-trailer-dialog': dialog,
    'app-trailer-video': video,
    'app-trailer-error': error,
  };
  const document = {
    body: { style: { overflow } },
    getElementById(id) { return id === missing ? null : elements[id] || null; },
  };
  const window = { scrollY: 1420 };
  vm.runInNewContext(script, { document, window }, { filename: 'app-trailer.js' });
  return { trigger, dialog, video, closeButton, error, document, window };
}

test('il markup non carica il filmato prima della richiesta e mantiene il link di fallback', () => {
  const tag = html.match(/<video\b[^>]*id="app-trailer-video"[^>]*>/)?.[0];
  assert.ok(tag);
  assert.doesNotMatch(tag, /\ssrc\s*=/i);
  assert.match(tag, /\bpreload="none"/);
  assert.match(tag, /\bcontrols\b/);
  assert.match(tag, /\bplaysinline\b/);
  assert.match(html, /id="app-trailer-trigger"[^>]*href="assets\/video\/metodo-zac-trailer\.mp4"/);
});

test('lo script lascia video e pagina inattivi prima dell’apertura', () => {
  const { dialog, video, document } = setup();
  assert.equal(dialog.open, false);
  assert.equal(video.hasAttribute('src'), false);
  assert.equal(video.playCalls, 0);
  assert.equal(video.loadCalls, 0);
  assert.equal(document.body.style.overflow, 'auto');
});

test('il click normale apre il dialog, carica il video e avvia la riproduzione', () => {
  const { trigger, dialog, video, error, document } = setup();
  error.hidden = false;
  const event = trigger.emit('click');
  assert.equal(event.defaultPrevented, true);
  assert.equal(dialog.open, true);
  assert.equal(dialog.showCalls, 1);
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(video.src, trigger.href);
  assert.equal(video.playCalls, 1);
  assert.equal(error.hidden, true);
});

test('un secondo click mentre il dialog è aperto non ricarica il filmato', () => {
  const { trigger, dialog, video } = setup();
  trigger.emit('click');
  trigger.emit('click');
  assert.equal(dialog.showCalls, 1);
  assert.equal(video.playCalls, 1);
});

for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
  test(`il modificatore ${modifier} conserva il comportamento nativo del link`, () => {
    const { trigger, dialog, video } = setup();
    const event = trigger.emit('click', { [modifier]: true });
    assert.equal(event.defaultPrevented, false);
    assert.equal(dialog.open, false);
    assert.equal(video.hasAttribute('src'), false);
  });
}

test('senza showModal resta disponibile il collegamento MP4', () => {
  const { trigger, video } = setup({ modalSupported: false });
  const event = trigger.emit('click');
  assert.equal(event.defaultPrevented, false);
  assert.equal(trigger.href, 'https://metodozac.com/assets/video/metodo-zac-trailer.mp4');
  assert.equal(video.playCalls, 0);
});

for (const missing of ['app-trailer-trigger', 'app-trailer-dialog', 'app-trailer-video']) {
  test(`uno script caricato senza ${missing} non genera errori`, () => {
    assert.doesNotThrow(() => setup({ missing }));
  });
}

test('il pulsante chiudi ferma e scarica il video, ripristina overflow e focus senza scroll', () => {
  const { trigger, dialog, video, closeButton, document, window } = setup({ overflow: 'clip' });
  trigger.emit('click');
  video.currentTime = 30;
  closeButton.emit('click');
  assert.equal(dialog.open, false);
  assert.equal(video.paused, true);
  assert.equal(video.pauseCalls, 1);
  assert.equal(video.hasAttribute('src'), false);
  assert.equal(video.loadCalls, 1);
  assert.equal(document.body.style.overflow, 'clip');
  assert.equal(trigger.focusCalls.length, 1);
  assert.equal(trigger.focusCalls[0].preventScroll, true);
  assert.equal(window.scrollY, 1420);
});

test('la chiusura nativa, inclusa Escape, usa la stessa pulizia e consente la riapertura', () => {
  const { trigger, dialog, video, document } = setup({ overflow: '' });
  trigger.emit('click');
  // The browser closes a native dialog on Escape, emitting the same close event.
  dialog.close();
  assert.equal(video.hasAttribute('src'), false);
  assert.equal(document.body.style.overflow, '');
  trigger.emit('click');
  assert.equal(dialog.open, true);
  assert.equal(video.src, trigger.href);
  assert.equal(video.currentTime, 0);
  assert.equal(video.playCalls, 2);
});

test('l’autoplay negato non produce un errore non gestito e lascia il dialog utilizzabile', async () => {
  const { trigger, dialog, error, video, closeButton } = setup({ playDenied: true });
  trigger.emit('click');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(dialog.open, true);
  assert.equal(video.hasAttribute('src'), true);
  assert.equal(error.hidden, true);
  closeButton.emit('click');
  assert.equal(dialog.open, false);
});

test('gli errori video mostrano il fallback solo se il dialog è aperto con sorgente', () => {
  const { trigger, dialog, video, error } = setup();
  video.emit('error');
  assert.equal(error.hidden, true);
  trigger.emit('click');
  video.emit('error');
  assert.equal(error.hidden, false);
  dialog.close();
  error.hidden = true;
  video.emit('error');
  assert.equal(error.hidden, true);
  trigger.emit('click');
  video.removeAttribute('src');
  video.emit('error');
  assert.equal(error.hidden, true);
});

test('un click sul backdrop chiude il dialog', () => {
  const { trigger, dialog, video } = setup();
  trigger.emit('click');
  dialog.emit('pointerdown', { clientX: 30, clientY: 30 });
  dialog.emit('click', { clientX: 30, clientY: 30 });
  assert.equal(dialog.open, false);
  assert.equal(video.hasAttribute('src'), false);
});

test('click interni, controlli video e trascinamenti non chiudono il dialog', () => {
  const { trigger, dialog, video } = setup();
  trigger.emit('click');
  for (const [start, end] of [
    [{ clientX: 110, clientY: 90 }, { clientX: 110, clientY: 90 }],
    [{ target: video, clientX: 120, clientY: 150 }, { target: video, clientX: 120, clientY: 150 }],
    [{ clientX: 110, clientY: 90 }, { clientX: 30, clientY: 30 }],
    [{ clientX: 30, clientY: 30 }, { clientX: 110, clientY: 90 }],
  ]) {
    dialog.emit('pointerdown', start);
    dialog.emit('click', end);
    assert.equal(dialog.open, true);
  }
  assert.equal(video.pauseCalls, 0);
});

test('la chiusura azzera lo stato del puntatore tra due aperture', () => {
  const { trigger, dialog, closeButton } = setup();
  trigger.emit('click');
  dialog.emit('pointerdown', { clientX: 30, clientY: 30 });
  closeButton.emit('click');
  trigger.emit('click');
  dialog.emit('click', { clientX: 30, clientY: 30 });
  assert.equal(dialog.open, true);
});
