(function () {
  'use strict';

  var MODDIR = '/data/adb/modules/lkm_loader';
  var BIN = MODDIR + '/bin/lkmctl';
  var PROPFILE = MODDIR + '/module.prop';

  var hasKsu = typeof ksu !== 'undefined' && typeof ksu.exec === 'function';

  var el = {
    refresh: document.getElementById('refresh'),
    search: document.getElementById('search'),
    clear: document.getElementById('clear-search'),
    list: document.getElementById('list'),
    empty: document.getElementById('empty'),
    noApi: document.getElementById('no-api'),
    toast: document.getElementById('toast'),
    total: document.getElementById('sum-total'),
    loaded: document.getElementById('sum-loaded'),
    pinned: document.getElementById('sum-pinned'),
    ver: document.getElementById('ver'),
    loadPinned: document.getElementById('load-pinned'),
    unloadAll: document.getElementById('unload-all'),
    pinAll: document.getElementById('pin-all'),
    unpinAll: document.getElementById('unpin-all')
  };

  var state = { modules: [], total: 0, loaded: 0, pinned: 0, query: '' };
  var busy = {};
  var toastTimer = null;
  var firstRender = true;

  var PIN_OUTLINE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M9.5 3.5h5l-.8 5.6 2.8 2.9H7.5l2.8-2.9-.8-5.6Z"/>' +
    '<path d="M12 12v8"/></svg>';

  var PIN_FILLED =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M9.5 3.5h5l-.8 5.6 2.8 2.9H7.5l2.8-2.9-.8-5.6Z"/>' +
    '<path d="M11.35 12h1.3v8h-1.3z"/></svg>';

  // ------------------------------------------------------------ shell

  async function exec(cmd) {
    if (!hasKsu) throw new Error('KernelSU API unavailable');
    var res = await ksu.exec(cmd);
    if (typeof res === 'string') return res;
    if (res && typeof res.stdout === 'string') return res.stdout;
    return '';
  }

  function q(name) {
    if (!/^[A-Za-z0-9_.+@-]+$/.test(name)) throw new Error('Invalid module name');
    return "'" + name + "'";
  }

  async function call(args) {
    var out = await exec('sh ' + BIN + ' ' + args);
    try {
      return JSON.parse(out.trim());
    } catch (e) {
      return { ok: true, message: out.trim() };
    }
  }

  function toast(msg, isError) {
    el.toast.textContent = msg;
    el.toast.classList.toggle('error', !!isError);
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2600);
    if (isError && hasKsu && typeof ksu.toast === 'function') {
      try { ksu.toast(msg); } catch (e) { /* ignore */ }
    }
  }

  // ------------------------------------------------------------ data

  async function loadVersion() {
    try {
      var v = (await exec("awk -F= '$1==\"version\"{print $2; exit}' " + PROPFILE) || '').trim();
      el.ver.textContent = 'Custom LKM Loader' + (v ? ' · v' + v : '');
    } catch (e) { /* non-fatal */ }
  }

  async function loadList() {
    var data = await call('list');
    if (!data || !Array.isArray(data.modules)) throw new Error('Unexpected response');
    state.modules = data.modules;
    state.total = data.total;
    state.loaded = data.loaded;
    state.pinned = data.pinned;
    renderSummary();
    renderList();
  }

  function renderSummary() {
    el.total.textContent = state.total;
    el.loaded.textContent = state.loaded;
    el.pinned.textContent = state.pinned;
  }

  // ------------------------------------------------------------ render

  function matches(m) {
    return !state.query || m.name.toLowerCase().indexOf(state.query) !== -1;
  }

  function buildRow(m) {
    var row = document.createElement('div');
    row.className = 'row' + (m.loaded ? ' loaded' : '') + (busy[m.name] ? ' busy' : '');
    row.dataset.name = m.name;

    var dot = document.createElement('span');
    dot.className = 'dot';

    var info = document.createElement('div');
    info.className = 'info';

    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = m.name;
    name.title = m.name + '.ko';

    var st = document.createElement('span');
    st.className = 'state';
    st.textContent = m.loaded ? 'Loaded' : 'Not loaded';

    info.appendChild(name);
    info.appendChild(st);

    var pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pin' + (m.pinned ? ' pinned' : '');
    pin.innerHTML = m.pinned ? PIN_FILLED : PIN_OUTLINE;
    pin.title = m.pinned ? 'Loads on boot (click to unpin)' : 'Pin to load on boot';
    pin.setAttribute('aria-label', pin.title + ': ' + m.name);
    pin.setAttribute('aria-pressed', m.pinned ? 'true' : 'false');
    pin.addEventListener('click', function () { togglePin(m); });

    var sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'switch' + (m.loaded ? ' on' : '');
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', m.loaded ? 'true' : 'false');
    sw.setAttribute('aria-label', m.name);
    sw.title = m.loaded ? 'Unload' : 'Load';
    sw.addEventListener('click', function () { toggleLoad(m); });

    row.appendChild(dot);
    row.appendChild(info);
    row.appendChild(pin);
    row.appendChild(sw);
    return row;
  }

  function renderList() {
    var visible = state.modules.filter(matches);

    el.list.textContent = '';
    el.list.setAttribute('aria-busy', 'false');

    var hasModules = state.modules.length > 0;
    el.empty.hidden = hasModules && visible.length > 0;

    if (!hasModules) {
      el.empty.querySelector('p').textContent = 'No modules';
      el.empty.querySelector('span').innerHTML =
        'Place <code>.ko</code> files in <code>/vendor/lib/modules/custom</code>';
    } else if (visible.length === 0) {
      el.empty.querySelector('p').textContent = 'No matches';
      el.empty.querySelector('span').textContent = 'Nothing matches "' + state.query + '"';
    }

    var frag = document.createDocumentFragment();
    visible.forEach(function (m, i) {
      var row = buildRow(m);
      if (!firstRender) row.style.animation = 'none';
      row.style.animationDelay = (i * 12) + 'ms';
      frag.appendChild(row);
    });
    el.list.appendChild(frag);
    if (!firstRender) el.list.classList.add('list');
    firstRender = false;
  }

  // ------------------------------------------------------------ actions

  function setBusy(name, value) {
    if (value) busy[name] = true; else delete busy[name];
    var row = el.list.querySelector('.row[data-name="' + cssEscape(name) + '"]');
    if (row) row.classList.toggle('busy', !!value);
  }

  function cssEscape(v) {
    return String(v).replace(/["\\]/g, '\\$&');
  }

  async function runAction(fn) {
    try {
      var res = await fn();
      toast((res && res.message) || 'Done', res && res.ok === false);
    } catch (e) {
      toast(e.message || String(e), true);
    }
    await loadList().catch(function () { /* keep old view */ });
  }

  function toggleLoad(m) {
    setBusy(m.name, true);
    var name = m.name;
    runAction(function () {
      return call((m.loaded ? 'unload ' : 'load ') + q(name));
    }).then(function () { setBusy(name, false); });
  }

  function togglePin(m) {
    setBusy(m.name, true);
    var name = m.name;
    runAction(function () {
      return call((m.pinned ? 'unpin ' : 'pin ') + q(name));
    }).then(function () { setBusy(name, false); });
  }

  async function refresh() {
    el.refresh.classList.add('busy');
    el.list.setAttribute('aria-busy', 'true');
    try {
      await loadList();
    } catch (e) {
      el.list.textContent = '';
      el.list.setAttribute('aria-busy', 'false');
      el.empty.hidden = false;
      el.empty.querySelector('p').textContent = 'Unable to read modules';
      el.empty.querySelector('span').textContent = 'Check that the module is installed and active.';
      toast(e.message || 'Failed to load modules', true);
    } finally {
      el.refresh.classList.remove('busy');
    }
  }

  async function bulk(btn, args, fallback) {
    var group = el.loadPinned.parentNode.querySelectorAll('button');
    group.forEach(function (b) { b.disabled = true; });
    try {
      var res = await call(args);
      toast((res && res.message) || fallback, res && res.ok === false);
      await loadList();
    } catch (e) {
      toast(e.message || String(e), true);
    } finally {
      group.forEach(function (b) { b.disabled = false; });
    }
  }

  // ------------------------------------------------------------ events

  el.refresh.addEventListener('click', refresh);

  el.search.addEventListener('input', function () {
    state.query = el.search.value.trim().toLowerCase();
    el.clear.hidden = !state.query;
    renderList();
  });

  el.clear.addEventListener('click', function () {
    el.search.value = '';
    state.query = '';
    el.clear.hidden = true;
    renderList();
    el.search.focus();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.activeElement === el.search && state.query) {
      el.search.value = '';
      state.query = '';
      el.clear.hidden = true;
      renderList();
    }
  });

  el.loadPinned.addEventListener('click', function () { bulk(this, 'loadpins', 'Loaded pinned'); });
  el.unloadAll.addEventListener('click', function () { bulk(this, 'unloadall', 'Unloaded all'); });
  el.pinAll.addEventListener('click', function () { bulk(this, 'pinall', 'Pinned all'); });
  el.unpinAll.addEventListener('click', function () { bulk(this, 'unpinall', 'Cleared pins'); });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh();
  });

  // ------------------------------------------------------------ boot

  if (!hasKsu) {
    el.noApi.hidden = false;
    el.list.textContent = '';
    el.list.setAttribute('aria-busy', 'false');
    [el.refresh, el.search, el.loadPinned, el.unloadAll, el.pinAll, el.unpinAll]
      .forEach(function (n) { n.disabled = true; });
    return;
  }

  loadVersion();
  refresh();
})();
