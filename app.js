/* Kerstverhaal Autocue
   - handmatig scrollen of automatisch met instelbare snelheid
   - alle instellingen worden bewaard in de browser (localStorage) */

(function () {
  'use strict';

  // Wij bepalen zelf waar de tekst begint, niet de browser.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const $ = (id) => document.getElementById(id);
  const vp = $('viewport');
  const content = $('content');
  const panel = $('panel');
  const html = document.documentElement;

  /* ---------- Instellingen ---------- */
  // speed = tempo in woorden per minuut
  const DEFAULTS = { speed: 120, font: 56, width: 85, linePos: 38, theme: 'dark', mirror: 0, guide: 1, block: 0 };
  const MIN_WPM = 40, MAX_WPM = 240;
  const settings = load();
  settings.speed = Math.min(MAX_WPM, Math.max(MIN_WPM, settings.speed || DEFAULTS.speed));
  if (settings.theme !== 'light') settings.theme = 'dark';

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('autocue') || '{}')); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem('autocue', JSON.stringify(settings)); } catch (e) {}
    }, 300);
  }

  /* ---------- Tekst opbouwen ---------- */
  const nodes = [];   // alle alinea-elementen, om je plek terug te vinden
  const scenes = [];  // scene-koppen voor het sprongmenu
  let totalWords = 0; // om het tempo in woorden per minuut om te rekenen

  SCRIPT.forEach((item) => {
    totalWords += (item.text.match(/\S+/g) || []).length;
    const el = document.createElement('p');
    el.className = item.type;
    el.textContent = item.text;
    if (item.type === 'p' && /^einde\.?$/i.test(item.text)) el.classList.add('end');
    content.appendChild(el);
    nodes.push(el);
    if (item.type === 'scene' || item.type === 'title') scenes.push({ el: el, text: item.text });
  });

  const jump = $('jump');
  scenes.forEach((s, n) => {
    const o = document.createElement('option');
    o.value = String(n);
    o.textContent = n === 0 ? 'Begin' : s.text;
    jump.appendChild(o);
  });

  /* ---------- Afmetingen ---------- */
  let linePos = 0;    // afstand van de leeslijn tot de bovenkant van het scherm, in pixels
  let pxPerWord = 1;  // hoeveel pixels de tekst opschuift per gesproken woord

  function layout() {
    const h = vp.clientHeight;
    linePos = Math.round(h * settings.linePos / 100);
    const padBottom = Math.round(h * 0.9);
    html.style.setProperty('--font-size', settings.font + 'px');
    html.style.setProperty('--line-width', settings.width + '%');
    content.style.paddingTop = linePos + 'px';
    content.style.paddingBottom = padBottom + 'px';
    $('guide').style.top = linePos + 'px';

    // De hoogte van de tekst zelf bepaalt hoeveel pixels een woord "kost".
    // Zo blijft het tempo in woorden per minuut kloppen bij elke tekstgrootte,
    // regelbreedte of schermstand.
    const textHeight = content.scrollHeight - linePos - padBottom;
    if (textHeight > 0 && totalWords > 0) pxPerWord = textHeight / totalWords;
  }

  // Het element dat nu op de leeslijn staat
  function currentNode() {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].getBoundingClientRect().bottom >= linePos) return { el: nodes[i], index: i };
    }
    return nodes.length ? { el: nodes[nodes.length - 1], index: nodes.length - 1 } : null;
  }

  // Onthoudt welke regel op de leeslijn staat, voert de wijziging uit en zet hem daarna terug
  function keepPlace(fn) {
    const anchor = currentNode();
    const before = anchor ? anchor.el.getBoundingClientRect().top : 0;
    fn();
    layout();
    if (anchor) {
      const after = anchor.el.getBoundingClientRect().top;
      setPos(vp.scrollTop + (after - before));
    }
    update();
  }

  /* ---------- Scrollen ---------- */
  let pos = 0;               // onze eigen (fractionele) scrollpositie
  let playing = false;
  let userScrolling = false;
  let settleTimer = null;
  let rafId = null;
  let lastTs = 0;

  const maxScroll = () => Math.max(0, vp.scrollHeight - vp.clientHeight);
  const pxPerSec = () => settings.speed / 60 * pxPerWord;

  function setPos(p) {
    pos = Math.min(Math.max(p, 0), maxScroll());
    vp.scrollTop = pos;
  }

  function frame(ts) {
    if (!playing) { rafId = null; return; }
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.25) dt = 0.25;   // na een pauze of schermblokkering niet doorschieten

    if (!userScrolling) {
      if (Math.abs(vp.scrollTop - pos) > 2) pos = vp.scrollTop;   // handmatig verschoven
      const end = maxScroll();
      pos += pxPerSec() * dt;
      if (pos >= end) {
        pos = end;
        vp.scrollTop = pos;
        setPlaying(false);
        update();
        return;
      }
      vp.scrollTop = pos;
    }
    update();
    rafId = requestAnimationFrame(frame);
  }

  function setPlaying(on) {
    playing = on;
    lastTs = 0;
    $('btnPlay').querySelector('.ico').className = 'ico ' + (on ? 'pause' : 'play');
    $('btnPlay').querySelector('.label').textContent = on ? 'Pauze' : 'Start';
    if (on) {
      pos = vp.scrollTop;
      if (!rafId) rafId = requestAnimationFrame(frame);
      wakeLockOn();
      hidePanelSoon();
    } else {
      wakeLockOff();
      showPanel();
    }
  }

  /* ---------- Voortgangsbalk, resttijd en scene-menu ---------- */
  let uiTimer = -1e6;
  function update() {
    const max = maxScroll();
    const p = max ? Math.min(1, vp.scrollTop / max) : 0;
    $('progressBar').style.width = (p * 100).toFixed(2) + '%';

    const now = performance.now();
    if (now - uiTimer < 400) return;
    uiTimer = now;

    const secs = Math.max(0, (max - vp.scrollTop) / pxPerSec());
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    $('remaining').textContent = m + ':' + String(s).padStart(2, '0');

    const cur = currentNode();
    if (!cur) return;
    let best = 0;
    for (let n = 0; n < scenes.length; n++) {
      if (scenes[n].el === cur.el) { best = n; break; }
      const rel = scenes[n].el.compareDocumentPosition(cur.el);
      if (rel & Node.DOCUMENT_POSITION_FOLLOWING) best = n;
    }
    if (jump.value !== String(best)) jump.value = String(best);
    settings.block = cur.index;
    persist();
  }

  /* ---------- Handmatig scrollen: automatisch even wachten ---------- */
  function pauseForUser() {
    userScrolling = true;
    clearTimeout(settleTimer);
  }
  function resumeAfterUser() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      userScrolling = false;
      pos = vp.scrollTop;
      lastTs = 0;
    }, 260);
  }

  vp.addEventListener('scroll', () => {
    if (userScrolling) resumeAfterUser();   // wachten tot het uitrollen klaar is
    update();
  }, { passive: true });

  vp.addEventListener('touchstart', pauseForUser, { passive: true });
  vp.addEventListener('touchend', resumeAfterUser, { passive: true });
  vp.addEventListener('touchcancel', resumeAfterUser, { passive: true });
  vp.addEventListener('wheel', () => { pauseForUser(); resumeAfterUser(); }, { passive: true });

  // Grote tempomelding, zodat je het nieuwe tempo ook ziet als de knoppen weg zijn
  let toastTimer = null;
  function showTempo() {
    const t = $('tempoToast');
    $('tempoToastVal').textContent = settings.speed;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 900);
  }

  /* ---------- Tikken = knoppen tonen of verbergen ---------- */
  let tapX = 0, tapY = 0, tapT = 0;
  vp.addEventListener('pointerdown', (e) => { tapX = e.clientX; tapY = e.clientY; tapT = Date.now(); });
  vp.addEventListener('pointerup', (e) => {
    const moved = Math.hypot(e.clientX - tapX, e.clientY - tapY);
    if (moved < 12 && Date.now() - tapT < 400) togglePanel();
  });

  let hideTimer = null;
  function showPanel() {
    panel.classList.remove('hidden');
    clearTimeout(hideTimer);
    if (playing) hidePanelSoon();
  }
  function hidePanel() {
    panel.classList.add('hidden');
    clearTimeout(hideTimer);
  }
  function hidePanelSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (playing) panel.classList.add('hidden'); }, 4000);
  }
  function togglePanel() {
    if (panel.classList.contains('hidden')) showPanel(); else hidePanel();
  }

  panel.addEventListener('pointerdown', () => clearTimeout(hideTimer));
  panel.addEventListener('pointerup', () => { if (playing) hidePanelSoon(); });

  /* ---------- Scherm aan houden tijdens het voorlezen ---------- */
  let wakeLock = null;
  function wakeLockOn() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        navigator.wakeLock.request('screen').then((w) => { wakeLock = w; }).catch(() => {});
      }
    } catch (e) { /* niet ondersteund - geen probleem */ }
  }
  function wakeLockOff() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && playing) wakeLockOn();
  });

  /* ---------- Volledig scherm ---------- */
  function toggleFullscreen() {
    const el = document.documentElement;
    const isFull = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFull) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    } else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        req.call(el);
      } else {
        alert('Volledig scherm kan hier niet vanzelf.\n\nTip voor de iPad: tik in Safari op het deel-icoon en kies "Zet op beginscherm". Open je de app daarna vanaf het beginscherm, dan staat hij automatisch schermvullend zonder adresbalk.');
      }
    }
    setTimeout(() => { layout(); update(); }, 350);
  }

  /* ---------- Bediening ---------- */
  const speed = $('speed');
  const font = $('font');
  const width = $('width');
  const linePosInput = $('linePos');

  function applyAll() {
    speed.value = settings.speed;
    $('speedVal').textContent = settings.speed;
    font.value = settings.font;
    $('fontVal').textContent = settings.font;
    width.value = settings.width;
    linePosInput.value = settings.linePos;
    html.dataset.theme = settings.theme;
    html.dataset.mirror = settings.mirror ? '1' : '0';
    html.dataset.guide = settings.guide ? '1' : '0';
    $('btnMirror').classList.toggle('on', !!settings.mirror);
    $('btnGuide').classList.toggle('on', !!settings.guide);
    document.querySelectorAll('#themeChips .chip').forEach((c) => {
      c.classList.toggle('on', c.dataset.theme === settings.theme);
    });
  }

  function setSpeed(v) {
    settings.speed = Math.min(MAX_WPM, Math.max(MIN_WPM, Math.round(v / 5) * 5));
    speed.value = settings.speed;
    $('speedVal').textContent = settings.speed;
    uiTimer = -1e6;
    persist();
    update();
  }

  function setFont(v) {
    const nv = Math.min(140, Math.max(24, Math.round(v / 2) * 2));
    keepPlace(() => {
      settings.font = nv;
      font.value = nv;
      $('fontVal').textContent = nv;
    });
    persist();
  }

  $('btnPlay').addEventListener('click', () => setPlaying(!playing));
  $('speedUp').addEventListener('click', () => setSpeed(settings.speed + 5));
  $('speedDown').addEventListener('click', () => setSpeed(settings.speed - 5));
  speed.addEventListener('input', () => setSpeed(+speed.value));
  $('fontUp').addEventListener('click', () => setFont(settings.font + 4));
  $('fontDown').addEventListener('click', () => setFont(settings.font - 4));
  font.addEventListener('input', () => setFont(+font.value));
  width.addEventListener('input', () => {
    keepPlace(() => { settings.width = +width.value; });
    persist();
  });
  linePosInput.addEventListener('input', () => {
    settings.linePos = +linePosInput.value;
    layout();
    update();
    persist();
  });

  $('btnSettings').addEventListener('click', () => { $('extraRow').hidden = !$('extraRow').hidden; });
  $('btnFull').addEventListener('click', toggleFullscreen);
  $('btnMirror').addEventListener('click', () => { settings.mirror = settings.mirror ? 0 : 1; applyAll(); persist(); });
  $('btnGuide').addEventListener('click', () => { settings.guide = settings.guide ? 0 : 1; applyAll(); persist(); });
  $('btnReset').addEventListener('click', () => { setPlaying(false); setPos(0); uiTimer = -1e6; update(); });
  document.querySelectorAll('#themeChips .chip').forEach((c) => {
    c.addEventListener('click', () => { settings.theme = c.dataset.theme; applyAll(); persist(); });
  });

  jump.addEventListener('change', () => {
    scrollToNode(scenes[+jump.value] && scenes[+jump.value].el);
  });

  function scrollToNode(el) {
    if (!el) return;
    const y = el.getBoundingClientRect().top - vp.getBoundingClientRect().top + vp.scrollTop - linePos;
    setPos(y);
    uiTimer = -1e6;
    update();
  }

  /* ---------- Toetsenbord (handig met een bluetooth-toetsenbord) ---------- */
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('input, select, button')) return;
    switch (e.key) {
      case ' ':
      case 'k': e.preventDefault(); setPlaying(!playing); break;
      case 'ArrowUp': e.preventDefault(); setSpeed(settings.speed + 5); showTempo(); break;
      case 'ArrowDown': e.preventDefault(); setSpeed(settings.speed - 5); showTempo(); break;
      case '+':
      case '=': setFont(settings.font + 4); break;
      case '-':
      case '_': setFont(settings.font - 4); break;
      case 'f': toggleFullscreen(); break;
      case 'm': settings.mirror = settings.mirror ? 0 : 1; applyAll(); persist(); break;
      case 'Home': setPlaying(false); setPos(0); uiTimer = -1e6; update(); break;
      case 'End': setPos(maxScroll()); uiTimer = -1e6; update(); break;
      case 'Escape': showPanel(); break;
    }
  });

  /* ---------- Opnieuw berekenen bij draaien of formaat wijzigen ---------- */
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => keepPlace(() => {}), 120);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  /* ---------- Start ---------- */
  applyAll();
  layout();

  // Terug naar de laatst gelezen alinea.
  // Na de eerste opmaak, en met een tweede poging voor het geval de pagina
  // op de achtergrond wordt geladen (dan komt requestAnimationFrame niet aan bod).
  let started = false;
  function start() {
    if (started) return;
    started = true;
    if (settings.block) {
      const el = nodes[Math.min(settings.block, nodes.length - 1)];
      scrollToNode(el);
    }
    uiTimer = -1e6;
    update();
  }
  requestAnimationFrame(start);
  setTimeout(start, 250);

  setTimeout(() => $('hint').classList.add('gone'), 4000);
})();
