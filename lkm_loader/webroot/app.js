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
  var rows = Object.create(null);
  var busy = Object.create(null);
  var toastTimer = null;
  var renderQueued = false;
  var entered = false;

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
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2400);
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
    scheduleRender();
  }

  function find(name) {
    for (var i = 0; i < state.modules.length; i++) {
      if (state.modules[i].name === name) return state.modules[i];
    }
    return null;
  }

  // ------------------------------------------------------------ render

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      render();
    });
  }

  function matches(m) {
    return !state.query || (m._q || (m._q = m.name.toLowerCase())).indexOf(state.query) !== -1;
  }

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function createRow(name) {
    var row = document.createElement('div');
    row.className = 'row';
    row.dataset.name = name;

    var dot = document.createElement('span');
    dot.className = 'dot';

    var info = document.createElement('div');
    info.className = 'info';

    var nm = document.createElement('span');
    nm.className = 'name';
    nm.textContent = name;
    nm.title = name + '.ko';

    var st = document.createElement('span');
    st.className = 'state';

    info.appendChild(nm);
    info.appendChild(st);

    var pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pin';
    pin.setAttribute('aria-pressed', 'false');

    var sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'switch';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-label', name);

    row.appendChild(dot);
    row.appendChild(info);
    row.appendChild(pin);
    row.appendChild(sw);

    row._pin = pin;
    row._sw = sw;
    row._state = st;
    return row;
  }

  function patchRow(row, m) {
    var wantRow = 'row' + (m.loaded ? ' loaded' : '') + (busy[m.name] ? ' busy' : '');
    if (row.className !== wantRow) row.className = wantRow;

    setText(row._state, m.loaded ? 'Loaded' : 'Not loaded');
    row._state.classList.toggle('on', !!m.loaded);

    var pin = row._pin;
    var pinCls = 'pin' + (m.pinned ? ' pinned' : '');
    if (pin.className !== pinCls) pin.className = pinCls;
    if (pin.dataset.pinned !== String(m.pinned)) {
      pin.dataset.pinned = String(m.pinned);
      pin.innerHTML = m.pinned ? PIN_FILLED : PIN_OUTLINE;
      pin.title = m.pinned ? 'Loads on boot · click to unpin' : 'Pin to load on boot';
      pin.setAttribute('aria-label', pin.title + ': ' + m.name);
      pin.setAttribute('aria-pressed', m.pinned ? 'true' : 'false');
    }

    var sw = row._sw;
    var swCls = 'switch' + (m.loaded ? ' on' : '');
    if (sw.className !== swCls) sw.className = swCls;
    var checked = m.loaded ? 'true' : 'false';
    if (sw.getAttribute('aria-checked') !== checked) sw.setAttribute('aria-checked', checked);
    var swTitle = m.loaded ? 'Unload' : 'Load';
    if (sw.title !== swTitle) sw.title = swTitle;
  }

  function render() {
    var visible = state.modules.filter(matches);
    var hasModules = state.modules.length > 0;

    // summary
    setText(el.total, String(state.total));
    setText(el.loaded, String(state.loaded));
    setText(el.pinned, String(state.pinned));

    // empty state
    var showEmpty = !hasModules || visible.length === 0;
    if (el.empty.hidden === showEmpty) {
      if (!hasModules) {
        el.empty.querySelector('p').textContent = 'No modules';
        el.empty.querySelector('span').innerHTML =
          'Place <code>.ko</code> files in <code>/vendor/lib/modules/custom</code>';
      } else {
        el.empty.querySelector('p').textContent = 'No matches';
        el.empty.querySelector('span').textContent = 'Nothing matches "' + state.query + '"';
      }
    }
    if (el.empty.hidden !== !showEmpty) el.empty.hidden = !showEmpty;
    if (el.list.hidden !== showEmpty) el.list.hidden = showEmpty;

    if (showEmpty) {
      for (var key in rows) {
        if (!rows[key].parentNode) { delete rows[key]; continue; }
        rows[key].parentNode.removeChild(rows[key]);
        delete rows[key];
      }
      el.list.setAttribute('aria-busy', 'false');
      return;
    }

    var skeleton = el.list.querySelector('.skeleton');
    if (skeleton) skeleton.remove();

    // reconcile in place: only move nodes that are out of order
    var seen = Object.create(null);
    var prev = null;
    for (var i = 0; i < visible.length; i++) {
      var m = visible[i];
      seen[m.name] = true;
      var row = rows[m.name];
      if (!row) {
        row = rows[m.name] = createRow(m.name);
        row.classList.add('enter');
        row.style.animationDelay = Math.min(i, 8) * 14 + 'ms';
      }
      patchRow(row, m);
      var anchor = prev ? prev.nextSibling : el.list.firstChild;
      if (row !== anchor) el.list.insertBefore(row, anchor);
      prev = row;
    }

    // drop rows that are no longer visible
    for (var name in rows) {
      if (!seen[name]) {
        if (rows[name].parentNode) rows[name].parentNode.removeChild(rows[name]);
        delete rows[name];
      }
    }

    if (!entered) {
      entered = true;
      setTimeout(function () {
        for (var n in rows) rows[n].classList.remove('enter');
      }, 420);
    }

    el.list.setAttribute('aria-busy', 'false');
  }

  // ------------------------------------------------------------ actions

  function setBusy(name, value) {
    if (value) busy[name] = true; else delete busy[name];
    var row = rows[name];
    if (row) row.classList.toggle('busy', !!value);
  }

  async function runAction(fn) {
    try {
      var res = await fn();
      if (res && res.ok === false) toast(res.message || 'Failed', true);
      else toast((res && res.message) || 'Done');
      return res;
    } catch (e) {
      toast(e.message || String(e), true);
      return { ok: false };
    } finally {
      loadList().catch(function () { /* keep current view */ });
    }
  }

  function toggleLoad(m) {
    var before = !!m.loaded;
    m.loaded = !before;                 // optimistic
    state.loaded += m.loaded ? 1 : -1;
    scheduleRender();

    setBusy(m.name, true);
    runAction(function () {
      return call((before ? 'unload ' : 'load ') + q(m.name));
    }).then(function (res) {
      if (res && res.ok === false) {
        m.loaded = before;              // revert
        state.loaded += before ? 1 : -1;
        scheduleRender();
      }
    }).then(function () { setBusy(m.name, false); });
  }

  function togglePin(m) {
    var before = !!m.pinned;
    m.pinned = !before;                 // optimistic
    state.pinned += m.pinned ? 1 : -1;
    scheduleRender();

    setBusy(m.name, true);
    runAction(function () {
      return call((before ? 'unpin ' : 'pin ') + q(m.name));
    }).then(function (res) {
      if (res && res.ok === false) {
        m.pinned = before;
        state.pinned += before ? 1 : -1;
        scheduleRender();
      }
    }).then(function () { setBusy(m.name, false); });
  }

  async function refresh() {
    el.refresh.classList.add('busy');
    if (!el.list.firstChild) el.list.setAttribute('aria-busy', 'true');
    try {
      await loadList();
    } catch (e) {
      el.list.textContent = '';
      rows = Object.create(null);
      el.list.setAttribute('aria-busy', 'false');
      el.list.hidden = true;
      el.empty.hidden = false;
      el.empty.querySelector('p').textContent = 'Unable to read modules';
      el.empty.querySelector('span').textContent = 'Check that the module is installed and active.';
      toast(e.message || 'Failed to load modules', true);
    } finally {
      el.refresh.classList.remove('busy');
    }
  }

  async function bulk(args, fallback) {
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

  el.list.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn) return;
    var row = btn.closest('.row');
    if (!row) return;
    var m = find(row.dataset.name);
    if (!m) return;
    if (btn.classList.contains('switch')) toggleLoad(m);
    else if (btn.classList.contains('pin')) togglePin(m);
  });

  var searchTimer = null;
  el.search.addEventListener('input', function () {
    var v = el.search.value.trim().toLowerCase();
    el.clear.hidden = !v;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      state.query = v;
      scheduleRender();
    }, 70);
  });

  el.clear.addEventListener('click', function () {
    el.search.value = '';
    state.query = '';
    el.clear.hidden = true;
    scheduleRender();
    el.search.focus();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.activeElement === el.search && state.query) {
      el.search.value = '';
      state.query = '';
      el.clear.hidden = true;
      scheduleRender();
    }
  });

  el.refresh.addEventListener('click', refresh);
  el.loadPinned.addEventListener('click', function () { bulk('loadpins', 'Loaded pinned'); });
  el.unloadAll.addEventListener('click', function () { bulk('unloadall', 'Unloaded all'); });
  el.pinAll.addEventListener('click', function () { bulk('pinall', 'Pinned all'); });
  el.unpinAll.addEventListener('click', function () { bulk('unpinall', 'Cleared pins'); });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh();
  });

  // ------------------------------------------------------------ boot

  if (!hasKsu) {
    el.noApi.hidden = false;
    el.list.hidden = true;
    el.empty.hidden = true;
    [el.refresh, el.search, el.loadPinned, el.unloadAll, el.pinAll, el.unpinAll]
      .forEach(function (n) { n.disabled = true; });
    return;
  }

  loadVersion();
  refresh();
})();
