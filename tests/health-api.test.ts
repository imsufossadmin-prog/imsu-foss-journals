import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("Health check API route has dynamic config and cache-control headers", () => {
  const routePath = join(process.cwd(), "app/api/health/route.ts");
  const routeContent = readFileSync(routePath, "utf8");

  assert.match(
    routeContent,
    /export const dynamic = ["']force-dynamic["']/,
    "Health route must be force-dynamic",
  );
  assert.match(
    routeContent,
    /prisma\.journal\.findFirst/,
    "Health route must execute a live database query",
  );
  assert.match(
    routeContent,
    /Cache-Control/,
    "Health route must set Cache-Control headers to bypass caching",
  );
  assert.match(
    routeContent,
    /no-store/,
    "Health route must include no-store in Cache-Control",
  );
});

test("Keep-alive GitHub Actions workflow is properly configured", () => {
  const workflowPath = join(process.cwd(), ".github/workflows/keep-alive.yml");
  const workflowContent = readFileSync(workflowPath, "utf8");

  assert.match(
    workflowContent,
    /0 \*\/6 \* \* \*/,
    "Workflow must be scheduled every 6 hours via cron",
  );
  assert.match(
    workflowContent,
    /workflow_dispatch:/,
    "Workflow must support manual trigger",
  );
  assert.match(
    workflowContent,
    /\/api\/health/,
    "Workflow must target the /api/health endpoint",
  );
  assert.match(
    workflowContent,
    /HTTP_STATUS/,
    "Workflow must verify HTTP status code 200",
  );
});
