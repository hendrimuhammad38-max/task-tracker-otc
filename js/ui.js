/* =============================================================================
   UI HELPERS — format, ikon, toast, modal, unduhan, animasi angka
   ============================================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const UI = {
  BULAN: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  BULAN_PANJANG: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],

  esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  icon(name, cls = '') { return `<i data-lucide="${name}" class="${cls}"></i>`; },

  /** Logo aplikasi: logo unggahan Admin bila ada, jika tidak logo bawaan. size: '' | 'sm' | 'big' */
  logo(size = '') {
    const b = (typeof App !== 'undefined' && App.brand) || {};
    return b.logo ? `<img class="brand-img ${size}" src="${b.logo}" alt="Logo">` : `<span class="logo-mark ${size}"></span>`;
  },

  /** Ganti semua <i data-lucide> menjadi SVG (dipanggil setelah render). */
  icons(root) {
    if (window.lucide && lucide.createIcons) {
      try {
        lucide.createIcons({ icons: lucide.icons, nameAttr: 'data-lucide', attrs: { 'stroke-width': 2 }, root: root || document });
      } catch (e) {
        try { lucide.createIcons({ icons: lucide.icons }); } catch (e2) { /* ikon gagal dimuat: tampilan tetap berfungsi */ }
      }
    }
  },

  // ---------- Format ----------
  num(n) { return Number(n || 0).toLocaleString('id-ID'); },
  pad(n) { return String(n).padStart(2, '0'); },
  today() { const d = new Date(); return `${d.getFullYear()}-${UI.pad(d.getMonth() + 1)}-${UI.pad(d.getDate())}`; },
  addDays(s, n) { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${UI.pad(d.getMonth() + 1)}-${UI.pad(d.getDate())}`; },
  date(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s || '—';
    return `${Number(s.slice(8, 10))} ${UI.BULAN[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;
  },
  dateLong(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s || '—';
    return `${Number(s.slice(8, 10))} ${UI.BULAN_PANJANG[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;
  },
  time(s) { return s && s.length >= 16 ? s.slice(11, 16) : ''; },
  dateTime(s) { return s ? `${UI.date(s)} • ${UI.time(s)}` : '—'; },
  tz() { return 'WITA'; },
  greeting() {
    const h = new Date().getHours();
    return h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';
  },
  initials(name) {
    return String(name || '?').replace(/[^A-Za-z\s]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  },
  avatarClass(name) {
    let h = 0;
    String(name || '').split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    return 'c' + ((h % 5) + 1);
  },
  avatar(name, extra = '') { return `<span class="avatar ${UI.avatarClass(name)} ${extra}">${UI.esc(UI.initials(name))}</span>`; },

  // ---------- Pill ----------
  statusPill(s) {
    const map = { 'Selesai': ['pill-ok', 'circle-check'], 'Dalam Proses': ['pill-warn', 'loader'], 'Belum Selesai': ['pill-bad', 'triangle-alert'] };
    const m = map[s] || ['pill-gray', 'circle'];
    return `<span class="pill ${m[0]}">${UI.icon(m[1])}${UI.esc(s || '-')}</span>`;
  },
  jenisPill(j) {
    return j === 'Praktik Lapangan'
      ? `<span class="pill pill-praktik">${UI.icon('hard-hat')}Praktik</span>`
      : `<span class="pill pill-teori">${UI.icon('presentation')}Teori</span>`;
  },
  rolePill(r) {
    const m = { TRAINER: 'pill-teori', PENGAWAS: 'pill-praktik', ADMIN: 'pill-violet' };
    return `<span class="pill ${m[r] || 'pill-gray'}">${UI.esc(r)}</span>`;
  },
  roleLabel(r) { return { TRAINER: 'Trainer / Instruktur', PENGAWAS: 'Pengawas / Supervisor', ADMIN: 'Administrator' }[r] || r; },

  // ---------- Toast ----------
  toast(message, type = 'ok', title) {
    const root = $('#toast-root');
    const icons = { ok: ['circle-check', 'ok'], bad: ['circle-x', 'bad'], warn: ['triangle-alert', 'warn'], info: ['info', 'info'] };
    const ic = icons[type] || icons.info;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', type === 'bad' ? 'alert' : 'status');
    el.innerHTML = `<span class="ic-tile ${ic[1]}">${UI.icon(ic[0])}</span><div>${title ? `<b>${UI.esc(title)}</b>` : ''}<span>${UI.esc(message)}</span></div>`;
    root.appendChild(el);
    UI.icons(el);
    const remove = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 260); };
    setTimeout(remove, type === 'bad' ? 6000 : 3800);
    el.addEventListener('click', remove);
  },

  error(err, fallback = 'Terjadi kesalahan.') {
    if (err && err.code === 'AUTH') return; // ditangani global
    UI.toast((err && err.message) || fallback, 'bad', 'Gagal');
  },

  // ---------- Modal / bottom sheet ----------
  modal({ title = '', subtitle = '', icon = '', iconClass = '', body = '', footer = '', size = '', bodyClass = '', onClose, dismissible = true } = {}) {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${UI.esc(String(title).replace(/<[^>]+>/g, ''))}">
        <div class="sheet-handle"></div>
        ${title ? `<div class="modal-head">
          ${icon ? `<span class="ic-tile ${iconClass}">${UI.icon(icon)}</span>` : ''}
          <div style="min-width:0"><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ''}</div>
          ${dismissible ? `<button class="btn-icon sm" data-close aria-label="Tutup">${UI.icon('x')}</button>` : ''}
        </div>` : ''}
        <div class="modal-body ${bodyClass}">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>`;
    root.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    UI.icons(wrap);
    let closed = false;
    const close = (val) => {
      if (closed) return;
      closed = true;
      wrap.classList.add('closing');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        wrap.remove();
        if (!$('#modal-root').children.length) document.body.style.overflow = '';
      }, 200);
      if (onClose) onClose(val);
    };
    const onKey = (e) => { if (e.key === 'Escape' && dismissible) close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap && dismissible) close();
      if (e.target.closest('[data-close]')) close();
    });
    const first = wrap.querySelector('input, select, textarea');
    if (first && window.innerWidth > 760) setTimeout(() => first.focus(), 60);
    return { el: wrap, close };
  },

  confirm({ title = 'Konfirmasi', message = '', okText = 'Ya, lanjutkan', danger = false, icon = 'triangle-alert' } = {}) {
    return new Promise((resolve) => {
      let result = false;
      const m = UI.modal({
        title, icon, iconClass: danger ? 'bad' : 'warn',
        body: `<p class="muted">${message}</p>`,
        footer: `<button class="btn btn-ghost" data-close>Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${UI.esc(okText)}</button>`,
        onClose: () => resolve(result)
      });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { result = true; m.close(); });
    });
  },

  // ---------- Tombol loading ----------
  busy(btn, on, text) {
    if (!btn) return;
    if (on) {
      btn.dataset.html = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.innerHTML = `<span class="spinner"></span><span>${UI.esc(text || 'Memproses…')}</span>`;
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
    }
  },

  // ---------- Error per field ----------
  fieldErrors(form, fields) {
    $$('.field-err', form).forEach((e) => e.remove());
    $$('.has-error', form).forEach((e) => e.classList.remove('has-error'));
    if (!fields) return;
    Object.keys(fields).forEach((k) => {
      const holder = form.querySelector(`[data-field="${k}"]`);
      if (!holder) return;
      holder.classList.add('has-error');
      const msg = document.createElement('div');
      msg.className = 'field-err';
      msg.textContent = fields[k];
      holder.appendChild(msg);
    });
    const first = form.querySelector('.has-error');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  // ---------- Unduh berkas base64 ----------
  b64ToBlob(b64, mime) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime || 'application/octet-stream' });
  },
  saveBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },
  saveText(text, fileName, mime = 'text/csv;charset=utf-8') {
    UI.saveBlob(new Blob(['﻿' + text], { type: mime }), fileName);
  },
  fileSize(bytes) { return bytes > 1048576 ? (bytes / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'; },

  // ---------- WhatsApp ----------
  waLink(phone, text) {
    let p = String(phone || '').replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
  },

  // ---------- Animasi angka ----------
  countUp(root) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $$('[data-count]', root).forEach((el) => {
      const to = Number(el.dataset.count) || 0;
      const dec = Number(el.dataset.dec || 0);
      if (reduce || to === 0) { el.textContent = to.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return; }
      const t0 = performance.now(), dur = 850;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const v = to * (1 - Math.pow(1 - p, 3));
        el.textContent = v.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  },

  debounce(fn, ms = 350) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },

  store: {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  },

  loader(text = 'Memuat data…') { return `<div class="page-loader"><div class="spinner-lg"></div><span>${UI.esc(text)}</span></div>`; },

  empty(title, text, icon = 'inbox') {
    return `<div class="empty"><span class="ic-tile">${UI.icon(icon)}</span><b>${UI.esc(title)}</b><span class="small">${UI.esc(text || '')}</span></div>`;
  },

  pager(page, pages, total, label = 'data') {
    if (!total) return '';
    const btns = [];
    const add = (p) => btns.push(`<button data-page="${p}" class="${p === page ? 'active' : ''}">${p}</button>`);
    const range = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
    let last = 0;
    Array.from(range).sort((a, b) => a - b).forEach((p) => {
      if (p - last > 1) btns.push('<span class="faint">…</span>');
      add(p);
      last = p;
    });
    return `<div class="pager"><span>Halaman ${page} dari ${pages} • ${UI.num(total)} ${label}</span>
      <div class="pager-btns"><button class="wide" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Sebelumnya</button>${btns.join('')}
      <button class="wide" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Selanjutnya</button></div></div>`;
  },

  csv(rows) {
    return rows.map((r) => r.map((v) => {
      let s = String(v === null || v === undefined ? '' : v);
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
  }
};
