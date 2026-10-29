// Talks to Spotify started by "Open Spotify for theme debugging.cmd" (Chrome DevTools Protocol on 127.0.0.1:9222).
//   node cdp.cjs eval <file.js>        evaluate a file in the page and print the JSON result
//   node cdp.cjs shot <out.png> [x y w h]   screenshot the page, or a region of it
//   node cdp.cjs css <user.css>        swap the installed theme CSS for this file, live (until Spotify reloads)
//   node cdp.cjs js <theme.js>         run a theme.js again in the page
//   node cdp.cjs reload                reload the page (back to the installed theme)
const fs = require("fs");

async function connect() {
  const pages = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = pages.find((p) => p.type === "page" && p.url.startsWith("https://xpui.app.spotify.com/"));
  if (!page) throw new Error("Spotify's page isn't open on port 9222");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiting.has(message.id)) {
      waiting.get(message.id)(message);
      waiting.delete(message.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      waiting.set(n, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  return { send, close: () => ws.close() };
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

(async () => {
  const [command, arg, ...rest] = process.argv.slice(2);
  const { send, close } = await connect();
  try {
    if (command === "eval") {
      const value = await evaluate(send, fs.readFileSync(arg, "utf8"));
      console.log(typeof value === "string" ? value : JSON.stringify(value, null, 1));
    } else if (command === "shot") {
      const params = { format: "png" };
      if (rest.length === 4) {
        const [x, y, width, height] = rest.map(Number);
        params.clip = { x, y, width, height, scale: 1 };
      }
      const { data } = await send("Page.captureScreenshot", params);
      fs.writeFileSync(arg, Buffer.from(data, "base64"));
      console.log("saved " + arg);
    } else if (command === "css") {
      const css = fs.readFileSync(arg, "utf8");
      const code = `(() => {
        document.querySelectorAll('link[href*="user.css"], style.marketplaceUserCSS').forEach((l) => (l.disabled = true));
        let s = document.getElementById("lushy-live");
        if (!s) { s = document.createElement("style"); s.id = "lushy-live"; document.head.append(s); }
        s.textContent = ${JSON.stringify(css)};
        return "live css " + s.textContent.length;
      })()`;
      console.log(await evaluate(send, code));
    } else if (command === "js") {
      console.log(await evaluate(send, fs.readFileSync(arg, "utf8")));
    } else if (command === "reload") {
      await send("Page.reload", {});
      console.log("reloaded");
    } else {
      throw new Error("unknown command " + command);
    }
  } finally {
    close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
