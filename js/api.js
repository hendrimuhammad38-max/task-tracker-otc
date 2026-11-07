/* =============================================================================
   API — komunikasi ke backend Google Apps Script lewat fetch()
   Semua aksi memakai POST { action, token, data } dengan header text/plain
   (wajib, agar tidak memicu CORS preflight yang ditolak GAS).

   v1.1: CACHE INSTAN (stale-while-revalidate)
   Data yang pernah dibuka langsung ditampilkan dari cache (memori + localStorage),
   lalu diperbarui diam-diam di latar belakang. Setiap aksi tulis menandai cache
   "basi" sehingga halaman berikutnya tetap tampil instan namun segera disegarkan.
   ============================================================================= */
class ApiError extends Error {
  constructor(code, message, fields) {
    super(message);
    this.code = code;
    this.fields = fields || null;
  }
}

const READ_ACTIONS = ['bootstrap', 'dashboard', 'listReports', 'getReport', 'listContacts', 'myStats', 'listUsers', 'listMasters', 'listLogs', 'listSupReports', 'getSupReport'];
const NO_STALE = ['login', 'ping', 'logout', 'previewPdf', 'downloadPdf', 'downloadSupPdf', 'getBranding'].concat(READ_ACTIONS);

const API = {
  token: null,
  FRESH_MS: 20000, // data dianggap segar 20 detik; setelah itu disegarkan di latar belakang

  isConfigured() {
    const u = (window.APP_CONFIG && APP_CONFIG.GAS_URL) || '';
    return /^https?:\/\//.test(u);
  },

  async call(action, data = {}, opt = {}) {
    if (!API.isConfigured()) {
      throw new ApiError('CONFIG', 'URL backend belum diisi. Buka js/config.js dan isi GAS_URL dengan URL /exec dari Apps Script.');
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), APP_CONFIG.TIMEOUT_MS || 60000);
    let res;
    try {
      res = await fetch(APP_CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: API.token, data }),
        signal: ctrl.signal,
        redirect: 'follow'
      });
    } catch (e) {
      throw new ApiError('NETWORK', e.name === 'AbortError'
        ? 'Server terlalu lama merespons. Periksa koneksi lalu coba lagi.'
        : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      clearTimeout(timer);
    }

    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw new ApiError('BAD_RESPONSE', 'Respons server tidak valid. Pastikan URL /exec benar dan deployment diatur "Who has access: Anyone".');
    }
    if (!json || !json.ok) {
      const err = new ApiError((json && json.code) || 'ERROR', (json && json.message) || 'Terjadi kesalahan.', json && json.fields);
      if (err.code === 'AUTH' && !opt.silentAuth) {
        window.dispatchEvent(new CustomEvent('auth-expired', { detail: err.message }));
      }
      throw err;
    }
    if (!NO_STALE.includes(action)) API.cache.markStale();
    return json.data;
  },

  // ---------------------------------------------------------------------------
  // Cache
  // ---------------------------------------------------------------------------
  cache: {
    mem: new Map(),
    inflight: new Map(),
    owner: null,
    saveTimer: null,

    stable(v) {
      if (Array.isArray(v)) return '[' + v.map((x) => API.cache.stable(x)).join(',') + ']';
      if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + API.cache.stable(v[k])).join(',') + '}';
      return JSON.stringify(v === undefined ? null : v);
    },
    key(action, data) { return action + '|' + API.cache.stable(data || {}); },

    load(owner) {
      API.cache.owner = owner;
      API.cache.mem = new Map();
      try {
        const raw = JSON.parse(localStorage.getItem('tto_cache_' + owner) || '{}');
        Object.keys(raw).forEach((k) => API.cache.mem.set(k, raw[k]));
      } catch (e) { /* abaikan */ }
    },
    save() {
      clearTimeout(API.cache.saveTimer);
      API.cache.saveTimer = setTimeout(() => {
        if (!API.cache.owner) return;
        const entries = Array.from(API.cache.mem.entries()).sort((a, b) => (b[1].u || 0) - (a[1].u || 0)).slice(0, 40);
        const write = (list) => localStorage.setItem('tto_cache_' + API.cache.owner, JSON.stringify(Object.fromEntries(list)));
        try { write(entries); } catch (e) { try { write(entries.slice(0, 12)); } catch (e2) { /* penyimpanan penuh */ } }
      }, 400);
    },
    put(k, d) { API.cache.mem.set(k, { d, t: Date.now(), u: Date.now() }); API.cache.save(); },
    markStale() { API.cache.mem.forEach((v) => { v.t = 0; }); API.cache.save(); },
    clear() {
      if (API.cache.owner) { try { localStorage.removeItem('tto_cache_' + API.cache.owner); } catch (e) { /* abaikan */ } }
      API.cache.mem = new Map();
      API.cache.owner = null;
    }
  },

  async _fetchStore(k, action, data) {
    if (API.cache.inflight.has(k)) return API.cache.inflight.get(k);
    const p = API.call(action, data).then((d) => { API.cache.put(k, d); return d; }).finally(() => API.cache.inflight.delete(k));
    API.cache.inflight.set(k, p);
    return p;
  },

  /**
   * Ambil data dengan cache instan.
   * - Ada di cache → langsung dikembalikan; bila sudah tidak segar, disegarkan di latar belakang
   *   dan `onFresh(dataBaru)` dipanggil HANYA jika isinya berubah.
   * - Tidak ada di cache (atau opt.force) → ditunggu dari server.
   */
  async swr(action, data = {}, onFresh, opt = {}) {
    const snap = JSON.parse(JSON.stringify(data || {}));
    const k = API.cache.key(action, snap);
    const hit = API.cache.mem.get(k);
    if (hit && !opt.force) {
      hit.u = Date.now();
      if (Date.now() - hit.t > API.FRESH_MS) {
        const old = JSON.stringify(hit.d);
        API._fetchStore(k, action, snap).then((d) => {
          if (onFresh && JSON.stringify(d) !== old) onFresh(d);
        }).catch(() => { /* tetap tampilkan data cache */ });
      }
      return hit.d;
    }
    return API._fetchStore(k, action, snap);
  },

  /** Ambil diam-diam ke cache (untuk halaman yang kemungkinan dibuka berikutnya). */
  prefetch(action, data = {}) {
    const snap = JSON.parse(JSON.stringify(data || {}));
    const k = API.cache.key(action, snap);
    const hit = API.cache.mem.get(k);
    if (hit && Date.now() - hit.t < API.FRESH_MS) return Promise.resolve(hit.d);
    return API._fetchStore(k, action, snap).catch(() => null);
  },

  /** Cari data cache (tanpa jaringan). */
  peek(action, data = {}) {
    const hit = API.cache.mem.get(API.cache.key(action, data));
    return hit ? hit.d : null;
  }
};
