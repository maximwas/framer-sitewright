/* Sitewright docs: the tool filter, the table of contents following the page, and copy buttons on code blocks. */
(() => {
  filterTools();
  followSections();
  copyButtons();

  function filterTools() {
    const input = document.querySelector(".search input");
    const empty = document.querySelector(".search-empty");
    const groups = [...document.querySelectorAll("[data-group]")];

    input.addEventListener("input", () => {
      const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;

      for (const group of groups) {
        let inGroup = 0;

        for (const tool of group.querySelectorAll("[data-tool]")) {
          const match = words.every((word) => tool.dataset.tool.toLowerCase().includes(word));

          tool.hidden = !match;
          inGroup += match ? 1 : 0;
        }

        group.hidden = inGroup === 0;
        shown += inGroup;
      }

      empty.hidden = shown > 0;
    });
  }

  /** Marks the section on screen in the table of contents. */
  function followSections() {
    const links = new Map(
      [...document.querySelectorAll(".toc nav a")].map((link) => [link.getAttribute("href").slice(1), link]),
    );
    const targets = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    let frame = null;

    // The current section is the last one whose top has passed under the header; sections nest (the tool groups sit
    // inside "All tools"), so the deepest one wins. Filtered-out groups have no box and are skipped.
    const update = () => {
      frame = null;

      const passed = targets.filter(
        (target) => target.offsetParent !== null && target.getBoundingClientRect().top <= 120,
      );
      const current = passed.at(-1) ?? targets[0];

      for (const [id, link] of links) {
        link.classList.toggle("active", id === current.id);
      }

      // Keep the current link in sight within the contents, without scrolling the page.
      const link = links.get(current.id);
      const toc = document.querySelector(".toc");

      if (link !== undefined && toc.scrollHeight > toc.clientHeight) {
        const top = link.offsetTop - toc.offsetTop;

        if (top < toc.scrollTop || top + link.offsetHeight > toc.scrollTop + toc.clientHeight) {
          toc.scrollTop = top - toc.clientHeight / 3;
        }
      }
    };

    window.addEventListener(
      "scroll",
      () => {
        if (frame === null) {
          frame = requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    update();

    // On a phone the contents fold away once a link is picked.
    const details = document.querySelector(".toc details");

    for (const link of links.values()) {
      link.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 980px)").matches) {
          details.open = false;
        }
      });
    }

    if (window.matchMedia("(max-width: 980px)").matches) {
      details.open = false;
    }
  }

  function copyButtons() {
    for (const pre of document.querySelectorAll(".prose pre")) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "copy";
      button.textContent = "Copy";
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector("code").textContent);
          button.textContent = "Copied ✓";
          button.classList.add("done");
        } catch {
          button.textContent = "Select it";
        }

        setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("done");
        }, 1600);
      });
      pre.append(button);
    }
  }
})();
