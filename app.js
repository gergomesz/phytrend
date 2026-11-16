(function () {
  "use strict";
  const D = window.DATA;
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";

  /* ---------------- theme + explain boxes (same as Noto) ---------------- */
  (function themeToggle() {
    const btn = $("theme-toggle"); if (!btn) return;
    const root = document.documentElement;
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    let stored = null;
    try { stored = localStorage.getItem("phyto-theme"); } catch (e) {}
    if (stored === "dark" || stored === "light") root.setAttribute("data-theme", stored);
    const current = () => root.getAttribute("data-theme") || (mq && mq.matches ? "dark" : "light");
    const label = () => { const dark = current() === "dark"; btn.setAttribute("aria-pressed", String(dark)); btn.querySelector("span").textContent = dark ? "Light mode" : "Dark mode"; };
    btn.addEventListener("click", () => { const n = current() === "dark" ? "light" : "dark"; root.setAttribute("data-theme", n); try { localStorage.setItem("phyto-theme", n); } catch (e) {} label(); });
    if (mq && mq.addEventListener) mq.addEventListener("change", label);
    label();
  })();
  document.querySelectorAll(".eli-btn").forEach((b) => b.addEventListener("click", () => {
    const p = $(b.getAttribute("aria-controls")); if (!p) return;
    const open = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", String(open)); p.hidden = !open;
  }));
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function drawOn(root) {
    if (REDUCED || !root) return;
    root.querySelectorAll("[data-draw]").forEach((p) => {
      if (!p.getTotalLength) return; const L = p.getTotalLength();
      p.style.transition = "none"; p.style.strokeDasharray = L + " " + L; p.style.strokeDashoffset = L; p.getBoundingClientRect();
      requestAnimationFrame(() => { p.style.transition = ""; p.style.strokeDashoffset = 0;
        const done = () => { p.style.strokeDasharray = ""; p.style.strokeDashoffset = ""; };
        p.addEventListener("transitionend", done, { once: true }); setTimeout(done, 2200); });
    });
  }
  document.querySelectorAll("[data-replay]").forEach((b) => b.addEventListener("click", () => drawOn($(b.dataset.replay))));
  const BOX = { gyre: [-170, 20, -140, 30], chukchi: [-180, 66, -157, 75], barents: [20, 70, 60, 80], kilauea: [-155, 18.5, -153.5, 20], tonga: [-176, -22, -174, -20], kasatochi: [-155, 48, -135, 58], raikoke: [155, 45, 170, 55] };
  const focus = (k, lab) => { if (window.phytoGlobe && BOX[k]) window.phytoGlobe.focus(BOX[k], lab); };

  /* ---------------- statistics ---------------- */
  function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
  const ncdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  const median = (a) => { const s = a.slice().sort((p, q) => p - q), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)); };
  function ties(a) { const c = {}; a.forEach((v) => (c[v] = (c[v] || 0) + 1)); return Object.values(c); }
  function mannKendall(y) {
    const n = y.length; let S = 0;
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) S += Math.sign(y[j] - y[i]);
    const v = (n * (n - 1) * (2 * n + 5) - ties(y).reduce((s, t) => s + t * (t - 1) * (2 * t + 5), 0)) / 18;
    const z = S === 0 ? 0 : (S - Math.sign(S)) / Math.sqrt(v);
    return { S, z, p: 2 * (1 - ncdf(Math.abs(z))) };
  }
  function sen(x, y) { // mirrors scipy.stats.theilslopes (95% CI)
    const sl = [];
    for (let i = 0; i < x.length; i++) for (let j = 0; j < x.length; j++) if (x[i] - x[j] > 0) sl.push((y[i] - y[j]) / (x[i] - x[j]));
    sl.sort((a, b) => a - b);
    const b = median(sl), a = median(y) - b * median(x), n = y.length, nt = sl.length;
    const sig = Math.sqrt((n * (n - 1) * (2 * n + 5) - ties(x).reduce((s, t) => s + t * (t - 1) * (2 * t + 5), 0)) / 18);
    const z = -1.959963984540054;
    const ru = Math.min(Math.round((nt - z * sig) / 2), nt - 1), rl = Math.max(Math.round((nt + z * sig) / 2) - 1, 0);
    return { b, a, lo: sl[rl], hi: sl[ru] };
  }
  function chi2sfEven(x, df) { let s = 0, t = 1; for (let k = 0; k < df / 2; k++) { if (k) t *= (x / 2) / k; s += t; } return Math.exp(-x / 2) * s; }

  /* ---------------- data helpers ---------------- */
  const rows = (key) => D[key].filter((r) => r[1] !== null).map((r) => { const d = new Date(r[0] + "T00:00:00Z"); return { d, y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, v: r[1] }; });
  function annual(rs, o) {
    let r = rs.filter((x) => !o.months || o.months.includes(x.m));
    r.forEach((x) => (x.t = o.log ? Math.log10(x.v) : x.v));
    const clim = {}; r.forEach((x) => (clim[x.m] = clim[x.m] || []).push(x.t));
    Object.keys(clim).forEach((k) => (clim[k] = mean(clim[k])));
    r.forEach((x) => (x.a = x.t - clim[x.m]));
    const by = {}; r.forEach((x) => (by[x.y] = by[x.y] || []).push(x.a));
    const out = [];
    Object.keys(by).map(Number).sort((a, b) => a - b).forEach((y) => {
      if (y < o.y0 || y > o.y1) return; if (o.full && by[y].length < 12) return;
      out.push({ x: y, y: mean(by[y]) });
    });
    return { pts: out, monthly: r };
  }
  function analyse(cfg) {
    const A = annual(rows(cfg.key), cfg), x = A.pts.map((p) => p.x), y = A.pts.map((p) => p.y);
    const mk = mannKendall(y), s = sen(x, y);
    const toDisp = (v) => (cfg.log ? (Math.pow(10, v) - 1) * 100 : v);
    const rate = (b) => (cfg.log ? (Math.pow(10, b * 10) - 1) * 100 : b * 10);
    return { cfg, A, mk, s, rate: rate(s.b), lo: rate(s.lo), hi: rate(s.hi), toDisp };
  }

  const REG = {
    chl: { label: "Chlorophyll-a", def: "The green pigment inside phytoplankton, measured by the colour of the sea from space. More chlorophyll means more phytoplankton (milligrams per cubic metre).",
      regions: {
        gyre: { key: "chl_gyre", name: "North Pacific Gyre", box: "20–30°N, 140–170°W", log: true, y0: 2003, y1: 2025 },
        chukchi: { key: "chl_chukchi", name: "Chukchi Sea (Arctic)", box: "66–75°N, 157–180°W", log: true, months: [5, 6, 7, 8, 9], y0: 2003, y1: 2025 },
        barents: { key: "chl_barents", name: "Barents Sea (Arctic)", box: "70–80°N, 20–60°E", log: true, months: [4, 5, 6, 7, 8, 9], y0: 2003, y1: 2025 } } },
    sst: { label: "Sea surface temperature", def: "The temperature of the top layer of the ocean, measured by MODIS-Aqua from its thermal infrared signal (°C).",
      regions: { gyre: { key: "sst_gyre", name: "North Pacific Gyre", box: "20–30°N, 140–170°W", log: false, unit: "°C", y0: 2003, y1: 2025 } } },
    ice: { label: "Sea-ice extent", def: "The area of ocean covered by at least 15 per cent ice, from NSIDC's Sea Ice Index (thousand square kilometres).",
      regions: {
        chukchi: { key: "ice_chukchi", name: "Chukchi Sea (Arctic)", box: "NSIDC region", log: false, unit: "k km²", full: true, y0: 1979, y1: 2025 },
        barents: { key: "ice_barents", name: "Barents Sea (Arctic)", box: "NSIDC region", log: false, unit: "k km²", full: true, y0: 1979, y1: 2025 } } }
  };

  /* ---------------- charts ---------------- */
  const fmtN = (v, d) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d);
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function niceTicks(lo, hi, n) { const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))); const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= step0); const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out; }
  /* opts: {series:[{pts:[{x,y,lbl}],cls,dots}], trend:{x0,y0,x1,y1}, band:[{x,lo,hi}], spans:[[x0,x1]], xFmt, yFmt, yLabel, H, zero, tip} */
  function chart(host, o) {
    host.innerHTML = "";
    const W = 1000, H = o.H || 360, L = o.L || 64, R = o.R || 36, T = 16, B = o.B || 40, DY = o.DY || 18;
    const all = [].concat(...o.series.map((s) => s.pts)).concat(o.band ? o.band.flatMap((b) => [{ x: b.x, y: b.lo }, { x: b.x, y: b.hi }]) : []);
    let xs = all.map((p) => p.x), ys = all.map((p) => p.y);
    if (o.trend) ys = ys.concat([o.trend.y0, o.trend.y1]);
    if (o.zero) ys.push(0);
    const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = Math.min(...ys), y1 = Math.max(...ys); const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad;
    const X = (v) => L + (v - x0) / (x1 - x0 || 1) * (W - L - R), Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.aria || "chart" }, host);
    niceTicks(y0, y1, 5).forEach((t) => { el("line", { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: "grid" }, svg); const tx = el("text", { x: L - 8, y: Y(t) + 3.5, "text-anchor": "end", class: "tick" }, svg); tx.textContent = (o.yFmt || ((v) => v))(t); });
    (o.xTicks || niceTicks(x0, x1, 7)).forEach((t) => { if (t < x0 || t > x1) return; el("line", { x1: X(t), x2: X(t), y1: H - B, y2: H - B + 5, class: "axis" }, svg); const tx = el("text", { x: X(t), y: H - B + DY, "text-anchor": "middle", class: "tick" }, svg); tx.textContent = (o.xFmt || ((v) => v))(t); });
    el("line", { x1: L, x2: W - R, y1: H - B, y2: H - B, class: "axis" }, svg);
    if (o.yLabel) { const t = el("text", { x: o.L ? 20 : 14, y: T + (H - T - B) / 2, transform: `rotate(-90 ${o.L ? 20 : 14} ${T + (H - T - B) / 2})`, "text-anchor": "middle", class: "lbl-sub" }, svg); t.textContent = o.yLabel; }
    (o.spans || []).forEach(([a, b, lab]) => { el("rect", { x: X(a), y: T, width: Math.max(2, X(b) - X(a)), height: H - T - B, class: "evspan" }, svg); if (lab) { const t = el("text", { x: X(a) + 6, y: T + 12, class: "lbl-sub" }, svg); t.textContent = lab; } });
    if (o.band) { const up = o.band.map((b) => `${X(b.x)},${Y(b.hi)}`), dn = o.band.slice().reverse().map((b) => `${X(b.x)},${Y(b.lo)}`); el("polygon", { points: up.concat(dn).join(" "), class: "band" }, svg); }
    if (o.zero && y0 < 0 && y1 > 0) el("line", { x1: L, x2: W - R, y1: Y(0), y2: Y(0), class: "zero" }, svg);
    o.series.forEach((s) => {
      if (s.line !== false) { let d = ""; let pen = false; s.pts.forEach((p, i) => { const gap = i && s.gap && p.x - s.pts[i - 1].x > s.gap; d += (pen && !gap ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.y).toFixed(1); pen = true; }); el("path", { d, class: "ser" + (s.cls ? " " + s.cls : "") }, svg); }
      if (s.dots) s.pts.forEach((p) => el("circle", { cx: X(p.x), cy: Y(p.y), r: s.r || 4.5, class: "pt" + (p.hl ? " hl" : "") }, svg));
    });
    if (o.trend) el("line", { x1: X(o.trend.x0), y1: Y(o.trend.y0), x2: X(o.trend.x1), y2: Y(o.trend.y1), class: "trend" }, svg);
    if (o.legend) o.legend.forEach((g, i) => { const t = el("text", { x: W - R, y: T + 12 + i * 14, "text-anchor": "end", class: "lbl-sub" }, svg); t.textContent = g; });
    // hover
    const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    const cross = el("line", { y1: T, y2: H - B, class: "cross", visibility: "hidden" }, svg);
    const hit = el("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" }, svg);
    const main = o.series[o.tipSeries || 0].pts;
    hit.addEventListener("mousemove", (ev) => {
      const r = svg.getBoundingClientRect(), vx = (ev.clientX - r.left) / r.width * W;
      let best = main[0]; main.forEach((p) => { if (Math.abs(X(p.x) - vx) < Math.abs(X(best.x) - vx)) best = p; });
      cross.setAttribute("x1", X(best.x)); cross.setAttribute("x2", X(best.x)); cross.setAttribute("visibility", "visible");
      tip.innerHTML = o.tip ? o.tip(best) : `<b>${best.x}</b><br>${best.y}`; tip.hidden = false;
      const px = X(best.x) / W * r.width, hr = host.getBoundingClientRect();
      tip.style.left = Math.min(px + 12, hr.width - 200) + "px"; tip.style.top = (Y(best.y) / H * r.height - 10) + "px";
    });
    hit.addEventListener("mouseleave", () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); });
  }
  function trendChart(host, R, extra) {
    const c = R.cfg, pts = R.A.pts.map((p) => ({ x: p.x, y: R.toDisp(p.y) }));
    const xa = pts[0].x, xb = pts[pts.length - 1].x;
    const ty = (x) => R.toDisp(R.s.a + R.s.b * x);
    chart(host, Object.assign({
      series: [{ pts, dots: true }], trend: { x0: xa, y0: ty(xa), x1: xb, y1: ty(xb) }, zero: true,
      yFmt: (v) => (c.log ? fmtN(v, 0) + "%" : fmtN(v, c.unit === "k km²" ? 0 : 1)),
      yLabel: c.log ? "% vs normal" : (c.unit || "") + " vs normal",
      tip: (p) => `<b>${p.x}</b><br>${c.log ? fmtN(p.y, 1) + "% vs normal" : fmtN(p.y, 2) + " " + c.unit + " vs normal"}`,
      aria: c.name + " yearly anomalies with trend"
    }, extra || {}));
  }
  const fmtP = (p) => (p < 0.001 ? "< 0.001" : p.toFixed(3));
  const pTxt = (p) => (p < 0.001 ? "p < 0.001" : "p = " + p.toFixed(3));
  const rateTxt = (R) => { const c = R.cfg; return c.log ? `${fmtN(R.rate, 1)}% per decade` : `${fmtN(R.rate, c.unit === "k km²" ? 0 : 2)} ${c.unit} per decade`; };
  const ciTxt = (R) => { const c = R.cfg, d = c.log ? 1 : (c.unit === "k km²" ? 0 : 2), u = c.log ? "%" : " " + c.unit; return `${fmtN(R.lo, d)} to ${fmtN(R.hi, d)}${u}`; };

  /* ---------------- 02 detector ---------------- */
  const vSel = $("det-var"), rSel = $("det-reg");
  function fillRegions() { const v = REG[vSel.value]; rSel.innerHTML = ""; Object.entries(v.regions).forEach(([k, r]) => { const o = document.createElement("option"); o.value = k; o.textContent = r.name; rSel.appendChild(o); }); }
  function runDetector() {
    const v = REG[vSel.value], c = Object.assign({}, v.regions[rSel.value]); c.name = c.name;
    const R = analyse(c);
    $("det-def").textContent = v.def;
    $("det-rate").textContent = rateTxt(R);
    $("det-tag").textContent = `${v.label} · ${c.name} · ${c.box}`;
    $("det-ci").textContent = `95% interval: ${ciTxt(R)} · Mann-Kendall ${pTxt(R.mk.p)} · ${R.A.pts.length} years (${c.y0}–${R.A.pts[R.A.pts.length - 1].x})`;
    const sig = R.mk.p < 0.05, b = $("det-verdict");
    b.className = "verdict" + (sig ? " sig" : "");
    b.innerHTML = `<i></i>${sig ? (R.rate > 0 ? "Significant rise" : "Significant decline") : (R.rate > 0 ? "Rising, not significant" : "Falling, not significant")}`;
    $("det-chart").dataset.kind = vSel.value;
    trendChart($("det-chart"), R);
    if (userTurned) focus(rSel.value, c.name);
    $("det-cap").innerHTML = `<b>Figure II</b>${v.label}, ${c.name}: each point is one year compared with normal, with the seasons removed. Dashed line: Sen's slope.`;
  }
  let userTurned = false;
  if (vSel) { fillRegions(); vSel.addEventListener("change", () => { userTurned = true; fillRegions(); runDetector(); }); rSel.addEventListener("change", () => { userTurned = true; runDetector(); }); runDetector(); }

  /* ---------------- 03 seasons removed ---------------- */
  (function sheet3() {
    const host = $("s3-chart"); if (!host) return;
    const rs = rows("chl_gyre"), A = annual(rs, { log: true, y0: 2003, y1: 2025 });
    const draw = (mode) => {
      document.querySelectorAll("#s3-toggle .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.mode === mode)));
      const t = (d) => d.getUTCFullYear() + (d.getUTCMonth() + 0.5) / 12;
      if (mode === "raw") chart(host, { series: [{ pts: rs.map((r) => ({ x: t(r.d), y: r.v, d: r.d })), r: 2.5 }], yFmt: (v) => v.toFixed(2), yLabel: "chlorophyll (mg/m³)", xTicks: [2005, 2010, 2015, 2020, 2025], tip: (p) => `<b>${p.d.toISOString().slice(0, 7)}</b><br>${p.y.toFixed(3)} mg/m³`, aria: "Raw monthly chlorophyll" });
      else chart(host, { series: [{ pts: A.monthly.map((r) => ({ x: t(r.d), y: (Math.pow(10, r.a) - 1) * 100, d: r.d })), cls: "faint" }, { pts: A.pts.map((p) => ({ x: p.x + 0.5, y: (Math.pow(10, p.y) - 1) * 100, yr: p.x })), dots: true }], tipSeries: 1, zero: true, yFmt: (v) => fmtN(v, 0) + "%", yLabel: "% vs normal", xTicks: [2005, 2010, 2015, 2020, 2025], tip: (p) => `<b>${p.yr}</b><br>${fmtN(p.y, 1)}% vs normal`, aria: "Seasons removed" });
    };
    document.querySelectorAll("#s3-toggle .chip").forEach((c) => c.addEventListener("click", () => draw(c.dataset.mode)));
    draw("raw");
  })();

  /* ---------------- 04 / 05 fixed figures + Table I ---------------- */
  const FIX = [
    ["s4-chl", "chl", "gyre"], ["s4-sst", "sst", "gyre"],
    ["s5-chuk", "chl", "chukchi"], ["s5-chuk-ice", "ice", "chukchi"], ["s5-bar", "chl", "barents"], ["s5-bar-ice", "ice", "barents"]];
  const RES = {};
  FIX.forEach(([id, v, r]) => { const c = Object.assign({}, REG[v].regions[r]); const R = analyse(c); RES[v + "_" + r] = R; const h = $(id); if (h) { trendChart(h, R, { H: 560, L: 130, B: 60, DY: 34 }); const cap = $(id + "-r"); if (cap) cap.textContent = `${rateTxt(R)} · ${pTxt(R.mk.p)}`; } });
  (function table1() {
    const tb = $("t1"); if (!tb) return;
    [["chl_gyre", "Chlorophyll"], ["sst_gyre", "Surface temperature"], ["chl_chukchi", "Chlorophyll"], ["chl_barents", "Chlorophyll"], ["ice_chukchi", "Sea-ice extent"], ["ice_barents", "Sea-ice extent"]].forEach(([k, lab]) => {
      const R = RES[k]; const sig = R.mk.p < 0.05;
      tb.insertAdjacentHTML("beforeend", `<tr><td class="em">${R.cfg.name}</td><td>${lab}</td><td>${R.cfg.y0}–${R.A.pts[R.A.pts.length - 1].x}</td><td class="num">${rateTxt(R)}</td><td class="num">${ciTxt(R)}</td><td class="num">${fmtP(R.mk.p)}</td><td class="${sig ? "cell-sig" : ""}">${sig ? "Significant" : "Not yet"}</td></tr>`);
    });
  })();
  ["hf-gyre", "hf-chuk", "hf-sst"].forEach((id, i) => { const k = ["chl_gyre", "chl_chukchi", "sst_gyre"][i], R = RES[k], e = $(id); if (e) e.textContent = R.cfg.log ? fmtN(R.rate, 1) + "%" : fmtN(R.rate, 2) + " °C"; });

  /* ---------------- 06 volcanic event study ---------------- */
  const EV = [
    { id: "kilauea", key: "ev_hawaii", name: "Kīlauea 2018", kind: "lava entering the sea", year: 2018, w0: "2018-06-02", w1: "2018-09-06", start: "2018-05-20", box: "18.5–20°N, 153.5–155°W" },
    { id: "tonga", key: "ev_tonga", name: "Hunga Tonga 2022", kind: "explosive eruption, ash", year: 2022, w0: "2022-01-09", w1: "2022-02-02", start: "2022-01-15", box: "20–22°S, 174–176°W" },
    { id: "kasatochi", key: "ev_kasatochi", name: "Kasatochi 2008", kind: "ash fall, iron", year: 2008, w0: "2008-08-04", w1: "2008-09-29", start: "2008-08-07", box: "48–58°N, 135–155°W" },
    { id: "raikoke", key: "ev_raikoke", name: "Raikoke 2019", kind: "ash fall, iron", year: 2019, w0: "2019-06-26", w1: "2019-08-13", start: "2019-06-22", box: "45–55°N, 155–170°E" }];
  const doy = (d) => Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1;
  function eventStudy(rs, year, w0, w1) {
    rs = rs.map((r) => Object.assign({}, r, { t: Math.log10(r.v), per: Math.floor((doy(r.d) - 1) / 8) }));
    const base = {}; rs.filter((r) => r.y !== year).forEach((r) => (base[r.per] = base[r.per] || []).push(r.t));
    const clim = {}; Object.keys(base).forEach((k) => (clim[k] = { m: mean(base[k]), s: base[k].length > 1 ? sd(base[k]) : NaN }));
    rs.forEach((r) => { const c = clim[r.per]; r.cm = c ? c.m : NaN; r.cs = c ? c.s : NaN; r.z = (r.t - r.cm) / r.cs; r.ratio = Math.pow(10, r.t - r.cm); });
    const a = new Date(w0 + "T00:00:00Z"), b = new Date(w1 + "T00:00:00Z");
    const win = rs.filter((r) => r.d >= a && r.d <= b && isFinite(r.z)), pers = new Set(win.map((r) => r.per));
    const zmean = mean(win.map((r) => r.z)), plac = [];
    const byY = {}; rs.filter((r) => r.y !== year && pers.has(r.per) && isFinite(r.z)).forEach((r) => (byY[r.y] = byY[r.y] || []).push(r.z));
    Object.values(byY).forEach((z) => { if (z.length >= Math.max(2, Math.floor(pers.size / 2))) plac.push(mean(z)); });
    const above = plac.filter((z) => z >= zmean).length;
    const peak = win.reduce((p, r) => (r.ratio > p.ratio ? r : p), win[0]);
    return { rs, win, zmean, ratioMean: mean(win.map((r) => r.ratio)), rank: above + 1, of: plac.length + 1, p: (above + 1) / (plac.length + 1), peak, clim };
  }
  const EVR = {};
  EV.forEach((e) => (EVR[e.id] = eventStudy(rows(e.key), e.year, e.w0, e.w1)));
  (function table2() {
    const tb = $("t2"); if (!tb) return;
    EV.forEach((e) => { const r = EVR[e.id];
      tb.insertAdjacentHTML("beforeend", `<tr><td class="em">${e.name}</td><td>${e.kind}</td><td>${e.box}</td><td class="num">${r.peak.ratio.toFixed(1)}×</td><td class="num">${r.peak.d.toISOString().slice(0, 10)}</td><td class="num">${r.rank} of ${r.of}</td><td class="num">${r.p.toFixed(3)}</td></tr>`); });
    const X2 = -2 * EV.reduce((s, e) => s + Math.log(EVR[e.id].p), 0), pc = chi2sfEven(X2, 2 * EV.length);
    tb.insertAdjacentHTML("beforeend", `<tr><td class="em">All four combined</td><td colspan="5">Fisher's method, χ² = ${X2.toFixed(1)} on ${2 * EV.length} degrees of freedom</td><td class="num em">${pc.toFixed(3)}</td></tr>`);
    const h = $("hf-fisher"); if (h) h.textContent = "p ≈ " + pc.toFixed(3);
  })();
  function drawEvent(id) {
    document.querySelectorAll("#ev-chips .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.ev === id)));
    const e = EV.find((x) => x.id === id), r = EVR[id];
    const st = new Date(e.start + "T00:00:00Z"), from = st - 120 * 864e5, to = new Date(e.w1 + "T00:00:00Z").getTime() + 100 * 864e5;
    const yr = r.rs.filter((x) => x.d >= from && x.d <= to && isFinite(x.cm));
    const wk = (d) => (d - st) / 864e5 / 7;
    chart($("ev-chart"), {
      series: [{ pts: yr.map((x) => ({ x: wk(x.d), y: x.v, d: x.d, ratio: x.ratio, z: x.z, hl: x.d >= new Date(e.w0) && x.d <= new Date(e.w1) })), dots: true, r: 4 }],
      band: yr.filter((x) => isFinite(x.cs)).map((x) => ({ x: wk(x.d), lo: Math.pow(10, x.cm - 2 * x.cs), hi: Math.pow(10, x.cm + 2 * x.cs) })),
      spans: [[0, wk(new Date(e.w1 + "T00:00:00Z")), "test window"]],
      yFmt: (v) => v.toFixed(v < 0.2 ? 2 : 1), yLabel: "chlorophyll (mg/m³)", xFmt: (v) => (v > 0 ? "+" : "") + v + " wk",
      xTicks: [-16, -12, -8, -4, 0, 4, 8, 12, 16, 20, 24],
      tip: (p) => `<b>${p.d.toISOString().slice(0, 10)}</b><br>${p.y.toFixed(3)} mg/m³<br>${p.ratio.toFixed(2)}× normal · z = ${p.z.toFixed(1)}`,
      aria: e.name + " chlorophyll against the normal range"
    });
    $("ev-tag").textContent = `${e.name} · ${e.kind}`;
    $("ev-big").textContent = `${r.peak.ratio.toFixed(1)}× normal`;
    $("ev-small").textContent = `Peak ${r.peak.d.toISOString().slice(0, 10)} · ranked ${r.rank} of ${r.of} years · placebo p = ${r.p.toFixed(3)}`;
    $("ev-cap").innerHTML = `<b>Figure VII</b>${e.name}: chlorophyll in the 8-day record around the eruption (dots) against the normal range for those weeks in all other years (shaded, ±2 standard deviations). Week 0: ${e.start}.`;
  }
  document.querySelectorAll("#ev-chips .chip").forEach((c) => c.addEventListener("click", () => { drawEvent(c.dataset.ev); focus(c.dataset.ev, c.textContent); }));
  if ($("ev-chart")) drawEvent("kilauea");

  /* ---------------- 07 upload ---------------- */
  function parseGiovanni(text) {
    const lines = text.split(/\r?\n/); let title = "", bbox = null, i0 = -1;
    lines.forEach((l, i) => {
      if (/^Title:/i.test(l)) title = l.replace(/^Title:,?/i, "").replace(/"/g, "");
      const m = l.match(/User Bounding Box:,"?([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)/i); if (m) bbox = m.slice(1).map(Number);
      if (i0 < 0 && /^time\s*,/i.test(l)) i0 = i;
    });
    if (i0 < 0) throw new Error("Could not find the 'time,' header row. Is this an area-averaged time series CSV from Giovanni?");
    const pts = [];
    lines.slice(i0 + 1).forEach((l) => { const [t, v] = l.split(","); if (!t || v === undefined) return; const val = parseFloat(v); const d = new Date(t.trim().slice(0, 10) + "T00:00:00Z"); if (isNaN(d) || !isFinite(val) || val <= -9999) return; pts.push({ d, y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, v: val }); });
    if (pts.length < 24) throw new Error("Too few valid values (" + pts.length + ") to test a trend.");
    return { title, bbox, pts };
  }
  function runUpload(text) {
    $("up-err").textContent = ""; $("up-out").hidden = true;
    let g; try { g = parseGiovanni(text); } catch (e) { $("up-err").textContent = e.message; return; }
    const gaps = g.pts.slice(1).map((p, i) => (p.d - g.pts[i].d) / 864e5), step = median(gaps), monthly = step > 20;
    const isLog = /chlor/i.test(g.title) && g.pts.every((p) => p.v > 0);
    const years = [...new Set(g.pts.map((p) => p.y))].sort((a, b) => a - b);
    const cnt = {}; g.pts.forEach((p) => (cnt[p.y] = (cnt[p.y] || 0) + 1));
    const need = monthly ? 6 : 20, keep = years.filter((y) => cnt[y] >= need);
    // trend on yearly anomalies (by calendar month)
    const A = annual(g.pts.map((p) => Object.assign({}, p)), { log: isLog, y0: keep[0], y1: keep[keep.length - 1] });
    A.pts = A.pts.filter((p) => keep.includes(p.x));
    const x = A.pts.map((p) => p.x), y = A.pts.map((p) => p.y), mk = mannKendall(y), s = sen(x, y);
    const R = { cfg: { name: "Uploaded series", log: isLog, unit: isLog ? "%" : "units" }, A, mk, s, toDisp: (v) => (isLog ? (Math.pow(10, v) - 1) * 100 : v) };
    const rate = isLog ? (Math.pow(10, s.b * 10) - 1) * 100 : s.b * 10, lo = isLog ? (Math.pow(10, s.lo * 10) - 1) * 100 : s.lo * 10, hi = isLog ? (Math.pow(10, s.hi * 10) - 1) * 100 : s.hi * 10;
    $("up-tag").textContent = (g.title || "Uploaded series").slice(0, 110);
    $("up-big").textContent = isLog ? fmtN(rate, 1) + "% per decade" : fmtN(rate, 3) + " per decade";
    $("up-small").textContent = `95% interval ${isLog ? fmtN(lo, 1) + " to " + fmtN(hi, 1) + "%" : fmtN(lo, 3) + " to " + fmtN(hi, 3)} · Mann-Kendall ${pTxt(mk.p)} · ${A.pts.length} years · ${monthly ? "monthly" : "8-day"} data${g.bbox ? " · box " + g.bbox.join(", ") : ""}`;
    const sig = mk.p < 0.05, b = $("up-verdict"); b.className = "verdict" + (sig ? " sig" : ""); b.innerHTML = `<i></i>${sig ? (rate > 0 ? "Significant rise" : "Significant decline") : "Not significant"}`;
    $("up-chart").dataset.kind = isLog ? "chl" : "other";
    if (g.bbox && window.phytoGlobe) window.phytoGlobe.focus(g.bbox, "Your box");
    trendChart($("up-chart"), R, { H: 300, yLabel: isLog ? "% vs normal" : "vs normal" });
    // spikes: per-period z (8-day) or per-month z (monthly)
    const keyf = monthly ? (p) => p.m : (p) => Math.floor((doy(p.d) - 1) / 8);
    const tf = (p) => (isLog ? Math.log10(p.v) : p.v), grp = {};
    g.pts.forEach((p) => (grp[keyf(p)] = grp[keyf(p)] || []).push(tf(p)));
    const st = {}; Object.keys(grp).forEach((k) => (st[k] = { m: mean(grp[k]), s: grp[k].length > 2 ? sd(grp[k]) : NaN }));
    const spikes = g.pts.map((p) => ({ p, z: (tf(p) - st[keyf(p)].m) / st[keyf(p)].s })).filter((o) => o.z > 3).sort((a, b) => b.z - a.z).slice(0, 6);
    const ul = $("up-spikes"); ul.innerHTML = "";
    if (!spikes.length) ul.innerHTML = "<li>No value more than 3 standard deviations above normal for its time of year.</li>";
    spikes.forEach((o) => {
      const d = o.p.d, lo = d - 90 * 864e5, hi2 = d.getTime() + (monthly ? 31 : 8) * 864e5;
      const near = D.eruptions.filter((e) => { const sd0 = new Date(e[3] + "T00:00:00Z"); if (sd0 < lo || sd0 > hi2) return false; if (!g.bbox) return true; const [W, S, E, N] = g.bbox, m = 10; return e[1] >= S - m && e[1] <= N + m && e[2] >= W - m && e[2] <= E + m; });
      const match = near.length ? near.slice(0, 3).map((e) => `${e[0]} (${e[3]}, ${e[5]} kt SO₂)`).join("; ") : "no eruption in the NASA record within 10° of the box in the 90 days before";
      ul.insertAdjacentHTML("beforeend", `<li><b>${d.toISOString().slice(0, 10)}</b> · ${o.z.toFixed(1)} SD above normal · ${near.length ? "possible volcanic cause: " : ""}${match}</li>`);
    });
    $("up-out").hidden = false;
  }
  const inp = $("up-file"), drop = $("up-drop");
  if (inp) {
    inp.addEventListener("change", () => { const f = inp.files[0]; if (f) f.text().then(runUpload); });
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) f.text().then(runUpload); });
    $("up-demo").addEventListener("click", () => {
      const csv = ['Title:,"Time Series, Area-Averaged of Chlorophyll a concentration 8-daily 4 km [MODIS-Aqua (8-daily)"', 'User Bounding Box:,"-155,18.5,-153.5,20"', "", "time,mean"].concat(D.ev_hawaii.map((r) => r[0] + " 00:00:00," + (r[1] === null ? -32767 : r[1]))).join("\n");
      runUpload(csv);
    });
  }
  /* ---------------- tabs ---------------- */
  const TABS = ["investigate", "how", "trends"];
  let drawn = false;
  function show(t, scroll) {
    if (!TABS.includes(t)) t = "investigate";
    TABS.forEach((k) => { const p = $("tab-" + k); if (p) p.hidden = k !== t; });
    document.querySelectorAll("[data-tab]").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === t ? "page" : "false"));
    if (t === "how" && !drawn) { drawn = true; requestAnimationFrame(() => drawOn($("xsec"))); }
    if (scroll) { const top = $("content").getBoundingClientRect().top + window.scrollY - 64; if (window.scrollY > top) window.scrollTo({ top, behavior: REDUCED ? "auto" : "smooth" }); }
  }
  document.querySelectorAll("[data-tab]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); history.replaceState(null, "", "#" + a.dataset.tab); show(a.dataset.tab, true); }));
  document.querySelectorAll("[data-jump]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); show("investigate"); const el = $(a.dataset.jump); if (el) el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }); }));
  show(location.hash.slice(1), false);

  /* ---------------- Giovanni help ---------------- */
  (function () {
    const btn = document.querySelector(".help-btn"), pop = $("gio-help"); if (!btn || !pop) return;
    const set = (o) => { pop.classList.toggle("open", o); btn.setAttribute("aria-expanded", String(o)); };
    btn.addEventListener("click", (e) => { e.preventDefault(); set(!pop.classList.contains("open")); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".help")) set(false); });
    pop.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", () => {
      const done = () => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, done); else done();
    }));
  })();

  window.__phyto = { RES, EVR, mannKendall, sen };
})();
