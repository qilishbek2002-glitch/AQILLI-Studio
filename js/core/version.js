// Dastur versiyasi. Modul "minApp" talab qilsa, shu bilan solishtiriladi.
export const APP_VERSION = '1.0.0';

export function parseVer(v) {
  const m = String(v ?? '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

// a > b bo'lsa 1, a < b bo'lsa -1, teng bo'lsa 0
export function cmpVer(a, b) {
  const pa = parseVer(a) || [0, 0, 0];
  const pb = parseVer(b) || [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}
