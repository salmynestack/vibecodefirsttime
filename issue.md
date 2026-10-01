# Bug: Panjang Kolom 'name' Tidak Dibatasi (Menerima > 255 Karakter) pada Registrasi User

## 1. Deskripsi Bug
Pada saat melakukan pendaftaran pengguna baru melalui endpoint `POST /api/users`, sistem saat ini mengizinkan nilai `name` dengan panjang berlebih (misalnya 300 karakter atau lebih) tanpa ada penolakan dari sistem validasi API maupun penolakan dari skema database.

Sesuai spesifikasi awal rancangan aplikasi, kolom `name` seharusnya memiliki batasan maksimal **255 karakter** (`VARCHAR(255)`).

Dokumen ini disusun sebagai panduan teknis langkah demi langkah (*step-by-step*) bagi **Junior Programmer** atau **AI Model** untuk mereproduksi dan memperbaiki bug ini.

---

## 2. Analisis Akar Masalah (Root Cause Analysis)

Bug ini terjadi pada 2 lapisan (*layer*):

1. **Lapisan Validasi API (`src/routes/users-route.ts`)**:
   Skema body Elysia saat ini hanya menggunakan `t.String()`:
   ```typescript
   body: t.Object({
     name: t.String(), // Tidak ada batasan minLength maupun maxLength
     email: t.String(),
     password: t.String(),
   })
   ```
   Karena tidak ada parameter `maxLength: 255`, Elysia menganggap string 300 karakter sebagai data yang valid dan meloloskannya ke *service layer*.

2. **Lapisan Database (`src/db/schema.ts`)**:
   Kolom `name` pada tabel `users` saat ini didefinisikan menggunakan tipe `text`:
   ```typescript
   name: text("name").notNull()
   ```
   Di PostgreSQL, tipe data `text` bersifat dinamis dan dapat menampung teks tanpa batasan 255 karakter (hingga 1 GB), sehingga database juga tidak menolak string 300 karakter tersebut.

---

## 3. Perilaku yang Diharapkan (Expected Behavior)
- Jika client mengirimkan request `POST /api/users` dengan panjang `name` **lebih dari 255 karakter**, server harus langsung menolak request sebelum dieksekusi ke database dengan:
  - **HTTP Status Code**: `422 Unprocessable Entity` (bawaan Elysia TypeBox validator)
- Jika client mengirimkan `name` string kosong (`""`), server harus menolak dengan HTTP Status `422`.
- Jika panjang `name` antara **1 sampai 255 karakter**, request diproses secara normal.
- Tabel database `users` harus secara konsisten menggunakan tipe kolom `varchar(255)`.

---

## 4. Panduan Perbaikan Langkah demi Langkah (Step-by-Step Fix)

### Langkah 1: Tambahkan Validasi Panjang Karakter di Elysia Route
1. Buka file [src/routes/users-route.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/routes/users-route.ts).
2. Temukan skema validasi `body` pada endpoint `POST /api/users`.
3. Tambahkan aturan `{ minLength: 1, maxLength: 255 }` pada properti `name`:

```typescript
// SEBELUM:
body: t.Object({
  name: t.String(),
  email: t.String(),
  password: t.String(),
})

// SESUDAH:
body: t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  email: t.String({ format: "email", maxLength: 255 }),
  password: t.String({ minLength: 1 }),
})
```

*(Opsional: Terapkan juga validasi `maxLength: 255` pada field `name` di rute `POST /api/users/login` jika field tersebut disertakan)*.

---

### Langkah 2: Perbarui Definisi Skema Database di Drizzle ORM
1. Buka file [src/db/schema.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/db/schema.ts).
2. Ubah kolom `name` pada tabel `users` dari `text("name")` menjadi `varchar("name", { length: 255 })`:

```typescript
// Pastikan varchar sudah di-import dari "drizzle-orm/pg-core"
import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // <- Ubah baris ini
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

### Langkah 3: Generate dan Jalankan Migrasi Database
Buka terminal di root direktori proyek `vibecode`, lalu jalankan:
```bash
bun run db:generate
bun run db:migrate
```
*Pastikan file migrasi baru (misal: `0003_xxx.sql`) terbuat di folder `drizzle/` dengan isi `ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(255);`.*

---

### Langkah 4: Pengujian & Validasi Perbaikan (Testing)

Jalankan server aplikasi:
```bash
bun run dev
```

Lakukan pengetesan dengan 3 skenario berikut menggunakan `curl` atau REST Client:

#### Skenario A: Uji String 300 Karakter (Harus Ditolak)
Kirimkan request dengan nama panjang 300 karakter:
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "email": "denis_panjang@localhost",
    "password": "jagoo"
  }'
```
**Hasil yang Diharapkan:**
- **HTTP Status Code**: `422 Unprocessable Entity`
- Request langsung ditolak di layer routing Elysia tanpa query database.

---

#### Skenario B: Uji String Kosong (Harus Ditolak)
Kirimkan request dengan nama kosong:
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "email": "denis_kosong@localhost",
    "password": "jagoo"
  }'
```
**Hasil yang Diharapkan:**
- **HTTP Status Code**: `422 Unprocessable Entity`

---

#### Skenario C: Uji String Valid <= 255 Karakter (Harus Diterima)
Kirimkan request dengan nama valid (misal: "denis"):
```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "denis",
    "email": "denis_valid@localhost",
    "password": "jagoo"
  }'
```
**Hasil yang Diharapkan:**
- **HTTP Status Code**: `201 Created`
- **Response Body**:
  ```json
  {
    "data": "OK"
  }
  ```

---

## 5. Definition of Done (Checklist Kriteria Selesai)
- [ ] Validasi `name: t.String({ minLength: 1, maxLength: 255 })` ditambahkan pada `POST /api/users` di [src/routes/users-route.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/routes/users-route.ts).
- [ ] Kolom `name` di [src/db/schema.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/db/schema.ts) diubah menjadi `varchar("name", { length: 255 }).notNull()`.
- [ ] File migrasi database berhasil digenerate via `bun run db:generate`.
- [ ] Request dengan nama 300 karakter menghasilkan status `422 Unprocessable Entity`.
- [ ] Request dengan nama kosong `""` menghasilkan status `422 Unprocessable Entity`.
- [ ] Request dengan nama valid (1-255 karakter) tetap berhasil diproses.
