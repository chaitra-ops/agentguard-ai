import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: error }, "Request failed");
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  const statusCode =
    error instanceof Error && error.name === "ZodError"
      ? 400
      : message === "Memory not found." || message === "Interaction not found."
        ? 404
        : 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "AgentGuard could not complete that request." : message,
  });
});

export default app;
