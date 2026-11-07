# 📋 Panduan Instalasi — Task Tracker OTC (v1.3)

## ⬆️ Upgrade ke v1.3 (dari versi sebelumnya)
**Perubahan v1.3:** menu baru **Lapor Superintendent** (khusus Pengawas & Admin, ada di sidebar *Admin Control*; di HP lewat **Profil → Admin Control**).
- Isi laporan: tanggal, kepada (superintendent), lalu daftar trainer berisi **nama trainer, tugas trainer, lokasi pekerjaan, keterangan**, dan catatan pengawas.
- Tombol **Isi Semua Trainer Aktif** menambahkan semua trainer sekaligus. Draf tersimpan otomatis.
- Setelah disimpan, PDF dibuat otomatis (Drive: `Laporan_PDF/Laporan_Pengawas/TAHUN/BULAN`). Tersedia tombol **Unduh PDF** dan **Cetak PDF** (membuka PDF di tab baru, lalu Ctrl + P).
- Laporan bisa diubah atau dihapus oleh pembuatnya atau Admin. Trainer tidak dapat membuka menu ini.

Langkah: ganti `Kode.gs` → *Manage deployments → Edit → New version*, lalu timpa frontend dengan ZIP v1.3 (salin `GAS_URL` lama) & `git push`. Sheet `Laporan_Pengawas` dan `Laporan_Pengawas_Detail` dibuat **otomatis**. Fitur lain tidak berubah.

---

## ⬆️ Upgrade ke v1.2 (dari v1.0 / v1.1)
**Perubahan v1.2:** *No. Request* dipindahkan dari Bagian 1 ke **Data Peserta**. Setiap peserta punya kolom No. Request sendiri, dan nilainya tetap terisi saat menambah peserta berikutnya. Kolom No. Request ini juga ikut ke PDF dan CSV. Di daftar laporan, No. Request tampil sebagai gabungan dari semua peserta. Laporan lama otomatis memakai No. Request laporannya untuk setiap peserta.

Langkah: sama seperti upgrade v1.1 di bawah (ganti `Kode.gs` → *Manage deployments → Edit → New version*, lalu timpa frontend & `git push`). Kolom `No_Request` di sheet `Peserta_Laporan` dibuat otomatis.

---

> **Sudah memasang v1.0? Langsung ke bagian "⬆️ Upgrade dari v1.0 ke v1.1" di bawah.** Data lama aman dan tidak perlu setup ulang.

## ⬆️ Upgrade dari v1.0 ke v1.1

**Yang baru di v1.1:**
- Departemen peserta & pengguna: pilihan **Lainnya (ketik manual)**.
- Kolom **Crew** (A, B, C, STD) dan **Type Kimper** (F, R, M, I, atau ketik manual) per peserta. Keduanya ikut tampil di PDF dan ekspor CSV.
- Hasil peserta: pilihan **Lainnya (ketik manual)**.
- **Logo aplikasi** yang bisa diganti Admin dari menu *Pengaturan & Profil*. Logo tampil di login, sidebar, menu HP, dan kop PDF.
- Tampilan baru bergaya glossy 3D.
- Perpindahan halaman instan: data disimpan sementara di perangkat lalu diperbarui otomatis di latar belakang.

**Langkah upgrade (± 5 menit):**
1. **Backend:** buka proyek Apps Script → `Code.gs` → hapus semua isinya → tempel **`Kode.gs` v1.1** → Ctrl + S.
2. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.** URL `/exec` tetap sama.
3. Kolom baru (`Crew`, `Tipe_Kimper`) dan pengaturan `LOGO_FILE_ID` ditambahkan **otomatis** saat aplikasi pertama kali dipakai. Opsional: jalankan fungsi **`upgradeKeV11`** dari editor untuk melakukannya sekarang.
4. **Frontend:** ekstrak ZIP v1.1, salin nilai `GAS_URL` dari `js/config.js` lama ke `js/config.js` baru, lalu timpa isi folder repository lama Anda dengan isi folder baru. Kemudian:
   ```powershell
   git add .
   git commit -m "Upgrade v1.1"
   git push
   ```
5. Buka situs → tekan **Ctrl + Shift + R**. Admin: buka **Pengaturan & Profil → Logo Aplikasi → Pilih & Unggah Logo**.

---

Panduan ini ditulis untuk pemula. Ikuti urutannya dari atas ke bawah. Total waktu sekitar 30–45 menit.

**Isi paket:**

| Berkas | Untuk apa | Dipasang di |
|---|---|---|
| `Kode.gs` | Backend (server) aplikasi | Google Apps Script |
| `appsscript.json` | Pengaturan zona waktu & akses (opsional) | Google Apps Script |
| `task-tracker-otc-v1.3.zip` | Tampilan aplikasi (frontend) | GitHub Pages |
| `PANDUAN-INSTALASI.md` | Dokumen ini | — |

Urutannya: **A. Backend → B. Isi alamat backend di frontend → C. Upload ke GitHub Pages → D. Uji coba.**

---

## A. Memasang Backend (Google Apps Script)

### A1. Buat proyek Apps Script
1. Buka **https://script.google.com** (masuk dengan akun Google yang akan menjadi pemilik data).
2. Klik **Proyek baru** (New project).
3. Klik judul "Proyek tanpa judul" di kiri atas → ganti menjadi **Task Tracker OTC**.

### A2. Tempel kode backend
1. Di editor terlihat berkas `Code.gs` berisi `function myFunction() {...}`.
2. **Hapus semua isinya**, lalu tempel seluruh isi berkas **`Kode.gs`**.
3. Tekan **Ctrl + S** (simpan).

### A3. Atur zona waktu (WITA)
Pilih **salah satu** cara:
- **Cara mudah:** klik ikon ⚙️ **Project Settings** → bagian *Time zone* → pilih **(GMT+08:00) Makassar**.
- **Cara manifest:** di ⚙️ Project Settings centang **"Show 'appsscript.json' manifest file in editor"** → kembali ke Editor → buka `appsscript.json` → ganti seluruh isinya dengan berkas `appsscript.json` dari paket → simpan.

### A4. Jalankan setup (SEKALI SAJA)
1. Di bagian atas editor, pada daftar fungsi (sebelah tombol ▶ Run), pilih **`setupAppEnvironment`**.
2. Klik **▶ Run**.
3. Muncul jendela izin → **Review permissions** → pilih akun Anda.
4. Jika muncul *"Google hasn't verified this app"*: klik **Advanced** → **Go to Task Tracker OTC (unsafe)** → **Allow**.
   > Ini normal untuk skrip buatan sendiri. Aplikasinya milik Anda sendiri, bukan pihak lain.
5. Tunggu sampai **Execution log** menampilkan **✅ SETUP SELESAI!**
6. **Catat kata sandi admin** yang tampil di log:
   ```
   🔑 AKUN ADMIN PERTAMA
      No. Badge  : ADMIN
      Kata sandi : Otcxxxxxx9
   ```
7. Cek Google Drive Anda: sudah ada folder **📁 Task Tracker OTC** berisi spreadsheet **🗃️ Database — Task Tracker OTC**, folder **Laporan_PDF**, dan **Backup**.

> ⚠️ **Jangan jalankan `setupAppEnvironment` lebih dari sekali.** Jika dijalankan lagi, skrip akan menolak dan tidak membuat duplikat.

### A5. (Opsional) Isi data contoh untuk uji coba
Pilih fungsi **`isiDataContoh`** → ▶ Run. Fungsi ini membuat 3 trainer contoh, 1 pengawas, dan ±60 laporan selama 30 hari terakhir.
Sandi semua akun contoh: **`Trainer123`** (misalnya badge `BDG-4120`).
> Lewati langkah ini jika langsung dipakai untuk data asli. Data contoh bisa dihapus manual dari sheet `Laporan` dan `Peserta_Laporan`.

### A6. Deploy sebagai Web App
1. Klik tombol biru **Deploy** (kanan atas) → **New deployment**.
2. Klik ikon ⚙️ di samping "Select type" → pilih **Web app**.
3. Isi:
   - **Description:** `Versi 1`
   - **Execute as:** **Me** (email Anda)
   - **Who has access:** **Anyone**
4. Klik **Deploy** → salin **Web app URL** yang berakhiran **`/exec`**.
5. **Tes:** buka URL tersebut di browser. Jika benar, tampil teks seperti:
   `{"ok":true,"data":{"app":"Task Tracker OTC","status":"online","setup":true,...}}`

> **Kenapa "Anyone"?** Supaya halaman di GitHub Pages bisa menghubungi backend. Data tetap aman karena setiap aksi wajib login (No. Badge + kata sandi) dan hak akses diperiksa di server.

---

## B. Mengisi Alamat Backend di Frontend

1. Ekstrak **`task-tracker-otc.zip`** (klik kanan → *Extract All…*). Hasilnya folder **`task-tracker-otc`**.
2. Buka folder itu. Isinya harus terlihat seperti ini:
   ```
   task-tracker-otc\
   ├── index.html          ← harus ada di sini (paling luar)
   ├── README.md
   ├── PANDUAN-INSTALASI.md
   ├── css\
   │   └── style.css
   └── js\
       ├── config.js       ← berkas yang diedit
       ├── api.js, ui.js, app.js
       └── pages-*.js
   ```
3. Buka **`js\config.js`** dengan Notepad (klik kanan → Open with → Notepad).
4. Ganti `PASTE_URL_EXEC_DI_SINI` dengan URL `/exec` dari langkah A6:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/AKfycb..../exec',
   ```
   Pastikan tanda kutip `'` di awal dan akhir tetap ada. Simpan (Ctrl + S).

---

## C. Upload ke GitHub Pages

> 💡 Folder yang di-upload adalah **`task-tracker-otc`** (yang berisi `index.html` langsung). **Jangan** folder di atasnya.
> Jika ingin dipandu langkah demi langkah sambil mengirim screenshot terminal, minta saja di chat.

### C1. Pasang Git (sekali saja)
- **Windows:** unduh dari https://git-scm.com/download/win → install dengan pengaturan default.
- **Mac:** buka Terminal, ketik `git --version` → ikuti tawaran instalasi.
- Cek: buka **PowerShell**, ketik `git --version` → muncul versi, misalnya `git version 2.47.0`.

### C2. Buat akun GitHub
Daftar di **https://github.com**. Username akan menjadi bagian alamat situs: `https://USERNAME.github.io/...`

### C3. Atur identitas Git (sekali saja)
```powershell
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### C4. Buat repository di GitHub
1. Di github.com klik **+** (kanan atas) → **New repository**.
2. **Repository name:** `task-tracker-otc`
3. Pilih **Public** (wajib untuk GitHub Pages gratis).
4. **JANGAN** centang *Add a README*, *.gitignore*, atau *license*.
5. Klik **Create repository**. Biarkan halaman ini terbuka.

### C5. Buka terminal di folder yang benar
1. Buka folder **`task-tracker-otc`** di File Explorer (yang berisi `index.html`).
2. Klik address bar di atas, ketik `powershell`, tekan **Enter**.
3. Cek isi folder:
   ```powershell
   dir
   ```
   ✅ Harus terlihat `index.html`, folder `css`, dan folder `js`.
   ❌ Jika yang terlihat folder lain (misalnya `task-tracker-otc` lagi), masuk dulu: `cd task-tracker-otc`, lalu `dir` lagi.

### C6. Kirim ke GitHub (jalankan satu per satu)
```powershell
git init
git add .
git commit -m "Upload pertama Task Tracker OTC"
git branch -M main
git remote add origin https://github.com/USERNAME/task-tracker-otc.git
git push -u origin main
```
- Perhatikan **titik** di akhir `git add .`
- Ganti `USERNAME` dengan username GitHub Anda.
- Saat `git push` diminta **Password**: masukkan **Personal Access Token**, bukan sandi akun (lihat C7). Saat mengetik/menempel token, layar tampak kosong — **itu normal**.
- Berhasil jika muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### C7. Membuat Personal Access Token (jika diminta)
1. Buka https://github.com/settings/tokens → **Generate new token** → **Generate new token (classic)**.
2. **Note:** `task-tracker` • **Expiration:** 90 days • centang **repo**.
3. **Generate token** → salin token `ghp_...` (hanya tampil sekali, simpan di Notepad).
4. Jalankan lagi `git push -u origin main`, tempel token sebagai password (klik kanan untuk paste di PowerShell).

### C8. Aktifkan GitHub Pages
1. Di halaman repository → **Settings** → menu kiri **Pages**.
2. **Source:** *Deploy from a branch* • **Branch:** `main` / `(root)` → **Save**.
3. Centang **Enforce HTTPS**.
4. Tunggu 1–2 menit, refresh. Muncul: **"Your site is live at https://USERNAME.github.io/task-tracker-otc/"**.

### C9. Cara memperbarui frontend nanti
Setelah mengubah berkas di folder `task-tracker-otc`:
```powershell
git add .
git commit -m "Perbarui tampilan"
git push
```
Jika halaman masih versi lama, tekan **Ctrl + Shift + R**.

---

## D. Uji Coba Pertama

1. Buka alamat situs GitHub Pages Anda.
2. Masuk dengan **No. Badge: `ADMIN`** dan kata sandi dari langkah A4.
3. Buka **Pengaturan & Profil** → ganti kata sandi admin.
4. **Data Master:** sesuaikan daftar pelatihan, alat berat, departemen, dan lokasi OTC Anda.
5. **Kelola Pengguna:** tambahkan akun trainer dan pengawas. Isi **No. WhatsApp** pengawas agar muncul sebagai tujuan kirim laporan.
6. Keluar, lalu masuk sebagai trainer → **Laporan Baru** → isi → **Pratinjau** → **Konfirmasi & Kirim**.
7. **Unduh PDF** → **Kirim ke WhatsApp Pengawas** (lampirkan PDF yang sudah diunduh, atau gunakan tombol **Bagikan** di HP).
8. Cek Google Drive: PDF tersimpan di `Laporan_PDF/2026/11-November/`.

**Tips HP:** buka situs di Chrome HP → menu ⋮ → **Add to Home screen** agar tampil seperti aplikasi.

---

## E. Memperbarui Backend (jika `Kode.gs` diubah)

Agar URL `/exec` **tidak berubah**:
**Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
> Jangan memakai "New deployment" untuk pembaruan, karena URL-nya akan berubah dan `config.js` harus diedit lagi.

---

## F. Pengaturan yang Bisa Diubah (tanpa koding)

Buka spreadsheet **🗃️ Database — Task Tracker OTC** → sheet **AppConfig**:

| key | Fungsi |
|---|---|
| `TARGET_HARIAN` | Target laporan tim per hari (bawaan 50) |
| `ORGANISASI` | Judul kop laporan PDF |
| `LOGO_FILE_ID` | Diisi otomatis saat Admin mengunggah logo (jangan diubah manual) |
| `SUB_ORGANISASI` | Sub-judul kop laporan PDF |

> ⚠️ Jangan mengubah nama sheet atau judul kolom (baris 1) di sheet lain. Hindari mengedit data langsung di sheet kecuali benar-benar perlu.

---

## G. Mengatasi Masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| Login menampilkan "URL backend belum diisi" | `GAS_URL` di `js/config.js` masih kosong | Isi URL `/exec` (langkah B), lalu `git add .` → `commit` → `push` |
| "Respons server tidak valid" / "Tidak dapat terhubung" | Akses deploy bukan *Anyone*, atau URL salah | Cek A6: *Execute as: Me*, *Who has access: Anyone*. URL harus berakhiran `/exec` |
| "Backend belum di-setup" | `setupAppEnvironment` belum dijalankan | Jalankan langkah A4 |
| Perubahan backend tidak berlaku | Deployment belum diperbarui | Langkah E (New version) |
| "Terlalu banyak percobaan gagal" | 5x salah sandi | Tunggu 15 menit, atau Admin melakukan *Reset sandi* di Kelola Pengguna |
| Lupa sandi admin | — | Di editor Apps Script jalankan **`buatSandiAdminBaru`**, lihat sandi baru di Execution log |
| Laporan tersimpan tapi PDF gagal | Gangguan sementara Google Drive | Buka detail laporan → **Buat Ulang PDF** |
| Situs GitHub Pages 404 | `index.html` tidak berada di root repository | Pastikan push dari folder yang berisi `index.html` (langkah C5) |
| Tampilan polos tanpa warna | Folder `css/` dan `js/` tidak ikut / struktur rata | Upload lewat terminal (bukan "Upload files" di web GitHub) agar folder terjaga |
| Ikon/grafik tidak muncul | Internet memblokir CDN jsdelivr | Coba jaringan lain; fitur lain tetap berjalan |
| `Password authentication is not supported` | GitHub butuh token | Langkah C7 |

---

## H. Catatan Keamanan

- Kata sandi disimpan sebagai hash SHA-256 + salt + pepper (tidak bisa dibaca siapa pun, termasuk admin).
- ID spreadsheet/folder dan kunci rahasia disimpan di **Script Properties**, bukan di kode atau frontend.
- Sesi login berlaku 8 jam. Admin/pengawas yang menonaktifkan akun langsung mengakhiri sesinya.
- Semua aksi penting tercatat di sheet **Log_Aktivitas** (append-only).
- Cadangan spreadsheet dibuat otomatis tiap **Minggu pukul 23.00** ke folder **Backup**.
