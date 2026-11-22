// Loyiha rasmlari va audiolari: IndexedDB (katta fayllar uchun). Yopiq bo'lsa shu seans xotirasida.
const DB = 'aqs-media';
const ST = 'files';
const mem = new Map();
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(ST);
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    } catch (e) {
      reject(e);
    }
  });
  return dbp;
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(ST, mode);
    const store = t.objectStore(ST);
    const r = fn(store);
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const key = (pid, slot) => `${pid}/${slot}`;

export async function putMedia(pid, slot, blob) {
  mem.set(key(pid, slot), blob);
  try {
    await tx('readwrite', (s) => s.put(blob, key(pid, slot)));
    return true;
  } catch {
    return false; // faqat shu seansda saqlanadi
  }
}

export async function getMedia(pid, slot) {
  try {
    const v = await tx('readonly', (s) => s.get(key(pid, slot)));
    if (v) return v;
  } catch {
    /* xotiraga o'tamiz */
  }
  return mem.get(key(pid, slot)) || null;
}

export async function deleteMedia(pid, slot) {
  mem.delete(key(pid, slot));
  try {
    await tx('readwrite', (s) => s.delete(key(pid, slot)));
  } catch {
    /* e'tibor bermaymiz */
  }
}

export async function listMedia(pid) {
  const out = new Set([...mem.keys()].filter((k) => k.startsWith(`${pid}/`)).map((k) => k.slice(pid.length + 1)));
  try {
    const keys = await tx('readonly', (s) => s.getAllKeys());
    (keys || []).filter((k) => String(k).startsWith(`${pid}/`)).forEach((k) => out.add(String(k).slice(pid.length + 1)));
  } catch {
    /* e'tibor bermaymiz */
  }
  return out;
}

export async function clearProjectMedia(pid) {
  for (const s of await listMedia(pid)) await deleteMedia(pid, s);
}
