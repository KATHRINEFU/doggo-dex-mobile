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

// TEMPORARY DIAGNOSTIC: every authenticated call from the app is coming back
// 401 while a server-minted token for the same instance succeeds. Log why the
// token was rejected — whether it arrived at all, and what it claims — without
// ever logging the token itself. Remove once the cause is fixed.
app.use("/api", (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    req.log?.warn({ url: req.url?.split("?")[0] }, "AUTHDEBUG no authorization header");
    return next();
  }
  const token = header.replace(/^Bearer\s+/i, "");
  let claims: Record<string, unknown> = {};
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    );
    const now = Math.floor(Date.now() / 1000);
    claims = {
      iss: payload.iss,
      azp: payload.azp,
      sub: payload.sub,
      iat: payload.iat,
      exp: payload.exp,
      secondsUntilExpiry: typeof payload.exp === "number" ? payload.exp - now : null,
      issuedSecondsAgo: typeof payload.iat === "number" ? now - payload.iat : null,
      serverNow: now,
    };
  } catch (err) {
    claims = { decodeError: String(err), tokenLength: token.length };
  }
  const state = (req as any).auth;
  const resolved = typeof state === "function" ? state() : state;
  req.log?.warn(
    {
      url: req.url?.split("?")[0],
      claims,
      userId: resolved?.userId ?? null,
      reason: resolved?.reason ?? null,
      message: resolved?.message ?? null,
    },
    "AUTHDEBUG token seen",
  );
  next();
});

app.use("/api", router);

export default app;
