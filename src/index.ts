import { Elysia } from "elysia";

const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .get("/", () => ({ message: "Hello from ElysiaJS + Bun + Drizzle ORM!" }))
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .listen(port);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
