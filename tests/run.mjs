// Yadro mantiq testlari: node tests/run.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, checkTemplate } from '../js/core/template.js';
import { computePlan, availableFormats, durationChoices, defaultMinutes } from '../js/core/plan.js';
import { validate } from '../js/core/validate.js';
import { parseAiResponse } from '../js/core/parse.js';
import { validateManifest } from '../js/core/modules.js';
import { buildCommand, chosenIds, resolveOptions } from '../js/core/prompt.js';
import { buildOutputs } from '../js/core/outputs.js';
import { cmpVer } from '../js/core/version.js';
import { planHandoff } from '../js/core/handoff.js';
import { getPath } from '../js/core/util.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, name, extra = '') {
  if (cond) pass++;
  else {
    fail++;
    failures.push(name + (extra ? ` -> ${extra}` : ''));
  }
}
function eq(a, b, name) {
  ok(JSON.stringify(a) === JSON.stringify(b), name, `kutilgan ${JSON.stringify(b)}, keldi ${JSON.stringify(a)}`);
}

// ---------- yuklash ----------
const ids = JSON.parse(fs.readFileSync(path.join(root, 'modules/index.json'), 'utf8')).modules;
const mods = ids.map((id) => ({
  ...JSON.parse(fs.readFileSync(path.join(root, `modules/${id}/manifest.json`), 'utf8')),
  prompt: fs.readFileSync(path.join(root, `modules/${id}/prompt.txt`), 'utf8'),
}));

// ---------- shablon dvigateli ----------
eq(render('Salom {{ism}}!', { ism: 'Ali' }), 'Salom Ali!', 'template: oddiy o\'zgaruvchi');
eq(render('{{a.b.c}}', { a: { b: { c: 5 } } }), '5', 'template: ichma-ich yo\'l');
eq(render('{{#each x}}[{{@index1}}:{{this}}]{{/each}}', { x: ['a', 'b'] }), '[1:a][2:b]', 'template: each primitive');
eq(render('{{#each x}}{{n}},{{/each}}', { x: [{ n: 1 }, { n: 2 }] }), '1,2,', 'template: each obyekt');
eq(render('{{#if a}}Y{{else}}N{{/if}}', { a: 0 }), 'N', 'template: if else (0)');
eq(render('{{#if a}}Y{{else}}N{{/if}}', { a: [] }), 'N', 'template: bo\'sh massiv yolg\'on');
eq(render('{{#if a == b}}Y{{else}}N{{/if}}', { a: 'b' }), 'Y', 'template: ==');
eq(render('{{#if a != b}}Y{{else}}N{{/if}}', { a: 'b' }), 'N', 'template: !=');
eq(render('{{#each g}}{{#if @first}}F{{/if}}{{x}}{{/each}}', { g: [{ x: 1 }, { x: 2 }] }), 'F12', 'template: @first');
eq(render('{{#each g}}{{top}}{{x}}{{/each}}', { top: 'T', g: [{ x: 1 }] }), 'T1', 'template: tashqi kontekst');
eq(render('A\n{{#if a}}\nB\n{{/if}}\nC', { a: true }), 'A\nB\nC', 'template: blok qatorlari bo\'sh qator qoldirmaydi');
eq(render('{{yoq}}x', {}), 'x', 'template: yo\'q qiymat bo\'sh');
eq(render('{{a.0}}', { a: ['x'] }), 'x', 'template: massiv indeksi');
ok(checkTemplate('{{#if a}}x') !== null, 'template: yopilmagan blok xato beradi');
ok(checkTemplate('{{/each}}') !== null, 'template: ortiqcha yopuvchi xato beradi');

// ---------- versiya, handoff ----------
eq(cmpVer('1.2.0', '1.10.0'), -1, 'version: 1.2.0 < 1.10.0');
eq(cmpVer('2.0.0', '1.9.9'), 1, 'version: 2.0.0 > 1.9.9');
eq(cmpVer('1.0.0', '1.0.0'), 0, 'version: teng');
{
  const short = planHandoff('chatgpt', 'salom dunyo');
  ok(short.prefilled && short.url.includes('?q=salom%20dunyo'), 'handoff: ChatGPT qisqa buyruq oldindan to\'ldiriladi');
  const long = planHandoff('claude', 'x'.repeat(8000));
  ok(!long.prefilled && long.url === 'https://claude.ai/new', 'handoff: uzun buyruq nusxalash yo\'liga o\'tadi');
  const g = planHandoff('gemini', 'salom');
  ok(!g.prefilled, 'handoff: Gemini oldindan to\'ldirmaydi');
  const off = planHandoff('chatgpt', 'salom', { prefill: false });
  ok(!off.prefilled, 'handoff: prefill o\'chirilsa to\'ldirmaydi');
}

// ---------- parse ----------
{
  const j = '{"a":1,"b":"x"}';
  eq(parseAiResponse('```json\n' + j + '\n```').data, { a: 1, b: 'x' }, 'parse: kod bloki');
  eq(parseAiResponse('Mana javob:\n```json\n' + j + '\n```\nUmid qilaman...').data, { a: 1, b: 'x' }, 'parse: atrofdagi matn');
  eq(parseAiResponse('oldidan matn ' + j + ' keyin').data, { a: 1, b: 'x' }, 'parse: kodsiz');
  eq(parseAiResponse('{"a":1,"b":[1,2,],}').data, { a: 1, b: [1, 2] }, 'parse: oxirgi vergul tuzatiladi');
  eq(parseAiResponse('{“a”: “x”}').data, { a: 'x' }, 'parse: egri tirnoqlar tuzatiladi');
  eq(parseAiResponse('{"nom":"o‘zbek {bu} \\"qavs\\""}').data, { nom: 'o‘zbek {bu} "qavs"' }, 'parse: qator ichidagi qavs va o\' belgilar');
  const trunc = parseAiResponse('```json\n{"a":[{"x":1},{"x":2');
  ok(!trunc.ok && /tugallanmagan/.test(trunc.error), 'parse: uzilgan javob aniqlanadi', trunc.error);
  ok(!parseAiResponse('hech narsa').ok, 'parse: JSON yo\'q');
  ok(!parseAiResponse('   ').ok, 'parse: bo\'sh matn');
  ok(!parseAiResponse('[1,2,3]').ok, 'parse: massiv emas obyekt kerak');
}

// ---------- validate ----------
{
  const schema = {
    type: 'object',
    required: ['a'],
    properties: {
      a: { type: 'number' },
      c: { type: 'string', transform: 'upper', enum: ['A', 'B'] },
      list: { type: 'array', planCount: 'items', tolerance: 0.1, items: { type: 'object', required: ['n'], properties: { n: { type: 'integer' } }, } },
    },
  };
  eq(validate(schema, { a: '5,400,000,000' }, {}).data.a, 5400000000, 'validate: ming ajratgichli raqam');
  eq(validate(schema, { a: '3,5' }, {}).data.a, 3.5, 'validate: o\'nlik vergul');
  eq(validate(schema, { a: '110 km/h' }, {}).ok, false, 'validate: birlikli matn raqam emas');
  eq(validate(schema, { a: 1, c: 'b' }, {}).data.c, 'B', 'validate: transform upper');
  ok(!validate(schema, { a: 1, c: 'z' }, {}).ok, 'validate: enum xatosi');
  ok(!validate(schema, {}, {}).ok && /a: yetishmayapti/.test(validate(schema, {}, {}).errors[0]), 'validate: majburiy maydon');
  const r = validate(schema, { a: 1, list: [{ n: 1 }, { n: 'x' }] }, { plan: { items: 2 } });
  ok(!r.ok && /list\[1\]\.n/.test(r.errors[0]), 'validate: xato yo\'li aniq', r.errors[0]);
  const few = validate(schema, { a: 1, list: [{ n: 1 }] }, { plan: { items: 10 } });
  ok(!few.ok && /10 ta kerak edi, 1 ta keldi/.test(few.errors[0]), 'validate: kam elementlar', few.errors[0]);
  const near = validate(schema, { a: 1, list: Array.from({ length: 9 }, () => ({ n: 1 })) }, { plan: { items: 10 } });
  ok(near.ok && near.warnings.length === 1, 'validate: 10% farq ogohlantirish bo\'ladi, xato emas');
  const cond = { type: 'object', properties: { k: { type: 'string', requiredIf: { option: 'sh', in: ['p'] } } } };
  ok(!validate(cond, {}, { opt: { sh: 'p' } }).ok, 'validate: requiredIf ishlaydi');
  ok(validate(cond, {}, { opt: { sh: 'q' } }).ok, 'validate: requiredIf boshqa variantda talab qilmaydi');
}

// ---------- plan ----------
{
  const cmp = mods.find((m) => m.id === 'comparison');
  eq(computePlan(cmp, { minutes: 4, format: 'long' }).items, 23, 'plan: comparison 4 daqiqa = 23 obyekt');
  const tiny = computePlan(cmp, { minutes: 1, format: 'long' });
  ok(tiny.items === 8 && tiny.warnings.length === 1, 'plan: juda qisqa davomiylik minimumga ko\'tariladi');
  const huge = computePlan(cmp, { minutes: 60, format: 'long' });
  ok(huge.items === 60 && huge.warnings.length === 1, 'plan: juda uzun davomiylik cheklanadi');
  eq(computePlan(cmp, { minutes: 4, format: 'long' }).groups, 6, 'plan: 23 obyekt 4 tadan = 6 rasm');
  const st = mods.find((m) => m.id === 'stickman');
  const sp = computePlan(st, { minutes: 4, format: 'long' });
  ok(sp.items === 30 && sp.words === 480, 'plan: stikman 4 daqiqa = 30 sahna, 480 so\'z', JSON.stringify(sp));
  const ss = computePlan(st, { minutes: 1, format: 'short' });
  eq(ss.items, 15, 'plan: stikman shorts 1 daqiqa = 15 sahna');
  let threw = false;
  try {
    computePlan(cmp, { minutes: 1, format: 'short' });
  } catch {
    threw = true;
  }
  ok(threw, 'plan: qo\'llanmaydigan format xato beradi');
  eq(availableFormats(mods.find((m) => m.id === 'quiz')), ['long'], 'plan: quiz faqat long');
  eq(availableFormats(mods.find((m) => m.id === 'find-original')), ['long', 'short'], 'plan: original ikkala format');
}

// ---------- namuna ma'lumot generatori (sxemadan) ----------
function gen(schema, ctx, key = '', idx = { n: 0 }) {
  const t = schema.type;
  if (t === 'string') {
    if (schema.enum) return schema.enum[0];
    if (schema.pattern) return 'US';
    const base = `${key} namuna matni`;
    let s = base;
    while (s.length < (schema.minLength ?? 0) + 2) s += ' va yana matn';
    return s.slice(0, Math.max(schema.maxLength ?? 999, 10));
  }
  if (t === 'number' || t === 'integer') {
    idx.n++;
    let v = idx.n * 3;
    if (schema.maximum !== undefined) v = Math.min(v, schema.maximum);
    if (schema.maximum === 1) v = 0.5;
    if (schema.minimum !== undefined) v = Math.max(v, schema.minimum);
    return v;
  }
  if (t === 'boolean') return true;
  if (t === 'array') {
    let n = schema.minItems ?? 1;
    if (schema.planCount) n = ctx.plan[schema.planCount];
    return Array.from({ length: n }, () => gen(schema.items, ctx, key, idx));
  }
  if (t === 'object') {
    const o = {};
    const req = new Set(schema.required || []);
    for (const [k, ps] of Object.entries(schema.properties || {})) {
      let need = req.has(k);
      if (ps.requiredIf && ctx.opt && ps.requiredIf.in.includes(ctx.opt[ps.requiredIf.option])) need = true;
      if (need || Math.random() < 0.5) o[k] = gen(ps, ctx, k, idx);
    }
    return o;
  }
  return null;
}

// ---------- har modul, har format, har variant kombinatsiyasi ----------
function optionCombos(m) {
  let combos = [{}];
  for (const o of m.options || []) {
    const choices = o.type === 'toggle' ? [true, false] : o.choices.map((c) => c.id);
    combos = combos.flatMap((c) => choices.map((ch) => ({ ...c, [o.id]: ch })));
  }
  return combos;
}

for (const m of mods) {
  const errs = validateManifest(m);
  ok(errs.length === 0, `modul ${m.id}: manifest to'g'ri`, errs.join('; '));
  ok(m.topics?.length && m.topics.every((g) => g.items.length), `modul ${m.id}: mavzular bor`);
  ok(m.example && validate(m.schema, JSON.parse(JSON.stringify(m.example)), { opt: Object.fromEntries((m.options || []).filter((o) => o.choices).map((o) => [o.id, o.default])) }).errors.filter((e) => !/ta kerak edi/.test(e)).length === 0, `modul ${m.id}: namuna (example) o'z sxemasidan o'tadi`, JSON.stringify(validate(m.schema, JSON.parse(JSON.stringify(m.example)), { opt: Object.fromEntries((m.options || []).filter((o) => o.choices).map((o) => [o.id, o.default])) }).errors));

  for (const format of availableFormats(m)) {
    const minutes = defaultMinutes(m, format);
    ok(durationChoices(m, format).includes(minutes), `modul ${m.id}/${format}: standart davomiylik tanlovlar ichida`);
    for (const options of optionCombos(m)) {
      const tag = `${m.id}/${format}/${JSON.stringify(options)}`;
      const cmd = buildCommand(m, { topic: 'Sinov mavzusi', minutes, format, language: 'uz', options });
      ok(!/\{\{|\}\}/.test(cmd.text), `${tag}: buyruqda ishlatilmagan {{ }} yo'q`, (cmd.text.match(/.{20}\{\{.{20}/) || [''])[0]);
      ok(cmd.text.includes('Sinov mavzusi') && cmd.text.includes(String(cmd.plan.items)), `${tag}: buyruqda mavzu va son bor`);
      ok(/```json/.test(cmd.text), `${tag}: buyruqda JSON namuna bor`);

      const ids2 = chosenIds(cmd.opt);
      const data = gen(m.schema, { plan: cmd.plan, opt: ids2 });
      const text = 'Mana javob:\n```json\n' + JSON.stringify(data, null, 2) + '\n```';
      const parsed = parseAiResponse(text);
      ok(parsed.ok, `${tag}: namunani o'qish`);
      const v = validate(m.schema, parsed.data, { plan: cmd.plan, opt: ids2 });
      ok(v.ok, `${tag}: namuna javob tekshiruvdan o'tadi`, v.errors.join(' | '));

      const out = buildOutputs(m, v.data, options, { format, minutes, topic: 'Sinov mavzusi' });
      ok(out.items.length === cmd.plan.items, `${tag}: natijada ${cmd.plan.items} ta element`, String(out.items.length));
      ok(out.images.every((i) => i.prompt.length > 20 && !/\{\{|\}\}/.test(i.prompt)), `${tag}: rasm promptlari to'liq`);
      if (m.images) {
        const variantsActive = m.images.variants.filter((x) => !x.when || ids2[x.when.option] === x.when.equals).length;
        const group = m.images.group ?? 1;
        const per = group > 1 ? Math.ceil(cmd.plan.items / group) : cmd.plan.items;
        ok(out.images.length === per * variantsActive, `${tag}: rasm soni ${per * variantsActive}`, String(out.images.length));
      } else {
        ok(out.images.length === 0, `${tag}: rasm kerak emas`);
      }
      if (m.voice) ok(out.voice && out.voice.words > 5 && !/\{\{|\}\}/.test(out.voice.text), `${tag}: ovoz matni tayyor`);
      else ok(out.voice === null, `${tag}: ovozsiz`);
      if (m.computed) ok(out.summary && /—/.test(out.summary.text), `${tag}: hisob chiqdi`, JSON.stringify(out.summary));
    }
  }
}

// ---------- maxsus holatlar ----------
{
  const m = mods.find((x) => x.id === 'comparison');
  const cmd = buildCommand(m, { topic: 'X', minutes: 4, format: 'long', options: { shablon: 'pillars' } });
  ok(/kod: obyekt qaysi davlatniki/.test(cmd.text), 'comparison/pillars: kod maydoni so\'raladi');
  ok(!/ikkinchi_nom va/.test(cmd.text), 'comparison/pillars: pairs matni chiqmaydi');
  const pairs = buildCommand(m, { topic: 'X', minutes: 4, format: 'long', options: { shablon: 'pairs' } });
  ok(/ikkinchi_nom va/.test(pairs.text), 'comparison/pairs: ikkinchi maydon so\'raladi');
  const opt = chosenIds(cmd.opt);
  const data = gen(m.schema, { plan: cmd.plan, opt });
  const r = validate(m.schema, JSON.parse(JSON.stringify(data)).obyektlar ? (() => { const d = JSON.parse(JSON.stringify(data)); delete d.obyektlar[0].kod; return d; })() : data, { plan: cmd.plan, opt });
  ok(!r.ok && /kod: yetishmayapti/.test(r.errors.join()), 'comparison/pillars: kod yo\'q bo\'lsa xato', r.errors.join());

  // tartib: kichikdan kattaga
  const o = buildOutputs(m, { obyektlar: [{ nom: 'b', english: 'bbb', qiymat: 9 }, { nom: 'a', english: 'aaa', qiymat: 2 }] }, { shablon: 'cards' });
  eq(o.items.map((x) => x.nom), ['a', 'b'], 'outputs: kichikdan kattaga tartiblanadi');
  ok(/panel 1: aaa/.test(o.images[0].prompt), 'outputs: rasm promptida tartib saqlanadi');

  const q = mods.find((x) => x.id === 'quiz');
  const qo = buildOutputs(q, {
    kirish: 'Salom hamma', xulosa: 'Xayr',
    savollar: [{ savol: 'Kim?', sahna_english: 'room', variantlar: ['a', 'b', 'c', 'd'], togri: 'C', dalil_nom: 'N', dalil_english: 'a knife on the floor', izoh: 'Chunki' }],
  }, {});
  ok(qo.voice.text.includes('Savol 1. Kim?') && qo.voice.text.includes('C: c. D: d.') && qo.voice.text.includes('Javob: C. Chunki') && qo.voice.text.endsWith('Xayr'), 'quiz: ovoz matni tuzilishi', qo.voice.text);
  ok(/a knife on the floor/.test(qo.images[1].prompt) && /EXACTLY identical/.test(qo.images[1].prompt), 'quiz: javob rasmi tahrirlash buyrug\'i');

  const c = mods.find((x) => x.id === 'countries-vs');
  const co = buildOutputs(c, {
    tomonlar: [{ nom: 'A-davlat', english: 'A', kod: 'AA' }, { nom: 'B-davlat', english: 'B', kod: 'BB' }],
    kategoriyalar: [
      { nom: 'x', birlik: 'u', qiymat_a: 5, qiymat_b: 3 },
      { nom: 'y', birlik: 'u', qiymat_a: 1, qiymat_b: 9 },
      { nom: 'z', birlik: 'u', qiymat_a: 2, qiymat_b: 7, kattasi_yaxshi: false },
      { nom: 'w', birlik: 'u', qiymat_a: 4, qiymat_b: 4 },
    ],
  }, {});
  ok(/A-davlat 2 — 1 B-davlat/.test(co.summary.text), 'davlatlar: ball hisobi (kichigi yaxshi bo\'lsa ham, durang ball bermaydi)', co.summary.text);

  const mo = mods.find((x) => x.id === 'monster');
  const refOn = buildOutputs(mo, { maxluqlar: [{ nom: 'a', english: 'a big beast here', balandlik: 3 }] }, { original: true });
  const refOff = buildOutputs(mo, { maxluqlar: [{ nom: 'a', english: 'a big beast here', balandlik: 3 }] }, { original: false });
  ok(refOn.images.length === 1 && refOff.images.length === 2, 'monster: haqiqiy rasm prompti faqat original o\'chiq bo\'lganda');
  ok(/#00FF00/.test(refOn.images[0].prompt), 'monster: yashil fon promptda bor');

  const fo = mods.find((x) => x.id === 'find-original');
  const ai = buildOutputs(fo, { raundlar: [{ nom: 'n', english: 'the flag of Japan', ozgartirish: 'rang tusi', qiyinlik: 2 }] }, { variantlar: 'ai', tor: '5' }, { format: 'long' });
  ok(ai.images.length === 2 && /5 by 5 grid containing 24/.test(ai.images[1].prompt), 'original: AI soxta nusxa prompti 5x5 = 24', ai.images[1]?.prompt);
  const dastur = buildOutputs(fo, { raundlar: [{ nom: 'n', english: 'the flag of Japan', ozgartirish: 'rang tusi', qiyinlik: 2 }] }, { variantlar: 'dastur' }, { format: 'long' });
  ok(dastur.images.length === 1, 'original: dastur yasasa faqat asl rasm prompti');

  const st = mods.find((x) => x.id === 'stickman');
  const sShort = buildOutputs(st, { sahnalar: [{ matn: 'Salom dunyo', english: 'the stickman waves hello happily' }] }, {}, { format: 'short' });
  const sLong = buildOutputs(st, { sahnalar: [{ matn: 'Salom dunyo', english: 'the stickman waves hello happily' }] }, {}, { format: 'long' });
  ok(/9:16/.test(sShort.images[0].prompt) && /16:9/.test(sLong.images[0].prompt), 'stikman: format rasm nisbatiga ta\'sir qiladi');
}

// ---------- manifest xavfsizligi ----------
{
  const base = mods[0];
  ok(validateManifest({ ...base, computed: 'process.exit' }).length > 0, 'xavfsizlik: nomaʼlum computed rad etiladi');
  ok(validateManifest({ ...base, id: 'Bad ID' }).length > 0, 'xavfsizlik: yomon id rad etiladi');
  ok(validateManifest({ ...base, prompt: '{{#if x}}' }).length > 0, 'xavfsizlik: buzuq shablon rad etiladi');
  ok(validateManifest({ ...base, minApp: '9.0.0' }).length > 0, 'yangilanish: yangi dastur talab qilinsa rad etiladi');
  ok(validateManifest({ ...base, plan: {} }).length > 0, 'manifest: plan yo\'q bo\'lsa rad etiladi');
}

console.log(`\n${pass} ta o'tdi, ${fail} ta xato`);
if (fail) {
  console.log('\nXatolar:');
  failures.slice(0, 40).forEach((f) => console.log(' ✗ ' + f));
  process.exit(1);
}
