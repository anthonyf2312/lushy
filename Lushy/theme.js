// Lushy for Spicetify: tints the window with the playing cover's colour, puts the open page's
// artwork behind everything (blurred), adds Lushy's search and links to the sidebar, and gives
// Spotify's full screen Lushy's full-screen look.
(function lushy() {
  const S = window.Spicetify;
  if (!S?.Player || !S.Platform?.History || !document.querySelector("#Desktop_LeftSidebar_Id")) {
    setTimeout(lushy, 300);
    return;
  }
  // Running again (the theme reloaded while Spotify stays open) replaces the earlier run.
  window.__lushyStop?.();
  const History = S.Platform.History;
  const root = document.documentElement;
  const cleanups = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  const watch = (observer, target, options) => {
    observer.observe(target, options);
    cleanups.push(() => observer.disconnect());
    return observer;
  };
  window.__lushyStop = () => {
    cleanups.splice(0).forEach((undo) => undo());
    document.querySelectorAll("#lushy-backdrop, .lushy-nav, .lushy-cinema-info").forEach((element) => element.remove());
    const tags = ["data-lushy-cinema", "data-lushy-cinema-header", "data-lushy-cinema-extra", "data-lushy-mode", "data-lushy-stage", "data-lushy-lyrics", "data-lushy-clear", "data-lushy-npv"];
    for (const element of document.querySelectorAll(tags.map((tag) => `[${tag}]`).join(", "))) {
      for (const tag of tags) element.removeAttribute(tag);
    }
    root.classList.remove("lushy-sidebar-collapsed", "lushy-cinema", "lushy-idle", "lushy-fullscreen");
  };

  // Lucide icons (ISC), the same ones Lushy's sidebar uses.
  const ICONS = {
    home: "<path d='M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'/><path d='M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/>",
    browse: "<rect width='7' height='7' x='3' y='3' rx='1'/><rect width='7' height='7' x='14' y='3' rx='1'/><rect width='7' height='7' x='14' y='14' rx='1'/><rect width='7' height='7' x='3' y='14' rx='1'/>",
    search: "<path d='m21 21-4.34-4.34'/><circle cx='11' cy='11' r='8'/>",
    clear: "<path d='M18 6 6 18'/><path d='m6 6 12 12'/>",
    songs: "<path d='m19 6-5.2-3.9a.5.5 0 0 0-.8.4V18'/><circle cx='9' cy='18' r='4'/>",
    albums: "<circle cx='12' cy='12' r='10'/><path d='M6 12c0-1.7.7-3.2 1.8-4.2'/><circle cx='12' cy='12' r='2'/><path d='M18 12c0 1.7-.7 3.2-1.8 4.2'/>",
    artists: "<path d='m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12'/><path d='M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5'/><circle cx='16' cy='7' r='5'/>",
    playlists: "<path d='M16 5H3'/><path d='M11 12H3'/><path d='M11 19H3'/><path d='M21 16V5'/><circle cx='18' cy='16' r='3'/>",
  };
  const icon = (name, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  // Cover colour: the same weighted average Lushy uses, so the tint matches the app.

  const FALLBACK = { r: 92, g: 70, b: 140 };
  const SAMPLE_SIZE = 24;
  /** Brightest channel a tint may have, so white covers don't wash out the text on top. */
  const MAX_CHANNEL = 190;
  const colorCache = new Map();

  const hueOf = (r, g, b) => {
    const max = Math.max(r, g, b);
    const spread = max - Math.min(r, g, b);
    if (!spread) return 0;
    const hue = max === r ? ((g - b) / spread) % 6 : max === g ? (b - r) / spread + 2 : (r - g) / spread + 4;
    return (hue * 60 + 360) % 360;
  };

  /**
   * The tint (the same weighted average Lushy uses) and the cover's most vibrant hues, for the
   * background. Spicetify's colour extractor returns nothing in Spotify 1.3, so both come from here.
   */
  function sampleColors(image) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SAMPLE_SIZE;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return { tint: FALLBACK, palette: [] };
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    let r = 0;
    let g = 0;
    let b = 0;
    let total = 0;
    const hues = Array.from({ length: 12 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      // Saturated pixels count more, so a grey cover with one bold colour reads as that colour.
      const weight = 1 + (max - min) / 32;
      r += data[i] * weight;
      g += data[i + 1] * weight;
      b += data[i + 2] * weight;
      total += weight;
      // Vibrant hues leave out greys and near-black or near-white pixels.
      const saturation = (max - min) / 255;
      const lightness = (max + min) / 510;
      if (saturation < 0.2 || lightness < 0.12 || lightness > 0.9) continue;
      const bin = hues[Math.floor(hueOf(data[i], data[i + 1], data[i + 2]) / 30) % 12];
      const vivid = saturation * saturation;
      bin.weight += vivid;
      bin.r += data[i] * vivid;
      bin.g += data[i + 1] * vivid;
      bin.b += data[i + 2] * vivid;
    }
    const scale = Math.min(1, (MAX_CHANNEL * total) / Math.max(r, g, b, 1));
    const tint = { r: Math.round((r / total) * scale), g: Math.round((g / total) * scale), b: Math.round((b / total) * scale) };
    const palette = hues
      .filter((bin) => bin.weight > 0)
      .sort((a, z) => z.weight - a.weight)
      .slice(0, 3)
      .map((bin) => ({ r: Math.round(bin.r / bin.weight), g: Math.round(bin.g / bin.weight), b: Math.round(bin.b / bin.weight) }));
    return { tint, palette };
  }

  function coverColor(url) {
    if (colorCache.has(url)) return Promise.resolve(colorCache.get(url));
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const colors = sampleColors(image);
          colorCache.set(url, colors);
          resolve(colors);
        } catch {
          // A cover served without CORS headers can't be read back.
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  function imageUrl(uri) {
    if (!uri) return undefined;
    if (uri.startsWith("spotify:image:")) return `https://i.scdn.co/image/${uri.slice("spotify:image:".length)}`;
    if (uri.startsWith("spotify:mosaic:")) return `https://mosaic.scdn.co/640/${uri.slice("spotify:mosaic:".length).split(":").join("")}`;
    return uri;
  }

  const playingItem = () => S.Player.data?.item ?? S.Player.data?.track;

  function playingCover() {
    const item = playingItem();
    const meta = item?.metadata ?? {};
    return imageUrl(meta.image_xlarge_url || meta.image_large_url || meta.image_url || item?.images?.[0]?.url);
  }

  function applyTint(colors) {
    const { r, g, b } = colors?.tint ?? FALLBACK;
    // The background's three vibrant colours; a cover with fewer hues repeats them, a grey one uses the tint.
    const palette = colors?.palette?.length ? colors.palette : [colors?.tint ?? FALLBACK];
    for (let index = 0; index < 3; index++) {
      const colour = palette[index % palette.length];
      root.style.setProperty(`--lushy-mesh-${index + 1}`, `rgb(${colour.r} ${colour.g} ${colour.b})`);
    }
    const lift = (channel, amount) => Math.round(channel + (255 - channel) * amount);
    const accent = [lift(r, 0.55), lift(g, 0.55), lift(b, 0.55)];
    const accentActive = [lift(r, 0.7), lift(g, 0.7), lift(b, 0.7)];
    root.style.setProperty("--lushy-tint", `rgb(${r} ${g} ${b})`);
    root.style.setProperty("--lushy-accent", `rgb(${accent.join(" ")})`);
    // Spotify's own accent (its green, which Spicetify calls "button") follows the cover too.
    root.style.setProperty("--spice-button", `rgb(${accent.join(",")})`);
    root.style.setProperty("--spice-rgb-button", accent.join(","));
    root.style.setProperty("--spice-button-active", `rgb(${accentActive.join(",")})`);
    root.style.setProperty("--spice-rgb-button-active", accentActive.join(","));
  }

  let tintFor;
  async function updateTint() {
    const url = playingCover();
    tintFor = url;
    if (!url) return applyTint(null);
    const colors = await coverColor(url);
    // A newer song may have started while this cover loaded.
    if (tintFor === url && colors) applyTint(colors);
  }

  // Backdrop: artwork blurred behind everything: the open album's, playlist's or artist's, or on
  // other pages the playing song's (a glow in the tint when nothing is playing). In full screen the
  // playing cover drifts. A new background fades in over the old one, which is
  // dropped once it's covered.

  const ART_PAGE = /^\/(album|playlist|artist|show|episode)\//;
  const backdrop = document.createElement("div");
  backdrop.id = "lushy-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  document.body.prepend(backdrop);
  let shownKey = null;

  /** kind: "page" (an album's, playlist's or artist's art), "vibrant" (the playing cover under a
   *  wash of its brightest colours, on other pages) or "full" (full screen). */
  function showBackdrop(art, kind = "page") {
    const key = kind + ":" + (art ?? "");
    if (key === shownKey) return;
    shownKey = key;
    const layer = document.createElement("div");
    layer.className = "lushy-backdrop-layer is-" + kind;
    if (art) {
      layer.innerHTML = `<div class="lushy-backdrop-art"></div>${kind === "vibrant" ? '<div class="lushy-backdrop-mesh"></div>' : ""}<div class="lushy-backdrop-shade"></div>`;
      layer.firstChild.style.backgroundImage = `url("${art}")`;
    } else {
      layer.innerHTML = '<div class="lushy-backdrop-glow"></div>';
    }
    if (backdrop.firstChild) {
      layer.classList.add("is-entering");
      layer.addEventListener("animationend", (event) => {
        // Fades that finish in the same frame (after the window was hidden) can end out of order;
        // a layer that's already been replaced leaves the newer ones alone.
        if (event.target !== layer || layer.parentNode !== backdrop) return;
        while (backdrop.firstChild !== layer) backdrop.firstChild.remove();
      });
    }
    backdrop.append(layer);
  }

  function pageArt() {
    const main = document.querySelector("#main-view, .Root__main-view");
    const image = main?.querySelector(
      '.main-entityHeader-image[src*="scdn.co"], [data-testid="entity-header"] img[src*="scdn.co"], [data-testid="artist-page"] img[src*="scdn.co"]',
    );
    if (image) return image.currentSrc || image.src;
    const banner = main?.querySelector('[data-testid="background-image"], .main-entityHeader-background');
    return banner && getComputedStyle(banner).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
  }

  let artTimer;
  cleanups.push(() => clearInterval(artTimer));
  function syncBackdrop() {
    clearInterval(artTimer);
    if (inCinema()) return showBackdrop(playingCover(), "full");
    if (!ART_PAGE.test(History.location?.pathname ?? "")) return showBackdrop(playingCover(), "vibrant");
    // The new page renders after the route changes, and for a moment the old header is still
    // there, so the same artwork only counts once it has stayed put for a few checks.
    let tries = 0;
    const previous = shownKey;
    const look = () => {
      tries += 1;
      const art = pageArt();
      if ((art && ("page:" + art !== previous || tries > 6)) || tries > 40) {
        clearInterval(artTimer);
        if (art || tries > 40) showBackdrop(art);
      }
    };
    artTimer = setInterval(look, 150);
    look();
  }

  // Sidebar: Lushy's search box and links above Spotify's library. The top row stays clear for
  // the ⋯ menu Spotify draws over the window's top-left corner.

  const LINKS = [
    { label: "Home", icon: "home", path: "/", active: (path) => path === "/" },
    { label: "Browse", icon: "browse", path: "/search", active: (path) => path === "/search" || path.startsWith("/genre/") },
    { heading: "Library" },
    { label: "Artists", icon: "artists", filter: "Artists" },
    { label: "Albums", icon: "albums", filter: "Albums" },
    { label: "Songs", icon: "songs", path: "/collection/tracks", active: (path) => path === "/collection/tracks" },
  ];
  const SEARCH_DELAY_MS = 350;

  const nav = document.createElement("div");
  nav.className = "lushy-nav";
  nav.innerHTML = `<div class="lushy-titlebar"></div><label class="lushy-search">${icon("search", 17)}<input type="text" placeholder="Search" spellcheck="false" aria-label="Search"><button class="lushy-search-clear" type="button" aria-label="Clear search">${icon("clear", 15)}</button></label>`;
  const searchBox = nav.querySelector(".lushy-search");
  const input = nav.querySelector("input");

  for (const link of LINKS) {
    if (link.heading) {
      nav.insertAdjacentHTML("beforeend", `<div class="lushy-nav-heading">${link.heading}</div>`);
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lushy-nav-item";
    button.title = link.label;
    button.innerHTML = `${icon(link.icon)}<span>${link.label}</span>`;
    button.addEventListener("click", () => (link.filter ? filterLibrary(link.filter) : History.push(link.path)));
    link.button = button;
    nav.append(button);
  }

  /** Artists and Albums are filters on Spotify's library, so these press its filter chips. */
  function libraryChip(name) {
    return [...(document.querySelector("#Desktop_LeftSidebar_Id")?.querySelectorAll('button, [role="checkbox"], [role="option"]') ?? [])].find(
      (element) => !nav.contains(element) && element.textContent.trim() === name,
    );
  }

  function chipOn(chip) {
    if (!chip) return false;
    if (chip.getAttribute("aria-checked") === "true" || chip.getAttribute("aria-selected") === "true") return true;
    // Spotify shows a chosen filter as the only chip left, beside a button that clears it.
    const list = chip.closest('[role="listbox"]') ?? chip.parentElement;
    const named = [...list.querySelectorAll('[role="option"], button')].filter((other) => !nav.contains(other) && other.textContent.trim());
    return named.length === 1 && named[0] === chip;
  }

  function filterLibrary(name) {
    // A collapsed library has no chips; open it first, then wait for them to appear.
    if (!libraryChip(name)) document.querySelector('#Desktop_LeftSidebar_Id button[aria-label="Open Your Library"]')?.click();
    let tries = 0;
    const press = () => {
      const chip = libraryChip(name);
      if (!chip && ++tries < 15) return setTimeout(press, 100);
      if (chip && !chipOn(chip)) chip.click();
      setTimeout(syncNav, 100);
    };
    press();
  }

  // Spotify sets the width the sidebar is heading for on it (--left-sidebar-width, 72 when
  // collapsed), and the panel slides there; going by that rather than its current width switches
  // the links in the same frame Spotify swaps its own content, so they fade in together.
  function collapsed(sidebar) {
    const width = parseFloat(sidebar.style.getPropertyValue("--left-sidebar-width"));
    return Number.isNaN(width) ? sidebar.offsetWidth < 160 : width < 160;
  }

  function syncNav() {
    const sidebar = document.querySelector("#Desktop_LeftSidebar_Id");
    if (sidebar) root.classList.toggle("lushy-sidebar-collapsed", collapsed(sidebar));
    const path = History.location?.pathname ?? "";
    for (const link of LINKS) {
      if (!link.button) continue;
      const active = link.filter ? chipOn(libraryChip(link.filter)) : link.active(path);
      link.button.classList.toggle("is-active", Boolean(active));
    }
    if (path.startsWith("/search/") && document.activeElement !== input) {
      input.value = decodeURIComponent(path.slice("/search/".length).split("/")[0]);
    }
    searchBox.classList.toggle("has-text", input.value !== "");
  }

  // After a route change Spotify moves focus to the new page, which would swallow the rest of
  // what's being typed here; for a moment after each search, that focus comes back.
  let refocusUntil = 0;
  listen(document, "focusin", (event) => {
    if (Date.now() < refocusUntil && event.target !== input && event.target.getAttribute?.("tabindex") === "-1") input.focus();
  }, true);
  listen(document, "pointerdown", (event) => event.target !== input && (refocusUntil = 0), true);

  let searchTimer;
  cleanups.push(() => clearTimeout(searchTimer));
  function search(text, delay = SEARCH_DELAY_MS) {
    input.value = text;
    searchBox.classList.toggle("has-text", text !== "");
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const query = text.trim();
      const path = query ? `/search/${encodeURIComponent(query)}` : "/search";
      if (document.activeElement === input) refocusUntil = Date.now() + 1500;
      // Typing refines one search rather than leaving a trail of half-typed ones in Back.
      if ((History.location?.pathname ?? "").startsWith("/search")) History.replace(path);
      else History.push(path);
    }, delay);
  }

  input.addEventListener("input", () => search(input.value));
  input.addEventListener("focus", () => {
    if (!(History.location?.pathname ?? "").startsWith("/search")) search(input.value, 0);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") search(input.value, 0);
    if (event.key === "Escape") search("", 0);
  });
  nav.querySelector(".lushy-search-clear").addEventListener("click", () => {
    search("", 0);
    input.focus();
  });

  // Ctrl+K and Ctrl+L focus this box while the sidebar is open (Spotify's own box is hidden then).
  listen(document, "keydown", (event) => {
    if (root.classList.contains("lushy-sidebar-collapsed")) return;
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && ["k", "l"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      event.stopPropagation();
      input.focus();
      input.select();
    }
  }, true);

  // Opening and closing the library: Spotify snaps the sidebar to its new width; here it slides
  // there, its content fading in. Narrowing or widening the page beside it every frame makes Spotify
  // re-lay out and restyle the whole page each frame (about 10 frames a second on Home), so while it
  // slides the sidebar's column already has the new width, the page is laid out once, and it's moved
  // along with the sidebar's edge instead: the main view slides (clipped so it can't run under a
  // panel on the right), and the top bar and player bar stretch from their left ends so their right
  // ends stay put. Dragging the edge isn't slid.
  const SLIDE = { duration: 400, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both" };
  const sidebarWidth = (value) => value - 16 * Math.min(Math.max(73 - value, 0), 1);
  let slides = [];
  let slideColumns;
  let settling = 0;

  function endSlide() {
    cancelAnimationFrame(settling);
    slideColumns?.style.removeProperty("grid-template-columns");
    slideColumns = undefined;
    slides.splice(0).forEach((animation) => animation.cancel());
  }
  cleanups.push(endSlide);

  // Spotify spends the first few frames after the switch rebuilding the library and laying the page
  // out at its new width (a few hundred milliseconds on Home). The slide waits at its start for a
  // frame that comes back quickly, so none of it is spent frozen and then skipped.
  function whenSettled(start) {
    let last;
    let waited = 0;
    const tick = (now) => {
      const frame = last === undefined ? Infinity : now - last;
      if (last !== undefined) waited += frame;
      last = now;
      if (frame < 25 || waited > 350) start();
      else settling = requestAnimationFrame(tick);
    };
    settling = requestAnimationFrame(tick);
  }

  function slideSidebar(sidebar, oldStyle) {
    const target = parseFloat(sidebar.style.getPropertyValue("--left-sidebar-width"));
    const previous = parseFloat(/--left-sidebar-width:\s*([\d.]+)/.exec(oldStyle ?? "")?.[1]);
    if (target === previous) return;
    const skip =
      Number.isNaN(target) || Number.isNaN(previous) || sidebar.querySelector(".LayoutResizer__resize-bar--resizing") ||
      inCinema() || matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Turned around mid-slide: carry on from where the edge is now.
    const from = slides.length ? sidebar.getBoundingClientRect().width : sidebarWidth(previous);
    endSlide();
    const to = sidebarWidth(target);
    if (skip || Math.abs(from - to) < 2) return;
    const shift = from - to;
    const top = sidebar.parentElement;
    const main = top.querySelector(":scope > #main-view");
    const stretched = [top.querySelector(":scope > #global-nav-bar"), top.querySelector(":scope > :has(.main-nowPlayingBar-container)")].filter(Boolean);
    const margins = stretched.map((element) => parseFloat(getComputedStyle(element).marginInlineStart) || 0);
    slideColumns = top;
    top.style.setProperty("grid-template-columns", `${to}px 1fr auto`, "important");
    slides = [
      sidebar.animate({ width: [`${from}px`, `${to}px`] }, SLIDE),
      ...[...sidebar.children].filter((child) => !child.matches(".LayoutResizer__resize-bar")).map((child) => child.animate({ opacity: [0, 1] }, SLIDE)),
      ...stretched.map((element, i) => element.animate({ marginInlineStart: [`${margins[i] + shift}px`, `${margins[i]}px`] }, SLIDE)),
    ];
    if (main) {
      slides.push(main.animate({ translate: [`${shift}px 0`, "0 0"], clipPath: [`inset(0 ${Math.max(shift, 0)}px 0 0)`, "inset(0 0 0 0)"] }, SLIDE));
    }
    const current = slides;
    current.forEach((animation) => animation.pause());
    whenSettled(() => current.forEach((animation) => animation.play()));
    current[0].finished.then(() => current === slides && endSlide(), () => {});
  }

  // Spotify re-renders the sidebar now and then; put the links back when it does. Collapsing the
  // library shrinks the links to icons and brings back Spotify's own search box.
  const sizes = new MutationObserver((records) => {
    if (!sized) return;
    root.classList.toggle("lushy-sidebar-collapsed", collapsed(sized));
    slideSidebar(sized, records[0].oldValue);
  });
  cleanups.push(() => sizes.disconnect());
  let sized;
  function mountNav() {
    const sidebar = document.querySelector("#Desktop_LeftSidebar_Id");
    if (!sidebar) return;
    if (sidebar.firstChild !== nav) sidebar.prepend(nav);
    if (sized !== sidebar) {
      sizes.disconnect();
      sizes.observe(sidebar, { attributes: true, attributeFilter: ["style"], attributeOldValue: true });
      sized = sidebar;
      root.classList.toggle("lushy-sidebar-collapsed", collapsed(sidebar));
    }
  }

  // Full screen: Spotify's "cinema" view, marked by a data-cinema-…-postenter attribute on <html>.
  // Its parts have scrambled class names that change with every Spotify version, so they're found
  // by what they hold and tagged for user.css: the view itself, the big fills that would hide the
  // backdrop, and the row the artwork is centred in, which gets Lushy's title and artist beside it.

  // "Expand Your Library" uses the same mechanism (data-cinema-library-…) for a big library view;
  // that isn't full screen, but full screen opened from it (data-cinema-library-npv-…) is.
  const CINEMA_ON = /^data-cinema-(?!library-[a-z]+$)[a-z-]*-(duringenter|postenter|preexit)$/;
  const inCinema = () => [...root.attributes].some((attribute) => CINEMA_ON.test(attribute.name));
  const IDLE_MS = 3000;

  // The song's title, artist and progress, in the manner of Spicy Lyrics' full screen. The cover
  // shows here too when Spotify's lyrics take the artwork's place.
  const info = document.createElement("div");
  info.className = "lushy-cinema-info";
  info.innerHTML =
    '<img class="lushy-cinema-cover" alt=""><h1 class="lushy-cinema-title"></h1><p class="lushy-cinema-artist"></p>' +
    '<div class="lushy-cinema-progress" aria-hidden="true"><div class="lushy-cinema-track"><div class="lushy-cinema-fill"></div></div>' +
    '<div class="lushy-cinema-times"><span></span><span></span></div></div>';
  const cover = info.querySelector(".lushy-cinema-cover");
  const fill = info.querySelector(".lushy-cinema-fill");
  const [elapsed, total] = info.querySelectorAll(".lushy-cinema-times span");

  function updateInfo() {
    const item = playingItem();
    const meta = item?.metadata ?? {};
    info.querySelector(".lushy-cinema-title").textContent = item?.name ?? meta.title ?? "";
    info.querySelector(".lushy-cinema-artist").textContent = item?.artists?.map((artist) => artist.name).join(", ") || meta.artist_name || "";
    const art = playingCover();
    if (art) cover.src = art;
  }

  const clock = (ms) => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  };
  // Spicetify's player can take a moment to connect after Spotify starts; until then it throws.
  const playerTime = () => {
    try {
      const duration = S.Player.getDuration() || 0;
      return { duration, position: Math.min(S.Player.getProgress() || 0, duration) };
    } catch {
      return { duration: 0, position: 0 };
    }
  };
  function updateProgress() {
    const { duration, position } = playerTime();
    fill.style.width = duration ? (position / duration) * 100 + "%" : "0";
    elapsed.textContent = clock(position);
    total.textContent = clock(duration);
  }
  // Clicking the line moves through the song (the player bar's own slider works by keyboard).
  info.querySelector(".lushy-cinema-track").addEventListener("click", (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const { duration } = playerTime();
    if (!duration || !box.width) return;
    S.Player.seek(Math.max(1, Math.round(((event.clientX - box.left) / box.width) * duration)));
    updateProgress();
  });
  let progressTimer;
  cleanups.push(() => clearInterval(progressTimer));

  function cinemaView() {
    const top = document.querySelector(".Root__top-container");
    const known = "#global-nav-bar, #Desktop_LeftSidebar_Id, #main-view, #lyrics-cinema";
    const owned = ".main-nowPlayingBar-container, #Desktop_PanelContainer_Id, .LayoutResizer__resize-bar, .VTO__modal-slot, #floating-ui-popover-layer";
    return [...(top?.children ?? [])]
      .filter((child) => child.childElementCount && !child.matches(known) && !child.querySelector(owned))
      .sort((a, b) => b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight)[0];
  }

  function dressCinema() {
    const view = cinemaView();
    if (!view) return;
    view.setAttribute("data-lushy-cinema", "");
    const header = [...view.children].find((child) => child.querySelector("button") && !child.querySelector("video, img"));
    header?.setAttribute("data-lushy-cinema-header", "");
    const area = view.offsetWidth * view.offsetHeight;
    for (const element of view.querySelectorAll("div")) {
      const style = getComputedStyle(element);
      const painted = style.backgroundColor !== "rgba(0, 0, 0, 0)" || style.backgroundImage.includes("gradient");
      if (painted && element.offsetWidth * element.offsetHeight > area * 0.3 && !element.style.backgroundImage) element.setAttribute("data-lushy-clear", "");
    }
    const media = [...view.querySelectorAll("video, img")]
      .filter((element) => element.offsetWidth > 200 && !info.contains(element))
      .sort((a, b) => b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight)[0];
    // Spotify's lyrics take the artwork's place: big lines marked dir=auto. Their column is the
    // widest box around them that's still narrower than the view, and it moves to the right half.
    const line = [...view.querySelectorAll('div[dir="auto"]')].find((element) => parseFloat(getComputedStyle(element).fontSize) >= 28);
    let column = line;
    while (column?.parentElement && column.parentElement !== view && column.parentElement.offsetWidth < view.offsetWidth * 0.8) column = column.parentElement;
    for (const element of view.querySelectorAll("[data-lushy-lyrics]")) if (element !== column) element.removeAttribute("data-lushy-lyrics");
    column?.setAttribute("data-lushy-lyrics", "");
    view.dataset.lushyMode = line ? "lyrics" : media ? "media" : "none";
    // The artwork's stage: the box the view's full-width row centres. user.css sizes it, and
    // Spotify's wrappers inside it fill it.
    let stageBox = media;
    while (stageBox?.parentElement && stageBox.parentElement !== view && !(getComputedStyle(stageBox.parentElement).display === "flex" && stageBox.parentElement.offsetWidth > view.offsetWidth * 0.6)) stageBox = stageBox.parentElement;
    for (const element of view.querySelectorAll("[data-lushy-stage]")) if (element !== stageBox) element.removeAttribute("data-lushy-stage");
    stageBox?.setAttribute("data-lushy-stage", "");
    // Below the artwork Spotify lists the queue and the artist; full screen stays on the song. That
    // part follows the box that holds the artwork or lyrics and fills the view's height.
    let stage = media || line;
    while (stage && stage.parentElement !== view && !(stage.nextElementSibling && stage.offsetHeight >= view.offsetHeight * 0.9)) stage = stage.parentElement;
    for (let extra = stage?.parentElement !== view ? stage?.nextElementSibling : null; extra; extra = extra.nextElementSibling) extra.setAttribute("data-lushy-cinema-extra", "");
    // The title and progress sit straight under the cover art; over a Canvas or beside the lyrics
    // they're placed in the view itself.
    const under = !line && media?.tagName === "IMG" && stageBox && stageBox !== view ? stageBox : null;
    if (under) {
      if (under.nextElementSibling !== info) under.after(info);
    } else if (info.parentElement !== view) view.append(info);
  }

  let idleTimer;
  cleanups.push(() => clearTimeout(idleTimer));
  function wake() {
    root.classList.remove("lushy-idle");
    clearTimeout(idleTimer);
    if (root.classList.contains("lushy-cinema")) idleTimer = setTimeout(() => root.classList.add("lushy-idle"), IDLE_MS);
  }
  listen(document, "pointermove", wake, true);
  listen(document, "keydown", wake, true);

  let dressTimer;
  cleanups.push(() => clearTimeout(dressTimer));
  function syncCinema() {
    const on = inCinema();
    if (on !== root.classList.contains("lushy-cinema")) {
      root.classList.toggle("lushy-cinema", on);
      clearInterval(progressTimer);
      if (on) {
        updateInfo();
        updateProgress();
        progressTimer = setInterval(updateProgress, 250);
      } else info.remove();
      syncBackdrop();
      wake();
    }
    // Spotify builds the view over a moment, and rebuilds parts of it when switching between
    // artwork, Canvas and lyrics, so the dressing is redone shortly after each change.
    if (on) {
      clearTimeout(dressTimer);
      dressTimer = setTimeout(dressCinema, 120);
    }
  }

  // The Now Playing panel is switched off, as Lushy had none: Spotify stops opening it on play, the
  // cover art in the player bar opens full screen instead (Lushy's behaviour), and if the panel
  // opens anyway it's hidden and closed. Full screen is built on the panel, so it's left alone
  // there. Spotify's own labels find its buttons in any language.

  // Spotify's translations, with English when a key isn't found (its lookup returns the key then).
  const label = (key, english) => {
    const text = S.Locale?.get?.(key);
    return text && text !== key ? text : english;
  };
  const nowPlayingLabel = () => label("web-player.now-playing-view.label", "Now playing view");
  try {
    if (S.Platform.LocalStorageAPI?.getItem("toggleNowPlayingView") !== false) S.Platform.LocalStorageAPI?.setItem("toggleNowPlayingView", false);
  } catch {
    // A Spotify version without this setting.
  }

  function fullscreenButton() {
    const labels = [label("web-player.now-playing-view.lyrics.fullscreen", "Enter full screen"), label("web-player.cinema-mode.fullscreen.enter", "Enter Full screen")].map((text) => text.toLowerCase());
    return [...document.querySelectorAll(".main-nowPlayingBar-container button[aria-label]")].find((button) => labels.includes(button.getAttribute("aria-label").toLowerCase()));
  }

  let closeTimer;
  cleanups.push(() => clearTimeout(closeTimer));
  function closeNowPlaying() {
    const panel = document.querySelector("#Desktop_PanelContainer_Id");
    const wrapper = panel?.closest(".Root__top-container > div");
    // The panel keeps its label after it closes; while it's open its edge has a resize handle.
    const open =
      Boolean(wrapper?.querySelector(".LayoutResizer__resize-bar")) && !inCinema() && panel.getAttribute("aria-label") === nowPlayingLabel();
    for (const element of document.querySelectorAll("[data-lushy-npv]")) if (!open || element !== wrapper) element.removeAttribute("data-lushy-npv");
    if (!open) return;
    wrapper?.setAttribute("data-lushy-npv", "");
    // Spotify changes the page constantly, so a close already on its way isn't pushed back.
    if (closeTimer) return;
    closeTimer = setTimeout(() => {
      closeTimer = 0;
      const hide = label("web-player.now-playing-view.hide", "Hide Now Playing view");
      document.querySelector(`#Desktop_PanelContainer_Id button[aria-label="${CSS.escape(hide)}"]`)?.click();
    }, 50);
  }

  listen(document, "click", (event) => {
    const cover = event.target.closest?.(".main-nowPlayingBar-left button");
    if (cover?.getAttribute("aria-label") !== nowPlayingLabel()) return;
    const button = fullscreenButton();
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    button.click();
  }, true);

  // Leaving full screen (its Exit button or Esc) goes back to the app, as in Lushy, rather than to
  // the windowed Now Playing view Spotify drops into.
  listen(document, "fullscreenchange", () => {
    const full = Boolean(document.fullscreenElement);
    root.classList.toggle("lushy-fullscreen", full);
    if (full) return;
    const minimise = label("web-player.cinema-mode.minimize", "Minimize Now Playing view");
    let tries = 0;
    const leave = () => {
      if (!inCinema() || ++tries > 20) return;
      const button = document.querySelector(`[data-lushy-cinema] button[aria-label="${CSS.escape(minimise)}"]`);
      if (button) button.click();
      else setTimeout(leave, 100);
    };
    setTimeout(leave, 100);
  });

  // The background comes bright (the default) or dark, chosen under "Lushy background" in the
  // profile menu and remembered on this computer.

  const BACKGROUND_KEY = "lushy:background";
  let brightItem;
  let darkItem;
  function setBackground(mode) {
    root.dataset.lushyBackground = mode;
    try {
      localStorage.setItem(BACKGROUND_KEY, mode);
    } catch {
      // Storage unavailable; the choice lasts until Spotify restarts.
    }
    brightItem?.setState(mode === "bright");
    darkItem?.setState(mode === "dark");
  }
  if (S.Menu?.SubMenu) {
    brightItem = new S.Menu.Item("Bright", false, () => setBackground("bright"));
    darkItem = new S.Menu.Item("Dark", false, () => setBackground("dark"));
    const backgroundMenu = new S.Menu.SubMenu("Lushy background", [brightItem, darkItem]);
    backgroundMenu.register();
    cleanups.push(() => backgroundMenu.deregister());
  }
  let savedBackground = "bright";
  try {
    savedBackground = localStorage.getItem(BACKGROUND_KEY) === "dark" ? "dark" : "bright";
  } catch {
    // Storage unavailable; bright it is.
  }
  setBackground(savedBackground);

  // Spicetify's Home config (profile menu, on Home) sticks sections to the top, lowers them to the
  // bottom and moves them, but has no way back. Its toolbar gets a Reset that puts every section
  // back where Spotify had it. It works through Home config's own Unstick and Unlower buttons, so
  // the layout Home config remembers and the page stay in step. The first click asks; a second
  // within a few seconds resets.

  const HOME_CONFIG_KEYS = ["spicetify-home-config:stick", "spicetify-home-config:low"];
  const HOME_RESET_CONFIRM_MS = 4000;
  const homeConfigUris = () => {
    try {
      return HOME_CONFIG_KEYS.flatMap((key) => (localStorage.getItem(key) || "").split(",").filter(Boolean));
    } catch {
      return [];
    }
  };
  const resetButton = document.createElement("button");
  resetButton.className = "lushy-home-reset";
  resetButton.title = "Put every section back where Spotify had it";
  let resetTimer;
  cleanups.push(() => {
    clearTimeout(resetTimer);
    resetButton.remove();
  });
  function armReset(armed) {
    clearTimeout(resetTimer);
    resetButton.classList.toggle("is-armed", armed);
    resetButton.textContent = armed ? "Reset all?" : "Reset";
    if (armed) resetTimer = setTimeout(() => armReset(false), HOME_RESET_CONFIRM_MS);
  }
  armReset(false);
  function resetHome() {
    const toolbar = resetButton.parentElement;
    const home = document.querySelector(".main-gridContainer-homepageContent, .main-home-content");
    for (const uri of homeConfigUris()) {
      const section = [...(home?.querySelectorAll(":scope > section") ?? [])].find((element) => element.dataset.uri === uri);
      if (!section || !toolbar) continue;
      // Hovering a section is what points Home config's buttons at it.
      section.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      [...toolbar.querySelectorAll("button")].find((button) => /^Un(stick|lower)$/.test(button.textContent))?.click();
    }
    // Anything left over belongs to sections Home no longer shows.
    try {
      HOME_CONFIG_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage unavailable; nothing was saved to clear.
    }
  }
  resetButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!resetButton.classList.contains("is-armed")) {
      armReset(true);
      return;
    }
    armReset(false);
    resetHome();
  });
  // Home config shows its toolbar on the section under the mouse.
  listen(document, "mouseover", () => {
    const toolbar = document.getElementById("spicetify-home-config");
    if (!toolbar) return;
    if (resetButton.parentElement !== toolbar) toolbar.append(resetButton);
    resetButton.disabled = homeConfigUris().length === 0;
  });

  // Start.

  const topContainer = document.querySelector(".Root__top-container") ?? document.querySelector("#Desktop_LeftSidebar_Id").parentElement;
  watch(new MutationObserver(() => {
    mountNav();
    syncNav();
  }), topContainer, { childList: true });
  watch(new MutationObserver(syncCinema), root, { attributes: true });
  watch(new MutationObserver((records) => {
    // The full-screen progress ticks inside the view; that's not Spotify changing it.
    if (records.every((record) => info.contains(record.target))) return;
    if (root.classList.contains("lushy-cinema")) syncCinema();
    closeNowPlaying();
  }), topContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
  // Clicking Spotify's own filter chips changes which link is lit.
  listen(document, "click", () => setTimeout(syncNav, 100));
  const unlisten = History.listen(() => {
    syncNav();
    syncBackdrop();
  });
  if (typeof unlisten === "function") cleanups.push(unlisten);
  const onSong = () => {
    updateTint();
    updateInfo();
    syncBackdrop();
  };
  S.Player.addEventListener("songchange", onSong);
  S.Player.addEventListener("onplaypause", onSong);
  cleanups.push(() => {
    S.Player.removeEventListener?.("songchange", onSong);
    S.Player.removeEventListener?.("onplaypause", onSong);
  });
  // Right after Spotify starts the playing song may not be known yet; look again for a few seconds.
  let songTries = 0;
  const firstSong = () => {
    if (playingCover()) onSong();
    else if (++songTries < 30) setTimeout(firstSong, 500);
  };

  mountNav();
  syncNav();
  updateInfo();
  showBackdrop(undefined);
  syncCinema();
  syncBackdrop();
  firstSong();
  closeNowPlaying();
})();
