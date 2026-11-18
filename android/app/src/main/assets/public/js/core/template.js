// Kichik shablon dvigateli (kodsiz, faqat ma'lumot — masofadan yangilanadigan modullar uchun xavfsiz).
//
//   {{path.to.value}}            qiymat
//   {{#each arr}}...{{/each}}    takrorlash; ichida {{@index}}, {{@index1}}, {{@first}}, {{@last}}, {{this}}
//   {{#if path}}..{{else}}..{{/if}}
//   {{#if a == b}} / {{#if a != b}}

const TAG = /\{\{\s*([^{}]*?)\s*\}\}/g;
const BLOCK = /^(#each |#if |else$|\/each$|\/if$)/;

function tokenize(src) {
  const out = [];
  let last = 0;
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(src))) {
    if (m.index > last) out.push({ t: 'text', v: src.slice(last, m.index) });
    out.push({ t: 'tag', v: m[1] });
    last = TAG.lastIndex;
  }
  if (last < src.length) out.push({ t: 'text', v: src.slice(last) });

  // Blok tegi alohida qatorda turgan bo'lsa, undan keyingi yangi qatorni olib tashlaymiz
  for (let i = 0; i < out.length; i++) {
    if (out[i].t !== 'tag' || !BLOCK.test(out[i].v)) continue;
    const prev = out[i - 1];
    const next = out[i + 1];
    const atLineStart = !prev || (prev.t === 'text' && /(^|\n)[ \t]*$/.test(prev.v));
    if (atLineStart && next && next.t === 'text' && /^[ \t]*\r?\n/.test(next.v)) {
      next.v = next.v.replace(/^[ \t]*\r?\n/, '');
      if (prev && prev.t === 'text') prev.v = prev.v.replace(/[ \t]*$/, '');
    }
  }
  return out;
}

function parse(src) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const kids = (n) => (n.type === 'if' && n.inElse ? n.elseChildren : n.children);
  for (const tk of tokenize(src)) {
    const top = stack[stack.length - 1];
    if (tk.t === 'text') {
      kids(top).push({ type: 'text', v: tk.v });
      continue;
    }
    const v = tk.v;
    if (v.startsWith('#each ')) {
      const n = { type: 'each', path: v.slice(6).trim(), children: [] };
      kids(top).push(n);
      stack.push(n);
    } else if (v.startsWith('#if ')) {
      const n = { type: 'if', expr: v.slice(4).trim(), children: [], elseChildren: [], inElse: false };
      kids(top).push(n);
      stack.push(n);
    } else if (v === 'else') {
      if (top.type !== 'if') throw new Error('{{else}} faqat {{#if}} ichida bo\'lishi kerak');
      top.inElse = true;
    } else if (v === '/each' || v === '/if') {
      if (top.type !== v.slice(1)) throw new Error(`Shablon xatosi: ${v} noto'g'ri joyda`);
      stack.pop();
    } else {
      kids(top).push({ type: 'var', path: v });
    }
  }
  if (stack.length !== 1) throw new Error('Shablon xatosi: yopilmagan blok bor');
  return root;
}

function lookup(scopes, path) {
  if (path.startsWith('@')) {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const s = scopes[i];
      if (s.index === undefined) continue;
      if (path === '@index') return s.index;
      if (path === '@index1') return s.index + 1;
      if (path === '@first') return s.index === 0;
      if (path === '@last') return s.index === s.count - 1;
    }
    return undefined;
  }
  if (path === 'this') return scopes[scopes.length - 1].value;
  const parts = path.split('.');
  for (let i = scopes.length - 1; i >= 0; i--) {
    const val = scopes[i].value;
    if (val != null && typeof val === 'object' && parts[0] in val) {
      let cur = val[parts[0]];
      for (let j = 1; j < parts.length; j++) {
        if (cur == null) return undefined;
        cur = cur[parts[j]];
      }
      return cur;
    }
  }
  return undefined;
}

function truthy(v) {
  return Array.isArray(v) ? v.length > 0 : !!v;
}

function evalExpr(expr, scopes) {
  let m = expr.match(/^(.+?)\s*(==|!=)\s*(.+)$/);
  if (m) {
    const left = lookup(scopes, m[1].trim());
    const right = m[3].trim().replace(/^["']|["']$/g, '');
    const eq = String(left ?? '') === right;
    return m[2] === '==' ? eq : !eq;
  }
  return truthy(lookup(scopes, expr));
}

function renderNodes(nodes, scopes) {
  let out = '';
  for (const n of nodes) {
    if (n.type === 'text') out += n.v;
    else if (n.type === 'var') {
      const v = lookup(scopes, n.path);
      if (v == null) out += '';
      else if (Array.isArray(v)) out += v.join(', ');
      else if (typeof v === 'object') out += JSON.stringify(v);
      else out += String(v);
    } else if (n.type === 'each') {
      const arr = lookup(scopes, n.path);
      if (Array.isArray(arr)) {
        arr.forEach((item, index) => {
          out += renderNodes(n.children, [...scopes, { value: item, index, count: arr.length }]);
        });
      }
    } else if (n.type === 'if') {
      out += renderNodes(evalExpr(n.expr, scopes) ? n.children : n.elseChildren, scopes);
    }
  }
  return out;
}

const cache = new Map();

export function render(tpl, ctx) {
  let ast = cache.get(tpl);
  if (!ast) {
    ast = parse(tpl);
    if (cache.size > 200) cache.clear();
    cache.set(tpl, ast);
  }
  return renderNodes(ast.children, [{ value: ctx }]);
}

// Shablon sintaksisini tekshirish (modul import qilinganda)
export function checkTemplate(tpl) {
  try {
    parse(tpl);
    return null;
  } catch (e) {
    return e.message;
  }
}
