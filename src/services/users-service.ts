import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { sessions, users } from "../db/schema";

export const registerUserService = async (payload: any) => {
  const { name, email, password } = payload;

  // Cek duplikasi email
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    throw new Error("email sudah terdaftar,silahkan gunakan email lain");
  }

  // Hash password
  const hashedPassword = await Bun.password.hash(password, { algorithm: "bcrypt" });

  // Simpan ke DB
  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  });

  return { data: "OK" };
};

export const loginUserService = async (payload: { name?: string; email: string; password: string }) => {
  const { email, password } = payload;

  // Cari user berdasarkan email
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = existingUser[0];
  if (!user) {
    throw new Error("email atau password salah");
  }

  // Verifikasi hash password
  const isPasswordValid = await Bun.password.verify(password, user.password);
  if (!isPasswordValid) {
    throw new Error("email atau password salah");
  }

  // Generate UUID token
  const token = crypto.randomUUID();

  // Simpan token ke sesi
  await db.insert(sessions).values({
    token,
    userId: user.id,
    password: user.password,
  });

  return { data: token };
};
