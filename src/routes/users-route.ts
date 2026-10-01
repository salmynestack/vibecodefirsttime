import { Elysia, t } from "elysia";
import {
  getCurrentUserService,
  loginUserService,
  registerUserService,
} from "../services/users-service";

export const usersRoute = new Elysia()
  .post("/api/users", async ({ body, set }) => {
    try {
      const response = await registerUserService(body);
      set.status = 201;
      return response;
    } catch (error: any) {
      set.status = 400;
      return { error: error.message };
    }
  }, {
    body: t.Object({
      name: t.String(),
      email: t.String(),
      password: t.String(),
    })
  })
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
  });
