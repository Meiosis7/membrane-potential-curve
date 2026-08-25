import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function projectFile(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("browser regression suite runs separately against the production export", async () => {
  const packageJson = JSON.parse(await projectFile("package.json"));
  const browserSuite = await projectFile("tests/browser-regression.browser.mjs");

  assert.equal(
    packageJson.scripts["test:browser"],
    "node --test tests/browser-regression.browser.mjs",
  );
  assert.match(browserSuite, /\bout\b/);
  assert.match(browserSuite, /WebSocket/);
  assert.match(browserSuite, /CHROME_PATH/);
});

test("Pages deployment gates artifact upload on browser regression", async () => {
  const workflow = await projectFile(".github/workflows/pages.yml");
  const buildIndex = workflow.indexOf("npm run build");
  const browserIndex = workflow.indexOf("npm run test:browser");
  const uploadIndex = workflow.indexOf("actions/upload-pages-artifact");

  assert.ok(buildIndex >= 0, "workflow must build the production export");
  assert.ok(browserIndex > buildIndex, "browser regression must run after the build");
  assert.ok(uploadIndex > browserIndex, "artifact upload must wait for browser regression");
});

test("lint ignores local isolated worktrees", async () => {
  const packageJson = JSON.parse(await projectFile("package.json"));

  assert.match(packageJson.scripts.lint, /--ignore-pattern \.worktrees\b/);
});
