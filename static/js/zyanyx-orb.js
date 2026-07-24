// zyanyx-orb.js (zyanyx-custom) — the reactive Zyanyx orb, embedded in the
// dashboard. Renders a canvas arc-reactor that reacts to real state:
//   thinking  = the chat log is generating (#chat-history[aria-busy="true"]),
//               or the dispatcher/desktop server reports work (/hud/state)
//   speaking  = browser TTS is talking (speechSynthesis.speaking)
//   listening = mic capture active (voice recorder), best-effort
//   idle      = otherwise
// Self-contained, no external deps. Attaches to <canvas id="zyanyx-orb">.
(function () {
  const cv = document.getElementById('zyanyx-orb');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W = 0, H = 0, CX = 0, CY = 0, R = 0;

  function size() {
    const rect = cv.getBoundingClientRect();
    W = rect.width || 240; H = rect.height || 240;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2; CY = H / 2; R = Math.min(W, H) * 0.34;
  }
  new ResizeObserver(size).observe(cv); size();

  const STATES = {
    idle:      { color: [41, 182, 255], energy: 0.35, spin: 0.15 },
    listening: { color: [0, 229, 255],  energy: 0.70, spin: 0.35 },
    thinking:  { color: [124, 90, 255], energy: 1.00, spin: 1.10 },
    speaking:  { color: [255, 183, 77], energy: 0.85, spin: 0.45 },
  };
  let state = 'idle';
  let energy = 0.35, spin = 0, col = STATES.idle.color.slice();

  const N = 70;
  const parts = Array.from({ length: N }, () => ({
    a: Math.random() * Math.PI * 2, r: 0.55 + Math.random() * 0.9,
    s: 0.2 + Math.random() * 0.9, z: Math.random(), w: 0.6 + Math.random() * 1.5,
  }));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  let t = 0, angle = 0;
  function frame() {
    t += 0.016;
    const S = STATES[state] || STATES.idle;
    energy = lerp(energy, S.energy, 0.06);
    spin = lerp(spin, S.spin, 0.05);
    for (let i = 0; i < 3; i++) col[i] = lerp(col[i], S.color[i], 0.06);
    angle += spin * 0.02;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const breathe = 1 + Math.sin(t * 1.6) * 0.04 * (0.5 + energy);
    const coreR = R * 0.42 * breathe;

    const halo = ctx.createRadialGradient(CX, CY, coreR * 0.4, CX, CY, R * 1.7);
    halo.addColorStop(0, rgba(col, 0.16 * (0.6 + energy)));
    halo.addColorStop(0.5, rgba(col, 0.05));
    halo.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

    function ring(radius, segs, width, rot, alpha, gap) {
      const step = (Math.PI * 2) / segs; ctx.lineWidth = width;
      ctx.strokeStyle = rgba(col, alpha);
      for (let i = 0; i < segs; i++) {
        const a0 = rot + i * step, a1 = a0 + step * (1 - gap);
        ctx.beginPath(); ctx.arc(CX, CY, radius, a0, a1); ctx.stroke();
      }
    }
    ring(R * 0.98, 3, 3.0, angle, 0.55 + energy * 0.35, 0.25);
    ring(R * 0.86, 28, 1.8, -angle * 1.6, 0.30 + energy * 0.3, 0.55);
    ring(R * 0.70, 5, 2.2, angle * 2.2, 0.45 + energy * 0.35, 0.35);
    ring(R * 0.58, 40, 1.1, -angle * 0.8, 0.18 + energy * 0.25, 0.6);

    for (const p of parts) {
      p.a += p.s * spin * 0.012 + 0.001;
      const rr = R * p.r * (0.9 + Math.sin(t * 0.8 + p.z * 6) * 0.06 * energy);
      const x = CX + Math.cos(p.a) * rr, y = CY + Math.sin(p.a) * rr;
      ctx.beginPath();
      ctx.fillStyle = rgba(col, Math.min(0.9, p.z * (0.4 + energy * 0.8)));
      ctx.arc(x, y, p.w * (0.7 + energy * 0.6), 0, Math.PI * 2); ctx.fill();
    }

    if (state === 'speaking') {
      const bars = 44;
      for (let i = 0; i < bars; i++) {
        const a = (i / bars) * Math.PI * 2;
        const amp = (0.5 + 0.5 * Math.sin(t * 9 + i * 0.7)) * R * 0.15 * energy;
        ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * R * 1.02, CY + Math.sin(a) * R * 1.02);
        ctx.lineTo(CX + Math.cos(a) * (R * 1.02 + amp), CY + Math.sin(a) * (R * 1.02 + amp));
        ctx.stroke();
      }
    }

    const core = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR);
    const flick = state === 'thinking' ? (0.9 + Math.random() * 0.1) : 1;
    core.addColorStop(0, rgba([235, 250, 255], 0.95 * flick));
    core.addColorStop(0.25, rgba(col, 0.85 * flick));
    core.addColorStop(0.7, rgba(col, 0.35));
    core.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(CX, CY, coreR, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba([220, 245, 255], 0.5 + energy * 0.3); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = angle * 0.5 + i * Math.PI / 3 - Math.PI / 2;
      const x = CX + Math.cos(a) * coreR * 0.5, y = CY + Math.sin(a) * coreR * 0.5;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
    requestAnimationFrame(frame);
  }
  frame();

  // ── State resolver: read the dashboard's real activity ──
  const chatLog = document.getElementById('chat-history');
  let hudState = 'idle';
  // Poll the host desktop server's /hud/state (dispatcher/desktop push work here).
  async function pollHud() {
    try {
      const r = await fetch('http://localhost:8765/hud/state', { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); hudState = (d && d.state) || 'idle'; }
    } catch (e) { hudState = 'idle'; }
  }
  setInterval(pollHud, 700); pollHud();

  function resolve() {
    try { if (window.speechSynthesis && window.speechSynthesis.speaking) return 'speaking'; } catch (e) {}
    try {
      const vr = document.querySelector('.voice-recording, .mic-active, [data-recording="true"]');
      if (vr) return 'listening';
    } catch (e) {}
    if (chatLog && chatLog.getAttribute('aria-busy') === 'true') return 'thinking';
    if (hudState && hudState !== 'idle') return hudState;
    return 'idle';
  }
  setInterval(() => { state = resolve(); }, 250);
})();
