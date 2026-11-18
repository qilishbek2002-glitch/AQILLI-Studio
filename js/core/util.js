// Umumiy yordamchi funksiyalar (brauzer va Node ikkalasida ishlaydi)

export function getPath(obj, path) {
  if (path === '' || path == null) return obj;
  let cur = obj;
  for (const part of String(path).split('.')) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

export function setPath(obj, path, value) {
  const parts = String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

export function clone(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

export function slugOk(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-]{1,40}$/.test(id);
}

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function fmtDuration(minutes) {
  if (minutes < 1) return `${Math.round(minutes * 60)} soniya`;
  if (Number.isInteger(minutes)) return `${minutes} daqiqa`;
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m} daqiqa ${s} soniya`;
}

export function fmtNum(n) {
  if (typeof n !== 'number' || !isFinite(n)) return String(n ?? '');
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toLocaleString('en-US');
  return String(Math.round(n * 1000) / 1000);
}
