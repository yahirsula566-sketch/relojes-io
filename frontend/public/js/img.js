// Genera imágenes de reloj en SVG al vuelo, coloreadas según la
// variante (estilo + color). Evita depender de archivos de imagen
// reales o de acceso a internet para mostrar el catálogo.
function watchSvg(hex = '#333333', styleName = '') {
  const isSport = /sport|deportiv|trail|titanio/i.test(styleName);
  const strapColor = shade(hex, -18);
  return `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${shade(hex, 25)}"/>
      <stop offset="100%" stop-color="${hex}"/>
    </linearGradient>
  </defs>
  <rect x="90" y="10" width="20" height="34" rx="6" fill="${strapColor}"/>
  <rect x="90" y="156" width="20" height="34" rx="6" fill="${strapColor}"/>
  <circle cx="100" cy="100" r="72" fill="${strapColor}"/>
  <circle cx="100" cy="100" r="62" fill="url(#face)"/>
  <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
  ${isSport ? '<circle cx="100" cy="100" r="50" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="6" stroke-dasharray="4 6"/>' : ''}
  <line x1="100" y1="100" x2="100" y2="66" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <line x1="100" y1="100" x2="126" y2="112" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/>
  <circle cx="100" cy="100" r="5" fill="#fff"/>
  <rect x="158" y="90" width="10" height="20" rx="3" fill="${strapColor}"/>
</svg>`.trim();
}

function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent);
  let b = (num & 0x0000ff) + Math.round(2.55 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `rgb(${r},${g},${b})`;
}

export function variantImage(hex, styleName) {
  const svg = watchSvg(hex, styleName);
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function categoryIcon(hex = '#b8925a') {
  const svg = `
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="16" fill="none" stroke="${hex}" stroke-width="3"/>
  <line x1="24" y1="24" x2="24" y2="14" stroke="${hex}" stroke-width="3" stroke-linecap="round"/>
  <line x1="24" y1="24" x2="31" y2="28" stroke="${hex}" stroke-width="3" stroke-linecap="round"/>
</svg>`.trim();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
