// Magazine overlay controller: open/close, left/right page navigation,
// closes with E key, Escape, or clicking the backdrop / the page itself.
export class Magazine {
  constructor(onClosed) {
    this.root = document.getElementById("magazine");
    this.pageEl = document.getElementById("mag-page");
    this.titleEl = document.getElementById("mag-title");
    this.kickerEl = document.getElementById("mag-kicker");
    this.counterEl = document.getElementById("mag-counter");
    this.prevBtn = document.getElementById("mag-prev");
    this.nextBtn = document.getElementById("mag-next");
    this.onClosed = onClosed;

    this.open = false;
    this.openedAt = 0;
    this.pages = [];
    this.index = 0;

    this.prevBtn.addEventListener("click", (e) => { e.stopPropagation(); this.prev(); });
    this.nextBtn.addEventListener("click", (e) => { e.stopPropagation(); this.next(); });
    document.getElementById("mag-close").addEventListener("click", (e) => { e.stopPropagation(); this.close(); });
    this.root.querySelector(".mag-backdrop").addEventListener("click", () => this.close());
    // clicking anywhere on the page area also closes (per spec: "close with mouse click"),
    // but let text selection users click-drag without instantly closing:
    this.pageEl.addEventListener("mouseup", (e) => {
      if (e.target.closest("button, a, .mag-nav")) return;
      // The very click (or keypress) that opened the magazine also delivers a
      // mouseup a moment later, now over the freshly-shown overlay. Without
      // this guard the magazine flashes open and shuts again.
      if (performance.now() - this.openedAt < 350) return;
      this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (!this.open) return;
      // the overlay consumes these keys: no other handler may react
      // (prevents the same E keypress that closes the magazine from
      // immediately re-triggering the exhibit behind it)
      if (["ArrowRight", "ArrowLeft", "l", "h", "e", "E", "Escape"].includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      if (e.key === "ArrowRight" || e.key === "l") this.next();
      else if (e.key === "ArrowLeft" || e.key === "h") this.prev();
      else if (e.key === "e" || e.key === "E" || e.key === "Escape") this.close();
    });
  }

  show({ kicker, title, pages, startAt = 0 }) {
    this.pages = pages;
    this.index = startAt;
    this.kickerEl.textContent = kicker;
    this.titleEl.textContent = title;
    this.open = true;
    this.openedAt = performance.now();
    this.root.classList.remove("hidden");
    this.render();
  }

  render() {
    const page = this.pages[this.index];
    this.pageEl.style.animation = "none";
    void this.pageEl.offsetWidth; // restart page transition
    this.pageEl.style.animation = "";
    this.pageEl.innerHTML = page.html;
    this.pageEl.scrollTop = 0;
    this.counterEl.textContent = `PAGE ${this.index + 1} / ${this.pages.length}`;
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.disabled = this.index === this.pages.length - 1;
  }

  next() { if (this.open && this.index < this.pages.length - 1) { this.index++; this.render(); } }
  prev() { if (this.open && this.index > 0) { this.index--; this.render(); } }

  close() {
    if (!this.open) return;
    if (performance.now() - this.openedAt < 120) return;   // ignore the opening click
    this.open = false;
    this.root.classList.add("hidden");
    this.onClosed?.();
  }
}
