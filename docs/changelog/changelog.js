// The changelog page: marks the release on screen in the versions list, and folds that list away on a phone.
(() => {
  const links = new Map(
    [...document.querySelectorAll(".toc nav a")].map((link) => [link.getAttribute("href").slice(1), link]),
  );
  const targets = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  const toc = document.querySelector(".toc");
  const details = document.querySelector(".toc details");
  const narrow = () => window.matchMedia("(max-width: 980px)").matches;
  let frame = null;

  // The current release is the last one whose top has passed under the header.
  const update = () => {
    frame = null;

    const current = targets.filter((target) => target.getBoundingClientRect().top <= 140).at(-1) ?? targets[0];

    for (const [id, link] of links) {
      link.classList.toggle("active", id === current?.id);
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

  for (const link of links.values()) {
    link.addEventListener("click", () => {
      if (narrow() && details !== null) {
        details.open = false;
      }
    });
  }

  if (narrow() && details !== null && toc !== null) {
    details.open = false;
  }
})();
