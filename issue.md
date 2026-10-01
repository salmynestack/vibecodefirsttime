# Issue: Perencanaan Unit Test Menyeluruh Menggunakan Bun Test

## 1. Deskripsi Singkat
Dokumen ini memuat perencanaan pembuatan rangkaian pengujian unit (*unit test suite*) untuk seluruh endpoint API yang tersedia pada aplikasi. Pengujian akan dijalankan menggunakan test runner bawaan Bun (`bun test`) dan diletakkan pada folder `tests/`.

Tujuan utama dokumen ini adalah memberikan panduan daftar skenario pengujian yang harus diuji (*test scenario catalog*) tanpa memberikan implementasi kode secara berlebihan, agar dapat diimplementasikan secara fleksibel oleh **Junior Programmer** atau **Model AI pelaksana**.

---

## 2. Ketentuan Umum & Environment Testing

1. **Test Runner**:
   - Gunakan test runner resmi dari Bun:
     ```bash
     bun test
     ```
2. **Lokasi File**:
   - Seluruh berkas pengujian disimpan di direktori `tests/` (misal: `tests/users.test.ts` atau `tests/app.test.ts`).
3. **Pembersihan Data (Data Isolation)**:
   - **Wajib**: Setiap sebelum atau sesudah menjalankan skenario pengujian (*hook* `beforeEach` / `afterEach`), bersihkan data di tabel `sessions` terlebih dahulu, kemudian tabel `users` untuk menjaga integritas relasi foreign key dan konsistensi status database.
4. **Metode Pemanggilan API**:
   - Pengujian dapat memanfaatkan instance `app.handle(new Request(...))` dari ElysiaJS atau melalui HTTP request langsung ke server lokal saat berjalan.

---

## 3. Daftar Skenario Pengujian (Test Scenarios)

### A. Endpoint `POST /api/users` (Registrasi User Baru)

| No | Nama Skenario | Kondisi / Input | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| **A.1** | Registrasi Berhasil (*Happy Path*) | Payload valid (`name`: 1-255 karakter, `email` valid & baru, `password` valid). | HTTP `201`, body: `{ "data": "OK" }`, password tersimpan dalam bentuk hash di database. |
| **A.2** | Email Sudah Terdaftar (*Duplicate Email*) | Mendaftarkan user dengan email yang sudah ada di database. | HTTP `400`, body: `{ "error": "email sudah terdaftar,silahkan gunakan email lain" }`. |
| **A.3** | Nama Melebihi Batas Maksimal | Payload dengan panjang string `name` > 255 karakter (misal: 300 karakter). | HTTP `422 Unprocessable Entity`. |
| **A.4** | Nama Kosong | Payload dengan `name` berupa string kosong `""`. | HTTP `422 Unprocessable Entity`. |
| **A.5** | Format Email Tidak Valid | Payload dengan format email tidak standar (misal: `"bukan-email"`). | HTTP `422 Unprocessable Entity`. |
| **A.6** | Password Kosong | Payload dengan `password` berupa string kosong `""`. | HTTP `422 Unprocessable Entity`. |
| **A.7** | Field Wajib Tidak Dikirim (*Missing Fields*) | Body kosong `{}` atau salah satu field wajib tidak disertakan. | HTTP `422 Unprocessable Entity`. |

---

### B. Endpoint `POST /api/users/login` (Login User)

| No | Nama Skenario | Kondisi / Input | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| **B.1** | Login Berhasil (*Happy Path*) | Email dan password cocok dengan user terdaftar. | HTTP `200`, body: `{ "data": "<token-uuid>" }`, record sesi baru tersimpan di tabel `sessions`. |
| **B.2** | Email Tidak Ditemukan | Email belum terdaftar di database. | HTTP `400`, body: `{ "error": "email atau password salah" }`. |
| **B.3** | Password Salah | Email terdaftar, tetapi password tidak sesuai. | HTTP `400`, body: `{ "error": "email atau password salah" }`. |
| **B.4** | Login dengan Field Opsional `name` Valid | Mengirimkan field `name` (1-255 karakter) bersama kredensial valid. | HTTP `200`, body: `{ "data": "<token-uuid>" }`. |
| **B.5** | Login dengan Field `name` Melebihi Batas | Mengirimkan field `name` > 255 karakter. | HTTP `422 Unprocessable Entity`. |
| **B.6** | Field Wajib Tidak Lengkap | Body tanpa `email` atau tanpa `password`. | HTTP `422 Unprocessable Entity`. |

---

### C. Endpoint `GET /api/users/me` (Get Current User)

| No | Nama Skenario | Kondisi / Input | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| **C.1** | Ambil Data User Berhasil (*Happy Path*) | Header `Authorization: Bearer <valid_token>` milik user yang aktif. | HTTP `200`, body: `{ "data": { "id", "name", "password", "created_at" } }`. |
| **C.2** | Header Authorization Tidak Dikirim | Request GET tanpa menyertakan header `Authorization`. | HTTP `401 Unauthorized`, body: `{ "data": "unauthorized" }`. |
| **C.3** | Format Header Tidak Sesuai | Header tanpa kata kunci `Bearer ` (misal: `"Basic ..."` atau token langsung). | HTTP `401 Unauthorized`, body: `{ "data": "unauthorized" }`. |
| **C.4** | Token Kosong | Header bernilai `"Bearer "` tanpa ada token UUID setelahnya. | HTTP `401 Unauthorized`, body: `{ "data": "unauthorized" }`. |
| **C.5** | Token Tidak Ditemukan (*Invalid / Expired*) | Header menyertakan token acak yang tidak ada di tabel `sessions`. | HTTP `401 Unauthorized`, body: `{ "data": "unauthorized" }`. |
| **C.6** | Sesi Ada Namun User Telah Dihapus (*Orphan Session*) | Sesi valid ada di database, namun record user di tabel `users` tidak ditemukan. | HTTP `401 Unauthorized`, body: `{ "data": "unauthorized" }`. |

---

### D. Endpoint Informasi & Health Check

| No | Endpoint | Kondisi / Input | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| **D.1** | `GET /` | Request standar tanpa autentikasi. | HTTP `200`, body memuat salam awal aplikasi. |
| **D.2** | `GET /health` | Request health check server. | HTTP `200`, body memuat `{ "status": "ok", "timestamp": "..." }`. |

---

## 4. Alur Kerja Implementor (Junior Programmer / AI Pelaksana)

1. **Setup File**:
   - Buat folder `tests/` jika belum ada.
   - Buat berkas tes, misalnya `tests/users.test.ts`.
2. **Setup Database Hook**:
   - Gunakan `beforeEach` / `afterEach` dari `bun:test` untuk membersihkan tabel `sessions` dan `users` secara konsisten sebelum setiap kasus uji berjalan.
3. **Eksekusi Kasus Uji**:
   - Tulis kode pengujian untuk setiap skenario yang tertera pada tabel di atas.
4. **Verifikasi Jalannya Tes**:
   - Jalankan perintah:
     ```bash
     bun test
     ```
   - Pastikan seluruh pengujian menghasilkan tanda centang hijau (*passed*) tanpa kegagalan (*0 failures*).

---

## 5. Definition of Done (Checklist Kriteria Selesai)
- [x] Berkas tes tersedia di dalam folder `tests/`.
- [x] Database hook pembersihan data terpasang pada setiap skenario uji.
- [x] Seluruh skenario registrasi (A.1 – A.7) telah teruji.
- [x] Seluruh skenario login (B.1 – B.6) telah teruji.
- [x] Seluruh skenario get current user (C.1 – C.6) telah teruji.
- [x] Seluruh skenario health check (D.1 – D.2) telah teruji.
- [x] Perintah `bun test` berhasil dieksekusi dengan status 100% lulus.
