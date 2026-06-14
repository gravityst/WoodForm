// Small UI helpers: the live side-profile comparison graph, toasts and stars.

// Draw the target silhouette vs the current carved silhouette into a canvas.
// Shows the top half mirrored for a recognisable "lathe profile" read.
export function drawProfileGraph(canvas, log) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const S = log.S, R0 = log.R0;
  const pad = 6;
  const midY = H / 2;
  const sx = (W - pad * 2) / (S - 1);
  const sy = (H / 2 - pad) / R0;

  // centreline
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, midY); ctx.lineTo(W - pad, midY); ctx.stroke();

  // target (filled, faint)
  if (log.hasTarget) {
    ctx.beginPath();
    for (let i = 0; i < S; i++) { const x = pad + i * sx; const y = midY - log.target[i] * sy; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let i = S - 1; i >= 0; i--) { const x = pad + i * sx; const y = midY + log.target[i] * sy; ctx.lineTo(x, y); }
    ctx.closePath();
    ctx.fillStyle = 'rgba(125,196,128,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(125,196,128,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // current carve (solid wood tone)
  ctx.beginPath();
  for (let i = 0; i < S; i++) { const x = pad + i * sx; const y = midY - log.radius[i] * sy; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  for (let i = S - 1; i >= 0; i--) { const x = pad + i * sx; const y = midY + log.radius[i] * sy; ctx.lineTo(x, y); }
  ctx.closePath();
  ctx.fillStyle = 'rgba(214,178,116,0.30)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,205,150,0.95)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
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
