import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

import { nextStableEmptyCount, parseProfileProcessIds } from "./browser-processes.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const EXPORT_ROOT = join(PROJECT_ROOT, "out");
const POLL_INTERVAL_MS = 50;
const DEFAULT_TIMEOUT_MS = 8_000;

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function within(promise, milliseconds, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, rejectTimeout) => {
        timer = setTimeout(() => rejectTimeout(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function poll(check, message, timeout = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  let lastError;
  let lastValue;

  while (Date.now() < deadline) {
    try {
      lastValue = await check();
      if (lastValue) return lastValue;
    } catch (error) {
      lastError = error;
    }
    await delay(POLL_INTERVAL_MS);
  }

  const detail = lastError instanceof Error
    ? ` Last error: ${lastError.message}`
    : lastValue === undefined
      ? ""
      : ` Last value: ${JSON.stringify(lastValue)}`;
  throw new Error(`${message}.${detail}`);
}

async function isExecutable(path) {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  if (process.env.CHROME_PATH) {
    if (await isExecutable(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
    throw new Error(
      `CHROME_PATH does not point to an executable Chrome binary: ${process.env.CHROME_PATH}`,
    );
  }

  const pathCandidates = (process.env.PATH ?? "")
    .split(":")
    .flatMap((directory) => ["google-chrome", "chromium", "chromium-browser"]
      .map((name) => join(directory, name)));
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/opt/google/chrome/chrome",
    ...pathCandidates,
  ];

  for (const candidate of new Set(candidates)) {
    if (await isExecutable(candidate)) return candidate;
  }

  throw new Error(
    "Chrome was not found. Install Google Chrome/Chromium or set CHROME_PATH to its executable before running npm run test:browser.",
  );
}

async function profileProcessIds(userDataDirectory) {
  const processList = spawn("ps", ["-Ao", "pid=,command="], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  processList.stdout.setEncoding("utf8");
  processList.stderr.setEncoding("utf8");
  processList.stdout.on("data", (chunk) => { stdout += chunk; });
  processList.stderr.on("data", (chunk) => { stderr += chunk; });
  const exitCode = await within(
    new Promise((resolveExit, rejectExit) => {
      processList.once("error", rejectExit);
      processList.once("exit", resolveExit);
    }),
    2_000,
    "ps did not return while checking Chrome cleanup",
  );
  if (exitCode !== 0) throw new Error(`ps failed while checking Chrome cleanup: ${stderr}`);
  return parseProfileProcessIds(stdout, userDataDirectory);
}

function signalProcess(processId, signal) {
  try {
    process.kill(processId, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

async function stopProcess(processHandle, userDataDirectory) {
  const processGroupId = processHandle?.pid;
  const signalGroup = (signal) => {
    if (!Number.isInteger(processGroupId)) return;
    try {
      process.kill(-processGroupId, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  const signalAll = async (signal) => {
    signalGroup(signal);
    for (const processId of await profileProcessIds(userDataDirectory)) {
      signalProcess(processId, signal);
    }
  };
  const profileIsGone = () => {
    let emptyChecks = 0;
    return poll(async () => {
      const processIds = await profileProcessIds(userDataDirectory);
      emptyChecks = nextStableEmptyCount(emptyChecks, processIds);
      return emptyChecks >= 10;
    }, "Chrome processes still reference the temporary profile", 3_000);
  };

  await signalAll("SIGTERM");
  const stopped = await profileIsGone().then(() => true, () => false);
  if (stopped) return;
  await signalAll("SIGKILL");
  await profileIsGone();
}

async function startStaticServer() {
  const indexHtmlPath = join(EXPORT_ROOT, "index.html");
  await stat(indexHtmlPath).catch(() => {
    throw new Error(`Production export not found at ${indexHtmlPath}. Run npm run build first.`);
  });
  const indexHtml = await readFile(indexHtmlPath, "utf8");
  const basePath = indexHtml.includes('"/membrane-potential-curve/_next/')
    ? "/membrane-potential-curve"
    : "";

  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
        pathname = pathname.slice(basePath.length) || "/";
      }
      if (pathname === "/favicon.ico") pathname = "/favicon.svg";
      const relativePath = pathname.endsWith("/")
        ? `${pathname.slice(1)}index.html`
        : pathname.slice(1);
      let filePath = resolve(EXPORT_ROOT, relativePath || "index.html");
      if (filePath !== EXPORT_ROOT && !filePath.startsWith(`${EXPORT_ROOT}${sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const fileStats = await stat(filePath);
      if (fileStats.isDirectory()) filePath = join(filePath, "index.html");
      const body = await readFile(filePath);
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": CONTENT_TYPES.get(extname(filePath)) ?? "application/octet-stream",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string", "static server must bind a TCP port");

  return {
    basePath,
    origin: `http://127.0.0.1:${address.port}`,
    async close() {
      const closing = new Promise((resolveClose, rejectClose) => {
        server.close((error) => error ? rejectClose(error) : resolveClose());
      });
      server.closeAllConnections?.();
      await within(closing, 2_000, "static server did not close within 2 seconds");
    },
  };
}

class CdpConnection {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.eventListeners = new Set();
    this.socket = new WebSocket(webSocketUrl);
  }

  async connect() {
    await new Promise((resolveOpen, rejectOpen) => {
      this.socket.addEventListener("open", resolveOpen, { once: true });
      this.socket.addEventListener("error", () => rejectOpen(new Error("CDP WebSocket failed to open")), { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const listener of this.eventListeners) listener(message);
    });
    this.socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error(`CDP connection closed while waiting for ${pending.method}`));
      }
      this.pending.clear();
    });
  }

  onEvent(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  command(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolveCommand, rejectCommand) => {
      this.pending.set(id, { method, resolve: resolveCommand, reject: rejectCommand });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  close() {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
  }

}

class BrowserFixture {
  static async start() {
    const chromePath = await findChrome();
    const userDataDirectory = await mkdtemp(join(tmpdir(), "membrane-browser-regression-"));
    let staticServer;
    let chrome;

    try {
      staticServer = await startStaticServer();
      const chromeArguments = [
        "--headless=new",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-features=Translate,MediaRouter",
        "--disable-gpu",
        "--no-first-run",
        "--no-sandbox",
        "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=0",
        `--user-data-dir=${userDataDirectory}`,
        "about:blank",
      ];
      chrome = spawn(chromePath, chromeArguments, {
        detached: true,
        stdio: ["ignore", "ignore", "pipe"],
      });
      let chromeStderr = "";
      let chromeSpawnError;
      chrome.once("error", (error) => { chromeSpawnError = error; });
      chrome.stderr.setEncoding("utf8");
      chrome.stderr.on("data", (chunk) => {
        chromeStderr = `${chromeStderr}${chunk}`.slice(-8_000);
      });
      const devToolsPortFile = join(userDataDirectory, "DevToolsActivePort");
      const devTools = await poll(async () => {
        if (chromeSpawnError) throw new Error(`Chrome failed to start: ${chromeSpawnError.message}`);
        if (chrome.exitCode !== null) {
          throw new Error(`Chrome exited with code ${chrome.exitCode}: ${chromeStderr}`);
        }
        const contents = await readFile(devToolsPortFile, "utf8");
        const [port, browserPath] = contents.trim().split("\n");
        return port && browserPath ? { port, browserPath } : false;
      }, "Chrome did not expose its DevTools endpoint", 15_000);
      const connection = new CdpConnection(
        `ws://127.0.0.1:${devTools.port}${devTools.browserPath}`,
      );
      await connection.connect();
      const { targetId } = await connection.command("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await connection.command("Target.attachToTarget", {
        targetId,
        flatten: true,
      });
      const fixture = new BrowserFixture({
        chrome,
        chromePath,
        connection,
        sessionId,
        staticServer,
        userDataDirectory,
      });
      await fixture.enableDomains();
      return fixture;
    } catch (error) {
      await stopProcess(chrome, userDataDirectory);
      await rm(userDataDirectory, { force: true, recursive: true });
      await staticServer?.close();
      throw error;
    }
  }

  constructor({ chrome, chromePath, connection, sessionId, staticServer, userDataDirectory }) {
    this.chrome = chrome;
    this.chromePath = chromePath;
    this.connection = connection;
    this.sessionId = sessionId;
    this.staticServer = staticServer;
    this.userDataDirectory = userDataDirectory;
    this.consoleDiagnostics = [];
    this.navigationSequence = 0;
  }

  async enableDomains() {
    this.connection.onEvent((message) => {
      if (message.sessionId !== this.sessionId) return;
      if (message.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(message.params.type)) {
        const text = message.params.args.map((argument) => argument.value ?? argument.description ?? "").join(" ");
        this.consoleDiagnostics.push(`console.${message.params.type}: ${text}`);
      }
      if (message.method === "Runtime.exceptionThrown") {
        this.consoleDiagnostics.push(`uncaught exception: ${message.params.exceptionDetails.text}`);
      }
      if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) {
        const source = message.params.entry.url ? ` (${message.params.entry.url})` : "";
        this.consoleDiagnostics.push(`${message.params.entry.level}: ${message.params.entry.text}${source}`);
      }
    });
    await Promise.all([
      this.command("Log.enable"),
      this.command("Page.enable"),
      this.command("Runtime.enable"),
    ]);
  }

  command(method, params = {}) {
    return this.connection.command(method, params, this.sessionId);
  }

  async evaluate(expression) {
    const response = await this.command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      const description = response.exceptionDetails.exception?.description
        ?? response.exceptionDetails.text;
      throw new Error(`Browser evaluation failed: ${description}`);
    }
    return response.result.value;
  }

  async setViewport(width, height) {
    await this.command("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  routeUrl(route) {
    return `${this.staticServer.origin}${this.staticServer.basePath}${route}`;
  }

  async navigate(route, width, height) {
    await this.setViewport(width, height);
    const separator = route.includes("?") ? "&" : "?";
    const navigationRoute = `${route}${separator}browser-regression=${++this.navigationSequence}`;
    const expectedUrl = this.routeUrl(navigationRoute);
    const navigation = await this.command("Page.navigate", { url: expectedUrl });
    assert.ok(!navigation.errorText, `navigation to ${expectedUrl} failed: ${navigation.errorText}`);
    await this.waitFor(
      `(() => {
        if (location.href !== ${JSON.stringify(expectedUrl)} || document.readyState !== "complete") return false;
        const reset = document.querySelector('.membrane-reset');
        const canvas = document.querySelector('canvas[aria-label="在曲线上拖动时间"]');
        const reactProps = (element) => {
          const key = element && Object.keys(element).find((name) => name.startsWith('__reactProps$'));
          return key ? element[key] : null;
        };
        return typeof reactProps(reset)?.onClick === 'function'
          && typeof reactProps(canvas)?.onPointerDown === 'function'
          && typeof reactProps(canvas)?.onPointerMove === 'function';
      })()`,
      `${route} did not hydrate at ${width}x${height}`,
      15_000,
    );
  }

  async waitFor(expression, message, timeout = DEFAULT_TIMEOUT_MS) {
    try {
      return await poll(() => this.evaluate(expression), message, timeout);
    } catch (error) {
      let browserState = "unavailable";
      try {
        browserState = JSON.stringify(await this.evaluate(`(() => ({
          url: location.href,
          readyState: document.readyState,
          stage: document.querySelector('[aria-label="当前阶段"]')?.textContent,
          voltage: document.querySelector('[aria-label="当前膜电位"]')?.textContent,
          time: document.querySelector('canvas[aria-label="在曲线上拖动时间"]')?.getAttribute('aria-valuenow'),
          valueText: document.querySelector('canvas[aria-label="在曲线上拖动时间"]')?.getAttribute('aria-valuetext'),
          scene: document.querySelector('.membrane-scene')?.className,
          pressedStages: [...document.querySelectorAll('.membrane-stage-nav button')]
            .map((button, index) => button.getAttribute('aria-pressed') === 'true' ? index + 1 : null)
            .filter(Boolean),
        }))()`));
      } catch (diagnosticError) {
        browserState = `unavailable (${diagnosticError.message})`;
      }
      throw new Error(`${error.message} Browser state: ${browserState}`);
    }
  }

  async elementCenter(selector, index = 0) {
    const result = await this.evaluate(`(() => {
      const element = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
      if (!element) return { error: "missing element" };
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") {
        return { error: "element is not visibly clickable", rect: { width: rect.width, height: rect.height } };
      }
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    assert.ok(!result.error, `${selector}[${index}] cannot be clicked: ${result.error}`);
    return result;
  }

  async click(selector, index = 0) {
    const point = await this.elementCenter(selector, index);
    await this.command("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await this.command("Input.dispatchMouseEvent", {
      type: "mousePressed",
      button: "left",
      buttons: 1,
      clickCount: 1,
      ...point,
    });
    await this.command("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button: "left",
      buttons: 0,
      clickCount: 1,
      ...point,
    });
  }

  async dragCanvas(target) {
    const rect = await this.evaluate(`(() => {
      const canvas = document.querySelector('canvas[aria-label="在曲线上拖动时间"]');
      if (!canvas) return null;
      const bounds = canvas.getBoundingClientRect();
      return { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height };
    })()`);
    assert.ok(rect, "curve canvas must exist before dragging");
    const start = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    let targetX;
    if (target === "start") targetX = rect.x + 64;
    else if (target === "end") targetX = rect.x + rect.width - 24;
    else {
      const compact = rect.height < 180;
      const leftPadding = compact ? 44 : 62;
      const rightPadding = compact ? 14 : 22;
      targetX = rect.x + leftPadding + (target / 6) * (rect.width - leftPadding - rightPadding);
    }
    const end = { x: targetX, y: start.y };
    await this.command("Input.dispatchMouseEvent", { type: "mouseMoved", ...start });
    await this.command("Input.dispatchMouseEvent", {
      type: "mousePressed",
      button: "left",
      buttons: 1,
      clickCount: 1,
      ...start,
    });
    const movementSteps = 10;
    for (let step = 1; step <= movementSteps; step += 1) {
      const progress = step / movementSteps;
      await this.command("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        button: "left",
        buttons: 1,
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      });
    }
    await this.command("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button: "left",
      buttons: 0,
      clickCount: 1,
      ...end,
    });
  }

  assertConsoleClean(context) {
    assert.deepEqual(
      this.consoleDiagnostics,
      [],
      `${context} emitted browser console errors or warnings:\n${this.consoleDiagnostics.join("\n")}`,
    );
  }

  async close() {
    try {
      await within(
        this.connection.command("Browser.close"),
        2_000,
        "Browser.close did not respond within 2 seconds",
      );
    } catch {
      // The process fallback below is authoritative when CDP closes before replying.
    } finally {
      await stopProcess(this.chrome, this.userDataDirectory);
      this.connection.close();
      try {
        await this.staticServer.close();
      } finally {
        await rm(this.userDataDirectory, { force: true, recursive: true });
        const profileStillExists = await stat(this.userDataDirectory)
          .then(() => true, (error) => {
            if (error.code === "ENOENT") return false;
            throw error;
          });
        assert.equal(profileStillExists, false, "temporary Chrome profile must be removed");
      }
    }
  }
}

let browser;

function assertHalfTurnMatrix(transform, viewport) {
  const match = transform.match(/^matrix\(([^)]+)\)$/);
  assert.ok(match, `lower tail must expose a 2D transform matrix at ${viewport}px`);
  const values = match[1].split(",").map((value) => Number.parseFloat(value.trim()));
  assert.equal(values.length, 6, `lower tail matrix must contain six values at ${viewport}px`);
  const [a, b, c, d, translateX, translateY] = values;
  const tolerance = 0.001;
  assert.ok(Math.abs(a + 1) <= tolerance, `lower tail a matrix value must be -1 for a 180° rotation at ${viewport}px`);
  assert.ok(Math.abs(b) <= tolerance, `lower tail b matrix value must be 0 at ${viewport}px`);
  assert.ok(Math.abs(c) <= tolerance, `lower tail c matrix value must be 0 at ${viewport}px`);
  assert.ok(Math.abs(d + 1) <= tolerance, `lower tail d matrix value must be -1 for a 180° rotation at ${viewport}px`);
  assert.ok(Math.abs(translateX) <= tolerance, `lower tail x translation must be 0 at ${viewport}px`);
  assert.ok(Math.abs(translateY) <= tolerance, `lower tail y translation must be 0 at ${viewport}px`);
}

before(async () => {
  browser = await BrowserFixture.start();
}, { timeout: 30_000 });

after(async () => {
  await browser?.close();
}, { timeout: 15_000 });

test("production routes keep the intended responsive grids without document overflow", { timeout: 60_000 }, async () => {
  const scenarios = [
    { route: "/", width: 1440, height: 900, layout: "classic", visibleRegions: true },
    { route: "/", width: 390, height: 844, layout: "classic", visibleRegions: true },
    { route: "/beautified/", width: 801, height: 900, layout: "mechanism-workbench", areas: '"stages stages" "membrane curve" "membrane detail"', visibleRegions: true },
    { route: "/beautified/", width: 927, height: 900, layout: "mechanism-workbench", areas: '"stages stages" "membrane curve" "membrane detail"', visibleRegions: true },
    { route: "/beautified/", width: 928, height: 900, layout: "mechanism-workbench", areas: '"stages membrane curve" "stages membrane detail"', visibleRegions: true },
    { route: "/beautified/", width: 1440, height: 900, layout: "mechanism-workbench", areas: '"stages membrane curve" "stages membrane detail"', visibleRegions: true },
    { route: "/beautified/", width: 390, height: 844, layout: "mechanism-workbench", areas: '"curve" "membrane" "stages" "detail"', visibleRegions: true },
  ];

  for (const scenario of scenarios) {
    await browser.navigate(scenario.route, scenario.width, scenario.height);
    const result = await browser.evaluate(`(() => {
      const shell = document.querySelector('.membrane-shell');
      const workspace = document.querySelector('.membrane-lab-workspace');
      const scrolling = document.scrollingElement;
      const regionSelectors = [
        '.membrane-header',
        '.membrane-curve-card',
        '.membrane-view-card',
        '.membrane-stage-nav',
        '.membrane-stage-detail',
        '.membrane-controls',
      ];
      return {
        layout: shell?.dataset.visualLayout,
        beautified: shell?.classList.contains('is-beautified'),
        hasWorkspace: Boolean(workspace),
        areas: workspace ? getComputedStyle(workspace).gridTemplateAreas : null,
        itemAreas: workspace ? {
          stages: getComputedStyle(document.querySelector('.membrane-stage-nav')).gridArea,
          membrane: getComputedStyle(document.querySelector('.membrane-view-card')).gridArea,
          curve: getComputedStyle(document.querySelector('.membrane-curve-card')).gridArea,
          detail: getComputedStyle(document.querySelector('.membrane-stage-detail')).gridArea,
        } : null,
        overflow: {
          horizontal: scrolling.scrollWidth - scrolling.clientWidth,
          vertical: scrolling.scrollHeight - scrolling.clientHeight,
        },
        regions: regionSelectors.map((selector) => {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          return rect && { selector, top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        }),
      };
    })()`);

    assert.equal(result.layout, scenario.layout, `${scenario.route} must expose ${scenario.layout} at ${scenario.width}px`);
    assert.ok(result.overflow.horizontal <= 0, `${scenario.route} has ${result.overflow.horizontal}px horizontal overflow at ${scenario.width}x${scenario.height}`);
    assert.ok(result.overflow.vertical <= 0, `${scenario.route} has ${result.overflow.vertical}px vertical overflow at ${scenario.width}x${scenario.height}`);
    if (scenario.layout === "classic") {
      assert.equal(result.beautified, false, "original route must not receive beautified styling");
      assert.equal(result.hasWorkspace, false, "original route must retain its classic composition");
    } else {
      assert.equal(result.areas, scenario.areas, `beautified grid areas are wrong at ${scenario.width}px`);
      assert.deepEqual(result.itemAreas, {
        stages: "stages",
        membrane: "membrane",
        curve: "curve",
        detail: "detail",
      }, `beautified panels must own stable grid areas at ${scenario.width}px`);
    }
    if (scenario.visibleRegions) {
      for (const region of result.regions) {
        assert.ok(region, `required mobile teaching region is missing at ${scenario.width}x${scenario.height}`);
        assert.ok(region.width > 0 && region.height > 0, `${region.selector} is not visible on mobile`);
        assert.ok(region.left >= -1 && region.right <= scenario.width + 1, `${region.selector} leaves the mobile viewport horizontally`);
        assert.ok(region.top >= -1 && region.bottom <= scenario.height + 1, `${region.selector} leaves the mobile viewport vertically`);
      }
    }
  }

  browser.assertConsoleClean("responsive route coverage");
});

test("production beautified route renders transparent outlined ions and phospholipid leaflets", { timeout: 30_000 }, async () => {
  const scenarios = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ];

  for (const scenario of scenarios) {
    await browser.navigate("/beautified/", scenario.width, scenario.height);
    const visuals = await browser.evaluate(`(() => {
      const sodium = document.querySelector('.membrane-particle.sodium');
      const potassium = document.querySelector('.membrane-particle.potassium');
      const lipid = document.querySelector('.membrane-lipid-field i');
      const upperTail = getComputedStyle(lipid, '::before');
      const lowerTail = getComputedStyle(lipid, '::after');
      const lipidHeight = Number.parseFloat(getComputedStyle(lipid).height);
      const upperTop = Number.parseFloat(upperTail.top);
      const upperHeight = Number.parseFloat(upperTail.height);
      const lowerHeight = Number.parseFloat(lowerTail.height);
      const lowerStart = Number.parseFloat(lowerTail.top);
      return {
        sodiumBackground: getComputedStyle(sodium).backgroundColor,
        potassiumBackground: getComputedStyle(potassium).backgroundColor,
        spriteDisplay: getComputedStyle(potassium, '::before').display,
        headBackgrounds: getComputedStyle(lipid).backgroundImage,
        upperTail: {
          content: upperTail.content,
        },
        lowerTail: {
          content: lowerTail.content,
          transform: lowerTail.transform,
        },
        geometry: {
          upperStart: upperTop,
          upperEnd: upperTop + upperHeight,
          lowerStart,
          lowerEnd: lowerStart + lowerHeight,
          lipidHeight,
        },
      };
    })()`);

    assert.equal(visuals.sodiumBackground, "rgba(0, 0, 0, 0)");
    assert.equal(visuals.potassiumBackground, "rgba(0, 0, 0, 0)");
    assert.equal(visuals.spriteDisplay, "none");
    assert.match(visuals.headBackgrounds, /radial-gradient/);
    assert.deepEqual(visuals.upperTail, {
      content: '\"\"',
    });
    assert.equal(visuals.lowerTail.content, '\"\"');
    assertHalfTurnMatrix(visuals.lowerTail.transform, scenario.width);
    assert.ok(visuals.geometry.upperStart > 0, `upper tail must stay below the outer head at ${scenario.width}px`);
    assert.ok(visuals.geometry.lowerEnd < visuals.geometry.lipidHeight, `lower tail must stay above the inner head at ${scenario.width}px`);
    assert.ok(visuals.geometry.upperStart < visuals.geometry.lowerStart, `opposed tails must face one another at ${scenario.width}px`);
    assert.ok(visuals.geometry.lowerStart < visuals.geometry.upperEnd, `opposed tails must intersect near the membrane center at ${scenario.width}px`);
    assert.ok(visuals.geometry.lowerStart <= visuals.geometry.lipidHeight / 2, `lower tail must reach the membrane center at ${scenario.width}px`);
    assert.ok(visuals.geometry.upperEnd >= visuals.geometry.lipidHeight / 2, `upper tail must reach the membrane center at ${scenario.width}px`);
  }

  browser.assertConsoleClean("beautified phospholipid and ion coverage");
});

test("production crossing ions keep the outlined presentation after entering the scene", { timeout: 30_000 }, async () => {
  await browser.navigate("/beautified/", 1440, 900);
  const inspectCrossing = async (stageIndex, ion) => {
    const selector = `.membrane-ion-stream.${ion} .membrane-crossing-ion`;
    await browser.click(".membrane-stage-nav button", stageIndex);
    await browser.waitFor(
      `(() => {
        const crossing = document.querySelector(${JSON.stringify(selector)});
        return crossing && document.querySelector('.membrane-scene').classList.contains('is-playing');
      })()`,
      `${ion} crossing ion did not appear for presentation checks`,
    );
    const visuals = await browser.evaluate(`(() => {
      const crossing = document.querySelector(${JSON.stringify(selector)});
      return {
        background: getComputedStyle(crossing).backgroundColor,
        boxShadow: getComputedStyle(crossing).boxShadow,
        before: getComputedStyle(crossing, '::before').display,
        after: getComputedStyle(crossing, '::after').display,
      };
    })()`);
    assert.equal(visuals.background, "rgba(0, 0, 0, 0)", `${ion} crossing ion must stay transparent`);
    assert.equal(visuals.boxShadow, "none", `${ion} crossing ion must not regain a pedestal shadow`);
    assert.equal(visuals.before, "none", `${ion} crossing ion sprite must stay hidden`);
    assert.equal(visuals.after, "none", `${ion} crossing ion highlight must stay hidden`);
  };

  await inspectCrossing(2, "sodium");
  await inspectCrossing(4, "potassium");
});

test("playback, all stage buttons, and crossing ions update through real clicks", { timeout: 60_000 }, async () => {
  await browser.navigate("/beautified/", 1440, 900);
  const slider = 'canvas[aria-label="在曲线上拖动时间"]';
  const play = ".membrane-header-play";

  assert.equal(await browser.evaluate(`document.querySelector(${JSON.stringify(play)}).getAttribute('aria-label')`), "播放全流程", "full playback must start with the play label");
  await browser.click(play);
  const running = await browser.waitFor(
    `(() => {
      const button = document.querySelector(${JSON.stringify(play)});
      const scene = document.querySelector('.membrane-scene');
      const time = Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow'));
      return button.getAttribute('aria-label') === '暂停全流程' && scene.classList.contains('is-playing') && time > 0.05 ? time : false;
    })()`,
    "play click did not advance the curve and membrane scene",
  );
  await browser.click(play);
  const pausedAt = await browser.waitFor(
    `(() => {
      const button = document.querySelector(${JSON.stringify(play)});
      const scene = document.querySelector('.membrane-scene');
      const time = Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow'));
      return button.getAttribute('aria-label') === '继续全流程' && scene.classList.contains('is-paused') ? time : false;
    })()`,
    "pause click did not expose the resume state",
  );
  assert.ok(pausedAt >= running, "pausing must retain the progressed time");
  await browser.click(play);
  await browser.waitFor(
    `document.querySelector(${JSON.stringify(play)}).getAttribute('aria-label') === '暂停全流程' && Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) > ${pausedAt + 0.05}`,
    "resume click did not continue from the paused time",
  );
  await browser.click(play);
  await browser.waitFor(
    `document.querySelector(${JSON.stringify(play)}).getAttribute('aria-label') === '继续全流程' && document.querySelector('.membrane-scene').classList.contains('is-paused')`,
    "playback did not pause before sequential stage coverage",
  );

  const stageStarts = [0, 1, 2, 2.65, 3, 4.8, 5.3];
  const displayedStageEnds = [1, 2, 2.6, 3, 4.8, 5.3, 6];
  for (let index = 0; index < stageStarts.length; index += 1) {
    await browser.click(".membrane-stage-nav button", index);
    const firstFrame = await browser.waitFor(
      `(() => {
        const button = document.querySelectorAll('.membrane-stage-nav button')[${index}];
        const scene = document.querySelector('.membrane-scene');
        const time = Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow'));
        return button.getAttribute('aria-pressed') === 'true' && scene.classList.contains('is-playing') && time >= ${stageStarts[index] - 0.01} ? time : false;
      })()`,
      `stage button ${index + 1} did not select and start its bounded animation`,
    );
    await browser.waitFor(
      `Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) > ${firstFrame + 0.02}`,
      `stage button ${index + 1} did not animate the synchronized curve`,
    );
    await browser.waitFor(
      `document.querySelector('.membrane-scene').classList.contains('is-paused') && Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) === ${displayedStageEnds[index]}`,
      `stage button ${index + 1} did not stop automatically at its displayed boundary ${displayedStageEnds[index]}`,
      8_000,
    );
  }

  const assertCrossingMoves = async (stageIndex, ion, channelSelector) => {
    await browser.click(".membrane-stage-nav button", stageIndex);
    let initialTop;
    try {
      initialTop = await browser.waitFor(
        `(() => {
          const channel = document.querySelector(${JSON.stringify(channelSelector)});
          const crossing = document.querySelector(${JSON.stringify(`.membrane-ion-stream.${ion} .membrane-crossing-ion`)});
          const scene = document.querySelector('.membrane-scene');
          return channel?.dataset.open === 'true' && crossing && scene.classList.contains('is-playing') ? crossing.getBoundingClientRect().top : false;
        })()`,
        `${ion} crossing DOM did not appear while its channel was open`,
      );
    } catch (error) {
      const state = await browser.evaluate(`(() => ({
        stage: document.querySelector('[aria-label="当前阶段"]')?.textContent,
        time: document.querySelector(${JSON.stringify(slider)})?.getAttribute('aria-valuenow'),
        pressed: [...document.querySelectorAll('.membrane-stage-nav button')].map((button) => button.getAttribute('aria-pressed')),
        channelOpen: document.querySelector(${JSON.stringify(channelSelector)})?.dataset.open,
        streams: [...document.querySelectorAll('.membrane-ion-stream')].map((stream) => stream.className),
        scene: document.querySelector('.membrane-scene')?.className,
      }))()`);
      throw new Error(`${error.message} DOM state: ${JSON.stringify(state)}`);
    }
    const direction = ion === "sodium"
      ? `crossing.getBoundingClientRect().top - ${initialTop} > 1`
      : `${initialTop} - crossing.getBoundingClientRect().top > 1`;
    await browser.waitFor(
      `(() => {
        const crossing = document.querySelector(${JSON.stringify(`.membrane-ion-stream.${ion} .membrane-crossing-ion`)});
        return crossing && ${direction};
      })()`,
      `${ion} crossing ion did not move ${ion === "sodium" ? "inward" : "outward"} across animation frames`,
    );
    await browser.click(play);
    await browser.waitFor(
      `document.querySelector('.membrane-scene').classList.contains('is-paused')`,
      `${ion} crossing playback did not pause before the next interaction`,
    );
  };

  await assertCrossingMoves(2, "sodium", ".membrane-channel.sodium");
  await assertCrossingMoves(4, "potassium", ".membrane-channel.potassium");
  browser.assertConsoleClean("playback and stage interaction coverage");
});

test("curve dragging and all experiment controls remain synchronized", { timeout: 60_000 }, async () => {
  await browser.navigate("/beautified/", 1440, 900);
  const slider = 'canvas[aria-label="在曲线上拖动时间"]';

  await browser.dragCanvas("start");
  await browser.waitFor(
    `(() => {
      const time = Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow'));
      return time <= 0.1
        && document.querySelector('[aria-label="当前阶段"]').textContent === '静息状态'
        && document.querySelector('.membrane-stage-detail strong').textContent === '静息状态'
        && document.querySelector('.membrane-scene').classList.contains('is-paused');
    })()`,
    "dragging to the curve start did not synchronize time, stage detail, and membrane pause state",
  );

  await browser.dragCanvas("end");
  await browser.waitFor(
    `(() => {
      const time = Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow'));
      return time >= 5.8
        && document.querySelector('[aria-label="当前阶段"]').textContent === '恢复静息'
        && document.querySelector('.membrane-stage-detail strong').textContent === '恢复静息'
        && document.querySelector('.membrane-channel.potassium').dataset.open === 'true';
    })()`,
    "dragging to the curve end did not synchronize time, explanation, and membrane channel state",
  );

  await browser.dragCanvas(2.65);
  await browser.waitFor(
    `(() => {
      const signs = [...document.querySelectorAll('.membrane-compartment-label b')].map((element) => element.textContent);
      return document.querySelector('[aria-label="当前膜电位"]').textContent === '0 mV'
        && document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuetext').includes('0 mV')
        && signs.length === 2 && signs.every((sign) => sign === '0');
    })()`,
    "dragging to 0 mV did not synchronize the curve voltage and neutral membrane polarities",
  );

  for (const label of ["弱刺激", "阈刺激", "强刺激"]) {
    await browser.click(`[aria-label="${label}"]`);
    await browser.waitFor(
      `document.querySelector(${JSON.stringify(`[aria-label="${label}"]`)}).getAttribute('aria-pressed') === 'true'`,
      `${label} did not become the selected stimulus intensity`,
    );
  }

  await browser.click('[aria-label="2 倍速"]');
  await browser.waitFor(
    `document.querySelector('[aria-label="2 倍速"]').getAttribute('aria-pressed') === 'true'`,
    "2x speed did not become selected",
  );
  await browser.click(".membrane-compare-toggle");
  await browser.waitFor(
    `document.querySelector('[aria-label="对比曲线"]').checked && Boolean(document.querySelector('.membrane-compare-result')) && document.querySelectorAll('.membrane-legend > span').length === 3`,
    "comparison toggle did not render all three production curves",
  );

  await browser.click(".membrane-reset");
  await browser.waitFor(
    `(() => {
      return document.querySelector('[aria-label="阈刺激"]').getAttribute('aria-pressed') === 'true'
        && document.querySelector('[aria-label="1 倍速"]').getAttribute('aria-pressed') === 'true'
        && !document.querySelector('[aria-label="对比曲线"]').checked
        && Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) === 0
        && document.querySelector('.membrane-header-play').getAttribute('aria-label') === '播放全流程';
    })()`,
    "reset did not restore intensity, speed, comparison, time, and playback state",
  );

  browser.assertConsoleClean("curve and control interaction coverage");
});

test("original bounded playback and beautified mobile interactions remain operable", { timeout: 45_000 }, async () => {
  const slider = 'canvas[aria-label="在曲线上拖动时间"]';

  await browser.navigate("/", 1440, 900);
  await browser.click(".membrane-play");
  await browser.waitFor(
    `document.querySelector('.membrane-scene').classList.contains('is-playing') && Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) > 0.05`,
    "original playback did not advance the production simulation",
  );
  await browser.click(".membrane-play");
  await browser.waitFor(
    `document.querySelector('.membrane-scene').classList.contains('is-paused') && document.querySelector('.membrane-play').textContent.includes('继续')`,
    "original playback did not pause into a resumable state",
  );
  await browser.click(".membrane-stage-nav button", 2);
  await browser.waitFor(
    `document.querySelectorAll('.membrane-stage-nav button')[2].getAttribute('aria-pressed') === 'true'
      && document.querySelector('.membrane-scene').classList.contains('is-paused')
      && Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) === 2.6`,
    "original depolarization stage did not stop at its displayed boundary",
  );
  await browser.click(".membrane-stage-nav button", 4);
  await browser.waitFor(
    `document.querySelectorAll('.membrane-stage-nav button')[4].getAttribute('aria-pressed') === 'true'
      && document.querySelector('.membrane-scene').classList.contains('is-paused')
      && Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) === 4.8`,
    "original repolarization stage did not stop at its displayed boundary",
    8_000,
  );

  await browser.navigate("/beautified/", 390, 844);
  const displayState = await browser.evaluate(`(() => ({
    header: getComputedStyle(document.querySelector('.membrane-header-play')).display,
    dock: getComputedStyle(document.querySelector('.membrane-control-dock .membrane-play')).display,
  }))()`);
  assert.equal(displayState.header, "none", "beautified mobile must hide the desktop header playback button");
  assert.notEqual(displayState.dock, "none", "beautified mobile must expose the dock playback button");

  await browser.click(".membrane-control-dock .membrane-play");
  await browser.waitFor(
    `document.querySelector('.membrane-scene').classList.contains('is-playing') && Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) > 0.05`,
    "beautified mobile dock playback did not advance",
  );
  await browser.click(".membrane-control-dock .membrane-play");
  await browser.waitFor(
    `document.querySelector('.membrane-scene').classList.contains('is-paused')`,
    "beautified mobile dock playback did not pause",
  );
  await browser.click('[aria-label="弱刺激"]');
  await browser.click('[aria-label="2 倍速"]');
  await browser.click(".membrane-compare-toggle");
  await browser.waitFor(
    `document.querySelector('[aria-label="弱刺激"]').getAttribute('aria-pressed') === 'true'
      && document.querySelector('[aria-label="2 倍速"]').getAttribute('aria-pressed') === 'true'
      && document.querySelector('[aria-label="对比曲线"]').checked`,
    "beautified mobile intensity, speed, and comparison controls did not update",
  );
  await browser.click(".membrane-reset");
  await browser.waitFor(
    `document.querySelector('[aria-label="阈刺激"]').getAttribute('aria-pressed') === 'true'
      && document.querySelector('[aria-label="1 倍速"]').getAttribute('aria-pressed') === 'true'
      && !document.querySelector('[aria-label="对比曲线"]').checked`,
    "beautified mobile reset did not restore control defaults",
  );
  await browser.click(".membrane-stage-nav button", 2);
  await browser.waitFor(
    `document.querySelectorAll('.membrane-stage-nav button')[2].getAttribute('aria-pressed') === 'true'
      && document.querySelector('.membrane-scene').classList.contains('is-paused')
      && Number(document.querySelector(${JSON.stringify(slider)}).getAttribute('aria-valuenow')) === 2.6`,
    "beautified mobile stage navigation did not complete its bounded animation",
  );
  await browser.dragCanvas(2.65);
  await browser.waitFor(
    `(() => {
      const signs = [...document.querySelectorAll('.membrane-compartment-label b')].map((element) => element.textContent);
      return document.querySelector('[aria-label="当前膜电位"]').textContent === '0 mV'
        && signs.length === 2 && signs.every((sign) => sign === '0');
    })()`,
    "beautified mobile 0 mV state did not show neutral polarity on both membrane sides",
  );

  browser.assertConsoleClean("original and mobile interaction coverage");
});
