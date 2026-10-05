# AIODMA v19: Pendaftaran Cafe Mandiri

## Tujuan

Pemilik cafe dapat membuat akun dan outlet sendiri melalui `/register`, menetapkan
password pribadi, mengaktifkan MFA, mengisi menu dan meja, serta menerbitkan QR.
Pelanggan tidak memerlukan akun: scan QR meja, pesan, dan bayar melalui metode
yang tersedia. Tidak ada akun demo atau password bersama dalam alur pendaftaran.

## Lingkup MVP

1. Form akun owner: email, password 12-256 karakter, konfirmasi password, nama
   outlet, mata uang BND/IDR, bahasa, zona waktu, jumlah meja 1-99.
2. ID outlet dibuat server; pendaftaran tidak dapat mengklaim outlet yang ada.
3. User, outlet draft, membership owner, meja, dan audit dibuat atomik. Email
   duplikat tidak mengubah akun lama. Password disimpan sebagai salted scrypt.
4. Owner masuk melalui sesi HttpOnly dan wajib MFA sebelum operasional production.
   Kode pemulihan disimpan oleh owner. Email baru belum dianggap terverifikasi.
5. Login akun baru cukup email/password; ID outlet default disimpan server.
   Pemilihan ID outlet tetap tersedia bagi staf dan akun dengan beberapa outlet.
6. Halaman Persiapan menampilkan status profil, menu tersedia, meja aktif, publikasi,
   dan tautan menuju editor yang sudah ada. Draft dipulihkan setelah login ulang.
7. Owner dapat menerbitkan setelah memiliki profil, minimal satu menu tersedia,
   dan meja aktif. Publish memakai version check, CSRF, role check, dan audit.
   Owner dapat menarik publikasi; akses QR dan sesi pelanggan kemudian ditolak.
8. Pemulihan password memakai email, ID outlet, dan kode pemulihan MFA sekali pakai.
   Reset mencabut semua sesi akun. MFA tetap aktif setelah reset password.
9. Form tetap mempertahankan isian nonrahasia saat gagal, menampilkan error yang
   dapat ditindaklanjuti, mencegah double submit, dan mendukung mobile/dark mode.

## Batas Kepercayaan

Email adalah identitas login yang belum diverifikasi. Tidak ada badge atau klaim
verifikasi email. Signup tidak memberikan akses ke tenant lama; undangan tenant
lama tetap memerlukan token. Tidak ada pengiriman email atau reset berbasis email
sampai provider dan domain pengirim dikonfigurasi dan delivery diuji. Ini adalah
dependency eksplisit untuk email verification, bukan hasil yang boleh dipalsukan.

Rate limit persisten membatasi pendaftaran dan recovery. Schema strict menolak role,
tenant ID, status publish, dan field tak dikenal dari pemohon signup. Respons tidak
mengandung password/hash, recovery code, ataupun rahasia provider. Audit tidak
menyimpan password maupun token.

## Kriteria Penerimaan

- Signup valid menghasilkan satu owner, outlet draft, meja, dan sesi.
- Invalid input, duplicate email, concurrent duplicate, cross-origin, serta role
  injection tidak mengubah data atau mengambil alih akun/outlet lain.
- Akun baru dapat login ulang tanpa mengingat ID outlet; password salah ditolak.
- Production MFA tetap wajib; kode pemulihan hanya bisa dipakai satu kali.
- Publish tanpa menu ditolak; publish valid menghasilkan QR yang bisa ditukar
  menjadi sesi pelanggan. Unpublish menutup akses pelanggan.
- Guest/staf tanpa hak dan CSRF salah tidak bisa publish atau membaca persiapan.
- Browser mobile/desktop: signup, error, login, persiapan, navigasi menu/meja,
  publikasi, recovery form, tanpa overflow atau exception.
- Test unit/integrasi/browser, deploy, dan public smoke memiliki bukti nyata.

## Release

Push branch dan deploy production telah diotorisasi pengguna. Catat commit,
deployment, tes dan batasan aktual. Jangan menyatakan seluruh PRD v18/G5 selesai
hanya karena onboarding ini lulus. Live AI, email delivery, load/restore acceptance
tetap dilacak terpisah dalam release-readiness.md.

## Bukti Eksekusi 2026-10-05

Implementasi signup, sesi atomik, MFA, login dengan outlet default, persiapan,
publish/unpublish, QR pelanggan, dan pemulihan lewat kode MFA selesai.
`npm run test:unit`: 62 lulus. `npm run test:integration`: 38 lulus.
Browser onboarding mobile 390 dan desktop 1440 lulus menggunakan MFA production,
login ulang dengan recovery code, dan pengembalian outlet uji ke draft.
Kontrak browser pelanggan mobile dan desktop lulus. Commit `de9457b` sudah di-push
dan dideploy sebagai `dpl_GHwJUVtiTZNndxigHy1M17Yatefn`. CI GitHub lulus. Public
browser smoke pendaftaran/MFA/menu/publikasi/QR/login lulus; outlet uji kembali
draft tanpa pesanan atau pembayaran. Detail dan batasan tercatat di
release-readiness.md. Email delivery/verification dan AI live belum dikonfigurasi.
