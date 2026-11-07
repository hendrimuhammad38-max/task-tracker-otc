# Task Tracker OTC — v1.3

Aplikasi web untuk laporan penyelesaian pelatihan trainer OTC — dari **teori kelas** sampai **praktik lapangan** alat berat.

- **Frontend:** HTML/CSS/JavaScript murni (folder ini), di-host di GitHub Pages.
- **Backend:** Google Apps Script sebagai REST API (berkas `Kode.gs`, terpisah dari repository ini).
- **Database:** Google Sheets • **Arsip PDF:** Google Drive.

## Fitur
- Login No. Badge + kata sandi, hak akses Trainer / Pengawas / Admin.
- Form laporan bertahap (pelatihan, peserta, status) dengan draf otomatis.
- Pratinjau dokumen, PDF A4 otomatis, unduh & kirim ke WhatsApp pengawas.
- Dashboard teori vs praktik: KPI, grafik periode, status, top alat berat, per departemen & trainer.
- Daftar laporan dengan pencarian, 7 filter, urutkan, ekspor CSV.
- Kelola pengguna, data master, log aktivitas & audit, profil & ganti sandi.
- Peserta: departemen/hasil/Type Kimper bisa diketik manual, kolom Crew (A/B/C/STD).
- Logo aplikasi dapat diganti Admin.
- Laporan Pengawas ke Superintendent (nama, tugas, lokasi, keterangan trainer) → PDF siap cetak.
- Responsif HP (bottom navigation, bottom sheet), mode gelap, cache instan antar halaman.

## Struktur
```
index.html            Kerangka aplikasi (SPA)
css/style.css         Gaya visual
js/config.js          ⚙️ URL backend (GAS_URL) — WAJIB diisi
js/api.js             Komunikasi fetch ke Apps Script
js/ui.js              Komponen UI (toast, modal, format)
js/app.js             Login, layout, router
js/pages-*.js         Halaman-halaman aplikasi
```

Panduan lengkap: **PANDUAN-INSTALASI.md**.
