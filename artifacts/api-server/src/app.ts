import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";
import healthRouter from "./routes/health";

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

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// The deployment platform probes this route without user authentication.
// It must run before Clerk middleware so the API can report readiness even
// when production Clerk configuration is unavailable during startup.
app.use("/api", healthRouter);

// External Clerk instance: keys come straight from CLERK_PUBLISHABLE_KEY /
// CLERK_SECRET_KEY env vars — no host-based key rewriting or FAPI proxying.
app.use(clerkMiddleware());

app.use("/api", router);

export default app;
