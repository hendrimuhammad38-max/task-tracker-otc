/* =============================================================================
   APP — sesi login, layout (sidebar/topbar/bottom nav), router berbasis hash
   ============================================================================= */
const ADMIN_ROLES = ['PENGAWAS', 'ADMIN'];

const App = {
  user: null,
  masters: { pelatihan: [], alat: [], departemen: [], lokasi: [] },
  settings: { targetHarian: 50 },
  today: { count: 0 },
  cleanups: [],
  currentRoute: null,
  afterRoute: null,

  isAdmin() { return App.user && ADMIN_ROLES.includes(App.user.role); },

  // ---------- Inisialisasi ----------
  brand: { ver: '', logo: '' },

  async init() {
    App.applyTheme(UI.store.get('tto_theme', 'light'));
    App.brand = UI.store.get('tto_brand', { ver: '', logo: '' }) || { ver: '', logo: '' };
    App.applyBrand();
    UI.icons();
    App.bindPrefetchHover();
    App.bindLogin();
    window.addEventListener('auth-expired', (e) => App.logout(true, e.detail));
    window.addEventListener('hashchange', () => App.route());

    if (!API.isConfigured()) {
      const w = $('#config-warning');
      w.hidden = false;
      w.innerHTML = `${UI.icon('settings')}<span>Backend belum terhubung. Isi <b>GAS_URL</b> di <code>js/config.js</code> dengan URL /exec dari Apps Script.</span>`;
      UI.icons(w);
    }

    if (API.isConfigured()) App.loadBranding();

    const token = UI.store.get('tto_token');
    if (token && API.isConfigured()) {
      API.token = token;
      const boot = UI.store.get('tto_boot');
      if (boot && boot.user) {
        // Tampil INSTAN dari sesi terakhir, lalu verifikasi ke server di latar belakang.
        App.applyBoot(boot);
        API.cache.load(boot.user.id);
        App.showApp();
        App.bootstrap().then(() => {
          App.renderShell();
          App.markActive();
          App.prefetchAll();
        }).catch((e) => {
          if (e.code === 'AUTH') App.logout(true, e.message);
        });
        return;
      }
      try {
        await App.bootstrap();
        API.cache.load(App.user.id);
        App.showApp();
        return;
      } catch (e) {
        API.token = null;
        UI.store.del('tto_token');
        if (e.code !== 'AUTH') UI.toast(e.message, 'bad', 'Tidak dapat memuat data');
      }
    }
    App.showLogin();
  },

  applyBoot(d) {
    App.user = d.user;
    App.masters = d.masters;
    App.settings = d.settings;
    App.today = d.today;
  },

  async bootstrap() {
    const d = await API.call('bootstrap', {}, { silentAuth: true });
    App.applyBoot(d);
    UI.store.set('tto_boot', d);
    if ((d.settings.logoVer || '') !== (App.brand.ver || '')) App.loadBranding();
  },

  // ---------- Logo (diatur Admin) ----------
  applyBrand() {
    $$('[data-brand]').forEach((el) => { el.innerHTML = UI.logo(el.dataset.brand); });
    const fav = document.querySelector('link[rel="icon"]');
    if (fav) {
      if (!fav.dataset.def) fav.dataset.def = fav.href;
      fav.href = App.brand.logo || fav.dataset.def;
    }
  },

  async loadBranding() {
    try {
      const d = await API.call('getBranding', { ver: App.brand.ver || '' });
      if (d.same) return;
      App.setBrand({ ver: d.ver || '', logo: d.logo || '' });
    } catch (e) { /* tetap pakai logo tersimpan */ }
  },

  setBrand(b) {
    App.brand = b;
    UI.store.set('tto_brand', b);
    App.applyBrand();
  },

  // ---------- Prefetch: siapkan data halaman utama agar perpindahan menu instan ----------
  prefetchAll() {
    clearTimeout(App._pf);
    App._pf = setTimeout(async () => {
      const jobs = [
        ['dashboard', { period: UI.store.get('tto_period', 'week'), jenis: '', dept: '', mine: false }],
        ['listReports', Pages.reportListDefaults()],
        ['myStats', {}],
        ['listContacts', {}]
      ];
      if (App.isAdmin()) jobs.push(['listSupReports', Pages.supDefaults()], ['listUsers', {}], ['listMasters', {}], ['listLogs', Pages.logDefaults()]);
      for (const j of jobs) {
        if (!App.user) return;
        await API.prefetch(j[0], j[1]);
      }
    }, 700);
  },

  bindPrefetchHover() {
    const seen = new Set();
    const pre = (e) => {
      const t = e.target.closest && e.target.closest('[data-open]');
      if (!t || !App.user) return;
      const id = t.dataset.open;
      if (seen.has(id)) return;
      seen.add(id);
      setTimeout(() => seen.delete(id), 20000);
      API.prefetch('getReport', { id });
    };
    document.addEventListener('pointerover', pre, { passive: true });
    document.addEventListener('touchstart', pre, { passive: true });
  },

  showLogin(message) {
    $('#boot').hidden = true;
    $('#app-view').hidden = true;
    $('#login-view').hidden = false;
    const err = $('#login-error');
    if (message) { err.hidden = false; err.textContent = message; } else err.hidden = true;
    setTimeout(() => $('#login-badge').focus(), 50);
  },

  showApp() {
    $('#boot').hidden = true;
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
    App.renderShell();
    if (!location.hash || location.hash === '#' || location.hash === '#/') location.replace('#/dashboard');
    else App.route();
    App.prefetchAll();
  },

  bindLogin() {
    const form = $('#login-form');
    $('#toggle-pass').addEventListener('click', () => {
      const i = $('#login-pass');
      i.type = i.type === 'password' ? 'text' : 'password';
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const badge = $('#login-badge').value.trim();
      const pass = $('#login-pass').value;
      const err = $('#login-error');
      err.hidden = true;
      if (!badge || !pass) { err.hidden = false; err.textContent = 'No. Badge dan kata sandi wajib diisi.'; return; }
      const btn = $('#login-btn');
      UI.busy(btn, true, 'Memeriksa…');
      try {
        const d = await API.call('login', { noBadge: badge, password: pass });
        API.token = d.token;
        UI.store.set('tto_token', d.token);
        await App.bootstrap();
        API.cache.load(App.user.id);
        $('#login-pass').value = '';
        App.showApp();
        UI.toast(`${UI.greeting()}, ${App.user.nama.split(' ')[0]}!`, 'ok', 'Berhasil masuk');
      } catch (ex) {
        err.hidden = false;
        err.textContent = ex.message;
      } finally {
        UI.busy(btn, false);
      }
    });
  },

  async logout(expired, message) {
    if (!expired) {
      const ok = await UI.confirm({ title: 'Keluar dari aplikasi?', message: 'Anda perlu masuk kembali dengan No. Badge dan kata sandi.', okText: 'Keluar', icon: 'log-out' });
      if (!ok) return;
      try { await API.call('logout', {}, { silentAuth: true }); } catch (e) { /* tetap keluar */ }
    }
    API.token = null;
    UI.store.del('tto_token');
    UI.store.del('tto_boot');
    API.cache.clear();
    App.user = null;
    App.runCleanups();
    $('#modal-root').innerHTML = '';
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    App.showLogin(expired ? (message || 'Sesi Anda telah berakhir. Silakan masuk kembali.') : '');
  },

  // ---------- Tema ----------
  applyTheme(t) {
    document.documentElement.dataset.theme = t;
    UI.store.set('tto_theme', t);
    const b = $('#theme-toggle');
    if (b) { b.innerHTML = UI.icon(t === 'dark' ? 'moon' : 'sun'); UI.icons(b); }
  },

  // ---------- Layout ----------
  navItems() {
    const items = [
      { path: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { path: 'laporan-baru', label: 'Laporan Baru', icon: 'file-plus-2', plus: true },
      { path: 'laporan', label: 'Daftar Laporan', icon: 'list-checks' }
    ];
    const admin = [
      { path: 'pengawas', label: 'Lapor Superintendent', icon: 'clipboard-pen' },
      { path: 'pengguna', label: 'Kelola Pengguna', icon: 'users' },
      { path: 'master', label: 'Data Master', icon: 'database' },
      { path: 'log', label: 'Log Aktivitas', icon: 'history' }
    ];
    return { items, admin: App.isAdmin() ? admin : [] };
  },

  renderShell() {
    const u = App.user;
    $('#sb-profile').innerHTML = `
      <div class="sb-avatar">${UI.esc(UI.initials(u.nama))}</div>
      <b>Hi, ${UI.esc(u.nama.split(' ').slice(0, 2).join(' '))}!</b>
      <small>${UI.esc(UI.roleLabel(u.role))}</small>
      <span class="sb-id">${UI.esc(u.badge)}</span>`;
    const nav = App.navItems();
    const link = (it) => `<a class="sb-link" href="#/${it.path}" data-nav="${it.path}">${UI.icon(it.icon)}<span>${it.label}</span>${it.plus ? '<span class="sb-plus">+</span>' : ''}</a>`;
    $('#sb-nav').innerHTML = nav.items.map(link).join('') +
      (nav.admin.length ? `<div class="sb-section">Admin Control</div>${nav.admin.map(link).join('')}` : '') +
      `<div class="sb-section">Preferensi</div>${link({ path: 'profil', label: 'Pengaturan & Profil', icon: 'settings' })}
       <a class="sb-link" href="#" id="sb-logout">${UI.icon('log-out')}<span>Keluar</span></a>`;

    $('#tb-avatar').textContent = UI.initials(u.nama);
    const aktivitas = App.isAdmin()
      ? { path: 'log', label: 'Aktivitas', icon: 'history' }
      : { path: 'laporan?mine=1', label: 'Milik Saya', icon: 'folder-check', match: 'laporan-mine' };
    $('#bottom-nav').innerHTML = `
      <a class="bn-item" href="#/dashboard" data-bn="dashboard">${UI.icon('layout-dashboard')}<span>Dashboard</span></a>
      <a class="bn-item" href="#/laporan" data-bn="laporan">${UI.icon('clipboard-list')}<span>Laporan</span></a>
      <a class="bn-item bn-plus" href="#/laporan-baru" data-bn="laporan-baru"><span class="bn-fab">${UI.icon('plus')}</span><span>Input</span></a>
      <a class="bn-item" href="#/${aktivitas.path}" data-bn="${aktivitas.match || aktivitas.path}">${UI.icon(aktivitas.icon)}<span>${aktivitas.label}</span></a>
      <a class="bn-item" href="#/profil" data-bn="profil">${UI.icon('circle-user-round')}<span>Profil</span></a>`;

    App.renderTarget();
    UI.icons($('#app-view'));

    $('#sb-logout').onclick = (e) => { e.preventDefault(); App.logout(false); };
    $('#theme-toggle').onclick = () => App.applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    $('#tb-search').onsubmit = (e) => {
      e.preventDefault();
      const q = $('#tb-search-input').value.trim();
      location.hash = '#/laporan' + (q ? '?q=' + encodeURIComponent(q) : '');
    };
    $('#bell-btn').onclick = () => App.openLatest();
    App.updateBell();
  },

  renderTarget() {
    const target = App.settings.targetHarian || 50;
    const n = App.today.count || 0;
    const pct = Math.min(100, Math.round(n / target * 100));
    $('#sb-target').innerHTML = `
      <div class="sb-target-head">${UI.icon('target')}<span>Target Hari Ini</span><span class="pct">${pct}%</span></div>
      <div class="sb-target-num"><span><b>${n}</b> / ${target}</span><span>Laporan</span></div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <a class="btn btn-mint btn-block" href="#/laporan-baru">+ Laporan Baru</a>`;
    UI.icons($('#sb-target'));
  },

  async refreshToday() {
    try {
      const d = await API.call('bootstrap', {});
      App.today = d.today;
      App.masters = d.masters;
      UI.store.set('tto_boot', d);
      App.renderTarget();
      App.updateBell();
    } catch (e) { /* abaikan */ }
  },

  updateBell() {
    const el = $('#bell-count');
    const n = App.today.count || 0;
    el.hidden = !n;
    el.textContent = n > 99 ? '99+' : n;
  },

  async openLatest() {
    const m = UI.modal({ title: 'Laporan Terbaru', subtitle: `${App.today.count || 0} laporan masuk hari ini`, icon: 'bell', body: UI.loader() });
    try {
      const d = await API.swr('listReports', { size: 6 });
      const body = m.el.querySelector('.modal-body');
      body.innerHTML = d.items.length ? `<div class="list">${d.items.map(Pages.reportListItem).join('')}</div>`
        : UI.empty('Belum ada laporan', 'Laporan yang dikirim akan tampil di sini.');
      UI.icons(body);
      Pages.bindListItems(body, () => m.close());
    } catch (e) { m.close(); UI.error(e); }
  },

  // ---------- Router ----------
  routes: [
    { re: /^dashboard$/, page: () => Pages.dashboard },
    { re: /^laporan-baru$/, page: () => Pages.reportForm },
    { re: /^laporan$/, page: () => Pages.reportList },
    { re: /^laporan\/([^/]+)\/ubah$/, page: () => Pages.reportEdit, roles: ADMIN_ROLES },
    { re: /^laporan\/([^/]+)$/, page: () => Pages.reportDetail },
    { re: /^pengawas$/, page: () => Pages.supList, roles: ADMIN_ROLES },
    { re: /^pengawas\/baru$/, page: () => Pages.supForm, roles: ADMIN_ROLES },
    { re: /^pengawas\/([^/]+)\/ubah$/, page: () => Pages.supEdit, roles: ADMIN_ROLES },
    { re: /^pengawas\/([^/]+)$/, page: () => Pages.supDetail, roles: ADMIN_ROLES },
    { re: /^pengguna$/, page: () => Pages.users, roles: ADMIN_ROLES },
    { re: /^master$/, page: () => Pages.masters, roles: ADMIN_ROLES },
    { re: /^log$/, page: () => Pages.logs, roles: ADMIN_ROLES },
    { re: /^profil$/, page: () => Pages.profile }
  ],

  markActive() {
    const { path, query } = App.parseHash();
    const top = path.split('/')[0];
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === top || (top === 'laporan' && path !== 'laporan' && a.dataset.nav === 'laporan')));
    const bnKey = top === 'laporan' && query.mine ? 'laporan-mine' : top;
    $$('[data-bn]').forEach((a) => a.classList.toggle('active', a.dataset.bn === bnKey));
  },

  parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    return { path: path || 'dashboard', query };
  },

  runCleanups() {
    App.cleanups.forEach((fn) => { try { fn(); } catch (e) { /* abaikan */ } });
    App.cleanups = [];
  },

  onCleanup(fn) { App.cleanups.push(fn); },

  async route() {
    if (!App.user) return;
    const { path, query } = App.parseHash();
    let match = null, params = [];
    for (const r of App.routes) {
      const m = path.match(r.re);
      if (m) { match = r; params = m.slice(1).map(decodeURIComponent); break; }
    }
    if (!match) { location.replace('#/dashboard'); return; }
    if (match.roles && !match.roles.includes(App.user.role)) {
      UI.toast('Halaman ini hanya untuk Admin/Pengawas.', 'warn', 'Akses dibatasi');
      location.replace('#/dashboard');
      return;
    }
    App.runCleanups();
    $$('.modal-backdrop').forEach((m) => m.remove());
    document.body.style.overflow = '';

    App.markActive();
    const top = path.split('/')[0];
    $('#tb-search-input').value = top === 'laporan' && query.q ? query.q : '';

    const el = $('#page');
    el.innerHTML = '';
    App.currentRoute = location.hash;
    window.scrollTo(0, 0);
    try {
      await match.page()(el, { params, query });
    } catch (e) {
      if (e && e.code === 'AUTH') return;
      el.innerHTML = `<div class="card">${UI.empty('Halaman gagal dimuat', e.message || 'Terjadi kesalahan.', 'cloud-off')}
        <div class="center"><button class="btn btn-primary" id="retry-route">${UI.icon('refresh-cw')}Coba Lagi</button></div></div>`;
      UI.icons(el);
      $('#retry-route').onclick = () => App.route();
    }
    UI.icons(el);
    el.focus({ preventScroll: true });
    if (App.afterRoute) { const fn = App.afterRoute; App.afterRoute = null; fn(); }
  },

  /** Masih di halaman yang sama? (mencegah render data lama setelah pindah halaman) */
  stillOn(hash) { return App.currentRoute === hash; }
};

window.Pages = window.Pages || {};
document.addEventListener('DOMContentLoaded', () => App.init());
