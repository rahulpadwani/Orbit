import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("server-renders the Orbit task board", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Orbit — A living task board<\/title>/i);
  assert.match(html, /Make space for what matters/);
  assert.match(html, /Add a task/);
  assert.match(html, /Your task orbit/);
  assert.match(html, /Switch to dark mode/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the requested product capabilities in the source", async () => {
  const [board, field, dialog, styles, packageJson] = await Promise.all([
    readFile(new URL("../app/TaskBoard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/BubbleField.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TaskDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(board, /localStorage/);
  assert.match(board, /completedAt/);
  assert.match(field, /requestAnimationFrame/);
  assert.match(field, /distance < minimum/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /Mark complete/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /data-theme="dark"/);
  assert.match(packageJson, /"framer-motion"/);
});
