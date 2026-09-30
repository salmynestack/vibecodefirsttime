import { Elysia, t } from "elysia";
import { registerUserService } from "../services/users-service";

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
  });
