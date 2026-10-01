// Small line icons drawn for WoodForm (24px grid, stroke = currentColor).
const svg = (body, extra = '') =>
  `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${extra}>${body}</svg>`;

// Each hand tool: handle at the bottom-left, the business end top-right.
const HANDLE = '<path d="M3.5 20.5l4.6-4.6"/><path d="M5.2 22.2l-3.4-3.4 2.6-2.6 3.4 3.4z" fill="currentColor" fill-opacity=".18"/>';
const TOOL = {
  chisel: HANDLE + '<path d="M8.6 15.4l8.6-8.6"/><path d="M16 5.6l3.8-1.2-1.2 3.8-2.1.5z"/>',
  scraper: HANDLE + '<path d="M8.3 15.7l7.4-7.4"/><path d="M14 6.6l3.4 3.4 3.4-3.4-3.4-3.4z"/>',
  roughing: HANDLE + '<path d="M8.6 15.4l7-7"/><path d="M14.2 6.2c1.6-1.6 3.8-2 4.9-.9s.7 3.3-.9 4.9"/><path d="M15.6 8.4l2.4-2.4"/>',
  gouge: HANDLE + '<path d="M8.6 15.4l8-8"/><circle cx="18" cy="6" r="2"/>',
  parting: HANDLE + '<path d="M8.6 15.4l8.2-8.2"/><path d="M16.8 7.2l1.6-3.6 2 2-3.6 1.6"/>',
  detail: HANDLE + '<path d="M8.6 15.4l11.4-11.4"/><path d="M17.5 5.2l2.5-1.2-1.2 2.5"/>',
  rotary: '<rect x="3" y="12.5" width="11" height="5" rx="2.5" transform="rotate(-45 8.5 15)"/><path d="M13 11l4-4"/><circle cx="18.6" cy="5.4" r="1.8" fill="currentColor"/><path d="M4.5 19.5l-2 2"/>',
  sandblock: '<rect x="4" y="7" width="16" height="10" rx="2"/><path d="M4 13.5h16"/><path d="M7 15.3h.01M10 15.3h.01M13 15.3h.01M16 15.3h.01"/>',
  autosand: '<circle cx="12" cy="14" r="6.5"/><circle cx="12" cy="14" r="1.2" fill="currentColor"/><path d="M9 6.5h6l-1-3h-4z"/>',
  oil: '<path d="M12 3.5c3.2 4.2 5.5 7.4 5.5 10.3a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6.1 5.5-10.3z"/><path d="M9.6 14.6a2.6 2.6 0 0 0 2.4 2.6"/>',
};

export function toolIcon(id) { return svg(TOOL[id] || TOOL.chisel); }

const UI = {
  soundOn: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  soundOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeOff: '<path d="M2.5 12s3.5-6.5 9.5-6.5c1.6 0 3 .4 4.2 1M21.5 12s-3.5 6.5-9.5 6.5c-1.6 0-3-.4-4.2-1"/><path d="M4 20L20 4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  next: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  retry: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="1.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
};
export function icon(name) { return svg(UI[name] || ''); }

// Five stars, filled up to n.
export function starRow(n) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    s += `<svg class="star${i <= n ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 16.8l-5.4 3 1.2-6.1-4.5-4.2 6.1-.7z"/></svg>`;
  }
  return `<span class="stars" role="img" aria-label="${n} of 5 stars">${s}</span>`;
}
