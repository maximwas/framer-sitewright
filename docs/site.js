/* Sitewright site: copy buttons, and the motion that Motion (motion.dev, vendor/) runs. */
const TAGS = {
  plugin: "Plugin API",
  server: "Server API",
  agent: "Framer agent",
};

const ICONS = {
  section:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h8M8 16h5"/></svg>',
  globe:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>',
  devices:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="14" height="10" rx="2"/><rect x="17" y="9" width="5" height="10" rx="1.5"/><path d="M6 19h6"/></svg>',
  component:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l4 4-4 4-4-4zM6 8l4 4-4 4-4-4zM18 8l4 4-4 4-4-4zM12 14l4 4-4 4-4-4z"/></svg>',
  audit:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11l2 2 4-4"/></svg>',
  image:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>',
  cms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
};

/** What the agent keeps doing in the hero's journal, with the chips of what each change touched. */
const FEED = [
  {
    icon: "globe",
    title: "Translations",
    tag: "plugin",
    meta: "Dutch · 48 written",
    chips: [["text", "globe", "Dutch"]],
  },
  {
    icon: "devices",
    title: "Breakpoints",
    tag: "plugin",
    meta: "Tablet 810, Phone 390 · 2 added",
    chips: [
      ["layout", "devices", "Tablet"],
      ["layout", "devices", "Phone"],
    ],
  },
  {
    icon: "component",
    title: "Button",
    tag: "agent",
    meta: "Hover and pressed variants · 3 created",
    chips: [["components", "component", "Buttons/Button"]],
  },
  {
    icon: "image",
    title: "Images",
    tag: "server",
    meta: "3 photos uploaded · Gallery",
    chips: [["layout", "image", "Gallery"]],
  },
  { icon: "audit", title: "Layout audit", tag: "plugin", meta: "Page / · no defects", chips: [] },
  {
    icon: "section",
    title: "Pricing section",
    tag: "agent",
    meta: "22 layers created · audit: no defects",
    chips: [["layout", "section", "Pricing"]],
  },
  {
    icon: "cms",
    title: "CMS fields",
    tag: "plugin",
    meta: "Blog · Cover, Author added",
    chips: [["content", "cms", "Blog"]],
  },
];

(() => {
  const root = document.documentElement;
  const header = document.querySelector("header.top");

  clearTimeout(window.sitewrightFallback);
  setupCopy();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const Motion = window.Motion;

  if (Motion === undefined || reduced) {
    root.classList.remove("js");
    window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 8), { passive: true });

    return;
  }

  const { animate, inView, scroll, stagger, hover } = Motion;
  const ease = [0.22, 1, 0.36, 1];
  const spring = { type: "spring", stiffness: 380, damping: 22 };

  hero();
  journal();
  scrolling();
  reveals();
  features();
  faq();

  function hero() {
    animate(
      "[data-hero]",
      { opacity: [0, 1], y: [24, 0] },
      { delay: stagger(0.09, { startDelay: 0.1 }), duration: 0.9, ease },
    );
    typeCommand(document.getElementById("install"), 0.75);

    const area = document.querySelector(".hero");
    const glow = document.querySelector(".hero-glow");
    const box = area.getBoundingClientRect();
    let target = { x: box.width * 0.7, y: box.height * 0.3 };
    const current = { ...target };
    let frame = null;

    // The glow trails the pointer a little, like a cursor on the canvas. It moves by transform, so nothing repaints,
    // and the loop stops once it has caught up.
    const step = () => {
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      glow.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      frame =
        Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.5 ? requestAnimationFrame(step) : null;
    };

    step();
    area.addEventListener("pointermove", (event) => {
      const bounds = area.getBoundingClientRect();

      target = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      if (frame === null) {
        frame = requestAnimationFrame(step);
      }
    });
  }

  /** Types the command out once, then leaves a caret blinking for a while. */
  function typeCommand(code, delay) {
    const full = code.textContent;

    code.dataset.text = full;
    // The whole command's width from the start, so nothing beside it moves while it types.
    code.style.minWidth = `calc(${code.getBoundingClientRect().width}px + 0.55em + 2px)`;
    code.textContent = "";
    code.classList.add("typing");
    animate(0, full.length, {
      delay,
      duration: 1.1,
      ease: "linear",
      onUpdate: (value) => {
        code.textContent = full.slice(0, Math.round(value));
      },
    }).then(() => setTimeout(() => code.classList.remove("typing"), 2600));
  }

  /** The journal window: it comes in, then the agent keeps working and the newest change can be undone. */
  function journal() {
    const window_ = document.querySelector(".window");
    const list = window_.querySelector(".entries");
    const viewport = window_.querySelector(".feed");
    const toast = window_.querySelector(".toast");
    const pool = FEED.map((item) => ({ ...item }));
    let next = 0;
    let minutes = 12 * 60 + 4;
    let running = false;
    let busy = false;
    let timer = null;

    animate(
      window_,
      { opacity: [0, 1], y: [48, 0], rotateX: [14, 0], scale: [0.96, 1] },
      { duration: 1.1, delay: 0.35, ease },
    );
    animate(
      list.children,
      { opacity: [0, 1], x: [-14, 0] },
      { delay: stagger(0.08, { from: "last", startDelay: 0.75 }), duration: 0.5, ease },
    );
    animate(
      window_.querySelector(".dot i"),
      { scale: [1, 2.6], opacity: [0.5, 0] },
      { duration: 1.6, repeat: Infinity, ease: "easeOut" },
    );

    // The viewport keeps its height: new rows push the old ones out at the bottom.
    viewport.style.height = `${viewport.offsetHeight}px`;
    viewport.classList.add("live");

    inView(window_, () => {
      running = true;
      schedule(4500);

      return () => {
        running = false;
        clearTimeout(timer);
      };
    });

    list.addEventListener("click", (event) => {
      const button = event.target.closest(".undo");

      if (button !== null) {
        undo(button.closest(".entry"));
      }
    });

    function schedule(ms) {
      clearTimeout(timer);

      if (running) {
        timer = setTimeout(push, ms);
      }
    }

    async function push() {
      if (document.hidden) {
        schedule(1000);

        return;
      }

      if (busy) {
        schedule(800);

        return;
      }

      busy = true;

      const item = pool[next % pool.length];
      const top = list.querySelector(".entry.hl");

      next += 1;
      minutes += 1 + (next % 3);

      if (top !== null) {
        demote(top);
      }

      const row = entry(item, clock(minutes));

      promote(row);
      row.style.opacity = "0";
      list.prepend(row);
      await slide(-row.offsetHeight, row);
      prune();
      busy = false;
      schedule(3200);
    }

    async function undo(row) {
      if (busy) {
        return;
      }

      busy = true;
      clearTimeout(timer);

      const title = row.querySelector(".name").textContent;

      const height = row.offsetHeight;

      await animate(row, { opacity: 0, x: 48 }, { duration: 0.35, ease });
      row.remove();
      await slide(height, null);

      const newest = list.querySelector(".entry");

      if (newest !== null) {
        promote(newest);
      }

      toast.textContent = `Undone: ${title}`;
      await animate(toast, { opacity: [0, 1], y: [16, 0], x: "-50%" }, spring);
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await animate(toast, { opacity: 0, y: 10, x: "-50%" }, { duration: 0.3 });
      toast.textContent = "";
      busy = false;
      schedule(1400);
    }

    /**
     * The rows below a change glide into place: the list jumps by `offset` and moves back by transform, so the layout
     * never animates; a new row fades in as the others make room.
     */
    async function slide(offset, row) {
      const moving = animate(list, { y: [offset, 0] }, { duration: 0.55, ease });

      if (row !== null) {
        animate(row, { opacity: [0, 1], x: [-10, 0] }, { duration: 0.45, delay: 0.15, ease });
      }

      await moving;
    }

    function prune() {
      for (const row of [...list.children]) {
        if (row.offsetTop > viewport.clientHeight) {
          row.remove();
        }
      }
    }

    /** The newest change: highlighted, its time with an Undo under it, as in the journal. */
    function promote(row) {
      row.classList.add("hl");

      const time = document.createElement("time");
      const button = document.createElement("button");

      time.textContent = row.dataset.time ?? "";
      button.className = "undo";
      button.type = "button";
      button.textContent = "Undo";
      row.querySelector(".side")?.replaceChildren(time, button);
    }

    function demote(row) {
      row.classList.remove("hl");

      const time = document.createElement("time");

      time.textContent = row.dataset.time ?? "";
      row.querySelector(".side")?.replaceChildren(time);
    }
  }

  function entry(item, time) {
    const row = document.createElement("li");

    row.className = "entry";
    row.dataset.time = time;
    const chips = item.chips
      .map(([kind, icon, label]) => `<span class="chip ${kind}">${ICONS[icon]}${label}</span>`)
      .join("");

    row.innerHTML = `
      <span class="icon" aria-hidden="true">${ICONS[item.icon]}</span>
      <span class="body">
        <span class="title"><span class="name"></span> <span class="tag ${item.tag}">${TAGS[item.tag]}</span></span>
        <span class="meta"></span>
        ${chips === "" ? "" : `<span class="chips">${chips}</span>`}
      </span>
      <span class="side"></span>`;
    row.querySelector(".name").textContent = item.title;
    row.querySelector(".meta").textContent = item.meta;

    return row;
  }

  function clock(minutes) {
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  }

  function scrolling() {
    scroll(animate(".progress", { scaleX: [0, 1] }, { ease: "linear" }));
    scroll((_progress, info) => header.classList.toggle("scrolled", info.y.current > 8));

    const area = document.querySelector(".hero");

    scroll(animate(".hero-grid", { y: [0, 140] }, { ease: "linear" }), {
      target: area,
      offset: ["start start", "end start"],
    });
    scroll(animate(".stage", { y: [0, -60], rotate: [0, -1.5] }, { ease: "linear" }), {
      target: area,
      offset: ["start start", "end start"],
    });
  }

  /** Sections come in as they scroll into view, their parts one after another. */
  function reveals() {
    const parts = [
      ":scope > .kicker",
      ":scope > h2",
      ":scope > .intro",
      ":scope > .flow > *",
      ":scope > ol.steps > li",
      ":scope > .features > .feature",
      ":scope > .table",
      ":scope > .note",
      ":scope > .tools > .group",
      ":scope > div > .kicker",
      ":scope > div > h2",
      ":scope > div > .intro",
      ":scope > .checks > li",
      ":scope > .faq > details",
      ":scope > .cta",
    ].join(", ");

    for (const wrap of document.querySelectorAll("main section > .wrap")) {
      const items = wrap.querySelectorAll(parts);

      // site.css hides these before the first paint (html.js), so nothing shows and then vanishes.
      const chips = wrap.querySelectorAll("ul.chips li");

      inView(
        wrap,
        () => {
          animate(items, { opacity: [0, 1], y: [24, 0] }, { delay: stagger(0.06), duration: 0.75, ease });

          if (chips.length > 0) {
            animate(
              chips,
              { opacity: [0, 1], scale: [0.85, 1] },
              { delay: stagger(0.012, { startDelay: 0.3 }), ...spring },
            );
          }
        },
        { amount: 0.12 },
      );
    }

    for (const counter of document.querySelectorAll("[data-count]")) {
      const end = Number(counter.dataset.count);

      inView(counter, () => {
        animate(0, end, {
          duration: 1.4,
          ease,
          onUpdate: (value) => {
            counter.textContent = String(Math.round(value));
          },
        });
      });
    }
  }

  function features() {
    const grid = document.querySelector(".features");

    grid.addEventListener("pointermove", (event) => {
      const card = event.target.closest(".feature");

      if (card !== null) {
        const box = card.getBoundingClientRect();

        card.style.setProperty("--mx", `${event.clientX - box.left}px`);
        card.style.setProperty("--my", `${event.clientY - box.top}px`);
      }
    });

    hover(".feature, .group, ol.steps li", (card) => {
      const icon = card.querySelector(".icon") ?? card;

      animate(icon, icon === card ? { y: -4 } : { scale: 1.15, rotate: -8 }, spring);

      return () => animate(icon, icon === card ? { y: 0 } : { scale: 1, rotate: 0 }, spring);
    });
  }

  /** FAQ answers open and close by height instead of popping. */
  function faq() {
    for (const details of document.querySelectorAll(".faq details")) {
      const summary = details.querySelector("summary");
      const answer = details.querySelector(".answer");

      summary.addEventListener("click", async (event) => {
        event.preventDefault();

        if (details.open) {
          details.classList.add("closing");
          await animate(answer, { height: [answer.offsetHeight, 0], opacity: [1, 0] }, { duration: 0.35, ease });
          details.open = false;
          details.classList.remove("closing");
          answer.style.height = "";
          answer.style.opacity = "";

          return;
        }

        details.open = true;

        const height = answer.offsetHeight;

        await animate(answer, { height: [0, height], opacity: [0, 1] }, { duration: 0.45, ease });
        answer.style.height = "";
      });
    }
  }

  function setupCopy() {
    for (const button of document.querySelectorAll("[data-copy]")) {
      button.addEventListener("click", async () => {
        const code = document.getElementById(button.dataset.copy);
        const text = code?.dataset.text ?? code?.textContent ?? "";

        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "Copied ✓";
          button.classList.add("done");
          window.Motion?.animate(button, { scale: [0.9, 1] }, { type: "spring", stiffness: 500, damping: 15 });
        } catch {
          button.textContent = "Select it";
        }

        setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("done");
        }, 1600);
      });
    }
  }
})();
