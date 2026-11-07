/* =============================================================================
   HALAMAN DASHBOARD
   ============================================================================= */
window.Pages = window.Pages || {};

Pages.css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/** Buat grafik Chart.js + otomatis dihancurkan saat pindah halaman. */
Pages.chart = function (canvas, config) {
  if (!window.Chart || !canvas) {
    if (canvas) canvas.parentElement.innerHTML = '<div class="empty small">Grafik tidak dapat dimuat (periksa koneksi internet).</div>';
    return null;
  }
  const old = Chart.getChart(canvas);
  if (old) old.destroy();
  Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
  Chart.defaults.color = Pages.css('--text-3');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) config.options = Object.assign({ animation: false }, config.options);
  try {
    const c = new Chart(canvas, config);
    App.onCleanup(() => c.destroy());
    return c;
  } catch (e) {
    console.error('Grafik gagal dibuat', e);
    canvas.parentElement.innerHTML = '<div class="empty small">Grafik gagal ditampilkan.</div>';
    return null;
  }
};

Pages.dashboard = async function (el) {
  const hash = location.hash;
  const u = App.user;
  const st = { period: UI.store.get('tto_period', 'week'), jenis: '', dept: '', mine: false };
  const depts = (App.masters.departemen || []).filter((d) => d.status !== 'Nonaktif');

  el.innerHTML = `
    <div class="stack anim-in">
      <section class="hero" id="hero"></section>

      <div class="row-wrap on-bg" style="justify-content:space-between">
        <div><h3 style="font-size:17px;font-weight:800">Ringkasan Kinerja Pelatihan</h3>
          <p class="small muted" id="range-label">Memuat…</p></div>
        <div class="row-wrap">
          <div class="segmented" id="f-jenis">
            <button data-v="" class="active">Semua</button><button data-v="Teori Kelas">Teori</button><button data-v="Praktik Lapangan">Praktik</button>
          </div>
          <select class="select" id="f-dept" style="width:auto;height:38px;min-width:170px" aria-label="Filter departemen">
            <option value="">Semua Departemen</option>${depts.map((d) => `<option>${UI.esc(d.nama)}</option>`).join('')}
          </select>
          ${!App.isAdmin() ? `<label class="check"><input type="checkbox" id="f-mine"> Hanya laporan saya</label>` : ''}
        </div>
      </div>

      <div class="grid g-4" id="kpis">${'<div class="kpi skel"></div>'.repeat(4)}</div>

      <div class="grid g-main-side">
        <section class="card">
          <div class="card-head">
            <div><div class="card-title">Ringkasan Laporan</div><div class="card-sub">Aktivitas pelaporan modul kelas &amp; praktik unit</div></div>
            <div class="segmented" id="f-period">
              <button data-v="today">Hari Ini</button><button data-v="week">Minggu Ini</button><button data-v="month">Bulan Ini</button><button data-v="year">Tahun Ini</button>
            </div>
          </div>
          <div class="chart-box"><canvas id="ch-bar" aria-label="Grafik jumlah laporan"></canvas></div>
          <div class="legend mt-2" id="bar-legend"></div>
        </section>
        <section class="card">
          <div class="card-head"><div><div class="card-title">Status Penyelesaian</div><div class="card-sub">Efektivitas penyelesaian pelatihan</div></div>
            <span class="ic-tile sm">${UI.icon('chart-pie')}</span></div>
          <div class="donut-wrap"><canvas id="ch-donut" aria-label="Grafik status penyelesaian"></canvas>
            <div class="donut-center"><b id="donut-pct">0%</b><small>Tingkat Selesai</small></div></div>
          <div class="stat-rows" id="status-rows"></div>
          <div class="row mt-2 small" id="kategori-row"></div>
        </section>
      </div>

      <div class="grid g-main-side">
        <section class="card">
          <div class="card-head"><div><div class="card-title">Laporan Terbaru</div><div class="card-sub">Laporan terkini dari tim pengajar</div></div>
            <a class="link-btn" href="#/laporan">Lihat Semua ${UI.icon('arrow-right')}</a></div>
          <div class="list" id="latest">${'<div class="skel" style="height:64px"></div>'.repeat(3)}</div>
        </section>
        <section class="card">
          <div class="card-head"><div><div class="card-title">Top Alat Berat</div><div class="card-sub">Unit terbanyak dilatih pada periode ini</div></div>
            <span class="ic-tile sm praktik">${UI.icon('wrench')}</span></div>
          <div id="top-alat" class="stack" style="gap:10px"></div>
        </section>
      </div>

      <div class="grid g-2 keep-1">
        <section class="card">
          <div class="card-head"><div><div class="card-title">Peserta per Departemen</div><div class="card-sub">Jumlah peserta terlatih pada periode ini</div></div>
            <span class="ic-tile sm info">${UI.icon('building-2')}</span></div>
          <div class="stack" style="gap:12px" id="per-dept"></div>
        </section>
        <section class="card">
          <div class="card-head"><div><div class="card-title">Laporan per Trainer</div><div class="card-sub">Kontribusi pelaporan tiap instruktur</div></div>
            <span class="ic-tile sm violet">${UI.icon('graduation-cap')}</span></div>
          <div class="stack" style="gap:12px" id="per-trainer"></div>
        </section>
      </div>

      <section class="card target-banner" id="target-banner"></section>
    </div>`;

  const renderHero = () => {
    const target = App.settings.targetHarian || 50;
    const sisa = Math.max(0, target - (App.today.count || 0));
    $('#hero', el).innerHTML = `
      <div class="hero-tile">${UI.icon('user-cog')}<span class="hero-badge">${UI.icon('check')}</span></div>
      <div class="hero-text">
        <h2>${UI.greeting()}, ${UI.esc(u.nama)}! <span class="hero-role">${UI.esc(UI.roleLabel(u.role).toUpperCase())}</span></h2>
        <p>${sisa > 0 ? `Siap laporkan pelatihan hari ini? Ada <b>${sisa} laporan lagi</b> untuk mencapai target harian ${target} laporan tim OTC.`
          : `Luar biasa! Target harian ${target} laporan tim OTC sudah tercapai hari ini.`}</p>
      </div>
      <div class="hero-actions">
        <a class="btn btn-mint" href="#/laporan-baru">${UI.icon('file-plus-2')}+ Buat Laporan Baru</a>
        <a class="btn btn-light" href="#/laporan?mine=1">${UI.icon('folder-check')}Laporan Saya</a>
      </div>`;
    UI.icons($('#hero', el));
  };
  renderHero();

  $$('#f-period button', el).forEach((b) => b.classList.toggle('active', b.dataset.v === st.period));
  const seg = (id, key) => $(id, el).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$(id + ' button', el).forEach((x) => x.classList.toggle('active', x === b));
    st[key] = b.dataset.v;
    if (key === 'period') UI.store.set('tto_period', st.period);
    load();
  });
  seg('#f-period', 'period');
  seg('#f-jenis', 'jenis');
  $('#f-dept', el).addEventListener('change', (e) => { st.dept = e.target.value; load(); });
  if ($('#f-mine', el)) $('#f-mine', el).addEventListener('change', (e) => { st.mine = e.target.checked; load(); });

  async function load() {
    const snap = JSON.stringify(st);
    const dim = setTimeout(() => { $('#kpis', el).style.opacity = '.55'; }, 120);
    const apply = (d) => {
      if (!App.stillOn(hash) || JSON.stringify(st) !== snap) return;
      App.today.count = d.today.count;
      App.renderTarget();
      App.updateBell();
      renderHero();
      render(d);
    };
    let d;
    try {
      d = await API.swr('dashboard', st, apply);
    } catch (e) {
      clearTimeout(dim);
      $('#kpis', el).style.opacity = '';
      UI.error(e);
      return;
    }
    clearTimeout(dim);
    apply(d);
  }

  function delta(v) {
    const down = v < 0;
    return `<span class="kpi-delta ${down ? 'down' : ''}">${UI.icon(down ? 'trending-down' : 'trending-up')}${down ? '' : '+'}${String(v).replace('.', ',')}%</span>`;
  }

  function render(d) {
    const k = d.kpi;
    $('#range-label', el).textContent = `${d.range.label} • ${UI.date(d.range.from)} – ${UI.date(d.range.to)}`;
    const per = { today: 'HARI INI', week: 'MINGGU INI', month: 'BULAN INI', year: 'TAHUN INI' }[d.period];
    const kp = $('#kpis', el);
    kp.style.opacity = '';
    kp.innerHTML = `
      <div class="kpi mint"><div class="kpi-top"><span class="ic-tile white">${UI.icon('clipboard-check')}</span>${delta(k.deltaTotal)}</div>
        <div class="kpi-label">Total Laporan (${per})</div><div class="kpi-value"><span data-count="${k.total}">0</span></div>
        <div class="kpi-foot">Target harian: ${App.settings.targetHarian} laporan</div></div>
      <div class="kpi steel"><div class="kpi-top"><span class="ic-tile white">${UI.icon('users')}</span>${delta(k.deltaPeserta)}</div>
        <div class="kpi-label">Total Peserta Terlatih</div><div class="kpi-value"><span data-count="${k.peserta}">0</span></div>
        <div class="kpi-foot">Operator &amp; teknisi lapangan</div></div>
      <div class="kpi ice"><div class="kpi-top"><span class="ic-tile white">${UI.icon('presentation')}</span><span class="kpi-delta">${k.persenTeori}%</span></div>
        <div class="kpi-label">Pelatihan Teori Kelas</div><div class="kpi-value"><span data-count="${k.teori}">0</span><small>Sesi</small></div>
        <div class="kpi-foot">K3, SOP, regulasi &amp; modul</div></div>
      <div class="kpi lav"><div class="kpi-top"><span class="ic-tile white">${UI.icon('truck')}</span><span class="kpi-delta">${k.persenPraktik}%</span></div>
        <div class="kpi-label">Praktik Lapangan</div><div class="kpi-value"><span data-count="${k.praktik}">0</span><small>Sesi</small></div>
        <div class="kpi-foot">Alat berat &amp; unit tambang</div></div>`;
    UI.icons(kp);
    UI.countUp(kp);

    // Grafik batang (pill) — total + porsi praktik
    const teal = Pages.css('--primary'), amber = '#ff9a3c';
    const hl = d.chart.highlight;
    const ctx = $('#ch-bar', el).getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, '#7fd6fb');
    grad.addColorStop(1, teal);
    const gradHl = ctx.createLinearGradient(0, 0, 0, 260);
    gradHl.addColorStop(0, '#8b4fea');
    gradHl.addColorStop(1, '#4046d6');
    Pages.chart($('#ch-bar', el), {
      type: 'bar',
      data: {
        labels: d.chart.labels,
        datasets: [
          { label: 'Total laporan', data: d.chart.total, backgroundColor: d.chart.labels.map((_, i) => (i === hl ? gradHl : grad)),
            borderRadius: 999, borderSkipped: false, barPercentage: .62, categoryPercentage: .8, grouped: false, order: 2 },
          { label: 'Praktik Lapangan', data: d.chart.praktik, backgroundColor: d.chart.labels.map((_, i) => (i === hl ? 'rgba(255,154,60,.95)' : 'rgba(255,154,60,.6)')),
            borderRadius: 999, borderSkipped: false, barPercentage: .36, categoryPercentage: .8, grouped: false, order: 1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 750, easing: 'easeOutBack' },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1d3247', padding: 10, cornerRadius: 10, displayColors: true,
            callbacks: { afterBody: (items) => { const i = items[0].dataIndex; return `Teori Kelas: ${d.chart.teori[i]}`; } } }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false },
            ticks: { color: (c) => (c.index === hl ? teal : Pages.css('--text-3')), font: (c) => ({ weight: c.index === hl ? '800' : '600' }) } },
          y: { beginAtZero: true, grid: { color: Pages.css('--border') }, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 5 } }
        }
      }
    });
    $('#bar-legend', el).innerHTML = `
      <span><i style="background:${teal}"></i>Teori Kelas (${k.persenTeori}%)</span>
      <span><i style="background:${amber}"></i>Praktik Lapangan (${k.persenPraktik}%)</span>
      <span class="avg">Rata-rata harian: <b>${String(d.rataHarian).replace('.', ',')}</b> laporan</span>`;

    // Donut status
    const ok = Pages.css('--ok'), warn = '#e2a817', bad = Pages.css('--bad');
    const hasData = k.total > 0;
    Pages.chart($('#ch-donut', el), {
      type: 'doughnut',
      data: {
        labels: ['Selesai', 'Dalam Proses', 'Belum Selesai'],
        datasets: [{ data: hasData ? [k.selesai, k.proses, k.belum] : [1], backgroundColor: hasData ? [ok, warn, bad] : [Pages.css('--surface-3')],
          borderWidth: 0, borderRadius: 8, spacing: 3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '74%', animation: { animateRotate: true, duration: 900 },
        plugins: { legend: { display: false }, tooltip: { enabled: hasData } } }
    });
    $('#donut-pct', el).innerHTML = `<span data-count="${k.persenSelesai}">0</span>%`;
    UI.countUp($('#donut-pct', el));
    const pct = (n) => (k.total ? Math.round(n / k.total * 100) : 0);
    $('#status-rows', el).innerHTML = [
      ['Selesai', k.selesai, ok, 'pill-ok'], ['Dalam Proses', k.proses, warn, 'pill-warn'], ['Belum Selesai / Revisi', k.belum, bad, 'pill-bad']
    ].map((r) => `<div class="stat-row"><span class="dot" style="background:${r[2]}"></span><span>${r[0]}</span><b>${UI.num(r[1])}</b><span class="pct pill ${r[3]}">${pct(r[1])}%</span></div>`).join('');
    $('#kategori-row', el).innerHTML = `<span class="muted">Kategori kegiatan:</span><b style="color:var(--primary)">Teori ${k.persenTeori}% · Praktik ${k.persenPraktik}%</b>`;

    // Laporan terbaru
    $('#latest', el).innerHTML = d.latest.length ? d.latest.map(Pages.reportListItem).join('')
      : UI.empty('Belum ada laporan', 'Mulai dengan membuat laporan baru.', 'clipboard');
    UI.icons($('#latest', el));
    Pages.bindListItems($('#latest', el));

    // Top alat berat
    const ta = d.topAlat;
    $('#top-alat', el).innerHTML = ta.length ? `
      <div class="top-hero"><span class="tag">TOP #1 UNIT</span>
        <div class="th-row"><span class="th-ic">${UI.icon('truck')}</span><div><b>${UI.esc(ta[0].nama)}</b><small>${ta[0].persen}% dari sesi praktik</small></div></div>
        <div class="th-foot"><span>Total sesi pada periode ini</span><span><b>${UI.num(ta[0].count)}</b> Sesi</span></div></div>
      ${ta.slice(1).map((t, i) => `<div class="rank-row"><span class="rank">${i + 2}</span><span class="truncate">${UI.esc(t.nama)}</span><b>${UI.num(t.count)} Sesi</b></div>`).join('')}
      ${App.isAdmin() ? `<a class="link-btn center" style="justify-content:center" href="#/master?tab=alat">Lihat Detail Master Alat Berat ${UI.icon('arrow-right')}</a>` : ''}`
      : UI.empty('Belum ada data', 'Belum ada praktik lapangan pada periode ini.', 'truck');
    UI.icons($('#top-alat', el));

    const bars = (list, unit, cls) => list.length ? list.map((x) => {
      const max = list[0].count || 1;
      return `<div class="bar-row"><div class="br-head"><span class="truncate">${UI.esc(x.nama)}</span><b>${UI.num(x.count)} ${unit}</b></div>
        <div class="progress lg ${cls}"><span style="width:${Math.max(4, Math.round(x.count / max * 100))}%"></span></div></div>`;
    }).join('') : UI.empty('Belum ada data', 'Tidak ada laporan pada periode ini.', 'chart-column');
    $('#per-dept', el).innerHTML = bars(d.perDept, 'peserta', 'teal');
    $('#per-trainer', el).innerHTML = bars(d.perTrainer, 'laporan', 'orange');
    UI.icons($('#per-dept', el));
    UI.icons($('#per-trainer', el));

    // Banner target harian
    const t = d.today, p = Math.min(100, Math.round(t.count / t.target * 100));
    $('#target-banner', el).innerHTML = `
      <span class="tb-trophy">${UI.icon('trophy')}</span>
      <div class="tb-body">
        <div class="row-wrap" style="justify-content:space-between"><span style="font-weight:700">Progres Target Hari Ini: <b>${t.count} dari ${t.target} Laporan</b></span><span class="pill pill-teori">${p}%</span></div>
        <div class="progress lg teal mt-1"><span style="width:${p}%"></span></div>
        <p class="small muted mt-1">${t.count >= t.target ? 'Target harian tercapai. Terima kasih atas kerja keras tim!' : `Sisa ${t.target - t.count} laporan lagi untuk mencapai target harian tim.`}</p>
      </div>
      <div class="row-wrap">
        <a class="btn btn-ghost" href="#/laporan?from=${t.tanggal}&to=${t.tanggal}">${UI.icon('calendar-check')}Laporan Hari Ini</a>
        <a class="btn btn-primary" href="#/laporan-baru">${UI.icon('plus')}Input Laporan Sekarang</a>
      </div>`;
    UI.icons($('#target-banner', el));
  }

  await load();
};
