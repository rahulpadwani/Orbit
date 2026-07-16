import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??=
  "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";
process.env.CLERK_SECRET_KEY ??= "sk_test_dummy";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("serves the Clerk authentication boundary", async () => {
  const response = await render();
  assert.ok(
    response.status === 200 || response.status === 307,
    `unexpected authentication response ${response.status}`,
  );

  if (response.status === 200) {
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, /<title>Orbit — A living task board<\/title>/i);
    assert.match(html, /Give every task/);
    assert.match(html, /Create free account/);
    assert.match(html, /I already have an account/);
    assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
  } else {
    assert.ok(response.headers.get("location"));
  }
});

test("keeps the requested product capabilities in the source", async () => {
  const [board, gateway, page, proxy, api, schema, field, dialog, styles, packageJson] = await Promise.all([
    readFile(new URL("../app/TaskBoard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AuthGateway.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/tasks/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/BubbleField.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TaskDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(board, /localStorage/);
  assert.match(board, /user\.id/);
  assert.match(board, /\/api\/tasks/);
  assert.match(board, /needsMigration/);
  assert.match(board, /completedAt/);
  assert.match(gateway, /SignInButton/);
  assert.match(gateway, /SignUpButton/);
  assert.match(page, /when="signed-in"/);
  assert.match(page, /when="signed-out"/);
  assert.match(proxy, /clerkMiddleware/);
  assert.match(api, /await auth\(\)/);
  assert.match(api, /eq\(tasks\.userId, userId\)/);
  assert.match(schema, /primaryKey\(\{ columns: \[table\.userId, table\.id\] \}\)/);
  assert.match(schema, /initializedAt/);
  assert.match(field, /requestAnimationFrame/);
  assert.match(field, /distance < minimum/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /Mark complete/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /data-theme="dark"/);
  assert.match(packageJson, /"framer-motion"/);
  assert.match(packageJson, /"@clerk\/nextjs"/);
  assert.match(packageJson, /"@neondatabase\/serverless"/);
});
