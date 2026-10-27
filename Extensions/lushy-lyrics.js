// Lushy Lyrics: with Spicy Lyrics installed (from the Spicetify Marketplace), Lushy's full screen is
// Spicy Lyrics' cinematic full screen: the cover art and Spotify's full-screen button open it, with
// its word-by-word lyrics beside the artwork or Canvas. Its close button and Esc go back to the app.
// Without Spicy Lyrics, Lushy's own full screen opens instead.
(function lushyLyrics() {
  const S = window.Spicetify;
  if (!S?.Platform?.History || !S.Locale || !document.body) {
    setTimeout(lushyLyrics, 300);
    return;
  }
  // Running again (the extension reloaded while Spotify stays open) replaces the earlier run.
  window.__lushyLyricsStop?.();
  const History = S.Platform.History;
  const root = document.documentElement;
  const cleanups = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  let stopped = false;
  window.__lushyLyricsStop = () => {
    stopped = true;
    cleanups.splice(0).forEach((undo) => undo());
  };

  const SPICY_PATH = "/SpicyLyrics";
  // Spicetify.Locale.get gives back the key itself when it doesn't know it.
  const label = (key, english) => {
    const text = S.Locale.get(key);
    return text && text !== key ? text : english;
  };
  // Spicy Lyrics loads from its own server a little after Spotify starts, so it's looked up each time.
  const spicy = () => window._spicy_lyrics?.fullscreen;

  function waitFor(find, timeout) {
    return new Promise((resolve) => {
      const start = Date.now();
      const look = () => {
        const found = find();
        if (found || stopped || Date.now() - start > timeout) resolve(found || null);
        else setTimeout(look, 100);
      };
      look();
    });
  }

  // While Spicy Lyrics' full screen comes in or goes out, the app behind it stays hidden, so only
  // Lushy's backdrop shows.
  const style = document.createElement("style");
  style.id = "lushy-lyrics";
  style.textContent = 'html:is([data-lushy-lyrics="opening"], [data-lushy-lyrics="closing"]) #main { visibility: hidden !important; }';
  document.head.append(style);
  cleanups.push(() => style.remove());

  const setPhase = (phase) => {
    if (phase) root.dataset.lushyLyrics = phase;
    else delete root.dataset.lushyLyrics;
  };
  cleanups.push(() => setPhase(null));

  // The Spicy Lyrics full screen opened from here.
  let session = null;

  // Spicy Lyrics goes back to the page it was opened from after closing; the app shows once it has.
  async function closed() {
    if (!session) return;
    session = null;
    await waitFor(() => History.location.pathname !== SPICY_PATH, 2000);
    setPhase(null);
  }

  let subscribed = false;
  function subscribe() {
    if (subscribed || typeof spicy()?.onclose !== "function") return;
    subscribed = true;
    const unsubscribe = spicy().onclose(closed);
    if (typeof unsubscribe === "function") cleanups.push(unsubscribe);
  }

  async function open() {
    subscribe();
    session = { closing: false };
    setPhase("opening");
    if (History.location.pathname !== SPICY_PATH) History.push(SPICY_PATH);
    // Spicy Lyrics' Cinema View fills the window, which is now the whole screen.
    const cinemaView = await waitFor(() => document.querySelector("#SpicyLyricsPage .ViewControls #CinemaView"), 5000);
    cinemaView?.click();
    const opened = cinemaView && (await waitFor(() => document.querySelector("#SpicyLyricsPage.Fullscreen"), 3000));
    if (stopped) return;
    if (opened) {
      setPhase("open");
    } else {
      // Spicy Lyrics didn't open its full screen; its page shows instead.
      session = null;
      setPhase(null);
    }
  }

  function close() {
    if (!session || session.closing) return;
    session.closing = true;
    setPhase("closing");
  }

  // Lushy's cover art presses Spotify's full-screen button, so catching the button catches both. The
  // window sees the click before Spotify and the theme do.
  listen(window, "click", (event) => {
    const button = event.target.closest?.("button");
    if (!button) return;
    if (button.matches('[data-testid="fullscreen-mode-button"]')) {
      if (button.getAttribute("aria-label") !== label("web-player.cinema-mode.fullscreen.enter", "Enter full screen") || !spicy()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      document.documentElement.requestFullscreen?.().catch(() => {});
      open();
    } else if (button.matches("#SpicyLyricsPage .ViewControls #Close")) {
      close();
    }
  }, true);

  // Leaving the browser's full screen (Esc) closes Spicy Lyrics' full screen too, rather than leaving
  // it filling the window.
  listen(document, "fullscreenchange", () => {
    if (document.fullscreenElement || !session || session.closing || root.dataset.lushyLyrics !== "open") return;
    close();
    document.querySelector("#SpicyLyricsPage .ViewControls #Close")?.click();
  });
})();
