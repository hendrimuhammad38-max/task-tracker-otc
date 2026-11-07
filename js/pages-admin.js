/* =============================================================================
   HALAMAN ADMIN — Kelola Pengguna, Data Master, Log Aktivitas — dan Profil
   ============================================================================= */
window.Pages = window.Pages || {};

Pages.statCard = function (label, value, sub, icon, tile = '', extra = '') {
  return `<div class="card" style="padding:18px">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><span class="small" style="font-weight:700">${label}</span><span class="ic-tile sm ${tile}">${UI.icon(icon)}</span></div>
    <div class="kpi-value mt-1">${value}</div><div class="small muted mt-1">${sub}</div>${extra}</div>`;
};

Pages.pwField = function (name, label, placeholder, hint = '') {
  return `<label class="field" data-field="${name}"><span class="field-label">${label}</span>
    <span class="input-wrap">${UI.icon('key-round')}<input class="input" type="password" name="${name}" placeholder="${placeholder}" autocomplete="new-password">
    <button type="button" class="input-btn" data-eye aria-label="Tampilkan kata sandi">${UI.icon('eye')}</button></span>${hint}</label>`;
};
Pages.bindEyes = function (root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-eye]');
    if (!b) return;
    const i = b.parentElement.querySelector('input');
    i.type = i.type === 'password' ? 'text' : 'password';
  });
};
Pages.randomPassword = function () {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz', n = '23456789';
  const r = (s) => s[Math.floor(Math.random() * s.length)];
  let p = '';
  for (let i = 0; i < 7; i++) p += r(a);
  return p + r(n) + r(n) + r(n);
};

// =============================================================================
// KELOLA PENGGUNA
// =============================================================================
Pages.users = async function (el) {
  const hash = location.hash;
  const me = App.user;
  const st = { q: '', role: '', dept: '', nonaktif: false, page: 1 };
  let data = { users: [], stats: {} };

  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs">${UI.icon('shield')} Modul F-09 <span>•</span> <b>Role-Based Access Control</b></div>
        <h1 class="page-title">Kelola Pengguna &amp; Hak Akses</h1>
        <p class="page-desc">Manajemen akun trainer, pengawas, dan admin: peran, status aktivasi, dan kredensial login.</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost" id="u-export">${UI.icon('download')}Ekspor Akun</button>
        <button class="btn btn-primary" id="u-add">${UI.icon('user-plus')}Tambah Pengguna Baru</button>
      </div>
    </div>
    <div class="grid g-4 anim-in" id="u-stats">${'<div class="card skel" style="height:140px"></div>'.repeat(4)}</div>
    <section class="card mt-3" style="padding:14px 18px">
      <div class="row-wrap"><span class="ic-tile sm">${UI.icon('shield-check')}</span>
        <div style="flex:1;min-width:200px"><b class="small">Protokol Keamanan &amp; Sesi Karyawan</b>
        <div class="tiny muted">Sandi di-hash SHA-256 + salt • Sesi login 8 jam • Akun terkunci 15 menit setelah 5x gagal • Validasi peran di server</div></div>
        <span class="pill pill-ok pill-dot">Layanan Sehat</span></div>
    </section>
    <section class="card filter-card mt-3">
      <div class="search-row">
        <span class="input-wrap">${UI.icon('search')}<input class="input" id="u-q" type="search" placeholder="Cari nama, No. Badge, departemen, atau peran…"></span>
        <select class="select" id="u-dept" style="width:auto;min-width:200px" aria-label="Filter departemen"><option value="">Semua Departemen</option></select>
      </div>
      <div class="chips mt-2" id="u-chips"></div>
    </section>
    <div class="grid g-table-side mt-3">
      <section class="card" id="u-table">${UI.loader()}</section>
      <div class="stack side">
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon('shield-half')}</span>Matriks Hak Akses (RBAC)</div></div>
          <p class="small muted">Setiap peran memiliki batas wewenang yang diperiksa di server untuk menjaga integritas data pelatihan.</p>
          <div class="table-wrap mt-2"><table class="table" style="font-size:12.5px">
            <thead><tr><th>Fungsi</th><th>TRN</th><th>PGW</th><th>ADM</th></tr></thead>
            <tbody>${[
              ['Buat laporan &amp; unduh PDF', 1, 1, 1], ['Lihat semua laporan', 1, 1, 1], ['Ubah / hapus laporan', 0, 1, 1],
              ['Kelola pengguna', 0, 1, 1], ['Beri peran Admin', 0, 0, 1], ['Kelola data master', 0, 1, 1], ['Lihat log aktivitas', 0, 1, 1]
            ].map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((v) => `<td>${v ? `<span style="color:var(--ok)">${UI.icon('circle-check')}</span>` : '<span class="faint">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>
          <p class="tiny faint mt-1">TRN: Trainer • PGW: Pengawas • ADM: Administrator</p>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm bad">${UI.icon('shield-alert')}</span>Audit Keamanan Terakhir</div>
            <a class="link-btn" href="#/log">Semua Log</a></div>
          <div class="stack" style="gap:10px" id="u-audit">${UI.loader('')}</div>
        </section>
      </div>
    </div>`;

  async function load(force) {
    let d;
    try { d = await API.swr('listUsers', {}, (x) => paint(x), { force }); } catch (e) { UI.error(e); return; }
    paint(d);
  }
  function paint(x) {
    if (!App.stillOn(hash)) return;
    data = x;
    const s = data.stats;
    $('#u-stats', el).innerHTML = [
      Pages.statCard('Total Terdaftar', `<span data-count="${s.total}">0</span><small>Pengguna</small>`,
        `<span class="pill pill-ok">${s.aktif} Aktif</span> <span class="pill pill-bad">${s.nonaktif} Nonaktif</span>`, 'contact-round', 'info'),
      Pages.statCard('Trainer / Instruktur', `<span data-count="${s.TRAINER || 0}">0</span><small>Akun Lapangan</small>`, 'Input laporan &amp; unduh PDF', 'graduation-cap'),
      Pages.statCard('Pengawas Lapangan', `<span data-count="${s.PENGAWAS || 0}">0</span><small>Akun Verifikator</small>`, 'Monitoring &amp; koreksi data', 'shield-check', 'praktik'),
      Pages.statCard('Administrator Sistem', `<span data-count="${s.ADMIN || 0}">0</span><small>Full Access</small>`, 'Konfigurasi master &amp; RBAC', 'shield-ellipsis', 'violet')
    ].join('');
    UI.icons($('#u-stats', el));
    UI.countUp($('#u-stats', el));
    const depts = Array.from(new Set(data.users.map((u) => u.dept).filter(Boolean))).sort();
    $('#u-dept', el).innerHTML = '<option value="">Semua Departemen</option>' + depts.map((d) => `<option ${d === st.dept ? 'selected' : ''}>${UI.esc(d)}</option>`).join('');
    render();
  }

  function render() {
    const s = data.stats;
    $('#u-chips', el).innerHTML = [['', 'Semua Pengguna', s.total], ['TRAINER', 'Trainer', s.TRAINER || 0], ['PENGAWAS', 'Pengawas', s.PENGAWAS || 0],
      ['ADMIN', 'Admin', s.ADMIN || 0], ['NONAKTIF', 'Nonaktif', s.nonaktif]]
      .map((c) => `<button class="chip ${(c[0] === 'NONAKTIF' ? st.nonaktif : (!st.nonaktif && st.role === c[0])) ? 'active' : ''}" data-chip="${c[0]}">${c[1]} <span class="count">${c[2]}</span></button>`).join('');
    const q = st.q.toLowerCase();
    const list = data.users.filter((u) => {
      if (st.nonaktif && u.status !== 'NONAKTIF') return false;
      if (!st.nonaktif && st.role && u.role !== st.role) return false;
      if (st.dept && u.dept !== st.dept) return false;
      if (q && ![u.nama, u.badge, u.dept, u.role, u.id].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    const size = 10, pages = Math.max(1, Math.ceil(list.length / size));
    st.page = Math.min(st.page, pages);
    const items = list.slice((st.page - 1) * size, st.page * size);
    const actions = (u) => {
      const lockedAdmin = u.role === 'ADMIN' && me.role !== 'ADMIN';
      const self = u.id === me.id;
      return `<div class="actions">
        <button class="btn-round" data-edit="${u.id}" title="Ubah" aria-label="Ubah ${UI.esc(u.nama)}" ${lockedAdmin ? 'disabled' : ''}>${UI.icon('pencil')}</button>
        <button class="btn-round" data-reset="${u.id}" title="Reset sandi" aria-label="Reset sandi ${UI.esc(u.nama)}" ${lockedAdmin ? 'disabled' : ''}>${UI.icon('key-round')}</button>
        <button class="btn-round ${u.status === 'AKTIF' ? 'danger' : ''}" data-toggle="${u.id}" title="${u.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}"
          aria-label="${u.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'} ${UI.esc(u.nama)}" ${lockedAdmin || self ? 'disabled' : ''}>${UI.icon(u.status === 'AKTIF' ? 'user-x' : 'user-check')}</button></div>`;
    };
    const statusPill = (u) => (u.status === 'AKTIF' ? '<span class="pill pill-ok pill-dot">Aktif</span>' : '<span class="pill pill-gray pill-dot">Nonaktif</span>');
    const wa = (u) => (u.wa ? `<div class="cell-sub row" style="gap:4px">${UI.icon('message-circle')}+${UI.esc(u.wa)}</div>` : '<div class="cell-sub">Tanpa No. WA</div>');
    const t = $('#u-table', el);
    t.innerHTML = `
      <div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon('users')}</span>Direktori Karyawan &amp; Kredensial</div>
        <span class="small muted">Menampilkan ${items.length} dari ${list.length} entri</span></div>
      ${list.length ? `<div class="table-wrap desktop-table"><table class="table">
        <thead><tr><th>ID &amp; Badge</th><th>Nama &amp; Kontak</th><th>Peran</th><th>Departemen</th><th>Laporan</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead>
        <tbody>${items.map((u) => `<tr>
          <td><b class="mono" style="color:var(--primary)">${UI.esc(u.id)}</b><div class="cell-sub mono">${UI.esc(u.badge)}</div></td>
          <td><div class="user-cell">${UI.avatar(u.nama)}<div style="min-width:0"><b>${UI.esc(u.nama)}</b>${self(u)}${wa(u)}</div></div></td>
          <td>${UI.rolePill(u.role)}</td><td class="small">${UI.esc(u.dept)}</td><td><b>${UI.num(u.laporan)}</b></td>
          <td>${statusPill(u)}</td><td>${actions(u)}</td></tr>`).join('')}</tbody></table></div>
        <div class="mobile-cards">${items.map((u) => `<div class="r-card">
          <div class="r-card-top"><div class="user-cell">${UI.avatar(u.nama)}<div><b>${UI.esc(u.nama)}</b><div class="cell-sub mono">${UI.esc(u.badge)} • ${UI.esc(u.id)}</div></div></div>${statusPill(u)}</div>
          <div class="li-meta">${UI.rolePill(u.role)}<span>${UI.esc(u.dept)}</span><span>• ${UI.num(u.laporan)} laporan</span></div>
          <div class="r-card-actions" style="justify-content:flex-end">${actions(u)}</div></div>`).join('')}</div>
        ${UI.pager(st.page, pages, list.length, 'akun')}` : UI.empty('Tidak ada pengguna', 'Ubah kata kunci atau filter.', 'user-search')}`;
    UI.icons(t);
    UI.icons($('#u-chips', el));
  }
  const self = (u) => (u.id === me.id ? ' <span class="pill pill-info" style="font-size:10.5px">Anda</span>' : '');

  async function loadAudit() {
    try {
      const d = await API.swr('listLogs', { days: 30, kategori: ['keamanan', 'pengguna'], status: 'GAGAL', size: 4 });
      const items = d.items.length ? d.items : (await API.swr('listLogs', { days: 30, kategori: ['pengguna'], size: 4 })).items;
      if (!App.stillOn(hash)) return;
      $('#u-audit', el).innerHTML = items.length ? items.map((l) => `<div class="stat-row" style="align-items:flex-start">
        <span class="ic-tile sm ${l.status === 'SUKSES' ? '' : 'bad'}">${UI.icon(Pages.logIcon(l.aksi))}</span>
        <div style="min-width:0"><b class="small" style="font-size:13px;margin:0">${UI.esc(Pages.aksiLabel(l.aksi))} ${UI.esc(l.target)}</b>
        <div class="tiny muted">${UI.esc(l.nama)} • ${UI.esc(UI.dateTime(l.ts))}</div></div></div>`).join('')
        : UI.empty('Aman', 'Tidak ada insiden keamanan 30 hari terakhir.', 'shield-check');
      UI.icons($('#u-audit', el));
    } catch (e) { $('#u-audit', el).innerHTML = ''; }
  }

  $('#u-q', el).addEventListener('input', UI.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; render(); }, 200));
  $('#u-dept', el).addEventListener('change', (e) => { st.dept = e.target.value; st.page = 1; render(); });
  $('#u-chips', el).addEventListener('click', (e) => {
    const c = e.target.closest('[data-chip]');
    if (!c) return;
    st.nonaktif = c.dataset.chip === 'NONAKTIF';
    st.role = st.nonaktif ? '' : c.dataset.chip;
    st.page = 1;
    render();
  });
  $('#u-add', el).onclick = () => userModal(null);
  $('#u-export', el).onclick = () => {
    const rows = [['ID', 'No Badge', 'Nama', 'Peran', 'Departemen', 'No WA', 'Status', 'Jumlah Laporan']]
      .concat(data.users.map((u) => [u.id, u.badge, u.nama, u.role, u.dept, u.wa, u.status, u.laporan]));
    UI.saveText(UI.csv(rows), `Akun_OTC_${UI.today()}.csv`);
  };
  $('#u-table', el).addEventListener('click', async (e) => {
    const pg = e.target.closest('[data-page]');
    if (pg && !pg.disabled) { st.page = Number(pg.dataset.page); render(); return; }
    const find = (id) => data.users.find((u) => u.id === id);
    const ed = e.target.closest('[data-edit]');
    if (ed && !ed.disabled) { userModal(find(ed.dataset.edit)); return; }
    const rs = e.target.closest('[data-reset]');
    if (rs && !rs.disabled) { resetModal(find(rs.dataset.reset)); return; }
    const tg = e.target.closest('[data-toggle]');
    if (tg && !tg.disabled) {
      const u = find(tg.dataset.toggle);
      const off = u.status === 'AKTIF';
      const ok = await UI.confirm({
        title: off ? 'Nonaktifkan akun?' : 'Aktifkan akun?', danger: off, icon: off ? 'user-x' : 'user-check', okText: off ? 'Nonaktifkan' : 'Aktifkan',
        message: off ? `<b>${UI.esc(u.nama)}</b> tidak akan bisa masuk lagi dan sesi aktifnya langsung berakhir. Laporan yang sudah dibuat tetap tersimpan.`
          : `<b>${UI.esc(u.nama)}</b> akan dapat masuk kembali ke aplikasi.`
      });
      if (!ok) return;
      try {
        await API.call('setUserStatus', { id: u.id, status: off ? 'NONAKTIF' : 'AKTIF' });
        UI.toast(`Akun ${u.nama} ${off ? 'dinonaktifkan' : 'diaktifkan'}.`, 'ok');
        load(true);
      } catch (ex) { UI.error(ex); }
    }
  });

  function userModal(u) {
    const isNew = !u;
    const depts = (App.masters.departemen || []).filter((d) => d.status !== 'Nonaktif').map((d) => d.nama);
    if (u && u.dept && !depts.includes(u.dept)) depts.push(u.dept);
    if (!depts.includes('IT & Systems OTC')) depts.push('IT & Systems OTC');
    const role = u ? u.role : 'TRAINER';
    const roleCard = (r, tag, title, desc, cls) => {
      const dis = r === 'ADMIN' && me.role !== 'ADMIN';
      return `<label class="choice ${cls}" style="${dis ? 'opacity:.5;cursor:not-allowed' : ''}"><input type="radio" name="role" value="${r}" ${role === r ? 'checked' : ''} ${dis ? 'disabled' : ''}>
        <div><span class="pill ${r === 'TRAINER' ? 'pill-teori' : r === 'PENGAWAS' ? 'pill-praktik' : 'pill-violet'}" style="font-size:10.5px">${tag}</span>
        <b class="mt-1">${title}</b><small>${desc}</small></div><span class="choice-check"></span></label>`;
    };
    const m = UI.modal({
      size: 'lg', icon: 'user-plus', title: isNew ? 'Tambah Pengguna Baru' : 'Ubah Pengguna',
      subtitle: isNew ? 'Daftarkan trainer, pengawas, atau administrator ke Task Tracker OTC.' : `${UI.esc(u.id)} • ${UI.esc(u.nama)}`,
      body: `<form id="uf" class="form-grid" novalidate>
        <label class="field" data-field="badge"><span class="field-label">No. Badge (Username Login) <span class="req">*</span></span>
          <span class="input-wrap">${UI.icon('id-card')}<input class="input" name="badge" value="${UI.esc(u ? u.badge : '')}" placeholder="BDG-5520" maxlength="40"></span>
          <span class="field-hint">Wajib unik, dipakai untuk masuk.</span></label>
        <label class="field" data-field="nama"><span class="field-label">Nama Lengkap <span class="req">*</span></span>
          <span class="input-wrap">${UI.icon('user-round')}<input class="input" name="nama" value="${UI.esc(u ? u.nama : '')}" placeholder="Nama sesuai kartu identitas" maxlength="100"></span></label>
        <div class="field span-2" data-field="role"><span class="field-label">Peran / Role Akses <span class="req">*</span></span>
          <div class="choice-grid">
            ${roleCard('TRAINER', 'TRN', 'Trainer / Instruktur', 'Input laporan, unduh PDF, lihat histori.', '')}
            ${roleCard('PENGAWAS', 'PGW', 'Pengawas / Supervisor', 'Koreksi data, pantau dashboard, kelola akun.', 'c-praktik')}
            ${roleCard('ADMIN', 'ADM', 'Administrator', 'Akses penuh master, pengguna &amp; RBAC.', '')}
          </div></div>
        <label class="field" data-field="dept"><span class="field-label">Departemen <span class="req">*</span></span>
          <select class="select" name="dept"><option value="">Pilih departemen…</option>${depts.map((d) => `<option ${u && u.dept === d ? 'selected' : ''}>${UI.esc(d)}</option>`).join('')}<option value="__manual">Lainnya (ketik manual)…</option></select>
          <input class="input" name="deptManual" placeholder="Ketik nama departemen…" maxlength="100" hidden></label>
        <label class="field" data-field="wa"><span class="field-label">No. WhatsApp <span class="faint tiny">Opsional</span></span>
          <span class="input-wrap">${UI.icon('message-circle')}<input class="input" name="wa" value="${UI.esc(u && u.wa ? '0' + String(u.wa).replace(/^62/, '') : '')}" placeholder="0812-9844-3120" inputmode="tel"></span>
          <span class="field-hint">Pengawas dengan No. WA muncul sebagai tujuan kirim laporan.</span></label>
        ${isNew ? Pages.pwField('password', 'Kata Sandi Awal <span class="req">*</span>', 'Min. 8 karakter, huruf &amp; angka',
          `<span class="row-wrap"><span class="field-hint">Disimpan terenkripsi (SHA-256 + salt).</span><button type="button" class="link-btn" id="uf-gen">${UI.icon('sparkles')}Buat otomatis</button></span>`) : ''}
        <div class="field"><span class="field-label">Status Akun</span>
          <div class="segmented" id="uf-status"><button type="button" data-v="AKTIF">Aktif (dapat login)</button><button type="button" data-v="NONAKTIF">Ditangguhkan</button></div></div>
        <div class="alert alert-info span-2">${UI.icon('shield')}<span>Akun otomatis terkunci 15 menit setelah 5 kali gagal login. Pengguna dapat mengganti sandi sendiri di menu Profil.</span></div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="uf-save">${UI.icon('check')}${isNew ? 'Simpan &amp; Buat Kredensial' : 'Simpan Perubahan'}</button>`
    });
    const form = $('#uf', m.el);
    Pages.bindEyes(form);
    form.querySelector('[name="dept"]').addEventListener('change', (e) => {
      const man = form.querySelector('[name="deptManual"]');
      man.hidden = e.target.value !== '__manual';
      if (!man.hidden) man.focus();
    });
    let status = u ? u.status : 'AKTIF';
    const setStatus = () => $$('#uf-status button', m.el).forEach((b) => b.classList.toggle('active', b.dataset.v === status));
    setStatus();
    if (u && u.id === me.id) { $$('#uf-status button', m.el).forEach((b) => { b.disabled = true; }); $$('[name="role"]', m.el).forEach((r) => { r.disabled = true; }); }
    $('#uf-status', m.el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled) { status = b.dataset.v; setStatus(); } });
    if ($('#uf-gen', m.el)) {
      $('#uf-gen', m.el).onclick = () => {
        const i = form.querySelector('[name="password"]');
        i.value = Pages.randomPassword();
        i.type = 'text';
      };
    }
    $('#uf-save', m.el).onclick = async (e) => {
      const btn = e.currentTarget;
      const v = (n) => (form.querySelector(`[name="${n}"]`) || {}).value || '';
      const r = form.querySelector('[name="role"]:checked');
      const dept = v('dept') === '__manual' ? v('deptManual').trim() : v('dept');
      const payload = { id: u ? u.id : '', badge: v('badge').trim(), nama: v('nama').trim(), role: r ? r.value : '', dept, wa: v('wa'), status, password: v('password') };
      const err = {};
      if (!payload.badge) err.badge = 'No. Badge wajib diisi.';
      if (!payload.nama) err.nama = 'Nama wajib diisi.';
      if (!payload.role) err.role = 'Pilih peran.';
      if (!payload.dept) err.dept = 'Pilih departemen.';
      if (isNew && (payload.password.length < 8 || !/[A-Za-z]/.test(payload.password) || !/\d/.test(payload.password))) err.password = 'Minimal 8 karakter, berisi huruf dan angka.';
      UI.fieldErrors(form, Object.keys(err).length ? err : null);
      if (Object.keys(err).length) return;
      UI.busy(btn, true, 'Menyimpan…');
      try {
        await API.call('saveUser', payload);
        m.close();
        if (isNew) {
          Pages.credModal(payload.badge, payload.password, payload.nama);
        } else UI.toast(`Akun ${payload.nama} diperbarui.`, 'ok');
        load(true);
      } catch (ex) {
        UI.busy(btn, false);
        UI.icons(btn);
        if (ex.fields) UI.fieldErrors(form, ex.fields);
        UI.error(ex);
      }
    };
  }

  function resetModal(u) {
    const m = UI.modal({
      icon: 'key-round', iconClass: 'warn', title: 'Reset Kata Sandi', subtitle: `${UI.esc(u.nama)} • ${UI.esc(u.badge)}`,
      body: `<form id="rf2" novalidate class="stack" style="gap:14px">
        ${Pages.pwField('password', 'Kata Sandi Baru', 'Min. 8 karakter, huruf & angka', `<button type="button" class="link-btn" id="rp-gen">${UI.icon('sparkles')}Buat otomatis</button>`)}
        <div class="alert alert-warn">${UI.icon('triangle-alert')}<span>Semua sesi login pengguna ini akan berakhir. Sampaikan sandi baru secara pribadi.</span></div></form>`,
      footer: `<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="rp-save">${UI.icon('check')}Reset Sandi</button>`
    });
    const form = $('#rf2', m.el);
    Pages.bindEyes(form);
    $('#rp-gen', m.el).onclick = () => { const i = form.querySelector('input'); i.value = Pages.randomPassword(); i.type = 'text'; };
    $('#rp-save', m.el).onclick = async (e) => {
      const pw = form.querySelector('input').value;
      if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) { UI.fieldErrors(form, { password: 'Minimal 8 karakter, berisi huruf dan angka.' }); return; }
      const btn = e.currentTarget;
      UI.busy(btn, true, 'Menyimpan…');
      try {
        await API.call('resetPassword', { id: u.id, password: pw });
        m.close();
        Pages.credModal(u.badge, pw, u.nama, true);
      } catch (ex) { UI.busy(btn, false); UI.icons(btn); UI.error(ex); }
    };
  }

  await load();
  loadAudit();
};

/** Tampilkan kredensial sekali setelah dibuat/reset (untuk disalin admin). */
Pages.credModal = function (badge, pw, nama, reset) {
  const text = `Akun Task Tracker OTC\nNama: ${nama}\nNo. Badge: ${badge}\nKata sandi: ${pw}\nAlamat: ${location.origin}${location.pathname}\nSegera ganti kata sandi di menu Profil setelah masuk.`;
  const m = UI.modal({
    icon: 'badge-check', iconClass: 'ok', title: reset ? 'Kata Sandi Berhasil Direset' : 'Akun Berhasil Dibuat',
    subtitle: 'Sandi hanya ditampilkan sekali — salin dan sampaikan secara pribadi.',
    body: `<div class="wa-msg mono" style="background:var(--surface-2)">${UI.esc(text)}</div>`,
    footer: `<button class="btn btn-ghost" data-close>Tutup</button><button class="btn btn-primary" id="cp">${UI.icon('copy')}Salin Teks</button>`
  });
  $('#cp', m.el).onclick = async () => {
    try { await navigator.clipboard.writeText(text); UI.toast('Disalin ke clipboard.', 'ok'); } catch (e) { UI.toast('Salin manual teks di atas.', 'warn'); }
  };
};

// =============================================================================
// DATA MASTER
// =============================================================================
Pages.masters = async function (el, { query }) {
  const hash = location.hash;
  const TABS = {
    pelatihan: { label: 'Pelatihan & Silabus', icon: 'book-open', statuses: ['Aktif', 'Nonaktif'] },
    alat: { label: 'Alat Berat / Fleet', icon: 'truck', statuses: ['Siap', 'Maintenance', 'Nonaktif'] },
    departemen: { label: 'Departemen', icon: 'building-2', statuses: ['Aktif', 'Nonaktif'] },
    lokasi: { label: 'Lokasi Pelaksanaan', icon: 'map-pin', statuses: ['Aktif', 'Nonaktif'] }
  };
  const st = { tab: TABS[query.tab] ? query.tab : 'pelatihan', q: '', jenis: '', status: '', aktif: false };
  let data = { masters: { pelatihan: [], alat: [], departemen: [], lokasi: [] }, populer: [] };

  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs">Admin Control <span>›</span> <b>Data Master Sistem</b></div>
        <h1 class="page-title">Kelola Data Master Sistem</h1>
        <p class="page-desc">Konfigurasi modul pelatihan, armada alat berat, departemen, dan lokasi training. Data yang sudah dipakai di laporan hanya dapat dinonaktifkan demi keandalan arsip &amp; audit.</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost" id="m-sync">${UI.icon('refresh-cw')}Sinkronisasi Google Sheets</button>
        <button class="btn btn-primary" id="m-add">${UI.icon('plus')}Tambah Data Baru</button>
      </div>
    </div>
    <div class="grid g-4 anim-in" id="m-stats">${'<div class="card skel" style="height:130px"></div>'.repeat(4)}</div>
    <div class="chips mt-3" id="m-tabs"></div>
    <div class="grid g-table-side mt-3">
      <div class="stack">
        <section class="card filter-card"><div class="search-row" id="m-filter"></div></section>
        <section class="card" id="m-table">${UI.loader()}</section>
      </div>
      <div class="stack side">
        <section class="card" style="background:linear-gradient(160deg,var(--primary-50),var(--glass))">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon('shield-check')}</span>Integritas Data (PRD F-10)</div></div>
          <p class="small muted">Data master yang sudah dipakai minimal 1 laporan <b>tidak dapat dihapus</b> permanen. Hal ini memastikan:</p>
          <div class="stack mt-2 small" style="gap:8px">
            <div class="row" style="align-items:flex-start">${UI.icon('circle-check')}<span>Riwayat laporan &amp; pembuatan ulang PDF tetap konsisten.</span></div>
            <div class="row" style="align-items:flex-start">${UI.icon('circle-check')}<span>Dashboard &amp; statistik tidak kehilangan referensi.</span></div>
            <div class="row" style="align-items:flex-start">${UI.icon('circle-check')}<span>Gunakan tombol <b>Nonaktifkan</b> jika data sudah tidak dipakai.</span></div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm praktik">${UI.icon('trending-up')}</span>Silabus Terpopuler Bulan Ini</div><span class="pill pill-teori">Top 3</span></div>
          <div class="stack" style="gap:12px" id="m-pop"></div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm info">${UI.icon('truck')}</span>Status Armada Pelatihan</div></div>
          <div class="grid g-3" style="gap:10px" id="m-fleet"></div>
        </section>
      </div>
    </div>`;

  async function load(force) {
    let d;
    try { d = await API.swr('listMasters', {}, (x) => paint(x), { force }); } catch (e) { UI.error(e); return; }
    paint(d);
  }
  function paint(x) {
    if (!App.stillOn(hash)) return;
    data = x;
    App.masters = {};
    Object.keys(data.masters).forEach((k) => { App.masters[k] = data.masters[k].map((x) => { const o = Object.assign({}, x); delete o.dipakai; return o; }); });
    const M = data.masters;
    const cnt = (xs, f) => xs.filter(f).length;
    $('#m-stats', el).innerHTML = [
      Pages.statCard('Total Modul Pelatihan', `<span data-count="${cnt(M.pelatihan, (x) => x.status === 'Aktif')}">0</span><small style="color:var(--praktik)">Modul Aktif</small>`,
        `${cnt(M.pelatihan, (x) => x.jenis === 'Praktik Lapangan')} Praktik Lapangan • ${cnt(M.pelatihan, (x) => x.jenis === 'Teori Kelas')} Teori`, 'graduation-cap'),
      Pages.statCard('Armada Alat Berat', `<span data-count="${M.alat.length}">0</span><small style="color:var(--praktik)">Unit Fleet</small>`,
        `${cnt(M.alat, (x) => x.status === 'Siap')} Siap Pakai • ${cnt(M.alat, (x) => x.status === 'Maintenance')} Maintenance`, 'truck', 'info'),
      Pages.statCard('Departemen Operasional', `<span data-count="${cnt(M.departemen, (x) => x.status === 'Aktif')}">0</span><small style="color:var(--praktik)">Divisi Terdata</small>`,
        `${M.departemen.length} total departemen`, 'building-2', 'info'),
      Pages.statCard('Lokasi Training', `<span data-count="${cnt(M.lokasi, (x) => x.status === 'Aktif')}">0</span><small style="color:var(--praktik)">Titik Aktif</small>`,
        `${cnt(M.lokasi, (x) => x.tipe === 'Ruang Kelas')} Ruang Kelas • ${cnt(M.lokasi, (x) => x.tipe === 'Lapangan')} Lapangan`, 'map-pin')
    ].join('');
    UI.icons($('#m-stats', el));
    UI.countUp($('#m-stats', el));
    $('#m-pop', el).innerHTML = data.populer.length ? data.populer.map((p) => {
      const max = data.populer[0].count || 1;
      return `<div class="stat-row" style="flex-direction:column;align-items:stretch;gap:8px">
        <div class="row" style="justify-content:space-between"><span class="small truncate" style="font-weight:700">${UI.esc(p.nama)}</span><b style="color:var(--primary);margin:0">${p.count} Sesi</b></div>
        <div class="progress lg teal"><span style="width:${Math.round(p.count / max * 100)}%"></span></div>
        <div class="tiny faint">${UI.esc(p.jenis)} • ${UI.esc(p.lokasi)}</div></div>`;
    }).join('') : UI.empty('Belum ada data', 'Belum ada laporan bulan ini.', 'book-open');
    $('#m-fleet', el).innerHTML = [['Siap', 'Siap Jalan', 'pill-teori'], ['Maintenance', 'Maintenance', 'pill-praktik'], ['Nonaktif', 'Nonaktif', 'pill-info']]
      .map((s) => `<div class="pill ${s[2]}" style="display:grid;justify-items:center;padding:12px 4px;border-radius:16px">
        <b style="font-size:24px">${cnt(M.alat, (x) => x.status === s[0])}</b><span style="font-size:11px">${s[1]}</span></div>`).join('');
    UI.icons($('#m-pop', el));
    render();
  }

  function filterBar() {
    const t = TABS[st.tab];
    $('#m-filter', el).innerHTML = `
      <span class="input-wrap">${UI.icon('search')}<input class="input" id="mf-q" type="search" placeholder="Cari nama atau kode…" value="${UI.esc(st.q)}"></span>
      ${st.tab === 'pelatihan' ? `<select class="select" id="mf-jenis" style="width:auto"><option value="">Semua Jenis</option><option ${st.jenis === 'Teori Kelas' ? 'selected' : ''}>Teori Kelas</option><option ${st.jenis === 'Praktik Lapangan' ? 'selected' : ''}>Praktik Lapangan</option></select>` : ''}
      <select class="select" id="mf-status" style="width:auto"><option value="">Status: Semua</option>${t.statuses.map((s) => `<option ${st.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" id="mf-aktif" ${st.aktif ? 'checked' : ''}> Hanya aktif</label>`;
    $('#mf-q', el).addEventListener('input', UI.debounce((e) => { st.q = e.target.value.trim(); render(); }, 200));
    if ($('#mf-jenis', el)) $('#mf-jenis', el).addEventListener('change', (e) => { st.jenis = e.target.value; render(); });
    $('#mf-status', el).addEventListener('change', (e) => { st.status = e.target.value; render(); });
    $('#mf-aktif', el).addEventListener('change', (e) => { st.aktif = e.target.checked; render(); });
  }

  function render() {
    $('#m-tabs', el).innerHTML = Object.keys(TABS).map((k) => `<button class="chip ${st.tab === k ? 'active' : ''}" data-tab="${k}">${UI.icon(TABS[k].icon)}${TABS[k].label} <span class="count">${data.masters[k].length}</span></button>`).join('');
    UI.icons($('#m-tabs', el));
    const q = st.q.toLowerCase();
    const list = data.masters[st.tab].filter((x) => {
      if (q && !(x.nama + ' ' + x.kode).toLowerCase().includes(q)) return false;
      if (st.jenis && x.jenis !== st.jenis) return false;
      if (st.status && x.status !== st.status) return false;
      if (st.aktif && x.status === 'Nonaktif') return false;
      return true;
    });
    const statusPill = (s) => `<span class="pill ${s === 'Nonaktif' ? 'pill-gray' : s === 'Maintenance' ? 'pill-warn' : 'pill-ok'} pill-dot">${UI.esc(s)}</span>`;
    const used = (n) => `<span class="pill ${n ? 'pill-gray' : 'pill-info'}">${UI.icon(n ? 'lock' : 'lock-open')}${n ? n + ' laporan' : 'Bisa dihapus'}</span>`;
    const actions = (x) => `<div class="actions">
      <button class="btn-round" data-medit="${UI.esc(x.kode)}" title="Ubah" aria-label="Ubah ${UI.esc(x.nama)}">${UI.icon('pencil')}</button>
      <button class="btn-round ${x.status === 'Nonaktif' ? '' : 'danger'}" data-mtoggle="${UI.esc(x.kode)}" title="${x.status === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan'}"
        aria-label="${x.status === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan'} ${UI.esc(x.nama)}">${UI.icon(x.status === 'Nonaktif' ? 'power' : 'power-off')}</button>
      ${!x.dipakai ? `<button class="btn-round danger" data-mdel="${UI.esc(x.kode)}" title="Hapus" aria-label="Hapus ${UI.esc(x.nama)}">${UI.icon('trash-2')}</button>` : ''}</div>`;
    const kodeCell = (x) => `<span class="pill pill-mono">${UI.esc(x.kode)}</span>`;
    let head, rows;
    if (st.tab === 'pelatihan') {
      head = '<th>Kode &amp; Nama Pelatihan</th><th>Kategori</th><th>Durasi</th><th>Keterikatan</th><th>Status</th><th style="text-align:right">Aksi</th>';
      rows = list.map((x) => `<tr><td style="max-width:340px">${kodeCell(x)}<div class="cell-title mt-1">${UI.esc(x.nama)}</div><div class="cell-sub">${UI.esc(x.deskripsi || '')}</div></td>
        <td>${UI.jenisPill(x.jenis)}</td><td class="nowrap"><b>${UI.esc(x.durasiJp || '—')} JP</b><div class="cell-sub">${UI.esc(x.estimasiHari || '')}</div></td>
        <td>${used(x.dipakai)}</td><td>${statusPill(x.status)}</td><td>${actions(x)}</td></tr>`);
    } else {
      const hasTipe = st.tab !== 'departemen';
      head = `<th>Kode</th><th>Nama</th>${hasTipe ? '<th>Tipe</th>' : ''}<th>Keterikatan</th><th>Status</th><th style="text-align:right">Aksi</th>`;
      rows = list.map((x) => `<tr><td>${kodeCell(x)}</td><td class="cell-title">${UI.esc(x.nama)}</td>${hasTipe ? `<td class="small">${UI.esc(x.tipe || '—')}</td>` : ''}
        <td>${used(x.dipakai)}</td><td>${statusPill(x.status)}</td><td>${actions(x)}</td></tr>`);
    }
    const t = $('#m-table', el);
    t.innerHTML = `<div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon(TABS[st.tab].icon)}</span>Daftar ${TABS[st.tab].label}</div>
      <span class="pill pill-info">Menampilkan ${list.length} dari ${data.masters[st.tab].length} data</span></div>
      ${list.length ? `<div class="table-wrap desktop-table"><table class="table"><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table></div>
      <div class="mobile-cards">${list.map((x) => `<div class="r-card"><div class="r-card-top">${kodeCell(x)}${statusPill(x.status)}</div>
        <div class="li-title">${UI.esc(x.nama)}</div><div class="li-meta">${x.jenis ? UI.jenisPill(x.jenis) : ''}${x.tipe ? `<span>${UI.esc(x.tipe)}</span>` : ''}${used(x.dipakai)}</div>
        <div class="r-card-actions" style="justify-content:flex-end">${actions(x)}</div></div>`).join('')}</div>`
        : UI.empty('Data tidak ditemukan', 'Ubah filter atau tambah data baru.', 'database')}`;
    UI.icons(t);
  }

  $('#m-tabs', el).addEventListener('click', (e) => {
    const c = e.target.closest('[data-tab]');
    if (!c) return;
    st.tab = c.dataset.tab;
    st.q = ''; st.jenis = ''; st.status = '';
    filterBar();
    render();
  });
  $('#m-sync', el).onclick = async (e) => { const b = e.currentTarget; UI.busy(b, true, 'Menyinkronkan…'); await load(true); UI.busy(b, false); UI.icons(b); UI.toast('Data master diperbarui dari Google Sheets.', 'ok'); };
  $('#m-add', el).onclick = () => masterModal(st.tab, null);
  $('#m-table', el).addEventListener('click', async (e) => {
    const find = (k) => data.masters[st.tab].find((x) => x.kode === k);
    const ed = e.target.closest('[data-medit]');
    if (ed) { masterModal(st.tab, find(ed.dataset.medit)); return; }
    const tg = e.target.closest('[data-mtoggle]');
    if (tg) {
      const x = find(tg.dataset.mtoggle);
      const next = x.status === 'Nonaktif' ? TABS[st.tab].statuses[0] : 'Nonaktif';
      try {
        await API.call('setMasterStatus', { type: st.tab, kode: x.kode, status: next });
        UI.toast(`${x.nama} → ${next}`, 'ok');
        load(true);
      } catch (ex) { UI.error(ex); }
      return;
    }
    const del = e.target.closest('[data-mdel]');
    if (del) {
      const x = find(del.dataset.mdel);
      if (!(await UI.confirm({ title: 'Hapus data master?', danger: true, icon: 'trash-2', okText: 'Hapus', message: `<b>${UI.esc(x.nama)}</b> belum dipakai di laporan mana pun sehingga dapat dihapus permanen.` }))) return;
      try { await API.call('deleteMaster', { type: st.tab, kode: x.kode }); UI.toast('Data dihapus.', 'ok'); load(true); } catch (ex) { UI.error(ex); }
    }
  });

  function masterModal(type, x) {
    const isNew = !x;
    const t = TABS[type];
    const M = data.masters;
    const v = (k) => UI.esc(x ? x[k] || '' : '');
    let fields = '';
    if (type === 'pelatihan') {
      fields = `
        <label class="field" data-field="kode"><span class="field-label">Kode Modul</span>
          <span class="input-wrap">${UI.icon('hash')}<input class="input" name="kode" value="${v('kode')}" placeholder="Otomatis (mis. PLT-OPR-05)" maxlength="40"></span></label>
        <div class="field"><span class="field-label">Status Ketersediaan</span>
          <label class="row trainer-chip" style="background:var(--surface-2)"><span class="small" style="flex:1;font-weight:600">Aktif (dapat dipilih trainer)</span>
          <span class="switch"><input type="checkbox" name="aktif" ${!x || x.status === 'Aktif' ? 'checked' : ''}><span></span></span></label></div>
        <label class="field span-2" data-field="nama"><span class="field-label">Nama Modul Pelatihan <span class="req">*</span></span>
          <input class="input" name="nama" value="${v('nama')}" placeholder="Pengoperasian & Safety Articulated Dump Truck Volvo A40G" maxlength="160"></label>
        <div class="field span-2" data-field="jenis"><span class="field-label">Jenis / Kategori Pelatihan <span class="req">*</span></span>
          <div class="choice-grid" style="grid-template-columns:1fr 1fr">
            <label class="choice c-praktik"><input type="radio" name="jenis" value="Praktik Lapangan" ${!x || x.jenis === 'Praktik Lapangan' ? 'checked' : ''}><span class="choice-ic" style="color:#b06f0c">${UI.icon('hard-hat')}</span>
              <div><b>Praktik Lapangan</b><small>Pelatihan operasional unit di pit / disposal.</small></div><span class="choice-check"></span></label>
            <label class="choice"><input type="radio" name="jenis" value="Teori Kelas" ${x && x.jenis === 'Teori Kelas' ? 'checked' : ''}><span class="choice-ic" style="color:var(--primary)">${UI.icon('book-open')}</span>
              <div><b>Teori Kelas</b><small>Materi K3LH, regulasi, atau induksi kelas.</small></div><span class="choice-check"></span></label>
          </div></div>
        <label class="field" data-field="durasiJp"><span class="field-label">Durasi Jam Pelajaran (JP)</span><input class="input" name="durasiJp" value="${v('durasiJp')}" inputmode="decimal" placeholder="16"></label>
        <label class="field"><span class="field-label">Estimasi Hari Pelatihan</span><input class="input" name="estimasiHari" value="${v('estimasiHari')}" placeholder="2 Hari"></label>
        <label class="field"><span class="field-label">Rekomendasi Alat Berat</span><select class="select" name="alatDefault"><option value="">— Tidak ada —</option>${M.alat.map((a) => `<option ${x && x.alatDefault === a.nama ? 'selected' : ''}>${UI.esc(a.nama)}</option>`).join('')}</select></label>
        <label class="field"><span class="field-label">Lokasi Default</span><select class="select" name="lokasiDefault"><option value="">— Tidak ada —</option>${M.lokasi.map((a) => `<option ${x && x.lokasiDefault === a.nama ? 'selected' : ''}>${UI.esc(a.nama)}</option>`).join('')}</select></label>
        <label class="field span-2"><span class="field-label">Deskripsi Singkat &amp; Pokok Bahasan</span><textarea class="textarea" name="deskripsi" maxlength="400" style="min-height:80px">${v('deskripsi')}</textarea></label>`;
    } else {
      const tipeOpts = type === 'alat' ? ['Excavator', 'Dump Truck', 'Haul Truck', 'Articulated Dump Truck', 'Bulldozer', 'Wheel Loader', 'Grader', 'Lainnya']
        : type === 'lokasi' ? ['Ruang Kelas', 'Lapangan'] : null;
      fields = `
        <label class="field" data-field="kode"><span class="field-label">Kode</span><input class="input" name="kode" value="${v('kode')}" placeholder="Otomatis" maxlength="40"></label>
        <label class="field"><span class="field-label">Status</span><select class="select" name="status">${t.statuses.map((s) => `<option ${x && x.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="field span-2" data-field="nama"><span class="field-label">Nama <span class="req">*</span></span><input class="input" name="nama" value="${v('nama')}" maxlength="160"></label>
        ${tipeOpts ? `<label class="field span-2"><span class="field-label">Tipe</span><select class="select" name="tipe">${tipeOpts.map((o) => `<option ${x && x.tipe === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>` : ''}`;
    }
    const m = UI.modal({
      size: type === 'pelatihan' ? 'lg' : '', icon: t.icon,
      title: `${isNew ? 'Tambah' : 'Ubah'} ${type === 'pelatihan' ? 'Modul Pelatihan' : t.label} <span class="pill pill-teori">Mode: ${isNew ? 'Tambah' : 'Ubah'}</span>`,
      subtitle: type === 'pelatihan' ? 'Daftarkan silabus teori atau praktik operasional alat berat ke Data Master OTC.' : 'Data ini muncul sebagai pilihan di form laporan.',
      body: `<form id="mf" class="form-grid" novalidate>${fields}
        ${x && x.dipakai ? `<div class="alert alert-info span-2">${UI.icon('lock')}<span>Dipakai di ${x.dipakai} laporan. Perubahan nama tidak mengubah laporan lama.</span></div>` : ''}
        <div class="alert alert-info span-2">${UI.icon('shield')}<span><b>Ketentuan PRD F-10:</b> data yang sudah terikat minimal 1 laporan tidak dapat dihapus, hanya dinonaktifkan.</span></div></form>`,
      footer: `<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="mf-save">${UI.icon('circle-check')}Simpan</button>`
    });
    const form = $('#mf', m.el);
    $('#mf-save', m.el).onclick = async (e) => {
      const g = (n) => { const i = form.querySelector(`[name="${n}"]`); return i ? i.value.trim() : ''; };
      const item = { kode: g('kode'), nama: g('nama') };
      if (type === 'pelatihan') {
        const j = form.querySelector('[name="jenis"]:checked');
        Object.assign(item, { jenis: j ? j.value : '', durasiJp: g('durasiJp'), estimasiHari: g('estimasiHari'), alatDefault: g('alatDefault'),
          lokasiDefault: g('lokasiDefault'), deskripsi: g('deskripsi'), status: form.querySelector('[name="aktif"]').checked ? 'Aktif' : 'Nonaktif' });
      } else {
        item.status = g('status');
        if (form.querySelector('[name="tipe"]')) item.tipe = g('tipe');
      }
      if (!item.nama) { UI.fieldErrors(form, { nama: 'Nama wajib diisi.' }); return; }
      const btn = e.currentTarget;
      UI.busy(btn, true, 'Menyimpan…');
      try {
        const r = await API.call('saveMaster', { type, item, originalKode: x ? x.kode : '' });
        m.close();
        UI.toast(`${r.item.nama} (${r.item.kode}) tersimpan.`, 'ok');
        load(true);
      } catch (ex) { UI.busy(btn, false); UI.icons(btn); if (ex.fields) UI.fieldErrors(form, ex.fields); UI.error(ex); }
    };
  }

  filterBar();
  await load();
};

// =============================================================================
// LOG AKTIVITAS
// =============================================================================
Pages.AKSI = {
  LOGIN: ['Login Sesi', 'log-in', 'pill-teori'], LOGIN_GAGAL: ['Login Gagal', 'shield-x', 'pill-bad'], LOGIN_DITOLAK: ['Login Ditolak', 'shield-ban', 'pill-bad'],
  LOGOUT: ['Logout', 'log-out', 'pill-gray'], LOGOUT_SEMUA: ['Logout Semua', 'log-out', 'pill-gray'], GANTI_SANDI: ['Ganti Kata Sandi', 'key-round', 'pill-teori'],
  RESET_SANDI: ['Reset Sandi', 'key-round', 'pill-warn'], BUAT_LAPORAN: ['Buat Laporan', 'file-plus-2', 'pill-info'], UBAH_LAPORAN: ['Ubah Laporan', 'file-pen-line', 'pill-info'],
  SOFT_DELETE: ['Soft Delete', 'trash-2', 'pill-bad'], PDF_ULANG: ['PDF Ulang', 'refresh-cw', 'pill-gray'], PDF_GAGAL: ['PDF Gagal', 'file-x-2', 'pill-warn'],
  TAMBAH_PENGGUNA: ['Tambah Pengguna', 'user-plus', 'pill-info'], UBAH_PENGGUNA: ['Ubah Pengguna', 'user-cog', 'pill-info'], STATUS_PENGGUNA: ['Status Pengguna', 'user-x', 'pill-warn'],
  UBAH_PROFIL: ['Ubah Profil', 'user-round', 'pill-gray'], TAMBAH_MASTER: ['Tambah Master', 'database', 'pill-praktik'], UBAH_MASTER: ['Ubah Master', 'database', 'pill-praktik'],
  STATUS_MASTER: ['Status Master', 'database', 'pill-praktik'], HAPUS_MASTER: ['Hapus Master', 'database', 'pill-bad'], SETUP: ['Setup Sistem', 'settings', 'pill-violet'],
  BACKUP: ['Backup', 'hard-drive', 'pill-violet'], DATA_CONTOH: ['Data Contoh', 'flask-conical', 'pill-violet'],
  BUAT_LAP_PENGAWAS: ['Lapor Superintendent', 'clipboard-pen', 'pill-info'], UBAH_LAP_PENGAWAS: ['Ubah Lap. Pengawas', 'clipboard-pen', 'pill-info'],
  HAPUS_LAP_PENGAWAS: ['Hapus Lap. Pengawas', 'trash-2', 'pill-bad'],
  UBAH_LOGO: ['Ubah Logo', 'image', 'pill-violet'], HAPUS_LOGO: ['Hapus Logo', 'image-off', 'pill-violet']
};
Pages.aksiLabel = (a) => (Pages.AKSI[a] || [a])[0];
Pages.logIcon = (a) => (Pages.AKSI[a] || [0, 'activity'])[1];

Pages.logDefaults = () => ({ q: '', kategori: [], days: 30, status: 'SEMUA', role: '', page: 1, size: 25 });

Pages.logs = async function (el) {
  const hash = location.hash;
  const st = Pages.logDefaults();
  const KAT = [['', 'Semua Log'], ['laporan', 'Laporan'], ['keamanan', 'Keamanan'], ['pengguna', 'Pengguna'], ['master', 'Master'], ['sistem', 'Sistem']];

  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs">Admin Control <span>›</span> <b>Log Aktivitas &amp; Audit Sistem</b></div>
        <h1 class="page-title">Log Aktivitas &amp; Audit Keamanan</h1>
        <p class="page-desc">Rekaman kronologis (append-only) autentikasi, pembuatan, perubahan, soft delete laporan, modifikasi data master, dan manajemen hak akses.</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost" id="lg-export">${UI.icon('download')}Ekspor Log (.CSV)</button>
        <button class="btn btn-primary" id="lg-reload">${UI.icon('refresh-cw')}Muat Ulang Data</button>
      </div>
    </div>
    <div class="grid g-4 anim-in" id="lg-stats">${'<div class="card skel" style="height:140px"></div>'.repeat(4)}</div>
    <div id="lg-crit" class="mt-3"></div>
    <section class="card filter-card mt-3">
      <div class="search-row">
        <span class="input-wrap">${UI.icon('search')}<input class="input" id="lg-q" type="search" placeholder="Cari ID user, nama, target, atau detail…"></span>
        <div class="chips" id="lg-chips"></div>
      </div>
      <div class="filter-grid">
        <label class="field"><span class="field-label tiny">Rentang waktu</span><select class="select" id="lg-days">
          <option value="1">Hari ini</option><option value="7">7 hari</option><option value="30" selected>30 hari terakhir</option><option value="90">90 hari</option></select></label>
        <label class="field"><span class="field-label tiny">Status eksekusi</span><select class="select" id="lg-status">
          <option value="SEMUA">Semua status</option><option value="SUKSES">Hanya sukses</option><option value="GAGAL">Gagal / warning</option><option value="KRITIS">Event kritis saja</option></select></label>
        <label class="field"><span class="field-label tiny">Peran aktor</span><select class="select" id="lg-role">
          <option value="">Semua peran</option><option value="TRAINER">Trainer</option><option value="PENGAWAS">Pengawas</option><option value="ADMIN">Admin</option></select></label>
      </div>
      <p class="small muted mt-2" id="lg-found"></p>
    </section>
    <div class="grid g-table-side mt-3">
      <section class="card" id="lg-table">${UI.loader()}</section>
      <div class="stack side">
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon('activity')}</span>Distribusi Event 24 Jam</div><span class="tiny faint">${UI.tz()}</span></div>
          <div class="chart-box sm"><canvas id="lg-chart"></canvas></div>
          <div class="alert alert-info mt-2" id="lg-peak"></div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm bad">${UI.icon('bell-ring')}</span>Event Kritis Hari Ini</div><span class="pill pill-bad">Perlu Pantauan</span></div>
          <div class="stack" style="gap:8px" id="lg-critlist"></div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm violet">${UI.icon('shield')}</span>Standar Audit Sistem</div></div>
          <div class="stack small" style="gap:12px">
            <div class="row" style="align-items:flex-start"><span class="ic-tile sm">${UI.icon('lock')}</span><div><b>Integritas Append-Only</b><div class="tiny muted">Log ditulis langsung ke sheet tanpa opsi hapus dari aplikasi.</div></div></div>
            <div class="row" style="align-items:flex-start"><span class="ic-tile sm info">${UI.icon('key-round')}</span><div><b>Enkripsi &amp; Nol-Paparan Sandi</b><div class="tiny muted">Kata sandi tidak pernah dicatat — hanya hash SHA-256 + salt.</div></div></div>
            <div class="row" style="align-items:flex-start"><span class="ic-tile sm praktik">${UI.icon('timer')}</span><div><b>LockService Concurrency Guard</b><div class="tiny muted">Mencegah nomor laporan ganda saat banyak trainer mengirim bersamaan.</div></div></div>
          </div>
        </section>
      </div>
    </div>`;

  const renderChips = () => {
    $('#lg-chips', el).innerHTML = KAT.map((k) => `<button class="chip ${(k[0] === '' ? !st.kategori.length : st.kategori.includes(k[0])) ? 'active' : ''}" data-k="${k[0]}">${k[1]}</button>`).join('');
  };
  renderChips();
  $('#lg-chips', el).addEventListener('click', (e) => {
    const c = e.target.closest('[data-k]');
    if (!c) return;
    const k = c.dataset.k;
    if (!k) st.kategori = [];
    else st.kategori = st.kategori.includes(k) ? st.kategori.filter((x) => x !== k) : st.kategori.concat(k);
    st.page = 1;
    renderChips();
    load();
  });
  $('#lg-q', el).addEventListener('input', UI.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 400));
  $('#lg-days', el).addEventListener('change', (e) => { st.days = Number(e.target.value); st.page = 1; load(); });
  $('#lg-status', el).addEventListener('change', (e) => { st.status = e.target.value; st.page = 1; load(); });
  $('#lg-role', el).addEventListener('change', (e) => { st.role = e.target.value; st.page = 1; load(); });
  $('#lg-reload', el).onclick = async (e) => { const b = e.currentTarget; UI.busy(b, true, 'Memuat…'); await load(true); UI.busy(b, false); UI.icons(b); };
  $('#lg-table', el).addEventListener('click', (e) => {
    const pg = e.target.closest('[data-page]');
    if (pg && !pg.disabled) { st.page = Number(pg.dataset.page); load(); }
    const t = e.target.closest('[data-target]');
    if (t && /^LAP-/.test(t.dataset.target)) location.hash = '#/laporan/' + encodeURIComponent(t.dataset.target);
  });
  $('#lg-export', el).onclick = async (e) => {
    const b = e.currentTarget;
    UI.busy(b, true, 'Menyiapkan…');
    try {
      const d = await API.call('listLogs', Object.assign({}, st, { export: true, size: 10000, page: 1 }));
      const rows = [['Waktu', 'ID User', 'Nama', 'Peran', 'Kategori', 'Aksi', 'Target', 'Detail', 'Status']]
        .concat(d.items.map((l) => [l.ts, l.userId, l.nama, l.role, l.kategori, l.aksi, l.target, l.detail, l.status]));
      UI.saveText(UI.csv(rows), `Log_Aktivitas_OTC_${UI.today()}.csv`);
      UI.toast(`${d.items.length} entri log diekspor.`, 'ok');
    } catch (ex) { UI.error(ex); } finally { UI.busy(b, false); UI.icons(b); }
  };

  const statusPill = (s) => (s === 'KRITIS' ? '<span class="pill pill-bad pill-dot">Kritis</span>' : s === 'GAGAL' ? '<span class="pill pill-warn pill-dot">Gagal</span>' : '<span class="pill pill-ok pill-dot">Sukses</span>');
  const aksiPill = (l) => { const a = Pages.AKSI[l.aksi] || [l.aksi, 'activity', 'pill-gray']; return `<span class="pill ${a[2]}">${UI.icon(a[1])}${UI.esc(a[0].toUpperCase())}</span>`; };

  async function load(force) {
    const snap = JSON.stringify(st);
    let d;
    try { d = await API.swr('listLogs', st, (x) => { if (JSON.stringify(st) === snap) paint(x); }, { force }); } catch (e) { UI.error(e); return; }
    if (JSON.stringify(st) === snap) paint(d);
  }
  function paint(d) {
    if (!App.stillOn(hash)) return;
    const s = d.stats;
    $('#lg-stats', el).innerHTML = [
      Pages.statCard('Total Aktivitas Terdata', `<span data-count="${s.total}">0</span><small>Event</small>`, `<span class="pill pill-teori">${UI.icon('trending-up')}+${s.hariIni} hari ini</span>`, 'list-checks'),
      Pages.statCard('Aktivitas Laporan OTC', `<span data-count="${s.buat + s.ubah}">0</span><small>Transaksi</small>`, `${s.buat} dibuat • ${s.ubah} diubah`, 'file-text', 'info'),
      Pages.statCard('Login &amp; Keamanan', `<span data-count="${s.loginOk}">0</span><small>Login berhasil</small>`, `<span class="pill ${s.loginGagal ? 'pill-bad' : 'pill-ok'}">${s.loginGagal} gagal / diblokir</span>`, 'shield-check', s.loginGagal ? 'bad' : 'ok'),
      Pages.statCard('Modifikasi Master &amp; User', `<span data-count="${s.master + s.pengguna}">0</span><small>Perubahan</small>`, `${s.master} master • ${s.pengguna} pengguna`, 'user-cog', 'praktik')
    ].join('');
    UI.icons($('#lg-stats', el));
    UI.countUp($('#lg-stats', el));

    $('#lg-crit', el).innerHTML = d.kritisHariIni.length ? `<div class="alert alert-bad" style="align-items:center">${UI.icon('siren')}
      <span style="flex:1"><b>${d.kritisHariIni.length} Event Kritis Hari Ini</b> — ${UI.esc(d.kritisHariIni.slice(0, 2).map((l) => Pages.aksiLabel(l.aksi) + ' (' + l.target + ')').join(', '))}</span>
      <button class="btn btn-sm btn-danger" id="lg-crit-btn">Lihat</button></div>` : '';
    if ($('#lg-crit-btn', el)) $('#lg-crit-btn', el).onclick = () => { $('#lg-status', el).value = 'KRITIS'; st.status = 'KRITIS'; st.days = 1; $('#lg-days', el).value = '1'; load(); };
    $('#lg-critlist', el).innerHTML = d.kritisHariIni.length ? d.kritisHariIni.map((l) => `<div class="stat-row"><span class="dot" style="background:var(--bad)"></span>
      <span class="truncate">${UI.esc(Pages.aksiLabel(l.aksi))} <span class="faint">(${UI.esc(l.target)})</span></span><b class="small">${UI.esc(UI.time(l.ts))} ${UI.tz()}</b></div>`).join('')
      : `<div class="stat-row"><span class="dot" style="background:var(--ok)"></span><span>Tidak ada event kritis hari ini.</span></div>`;
    $('#lg-found', el).innerHTML = `Ditemukan <b>${UI.num(d.total)} entri</b> log audit dalam rentang ${UI.esc(UI.date(d.from))} – ${UI.esc(UI.date(d.to))}`;

    const t = $('#lg-table', el);
    t.innerHTML = d.items.length ? `
      <div class="table-wrap desktop-table"><table class="table"><thead><tr><th>Waktu (${UI.tz()})</th><th>Pengguna / Aktor</th><th>Kategori &amp; Aksi</th><th>Target ID</th><th>Detail</th><th>Status</th></tr></thead>
        <tbody>${d.items.map((l) => `<tr class="${l.status === 'KRITIS' ? 'row-bad' : ''}">
          <td class="nowrap"><b class="small">${UI.esc(UI.date(l.ts))}</b><div class="cell-sub">${UI.esc(l.ts.slice(11))}</div></td>
          <td><div class="user-cell">${l.userId === '-' ? `<span class="avatar bad">${UI.icon('user-x')}</span>` : UI.avatar(l.nama)}<div><b class="small">${UI.esc(l.nama)}</b><div class="cell-sub">${UI.esc(l.role)} • ${UI.esc(l.userId)}</div></div></div></td>
          <td>${aksiPill(l)}</td>
          <td><span class="pill pill-mono" data-target="${UI.esc(l.target)}" style="${/^LAP-/.test(l.target) ? 'cursor:pointer' : ''}${l.aksi === 'SOFT_DELETE' ? ';text-decoration:line-through' : ''}">${UI.esc(l.target || '—')}</span></td>
          <td class="small" style="max-width:260px">${UI.esc(l.detail)}</td><td>${statusPill(l.status)}</td></tr>`).join('')}</tbody></table></div>
      <div class="mobile-cards">${d.items.map((l) => `<div class="r-card" style="${l.status === 'KRITIS' ? 'border-color:var(--bad)' : ''}">
        <div class="r-card-top"><span class="tiny muted">${UI.icon('calendar')} ${UI.esc(UI.dateTime(l.ts))} ${UI.tz()}</span>${aksiPill(l)}</div>
        <div class="user-cell">${UI.avatar(l.nama)}<div><b>${UI.esc(l.nama)}</b><div class="cell-sub">${UI.esc(l.role)} • ${UI.esc(l.userId)}</div></div></div>
        <div class="small muted">${UI.esc(l.detail)}</div>
        <div class="li-meta"><span class="pill pill-mono" data-target="${UI.esc(l.target)}">${UI.esc(l.target || '—')}</span>${statusPill(l.status)}</div></div>`).join('')}</div>
      ${UI.pager(d.page, d.pages, d.total, 'entri')}` : UI.empty('Tidak ada log', 'Tidak ada aktivitas yang cocok dengan filter.', 'history');
    UI.icons(t);

    const max = Math.max(...d.perJam);
    const peak = d.perJam.indexOf(max);
    Pages.chart($('#lg-chart', el), {
      type: 'line',
      data: { labels: d.perJam.map((_, i) => UI.pad(i) + ':00'),
        datasets: [{ data: d.perJam, borderColor: Pages.css('--primary'), backgroundColor: 'rgba(91,92,242,.14)', fill: true, tension: .45, pointRadius: (c) => (c.dataIndex === peak && max ? 5 : 0), pointBackgroundColor: Pages.css('--primary'), borderWidth: 2.5 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } }, y: { beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 4 }, grid: { color: Pages.css('--border') } } } }
    });
    $('#lg-peak', el).innerHTML = max ? `${UI.icon('zap')}<span><b>Trafik tertinggi</b> pukul ${UI.pad(peak)}:00–${UI.pad(peak + 1)}:00 ${UI.tz()} dengan ${max} event dalam 24 jam terakhir.</span>`
      : `${UI.icon('moon')}<span>Belum ada aktivitas dalam 24 jam terakhir.</span>`;
    UI.icons($('#lg-peak', el));
  }
  await load();
};

// =============================================================================
// PROFIL & PENGATURAN
// =============================================================================
Pages.profile = async function (el) {
  const hash = location.hash;
  const u = App.user;
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Microsoft Edge' : /Chrome\//.test(ua) ? 'Google Chrome' : /Firefox\//.test(ua) ? 'Mozilla Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';

  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs">Beranda <span>›</span> Pengaturan <span>›</span> <b>Profil Pengguna</b></div>
        <h1 class="page-title">Pengaturan &amp; Profil Pengguna</h1>
        <p class="page-desc">Kelola informasi akun, kontak operasional, tampilan, dan kata sandi akun Task Tracker OTC Anda.</p></div>
    </div>
    <div class="grid g-side-main anim-in">
      <div class="stack">
        <section class="card" style="background:linear-gradient(160deg,var(--primary-50),var(--glass) 55%)">
          <div class="row" style="align-items:flex-start;gap:16px">
            <span class="avatar lg" style="background:var(--primary-grad);color:#fff;box-shadow:var(--sh-raised)">${UI.esc(UI.initials(u.nama))}</span>
            <div style="min-width:0"><div class="row-wrap">${UI.rolePill(u.role)}<span class="pill pill-info">${UI.esc(u.dept)}</span></div>
              <h2 style="font-size:20px;margin-top:8px">${UI.esc(u.nama)}</h2><div class="small muted">${UI.esc(UI.roleLabel(u.role))} • <span class="mono">${UI.esc(u.id)}</span></div></div>
          </div>
          <div class="doc-info mt-3" style="grid-template-columns:1fr 1fr;background:var(--surface);border-color:var(--border);margin:16px 0 0">
            <div><small>No. Badge (ID Login)</small><b class="mono">${UI.esc(u.badge)}</b></div>
            <div><small>Departemen</small><b>${UI.esc(u.dept)}</b></div>
          </div>
          <form id="pf-wa" class="mt-3" novalidate>
            <label class="field"><span class="field-label">Nomor WhatsApp Operasional <span class="faint tiny">untuk koordinasi</span></span>
              <span class="input-wrap">${UI.icon('message-circle')}<input class="input" name="wa" value="${UI.esc(u.wa ? '0' + String(u.wa).replace(/^62/, '') : '')}" placeholder="0812-4452-9811" inputmode="tel"></span>
              <span class="field-hint">Nama, badge, peran &amp; departemen hanya dapat diubah oleh Admin/Pengawas.</span></label>
            <button class="btn btn-primary btn-block mt-2" type="submit">${UI.icon('save')}Simpan Perubahan Profil</button>
          </form>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon('award')}</span>Ringkasan Kinerja Saya</div><span class="pill pill-teori">Bulan Berjalan</span></div>
          <div id="pf-stats">${UI.loader('')}</div>
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile">${UI.icon('lock-keyhole')}</span><div>Perbarui Kata Sandi Akun<div class="card-sub">Sandi dienkripsi SHA-256 + salt unik di server.</div></div></div><span class="pill pill-info">F-01 PRD</span></div>
          <form id="pf-pw" class="stack" style="gap:14px" novalidate>
            ${Pages.pwField('oldPassword', 'Kata Sandi Saat Ini', 'Masukkan kata sandi saat ini')}
            ${Pages.pwField('newPassword', 'Kata Sandi Baru', 'Minimal 8 karakter')}
            ${Pages.pwField('confirm', 'Konfirmasi Kata Sandi Baru', 'Ulangi kata sandi baru')}
            <div class="stat-row" style="flex-wrap:wrap;gap:14px" id="pf-rules">
              <span class="tiny" data-rule="len">○ Min. 8 karakter</span><span class="tiny" data-rule="alpha">○ Mengandung huruf</span>
              <span class="tiny" data-rule="num">○ Mengandung angka</span><span class="tiny" data-rule="same">○ Konfirmasi cocok</span></div>
            <div class="row"><button type="reset" class="btn btn-ghost" style="flex:1">Reset Form</button>
              <button type="submit" class="btn btn-primary" style="flex:1.4">${UI.icon('refresh-cw')}Perbarui Sandi</button></div>
          </form>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm info">${UI.icon('monitor-smartphone')}</span>Sesi Login &amp; Perangkat</div><span class="pill pill-ok">1 Sesi Ini</span></div>
          <div class="stat-row">${UI.icon(/Android|iPhone/.test(ua) ? 'smartphone' : 'laptop')}<div style="flex:1;min-width:0"><b class="small" style="margin:0">${browser} — ${os}</b>
            <div class="tiny muted">Sesi berlaku 8 jam sejak masuk</div></div><span class="pill pill-teori">Sesi ini</span></div>
          <div class="row mt-2"><button class="btn btn-ghost" style="flex:1" id="pf-logout">${UI.icon('log-out')}Keluar</button>
            <button class="btn btn-danger-soft" style="flex:1" id="pf-logout-all">${UI.icon('shield-off')}Keluar Semua Perangkat</button></div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm violet">${UI.icon('palette')}</span>Tampilan</div></div>
          <label class="row" style="justify-content:space-between"><span class="small" style="font-weight:600">Mode gelap</span>
            <span class="switch"><input type="checkbox" id="pf-dark" ${document.documentElement.dataset.theme === 'dark' ? 'checked' : ''}><span></span></span></label>
        </section>
        ${u.role === 'ADMIN' ? `<section class="card" id="pf-logo">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon('image')}</span><div>Logo Aplikasi<div class="card-sub">Tampil di login, sidebar, menu HP, dan kop laporan PDF.</div></div></div><span class="pill pill-violet">Khusus Admin</span></div>
          <div class="logo-edit">
            <div class="logo-preview" id="lg-prev">${UI.logo('big')}</div>
            <div style="flex:1;min-width:200px">
              <p class="small muted">Format PNG atau JPG. Gambar diperkecil otomatis (maks. 320 px). Logo persegi dengan latar transparan paling rapi.</p>
              <input type="file" id="lg-file" accept="image/png,image/jpeg,image/webp" hidden>
              <div class="row-wrap mt-2">
                <button class="btn btn-primary btn-sm" id="lg-pick">${UI.icon('upload')}Pilih &amp; Unggah Logo</button>
                <button class="btn btn-danger-soft btn-sm" id="lg-del" ${App.brand.logo ? '' : 'hidden'}>${UI.icon('trash-2')}Hapus Logo</button>
              </div>
            </div>
          </div>
        </section>` : ''}
        ${App.isAdmin() ? `<section class="card" id="pf-admin">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm praktik">${UI.icon('shield')}</span>Admin Control</div></div>
          <div class="list">
            <a class="list-item" href="#/pengawas" style="text-decoration:none;color:inherit">${UI.icon('clipboard-pen')}<span class="li-main li-title">Laporan ke Superintendent</span>${UI.icon('chevron-right')}</a>
            <a class="list-item" href="#/pengguna" style="text-decoration:none;color:inherit">${UI.icon('users')}<span class="li-main li-title">Kelola Pengguna</span>${UI.icon('chevron-right')}</a>
            <a class="list-item" href="#/master" style="text-decoration:none;color:inherit">${UI.icon('database')}<span class="li-main li-title">Data Master</span>${UI.icon('chevron-right')}</a>
            <a class="list-item" href="#/log" style="text-decoration:none;color:inherit">${UI.icon('history')}<span class="li-main li-title">Log Aktivitas</span>${UI.icon('chevron-right')}</a>
          </div></section>` : ''}
        <div class="alert alert-warn">${UI.icon('info')}<span><b>Kebijakan Proteksi OTC:</b> akun dikunci sementara selama 15 menit setelah 5 kali kegagalan input kata sandi berturut-turut.</span></div>
      </div>
    </div>`;

  Pages.bindEyes(el);
  if ($('#pf-logo', el)) Pages.bindLogoUpload(el);
  $('#pf-dark', el).onchange = (e) => App.applyTheme(e.target.checked ? 'dark' : 'light');
  $('#pf-logout', el).onclick = () => App.logout(false);
  $('#pf-logout-all', el).onclick = async () => {
    if (!(await UI.confirm({ title: 'Keluar dari semua perangkat?', message: 'Semua sesi login akun Anda (termasuk perangkat ini) akan diakhiri.', okText: 'Keluar semua', danger: true }))) return;
    try { await API.call('logoutAll', {}); } catch (e) { /* tetap keluar */ }
    App.logout(true, 'Anda telah keluar dari semua perangkat.');
  };
  $('#pf-wa', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button');
    UI.busy(btn, true, 'Menyimpan…');
    try {
      const d = await API.call('updateMyProfile', { wa: e.target.wa.value });
      App.user = Object.assign(App.user, d.user);
      UI.toast('Profil berhasil diperbarui.', 'ok', 'Tersimpan');
    } catch (ex) { UI.error(ex); } finally { UI.busy(btn, false); UI.icons(btn); }
  });

  const pf = $('#pf-pw', el);
  const rules = () => {
    const n = pf.newPassword.value, c = pf.confirm.value;
    const ok = { len: n.length >= 8, alpha: /[A-Za-z]/.test(n), num: /\d/.test(n), same: !!n && n === c };
    Object.keys(ok).forEach((k) => {
      const r = pf.querySelector(`[data-rule="${k}"]`);
      r.style.color = ok[k] ? 'var(--ok)' : '';
      r.textContent = (ok[k] ? '✓ ' : '○ ') + r.textContent.slice(2);
    });
    return Object.values(ok).every(Boolean);
  };
  pf.addEventListener('input', rules);
  pf.addEventListener('reset', () => setTimeout(rules, 0));
  pf.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pf.oldPassword.value) { UI.fieldErrors(pf, { oldPassword: 'Masukkan kata sandi saat ini.' }); return; }
    if (!rules()) { UI.fieldErrors(pf, { newPassword: 'Kata sandi baru belum memenuhi semua ketentuan.' }); return; }
    UI.fieldErrors(pf, null);
    const btn = e.submitter;
    UI.busy(btn, true, 'Memperbarui…');
    try {
      const d = await API.call('changePassword', { oldPassword: pf.oldPassword.value, newPassword: pf.newPassword.value });
      API.token = d.token;
      UI.store.set('tto_token', d.token);
      pf.reset();
      UI.toast('Kredensial dienkripsi ulang. Sesi di perangkat lain telah diakhiri.', 'ok', 'Kata sandi berhasil diperbarui!');
    } catch (ex) {
      if (ex.fields) UI.fieldErrors(pf, ex.fields);
      UI.error(ex);
    } finally { UI.busy(btn, false); UI.icons(btn); }
  });

  try {
    const s = await API.swr('myStats', {});
    if (!App.stillOn(hash)) return;
    const target = (App.settings.targetHarian || 50);
    $('#pf-stats', el).innerHTML = `
      <div class="grid g-2" style="gap:12px">
        <div class="stat-row" style="flex-direction:column;align-items:flex-start;gap:4px"><span class="tiny faint" style="font-weight:800;letter-spacing:.06em">LAPORAN BULAN INI</span>
          <b style="font-size:24px;margin:0" data-count="${s.bulanIni}">0</b><span class="small" style="color:var(--primary);font-weight:700">${s.selesaiBulanIni} selesai</span></div>
        <div class="stat-row" style="flex-direction:column;align-items:flex-start;gap:4px"><span class="tiny faint" style="font-weight:800;letter-spacing:.06em">PESERTA DILATIH</span>
          <b style="font-size:24px;margin:0" data-count="${s.pesertaBulanIni}">0</b><span class="small" style="color:var(--primary);font-weight:700">bulan ini</span></div>
      </div>
      <div class="small muted mt-2">Total laporan Anda: <b>${UI.num(s.total)}</b>${s.terakhir ? ` • terakhir ${UI.esc(UI.dateTime(s.terakhir))}` : ''}</div>
      ${s.alat.length ? `<div class="tiny faint mt-2" style="font-weight:800;letter-spacing:.06em">MODUL SPESIALISASI UNIT ALAT BERAT</div>
        <div class="chips mt-1">${s.alat.map((a) => `<span class="pill pill-info">${UI.icon('truck')}${UI.esc(a)}</span>`).join('')}</div>` : ''}
      <p class="tiny faint mt-2">Target tim: ${target} laporan per hari.</p>`;
    UI.icons($('#pf-stats', el));
    UI.countUp($('#pf-stats', el));
  } catch (e) { $('#pf-stats', el).innerHTML = ''; }
};

/** Unggah logo (Admin): diperkecil di browser lalu dikirim sebagai PNG/JPG base64. */
Pages.imageToLogo = function (file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { reject(new Error('Pilih gambar PNG, JPG, atau WEBP.')); return; }
    if (file.size > 8 * 1024 * 1024) { reject(new Error('Ukuran gambar maksimal 8 MB.')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const make = (max, type, q) => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc));
        c.height = Math.max(1, Math.round(img.height * sc));
        const x = c.getContext('2d');
        if (type === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL(type, q);
      };
      let d = make(320, 'image/png');
      if (d.length > 700000) d = make(240, 'image/png');
      if (d.length > 700000) d = make(320, 'image/jpeg', 0.88);
      resolve(d);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat dibaca.')); };
    img.src = url;
  });
};

Pages.bindLogoUpload = function (el) {
  const refresh = () => {
    $('#lg-prev', el).innerHTML = UI.logo('big');
    $('#lg-del', el).hidden = !App.brand.logo;
    UI.icons($('#pf-logo', el));
  };
  $('#lg-pick', el).onclick = () => $('#lg-file', el).click();
  $('#lg-file', el).onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const btn = $('#lg-pick', el);
    UI.busy(btn, true, 'Mengunggah…');
    try {
      const dataUrl = await Pages.imageToLogo(file);
      const prev = App.brand;
      App.setBrand({ ver: 'local', logo: dataUrl }); // tampil instan
      refresh();
      try {
        const r = await API.call('setLogo', { dataUrl });
        App.setBrand({ ver: r.ver, logo: dataUrl });
        UI.toast('Logo baru tampil di seluruh aplikasi dan laporan PDF berikutnya.', 'ok', 'Logo diperbarui');
      } catch (ex) { App.setBrand(prev); refresh(); throw ex; }
    } catch (ex) { UI.error(ex); } finally { UI.busy(btn, false); UI.icons(btn); }
  };
  $('#lg-del', el).onclick = async () => {
    if (!(await UI.confirm({ title: 'Hapus logo?', message: 'Aplikasi dan laporan PDF akan kembali memakai logo bawaan.', okText: 'Hapus logo', danger: true, icon: 'trash-2' }))) return;
    try {
      await API.call('removeLogo', {});
      App.setBrand({ ver: '', logo: '' });
      refresh();
      UI.toast('Logo bawaan dipakai kembali.', 'ok');
    } catch (ex) { UI.error(ex); }
  };
};
