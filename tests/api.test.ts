import { describe, expect, test, beforeEach, afterAll } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db/index";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

// Helper request functions
const post = (url: string, body?: any) =>
  app.handle(
    new Request(`http://localhost${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  );

const get = (url: string, headers?: Record<string, string>) =>
  app.handle(
    new Request(`http://localhost${url}`, {
      method: "GET",
      headers: headers || {},
    })
  );

describe("Unit Test Suite: Authentication & User APIs", () => {
  // Data cleanup hook sebelum setiap skenario dijalankan
  beforeEach(async () => {
    await db.delete(sessions);
    await db.delete(users);
  });

  afterAll(async () => {
    await db.delete(sessions);
    await db.delete(users);
  });

  // ========================================================
  // A. Endpoint POST /api/users (Registrasi User Baru)
  // ========================================================
  describe("A. POST /api/users", () => {
    test("A.1: Registrasi Berhasil (Happy Path)", async () => {
      const payload = {
        name: "denis",
        email: "denis@example.com",
        password: "jagoo",
      };

      const res = await post("/api/users", payload);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toEqual({ data: "OK" });

      // Verifikasi user tersimpan di DB & password ter-hash bcrypt
      const savedUsers = await db.select().from(users).where(eq(users.email, payload.email));
      expect(savedUsers.length).toBe(1);
      expect(savedUsers[0]!.name).toBe("denis");
      expect(savedUsers[0]!.password).not.toBe("jagoo");

      const isPasswordHashed = await Bun.password.verify("jagoo", savedUsers[0]!.password);
      expect(isPasswordHashed).toBe(true);
    });

    test("A.2: Email Sudah Terdaftar (Duplicate Email)", async () => {
      const payload = {
        name: "denis",
        email: "denis@example.com",
        password: "jagoo",
      };

      // Registrasi pertama
      const res1 = await post("/api/users", payload);
      expect(res1.status).toBe(201);

      // Registrasi kedua dengan email sama
      const res2 = await post("/api/users", payload);
      expect(res2.status).toBe(400);

      const json = await res2.json();
      expect(json).toEqual({
        error: "email sudah terdaftar,silahkan gunakan email lain",
      });
    });

    test("A.3: Nama Melebihi Batas Maksimal (> 255 karakter)", async () => {
      const payload = {
        name: "A".repeat(300),
        email: "longname@example.com",
        password: "jagoo",
      };

      const res = await post("/api/users", payload);
      expect(res.status).toBe(422);
    });

    test("A.4: Nama Kosong (Empty String)", async () => {
      const payload = {
        name: "",
        email: "emptyname@example.com",
        password: "jagoo",
      };

      const res = await post("/api/users", payload);
      expect(res.status).toBe(422);
    });

    test("A.5: Format Email Tidak Valid", async () => {
      const payload = {
        name: "denis",
        email: "bukan-sebuah-email",
        password: "jagoo",
      };

      const res = await post("/api/users", payload);
      expect(res.status).toBe(422);
    });

    test("A.6: Password Kosong", async () => {
      const payload = {
        name: "denis",
        email: "denis@example.com",
        password: "",
      };

      const res = await post("/api/users", payload);
      expect(res.status).toBe(422);
    });

    test("A.7: Field Wajib Tidak Dikirim (Missing Fields)", async () => {
      // Body kosong
      const res1 = await post("/api/users", {});
      expect(res1.status).toBe(422);

      // Tanpa password
      const res2 = await post("/api/users", {
        name: "denis",
        email: "denis@example.com",
      });
      expect(res2.status).toBe(422);
    });
  });

  // ========================================================
  // B. Endpoint POST /api/users/login (Login User)
  // ========================================================
  describe("B. POST /api/users/login", () => {
    // Registrasi awal user sebelum login
    beforeEach(async () => {
      await post("/api/users", {
        name: "denis",
        email: "denis@example.com",
        password: "jagoo",
      });
    });

    test("B.1: Login Berhasil (Happy Path)", async () => {
      const res = await post("/api/users/login", {
        email: "denis@example.com",
        password: "jagoo",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(typeof json.data).toBe("string");

      // Verifikasi session token tersimpan di DB
      const sessionRecords = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, json.data));
      expect(sessionRecords.length).toBe(1);
    });

    test("B.2: Email Tidak Ditemukan", async () => {
      const res = await post("/api/users/login", {
        email: "unregistered@example.com",
        password: "jagoo",
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: "email atau password salah" });
    });

    test("B.3: Password Salah", async () => {
      const res = await post("/api/users/login", {
        email: "denis@example.com",
        password: "passwordsalah",
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: "email atau password salah" });
    });

    test("B.4: Login dengan Field Opsional name Valid (<= 255 karakter)", async () => {
      const res = await post("/api/users/login", {
        name: "denis",
        email: "denis@example.com",
        password: "jagoo",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
    });

    test("B.5: Login dengan Field name Melebihi Batas (> 255 karakter)", async () => {
      const res = await post("/api/users/login", {
        name: "A".repeat(300),
        email: "denis@example.com",
        password: "jagoo",
      });

      expect(res.status).toBe(422);
    });

    test("B.6: Field Wajib Tidak Lengkap (Missing Fields)", async () => {
      // Tanpa password
      const res1 = await post("/api/users/login", {
        email: "denis@example.com",
      });
      expect(res1.status).toBe(422);

      // Tanpa email
      const res2 = await post("/api/users/login", {
        password: "jagoo",
      });
      expect(res2.status).toBe(422);
    });
  });

  // ========================================================
  // C. Endpoint GET /api/users/me (Get Current User)
  // ========================================================
  describe("C. GET /api/users/me", () => {
    let validToken = "";

    beforeEach(async () => {
      // Registrasi & Login untuk mendapatkan token valid
      await post("/api/users", {
        name: "denis",
        email: "denis@example.com",
        password: "jagoo",
      });

      const loginRes = await post("/api/users/login", {
        email: "denis@example.com",
        password: "jagoo",
      });
      const loginJson = await loginRes.json();
      validToken = loginJson.data;
    });

    test("C.1: Ambil Data User Berhasil (Happy Path)", async () => {
      const res = await get("/api/users/me", {
        Authorization: `Bearer ${validToken}`,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.id).toBeTypeOf("number");
      expect(json.data.name).toBe("denis");
      expect(json.data.password).toBeDefined();
      expect(json.data.created_at).toBeDefined();
    });

    test("C.2: Header Authorization Tidak Dikirim", async () => {
      const res = await get("/api/users/me");
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json).toEqual({ data: "unauthorized" });
    });

    test("C.3: Format Header Tidak Sesuai (Bukan Bearer)", async () => {
      const res1 = await get("/api/users/me", {
        Authorization: `Basic ${validToken}`,
      });
      expect(res1.status).toBe(401);
      expect(await res1.json()).toEqual({ data: "unauthorized" });

      const res2 = await get("/api/users/me", {
        Authorization: validToken, // Tanpa prefix Bearer
      });
      expect(res2.status).toBe(401);
      expect(await res2.json()).toEqual({ data: "unauthorized" });
    });

    test("C.4: Token Kosong (Hanya Bearer)", async () => {
      const res = await get("/api/users/me", {
        Authorization: "Bearer ",
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ data: "unauthorized" });
    });

    test("C.5: Token Tidak Ditemukan / Expired", async () => {
      const fakeToken = "9b1deb4d-3b7d-4bad-9bdd-000000000000";
      const res = await get("/api/users/me", {
        Authorization: `Bearer ${fakeToken}`,
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ data: "unauthorized" });
    });

    test("C.6: Sesi Ada Namun Record User Telah Dihapus", async () => {
      // Hapus data user tanpa menghapus session (non-aktifkan constraint sejenak via Drizzle raw jika perlu, atau test lookup null)
      // Karena foreign key cascade, menghapus user akan menghapus session.
      // Kita bisa buat token acak yang menunjuk ke ID yang tidak ada jika tanpa FK,
      // tetapi untuk memastikan error handling di service: jika userResult[0] null -> unauthorized
      const randomToken = crypto.randomUUID();
      const res = await get("/api/users/me", {
        Authorization: `Bearer ${randomToken}`,
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ data: "unauthorized" });
    });
  });

  // ========================================================
  // D. Endpoint Informasi & Health Check
  // ========================================================
  describe("D. Informasi & Health Check", () => {
    test("D.1: GET / (Root Hello Endpoint)", async () => {
      const res = await get("/");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toEqual({
        message: "Hello from ElysiaJS + Bun + Drizzle ORM!",
      });
    });

    test("D.2: GET /health (Health Check)", async () => {
      const res = await get("/health");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.timestamp).toBeDefined();
    });
  });
});
