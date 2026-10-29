// Dev mode for Spotify opened by "Open Spotify for theme debugging.cmd": while this runs, each page
// load swaps the installed theme and the Lushy Lyrics extension for the working copies in ../Lushy and
// ../Extensions (user.css is re-sent, and the extension run again, whenever either is saved).
// Spotify's own files can't be intercepted, so the installed copies are stopped instead: they start by
// retrying on a timer until Spotify is ready, and a script that runs before the page drops those
// retries. Stop this (or restart Spotify) to go back to the installed theme.
const fs = require("fs");
const path = require("path");

const THEME = path.join(__dirname, "..", "Lushy");
const EXTENSION = path.join(__dirname, "..", "Extensions", "lushy-lyrics.js");
const read = (file) => fs.readFileSync(path.join(THEME, file), "utf8");

const BEFORE_PAGE = `(() => {
  window.__lushyHoldInstalled = true;
  const setTimeoutOriginal = window.setTimeout;
  window.setTimeout = function (callback, ...rest) {
    if (window.__lushyHoldInstalled && typeof callback === "function" && ["lushy", "lushyLyrics"].includes(callback.name)) return 0;
    return setTimeoutOriginal.call(this, callback, ...rest);
  };
})();`;

const cssUpdate = () => `(() => {
  document.querySelectorAll('link[href$="user.css"], style.marketplaceUserCSS').forEach((link) => (link.disabled = true));
  let style = document.getElementById("lushy-dev-css");
  if (!style) { style = document.createElement("style"); style.id = "lushy-dev-css"; document.head.append(style); }
  style.textContent = ${JSON.stringify(read("user.css"))};
  return "css " + style.textContent.length;
})()`;

(async () => {
  const pages = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = pages.find((p) => p.type === "page" && p.url.startsWith("https://xpui.app.spotify.com/"));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      pending.set(++id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return exceptionDetails ? "error: " + (exceptionDetails.exception?.description || exceptionDetails.text) : result?.value;
  };
  const runExtension = async () => {
    if (!fs.existsSync(EXTENSION)) return;
    console.log(new Date().toLocaleTimeString(), "lushy-lyrics.js", await evaluate(fs.readFileSync(EXTENSION, "utf8") + "\n;'ran'"));
  };
  const inject = async () => {
    console.log(new Date().toLocaleTimeString(), await evaluate(cssUpdate()));
    console.log(new Date().toLocaleTimeString(), "theme.js", await evaluate("window.__lushyHoldInstalled = false;\n" + read("theme.js") + "\n;'ran'"));
    await runExtension();
  };
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message.result ?? message);
      pending.delete(message.id);
    }
    if (message.method === "Page.loadEventFired") inject();
  };
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: BEFORE_PAGE });
  let timer;
  fs.watch(path.join(THEME, "user.css"), () => {
    clearTimeout(timer);
    timer = setTimeout(async () => console.log(new Date().toLocaleTimeString(), "resent", await evaluate(cssUpdate())), 150);
  });
  let extensionTimer;
  if (fs.existsSync(EXTENSION)) {
    fs.watch(EXTENSION, () => {
      clearTimeout(extensionTimer);
      extensionTimer = setTimeout(runExtension, 150);
    });
  }
  console.log("dev mode on; reloading Spotify");
  await send("Page.reload", {});
  ws.onclose = () => process.exit(0);
})();
