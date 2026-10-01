# Issue: Implementasi API Login User dan Tabel Sessions

## 1. Deskripsi Singkat
Fitur ini bertujuan untuk mengautentikasi pengguna yang sudah terdaftar melalui endpoint login (`POST /api/users/login`). Jika kredensial valid, sistem akan membuat sesi baru di database tabel `sessions` dengan token berupa UUID dan mengembalikannya ke client.

Dokumen ini disusun sebagai panduan teknis implementasi langkah demi langkah (*step-by-step*) yang dapat langsung dieksekusi oleh **Junior Programmer** atau **AI Model**.

---

## 2. Struktur Proyek & Konvensi File

Ikuti struktur folder dan arsitektur yang sudah ada:
```text
src/
├── db/
│   ├── index.ts          # Koneksi Drizzle ORM
│   └── schema.ts         # Definisi skema tabel database
├── routes/
│   └── users-route.ts    # Handler routing ElysiaJS
├── services/
│   └── users-service.ts  # Business logic & interaksi database
└── index.ts              # Entry point aplikasi
```

**Aturan Penamaan & Konvensi:**
- **Routes**: Terletak di folder `src/routes/` dengan format penamaan `*-route.ts` (contoh: `users-route.ts`).
- **Services**: Terletak di folder `src/services/` dengan format penamaan `*-service.ts` (contoh: `users-service.ts`).
- **Runtime & Hashing**: Menggunakan runtime **Bun** bawaan (`Bun.password.verify` untuk verifikasi bcrypt dan `crypto.randomUUID()` untuk pembuatan UUID token).

---

## 3. Spesifikasi Database: Tabel `sessions`

### A. Lokasi File
Edit file: `src/db/schema.ts`

### B. Struktur Kolom Tabel `sessions`
Tambahkan tabel `sessions` ke `src/db/schema.ts` dengan kolom berikut:

| Kolom | Tipe Data Drizzle | PostgreSQL Type | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `serial("id")` | `SERIAL PRIMARY KEY` | Auto-increment ID |
| `token` | `varchar("token", { length: 255 })` | `VARCHAR(255) NOT NULL` | UUID string token session login |
| `user_id` | `integer("user_id")` | `INTEGER NOT NULL REFERENCES users(id)` | Foreign Key ke tabel `users(id)` |
| `password` | `varchar("password", { length: 255 })` | `VARCHAR(255) NOT NULL` | Hash password user (bcrypt) |
| `created_at` | `timestamp("created_at")` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | Waktu session dibuat (`defaultNow().notNull()`) |

### C. Referensi Kode Drizzle Schema
Tambahkan import `integer` dan `varchar` dari `drizzle-orm/pg-core` di `src/db/schema.ts`:
```typescript
import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Tabel users (sudah ada)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabel sessions (tambahkan ini)
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
```

---

## 4. Spesifikasi API Endpoint

### Endpoint Detail
- **Method**: `POST`
- **URL**: `/api/users/login`
- **Content-Type**: `application/json`

### Request Body
```json
{
  "name": "denis",
  "email": "denis@localhost",
  "password": "jagoo"
}
```

*Catatan Validasi Elysia Schema (`t.Object`):*
```typescript
body: t.Object({
  name: t.Optional(t.String()), // atau t.String() sesuai payload
  email: t.String({ format: "email" }),
  password: t.String(),
})
```

### Response Body

#### 1. Berhasil (Status Code: `200 OK`)
```json
{
  "data": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
*(Nilai `data` adalah string token UUID yang dibuat saat login berhasil)*

#### 2. Gagal (Status Code: `400 Bad Request` / `401 Unauthorized`)
Jika email tidak ditemukan ATAU password tidak cocok:
```json
{
  "error": "email atau password salah"
}
```

---

## 5. Tahapan Langkah Demi Langkah (Step-by-Step Implementation)

### Langkah 1: Update Schema Database
1. Buka [src/db/schema.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/db/schema.ts).
2. Tambahkan definisi tabel `sessions` beserta type export `Session` dan `NewSession`.

### Langkah 2: Generate & Jalankan Migrasi Database
Buka terminal dan jalankan perintah:
```bash
bun run db:generate
bun run db:migrate
```
*Pastikan tidak ada error dan file migrasi baru terbuat di folder `drizzle/`.*

### Langkah 3: Implementasikan Service Login
1. Buka [src/services/users-service.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/services/users-service.ts).
2. Import `sessions` dari `../db/schema`.
3. Buat dan export fungsi `loginUserService(payload: { name?: string; email: string; password: string })`:
   - **Query User**: Cari user di tabel `users` berdasarkan `email` (`eq(users.email, email)`).
   - **Validasi User**: Jika user tidak ditemukan (`existingUser.length === 0`), `throw new Error("email atau password salah")`.
   - **Verifikasi Password**: Gunakan `await Bun.password.verify(password, user.password)`.
   - **Validasi Password**: Jika hasil verifikasi `false`, `throw new Error("email atau password salah")`.
   - **Generate Token**: Buat UUID menggunakan `crypto.randomUUID()`.
   - **Simpan Session**: Lakukan insert ke tabel `sessions`:
     ```typescript
     await db.insert(sessions).values({
       token,
       userId: user.id,
       password: user.password, // atau hashedPassword yang ada di user
     });
     ```
   - **Return**: Kembalikan `{ data: token }`.

### Langkah 4: Daftarkan Route Login di ElysiaJS
1. Buka [src/routes/users-route.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/routes/users-route.ts).
2. Import `loginUserService` dari `../services/users-service`.
3. Tambahkan rute `POST /api/users/login` dengan validasi body:
   ```typescript
   .post("/api/users/login", async ({ body, set }) => {
     try {
       const response = await loginUserService(body);
       set.status = 200;
       return response;
     } catch (error: any) {
       set.status = 400;
       return { error: error.message };
     }
   }, {
     body: t.Object({
       name: t.Optional(t.String()),
       email: t.String(),
       password: t.String(),
     })
   })
   ```

### Langkah 5: Pengujian (Testing & Validation)
Jalankan dev server:
```bash
bun run dev
```

Lakukan pengetesan menggunakan `curl` atau REST Client:

#### Test Case 1: Login Berhasil
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"name": "denis", "email": "denis@localhost", "password": "jagoo"}'
```
**Expected Output:**
HTTP Status `200`
```json
{
  "data": "<token-uuid>"
}
```

#### Test Case 2: Login Gagal (Email tidak terdaftar atau password salah)
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"name": "denis", "email": "denis@localhost", "password": "passwordsalah"}'
```
**Expected Output:**
HTTP Status `400`
```json
{
  "error": "email atau password salah"
}
```

---

## 6. Definition of Done (Checklist Kriteria Selesai)
- [ ] Tabel `sessions` sudah didefinisikan di `src/db/schema.ts`.
- [ ] Perintah `bun run db:generate` dan `bun run db:migrate` berhasil dijalankan tanpa error.
- [ ] Fungsi `loginUserService` telah dibuat di `src/services/users-service.ts` dengan pengecekan bcrypt dan penyimpanan ke tabel `sessions`.
- [ ] Route `POST /api/users/login` aktif di `src/routes/users-route.ts`.
- [ ] Respon sukses mengembalikan status `200` dengan `{ "data": "<token>" }`.
- [ ] Respon gagal mengembalikan status `400` dengan `{ "error": "email atau password salah" }`.
