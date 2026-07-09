import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("desktop entry loads the built local renderer instead of a Vite server", () => {
  const main = readFileSync(join(root, "electron/main.cjs"), "utf8");

  assert.match(main, /loadFile\(/);
  assert.doesNotMatch(main, /loadURL\("http:\/\/127\.0\.0\.1:5173"\)/);
});

test("npm scripts expose desktop app execution, not web preview deployment", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  assert.equal(pkg.scripts.start, "npm run build && electron .");
  assert.equal(pkg.scripts.desktop, "npm run start");
  assert.equal(pkg.scripts.dev, undefined);
  assert.equal(pkg.scripts.preview, undefined);
});
