/* =============================================================================
   v1.3 — LAPORAN PENGAWAS KE SUPERINTENDENT (khusus Pengawas & Admin)
   Isi: nama trainer, tugas trainer, lokasi pekerjaan, keterangan → PDF
   ============================================================================= */
window.Pages = window.Pages || {};

Pages.supDefaults = () => ({ q: '', mine: false, from: '', to: '', page: 1, size: 20 });
Pages.supCanEdit = (r) => App.user && (r.pengawasId === App.user.id || App.user.role === 'ADMIN');

/** Unduh PDF laporan pengawas (mode 'print' = buka di tab baru untuk dicetak). */
Pages.supPdf = async function (id, btn, mode) {
  let w = null;
  if (mode === 'print') {
    w = window.open('', '_blank');
    if (w) w.document.write('<p style="font-family:sans-serif;padding:24px">Menyiapkan PDF untuk dicetak…</p>');
  }
  if (btn) UI.busy(btn, true, mode === 'print' ? 'Menyiapkan…' : 'Mengunduh…');
  try {
    const d = await API.call('downloadSupPdf', { id });
    const blob = UI.b64ToBlob(d.base64, d.mime);
    if (w) {
      w.location.href = URL.createObjectURL(blob);
      UI.toast('PDF dibuka di tab baru. Gunakan tombol cetak (Ctrl + P) di tab tersebut.', 'ok', 'Siap dicetak');
    } else {
      UI.saveBlob(blob, d.fileName);
      UI.toast(`${d.fileName} (${UI.fileSize(blob.size)})`, 'ok', 'PDF berhasil diunduh');
    }
  } catch (e) {
    if (w) w.close();
    UI.error(e);
  } finally {
    if (btn) { UI.busy(btn, false); UI.icons(btn); }
  }
};

Pages.supDelete = async function (r) {
  const ok = await UI.confirm({
    title: 'Hapus laporan pengawas?', danger: true, icon: 'trash-2', okText: 'Ya, hapus',
    message: `Laporan <b>${UI.esc(r.id)}</b> tanggal ${UI.esc(UI.dateLong(r.tanggal))} akan disembunyikan dari daftar. Tindakan ini tercatat di Log Aktivitas.`
  });
  if (!ok) return false;
  try {
    await API.call('deleteSupReport', { id: r.id });
    UI.toast(`Laporan ${r.id} dihapus.`, 'ok');
    return true;
  } catch (e) { UI.error(e); return false; }
};

// ---------------------------------------------------------------------------
// DAFTAR
// ---------------------------------------------------------------------------
Pages.supList = async function (el) {
  const hash = location.hash;
  const st = Pages.supDefaults();

  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs">Admin Control <span>›</span> <b>Laporan ke Superintendent</b></div>
        <h1 class="page-title">Laporan Pengawas ke Superintendent</h1>
        <p class="page-desc">Laporan penugasan trainer (nama, tugas, lokasi pekerjaan, keterangan) dari pengawas kepada superintendent. Setiap laporan otomatis menjadi PDF siap cetak.</p></div>
      <div class="page-actions">
        <a class="btn btn-primary" href="#/pengawas/baru">${UI.icon('file-plus-2')}Buat Laporan Baru</a>
      </div>
    </div>
    <div class="grid g-3 anim-in" id="sp-stats">${'<div class="card skel" style="height:130px"></div>'.repeat(3)}</div>
    <section class="card filter-card mt-3">
      <div class="search-row">
        <div class="segmented" id="sp-scope"><button data-v="0" class="active">Semua Laporan</button><button data-v="1">Laporan Saya</button></div>
        <span class="input-wrap">${UI.icon('search')}<input class="input" id="sp-q" type="search" placeholder="Cari nama trainer, tugas, lokasi, superintendent…"></span>
      </div>
      <div class="filter-grid">
        <label class="field"><span class="field-label tiny">Dari tanggal</span><input class="input" type="date" data-f="from"></label>
        <label class="field"><span class="field-label tiny">Sampai tanggal</span><input class="input" type="date" data-f="to"></label>
        <div class="field" style="justify-content:flex-end"><button class="btn btn-ghost" id="sp-reset">${UI.icon('rotate-ccw')}Reset Filter</button></div>
      </div>
    </section>
    <section class="card mt-3" id="sp-body">${UI.loader()}</section>`;

  const body = $('#sp-body', el);

  async function load(force) {
    const snap = JSON.stringify(st);
    let d;
    try { d = await API.swr('listSupReports', st, (x) => { if (JSON.stringify(st) === snap) paint(x); }, { force }); } catch (e) { UI.error(e); return; }
    if (JSON.stringify(st) === snap) paint(d);
  }

  function paint(d) {
    if (!App.stillOn(hash)) return;
    const s = d.summary;
    $('#sp-stats', el).innerHTML = [
      Pages.statCard('Total Laporan', `<span data-count="${s.total}">0</span><small>Laporan</small>`, 'Sesuai filter saat ini', 'clipboard-list'),
      Pages.statCard('Laporan Bulan Ini', `<span data-count="${s.bulanIni}">0</span><small>Laporan</small>`, 'Dikirim ke superintendent', 'calendar-check', 'info'),
      Pages.statCard('Total Penugasan Trainer', `<span data-count="${s.trainer}">0</span><small>Baris</small>`, 'Nama • tugas • lokasi', 'users', 'praktik')
    ].join('');
    UI.icons($('#sp-stats', el));
    UI.countUp($('#sp-stats', el));
    if (!d.items.length) {
      body.innerHTML = `${UI.empty('Belum ada laporan', 'Buat laporan pertama untuk superintendent.', 'clipboard-list')}
        <div class="center"><a class="btn btn-primary" href="#/pengawas/baru">${UI.icon('plus')}Buat Laporan Baru</a></div>`;
      UI.icons(body);
      return;
    }
    const lok = (r) => (r.lokasiRingkas || []).map((l) => `<span class="pill pill-gray">${UI.esc(l)}</span>`).join(' ') || '—';
    const acts = (r) => `<div class="actions">
      <button class="btn-round" data-dl="${UI.esc(r.id)}" title="Unduh PDF" aria-label="Unduh PDF">${UI.icon('download')}</button>
      <button class="btn-round" data-print="${UI.esc(r.id)}" title="Cetak PDF" aria-label="Cetak PDF">${UI.icon('printer')}</button>
      ${Pages.supCanEdit(r) ? `<button class="btn-round" data-edit="${UI.esc(r.id)}" title="Ubah" aria-label="Ubah">${UI.icon('pencil')}</button>
        <button class="btn-round danger" data-del="${UI.esc(r.id)}" title="Hapus" aria-label="Hapus">${UI.icon('trash-2')}</button>` : ''}</div>`;
    body.innerHTML = `
      <div class="table-wrap desktop-table"><table class="table">
        <thead><tr><th>ID Laporan</th><th>Tanggal</th><th>Kepada</th><th>Trainer</th><th>Lokasi Pekerjaan</th><th>Pengawas</th><th style="text-align:right">Aksi</th></tr></thead>
        <tbody>${d.items.map((r) => `<tr class="clickable" data-open-sup="${UI.esc(r.id)}">
          <td><span class="pill pill-mono">${UI.esc(r.id)}</span></td>
          <td class="nowrap">${UI.esc(UI.date(r.tanggal))}<div class="cell-sub">${UI.esc(UI.time(r.ts))} ${UI.tz()}</div></td>
          <td class="small">${UI.esc(r.kepada || 'Superintendent')}</td>
          <td><b>${UI.num(r.jml)}</b> <span class="small muted">orang</span></td>
          <td style="max-width:260px">${lok(r)}</td>
          <td><div class="user-cell">${UI.avatar(r.pengawasNama)}<span class="truncate">${UI.esc(r.pengawasNama)}</span></div></td>
          <td>${acts(r)}</td></tr>`).join('')}</tbody></table></div>
      <div class="mobile-cards">${d.items.map((r) => `<div class="r-card" data-open-sup="${UI.esc(r.id)}">
        <div class="r-card-top"><span class="pill pill-mono">${UI.esc(r.id)}</span><span class="pill pill-teori">${UI.num(r.jml)} trainer</span></div>
        <div class="li-title">${UI.esc(UI.dateLong(r.tanggal))}</div>
        <div class="li-meta"><span>Kepada: ${UI.esc(r.kepada || 'Superintendent')}</span><span>• ${UI.esc(r.pengawasNama)}</span></div>
        <div class="li-meta">${lok(r)}</div>
        <div class="r-card-actions" style="justify-content:flex-end">${acts(r)}</div></div>`).join('')}</div>
      ${UI.pager(d.page, d.pages, d.total, 'laporan')}`;
    UI.icons(body);
    body._items = d.items;
  }

  $('#sp-scope', el).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#sp-scope button', el).forEach((x) => x.classList.toggle('active', x === b));
    st.mine = b.dataset.v === '1'; st.page = 1; load();
  });
  $('#sp-q', el).addEventListener('input', UI.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 350));
  $$('[data-f]', el).forEach((i) => i.addEventListener('change', () => { st[i.dataset.f] = i.value; st.page = 1; load(); }));
  $('#sp-reset', el).onclick = () => { st.from = ''; st.to = ''; $$('[data-f]', el).forEach((i) => { i.value = ''; }); st.page = 1; load(); };
  body.addEventListener('click', async (e) => {
    const find = (id) => (body._items || []).find((x) => x.id === id);
    const pg = e.target.closest('[data-page]');
    if (pg && !pg.disabled) { st.page = Number(pg.dataset.page); load(); return; }
    const dl = e.target.closest('[data-dl]');
    if (dl) { e.stopPropagation(); Pages.supPdf(dl.dataset.dl); return; }
    const pr = e.target.closest('[data-print]');
    if (pr) { e.stopPropagation(); Pages.supPdf(pr.dataset.print, null, 'print'); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) { e.stopPropagation(); location.hash = `#/pengawas/${encodeURIComponent(ed.dataset.edit)}/ubah`; return; }
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); if (await Pages.supDelete(find(del.dataset.del))) load(true); return; }
    const row = e.target.closest('[data-open-sup]');
    if (row) location.hash = '#/pengawas/' + encodeURIComponent(row.dataset.openSup);
  });
  await load();
};

// ---------------------------------------------------------------------------
// FORM (baru & ubah)
// ---------------------------------------------------------------------------
Pages.supEdit = async function (el, { params }) {
  el.innerHTML = UI.loader('Memuat laporan…');
  const r = await API.call('getSupReport', { id: params[0] });
  if (!Pages.supCanEdit(r)) {
    UI.toast('Hanya pembuat laporan atau Admin yang dapat mengubah laporan ini.', 'warn');
    location.replace('#/pengawas/' + encodeURIComponent(r.id));
    return;
  }
  return Pages.supForm(el, { edit: r });
};

Pages.supForm = async function (el, opts = {}) {
  const edit = opts.edit || null;
  const u = App.user;
  const DRAFT = 'tto_sup_draft_' + u.id;
  const clientRef = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
  const blankRow = () => ({ nama: '', trainerId: '', tugas: '', lokasi: '', ket: '' });
  let f;
  let restored = false;
  if (edit) {
    f = { tanggal: edit.tanggal, kepada: edit.kepada, catatan: edit.catatan, rows: edit.rows.map((x) => Object.assign({}, x)) };
  } else {
    const d = UI.store.get(DRAFT);
    if (d && d.rows) { f = d; restored = true; } else {
      f = { tanggal: UI.today(), kepada: UI.store.get('tto_sup_kepada', ''), catatan: '', rows: [blankRow()] };
    }
  }
  let trainers = [];
  const lokasi = (App.masters.lokasi || []).filter((x) => x.status !== 'Nonaktif').map((x) => x.nama);

  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs"><a href="#/pengawas">${UI.icon('arrow-left')} Laporan ke Superintendent</a> <span>›</span> <b>${edit ? 'Ubah' : 'Baru'}</b></div>
        <h1 class="page-title">${edit ? 'Ubah Laporan ' + UI.esc(edit.id) : 'Laporan Pengawas ke Superintendent'}</h1>
        <p class="page-desc">Isi penugasan setiap trainer: nama, tugas, lokasi pekerjaan, dan keterangan. PDF dibuat otomatis setelah disimpan.</p></div>
      ${edit ? '' : `<div class="page-actions"><span class="pill pill-gray" id="sp-draft">${UI.icon('cloud')} Draf tersimpan otomatis</span></div>`}
    </div>
    <form id="spf" class="stack" novalidate>
      <section class="card">
        <div class="sec-head"><span class="ic-tile">${UI.icon('file-text')}</span>
          <div><h3>Informasi Laporan</h3><p>Tanggal dan tujuan laporan.</p></div><span class="pill pill-info">Wajib Diisi</span></div>
        <div class="form-grid">
          <label class="field" data-field="tanggal"><span class="field-label">Tanggal Laporan <span class="req">*</span></span>
            <input class="input" type="date" name="tanggal" value="${UI.esc(f.tanggal)}"></label>
          <label class="field"><span class="field-label">Kepada (Superintendent)</span>
            <span class="input-wrap">${UI.icon('user-round-check')}<input class="input" name="kepada" value="${UI.esc(f.kepada)}" placeholder="Nama superintendent" maxlength="120"></span></label>
          <div class="field span-2"><span class="field-label">Dari (Pengawas)</span>
            <div class="trainer-chip">${UI.avatar(edit ? edit.pengawasNama : u.nama)}<div><b>${UI.esc(edit ? edit.pengawasNama : u.nama)}</b>
              <small>${edit ? 'Pembuat laporan' : UI.esc(UI.roleLabel(u.role))}</small></div><span class="pill pill-mono">${UI.esc(edit ? edit.pengawasId : u.badge)}</span></div></div>
        </div>
      </section>

      <section class="card">
        <div class="sec-head"><span class="ic-tile info">${UI.icon('users')}</span>
          <div><h3>Daftar Penugasan Trainer</h3><p>Nama trainer, tugas trainer, lokasi pekerjaan, dan keterangan.</p></div>
          <span class="pill pill-teori" id="sp-count"></span></div>
        <div data-field="rows">
          <div class="sup-head hide-mobile"><span>No</span><span>Nama Trainer *</span><span>Tugas Trainer *</span><span>Lokasi Pekerjaan *</span><span>Keterangan</span><span></span></div>
          <div id="sp-rows" class="sup-rows"></div>
        </div>
        <div class="row-wrap mt-2">
          <button type="button" class="btn btn-soft" id="sp-add">${UI.icon('plus')}Tambah Baris</button>
          <button type="button" class="btn btn-ghost" id="sp-all">${UI.icon('users')}Isi Semua Trainer Aktif</button>
        </div>
        <datalist id="sp-trainer-list"></datalist>
        <datalist id="sp-lokasi-list">${lokasi.map((l) => `<option value="${UI.esc(l)}">`).join('')}</datalist>
      </section>

      <section class="card">
        <div class="sec-head"><span class="ic-tile praktik">${UI.icon('message-square-text')}</span>
          <div><h3>Catatan Pengawas</h3><p>Opsional — ringkasan atau hal yang perlu diperhatikan superintendent.</p></div></div>
        <textarea class="textarea" name="catatan" maxlength="800" placeholder="Contoh: Seluruh trainer hadir lengkap; unit PC200 #EX-402 dalam perawatan.">${UI.esc(f.catatan)}</textarea>
      </section>

      <div class="row-wrap hide-mobile" style="justify-content:flex-end">
        <button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
        <button type="submit" class="btn btn-primary btn-lg">${UI.icon('file-check-2')}${edit ? 'Simpan Perubahan &amp; Buat Ulang PDF' : 'Simpan &amp; Buat PDF'}</button>
      </div>
    </form>
    <div class="sticky-actions">
      <button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="button" class="btn btn-primary" data-act="save">${UI.icon('file-check-2')}Simpan &amp; PDF</button>
    </div>`;

  const form = $('#spf', el);
  const rowsEl = $('#sp-rows', el);

  function renderRows(focusIdx) {
    rowsEl.innerHTML = f.rows.map((x, i) => `
      <div class="sup-row" data-i="${i}">
        <span class="sup-no">${i + 1}</span>
        <label class="sup-cell"><span class="sup-lbl">Nama Trainer *</span>
          <input class="input" data-k="nama" list="sp-trainer-list" value="${UI.esc(x.nama)}" placeholder="Nama trainer" maxlength="100"></label>
        <label class="sup-cell"><span class="sup-lbl">Tugas Trainer *</span>
          <textarea class="textarea" data-k="tugas" rows="1" placeholder="Contoh: Praktik manuver excavator PC200" maxlength="400">${UI.esc(x.tugas)}</textarea></label>
        <label class="sup-cell"><span class="sup-lbl">Lokasi Pekerjaan *</span>
          <input class="input" data-k="lokasi" list="sp-lokasi-list" value="${UI.esc(x.lokasi)}" placeholder="Lokasi pekerjaan" maxlength="160"></label>
        <label class="sup-cell"><span class="sup-lbl">Keterangan</span>
          <input class="input" data-k="ket" value="${UI.esc(x.ket)}" placeholder="Keterangan (opsional)" maxlength="400"></label>
        <button type="button" class="btn-round danger" data-rm="${i}" aria-label="Hapus baris ${i + 1}">${UI.icon('trash-2')}</button>
      </div>`).join('');
    UI.icons(rowsEl);
    $('#sp-count', el).textContent = `${f.rows.filter((x) => x.nama).length} Trainer`;
    if (focusIdx !== undefined) {
      const inp = rowsEl.querySelector(`[data-i="${focusIdx}"] [data-k="nama"]`);
      if (inp) inp.focus();
    }
  }

  const saveDraft = UI.debounce(() => {
    if (edit) return;
    UI.store.set(DRAFT, f);
    const chip = $('#sp-draft', el);
    if (chip) { const d = new Date(); chip.innerHTML = `${UI.icon('cloud-check')} Draf tersimpan otomatis (${UI.pad(d.getHours())}:${UI.pad(d.getMinutes())} ${UI.tz()})`; UI.icons(chip); }
  }, 600);

  const clearRowsErr = () => {
    const h = form.querySelector('[data-field="rows"]');
    h.classList.remove('has-error');
    $$('.field-err', h).forEach((x) => x.remove());
  };

  rowsEl.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    const i = Number(e.target.closest('[data-i]').dataset.i);
    f.rows[i][k] = e.target.value;
    if (k === 'nama') {
      const t = trainers.find((x) => x.nama === e.target.value);
      f.rows[i].trainerId = t ? t.id : '';
      $('#sp-count', el).textContent = `${f.rows.filter((x) => x.nama).length} Trainer`;
    }
    if (e.target.tagName === 'TEXTAREA') { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }
    clearRowsErr();
    saveDraft();
  });
  rowsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    f.rows.splice(Number(b.dataset.rm), 1);
    if (!f.rows.length) f.rows.push(blankRow());
    renderRows();
    saveDraft();
  });
  rowsEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset.k === 'ket') {
      e.preventDefault();
      f.rows.push(blankRow());
      renderRows(f.rows.length - 1);
    }
  });
  $('#sp-add', el).onclick = () => { f.rows.push(blankRow()); renderRows(f.rows.length - 1); saveDraft(); };
  $('#sp-all', el).onclick = () => {
    if (!trainers.length) { UI.toast('Daftar trainer belum termuat. Coba lagi sebentar.', 'warn'); return; }
    const ada = new Set(f.rows.map((x) => x.nama));
    f.rows = f.rows.filter((x) => x.nama || x.tugas || x.lokasi || x.ket);
    let n = 0;
    trainers.forEach((t) => { if (!ada.has(t.nama)) { f.rows.push({ nama: t.nama, trainerId: t.id, tugas: '', lokasi: '', ket: '' }); n++; } });
    if (!f.rows.length) f.rows.push(blankRow());
    renderRows();
    saveDraft();
    UI.toast(n ? `${n} trainer aktif ditambahkan. Lengkapi tugas & lokasinya.` : 'Semua trainer aktif sudah ada di daftar.', n ? 'ok' : 'info');
  };
  form.addEventListener('input', (e) => {
    if (['tanggal', 'kepada', 'catatan'].includes(e.target.name)) {
      f[e.target.name] = e.target.value;
      const h = e.target.closest('[data-field]');
      if (h) { h.classList.remove('has-error'); $$('.field-err', h).forEach((x) => x.remove()); }
      saveDraft();
    }
  });
  form.addEventListener('change', (e) => { if (e.target.name === 'tanggal') { f.tanggal = e.target.value; saveDraft(); } });

  async function save(btn) {
    const rows = f.rows.filter((x) => x.nama || x.tugas || x.lokasi || x.ket);
    const err = {};
    if (!f.tanggal) err.tanggal = 'Tanggal laporan wajib diisi.';
    if (!rows.length) err.rows = 'Tambahkan minimal 1 trainer.';
    const kurang = rows.findIndex((x) => !x.nama.trim() || !x.tugas.trim() || !x.lokasi.trim());
    if (kurang >= 0) err.rows = `Baris ke-${f.rows.indexOf(rows[kurang]) + 1} belum lengkap: nama trainer, tugas, dan lokasi pekerjaan wajib diisi.`;
    UI.fieldErrors(form, Object.keys(err).length ? err : null);
    if (Object.keys(err).length) { UI.toast('Masih ada isian yang perlu dilengkapi.', 'warn', 'Periksa laporan'); return; }
    const payload = { tanggal: f.tanggal, kepada: f.kepada.trim(), catatan: f.catatan.trim(), rows, clientRef };
    UI.busy(btn, true, 'Menyimpan & membuat PDF…');
    try {
      let id, pdf;
      if (edit) {
        const res = await API.call('updateSupReport', Object.assign({ id: edit.id }, payload));
        id = edit.id; pdf = res.pdf;
        try { await API.swr('getSupReport', { id }, null, { force: true }); } catch (e2) { /* dimuat ulang di detail */ }
      } else {
        const res = await API.call('createSupReport', payload);
        id = res.id; pdf = res.pdf;
        UI.store.del(DRAFT);
        if (payload.kepada) UI.store.set('tto_sup_kepada', payload.kepada);
      }
      UI.toast(pdf.ok ? 'PDF laporan siap diunduh atau dicetak.' : pdf.message, pdf.ok ? 'ok' : 'warn', edit ? 'Laporan diperbarui' : 'Laporan tersimpan');
      location.hash = '#/pengawas/' + encodeURIComponent(id);
    } catch (ex) {
      if (ex.fields) UI.fieldErrors(form, ex.fields);
      UI.error(ex);
    } finally { UI.busy(btn, false); UI.icons(btn); }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); save(e.submitter || form.querySelector('[type="submit"]')); });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'save') save(b);
    if (b.dataset.act === 'cancel') {
      if (edit) { location.hash = '#/pengawas/' + encodeURIComponent(edit.id); return; }
      const ok = await UI.confirm({ title: 'Batalkan laporan?', message: 'Isian dan draf laporan ini akan dihapus dari perangkat.', okText: 'Ya, hapus draf', danger: true });
      if (ok) { UI.store.del(DRAFT); location.hash = '#/pengawas'; }
    }
  });

  renderRows();
  if (restored) UI.toast('Draf laporan sebelumnya dipulihkan.', 'info', 'Draf ditemukan');

  // Daftar trainer aktif untuk saran nama (dari cache, instan bila sudah dimuat)
  try {
    const d = await API.swr('listUsers', {});
    trainers = d.users.filter((x) => x.role === 'TRAINER' && x.status === 'AKTIF').map((x) => ({ id: x.id, nama: x.nama }));
    const dl = document.getElementById('sp-trainer-list');
    if (dl) dl.innerHTML = trainers.map((t) => `<option value="${UI.esc(t.nama)}">`).join('');
  } catch (e) { /* saran nama tidak wajib */ }
};

// ---------------------------------------------------------------------------
// DETAIL + PRATINJAU DOKUMEN
// ---------------------------------------------------------------------------
Pages.supDetail = async function (el, { params }) {
  const hash = location.hash;
  if (!API.peek('getSupReport', { id: params[0] })) el.innerHTML = UI.loader('Memuat laporan…');
  const r = await API.swr('getSupReport', { id: params[0] }, () => {
    if (App.stillOn(hash) && !document.querySelector('.modal-backdrop')) App.route();
  });
  const can = Pages.supCanEdit(r);
  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs"><a href="#/pengawas">${UI.icon('arrow-left')} Laporan ke Superintendent</a> <span>›</span> <b>Detail</b></div>
        <h1 class="page-title row-wrap">Laporan <span class="mono">${UI.esc(r.id)}</span></h1>
        <div class="row-wrap mt-1"><span class="pill pill-teori">${UI.icon('users')}${UI.num(r.rows.length)} trainer</span>
          <span class="pill pill-gray">${UI.icon('calendar')}${UI.esc(UI.dateLong(r.tanggal))}</span></div></div>
      <div class="page-actions">
        <button class="btn btn-primary" id="sd-dl">${UI.icon('download')}Unduh PDF</button>
        <button class="btn btn-soft" id="sd-print">${UI.icon('printer')}Cetak PDF</button>
        ${can ? `<a class="btn btn-ghost" href="#/pengawas/${encodeURIComponent(r.id)}/ubah">${UI.icon('pencil')}Ubah</a>
          <button class="btn btn-danger-soft" id="sd-del">${UI.icon('trash-2')}Hapus</button>` : ''}
      </div>
    </div>
    <div class="doc anim-in">
      <div class="doc-head">
        <div class="row" style="align-items:flex-start;gap:14px">${UI.logo()}
          <div><h4>${UI.esc((App.settings.organisasi || 'Operator Training Center (OTC)').toUpperCase())}</h4>
          <div class="sub">${UI.esc((App.settings.subOrganisasi || '').toUpperCase())}</div>
          <div style="font-weight:800;margin-top:6px">LAPORAN PENGAWAS KEPADA SUPERINTENDENT</div></div></div>
        <div class="doc-id"><span class="pill pill-mono">${UI.esc(r.id)}</span><br>Dibuat ${UI.esc(r.ts)} ${UI.tz()}</div>
      </div>
      <div class="doc-info">
        <div><small>Tanggal Laporan</small><b>${UI.esc(UI.dateLong(r.tanggal))}</b></div>
        <div><small>Kepada</small><b>${UI.esc(r.kepada || 'Superintendent')}</b></div>
        <div><small>Dari (Pengawas)</small><b>${UI.esc(r.pengawasNama)}</b></div>
        <div><small>Jumlah Trainer</small><b>${r.rows.length} orang</b></div>
      </div>
      <h5><span>DAFTAR PENUGASAN TRAINER</span></h5>
      <div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nama Trainer</th><th>Tugas Trainer</th><th>Lokasi Pekerjaan</th><th>Keterangan</th></tr></thead>
        <tbody>${r.rows.map((x, i) => `<tr><td>${i + 1}</td><td><b>${UI.esc(x.nama)}</b></td><td style="white-space:pre-wrap">${UI.esc(x.tugas)}</td>
          <td>${UI.esc(x.lokasi)}</td><td style="white-space:pre-wrap">${UI.esc(x.ket || '—')}</td></tr>`).join('')}</tbody></table></div>
      ${r.catatan ? `<h5>CATATAN PENGAWAS</h5><div class="note" style="font-style:normal">${UI.esc(r.catatan)}</div>` : ''}
      <div class="doc-sign">
        <div>Dilaporkan oleh, Pengawas / Supervisor OTC<br><span class="stamp">✓ ${UI.esc(r.pengawasNama)}</span></div>
        <div>Diterima oleh, Superintendent<br><span class="stamp gray">${UI.esc(r.kepada || 'Tanda tangan superintendent')}</span></div>
      </div>
      ${r.diubahOleh ? `<p class="tiny mt-2" style="color:#62778c">Terakhir diubah oleh ${UI.esc(r.diubahOleh)} • ${UI.esc(r.diubahPada)}</p>` : ''}
    </div>`;
  $('#sd-dl', el).onclick = (e) => Pages.supPdf(r.id, e.currentTarget);
  $('#sd-print', el).onclick = (e) => Pages.supPdf(r.id, e.currentTarget, 'print');
  if ($('#sd-del', el)) $('#sd-del', el).onclick = async () => { if (await Pages.supDelete(r)) location.hash = '#/pengawas'; };
};
