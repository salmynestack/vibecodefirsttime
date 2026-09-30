import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users } from "../db/schema";

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
