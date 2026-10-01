// Small UI helpers: the live side-profile comparison graph, toasts and stars.

// Draw the target silhouette vs the current carved silhouette into a canvas,
// styled as a pencil drawing on the order card: the drawing dashed in ink over
// graph lines, your piece filled in the wood's tone, overcuts in red.
export function drawProfileGraph(canvas, log) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, k = W / 248;   // canvas is drawn at 2x
  ctx.clearRect(0, 0, W, H);
  const S = log.S, R0 = log.R0;
  const pad = 8 * k;
  const midY = H / 2;
  const sx = (W - pad * 2) / (S - 1);
  const sy = (H / 2 - pad) / R0;

  // faint graph-paper grid and the centreline
  ctx.strokeStyle = 'rgba(60,90,120,0.10)';
  ctx.lineWidth = 1 * k;
  ctx.beginPath();
  for (let x = pad; x <= W - pad + 0.5; x += (W - 2 * pad) / 12) { ctx.moveTo(x, pad * 0.5); ctx.lineTo(x, H - pad * 0.5); }
  for (let y = midY % (12 * k); y < H; y += 12 * k) { ctx.moveTo(pad * 0.5, y); ctx.lineTo(W - pad * 0.5, y); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(43,33,24,0.35)';
  ctx.setLineDash([6 * k, 4 * k]);
  ctx.beginPath(); ctx.moveTo(pad * 0.5, midY); ctx.lineTo(W - pad * 0.5, midY); ctx.stroke();
  ctx.setLineDash([]);

  const outline = (arr) => {
    ctx.beginPath();
    for (let i = 0; i < S; i++) { const x = pad + i * sx; const y = midY - arr[i] * sy; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let i = S - 1; i >= 0; i--) { ctx.lineTo(pad + i * sx, midY + arr[i] * sy); }
    ctx.closePath();
  };

  // your piece (solid wood tone)
  outline(log.radius);
  ctx.fillStyle = 'rgba(176,122,70,0.42)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,76,38,0.9)';
  ctx.lineWidth = 1.4 * k;
  ctx.stroke();

  // the drawing
  if (log.hasTarget) {
    outline(log.target);
    ctx.strokeStyle = 'rgba(214,160,20,0.95)';
    ctx.lineWidth = 1.6 * k;
    ctx.setLineDash([5 * k, 3 * k]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // warn in red wherever you've cut BELOW the target (over-cut, unrecoverable)
  if (log.hasTarget) {
    ctx.strokeStyle = 'rgba(196,58,40,0.95)';
    ctx.lineWidth = 2.6 * k;
    ctx.beginPath();
    let drawing = false;
    for (let i = 0; i < S; i++) {
      const under = log.radius[i] < log.target[i] - R0 * 0.012 && log.target[i] > R0 * 0.14;
      const x = pad + i * sx, y = midY - log.radius[i] * sy;
      if (under) { drawing ? ctx.lineTo(x, y) : ctx.moveTo(x, y); drawing = true; }
      else if (drawing) { ctx.stroke(); ctx.beginPath(); drawing = false; }
    }
    if (drawing) ctx.stroke();
  }
}

let toastTimer = null;
export function toast(msg, ms = 1800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function stars(n) {
  let s = '';
  for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
  return s;
}
