/* =============================================================================
   HALAMAN LAPORAN — form (baru/ubah), pratinjau PDF, sukses, daftar, detail
   ============================================================================= */
window.Pages = window.Pages || {};

// ---------- Komponen bersama ----------
Pages.reportListItem = function (r) {
  const ic = r.jenis === 'Praktik Lapangan' ? ['truck', 'praktik'] : ['presentation', ''];
  return `<div class="list-item" data-open="${UI.esc(r.id)}" role="link" tabindex="0">
    <span class="ic-tile sm ${ic[1]}">${UI.icon(ic[0])}</span>
    <div class="li-main">
      <div class="li-title truncate">${UI.esc(r.namaPel)}</div>
      <div class="li-meta"><span class="pill pill-mono">${UI.esc(r.id)}</span><span>Trainer: <b>${UI.esc(r.trainerNama)}</b></span>
        <span>• ${UI.num(r.jml)} Peserta</span><span>• ${UI.esc(UI.time(r.ts) || UI.date(r.ts))} ${UI.tz()}</span></div>
    </div>
    <span class="hide-mobile">${UI.statusPill(r.status)}</span>
    <button class="btn-round" data-dl="${UI.esc(r.id)}" title="Unduh PDF" aria-label="Unduh PDF ${UI.esc(r.id)}">${UI.icon('download')}</button>
  </div>`;
};

Pages.bindListItems = function (root, before) {
  root.addEventListener('click', (e) => {
    const dl = e.target.closest('[data-dl]');
    if (dl) { e.stopPropagation(); Pages.downloadPdf(dl.dataset.dl, dl); return; }
    const it = e.target.closest('[data-open]');
    if (it) { if (before) before(); location.hash = '#/laporan/' + encodeURIComponent(it.dataset.open); }
  });
  root.addEventListener('keydown', (e) => {
    const it = e.target.closest('[data-open]');
    if (it && e.key === 'Enter') location.hash = '#/laporan/' + encodeURIComponent(it.dataset.open);
  });
};

/** Unduh PDF laporan dari server lalu simpan ke perangkat. */
Pages.lastPdf = null;
Pages.downloadPdf = async function (id, btn) {
  const isRound = btn && btn.classList.contains('btn-round');
  const old = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    if (isRound) btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></span>';
    else UI.busy(btn, true, 'Mengunduh…');
  }
  try {
    const d = await API.call('downloadPdf', { id });
    const blob = UI.b64ToBlob(d.base64, d.mime);
    UI.saveBlob(blob, d.fileName);
    Pages.lastPdf = { id, blob, fileName: d.fileName };
    UI.toast(`${d.fileName} (${UI.fileSize(blob.size)})`, 'ok', 'PDF berhasil diunduh');
    return Pages.lastPdf;
  } catch (e) {
    UI.error(e);
    return null;
  } finally {
    if (btn) {
      btn.disabled = false;
      if (isRound) btn.innerHTML = old; else UI.busy(btn, false);
      UI.icons(btn);
    }
  }
};

Pages.canShareFiles = function () {
  try {
    return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.pdf', { type: 'application/pdf' })] }));
  } catch (e) { return false; }
};

Pages.shareReport = async function (r, btn) {
  let pdf = Pages.lastPdf && Pages.lastPdf.id === r.id ? Pages.lastPdf : null;
  if (!pdf) pdf = await Pages.downloadPdf(r.id, btn);
  if (!pdf) return;
  try {
    await navigator.share({
      files: [new File([pdf.blob], pdf.fileName, { type: 'application/pdf' })],
      title: 'Laporan ' + r.id,
      text: Pages.waText(r, null)
    });
  } catch (e) {
    if (e.name !== 'AbortError') UI.toast('Perangkat tidak mendukung berbagi berkas. Gunakan tombol Unduh PDF.', 'warn');
  }
};

Pages.waText = function (r, contact) {
  const sapa = contact ? `Halo ${contact.nama.split(' ')[0]}, ` : 'Halo, ';
  return `${sapa}berikut laporan penyelesaian pelatihan:\n` +
    `• ID: ${r.id}\n• Pelatihan: ${r.namaPel}\n• Jenis: ${r.jenis}\n• Tanggal: ${UI.dateLong(r.tglPel)}\n` +
    `• Lokasi: ${r.lokasi}${r.alat ? `\n• Unit: ${r.alat}` : ''}\n• Peserta: ${r.jml || (r.peserta || []).length} orang\n• Status: ${r.status}\n\n` +
    `File PDF laporan saya lampirkan setelah pesan ini.\n— ${App.user.nama} (${App.user.badge})`;
};

/** Modal kirim ke WhatsApp pengawas (pesan otomatis + lampirkan PDF manual). */
Pages.openWa = async function (r) {
  const m = UI.modal({
    title: 'Kirim ke WhatsApp Pengawas', subtitle: 'Pesan ringkasan dibuat otomatis — lampirkan file PDF di WhatsApp',
    icon: 'send', body: UI.loader('Memuat kontak pengawas…')
  });
  let contacts = [];
  try { contacts = await API.swr('listContacts', {}); } catch (e) { /* tetap lanjut */ }
  const body = m.el.querySelector('.modal-body');
  const saved = UI.store.get('tto_wa_contact');
  const opts = contacts.map((c) => `<option value="${UI.esc(c.wa)}" ${saved === c.wa ? 'selected' : ''}>${UI.esc(c.nama)} — ${UI.esc(c.role === 'ADMIN' ? 'Admin' : 'Pengawas')}</option>`).join('');
  body.innerHTML = `
    <div class="wa-card">
      <div class="row" style="justify-content:space-between"><b class="small" style="letter-spacing:.06em">PENERIMA</b></div>
      ${contacts.length ? `<div class="wa-contact">${UI.icon('user-round-check')}<select id="wa-to" aria-label="Pilih pengawas">${opts}</select></div>`
        : `<div class="alert alert-warn mt-1">${UI.icon('info')}<span>Belum ada pengawas dengan No. WhatsApp. Masukkan nomor manual.</span></div>`}
      <label class="field mt-1" ${contacts.length ? 'hidden' : ''} id="wa-manual-wrap"><span class="field-label">No. WhatsApp</span>
        <input class="input" id="wa-manual" placeholder="0812xxxxxxx" inputmode="tel"></label>
      <div class="field-label mt-2" style="letter-spacing:.06em;font-size:12px">PRATINJAU PESAN</div>
      <div class="wa-msg mt-1" id="wa-msg"></div>
    </div>
    <div class="alert alert-info mt-2">${UI.icon('paperclip')}<span>WhatsApp tidak bisa menerima lampiran otomatis dari tautan. Unduh PDF terlebih dahulu, lalu lampirkan file di chat pengawas.${Pages.canShareFiles() ? ' Di HP, tombol <b>Bagikan</b> bisa langsung mengirim file PDF ke WhatsApp.' : ''}</span></div>`;
  m.el.querySelector('.modal').insertAdjacentHTML('beforeend', `<div class="modal-foot">
    <button class="btn btn-ghost" id="wa-dl">${UI.icon('download')}Unduh PDF</button>
    ${Pages.canShareFiles() ? `<button class="btn btn-soft" id="wa-share">${UI.icon('share-2')}Bagikan</button>` : ''}
    <button class="btn btn-primary" id="wa-go">${UI.icon('send')}Buka WhatsApp</button></div>`);
  UI.icons(m.el);
  const contactOf = () => {
    const sel = $('#wa-to', m.el);
    return sel ? contacts.find((c) => c.wa === sel.value) : null;
  };
  const upd = () => { $('#wa-msg', m.el).textContent = Pages.waText(r, contactOf()); };
  upd();
  if ($('#wa-to', m.el)) $('#wa-to', m.el).addEventListener('change', upd);
  $('#wa-dl', m.el).onclick = (e) => Pages.downloadPdf(r.id, e.currentTarget);
  if ($('#wa-share', m.el)) $('#wa-share', m.el).onclick = (e) => Pages.shareReport(r, e.currentTarget);
  $('#wa-go', m.el).onclick = () => {
    const c = contactOf();
    const phone = c ? c.wa : ($('#wa-manual', m.el).value || '');
    if (phone.replace(/\D/g, '').length < 9) { UI.toast('Nomor WhatsApp belum valid.', 'warn'); return; }
    if (c) UI.store.set('tto_wa_contact', c.wa);
    window.open(UI.waLink(phone, Pages.waText(r, c)), '_blank', 'noopener');
  };
};

// ---------- Form laporan (baru & ubah) ----------
Pages.reportEdit = async function (el, { params }) {
  el.innerHTML = UI.loader('Memuat laporan…');
  const r = await API.call('getReport', { id: params[0] });
  return Pages.reportForm(el, { edit: r });
};

Pages.reportForm = async function (el, opts = {}) {
  const edit = opts.edit || null;
  const u = App.user;
  const DRAFT_KEY = 'tto_draft_' + u.id;
  const M = App.masters;
  const aktif = (xs) => (xs || []).filter((x) => x.status !== 'Nonaktif');
  const pelatihan = aktif(M.pelatihan);
  const alat = (M.alat || []).filter((x) => x.status !== 'Nonaktif');
  const lokasi = aktif(M.lokasi);
  const depts = aktif(M.departemen);
  const clientRef = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));

  const blank = { noReq: '', jenis: '', kodePel: '', namaPel: '', tglKelas: UI.today(), tglPel: UI.today(), lokasi: '', alat: '', status: '', catatan: '', peserta: [] };
  let f = Object.assign({}, blank);
  let restored = false;
  if (edit) {
    f = { noReq: edit.noReq, jenis: edit.jenis, kodePel: edit.kodePel, namaPel: edit.namaPel, tglKelas: edit.tglKelas, tglPel: edit.tglPel,
      lokasi: edit.lokasi, alat: edit.alat, status: edit.status, catatan: edit.catatan, peserta: edit.peserta.map((p) => Object.assign({}, p)) };
  } else {
    const d = UI.store.get(DRAFT_KEY);
    if (d && d.data) { f = Object.assign({}, blank, d.data); restored = true; }
  }
  // v1.2: No. Request kini per peserta (draf/laporan lama diisi dari No. Request laporan)
  f.peserta.forEach((p) => { if (!p.noReq) p.noReq = f.noReq || ''; });

  const reqGabung = (ps) => Array.from(new Set(ps.map((p) => String(p.noReq || '').trim()).filter(Boolean))).join(', ');
  const inList = (list, v) => list.some((x) => x.nama === v);
  const optList = (list, val, placeholder) => `<option value="">${placeholder}</option>` +
    list.map((x) => `<option value="${UI.esc(x.nama)}" ${x.nama === val ? 'selected' : ''}>${UI.esc(x.nama)}${x.status === 'Maintenance' ? ' (maintenance)' : ''}</option>`).join('') +
    `<option value="__manual" ${val && !inList(list, val) ? 'selected' : ''}>Lainnya (ketik manual)…</option>`;
  const pelOpts = () => {
    const grp = (j) => pelatihan.filter((p) => p.jenis === j).map((p) =>
      `<option value="${UI.esc(p.kode)}" ${p.kode === f.kodePel ? 'selected' : ''}>${UI.esc(p.nama)}</option>`).join('');
    const manual = f.namaPel && !pelatihan.some((p) => p.kode === f.kodePel);
    return `<option value="">Pilih modul pelatihan…</option><optgroup label="Teori Kelas">${grp('Teori Kelas')}</optgroup>
      <optgroup label="Praktik Lapangan">${grp('Praktik Lapangan')}</optgroup><option value="__manual" ${manual ? 'selected' : ''}>Lainnya (ketik manual)…</option>`;
  };
  const deptOpts = (val) => depts.map((d) => `<option ${d.nama === val ? 'selected' : ''}>${UI.esc(d.nama)}</option>`).join('');
  const HASIL = ['Lulus Kompeten', 'Belum Kompeten', 'Remedial'];
  const CREW = ['A', 'B', 'C', 'STD'];
  const KIMPER = ['F', 'R', 'M', 'I'];
  const MANUAL = '<option value="__manual">Lainnya (ketik manual)…</option>';

  el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="crumbs">${UI.icon('file-text')} Modul Form F-02 <span>•</span> <b>Sistem LockService GAS Aktif</b></div>
        <h1 class="page-title">${edit ? 'Ubah Laporan ' + UI.esc(edit.id) : 'Input Laporan Pelatihan Baru'}</h1>
        <p class="page-desc">${edit ? 'Koreksi data laporan. PDF akan dibuat ulang otomatis setelah perubahan disimpan.'
          : 'Isi detail pelatihan, data peserta, dan status evaluasi. PDF laporan dibuat otomatis untuk diarsipkan &amp; dibagikan.'}</p>
      </div>
      <div class="page-actions">
        ${edit ? `<a class="btn btn-ghost" href="#/laporan/${encodeURIComponent(edit.id)}">${UI.icon('arrow-left')}Kembali</a>`
          : `<span class="pill pill-gray" id="draft-chip">${UI.icon('cloud')} Draf tersimpan otomatis</span>`}
      </div>
    </div>

    <div class="steps" id="steps">
      ${[['Langkah 1', 'Informasi Pelatihan'], ['Langkah 2', 'Daftar Peserta'], ['Langkah 3', 'Status & Catatan'], ['Langkah 4', 'Pratinjau & PDF']]
        .map((s, i) => `<button type="button" class="step" data-step="${i + 1}"><span class="step-n">${i + 1}</span><div class="truncate"><small>${s[0]}</small><span class="lbl truncate">${s[1]}</span></div></button>`).join('')}
    </div>

    <form id="rf" class="grid g-form" novalidate>
      <div class="stack">
        <section class="card form-section" id="sec-1">
          <div class="sec-head"><span class="ic-tile">${UI.icon('clipboard-list')}</span>
            <div><h3>Bagian 1: Identitas &amp; Klasifikasi</h3><p>Modul pelatihan, lokasi, dan jadwal.</p></div>
            <span class="pill pill-info">Wajib Diisi</span></div>
          <div class="form-grid">
            <div class="field span-2" data-field="jenis">
              <span class="field-label">Jenis Pelatihan <span class="req">*</span></span>
              <div class="choice-grid" style="grid-template-columns:1fr 1fr">
                <label class="choice"><input type="radio" name="jenis" value="Teori Kelas" ${f.jenis === 'Teori Kelas' ? 'checked' : ''}>
                  <div><b>Teori Kelas</b><small>Modul ruangan</small></div><span class="choice-check"></span></label>
                <label class="choice c-praktik"><input type="radio" name="jenis" value="Praktik Lapangan" ${f.jenis === 'Praktik Lapangan' ? 'checked' : ''}>
                  <div><b>Praktik Lapangan</b><small>Simulasi alat berat</small></div><span class="choice-check"></span></label>
              </div>
            </div>
            <div class="field span-2" data-field="namaPel">
              <span class="field-label">Nama Modul Pelatihan <span class="req">*</span></span>
              <span class="input-wrap">${UI.icon('graduation-cap')}<select class="select input" name="kodePel" style="padding-left:42px">${pelOpts()}</select></span>
              <input class="input" name="namaPelManual" placeholder="Ketik nama pelatihan…" value="${UI.esc(f.namaPel)}" maxlength="160" hidden>
            </div>
            <div class="field" data-field="alat">
              <span class="field-label">Unit / Alat Berat <span class="pill pill-praktik" style="font-size:10.5px;padding:1px 8px">Wajib Praktik</span></span>
              <span class="input-wrap">${UI.icon('truck')}<select class="select input" name="alat" style="padding-left:42px">${optList(alat, f.alat, '— Tidak ada / pilih unit —')}</select></span>
              <input class="input" name="alatManual" placeholder="Ketik nama unit…" value="${UI.esc(f.alat)}" maxlength="120" hidden>
            </div>
            <div class="field" data-field="lokasi">
              <span class="field-label">Lokasi Pelaksanaan <span class="req">*</span></span>
              <span class="input-wrap">${UI.icon('map-pin')}<select class="select input" name="lokasi" style="padding-left:42px">${optList(lokasi, f.lokasi, 'Pilih lokasi…')}</select></span>
              <input class="input" name="lokasiManual" placeholder="Ketik lokasi…" value="${UI.esc(f.lokasi)}" maxlength="120" hidden>
            </div>
            <div class="field" data-field="tglKelas">
              <span class="field-label">Tanggal Kelas <span class="req">*</span></span>
              <input class="input" type="date" name="tglKelas" value="${UI.esc(f.tglKelas)}">
            </div>
            <div class="field" data-field="tglPel">
              <span class="field-label">Tanggal Pelaksanaan <span class="req">*</span></span>
              <input class="input" type="date" name="tglPel" value="${UI.esc(f.tglPel)}">
            </div>
            <div class="field span-2">
              <span class="field-label">Trainer Penanggung Jawab</span>
              <div class="trainer-chip">${UI.avatar(edit ? edit.trainerNama : u.nama)}<div><b>${UI.esc(edit ? edit.trainerNama : u.nama)}</b>
                <small>${edit ? 'Pembuat laporan' : UI.esc(UI.roleLabel(u.role))}</small></div><span class="pill pill-mono">${UI.esc(edit ? (edit.trainerBadge || edit.trainerId) : u.badge)}</span></div>
            </div>
          </div>
        </section>

        <section class="card form-section" id="sec-2">
          <div class="sec-head"><span class="ic-tile info">${UI.icon('users')}</span>
            <div><h3>Bagian 2: Data Peserta Pelatihan</h3><p>Daftar hadir, No. Badge karyawan, departemen &amp; hasil.</p></div>
            <span class="pill pill-teori" id="peserta-count"></span></div>
          <div data-field="peserta">
            <div class="table-wrap"><table class="table peserta-table"><thead><tr><th>No</th><th>Nama Lengkap Peserta</th><th>No. Badge</th><th>No. Request</th><th>Departemen</th><th>Crew</th><th>Type Kimper</th><th>Hasil</th><th></th></tr></thead>
              <tbody id="peserta-body"></tbody></table></div>
            <div class="peserta-add" id="peserta-add">
              <input class="input" id="pa-nama" placeholder="Nama peserta" maxlength="100" aria-label="Nama peserta">
              <input class="input" id="pa-badge" placeholder="BDG-XXXX" maxlength="40" aria-label="No. Badge peserta">
              <input class="input" id="pa-req" placeholder="No. Request" maxlength="60" aria-label="No. Request peserta">
              <div class="pa-cell"><select class="select" id="pa-dept" aria-label="Departemen peserta"><option value="">Departemen…</option>${deptOpts('')}${MANUAL}</select>
                <input class="input" id="pa-dept-manual" placeholder="Ketik departemen…" maxlength="100" hidden></div>
              <select class="select" id="pa-crew" aria-label="Crew peserta"><option value="">Crew…</option>${CREW.map((c) => `<option>${c}</option>`).join('')}</select>
              <div class="pa-cell"><select class="select" id="pa-kimper" aria-label="Type Kimper peserta"><option value="">Type Kimper…</option>${KIMPER.map((k) => `<option>${k}</option>`).join('')}${MANUAL}</select>
                <input class="input" id="pa-kimper-manual" placeholder="Ketik type kimper…" maxlength="30" hidden></div>
              <div class="pa-cell"><select class="select" id="pa-hasil" aria-label="Hasil peserta">${HASIL.map((h) => `<option>${h}</option>`).join('')}${MANUAL}</select>
                <input class="input" id="pa-hasil-manual" placeholder="Ketik hasil…" maxlength="60" hidden></div>
              <button type="button" class="btn btn-primary" id="pa-add">${UI.icon('plus')}Tambah</button>
            </div>
            <p class="tiny faint mt-1">Tekan <b>Enter</b> di kolom No. Badge untuk menambah peserta dengan cepat.</p>
          </div>
        </section>

        <section class="card form-section" id="sec-3">
          <div class="sec-head"><span class="ic-tile praktik">${UI.icon('clipboard-check')}</span>
            <div><h3>Bagian 3: Status &amp; Evaluasi Pelatihan</h3><p>Ketuntasan modul dan catatan trainer lapangan.</p></div></div>
          <div class="field" data-field="status">
            <span class="field-label">Status Penyelesaian <span class="req">*</span></span>
            <div class="choice-grid">
              <label class="choice"><input type="radio" name="status" value="Selesai" ${f.status === 'Selesai' ? 'checked' : ''}>
                <span class="choice-ic" style="color:var(--ok)">${UI.icon('circle-check')}</span><div><b>Selesai Penuh</b><small>Siap untuk sertifikasi</small></div><span class="choice-check"></span></label>
              <label class="choice c-warn"><input type="radio" name="status" value="Dalam Proses" ${f.status === 'Dalam Proses' ? 'checked' : ''}>
                <span class="choice-ic" style="color:var(--warn)">${UI.icon('loader')}</span><div><b>Dalam Proses</b><small>Butuh sesi lanjutan</small></div><span class="choice-check"></span></label>
              <label class="choice c-bad"><input type="radio" name="status" value="Belum Selesai" ${f.status === 'Belum Selesai' ? 'checked' : ''}>
                <span class="choice-ic" style="color:var(--bad)">${UI.icon('triangle-alert')}</span><div><b>Belum Selesai</b><small>Perlu remedial / revisi</small></div><span class="choice-check"></span></label>
            </div>
          </div>
          <div class="field mt-3">
            <span class="field-label">Catatan Trainer / Evaluasi Lapangan <span class="faint tiny" id="cat-count">0/500</span></span>
            <textarea class="textarea" name="catatan" maxlength="500" placeholder="Contoh: Seluruh peserta menyelesaikan uji manuver dan safety checklist pra-operasi tanpa insiden.">${UI.esc(f.catatan)}</textarea>
          </div>
        </section>
      </div>

      <aside class="card sum-card">
        <div class="sec-head" style="margin-bottom:14px"><span class="ic-tile sm">${UI.icon('chart-no-axes-column')}</span><h3 style="font-size:16px">Ringkasan Laporan</h3><span class="pill pill-ok">Live Preview</span></div>
        <div class="sum-item"><span class="ic-tile sm">${UI.icon('lock')}</span><div><small>ID Laporan</small><b class="mono">${edit ? UI.esc(edit.id) : 'Dibuat otomatis'}</b></div><span class="pill pill-gray">${edit ? 'TETAP' : 'LOCK GEN'}</span></div>
        <div class="sum-item"><span class="ic-tile sm info">${UI.icon('users')}</span><div><small>Total Peserta</small><b id="sum-peserta">0 Orang</b></div></div>
        <div class="sum-item"><span class="ic-tile sm praktik">${UI.icon('file-text')}</span><div><small>Format Output</small><b>PDF A4 Standar OTC</b></div><span class="pill pill-praktik">Google Drive</span></div>
        <div class="sum-item"><span class="ic-tile sm violet">${UI.icon('layers')}</span><div><small>Jenis &amp; Status</small><b id="sum-jenis">—</b></div></div>
        <div class="alert alert-info mt-1">${UI.icon('info')}<span>Setelah dikonfirmasi, sistem mengunci nomor laporan unik, membuat PDF di Google Drive, lalu Anda bisa mengunduh &amp; mengirimkannya ke WhatsApp pengawas.</span></div>
        <div class="stack mt-3 hide-mobile" style="gap:10px">
          <button type="button" class="btn btn-primary btn-lg btn-block" data-act="preview">${UI.icon('send')}${edit ? 'Pratinjau &amp; Simpan' : 'Simpan &amp; Buat PDF Laporan'}</button>
          <div class="row">
            ${edit ? '' : `<button type="button" class="btn btn-ghost" style="flex:1" data-act="draft">${UI.icon('save')}Simpan Draf</button>`}
            <button type="button" class="btn btn-danger-soft" style="flex:1" data-act="cancel">Batalkan</button>
          </div>
        </div>
        <p class="tiny faint mt-2 row">${UI.icon('shield-check')} Nomor laporan dijamin unik walau banyak trainer mengirim bersamaan.</p>
      </aside>
    </form>
    <div class="sticky-actions">
      ${edit ? `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>` : `<button type="button" class="btn btn-ghost" data-act="draft">${UI.icon('save')}Draf</button>`}
      <button type="button" class="btn btn-primary" data-act="preview">${UI.icon('eye')}Pratinjau &amp; Kirim</button>
    </div>`;

  const form = $('#rf', el);
  const q = (n) => form.querySelector(`[name="${n}"]`);

  // ----- Sinkronisasi field ⇄ state -----
  const toggleManual = (sel, manualName) => {
    const man = q(manualName);
    man.hidden = q(sel).value !== '__manual';
  };
  toggleManual('kodePel', 'namaPelManual');
  toggleManual('alat', 'alatManual');
  toggleManual('lokasi', 'lokasiManual');

  function readForm() {
    f.noReq = reqGabung(f.peserta);
    const j = form.querySelector('[name="jenis"]:checked');
    f.jenis = j ? j.value : '';
    const kp = q('kodePel').value;
    if (kp === '__manual') { f.kodePel = ''; f.namaPel = q('namaPelManual').value.trim(); }
    else { const p = pelatihan.find((x) => x.kode === kp); f.kodePel = p ? p.kode : ''; f.namaPel = p ? p.nama : ''; }
    f.alat = q('alat').value === '__manual' ? q('alatManual').value.trim() : q('alat').value;
    f.lokasi = q('lokasi').value === '__manual' ? q('lokasiManual').value.trim() : q('lokasi').value;
    f.tglKelas = q('tglKelas').value;
    f.tglPel = q('tglPel').value;
    const s = form.querySelector('[name="status"]:checked');
    f.status = s ? s.value : '';
    f.catatan = q('catatan').value;
    return f;
  }

  function updateSummary() {
    readForm();
    $('#sum-peserta', el).textContent = `${f.peserta.length} Orang`;
    $('#peserta-count', el).textContent = `${f.peserta.length} Peserta Ditambahkan`;
    $('#sum-jenis', el).textContent = [f.jenis || 'Jenis belum dipilih', f.status].filter(Boolean).join(' • ');
    $('#cat-count', el).textContent = `${f.catatan.length}/500`;
    const done = [
      f.jenis && f.namaPel && f.lokasi && f.tglKelas && f.tglPel && (f.jenis !== 'Praktik Lapangan' || f.alat),
      f.peserta.length > 0,
      !!f.status
    ];
    $$('.step', el).forEach((s, i) => s.classList.toggle('done', i < 3 && !!done[i]));
  }

  const saveDraft = UI.debounce(() => {
    if (edit) return;
    readForm();
    UI.store.set(DRAFT_KEY, { at: new Date().toISOString(), data: f });
    const chip = $('#draft-chip', el);
    if (chip) { const d = new Date(); chip.innerHTML = `${UI.icon('cloud-check')} Draf tersimpan otomatis (${UI.pad(d.getHours())}:${UI.pad(d.getMinutes())} ${UI.tz()})`; UI.icons(chip); }
  }, 600);

  const clearErr = (e) => {
    const h = e.target.closest('[data-field]');
    if (h && h.classList.contains('has-error')) { h.classList.remove('has-error'); $$('.field-err', h).forEach((x) => x.remove()); }
  };
  form.addEventListener('input', (e) => { clearErr(e); updateSummary(); saveDraft(); });
  form.addEventListener('change', clearErr);
  form.addEventListener('change', (e) => {
    const n = e.target.name;
    if (n === 'kodePel') {
      toggleManual('kodePel', 'namaPelManual');
      const p = pelatihan.find((x) => x.kode === e.target.value);
      if (p) {
        const r = form.querySelector(`[name="jenis"][value="${p.jenis}"]`);
        if (r) r.checked = true;
        if (p.alatDefault && !q('alat').value && inList(alat, p.alatDefault)) q('alat').value = p.alatDefault;
        if (p.lokasiDefault && !q('lokasi').value && inList(lokasi, p.lokasiDefault)) q('lokasi').value = p.lokasiDefault;
        toggleManual('alat', 'alatManual');
        toggleManual('lokasi', 'lokasiManual');
        ['jenis', 'alat', 'lokasi'].forEach((k) => {
          const h = form.querySelector(`[data-field="${k}"]`);
          if (h) { h.classList.remove('has-error'); $$('.field-err', h).forEach((x) => x.remove()); }
        });
      }
    }
    if (n === 'jenis') {
      const p = pelatihan.find((x) => x.kode === q('kodePel').value);
      if (p && p.jenis !== e.target.value) q('kodePel').value = '';
    }
    if (n === 'alat') toggleManual('alat', 'alatManual');
    if (n === 'lokasi') toggleManual('lokasi', 'lokasiManual');
    updateSummary();
    saveDraft();
  });

  // ----- Peserta -----
  function renderPeserta() {
    const tb = $('#peserta-body', el);
    tb.innerHTML = f.peserta.length ? f.peserta.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="user-cell">${UI.avatar(p.nama)}<span class="cell-title">${UI.esc(p.nama)}</span></div></td>
        <td><span class="mono" style="color:var(--primary);font-weight:700">${UI.esc(p.badge)}</span></td>
        <td><input class="input mono" data-req="${i}" value="${UI.esc(p.noReq || '')}" placeholder="No. Request" maxlength="60"
          style="height:34px;font-size:12px;min-width:150px" aria-label="No. Request ${UI.esc(p.nama)}"></td>
        <td><span class="pill pill-info">${UI.esc(p.dept)}</span></td>
        <td><select class="select" data-crew="${i}" style="height:34px;font-size:12.5px;min-width:78px" aria-label="Crew">
          <option value="">—</option>${CREW.map((c) => `<option ${c === p.crew ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
        <td><input class="input" data-kimper="${i}" list="kimper-list" value="${UI.esc(p.kimper || '')}" placeholder="F/R/M/I" maxlength="30"
          style="height:34px;font-size:12.5px;width:96px;text-transform:uppercase" aria-label="Type Kimper"></td>
        <td>${hasilEditing === i
          ? `<input class="input" data-hasil-input="${i}" value="" placeholder="Ketik hasil…" maxlength="60" style="height:34px;font-size:12.5px;min-width:150px">`
          : `<select class="select" data-hasil="${i}" style="height:34px;font-size:12.5px;min-width:150px">${HASIL.concat(HASIL.includes(p.hasil) ? [] : [p.hasil])
            .map((h) => `<option ${h === p.hasil ? 'selected' : ''}>${UI.esc(h)}</option>`).join('')}${MANUAL}</select>`}</td>
        <td><button type="button" class="btn-round danger" data-del="${i}" aria-label="Hapus ${UI.esc(p.nama)}">${UI.icon('trash-2')}</button></td>
      </tr>`).join('') : `<tr><td colspan="9">${UI.empty('Belum ada peserta', 'Tambahkan minimal 1 peserta di bawah.', 'user-plus')}</td></tr>`;
    UI.icons(tb);
    updateSummary();
    const hi = tb.querySelector('[data-hasil-input]');
    if (hi) hi.focus();
  }
  let hasilEditing = -1;
  $('#peserta-body', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    f.peserta.splice(Number(b.dataset.del), 1);
    renderPeserta();
    saveDraft();
  });
  $('#peserta-body', el).addEventListener('change', (e) => {
    const s = e.target.closest('[data-hasil]');
    if (s) {
      if (s.value === '__manual') { hasilEditing = Number(s.dataset.hasil); renderPeserta(); return; }
      f.peserta[Number(s.dataset.hasil)].hasil = s.value; saveDraft();
    }
    const hi = e.target.closest('[data-hasil-input]');
    if (hi) {
      const v = hi.value.trim();
      if (v) f.peserta[Number(hi.dataset.hasilInput)].hasil = v;
      hasilEditing = -1; renderPeserta(); saveDraft();
    }
    const c = e.target.closest('[data-crew]');
    if (c) { f.peserta[Number(c.dataset.crew)].crew = c.value; saveDraft(); }
    const rq = e.target.closest('[data-req]');
    if (rq) { rq.value = rq.value.trim(); f.peserta[Number(rq.dataset.req)].noReq = rq.value; updateSummary(); saveDraft(); }
    const k = e.target.closest('[data-kimper]');
    if (k) { k.value = k.value.trim().toUpperCase(); f.peserta[Number(k.dataset.kimper)].kimper = k.value; saveDraft(); }
  });
  $('#peserta-body', el).addEventListener('keydown', (e) => {
    const hi = e.target.closest('[data-hasil-input]');
    if (hi && e.key === 'Enter') { e.preventDefault(); hi.blur(); }
    if (hi && e.key === 'Escape') { hasilEditing = -1; renderPeserta(); }
  });
  $('#peserta-body', el).addEventListener('focusout', (e) => {
    const hi = e.target.closest('[data-hasil-input]');
    if (hi && hasilEditing >= 0 && !hi.value.trim()) setTimeout(() => { if (hasilEditing >= 0) { hasilEditing = -1; renderPeserta(); } }, 120);
  });
  // Pilihan "Lainnya (ketik manual)" pada baris tambah peserta
  [['#pa-dept', '#pa-dept-manual'], ['#pa-kimper', '#pa-kimper-manual'], ['#pa-hasil', '#pa-hasil-manual']].forEach(([sel, man]) => {
    $(sel, el).addEventListener('change', () => {
      const on = $(sel, el).value === '__manual';
      $(man, el).hidden = !on;
      if (on) $(man, el).focus();
    });
  });
  const paVal = (sel, man) => ($(sel, el).value === '__manual' ? $(man, el).value.trim() : $(sel, el).value);
  const addPeserta = () => {
    const nama = $('#pa-nama', el).value.trim();
    const badge = $('#pa-badge', el).value.trim().toUpperCase();
    const dept = paVal('#pa-dept', '#pa-dept-manual');
    const crew = $('#pa-crew', el).value;
    const kimper = paVal('#pa-kimper', '#pa-kimper-manual').toUpperCase();
    const hasil = paVal('#pa-hasil', '#pa-hasil-manual');
    const noReq = $('#pa-req', el).value.trim();
    if (!nama || !badge || !noReq || !dept || !crew) { UI.toast('Isi nama, No. Badge, No. Request, departemen, dan crew peserta.', 'warn'); return; }
    if (!hasil) { UI.toast('Ketik hasil peserta atau pilih dari daftar.', 'warn'); return; }
    if (f.peserta.some((p) => p.badge === badge)) { UI.toast(`No. Badge ${badge} sudah ada di daftar.`, 'warn'); return; }
    f.peserta.push({ nama, badge, noReq, dept, crew, kimper, hasil }); // No. Request tetap terisi untuk peserta berikutnya
    const ph = form.querySelector('[data-field="peserta"]');
    ph.classList.remove('has-error');
    $$('.field-err', ph).forEach((x) => x.remove());
    $('#pa-nama', el).value = '';
    $('#pa-badge', el).value = '';
    $('#pa-nama', el).focus();
    renderPeserta();
    saveDraft();
  };
  $('#pa-add', el).addEventListener('click', addPeserta);
  ['#pa-nama', '#pa-badge', '#pa-req', '#pa-dept-manual', '#pa-kimper-manual', '#pa-hasil-manual'].forEach((s) => $(s, el).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (s === '#pa-nama') $('#pa-badge', el).focus(); else addPeserta(); }
  }));
  if (!document.getElementById('kimper-list')) {
    document.body.insertAdjacentHTML('beforeend', `<datalist id="kimper-list">${KIMPER.map((k) => `<option value="${k}">`).join('')}</datalist>`);
  }
  renderPeserta();
  if (restored) UI.toast('Draf laporan sebelumnya dipulihkan.', 'info', 'Draf ditemukan');

  // ----- Langkah (stepper) -----
  $('#steps', el).addEventListener('click', (e) => {
    const s = e.target.closest('[data-step]');
    if (!s) return;
    const n = Number(s.dataset.step);
    if (n === 4) return openPreview();
    $('#sec-' + n, el).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          const n = Number(en.target.id.slice(4));
          $$('.step', el).forEach((s) => s.classList.toggle('active', Number(s.dataset.step) === n));
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    $$('.form-section', el).forEach((s) => io.observe(s));
    App.onCleanup(() => io.disconnect());
  }

  // ----- Validasi klien (server tetap memvalidasi ulang) -----
  function validate() {
    readForm();
    const err = {};
    const tanpaReq = f.peserta.findIndex((p) => !String(p.noReq || '').trim());
    if (tanpaReq >= 0) err.peserta = `No. Request peserta ke-${tanpaReq + 1} (${f.peserta[tanpaReq].nama}) belum diisi.`;
    if (!f.jenis) err.jenis = 'Pilih jenis pelatihan.';
    if (!f.namaPel) err.namaPel = 'Pilih atau ketik nama pelatihan.';
    if (f.jenis === 'Praktik Lapangan' && !f.alat) err.alat = 'Alat berat wajib untuk Praktik Lapangan.';
    if (!f.lokasi) err.lokasi = 'Lokasi wajib diisi.';
    if (!f.tglKelas) err.tglKelas = 'Tanggal kelas wajib diisi.';
    if (!f.tglPel) err.tglPel = 'Tanggal pelaksanaan wajib diisi.';
    if (!f.peserta.length) err.peserta = 'Tambahkan minimal 1 peserta.';
    if (!f.status) err.status = 'Pilih status penyelesaian.';
    UI.fieldErrors(form, Object.keys(err).length ? err : null);
    if (Object.keys(err).length) UI.toast('Masih ada isian yang perlu dilengkapi.', 'warn', 'Periksa formulir');
    return !Object.keys(err).length;
  }

  // ----- Aksi -----
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'preview') openPreview();
    if (act === 'draft') { saveDraft(); UI.toast('Draf tersimpan di perangkat ini.', 'ok'); }
    if (act === 'cancel') {
      if (edit) { location.hash = '#/laporan/' + encodeURIComponent(edit.id); return; }
      const ok = await UI.confirm({ title: 'Batalkan laporan?', message: 'Isian dan draf laporan ini akan dihapus dari perangkat.', okText: 'Ya, hapus draf', danger: true });
      if (ok) { UI.store.del(DRAFT_KEY); location.hash = '#/dashboard'; }
    }
  });

  function payload() {
    readForm();
    return Object.assign({}, f, { noReq: reqGabung(f.peserta), catatan: f.catatan.trim(), clientRef });
  }

  function openPreview() {
    if (!validate()) return;
    const p = payload();
    const r = Object.assign({}, p, {
      id: edit ? edit.id : 'LAP-' + UI.today().replace(/-/g, '') + '-•••', ts: edit ? edit.ts : '',
      trainerNama: edit ? edit.trainerNama : u.nama, trainerBadge: edit ? (edit.trainerBadge || edit.trainerId) : u.badge
    });
    const m = UI.modal({
      size: 'xl', icon: 'file-text', iconClass: 'praktik',
      title: `Pratinjau Dokumen PDF Laporan <span class="pill pill-teori">${UI.icon('badge-check')}Siap Dibuat &amp; Diarsipkan</span>`,
      subtitle: `Format A4 Standar OTC • ID: <span class="mono">${UI.esc(r.id)}</span> • Estimasi ≤ 10 detik`,
      bodyClass: 'tinted', body: Pages.docPreview(r, !edit),
      footer: `<button class="btn btn-ghost" data-close>${UI.icon('pencil')}Kembali / Edit</button>
        <button class="btn btn-soft" id="pv-draf">${UI.icon('download')}Unduh Draf</button>
        <span class="tiny faint hide-mobile" style="margin-right:auto;margin-left:6px">${UI.icon('lock')} LockService aktif • Google Drive auto-sync</span>
        <button class="btn btn-primary" id="pv-send">${UI.icon('send')}${edit ? 'Simpan Perubahan (Buat Ulang PDF)' : 'Konfirmasi &amp; Kirim Laporan'}</button>`
    });
    UI.icons(m.el);
    $('#pv-draf', m.el).onclick = async (ev) => {
      const btn = ev.currentTarget;
      UI.busy(btn, true, 'Membuat draf…');
      try {
        const d = await API.call('previewPdf', p);
        UI.saveBlob(UI.b64ToBlob(d.base64, d.mime), d.fileName);
        UI.toast('Draf PDF (bertanda DRAF) berhasil diunduh.', 'ok');
      } catch (ex) { UI.error(ex); } finally { UI.busy(btn, false); UI.icons(btn); }
    };
    $('#pv-send', m.el).onclick = async (ev) => {
      const btn = ev.currentTarget;
      UI.busy(btn, true, edit ? 'Menyimpan & membuat PDF…' : 'Mengirim & membuat PDF…');
      $('#pv-draf', m.el).disabled = true;
      try {
        if (edit) {
          const res = await API.call('updateReport', Object.assign({ id: edit.id }, p));
          try { await API.swr('getReport', { id: edit.id }, null, { force: true }); } catch (e2) { /* halaman detail akan memuat ulang */ }
          m.close();
          UI.toast(res.pdf.ok ? 'Perubahan tersimpan dan PDF dibuat ulang.' : res.pdf.message, res.pdf.ok ? 'ok' : 'warn', 'Laporan diperbarui');
          location.hash = '#/laporan/' + encodeURIComponent(edit.id);
        } else {
          const res = await API.call('createReport', p);
          UI.store.del(DRAFT_KEY);
          m.close();
          App.refreshToday();
          App.afterRoute = () => Pages.successModal(Object.assign({}, r, { id: res.id, ts: res.ts, jml: f.peserta.length }), res.pdf);
          location.hash = '#/laporan/' + encodeURIComponent(res.id);
        }
      } catch (ex) {
        UI.busy(btn, false);
        UI.icons(btn);
        $('#pv-draf', m.el).disabled = false;
        if (ex.code === 'VALIDATION' && ex.fields) { m.close(); UI.fieldErrors(form, ex.fields); }
        UI.error(ex);
      }
    };
  }
  updateSummary();
};

/** Replika visual dokumen PDF (pratinjau sebelum dikirim). */
Pages.docPreview = function (r, watermark) {
  const lulus = r.peserta.filter((p) => p.hasil === 'Lulus Kompeten').length;
  const persen = r.peserta.length ? Math.round(lulus / r.peserta.length * 100) : 0;
  const warnaJenis = r.jenis === 'Praktik Lapangan' ? '#a8650f' : '#16707a';
  const warnaStatus = r.status === 'Selesai' ? '#1d7a55' : r.status === 'Dalam Proses' ? '#a8740f' : '#b3392f';
  return `<div class="doc">
    ${watermark ? '<div class="doc-watermark">PRATINJAU</div>' : ''}
    <div class="doc-head">
      <div class="row" style="align-items:flex-start;gap:14px">${UI.logo()}
        <div><h4>${UI.esc((App.settings.organisasi || 'Operator Training Center (OTC)').toUpperCase())}</h4>
        <div class="sub">${UI.esc((App.settings.subOrganisasi || '').toUpperCase())}</div>
        <div style="font-weight:800;margin-top:6px">LAPORAN PENYELESAIAN PELATIHAN</div></div></div>
      <div class="doc-id"><span class="pill pill-mono">${UI.esc(r.id)}</span><br>Format Form F-02<br>${r.ts ? UI.esc(r.ts) + ' ' + UI.tz() : 'Tanggal dibuat saat dikirim'}</div>
    </div>
    <div class="doc-info">
      <div><small>Nomor Request</small><b>${UI.esc(r.noReq)}</b></div>
      <div><small>Tipe Pelatihan</small><b style="color:${warnaJenis}">${UI.esc(r.jenis)}</b></div>
      <div><small>Trainer Penanggung Jawab</small><b>${UI.esc(r.trainerNama)} (${UI.esc(r.trainerBadge || '')})</b></div>
      <div><small>Status Hasil</small><b style="color:${warnaStatus}">${UI.esc((r.status || '').toUpperCase())}</b></div>
    </div>
    <div class="doc-kv">
      <span>Modul Pelatihan:</span><b>${UI.esc(r.namaPel)}${r.kodePel ? ` <span style="color:#62778c;font-weight:500">(${UI.esc(r.kodePel)})</span>` : ''}</b>
      <span>Unit Alat Berat:</span><div>${UI.esc(r.alat || '—')}</div>
      <span>Lokasi Pelaksanaan:</span><div>${UI.esc(r.lokasi)}</div>
      <span>Tanggal Kelas:</span><div>${UI.esc(UI.dateLong(r.tglKelas))}</div>
      <span>Tanggal Pelaksanaan:</span><div>${UI.esc(UI.dateLong(r.tglPel))}</div>
    </div>
    <h5><span>DAFTAR PESERTA &amp; HASIL (${r.peserta.length} ORANG)</span><em>Tingkat Kelulusan: ${persen}%</em></h5>
    <div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nama Lengkap Peserta</th><th>No. Badge</th><th>No. Request</th><th>Departemen</th><th>Crew</th><th>Type Kimper</th><th>Status Kelulusan</th></tr></thead>
      <tbody>${r.peserta.map((p, i) => `<tr><td>${i + 1}</td><td><b>${UI.esc(p.nama)}</b></td><td class="mono" style="color:#16707a;font-weight:700">${UI.esc(p.badge)}</td>
        <td class="mono">${UI.esc(p.noReq || '—')}</td><td>${UI.esc(p.dept)}</td><td>${UI.esc(p.crew || '—')}</td><td>${UI.esc(p.kimper || '—')}</td><td><span class="pill ${p.hasil === 'Lulus Kompeten' ? 'pill-teori' : 'pill-praktik'}" style="font-size:10.5px">${UI.esc(p.hasil.toUpperCase())}</span></td></tr>`).join('')}</tbody></table></div>
    <h5>CATATAN TRAINER / EVALUASI LAPANGAN</h5>
    <div class="note">${r.catatan ? UI.esc(r.catatan) : '—'}</div>
    <div class="doc-sign">
      <div>Instruktur / Trainer Pelaksana<br><span class="stamp">✓ ${UI.esc(r.trainerNama)} • ${UI.esc(r.trainerBadge || '')}</span></div>
      <div>Mengetahui, Pengawas / Supervisor OTC<br><span class="stamp gray">Tanda tangan pengawas</span></div>
    </div>
  </div>`;
};

/** Modal sukses setelah laporan terkirim. */
Pages.successModal = function (r, pdf) {
  const m = UI.modal({
    body: `<div class="center">
      <div class="success-ic"><svg viewBox="0 0 52 52"><path d="M14 27l8 8 16-18"/></svg></div>
      <h2 style="font-size:24px;font-weight:800">Laporan Berhasil Dikirim!</h2>
      <p class="muted mt-1">Laporan tersimpan di database dan ${pdf.ok ? 'PDF sudah diarsipkan di Google Drive.' : 'menunggu PDF dibuat ulang.'}</p>
      <div class="file-card mt-3"><span class="ic-tile">${UI.icon('file-text')}</span>
        <div style="min-width:0;flex:1"><b>${UI.esc(pdf.ok ? pdf.fileName : r.id)}</b><small><span class="pill pill-mono">${UI.esc(r.id)}</span> • ${UI.esc(r.jml)} peserta • ${UI.esc(r.jenis)}</small></div></div>
      ${pdf.ok ? '' : `<div class="alert alert-warn mt-2">${UI.icon('triangle-alert')}<span>${UI.esc(pdf.message || 'PDF gagal dibuat.')} Gunakan tombol "Buat Ulang PDF" di halaman detail.</span></div>`}
      <div class="stack mt-3" style="gap:10px">
        <button class="btn btn-primary btn-lg btn-block" id="sc-dl">${UI.icon('download')}Unduh PDF</button>
        <div class="row">
          ${Pages.canShareFiles() ? `<button class="btn btn-soft" style="flex:1" id="sc-share">${UI.icon('share-2')}Bagikan</button>` : ''}
          <button class="btn btn-soft" style="flex:1" id="sc-wa">${UI.icon('send')}Kirim ke WhatsApp Pengawas</button>
        </div>
        <div class="row" style="justify-content:space-between">
          <button class="link-btn" data-close>${UI.icon('eye')}Lihat Detail Laporan</button>
          <a class="link-btn" href="#/laporan-baru" id="sc-new">${UI.icon('plus')}Buat Laporan Lain</a>
        </div>
      </div></div>`
  });
  UI.icons(m.el);
  $('#sc-dl', m.el).onclick = (e) => Pages.downloadPdf(r.id, e.currentTarget);
  if ($('#sc-share', m.el)) $('#sc-share', m.el).onclick = (e) => Pages.shareReport(r, e.currentTarget);
  $('#sc-wa', m.el).onclick = () => { m.close(); Pages.openWa(r); };
  $('#sc-new', m.el).onclick = () => m.close();
};

// ---------- Daftar laporan ----------
Pages.reportListDefaults = (query = {}) => ({
  q: query.q || '', mine: query.mine === '1', from: query.from || '', to: query.to || '', jenis: '', status: '', alat: '',
  dept: '', lokasi: '', page: 1, size: 20, sort: 'ts', dir: 'desc'
});

Pages.reportList = async function (el, { query }) {
  const hash = location.hash;
  const isAdm = App.isAdmin();
  const st = Pages.reportListDefaults(query);
  const M = App.masters;
  const opt = (xs) => xs.map((x) => `<option>${UI.esc(x.nama)}</option>`).join('');

  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs">Laporan <span>›</span> <b>Daftar Laporan</b></div>
        <h1 class="page-title">Daftar Laporan Pelatihan</h1>
        <p class="page-desc">Cari, saring, dan unduh PDF laporan teori kelas maupun praktik lapangan.</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost" id="rl-export">${UI.icon('file-spreadsheet')}Ekspor CSV</button>
        <a class="btn btn-primary" href="#/laporan-baru">${UI.icon('plus')}Laporan Baru</a>
      </div>
    </div>
    <section class="card filter-card">
      <div class="search-row">
        <div class="segmented" id="rl-scope"><button data-v="0">Semua Laporan</button><button data-v="1">Laporan Saya</button></div>
        <span class="input-wrap">${UI.icon('search')}<input class="input" id="rl-q" type="search" placeholder="Cari No. Request, trainer, peserta, No. Badge, pelatihan, alat…" value="${UI.esc(st.q)}"></span>
        <button class="btn btn-ghost" id="rl-ftoggle">${UI.icon('sliders-horizontal')}Filter <span class="pill pill-teori" id="rl-fcount" hidden></span></button>
      </div>
      <div class="filter-grid" id="rl-filters" ${window.innerWidth < 760 ? 'hidden' : ''}>
        <label class="field"><span class="field-label tiny">Dari tanggal</span><input class="input" type="date" data-f="from" value="${UI.esc(st.from)}"></label>
        <label class="field"><span class="field-label tiny">Sampai tanggal</span><input class="input" type="date" data-f="to" value="${UI.esc(st.to)}"></label>
        <label class="field"><span class="field-label tiny">Jenis</span><select class="select" data-f="jenis"><option value="">Semua jenis</option><option>Teori Kelas</option><option>Praktik Lapangan</option></select></label>
        <label class="field"><span class="field-label tiny">Status</span><select class="select" data-f="status"><option value="">Semua status</option><option>Selesai</option><option>Dalam Proses</option><option>Belum Selesai</option></select></label>
        <label class="field"><span class="field-label tiny">Alat berat</span><select class="select" data-f="alat"><option value="">Semua alat</option>${opt(M.alat || [])}</select></label>
        <label class="field"><span class="field-label tiny">Departemen peserta</span><select class="select" data-f="dept"><option value="">Semua departemen</option>${opt(M.departemen || [])}</select></label>
        <label class="field"><span class="field-label tiny">Lokasi</span><select class="select" data-f="lokasi"><option value="">Semua lokasi</option>${opt(M.lokasi || [])}</select></label>
        <div class="field" style="justify-content:flex-end"><button class="btn btn-ghost" id="rl-reset">${UI.icon('rotate-ccw')}Reset Filter</button></div>
      </div>
    </section>
    <div class="row-wrap mt-3 mb-2" id="rl-summary"></div>
    <section class="card" id="rl-body">${UI.loader()}</section>`;

  const setScope = () => $$('#rl-scope button', el).forEach((b) => b.classList.toggle('active', (b.dataset.v === '1') === st.mine));
  setScope();
  $('#rl-scope', el).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    st.mine = b.dataset.v === '1';
    st.page = 1;
    setScope();
    load();
  });
  $('#rl-q', el).addEventListener('input', UI.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 400));
  $('#rl-ftoggle', el).addEventListener('click', () => { const f = $('#rl-filters', el); f.hidden = !f.hidden; });
  $('#rl-filters', el).addEventListener('change', (e) => {
    const k = e.target.dataset.f;
    if (!k) return;
    st[k] = e.target.value;
    st.page = 1;
    load();
  });
  $('#rl-reset', el).addEventListener('click', () => {
    ['from', 'to', 'jenis', 'status', 'alat', 'dept', 'lokasi'].forEach((k) => { st[k] = ''; });
    $$('[data-f]', el).forEach((i) => { i.value = ''; });
    st.page = 1;
    load();
  });
  $('#rl-export', el).addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    UI.busy(btn, true, 'Menyiapkan…');
    try {
      const d = await API.call('listReports', Object.assign({}, st, { export: true, size: 5000, page: 1 }));
      const rows = [['ID Laporan', 'Waktu Kirim', 'No Request', 'Jenis', 'Kode Pelatihan', 'Nama Pelatihan', 'Tanggal Kelas', 'Tanggal Pelaksanaan',
        'Lokasi', 'Alat Berat', 'Trainer', 'Jumlah Peserta', 'Status', 'Peserta (Nama | Badge | No Request | Departemen | Crew | Type Kimper | Hasil)']];
      d.items.forEach((r) => rows.push([r.id, r.ts, r.noReq, r.jenis, r.kodePel, r.namaPel, r.tglKelas, r.tglPel, r.lokasi, r.alat, r.trainerNama, r.jml, r.status,
        (r.peserta || []).map((p) => [p.nama, p.badge, p.noReq, p.dept, p.crew, p.kimper, p.hasil].join(' | ')).join('; ')]));
      UI.saveText(UI.csv(rows), `Laporan_OTC_${UI.today()}.csv`);
      UI.toast(`${d.items.length} laporan diekspor ke CSV.`, 'ok');
    } catch (ex) { UI.error(ex); } finally { UI.busy(btn, false); UI.icons(btn); }
  });

  const body = $('#rl-body', el);
  body.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-sort]');
    if (s) {
      const k = s.dataset.sort;
      st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc';
      st.sort = k;
      load();
      return;
    }
    const pg = e.target.closest('[data-page]');
    if (pg && !pg.disabled) { st.page = Number(pg.dataset.page); load(); body.scrollIntoView({ behavior: 'smooth' }); return; }
    const dl = e.target.closest('[data-dl]');
    if (dl) { e.stopPropagation(); Pages.downloadPdf(dl.dataset.dl, dl); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) { e.stopPropagation(); location.hash = `#/laporan/${encodeURIComponent(ed.dataset.edit)}/ubah`; return; }
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const ok = await Pages.deleteReport(del.dataset.del, del.dataset.name);
      if (ok) load(true);
      return;
    }
    const row = e.target.closest('[data-open]');
    if (row) location.hash = '#/laporan/' + encodeURIComponent(row.dataset.open);
  });

  async function load(force) {
    const fc = ['from', 'to', 'jenis', 'status', 'alat', 'dept', 'lokasi'].filter((k) => st[k]).length;
    $('#rl-fcount', el).hidden = !fc;
    $('#rl-fcount', el).textContent = fc;
    const snap = JSON.stringify(st);
    const loader = setTimeout(() => { body.style.opacity = '.6'; }, 120);
    let d;
    try {
      d = await API.swr('listReports', st, (fresh) => { if (App.stillOn(hash) && JSON.stringify(st) === snap) render(fresh); }, { force });
    } catch (e) { clearTimeout(loader); body.style.opacity = ''; UI.error(e); return; }
    clearTimeout(loader);
    if (!App.stillOn(hash) || JSON.stringify(st) !== snap) return;
    render(d);
  }

  function render(d) {
    body.style.opacity = '';
    const s = d.summary;
    $('#rl-summary', el).innerHTML = `
      <span class="pill pill-gray">${UI.icon('files')}${UI.num(s.total)} laporan</span>
      <span class="pill pill-ok">${UI.icon('circle-check')}${UI.num(s.selesai)} selesai</span>
      <span class="pill pill-warn">${UI.icon('loader')}${UI.num(s.proses)} dalam proses</span>
      <span class="pill pill-bad">${UI.icon('triangle-alert')}${UI.num(s.belum)} belum selesai</span>
      <span class="pill pill-info">${UI.icon('users')}${UI.num(s.peserta)} peserta</span>`;
    UI.icons($('#rl-summary', el));
    if (!d.items.length) {
      body.innerHTML = UI.empty('Tidak ada laporan yang cocok', 'Ubah kata kunci atau reset filter untuk melihat semua laporan.', 'search-x');
      UI.icons(body);
      return;
    }
    const arrow = (k) => (st.sort === k ? (st.dir === 'desc' ? ' ↓' : ' ↑') : '');
    body.innerHTML = `
      <div class="table-wrap desktop-table"><table class="table">
        <thead><tr>
          <th class="sortable" data-sort="id">ID Laporan${arrow('id')}</th><th class="sortable" data-sort="tglPel">Tanggal${arrow('tglPel')}</th>
          <th>No. Request</th><th>Jenis</th><th class="sortable" data-sort="namaPel">Pelatihan${arrow('namaPel')}</th>
          <th class="sortable" data-sort="trainerNama">Trainer${arrow('trainerNama')}</th><th>Alat Berat</th>
          <th class="sortable" data-sort="jml">Peserta${arrow('jml')}</th><th class="sortable" data-sort="status">Status${arrow('status')}</th><th style="text-align:right">Aksi</th>
        </tr></thead>
        <tbody>${d.items.map((r) => `
          <tr class="clickable" data-open="${UI.esc(r.id)}">
            <td><span class="pill pill-mono">${UI.esc(r.id)}</span></td>
            <td class="nowrap">${UI.esc(UI.date(r.tglPel))}<div class="cell-sub">${UI.esc(UI.time(r.ts))} ${UI.tz()}</div></td>
            <td class="mono small" style="max-width:170px"><span class="truncate" style="display:block" title="${UI.esc(r.noReq)}">${UI.esc(r.noReq)}</span></td>
            <td>${UI.jenisPill(r.jenis)}</td>
            <td style="max-width:260px"><div class="cell-title truncate">${UI.esc(r.namaPel)}</div><div class="cell-sub truncate">${UI.esc(r.lokasi)}</div></td>
            <td><div class="user-cell">${UI.avatar(r.trainerNama)}<span class="truncate">${UI.esc(r.trainerNama)}</span></div></td>
            <td class="small" style="max-width:180px"><span class="truncate" style="display:block">${UI.esc(r.alat || '—')}</span></td>
            <td><b>${UI.num(r.jml)}</b></td>
            <td>${UI.statusPill(r.status)}</td>
            <td><div class="actions">
              <button class="btn-round" data-dl="${UI.esc(r.id)}" title="Unduh PDF" aria-label="Unduh PDF">${UI.icon('download')}</button>
              ${isAdm ? `<button class="btn-round" data-edit="${UI.esc(r.id)}" title="Ubah" aria-label="Ubah laporan">${UI.icon('pencil')}</button>
                <button class="btn-round danger" data-del="${UI.esc(r.id)}" data-name="${UI.esc(r.namaPel)}" title="Hapus" aria-label="Hapus laporan">${UI.icon('trash-2')}</button>` : ''}
            </div></td>
          </tr>`).join('')}</tbody></table></div>
      <div class="mobile-cards">${d.items.map((r) => `
        <div class="r-card" data-open="${UI.esc(r.id)}">
          <div class="r-card-top"><span class="pill pill-mono">${UI.esc(r.id)}</span>${UI.statusPill(r.status)}</div>
          <div class="li-title">${UI.esc(r.namaPel)}</div>
          <div class="li-meta"><span>${UI.esc(r.trainerNama)}</span><span>• ${UI.esc(UI.date(r.tglPel))}</span></div>
          <div class="li-meta">${UI.jenisPill(r.jenis)}<span class="pill pill-gray">${UI.icon('users')}${UI.num(r.jml)} peserta</span></div>
          <div class="r-card-actions">
            <button class="btn btn-soft btn-sm" style="flex:1" data-dl="${UI.esc(r.id)}">${UI.icon('download')}Unduh PDF</button>
            ${isAdm ? `<button class="btn-round" data-edit="${UI.esc(r.id)}" aria-label="Ubah">${UI.icon('pencil')}</button>
              <button class="btn-round danger" data-del="${UI.esc(r.id)}" data-name="${UI.esc(r.namaPel)}" aria-label="Hapus">${UI.icon('trash-2')}</button>` : ''}
          </div>
        </div>`).join('')}</div>
      ${UI.pager(d.page, d.pages, d.total, 'laporan')}`;
    UI.icons(body);
  }
  await load();
};

Pages.deleteReport = async function (id, name) {
  const ok = await UI.confirm({
    title: 'Hapus laporan ini?', danger: true, icon: 'trash-2', okText: 'Ya, hapus laporan',
    message: `Laporan <b>${UI.esc(id)}</b>${name ? ` (${UI.esc(name)})` : ''} akan disembunyikan dari daftar dan dashboard. Data tetap tersimpan di arsip dan tindakan ini tercatat di Log Aktivitas.`
  });
  if (!ok) return false;
  try {
    await API.call('deleteReport', { id });
    UI.toast(`Laporan ${id} telah dihapus.`, 'ok');
    App.refreshToday();
    return true;
  } catch (e) { UI.error(e); return false; }
};

// ---------- Detail laporan ----------
Pages.reportDetail = async function (el, { params }) {
  const hash = location.hash;
  if (!API.peek('getReport', { id: params[0] })) el.innerHTML = UI.loader('Memuat detail laporan…');
  const r = await API.swr('getReport', { id: params[0] }, () => {
    if (App.stillOn(hash) && !document.querySelector('.modal-backdrop')) App.route();
  });
  const isAdm = App.isAdmin();
  const canRegen = isAdm || r.trainerId === App.user.id;
  const lulus = r.peserta.filter((p) => p.hasil === 'Lulus Kompeten').length;

  el.innerHTML = `
    <div class="page-head">
      <div><div class="crumbs"><a href="#/laporan">${UI.icon('arrow-left')} Daftar Laporan</a> <span>›</span> <b>Detail</b></div>
        <h1 class="page-title row-wrap">Laporan <span class="mono">${UI.esc(r.id)}</span></h1>
        <div class="row-wrap mt-1">${UI.statusPill(r.status)} ${UI.jenisPill(r.jenis)} <span class="pill pill-gray">${UI.icon('clock')}Dikirim ${UI.esc(UI.dateTime(r.ts))} ${UI.tz()}</span></div></div>
      <div class="page-actions">
        <button class="btn btn-primary" id="d-dl">${UI.icon('download')}Unduh PDF</button>
        <button class="btn btn-soft" id="d-wa">${UI.icon('send')}Kirim WhatsApp</button>
        ${isAdm ? `<a class="btn btn-ghost" href="#/laporan/${encodeURIComponent(r.id)}/ubah">${UI.icon('pencil')}Ubah</a>
          <button class="btn btn-danger-soft" id="d-del">${UI.icon('trash-2')}Hapus</button>` : ''}
      </div>
    </div>
    <div class="grid g-main-side anim-in">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon('clipboard-list')}</span>Informasi Pelatihan</div></div>
          <div class="doc-kv" style="grid-template-columns:170px 1fr;gap:10px 16px">
            <span class="muted">No. Request</span><b class="mono">${UI.esc(r.noReq)}</b>
            <span class="muted">Modul Pelatihan</span><b>${UI.esc(r.namaPel)} ${r.kodePel ? `<span class="pill pill-gray">${UI.esc(r.kodePel)}</span>` : ''}</b>
            <span class="muted">Jenis</span><div>${UI.esc(r.jenis)}</div>
            <span class="muted">Unit Alat Berat</span><div>${UI.esc(r.alat || '—')}</div>
            <span class="muted">Lokasi</span><div>${UI.esc(r.lokasi)}</div>
            <span class="muted">Tanggal Kelas</span><div>${UI.esc(UI.dateLong(r.tglKelas))}</div>
            <span class="muted">Tanggal Pelaksanaan</span><div>${UI.esc(UI.dateLong(r.tglPel))}</div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm info">${UI.icon('users')}</span>Peserta (${r.peserta.length})</div>
            <span class="pill pill-teori">Tingkat kelulusan ${r.peserta.length ? Math.round(lulus / r.peserta.length * 100) : 0}%</span></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>No</th><th>Nama</th><th>No. Badge</th><th>No. Request</th><th>Departemen</th><th>Crew</th><th>Type Kimper</th><th>Hasil</th></tr></thead>
            <tbody>${r.peserta.map((p, i) => `<tr><td>${i + 1}</td><td><div class="user-cell">${UI.avatar(p.nama)}<b>${UI.esc(p.nama)}</b></div></td>
              <td class="mono" style="color:var(--primary);font-weight:700">${UI.esc(p.badge)}</td><td class="mono small">${UI.esc(p.noReq || '—')}</td><td>${UI.esc(p.dept)}</td>
              <td><span class="pill pill-gray">${UI.esc(p.crew || '—')}</span></td><td><b>${UI.esc(p.kimper || '—')}</b></td>
              <td><span class="pill ${p.hasil === 'Lulus Kompeten' ? 'pill-ok' : 'pill-warn'}">${UI.esc(p.hasil)}</span></td></tr>`).join('')}</tbody></table></div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm praktik">${UI.icon('message-square-text')}</span>Catatan Trainer</div></div>
          <p style="white-space:pre-wrap">${r.catatan ? UI.esc(r.catatan) : '<span class="faint">Tidak ada catatan.</span>'}</p>
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-head"><div class="card-title">Trainer</div></div>
          <div class="user-cell">${UI.avatar(r.trainerNama, 'lg')}<div><b style="font-size:16px">${UI.esc(r.trainerNama)}</b>
            <div class="small muted">${UI.esc(r.trainerBadge || r.trainerId)}</div></div></div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm violet">${UI.icon('file-clock')}</span>Riwayat Data</div></div>
          <div class="stat-rows" style="margin-top:0">
            <div class="stat-row">${UI.icon('send')}<span>Dikirim</span><b class="small">${UI.esc(UI.dateTime(r.ts))}</b></div>
            <div class="stat-row">${UI.icon('pencil')}<span>Diubah oleh</span><b class="small">${UI.esc(r.diubahOleh || '—')}</b></div>
            <div class="stat-row">${UI.icon('clock')}<span>Diubah pada</span><b class="small">${UI.esc(r.diubahPada ? UI.dateTime(r.diubahPada) : '—')}</b></div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div class="card-title"><span class="ic-tile sm">${UI.icon('file-text')}</span>Dokumen PDF</div>
            <span class="pill ${r.pdfId ? 'pill-ok' : 'pill-warn'}">${r.pdfId ? 'Tersimpan di Drive' : 'Belum ada PDF'}</span></div>
          <p class="small muted">PDF A4 standar OTC, siap diunduh dan dikirim ke WhatsApp pengawas.</p>
          <div class="row mt-2">
            <button class="btn btn-soft" style="flex:1" id="d-dl2">${UI.icon('download')}Unduh</button>
            ${canRegen ? `<button class="btn btn-ghost" style="flex:1" id="d-regen">${UI.icon('refresh-cw')}Buat Ulang PDF</button>` : ''}
          </div>
        </section>
      </div>
    </div>`;

  $('#d-dl', el).onclick = (e) => Pages.downloadPdf(r.id, e.currentTarget);
  $('#d-dl2', el).onclick = (e) => Pages.downloadPdf(r.id, e.currentTarget);
  $('#d-wa', el).onclick = () => Pages.openWa(r);
  if ($('#d-regen', el)) {
    $('#d-regen', el).onclick = async (e) => {
      const btn = e.currentTarget;
      UI.busy(btn, true, 'Membuat PDF…');
      try {
        await API.call('regeneratePdf', { id: r.id });
        UI.toast('PDF berhasil dibuat ulang.', 'ok');
        App.route();
      } catch (ex) { UI.error(ex); UI.busy(btn, false); UI.icons(btn); }
    };
  }
  if ($('#d-del', el)) {
    $('#d-del', el).onclick = async () => {
      if (await Pages.deleteReport(r.id, r.namaPel)) location.hash = '#/laporan';
    };
  }
};
