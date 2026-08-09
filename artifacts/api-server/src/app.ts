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

// Diagnostic for rejected credentials: when a request carries a token that
// Clerk will not accept, record why — did the header arrive, had the token
// expired, which session and instance issued it. The token itself is never
// logged. Requests that authenticate successfully log nothing.
app.use("/api", (req, _res, next) => {
  const state = (req as any).auth;
  const resolvedAuth = typeof state === "function" ? state() : state;
  if (resolvedAuth?.userId) return next();

  const header = req.headers.authorization;
  if (!header) return next(); // Anonymous request to a public route.

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
  req.log?.warn(
    {
      url: req.url?.split("?")[0],
      claims,
      reason: resolvedAuth?.reason ?? null,
      message: resolvedAuth?.message ?? null,
    },
    "Token present but not accepted",
  );
  next();
});

app.use("/api", router);

export default app;
