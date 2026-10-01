# Issue: Implementasi API Get Current User Berdasarkan Token Sesi (Authorization: Bearer <token>)

## 1. Deskripsi Singkat
Fitur ini bertujuan untuk mengambil data profil pengguna (*current user*) yang sedang login melalui endpoint `GET /api/users/me`. Pengguna mengirimkan token autentikasi melalui header HTTP `Authorization: Bearer <token>`. Sistem akan memvalidasi token tersebut ke dalam tabel `sessions` dan mengembalikan data pengguna dari tabel `users`.

Dokumen ini disusun sebagai panduan teknis implementasi langkah demi langkah (*step-by-step*) yang dapat langsung dieksekusi oleh **Junior Programmer** atau **AI Model**.

---

## 2. Struktur Proyek & Konvensi File

Ikuti struktur folder dan arsitektur yang sudah ada:
```text
src/
├── db/
│   ├── index.ts          # Koneksi Drizzle ORM
│   └── schema.ts         # Definisi skema tabel database (users & sessions)
├── routes/
│   └── users-route.ts    # Handler routing ElysiaJS
├── services/
│   └── users-service.ts  # Business logic & interaksi database
└── index.ts              # Entry point aplikasi
```

**Aturan Penamaan & Konvensi:**
- **Routes**: Terletak di folder `src/routes/` dengan format penamaan `*-route.ts` (contoh: `users-route.ts`).
- **Services**: Terletak di folder `src/services/` dengan format penamaan `*-service.ts` (contoh: `users-service.ts`).
- **Header Parsing**: Mengambil token dari header `Authorization: Bearer <token>` (case-insensitive).

---

## 3. Spesifikasi Database

### Status Skema Tabel
Tabel `users` dan `sessions` **sudah didefinisikan** pada implementasi sebelumnya di [src/db/schema.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/db/schema.ts).

Pastikan struktur tabel `sessions` tetap seperti berikut:
| Kolom | Tipe Data Drizzle | PostgreSQL Type | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `serial("id")` | `SERIAL PRIMARY KEY` | Auto-increment ID |
| `token` | `varchar("token", { length: 255 })` | `VARCHAR(255) NOT NULL` | UUID string token session |
| `user_id` | `integer("user_id")` | `INTEGER NOT NULL REFERENCES users(id)` | Foreign Key ke tabel `users(id)` |
| `password` | `varchar("password", { length: 255 })` | `VARCHAR(255) NOT NULL` | Hash password user (bcrypt) |
| `created_at` | `timestamp("created_at")` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | Waktu session dibuat (`defaultNow().notNull()`) |

*(Jika tabel `sessions` belum ada di database lokal Anda, jalankan `bun run db:generate && bun run db:migrate`)*.

---

## 4. Spesifikasi API Endpoint

### Endpoint Detail
- **Method**: `GET`
- **URL**: `/api/users/me`
- **Headers**:
  ```http
  Authorization: Bearer <token>
  ```
  *(di mana `<token>` adalah token UUID aktif yang diperoleh saat login dan tersimpan pada tabel `sessions`)*

---

### Response Body

#### 1. Berhasil (Status Code: `200 OK`)
Jika token ditemukan di tabel `sessions` dan terhubung ke user yang valid:
```json
{
  "data": {
    "id": 1,
    "name": "denis",
    "password": "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890",
    "created_at": "2026-10-01T12:00:00.000Z"
  }
}
```

#### 2. Gagal / Unauthorized (Status Code: `401 Unauthorized`)
Jika header `Authorization` tidak dikirim, format bukan `Bearer <token>`, atau token tidak terdaftar / tidak valid:
```json
{
  "data": "unauthorized"
}
```

---

## 5. Tahapan Langkah Demi Langkah (Step-by-Step Implementation)

### Langkah 1: Verifikasi Skema Database
1. Buka [src/db/schema.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/db/schema.ts).
2. Pastikan tabel `users` dan `sessions` beserta type inference-nya sudah ter-export:
   ```typescript
   export type User = typeof users.$inferSelect;
   export type Session = typeof sessions.$inferSelect;
   ```

### Langkah 2: Implementasikan Service `getCurrentUserService`
1. Buka [src/services/users-service.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/services/users-service.ts).
2. Tambahkan dan export fungsi `getCurrentUserService(token: string)`:
   - **Query Session**: Cari record di tabel `sessions` yang memiliki `token` sama persis:
     ```typescript
     const sessionResult = await db
       .select()
       .from(sessions)
       .where(eq(sessions.token, token))
       .limit(1);

     const session = sessionResult[0];
     if (!session) {
       throw new Error("unauthorized");
     }
     ```
   - **Query User**: Cari record di tabel `users` berdasarkan `session.userId`:
     ```typescript
     const userResult = await db
       .select()
       .from(users)
       .where(eq(users.id, session.userId))
       .limit(1);

     const user = userResult[0];
     if (!user) {
       throw new Error("unauthorized");
     }
     ```
   - **Format Return**: Kembalikan data user sesuai format yang diminta:
     ```typescript
     return {
       data: {
         id: user.id,
         name: user.name,
         password: user.password,
         created_at: user.createdAt,
       },
     };
     ```

### Langkah 3: Tambahkan Route Handler di `src/routes/users-route.ts`
1. Buka [src/routes/users-route.ts](file:///c:/Users/SALMIN%20BISYIR/vibecode/src/routes/users-route.ts).
2. Import fungsi `getCurrentUserService` dari `../services/users-service`.
3. Tambahkan endpoint `GET /api/users/me`:
   ```typescript
   .get("/api/users/me", async ({ headers, set }) => {
     try {
       const authHeader = headers["authorization"] || headers["Authorization"];
       if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
         set.status = 401;
         return { data: "unauthorized" };
       }

       const token = authHeader.substring(7).trim();
       if (!token) {
         set.status = 401;
         return { data: "unauthorized" };
       }

       const response = await getCurrentUserService(token);
       set.status = 200;
       return response;
     } catch (error: any) {
       set.status = 401;
       return { data: "unauthorized" };
     }
   })
   ```

### Langkah 4: Pengujian & Validasi (Testing)
Jalankan dev server dengan Bun:
```bash
bun run dev
```

Lakukan pengetesan dengan skenario berikut:

#### Skenario 1: Akses Tanpa Header Authorization (Harus Gagal)
```bash
curl -X GET http://localhost:3000/api/users/me
```
**Expected Output (HTTP 401):**
```json
{
  "data": "unauthorized"
}
```

#### Skenario 2: Akses dengan Token Tidak Valid (Harus Gagal)
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer token-ngawur-12345"
```
**Expected Output (HTTP 401):**
```json
{
  "data": "unauthorized"
}
```

#### Skenario 3: Login dan Akses dengan Token Valid (Harus Sukses)
1. Lakukan login terlebih dahulu:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"email": "denis@localhost", "password": "jagoo"}'
   ```
   *(Salin nilai token UUID dari respons `{"data": "<token-uuid>"}`)*

2. Panggil endpoint get current user menggunakan token tersebut:
   ```bash
   curl -X GET http://localhost:3000/api/users/me \
     -H "Authorization: Bearer <token-uuid>"
   ```
**Expected Output (HTTP 200):**
```json
{
  "data": {
    "id": 1,
    "name": "denis",
    "password": "$2a$10$...",
    "created_at": "2026-10-01T..."
  }
}
```

---

## 6. Definition of Done (Checklist Kriteria Selesai)
- [ ] Fungsi `getCurrentUserService(token)` dibuat di `src/services/users-service.ts`.
- [ ] Token dicocokkan ke tabel `sessions` dan dihubungkan ke record di tabel `users`.
- [ ] Endpoint `GET /api/users/me` terdaftar di `src/routes/users-route.ts`.
- [ ] Pengecekan header `Authorization: Bearer <token>` berfungsi dengan baik.
- [ ] Request tanpa token atau token invalid merespons dengan HTTP Status `401` dan body `{ "data": "unauthorized" }`.
- [ ] Request dengan token valid merespons dengan HTTP Status `200` dan body berisi objek user `{ "data": { "id", "name", "password", "created_at" } }`.
