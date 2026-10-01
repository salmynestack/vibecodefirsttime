import { Elysia } from "elysia";
import { usersRoute } from "./routes/users-route";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .use(usersRoute)
  .get("/", () => ({ message: "Hello from ElysiaJS + Bun + Drizzle ORM!" }))
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }));

if (import.meta.main) {
  app.listen(port);
  console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}

export type App = typeof app;
