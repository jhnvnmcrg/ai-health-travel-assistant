import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

const app = defineApp();

// Per-user send throttling. The hand-rolled window scan this replaces counted
// recent rows inside the mutation, which races under concurrency and loses
// quota whenever a mutation rolls back.
app.use(rateLimiter);

export default app;
