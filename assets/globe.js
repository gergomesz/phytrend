/* Nullschool-style globe: real coastlines (Natural Earth 110m), NASA MSVOLSO2L4 eruptions,
   the study regions, and an illustrative flow of particles. window.phytoGlobe.focus(box, label) turns it. */
(function () {
  "use strict";
  const base = document.getElementById("globe-base"), fx = document.getElementById("globe-fx");
  if (!base || !fx || !window.COAST) return;
  const b = base.getContext("2d"), f = fx.getContext("2d");
  const RAD = Math.PI / 180, REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const COL = { warm: css("--warm") || "#ff8a3d", chl: css("--chl") || "#4fd18b", volc: css("--volc") || "#ff5468", ice: css("--ice") || "#6cc8ff" };
  const REGIONS = [
    { box: [-170, 20, -140, 30], c: COL.warm, lab: "North Pacific Gyre" },
    { box: [-180, 66, -157, 75], c: COL.chl, lab: "Chukchi Sea" },
    { box: [20, 70, 60, 80], c: COL.chl, lab: "Barents Sea" }];
  const STUDIED = ["Kilauea", "Hunga Tonga", "Kasatochi", "Raikoke"];
  const ERUPT = ((window.DATA && window.DATA.eruptions) || []).map((e) => ({ name: e[0], lat: e[1], lon: e[2], so2: e[5] || 0 }));
  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0;
  let lon0 = -165, lat0 = 32, focusBox = null, focusLab = "", anim = null, dragging = false;

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
    [base, fx].forEach((c) => { c.width = W * DPR; c.height = H * DPR; c.style.width = W + "px"; c.style.height = H + "px"; });
    b.setTransform(DPR, 0, 0, DPR, 0, 0); f.setTransform(DPR, 0, 0, DPR, 0, 0);
    const wide = W > 900;
    cx = wide ? W * 0.7 : W * 0.5; cy = wide ? H * 0.5 : H * 0.3;
    R = wide ? Math.min(H * 0.44, W * 0.3) : Math.min(W * 0.46, H * 0.24);
    drawBase(); f.clearRect(0, 0, W, H);
  }
  function proj(lon, lat) {
    const l = (lon - lon0) * RAD, p = lat * RAD, p0 = lat0 * RAD;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    return [cx + R * Math.cos(p) * Math.sin(l), cy - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), cosc];
  }
  function line(ctx, pts) { // pts: [[lon,lat],...]; breaks at the horizon
    let pen = false; ctx.beginPath();
    for (const [lo, la] of pts) { const [x, y, c] = proj(lo, la); if (c > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; }
    ctx.stroke();
  }
  function boxPts([w, s, e, n]) {
    const p = []; for (let i = 0; i <= 12; i++) p.push([w + (e - w) * i / 12, s]);
    for (let i = 0; i <= 12; i++) p.push([e, s + (n - s) * i / 12]);
    for (let i = 0; i <= 12; i++) p.push([e - (e - w) * i / 12, n]);
    for (let i = 0; i <= 12; i++) p.push([w, n - (n - s) * i / 12]); return p;
  }
  function label(ctx, txt, lon, lat, col) {
    const [x, y, c] = proj(lon, lat); if (c < 0.15) return;
    ctx.font = "500 11px 'M PLUS 1p', system-ui, sans-serif"; ctx.fillStyle = col; ctx.fillText(txt.toUpperCase(), x + 6, y - 6);
  }
  function drawBase() {
    b.clearRect(0, 0, W, H);
    const g = b.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, "#14243a"); g.addColorStop(1, "#060b14");
    b.fillStyle = g; b.beginPath(); b.arc(cx, cy, R, 0, Math.PI * 2); b.fill();
    b.strokeStyle = "rgba(160,190,220,0.08)"; b.lineWidth = 1;
    for (let la = -60; la <= 60; la += 30) { const p = []; for (let lo = -180; lo <= 180; lo += 4) p.push([lo, la]); line(b, p); }
    for (let lo = -180; lo < 180; lo += 30) { const p = []; for (let la = -88; la <= 88; la += 4) p.push([lo, la]); line(b, p); }
    b.strokeStyle = "rgba(225,232,238,0.62)"; b.lineWidth = 0.9;
    for (const fl of window.COAST) { const p = []; for (let i = 0; i < fl.length; i += 2) p.push([fl[i], fl[i + 1]]); line(b, p); }
    b.strokeStyle = "rgba(160,200,240,0.22)"; b.lineWidth = 1; b.beginPath(); b.arc(cx, cy, R, 0, Math.PI * 2); b.stroke();
    // eruptions, sized by SO2
    for (const e of ERUPT) {
      const [x, y, c] = proj(e.lon, e.lat); if (c <= 0) continue;
      const r = 1.4 + Math.min(7, Math.sqrt(e.so2) / 9);
      b.fillStyle = "rgba(255,84,104,0.30)"; b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill();
    }
    for (const e of ERUPT.filter((e) => STUDIED.some((s) => e.name.indexOf(s) === 0))) {
      const [x, y, c] = proj(e.lon, e.lat); if (c <= 0) continue;
      b.strokeStyle = COL.volc; b.lineWidth = 1.4; b.beginPath(); b.arc(x, y, 6, 0, Math.PI * 2); b.stroke();
    }
    const seen = {};
    for (const e of ERUPT) { const s = STUDIED.find((s) => e.name.indexOf(s) === 0); if (s && !seen[s]) { seen[s] = 1; label(b, s === "Kilauea" ? "Kīlauea" : s, e.lon, e.lat, COL.volc); } }
    for (const r of REGIONS) {
      b.strokeStyle = r.c; b.lineWidth = 1.8; line(b, boxPts(r.box));
      label(b, r.lab, r.box[0], r.box[3], r.c);
    }
    if (focusBox) {
      b.setLineDash([5, 4]); b.strokeStyle = "#f4f7f9"; b.lineWidth = 1.6; line(b, boxPts(focusBox)); b.setLineDash([]);
      if (focusLab) label(b, focusLab, focusBox[0], focusBox[1] - 3, "#f4f7f9");
    }
  }
  /* ---- particles: illustrative flow (gyres), not data ---- */
  function vel(lon, lat) {
    const l = lon * RAD, p = lat * RAD;
    const u = -0.16 * Math.cos(3 * p) + 0.05 * Math.sin(2 * l + 3 * p);
    const v = 0.07 * Math.sin(3 * l + p) * Math.cos(p);
    return [u / Math.max(0.2, Math.cos(p)), v];
  }
  const RAMP = ["#3b4cc0", "#3a8bd6", "#2fc1d3", "#4fd18b", "#b6e05a", "#f2d23c", "#ff9a3c"];
  const N = window.innerWidth < 700 ? 900 : 2200, P = [];
  const spawn = (q) => { const p0 = lat0 * RAD; let lon, lat; for (let k = 0; k < 6; k++) { lon = lon0 + (Math.random() * 180 - 90); lat = Math.asin(Math.random() * 2 - 1) / RAD; if (proj(lon, lat)[2] > 0.05) break; } q.lon = lon; q.lat = lat; q.age = Math.random() * 80 | 0; return q; };
  for (let i = 0; i < N; i++) P.push(spawn({}));
  const buckets = RAMP.map(() => []);
  function step() {
    if (!dragging && !anim) {
      f.globalCompositeOperation = "destination-in"; f.fillStyle = "rgba(0,0,0,0.92)"; f.fillRect(0, 0, W, H);
      f.globalCompositeOperation = "source-over";
      buckets.forEach((a) => (a.length = 0));
      for (const q of P) {
        if (q.age-- <= 0) { spawn(q); q.age = 60 + Math.random() * 60 | 0; continue; }
        const [u, v] = vel(q.lon, q.lat), a = proj(q.lon, q.lat);
        q.lon += u; q.lat = Math.max(-85, Math.min(85, q.lat + v));
        const c = proj(q.lon, q.lat);
        if (a[2] <= 0 || c[2] <= 0) { q.age = 0; continue; }
        const sp = Math.min(RAMP.length - 1, Math.floor(Math.hypot(u * Math.cos(q.lat * RAD), v) / 0.035));
        buckets[sp].push(a[0], a[1], c[0], c[1]);
      }
      f.lineWidth = 1.1;
      buckets.forEach((a, i) => { if (!a.length) return; f.strokeStyle = RAMP[i]; f.globalAlpha = 0.85; f.beginPath(); for (let k = 0; k < a.length; k += 4) { f.moveTo(a[k], a[k + 1]); f.lineTo(a[k + 2], a[k + 3]); } f.stroke(); });
      f.globalAlpha = 1;
    }
    requestAnimationFrame(step);
  }
  /* ---- turning the globe ---- */
  function turnTo(lon, lat, ms) {
    const a0 = lon0, b0 = lat0; let d = ((lon - a0 + 540) % 360) - 180; const t0 = performance.now();
    anim = true; f.clearRect(0, 0, W, H);
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      lon0 = a0 + d * e; lat0 = b0 + (lat - b0) * e; drawBase();
      if (k < 1) requestAnimationFrame(tick); else { anim = null; P.forEach(spawn); }
    };
    requestAnimationFrame(tick);
  }
  window.phytoGlobe = {
    focus(box, lab) {
      if (!box) return; focusBox = box; focusLab = lab || "";
      const lon = (box[0] + box[2]) / 2, lat = Math.max(-40, Math.min(45, (box[1] + box[3]) / 2));
      REDUCED ? (lon0 = lon, lat0 = lat, drawBase()) : turnTo(lon, lat, 1100);
    }
  };
  let last = null;
  const host = document.getElementById("globe-hit");
  if (host) {
    host.addEventListener("pointerdown", (e) => { dragging = true; last = [e.clientX, e.clientY]; host.setPointerCapture(e.pointerId); f.clearRect(0, 0, W, H); });
    host.addEventListener("pointermove", (e) => { if (!dragging) return; lon0 -= (e.clientX - last[0]) * 90 / R; lat0 = Math.max(-80, Math.min(80, lat0 + (e.clientY - last[1]) * 90 / R)); last = [e.clientX, e.clientY]; drawBase(); });
    const up = () => { if (dragging) { dragging = false; P.forEach(spawn); } };
    host.addEventListener("pointerup", up); host.addEventListener("pointercancel", up);
  }
  // fade the globe back as you scroll into the panels
  const wrap = document.getElementById("globe-wrap");
  const onScroll = () => { if (wrap) wrap.style.opacity = String(1 - 0.6 * Math.min(1, window.scrollY / (H * 0.55))); };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", size);
  size(); onScroll();
  if (!REDUCED) requestAnimationFrame(step);
})();
