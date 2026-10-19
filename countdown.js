/* Live-Countdown im Klapp-Uhr-Stil fuer das Gewinnspiel. Jedes Element mit class="flipcd" wird befuellt.
   Phasen (MEZ): bis 19.11. "Starts in", bis 18.12. "Entries close in", bis 24.12. 18:00 "Winner revealed in". */
(function () {
  const PHASES = [
    [new Date("2026-11-19T00:00:00+01:00"), "Giveaway starts in"],
    [new Date("2026-12-18T00:00:00+01:00"), "Entries close in"],
    [new Date("2026-12-24T18:00:00+01:00"), "Winner revealed in"],
  ];
  const UNITS = [["d", "Days"], ["h", "Hours"], ["m", "Minutes"], ["s", "Seconds"]];

  function build(root) {
    root.innerHTML = `<div class="fc-label"></div><div class="fc-row">${UNITS.map(([k, name]) =>
      `<div class="fc-unit"><div class="fc-tile" data-k="${k}"><span>00</span></div><div class="fc-name">${name}</div></div>`).join("")}</div>`;
  }

  function parts(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  }

  function tick(root) {
    const now = new Date();
    const phase = PHASES.find(([t]) => now < t);
    if (!phase) {
      root.querySelector(".fc-label").textContent = "Giveaway ended – thanks for taking part!";
      root.querySelector(".fc-row").style.display = "none";
      return;
    }
    root.querySelector(".fc-label").textContent = phase[1];
    const p = parts(phase[0] - now);
    for (const [k] of UNITS) {
      const tile = root.querySelector(`.fc-tile[data-k="${k}"]`);
      const val = String(p[k]).padStart(2, "0");
      const span = tile.querySelector("span");
      if (span.textContent !== val) {
        span.textContent = val;
        tile.classList.remove("flip");
        void tile.offsetWidth; // Animation neu starten
        tile.classList.add("flip");
      }
    }
  }

  document.querySelectorAll(".flipcd").forEach(root => {
    build(root);
    tick(root);
    setInterval(() => tick(root), 1000);
  });
})();
